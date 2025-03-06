import { 
  CacheConfig, 
  MarketData, 
  SignalGenerator, 
  SignalGeneratorConfig, 
  SignalGeneratorResult, 
  SignalType, 
  SignalStrength,
  TradingSignal, 
  TradingSignalConfig 
} from './types';
import { SignalAggregator } from './SignalAggregator';
import { TechnicalSignalGenerator } from './TechnicalSignalGenerator';
import { supabase } from '@/integrations/supabase/client';
import { getBinancePrice, getHistoricalKlines } from '../binanceApi';
import { fetchCompanyNews } from '../newsApi';

/**
 * Serviço principal para geração e gerenciamento de sinais de trading
 * Coordena os diferentes geradores de sinais e o agregador
 */
export class TradingSignalService {
  private config: TradingSignalConfig;
  private generators: Map<SignalType, SignalGenerator>;
  private aggregator: SignalAggregator;
  private cache: {
    signals: TradingSignal[];
    timestamp: number;
  };
  private logger: Console;
  
  /**
   * Construtor do serviço
   * @param config Configuração do serviço
   * @param customGenerators Geradores personalizados (opcional)
   */
  constructor(config: TradingSignalConfig, customGenerators?: Map<SignalType, SignalGenerator>) {
    this.config = config;
    this.generators = customGenerators || new Map();
    this.aggregator = new SignalAggregator(config.aggregator);
    this.cache = { signals: [], timestamp: 0 };
    this.logger = console;
    
    // Inicializar geradores padrão se não fornecidos
    this.initializeGenerators();
  }
  
  /**
   * Inicializa os geradores de sinais padrão
   */
  private initializeGenerators(): void {
    // Adicionar geradores apenas se estiverem habilitados na configuração
    
    // Gerador de sinais técnicos
    if (this.config.signalGenerators[SignalType.TECHNICAL]?.enabled && !this.generators.has(SignalType.TECHNICAL)) {
      this.generators.set(SignalType.TECHNICAL, new TechnicalSignalGenerator());
    }
    
    // Outros geradores seriam adicionados aqui
    // Por exemplo: NewsSignalGenerator, FundamentalSignalGenerator, CorrelationSignalGenerator, etc.
  }
  
  /**
   * Registra um gerador de sinais personalizado
   * @param generator Gerador de sinais a ser registrado
   */
  public registerGenerator(generator: SignalGenerator): void {
    if (!generator || !generator.type) {
      this.logger.error('Tentativa de registrar gerador inválido');
      return;
    }
    
    this.generators.set(generator.type, generator);
    this.logger.info(`Gerador de sinais ${generator.type} registrado com sucesso`);
  }
  
  /**
   * Busca sinais de trading para os símbolos configurados
   * @param forceRefresh Forçar atualização do cache
   * @returns Lista de sinais de trading
   */
  public async fetchTradingSignals(forceRefresh: boolean = false): Promise<TradingSignal[]> {
    try {
      // Verificar cache
      if (!forceRefresh && this.isCacheValid()) {
        return this.cache.signals;
      }
      
      // Buscar dados de mercado para todos os símbolos
      const marketDataList = await this.fetchMarketData(this.config.symbols);
      
      // Gerar sinais para cada ativo
      const allSignals: TradingSignal[] = [];
      const generatorResults: Record<SignalType, SignalGeneratorResult> = {} as Record<SignalType, SignalGeneratorResult>;
      
      // Armazenar todos os sinais gerados, mesmo os que não atendem a todos os critérios
      const allGeneratedSignals: TradingSignal[] = [];
      
      for (const marketData of marketDataList) {
        try {
          // Executar cada gerador de sinais
          for (const [type, generator] of this.generators.entries()) {
            const generatorConfig = this.config.signalGenerators[type];
            
            if (generatorConfig?.enabled) {
              const result = await generator.generateSignals(marketData, generatorConfig.options);
              
              if (!generatorResults[type]) {
                generatorResults[type] = { signals: [] };
              }
              
              // Armazenar todos os sinais gerados para uso posterior
              if (result.signals && result.signals.length > 0) {
                allGeneratedSignals.push(...result.signals);
              }
              
              generatorResults[type].signals.push(...result.signals);
              
              // Mesclar metadados
              if (result.metadata) {
                generatorResults[type].metadata = {
                  ...generatorResults[type].metadata,
                  [marketData.symbol]: result.metadata
                };
              }
            }
          }
        } catch (error) {
          this.logger.error(`Erro ao gerar sinais para ${marketData.symbol}:`, error);
        }
      }
      
      // Agregar sinais
      let aggregatedSignals = this.aggregator.aggregateSignals(generatorResults);
      
      // Garantir que temos pelo menos 7 sinais
      if (aggregatedSignals.length < 7 && allGeneratedSignals.length > 0) {
        this.logger.info(`Apenas ${aggregatedSignals.length} sinais atendem a todos os critérios. Adicionando sinais próximos.`);
        
        // Filtrar sinais que já estão nos agregados
        const existingIds = new Set(aggregatedSignals.map(s => `${s.symbol}-${s.type}-${s.signal}-${s.timestamp}`));
        const remainingSignals = allGeneratedSignals.filter(s => 
          !existingIds.has(`${s.symbol}-${s.type}-${s.signal}-${s.timestamp}`)
        );
        
        // Ordenar os sinais restantes por força e taxa de sucesso
        const sortedRemainingSignals = remainingSignals.sort((a, b) => {
          // Primeiro por força (STRONG > MODERATE > WEAK)
          const strengthOrder = { 
            [SignalStrength.STRONG]: 3, 
            [SignalStrength.MODERATE]: 2, 
            [SignalStrength.WEAK]: 1 
          };
          
          const strengthDiff = strengthOrder[b.strength] - strengthOrder[a.strength];
          if (strengthDiff !== 0) return strengthDiff;
          
          // Depois por taxa de sucesso
          return b.success_rate - a.success_rate;
        });
        
        // Adicionar sinais até termos pelo menos 7 ou esgotarmos os sinais disponíveis
        const signalsToAdd = sortedRemainingSignals.slice(0, Math.max(0, 7 - aggregatedSignals.length));
        
        if (signalsToAdd.length > 0) {
          this.logger.info(`Adicionando ${signalsToAdd.length} sinais próximos aos critérios.`);
          aggregatedSignals = [...aggregatedSignals, ...signalsToAdd];
        }
      }
      
      // Atualizar cache
      this.updateCache(aggregatedSignals);
      
      return aggregatedSignals;
    } catch (error) {
      this.logger.error('Erro ao buscar sinais de trading:', error);
      return this.cache.signals; // Retornar cache mesmo se expirado em caso de erro
    }
  }
  
  /**
   * Busca dados de mercado para os símbolos especificados
   * @param symbols Lista de símbolos
   * @returns Lista de dados de mercado
   */
  private async fetchMarketData(symbols: string[]): Promise<MarketData[]> {
    const marketDataList: MarketData[] = [];
    
    for (const symbol of symbols) {
      try {
        // Buscar dados atuais via Binance
        const priceData = await getBinancePrice(symbol);
        const currentPrice = parseFloat(priceData.price);
        
        // Buscar dados históricos para cálculos adicionais
        const klines = await getHistoricalKlines(symbol, '1d', 30);
        let priceChange = 0;
        let volume = 0;
        let high = 0;
        let low = 0;
        
        if (klines && klines.length > 0) {
          // Calcular mudança de preço do último dia
          if (klines.length >= 2) {
            const lastClose = parseFloat(klines[klines.length - 1][4]);
            const prevClose = parseFloat(klines[klines.length - 2][4]);
            priceChange = (lastClose - prevClose) / prevClose * 100;
            high = parseFloat(klines[klines.length - 1][2]);
            low = parseFloat(klines[klines.length - 1][3]);
          }
          
          // Obter volume
          volume = parseFloat(klines[klines.length - 1][5]);
        }
        
        // Buscar notícias recentes para análise de sentimento
        const recentNews = await fetchCompanyNews(symbol);
        
        // Criar objeto MarketData
        marketDataList.push({
          symbol,
          price: currentPrice,
          change: priceChange,
          volume,
          high,
          low,
          news: recentNews,
          isCrypto: true // Agora todos os ativos são cripto
        });
      } catch (error) {
        this.logger.error(`Erro ao buscar dados de mercado para ${symbol}:`, error);
      }
    }
    
    return marketDataList;
  }
  
  /**
   * Verifica se o cache é válido
   * @returns true se o cache for válido, false caso contrário
   */
  private isCacheValid(): boolean {
    if (!this.config.cache.enabled) {
      return false;
    }
    
    const now = Date.now();
    const cacheAge = now - this.cache.timestamp;
    
    return cacheAge < this.config.cache.duration && this.cache.signals.length > 0;
  }
  
  /**
   * Atualiza o cache de sinais
   * @param signals Sinais a serem armazenados em cache
   */
  private updateCache(signals: TradingSignal[]): void {
    this.cache = {
      signals,
      timestamp: Date.now()
    };
  }
  
  /**
   * Atualiza o status de um sinal de trading
   * @param signal Sinal a ser atualizado
   * @returns Sinal atualizado
   */
  public async updateSignalStatus(signal: TradingSignal): Promise<TradingSignal> {
    try {
      // Buscar preço atual da Binance
      const priceData = await getBinancePrice(signal.symbol);
      const currentPrice = parseFloat(priceData.price);

      // Verificar se o alvo ou stop loss foi atingido
      let newStatus = signal.status;
      
      if (signal.signal === 'BUY') {
        if (currentPrice >= signal.target_price) {
          newStatus = 'completed';
        } else if (currentPrice <= signal.stop_loss) {
          newStatus = 'cancelled';
        }
      } else if (signal.signal === 'SELL') {
        if (currentPrice <= signal.target_price) {
          newStatus = 'completed';
        } else if (currentPrice >= signal.stop_loss) {
          newStatus = 'cancelled';
        }
      }
      
      // Verificar se o sinal expirou
      const expiryDate = new Date(signal.expiry).getTime();
      if (Date.now() > expiryDate && newStatus === 'active') {
        newStatus = 'expired';
      }
      
      // Se o status mudou, atualizar no Supabase
      if (newStatus !== signal.status && signal.id) {
        const { error } = await supabase
          .from('trading_signals')
          .update({ status: newStatus })
          .eq('id', signal.id);
          
        if (error) {
          this.logger.error(`Erro ao atualizar status do sinal ${signal.id}:`, error);
        } else {
          this.logger.info(`Status do sinal ${signal.id} atualizado para ${newStatus}`);
          
          // Atualizar cache se necessário
          if (this.cache.signals.length > 0) {
            this.cache.signals = this.cache.signals.map(s => 
              s.id === signal.id ? { ...s, status: newStatus } : s
            );
          }
          
          return { ...signal, status: newStatus as any };
        }
      }
      
      return signal;
    } catch (error) {
      this.logger.error(`Erro ao atualizar status do sinal:`, error);
      return signal;
    }
  }
  
  /**
   * Atualiza o status de todos os sinais ativos
   * @returns Sinais atualizados
   */
  public async updateAllSignalsStatus(): Promise<TradingSignal[]> {
    try {
      // Buscar sinais ativos do Supabase
      const { data, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active');
        
      if (error) {
        this.logger.error('Erro ao buscar sinais ativos:', error);
        return [];
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Converter para o formato TradingSignal
      const signals: TradingSignal[] = data.map(item => ({
        id: item.id,
        symbol: item.symbol,
        type: item.type as SignalType,
        signal: item.signal as 'BUY' | 'SELL',
        reason: item.reason,
        strength: item.strength,
        timestamp: new Date(item.created_at).getTime(),
        price: item.price,
        entry_price: item.entry_price,
        stop_loss: item.stop_loss,
        target_price: item.target_price,
        success_rate: item.success_rate,
        timeframe: item.timeframe,
        expiry: item.expiry,
        risk_reward: item.risk_reward,
        status: item.status,
        related_asset: item.related_asset,
        metadata: item.metadata
      }));
      
      // Atualizar status de cada sinal
      const updatedSignals: TradingSignal[] = [];
      
      for (const signal of signals) {
        const updatedSignal = await this.updateSignalStatus(signal);
        updatedSignals.push(updatedSignal);
      }
      
      return updatedSignals;
    } catch (error) {
      this.logger.error('Erro ao atualizar status de todos os sinais:', error);
      return [];
    }
  }
  
  /**
   * Monitora os sinais ativos e substitui aqueles que atingiram alvo ou stop loss
   * @returns Os novos sinais gerados para substituição
   */
  public async monitorAndReplaceSignals(): Promise<TradingSignal[]> {
    try {
      // Primeiro, atualizar o status de todos os sinais ativos
      const updatedSignals = await this.updateAllSignalsStatus();
      
      // Filtrar sinais que acabaram de ser completados ou cancelados
      const completedOrCancelled = updatedSignals.filter(
        signal => signal.status === 'completed' || signal.status === 'cancelled'
      );
      
      if (completedOrCancelled.length === 0) {
        this.logger.info('Nenhum sinal completado ou cancelado para substituir');
        return [];
      }
      
      // Registrar os sinais que foram completados ou cancelados
      this.logger.info(`${completedOrCancelled.length} sinais completados ou cancelados serão substituídos`);
      completedOrCancelled.forEach(signal => {
        const statusText = signal.status === 'completed' ? 'atingiu o alvo' : 'atingiu o stop loss';
        this.logger.info(`Sinal ${signal.id} (${signal.symbol} - ${signal.signal}) ${statusText}`);
      });
      
      // Extrair os símbolos únicos dos sinais que precisam ser substituídos
      const symbolsToAnalyze = Array.from(new Set(completedOrCancelled.map(signal => signal.symbol)));
      
      // Obter dados de mercado para esses símbolos
      const marketData = await this.fetchMarketData(symbolsToAnalyze);
      
      // Gerar novos sinais para esses ativos
      const generatorResults: Record<SignalType, SignalGeneratorResult> = {};
      const allGeneratedSignals: TradingSignal[] = [];
      
      for (const data of marketData) {
        try {
          // Executar cada gerador de sinais
          for (const [type, generator] of this.generators.entries()) {
            const generatorConfig = this.config.signalGenerators[type];
            
            if (generatorConfig?.enabled) {
              const result = await generator.generateSignals(data, generatorConfig.options);
              
              if (!generatorResults[type]) {
                generatorResults[type] = { signals: [] };
              }
              
              // Armazenar todos os sinais gerados
              if (result.signals && result.signals.length > 0) {
                allGeneratedSignals.push(...result.signals);
              }
              
              generatorResults[type].signals.push(...result.signals);
              
              // Mesclar metadados
              if (result.metadata) {
                generatorResults[type].metadata = {
                  ...generatorResults[type].metadata,
                  [data.symbol]: result.metadata
                };
              }
            }
          }
        } catch (error) {
          this.logger.error(`Erro ao gerar novos sinais para ${data.symbol}:`, error);
        }
      }
      
      // Agregar sinais
      let aggregatedSignals = this.aggregator.aggregateSignals(generatorResults);
      
      // Selecionar os melhores sinais baseados em taxa de sucesso e força
      const bestSignals = aggregatedSignals
        .sort((a, b) => {
          // Primeiro ordenar por força do sinal
          const strengthOrder = {
            [SignalStrength.STRONG]: 3,
            [SignalStrength.MODERATE]: 2,
            [SignalStrength.WEAK]: 1
          };
          const strengthDiff = strengthOrder[b.strength] - strengthOrder[a.strength];
          
          // Se a força for igual, ordenar por taxa de sucesso
          if (strengthDiff === 0) {
            return b.success_rate - a.success_rate;
          }
          
          return strengthDiff;
        })
        .slice(0, completedOrCancelled.length); // Pegar apenas o número necessário para substituição
      
      // Salvar os novos sinais no banco de dados
      const savedSignals: TradingSignal[] = [];
      
      for (const signal of bestSignals) {
        try {
          const savedSignal = await this.saveSignal({
            ...signal,
            status: 'active'
          });
          savedSignals.push(savedSignal);
          
          this.logger.info(`Novo sinal gerado para substituição: ${savedSignal.symbol} - ${savedSignal.signal} (ID: ${savedSignal.id})`);
        } catch (error) {
          this.logger.error(`Erro ao salvar novo sinal de ${signal.symbol}:`, error);
        }
      }
      
      // Se necessário, atualizar o cache
      if (savedSignals.length > 0 && this.cache.signals.length > 0) {
        this.cache.signals = [...this.cache.signals.filter(s => 
          s.status === 'active' && !completedOrCancelled.some(c => c.id === s.id)
        ), ...savedSignals];
      }
      
      return savedSignals;
    } catch (error) {
      this.logger.error('Erro ao monitorar e substituir sinais:', error);
      return [];
    }
  }
  
  /**
   * Salva um sinal no banco de dados
   * @param signal Sinal a ser salvo
   * @returns Sinal salvo com ID
   */
  public async saveSignal(signal: TradingSignal): Promise<TradingSignal> {
    try {
      const { data, error } = await supabase
        .from('trading_signals')
        .insert({
          symbol: signal.symbol,
          type: signal.type,
          signal: signal.signal,
          reason: signal.reason,
          strength: signal.strength,
          price: signal.price,
          entry_price: signal.entry_price,
          stop_loss: signal.stop_loss,
          target_price: signal.target_price,
          success_rate: signal.success_rate,
          timeframe: signal.timeframe,
          expiry: signal.expiry,
          risk_reward: signal.risk_reward,
          status: signal.status,
          related_asset: signal.related_asset,
          metadata: signal.metadata
        })
        .select()
        .single();
        
      if (error) {
        this.logger.error('Erro ao salvar sinal:', error);
        return signal;
      }
      
      return {
        ...signal,
        id: data.id
      };
    } catch (error) {
      this.logger.error('Erro ao salvar sinal:', error);
      return signal;
    }
  }
  
  /**
   * Cria uma configuração padrão para o serviço
   * @returns Configuração padrão
   */
  public static createDefaultConfig(): TradingSignalConfig {
    return {
      symbols: [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', // Crypto
        'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', // Tech stocks
        'JPM', 'BAC', 'GS', // Banking
        'XOM', 'CVX', // Energy
        'PFE', 'JNJ', // Healthcare
      ],
      refreshInterval: 5 * 60 * 1000, // 5 minutos
      signalGenerators: {
        [SignalType.TECHNICAL]: {
          enabled: true,
          weight: 1.0,
          timeframes: ['1d'],
          options: {}
        },
        [SignalType.FUNDAMENTAL]: {
          enabled: false,
          weight: 0.8,
          timeframes: ['1d'],
          options: {}
        },
        [SignalType.NEWS]: {
          enabled: false,
          weight: 0.6,
          timeframes: ['1d'],
          options: {}
        },
        [SignalType.CORRELATION]: {
          enabled: false,
          weight: 0.7,
          timeframes: ['1d'],
          options: {}
        },
        [SignalType.SENTIMENT]: {
          enabled: false,
          weight: 0.5,
          timeframes: ['1d'],
          options: {}
        },
        [SignalType.VOLUME]: {
          enabled: false,
          weight: 0.6,
          timeframes: ['1d'],
          options: {}
        },
        [SignalType.PATTERN]: {
          enabled: false,
          weight: 0.7,
          timeframes: ['1d'],
          options: {}
        }
      },
      aggregator: {
        minSignalsRequired: 1,
        strengthWeights: {
          [SignalStrength.WEAK]: 0.5,
          [SignalStrength.MODERATE]: 1.0,
          [SignalStrength.STRONG]: 2.0
        },
        typeWeights: {
          [SignalType.TECHNICAL]: 1.0,
          [SignalType.FUNDAMENTAL]: 0.8,
          [SignalType.NEWS]: 0.6,
          [SignalType.CORRELATION]: 0.7,
          [SignalType.SENTIMENT]: 0.5,
          [SignalType.VOLUME]: 0.6,
          [SignalType.PATTERN]: 0.7
        },
        conflictResolution: 'weighted'
      },
      cache: {
        enabled: true,
        duration: 5 * 60 * 1000 // 5 minutos
      }
    };
  }
} 
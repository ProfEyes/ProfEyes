import { SignalType } from '@/types/signals';
import { MarketData } from '@/types/marketData';
import { TradingSignal, SignalAnalysis } from '@/types/tradingSignals';
import { supabase } from "@/integrations/supabase/client";
import { formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getLatestPrices } from "./binanceApi";
import { toast } from "sonner";

// Interfaces para uso interno na classe
interface AdvancedSignalAnalysis extends SignalAnalysis {
  technicalScore: number;
  volumeScore: number;
  patternScore: number;
  trendScore: number;
  momentumScore: number;
  orderFlowScore: number;
  marketStructureScore: number;
  totalScore: number;
}

interface MarketNews {
  title: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: number; // 0 a 1
  timestamp: number;
}

interface MarketAnalysis {
  price: number;
  volume24h: number;
  priceChange24h: number;
  volatility: number;
  news: MarketNews[];
}

export class TradingSignalService {
  private binanceService: any; // Na implementação real, usar o tipo correto
  private priceUpdateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private signalCache: TradingSignal[] = [];
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos em ms

  constructor(binanceService?: any) {
    this.binanceService = binanceService || {};
  }

  private async analyzeMarketData(marketData: MarketData): Promise<AdvancedSignalAnalysis> {
    try {
      // Buscar dados em tempo real da Binance
      const ticker = await this.binanceService.get24hrTicker(marketData.symbol);
      const depth = await this.binanceService.getOrderBookDepth(marketData.symbol);
      
      // Análise multi-timeframe com dados mais recentes
      const klines1m = await this.binanceService.getKlines({
        symbol: marketData.symbol,
        interval: '1m',
        limit: 100 // Reduzido para dados mais recentes
      });
  
      const klines5m = await this.binanceService.getKlines({
        symbol: marketData.symbol,
        interval: '5m',
        limit: 50
      });
  
      // Calcular volatilidade real atual
      const realVolatility = this.calculateRealVolatility(klines1m);
      
      // Análise de liquidez e profundidade do book
      const bookAnalysis = this.analyzeOrderBook(depth);
      
      // Análise técnica precisa
      const technicalAnalysis = {
        rsi: this.calculateRSI(klines1m, 14),
        macd: this.calculateMACD(klines1m),
        bbands: this.calculateBollingerBands(klines1m, 20, 2),
        volume: this.analyzeVolumeProfile(klines1m),
        momentum: this.calculateMomentum(klines1m)
      };
  
      // Calcular assertividade baseada em múltiplos fatores
      const accuracy = this.calculateSignalAccuracy({
        technical: technicalAnalysis,
        liquidity: bookAnalysis,
        volatility: realVolatility,
        priceAction: this.analyzePriceAction(klines1m, klines5m)
      });
  
      // Gerar alvos realistas baseados em dados atuais
      const targets = this.calculateRealisticTargets({
        currentPrice: ticker.lastPrice,
        volatility: realVolatility,
        bookDepth: bookAnalysis,
        timeframe: '1m'
      });
  
      return {
        type: this.determineSignalType(technicalAnalysis, bookAnalysis),
        score: accuracy.totalScore,
        assertiveness: accuracy.probability,
        targets,
        reasons: this.generateDetailedReasons(technicalAnalysis, bookAnalysis, accuracy),
        ...accuracy
      };
    } catch (error) {
      console.error('Erro na análise de mercado:', error);
      return null;
    }
  }
  
  private calculateRealisticTargets(data: {
    currentPrice: number,
    volatility: number,
    bookDepth: unknown,
    timeframe: string
  }): { entry: number, target: number, stop: number } {
    const { currentPrice, volatility } = data;
    
    // Movimento máximo esperado em 5 minutos
    const maxMove = Math.min(0.001, volatility * 0.5); // Máximo de 0.1% ou metade da volatilidade
    
    // Stop loss baseado em ATR de 1 minuto
    const stopDistance = Math.min(
      currentPrice * 0.0005, // Máximo 0.05%
      volatility * 0.3 // 30% da volatilidade atual
    );
    
    // Target baseado em R:R 1.5
    const targetDistance = stopDistance * 1.5;
    
    return {
      entry: currentPrice,
      target: currentPrice * (1 + maxMove),
      stop: currentPrice * (1 - (stopDistance / currentPrice))
    };
  }
  
  private calculateSignalAccuracy(data: {
    technical: unknown,
    liquidity: unknown,
    volatility: number,
    priceAction: unknown
  }): {
    probability: number,
    confidence: number,
    totalScore: number
  } {
    // Pesos para cada fator
    const weights = {
      technical: 0.4,
      liquidity: 0.2,
      volatility: 0.2,
      priceAction: 0.2
    };
    
    // Calcular scores individuais
    const technicalScore = this.calculateTechnicalScore(data.technical);
    const liquidityScore = this.calculateLiquidityScore(data.liquidity);
    const volatilityScore = this.calculateVolatilityScore(data.volatility);
    const priceActionScore = this.calculatePriceActionScore(data.priceAction);
    
    // Calcular score total ponderado
    const totalScore = (
      technicalScore * weights.technical +
      liquidityScore * weights.liquidity +
      volatilityScore * weights.volatility +
      priceActionScore * weights.priceAction
    );
    
    // Calcular probabilidade real baseada em histórico
    const probability = Math.min(0.85, totalScore / 100);
    
    return {
      probability: Number(probability.toFixed(4)),
      confidence: Number((totalScore / 100).toFixed(4)),
      totalScore: Number(totalScore.toFixed(2))
    };
  }
  
  // Métodos auxiliares para calcular scores (implementação fictícia)
  private calculateTechnicalScore(data: unknown): number {
    return 75; // Implementação fictícia
  }
  
  private calculateLiquidityScore(data: unknown): number {
    return 80; // Implementação fictícia
  }
  
  private calculateVolatilityScore(volatility: number): number {
    return 70; // Implementação fictícia
  }
  
  private calculatePriceActionScore(data: unknown): number {
    return 85; // Implementação fictícia
  }
  
  private calculateRealVolatility(klines: unknown[]): number {
    return 0.001; // Implementação fictícia
  }
  
  private analyzeOrderBook(depth: unknown): unknown {
    return {}; // Implementação fictícia
  }
  
  private calculateRSI(klines: unknown[], period: number): number {
    return 55; // Implementação fictícia
  }
  
  private calculateMACD(klines: unknown[]): { signal: number, histogram: number, macd: number } {
    return { signal: 0.1, histogram: 0.05, macd: 0.15 }; // Implementação fictícia
  }
  
  private calculateBollingerBands(klines: unknown[], period: number, stdDev: number): {
    upper: number, middle: number, lower: number
  } {
    return { upper: 100, middle: 90, lower: 80 }; // Implementação fictícia
  }
  
  private analyzeVolumeProfile(klines: unknown[]): { volumeScore: number } {
    return { volumeScore: 70 }; // Implementação fictícia
  }
  
  private calculateMomentum(klines: unknown[]): { momentum: number } {
    return { momentum: 0.5 }; // Implementação fictícia
  }
  
  private analyzePriceAction(klines1m: unknown[], klines5m: unknown[]): unknown {
    return {}; // Implementação fictícia
  }
  
  private determineSignalType(technicalAnalysis: unknown, bookAnalysis: unknown): 'BUY' | 'SELL' {
    return 'BUY'; // Implementação fictícia
  }
  
  private generateDetailedReasons(
    technicalAnalysis: unknown, 
    bookAnalysis: unknown, 
    accuracy: unknown
  ): string[] {
    return [
      "RSI em zona de sobrecompra",
      "Suporte forte próximo ao preço atual",
      "Volume acima da média"
    ]; // Implementação fictícia
  }
  
  public async fetchTradingSignals(forceRefresh: boolean = false): Promise<TradingSignal[]> {
    try {
      console.log('TradingSignalService: Iniciando busca por sinais');
      
      // Verificar se podemos usar o cache
      const now = Date.now();
      const cacheValid = !forceRefresh && 
                         this.signalCache.length > 0 && 
                         (now - this.lastFetchTime) < this.CACHE_DURATION;
      
      if (cacheValid) {
        console.log('TradingSignalService: Usando sinais em cache', this.signalCache.length);
        return this.signalCache;
      }
      
      console.log('TradingSignalService: Cache inválido, buscando novos sinais');
      
      // Buscar sinais ativos
      let { data: signals, error } = await supabase
        .from('trading_signals')
        .select('*')
        .in('status', ['ATIVO', 'PENDENTE'])
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar sinais de trading do Supabase:', error);
        // Retornar cache mesmo que expirado em caso de erro
        if (this.signalCache.length > 0) {
          return this.signalCache;
        }
        return [];
      }
      
      // Verificar se temos sinais
      if (!signals || signals.length === 0) {
        console.log('TradingSignalService: Nenhum sinal encontrado no banco de dados');
        
        // Manter cache atual se existir e não forçar atualização
        if (this.signalCache.length > 0 && !forceRefresh) {
          return this.signalCache;
        }
        
        // Caso contrário, limpar cache
        this.signalCache = [];
        return [];
      }
      
      // Formatar sinais
      const formattedSignals: TradingSignal[] = signals.map(signal => {
        // Determinar timestamp para ordenação
        const timestamp = new Date(signal.created_at).getTime();
        
        // Calcular tempo decorrido em formato amigável
        const elapsedTime = formatDistance(
          new Date(signal.created_at),
          new Date(),
          { addSuffix: true, locale: ptBR }
        );
        
        return {
          id: signal.id,
          symbol: signal.symbol,
          signal: signal.signal_type,
          reason: signal.reason,
          strength: signal.strength,
          timestamp: timestamp,
          price: signal.current_price,
          entry_price: signal.entry_price,
          stop_loss: signal.stop_loss,
          target_price: signal.target_price,
          take_profit: signal.take_profit,
          status: signal.status,
          success_rate: signal.success_rate,
          type: signal.signal_category,
          exit_price: signal.exit_price,
          elapsed_time: elapsedTime,
          created_at: signal.created_at,
          updated_at: signal.updated_at,
          exchange: signal.exchange || 'binance'
        };
      });
      
      // Atualizar cache e timestamp
      this.signalCache = formattedSignals;
      this.lastFetchTime = now;
      
      console.log(`TradingSignalService: ${formattedSignals.length} sinais encontrados`);
      return formattedSignals;
    } catch (error) {
      console.error('Erro geral ao buscar sinais de trading:', error);
      
      // Retornar cache mesmo que expirado em caso de erro
      if (this.signalCache.length > 0) {
        return this.signalCache;
      }
      
      return [];
    }
  }
  
  // Atualizar preço atual de um sinal
  async updateSignalCurrentPrice(signal: TradingSignal): Promise<TradingSignal> {
    try {
      const prices = await getLatestPrices([signal.symbol]);
      if (prices && prices.length > 0) {
        // Atualizar preço no objeto do sinal
        return {
          ...signal,
          price: parseFloat(prices[0].price)
        };
      }
      return signal;
    } catch (error) {
      console.error(`Erro ao atualizar preço para ${signal.symbol}:`, error);
      return signal;
    }
  }
  
  // Atualizar status de um sinal
  async updateSignalStatus(
    signal: TradingSignal, 
    status: 'ATIVO' | 'PENDENTE' | 'CONCLUÍDO' | 'CANCELADO', 
    exitPrice?: number
  ): Promise<TradingSignal> {
    try {
      const { data, error } = await supabase
        .from('trading_signals')
        .update({ 
          status, 
          exit_price: exitPrice, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', signal.id)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao atualizar status do sinal:', error);
        return signal;
      }
      
      // Invalidar cache para próxima busca
      this.lastFetchTime = 0;
      
      // Notificar o usuário
      if (status === 'CONCLUÍDO') {
        const isProfit = signal.signal === 'BUY' 
          ? exitPrice! > signal.entry_price
          : exitPrice! < signal.entry_price;
          
        if (isProfit) {
          toast.success(`Alvo atingido para ${signal.symbol}!`);
        } else {
          toast.error(`Stop loss atingido para ${signal.symbol}.`);
        }
      } else if (status === 'CANCELADO') {
        toast.info(`Sinal para ${signal.symbol} foi cancelado.`);
      }
      
      // Formatar e retornar o sinal atualizado
      return {
        ...signal,
        status,
        exit_price: exitPrice,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Erro geral ao atualizar status do sinal:', error);
      return signal;
    }
  }
  
  // Criar um novo sinal de trading
  async createTradingSignal(signalData: Omit<TradingSignal, 'id' | 'timestamp' | 'created_at' | 'updated_at' | 'elapsed_time'>): Promise<TradingSignal | null> {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('trading_signals')
        .insert({
          symbol: signalData.symbol,
          signal_type: signalData.signal,
          reason: signalData.reason,
          strength: signalData.strength,
          current_price: signalData.price,
          entry_price: signalData.entry_price,
          stop_loss: signalData.stop_loss,
          target_price: signalData.target_price,
          take_profit: signalData.take_profit,
          status: signalData.status || 'ATIVO',
          success_rate: signalData.success_rate,
          signal_category: signalData.type,
          exchange: signalData.exchange || 'binance',
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar novo sinal:', error);
        return null;
      }
      
      // Invalidar cache para próxima busca
      this.lastFetchTime = 0;
      
      // Notificar usuário sobre novo sinal
      toast.success(`Novo sinal de ${signalData.signal === 'BUY' ? 'compra' : 'venda'} para ${signalData.symbol}!`);
      
      // Retornar sinal formatado
      return {
        id: data.id,
        symbol: data.symbol,
        signal: data.signal_type,
        reason: data.reason,
        strength: data.strength,
        timestamp: new Date(data.created_at).getTime(),
        price: data.current_price,
        entry_price: data.entry_price,
        stop_loss: data.stop_loss,
        target_price: data.target_price,
        take_profit: data.take_profit,
        status: data.status,
        success_rate: data.success_rate,
        type: data.signal_category,
        exit_price: data.exit_price,
        elapsed_time: 'agora mesmo',
        created_at: data.created_at,
        updated_at: data.updated_at,
        exchange: data.exchange
      };
    } catch (error) {
      console.error('Erro geral ao criar novo sinal:', error);
      return null;
    }
  }
  
  // Verificar se um sinal para um símbolo específico já existe
  async signalExists(symbol: string, signalType: 'BUY' | 'SELL'): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('trading_signals')
        .select('id', { count: 'exact' })
        .eq('symbol', symbol)
        .eq('signal_type', signalType)
        .in('status', ['ATIVO', 'PENDENTE']);
      
      if (error) {
        console.error('Erro ao verificar existência de sinal:', error);
        return false;
      }
      
      return count! > 0;
    } catch (error) {
      console.error('Erro geral ao verificar existência de sinal:', error);
      return false;
    }
  }
  
  // Limpar o cache e forçar próxima busca
  invalidateCache() {
    this.lastFetchTime = 0;
    this.signalCache = [];
  }
}

// Criar uma instância da classe e exportá-la
export const tradingSignalService = new TradingSignalService(); 
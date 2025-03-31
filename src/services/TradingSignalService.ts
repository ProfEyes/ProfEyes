import { SignalType, SignalStrength } from '../types/signals';
import { TimeFrame } from './signals/types';
import { MarketData } from '../types/marketData';
import { TradingSignal, AdvancedSignalAnalysis } from '../types/tradingSignals';
import { supabase } from "../integrations/supabase/client";
import { formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getLatestPrices } from "./binanceApi";
import { toast } from "sonner";
import { fetchTradingSignals, replaceCompletedSignal, updateSignalStatus, replaceMultipleCompletedSignals } from './tradingSignals';
import { generateRandomId } from '@/lib/utils';

// Interfaces para uso interno na classe
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

interface ExtendedTradingSignal extends TradingSignal {
  take_profit?: number;
  exit_price?: number;
  exchange?: string;
  elapsed_time?: string;
  created_at?: string;
  updated_at?: string;
}

export class TradingSignalService {
  private priceUpdateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private signalCache: ExtendedTradingSignal[] = [];
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos em ms
  private signals: TradingSignal[] = [];
  private lastUpdate: number = 0;
  private updateInterval: number | null = null;
  private subscribers: Array<() => void> = [];

  constructor() {
    // Inicializar o serviço
    this.generateInitialSignals();
    
    // Configurar atualização automática a cada 60 segundos
    this.startAutoUpdate();
  }
  
  public async fetchTradingSignals(forceRefresh: boolean = false): Promise<TradingSignal[]> {
    try {
      const now = Date.now();
      
      // Se temos cache válido e não é forçado refresh, use cache
      if (!forceRefresh && this.signalCache.length > 0 && (now - this.lastFetchTime < this.CACHE_DURATION)) {
        return this.signalCache;
      }
      
      // Busca sinais usando a nova implementação
      const signals = await fetchTradingSignals({ limit: 5, includeCompleted: false });
      
      // Adiciona campos extras caso necessário
      const extendedSignals: ExtendedTradingSignal[] = signals.map(signal => {
        const created = new Date(signal.timestamp);
        
        return {
          ...signal,
          exchange: 'Simulado',
          elapsed_time: formatDistance(created, new Date(), { locale: ptBR, addSuffix: true }),
          created_at: signal.timestamp,
          updated_at: signal.timestamp
        };
      });
      
      // Atualiza cache
      this.signalCache = extendedSignals;
      this.lastFetchTime = now;
      
      return this.signalCache;
    } catch (error) {
      console.error('Erro ao buscar sinais:', error);
      return [];
    }
  }
  
  async updateSignalCurrentPrice(signal: TradingSignal): Promise<TradingSignal> {
    try {
      // Para a simulação, gera um preço atual baseado no preço original com uma pequena variação aleatória
      if (signal.price) {
        const priceChange = (Math.random() * 0.02) - 0.01; // Variação de -1% a +1%
        const currentPrice = signal.price * (1 + priceChange);
        
        return {
          ...signal,
          price: currentPrice
        };
      }
      
      return signal;
    } catch (error) {
      console.error(`Erro ao atualizar preço atual do sinal ${signal.id}:`, error);
      return signal;
    }
  }
  
  async updateSignalStatus(
    signal: ExtendedTradingSignal, 
    status: 'active' | 'completed' | 'cancelled', 
    exitPrice?: number
  ): Promise<ExtendedTradingSignal> {
    try {
      // Atualizar o status do sinal
      const updatedSignal = {
        ...signal,
          status, 
          exit_price: exitPrice, 
          updated_at: new Date().toISOString() 
      };
      
      // Atualizar sinal no Supabase usando a função da nova implementação
      await updateSignalStatus(updatedSignal);
      
      // Se estiver completando um sinal, substituir por um novo
      if (status === 'completed' || status === 'cancelled') {
        // Notificar usuário do resultado
        const isSuccess = exitPrice && (
          (signal.signal === 'BUY' && exitPrice > signal.entry_price) || 
          (signal.signal === 'SELL' && exitPrice < signal.entry_price)
        );
        
        if (isSuccess) {
          toast.success(`Sinal para ${signal.symbol} concluído com sucesso!`);
        } else {
          toast.error(`Sinal para ${signal.symbol} não atingiu o alvo.`);
        }
        
        // Substituir sinal concluído por um novo
        await replaceCompletedSignal(updatedSignal);
        
        // Atualizar o cache removendo o sinal concluído
        this.signalCache = this.signalCache.filter(s => s.id !== signal.id);
        
        // Buscar sinais atualizados para repor o cache
        await this.fetchTradingSignals(true);
      } else {
        // Atualizar o cache com o status atualizado
        this.signalCache = this.signalCache.map(s => 
          s.id === signal.id ? updatedSignal : s
        );
      }
      
      return updatedSignal;
    } catch (error) {
      console.error(`Erro ao atualizar status do sinal ${signal.id}:`, error);
      return signal;
    }
  }
  
  async createTradingSignal(
    signalData: Omit<ExtendedTradingSignal, 'id' | 'timestamp' | 'created_at' | 'updated_at' | 'elapsed_time'>
  ): Promise<ExtendedTradingSignal | null> {
    try {
      const now = new Date().toISOString();
      
      const newSignal: ExtendedTradingSignal = {
        ...signalData,
        id: `signal_${Date.now()}`,
        timestamp: now,
        created_at: now,
        updated_at: now,
        elapsed_time: 'agora mesmo'
      };
      
      const { data, error } = await supabase
        .from('trading_signals')
        .insert(newSignal)
        .select('*')
        .single();
      
      if (error) {
        console.error('Erro ao criar sinal:', error);
        return null;
      }
      
      // Atualizar cache
      this.signalCache.unshift(data);
      
      return data;
    } catch (error) {
      console.error('Erro ao criar sinal:', error);
      return null;
    }
  }
  
  async signalExists(symbol: string, signalType: 'BUY' | 'SELL'): Promise<boolean> {
    try {
      const signals = await this.fetchTradingSignals();
      
      return signals.some(signal => 
        signal.symbol === symbol && 
        signal.signal === signalType && 
        signal.status === 'active'
      );
    } catch (error) {
      console.error(`Erro ao verificar existência de sinal para ${symbol}:`, error);
      return false;
    }
  }
  
  invalidateCache() {
    this.lastFetchTime = 0;
    this.signalCache = [];
  }

  // Iniciar a atualização automática
  startAutoUpdate() {
    if (this.updateInterval) return;
    
    this.updateInterval = window.setInterval(() => {
      this.checkAndReplaceExpiredSignals();
      this.notifySubscribers();
    }, 15000); // Verificar a cada 15 segundos
  }

  // Parar a atualização automática
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Adicionar um assinante para notificações de alterações
  subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // Notificar todos os assinantes
  private notifySubscribers() {
    this.subscribers.forEach(callback => callback());
  }

  // Gerar sinais iniciais (8 sinais)
  private generateInitialSignals() {
    // Limpar sinais existentes
    this.signals = [];
    
    // Lista de pares para criar sinais
    const tradingPairs = [
      'BTCUSDT',
      'ETHUSDT',
      'BNBUSDT',
      'SOLUSDT', 
      'DOGEUSDT',
      'XRPUSDT',
      'ADAUSDT',
      'MATICUSDT',
      'AVAXUSDT',
      'LINKUSDT',
      'LTCUSDT',
      'DOTUSDT'
    ];
    
    // Criar 8 sinais distintos
    const numSignals = 8;
    const usedPairs = new Set<string>();
    
    for (let i = 0; i < numSignals; i++) {
      // Escolher um par que ainda não foi usado
      let pair;
      do {
        pair = tradingPairs[Math.floor(Math.random() * tradingPairs.length)];
      } while (usedPairs.has(pair));
      
      usedPairs.add(pair);
      
      // Criar o sinal
      const signal = this.generateTradingSignal(pair);
      this.signals.push(signal);
    }
  }

  // Verificar e substituir sinais expirados
  private checkAndReplaceExpiredSignals() {
    const now = Date.now();
    
    // Para cada sinal, verificar se está expirado
    this.signals.forEach((signal, index) => {
      // Verificar se o sinal tem horário de reentrada 2 expirado ou horário de expiração + 1 minuto
      const isExpired = this.isSignalExpired(signal, now);
      
      if (isExpired) {
        // Substituir o sinal expirado por um novo
        const newSignal = this.generateReplacementSignal(signal.symbol);
        this.signals[index] = newSignal;
      }
    });
  }

  // Verificar se um sinal expirou
  private isSignalExpired(signal: TradingSignal, currentTime: number): boolean {
    // Se o sinal tiver metadata.reentry2 (segunda reentrada), verificar se esse horário já passou
    if (signal.metadata?.reentry2) {
      return currentTime > signal.metadata.reentry2;
    }
    
    // Se o sinal tiver expiry definido, verificar se já passou + 1 minuto (60000ms)
    if (signal.expiry) {
      const expiryTime = new Date(signal.expiry).getTime();
      return currentTime > (expiryTime + 60000); // Expiração + 1 minuto
    }
    
    // Se chegou aqui, verificar se o sinal é mais antigo que 2 horas
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    return currentTime - signal.timestamp > twoHoursInMs;
  }

  // Gerar um sinal de substituição
  private generateReplacementSignal(symbol: string): TradingSignal {
    return this.generateTradingSignal(symbol);
  }

  // Gerar um novo sinal de trading
  private generateTradingSignal(symbol: string): TradingSignal {
    // Determinar tipo de sinal (técnico, notícia, fundamental)
    const signalTypes = [SignalType.TECHNICAL, SignalType.NEWS, SignalType.FUNDAMENTAL];
    const typeWeights = [0.7, 0.15, 0.15]; // 70% técnico, 15% notícia, 15% fundamental
    const signalType = this.weightedRandomChoice(signalTypes, typeWeights);
    
    // Determinar direção (compra/venda)
    const signalDirections = ['BUY', 'SELL'];
    const signal = this.weightedRandomChoice(signalDirections, [0.55, 0.45]) as 'BUY' | 'SELL';
    
    // Gerar preço base (simulado)
    const basePrice = this.generateBasePrice(symbol);
    
    // Calcular preços de entrada, alvo e stop
    const entryPrice = basePrice;
    const targetPrice = signal === 'BUY' 
      ? basePrice * (1 + (Math.random() * 0.03 + 0.01)) 
      : basePrice * (1 - (Math.random() * 0.03 + 0.01));
    const stopLossPrice = signal === 'BUY' 
      ? basePrice * (1 - (Math.random() * 0.015 + 0.005)) 
      : basePrice * (1 + (Math.random() * 0.015 + 0.005));
    
    // Calcular taxa de sucesso
    const successRate = 60 + Math.floor(Math.random() * 30);
    
    // Determinar força do sinal
    const strengthValues = [SignalStrength.STRONG, SignalStrength.MODERATE, SignalStrength.WEAK];
    const strengthWeights = [0.4, 0.45, 0.15]; // 40% forte, 45% moderado, 15% fraco
    const strength = this.weightedRandomChoice(strengthValues, strengthWeights);
    
    // Determinar timeframe
    const timeframes = [
      TimeFrame.MINUTE_1, TimeFrame.MINUTE_5, TimeFrame.MINUTE_15, TimeFrame.MINUTE_30, 
      TimeFrame.HOUR_1, TimeFrame.HOUR_4
    ];
    const timeframeWeights = [0.1, 0.2, 0.3, 0.2, 0.15, 0.05];
    const timeframe = this.weightedRandomChoice(timeframes, timeframeWeights);
    
    // Gerar timestamp (data/hora atual)
    const timestamp = Date.now();
    
    // Gerar razão para o sinal
    const reason = this.generateSignalReason(symbol, signalType, signal);
    
    // Calcular proporção risco/retorno
    const riskAmount = Math.abs(entryPrice - stopLossPrice);
    const rewardAmount = Math.abs(targetPrice - entryPrice);
    const riskReward = (rewardAmount / riskAmount).toFixed(1);
    
    // Gerar data de expiração (entre 30 minutos e 8 horas a partir de agora)
    const expiryMinutes = Math.floor(Math.random() * 440) + 30; // 30 a 470 minutos
    const expiryDate = new Date(timestamp + expiryMinutes * 60 * 1000);
    const expiryString = expiryDate.toISOString();
    
    // Calcular horários de reentrada (opcional)
    const reentry1 = timestamp + (Math.floor(Math.random() * 20) + 5) * 60 * 1000; // 5-25 min
    const reentry2 = reentry1 + (Math.floor(Math.random() * 15) + 10) * 60 * 1000; // 10-25 min após reentry1
    
    // Criar o objeto do sinal
    return {
      id: generateRandomId(),
      symbol,
      type: signalType,
      signal,
      reason,
      strength,
      timestamp,
      price: basePrice,
      entry_price: entryPrice,
      stop_loss: stopLossPrice,
      target_price: targetPrice,
      success_rate: successRate,
      timeframe,
      expiry: expiryString,
      risk_reward: `${riskReward}:1`,
      status: 'active',
      metadata: {
        createdAt: new Date().toISOString(),
        reentry1,
        reentry2,
        riskPercent: ((Math.abs(entryPrice - stopLossPrice) / entryPrice) * 100).toFixed(1),
        setup: this.generateSetupDescription(symbol, signal)
      }
    };
  }

  // Gerar preço base com base no símbolo
  private generateBasePrice(symbol: string): number {
    // Preços simulados para cada par (valores aproximados de mercado)
    const basePrices: Record<string, number> = {
      'BTCUSDT': 68000 + (Math.random() * 4000 - 2000),
      'ETHUSDT': 3500 + (Math.random() * 200 - 100),
      'BNBUSDT': 600 + (Math.random() * 40 - 20),
      'SOLUSDT': 145 + (Math.random() * 15 - 7.5),
      'DOGEUSDT': 0.15 + (Math.random() * 0.02 - 0.01),
      'XRPUSDT': 0.55 + (Math.random() * 0.05 - 0.025),
      'ADAUSDT': 0.45 + (Math.random() * 0.04 - 0.02),
      'MATICUSDT': 0.6 + (Math.random() * 0.06 - 0.03),
      'AVAXUSDT': 35 + (Math.random() * 3 - 1.5),
      'LINKUSDT': 15 + (Math.random() * 1.5 - 0.75),
      'LTCUSDT': 85 + (Math.random() * 8 - 4),
      'DOTUSDT': 7 + (Math.random() * 0.7 - 0.35)
    };
    
    return basePrices[symbol] || 100; // Valor padrão se o símbolo não estiver na lista
  }

  // Gerar razão para o sinal
  private generateSignalReason(symbol: string, type: SignalType, signal: 'BUY' | 'SELL'): string {
    const technicalReasons = [
      `Cruzamento de médias móveis (MA9 cruzou acima da MA21)`,
      `RSI saindo da zona de ${signal === 'BUY' ? 'sobrevenda' : 'sobrecompra'}`,
      `Rompimento de resistência importante em ${this.formatPrice(this.generateBasePrice(symbol) * (signal === 'BUY' ? 1.02 : 0.98))}`,
      `Divergência bullish no MACD`,
      `Formação de padrão ${signal === 'BUY' ? 'Martelo' : 'Estrela Cadente'} no gráfico de 15 minutos`,
      `Volume crescente com ${signal === 'BUY' ? 'maior pressão compradora' : 'maior pressão vendedora'}`,
      `Suporte da Banda de Bollinger testado múltiplas vezes`,
      `Padrão de vela ${signal === 'BUY' ? 'Engolfo de Alta' : 'Engolfo de Baixa'} formado`
    ];
    
    const newsReasons = [
      `Anúncio de parceria estratégica com grande empresa de pagamentos`,
      `Rumores de listagem em nova exchange de grande volume`,
      `Atualização de protocolo prevista para os próximos dias`,
      `CEO fez declarações ${signal === 'BUY' ? 'positivas' : 'preocupantes'} sobre o futuro da rede`,
      `Dados econômicos recentes afetam positivamente criptomoedas`,
      `Nova regulamentação favorável anunciada em mercado importante`
    ];
    
    const fundamentalReasons = [
      `Métricas on-chain mostram ${signal === 'BUY' ? 'acumulação' : 'distribuição'} por grandes carteiras`,
      `Crescimento de ${Math.floor(Math.random() * 30) + 10}% em desenvolvedores ativos na rede`,
      `Aumento significativo no volume de transações diárias`,
      `Redução nas taxas de rede tornando o uso mais acessível`,
      `Melhorias tecnológicas recentes aumentam escalabilidade`,
      `Indicadores fundamentais mostram valorização frente a outros ativos do setor`
    ];
    
    switch (type) {
      case SignalType.TECHNICAL:
        return this.randomChoice(technicalReasons);
      case SignalType.NEWS:
        return this.randomChoice(newsReasons);
      case SignalType.FUNDAMENTAL:
        return this.randomChoice(fundamentalReasons);
      default:
        return this.randomChoice(technicalReasons);
    }
  }

  // Gerar descrição de setup
  private generateSetupDescription(symbol: string, signal: 'BUY' | 'SELL'): string {
    const setups = [
      `Scalping em tendência ${signal === 'BUY' ? 'de alta' : 'de baixa'} no gráfico de 5 minutos`,
      `Reversão em ${signal === 'BUY' ? 'suporte' : 'resistência'} importante`,
      `Pullback para ${signal === 'BUY' ? 'média móvel de 50 períodos' : 'banda superior de Bollinger'}`,
      `Squeeze momentum em timeframe de 15 minutos`,
      `Retração de Fibonacci (61.8%) com confluência de volume`,
      `Confirmação de tendência com múltiplos indicadores alinhados`,
      `Breakout de consolidação com aumento de volume`,
      `Falha de swing ${signal === 'BUY' ? 'baixo' : 'alto'} com reversão de momentum`
    ];
    
    return this.randomChoice(setups);
  }

  // Escolher um item aleatório de um array
  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Escolher um item aleatório de um array com pesos
  private weightedRandomChoice<T>(array: T[], weights: number[]): T {
    // Garantir que os arrays têm o mesmo tamanho
    if (array.length !== weights.length) {
      throw new Error('Arrays e pesos devem ter o mesmo tamanho');
    }
    
    // Calcular a soma dos pesos
    const sum = weights.reduce((acc, weight) => acc + weight, 0);
    
    // Normalizar os pesos (soma = 1)
    const normalizedWeights = weights.map(weight => weight / sum);
    
    // Escolher um valor aleatório entre 0 e 1
    const randomValue = Math.random();
    
    // Escolher o item baseado nos pesos
    let cumulativeWeight = 0;
    for (let i = 0; i < array.length; i++) {
      cumulativeWeight += normalizedWeights[i];
      if (randomValue <= cumulativeWeight) {
        return array[i];
      }
    }
    
    // Fallback (nunca deveria chegar aqui)
    return array[0];
  }

  // Formatar preço para exibição
  private formatPrice(price: number): string {
    if (price >= 1000) {
      return price.toFixed(0);
    } else if (price >= 100) {
      return price.toFixed(1);
    } else if (price >= 1) {
      return price.toFixed(2);
    } else if (price >= 0.1) {
      return price.toFixed(3);
    } else {
      return price.toFixed(5);
    }
  }
}

export const tradingSignalService = new TradingSignalService(); 
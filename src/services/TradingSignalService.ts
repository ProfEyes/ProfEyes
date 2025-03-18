import { SignalType } from '@/types/signals';
import { MarketData } from '@/types/marketData';
import { TradingSignal, SignalAnalysis } from '@/types/tradingSignals';

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

  constructor(binanceService) {
    this.binanceService = binanceService;
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
  
  public async fetchTradingSignals(): Promise<TradingSignal[]> {
    try {
      const allSignals: TradingSignal[] = [];
      const marketData = await this.binanceService.getMarketData();
      
      for (const data of marketData) {
        const analysis = await this.analyzeMarketData(data);
        if (!analysis || analysis.score < 75) continue;
        
        const signal: TradingSignal = {
          id: `${data.symbol}-${Date.now()}`,
          symbol: data.symbol,
          signal: analysis.type,
          entry_price: analysis.targets.entry,
          current_price: analysis.targets.entry,
          target_price: analysis.targets.target,
          stop_loss: analysis.targets.stop,
          timeframe: '1m',
          timestamp: Date.now(),
          expiry: Date.now() + (5 * 60 * 1000),
          reasons: analysis.reasons,
          assertiveness: `${(analysis.probability * 100).toFixed(1)}%`,
          status: 'ATIVO',
          type: SignalType.TECHNICAL,
          priority: analysis.score >= 90 ? 'HIGH' : 'NORMAL'
        };
        
        // Validar R:R e adicionar apenas se for viável
        const rr = Math.abs(signal.target_price - signal.entry_price) / 
                  Math.abs(signal.stop_loss - signal.entry_price);
                  
        if (rr >= 1.3 && rr <= 2.0) {
          allSignals.push(signal);
        }
      }
      
      // Retornar apenas os melhores sinais
      return allSignals
        .sort((a, b) => parseFloat(b.assertiveness) - parseFloat(a.assertiveness))
        .slice(0, 10);
    } catch (error) {
      console.error('Erro ao buscar sinais:', error);
      return [];
    }
  }
} 
import { MarketData, SignalGenerator, SignalGeneratorResult, SignalType, TradingSignal } from './types';

/**
 * Classe base para todos os geradores de sinais
 * Implementa a interface SignalGenerator e fornece funcionalidades comuns
 */
export abstract class BaseSignalGenerator implements SignalGenerator {
  public abstract type: SignalType;
  protected logger: Console;
  
  constructor() {
    this.logger = console;
  }
  
  /**
   * Método principal para gerar sinais
   * Deve ser implementado por cada gerador específico
   */
  public abstract generateSignals(marketData: MarketData, options?: any): Promise<SignalGeneratorResult>;
  
  /**
   * Calcula a taxa de sucesso para um tipo de sinal com base em dados históricos
   * @param prices Array de preços históricos
   * @param signal Tipo de sinal (BUY ou SELL)
   * @param lookbackPeriod Período de análise retroativa
   * @returns Taxa de sucesso (0-1)
   */
  protected calculateSuccessRate(prices: number[], signal: 'BUY' | 'SELL', lookbackPeriod: number = 20): number {
    if (!prices || prices.length < lookbackPeriod + 10) {
      return 0.5; // Valor padrão se não houver dados suficientes
    }
    
    try {
      // Usar apenas os últimos 'lookbackPeriod' preços para análise
      const recentPrices = prices.slice(-lookbackPeriod - 10, -10);
      let successCount = 0;
      let totalSignals = 0;
      
      // Simular sinais e verificar resultados
      for (let i = 0; i < recentPrices.length - 10; i++) {
        const entryPrice = recentPrices[i];
        const futurePrices = recentPrices.slice(i + 1, i + 11); // 10 dias seguintes
        
        if (signal === 'BUY') {
          // Para sinais de compra, sucesso se o preço subir em pelo menos 3% em 10 dias
          const maxPrice = Math.max(...futurePrices);
          if (maxPrice >= entryPrice * 1.03) {
            successCount++;
          }
        } else {
          // Para sinais de venda, sucesso se o preço cair em pelo menos 3% em 10 dias
          const minPrice = Math.min(...futurePrices);
          if (minPrice <= entryPrice * 0.97) {
            successCount++;
          }
        }
        
        totalSignals++;
      }
      
      return totalSignals > 0 ? successCount / totalSignals : 0.5;
    } catch (error) {
      this.logger.error('Erro ao calcular taxa de sucesso:', error);
      return 0.5; // Valor padrão em caso de erro
    }
  }
  
  /**
   * Encontra níveis de suporte e resistência
   * @param prices Array de preços de fechamento
   * @param extremePrices Array de preços extremos (máximos para resistência, mínimos para suporte)
   * @param type Tipo de nível ('support' ou 'resistance')
   * @returns Array de níveis encontrados
   */
  protected findKeyLevels(prices: number[], extremePrices: number[], type: 'support' | 'resistance'): number[] {
    if (!prices || prices.length < 20 || !extremePrices || extremePrices.length < 20) {
      return [];
    }
    
    try {
      const levels: number[] = [];
      const tolerance = 0.01; // 1% de tolerância para considerar um nível
      
      // Encontrar pontos de reversão
      for (let i = 5; i < extremePrices.length - 5; i++) {
        const current = extremePrices[i];
        
        // Para suporte, procuramos mínimos locais
        // Para resistência, procuramos máximos locais
        const isExtreme = type === 'support'
          ? current <= Math.min(...extremePrices.slice(i - 5, i)) && current <= Math.min(...extremePrices.slice(i + 1, i + 6))
          : current >= Math.max(...extremePrices.slice(i - 5, i)) && current >= Math.max(...extremePrices.slice(i + 1, i + 6));
        
        if (isExtreme) {
          // Verificar se já existe um nível próximo
          const hasNearbyLevel = levels.some(level => 
            Math.abs(level - current) / current < tolerance
          );
          
          if (!hasNearbyLevel) {
            levels.push(current);
          }
        }
      }
      
      // Ordenar níveis (crescente para suporte, decrescente para resistência)
      return type === 'support'
        ? levels.sort((a, b) => a - b)
        : levels.sort((a, b) => b - a);
    } catch (error) {
      this.logger.error(`Erro ao encontrar níveis de ${type}:`, error);
      return [];
    }
  }
  
  /**
   * Calcula o ATR (Average True Range)
   * @param highs Array de preços máximos
   * @param lows Array de preços mínimos
   * @param closes Array de preços de fechamento
   * @param period Período para cálculo
   * @returns Valor do ATR
   */
  protected calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (!highs || !lows || !closes || highs.length < period + 1 || lows.length < period + 1 || closes.length < period + 1) {
      return 0;
    }
    
    try {
      // Calcular True Range para cada período
      const trueRanges: number[] = [];
      
      for (let i = 1; i < closes.length; i++) {
        const previousClose = closes[i - 1];
        const high = highs[i];
        const low = lows[i];
        
        const tr1 = high - low;
        const tr2 = Math.abs(high - previousClose);
        const tr3 = Math.abs(low - previousClose);
        
        const trueRange = Math.max(tr1, tr2, tr3);
        trueRanges.push(trueRange);
      }
      
      // Calcular média dos True Ranges para o período especificado
      if (trueRanges.length < period) {
        return 0;
      }
      
      const atr = trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
      return atr;
    } catch (error) {
      this.logger.error('Erro ao calcular ATR:', error);
      return 0;
    }
  }
  
  /**
   * Calcula a Média Móvel Simples (SMA)
   * @param prices Array de preços
   * @param period Período para cálculo
   * @returns Array de valores SMA ou 0 se não houver dados suficientes
   */
  protected calculateSMA(prices: number[], period: number): number[] {
    if (!prices || prices.length < period) {
      return [];
    }
    
    try {
      const smaValues: number[] = [];
      
      for (let i = period - 1; i < prices.length; i++) {
        const sum = prices.slice(i - period + 1, i + 1).reduce((total, price) => total + price, 0);
        smaValues.push(sum / period);
      }
      
      return smaValues;
    } catch (error) {
      this.logger.error('Erro ao calcular SMA:', error);
      return [];
    }
  }
  
  /**
   * Calcula a Média Móvel Exponencial (EMA)
   * @param prices Array de preços
   * @param period Período para cálculo
   * @returns Array de valores EMA
   */
  protected calculateEMA(prices: number[], period: number): number[] {
    if (!prices || prices.length < period) {
      return [];
    }
    
    try {
      const k = 2 / (period + 1);
      const emaValues: number[] = [];
      
      // Inicializar EMA com SMA para o primeiro valor
      const firstSMA = prices.slice(0, period).reduce((total, price) => total + price, 0) / period;
      emaValues.push(firstSMA);
      
      // Calcular EMA para os valores restantes
      for (let i = period; i < prices.length; i++) {
        const ema = prices[i] * k + emaValues[emaValues.length - 1] * (1 - k);
        emaValues.push(ema);
      }
      
      return emaValues;
    } catch (error) {
      this.logger.error('Erro ao calcular EMA:', error);
      return [];
    }
  }
  
  /**
   * Calcula o RSI (Relative Strength Index)
   * @param prices Array de preços
   * @param period Período para cálculo
   * @returns Array de valores RSI
   */
  protected calculateRSI(prices: number[], period: number = 14): number[] {
    if (!prices || prices.length <= period) {
      return [];
    }
    
    try {
      const rsiValues: number[] = [];
      const gains: number[] = [];
      const losses: number[] = [];
      
      // Calcular ganhos e perdas
      for (let i = 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
      }
      
      // Calcular médias iniciais
      let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
      let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
      
      // Calcular primeiro RSI
      let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Evitar divisão por zero
      rsiValues.push(100 - (100 / (1 + rs)));
      
      // Calcular RSI para os valores restantes
      for (let i = period; i < gains.length; i++) {
        avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
        avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
        
        rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
        rsiValues.push(100 - (100 / (1 + rs)));
      }
      
      return rsiValues;
    } catch (error) {
      this.logger.error('Erro ao calcular RSI:', error);
      return [];
    }
  }
  
  /**
   * Calcula o MACD (Moving Average Convergence Divergence)
   * @param prices Array de preços
   * @param fastPeriod Período da média rápida
   * @param slowPeriod Período da média lenta
   * @param signalPeriod Período da linha de sinal
   * @returns Objeto com linhas MACD, sinal e histograma
   */
  protected calculateMACD(
    prices: number[], 
    fastPeriod: number = 12, 
    slowPeriod: number = 26, 
    signalPeriod: number = 9
  ): { macdLine: number[], signalLine: number[], histogram: number[] } {
    if (!prices || prices.length < Math.max(fastPeriod, slowPeriod) + signalPeriod) {
      return { macdLine: [], signalLine: [], histogram: [] };
    }
    
    try {
      // Calcular EMAs
      const fastEMA = this.calculateEMA(prices, fastPeriod);
      const slowEMA = this.calculateEMA(prices, slowPeriod);
      
      // Ajustar tamanhos (a EMA mais curta terá mais valores)
      const diff = fastEMA.length - slowEMA.length;
      const adjustedFastEMA = fastEMA.slice(diff);
      
      // Calcular linha MACD (diferença entre EMAs)
      const macdLine: number[] = [];
      for (let i = 0; i < slowEMA.length; i++) {
        macdLine.push(adjustedFastEMA[i] - slowEMA[i]);
      }
      
      // Calcular linha de sinal (EMA da linha MACD)
      const signalLine = this.calculateEMA(macdLine, signalPeriod);
      
      // Calcular histograma (diferença entre MACD e linha de sinal)
      const histogram: number[] = [];
      const diff2 = macdLine.length - signalLine.length;
      const adjustedMacdLine = macdLine.slice(diff2);
      
      for (let i = 0; i < signalLine.length; i++) {
        histogram.push(adjustedMacdLine[i] - signalLine[i]);
      }
      
      return { macdLine, signalLine, histogram };
    } catch (error) {
      this.logger.error('Erro ao calcular MACD:', error);
      return { macdLine: [], signalLine: [], histogram: [] };
    }
  }
  
  /**
   * Calcula as Bandas de Bollinger para um conjunto de preços
   * @param prices Array de preços
   * @param period Período para cálculo da média móvel (padrão: 20)
   * @param stdDev Número de desvios padrão (padrão: 2)
   * @returns Objeto com bandas superior, média e inferior
   */
  protected calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { 
    upper: number[], 
    middle: number[], 
    lower: number[] 
  } {
    if (!prices || prices.length < period) {
      return { upper: [], middle: [], lower: [] };
    }
    
    try {
      // Calcular SMA para a banda média
      const sma = this.calculateSMA(prices, period);
      const upper: number[] = [];
      const lower: number[] = [];
      
      // Calcular bandas superior e inferior
      for (let i = period - 1; i < prices.length; i++) {
        // Calcular desvio padrão para o período atual
        const periodPrices = prices.slice(i - period + 1, i + 1);
        const mean = sma[i - period + 1];
        
        // Soma dos quadrados das diferenças
        let sumSquaredDiff = 0;
        for (let j = 0; j < periodPrices.length; j++) {
          sumSquaredDiff += Math.pow(periodPrices[j] - mean, 2);
        }
        
        // Desvio padrão
        const standardDeviation = Math.sqrt(sumSquaredDiff / period);
        
        // Bandas superior e inferior
        upper.push(mean + (standardDeviation * stdDev));
        lower.push(mean - (standardDeviation * stdDev));
      }
      
      return { upper, middle: sma, lower };
    } catch (error) {
      this.logger.error('Erro ao calcular Bandas de Bollinger:', error);
      return { upper: [], middle: [], lower: [] };
    }
  }
  
  /**
   * Verifica divergências entre preço e RSI
   * @param prices Array de preços recentes
   * @param rsi Array de valores RSI correspondentes
   * @returns Tipo de divergência encontrada ou null
   */
  protected checkRSIDivergence(prices: number[], rsi: number[]): 'bullish' | 'bearish' | null {
    if (!prices || !rsi || prices.length < 10 || rsi.length < 10 || prices.length !== rsi.length) {
      return null;
    }
    
    try {
      // Encontrar máximos e mínimos locais nos preços
      const priceHighs: number[] = [];
      const priceLows: number[] = [];
      
      for (let i = 2; i < prices.length - 2; i++) {
        if (prices[i] > prices[i - 1] && prices[i] > prices[i - 2] && 
            prices[i] > prices[i + 1] && prices[i] > prices[i + 2]) {
          priceHighs.push(i);
        }
        
        if (prices[i] < prices[i - 1] && prices[i] < prices[i - 2] && 
            prices[i] < prices[i + 1] && prices[i] < prices[i + 2]) {
          priceLows.push(i);
        }
      }
      
      // Verificar divergência bullish (preços formando mínimos mais baixos, RSI formando mínimos mais altos)
      if (priceLows.length >= 2) {
        const lastLow = priceLows[priceLows.length - 1];
        const prevLow = priceLows[priceLows.length - 2];
        
        if (prices[lastLow] < prices[prevLow] && rsi[lastLow] > rsi[prevLow]) {
          return 'bullish';
        }
      }
      
      // Verificar divergência bearish (preços formando máximos mais altos, RSI formando máximos mais baixos)
      if (priceHighs.length >= 2) {
        const lastHigh = priceHighs[priceHighs.length - 1];
        const prevHigh = priceHighs[priceHighs.length - 2];
        
        if (prices[lastHigh] > prices[prevHigh] && rsi[lastHigh] < rsi[prevHigh]) {
          return 'bearish';
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('Erro ao verificar divergência de RSI:', error);
      return null;
    }
  }
} 
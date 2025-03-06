import { BaseSignalGenerator } from './BaseSignalGenerator';
import { 
  HistoricalData, 
  MarketData, 
  SignalGeneratorResult, 
  SignalStrength, 
  SignalType, 
  TradingSignal 
} from './types';
import { getHistoricalKlines } from '../binanceApi';

/**
 * Gerador de sinais técnicos
 * Implementa análise técnica para gerar sinais de trading
 */
export class TechnicalSignalGenerator extends BaseSignalGenerator {
  public type = SignalType.TECHNICAL;
  
  /**
   * Gera sinais técnicos com base nos dados de mercado
   * @param marketData Dados de mercado do ativo
   * @param options Opções adicionais para geração de sinais
   * @returns Resultado com sinais gerados
   */
  public async generateSignals(marketData: MarketData, options?: any): Promise<SignalGeneratorResult> {
    const signals: TradingSignal[] = [];
    const { symbol, price, isCrypto } = marketData;
    
    try {
      // Buscar dados históricos se não estiverem disponíveis
      let historicalData = marketData.historicalData;
      
      if (!historicalData) {
        historicalData = await this.fetchHistoricalData(symbol, isCrypto);
        
        if (!historicalData || !historicalData.closes || historicalData.closes.length < 20) {
          this.logger.warn(`Dados históricos insuficientes para ${symbol}`);
          return { signals: [] };
        }
      }
      
      const { opens, highs, lows, closes, volumes } = historicalData;
      
      // Calcular indicadores técnicos
      const sma8 = this.calculateSMA(closes, 8);
      const sma20 = this.calculateSMA(closes, 20);
      const sma50 = this.calculateSMA(closes, 50);
      const sma200 = this.calculateSMA(closes, 200);
      
      const rsi = this.calculateRSI(closes, 14);
      const currentRSI = rsi[rsi.length - 1];
      
      // Calcular MACD
      const { macdLine, signalLine, histogram } = this.calculateMACD(closes);
      
      // Calcular Bollinger Bands
      const bollingerBands = this.calculateBollingerBands(closes, 20, 2);
      
      // Calcular ATR para stop loss e targets
      const atr = this.calculateATR(highs, lows, closes, 14);
      
      // Encontrar níveis de suporte e resistência
      const supports = this.findKeyLevels(closes, lows, 'support');
      const resistances = this.findKeyLevels(closes, highs, 'resistance');
      
      // Encontrar o suporte mais próximo abaixo do preço atual
      const closestSupport = supports.filter(s => s < price).sort((a, b) => b - a)[0] || price * 0.9;
      
      // Encontrar a resistência mais próxima acima do preço atual
      const closestResistance = resistances.filter(r => r > price).sort((a, b) => a - b)[0] || price * 1.1;
      
      // Verificar divergências de RSI
      const rsiDivergence = this.checkRSIDivergence(closes.slice(-10), rsi.slice(-10));
      
      // Detectar padrões de candlestick
      const candlestickPatterns = this.detectCandlestickPatterns(
        opens.slice(-20), 
        highs.slice(-20), 
        lows.slice(-20), 
        closes.slice(-20),
        volumes.slice(-20)
      );
      
      // Detectar tendência geral
      const trend = this.detectTrend(closes);
      
      // Calcular taxa de sucesso com base em sinais históricos
      const successRate = this.calculateSuccessRate(symbol, closes);
      
      // Gerar sinais com base nos indicadores
      
      // 1. Cruzamento de médias móveis (Golden Cross / Death Cross)
      if (sma50.length > 2 && sma200.length > 2) {
        const lastIndex = sma50.length - 1;
        const prevIndex = lastIndex - 1;
        
        // Golden Cross (SMA50 cruza SMA200 para cima)
        if (sma50[prevIndex] <= sma200[prevIndex] && sma50[lastIndex] > sma200[lastIndex]) {
          signals.push(this.createSignal({
            symbol,
            signal: 'BUY',
            reason: 'Golden Cross (SMA50 cruzou SMA200 para cima)',
            strength: SignalStrength.STRONG,
            price,
            stopLoss: price * 0.95, // 5% abaixo do preço atual
            targetPrice: price * 1.15, // 15% acima do preço atual
            successRate,
            timeframe: '1d',
            expiryDays: 30,
            metadata: { indicator: 'moving_average_cross' }
          }));
        }
        
        // Death Cross (SMA50 cruza SMA200 para baixo)
        if (sma50[prevIndex] >= sma200[prevIndex] && sma50[lastIndex] < sma200[lastIndex]) {
          signals.push(this.createSignal({
            symbol,
            signal: 'SELL',
            reason: 'Death Cross (SMA50 cruzou SMA200 para baixo)',
            strength: SignalStrength.STRONG,
            price,
            stopLoss: price * 1.05, // 5% acima do preço atual
            targetPrice: price * 0.85, // 15% abaixo do preço atual
            successRate,
            timeframe: '1d',
            expiryDays: 30,
            metadata: { indicator: 'moving_average_cross' }
          }));
        }
      }
      
      // Se não temos sinais fortes, gerar sinais baseados em indicadores de curto prazo
      if (signals.length === 0 && sma8.length > 2 && sma20.length > 2) {
        const lastIndex = sma8.length - 1;
        const prevIndex = lastIndex - 1;
        
        // Cruzamento de SMA8 e SMA20 (mais curto prazo)
        if (sma8[prevIndex] <= sma20[prevIndex] && sma8[lastIndex] > sma20[lastIndex]) {
          signals.push(this.createSignal({
            symbol,
            signal: 'BUY',
            reason: 'Cruzamento de médias curtas (SMA8 cruzou SMA20 para cima)',
            strength: SignalStrength.MODERATE,
            price,
            stopLoss: price * 0.97, // 3% abaixo do preço atual
            targetPrice: price * 1.06, // 6% acima do preço atual
            successRate: Math.max(0.6, successRate * 0.9), // Ligeiramente menor que a taxa normal
            timeframe: '1d',
            expiryDays: 14,
            metadata: { indicator: 'short_term_ma_cross' }
          }));
        }
        
        if (sma8[prevIndex] >= sma20[prevIndex] && sma8[lastIndex] < sma20[lastIndex]) {
          signals.push(this.createSignal({
            symbol,
            signal: 'SELL',
            reason: 'Cruzamento de médias curtas (SMA8 cruzou SMA20 para baixo)',
            strength: SignalStrength.MODERATE,
            price,
            stopLoss: price * 1.03, // 3% acima do preço atual
            targetPrice: price * 0.94, // 6% abaixo do preço atual
            successRate: Math.max(0.6, successRate * 0.9),
            timeframe: '1d',
            expiryDays: 14,
            metadata: { indicator: 'short_term_ma_cross' }
          }));
        }
      }
      
      // Se ainda não temos sinais, verificar RSI para condições de sobrecompra/sobrevenda
      if (signals.length === 0 && rsi.length > 0) {
        const lastRSI = rsi[rsi.length - 1];
        
        // RSI em condição de sobrevenda (abaixo de 30)
        if (lastRSI < 30) {
          signals.push(this.createSignal({
            symbol,
            signal: 'BUY',
            reason: `RSI em condição de sobrevenda (${lastRSI.toFixed(2)})`,
            strength: SignalStrength.MODERATE,
            price,
            stopLoss: price * 0.97, // 3% abaixo do preço atual
            targetPrice: price * 1.05, // 5% acima do preço atual
            successRate: Math.max(0.55, successRate * 0.85),
            timeframe: '1d',
            expiryDays: 7,
            metadata: { indicator: 'rsi_oversold' }
          }));
        }
        
        // RSI em condição de sobrecompra (acima de 70)
        if (lastRSI > 70) {
          signals.push(this.createSignal({
            symbol,
            signal: 'SELL',
            reason: `RSI em condição de sobrecompra (${lastRSI.toFixed(2)})`,
            strength: SignalStrength.MODERATE,
            price,
            stopLoss: price * 1.03, // 3% acima do preço atual
            targetPrice: price * 0.95, // 5% abaixo do preço atual
            successRate: Math.max(0.55, successRate * 0.85),
            timeframe: '1d',
            expiryDays: 7,
            metadata: { indicator: 'rsi_overbought' }
          }));
        }
      }
      
      // Continuar com o resto da lógica existente...
      
      // Retornar os sinais gerados
      return {
        signals,
        metadata: {
          indicators: {
            sma: { sma8: sma8[sma8.length - 1], sma20: sma20[sma20.length - 1] },
            rsi: rsi[rsi.length - 1],
            macd: { line: macdLine[macdLine.length - 1], signal: signalLine[signalLine.length - 1], histogram: histogram[histogram.length - 1] },
            bollingerBands: {
              upper: bollingerBands.upper[bollingerBands.upper.length - 1],
              middle: bollingerBands.middle[bollingerBands.middle.length - 1],
              lower: bollingerBands.lower[bollingerBands.lower.length - 1]
            },
            atr: atr[atr.length - 1],
            patterns,
            trend,
            levels: { supports, resistances }
          }
        }
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar sinais técnicos para ${symbol}:`, error);
      return { signals: [] };
    }
  }
  
  /**
   * Busca dados históricos para um ativo
   * @param symbol Símbolo do ativo
   * @param isCrypto Indica se é um ativo de criptomoeda
   * @returns Dados históricos
   */
  private async fetchHistoricalData(symbol: string, isCrypto: boolean): Promise<HistoricalData | null> {
    try {
      // Agora usamos apenas dados da Binance
      const klines = await getHistoricalKlines(symbol, '1d', 200);
      if (klines.length < 20) {
        return null;
      }

      const opens: number[] = [];
      const highs: number[] = [];
      const lows: number[] = [];
      const closes: number[] = [];
      const volumes: number[] = [];

      klines.forEach(kline => {
        opens.push(parseFloat(kline[1]));
        highs.push(parseFloat(kline[2]));
        lows.push(parseFloat(kline[3]));
        closes.push(parseFloat(kline[4]));
        volumes.push(parseFloat(kline[5]));
      });

      return {
        opens,
        highs,
        lows,
        closes,
        volumes,
        timestamps: klines.map(k => k[0])
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar dados históricos para ${symbol}:`, error);
      return null;
    }
  }
  
  /**
   * Cria um objeto de sinal de trading
   * @param params Parâmetros para o sinal
   * @returns Objeto TradingSignal
   */
  private createSignal(params: {
    symbol: string;
    signal: 'BUY' | 'SELL';
    reason: string;
    strength: SignalStrength;
    price: number;
    stopLoss: number;
    targetPrice: number;
    successRate: number;
    timeframe: string;
    expiryDays: number;
    metadata?: Record<string, any>;
  }): TradingSignal {
    const {
      symbol,
      signal,
      reason,
      strength,
      price,
      stopLoss,
      targetPrice,
      successRate,
      timeframe,
      expiryDays,
      metadata
    } = params;
    
    const riskReward = signal === 'BUY'
      ? ((targetPrice - price) / (price - stopLoss)).toFixed(2)
      : ((price - targetPrice) / (stopLoss - price)).toFixed(2);
    
    return {
      symbol,
      type: this.type,
      signal,
      reason,
      strength,
      timestamp: Date.now(),
      price,
      entry_price: price,
      stop_loss: stopLoss,
      target_price: targetPrice,
      success_rate: successRate,
      timeframe,
      expiry: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
      risk_reward: riskReward,
      status: 'active',
      metadata
    };
  }
  
  /**
   * Detecta padrões de candlestick
   * @param opens Array de preços de abertura
   * @param highs Array de preços máximos
   * @param lows Array de preços mínimos
   * @param closes Array de preços de fechamento
   * @param volumes Array de volumes (opcional)
   * @returns Array de padrões detectados com força e direção
   */
  private detectCandlestickPatterns(
    opens: number[],
    highs: number[],
    lows: number[],
    closes: number[],
    volumes?: number[]
  ): { pattern: string; strength: number; bullish: boolean }[] {
    if (!opens || !highs || !lows || !closes || 
        opens.length < 3 || highs.length < 3 || lows.length < 3 || closes.length < 3) {
      return [];
    }
    
    const patterns: { pattern: string; strength: number; bullish: boolean }[] = [];
    
    try {
      // Verificar padrão de Doji
      const lastOpen = opens[opens.length - 1];
      const lastClose = closes[closes.length - 1];
      const lastHigh = highs[highs.length - 1];
      const lastLow = lows[lows.length - 1];
      
      const bodySize = Math.abs(lastClose - lastOpen);
      const totalRange = lastHigh - lastLow;
      
      if (totalRange > 0 && bodySize / totalRange < 0.1) {
        // Doji (corpo muito pequeno)
        const prevClose = closes[closes.length - 2];
        const trend = this.detectTrend(closes.slice(-10));
        
        if (trend === 'up') {
          // Doji após tendência de alta (possível reversão)
          patterns.push({
            pattern: 'Doji de Topo',
            strength: 0.7,
            bullish: false
          });
        } else if (trend === 'down') {
          // Doji após tendência de baixa (possível reversão)
          patterns.push({
            pattern: 'Doji de Fundo',
            strength: 0.7,
            bullish: true
          });
        }
      }
      
      // Verificar padrão de Martelo/Enforcado
      const lastBody = Math.abs(lastClose - lastOpen);
      const lastLowerShadow = Math.min(lastOpen, lastClose) - lastLow;
      const lastUpperShadow = lastHigh - Math.max(lastOpen, lastClose);
      
      if (lastBody > 0 && lastLowerShadow >= lastBody * 2 && lastUpperShadow < lastBody * 0.5) {
        // Martelo (sombra inferior longa, sombra superior curta)
        if (lastClose > lastOpen && this.detectTrend(closes.slice(-10)) === 'down') {
          patterns.push({
            pattern: 'Martelo',
            strength: 0.8,
            bullish: true
          });
        } else if (lastClose < lastOpen && this.detectTrend(closes.slice(-10)) === 'up') {
          patterns.push({
            pattern: 'Enforcado',
            strength: 0.75,
            bullish: false
          });
        }
      }
      
      // Verificar padrão de Engolfo
      if (opens.length >= 2 && closes.length >= 2) {
        const prevOpen = opens[opens.length - 2];
        const prevClose = closes[closes.length - 2];
        
        // Engolfo de alta
        if (
          prevClose < prevOpen && // Vela anterior de baixa
          lastClose > lastOpen && // Vela atual de alta
          lastOpen <= prevClose && // Abertura atual menor ou igual ao fechamento anterior
          lastClose >= prevOpen // Fechamento atual maior ou igual à abertura anterior
        ) {
          patterns.push({
            pattern: 'Engolfo de Alta',
            strength: 0.85,
            bullish: true
          });
        }
        
        // Engolfo de baixa
        if (
          prevClose > prevOpen && // Vela anterior de alta
          lastClose < lastOpen && // Vela atual de baixa
          lastOpen >= prevClose && // Abertura atual maior ou igual ao fechamento anterior
          lastClose <= prevOpen // Fechamento atual menor ou igual à abertura anterior
        ) {
          patterns.push({
            pattern: 'Engolfo de Baixa',
            strength: 0.85,
            bullish: false
          });
        }
      }
      
      // Verificar padrão de Estrela da Manhã/Estrela da Noite
      if (opens.length >= 3 && closes.length >= 3) {
        const firstOpen = opens[opens.length - 3];
        const firstClose = closes[closes.length - 3];
        const middleOpen = opens[opens.length - 2];
        const middleClose = closes[closes.length - 2];
        
        // Estrela da Manhã
        if (
          firstClose < firstOpen && // Primeira vela de baixa
          Math.abs(middleClose - middleOpen) < Math.abs(firstClose - firstOpen) * 0.3 && // Vela do meio pequena
          Math.max(middleOpen, middleClose) < firstClose && // Vela do meio abaixo da primeira
          lastClose > lastOpen && // Última vela de alta
          lastClose > (firstOpen + firstClose) / 2 // Última vela recupera mais da metade da primeira
        ) {
          patterns.push({
            pattern: 'Estrela da Manhã',
            strength: 0.9,
            bullish: true
          });
        }
        
        // Estrela da Noite
        if (
          firstClose > firstOpen && // Primeira vela de alta
          Math.abs(middleClose - middleOpen) < Math.abs(firstClose - firstOpen) * 0.3 && // Vela do meio pequena
          Math.min(middleOpen, middleClose) > firstClose && // Vela do meio acima da primeira
          lastClose < lastOpen && // Última vela de baixa
          lastClose < (firstOpen + firstClose) / 2 // Última vela perde mais da metade da primeira
        ) {
          patterns.push({
            pattern: 'Estrela da Noite',
            strength: 0.9,
            bullish: false
          });
        }
      }
      
      return patterns;
    } catch (error) {
      this.logger.error('Erro ao detectar padrões de candlestick:', error);
      return [];
    }
  }
  
  /**
   * Detecta a tendência atual com base nos preços recentes
   * @param prices Array de preços
   * @returns Tendência detectada ('up', 'down' ou 'sideways')
   */
  private detectTrend(prices: number[]): 'up' | 'down' | 'sideways' {
    if (!prices || prices.length < 5) {
      return 'sideways';
    }
    
    try {
      // Calcular média móvel de 5 períodos
      const sma5 = this.calculateSMA(prices, 5);
      
      if (sma5.length < 2) {
        return 'sideways';
      }
      
      const currentSMA = sma5[sma5.length - 1];
      const prevSMA = sma5[sma5.length - 2];
      
      // Calcular inclinação
      const slope = (currentSMA - prevSMA) / prevSMA;
      
      if (slope > 0.005) { // 0.5% de inclinação positiva
        return 'up';
      } else if (slope < -0.005) { // 0.5% de inclinação negativa
        return 'down';
      } else {
        return 'sideways';
      }
    } catch (error) {
      this.logger.error('Erro ao detectar tendência:', error);
      return 'sideways';
    }
  }
} 
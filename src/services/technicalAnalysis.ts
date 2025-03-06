import { getHistoricalKlines, getLatestPrices } from './binanceApi';

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  sma: {
    sma20: number;
    sma50: number;
    sma200: number;
  };
  bb: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochRsi: {
    k: number;
    d: number;
  };
}

export interface PriceData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi?: number;
  macdLine?: number;
  macdSignal?: number;
  macdHistogram?: number;
  stochK?: number;
  stochD?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
}

// Calcula o RSI (Relative Strength Index)
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50; // Valor padrão se não houver dados suficientes
  }

  let gains = 0;
  let losses = 0;

  // Calcular ganhos e perdas iniciais
  for (let i = 1; i <= period; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference >= 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }

  // Calcular médias iniciais
  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calcular para o restante dos preços
  for (let i = period + 1; i < prices.length; i++) {
    const difference = prices[i] - prices[i - 1];
    
    if (difference >= 0) {
      avgGain = (avgGain * (period - 1) + difference) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - difference) / period;
    }
  }

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calcula o MACD (Moving Average Convergence Divergence)
function calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  const signalLine = calculateEMA([...Array(prices.length - 26).fill(0), macdLine], 9);
  const histogram = macdLine - signalLine;

  return {
    value: macdLine,
    signal: signalLine,
    histogram: histogram
  };
}

// Calcula EMA (Exponential Moving Average)
function calculateEMA(prices: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  let ema = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

// Calcula SMA (Simple Moving Average)
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) {
    return prices[prices.length - 1];
  }

  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

// Calcula Bandas de Bollinger
function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
  upper: number;
  middle: number;
  lower: number;
} {
  const sma = calculateSMA(prices, period);
  
  // Calcular desvio padrão
  const squaredDifferences = prices.slice(-period).map(price => Math.pow(price - sma, 2));
  const variance = squaredDifferences.reduce((a, b) => a + b, 0) / period;
  const standardDeviation = Math.sqrt(variance);

  return {
    upper: sma + (standardDeviation * stdDev),
    middle: sma,
    lower: sma - (standardDeviation * stdDev)
  };
}

// Calcula o Stochastic RSI
function calculateStochRSI(prices: number[], period: number = 14): { k: number; d: number } {
  const rsiValues = [];
  let minRsi = Infinity;
  let maxRsi = -Infinity;

  // Calcular valores RSI
  for (let i = period; i < prices.length; i++) {
    const rsi = calculateRSI(prices.slice(0, i + 1));
    rsiValues.push(rsi);
    minRsi = Math.min(minRsi, rsi);
    maxRsi = Math.max(maxRsi, rsi);
  }

  // Calcular %K do Stochastic RSI
  const lastRsi = rsiValues[rsiValues.length - 1];
  const k = ((lastRsi - minRsi) / (maxRsi - minRsi)) * 100;

  // Calcular %D (média móvel de %K)
  const d = calculateSMA(rsiValues.slice(-3), 3);

  return { k, d };
}

// Função principal para obter todos os indicadores técnicos
export async function getTechnicalIndicators(
  symbol: string,
  interval: '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M' = '1d'
): Promise<TechnicalIndicators> {
  try {
    // Buscar dados históricos
    const klines = await getHistoricalKlines(symbol, interval, 200);
    const prices = klines.map(k => parseFloat(k[4])); // Preços de fechamento

    // Calcular indicadores
    const rsi = calculateRSI(prices);
    const macd = calculateMACD(prices);
    const sma = {
      sma20: calculateSMA(prices, 20),
      sma50: calculateSMA(prices, 50),
      sma200: calculateSMA(prices, 200)
    };
    const bb = calculateBollingerBands(prices);
    const stochRsi = calculateStochRSI(prices);

    return {
      rsi,
      macd,
      sma,
      bb,
      stochRsi
    };
  } catch (error) {
    console.error('Erro ao calcular indicadores técnicos:', error);
    throw error;
  }
}

// Função para obter dados de preço formatados para o gráfico
export async function getPriceData(
  symbol: string,
  interval: '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M' = '1d',
  limit: number = 100
): Promise<PriceData[]> {
  try {
    const klines = await getHistoricalKlines(symbol, interval, limit);
    
    // Extrair preços de fechamento para cálculo dos indicadores
    const closePrices = klines.map(k => parseFloat(k[4]));
    
    // Calcular RSI
    const rsiValues: number[] = [];
    let gains = 0;
    let losses = 0;
    const rsiPeriod = 14;

    // Calcular ganhos e perdas iniciais
    for (let i = 1; i <= rsiPeriod; i++) {
      const difference = closePrices[i] - closePrices[i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
      rsiValues.push(50); // Valor padrão para o período inicial
    }

    // Calcular médias iniciais
    let avgGain = gains / rsiPeriod;
    let avgLoss = losses / rsiPeriod;

    // Calcular RSI para o restante dos preços
    for (let i = rsiPeriod + 1; i < closePrices.length; i++) {
      const difference = closePrices[i] - closePrices[i - 1];
      
      if (difference >= 0) {
        avgGain = (avgGain * (rsiPeriod - 1) + difference) / rsiPeriod;
        avgLoss = (avgLoss * (rsiPeriod - 1)) / rsiPeriod;
      } else {
        avgGain = (avgGain * (rsiPeriod - 1)) / rsiPeriod;
        avgLoss = (avgLoss * (rsiPeriod - 1) - difference) / rsiPeriod;
      }

      const rs = avgGain / avgLoss;
      rsiValues.push(100 - (100 / (1 + rs)));
    }

    // Calcular MACD
    const ema12Values: number[] = [];
    const ema26Values: number[] = [];
    const macdLineValues: number[] = [];
    const macdSignalValues: number[] = [];
    const macdHistogramValues: number[] = [];

    // Calcular EMA 12
    let ema12 = closePrices[0];
    const multiplier12 = 2 / (12 + 1);
    for (let i = 0; i < closePrices.length; i++) {
      ema12 = (closePrices[i] - ema12) * multiplier12 + ema12;
      ema12Values.push(ema12);
    }

    // Calcular EMA 26
    let ema26 = closePrices[0];
    const multiplier26 = 2 / (26 + 1);
    for (let i = 0; i < closePrices.length; i++) {
      ema26 = (closePrices[i] - ema26) * multiplier26 + ema26;
      ema26Values.push(ema26);

      // Calcular linha MACD
      const macdLine = ema12Values[i] - ema26Values[i];
      macdLineValues.push(macdLine);
    }

    // Calcular Sinal (EMA 9 da linha MACD)
    let signalLine = macdLineValues[0];
    const multiplier9 = 2 / (9 + 1);
    for (let i = 0; i < macdLineValues.length; i++) {
      signalLine = (macdLineValues[i] - signalLine) * multiplier9 + signalLine;
      macdSignalValues.push(signalLine);

      // Calcular histograma
      macdHistogramValues.push(macdLineValues[i] - signalLine);
    }

    // Calcular Stochastic RSI
    const stochRsiValues = [];
    for (let i = 0; i < closePrices.length; i++) {
      if (i < 14) {
        stochRsiValues.push({ k: 50, d: 50 });
      } else {
        const stochRsi = calculateStochRSI(closePrices.slice(0, i + 1));
        stochRsiValues.push(stochRsi);
      }
    }

    // Calcular SMAs
    const sma20Values = [];
    const sma50Values = [];
    const sma200Values = [];

    for (let i = 0; i < closePrices.length; i++) {
      if (i >= 19) {
        sma20Values.push(calculateSMA(closePrices.slice(0, i + 1), 20));
      } else {
        sma20Values.push(null);
      }

      if (i >= 49) {
        sma50Values.push(calculateSMA(closePrices.slice(0, i + 1), 50));
      } else {
        sma50Values.push(null);
      }

      if (i >= 199) {
        sma200Values.push(calculateSMA(closePrices.slice(0, i + 1), 200));
      } else {
        sma200Values.push(null);
      }
    }
    
    // Formatar dados para o gráfico
    return klines.map((k, i) => ({
      time: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      rsi: rsiValues[i],
      macdLine: macdLineValues[i],
      macdSignal: macdSignalValues[i],
      macdHistogram: macdHistogramValues[i],
      stochK: stochRsiValues[i]?.k,
      stochD: stochRsiValues[i]?.d,
      sma20: sma20Values[i],
      sma50: sma50Values[i],
      sma200: sma200Values[i]
    }));
  } catch (error) {
    console.error('Erro ao buscar dados de preço:', error);
    throw error;
  }
} 
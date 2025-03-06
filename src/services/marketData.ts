import { supabase } from "@/integrations/supabase/client";
import { MarketData, TradingSignal } from "./types";
import { getBinancePrice, initPriceWebSocket, onPriceUpdate, getBinanceHistoricalData, getHistoricalKlines, getLatestPrices } from "./binanceApi";
import { fetchCompanyNews } from "./newsApi";
import { determineDayTradeTrend, generateDayTradePattern, generateOrderBookAnalysis } from "./utils/tradingUtils";
import { fetchCandles, fetchAnalystRecommendations, fetchPriceTarget } from "./finnhubApi";
import { fetchFinancialNews, fetchNewsHeadlines } from "./newsApi";
import { fetchMarketNews, fetchNewsForSymbol } from "./newsService";

// Definições de interfaces
export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  high: number;
  low: number;
  news?: any[];
  historicalData?: {
    timestamps: number[];
    opens: number[];
    highs: number[];
    lows: number[];
    closes: number[];
    volumes: number[];
  };
}

export interface TradingSignal {
  id: number;
  pair: string;
  type: 'COMPRA' | 'VENDA';
  entry: string;
  target: string;
  stopLoss: string;
  timestamp: string;
  status: 'ATIVO' | 'CONCLUÍDO' | 'CANCELADO';
  successRate: number;
  timeframe: 'DAYTRADING' | 'CURTO' | 'MÉDIO' | 'LONGO';
  score: number;
  riskRewardRatio?: number;
}

// Cache de preços em tempo real
const realTimePrices: Map<string, MarketData> = new Map();

// Inicializa o WebSocket da Binance
initPriceWebSocket();

// Array de símbolos para monitorar (apenas criptomoedas)
const MONITORED_SYMBOLS = [
  'BTCUSDT',  // Bitcoin
  'ETHUSDT',  // Ethereum
  'BNBUSDT',  // Binance Coin
  'ADAUSDT',  // Cardano
  'SOLUSDT',  // Solana
  'DOTUSDT',  // Polkadot
  'MATICUSDT', // Polygon
  'LINKUSDT',  // Chainlink
  'AVAXUSDT',  // Avalanche
  'ATOMUSDT'   // Cosmos
];

// Cache para dados de mercado
const marketDataCache: { [key: string]: { data: MarketData; timestamp: number } } = {};
const CACHE_DURATION = 60 * 1000; // 1 minuto

// Função para obter preços da Binance
export async function getBinancePrice(symbol: string): Promise<{ 
  price: string; 
  change: string; 
  changePercent: string;
  volume?: string;
  high24h?: string;
  low24h?: string;
}> {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
    const data = await response.json();
    
    const price = parseFloat(data.lastPrice).toFixed(2);
    const change = parseFloat(data.priceChange).toFixed(2);
    const changePercent = parseFloat(data.priceChangePercent).toFixed(2);
    
    // Atualizar cache imediatamente
    if (realTimePrices.has(symbol)) {
      const existingData = realTimePrices.get(symbol)!;
      realTimePrices.set(symbol, {
        ...existingData,
        price: `$${price}`,
        change,
        changePercent: `${changePercent}%`
      });
    }
    
    return {
      price,
      change,
      changePercent: `${changePercent}%`,
      volume: data.volume,
      high24h: data.highPrice,
      low24h: data.lowPrice
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return {
      price: "0.00",
      change: "0.00",
      changePercent: "0.00%",
      volume: "0.00",
      high24h: "0.00",
      low24h: "0.00"
    };
  }
}

// Função para buscar dados de mercado
export async function fetchMarketData(symbol: string): Promise<MarketData> {
  try {
    // Buscar preço atual
    const priceData = await getBinancePrice(symbol);
    const currentPrice = parseFloat(priceData.price);

    // Buscar dados históricos
    const klines = await getHistoricalKlines(symbol, '1d', 30);
    let priceChange = 0;
    let volume = 0;
    let high = 0;
    let low = 0;
    let historicalData = null;

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

      // Preparar dados históricos
      historicalData = {
        timestamps: klines.map(k => parseInt(k[0])),
        opens: klines.map(k => parseFloat(k[1])),
        highs: klines.map(k => parseFloat(k[2])),
        lows: klines.map(k => parseFloat(k[3])),
        closes: klines.map(k => parseFloat(k[4])),
        volumes: klines.map(k => parseFloat(k[5]))
      };
    }

    // Buscar notícias
    const news = await fetchCompanyNews(symbol);

    return {
      symbol,
      price: currentPrice,
      change: priceChange,
      volume,
      high,
      low,
      news,
      historicalData
    };
  } catch (error) {
    console.error(`Erro ao buscar dados de mercado para ${symbol}:`, error);
    throw error;
  }
}

// Função para análise de ativos
// Renomeando para evitar conflitos
export async function analyzeMarketAsset(symbol: string): Promise<{
  trend: 'up' | 'down' | 'sideways';
  strength: 'strong' | 'moderate' | 'weak';
  volatility: 'high' | 'moderate' | 'low';
  momentum: 'increasing' | 'decreasing' | 'stable';
}> {
  try {
    // Buscar dados históricos
    const klines = await getHistoricalKlines(symbol, '1d', 30);
    
    if (!klines || klines.length < 30) {
      throw new Error('Dados históricos insuficientes para análise');
    }

    const closes = klines.map(k => parseFloat(k[4]));
    const volumes = klines.map(k => parseFloat(k[5]));
    
    // Calcular médias móveis
    const sma5 = calculateSMA(closes, 5);
    const sma20 = calculateSMA(closes, 20);

    // Calcular RSI
    const rsi = calculateRSI(closes);

    // Calcular ATR para volatilidade
    const highs = klines.map(k => parseFloat(k[2]));
    const lows = klines.map(k => parseFloat(k[3]));
    const atr = calculateATR(highs, lows, closes);

    // Determinar tendência
    const trend = determineTrend(closes, sma5, sma20);

    // Determinar força da tendência
    const strength = determineStrength(closes, rsi);

    // Determinar volatilidade
    const volatility = determineVolatility(atr);

    // Determinar momentum
    const momentum = determineMomentum(closes, volumes);

    return {
      trend,
      strength,
      volatility,
      momentum
    };
  } catch (error) {
    console.error(`Erro ao analisar ativo ${symbol}:`, error);
    throw error;
  }
}

function calculateSMA(data: number[], period: number): number[] {
  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi = [];
  const gains = [];
  const losses = [];

  // Calcular ganhos e perdas
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  // Calcular médias iniciais
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Primeira RSI
  rsi.push(100 - (100 / (1 + avgGain / avgLoss)));

  // Calcular RSI para o resto dos preços
  for (let i = period; i < prices.length - 1; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rsi.push(100 - (100 / (1 + avgGain / avgLoss)));
  }

  return rsi;
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number[] {
  const tr = [];
  const atr = [];

  // Calcular True Range
  for (let i = 1; i < highs.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(hl, hc, lc));
  }

  // Calcular ATR inicial
  let atrValue = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  atr.push(atrValue);

  // Calcular ATR para o resto dos períodos
  for (let i = period; i < tr.length; i++) {
    atrValue = ((atrValue * (period - 1)) + tr[i]) / period;
    atr.push(atrValue);
  }

  return atr;
}

function determineTrend(closes: number[], sma5: number[], sma20: number[]): 'up' | 'down' | 'sideways' {
  const lastPrice = closes[closes.length - 1];
  const lastSMA5 = sma5[sma5.length - 1];
  const lastSMA20 = sma20[sma20.length - 1];

  if (lastPrice > lastSMA5 && lastSMA5 > lastSMA20) {
    return 'up';
  } else if (lastPrice < lastSMA5 && lastSMA5 < lastSMA20) {
    return 'down';
  } else {
    return 'sideways';
  }
}

function determineStrength(closes: number[], rsi: number[]): 'strong' | 'moderate' | 'weak' {
  const lastRSI = rsi[rsi.length - 1];
  
  if (lastRSI > 70 || lastRSI < 30) {
    return 'strong';
  } else if (lastRSI > 60 || lastRSI < 40) {
    return 'moderate';
  } else {
    return 'weak';
  }
}

function determineVolatility(atr: number[]): 'high' | 'moderate' | 'low' {
  const lastATR = atr[atr.length - 1];
  const avgATR = atr.reduce((a, b) => a + b, 0) / atr.length;
  
  if (lastATR > avgATR * 1.5) {
    return 'high';
  } else if (lastATR > avgATR * 0.5) {
    return 'moderate';
  } else {
    return 'low';
  }
}

function determineMomentum(closes: number[], volumes: number[]): 'increasing' | 'decreasing' | 'stable' {
  const recentPrices = closes.slice(-5);
  const recentVolumes = volumes.slice(-5);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  
  const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];
  const volumeRatio = recentVolumes.reduce((a, b) => a + b, 0) / (5 * avgVolume);
  
  if (priceChange > 0.02 && volumeRatio > 1.2) {
    return 'increasing';
  } else if (priceChange < -0.02 && volumeRatio > 1.2) {
    return 'decreasing';
  } else {
    return 'stable';
  }
}

// Exportações para manter a compatibilidade com os componentes existentes
export { fetchNewsForSymbol, fetchMarketNews } from './newsService';
export { 
  fetchPortfolio, 
  type PortfolioItem
} from './portfolioService';

// Agora apenas exportando o que precisamos sem usar aliases
// As duplicações serão evitadas no arquivo index.ts
export { 
  updateSignalStatus
} from './tradingSignals';

export { 
  replaceCompletedSignal,
  fetchTradingSignals,
  comprehensiveAnalyzeAsset
} from './tradingSignals_fixed';

export { analyzeSentiment } from './sentimentAnalysis';

export { getBinancePrice as getBinancePriceMarket };

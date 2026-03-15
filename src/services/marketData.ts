import { supabase } from "@/lib/supabase";
import { MarketData as MarketDataType, TradingSignal as TradingSignalType } from "./types";
import { getHistoricalKlines, getCurrentPrice, get24hStats, get24hPriceChange, getLatestPrices } from "./binanceApi";
import { determineDayTradeTrend, generateDayTradePattern, generateOrderBookAnalysis } from "./utils/tradingUtils";
import { fetchCandles, fetchAnalystRecommendations, fetchPriceTarget } from "./finnhubApi";

// Definindo interfaces locais para uso interno
export interface MarketStatistic {
  high: string;
  low: string;
  volume: string;
  quoteVolume: string;
  marketCap: string;
}

export interface OrderBook {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

export interface MarketPrice {
  symbol: string;
  price: string;
  timestamp: number;
  change: string;
  changePercent: string;
  source: string;
}

// Definições de interfaces
export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  volume?: number;
  high?: number;
  low?: number;
  news?: Record<string, unknown>[];
  isCrypto: boolean;
  historicalData?: {
    timestamps: number[];
    opens: number[];
    highs: number[];
    lows: number[];
    closes: number[];
    volumes: number[];
  };
  statistics?: MarketStatistic;
  orderBook?: OrderBook;
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
// initPriceWebSocket();

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

// Cache para dados de mercado com tempo de expiração
const MARKET_DATA_CACHE: Record<string, { 
  data: MarketData, 
  timestamp: number,
  // Validade do cache em milissegundos (5 minutos)
  validUntil: number 
}> = {};

// Lista de símbolos populares para fallback
const POPULAR_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'LTCUSDT', 'DOTUSDT', 'MATICUSDT',
  'LINKUSDT', 'AVAXUSDT', 'NEARUSDT'
];

// Função para obter preços da Binance
export async function getBinancePrice(symbol: string): Promise<MarketPrice | undefined> {
  try {
    // Usar o serviço simulado para obter o preço
    const price = await getCurrentPrice(symbol);
    
    // Obter variação de 24h com o serviço simulado
    const { change, changePercent } = await get24hPriceChange(symbol);
    
    // Retornar dados formatados
    return {
      symbol,
      price: price,
      timestamp: Date.now(),
      change,
      changePercent,
      source: 'simulated'
    };
  } catch (error) {
    console.error(`Erro ao obter preço simulado para ${symbol}:`, error);
    return undefined;
  }
}

// Função para gerar notícias simuladas quando a API falha
function getSimulatedNews(symbol: string) {
  const timestamp = new Date().toISOString();
  return [
    {
      headline: `Análise de mercado para ${symbol}`,
      summary: 'Nossos analistas estão avaliando as condições de mercado atuais. Atualizações em breve.',
      url: '#',
      image: 'https://placehold.co/600x400?text=Market+Analysis',
              source: 'Trending Analytics',
      datetime: Date.now(),
      related: symbol
    },
    {
      headline: `Perspectivas futuras para ${symbol}`,
      summary: 'Projeções de longo prazo e fatores que podem influenciar o desempenho futuro.',
      url: '#',
      image: 'https://placehold.co/600x400?text=Future+Outlook',
              source: 'Trending Research',
      datetime: Date.now() - 86400000, // 1 dia atrás
      related: symbol
    },
    {
      headline: 'Tendências globais afetando o mercado',
      summary: 'Fatores macroeconômicos e seu impacto nos mercados financeiros.',
      url: '#',
      image: 'https://placehold.co/600x400?text=Global+Trends',
      source: 'Market Insights',
      datetime: Date.now() - 172800000, // 2 dias atrás
      related: symbol
    }
  ];
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
    let volumeValue = 0;
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
      volumeValue = parseFloat(klines[klines.length - 1][5]);

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

    // Sempre usar dados simulados em vez de API de notícias
    const news = getSimulatedNews(symbol);

    return {
      symbol,
      price: currentPrice,
      change: priceChange,
      volume: volumeValue,
      high,
      low,
      news,
      historicalData,
      isCrypto: true  // Assumir que é cripto por padrão
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
export { fetchMarketNews } from './newsService';
// portfolioService foi removido na limpeza

// Agora apenas exportando o que precisamos sem usar aliases
// As duplicações serão evitadas no arquivo index.ts
// Arquivos tradingSignals.ts e tradingSignals_fixed.ts foram removidos
// export {
//   updateSignalStatus
// } from './tradingSignals';

// export {
//   replaceCompletedSignal,
//   fetchTradingSignals,
//   comprehensiveAnalyzeAsset
// } from './tradingSignals_fixed';

// sentimentAnalysis foi removido na limpeza

export { getBinancePrice as getBinancePriceMarket };

/**
 * Busca preço no Bitstamp com tratamento de erros
 * @param symbol Símbolo
 * @returns Preço formatado ou undefined
 */
export async function getBitstampPriceWithFallback(symbol: string): Promise<MarketPrice | undefined> {
  try {
    // Como a função getBitstampPrice foi removida, usar diretamente Binance
    // que é a fonte principal de dados do sistema
    return await getBinancePrice(symbol);
  } catch (error) {
    console.error(`Erro ao obter preço para ${symbol}:`, error);
    return undefined;
  }
}

/**
 * Busca as estatísticas de mercado para um símbolo
 * @param symbol Símbolo
 * @returns Estatísticas ou undefined
 */
export async function getMarketStatistics(symbol: string): Promise<MarketStatistic | undefined> {
  try {
    // Obter estatísticas de 24h
    const stats = await get24hStats(symbol);
    
    // Obter market cap
    const marketCap = await getMarketCap(symbol);
    
    // Formatar market cap como string
    let marketCapStr = "N/A";
    if (marketCap !== undefined) {
      if (marketCap >= 1e12) {
        marketCapStr = (marketCap / 1e12).toFixed(2) + 'T';
      } else if (marketCap >= 1e9) {
        marketCapStr = (marketCap / 1e9).toFixed(2) + 'B';
      } else if (marketCap >= 1e6) {
        marketCapStr = (marketCap / 1e6).toFixed(2) + 'M';
      } else {
        marketCapStr = marketCap.toFixed(2);
      }
    }
    
    return {
      high: stats.high.toString(),
      low: stats.low.toString(),
      volume: stats.volume.toString(),
      quoteVolume: stats.quoteVolume.toString(),
      marketCap: marketCapStr
    };
  } catch (error) {
    console.error(`Erro ao obter estatísticas de mercado para ${symbol}:`, error);
    return undefined;
  }
}

/**
 * Busca o livro de ordens para um símbolo
 * @param symbol Símbolo
 * @param limit Quantidade de ordens
 * @returns Livro de ordens ou undefined
 */
export async function getMarketOrderBook(symbol: string, limit: number = 20): Promise<OrderBook | undefined> {
  try {
    // Obter orderbook da Binance com o novo método que já inclui fallback
    return await getOrderBook(symbol, limit);
  } catch (error) {
    console.error(`Erro ao buscar orderbook de ${symbol}:`, error);
    return undefined;
  }
}

/**
 * Busca o market cap para um símbolo
 * @param symbol Símbolo
 * @returns Market cap formatado ou undefined
 * 
 * ⚠️ NOTA: Valores aproximados baseados em dados históricos
 * Em produção, considere integrar uma API de market cap atualizada
 */
async function getMarketCap(symbol: string): Promise<number | undefined> {
  // Valores aproximados de market cap
  const marketCaps: Record<string, number> = {
    'ETHUSDT': 2.1e11, // 210 bilhões
    'BNBUSDT': 3.5e10, // 35 bilhões
    'XRPUSDT': 2.5e10, // 25 bilhões
    'ADAUSDT': 1.2e10, // 12 bilhões
    'DOGEUSDT': 8.5e9, // 8.5 bilhões
    'SOLUSDT': 1.8e10, // 18 bilhões
    'MATICUSDT': 5.2e9, // 5.2 bilhões
    'DOTUSDT': 6.8e9, // 6.8 bilhões
    'LTCUSDT': 4.5e9, // 4.5 bilhões
    'AVAXUSDT': 5.5e9, // 5.5 bilhões
    'LINKUSDT': 6.2e9, // 6.2 bilhões
  };
  
  return marketCaps[symbol] || undefined;
}

/**
 * Busca todos os dados de mercado para um símbolo específico
 * @param symbol Símbolo 
 * @returns Todos os dados de mercado
 */
export async function getMarketData(symbol: string = 'BTCUSDT'): Promise<MarketData> {
  try {
    // Normalizar o símbolo
    const normalizedSymbol = normalizeSymbol(symbol);
    
    // Verificar cache
    const cacheEntry = MARKET_DATA_CACHE[normalizedSymbol];
    if (cacheEntry && cacheEntry.validUntil > Date.now()) {
      return cacheEntry.data;
    }
    
    // Obter dados do Bitstamp para criptomoedas
    const isCryptoSymbol = symbol.includes('USDT') || symbol.includes('BTC');
    
    let marketPrice;
    if (isCryptoSymbol) {
      marketPrice = await getBitstampPriceWithFallback(normalizedSymbol);
    } else {
      // Para ações, usar um serviço simulado por enquanto
      marketPrice = await getBinancePrice(normalizedSymbol);
    }
    
    if (!marketPrice) {
      throw new Error(`Não foi possível obter preço para ${normalizedSymbol}`);
    }
    
    // Obter estatísticas de mercado
    const statistics = await getMarketStatistics(normalizedSymbol);
    
    // Obter livro de ordens
    const orderBook = await getMarketOrderBook(normalizedSymbol);
    
    // Criar objeto de dados de mercado
    const marketData: MarketData = {
      symbol: normalizedSymbol,
      price: parseFloat(marketPrice.price),
      change: parseFloat(marketPrice.change),
      isCrypto: isCryptoSymbol,
      statistics: statistics,
      orderBook: orderBook
    };
    
    // Atualizar cache
    MARKET_DATA_CACHE[normalizedSymbol] = {
      data: marketData,
      timestamp: Date.now(),
      validUntil: Date.now() + 5 * 60 * 1000 // 5 minutos
    };
    
    return marketData;
  } catch (error) {
    console.error(`Erro ao obter dados de mercado para ${symbol}:`, error);
    
    // Fallback para dados simulados
    const fallbackData: MarketData = {
      symbol: symbol,
      price: Math.random() * 100,
      change: (Math.random() * 10) - 5,
      isCrypto: symbol.includes('USDT') || symbol.includes('BTC')
    };
    
    return fallbackData;
  }
}

/**
 * Busca dados de mercado para múltiplos símbolos em paralelo
 * @param symbols Lista de símbolos
 * @returns Objeto com dados para cada símbolo
 */
export async function getMultipleMarketData(symbols: string[] = POPULAR_SYMBOLS): Promise<Record<string, MarketData>> {
  const results: Record<string, MarketData> = {};
  
  // Processar símbolos em paralelo
  await Promise.all(symbols.map(async (symbol) => {
    try {
      const data = await getMarketData(symbol);
      results[symbol] = data;
    } catch (error) {
      console.error(`Erro ao obter dados para ${symbol}:`, error);
      // Fornecer dados dummy em caso de erro (com isCrypto definido)
      results[symbol] = {
        symbol,
        price: 0,
        change: 0,
        isCrypto: symbol.includes('USDT') || symbol.includes('BTC')
      };
    }
  }));
  
  return results;
}

/**
 * Normaliza um símbolo para o formato padrão da Binance
 * @param symbol Símbolo a ser normalizado
 * @returns Símbolo normalizado
 */
function normalizeSymbol(symbol: string): string {
  // Remover espaços e converter para maiúsculas
  symbol = symbol.trim().toUpperCase();
  
  // Se for apenas um ticker de crypto sem o par, adicionar USDT
  if (!/[A-Z0-9]+(USDT|BTC|ETH|BNB|USD|EUR|BUSD|USDC)$/.test(symbol)) {
    return symbol + 'USDT';
  }
  
  return symbol;
}

// Implementar uma versão simulada de getOrderBook para manter compatibilidade com código existente
export function getOrderBook(symbol: string, limit: number = 20): Promise<{
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}> {
  return new Promise((resolve) => {
    // Obter preço atual do símbolo
    getCurrentPrice(symbol).then(currentPrice => {
      const price = parseFloat(currentPrice || "100.00");
      
      // Criar livro de ordens simulado
      const bids: [string, string][] = [];
      const asks: [string, string][] = [];
      
      // Criar ordens simuladas com preços próximos ao preço atual
      for (let i = 0; i < limit; i++) {
        // Preços de compra (bids) ligeiramente abaixo do preço atual
        const bidPrice = (price * (1 - 0.001 * (i + 1))).toFixed(2);
        const bidQuantity = (Math.random() * 10 + 1).toFixed(4);
        bids.push([bidPrice, bidQuantity]);
        
        // Preços de venda (asks) ligeiramente acima do preço atual
        const askPrice = (price * (1 + 0.001 * (i + 1))).toFixed(2);
        const askQuantity = (Math.random() * 10 + 1).toFixed(4);
        asks.push([askPrice, askQuantity]);
      }
      
      resolve({
        lastUpdateId: Date.now(),
        bids,
        asks
      });
    }).catch(() => {
      // Em caso de erro, retornar dados vazios
      resolve({
        lastUpdateId: Date.now(),
        bids: [],
        asks: []
      });
    });
  });
}

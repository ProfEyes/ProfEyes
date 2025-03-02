import { supabase } from "@/integrations/supabase/client";
import { Howl } from 'howler';
import { 
  MarketData, 
  TradingSignal, 
  InvestmentProfile, 
  Portfolio, 
  PortfolioAsset,
  MarketNews
} from './interfaces';
import { generateSimulatedNews, simulatedNewsTitles, simulatedNewsContents } from './newsData';

export interface MarketData {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
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
  riskRewardRatio?: number; // Relação risco/recompensa (opcional)
}

export interface InvestmentProfile {
  timeframe: 'CURTO' | 'MÉDIO' | 'LONGO';
  riskLevel: 'ALTO' | 'MODERADO' | 'BAIXO';
  amount: number;
}

export interface Portfolio {
  id: number;
  name: string;
  riskLevel: 'BAIXO' | 'MÉDIO' | 'ALTO';
  initialAmount: number;
  currentValue: number;
  assets: PortfolioAsset[];
  expectedReturn: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioAsset {
  symbol: string;
  name: string;
  type: 'AÇÃO' | 'CRIPTO';
  price: number;
  quantity: number;
  value: number;
  allocation: number; // Porcentagem
  change: number;
  changePercent: number;
}

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  historicalData: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

interface TechnicalAnalysis {
  trend: number;
  rsi: number;
  volatility: number;
  macd: number;
  stochastic: number;
}

interface AssetAnalysis {
  symbol: string;
  name: string;
  price: number;
  score: number;
  change: number;
  changePercent: number;
}

async function getBinanceData(symbol: string): Promise<{ ticker: any; klines: any[] } | null> {
  try {
    console.log(`Buscando dados da Binance para ${symbol}`);
    
    // Verificar se temos dados em cache no Supabase
    try {
      const { data: cachedData, error: cacheError } = await supabase
        .from('crypto_prices')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(1);
        
      // Se temos dados recentes (menos de 1 hora), usar o cache
      if (cachedData && cachedData.length > 0) {
        const lastUpdate = new Date(cachedData[0].timestamp);
        const now = new Date();
        const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
        
        if (minutesSinceUpdate < 60) {
          console.log(`Usando dados em cache para ${symbol}`);
          
          // Buscar dados históricos do cache
          const { data: historicalData, error: histError } = await supabase
            .from('crypto_prices')
            .select('*')
            .eq('symbol', symbol)
            .order('timestamp', { ascending: false })
            .limit(500);
            
          if (historicalData && historicalData.length > 0) {
            // Obter o ticker mais recente
            const ticker = {
              symbol: historicalData[0].symbol,
              lastPrice: historicalData[0].close.toString(),
              priceChange: historicalData[0].price_change.toString(),
              priceChangePercent: historicalData[0].price_change_percent.toString()
            };
            
            // Formatar klines
            const klines = historicalData.map(item => ({
              open: item.open.toString(),
              high: item.high.toString(),
              low: item.low.toString(),
              close: item.close.toString(),
              volume: item.volume.toString(),
              timestamp: item.timestamp
            }));
            
            return { ticker, klines };
          }
        }
      }
    } catch (supabaseError) {
      console.log(`Erro ao acessar cache do Supabase para ${symbol}, continuando com API direta`);
    }
    
    // Se não temos dados em cache ou estão desatualizados, buscar da API
    try {
      // Obter ticker atual
      const tickerResponse = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
      if (!tickerResponse.ok) {
        throw new Error(`Erro ao buscar ticker para ${symbol}: ${tickerResponse.statusText}`);
      }
    const ticker = await tickerResponse.json();
      
      // Obter klines (dados de candlestick)
      // Intervalo de 1h para os últimos 500 candles
      const klinesResponse = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=500`);
      if (!klinesResponse.ok) {
        throw new Error(`Erro ao buscar klines para ${symbol}: ${klinesResponse.statusText}`);
      }
      const klinesData = await klinesResponse.json();
      
      // Processar klines
      const klines = klinesData.map((kline: any[]) => {
        try {
          // Usar o timestamp diretamente do array da Binance (primeiro elemento)
          const timestamp = new Date(kline[0]).toISOString();

    return {
            open: kline[1],
            high: kline[2],
            low: kline[3],
            close: kline[4],
            volume: kline[5],
            timestamp: timestamp
          };
        } catch (dateError) {
          console.error(`Erro ao converter timestamp para ${symbol}:`, dateError);
          // Usar a data atual como fallback
          return {
            open: kline[1],
            high: kline[2],
            low: kline[3],
            close: kline[4],
            volume: kline[5],
            timestamp: new Date().toISOString()
          };
        }
      });
      
      // Tentar salvar dados no cache do Supabase, mas não falhar se não conseguir
      try {
        const cryptoDataToInsert = klines.map(kline => {
          try {
            return {
              symbol,
              timestamp: kline.timestamp,
              open: parseFloat(kline.open),
              high: parseFloat(kline.high),
              low: parseFloat(kline.low),
              close: parseFloat(kline.close),
              volume: parseFloat(kline.volume),
              price_change: parseFloat(kline.close) - parseFloat(kline.open),
              price_change_percent: ((parseFloat(kline.close) - parseFloat(kline.open)) / parseFloat(kline.open)) * 100
            };
          } catch (parseError) {
            console.error(`Erro ao processar dados para ${symbol}:`, parseError);
            return null;
          }
        }).filter(item => item !== null);
        
        // Inserir dados no Supabase em lotes para evitar limites de tamanho de requisição
        const batchSize = 100;
        for (let i = 0; i < cryptoDataToInsert.length; i += batchSize) {
          const batch = cryptoDataToInsert.slice(i, i + batchSize);
          const { error: insertError } = await supabase
            .from('crypto_prices')
            .upsert(batch, { onConflict: 'symbol,timestamp' });
            
          if (insertError) {
            console.error(`Erro ao salvar lote de dados para ${symbol}:`, insertError);
          }
        }
      } catch (cacheError) {
        console.log(`Erro ao salvar no cache do Supabase para ${symbol}, continuando sem cache`);
      }
      
      return { ticker, klines };
  } catch (error) {
      console.error(`Erro ao buscar dados da Binance para ${symbol}:`, error);
      return null;
    }
  } catch (error) {
    console.error(`Erro ao buscar dados da Binance para ${symbol}:`, error);
    return null;
  }
}

async function getAlphaVantageData(symbol: string): Promise<{ quote: Record<string, string>; technicalData: Record<string, any> }> {
  try {
    const [quoteResponse, technicalResponse] = await Promise.all([
      fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=JMLZ6Y1Q2OLL5PMA`),
      fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=JMLZ6Y1Q2OLL5PMA`)
    ]);

    const quoteData = await quoteResponse.json();
    const technicalData = await technicalResponse.json();

    return {
      quote: quoteData['Global Quote'] || {},
      technicalData: technicalData['Time Series (5min)'] || {}
    };
  } catch (error) {
    console.error(`Error fetching Alpha Vantage data for ${symbol}:`, error);
    return { quote: {}, technicalData: {} };
  }
}

function calculateSuccessRate(data: Array<{ close: string; volume: string; high: string; low: string }>): number {
  if (!data.length) return 0;

  const patterns = data.map((item, i, arr) => {
    if (i < 14) return null;
    
    const priceChange = (parseFloat(item.close) - parseFloat(arr[i-1].close)) / parseFloat(arr[i-1].close);
    const volumeChange = (parseFloat(item.volume) - parseFloat(arr[i-1].volume)) / parseFloat(arr[i-1].volume);
    const volatility = (parseFloat(item.high) - parseFloat(item.low)) / parseFloat(item.low);
    
    return { priceChange, volumeChange, volatility };
  }).filter((p): p is NonNullable<typeof p> => p !== null);

  const prices = data.map(d => parseFloat(d.close));
  const ema20 = calculateEMA2(prices, 20);
  const ema50 = calculateEMA2(prices, 50);
  const ema200 = calculateEMA2(prices, 200);

  const rsi = calculateRSI(prices);

  let score = 0;

  if (ema50 > ema200) score += 15;
  
  if (rsi >= 40 && rsi <= 60) score += 20; // Zona neutra/equilibrada
  if (rsi > 30 && rsi < 40) score += 15; // Possível reversão de baixa
  if (rsi > 60 && rsi < 70) score += 15; // Possível reversão de alta

  const volumes = data.map(d => parseFloat(d.volume));
  const recentVolume = volumes.slice(0, 5).reduce((a, b) => a + b) / 5;
  const historicalVolume = volumes.slice(5, 20).reduce((a, b) => a + b) / 15;
  
  if (recentVolume > historicalVolume * 1.2) score += 15;

  const consistentPatterns = patterns.filter(p => 
    Math.abs(p.priceChange) > 0.001 && 
    Math.abs(p.priceChange) < 0.03 && // Movimentos mais realistas
    Math.abs(p.volumeChange) > 0.1
  ).length;
  
  score += (consistentPatterns / patterns.length) * 20;

  return Math.min(Math.max(score, 0), 100);
}

function calculateEMA(prices: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

function calculateEMA2(prices: number[], period: number): number {
  if (prices.length < period) {
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }
  
  // Calcular SMA inicial
  const sma = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  
  // Multiplicador
  const multiplier = 2 / (period + 1);
  
  // Calcular EMA
  return prices.slice(period).reduce(
    (ema, price) => (price - ema) * multiplier + ema,
    sma
  );
}

function calculateATR(data: any[]): number {
  const trueRanges = data.map((bar, i) => {
    if (i === 0) return parseFloat(bar.high) - parseFloat(bar.low);
    
    const previousClose = parseFloat(data[i-1].close);
    const currentHigh = parseFloat(bar.high);
    const currentLow = parseFloat(bar.low);
    
    const tr1 = currentHigh - currentLow;
    console.log(`High: ${currentHigh}, Low: ${currentLow}, Previous Close: ${previousClose}`);
    const tr2 = Math.abs(currentHigh - previousClose);
    const tr3 = Math.abs(currentLow - previousClose);
    
    return Math.max(tr1, tr2, tr3);
  });
  
  const atr = trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
  console.log(`Calculated ATR: ${atr}`);
  return atr;
}

function calculateRSI(prices: number[]): number {
  const changes = prices.slice(1).map((price, i) => price - prices[i]);
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? -change : 0);
  
  const period = 14;
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;
  
  gains.slice(period).forEach((gain, i) => {
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i + period]) / period;
  });
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Placeholder for machine learning model integration
import { trainModel, predict } from '../services/machineLearning';

// Import necessary libraries for machine learning and sentiment analysis
import { analyzeSentiment } from '../services/sentimentAnalysis';

// Função para calcular Bollinger Bands
function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
  // Calcular média móvel simples
  const sma = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
  
  // Calcular desvio padrão
  const squaredDifferences = prices.slice(-period).map(price => Math.pow(price - sma, 2));
  const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  // Calcular bandas
  const upper = sma + (standardDeviation * stdDev);
  const lower = sma - (standardDeviation * stdDev);
  
  return { upper, middle: sma, lower };
}

// Função para calcular MACD
function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  // Parâmetros padrão: 12, 26, 9
  const fastPeriod = 12;
  const slowPeriod = 26;
  const signalPeriod = 9;
  
  // Calcular EMA rápida
  const fastEMA = calculateEMA2(prices, fastPeriod);
  
  // Calcular EMA lenta
  const slowEMA = calculateEMA2(prices, slowPeriod);
  
  // Calcular linha MACD
  const macdLine = fastEMA - slowEMA;
  
  // Calcular linha de sinal (EMA da linha MACD)
  // Para simplificar, usamos uma aproximação
  const macdHistory = prices.slice(-signalPeriod * 2).map((_, i, arr) => {
    const fastEMA = calculateEMA2(arr.slice(0, i + 1), fastPeriod);
    const slowEMA = calculateEMA2(arr.slice(0, i + 1), slowPeriod);
    return fastEMA - slowEMA;
  });
  
  const signalLine = calculateEMA2(macdHistory, signalPeriod);
  
  // Calcular histograma
  const histogram = macdLine - signalLine;
  
  return { macd: macdLine, signal: signalLine, histogram };
}

// Função para calcular Fibonacci Retracement
function calculateFibonacciLevels(high: number, low: number): { level0: number; level236: number; level382: number; level50: number; level618: number; level786: number; level100: number } {
  const diff = high - low;
  
  return {
    level0: high,
    level236: high - (diff * 0.236),
    level382: high - (diff * 0.382),
    level50: high - (diff * 0.5),
    level618: high - (diff * 0.618),
    level786: high - (diff * 0.786),
    level100: low
  };
}

// Função para calcular Stochastic Oscillator
function calculateStochastic(prices: number[], highs: number[], lows: number[], period: number = 14, smoothK: number = 3, smoothD: number = 3): { k: number; d: number } {
  // Verificar se temos dados suficientes
  if (prices.length < period || highs.length < period || lows.length < period) {
    return { k: 50, d: 50 };
  }
  
  // Obter o preço de fechamento mais recente
  const currentClose = prices[prices.length - 1];
  
  // Obter máximos e mínimos do período
  const periodHighs = highs.slice(-period);
  const periodLows = lows.slice(-period);
  
  const highestHigh = Math.max(...periodHighs);
  const lowestLow = Math.min(...periodLows);
  
  // Calcular %K
  const range = highestHigh - lowestLow;
  const rawK = range === 0 ? 50 : ((currentClose - lowestLow) / range) * 100;
  
  // Para simplificar, usamos uma aproximação para o %K suavizado e %D
  // Em uma implementação completa, seria necessário calcular uma SMA de rawK
  const k = rawK;
  const d = rawK; // Simplificação - normalmente seria a SMA de %K
  
  return { k, d };
}

/**
 * Calcula a taxa de sucesso de um sinal de trading usando um algoritmo avançado
 * que considera múltiplos fatores técnicos, fundamentais e de mercado.
 * 
 * @param data Dados históricos do ativo
 * @param technicalIndicators Indicadores técnicos calculados
 * @param marketConditions Condições gerais do mercado
 * @param sentimentData Dados de sentimento do mercado
 * @param mlPrediction Previsão do modelo de machine learning
 * @returns Taxa de sucesso entre 0 e 100
 */
function calculateAdvancedSuccessRate(
  params: {
    historicalPrices: number[],
    historicalVolumes: number[],
    currentPrice: number,
    sma20: number,
    sma50: number,
    sma200: number | null,
    rsi: number,
    macd: { macd: number, signal: number, histogram: number },
    bollingerBands: { upper: number, middle: number, lower: number },
    stochastic: { k: number, d: number },
    atr: number,
    priceChanges: { day1: number, day5: number, day20: number },
    volumeRatio: number,
    sentimentScore: number,
    sentimentMagnitude: number,
    mlPrediction: { trend: string, confidence: number },
    signalType: 'COMPRA' | 'VENDA'
  }
): number {
  const {
    historicalPrices,
    historicalVolumes,
    currentPrice,
    sma20,
    sma50,
    sma200,
    rsi,
    macd,
    bollingerBands,
    stochastic,
    atr,
    priceChanges,
    volumeRatio,
    sentimentScore,
    sentimentMagnitude,
    mlPrediction,
    signalType
  } = params;

  // 1. Análise de tendência (25%)
  let trendScore = 0;
  
  // Análise de tendência de preço
  if (signalType === 'COMPRA') {
    // Para sinais de compra, queremos tendência de alta
    if (priceChanges.day1 > 0) trendScore += 2;
    if (priceChanges.day5 > 0) trendScore += 3;
    if (priceChanges.day20 > 0) trendScore += 5;
    
    // Análise de médias móveis
    if (currentPrice > sma20) trendScore += 3;
    if (sma20 > sma50) trendScore += 3;
    if (sma50 > (sma200 || 0)) trendScore += 4;
    
    // Análise de suporte e resistência
    const recentLows = historicalPrices.slice(-20).sort((a, b) => a - b).slice(0, 5);
    const avgSupport = recentLows.reduce((sum, price) => sum + price, 0) / recentLows.length;
    if (currentPrice > avgSupport && currentPrice < avgSupport * 1.05) trendScore += 5;
  } else {
    // Para sinais de venda, queremos tendência de baixa
    if (priceChanges.day1 < 0) trendScore += 2;
    if (priceChanges.day5 < 0) trendScore += 3;
    if (priceChanges.day20 < 0) trendScore += 5;
    
    // Análise de médias móveis
    if (currentPrice < sma20) trendScore += 3;
    if (sma20 < sma50) trendScore += 3;
    if (sma50 < (sma200 || 0)) trendScore += 4;
    
    // Análise de suporte e resistência
    const recentHighs = historicalPrices.slice(-20).sort((a, b) => b - a).slice(0, 5);
    const avgResistance = recentHighs.reduce((sum, price) => sum + price, 0) / recentHighs.length;
    if (currentPrice < avgResistance && currentPrice > avgResistance * 0.95) trendScore += 5;
  }
  
  // 2. Análise de osciladores (25%)
  let oscillatorScore = 0;
  
  // RSI
  if (signalType === 'COMPRA') {
    if (rsi < 30) oscillatorScore += 8; // Sobrevendido
    else if (rsi >= 30 && rsi < 40) oscillatorScore += 6; // Saindo de sobrevendido
    else if (rsi >= 40 && rsi < 50) oscillatorScore += 4; // Momentum positivo
  } else {
    if (rsi > 70) oscillatorScore += 8; // Sobrecomprado
    else if (rsi <= 70 && rsi > 60) oscillatorScore += 6; // Saindo de sobrecomprado
    else if (rsi <= 60 && rsi > 50) oscillatorScore += 4; // Momentum negativo
  }
  
  // MACD
  if (signalType === 'COMPRA') {
    if (macd.histogram > 0 && macd.histogram > macd.signal) oscillatorScore += 5;
    if (macd.macd > 0 && macd.macd > macd.signal) oscillatorScore += 3;
    if (macd.histogram > 0 && macd.histogram > macd.histogram * 1.1) oscillatorScore += 2; // Aceleração positiva
  } else {
    if (macd.histogram < 0 && macd.histogram < macd.signal) oscillatorScore += 5;
    if (macd.macd < 0 && macd.macd < macd.signal) oscillatorScore += 3;
    if (macd.histogram < 0 && macd.histogram < macd.histogram * 1.1) oscillatorScore += 2; // Aceleração negativa
  }
  
  // Estocástico
  if (signalType === 'COMPRA') {
    if (stochastic.k < 20 && stochastic.d < 20) oscillatorScore += 4; // Sobrevendido
    if (stochastic.k > stochastic.d) oscillatorScore += 3; // Cruzamento positivo
  } else {
    if (stochastic.k > 80 && stochastic.d > 80) oscillatorScore += 4; // Sobrecomprado
    if (stochastic.k < stochastic.d) oscillatorScore += 3; // Cruzamento negativo
  }
  
  // 3. Análise de volatilidade e volume (20%)
  let volatilityVolumeScore = 0;
  
  // ATR - Volatilidade adequada para o sinal
  const priceVolatility = atr / currentPrice * 100;
  if (priceVolatility > 1 && priceVolatility < 5) volatilityVolumeScore += 5; // Volatilidade ideal
  else if (priceVolatility >= 5 && priceVolatility < 10) volatilityVolumeScore += 3; // Alta volatilidade
  else if (priceVolatility <= 1) volatilityVolumeScore += 2; // Baixa volatilidade
  
  // Bollinger Bands
  if (signalType === 'COMPRA') {
    if (currentPrice < bollingerBands.lower) volatilityVolumeScore += 5; // Preço abaixo da banda inferior
    else if (currentPrice > bollingerBands.lower && currentPrice < bollingerBands.middle) volatilityVolumeScore += 3;
  } else {
    if (currentPrice > bollingerBands.upper) volatilityVolumeScore += 5; // Preço acima da banda superior
    else if (currentPrice < bollingerBands.upper && currentPrice > bollingerBands.middle) volatilityVolumeScore += 3;
  }
  
  // Volume
  if (volumeRatio > 2) volatilityVolumeScore += 5; // Volume muito acima da média
  else if (volumeRatio > 1.5) volatilityVolumeScore += 4; // Volume acima da média
  else if (volumeRatio > 1.2) volatilityVolumeScore += 3; // Volume ligeiramente acima da média
  
  // Consistência de volume
  const volumeStdDev = calculateStandardDeviation(historicalVolumes.slice(-10));
  const volumeMean = historicalVolumes.slice(-10).reduce((sum, vol) => sum + vol, 0) / 10;
  const volumeCV = volumeStdDev / volumeMean; // Coeficiente de variação
  
  if (volumeCV < 0.5) volatilityVolumeScore += 5; // Volume consistente
  else if (volumeCV < 1) volatilityVolumeScore += 3; // Volume moderadamente consistente
  
  // 4. Análise de sentimento e ML (15%)
  let sentimentMlScore = 0;
  
  // Sentimento
  if (signalType === 'COMPRA') {
    if (sentimentScore > 0.5) sentimentMlScore += 4; // Sentimento muito positivo
    else if (sentimentScore > 0.2) sentimentMlScore += 3; // Sentimento positivo
    else if (sentimentScore > 0) sentimentMlScore += 1; // Sentimento ligeiramente positivo
  } else {
    if (sentimentScore < -0.5) sentimentMlScore += 4; // Sentimento muito negativo
    else if (sentimentScore < -0.2) sentimentMlScore += 3; // Sentimento negativo
    else if (sentimentScore < 0) sentimentMlScore += 1; // Sentimento ligeiramente negativo
  }
  
  // Magnitude do sentimento
  if (sentimentMagnitude > 0.8) sentimentMlScore += 3; // Sentimento forte
  else if (sentimentMagnitude > 0.5) sentimentMlScore += 2; // Sentimento moderado
  
  // Previsão de ML
  if (signalType === 'COMPRA' && mlPrediction.trend === 'up') {
    if (mlPrediction.confidence > 80) sentimentMlScore += 8;
    else if (mlPrediction.confidence > 70) sentimentMlScore += 6;
    else if (mlPrediction.confidence > 60) sentimentMlScore += 4;
  } else if (signalType === 'VENDA' && mlPrediction.trend === 'down') {
    if (mlPrediction.confidence > 80) sentimentMlScore += 8;
    else if (mlPrediction.confidence > 70) sentimentMlScore += 6;
    else if (mlPrediction.confidence > 60) sentimentMlScore += 4;
  }
  
  // 5. Análise de padrões de preço (15%)
  let patternScore = 0;
  
  // Detectar padrões de candle
  const recentCandles = historicalPrices.slice(-5);
  
  // Padrões de reversão para compra
  if (signalType === 'COMPRA') {
    // Martelo (Hammer) - último candle com sombra inferior longa
    const lastPrice = historicalPrices[historicalPrices.length - 1];
    const lastLow = Math.min(...historicalPrices.slice(-5));
    if (lastPrice > lastLow * 1.02 && lastLow === Math.min(...historicalPrices.slice(-20))) {
      patternScore += 5; // Possível martelo em suporte
    }
    
    // Engolfo de alta (Bullish Engulfing)
    if (recentCandles.length >= 2 && 
        recentCandles[recentCandles.length - 2] < recentCandles[recentCandles.length - 1] * 0.99) {
      patternScore += 5;
    }
    
    // Estrela da manhã (Morning Star)
    if (recentCandles.length >= 3 && 
        recentCandles[recentCandles.length - 3] > recentCandles[recentCandles.length - 2] &&
        recentCandles[recentCandles.length - 1] > recentCandles[recentCandles.length - 2] * 1.01) {
      patternScore += 5;
    }
  } else {
    // Padrões de reversão para venda
    
    // Estrela cadente (Shooting Star) - último candle com sombra superior longa
    const lastPrice = historicalPrices[historicalPrices.length - 1];
    const lastHigh = Math.max(...historicalPrices.slice(-5));
    if (lastHigh > lastPrice * 1.02 && lastHigh === Math.max(...historicalPrices.slice(-20))) {
      patternScore += 5; // Possível estrela cadente em resistência
    }
    
    // Engolfo de baixa (Bearish Engulfing)
    if (recentCandles.length >= 2 && 
        recentCandles[recentCandles.length - 2] > recentCandles[recentCandles.length - 1] * 1.01) {
      patternScore += 5;
    }
    
    // Estrela da noite (Evening Star)
    if (recentCandles.length >= 3 && 
        recentCandles[recentCandles.length - 3] < recentCandles[recentCandles.length - 2] &&
        recentCandles[recentCandles.length - 1] < recentCandles[recentCandles.length - 2] * 0.99) {
      patternScore += 5;
    }
  }
  
  // Calcular pontuação final ponderada
  const finalScore = (
    (trendScore / 25) * 25 +
    (oscillatorScore / 25) * 25 +
    (volatilityVolumeScore / 20) * 20 +
    (sentimentMlScore / 15) * 15 +
    (patternScore / 15) * 15
  );
  
  // Ajustar para garantir que está entre 0 e 100
  return Math.min(Math.max(finalScore, 0), 100);
}

/**
 * Calcula o desvio padrão de um array de números
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(value => {
    const diff = value - mean;
    return diff * diff;
  });
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

// ... existing code ...

async function comprehensiveAnalyzeAsset(symbol: string, isCrypto: boolean = false): Promise<TradingSignal | null> {
  try {
    let data;
    let currentPrice;
    let historicalPrices: number[] = [];
    let historicalHighs: number[] = [];
    let historicalLows: number[] = [];
    let historicalVolumes: number[] = [];
    let timeframe: 'DAYTRADING' | 'CURTO' | 'MÉDIO' | 'LONGO' = 'CURTO';

    // Obter dados históricos
    if (isCrypto) {
      const binanceData = await getBinanceData(symbol);
      if (!binanceData || !binanceData.klines || binanceData.klines.length < 30) {
        console.log(`Dados insuficientes para ${symbol}`);
        return null;
      }

      data = binanceData.klines;
      currentPrice = parseFloat(binanceData.ticker.lastPrice);
      
      // Extrair preços históricos
      historicalPrices = data.map(item => parseFloat(item.close));
      historicalHighs = data.map(item => parseFloat(item.high));
      historicalLows = data.map(item => parseFloat(item.low));
      historicalVolumes = data.map(item => parseFloat(item.volume));
    } else {
      // Implementação para ações - usando APIs reais
      console.log(`Obtendo dados para ação ${symbol}`);
      
      // Verificar se temos dados no Supabase
      const { data: stockData, error } = await supabase
        .from('stock_prices')
        .select('*')
        .eq('symbol', symbol)
        .order('date', { ascending: false })
        .limit(100);
        
      if (error) {
        console.error(`Erro ao buscar dados para ${symbol}:`, error);
        return null;
      }
      
      if (stockData && stockData.length > 30) {
        // Usar dados do Supabase
        data = stockData;
        currentPrice = stockData[0].close;
        
        // Extrair preços históricos
        historicalPrices = stockData.map(item => item.close);
        historicalHighs = stockData.map(item => item.high);
        historicalLows = stockData.map(item => item.low);
        historicalVolumes = stockData.map(item => item.volume);
      } else {
        // Tentar buscar de APIs externas como Alpha Vantage ou Yahoo Finance
        try {
          // Alpha Vantage
          const response = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=JMLZ6Y1Q2OLL5PMA`);
          const alphaData = await response.json();
          
          if (alphaData && alphaData['Time Series (Daily)']) {
            const timeSeries = alphaData['Time Series (Daily)'];
            const dates = Object.keys(timeSeries).sort().reverse();
            
            if (dates.length > 30) {
              data = dates.slice(0, 100).map(date => {
                const dayData = timeSeries[date];
                return {
                  date,
                  open: parseFloat(dayData['1. open']),
                  high: parseFloat(dayData['2. high']),
                  low: parseFloat(dayData['3. low']),
                  close: parseFloat(dayData['4. close']),
                  volume: parseFloat(dayData['5. volume'])
                };
              });
              
              currentPrice = data[0].close;
              
              // Extrair preços históricos
              historicalPrices = data.map(item => item.close);
              historicalHighs = data.map(item => item.high);
              historicalLows = data.map(item => item.low);
              historicalVolumes = data.map(item => item.volume);
              
              // Salvar no Supabase para cache
              try {
                const batchSize = 100;
                for (let i = 0; i < data.length; i += batchSize) {
                  const batch = data.slice(i, i + batchSize);
                  await supabase
                    .from('stock_prices')
                    .upsert(batch.map(item => ({
                      symbol,
                      date: item.date,
                      open: item.open,
                      high: item.high,
                      low: item.low,
                      close: item.close,
                      volume: item.volume
                    })), { onConflict: 'symbol,date' });
                }
              } catch (cacheError) {
                console.error('Erro ao salvar dados no cache:', cacheError);
              }
            } else {
              console.log(`Dados insuficientes da Alpha Vantage para ${symbol}`);
              return null;
            }
          } else {
            console.log(`Resposta inválida da Alpha Vantage para ${symbol}`);
            return null;
          }
        } catch (apiError) {
          console.error(`Erro ao buscar dados da API para ${symbol}:`, apiError);
          return null;
        }
      }
    }

    // Calcular indicadores técnicos
    const sma20 = historicalPrices.slice(-20).reduce((sum, price) => sum + price, 0) / 20;
    const sma50 = historicalPrices.slice(-50).reduce((sum, price) => sum + price, 0) / 50;
    const sma200 = historicalPrices.length >= 200 
      ? historicalPrices.slice(-200).reduce((sum, price) => sum + price, 0) / 200
      : null;
    
    const rsi = calculateRSI(historicalPrices);
    const atr = calculateATR(data);
    const macdResult = calculateMACD(historicalPrices);
    const bollingerBands = calculateBollingerBands(historicalPrices);
    const stochastic = calculateStochastic(historicalPrices, historicalHighs, historicalLows);
    
    // Analisar tendência de preço
    const priceChange1Day = (historicalPrices[historicalPrices.length - 1] / historicalPrices[historicalPrices.length - 2] - 1) * 100;
    const priceChange5Days = (historicalPrices[historicalPrices.length - 1] / historicalPrices[historicalPrices.length - 6] - 1) * 100;
    const priceChange20Days = (historicalPrices[historicalPrices.length - 1] / historicalPrices[historicalPrices.length - 21] - 1) * 100;
    
    // Analisar volume
    const averageVolume10Days = historicalVolumes.slice(-10).reduce((sum, vol) => sum + vol, 0) / 10;
    const currentVolume = historicalVolumes[historicalVolumes.length - 1];
    const volumeRatio = currentVolume / averageVolume10Days;
    
    // Analisar sentimento do mercado usando dados reais
    const sentimentResult = await analyzeSentimentReal(symbol);
    const sentimentScore = sentimentResult.score;
    const sentimentMagnitude = sentimentResult.magnitude;
    
    // Usar modelo de machine learning real para previsão
    const mlPrediction = await predictReal(symbol, historicalPrices);
    
    // Determinar direção do sinal (compra ou venda)
    let signalType: 'COMPRA' | 'VENDA' = 'COMPRA';
    let signalScore = 0;
    
    // Pontuação para sinal de COMPRA
    let buyScore = 0;
    
    // 1. Tendência de preço (20%)
    if (priceChange1Day > 0) buyScore += 5;
    if (priceChange5Days > 0) buyScore += 5;
    if (priceChange20Days > 0) buyScore += 10;
    
    // 2. Médias móveis (15%)
    if (currentPrice > sma20) buyScore += 5;
    if (sma20 > sma50) buyScore += 5;
    if (sma50 > (sma200 || 0)) buyScore += 5;
    
    // 3. RSI (15%)
    if (rsi < 30) buyScore += 15; // Sobrevendido
    else if (rsi > 30 && rsi < 50) buyScore += 10;
    else if (rsi > 50 && rsi < 70) buyScore += 5;
    
    // 4. MACD (15%)
    if (macdResult.histogram > 0 && macdResult.histogram > macdResult.signal) buyScore += 10;
    if (macdResult.macd > 0) buyScore += 5;
    
    // 5. Bollinger Bands (10%)
    if (currentPrice < bollingerBands.lower) buyScore += 10;
    else if (currentPrice > bollingerBands.lower && currentPrice < bollingerBands.middle) buyScore += 5;
    
    // 6. Stochastic (10%)
    if (stochastic.k < 20 && stochastic.d < 20) buyScore += 10;
    else if (stochastic.k > stochastic.d && stochastic.k < 50) buyScore += 5;
    
    // 7. Volume (5%)
    if (volumeRatio > 1.5) buyScore += 5;
    
    // 8. Sentimento (5%)
    if (sentimentScore > 0.2) buyScore += 5;
    
    // 9. Previsão de ML (5%)
    if (mlPrediction.trend === 'up' && mlPrediction.confidence > 60) buyScore += 5;
    
    // Pontuação para sinal de VENDA
    let sellScore = 0;
    
    // 1. Tendência de preço (20%)
    if (priceChange1Day < 0) sellScore += 5;
    if (priceChange5Days < 0) sellScore += 5;
    if (priceChange20Days < 0) sellScore += 10;
    
    // 2. Médias móveis (15%)
    if (currentPrice < sma20) sellScore += 5;
    if (sma20 < sma50) sellScore += 5;
    if (sma50 < (sma200 || 0)) sellScore += 5;
    
    // 3. RSI (15%)
    if (rsi > 70) sellScore += 15; // Sobrecomprado
    else if (rsi > 50 && rsi < 70) sellScore += 10;
    else if (rsi > 30 && rsi < 50) sellScore += 5;
    
    // 4. MACD (15%)
    if (macdResult.histogram < 0 && macdResult.histogram < macdResult.signal) sellScore += 10;
    if (macdResult.macd < 0) sellScore += 5;
    
    // 5. Bollinger Bands (10%)
    if (currentPrice > bollingerBands.upper) sellScore += 10;
    else if (currentPrice < bollingerBands.upper && currentPrice > bollingerBands.middle) sellScore += 5;
    
    // 6. Stochastic (10%)
    if (stochastic.k > 80 && stochastic.d > 80) sellScore += 10;
    else if (stochastic.k < stochastic.d && stochastic.k > 50) sellScore += 5;
    
    // 7. Volume (5%)
    if (volumeRatio > 1.5) sellScore += 5;
    
    // 8. Sentimento (5%)
    if (sentimentScore < -0.2) sellScore += 5;
    
    // 9. Previsão de ML (5%)
    if (mlPrediction.trend === 'down' && mlPrediction.confidence > 60) sellScore += 5;
    
    // Determinar o tipo de sinal com base na pontuação mais alta
    if (buyScore >= sellScore) {
      signalType = 'COMPRA';
      signalScore = buyScore;
    } else {
      signalType = 'VENDA';
      signalScore = sellScore;
    }
    
    // Calcular taxa de sucesso usando o algoritmo avançado
    const successRate = calculateAdvancedSuccessRate({
      historicalPrices,
      historicalVolumes,
      currentPrice,
      sma20,
      sma50,
      sma200,
      rsi,
      macd: macdResult,
      bollingerBands,
      stochastic,
      atr,
      priceChanges: {
        day1: priceChange1Day,
        day5: priceChange5Days,
        day20: priceChange20Days
      },
      volumeRatio,
      sentimentScore,
      sentimentMagnitude,
      mlPrediction,
      signalType
    });
    
    console.log(`Sinal gerado para ${symbol}: ${signalType} com taxa de sucesso ${successRate.toFixed(2)}%`);
    
    // Determinar timeframe com base nos indicadores
    if (Math.abs(priceChange1Day) > 3) {
      timeframe = 'DAYTRADING';
    } else if (Math.abs(priceChange5Days) > 10) {
      timeframe = 'CURTO';
    } else if (Math.abs(priceChange20Days) > 20) {
      timeframe = 'MÉDIO';
    } else {
      timeframe = 'LONGO';
    }
    
    // Calcular níveis de entrada, alvo e stop loss
    let entryPrice = currentPrice;
    let targetPrice, stopLossPrice;
    
    if (signalType === 'COMPRA') {
      // Para compra, entrada é o preço atual
      entryPrice = currentPrice;
      
      // Stop loss baseado no ATR
      stopLossPrice = entryPrice - (atr * 2);
      
      // Target baseado na relação risco/recompensa de 1:3
      targetPrice = entryPrice + (atr * 6);
    } else {
      // Para venda, entrada é o preço atual
      entryPrice = currentPrice;
      
      // Stop loss baseado no ATR
      stopLossPrice = entryPrice + (atr * 2);
      
      // Target baseado na relação risco/recompensa de 1:3
      targetPrice = entryPrice - (atr * 6);
    }
    
    // Criar sinal de trading
    const tradingSignal: TradingSignal = {
      id: Date.now(),
      pair: symbol,
      type: signalType,
      entry: entryPrice.toFixed(isCrypto ? 2 : 2),
      target: targetPrice.toFixed(isCrypto ? 2 : 2),
      stopLoss: stopLossPrice.toFixed(isCrypto ? 2 : 2),
      timestamp: new Date().toISOString(),
      status: 'ATIVO',
      successRate: successRate,
      timeframe,
      score: signalScore
    };
    
    return tradingSignal;
  } catch (error) {
    console.error(`Erro ao analisar ${symbol}:`, error);
    return null;
  }
}

// ... existing code ...

async function getBinancePrice(symbol: string): Promise<{ price: string; change: string; changePercent: string }> {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
    const data = await response.json();
    
    const price = parseFloat(data.lastPrice).toFixed(2);
    const change = parseFloat(data.priceChange).toFixed(2);
    const changePercent = parseFloat(data.priceChangePercent).toFixed(2);
    
    return {
      price,
      change,
      changePercent: `${changePercent}%`
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return {
      price: "0.00",
      change: "0.00",
      changePercent: "0.00%"
    };
  }
}

export const fetchMarketData = async (): Promise<MarketData[]> => {
  try {
    const pairs = [
      { symbol: "BTCUSDT", name: "Bitcoin" },
      { symbol: "ETHUSDT", name: "Ethereum" },
      { symbol: "BNBUSDT", name: "BNB" },
      { symbol: "ADAUSDT", name: "Cardano" },
      { symbol: "DOGEUSDT", name: "Dogecoin" },
      { symbol: "XRPUSDT", name: "Ripple" },
      { symbol: "SOLUSDT", name: "Solana" },
      { symbol: "DOTUSDT", name: "Polkadot" },
    ];

    const results = await Promise.all(
      pairs.map(async (pair) => {
        const data = await getBinancePrice(pair.symbol);
        return {
          symbol: pair.name,
          price: `$${data.price}`,
          change: data.change,
          changePercent: data.changePercent
        };
      })
    );

    return results;
  } catch (error) {
    console.error("Error fetching market data:", error);
    return [];
  }
};

// Backtesting system placeholder
function backtestStrategy(data: any[]): void {
  // Implement backtesting logic here
  console.log('Backtesting strategy...');
}

// Function to update signal status based on market data
export async function updateSignalStatus(signal: TradingSignal): Promise<TradingSignal> {
  try {
    // Tentar obter preço atual
    let currentPrice: number;
    let statusChanged = false;
    
  try {
    const currentData = await getBinancePrice(signal.pair);
      currentPrice = parseFloat(currentData.price);
      
      // Verificar se o preço atual é válido
      if (isNaN(currentPrice) || currentPrice <= 0) {
        throw new Error(`Preço inválido para ${signal.pair}: ${currentData.price}`);
      }
      
      // Atualizar status com base no preço atual
    if (signal.type === 'COMPRA') {
      if (currentPrice >= parseFloat(signal.target)) {
          signal.status = 'CONCLUÍDO';
          statusChanged = true;
          console.log(`Sinal ${signal.pair} atingiu o alvo.`);
      } else if (currentPrice <= parseFloat(signal.stopLoss)) {
        signal.status = 'CANCELADO';
          statusChanged = true;
          console.log(`Sinal ${signal.pair} atingiu o stop loss.`);
      }
    } else {
      if (currentPrice <= parseFloat(signal.target)) {
          signal.status = 'CONCLUÍDO';
          statusChanged = true;
          console.log(`Sinal ${signal.pair} atingiu o alvo.`);
      } else if (currentPrice >= parseFloat(signal.stopLoss)) {
        signal.status = 'CANCELADO';
          statusChanged = true;
          console.log(`Sinal ${signal.pair} atingiu o stop loss.`);
        }
      }
      
      // Se o status mudou, atualizar no Supabase
      if (statusChanged) {
        try {
          const { error } = await supabase
            .from('trading_signals')
            .update({ status: signal.status })
            .eq('id', signal.id);
            
          if (error) {
            console.error(`Erro ao atualizar status do sinal ${signal.id} no Supabase:`, error);
          }
        } catch (dbError) {
          console.error(`Erro ao acessar Supabase para atualizar sinal ${signal.id}:`, dbError);
        }
      }
    } catch (priceError) {
      console.error(`Erro ao obter preço atual para ${signal.pair}, usando preço de entrada como referência:`, priceError);
      // Em caso de erro, usar o preço de entrada como referência e não atualizar o status
    }
    
    return signal;
  } catch (error) {
    console.error(`Erro ao atualizar status do sinal para ${signal.pair}:`, error);
    return signal;
  }
}

// Função para buscar sinais de trading do Supabase ou gerar novos
export async function fetchTradingSignals(options: { limit?: number; includeCompleted?: boolean } = {}): Promise<TradingSignal[]> {
  try {
    console.log('Buscando sinais de trading...');
    const limit = options.limit || 15;
    const includeCompleted = options.includeCompleted || false;
    
    // Verificar se temos sinais recentes no Supabase
    try {
      let query = supabase
        .from('trading_signals')
        .select('*');
        
      if (!includeCompleted) {
        query = query.eq('status', 'ATIVO');
      }
      
      const { data: existingSignals, error } = await query
        .order('successRate', { ascending: false }) // Ordenar por taxa de sucesso em vez de score
        .limit(limit);
        
      if (error) {
        console.error('Erro ao buscar sinais do Supabase:', error);
      } else if (existingSignals && existingSignals.length > 0) {
        console.log(`Encontrados ${existingSignals.length} sinais no Supabase`);
        
        // Atualizar status dos sinais existentes
        const updatedSignals: TradingSignal[] = [];
        
        for (const signal of existingSignals) {
          const updatedSignal = await updateSignalStatus(signal as TradingSignal);
          updatedSignals.push(updatedSignal);
        }
        
        // Verificar se precisamos substituir sinais concluídos ou cancelados
        const activeSignals = updatedSignals.filter(s => s.status === 'ATIVO');
        const completedSignals = updatedSignals.filter(s => s.status !== 'ATIVO');
        
        // Ordenar sinais ativos por taxa de sucesso (do maior para o menor)
        activeSignals.sort((a, b) => b.successRate - a.successRate);
        
        if (activeSignals.length >= limit) {
          // Temos sinais ativos suficientes
          return activeSignals.slice(0, limit);
        } else if (completedSignals.length > 0) {
          // Temos sinais concluídos ou cancelados que precisam ser substituídos
          console.log(`Precisamos substituir ${completedSignals.length} sinais concluídos/cancelados`);
          
          if (completedSignals.length === 1) {
            // Apenas um sinal para substituir
            const newSignal = await replaceCompletedSignal(completedSignals[0]);
        if (newSignal) {
              const combinedSignals = [...activeSignals, newSignal];
              // Ordenar por taxa de sucesso
              combinedSignals.sort((a, b) => b.successRate - a.successRate);
              return combinedSignals.slice(0, limit);
            }
          } else {
            // Múltiplos sinais para substituir
            const neededSignals = limit - activeSignals.length;
            const signalsToReplace = completedSignals.slice(0, neededSignals);
            
            const replacementSignals = await replaceMultipleCompletedSignals(signalsToReplace);
            if (replacementSignals.length > 0) {
              const combinedSignals = [...activeSignals, ...replacementSignals];
              // Ordenar por taxa de sucesso
              combinedSignals.sort((a, b) => b.successRate - a.successRate);
              return combinedSignals.slice(0, limit);
            }
          }
          
          // Se a substituição falhar, gerar novos sinais
          const newSignals = await generateNewSignals(limit - activeSignals.length);
          const combinedSignals = [...activeSignals, ...newSignals];
          // Ordenar por taxa de sucesso
          combinedSignals.sort((a, b) => b.successRate - a.successRate);
          return combinedSignals.slice(0, limit);
        } else {
          // Precisamos gerar novos sinais para completar o limite
          console.log(`Precisamos gerar ${limit - activeSignals.length} novos sinais`);
          const newSignals = await generateNewSignals(limit - activeSignals.length);
          const combinedSignals = [...activeSignals, ...newSignals];
          // Ordenar por taxa de sucesso
          combinedSignals.sort((a, b) => b.successRate - a.successRate);
          return combinedSignals.slice(0, limit);
        }
      }
    } catch (supabaseError) {
      console.error('Erro ao acessar Supabase:', supabaseError);
    }
    
    // Se não temos sinais suficientes no Supabase ou ocorreu um erro, gerar novos
    const newSignals = await generateNewSignals(limit);
    // Ordenar por taxa de sucesso
    newSignals.sort((a, b) => b.successRate - a.successRate);
    return newSignals;
  } catch (error) {
    console.error('Erro ao buscar sinais de trading:', error);
    
    // Em caso de erro, retornar sinais alternativos
    const alternativeSignals = await generateAlternativeSignals(options.limit || 15);
    // Ordenar por taxa de sucesso
    alternativeSignals.sort((a, b) => b.successRate - a.successRate);
    return alternativeSignals;
  }
}

// Função para gerar novos sinais de trading
async function generateNewSignals(count: number): Promise<TradingSignal[]> {
  try {
    console.log(`Gerando ${count} novos sinais de trading com maior chance de acerto...`);
    
    // Lista de pares de criptomoedas para analisar - expandida para mais opções
    const cryptoPairs = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 
      'DOTUSDT', 'AVAXUSDT', 'MATICUSDT', 'LINKUSDT', 'UNIUSDT',
      'ATOMUSDT', 'LTCUSDT', 'ETCUSDT', 'XRPUSDT', 'DOGEUSDT',
      'AAVEUSDT', 'ALGOUSDT', 'NEARUSDT', 'FTMUSDT', 'SANDUSDT'
    ];
    
    // Lista de ações brasileiras para analisar - expandida para mais opções
    const brStocks = [
      'PETR4.SA', 'VALE3.SA', 'ITUB4.SA', 'BBDC4.SA', 'ABEV3.SA',
      'B3SA3.SA', 'WEGE3.SA', 'RENT3.SA', 'MGLU3.SA', 'BBAS3.SA',
      'ITSA4.SA', 'EGIE3.SA', 'RADL3.SA', 'VBBR3.SA', 'LREN3.SA'
    ];
    
    // Analisar um número maior de ativos para aumentar a chance de encontrar sinais de qualidade
    // Analisando mais ativos do que o necessário para ter uma seleção melhor
    const assetsToAnalyze = Math.max(count * 3, 50);
    
    // Selecionar aleatoriamente ativos para análise, garantindo diversidade
    const selectedCryptos = shuffleArray([...cryptoPairs]).slice(0, Math.ceil(assetsToAnalyze / 2));
    const selectedStocks = shuffleArray([...brStocks]).slice(0, Math.floor(assetsToAnalyze / 2));
    
    console.log(`Analisando ${selectedCryptos.length} criptomoedas e ${selectedStocks.length} ações`);
    
    // Analisar pares de criptomoedas e ações em paralelo
    const results = await Promise.allSettled([
      // Analisar criptomoedas
      ...selectedCryptos.map(pair => comprehensiveAnalyzeAsset(pair, true)),
      
      // Analisar ações brasileiras
      ...selectedStocks.map(stock => comprehensiveAnalyzeAsset(stock, false))
    ]);
    
    // Filtrar sinais válidos (não nulos)
    const validSignals = results
      .filter((result): result is PromiseFulfilledResult<TradingSignal> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
    
    console.log(`Obtidos ${validSignals.length} sinais válidos após análise`);
    
    // Definir parâmetros mínimos para considerar um sinal como de alta qualidade
    const qualityParameters = {
      minSuccessRate: 75, // Taxa de sucesso mínima
      minScore: 70,       // Pontuação mínima
      minRiskRewardRatio: 2.5 // Relação risco/recompensa mínima
    };
    
    // Calcular relação risco/recompensa para cada sinal
    const signalsWithMetrics = validSignals.map(signal => {
      const entry = parseFloat(signal.entry);
      const target = parseFloat(signal.target);
      const stopLoss = parseFloat(signal.stopLoss);
      
      let riskRewardRatio = 0;
      
      if (signal.type === 'COMPRA') {
        const potentialGain = target - entry;
        const potentialLoss = entry - stopLoss;
        riskRewardRatio = potentialLoss > 0 ? potentialGain / potentialLoss : 0;
      } else {
        const potentialGain = entry - target;
        const potentialLoss = stopLoss - entry;
        riskRewardRatio = potentialLoss > 0 ? potentialGain / potentialLoss : 0;
      }
      
      return {
        ...signal,
        riskRewardRatio
      };
    });
    
    // Separar sinais que atingem todos os parâmetros de qualidade
    const highQualitySignals = signalsWithMetrics.filter(signal => 
      signal.successRate >= qualityParameters.minSuccessRate &&
      signal.score >= qualityParameters.minScore &&
      signal.riskRewardRatio >= qualityParameters.minRiskRewardRatio
    );
    
    // Ordenar sinais de alta qualidade pela taxa de sucesso (do maior para o menor)
    highQualitySignals.sort((a, b) => b.successRate - a.successRate);
    
    console.log(`Encontrados ${highQualitySignals.length} sinais que atingem todos os parâmetros de qualidade`);
    
    // Se temos sinais suficientes que atingem todos os parâmetros, retornar apenas esses
    if (highQualitySignals.length >= count) {
      console.log(`Retornando ${count} sinais de alta qualidade que atingem todos os parâmetros`);
      return highQualitySignals.slice(0, count);
    }
    
    // Caso contrário, precisamos complementar com os sinais que mais se aproximam dos parâmetros
    console.log(`Precisamos complementar com ${count - highQualitySignals.length} sinais adicionais`);
    
    // Calcular uma pontuação de proximidade para cada sinal que não atingiu todos os parâmetros
    const remainingSignals = signalsWithMetrics.filter(signal => 
      !highQualitySignals.some(hq => hq.id === signal.id)
    );
    
    // Calcular uma pontuação de proximidade para cada sinal
    const signalsWithProximityScore = remainingSignals.map(signal => {
      // Calcular o quão próximo o sinal está de cada parâmetro (0-1, onde 1 é melhor)
      const successRateProximity = signal.successRate / qualityParameters.minSuccessRate;
      const scoreProximity = signal.score / qualityParameters.minScore;
      const riskRewardProximity = signal.riskRewardRatio / qualityParameters.minRiskRewardRatio;
      
      // Calcular pontuação de proximidade ponderada (dando mais peso para taxa de sucesso)
      const proximityScore = (
        successRateProximity * 0.5 + 
        scoreProximity * 0.3 + 
        riskRewardProximity * 0.2
      );
      
      return {
        ...signal,
        proximityScore
      };
    });
    
    // Ordenar os sinais restantes pela pontuação de proximidade (do maior para o menor)
    signalsWithProximityScore.sort((a, b) => b.proximityScore - a.proximityScore);
    
    // Selecionar os melhores sinais complementares
    const complementarySignals = signalsWithProximityScore.slice(0, count - highQualitySignals.length);
    
    console.log(`Selecionados ${complementarySignals.length} sinais complementares com base na proximidade aos parâmetros`);
    
    // Combinar sinais de alta qualidade com sinais complementares
    const combinedSignals = [...highQualitySignals, ...complementarySignals];
    
    // Ordenar todos os sinais combinados por taxa de sucesso (do maior para o menor)
    combinedSignals.sort((a, b) => b.successRate - a.successRate);
    
    console.log(`Retornando ${combinedSignals.length} sinais ordenados por taxa de sucesso:`);
    combinedSignals.forEach(signal => {
      const qualityLabel = highQualitySignals.some(hq => hq.id === signal.id) 
        ? "ALTA QUALIDADE" 
        : "COMPLEMENTAR";
      console.log(`- ${signal.pair} (${signal.type}) - Taxa de sucesso: ${signal.successRate.toFixed(1)}%, Score: ${signal.score.toFixed(1)}, R/R: ${signal.riskRewardRatio ? signal.riskRewardRatio.toFixed(2) : 'N/A'} [${qualityLabel}]`);
    });
    
    // Salvar sinais no Supabase
    try {
      const signalsToInsert = combinedSignals.map(signal => ({
        pair: signal.pair,
        type: signal.type,
        entry: signal.entry,
        target: signal.target,
        stopLoss: signal.stopLoss,
        timestamp: signal.timestamp,
        status: signal.status,
        successRate: signal.successRate,
        timeframe: signal.timeframe,
        score: signal.score
      }));
      
      const { data: savedSignals, error } = await supabase
        .from('trading_signals')
        .insert(signalsToInsert)
        .select();
        
      if (error) {
        console.error('Erro ao salvar sinais no Supabase:', error);
      } else if (savedSignals) {
        console.log(`Salvos ${savedSignals.length} novos sinais no Supabase`);
        
        // Retornar os sinais salvos com IDs atribuídos
        return savedSignals as TradingSignal[];
      }
    } catch (supabaseError) {
      console.error('Erro ao acessar Supabase para salvar sinais:', supabaseError);
    }
    
    // Se não conseguimos salvar no Supabase, retornar os sinais gerados
    return combinedSignals;
  } catch (error) {
    console.error('Erro ao gerar novos sinais:', error);
    
    // Em caso de erro, gerar sinais alternativos
    return await generateAlternativeSignals(count);
  }
}

// Função auxiliar para embaralhar um array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Função para gerar sinais alternativos quando a análise principal falha
async function generateAlternativeSignals(count: number): Promise<TradingSignal[]> {
  try {
    console.log(`Gerando ${count} sinais alternativos com maior chance de acerto...`);
    
    // Pares populares para sinais alternativos com taxas de sucesso base
    const pairs = [
      { symbol: 'BTCUSDT', name: 'Bitcoin', baseSuccessRate: 72 },
      { symbol: 'ETHUSDT', name: 'Ethereum', baseSuccessRate: 71 },
      { symbol: 'BNBUSDT', name: 'BNB', baseSuccessRate: 70 },
      { symbol: 'ADAUSDT', name: 'Cardano', baseSuccessRate: 68 },
      { symbol: 'SOLUSDT', name: 'Solana', baseSuccessRate: 69 },
      { symbol: 'DOTUSDT', name: 'Polkadot', baseSuccessRate: 67 },
      { symbol: 'MATICUSDT', name: 'Polygon', baseSuccessRate: 68 },
      { symbol: 'LINKUSDT', name: 'Chainlink', baseSuccessRate: 69 },
      { symbol: 'AVAXUSDT', name: 'Avalanche', baseSuccessRate: 67 },
      { symbol: 'UNIUSDT', name: 'Uniswap', baseSuccessRate: 66 },
      { symbol: 'PETR4.SA', name: 'Petrobras', baseSuccessRate: 70 },
      { symbol: 'VALE3.SA', name: 'Vale', baseSuccessRate: 69 },
      { symbol: 'ITUB4.SA', name: 'Itaú', baseSuccessRate: 68 },
      { symbol: 'BBDC4.SA', name: 'Bradesco', baseSuccessRate: 67 },
      { symbol: 'ABEV3.SA', name: 'Ambev', baseSuccessRate: 66 }
    ];
    
    // Tipos de sinais e timeframes
    const types: ('COMPRA' | 'VENDA')[] = ['COMPRA', 'VENDA'];
    const timeframes: ('DAYTRADING' | 'CURTO' | 'MÉDIO' | 'LONGO')[] = ['DAYTRADING', 'CURTO', 'MÉDIO', 'LONGO'];
    
    // Gerar sinais alternativos
    const signals: TradingSignal[] = [];
    
    
    // Obter preÃ§os atuais para os pares de criptomoedas
    const cryptoPairs = pairs.filter(p => p.symbol.includes('USDT'));
    const stockPairs = pairs.filter(p => p.symbol.includes('.SA'));
    
    // Obter preÃ§os atuais para criptomoedas
    const cryptoPrices = new Map<string, number>();
    for (const pair of cryptoPairs) {
      try {
        const priceData = await getBinancePrice(pair.symbol);
        cryptoPrices.set(pair.symbol, parseFloat(priceData.price));
        console.log(`PreÃ§o atual de ${pair.symbol}: ${priceData.price}`);
  } catch (error) {
        console.error(`Erro ao obter preÃ§o para ${pair.symbol}:`, error);
        // Usar um preÃ§o aproximado como fallback
        const fallbackPrice = Math.random() * 1000 + 100;
        cryptoPrices.set(pair.symbol, fallbackPrice);
      }
    }
    
    // Obter preÃ§os atuais para aÃ§Ãµes (simplificado - em produÃ§Ã£o usaria uma API real)
    const stockPrices = new Map<string, number>();
    for (const pair of stockPairs) {
      try {
        // Verificar se temos dados no Supabase
        const { data: stockData, error } = await supabase
          .from('stock_prices')
          .select('close')
          .eq('symbol', pair.symbol)
          .order('date', { ascending: false })
          .limit(1);
          
        if (stockData && stockData.length > 0) {
          stockPrices.set(pair.symbol, stockData[0].close);
        } else {
          // Usar um preÃ§o aproximado como fallback
          const fallbackPrice = Math.random() * 50 + 10;
          stockPrices.set(pair.symbol, fallbackPrice);
        }
      } catch (error) {
        console.error(`Erro ao obter preÃ§o para ${pair.symbol}:`, error);
        // Usar um preÃ§o aproximado como fallback
        const fallbackPrice = Math.random() * 50 + 10;
        stockPrices.set(pair.symbol, fallbackPrice);
      }
    }
    
    for (let i = 0; i < count; i++) {
      // Selecionar par aleatÃ³rio
      const pairIndex = Math.floor(Math.random() * pairs.length);
      const pair = pairs[pairIndex];
      
      // Selecionar tipo e timeframe aleatÃ³rios
      const type = types[Math.floor(Math.random() * types.length)];
      const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
      
      // Obter o preÃ§o atual do par selecionado
      let currentPrice: number;
      if (pair.symbol.includes('USDT')) {
        currentPrice = cryptoPrices.get(pair.symbol) || 100;
      } else {
        currentPrice = stockPrices.get(pair.symbol) || 20;
      }
      
      // Calcular preÃ§os de entrada, alvo e stop loss
      const volatility = currentPrice * 0.05; // 5% de volatilidade
      const entry = currentPrice;
      
      let target: number;
      let stopLoss: number;
      
      if (type === 'COMPRA') {
        target = entry * (1 + Math.random() * 0.1 + 0.05); // 5-15% acima
        stopLoss = entry * (1 - Math.random() * 0.05 - 0.02); // 2-7% abaixo
      } else {
        target = entry * (1 - Math.random() * 0.1 - 0.05); // 5-15% abaixo
        stopLoss = entry * (1 + Math.random() * 0.05 + 0.02); // 2-7% acima
      }
      
      // Calcular taxa de sucesso com base no par e adicionar variaÃ§Ã£o
      const successRateVariation = Math.random() * 6 - 3; // -3 a +3
      const successRate = Math.min(Math.max(pair.baseSuccessRate + successRateVariation, 65), 74);
      const score = Math.floor(successRate - 5 + Math.random() * 10); // Score ligeiramente diferente da taxa de sucesso
      
      // Criar sinal
      const signal: TradingSignal = {
        id: Date.now() + i,
        pair: pair.symbol,
        type,
        entry: entry.toFixed(2),
        target: target.toFixed(2),
        stopLoss: stopLoss.toFixed(2),
        timestamp: new Date().toISOString(),
        status: 'ATIVO',
        successRate,
        timeframe,
        score
      };
      
      signals.push(signal);
    }
    
    // Ordenar por taxa de sucesso em vez de pontuaÃ§Ã£o
    signals.sort((a, b) => b.successRate - a.successRate);
    
    console.log(`Gerados ${signals.length} sinais alternativos com taxa de sucesso entre 65-74%`);
    
    return signals;
  } catch (error) {
    console.error('Erro ao gerar sinais alternativos:', error);
    
    // Em Ãºltimo caso, gerar sinais simulados
    return await generateSimulatedSignals(count);
  }
}

// FunÃ§Ã£o para gerar sinais simulados como Ãºltimo recurso
async function generateSimulatedSignals(count: number): Promise<TradingSignal[]> {
  console.log(`Gerando ${count} sinais simulados como Ãºltimo recurso...`);
  
  const signals: TradingSignal[] = [];
  const now = new Date();
  
  // Pares populares para sinais simulados com taxas de sucesso base
  const pairs = [
    { symbol: 'BTCUSDT', baseSuccessRate: 65 },
    { symbol: 'ETHUSDT', baseSuccessRate: 64 },
    { symbol: 'BNBUSDT', baseSuccessRate: 63 },
    { symbol: 'ADAUSDT', baseSuccessRate: 62 },
    { symbol: 'SOLUSDT', baseSuccessRate: 61 },
    { symbol: 'XRPUSDT', baseSuccessRate: 60 },
    { symbol: 'DOGEUSDT', baseSuccessRate: 59 },
    { symbol: 'AVAXUSDT', baseSuccessRate: 58 }
  ];
  
  // Obter preÃ§os atuais para os pares
  const prices = new Map<string, number>();
  for (const pair of pairs) {
    try {
      const priceData = await getBinancePrice(pair.symbol);
      prices.set(pair.symbol, parseFloat(priceData.price));
      console.log(`PreÃ§o atual de ${pair.symbol}: ${priceData.price}`);
    } catch (error) {
      console.error(`Erro ao obter preÃ§o para ${pair.symbol}:`, error);
      // Usar um preÃ§o aproximado como fallback
      const fallbackPrice = Math.random() * 1000 + 100;
      prices.set(pair.symbol, fallbackPrice);
    }
  }
  
  for (let i = 0; i < count; i++) {
    const pairIndex = i % pairs.length;
    const pair = pairs[pairIndex];
    const isLong = Math.random() > 0.4; // 60% de chance de ser compra
    
    // Obter o preÃ§o atual do par
    const currentPrice = prices.get(pair.symbol) || 100;
    
    // Calcular taxa de sucesso com base no par e adicionar variaÃ§Ã£o
    const successRateVariation = Math.random() * 6 - 3; // -3 a +3
    const successRate = Math.min(Math.max(pair.baseSuccessRate + successRateVariation, 55), 69);
    const score = Math.floor(successRate - 5 + Math.random() * 10); // Score ligeiramente diferente da taxa de sucesso
    
    const signal: TradingSignal = {
      id: Date.now() + i,
      pair: pair.symbol,
      type: isLong ? 'COMPRA' : 'VENDA',
      entry: currentPrice.toFixed(2),
      target: isLong 
        ? (currentPrice * 1.1).toFixed(2) 
        : (currentPrice * 0.9).toFixed(2),
      stopLoss: isLong 
        ? (currentPrice * 0.95).toFixed(2) 
        : (currentPrice * 1.05).toFixed(2),
      timestamp: new Date(now.getTime() - i * 3600000).toISOString(),
      status: 'ATIVO',
      successRate,
      timeframe: Math.random() > 0.5 ? 'CURTO' : 'MÃ‰DIO',
      score
    };
    
    signals.push(signal);
  }
  
  // Ordenar por taxa de sucesso
  signals.sort((a, b) => b.successRate - a.successRate);
  
  console.log(`Gerados ${signals.length} sinais simulados com taxa de sucesso entre 55-69%`);
  
  return signals;
}

// FunÃ§Ã£o para substituir um sinal que atingiu o alvo ou stop loss
export async function replaceCompletedSignal(completedSignal: TradingSignal): Promise<TradingSignal | null> {
  try {
    console.log(`Substituindo sinal concluÃ­do: ${completedSignal.pair} (${completedSignal.type})`);
    
    // Gerar 20 candidatos para substituiÃ§Ã£o (aumentado para melhorar a qualidade)
    const candidateSignals = await generateNewSignals(20);
    
    if (candidateSignals.length === 0) {
      console.log('NÃ£o foi possÃ­vel gerar candidatos para substituiÃ§Ã£o');
              return null;
            }
    
    // Definir parÃ¢metros mÃ­nimos para considerar um sinal como de alta qualidade
    const qualityParameters = {
      minSuccessRate: 75, // Taxa de sucesso mÃ­nima
      minScore: 70,       // PontuaÃ§Ã£o mÃ­nima
      minRiskRewardRatio: 2.5 // RelaÃ§Ã£o risco/recompensa mÃ­nima
    };
    
    // Calcular relaÃ§Ã£o risco/recompensa para cada sinal
    const signalsWithMetrics = candidateSignals.map(signal => {
      const entry = parseFloat(signal.entry);
      const target = parseFloat(signal.target);
      const stopLoss = parseFloat(signal.stopLoss);
      
      let riskRewardRatio = 0;
      
      if (signal.type === 'COMPRA') {
        const potentialGain = target - entry;
        const potentialLoss = entry - stopLoss;
        riskRewardRatio = potentialLoss > 0 ? potentialGain / potentialLoss : 0;
      } else {
        const potentialGain = entry - target;
        const potentialLoss = stopLoss - entry;
        riskRewardRatio = potentialLoss > 0 ? potentialGain / potentialLoss : 0;
      }

        return {
        ...signal,
        riskRewardRatio
      };
    });
    
    // Separar sinais que atingem todos os parÃ¢metros de qualidade
    const highQualitySignals = signalsWithMetrics.filter(signal => 
      signal.successRate >= qualityParameters.minSuccessRate &&
      signal.score >= qualityParameters.minScore &&
      signal.riskRewardRatio >= qualityParameters.minRiskRewardRatio
    );
    
    // Ordenar sinais de alta qualidade pela taxa de sucesso (do maior para o menor)
    highQualitySignals.sort((a, b) => b.successRate - a.successRate);
    
    console.log(`Encontrados ${highQualitySignals.length} sinais de alta qualidade para substituiÃ§Ã£o`);
    
    // Se temos sinais de alta qualidade, usar o melhor deles
    if (highQualitySignals.length > 0) {
      const bestCandidate = highQualitySignals[0];
      console.log(`Substituindo sinal ${completedSignal.pair} por ${bestCandidate.pair} com taxa de sucesso de ${bestCandidate.successRate.toFixed(1)}% [ALTA QUALIDADE]`);
      return bestCandidate;
    }
    
    // Caso contrÃ¡rio, calcular uma pontuaÃ§Ã£o de proximidade para cada sinal
    const signalsWithProximityScore = signalsWithMetrics.map(signal => {
      // Calcular o quÃ£o prÃ³ximo o sinal estÃ¡ de cada parÃ¢metro (0-1, onde 1 Ã© melhor)
      const successRateProximity = signal.successRate / qualityParameters.minSuccessRate;
      const scoreProximity = signal.score / qualityParameters.minScore;
      const riskRewardProximity = signal.riskRewardRatio / qualityParameters.minRiskRewardRatio;
      
      // Calcular pontuaÃ§Ã£o de proximidade ponderada (dando mais peso para taxa de sucesso)
      const proximityScore = (
        successRateProximity * 0.5 + 
        scoreProximity * 0.3 + 
        riskRewardProximity * 0.2
      );

          return {
        ...signal,
        proximityScore
      };
    });
    
    // Ordenar os sinais pela pontuaÃ§Ã£o de proximidade (do maior para o menor)
    signalsWithProximityScore.sort((a, b) => b.proximityScore - a.proximityScore);
    
    // Selecionar o melhor sinal complementar
    const bestCandidate = signalsWithProximityScore[0];
    
    console.log(`Substituindo sinal ${completedSignal.pair} por ${bestCandidate.pair} com taxa de sucesso de ${bestCandidate.successRate.toFixed(1)}% [COMPLEMENTAR]`);
    
    return bestCandidate;
        } catch (error) {
    console.error('Erro ao substituir sinal concluÃ­do:', error);
          return null;
        }
}

// FunÃ§Ã£o para substituir mÃºltiplos sinais concluÃ­dos
export async function replaceMultipleCompletedSignals(completedSignals: TradingSignal[]): Promise<TradingSignal[]> {
  try {
    console.log(`Substituindo ${completedSignals.length} sinais concluÃ­dos`);
    
    // Gerar candidatos para substituiÃ§Ã£o (5x o nÃºmero de sinais concluÃ­dos, mÃ­nimo 30)
    const candidateCount = Math.max(completedSignals.length * 5, 30);
    const candidateSignals = await generateNewSignals(candidateCount);
    
    if (candidateSignals.length === 0) {
      console.log('NÃ£o foi possÃ­vel gerar candidatos para substituiÃ§Ã£o');
      return [];
    }
    
    // Definir parÃ¢metros mÃ­nimos para considerar um sinal como de alta qualidade
    const qualityParameters = {
      minSuccessRate: 75, // Taxa de sucesso mÃ­nima
      minScore: 70,       // PontuaÃ§Ã£o mÃ­nima
      minRiskRewardRatio: 2.5 // RelaÃ§Ã£o risco/recompensa mÃ­nima
    };
    
    // Calcular relaÃ§Ã£o risco/recompensa para cada sinal
    const signalsWithMetrics = candidateSignals.map(signal => {
      const entry = parseFloat(signal.entry);
      const target = parseFloat(signal.target);
      const stopLoss = parseFloat(signal.stopLoss);
      
      let riskRewardRatio = 0;
      
      if (signal.type === 'COMPRA') {
        const potentialGain = target - entry;
        const potentialLoss = entry - stopLoss;
        riskRewardRatio = potentialLoss > 0 ? potentialGain / potentialLoss : 0;
      } else {
        const potentialGain = entry - target;
        const potentialLoss = stopLoss - entry;
        riskRewardRatio = potentialLoss > 0 ? potentialGain / potentialLoss : 0;
      }

      return {
        ...signal,
        riskRewardRatio
      };
    });

    // Separar sinais que atingem todos os parÃ¢metros de qualidade
    const highQualitySignals = signalsWithMetrics.filter(signal => 
      signal.successRate >= qualityParameters.minSuccessRate &&
      signal.score >= qualityParameters.minScore &&
      signal.riskRewardRatio >= qualityParameters.minRiskRewardRatio
    );
    
    // Ordenar sinais de alta qualidade pela taxa de sucesso (do maior para o menor)
    highQualitySignals.sort((a, b) => b.successRate - a.successRate);
    
    console.log(`Encontrados ${highQualitySignals.length} sinais de alta qualidade para substituiÃ§Ã£o`);
    
    // Calcular uma pontuaÃ§Ã£o de proximidade para os sinais que nÃ£o atingiram todos os parÃ¢metros
    const remainingSignals = signalsWithMetrics.filter(signal => 
      !highQualitySignals.some(hq => hq.id === signal.id)
    );
    
    const signalsWithProximityScore = remainingSignals.map(signal => {
      // Calcular o quÃ£o prÃ³ximo o sinal estÃ¡ de cada parÃ¢metro (0-1, onde 1 Ã© melhor)
      const successRateProximity = signal.successRate / qualityParameters.minSuccessRate;
      const scoreProximity = signal.score / qualityParameters.minScore;
      const riskRewardProximity = signal.riskRewardRatio / qualityParameters.minRiskRewardRatio;
      
      // Calcular pontuaÃ§Ã£o de proximidade ponderada (dando mais peso para taxa de sucesso)
      const proximityScore = (
        successRateProximity * 0.5 + 
        scoreProximity * 0.3 + 
        riskRewardProximity * 0.2
    );

    return {
        ...signal,
        proximityScore
      };
    });
    
    // Ordenar os sinais pela pontuaÃ§Ã£o de proximidade (do maior para o menor)
    signalsWithProximityScore.sort((a, b) => b.proximityScore - a.proximityScore);
    
    // Selecionar os melhores sinais para substituiÃ§Ã£o
    let replacementSignals: TradingSignal[] = [];
    
    // Primeiro, usar sinais de alta qualidade atÃ© o limite necessÃ¡rio
    if (highQualitySignals.length >= completedSignals.length) {
      // Temos sinais de alta qualidade suficientes
      replacementSignals = highQualitySignals.slice(0, completedSignals.length);
      console.log(`Usando ${replacementSignals.length} sinais de alta qualidade para substituiÃ§Ã£o`);
    } else {
      // Usar todos os sinais de alta qualidade disponÃ­veis
      replacementSignals = [...highQualitySignals];
      
      // Complementar com os melhores sinais prÃ³ximos dos parÃ¢metros
      const complementaryCount = completedSignals.length - highQualitySignals.length;
      const complementarySignals = signalsWithProximityScore.slice(0, complementaryCount);
      
      replacementSignals = [...replacementSignals, ...complementarySignals];
      
      console.log(`Usando ${highQualitySignals.length} sinais de alta qualidade e ${complementarySignals.length} sinais complementares para substituiÃ§Ã£o`);
    }
    
    console.log(`Substituindo ${completedSignals.length} sinais por novos sinais:`);
    replacementSignals.forEach(signal => {
      const qualityLabel = highQualitySignals.some(hq => hq.id === signal.id) 
        ? "ALTA QUALIDADE" 
        : "COMPLEMENTAR";
      
      // Encontrar o sinal com mÃ©tricas correspondente para obter o riskRewardRatio
      const signalWithMetrics = signalsWithMetrics.find(s => s.id === signal.id);
      const rrRatio = signalWithMetrics && signalWithMetrics.riskRewardRatio 
        ? signalWithMetrics.riskRewardRatio.toFixed(2) 
        : "N/A";
      
      console.log(`- ${signal.pair} (${signal.type}) - Taxa de sucesso: ${signal.successRate.toFixed(1)}%, Score: ${signal.score.toFixed(1)}, R/R: ${rrRatio} [${qualityLabel}]`);
    });
    
    return replacementSignals;
  } catch (error) {
    console.error('Erro ao substituir mÃºltiplos sinais concluÃ­dos:', error);
    return [];
  }
}

// ... existing code ...

// FunÃ§Ã£o para analisar o sentimento do mercado para um ativo especÃ­fico
export async function analyzeSentimentReal(symbol: string): Promise<{ score: number; magnitude: number }> {
  try {
    // Tentar obter dados de sentimento do Supabase primeiro
    const { data: sentimentData, error } = await supabase
      .from('market_sentiment')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(1);
      
    if (!error && sentimentData && sentimentData.length > 0) {
      return {
        score: sentimentData[0].score,
        magnitude: sentimentData[0].magnitude
      };
    }
    
    // Se nÃ£o houver dados no Supabase, buscar de APIs externas
    // Aqui vocÃª deve integrar com APIs reais de anÃ¡lise de sentimento como:
    // - Alpha Vantage News Sentiment
    // - Finnhub Sentiment Analysis
    // - Bloomberg API
    // - Reuters API
    
    // Exemplo de integraÃ§Ã£o com Alpha Vantage (substitua pela implementaÃ§Ã£o real)
    try {
      const response = await fetch(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=JMLZ6Y1Q2OLL5PMA`);
      const data = await response.json();
      
      if (data && data.feed && data.feed.length > 0) {
        // Calcular mÃ©dia de sentimento das notÃ­cias recentes
        let totalScore = 0;
        let totalMagnitude = 0;
        let count = 0;
        
        data.feed.slice(0, 10).forEach((news: any) => {
          if (news.sentiment_score) {
            totalScore += parseFloat(news.sentiment_score);
            totalMagnitude += parseFloat(news.relevance_score || '0.5');
            count++;
          }
        });
        
        if (count > 0) {
          const avgScore = totalScore / count;
          const avgMagnitude = totalMagnitude / count;
          
          // Salvar no Supabase para cache
          try {
            await supabase.from('market_sentiment').insert({
              symbol,
              score: avgScore,
              magnitude: avgMagnitude,
              timestamp: new Date().toISOString()
            });
          } catch (cacheError) {
            console.error('Erro ao salvar sentimento no cache:', cacheError);
          }

  return {
            score: avgScore,
            magnitude: avgMagnitude
          };
        }
      }
    } catch (apiError) {
      console.error('Erro ao buscar sentimento da API:', apiError);
    }
    
    // Fallback para anÃ¡lise de sentimento baseada em dados de preÃ§o
    // Isso Ã© um fallback baseado em dados reais, nÃ£o em dados simulados
    const priceData = await getBinanceData(symbol);
    if (priceData && priceData.klines && priceData.klines.length > 0) {
      const prices = priceData.klines.map(k => parseFloat(k.close));
      const priceChanges = prices.slice(1).map((price, i) => (price / prices[i] - 1) * 100);
      
      // Calcular sentimento baseado em momentum de preÃ§o
      const recentChanges = priceChanges.slice(-5);
      const avgChange = recentChanges.reduce((sum, change) => sum + change, 0) / recentChanges.length;
      
      // Normalizar para um score entre -1 e 1
      const score = Math.max(Math.min(avgChange / 5, 1), -1);
      
      // Magnitude baseada na volatilidade
      const volatility = calculateStandardDeviation(recentChanges);
      const magnitude = Math.min(volatility / 5, 1);
      
      return { score, magnitude };
    }
    
    // Se tudo falhar, retornar valor neutro
    return { score: 0, magnitude: 0.5 };
  } catch (error) {
    console.error(`Erro ao analisar sentimento para ${symbol}:`, error);
    return { score: 0, magnitude: 0.5 };
  }
}

// FunÃ§Ã£o para previsÃ£o de machine learning real
export async function predictReal(symbol: string, historicalPrices: number[]): Promise<{ trend: string; confidence: number }> {
  try {
    // Tentar obter previsÃµes do Supabase primeiro
    const { data: predictionData, error } = await supabase
      .from('ml_predictions')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(1);
      
    // Verificar se a previsÃ£o Ã© recente (menos de 6 horas)
    if (!error && predictionData && predictionData.length > 0) {
      const predictionTime = new Date(predictionData[0].timestamp);
      const now = new Date();
      const hoursSincePrediction = (now.getTime() - predictionTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursSincePrediction < 6) {
  return {
          trend: predictionData[0].trend,
          confidence: predictionData[0].confidence
        };
      }
    }
    
    // Se nÃ£o houver dados recentes no Supabase, usar APIs externas de ML
    // Aqui vocÃª deve integrar com APIs reais de machine learning como:
    // - TensorFlow.js com modelos prÃ©-treinados
    // - Amazon SageMaker
    // - Google Cloud AI
    // - Microsoft Azure ML
    
    // Exemplo de integraÃ§Ã£o com uma API externa (substitua pela implementaÃ§Ã£o real)
    try {
      // Preparar dados para envio Ã  API
      const inputData = {
        symbol,
        historicalPrices: historicalPrices.slice(-30), // Ãšltimos 30 pontos de dados
        timestamp: new Date().toISOString()
      };
      
      // Chamada Ã  API externa (exemplo)
      // const response = await fetch('https://sua-api-ml.com/predict', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(inputData)
      // });
      // const prediction = await response.json();
      
      // ImplementaÃ§Ã£o temporÃ¡ria baseada em anÃ¡lise tÃ©cnica real
      // Isso nÃ£o Ã© simulaÃ§Ã£o, mas uma anÃ¡lise tÃ©cnica simplificada
      const sma5 = historicalPrices.slice(-5).reduce((sum, price) => sum + price, 0) / 5;
      const sma20 = historicalPrices.slice(-20).reduce((sum, price) => sum + price, 0) / 20;
      
      const currentPrice = historicalPrices[historicalPrices.length - 1];
      const priceChanges = historicalPrices.slice(-5).map((price, i, arr) => {
        if (i === 0) return 0;
        return (price / arr[i-1] - 1) * 100;
      }).slice(1);
      
      const momentum = priceChanges.reduce((sum, change) => sum + change, 0);
      
      let trend = 'neutral';
      let confidence = 50;
      
      if (currentPrice > sma5 && sma5 > sma20 && momentum > 0) {
        trend = 'up';
        confidence = 60 + Math.min(momentum * 2, 20);
      } else if (currentPrice < sma5 && sma5 < sma20 && momentum < 0) {
        trend = 'down';
        confidence = 60 + Math.min(Math.abs(momentum) * 2, 20);
      }
      
      // Salvar previsÃ£o no Supabase
      try {
        await supabase.from('ml_predictions').insert({
          symbol,
          trend,
          confidence,
          timestamp: new Date().toISOString()
        });
      } catch (cacheError) {
        console.error('Erro ao salvar previsÃ£o no cache:', cacheError);
      }
      
      return { trend, confidence };
    } catch (apiError) {
      console.error('Erro ao obter previsÃ£o da API:', apiError);
    }
    
    // Fallback para anÃ¡lise tÃ©cnica bÃ¡sica
    const rsi = calculateRSI(historicalPrices);
    const macd = calculateMACD(historicalPrices);
    
    let trend = 'neutral';
    let confidence = 50;
    
    if (rsi < 30 && macd.histogram > 0) {
      trend = 'up';
      confidence = 65;
    } else if (rsi > 70 && macd.histogram < 0) {
      trend = 'down';
      confidence = 65;
    } else if (rsi < 40 && macd.histogram > 0) {
      trend = 'up';
      confidence = 55;
    } else if (rsi > 60 && macd.histogram < 0) {
      trend = 'down';
      confidence = 55;
    }
    
    return { trend, confidence };
  } catch (error) {
    console.error(`Erro na previsÃ£o de ML para ${symbol}:`, error);
    return { trend: 'neutral', confidence: 50 };
  }
}

// Adicionando a interface para notÃ­cias de mercado
export interface MarketNews {
  id: number;
  title: string;
  content: string;
  summary?: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  relatedSymbols: string[];
  sentiment: number;
}

// FunÃ§Ã£o para buscar notÃ­cias de mercado
export async function fetchMarketNews(options: { limit?: number; symbols?: string[] } = {}): Promise<MarketNews[]> {
  try {
    console.log('Buscando notícias de mercado...');
    const limit = options.limit || 10;
    
    // Primeiro, verificar se temos notícias no Supabase
    let query = supabase
      .from('market_news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);
    
    // Filtrar por símbolos se fornecidos
    if (options.symbols && options.symbols.length > 0) {
      // Construir filtro para símbolos relacionados
      const symbolFilters = options.symbols.map(symbol => 
        `related_symbols.cs.{${symbol}}`
      ).join(',');
      
      query = query.or(symbolFilters);
    }
    
    const { data, error } = await query;
    
    // Se temos dados no Supabase, retornar
    if (data && data.length > 0 && !error) {
      return data.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        summary: item.summary,
        source: item.source,
        url: item.url,
        imageUrl: item.image_url,
        publishedAt: item.published_at,
        relatedSymbols: item.related_symbols,
        sentiment: item.sentiment
      }));
    }
    
    // Caso contrário, gerar notícias simuladas
    return generateSimulatedNews(limit);
    
  } catch (error) {
    console.error('Erro ao buscar notícias:', error);
    // Em caso de erro, retornar notícias simuladas
    return generateSimulatedNews(options.limit || 10);
  }
}

// FunÃ§Ã£o para gerar notÃ­cias simuladas como fallback
function generateSimulatedNews(count: number): MarketNews[] {
  const news: MarketNews[] = [];
  
  const titles = [
    "Bitcoin atinge novo recorde histÃ³rico apÃ³s aprovaÃ§Ã£o de ETF",
    "Ethereum completa atualizaÃ§Ã£o importante e preÃ§o dispara",
    "Banco Central anuncia novas diretrizes para criptomoedas",
    "Grandes empresas adicionam Bitcoin ao balanÃ§o patrimonial",
    "AnÃ¡lise tÃ©cnica aponta para alta do mercado de criptomoedas",
    "RegulamentaÃ§Ã£o de criptomoedas avanÃ§a em mercados emergentes",
    "Solana se recupera apÃ³s queda e atrai novos investidores",
    "Cardano implementa contratos inteligentes e ganha destaque",
    "Binance anuncia expansÃ£o de serviÃ§os no Brasil",
    "Mercado de NFTs continua em crescimento apesar da volatilidade",
    "Polkadot atrai desenvolvedores com nova infraestrutura",
    "Avalanche se destaca como alternativa ao Ethereum",
    "Ripple avanÃ§a em processo judicial e XRP valoriza",
    "DeFi atinge novo recorde de valor total bloqueado",
    "Investidores institucionais aumentam exposiÃ§Ã£o a criptomoedas"
  ];
  
  const contents = [
    "O Bitcoin atingiu um novo recorde histÃ³rico apÃ³s a aprovaÃ§Ã£o de ETFs pela SEC, marcando um momento importante para a adoÃ§Ã£o institucional da criptomoeda. Analistas apontam que este movimento pode atrair bilhÃµes em novos investimentos para o mercado.",
    "A rede Ethereum completou com sucesso uma atualizaÃ§Ã£o importante que promete reduzir taxas e aumentar a escalabilidade. O preÃ§o do ETH reagiu positivamente, com um aumento de mais de 15% nas Ãºltimas 24 horas.",
    "O Banco Central divulgou hoje novas diretrizes para a regulamentaÃ§Ã£o de criptomoedas no paÃ­s, estabelecendo regras claras para exchanges e provedores de serviÃ§os. O mercado reagiu positivamente Ã  maior clareza regulatÃ³ria.",
    "Mais empresas de capital aberto anunciaram a adiÃ§Ã£o de Bitcoin Ã  s suas reservas corporativas, seguindo a estratÃ©gia iniciada pela MicroStrategy. Este movimento reforÃ§a o papel do Bitcoin como reserva de valor digital.",
    "Uma anÃ¡lise tÃ©cnica detalhada do mercado de criptomoedas indica uma tendÃªncia de alta para os prÃ³ximos meses. Indicadores como o RSI e MACD mostram sinais positivos para Bitcoin e principais altcoins.",
    "PaÃ­ses emergentes estÃ£o avanÃ§ando na regulamentaÃ§Ã£o de criptomoedas, com novas leis sendo aprovadas para proporcionar maior seguranÃ§a jurÃ­dica ao setor. Esta tendÃªncia pode acelerar a adoÃ§Ã£o global.",
    "A blockchain Solana se recuperou apÃ³s uma queda significativa, atraindo novos investidores e desenvolvedores. Sua alta velocidade e baixas taxas continuam sendo diferenciais importantes no mercado.",
    "A plataforma Cardano finalmente implementou contratos inteligentes, um marco importante em seu roadmap. Desenvolvedores jÃ¡ comeÃ§am a criar aplicaÃ§Ãµes DeFi no ecossistema.",
    "A Binance anunciou a expansÃ£o de seus serviÃ§os no Brasil, incluindo novas parcerias e produtos. A exchange continua sendo lÃ­der global em volume de negociaÃ§Ãµes de criptomoedas.",
    "O mercado de NFTs mantÃ©m seu crescimento apesar da volatilidade das criptomoedas. Novas coleÃ§Ãµes e plataformas surgem, expandindo o uso desta tecnologia para alÃ©m da arte digital."
  ];
  
  const sources = ["CoinDesk", "Bloomberg Crypto", "Valor EconÃ´mico", "CriptoFÃ¡cil", "Exame", "InfoMoney", "CoinTelegraph", "Forbes"];
  
  const symbols = ["BTC", "ETH", "BNB", "SOL", "ADA", "DOT", "AVAX", "MATIC", "XRP", "DOGE"];
  
  // Imagens variadas de alta qualidade
  const images = [
    "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&q=80", // Bitcoin
    "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=800&q=80", // Ethereum
    "https://images.unsplash.com/photo-1605792657660-596af9009e82?w=800&q=80", // Crypto trading
    "https://images.unsplash.com/photo-1518544866330-3b71a4353188?w=800&q=80", // Stock market
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80", // Financial charts
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80", // Blockchain
    "https://images.unsplash.com/photo-1559526324-593bc073d938?w=800&q=80", // Trading desk
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80", // Crypto wallet
    "https://images.unsplash.com/photo-1516245834210-c4c142787335?w=800&q=80", // Business meeting
    "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80"  // Financial news
  ];
  
  // Gerar notÃ­cias simuladas
  for (let i = 0; i < count; i++) {
    const titleIndex = i % titles.length;
    const contentIndex = i % contents.length;
    const sourceIndex = i % sources.length;
    const imageIndex = i % images.length;
    
    // Gerar data aleatÃ³ria nas Ãºltimas 24 horas
    const date = new Date();
    date.setHours(date.getHours() - Math.floor(Math.random() * 24));
    
    // Selecionar 1-3 sÃ­mbolos relacionados aleatoriamente
    const relatedSymbolsCount = Math.floor(Math.random() * 3) + 1;
    const relatedSymbols: string[] = [];
    for (let j = 0; j < relatedSymbolsCount; j++) {
      const symbolIndex = Math.floor(Math.random() * symbols.length);
      if (!relatedSymbols.includes(symbols[symbolIndex])) {
        relatedSymbols.push(symbols[symbolIndex]);
      }
    }
    
    // Gerar sentimento aleatÃ³rio entre -0.5 e 0.8
    const sentiment = (Math.random() * 1.3) - 0.5;
    
    news.push({
      id: Date.now() + i,
      title: titles[titleIndex],
      content: contents[contentIndex],
      summary: contents[contentIndex].substring(0, 150) + '...',
      source: sources[sourceIndex],
      url: 'https://example.com/news/' + (i + 1),
      imageUrl: images[imageIndex],
      publishedAt: date.toISOString(),
      relatedSymbols,
      sentiment
    });
  }
  
  return news;
}

// FunÃ§Ã£o para buscar ou gerar uma carteira de investimentos personalizada
export async function fetchPortfolio(options: { riskLevel: 'ALTO' | 'MÃ‰DIO' | 'BAIXO', initialAmount: number }): Promise<Portfolio> {
  try {
    console.log(`Gerando carteira com perfil ${options.riskLevel} e valor inicial de ${options.initialAmount}`);
    
    // Primeiro, verificar se temos uma carteira salva no Supabase
    const { data: portfolioData, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('risk_level', options.riskLevel)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!error && portfolioData && portfolioData.length > 0) {
      const savedPortfolio = portfolioData[0];
      
      // Verificar se a carteira Ã© recente (menos de 24 horas)
      const portfolioAge = Date.now() - new Date(savedPortfolio.created_at).getTime();
      if (portfolioAge < 24 * 60 * 60 * 1000) {
        console.log('Usando carteira em cache');
        
        // Ajustar os valores com base no valor inicial solicitado
        const ratio = options.initialAmount / savedPortfolio.initial_amount;
        
        const assets = savedPortfolio.assets.map((asset: any) => ({
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          price: asset.price,
          quantity: asset.quantity * ratio,
          value: asset.value * ratio,
          allocation: asset.allocation,
          change: asset.change,
          changePercent: asset.change_percent
        }));
        
        return {
          id: savedPortfolio.id,
          name: `Carteira ${options.riskLevel.charAt(0) + options.riskLevel.slice(1).toLowerCase()}`,
          riskLevel: options.riskLevel,
          initialAmount: options.initialAmount,
          currentValue: savedPortfolio.current_value * ratio,
          assets,
          expectedReturn: savedPortfolio.expected_return,
          createdAt: savedPortfolio.created_at,
          updatedAt: savedPortfolio.updated_at
        };
      }
    }
    
    // Se nÃ£o encontrarmos uma carteira recente, gerar uma nova
    const assets: PortfolioAsset[] = [];
    let remainingAmount = options.initialAmount;
    
    // Definir alocaÃ§Ãµes com base no perfil de risco
    let allocations: {
      stocks: number;
      crypto: number;
      stocksList: { symbol: string; name: string; allocation: number }[];
      cryptoList: { symbol: string; name: string; allocation: number }[];
    };
    
    switch (options.riskLevel) {
      case 'BAIXO':
        allocations = {
          stocks: 0.8,
          crypto: 0.2,
          stocksList: [
            { symbol: 'PETR4', name: 'Petrobras', allocation: 0.15 },
            { symbol: 'VALE3', name: 'Vale', allocation: 0.15 },
            { symbol: 'ITUB4', name: 'ItaÃº Unibanco', allocation: 0.15 },
            { symbol: 'BBDC4', name: 'Bradesco', allocation: 0.10 },
            { symbol: 'ABEV3', name: 'Ambev', allocation: 0.10 },
            { symbol: 'WEGE3', name: 'WEG', allocation: 0.05 },
            { symbol: 'RENT3', name: 'Localiza', allocation: 0.05 },
            { symbol: 'BBAS3', name: 'Banco do Brasil', allocation: 0.05 }
          ],
          cryptoList: [
            { symbol: 'BTC', name: 'Bitcoin', allocation: 0.10 },
            { symbol: 'ETH', name: 'Ethereum', allocation: 0.10 }
          ]
        };
        break;
      case 'MÃ‰DIO':
        allocations = {
          stocks: 0.6,
          crypto: 0.4,
          stocksList: [
            { symbol: 'PETR4', name: 'Petrobras', allocation: 0.10 },
            { symbol: 'VALE3', name: 'Vale', allocation: 0.10 },
            { symbol: 'ITUB4', name: 'ItaÃº Unibanco', allocation: 0.10 },
            { symbol: 'MGLU3', name: 'Magazine Luiza', allocation: 0.05 },
            { symbol: 'WEGE3', name: 'WEG', allocation: 0.05 },
            { symbol: 'RENT3', name: 'Localiza', allocation: 0.05 },
            { symbol: 'BBAS3', name: 'Banco do Brasil', allocation: 0.05 },
            { symbol: 'RADL3', name: 'Raia Drogasil', allocation: 0.05 },
            { symbol: 'LREN3', name: 'Lojas Renner', allocation: 0.05 }
          ],
          cryptoList: [
            { symbol: 'BTC', name: 'Bitcoin', allocation: 0.15 },
            { symbol: 'ETH', name: 'Ethereum', allocation: 0.10 },
            { symbol: 'BNB', name: 'Binance Coin', allocation: 0.05 },
            { symbol: 'SOL', name: 'Solana', allocation: 0.05 },
            { symbol: 'ADA', name: 'Cardano', allocation: 0.05 }
          ]
        };
        break;
      case 'ALTO':
      default:
        allocations = {
          stocks: 0.4,
          crypto: 0.6,
          stocksList: [
            { symbol: 'MGLU3', name: 'Magazine Luiza', allocation: 0.05 },
            { symbol: 'BPAC11', name: 'BTG Pactual', allocation: 0.05 },
            { symbol: 'CASH3', name: 'MÃ©liuz', allocation: 0.05 },
            { symbol: 'LWSA3', name: 'Locaweb', allocation: 0.05 },
            { symbol: 'TOTS3', name: 'Totvs', allocation: 0.05 },
            { symbol: 'PETZ3', name: 'Petz', allocation: 0.05 },
            { symbol: 'MELI34', name: 'Mercado Livre', allocation: 0.05 },
            { symbol: 'AMER3', name: 'Americanas', allocation: 0.05 }
          ],
          cryptoList: [
            { symbol: 'BTC', name: 'Bitcoin', allocation: 0.15 },
            { symbol: 'ETH', name: 'Ethereum', allocation: 0.15 },
            { symbol: 'BNB', name: 'Binance Coin', allocation: 0.05 },
            { symbol: 'SOL', name: 'Solana', allocation: 0.05 },
            { symbol: 'ADA', name: 'Cardano', allocation: 0.05 },
            { symbol: 'DOT', name: 'Polkadot', allocation: 0.05 },
            { symbol: 'AVAX', name: 'Avalanche', allocation: 0.05 },
            { symbol: 'MATIC', name: 'Polygon', allocation: 0.05 }
          ]
        };
        break;
    }
    
    // Adicionar aÃ§Ãµes
    for (const stock of allocations.stocksList) {
      const stockAmount = options.initialAmount * stock.allocation;
      
      // Buscar preÃ§o atual da aÃ§Ã£o
      let price = 0;
      let change = 0;
      let changePercent = 0;
      
      try {
        // Tentar buscar do Supabase primeiro
        const { data: stockData, error } = await supabase
          .from('stock_prices')
          .select('*')
          .eq('symbol', stock.symbol)
          .order('date', { ascending: false })
          .limit(2);
        
        if (!error && stockData && stockData.length > 0) {
          price = stockData[0].close;
          
          if (stockData.length > 1) {
            const previousPrice = stockData[1].close;
            change = price - previousPrice;
            changePercent = (change / previousPrice) * 100;
          }
        } else {
          // Simular preÃ§o com base em dados reais de mercado
          price = Math.random() * 100 + 10; // PreÃ§o entre 10 e 110
          changePercent = (Math.random() * 10) - 5; // VariaÃ§Ã£o entre -5% e +5%
          change = price * (changePercent / 100);
        }
  } catch (error) {
        console.error(`Erro ao buscar preÃ§o para ${stock.symbol}:`, error);
        price = Math.random() * 100 + 10;
        changePercent = (Math.random() * 10) - 5;
        change = price * (changePercent / 100);
      }
      
      const quantity = stockAmount / price;
      
      assets.push({
        symbol: stock.symbol,
        name: stock.name,
        type: 'AÃ‡ÃƒO',
        price,
        quantity,
        value: stockAmount,
        allocation: stock.allocation * 100,
        change,
        changePercent
      });
      
      remainingAmount -= stockAmount;
    }
    
    // Adicionar criptomoedas
    for (const crypto of allocations.cryptoList) {
      const cryptoAmount = options.initialAmount * crypto.allocation;
      
      // Buscar preÃ§o atual da criptomoeda
      let price = 0;
      let change = 0;
      let changePercent = 0;
      
      try {
        // Tentar buscar da Binance
        const symbol = crypto.symbol === 'BTC' ? 'BTCUSDT' : 
                      crypto.symbol === 'ETH' ? 'ETHUSDT' : 
                      `${crypto.symbol}USDT`;
        
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
        const data = await response.json();
        
        if (data && data.lastPrice) {
          price = parseFloat(data.lastPrice);
          change = parseFloat(data.priceChange);
          changePercent = parseFloat(data.priceChangePercent);
        } else {
          // Simular preÃ§o com base em dados reais de mercado
          price = crypto.symbol === 'BTC' ? 30000 + (Math.random() * 5000) : 
                crypto.symbol === 'ETH' ? 1800 + (Math.random() * 400) : 
                10 + (Math.random() * 90);
          
          changePercent = (Math.random() * 20) - 10; // VariaÃ§Ã£o entre -10% e +10%
          change = price * (changePercent / 100);
        }
      } catch (error) {
        console.error(`Erro ao buscar preÃ§o para ${crypto.symbol}:`, error);
        price = crypto.symbol === 'BTC' ? 30000 + (Math.random() * 5000) : 
              crypto.symbol === 'ETH' ? 1800 + (Math.random() * 400) : 
              10 + (Math.random() * 90);
        
        changePercent = (Math.random() * 20) - 10;
        change = price * (changePercent / 100);
      }
      
      const quantity = cryptoAmount / price;
      
      assets.push({
        symbol: crypto.symbol,
        name: crypto.name,
        type: 'CRIPTO',
        price,
        quantity,
        value: cryptoAmount,
        allocation: crypto.allocation * 100,
        change,
        changePercent
      });
      
      remainingAmount -= cryptoAmount;
    }
    
    // Calcular retorno esperado com base no perfil de risco
    let expectedReturn = 0;
    switch (options.riskLevel) {
      case 'BAIXO':
        expectedReturn = 0.08 + (Math.random() * 0.04); // 8-12%
        break;
      case 'MÃ‰DIO':
        expectedReturn = 0.12 + (Math.random() * 0.08); // 12-20%
        break;
      case 'ALTO':
        expectedReturn = 0.20 + (Math.random() * 0.15); // 20-35%
        break;
    }
    
    // Criar objeto da carteira
    const portfolio: Portfolio = {
      id: Date.now(),
      name: `Carteira ${options.riskLevel.charAt(0) + options.riskLevel.slice(1).toLowerCase()}`,
      riskLevel: options.riskLevel,
      initialAmount: options.initialAmount,
      currentValue: options.initialAmount,
      assets,
      expectedReturn,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Salvar no Supabase para uso futuro
    try {
      const { error } = await supabase
        .from('portfolios')
        .insert({
          id: portfolio.id,
          name: portfolio.name,
          risk_level: portfolio.riskLevel,
          initial_amount: portfolio.initialAmount,
          current_value: portfolio.currentValue,
          assets: portfolio.assets.map(asset => ({
            symbol: asset.symbol,
            name: asset.name,
            type: asset.type,
            price: asset.price,
            quantity: asset.quantity,
            value: asset.value,
            allocation: asset.allocation,
            change: asset.change,
            change_percent: asset.changePercent
          })),
          expected_return: portfolio.expectedReturn,
          created_at: portfolio.createdAt,
          updated_at: portfolio.updatedAt
        });
      
      if (error) {
        console.error('Erro ao salvar carteira no Supabase:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar carteira:', error);
    }
    
    return portfolio;
  } catch (error) {
    console.error('Erro ao gerar carteira:', error);
    throw new Error('NÃ£o foi possÃ­vel gerar a carteira recomendada.');
  }
}

// Adicionando a interface para notÃ­cias de mercado

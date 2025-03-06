import { supabase } from "@/integrations/supabase/client";
import { 
  TradingSignal,
  MarketData, 
  SignalType, 
  SignalStrength, 
  MarketNews, 
  TimeFrame,
  SignalStatus 
} from './types';
import { 
  fetchAllMarketNews, 
  fetchCompanyNews, 
  analyzeSentiment 
} from './newsApi';
import { 
  getLatestPrices, 
  getHistoricalKlines, 
  getMarketDepth,
  getBinancePrice,
  getBinanceHistoricalData 
} from './binanceApi';
import { determineDayTradeTrend } from './utils/tradingUtils';

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

// Cache para sinais (evita recálculos frequentes)
const signalsCache: { 
  data: TradingSignal[], 
  timestamp: number 
} = { data: [], timestamp: 0 };

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Função principal para buscar sinais de trading
export async function fetchTradingSignals(): Promise<TradingSignal[]> {
  try {
    const now = Date.now();
    
    // Verificar cache
    if (signalsCache.data.length > 0 && (now - signalsCache.timestamp) < CACHE_DURATION) {
      console.log('Usando sinais em cache');
      return signalsCache.data;
    }
    
    console.log('Gerando novos sinais de trading...');
    
    // Buscando dados de mercado para cada símbolo monitorado
    const marketDataPromises = MONITORED_SYMBOLS.map(async (symbol) => {
      try {
        // Dados de cripto via Binance
        const latestPrices = await getLatestPrices([symbol]);
        const priceData = latestPrices.find(p => p.symbol === symbol);
        
        if (priceData) {
          const price = parseFloat(priceData.price);
          
          // Obter histórico para calcular variação
          const klines = await getHistoricalKlines(symbol, '1d', 2);
          
          if (klines.length >= 2) {
            const todayClose = parseFloat(klines[1][4]); // Último fechamento
            const yesterdayClose = parseFloat(klines[0][4]); // Fechamento anterior
            
            const change = todayClose - yesterdayClose;
            const changePercent = (change / yesterdayClose) * 100;
            
            const high = parseFloat(klines[1][2]); // High do dia
            const low = parseFloat(klines[1][3]); // Low do dia
            const volume = parseFloat(klines[1][5]); // Volume do dia
            
            // Dados de mercado para processamento dos sinais
            return {
              symbol,
              price,
              change,
              changePercent,
              volume,
              high,
              low,
              isCrypto: true
            } as MarketData;
          }
        }
        
        // Se não conseguimos obter todos os dados necessários
        console.warn(`Dados insuficientes para ${symbol}`);
        return null;
        
      } catch (error) {
        console.error(`Erro ao buscar dados para ${symbol}:`, error);
        return null;
      }
    });
    
    // Aguardar todas as promessas e filtrar nulos
    const marketDataList = (await Promise.all(marketDataPromises)).filter(data => data !== null) as MarketData[];
    
    // Buscar notícias de mercado para análise de sentimento
    const marketNews = await fetchAllMarketNews();
    
    // Gerar sinais técnicos e de notícias para cada ativo
    const technicalSignalsPromises = marketDataList.map(marketData => 
      generateTechnicalSignals(marketData)
    );
    
    const newsSignalsPromises = marketDataList.map(marketData => 
      generateNewsSignals(marketData, marketNews)
    );
    
    // Aguardar todas as promessas
    const technicalSignals = (await Promise.all(technicalSignalsPromises)).flat();
    const newsSignals = (await Promise.all(newsSignalsPromises)).flat();
    
    // Combinar todos os sinais
    const allSignals = [...technicalSignals, ...newsSignals];
    
    // Atualizar cache
    signalsCache.data = allSignals;
    signalsCache.timestamp = now;
    
    return allSignals;
  } catch (error) {
    console.error('Erro ao gerar sinais de trading:', error);
    // Retornar cache antigo se houver erro
    if (signalsCache.data.length > 0) {
      console.log('Usando sinais em cache devido ao erro');
      return signalsCache.data;
    }
    throw error;
  }
}

function calculaATR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period || lows.length < period || closes.length < period) {
    return 0;
  }

  // Calcula True Range para cada período
  const trueRanges: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const previousClose = closes[i - 1];
    const high = highs[i];
    const low = lows[i];
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - previousClose);
    const tr3 = Math.abs(low - previousClose);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }

  // Calcula média móvel dos True Ranges
  const atr = trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
  return atr;
}

async function generateTechnicalSignals(marketData: MarketData): Promise<TradingSignal[]> {
  const signals: TradingSignal[] = [];
  const { symbol, price: currentPrice } = marketData;
  
  try {
    const klines = await getHistoricalKlines(symbol, '1d', 100);
    
    if (klines.length >= 100) {
      // Calcular indicadores técnicos
      const closes = klines.map(k => parseFloat(k[4]));
      const volumes = klines.map(k => parseFloat(k[5]));
      const highs = klines.map(k => parseFloat(k[2]));
      const lows = klines.map(k => parseFloat(k[3]));
      
      // Médias móveis
      const sma20 = calculateSMA(closes, 20);
      const sma50 = calculateSMA(closes, 50);
      const sma200 = calculateSMA(closes, 200);
      
      // RSI
      const rsi = calculateRSI(closes, 14);
      
      // Volume médio
      const avgVolume = calculateSMA(volumes, 20);
      const lastVolume = volumes[volumes.length - 1];
      
      // ATR para stop loss e target
      const atr = calculaATR(highs, lows, closes, 14);
      
      // Condições para sinal forte de compra
      if (
        sma20 > sma50 && // Tendência de curto prazo positiva
        sma50 > sma200 && // Tendência de longo prazo positiva
        rsi > 40 && rsi < 70 && // RSI recuperando de sobrevenda
        lastVolume > avgVolume * 1.2 // Volume acima da média
      ) {
        const entryPrice = currentPrice;
        const stopLoss = entryPrice - (atr * 2);
        const targetPrice = entryPrice + (atr * 4);
        const successRate = 0.65; // Taxa base de sucesso para sinais técnicos fortes
        
        signals.push({
          id: `tech-${symbol}-${Date.now()}`,
          symbol,
          type: SignalType.TECHNICAL,
          signal: 'BUY',
          reason: 'Tendência de alta confirmada em múltiplos prazos com volume crescente e RSI recuperando de região sobrevendida',
          strength: SignalStrength.STRONG,
          timestamp: Date.now(),
          price: currentPrice,
          entry_price: entryPrice,
          stop_loss: stopLoss,
          target_price: targetPrice,
          success_rate: successRate,
          timeframe: '1d',
          expiry: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          risk_reward: ((targetPrice - entryPrice) / (entryPrice - stopLoss)).toFixed(2),
          status: 'active'
        });
      }
      
      // Condições para sinal forte de venda
      if (
        sma20 < sma50 && // Tendência de curto prazo negativa
        sma50 < sma200 && // Tendência de longo prazo negativa
        rsi > 70 && // RSI em sobrecompra
        lastVolume > avgVolume * 1.2 // Volume acima da média
      ) {
        const entryPrice = currentPrice;
        const stopLoss = entryPrice + (atr * 2);
        const targetPrice = entryPrice - (atr * 4);
        const successRate = 0.65;
        
        signals.push({
          id: `tech-${symbol}-${Date.now()}`,
          symbol,
          type: SignalType.TECHNICAL,
          signal: 'SELL',
          reason: 'Tendência de baixa confirmada em múltiplos prazos com volume crescente e RSI em região de sobrecompra',
          strength: SignalStrength.STRONG,
          timestamp: Date.now(),
          price: currentPrice,
          entry_price: entryPrice,
          stop_loss: stopLoss,
          target_price: targetPrice,
          success_rate: successRate,
          timeframe: '1d',
          expiry: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          risk_reward: ((entryPrice - targetPrice) / (stopLoss - entryPrice)).toFixed(2),
          status: 'active'
        });
      }
      
      // Sinais moderados baseados em RSI
      if (rsi < 30) {
        const entryPrice = currentPrice;
        const stopLoss = entryPrice - (atr * 1.5);
        const targetPrice = entryPrice + (atr * 3);
        const successRate = 0.55;
        
        signals.push({
          id: `tech-${symbol}-${Date.now()}`,
          symbol,
          type: SignalType.TECHNICAL,
          signal: 'BUY',
          reason: 'RSI em região de sobrevenda extrema',
          strength: SignalStrength.MODERATE,
          timestamp: Date.now(),
          price: currentPrice,
          entry_price: entryPrice,
          stop_loss: stopLoss,
          target_price: targetPrice,
          success_rate: successRate,
          timeframe: '1d',
          expiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          risk_reward: ((targetPrice - entryPrice) / (entryPrice - stopLoss)).toFixed(2),
          status: 'active'
        });
      } else if (rsi > 70) {
        const entryPrice = currentPrice;
        const stopLoss = entryPrice + (atr * 1.5);
        const targetPrice = entryPrice - (atr * 3);
        const successRate = 0.55;
        
        signals.push({
          id: `tech-${symbol}-${Date.now()}`,
          symbol,
          type: SignalType.TECHNICAL,
          signal: 'SELL',
          reason: 'RSI em região de sobrecompra extrema',
          strength: SignalStrength.MODERATE,
          timestamp: Date.now(),
          price: currentPrice,
          entry_price: entryPrice,
          stop_loss: stopLoss,
          target_price: targetPrice,
          success_rate: successRate,
          timeframe: '1d',
          expiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          risk_reward: ((entryPrice - targetPrice) / (stopLoss - entryPrice)).toFixed(2),
          status: 'active'
        });
      }
    }
  } catch (error) {
    console.error(`Erro ao gerar sinais técnicos para ${symbol}:`, error);
  }
  
  return signals;
}

// Funções auxiliares para cálculo de indicadores
function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return 0;
  return data.slice(-period).reduce((sum, value) => sum + value, 0) / period;
}

function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  // Calcular ganhos e perdas iniciais
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }
  
  // Calcular médias
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

async function generateNewsSignals(marketData: MarketData, marketNews: MarketNews[]): Promise<TradingSignal[]> {
  const signals: TradingSignal[] = [];
  const { symbol } = marketData;
  
  try {
    // Buscar notícias específicas do ativo
    const assetNews = await fetchCompanyNews(symbol);
    
    if (assetNews && assetNews.length > 0) {
      // Analisar sentimento das notícias
      const sentimentScore = await analyzeSentiment(assetNews);
      
      // Gerar sinal baseado no sentimento
      if (Math.abs(sentimentScore) >= 0.5) {
        const signal: TradingSignal = {
          id: `news-${symbol}-${Date.now()}`,
          symbol,
          type: SignalType.NEWS,
          signal: sentimentScore > 0 ? 'BUY' : 'SELL',
          reason: `Forte sentimento ${sentimentScore > 0 ? 'positivo' : 'negativo'} nas notícias recentes`,
          strength: Math.abs(sentimentScore) >= 0.7 ? SignalStrength.STRONG : SignalStrength.MODERATE,
          timestamp: Date.now(),
          price: marketData.price,
          entry_price: marketData.price,
          stop_loss: marketData.price * (sentimentScore > 0 ? 0.95 : 1.05),
          target_price: marketData.price * (sentimentScore > 0 ? 1.1 : 0.9),
          success_rate: 0.6,
          timeframe: '1d',
          expiry: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          risk_reward: '2.0',
          status: 'active',
          metadata: {
            sentiment_score: sentimentScore,
            news_count: assetNews.length
          }
        };
        
        signals.push(signal);
      }
    }
  } catch (error) {
    console.error(`Erro ao gerar sinais de notícias para ${symbol}:`, error);
  }
  
  return signals;
}

async function generateFundamentalSignals(marketData: MarketData): Promise<TradingSignal[]> {
  const signals: TradingSignal[] = [];
  const { symbol, price } = marketData;
  
  try {
    // Para criptomoedas, vamos usar métricas alternativas como volume e volatilidade
    const historicalData = await getHistoricalKlines(symbol, '1d', 30);
    
    if (!historicalData || historicalData.length < 30) {
      console.warn(`Dados históricos insuficientes para ${symbol}`);
      return signals;
    }
    
    // Calcular métricas fundamentais para cripto
    const volumes = historicalData.map(k => parseFloat(k[5]));
    const closes = historicalData.map(k => parseFloat(k[4]));
    
    // Calcular volume médio dos últimos 30 dias
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const lastVolume = volumes[volumes.length - 1];
    
    // Calcular volatilidade (desvio padrão dos retornos)
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i-1]) / closes[i-1]);
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length);
    
    // Gerar sinais baseados em volume e volatilidade
    if (lastVolume > avgVolume * 2) {
      // Volume muito acima da média pode indicar movimento significativo
      signals.push({
        id: `fund-${symbol}-${Date.now()}`,
        symbol,
        type: SignalType.FUNDAMENTAL,
        signal: closes[closes.length - 1] > closes[closes.length - 2] ? 'BUY' : 'SELL',
        reason: `Volume excepcionalmente alto (${(lastVolume/avgVolume).toFixed(1)}x acima da média)`,
        strength: SignalStrength.STRONG,
        timestamp: Date.now(),
        price,
        entry_price: price,
        stop_loss: price * (closes[closes.length - 1] > closes[closes.length - 2] ? 0.95 : 1.05),
        target_price: price * (closes[closes.length - 1] > closes[closes.length - 2] ? 1.1 : 0.9),
        success_rate: 0.65,
        timeframe: '1d',
        expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        risk_reward: '2.0',
        status: 'active',
        metadata: {
          volume_ratio: lastVolume/avgVolume,
          volatility
        }
      });
    }
    
    // Sinal baseado em volatilidade
    const normalVolatility = 0.02; // 2% é considerado normal para cripto
    if (volatility > normalVolatility * 2) {
      signals.push({
        id: `fund-vol-${symbol}-${Date.now()}`,
        symbol,
        type: SignalType.FUNDAMENTAL,
        signal: 'SELL', // Alta volatilidade geralmente sugere cautela
        reason: `Volatilidade excepcionalmente alta (${(volatility * 100).toFixed(1)}%)`,
        strength: SignalStrength.MODERATE,
        timestamp: Date.now(),
        price,
        entry_price: price,
        stop_loss: price * 1.05,
        target_price: price * 0.9,
        success_rate: 0.6,
        timeframe: '1d',
        expiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        risk_reward: '2.0',
        status: 'active',
        metadata: {
          volatility,
          normal_volatility: normalVolatility
        }
      });
    }
  } catch (error) {
    console.error(`Erro ao gerar sinais fundamentais para ${symbol}:`, error);
  }
  
  return signals;
}

// Função para substituir um sinal completado por um novo
export async function replaceCompletedSignal(completedSignal: TradingSignal): Promise<TradingSignal | null> {
  try {
    const { symbol, type } = completedSignal;
    
    // Buscar dados de mercado atualizados
    let currentPrice = 0;
    
    // Usar apenas Binance para preços
    const priceData = await getLatestPrices([symbol]);
    if (priceData && priceData[0]) {
      currentPrice = parseFloat(priceData[0].price);
    }
    
    if (!currentPrice) {
      console.error(`Não foi possível obter preço atual para ${symbol}`);
      return null;
    }
    
    // Criar dados de mercado para geração de novo sinal
    const marketData: MarketData = {
      symbol,
      price: currentPrice,
      change: 0, // Não necessário para geração de sinal
      changePercent: 0, // Não necessário para geração de sinal
      isCrypto: true // Agora todos os ativos são cripto
    };
    
    // Gerar novo sinal do mesmo tipo
    let newSignal: TradingSignal | null = null;
    
    switch (type) {
      case SignalType.TECHNICAL:
        const technicalSignals = await generateTechnicalSignals(marketData);
        newSignal = technicalSignals[0] || null;
        break;
        
      case SignalType.NEWS:
        const marketNews = await fetchAllMarketNews();
        const newsSignals = await generateNewsSignals(marketData, marketNews);
        newSignal = newsSignals[0] || null;
        break;
        
      case SignalType.FUNDAMENTAL:
        const fundamentalSignals = await generateFundamentalSignals(marketData);
        newSignal = fundamentalSignals[0] || null;
        break;
    }
    
    if (newSignal) {
      // Garantir que o risk_reward seja uma string
      if (typeof newSignal.risk_reward === 'number') {
        newSignal.risk_reward = String(newSignal.risk_reward) || '0';
      }
      console.log(`Novo sinal gerado para substituir ${symbol} (${type})`);
    } else {
      console.log(`Não foi possível gerar novo sinal para ${symbol} (${type})`);
    }
    
    return newSignal;
  } catch (error) {
    console.error(`Erro ao tentar substituir sinal completado para ${completedSignal.symbol}:`, error);
    return null;
  }
}

// Função para substituir múltiplos sinais completados
export async function replaceMultipleCompletedSignals(signals: TradingSignal[]): Promise<TradingSignal[]> {
  try {
    const newSignals: TradingSignal[] = [];
    
    for (const signal of signals) {
      try {
        const newSignal = await replaceCompletedSignal(signal);
        if (newSignal) {
          newSignals.push(newSignal);
        }
      } catch (error) {
        console.error(`Erro ao substituir sinal para ${signal.symbol}:`, error);
      }
    }
    
    return newSignals;
  } catch (error) {
    console.error('Erro ao substituir múltiplos sinais:', error);
    return [];
  }
}

// Função para análise compreensiva de ativos
export async function comprehensiveAnalyzeAsset(symbol: string): Promise<any> {
  try {
    console.log(`Iniciando análise compreensiva para ${symbol}`);
    
    let currentPrice = 0;
    let historicalData: any = null;
    
    // Buscar dados de preço e histórico da Binance
    const priceData = await getLatestPrices([symbol]);
    if (priceData && priceData[0]) {
      currentPrice = parseFloat(priceData[0].price);
    }
    
    // Buscar dados históricos
    const klines = await getHistoricalKlines(symbol, '1d', 100);
    if (klines.length >= 100) {
      historicalData = {
        prices: klines.map(k => parseFloat(k[4])),
        highs: klines.map(k => parseFloat(k[2])),
        lows: klines.map(k => parseFloat(k[3])),
        volumes: klines.map(k => parseFloat(k[5])),
        timestamps: klines.map(k => k[0])
      };
    }
    
    if (!currentPrice || !historicalData) {
      throw new Error(`Dados insuficientes para análise de ${symbol}`);
    }
    
    // Criar objeto de dados de mercado
    const marketData: MarketData = {
      symbol,
      price: currentPrice,
      change: 0,
      changePercent: 0,
      isCrypto: true
    };
    
    // Gerar sinais técnicos
    const technicalSignals = await generateTechnicalSignals(marketData);
    
    // Buscar e analisar notícias
    const marketNews = await fetchAllMarketNews();
    const newsSignals = await generateNewsSignals(marketData, marketNews);
    
    // Análise fundamental para criptomoedas
    const fundamentalSignals = await generateFundamentalSignals(marketData);
    
    // Calcular tendência para day trade
    const trendAnalysis = determineDayTradeTrend(symbol, currentPrice);
    
    // Compilar resultado final
    return {
      symbol,
      currentPrice,
      lastUpdate: new Date().toISOString(),
      technicalAnalysis: {
        signals: technicalSignals,
        trend: trendAnalysis
      },
      newsAnalysis: {
        signals: newsSignals,
        recentNews: marketNews.filter(n => 
          n.relatedSymbols.includes(symbol) || 
          n.title.toUpperCase().includes(symbol)
        ).slice(0, 5)
      },
      fundamentalAnalysis: {
        signals: fundamentalSignals,
        metrics: {
          volume24h: historicalData.volumes[historicalData.volumes.length - 1],
          priceChange24h: ((currentPrice - historicalData.prices[historicalData.prices.length - 2]) / historicalData.prices[historicalData.prices.length - 2]) * 100,
          high24h: historicalData.highs[historicalData.highs.length - 1],
          low24h: historicalData.lows[historicalData.lows.length - 1]
        }
      },
      recommendations: {
        shortTerm: determineRecommendation(technicalSignals, 'short'),
        mediumTerm: determineRecommendation([...technicalSignals, ...newsSignals], 'medium'),
        longTerm: determineRecommendation([...technicalSignals, ...newsSignals, ...fundamentalSignals], 'long')
      }
    };
  } catch (error) {
    console.error(`Erro na análise compreensiva de ${symbol}:`, error);
    throw error;
  }
}

// Função auxiliar para determinar recomendação
function determineRecommendation(
  signals: TradingSignal[], 
  timeframe: 'short' | 'medium' | 'long'
): string {
  if (!signals.length) return 'NEUTRAL';
  
  const buySignals = signals.filter(s => s.signal === 'BUY').length;
  const sellSignals = signals.filter(s => s.signal === 'SELL').length;
  const total = signals.length;
  
  // Calcular score ponderado
  let score = 0;
  signals.forEach(signal => {
    const weight = signal.strength === 'STRONG' ? 2 : 
                  signal.strength === 'MODERATE' ? 1 : 0.5;
    
    score += signal.signal === 'BUY' ? weight : -weight;
  });
  
  // Normalizar score
  const normalizedScore = score / (total * 2); // 2 é o peso máximo
  
  // Determinar thresholds baseado no timeframe
  let strongThreshold, moderateThreshold;
  
  switch (timeframe) {
    case 'short':
      strongThreshold = 0.6;
      moderateThreshold = 0.3;
      break;
    case 'medium':
      strongThreshold = 0.5;
      moderateThreshold = 0.25;
      break;
    case 'long':
      strongThreshold = 0.4;
      moderateThreshold = 0.2;
      break;
  }
  
  // Retornar recomendação
  if (normalizedScore >= strongThreshold) return 'STRONG_BUY';
  if (normalizedScore >= moderateThreshold) return 'BUY';
  if (normalizedScore <= -strongThreshold) return 'STRONG_SELL';
  if (normalizedScore <= -moderateThreshold) return 'SELL';
  return 'NEUTRAL';
}

// ... rest of the file ...

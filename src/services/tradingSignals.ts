import { supabase } from "@/integrations/supabase/client";
import { TradingSignal, MarketData, SignalType, SignalStrength, MarketNews } from './types';
import { getBinancePrice, getBinanceHistoricalData } from "./binanceApi";
import { fetchStockQuote, fetchHistoricalData, fetchTechnicalIndicator, fetchCompanyOverview } from "./alphaVantageApi";
import { fetchPriceTarget, fetchAnalystRecommendations } from "./finnhubApi";
import { 
  fetchAllMarketNews, 
  fetchCompanyNews, 
  analyzeSentiment 
} from './newsApi';
import { 
  getLatestPrices, 
  getHistoricalKlines, 
  getMarketDepth 
} from './binanceApi';

// Array de símbolos para monitorar
const MONITORED_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', // Crypto
  'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', // Tech stocks
  'JPM', 'BAC', 'GS', // Banking
  'XOM', 'CVX', // Energy
  'PFE', 'JNJ', // Healthcare
];

// Cache para sinais (evita recálculos frequentes)
const signalsCache: { 
  data: TradingSignal[], 
  timestamp: number 
} = { data: [], timestamp: 0 };

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Atualizar o enum SignalType para incluir o tipo de correlação
enum SignalType {
  TECHNICAL = 'TECHNICAL',
  FUNDAMENTAL = 'FUNDAMENTAL',
  NEWS = 'NEWS',
  CORRELATION = 'CORRELATION'
}

// Atualizar a interface TradingSignal
interface TradingSignal {
  symbol: string;
  type: SignalType;
  signal: 'BUY' | 'SELL';
  reason: string;
  strength: SignalStrength;
  timestamp: number;
  price: number;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  success_rate: number;
  timeframe: string;
  expiry: string;
  risk_reward: string;
  status: string;
  related_asset?: string; // Ativo relacionado (para sinais de correlação)
}

// Definir a interface MarketData se ainda não estiver definida
interface MarketData {
  symbol: string;
  price: number;
  isCrypto: boolean;
}

// Função principal para buscar sinais de trading
export async function fetchTradingSignals(symbols: string[]): Promise<TradingSignal[]> {
  try {
    const allSignals: TradingSignal[] = [];
    const marketDataList: MarketData[] = [];

    // Obter dados de mercado para todos os símbolos
    for (const symbol of symbols) {
      try {
        const isCrypto = symbol.includes('USDT') || symbol.includes('BTC');
        let price: number;

        if (isCrypto) {
          const ticker = await getBinancePrice(symbol);
          price = parseFloat(ticker.price);
        } else {
          const quote = await fetchQuote(symbol);
          price = parseFloat(quote.price);
        }

        marketDataList.push({
          symbol,
          price,
          isCrypto
        });
      } catch (error) {
        console.error(`Erro ao obter dados de mercado para ${symbol}:`, error);
      }
    }

    // Gerar sinais para cada ativo
    for (const marketData of marketDataList) {
      try {
        // Gerar sinais técnicos
        const technicalSignals = await generateTechnicalSignals(marketData);
        
        // Gerar sinais de notícias
        const newsSignals = await generateNewsSignals(marketData);
        
        // Gerar sinais fundamentais (apenas para ações)
        let fundamentalSignals: TradingSignal[] = [];
        if (!marketData.isCrypto) {
          fundamentalSignals = await generateFundamentalSignals(marketData);
        }
        
        // Gerar sinais de correlação (usando outros ativos como referência)
        const correlatedAssets = marketDataList.filter(data => data.symbol !== marketData.symbol);
        const correlationSignals = await generateCorrelationSignals(marketData, correlatedAssets);
        
        // Combinar todos os sinais
        allSignals.push(...technicalSignals, ...newsSignals, ...fundamentalSignals, ...correlationSignals);
      } catch (error) {
        console.error(`Erro ao gerar sinais para ${marketData.symbol}:`, error);
      }
    }

    return allSignals;
  } catch (error) {
    console.error('Erro ao buscar sinais de trading:', error);
    return [];
  }
}

// Função para gerar sinais técnicos
async function generateTechnicalSignals(marketData: MarketData): Promise<TradingSignal[]> {
  const signals: TradingSignal[] = [];
  const { symbol, price, isCrypto } = marketData;
  
  try {
    // Buscar dados históricos
    let historicalData: any = null;
    let klines: any[] = [];
    
    if (isCrypto) {
      klines = await getHistoricalKlines(symbol, '1d', 50);
      if (klines.length < 20) {
        console.warn(`Dados históricos insuficientes para ${symbol}`);
        return [];
      }
      
      historicalData = {
        opens: klines.map(k => parseFloat(k[1])),
        highs: klines.map(k => parseFloat(k[2])),
        lows: klines.map(k => parseFloat(k[3])),
        prices: klines.map(k => parseFloat(k[4])),
        volumes: klines.map(k => parseFloat(k[5])),
        timestamps: klines.map(k => k[0])
      };
    } else {
      historicalData = await fetchHistoricalData(symbol, 'daily', 'full');
      if (!historicalData || historicalData.prices.length < 20) {
        console.warn(`Dados históricos insuficientes para ${symbol}`);
        return [];
      }
    }
    
    const { prices, highs, lows, opens, volumes } = historicalData;
    
    // Calcular indicadores técnicos
    const sma8 = calculateSMA(prices, 8);
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);
    
    const rsi = calculateRSI(prices, 14);
    const currentRSI = rsi[rsi.length - 1];
    
    // Calcular MACD
    const { macdLine, signalLine, histogram } = calculateMACD(prices);
    
    // Verificar cruzamentos de MACD
    const macdCrossover = histogram[histogram.length - 1] > 0 && histogram[histogram.length - 2] <= 0;
    const macdCrossunder = histogram[histogram.length - 1] < 0 && histogram[histogram.length - 2] >= 0;
    
    // Calcular ATR para stop loss e targets
    const atr = calculaATR(highs, lows, prices, 14);
    
    // Encontrar níveis de suporte e resistência
    const supports = findKeyLevels(prices, lows, 'support');
    const resistances = findKeyLevels(prices, highs, 'resistance');
    
    // Encontrar o suporte mais próximo abaixo do preço atual
    const closestSupport = supports.filter(s => s < price).sort((a, b) => b - a)[0] || price * 0.9;
    
    // Encontrar a resistência mais próxima acima do preço atual
    const closestResistance = resistances.filter(r => r > price).sort((a, b) => a - b)[0] || price * 1.1;
    
    // Verificar divergências de RSI
    const rsiDivergence = checkRSIDivergence(prices.slice(-10), rsi.slice(-10));
    
    // Detectar padrões de candlestick
    const candlestickPatterns = detectCandlestickPatterns(
      opens.slice(-20), 
      highs.slice(-20), 
      lows.slice(-20), 
      prices.slice(-20),
      volumes.slice(-20)
    );
    
    // Gerar sinais com base nos indicadores e padrões
    
    // === SINAIS DE COMPRA ===
    
    // Sinal forte de compra: Cruzamento de médias + RSI saindo de sobrevenda + MACD positivo
    if (
      sma8[sma8.length - 1] > sma20[sma20.length - 1] &&
      sma8[sma8.length - 2] <= sma20[sma20.length - 2] &&
      currentRSI > 30 && currentRSI < 70 &&
      histogram[histogram.length - 1] > 0
    ) {
      const stopLoss = Math.min(closestSupport, price - atr * 2);
      const targetPrice = price + (price - stopLoss) * 2; // RR 2:1
      
      signals.push({
        symbol,
        type: SignalType.TECHNICAL,
        signal: 'BUY',
        reason: `Cruzamento de médias (SMA8 cruzou acima da SMA20) com RSI em ${currentRSI.toFixed(2)} e MACD positivo`,
        strength: SignalStrength.STRONG,
        timestamp: Date.now(),
        price,
        entry_price: price,
        stop_loss: stopLoss,
        target_price: targetPrice,
        success_rate: calculateSuccessRate(prices, 'BUY', 20),
        timeframe: '1d',
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
        risk_reward: ((targetPrice - price) / (price - stopLoss)).toFixed(2),
        status: 'active'
      });
    }
    
    // Sinal moderado de compra: RSI saindo de sobrevenda + suporte próximo
    else if (
      currentRSI > 30 && currentRSI < 40 &&
      rsi[rsi.length - 2] <= 30 &&
      Math.abs(price - closestSupport) / price < 0.05 // Preço próximo ao suporte (5%)
    ) {
      const stopLoss = closestSupport - atr * 0.5;
      const targetPrice = price + (price - stopLoss) * 1.5; // RR 1.5:1
      
      signals.push({
        symbol,
        type: SignalType.TECHNICAL,
        signal: 'BUY',
        reason: `RSI saindo de sobrevenda (${currentRSI.toFixed(2)}) próximo ao suporte de ${closestSupport.toFixed(2)}`,
        strength: SignalStrength.MODERATE,
        timestamp: Date.now(),
        price,
        entry_price: price,
        stop_loss: stopLoss,
        target_price: targetPrice,
        success_rate: calculateSuccessRate(prices, 'BUY', 20),
        timeframe: '1d',
        expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 dias
        risk_reward: ((targetPrice - price) / (price - stopLoss)).toFixed(2),
        status: 'active'
      });
    }
    
    // Sinal baseado em padrões de candlestick bullish
    const bullishPatterns = candlestickPatterns.filter(p => p.bullish);
    if (bullishPatterns.length > 0) {
      // Ordenar por força do padrão
      bullishPatterns.sort((a, b) => b.strength - a.strength);
      
      // Usar o padrão mais forte
      const strongestPattern = bullishPatterns[0];
      
      // Verificar se o padrão é forte o suficiente
      if (strongestPattern.strength >= 0.7) {
        const stopLoss = Math.min(closestSupport, price - atr * 1.5);
        const targetPrice = price + (price - stopLoss) * 2; // RR 2:1
        
        signals.push({
          symbol,
          type: SignalType.TECHNICAL,
          signal: 'BUY',
          reason: `Padrão de candlestick: ${strongestPattern.pattern}`,
          strength: strongestPattern.strength >= 0.8 ? SignalStrength.STRONG : SignalStrength.MODERATE,
          timestamp: Date.now(),
          price,
          entry_price: price,
          stop_loss: stopLoss,
          target_price: targetPrice,
          success_rate: 0.5 + (strongestPattern.strength * 0.3), // Ajustar taxa de sucesso com base na força do padrão
          timeframe: '1d',
          expiry: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 dias
          risk_reward: ((targetPrice - price) / (price - stopLoss)).toFixed(2),
          status: 'active'
        });
      }
    }
    
    // Sinal baseado em divergência bullish de RSI
    if (rsiDivergence === 'bullish') {
      const stopLoss = Math.min(closestSupport, price - atr * 1.5);
      const targetPrice = price + (price - stopLoss) * 2; // RR 2:1
      
      signals.push({
        symbol,
        type: SignalType.TECHNICAL,
        signal: 'BUY',
        reason: `Divergência bullish de RSI: preço formando mínimos mais baixos, mas RSI formando mínimos mais altos`,
        strength: SignalStrength.STRONG,
        timestamp: Date.now(),
        price,
        entry_price: price,
        stop_loss: stopLoss,
        target_price: targetPrice,
        success_rate: 0.75, // Divergências de RSI tendem a ser confiáveis
        timeframe: '1d',
        expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 dias
        risk_reward: ((targetPrice - price) / (price - stopLoss)).toFixed(2),
        status: 'active'
      });
    }
    
    // === SINAIS DE VENDA ===
    
    // Sinal forte de venda: Cruzamento de médias + RSI saindo de sobrecompra + MACD negativo
    if (
      sma8[sma8.length - 1] < sma20[sma20.length - 1] &&
      sma8[sma8.length - 2] >= sma20[sma20.length - 2] &&
      currentRSI < 70 && currentRSI > 30 &&
      histogram[histogram.length - 1] < 0
    ) {
      const stopLoss = Math.max(closestResistance, price + atr * 2);
      const targetPrice = price - (stopLoss - price) * 2; // RR 2:1
      
      signals.push({
        symbol,
        type: SignalType.TECHNICAL,
        signal: 'SELL',
        reason: `Cruzamento de médias (SMA8 cruzou abaixo da SMA20) com RSI em ${currentRSI.toFixed(2)} e MACD negativo`,
        strength: SignalStrength.STRONG,
        timestamp: Date.now(),
        price,
        entry_price: price,
        stop_loss: stopLoss,
        target_price: targetPrice,
        success_rate: calculateSuccessRate(prices, 'SELL', 20),
        timeframe: '1d',
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
        risk_reward: ((price - targetPrice) / (stopLoss - price)).toFixed(2),
        status: 'active'
      });
    }
    
    // Sinal moderado de venda: RSI saindo de sobrecompra + resistência próxima
    else if (
      currentRSI < 70 && currentRSI > 60 &&
      rsi[rsi.length - 2] >= 70 &&
      Math.abs(closestResistance - price) / price < 0.05 // Preço próximo à resistência (5%)
    ) {
      const stopLoss = closestResistance + atr * 0.5;
      const targetPrice = price - (stopLoss - price) * 1.5; // RR 1.5:1
      
      signals.push({
        symbol,
        type: SignalType.TECHNICAL,
        signal: 'SELL',
        reason: `RSI saindo de sobrecompra (${currentRSI.toFixed(2)}) próximo à resistência de ${closestResistance.toFixed(2)}`,
        strength: SignalStrength.MODERATE,
        timestamp: Date.now(),
        price,
        entry_price: price,
        stop_loss: stopLoss,
        target_price: targetPrice,
        success_rate: calculateSuccessRate(prices, 'SELL', 20),
        timeframe: '1d',
        expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 dias
        risk_reward: ((price - targetPrice) / (stopLoss - price)).toFixed(2),
        status: 'active'
      });
    }
    
    // Sinal baseado em padrões de candlestick bearish
    const bearishPatterns = candlestickPatterns.filter(p => !p.bullish);
    if (bearishPatterns.length > 0) {
      // Ordenar por força do padrão
      bearishPatterns.sort((a, b) => b.strength - a.strength);
      
      // Usar o padrão mais forte
      const strongestPattern = bearishPatterns[0];
      
      // Verificar se o padrão é forte o suficiente
      if (strongestPattern.strength >= 0.7) {
        const stopLoss = Math.max(closestResistance, price + atr * 1.5);
        const targetPrice = price - (stopLoss - price) * 2; // RR 2:1
        
        signals.push({
          symbol,
          type: SignalType.TECHNICAL,
          signal: 'SELL',
          reason: `Padrão de candlestick: ${strongestPattern.pattern}`,
          strength: strongestPattern.strength >= 0.8 ? SignalStrength.STRONG : SignalStrength.MODERATE,
          timestamp: Date.now(),
          price,
          entry_price: price,
          stop_loss: stopLoss,
          target_price: targetPrice,
          success_rate: 0.5 + (strongestPattern.strength * 0.3), // Ajustar taxa de sucesso com base na força do padrão
          timeframe: '1d',
          expiry: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 dias
          risk_reward: ((price - targetPrice) / (stopLoss - price)).toFixed(2),
          status: 'active'
        });
      }
    }
    
    // Sinal baseado em divergência bearish de RSI
    if (rsiDivergence === 'bearish') {
      const stopLoss = Math.max(closestResistance, price + atr * 1.5);
      const targetPrice = price - (stopLoss - price) * 2; // RR 2:1
      
      signals.push({
        symbol,
        type: SignalType.TECHNICAL,
        signal: 'SELL',
        reason: `Divergência bearish de RSI: preço formando máximos mais altos, mas RSI formando máximos mais baixos`,
        strength: SignalStrength.STRONG,
        timestamp: Date.now(),
        price,
        entry_price: price,
        stop_loss: stopLoss,
        target_price: targetPrice,
        success_rate: 0.75, // Divergências de RSI tendem a ser confiáveis
        timeframe: '1d',
        expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 dias
        risk_reward: ((price - targetPrice) / (stopLoss - price)).toFixed(2),
        status: 'active'
      });
    }
    
    return signals;
  } catch (error) {
    console.error(`Erro ao gerar sinais técnicos para ${symbol}:`, error);
    return [];
  }
}

// Função para atualizar status de sinal
export async function updateSignalStatus(signal: TradingSignal): Promise<TradingSignal> {
  try {
    // Buscar preço atual
    let currentPrice = 0;
    
    if (signal.pair.includes('USDT')) {
      // Crypto
      const priceData = await getBinancePrice(signal.pair);
      currentPrice = parseFloat(priceData.price);
    } else {
      // Stock
      const stockSymbol = signal.pair.includes('.SA') ? signal.pair : `${signal.pair}.SA`;
      const quoteData = await fetchStockQuote(stockSymbol);
      currentPrice = parseFloat(quoteData.price);
    }
    
    // Verificar se o alvo ou stop loss foi atingido
    let newStatus = signal.status;
    
    if (signal.type === 'COMPRA') {
      if (currentPrice >= parseFloat(signal.target)) {
        newStatus = 'CONCLUÍDO';
      } else if (currentPrice <= parseFloat(signal.stopLoss)) {
        newStatus = 'CANCELADO';
      }
    } else if (signal.type === 'VENDA') {
      if (currentPrice <= parseFloat(signal.target)) {
        newStatus = 'CONCLUÍDO';
      } else if (currentPrice >= parseFloat(signal.stopLoss)) {
        newStatus = 'CANCELADO';
      }
    }
    
    // Se o status mudou, atualizar no Supabase
    if (newStatus !== signal.status) {
      const { error } = await supabase
        .from('trading_signals')
        .update({ status: newStatus })
        .eq('id', signal.id);
        
      if (error) {
        console.error(`Erro ao atualizar status do sinal ${signal.id}:`, error);
      } else {
        console.log(`Status do sinal ${signal.id} atualizado para ${newStatus}`);
        return { ...signal, status: newStatus };
      }
    }
    
    return signal;
  } catch (error) {
    console.error('Erro ao atualizar status do sinal:', error);
    return signal;
  }
}

// Função para substituir sinal concluído
export async function replaceCompletedSignal(signal: TradingSignal): Promise<TradingSignal | null> {
  try {
    // Verificar se o sinal está concluído ou cancelado
    if (signal.status !== 'CONCLUÍDO' && signal.status !== 'CANCELADO') {
      return null;
    }
    
    // Gerar um novo sinal para o mesmo par
    const assets = [{ 
      symbol: signal.pair, 
      name: signal.pair.replace('USDT', '').replace('.SA', ''), 
      isCrypto: signal.pair.includes('USDT') 
    }];
    
    const newSignals = await Promise.all(
      assets.map(async (asset, index) => {
        try {
          // Análise similar à da função generateTechnicalSignals
          let historicalData;
          let currentPrice = 0;
          
          if (asset.isCrypto) {
            historicalData = await getBinanceHistoricalData(asset.symbol, '1d', 30);
            const priceData = await getBinancePrice(asset.symbol);
            currentPrice = parseFloat(priceData.price);
          } else {
            const avData = await fetchHistoricalData(asset.symbol, 'daily');
            historicalData = {
              prices: avData.prices,
              highs: avData.highs,
              lows: avData.lows,
              volumes: avData.volumes,
              timestamps: []
            };
            const quoteData = await fetchStockQuote(asset.symbol);
            currentPrice = parseFloat(quoteData.price);
          }
          
          // Calcular RSI
          const rsiData = asset.isCrypto 
            ? calculaRSI(historicalData.prices) 
            : await fetchTechnicalIndicator(asset.symbol, 'RSI');
          
          const ultimoRSI = Array.isArray(rsiData) ? rsiData[rsiData.length - 1] : 50;
          
          // Determinar o tipo de sinal com base no RSI e também outros indicadores
          // Para ter uma estratégia mais robusta
          const ma20 = calcularMediaMovel(historicalData.prices, 20);
          const ma50 = calcularMediaMovel(historicalData.prices, 50);
          
          const ultimaMA20 = ma20[ma20.length - 1];
          const ultimaMA50 = ma50[ma50.length - 1];
          
          let signalType: 'COMPRA' | 'VENDA' | null = null;
          
          // Lógica de trading:
          // - Se RSI < 30 e preço acima da MA50 = COMPRA (sobrevendido em tendência de alta)
          // - Se RSI > 70 e preço abaixo da MA50 = VENDA (sobrecomprado em tendência de baixa)
          // - Se MA20 cruzou acima da MA50 = COMPRA (golden cross)
          // - Se MA20 cruzou abaixo da MA50 = VENDA (death cross)
          
          if (ultimoRSI < 30 && currentPrice > ultimaMA50) {
            signalType = 'COMPRA';
          } else if (ultimoRSI > 70 && currentPrice < ultimaMA50) {
            signalType = 'VENDA';
          } else if (ma20.length > 2 && ma50.length > 2) {
            const penultimaMA20 = ma20[ma20.length - 2];
            const penultimaMA50 = ma50[ma50.length - 2];
            
            if (ultimaMA20 > ultimaMA50 && penultimaMA20 <= penultimaMA50) {
              signalType = 'COMPRA'; // Golden Cross
            } else if (ultimaMA20 < ultimaMA50 && penultimaMA20 >= penultimaMA50) {
              signalType = 'VENDA'; // Death Cross
            }
          }
          
          // Se não temos sinal claro, retornar null
          if (!signalType) {
            return null;
          }
          
          // Calcular alvos de preço
          const atr = calculaATR(historicalData.highs, historicalData.lows, historicalData.prices, 14);
          
          // Preço de entrada é o preço atual
          const entry = currentPrice.toFixed(2);
          
          // Calcular alvo e stop
          let target, stopLoss;
          
          if (signalType === 'COMPRA') {
            target = (currentPrice + (atr * 3)).toFixed(2);
            stopLoss = (currentPrice - (atr * 1.5)).toFixed(2);
          } else {
            target = (currentPrice - (atr * 3)).toFixed(2);
            stopLoss = (currentPrice + (atr * 1.5)).toFixed(2);
          }
          
          // Calcular outros campos
          const score = signalType === 'COMPRA' 
            ? Math.round(100 - ultimoRSI) 
            : Math.round(ultimoRSI);
          
          const riskRewardRatio = signalType === 'COMPRA'
            ? (parseFloat(target) - currentPrice) / (currentPrice - parseFloat(stopLoss))
            : (currentPrice - parseFloat(target)) / (parseFloat(stopLoss) - currentPrice);
          
          const priceRange = Math.abs(parseFloat(target) - currentPrice) / currentPrice;
          let timeframe: 'DAYTRADING' | 'CURTO' | 'MÉDIO' | 'LONGO' = 'CURTO';
          
          if (priceRange < 0.03) {
            timeframe = 'DAYTRADING';
          } else if (priceRange < 0.10) {
            timeframe = 'CURTO';
          } else if (priceRange < 0.25) {
            timeframe = 'MÉDIO';
          } else {
            timeframe = 'LONGO';
          }
          
          // Criar o novo sinal
          const newSignal: TradingSignal = {
            id: Date.now(), // ID temporário
            pair: asset.symbol,
            type: signalType,
            entry: entry,
            target: target,
            stopLoss: stopLoss,
            timestamp: new Date().toISOString(),
            status: 'ATIVO',
            successRate: signal.success_rate, // Manter a mesma taxa de sucesso
            timeframe: timeframe,
            score: score,
            riskRewardRatio: riskRewardRatio
          };
          
          return newSignal;
        } catch (error) {
          console.error(`Erro ao analisar ${asset.symbol} para substituição:`, error);
          return null;
        }
      })
    );
    
    // Filtrar sinais nulos
    const validNewSignals = newSignals.filter(signal => signal !== null) as TradingSignal[];
    
    if (validNewSignals.length === 0) {
      return null;
    }
    
    // Salvar o novo sinal no Supabase
    try {
      const signalToInsert = {
        pair: validNewSignals[0].pair,
        type: validNewSignals[0].type,
        entry: validNewSignals[0].entry,
        target: validNewSignals[0].target,
        stop_loss: validNewSignals[0].stopLoss,
        timestamp: validNewSignals[0].timestamp,
        status: validNewSignals[0].status,
        success_rate: validNewSignals[0].successRate,
        timeframe: validNewSignals[0].timeframe,
        score: validNewSignals[0].score,
        risk_reward_ratio: validNewSignals[0].riskRewardRatio
      };
      
      const { data, error } = await supabase
        .from('trading_signals')
        .insert([signalToInsert])
        .select();
        
      if (error) {
        console.error('Erro ao inserir novo sinal:', error);
        return validNewSignals[0];
      }
      
      if (data && data.length > 0) {
        return {
          ...validNewSignals[0],
          id: data[0].id
        };
      }
      
      return validNewSignals[0];
    } catch (saveError) {
      console.error('Erro ao salvar novo sinal no Supabase:', saveError);
      return validNewSignals[0];
    }
  } catch (error) {
    console.error('Erro ao substituir sinal concluído:', error);
    return null;
  }
}

// Função para calcular média móvel
function calcularMediaMovel(precos: number[], periodo: number): number[] {
  if (precos.length < periodo) {
    return [precos[precos.length - 1]];
  }
  
  const medias: number[] = [];
  
  for (let i = periodo - 1; i < precos.length; i++) {
    const slice = precos.slice(i - periodo + 1, i + 1);
    const media = slice.reduce((sum, price) => sum + price, 0) / periodo;
    medias.push(media);
  }
  
  return medias;
}

// Função para calcular Média Móvel Simples (SMA)
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) {
    return prices[prices.length - 1];
  }
  
  const slice = prices.slice(-period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
}

// Função para substituir múltiplos sinais concluídos
export async function replaceMultipleCompletedSignals(signals: TradingSignal[]): Promise<TradingSignal[]> {
  try {
    const novosSignals: TradingSignal[] = [];
    
    // Filtrar apenas sinais concluídos ou cancelados
    const signalsConcluidos = signals.filter(
      signal => signal.status === 'CONCLUÍDO' || signal.status === 'CANCELADO'
    );
    
    // Substituir cada sinal concluído
    for (const signal of signalsConcluidos) {
      const novoSignal = await replaceCompletedSignal(signal);
      if (novoSignal) {
        novosSignals.push(novoSignal);
      }
    }
    
    return novosSignals;
  } catch (error) {
    console.error('Erro ao substituir múltiplos sinais concluídos:', error);
    return [];
  }
}

// Função para análise de ativos
export async function comprehensiveAnalyzeAsset(symbol: string, isCrypto: boolean = false): Promise<any> {
  try {
    // Obter dados históricos
    let historicalData;
    let currentPrice;
    let recomendacoes;
    let alvoPreco;
    
    if (isCrypto) {
      // Dados da Binance para cripto
      historicalData = await getBinanceHistoricalData(symbol, '1d', 30);
      const priceData = await getBinancePrice(symbol);
      currentPrice = parseFloat(priceData.price);
    } else {
      // Dados da Alpha Vantage para ações
      const avData = await fetchHistoricalData(symbol, 'daily');
      historicalData = {
        prices: avData.prices,
        highs: avData.highs,
        lows: avData.lows,
        volumes: avData.volumes,
        timestamps: []
      };
      const quoteData = await fetchStockQuote(symbol);
      currentPrice = parseFloat(quoteData.price);
      
      // Dados adicionais do Finnhub para ações
      try {
        recomendacoes = await fetchAnalystRecommendations(symbol);
        alvoPreco = await fetchPriceTarget(symbol);
      } catch (e) {
        console.log('Dados adicionais do Finnhub não disponíveis:', e);
      }
    }
    
    // Calcular indicadores técnicos
    const rsi = calculaRSI(historicalData.prices);
    const atr = calculaATR(historicalData.highs, historicalData.lows, historicalData.prices, 14);
    
    // Calcular médias móveis
    const ma20 = calcularMediaMovel(historicalData.prices, 20);
    const ma50 = calcularMediaMovel(historicalData.prices, 50);
    
    // Gerar sinal
    const ultimoRSI = rsi[rsi.length - 1];
    const ultimaMA20 = ma20[ma20.length - 1];
    const ultimaMA50 = ma50[ma50.length - 1];
    
    let signalType = null;
    let signalScore = 0;
    let targetPrice = null;
    let stopLossPrice = null;
    
    // Lógica de sinal
    if (ultimoRSI < 30 && currentPrice > ultimaMA50) {
      signalType = 'COMPRA';
      signalScore = 70 + Math.round((30 - ultimoRSI) * 1.5);
      targetPrice = (currentPrice + (atr * 3)).toFixed(2);
      stopLossPrice = (currentPrice - (atr * 1.5)).toFixed(2);
    } else if (ultimoRSI > 70 && currentPrice < ultimaMA50) {
      signalType = 'VENDA';
      signalScore = 70 + Math.round((ultimoRSI - 70) * 1.5);
      targetPrice = (currentPrice - (atr * 3)).toFixed(2);
      stopLossPrice = (currentPrice + (atr * 1.5)).toFixed(2);
    } else if (ma20.length > 2 && ma50.length > 2) {
      const penultimaMA20 = ma20[ma20.length - 2];
      const penultimaMA50 = ma50[ma50.length - 2];
      
      if (ultimaMA20 > ultimaMA50 && penultimaMA20 <= penultimaMA50) {
        signalType = 'COMPRA'; // Golden Cross
        signalScore = 80;
        targetPrice = (currentPrice + (atr * 4)).toFixed(2);
        stopLossPrice = (currentPrice - (atr * 2)).toFixed(2);
      } else if (ultimaMA20 < ultimaMA50 && penultimaMA20 >= penultimaMA50) {
        signalType = 'VENDA'; // Death Cross
        signalScore = 80;
        targetPrice = (currentPrice - (atr * 4)).toFixed(2);
        stopLossPrice = (currentPrice + (atr * 2)).toFixed(2);
      }
    }
    
    // Compilar resultado da análise
    return {
      symbol,
      precoAtual: currentPrice,
      indicadoresTecnicos: {
        rsi: ultimoRSI,
        atr,
        ma20: ultimaMA20,
        ma50: ultimaMA50
      },
      sinal: signalType ? {
        tipo: signalType,
        entrada: currentPrice.toFixed(2),
        alvo: targetPrice,
        stopLoss: stopLossPrice,
        score: signalScore
      } : null,
      recomendacoesAnalistas: recomendacoes,
      alvoPreco
    };
  } catch (error) {
    console.error(`Erro ao analisar ${symbol}:`, error);
    throw error;
  }
}

// Função para calcular o RSI
function calculaRSI(precos: number[], periodo: number = 14): number[] {
  if (precos.length < periodo + 1) {
    return [50]; // valor neutro
  }
  
  // Calcular as variações
  const variacoes: number[] = [];
  for (let i = 1; i < precos.length; i++) {
    variacoes.push(precos[i] - precos[i - 1]);
  }
  
  // RSI = 100 - (100 / (1 + RS))
  // RS = Média dos ganhos / Média das perdas
  const rsi: number[] = [];
  
  // Calcular o primeiro RSI
  let somaGanhos = 0;
  let somaPerdas = 0;
  
  for (let i = 0; i < periodo; i++) {
    if (variacoes[i] > 0) {
      somaGanhos += variacoes[i];
    } else {
      somaPerdas += Math.abs(variacoes[i]);
    }
  }
  
  let mediaGanhos = somaGanhos / periodo;
  let mediaPerdas = somaPerdas / periodo;
  
  // Evitar divisão por zero
  if (mediaPerdas === 0) {
    rsi.push(100);
  } else {
    const rs = mediaGanhos / mediaPerdas;
    rsi.push(100 - (100 / (1 + rs)));
  }
  
  // Calcular o restante dos RSIs usando média móvel
  for (let i = periodo; i < variacoes.length; i++) {
    const variacao = variacoes[i];
    
    if (variacao > 0) {
      mediaGanhos = (mediaGanhos * (periodo - 1) + variacao) / periodo;
      mediaPerdas = (mediaPerdas * (periodo - 1)) / periodo;
    } else {
      mediaGanhos = (mediaGanhos * (periodo - 1)) / periodo;
      mediaPerdas = (mediaPerdas * (periodo - 1) + Math.abs(variacao)) / periodo;
    }
    
    // Evitar divisão por zero
    if (mediaPerdas === 0) {
      rsi.push(100);
    } else {
      const rs = mediaGanhos / mediaPerdas;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

// Função para calcular o ATR (Average True Range)
function calculaATR(highs: number[], lows: number[], closes: number[], periodo: number = 14): number {
  // Verificar dados insuficientes
  if (highs.length < periodo || lows.length < periodo || closes.length < periodo) {
    return 0;
  }
  
  // Calcular True Range para cada período
  const trueRanges = [];
  
  for (let i = 1; i < closes.length; i++) {
    // True Range é o maior entre:
    // 1. Alta atual - Baixa atual
    // 2. |Alta atual - Fechamento anterior|
    // 3. |Baixa atual - Fechamento anterior|
    const highLowRange = highs[i] - lows[i];
    const highCloseRange = Math.abs(highs[i] - closes[i-1]);
    const lowCloseRange = Math.abs(lows[i] - closes[i-1]);
    
    const trueRange = Math.max(highLowRange, highCloseRange, lowCloseRange);
    trueRanges.push(trueRange);
  }
  
  // Calcular média dos True Ranges para o período
  const atr = trueRanges.slice(-periodo).reduce((sum, tr) => sum + tr, 0) / periodo;
  
  return atr;
}

// Função para calcular MACD
function calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): { macdLine: number[], signalLine: number[], histogram: number[] } {
  // Calcular EMA rápida e lenta
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  // Calcular linha MACD (diferença entre EMA rápida e lenta)
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < slowPeriod - 1) {
      macdLine.push(0); // Valores iniciais até termos dados suficientes
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
  }
  
  // Calcular linha de sinal (EMA da linha MACD)
  const signalLine = calculateEMA(macdLine, signalPeriod);
  
  // Calcular histograma (diferença entre linha MACD e linha de sinal)
  const histogram: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (i < slowPeriod + signalPeriod - 2) {
      histogram.push(0); // Valores iniciais até termos dados suficientes
    } else {
      histogram.push(macdLine[i] - signalLine[i]);
    }
  }
  
  return { macdLine, signalLine, histogram };
}

// Função para calcular EMA (Média Móvel Exponencial)
function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // Inicializar EMA com SMA para o primeiro período
  let initialSMA = 0;
  for (let i = 0; i < period; i++) {
    initialSMA += prices[i];
  }
  initialSMA /= period;
  
  // Preencher valores iniciais com 0 até termos dados suficientes
  for (let i = 0; i < period - 1; i++) {
    ema.push(0);
  }
  
  // Adicionar o SMA inicial
  ema.push(initialSMA);
  
  // Calcular EMA para o restante dos preços
  for (let i = period; i < prices.length; i++) {
    const newEMA = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
    ema.push(newEMA);
  }
  
  return ema;
}

// Função para verificar divergências de RSI
function checkRSIDivergence(prices: number[], rsi: number[]): 'bullish' | 'bearish' | null {
  // Precisamos de pelo menos 10 períodos para verificar divergências
  if (prices.length < 10 || rsi.length < 10) {
    return null;
  }
  
  // Verificar os últimos 10 períodos
  const recentPrices = prices.slice(-10);
  const recentRSI = rsi.slice(-10);
  
  // Encontrar mínimos e máximos locais
  let priceMinIndex = 0;
  let priceMaxIndex = 0;
  let rsiMinIndex = 0;
  let rsiMaxIndex = 0;
  
  for (let i = 1; i < recentPrices.length; i++) {
    // Atualizar índices de mínimos
    if (recentPrices[i] < recentPrices[priceMinIndex]) {
      priceMinIndex = i;
    }
    if (recentRSI[i] < recentRSI[rsiMinIndex]) {
      rsiMinIndex = i;
    }
    
    // Atualizar índices de máximos
    if (recentPrices[i] > recentPrices[priceMaxIndex]) {
      priceMaxIndex = i;
    }
    if (recentRSI[i] > recentRSI[rsiMaxIndex]) {
      rsiMaxIndex = i;
    }
  }
  
  // Verificar divergência de baixa (preço faz máximo mais alto, RSI faz máximo mais baixo)
  if (priceMaxIndex > 0 && rsiMaxIndex > 0 && priceMaxIndex !== rsiMaxIndex) {
    const previousPriceMax = recentPrices.slice(0, priceMaxIndex).reduce((max, price, index) => 
      price > max.price ? { price, index } : max, { price: -Infinity, index: -1 });
    
    const previousRSIMax = recentRSI.slice(0, rsiMaxIndex).reduce((max, value, index) => 
      value > max.value ? { value, index } : max, { value: -Infinity, index: -1 });
    
    if (previousPriceMax.index !== -1 && previousRSIMax.index !== -1) {
      if (recentPrices[priceMaxIndex] > recentPrices[previousPriceMax.index] && 
          recentRSI[rsiMaxIndex] < recentRSI[previousRSIMax.index]) {
        return 'bearish';
      }
    }
  }
  
  // Verificar divergência de alta (preço faz mínimo mais baixo, RSI faz mínimo mais alto)
  if (priceMinIndex > 0 && rsiMinIndex > 0 && priceMinIndex !== rsiMinIndex) {
    const previousPriceMin = recentPrices.slice(0, priceMinIndex).reduce((min, price, index) => 
      price < min.price ? { price, index } : min, { price: Infinity, index: -1 });
    
    const previousRSIMin = recentRSI.slice(0, rsiMinIndex).reduce((min, value, index) => 
      value < min.value ? { value, index } : min, { value: Infinity, index: -1 });
    
    if (previousPriceMin.index !== -1 && previousRSIMin.index !== -1) {
      if (recentPrices[priceMinIndex] < recentPrices[previousPriceMin.index] && 
          recentRSI[rsiMinIndex] > recentRSI[previousRSIMin.index]) {
        return 'bullish';
      }
    }
  }
  
  return null;
}

/**
 * Detecta padrões de candlestick nos dados de preço
 * @param opens Array de preços de abertura
 * @param highs Array de preços máximos
 * @param lows Array de preços mínimos
 * @param closes Array de preços de fechamento
 * @param volumes Array de volumes (opcional)
 * @returns Objeto com os padrões detectados e suas forças
 */
function detectCandlestickPatterns(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  volumes?: number[]
): { pattern: string; strength: number; bullish: boolean }[] {
  // Verificar se temos dados suficientes
  if (opens.length < 5 || highs.length < 5 || lows.length < 5 || closes.length < 5) {
    return [];
  }

  const patterns: { pattern: string; strength: number; bullish: boolean }[] = [];
  
  // Obter os últimos 5 candles para análise
  const lastOpens = opens.slice(-5);
  const lastHighs = highs.slice(-5);
  const lastLows = lows.slice(-5);
  const lastCloses = closes.slice(-5);
  const lastVolumes = volumes ? volumes.slice(-5) : null;
  
  // Calcular tamanhos dos corpos e sombras
  const bodySizes: number[] = [];
  const upperShadows: number[] = [];
  const lowerShadows: number[] = [];
  const ranges: number[] = [];
  
  for (let i = 0; i < 5; i++) {
    const open = lastOpens[i];
    const high = lastHighs[i];
    const low = lastLows[i];
    const close = lastCloses[i];
    
    const bodySize = Math.abs(close - open);
    const upperShadow = high - Math.max(open, close);
    const lowerShadow = Math.min(open, close) - low;
    const range = high - low;
    
    bodySizes.push(bodySize);
    upperShadows.push(upperShadow);
    lowerShadows.push(lowerShadow);
    ranges.push(range);
  }
  
  // Calcular média de tamanho dos candles para referência
  const avgRange = ranges.reduce((sum, val) => sum + val, 0) / ranges.length;
  
  // Índices para os candles mais recentes
  const current = 4; // Último candle
  const prev = 3;    // Penúltimo candle
  const prev2 = 2;   // Antepenúltimo candle
  
  // === PADRÕES DE REVERSÃO DE BAIXA (BULLISH) ===
  
  // Martelo (Hammer)
  if (
    lowerShadows[current] > bodySizes[current] * 2 &&
    lowerShadows[current] > upperShadows[current] * 3 &&
    bodySizes[current] < avgRange * 0.3 &&
    lastCloses[current] > lastOpens[current] // Fechamento acima da abertura
  ) {
    // Verificar contexto: deve ocorrer após tendência de baixa
    const downtrend = lastCloses[prev] < lastOpens[prev] && 
                      lastCloses[prev2] < lastOpens[prev2] &&
                      lastCloses[prev] < lastCloses[prev2];
    
    if (downtrend) {
      patterns.push({
        pattern: 'Hammer (Martelo)',
        strength: 0.7,
        bullish: true
      });
    }
  }
  
  // Engolfo de Alta (Bullish Engulfing)
  if (
    lastCloses[current] > lastOpens[current] && // Candle de alta
    lastCloses[prev] < lastOpens[prev] &&       // Candle anterior de baixa
    lastCloses[current] > lastOpens[prev] &&    // Fechamento atual maior que abertura anterior
    lastOpens[current] < lastCloses[prev] &&    // Abertura atual menor que fechamento anterior
    bodySizes[current] > bodySizes[prev] * 1.2  // Corpo atual maior que o anterior
  ) {
    // Verificar contexto: deve ocorrer após tendência de baixa
    const downtrend = lastCloses[prev] < lastCloses[prev2];
    
    patterns.push({
      pattern: 'Bullish Engulfing (Engolfo de Alta)',
      strength: downtrend ? 0.8 : 0.6,
      bullish: true
    });
  }
  
  // Estrela da Manhã (Morning Star)
  if (
    lastCloses[prev2] < lastOpens[prev2] &&                  // Primeiro candle de baixa
    Math.abs(lastCloses[prev] - lastOpens[prev]) < avgRange * 0.3 && // Segundo candle pequeno
    lastCloses[current] > lastOpens[current] &&              // Terceiro candle de alta
    lastCloses[current] > (lastOpens[prev2] + lastCloses[prev2]) / 2 // Fechamento acima do meio do primeiro candle
  ) {
    patterns.push({
      pattern: 'Morning Star (Estrela da Manhã)',
      strength: 0.85,
      bullish: true
    });
  }
  
  // Harami de Alta (Bullish Harami)
  if (
    lastCloses[prev] < lastOpens[prev] &&       // Candle anterior de baixa
    lastCloses[current] > lastOpens[current] && // Candle atual de alta
    lastOpens[current] > lastCloses[prev] &&    // Abertura atual maior que fechamento anterior
    lastCloses[current] < lastOpens[prev] &&    // Fechamento atual menor que abertura anterior
    bodySizes[current] < bodySizes[prev] * 0.8  // Corpo atual menor que o anterior
  ) {
    patterns.push({
      pattern: 'Bullish Harami',
      strength: 0.6,
      bullish: true
    });
  }
  
  // === PADRÕES DE REVERSÃO DE ALTA (BEARISH) ===
  
  // Estrela Cadente (Shooting Star)
  if (
    upperShadows[current] > bodySizes[current] * 2 &&
    upperShadows[current] > lowerShadows[current] * 3 &&
    bodySizes[current] < avgRange * 0.3 &&
    lastCloses[current] < lastOpens[current] // Fechamento abaixo da abertura
  ) {
    // Verificar contexto: deve ocorrer após tendência de alta
    const uptrend = lastCloses[prev] > lastOpens[prev] && 
                    lastCloses[prev2] > lastOpens[prev2] &&
                    lastCloses[prev] > lastCloses[prev2];
    
    if (uptrend) {
      patterns.push({
        pattern: 'Shooting Star (Estrela Cadente)',
        strength: 0.7,
        bullish: false
      });
    }
  }
  
  // Engolfo de Baixa (Bearish Engulfing)
  if (
    lastCloses[current] < lastOpens[current] && // Candle de baixa
    lastCloses[prev] > lastOpens[prev] &&       // Candle anterior de alta
    lastCloses[current] < lastOpens[prev] &&    // Fechamento atual menor que abertura anterior
    lastOpens[current] > lastCloses[prev] &&    // Abertura atual maior que fechamento anterior
    bodySizes[current] > bodySizes[prev] * 1.2  // Corpo atual maior que o anterior
  ) {
    // Verificar contexto: deve ocorrer após tendência de alta
    const uptrend = lastCloses[prev] > lastCloses[prev2];
    
    patterns.push({
      pattern: 'Bearish Engulfing (Engolfo de Baixa)',
      strength: uptrend ? 0.8 : 0.6,
      bullish: false
    });
  }
  
  // Estrela da Noite (Evening Star)
  if (
    lastCloses[prev2] > lastOpens[prev2] &&                  // Primeiro candle de alta
    Math.abs(lastCloses[prev] - lastOpens[prev]) < avgRange * 0.3 && // Segundo candle pequeno
    lastCloses[current] < lastOpens[current] &&              // Terceiro candle de baixa
    lastCloses[current] < (lastOpens[prev2] + lastCloses[prev2]) / 2 // Fechamento abaixo do meio do primeiro candle
  ) {
    patterns.push({
      pattern: 'Evening Star (Estrela da Noite)',
      strength: 0.85,
      bullish: false
    });
  }
  
  // Harami de Baixa (Bearish Harami)
  if (
    lastCloses[prev] > lastOpens[prev] &&       // Candle anterior de alta
    lastCloses[current] < lastOpens[current] && // Candle atual de baixa
    lastOpens[current] < lastCloses[prev] &&    // Abertura atual menor que fechamento anterior
    lastCloses[current] > lastOpens[prev] &&    // Fechamento atual maior que abertura anterior
    bodySizes[current] < bodySizes[prev] * 0.8  // Corpo atual menor que o anterior
  ) {
    patterns.push({
      pattern: 'Bearish Harami',
      strength: 0.6,
      bullish: false
    });
  }
  
  // Doji (indecisão, mas pode ser reversão dependendo do contexto)
  if (bodySizes[current] < avgRange * 0.1) {
    // Verificar se é um doji em nível de suporte/resistência
    const isAtExtreme = 
      (Math.min(...lastLows.slice(0, 4)) >= lastLows[current] - avgRange * 0.1) || // Suporte
      (Math.max(...lastHighs.slice(0, 4)) <= lastHighs[current] + avgRange * 0.1); // Resistência
    
    if (isAtExtreme) {
      // Determinar se é bullish ou bearish baseado na tendência anterior
      const priorUptrend = lastCloses[prev] > lastCloses[prev2] && lastCloses[prev2] > lastCloses[1];
      
      patterns.push({
        pattern: 'Doji at ' + (priorUptrend ? 'Resistance' : 'Support'),
        strength: 0.5,
        bullish: !priorUptrend // Bullish se estiver em suporte, bearish se em resistência
      });
    }
  }
  
  // Três Soldados Brancos (Three White Soldiers)
  if (
    lastCloses[prev2] > lastOpens[prev2] && // Três candles de alta consecutivos
    lastCloses[prev] > lastOpens[prev] &&
    lastCloses[current] > lastOpens[current] &&
    lastCloses[prev2] > lastCloses[1] && // Cada fechamento maior que o anterior
    lastCloses[prev] > lastCloses[prev2] &&
    lastCloses[current] > lastCloses[prev] &&
    bodySizes[prev2] > avgRange * 0.6 && // Corpos significativos
    bodySizes[prev] > avgRange * 0.6 &&
    bodySizes[current] > avgRange * 0.6
  ) {
    patterns.push({
      pattern: 'Three White Soldiers (Três Soldados Brancos)',
      strength: 0.9,
      bullish: true
    });
  }
  
  // Três Corvos Negros (Three Black Crows)
  if (
    lastCloses[prev2] < lastOpens[prev2] && // Três candles de baixa consecutivos
    lastCloses[prev] < lastOpens[prev] &&
    lastCloses[current] < lastOpens[current] &&
    lastCloses[prev2] < lastCloses[1] && // Cada fechamento menor que o anterior
    lastCloses[prev] < lastCloses[prev2] &&
    lastCloses[current] < lastCloses[prev] &&
    bodySizes[prev2] > avgRange * 0.6 && // Corpos significativos
    bodySizes[prev] > avgRange * 0.6 &&
    bodySizes[current] > avgRange * 0.6
  ) {
    patterns.push({
      pattern: 'Three Black Crows (Três Corvos Negros)',
      strength: 0.9,
      bullish: false
    });
  }
  
  return patterns;
}

/**
 * Calcula a correlação entre dois arrays de preços
 * @param prices1 Primeiro array de preços
 * @param prices2 Segundo array de preços
 * @returns Coeficiente de correlação entre -1 e 1
 */
function calculateCorrelation(prices1: number[], prices2: number[]): number {
  // Verificar se temos dados suficientes
  if (prices1.length < 5 || prices2.length < 5) {
    return 0;
  }
  
  // Garantir que os arrays tenham o mesmo tamanho
  const length = Math.min(prices1.length, prices2.length);
  const array1 = prices1.slice(-length);
  const array2 = prices2.slice(-length);
  
  // Calcular retornos diários em vez de preços absolutos
  const returns1: number[] = [];
  const returns2: number[] = [];
  
  for (let i = 1; i < length; i++) {
    returns1.push(array1[i] / array1[i-1] - 1);
    returns2.push(array2[i] / array2[i-1] - 1);
  }
  
  // Calcular médias
  const mean1 = returns1.reduce((sum, val) => sum + val, 0) / returns1.length;
  const mean2 = returns2.reduce((sum, val) => sum + val, 0) / returns2.length;
  
  // Calcular covariância e variâncias
  let covariance = 0;
  let variance1 = 0;
  let variance2 = 0;
  
  for (let i = 0; i < returns1.length; i++) {
    const diff1 = returns1[i] - mean1;
    const diff2 = returns2[i] - mean2;
    
    covariance += diff1 * diff2;
    variance1 += diff1 * diff1;
    variance2 += diff2 * diff2;
  }
  
  // Evitar divisão por zero
  if (variance1 === 0 || variance2 === 0) {
    return 0;
  }
  
  // Calcular correlação
  return covariance / Math.sqrt(variance1 * variance2);
}

/**
 * Gera sinais baseados em correlações entre ativos
 * @param marketData Dados do mercado para o ativo principal
 * @param correlatedAssets Array de dados de mercado para ativos correlacionados
 * @returns Array de sinais de trading baseados em correlações
 */
async function generateCorrelationSignals(
  marketData: MarketData,
  correlatedAssets: MarketData[]
): Promise<TradingSignal[]> {
  const signals: TradingSignal[] = [];
  const { symbol, price, isCrypto } = marketData;
  
  try {
    // Buscar dados históricos do ativo principal
    let mainAssetPrices: number[] = [];
    
    if (isCrypto) {
      const klines = await getHistoricalKlines(symbol, '1d', 30);
      if (klines.length < 20) {
        return [];
      }
      mainAssetPrices = klines.map(k => parseFloat(k[4])); // Preços de fechamento
    } else {
      const dailyData = await fetchHistoricalData(symbol, 'daily', 'compact');
      if (!dailyData || dailyData.prices.length < 20) {
        return [];
      }
      mainAssetPrices = dailyData.prices.slice(-30);
    }
    
    // Calcular ATR para stop loss e targets
    let atr = 0;
    if (isCrypto) {
      const klines = await getHistoricalKlines(symbol, '1d', 20);
      if (klines.length >= 14) {
        const highPrices = klines.map(k => parseFloat(k[2]));
        const lowPrices = klines.map(k => parseFloat(k[3]));
        const closePrices = klines.map(k => parseFloat(k[4]));
        atr = calculaATR(highPrices, lowPrices, closePrices, 14);
      }
    } else {
      const dailyData = await fetchHistoricalData(symbol, 'daily', 'compact');
      if (dailyData && dailyData.prices.length >= 14) {
        const highPrices = dailyData.highs.slice(-20);
        const lowPrices = dailyData.lows.slice(-20);
        const closePrices = dailyData.prices.slice(-20);
        atr = calculaATR(highPrices, lowPrices, closePrices, 14);
      }
    }
    
    if (atr === 0) {
      atr = price * (isCrypto ? 0.05 : 0.02); // Estimativa padrão
    }
    
    // Analisar correlações com outros ativos
    for (const correlatedAsset of correlatedAssets) {
      // Pular se for o mesmo ativo
      if (correlatedAsset.symbol === symbol) {
        continue;
      }
      
      // Buscar dados históricos do ativo correlacionado
      let correlatedPrices: number[] = [];
      
      if (correlatedAsset.isCrypto) {
        const klines = await getHistoricalKlines(correlatedAsset.symbol, '1d', 30);
        if (klines.length < 20) {
          continue;
        }
        correlatedPrices = klines.map(k => parseFloat(k[4])); // Preços de fechamento
      } else {
        const dailyData = await fetchHistoricalData(correlatedAsset.symbol, 'daily', 'compact');
        if (!dailyData || dailyData.prices.length < 20) {
          continue;
        }
        correlatedPrices = dailyData.prices.slice(-30);
      }
      
      // Calcular correlação entre os ativos
      const correlation = calculateCorrelation(mainAssetPrices, correlatedPrices);
      
      // Verificar se a correlação é forte o suficiente (positiva ou negativa)
      if (Math.abs(correlation) > 0.7) {
        // Calcular retornos recentes para ambos os ativos (últimos 5 dias)
        const mainRecentReturn = mainAssetPrices[mainAssetPrices.length - 1] / mainAssetPrices[mainAssetPrices.length - 6] - 1;
        const correlatedRecentReturn = correlatedPrices[correlatedPrices.length - 1] / correlatedPrices[correlatedPrices.length - 6] - 1;
        
        // Verificar se há divergência significativa nos retornos recentes
        const returnDifference = mainRecentReturn - (correlation > 0 ? correlatedRecentReturn : -correlatedRecentReturn);
        
        // Se houver divergência significativa, pode ser uma oportunidade de arbitragem estatística
        if (Math.abs(returnDifference) > 0.05) { // 5% de divergência
          // Determinar o sinal com base na divergência e na correlação
          let signal: 'BUY' | 'SELL';
          let reason: string;
          
          if (correlation > 0) {
            // Correlação positiva: ativos normalmente se movem juntos
            if (returnDifference < 0) {
              // Ativo principal teve desempenho pior que o correlacionado
              signal = 'BUY'; // Esperamos que o ativo principal se recupere
              reason = `Correlação positiva (${correlation.toFixed(2)}) com ${correlatedAsset.symbol}, que teve melhor desempenho recentemente. Esperada convergência.`;
            } else {
              // Ativo principal teve desempenho melhor que o correlacionado
              signal = 'SELL'; // Esperamos que o ativo principal caia para convergir
              reason = `Correlação positiva (${correlation.toFixed(2)}) com ${correlatedAsset.symbol}, que teve pior desempenho recentemente. Esperada convergência.`;
            }
          } else {
            // Correlação negativa: ativos normalmente se movem em direções opostas
            if (returnDifference < 0) {
              // Ativo principal teve desempenho pior que o esperado pela correlação negativa
              signal = 'SELL'; // Esperamos que continue caindo (seguindo a correlação negativa)
              reason = `Correlação negativa (${correlation.toFixed(2)}) com ${correlatedAsset.symbol}. Padrão de movimento inverso sugere continuação da queda.`;
            } else {
              // Ativo principal teve desempenho melhor que o esperado pela correlação negativa
              signal = 'BUY'; // Esperamos que continue subindo (seguindo a correlação negativa)
              reason = `Correlação negativa (${correlation.toFixed(2)}) com ${correlatedAsset.symbol}. Padrão de movimento inverso sugere continuação da alta.`;
            }
          }
          
          // Calcular stop loss e target com base no ATR e na volatilidade histórica
          const stopLoss = signal === 'BUY' ? price - (atr * 1.5) : price + (atr * 1.5);
          const targetPrice = signal === 'BUY' ? price + (atr * 3) : price - (atr * 3);
          
          // Calcular taxa de sucesso baseada na força da correlação
          const successRate = 0.5 + (Math.abs(correlation) * 0.3);
          
          signals.push({
            symbol,
            type: SignalType.CORRELATION,
            signal,
            reason,
            strength: Math.abs(correlation) > 0.8 ? SignalStrength.STRONG : SignalStrength.MODERATE,
            timestamp: Date.now(),
            price,
            entry_price: price,
            stop_loss: stopLoss,
            target_price: targetPrice,
            success_rate: successRate,
            timeframe: '1d',
            expiry: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 dias
            risk_reward: signal === 'BUY' 
              ? ((targetPrice - price) / (price - stopLoss)).toFixed(2)
              : ((price - targetPrice) / (stopLoss - price)).toFixed(2),
            status: 'active',
            related_asset: correlatedAsset.symbol
          });
        }
      }
    }
    
    return signals;
  } catch (error) {
    console.error(`Erro ao gerar sinais de correlação para ${symbol}:`, error);
    return [];
  }
}

// Função para monitorar automaticamente todos os sinais ativos
export async function monitorSignals(): Promise<{updated: TradingSignal[], replaced: TradingSignal[]}> {
  try {
    console.log('Iniciando monitoramento de sinais...');
    
    // Buscar todos os sinais ativos no Supabase
    const { data: activeSignals, error } = await supabase
      .from('trading_signals')
      .select('*')
      .eq('status', 'ATIVO');
      
    if (error) {
      console.error('Erro ao buscar sinais ativos:', error);
      return { updated: [], replaced: [] };
    }
    
    if (!activeSignals || activeSignals.length === 0) {
      console.log('Nenhum sinal ativo para monitorar.');
      return { updated: [], replaced: [] };
    }
    
    console.log(`Monitorando ${activeSignals.length} sinais ativos.`);
    
    // Atualizar o status de cada sinal
    const updatedSignals: TradingSignal[] = [];
    const signalsToReplace: TradingSignal[] = [];
    
    for (const signal of activeSignals) {
      const updatedSignal = await updateSignalStatus(signal as TradingSignal);
      updatedSignals.push(updatedSignal);
      
      // Verificar se o sinal foi concluído ou cancelado
      if (updatedSignal.status === 'CONCLUÍDO' || updatedSignal.status === 'CANCELADO') {
        signalsToReplace.push(updatedSignal);
      }
    }
    
    // Substituir os sinais concluídos ou cancelados
    const replacedSignals: TradingSignal[] = [];
    
    for (const signal of signalsToReplace) {
      const newSignal = await autoReplaceCompletedSignal(signal);
      if (newSignal) {
        replacedSignals.push(newSignal);
      }
    }
    
    return { updated: updatedSignals, replaced: replacedSignals };
  } catch (error) {
    console.error('Erro ao monitorar sinais:', error);
    return { updated: [], replaced: [] };
  }
}

// Função para substituir automaticamente um sinal que atingiu alvo ou stop
export async function autoReplaceCompletedSignal(signal: TradingSignal): Promise<TradingSignal | null> {
  try {
    // Verificar se o sinal está concluído ou cancelado
    if (signal.status !== 'CONCLUÍDO' && signal.status !== 'CANCELADO') {
      return null;
    }
    
    console.log(`Substituindo sinal ${signal.id} (${signal.pair}) com status ${signal.status}.`);
    
    // Buscar dados de mercado mais recentes para todos os ativos monitorados
    const marketDataPromises = MONITORED_SYMBOLS.map(async (symbol) => {
      const isCrypto = symbol.endsWith('USDT');
      
      try {
        let price, change, volume, high, low;
        
        if (isCrypto) {
          // Dados de cripto via Binance
          const latestPrices = await getLatestPrices([symbol]);
          const priceData = latestPrices.find(p => p.symbol === symbol);
          
          if (priceData) {
            price = parseFloat(priceData.price);
            volume = parseFloat(priceData.volume);
            high = parseFloat(priceData.high);
            low = parseFloat(priceData.low);
            change = parseFloat(priceData.changePercent);
          }
        } else {
          // Dados de ações via Alpha Vantage
          const quoteData = await fetchStockQuote(symbol);
          price = parseFloat(quoteData.price);
          volume = parseFloat(quoteData.volume);
          high = parseFloat(quoteData.high);
          low = parseFloat(quoteData.low);
          change = parseFloat(quoteData.changePercent);
        }
        
        return {
          symbol,
          price,
          volume,
          high,
          low,
          change,
          isCrypto
        };
      } catch (error) {
        console.error(`Erro ao buscar dados para ${symbol}:`, error);
        return null;
      }
    });
    
    const marketDataResults = await Promise.all(marketDataPromises);
    const validMarketData = marketDataResults.filter(data => data !== null) as MarketData[];
    
    // Buscar notícias recentes para análise de sentimento
    const allNews = await fetchAllMarketNews();
    
    // Gerar novos sinais técnicos e fundamentais
    const technicalSignalsPromises = validMarketData.map(data => generateTechnicalSignals(data));
    const fundamentalSignalsPromises = validMarketData.map(data => generateFundamentalSignals(data));
    
    const [technicalSignals, fundamentalSignals] = await Promise.all([
      Promise.all(technicalSignalsPromises).then(results => results.flat()),
      Promise.all(fundamentalSignalsPromises).then(results => results.flat())
    ]);
    
    // Combinar todos os sinais
    const allSignals = [...technicalSignals, ...fundamentalSignals];
    
    // Filtrar os sinais mais promissores
    // 1. Ordenar por força do sinal (STRONG > MODERATE > WEAK)
    // 2. Depois pela taxa de sucesso (maior primeiro)
    // 3. Por fim, pelo timestamp (mais recente primeiro)
    const rankedSignals = allSignals.sort((a, b) => {
      // Primeiro ordenar por força do sinal
      const strengthOrder = {
        [SignalStrength.STRONG]: 3,
        [SignalStrength.MODERATE]: 2,
        [SignalStrength.WEAK]: 1
      };
      const strengthDiff = strengthOrder[b.strength] - strengthOrder[a.strength];
      
      // Se a força for igual, ordenar por taxa de sucesso
      if (strengthDiff === 0) {
        const successDiff = b.success_rate - a.success_rate;
        
        // Se a taxa de sucesso for igual, ordenar por timestamp (mais recente primeiro)
        if (successDiff === 0) {
          return b.timestamp - a.timestamp;
        }
        
        return successDiff;
      }
      
      return strengthDiff;
    });
    
    // Escolher o melhor sinal
    const bestSignal = rankedSignals[0];
    
    if (bestSignal) {
      console.log(`Melhor sinal encontrado: ${bestSignal.symbol} (${bestSignal.signal}) com força ${bestSignal.strength} e taxa de sucesso ${bestSignal.success_rate.toFixed(2)}`);
      
      // Criar um novo sinal no Supabase
      const { data: newSignalData, error } = await supabase
        .from('trading_signals')
        .insert([{
          pair: bestSignal.symbol,
          type: bestSignal.signal === 'BUY' ? 'COMPRA' : 'VENDA',
          entry: bestSignal.entry_price.toString(),
          target: bestSignal.target_price.toString(),
          stopLoss: bestSignal.stop_loss.toString(),
          timestamp: new Date().toISOString(),
          status: 'ATIVO',
          successRate: bestSignal.success_rate,
          timeframe: bestSignal.timeframe === '1d' ? 'CURTO' : 
                     bestSignal.timeframe === '4h' ? 'DAYTRADING' : 
                     bestSignal.timeframe === '1w' ? 'MÉDIO' : 'LONGO',
          score: parseFloat(bestSignal.risk_reward),
          reason: bestSignal.reason
        }])
        .select();
        
      if (error) {
        console.error('Erro ao criar novo sinal:', error);
        return null;
      }
      
      console.log(`Novo sinal criado com ID ${newSignalData[0].id}.`);
      
      // Atualizar o sinal original para indicar que foi substituído
      const { error: updateError } = await supabase
        .from('trading_signals')
        .update({ 
          replacement_id: newSignalData[0].id,
          notes: `Substituído por ${newSignalData[0].id} (${bestSignal.symbol} ${bestSignal.signal})`
        })
        .eq('id', signal.id);
        
      if (updateError) {
        console.error(`Erro ao atualizar sinal original ${signal.id}:`, updateError);
      }
      
      return newSignalData[0];
    } else {
      console.log('Nenhum sinal adequado encontrado para substituição.');
      return null;
    }
  } catch (error) {
    console.error('Erro ao substituir sinal automaticamente:', error);
    return null;
  }
}

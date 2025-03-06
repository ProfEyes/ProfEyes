import { getMarketDepth } from './binanceApi';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Configuração das APIs
const ALPHA_VANTAGE_KEY = 'DZ9IL9TNDN95PRI5';
const NEWS_API_KEY = '3f28acaf-96e1-42df-b5c7-57316a076c0c';
const FINNHUB_API_KEY = 'cv2i8npr01qhefskfc2gcv2i8npr01qhefskfc30';
const RAPID_API_KEY = '9d9c045200msh6b83a73c6c17469p16c725jsn5d709ee967a6';

interface StockData {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  marketCap: number;
  pe: number;
  eps: number;
  beta: number;
  dividendYield: number;
  analystRating: string;
  technicalSignal: string;
}

interface MarketNews {
  title: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: number;
  source: string;
  url: string;
  timestamp: Date;
}

interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  sma: number[];
  ema: number[];
  bbands: {
    upper: number;
    middle: number;
    lower: number;
  };
}

// Função para buscar e processar o livro de ofertas
export async function getOrderBook(symbol: string) {
  try {
    const depth = await getMarketDepth(symbol);
    
    // Processar os dados do orderbook
    const bids = depth.bids.slice(0, 20); // Top 20 ofertas de compra
    const asks = depth.asks.slice(0, 20); // Top 20 ofertas de venda
    
    // Calcular totais acumulados para o gráfico
    const chartData = [];
    let bidTotal = 0;
    let askTotal = 0;
    
    for (let i = 0; i < 20; i++) {
      if (bids[i]) {
        bidTotal += parseFloat(bids[i][1]);
      }
      if (asks[i]) {
        askTotal += parseFloat(asks[i][1]);
      }
      
      chartData.push({
        price: parseFloat(bids[i] ? bids[i][0] : asks[i][0]),
        bidsTotal: bidTotal,
        asksTotal: askTotal
      });
    }
    
    return {
      bids,
      asks,
      chartData
    };
  } catch (error) {
    console.error('Erro ao buscar orderbook:', error);
    return null;
  }
}

// Função para calcular correlações entre ativos
export async function getMarketCorrelations(symbol: string) {
  try {
    // Lista de principais ativos para correlação
    const assets = [
      { symbol: 'BTCUSDT', name: 'Bitcoin' },
      { symbol: 'ETHUSDT', name: 'Ethereum' },
      { symbol: 'BNBUSDT', name: 'Binance Coin' },
      { symbol: 'SOLUSDT', name: 'Solana' },
      { symbol: 'ADAUSDT', name: 'Cardano' }
    ].filter(asset => asset.symbol !== symbol);
    
    // Buscar dados históricos do ativo principal
    const mainAssetData = await getHistoricalKlines(symbol, '1d', 30);
    const mainPrices = mainAssetData.map(k => parseFloat(k[4]));
    
    // Calcular correlações
    const correlations = await Promise.all(
      assets.map(async (asset) => {
        const assetData = await getHistoricalKlines(asset.symbol, '1d', 30);
        const assetPrices = assetData.map(k => parseFloat(k[4]));
        
        // Calcular coeficiente de correlação
        const correlation = calculateCorrelation(mainPrices, assetPrices);
        
        return {
          symbol: asset.symbol,
          name: asset.name,
          value: correlation
        };
      })
    );
    
    return correlations;
  } catch (error) {
    console.error('Erro ao calcular correlações:', error);
    return null;
  }
}

// Função auxiliar para calcular correlação entre dois arrays
function calculateCorrelation(array1: number[], array2: number[]): number {
  const n = Math.min(array1.length, array2.length);
  
  // Calcular médias
  const mean1 = array1.reduce((a, b) => a + b) / n;
  const mean2 = array2.reduce((a, b) => a + b) / n;
  
  // Calcular covariância e desvios padrão
  let covariance = 0;
  let variance1 = 0;
  let variance2 = 0;
  
  for (let i = 0; i < n; i++) {
    const diff1 = array1[i] - mean1;
    const diff2 = array2[i] - mean2;
    covariance += diff1 * diff2;
    variance1 += diff1 * diff1;
    variance2 += diff2 * diff2;
  }
  
  // Calcular correlação
  return covariance / Math.sqrt(variance1 * variance2);
}

export async function getStockData(symbol: string): Promise<StockData> {
  try {
    // Dados fundamentalistas do Alpha Vantage
    const fundamentalUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const fundamentalResponse = await axios.get(fundamentalUrl);
    const fundamentalData = fundamentalResponse.data;

    // Dados técnicos do Finnhub
    const technicalUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const technicalResponse = await axios.get(technicalUrl);
    const technicalData = technicalResponse.data;

    // Recomendações de analistas do Yahoo Finance via RapidAPI
    const options = {
      method: 'GET',
      url: `https://yahoo-finance1.p.rapidapi.com/stock/v2/get-analysis`,
      params: { symbol },
      headers: {
        'X-RapidAPI-Key': RAPID_API_KEY,
        'X-RapidAPI-Host': 'yahoo-finance1.p.rapidapi.com'
      }
    };
    const analysisResponse = await axios.request(options);
    const analysisData = analysisResponse.data;

    return {
      symbol,
      price: technicalData.c,
      change: technicalData.dp,
      volume: technicalData.v,
      marketCap: Number(fundamentalData.MarketCapitalization),
      pe: Number(fundamentalData.PERatio),
      eps: Number(fundamentalData.EPS),
      beta: Number(fundamentalData.Beta),
      dividendYield: Number(fundamentalData.DividendYield),
      analystRating: analysisData.recommendationTrend?.trend[0]?.strongBuy > 0 ? 'Compra Forte' : 'Neutro',
      technicalSignal: calculateTechnicalSignal(technicalData)
    };
  } catch (error) {
    console.error('Erro ao buscar dados da ação:', error);
    throw error;
  }
}

export async function getMarketNews(symbols: string[]): Promise<MarketNews[]> {
  try {
    const newsUrl = `https://newsapi.org/v2/everything?q=${symbols.join(' OR ')}&apiKey=${NEWS_API_KEY}&language=pt&sortBy=relevancy`;
    const response = await axios.get(newsUrl);
    
    return response.data.articles.map((article: any) => ({
      title: article.title,
      sentiment: analyzeSentiment(article.title + ' ' + article.description),
      impact: calculateNewsImpact(article),
      source: article.source.name,
      url: article.url,
      timestamp: new Date(article.publishedAt)
    }));
  } catch (error) {
    console.error('Erro ao buscar notícias:', error);
    throw error;
  }
}

export async function getTechnicalIndicators(symbol: string): Promise<TechnicalIndicators> {
  try {
    // RSI
    const rsiUrl = `https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${ALPHA_VANTAGE_KEY}`;
    const rsiResponse = await axios.get(rsiUrl);
    const rsiData = rsiResponse.data['Technical Analysis: RSI'];
    const latestRsi = Object.values(rsiData)[0] as any;

    // MACD
    const macdUrl = `https://www.alphavantage.co/query?function=MACD&symbol=${symbol}&interval=daily&series_type=close&apikey=${ALPHA_VANTAGE_KEY}`;
    const macdResponse = await axios.get(macdUrl);
    const macdData = macdResponse.data['Technical Analysis: MACD'];
    const latestMacd = Object.values(macdData)[0] as any;

    // SMA
    const smaUrl = `https://www.alphavantage.co/query?function=SMA&symbol=${symbol}&interval=daily&time_period=20&series_type=close&apikey=${ALPHA_VANTAGE_KEY}`;
    const smaResponse = await axios.get(smaUrl);
    const smaData = smaResponse.data['Technical Analysis: SMA'];
    const smaValues = Object.values(smaData).slice(0, 5).map((value: any) => Number(value.SMA));

    // EMA
    const emaUrl = `https://www.alphavantage.co/query?function=EMA&symbol=${symbol}&interval=daily&time_period=20&series_type=close&apikey=${ALPHA_VANTAGE_KEY}`;
    const emaResponse = await axios.get(emaUrl);
    const emaData = emaResponse.data['Technical Analysis: EMA'];
    const emaValues = Object.values(emaData).slice(0, 5).map((value: any) => Number(value.EMA));

    // Bollinger Bands
    const bbandsUrl = `https://www.alphavantage.co/query?function=BBANDS&symbol=${symbol}&interval=daily&time_period=20&series_type=close&nbdevup=2&nbdevdn=2&apikey=${ALPHA_VANTAGE_KEY}`;
    const bbandsResponse = await axios.get(bbandsUrl);
    const bbandsData = bbandsResponse.data['Technical Analysis: BBANDS'];
    const latestBbands = Object.values(bbandsData)[0] as any;

    return {
      rsi: Number(latestRsi.RSI),
      macd: {
        macd: Number(latestMacd.MACD),
        signal: Number(latestMacd.MACD_Signal),
        histogram: Number(latestMacd.MACD_Hist)
      },
      sma: smaValues,
      ema: emaValues,
      bbands: {
        upper: Number(latestBbands['Real Upper Band']),
        middle: Number(latestBbands['Real Middle Band']),
        lower: Number(latestBbands['Real Lower Band'])
      }
    };
  } catch (error) {
    console.error('Erro ao buscar indicadores técnicos:', error);
    throw error;
  }
}

function calculateTechnicalSignal(data: any): string {
  // Implementar lógica de sinal técnico baseado nos dados
  const price = data.c;
  const previousClose = data.pc;
  const high = data.h;
  const low = data.l;

  if (price > previousClose * 1.02) return 'Compra Forte';
  if (price > previousClose) return 'Compra';
  if (price < previousClose * 0.98) return 'Venda Forte';
  if (price < previousClose) return 'Venda';
  return 'Neutro';
}

function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['alta', 'crescimento', 'lucro', 'positivo', 'subir', 'ganho'];
  const negativeWords = ['queda', 'perda', 'negativo', 'cair', 'risco', 'prejuízo'];

  const textLower = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach(word => {
    if (textLower.includes(word)) positiveCount++;
  });

  negativeWords.forEach(word => {
    if (textLower.includes(word)) negativeCount++;
  });

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function calculateNewsImpact(article: any): number {
  const publishedDate = new Date(article.publishedAt);
  const hoursSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
  
  // Impacto diminui com o tempo
  let impact = 1 - (hoursSincePublished / 24);
  impact = Math.max(0.1, Math.min(1, impact));

  // Ajusta impacto baseado na fonte
  const majorSources = ['Reuters', 'Bloomberg', 'Financial Times', 'Wall Street Journal'];
  if (majorSources.includes(article.source.name)) {
    impact *= 1.5;
  }

  return Number(impact.toFixed(2));
}

export async function generateOptimalPortfolio(
  riskLevel: 'BAIXO' | 'MÉDIO' | 'ALTO',
  initialAmount: number,
  stocksAllocation: number,
  cryptoAllocation: number,
  investmentTerm: number,
  preferredAssets: string[]
) {
  // Implementação da geração de carteira otimizada
  // Será implementada no próximo passo
} 
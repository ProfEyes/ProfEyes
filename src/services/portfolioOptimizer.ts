import { getStockData, getMarketNews, getTechnicalIndicators } from './marketAnalysis';
import axios from 'axios';

interface Asset {
  symbol: string;
  type: 'ACAO' | 'CRIPTO';
  weight: number;
  price: number;
  recommendation: string;
  technicalScore: number;
  fundamentalScore: number;
  sentimentScore: number;
  totalScore: number;
}

interface PortfolioSuggestion {
  assets: Asset[];
  expectedReturn: number;
  risk: number;
  sharpeRatio: number;
  rebalanceFrequency: string;
  nextRebalanceDate: Date;
}

interface OptimizedPortfolio {
  assets: Asset[];
  expectedReturn: number;
  risk: number;
}

// Lista de ações brasileiras por setor
const BRAZILIAN_STOCKS = {
  technology: ['TOTS3', 'LWSA3', 'CASH3', 'IFCM3'],
  finance: ['ITUB4', 'BBDC4', 'B3SA3', 'BBAS3', 'CIEL3'],
  commodities: ['VALE3', 'PETR4', 'SUZB3', 'KLBN11'],
  utilities: ['ELET3', 'ENGI11', 'TAEE11', 'SBSP3'],
  consumer: ['ABEV3', 'LREN3', 'MGLU3', 'VVAR3'],
  industrial: ['WEGE3', 'EMBR3', 'CCRO3', 'RAIL3'],
  real_estate: ['BRML3', 'MULT3', 'IGTI11', 'HGRE11']
};

// Pesos dos critérios por perfil de risco
const RISK_WEIGHTS = {
  BAIXO: {
    dividend: 0.3,
    volatility: 0.3,
    fundamentals: 0.2,
    technical: 0.1,
    sentiment: 0.1
  },
  MÉDIO: {
    dividend: 0.2,
    volatility: 0.2,
    fundamentals: 0.2,
    technical: 0.2,
    sentiment: 0.2
  },
  ALTO: {
    dividend: 0.1,
    volatility: 0.1,
    fundamentals: 0.2,
    technical: 0.3,
    sentiment: 0.3
  }
};

// Lista de ações brasileiras para incluir na carteira
const brazilianStocks = [
  { symbol: 'PETR4', sector: 'Petróleo', description: 'Petrobras' },
  { symbol: 'VALE3', sector: 'Mineração', description: 'Vale' },
  { symbol: 'ITUB4', sector: 'Financeiro', description: 'Itaú Unibanco' },
  { symbol: 'BBDC4', sector: 'Financeiro', description: 'Bradesco' },
  { symbol: 'ABEV3', sector: 'Bebidas', description: 'Ambev' },
  { symbol: 'WEGE3', sector: 'Industrial', description: 'Weg' },
  { symbol: 'RENT3', sector: 'Locação', description: 'Localiza' },
  { symbol: 'EQTL3', sector: 'Energia', description: 'Equatorial' },
  { symbol: 'RADL3', sector: 'Farmacêutico', description: 'Raia Drogasil' },
  { symbol: 'EGIE3', sector: 'Energia', description: 'Engie Brasil' },
  { symbol: 'BBAS3', sector: 'Financeiro', description: 'Banco do Brasil' },
  { symbol: 'MGLU3', sector: 'Varejo', description: 'Magazine Luiza' },
  { symbol: 'PRIO3', sector: 'Petróleo', description: 'PetroRio' },
  { symbol: 'VBBR3', sector: 'Alimentício', description: 'Vibra Energia' },
  { symbol: 'RAIL3', sector: 'Transporte', description: 'Rumo' },
  { symbol: 'HYPE3', sector: 'Saúde', description: 'Hypera' },
  { symbol: 'ENEV3', sector: 'Energia', description: 'Eneva' },
  { symbol: 'GOAU4', sector: 'Siderurgia', description: 'Gerdau' },
  { symbol: 'TOTS3', sector: 'Tecnologia', description: 'Totvs' },
  { symbol: 'LREN3', sector: 'Varejo', description: 'Lojas Renner' },
  { symbol: 'CSAN3', sector: 'Combustíveis', description: 'Cosan' },
  { symbol: 'NTCO3', sector: 'Cosméticos', description: 'Natura' },
  { symbol: 'CIEL3', sector: 'Pagamentos', description: 'Cielo' },
  { symbol: 'SBSP3', sector: 'Saneamento', description: 'Sabesp' },
  { symbol: 'CCRO3', sector: 'Concessões', description: 'CCR' }
];

// Lista de criptomoedas para incluir na carteira
const cryptoAssets = [
  { symbol: 'BTC', description: 'Bitcoin' },
  { symbol: 'ETH', description: 'Ethereum' },
  { symbol: 'BNB', description: 'Binance Coin' },
  { symbol: 'SOL', description: 'Solana' },
  { symbol: 'ADA', description: 'Cardano' },
  { symbol: 'XRP', description: 'Ripple' },
  { symbol: 'DOT', description: 'Polkadot' },
  { symbol: 'AVAX', description: 'Avalanche' },
  { symbol: 'DOGE', description: 'Dogecoin' },
  { symbol: 'MATIC', description: 'Polygon' },
  { symbol: 'LINK', description: 'Chainlink' },
  { symbol: 'UNI', description: 'Uniswap' },
  { symbol: 'ATOM', description: 'Cosmos' },
  { symbol: 'FIL', description: 'Filecoin' },
  { symbol: 'AAVE', description: 'Aave' }
];

// Geração de preços simulados para ações
function generateStockPrice(ticker: string): number {
  // Preços simulados, baseados em médias reais
  const basePrice = {
    'PETR4': 35.75, 'VALE3': 68.90, 'ITUB4': 32.45, 'BBDC4': 18.75, 'ABEV3': 14.25,
    'WEGE3': 42.30, 'RENT3': 55.80, 'EQTL3': 23.45, 'RADL3': 22.15, 'EGIE3': 42.10,
    'BBAS3': 54.25, 'MGLU3': 4.35, 'PRIO3': 47.90, 'VBBR3': 18.65, 'RAIL3': 16.45,
    'HYPE3': 35.60, 'ENEV3': 14.70, 'GOAU4': 12.85, 'TOTS3': 28.95, 'LREN3': 27.35,
    'CSAN3': 49.15, 'NTCO3': 18.40, 'CIEL3': 4.25, 'SBSP3': 57.80, 'CCRO3': 12.95
  }[ticker] || 25.0;
  
  // Adiciona uma pequena variação aleatória
  return basePrice * (0.95 + Math.random() * 0.1);
}

// Geração de preços simulados para criptomoedas
function generateCryptoPrice(symbol: string): number {
  // Preços simulados, baseados em médias reais
  const basePrice = {
    'BTC': 65000, 'ETH': 3500, 'BNB': 560, 'SOL': 145, 'ADA': 0.45,
    'XRP': 0.55, 'DOT': 7.25, 'AVAX': 35.80, 'DOGE': 0.12, 'MATIC': 0.85,
    'LINK': 15.75, 'UNI': 9.45, 'ATOM': 8.75, 'FIL': 5.25, 'AAVE': 95.50
  }[symbol] || 100.0;
  
  // Adiciona uma pequena variação aleatória
  return basePrice * (0.97 + Math.random() * 0.06);
}

export async function generateOptimalPortfolio(
  riskLevel: string,
  initialAmount: number,
  stocksAllocation: number,
  cryptoAllocation: number,
  investmentTerm: number,
  preferredAssets: string[]
): Promise<OptimizedPortfolio> {
  try {
    // Determinar quantos ativos incluir com base no valor investido
    let baseAssetCount = 15; // Mínimo de 15 ativos
    let additionalAssets = 0;
    
    // Adicionar mais ativos com base no valor investido
    if (initialAmount >= 20000) additionalAssets += 3;
    if (initialAmount >= 50000) additionalAssets += 5;
    if (initialAmount >= 100000) additionalAssets += 7;
    
    const totalAssetCount = baseAssetCount + additionalAssets;
    
    // Determinar a proporção de ações e criptomoedas
    const stockCount = Math.max(5, Math.floor((stocksAllocation / 100) * totalAssetCount));
    const cryptoCount = Math.max(2, totalAssetCount - stockCount);
    
    // Selecionar as ações com base no perfil de risco
    let selectedStocks: Asset[] = [];
    let stockPool = [...brazilianStocks];
    
    // Incluir ativos preferidos primeiro (se forem ações)
    const preferredStocks = preferredAssets.filter(asset => 
      brazilianStocks.some(stock => stock.symbol === asset)
    );
    
    for (const preferredSymbol of preferredStocks) {
      const stockInfo = brazilianStocks.find(s => s.symbol === preferredSymbol);
      if (stockInfo && selectedStocks.length < stockCount) {
        selectedStocks.push({
          symbol: stockInfo.symbol,
          price: generateStockPrice(stockInfo.symbol),
          weight: 0, // Será calculado depois
          type: 'STOCK'
        });
        // Remover do pool para evitar duplicatas
        stockPool = stockPool.filter(s => s.symbol !== preferredSymbol);
      }
    }
    
    // Complementar com outras ações até atingir o número desejado
    while (selectedStocks.length < stockCount && stockPool.length > 0) {
      const randomIndex = Math.floor(Math.random() * stockPool.length);
      const stockInfo = stockPool[randomIndex];
      
      selectedStocks.push({
        symbol: stockInfo.symbol,
        price: generateStockPrice(stockInfo.symbol),
        weight: 0, // Será calculado depois
        type: 'STOCK'
      });
      
      // Remover do pool para evitar duplicatas
      stockPool.splice(randomIndex, 1);
    }
    
    // Selecionar as criptomoedas
    let selectedCryptos: Asset[] = [];
    let cryptoPool = [...cryptoAssets];
    
    // Incluir criptomoedas preferidas primeiro
    const preferredCryptos = preferredAssets.filter(asset => 
      cryptoAssets.some(crypto => crypto.symbol === asset)
    );
    
    for (const preferredSymbol of preferredCryptos) {
      const cryptoInfo = cryptoAssets.find(c => c.symbol === preferredSymbol);
      if (cryptoInfo && selectedCryptos.length < cryptoCount) {
        selectedCryptos.push({
          symbol: cryptoInfo.symbol,
          price: generateCryptoPrice(cryptoInfo.symbol),
          weight: 0, // Será calculado depois
          type: 'CRYPTO'
        });
        // Remover do pool para evitar duplicatas
        cryptoPool = cryptoPool.filter(c => c.symbol !== preferredSymbol);
      }
    }
    
    // Complementar com outras criptomoedas até atingir o número desejado
    while (selectedCryptos.length < cryptoCount && cryptoPool.length > 0) {
      const randomIndex = Math.floor(Math.random() * cryptoPool.length);
      const cryptoInfo = cryptoPool[randomIndex];
      
      selectedCryptos.push({
        symbol: cryptoInfo.symbol,
        price: generateCryptoPrice(cryptoInfo.symbol),
        weight: 0, // Será calculado depois
        type: 'CRYPTO'
      });
      
      // Remover do pool para evitar duplicatas
      cryptoPool.splice(randomIndex, 1);
    }
    
    // Combinar todos os ativos
    let allAssets = [...selectedStocks, ...selectedCryptos];
    
    // Ajustar pesos com base no perfil de risco e alocações definidas
    const stockWeight = stocksAllocation / 100;
    const cryptoWeight = cryptoAllocation / 100;
    
    // Distribuição de pesos para ações
    if (selectedStocks.length > 0) {
      // Distribuição baseada no perfil de risco
      let stockWeights: number[] = [];
      
      if (riskLevel === 'BAIXO') {
        // Perfil conservador: maior peso para blue chips
        const blueChips = ['PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'BBAS3'];
        for (let i = 0; i < selectedStocks.length; i++) {
          if (blueChips.includes(selectedStocks[i].symbol)) {
            stockWeights.push(1.5); // Maior peso para blue chips
          } else {
            stockWeights.push(0.7); // Menor peso para outros
          }
        }
      } else if (riskLevel === 'MÉDIO') {
        // Perfil moderado: distribuição mais equilibrada
        for (let i = 0; i < selectedStocks.length; i++) {
          stockWeights.push(1.0 + (Math.random() * 0.3 - 0.15)); // Variação pequena
        }
      } else {
        // Perfil agressivo: mais peso para small caps
        const smallCaps = ['MGLU3', 'PRIO3', 'TOTS3', 'CIEL3', 'ENEV3'];
        for (let i = 0; i < selectedStocks.length; i++) {
          if (smallCaps.includes(selectedStocks[i].symbol)) {
            stockWeights.push(1.4); // Maior peso para small caps
          } else {
            stockWeights.push(0.8); // Menor peso para blue chips
          }
        }
      }
      
      // Normalizar pesos
      const totalStockWeight = stockWeights.reduce((sum, w) => sum + w, 0);
      for (let i = 0; i < selectedStocks.length; i++) {
        selectedStocks[i].weight = (stockWeights[i] / totalStockWeight) * stockWeight;
      }
    }
    
    // Distribuição de pesos para criptomoedas
    if (selectedCryptos.length > 0) {
      // Distribuição baseada no perfil de risco
      let cryptoWeights: number[] = [];
      
      if (riskLevel === 'BAIXO') {
        // Perfil conservador: maior peso para criptomoedas estabelecidas
        const establishedCryptos = ['BTC', 'ETH'];
        for (let i = 0; i < selectedCryptos.length; i++) {
          if (establishedCryptos.includes(selectedCryptos[i].symbol)) {
            cryptoWeights.push(2.0); // Muito maior peso para BTC e ETH
          } else {
            cryptoWeights.push(0.5); // Bem menor peso para altcoins
          }
        }
      } else if (riskLevel === 'MÉDIO') {
        // Perfil moderado: distribuição mais equilibrada
        const majorCryptos = ['BTC', 'ETH', 'BNB', 'SOL'];
        for (let i = 0; i < selectedCryptos.length; i++) {
          if (majorCryptos.includes(selectedCryptos[i].symbol)) {
            cryptoWeights.push(1.3); // Maior peso para grandes criptos
          } else {
            cryptoWeights.push(0.8); // Menor peso para altcoins
          }
        }
      } else {
        // Perfil agressivo: distribuição mais arriscada
        for (let i = 0; i < selectedCryptos.length; i++) {
          if (selectedCryptos[i].symbol === 'BTC') {
            cryptoWeights.push(1.0); // Peso normal para BTC
          } else if (selectedCryptos[i].symbol === 'ETH') {
            cryptoWeights.push(1.1); // Peso um pouco maior para ETH
          } else {
            cryptoWeights.push(1.0 + Math.random() * 0.5); // Mais peso para altcoins
          }
        }
      }
      
      // Normalizar pesos
      const totalCryptoWeight = cryptoWeights.reduce((sum, w) => sum + w, 0);
      for (let i = 0; i < selectedCryptos.length; i++) {
        selectedCryptos[i].weight = (cryptoWeights[i] / totalCryptoWeight) * cryptoWeight;
      }
    }
    
    // Recalcular allAssets com os pesos atualizados
    allAssets = [...selectedStocks, ...selectedCryptos];
    
    // Calcula retorno esperado baseado no perfil de risco
    const expectedReturn = {
      'BAIXO': 0.08,
      'MÉDIO': 0.12,
      'ALTO': 0.18
    }[riskLevel] || 0.12;

    return {
      assets: allAssets,
      expectedReturn,
      risk: expectedReturn * 0.6 // Simulação simples de risco
    };
  } catch (error) {
    console.error('Erro ao gerar portfólio otimizado:', error);
    throw new Error('Não foi possível gerar o portfólio no momento. Tente novamente mais tarde.');
  }
}

async function selectStocksByRiskProfile(riskLevel: 'BAIXO' | 'MÉDIO' | 'ALTO', allocation: number): Promise<string[]> {
  const stocks: string[] = [];
  
  switch (riskLevel) {
    case 'BAIXO':
      // Foco em blue chips e empresas com dividendos
      stocks.push(...BRAZILIAN_STOCKS.utilities.slice(0, 2));
      stocks.push(...BRAZILIAN_STOCKS.finance.slice(0, 2));
      stocks.push(...BRAZILIAN_STOCKS.commodities.slice(0, 1));
      break;
    
    case 'MÉDIO':
      // Mix balanceado
      stocks.push(...BRAZILIAN_STOCKS.technology.slice(0, 1));
      stocks.push(...BRAZILIAN_STOCKS.finance.slice(0, 2));
      stocks.push(...BRAZILIAN_STOCKS.consumer.slice(0, 2));
      stocks.push(...BRAZILIAN_STOCKS.industrial.slice(0, 1));
      break;
    
    case 'ALTO':
      // Foco em crescimento e tecnologia
      stocks.push(...BRAZILIAN_STOCKS.technology.slice(0, 2));
      stocks.push(...BRAZILIAN_STOCKS.consumer.slice(0, 2));
      stocks.push(...BRAZILIAN_STOCKS.industrial.slice(0, 2));
      break;
  }
  
  return stocks;
}

async function analyzeFundamentals(stocks: string[]): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  
  for (const symbol of stocks) {
    const data = await getStockData(symbol);
    
    // Calcular pontuação fundamentalista (0-100)
    let score = 0;
    
    // P/L
    if (data.pe > 0 && data.pe < 15) score += 20;
    else if (data.pe >= 15 && data.pe < 25) score += 10;
    
    // Dividend Yield
    if (data.dividendYield > 6) score += 20;
    else if (data.dividendYield > 4) score += 15;
    else if (data.dividendYield > 2) score += 10;
    
    // Beta (volatilidade em relação ao mercado)
    if (data.beta < 0.8) score += 20;
    else if (data.beta < 1.2) score += 15;
    else if (data.beta < 1.5) score += 10;
    
    // Capitalização de mercado
    if (data.marketCap > 100e9) score += 20;
    else if (data.marketCap > 10e9) score += 15;
    else if (data.marketCap > 1e9) score += 10;
    
    // Recomendação de analistas
    if (data.analystRating === 'Compra Forte') score += 20;
    else if (data.analystRating === 'Compra') score += 15;
    else if (data.analystRating === 'Neutro') score += 10;
    
    scores.set(symbol, score);
  }
  
  return scores;
}

async function analyzeTechnicalIndicators(stocks: string[]): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  
  for (const symbol of stocks) {
    const indicators = await getTechnicalIndicators(symbol);
    
    // Calcular pontuação técnica (0-100)
    let score = 0;
    
    // RSI
    if (indicators.rsi > 30 && indicators.rsi < 70) score += 20;
    else if (indicators.rsi > 40 && indicators.rsi < 60) score += 15;
    
    // MACD
    if (indicators.macd.histogram > 0 && indicators.macd.macd > indicators.macd.signal) score += 20;
    else if (indicators.macd.histogram > 0) score += 15;
    
    // Bollinger Bands
    const price = (await getStockData(symbol)).price;
    if (price > indicators.bbands.lower && price < indicators.bbands.middle) score += 20;
    else if (price > indicators.bbands.middle && price < indicators.bbands.upper) score += 15;
    
    // Médias Móveis
    if (indicators.ema[0] > indicators.sma[0]) score += 20;
    
    // Tendência
    const trendUp = indicators.ema.every((value, index, array) => 
      index === 0 || value >= array[index - 1]
    );
    if (trendUp) score += 20;
    
    scores.set(symbol, score);
  }
  
  return scores;
}

async function analyzeSentiment(stocks: string[]): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  const news = await getMarketNews(stocks);
  
  // Agrupar notícias por ativo
  const newsPerStock = new Map<string, any[]>();
  stocks.forEach(symbol => {
    const stockNews = news.filter(n => 
      n.title.includes(symbol) || 
      (n.title.includes(getCompanyName(symbol)))
    );
    newsPerStock.set(symbol, stockNews);
  });
  
  // Calcular pontuação de sentimento para cada ativo
  for (const [symbol, stockNews] of newsPerStock) {
    let score = 50; // Pontuação base neutra
    
    stockNews.forEach(news => {
      if (news.sentiment === 'positive') {
        score += 10 * news.impact;
      } else if (news.sentiment === 'negative') {
        score -= 10 * news.impact;
      }
    });
    
    // Normalizar score entre 0 e 100
    score = Math.max(0, Math.min(100, score));
    scores.set(symbol, score);
  }
  
  return scores;
}

function optimizeWeights(
  stocks: string[],
  fundamentalScores: Map<string, number>,
  technicalScores: Map<string, number>,
  sentimentScores: Map<string, number>,
  riskLevel: 'BAIXO' | 'MÉDIO' | 'ALTO',
  initialAmount: number,
  stocksAllocation: number
): Asset[] {
  const weights = RISK_WEIGHTS[riskLevel];
  const portfolio: Asset[] = [];
  
  for (const symbol of stocks) {
    const fundamentalScore = fundamentalScores.get(symbol) || 0;
    const technicalScore = technicalScores.get(symbol) || 0;
    const sentimentScore = sentimentScores.get(symbol) || 0;
    
    const totalScore = 
      (fundamentalScore * weights.fundamentals) +
      (technicalScore * weights.technical) +
      (sentimentScore * weights.sentiment);
    
    portfolio.push({
      symbol,
      type: 'ACAO',
      weight: 0, // Será calculado depois
      price: 0, // Será atualizado com dados reais
      recommendation: getRecommendation(totalScore),
      technicalScore,
      fundamentalScore,
      sentimentScore,
      totalScore
    });
  }
  
  // Ordenar por pontuação total
  portfolio.sort((a, b) => b.totalScore - a.totalScore);
  
  // Distribuir pesos baseado nas pontuações
  const totalScore = portfolio.reduce((sum, asset) => sum + asset.totalScore, 0);
  portfolio.forEach(asset => {
    asset.weight = (asset.totalScore / totalScore) * stocksAllocation;
  });
  
  return portfolio;
}

function calculatePortfolioMetrics(portfolio: Asset[]) {
  // Implementar cálculos de retorno esperado, risco e Sharpe ratio
  const riskFreeRate = 0.1075; // Taxa Selic atual
  const expectedReturn = portfolio.reduce((sum, asset) => {
    return sum + (asset.weight * getExpectedReturn(asset));
  }, 0);
  
  const risk = calculatePortfolioRisk(portfolio);
  const sharpeRatio = (expectedReturn - riskFreeRate) / risk;
  
  return {
    expectedReturn,
    risk,
    sharpeRatio
  };
}

function getExpectedReturn(asset: Asset): number {
  // Estimativa simplificada baseada nos scores
  const baseReturn = 0.12; // 12% ao ano
  const scoreAdjustment = (asset.totalScore - 50) / 100;
  return baseReturn + scoreAdjustment;
}

function calculatePortfolioRisk(portfolio: Asset[]): number {
  // Implementação simplificada do risco do portfólio
  return Math.sqrt(
    portfolio.reduce((sum, asset) => {
      const assetRisk = asset.weight * (1 - asset.fundamentalScore / 100);
      return sum + assetRisk * assetRisk;
    }, 0)
  );
}

function determineRebalanceFrequency(riskLevel: 'BAIXO' | 'MÉDIO' | 'ALTO'): string {
  switch (riskLevel) {
    case 'BAIXO':
      return 'TRIMESTRAL';
    case 'MÉDIO':
      return 'MENSAL';
    case 'ALTO':
      return 'SEMANAL';
  }
}

function calculateNextRebalanceDate(riskLevel: 'BAIXO' | 'MÉDIO' | 'ALTO'): Date {
  const today = new Date();
  switch (riskLevel) {
    case 'BAIXO':
      return new Date(today.setMonth(today.getMonth() + 3));
    case 'MÉDIO':
      return new Date(today.setMonth(today.getMonth() + 1));
    case 'ALTO':
      return new Date(today.setDate(today.getDate() + 7));
  }
}

function getRecommendation(score: number): string {
  if (score >= 80) return 'Compra Forte';
  if (score >= 60) return 'Compra';
  if (score >= 40) return 'Neutro';
  if (score >= 20) return 'Venda';
  return 'Venda Forte';
}

function getCompanyName(symbol: string): string {
  // Mapeamento de símbolos para nomes de empresas
  const companies: { [key: string]: string } = {
    'PETR4': 'Petrobras',
    'VALE3': 'Vale',
    'ITUB4': 'Itaú',
    'BBDC4': 'Bradesco',
    'WEGE3': 'WEG',
    // Adicionar mais empresas conforme necessário
  };
  return companies[symbol] || symbol;
} 
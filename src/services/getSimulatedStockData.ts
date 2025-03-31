// Serviço para gerar dados simulados de ações e indicadores técnicos
// Este arquivo substitui as chamadas à API da Alpha Vantage por dados simulados

// Interfaces
interface AlphaVantageQuote {
  symbol: string;
  price: number;
  volume: number;
  timestamp: string;
}

interface HistoricalData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicator {
  timestamp: string;
  value: number;
}

// Dados simulados de preços de ações
const SIMULATED_STOCKS: Record<string, {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}> = {
  // Ações dos EUA
  'AAPL': { price: 187.75, change: 1.25, changePercent: 0.67, volume: 78500000 },
  'MSFT': { price: 417.55, change: 2.32, changePercent: 0.56, volume: 32000000 },
  'GOOGL': { price: 171.48, change: -0.53, changePercent: -0.31, volume: 28500000 },
  'AMZN': { price: 179.62, change: 1.08, changePercent: 0.61, volume: 45250000 },
  'META': { price: 471.24, change: 3.78, changePercent: 0.81, volume: 27800000 },
  'TSLA': { price: 224.30, change: -1.65, changePercent: -0.73, volume: 68900000 },
  'NVDA': { price: 103.49, change: 0.84, changePercent: 0.82, volume: 98700000 },
  'DIS': { price: 98.37, change: -0.12, changePercent: -0.12, volume: 12500000 },
  
  // Ações brasileiras (formato do Alpha Vantage para B3)
  'PETR4.SAO': { price: 32.84, change: 0.34, changePercent: 1.05, volume: 45800000 },
  'VALE3.SAO': { price: 66.38, change: -0.42, changePercent: -0.63, volume: 38600000 },
  'ITUB4.SAO': { price: 31.53, change: 0.17, changePercent: 0.54, volume: 32400000 },
  'BBDC4.SAO': { price: 22.61, change: 0.09, changePercent: 0.40, volume: 28700000 },
  'ABEV3.SAO': { price: 13.92, change: 0.03, changePercent: 0.22, volume: 25300000 },
  'WEGE3.SAO': { price: 42.30, change: 0.66, changePercent: 1.59, volume: 12800000 }
};

// Funções para gerar variações aleatórias nos preços
function getRandomPriceVariation(basePrice: number): number {
  // Variação entre -0.5% e +0.5%
  const variationPercent = (Math.random() * 1) - 0.5;
  return basePrice * (1 + variationPercent / 100);
}

// Função para retornar a data atual formatada
function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // Formato YYYY-MM-DD
}

// Obter cotação de ação
export async function fetchStockQuote(symbol: string): Promise<AlphaVantageQuote> {
  // Verificar se o símbolo existe na nossa lista
  if (!SIMULATED_STOCKS[symbol]) {
    SIMULATED_STOCKS[symbol] = {
      price: 100.00,
      change: 0.00,
      changePercent: 0.00,
      volume: 10000000
    };
  }
  
  // Buscar dados do símbolo
  const stockData = SIMULATED_STOCKS[symbol];
  
  // Criar pequena variação aleatória no preço
  const currentPrice = getRandomPriceVariation(stockData.price);
  
  // Atualizar o preço simulado para a próxima chamada
  const priceChange = currentPrice - stockData.price;
  const changePercent = (priceChange / stockData.price) * 100;
  SIMULATED_STOCKS[symbol] = {
    ...stockData,
    price: currentPrice,
    change: priceChange,
    changePercent: changePercent
  };
  
  return {
    symbol: symbol,
    price: currentPrice,
    volume: stockData.volume + Math.floor(Math.random() * 1000000 - 500000),
    timestamp: getCurrentDate()
  };
}

// Gerar dados históricos simulados
export async function fetchHistoricalData(
  symbol: string,
  interval: string = 'daily',
  outputsize: string = 'compact'
): Promise<HistoricalData[]> {
  // Verificar se o símbolo existe na nossa lista
  if (!SIMULATED_STOCKS[symbol]) {
    SIMULATED_STOCKS[symbol] = {
      price: 100.00,
      change: 0.00,
      changePercent: 0.00,
      volume: 10000000
    };
  }
  
  const basePrice = SIMULATED_STOCKS[symbol].price;
  const result: HistoricalData[] = [];
  
  // Determinar o número de pontos de dados com base no outputsize
  const numPoints = outputsize === 'full' ? 500 : 100;
  
  // Determinar o intervalo de tempo com base no parâmetro interval
  let timeStep = 24 * 60 * 60 * 1000; // 1 dia em milissegundos (padrão para 'daily')
  
  if (interval === 'weekly') {
    timeStep = 7 * timeStep;
  } else if (interval === 'monthly') {
    timeStep = 30 * timeStep;
  } else if (interval.includes('min')) {
    const minutes = parseInt(interval.replace('min', ''));
    timeStep = minutes * 60 * 1000;
  }
  
  // Gerar dados históricos simulados
  let currentPrice = basePrice;
  const now = new Date().getTime();
  
  for (let i = numPoints - 1; i >= 0; i--) {
    const timestamp = new Date(now - i * timeStep);
    const dateStr = timestamp.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    // Gerar variação de preço para este ponto
    const variation = (Math.random() * 2 - 1) * (basePrice * 0.02);
    currentPrice += variation;
    
    // Garantir que o preço não seja negativo
    if (currentPrice <= 0) currentPrice = basePrice * 0.1;
    
    // Gerar valores OHLC
    const open = currentPrice;
    const high = open * (1 + Math.random() * 0.02);
    const low = open * (1 - Math.random() * 0.02);
    const close = low + Math.random() * (high - low);
    
    // Gerar volume
    const baseVolume = SIMULATED_STOCKS[symbol].volume;
    const volume = Math.floor(baseVolume * (0.8 + Math.random() * 0.4));
    
    result.push({
      timestamp: dateStr,
      open: open,
      high: high,
      low: low,
      close: close,
      volume: volume
    });
  }
  
  return result;
}

// Gerar dados de indicadores técnicos simulados
export async function fetchTechnicalIndicator(
  symbol: string,
  indicator: string,
  interval: string = 'daily'
): Promise<TechnicalIndicator[]> {
  // Verificar se o símbolo existe
  if (!SIMULATED_STOCKS[symbol]) {
    SIMULATED_STOCKS[symbol] = {
      price: 100.00,
      change: 0.00,
      changePercent: 0.00,
      volume: 10000000
    };
  }
  
  const result: TechnicalIndicator[] = [];
  const numPoints = 100; // Retornar 100 pontos de dados
  
  // Determinar o intervalo de tempo
  let timeStep = 24 * 60 * 60 * 1000; // 1 dia em milissegundos (padrão para 'daily')
  
  if (interval === 'weekly') {
    timeStep = 7 * timeStep;
  } else if (interval === 'monthly') {
    timeStep = 30 * timeStep;
  } else if (interval.includes('min')) {
    const minutes = parseInt(interval.replace('min', ''));
    timeStep = minutes * 60 * 1000;
  }
  
  // Valores base para diferentes indicadores
  let baseValue = 50; // Valor padrão
  let variationRange = 10; // Variação padrão
  
  // Ajustar valores base e variação com base no indicador
  switch (indicator) {
    case 'RSI':
      baseValue = 50;
      variationRange = 15;
      break;
    case 'MACD':
      baseValue = 0;
      variationRange = 2;
      break;
    case 'ADX':
      baseValue = 25;
      variationRange = 10;
      break;
    case 'CCI':
      baseValue = 0;
      variationRange = 100;
      break;
    default:
      baseValue = 50;
      variationRange = 10;
  }
  
  // Gerar valores do indicador
  let currentValue = baseValue;
  const now = new Date().getTime();
  
  for (let i = numPoints - 1; i >= 0; i--) {
    const timestamp = new Date(now - i * timeStep);
    const dateStr = timestamp.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    // Gerar uma variação aleatória para o indicador
    const variation = (Math.random() * 2 - 1) * (variationRange * 0.2);
    currentValue += variation;
    
    // Limitar os valores dentro de intervalos específicos para cada indicador
    if (indicator === 'RSI') {
      currentValue = Math.max(0, Math.min(100, currentValue));
    } else if (indicator === 'ADX') {
      currentValue = Math.max(0, Math.min(100, currentValue));
    }
    
    result.push({
      timestamp: dateStr,
      value: currentValue
    });
  }
  
  return result;
}

// Gerar dados de visão geral da empresa simulados
export async function fetchCompanyOverview(symbol: string): Promise<any> {
  // Dados base para empresas
  const companyData: Record<string, any> = {
    'AAPL': {
      Symbol: 'AAPL',
      AssetType: 'Common Stock',
      Name: 'Apple Inc',
      Description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
      Exchange: 'NASDAQ',
      Currency: 'USD',
      Country: 'USA',
      Sector: 'Technology',
      Industry: 'Consumer Electronics',
      MarketCapitalization: '2952826380000',
      EBITDA: '129919000000',
      PERatio: '31.47',
      PEGRatio: '2.82',
      DividendYield: '0.0051',
      EPS: '6.42',
      RevenuePerShareTTM: '28.97',
      ProfitMargin: '0.218',
      OperatingMarginTTM: '0.296',
      ReturnOnAssetsTTM: '0.218',
      ReturnOnEquityTTM: '1.62',
      RevenueTTM: '383932000000',
      GrossProfitTTM: '170782000000',
      DilutedEPSTTM: '6.42',
      QuarterlyEarningsGrowthYOY: '0.106',
      QuarterlyRevenueGrowthYOY: '0.079',
      AnalystTargetPrice: '220.95',
      TrailingPE: '31.47',
      ForwardPE: '28.92',
      PriceToSalesRatioTTM: '7.77',
      PriceToBookRatio: '45.32',
      EVToRevenue: '7.97',
      EVToEBITDA: '22.92',
      Beta: '1.31',
      '52WeekHigh': '202.56',
      '52WeekLow': '124.17',
      '50DayMovingAverage': '182.47',
      '200DayMovingAverage': '170.98',
      SharesOutstanding: '15484200000',
      DividendDate: '2024-02-15',
      ExDividendDate: '2024-02-09'
    },
    'default': {
      Symbol: symbol,
      AssetType: 'Common Stock',
      Name: `${symbol} Corporation`,
      Description: `${symbol} is a company that operates in its industry.`,
      Exchange: 'NASDAQ',
      Currency: 'USD',
      Country: 'USA',
      Sector: 'Technology',
      Industry: 'Software',
      MarketCapitalization: '50000000000',
      EBITDA: '5000000000',
      PERatio: '20.5',
      PEGRatio: '1.8',
      DividendYield: '0.015',
      EPS: '4.87',
      RevenuePerShareTTM: '25.34',
      ProfitMargin: '0.15',
      OperatingMarginTTM: '0.22',
      ReturnOnAssetsTTM: '0.12',
      ReturnOnEquityTTM: '0.25',
      RevenueTTM: '15000000000',
      GrossProfitTTM: '8000000000',
      DilutedEPSTTM: '4.87',
      QuarterlyEarningsGrowthYOY: '0.08',
      QuarterlyRevenueGrowthYOY: '0.12',
      AnalystTargetPrice: '125.00',
      TrailingPE: '20.5',
      ForwardPE: '18.2',
      PriceToSalesRatioTTM: '3.33',
      PriceToBookRatio: '5.12',
      EVToRevenue: '3.5',
      EVToEBITDA: '15.2',
      Beta: '1.1',
      '52WeekHigh': '130.00',
      '52WeekLow': '80.00',
      '50DayMovingAverage': '105.00',
      '200DayMovingAverage': '95.00',
      SharesOutstanding: '500000000',
      DividendDate: '2024-03-15',
      ExDividendDate: '2024-03-01'
    }
  };
  
  // Retornar dados da empresa se existirem, ou dados padrão
  return Promise.resolve(companyData[symbol] || companyData['default']);
}

// Exportar todas as funções
export default {
  fetchStockQuote,
  fetchHistoricalData,
  fetchTechnicalIndicator,
  fetchCompanyOverview
}; 
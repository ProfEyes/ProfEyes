import { getAlphaVantageApiKey } from './apiKeyManager';

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

export async function fetchStockQuote(symbol: string): Promise<AlphaVantageQuote> {
  try {
    const apiKey = await getAlphaVantageApiKey();
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error('Falha ao buscar cotação');
    }
    
    const data = await response.json();
    
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }
    
    const quote = data['Global Quote'];
    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      volume: parseInt(quote['06. volume']),
      timestamp: quote['07. latest trading day']
    };
  } catch (error) {
    console.error('Erro ao buscar cotação:', error);
    throw error;
  }
}

export async function fetchHistoricalData(
  symbol: string,
  interval: string = 'daily'
): Promise<HistoricalData[]> {
  try {
    const apiKey = await getAlphaVantageApiKey();
    const function_name = interval === 'daily' ? 'TIME_SERIES_DAILY' : 'TIME_SERIES_INTRADAY';
    
    const response = await fetch(
      `https://www.alphavantage.co/query?function=${function_name}&symbol=${symbol}&interval=${interval}&apikey=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error('Falha ao buscar dados históricos');
    }
    
    const data = await response.json();
    
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }
    
    const timeSeriesKey = interval === 'daily' ? 'Time Series (Daily)' : `Time Series (${interval})`;
    const timeSeries = data[timeSeriesKey];
    
    return Object.entries(timeSeries).map(([timestamp, values]: [string, any]) => ({
      timestamp,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'])
    }));
  } catch (error) {
    console.error('Erro ao buscar dados históricos:', error);
    throw error;
  }
}

export async function fetchTechnicalIndicator(
  symbol: string,
  indicator: string,
  interval: string = 'daily'
): Promise<TechnicalIndicator[]> {
  try {
    const apiKey = await getAlphaVantageApiKey();
    
    const response = await fetch(
      `https://www.alphavantage.co/query?function=${indicator}&symbol=${symbol}&interval=${interval}&time_period=14&apikey=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error('Falha ao buscar indicador técnico');
    }
    
    const data = await response.json();
    
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }
    
    const indicatorKey = `Technical Analysis: ${indicator}`;
    const indicatorData = data[indicatorKey];
    
    return Object.entries(indicatorData).map(([timestamp, values]: [string, any]) => ({
      timestamp,
      value: parseFloat(Object.values(values)[0] as string)
    }));
  } catch (error) {
    console.error('Erro ao buscar indicador técnico:', error);
    throw error;
  }
} 
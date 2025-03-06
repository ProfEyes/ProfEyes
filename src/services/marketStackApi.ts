import { apiKeyManager } from './apiKeyManager';

const BASE_URL = 'http://api.marketstack.com/v1';

async function getApiKey(): Promise<string> {
  return await apiKeyManager.getApiKey('marketstack');
}

export async function getMarketStackPrice(symbol: string) {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(
      `${BASE_URL}/eod/latest?access_key=${apiKey}&symbols=${symbol}`
    );
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const quote = data.data[0];
    return {
      symbol: quote.symbol,
      price: quote.close,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      volume: quote.volume,
      date: new Date(quote.date).getTime()
    };
  } catch (error) {
    console.error('Erro ao buscar preço:', error);
    throw error;
  }
}

export async function getMarketStackHistorical(symbol: string, dateFrom?: string, dateTo?: string) {
  try {
    const apiKey = await getApiKey();
    let url = `${BASE_URL}/eod?access_key=${apiKey}&symbols=${symbol}`;
    
    if (dateFrom) url += `&date_from=${dateFrom}`;
    if (dateTo) url += `&date_to=${dateTo}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.data.map((item: any) => ({
      date: new Date(item.date).getTime(),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      symbol: item.symbol
    }));
  } catch (error) {
    console.error('Erro ao buscar dados históricos:', error);
    throw error;
  }
}

export async function getMarketStackIntraday(symbol: string, interval: string = '1min') {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(
      `${BASE_URL}/intraday/latest?access_key=${apiKey}&symbols=${symbol}&interval=${interval}`
    );
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.data.map((item: any) => ({
      date: new Date(item.date).getTime(),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      symbol: item.symbol
    }));
  } catch (error) {
    console.error('Erro ao buscar dados intraday:', error);
    throw error;
  }
}

export async function getMarketStackExchanges() {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(
      `${BASE_URL}/exchanges?access_key=${apiKey}`
    );
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.data;
  } catch (error) {
    console.error('Erro ao buscar exchanges:', error);
    throw error;
  }
} 
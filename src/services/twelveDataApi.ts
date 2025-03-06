import { apiKeyManager } from './apiKeyManager';

const BASE_URL = 'https://api.twelvedata.com';

async function getApiKey(): Promise<string> {
  return await apiKeyManager.getApiKey('twelvedata');
}

export async function getTwelveDataPrice(symbol: string) {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(
      `${BASE_URL}/price?symbol=${symbol}&apikey=${apiKey}`
    );
    const data = await response.json();

    if (data.code === 400 || data.code === 429) {
      throw new Error(data.message);
    }

    return {
      symbol: data.symbol,
      price: parseFloat(data.price),
      timestamp: new Date(data.timestamp).getTime()
    };
  } catch (error) {
    console.error('Erro ao buscar preço:', error);
    throw error;
  }
}

export async function getTwelveDataTimeSeries(symbol: string, interval: string = '1day', outputsize: number = 30) {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(
      `${BASE_URL}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}`
    );
    const data = await response.json();

    if (data.code === 400 || data.code === 429) {
      throw new Error(data.message);
    }

    return data.values.map((item: any) => ({
      datetime: new Date(item.datetime).getTime(),
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseInt(item.volume)
    }));
  } catch (error) {
    console.error('Erro ao buscar série temporal:', error);
    throw error;
  }
}

export async function getTwelveDataIndicators(symbol: string, indicator: string, interval: string = '1day', params: any = {}) {
  try {
    const apiKey = await getApiKey();
    const queryParams = new URLSearchParams({
      symbol,
      interval,
      apikey: apiKey,
      ...params
    });

    const response = await fetch(
      `${BASE_URL}/${indicator}?${queryParams.toString()}`
    );
    const data = await response.json();

    if (data.code === 400 || data.code === 429) {
      throw new Error(data.message);
    }

    return data.values;
  } catch (error) {
    console.error(`Erro ao buscar indicador ${indicator}:`, error);
    throw error;
  }
}

export async function getTwelveDataQuote(symbol: string) {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(
      `${BASE_URL}/quote?symbol=${symbol}&apikey=${apiKey}`
    );
    const data = await response.json();

    if (data.code === 400 || data.code === 429) {
      throw new Error(data.message);
    }

    return {
      symbol: data.symbol,
      name: data.name,
      exchange: data.exchange,
      currency: data.currency,
      open: parseFloat(data.open),
      high: parseFloat(data.high),
      low: parseFloat(data.low),
      close: parseFloat(data.close),
      volume: parseInt(data.volume),
      previous_close: parseFloat(data.previous_close),
      change: parseFloat(data.change),
      percent_change: parseFloat(data.percent_change),
      timestamp: new Date(data.timestamp).getTime()
    };
  } catch (error) {
    console.error('Erro ao buscar cotação:', error);
    throw error;
  }
} 
import { apiKeyManager } from './apiKeyManager';

const BASE_URL = 'https://api.polygon.io/v2';

async function getApiKey(): Promise<string> {
  return await apiKeyManager.getApiKey('polygon');
}

export async function getPolygonPrice(symbol: string) {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(
      `${BASE_URL}/aggs/ticker/${symbol}/prev?apiKey=${apiKey}`
    );
    const data = await response.json();

    if (data.status === 'ERROR') {
      throw new Error(data.error);
    }

    const result = data.results[0];
    return {
      symbol,
      price: result.c,
      open: result.o,
      high: result.h,
      low: result.l,
      volume: result.v,
      timestamp: result.t
    };
  } catch (error) {
    console.error('Erro ao buscar preço:', error);
    throw error;
  }
}

export async function getPolygonHistorical(symbol: string, from: string, to: string, timespan: string = 'day') {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(
      `${BASE_URL}/aggs/ticker/${symbol}/range/1/${timespan}/${from}/${to}?apiKey=${apiKey}`
    );
    const data = await response.json();

    if (data.status === 'ERROR') {
      throw new Error(data.error);
    }

    return data.results.map((item: any) => ({
      timestamp: item.t,
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
      volume: item.v
    }));
  } catch (error) {
    console.error('Erro ao buscar dados históricos:', error);
    throw error;
  }
}

export async function getPolygonNews(symbol: string, limit: number = 10) {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(
      `${BASE_URL}/reference/news?ticker=${symbol}&limit=${limit}&apiKey=${apiKey}`
    );
    const data = await response.json();

    if (data.status === 'ERROR') {
      throw new Error(data.error);
    }

    return data.results.map((item: any) => ({
      title: item.title,
      author: item.author,
      published_utc: item.published_utc,
      article_url: item.article_url,
      description: item.description,
      keywords: item.keywords,
      source: item.publisher.name,
      tickers: item.tickers
    }));
  } catch (error) {
    console.error('Erro ao buscar notícias:', error);
    throw error;
  }
}

export async function getPolygonDetails(symbol: string) {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(
      `${BASE_URL}/reference/tickers/${symbol}?apiKey=${apiKey}`
    );
    const data = await response.json();

    if (data.status === 'ERROR') {
      throw new Error(data.error);
    }

    return {
      symbol: data.ticker,
      name: data.name,
      market: data.market,
      locale: data.locale,
      currency: data.currency_name,
      type: data.type,
      active: data.active,
      primary_exchange: data.primary_exchange,
      last_updated_utc: data.last_updated_utc
    };
  } catch (error) {
    console.error('Erro ao buscar detalhes:', error);
    throw error;
  }
} 
import { API_KEYS } from './apiKeys';

const BASE_URL = 'http://api.marketstack.com/v1';

// Função para obter a API key do MarketStack
function getApiKey(): string {
  return API_KEYS.MARKET_STACK.API_KEY;
}

export async function getMarketStackPrice(symbol: string) {
  try {
    const apiKey = getApiKey();
    const url = `${BASE_URL}/eod/latest?access_key=${apiKey}&symbols=${symbol}`;
    console.log(`Buscando preço em MarketStack: ${url.replace(apiKey, '***')}`);
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MarketStack Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.data || data.data.length === 0) {
      console.warn(`Nenhum dado encontrado para o símbolo ${symbol}`);
      return null;
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
    console.error('Erro ao buscar preço via MarketStack:', error);
    return null;
  }
}

export async function getMarketStackHistorical(symbol: string, dateFrom?: string, dateTo?: string) {
  try {
    const apiKey = getApiKey();
    let url = `${BASE_URL}/eod?access_key=${apiKey}&symbols=${symbol}`;
    
    if (dateFrom) url += `&date_from=${dateFrom}`;
    if (dateTo) url += `&date_to=${dateTo}`;

    console.log(`Buscando dados históricos em MarketStack: ${url.replace(apiKey, '***')}`);
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MarketStack Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.data || data.data.length === 0) {
      console.warn(`Nenhum dado histórico encontrado para o símbolo ${symbol}`);
      return [];
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
    console.error('Erro ao buscar dados históricos via MarketStack:', error);
    return [];
  }
}

export async function getMarketStackIntraday(symbol: string, interval: string = '1min') {
  try {
    const apiKey = getApiKey();
    const url = `${BASE_URL}/intraday/latest?access_key=${apiKey}&symbols=${symbol}&interval=${interval}`;
    
    console.log(`Buscando dados intraday em MarketStack: ${url.replace(apiKey, '***')}`);
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MarketStack Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.data || data.data.length === 0) {
      console.warn(`Nenhum dado intraday encontrado para o símbolo ${symbol}`);
      return [];
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
    console.error('Erro ao buscar dados intraday via MarketStack:', error);
    return [];
  }
}

export async function getMarketStackExchanges() {
  try {
    const apiKey = getApiKey();
    const url = `${BASE_URL}/exchanges?access_key=${apiKey}`;
    
    console.log(`Buscando exchanges em MarketStack: ${url.replace(apiKey, '***')}`);
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MarketStack Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.data || data.data.length === 0) {
      console.warn('Nenhuma exchange encontrada');
      return [];
    }

    return data.data;
  } catch (error) {
    console.error('Erro ao buscar exchanges via MarketStack:', error);
    return [];
  }
}

// Função para buscar as 10 principais ações 
export async function getMarketStackTopStocks() {
  try {
    // Lista de símbolos populares para verificar
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'BRK.A', 'JNJ', 'V'].join(',');
    
    return await getMarketStackPrice(symbols);
  } catch (error) {
    console.error('Erro ao buscar top stocks via MarketStack:', error);
    return [];
  }
} 
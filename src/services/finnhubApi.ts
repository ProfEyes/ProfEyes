import { API_KEYS } from './apiKeys';

// Função para buscar cotação de ações via Finnhub
export async function fetchStockQuote(symbol: string): Promise<{
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}> {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEYS.FINNHUB.API_KEY}`;
    console.log(`Buscando cotação para ${symbol} em ${url.replace(API_KEYS.FINNHUB.API_KEY, '***')}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || data.error) {
      throw new Error(`Erro Finnhub: ${data.error || 'Dados não encontrados'}`);
    }
    
    const changePercent = (data.c > 0 && data.pc > 0) 
      ? ((data.c - data.pc) / data.pc) * 100 
      : 0;
    
    return {
      price: data.c,                // Preço atual
      change: data.c - data.pc,     // Variação em valor
      changePercent,                // Variação percentual
      high: data.h,                 // Máxima do dia
      low: data.l,                  // Mínima do dia
      open: data.o,                 // Abertura
      previousClose: data.pc        // Fechamento anterior
    };
  } catch (error) {
    console.error(`Erro ao buscar cotação de ${symbol} via Finnhub:`, error);
    throw error;
  }
}

// Função para buscar notícias de empresas
export async function fetchCompanyNews(
  symbol: string, 
  from: string = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
  to: string = new Date().toISOString().split('T')[0]
): Promise<Array<{
  headline: string;
  summary: string;
  url: string;
  source: string;
  datetime: number;
  image: string;
  related: string;
}>> {
  try {
    const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${API_KEYS.FINNHUB.API_KEY}`;
    console.log(`Buscando notícias para ${symbol} de ${from} até ${to} em ${url.replace(API_KEYS.FINNHUB.API_KEY, '***')}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Formato de dados inválido');
    }
    
    return data;
  } catch (error) {
    console.error(`Erro ao buscar notícias para ${symbol}:`, error);
    return []; // Retorna array vazio em vez de lançar erro para evitar interrupção do fluxo
  }
}

// Função para buscar dados financeiros da empresa
export async function fetchCompanyFinancials(symbol: string): Promise<any> {
  try {
    const url = `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${API_KEYS.FINNHUB.API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data || data.error) {
      throw new Error(`Erro Finnhub: ${data.error || 'Dados não encontrados'}`);
    }
    
    return data;
  } catch (error) {
    console.error(`Erro ao buscar dados financeiros de ${symbol}:`, error);
    return null; // Retorna null em vez de lançar erro para evitar interrupção do fluxo
  }
}

// Função para buscar recomendações de analistas
export async function fetchAnalystRecommendations(symbol: string): Promise<any> {
  try {
    const url = `https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${API_KEYS.FINNHUB.API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`Nenhuma recomendação encontrada para ${symbol}`);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error(`Erro ao buscar recomendações de analistas para ${symbol}:`, error);
    return []; // Retorna array vazio em vez de lançar erro para evitar interrupção do fluxo
  }
}

// Função para buscar dados de preço
export async function fetchPriceTarget(symbol: string): Promise<{
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
  lastUpdated: string;
} | null> {
  try {
    const url = `https://finnhub.io/api/v1/stock/price-target?symbol=${symbol}&token=${API_KEYS.FINNHUB.API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data || data.error) {
      throw new Error(`Erro Finnhub: ${data.error || 'Dados não encontrados'}`);
    }
    
    return {
      targetHigh: data.targetHigh,
      targetLow: data.targetLow,
      targetMean: data.targetMean,
      targetMedian: data.targetMedian,
      lastUpdated: data.lastUpdated
    };
  } catch (error) {
    console.error(`Erro ao buscar price target para ${symbol}:`, error);
    return null; // Retorna null em vez de lançar erro para evitar interrupção do fluxo
  }
}

// Função para buscar dados de candles
export async function fetchCandles(
  symbol: string,
  resolution: '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M' = 'D',
  from: number = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000),
  to: number = Math.floor(Date.now() / 1000)
): Promise<{
  timestamps: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
} | null> {
  try {
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${API_KEYS.FINNHUB.API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.s === 'no_data') {
      console.warn(`Nenhum dado de candle encontrado para ${symbol} no período selecionado`);
      return null;
    }
    
    if (data.s !== 'ok' || !data.t || !data.o || !data.h || !data.l || !data.c || !data.v) {
      throw new Error('Dados inválidos recebidos');
    }
    
    return {
      timestamps: data.t,  // Timestamps
      opens: data.o,       // Preços de abertura
      highs: data.h,       // Preços máximos
      lows: data.l,        // Preços mínimos
      closes: data.c,      // Preços de fechamento
      volumes: data.v      // Volumes
    };
  } catch (error) {
    console.error(`Erro ao buscar candles para ${symbol}:`, error);
    return null; // Retorna null em vez de lançar erro para evitar interrupção do fluxo
  }
}

// Função para buscar notícias gerais
export async function fetchMarketNews(category: string = 'general'): Promise<Array<{
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}>> {
  try {
    const url = `https://finnhub.io/api/v1/news?category=${category}&token=${API_KEYS.FINNHUB.API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Formato de dados inválido');
    }
    
    return data;
  } catch (error) {
    console.error(`Erro ao buscar notícias de mercado para categoria ${category}:`, error);
    return []; // Retorna array vazio em vez de lançar erro para evitar interrupção do fluxo
  }
} 
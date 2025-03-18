// API da BrAPI para ações brasileiras
const API_TOKEN = 'tMJ3HDcG2fTBPcxSe7iMBN';
const BASE_URL = 'https://brapi.dev/api';

// Interface para os dados retornados pela API
export interface BrapiStockQuote {
  currency: string;
  marketCap: number;
  shortName: string;
  longName: string;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: string;
  regularMarketPrice: number;
  regularMarketDayHigh: number;
  regularMarketDayRange: string;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  regularMarketPreviousClose: number;
  regularMarketOpen: number;
  fiftyTwoWeekRange: string;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  symbol: string;
  usedInterval: string;
  usedRange: string;
  priceEarnings?: number;
  earningsPerShare?: number;
  logourl?: string;
}

export interface BrapiResponse<T> {
  results: T[];
  requestedAt: string;
  took: string;
}

// Interface para os índices de mercado
export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

// Função para buscar dados de uma única ação brasileira
export async function getBrapiStockQuote(symbol: string): Promise<BrapiStockQuote | null> {
  try {
    const response = await fetch(`${BASE_URL}/quote/${symbol}?token=${API_TOKEN}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na API BrAPI (${response.status}): ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    if (data && data.results && data.results.length > 0) {
      return data.results[0] as BrapiStockQuote;
    }
    
    return null;
  } catch (error) {
    console.error(`Erro ao buscar dados da ação ${symbol}:`, error);
    return null;
  }
}

// Função para buscar dados de múltiplas ações brasileiras
export async function getBrapiMultipleStockQuotes(symbols: string[]): Promise<BrapiStockQuote[]> {
  if (!symbols || symbols.length === 0) {
    return [];
  }

  try {
    // No plano gratuito da BrAPI, podemos buscar apenas 1 ação por requisição
    // Vamos fazer requisições sequenciais para cada símbolo
    console.log(`Buscando dados para ${symbols.length} ações individualmente...`);
    
    const results: BrapiStockQuote[] = [];
    
    // Usar Promise.all para fazer as requisições em paralelo, com um pequeno atraso entre elas
    // para evitar sobrecarregar a API
    const requests = symbols.map((symbol, index) => {
      return new Promise<void>((resolve) => {
        // Adicionar um pequeno atraso entre as requisições
        setTimeout(async () => {
          try {
            const quote = await getBrapiStockQuote(symbol);
            if (quote) {
              results.push(quote);
            }
            resolve();
          } catch (error) {
            console.error(`Erro ao buscar dados da ação ${symbol}:`, error);
            resolve();
          }
        }, index * 300); // 300ms de intervalo entre requisições
      });
    });
    
    await Promise.all(requests);
    
    console.log(`Recebidos dados de ${results.length}/${symbols.length} ações`);
    return results;
  } catch (error) {
    console.error(`Erro ao buscar dados de múltiplas ações:`, error);
    return [];
  }
}

// Função para buscar dados históricos de uma ação
export async function getBrapiHistoricalData(
  symbol: string, 
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd' | 'max' = '1mo',
  interval: '1d' | '1wk' | '1mo' = '1d'
): Promise<any> {
  try {
    const response = await fetch(`${BASE_URL}/quote/${symbol}?range=${range}&interval=${interval}&token=${API_TOKEN}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na API BrAPI (${response.status}): ${errorText}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Erro ao buscar dados históricos da ação ${symbol}:`, error);
    return null;
  }
}

// Função para listar todas as ações disponíveis na API
export async function getBrapiAvailableStocks(): Promise<{
  stocks: Array<{
    name: string;
    symbol: string;
    type: string;
    sector?: string;
    company?: string;
  }>;
}> {
  try {
    const response = await fetch(`${BASE_URL}/available?token=${API_TOKEN}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na API BrAPI (${response.status}): ${errorText}`);
      return { stocks: [] };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar ações disponíveis:', error);
    return { stocks: [] };
  }
}

// Função para buscar informações de dividendos
export async function getBrapiDividends(symbol: string): Promise<any> {
  try {
    const response = await fetch(`${BASE_URL}/quote/${symbol}/dividends?token=${API_TOKEN}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na API BrAPI (${response.status}): ${errorText}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Erro ao buscar dividendos da ação ${symbol}:`, error);
    return null;
  }
}

// Verifica se uma ação está disponível na API BrAPI
export async function isStockAvailableInBrapi(symbol: string): Promise<boolean> {
  try {
    const quote = await getBrapiStockQuote(symbol);
    return quote !== null;
  } catch {
    return false;
  }
}

// Função para buscar dados dos principais índices brasileiros
export async function getBrapiMarketIndices(): Promise<MarketIndex[]> {
  // Símbolos dos principais índices de mercado brasileiro
  const indexSymbols = ['^BVSP', '^SMAL', '^IFIX'];
  
  try {
    console.log('Buscando dados dos índices brasileiros...');
    
    const results: MarketIndex[] = [];
    
    // Usar Promise.all para fazer as requisições em paralelo
    const requests = indexSymbols.map((symbol, index) => {
      return new Promise<void>((resolve) => {
        // Adicionar um pequeno atraso entre as requisições
        setTimeout(async () => {
          try {
            const response = await fetch(`${BASE_URL}/quote/${symbol}?token=${API_TOKEN}`);
            
            if (!response.ok) {
              console.error(`Erro ao buscar dados do índice ${symbol}: Status ${response.status}`);
              resolve();
              return;
            }
            
            const data = await response.json();
            if (data && data.results && data.results.length > 0) {
              const indexData = data.results[0];
              results.push({
                symbol: symbol,
                name: getIndexName(symbol),
                price: indexData.regularMarketPrice || 0,
                change: indexData.regularMarketChange || 0,
                changePercent: indexData.regularMarketChangePercent || 0
              });
            }
            resolve();
          } catch (error) {
            console.error(`Erro ao buscar dados do índice ${symbol}:`, error);
            resolve();
          }
        }, index * 300); // 300ms de intervalo entre requisições
      });
    });
    
    await Promise.all(requests);
    
    console.log(`Recebidos dados de ${results.length}/${indexSymbols.length} índices`);
    return results;
  } catch (error) {
    console.error('Erro ao buscar dados dos índices de mercado:', error);
    return [];
  }
}

// Função auxiliar para obter o nome do índice
function getIndexName(symbol: string): string {
  switch(symbol) {
    case '^BVSP':
      return 'IBOV';
    case '^SMAL':
      return 'SMALL';
    case '^IFIX':
      return 'IFIX';
    default:
      return symbol;
  }
} 
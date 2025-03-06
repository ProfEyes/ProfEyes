import { API_KEYS } from './apiKeys';
import { MarketNews } from './types';

// Interface para artigos de notícias do NewsData.io
interface NewsDataArticle {
  title: string;
  link: string;
  keywords?: string[];
  creator?: string[];
  video_url?: string;
  description: string;
  content: string;
  pubDate: string;
  image_url?: string;
  source_id: string;
  source_priority?: number;
  country?: string[];
  category?: string[];
  language?: string;
}

interface NewsDataResponse {
  status: string;
  totalResults: number;
  results: NewsDataArticle[];
  nextPage?: string;
}

// Função para buscar notícias gerais do NewsData.io
export async function fetchNewsDataHeadlines(
  category: string = 'business',
  language: string = 'pt',
  limit: number = 10
): Promise<MarketNews[]> {
  try {
    const url = `https://newsdata.io/api/1/news?apikey=${API_KEYS.NEWSDATA_IO.API_KEY}&category=${category}&language=${language}&size=${limit}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`NewsData.io Error: ${response.status} ${response.statusText}`);
    }
    
    const data: NewsDataResponse = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(`NewsData.io Error: ${data.status}`);
    }
    
    return data.results.map((article, index) => ({
      id: `newsdata-${Date.now()}-${index}`,
      title: article.title || 'Sem título',
      content: article.content || article.description || '',
      summary: article.description || '',
      source: article.source_id || 'NewsData.io',
      url: article.link || '',
      imageUrl: article.image_url || '',
      publishedAt: article.pubDate || new Date().toISOString(),
      relatedSymbols: extractSymbolsFromKeywords(article.keywords || []),
      sentiment: 0 // Será calculado posteriormente se necessário
    }));
  } catch (error) {
    console.error('Erro ao buscar notícias do NewsData.io:', error);
    return [];
  }
}

// Função para buscar notícias específicas de criptomoedas
export async function fetchCryptoNews(
  language: string = 'pt',
  limit: number = 10
): Promise<MarketNews[]> {
  try {
    const query = encodeURIComponent('bitcoin OR ethereum OR crypto OR cryptocurrency OR blockchain');
    const url = `https://newsdata.io/api/1/news?apikey=${API_KEYS.NEWSDATA_IO.API_KEY}&q=${query}&language=${language}&size=${limit}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`NewsData.io Error: ${response.status} ${response.statusText}`);
    }
    
    const data: NewsDataResponse = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(`NewsData.io Error: ${data.status}`);
    }
    
    return data.results.map((article, index) => ({
      id: `crypto-${Date.now()}-${index}`,
      title: article.title || 'Sem título',
      content: article.content || article.description || '',
      summary: article.description || '',
      source: article.source_id || 'NewsData.io',
      url: article.link || '',
      imageUrl: article.image_url || '',
      publishedAt: article.pubDate || new Date().toISOString(),
      relatedSymbols: extractCryptoSymbols(article.title + ' ' + article.description),
      sentiment: 0 // Será calculado posteriormente se necessário
    }));
  } catch (error) {
    console.error('Erro ao buscar notícias de criptomoedas do NewsData.io:', error);
    return [];
  }
}

// Função para buscar notícias específicas para um símbolo
export async function fetchSymbolNews(
  symbol: string,
  language: string = 'pt,en',
  limit: number = 10
): Promise<MarketNews[]> {
  try {
    // Remover sufixos comuns para melhorar a busca
    const searchSymbol = symbol.replace('USDT', '').replace('USD', '');
    
    // Criar consulta com termos relacionados para melhorar resultados
    let query = searchSymbol;
    
    // Adicionar termos específicos para criptomoedas conhecidas
    if (searchSymbol === 'BTC') {
      query = 'bitcoin OR BTC';
    } else if (searchSymbol === 'ETH') {
      query = 'ethereum OR ETH';
    } else if (searchSymbol === 'SOL') {
      query = 'solana OR SOL';
    } else if (searchSymbol === 'BNB') {
      query = 'binance coin OR BNB';
    } else if (searchSymbol === 'XRP') {
      query = 'ripple OR XRP';
    } else if (searchSymbol === 'ADA') {
      query = 'cardano OR ADA';
    } else if (searchSymbol === 'DOGE') {
      query = 'dogecoin OR DOGE';
    }
    
    const encodedQuery = encodeURIComponent(query);
    const url = `https://newsdata.io/api/1/news?apikey=${API_KEYS.NEWSDATA_IO.API_KEY}&q=${encodedQuery}&language=${language}&size=${limit}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`NewsData.io Error: ${response.status} ${response.statusText}`);
    }
    
    const data: NewsDataResponse = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(`NewsData.io Error: ${data.status}`);
    }
    
    return data.results.map((article, index) => ({
      id: `symbol-${Date.now()}-${index}`,
      title: article.title || 'Sem título',
      content: article.content || article.description || '',
      summary: article.description || '',
      source: article.source_id || 'NewsData.io',
      url: article.link || '',
      imageUrl: article.image_url || '',
      publishedAt: article.pubDate || new Date().toISOString(),
      relatedSymbols: [symbol, ...extractSymbolsFromText(article.title + ' ' + article.description)],
      sentiment: 0 // Será calculado posteriormente se necessário
    }));
  } catch (error) {
    console.error(`Erro ao buscar notícias para ${symbol} do NewsData.io:`, error);
    return [];
  }
}

// Função para extrair símbolos de criptomoedas do texto
function extractCryptoSymbols(text: string): string[] {
  const cryptoSymbols = [
    'BTC', 'ETH', 'XRP', 'LTC', 'ADA', 'DOT', 'LINK', 'DOGE', 'SOL', 'BNB',
    'AVAX', 'MATIC', 'UNI', 'SHIB', 'TRX', 'ATOM', 'XLM', 'ALGO', 'FTM'
  ];
  
  return cryptoSymbols.filter(symbol => 
    text.toUpperCase().includes(symbol) || 
    text.toUpperCase().includes(`${symbol}USD`) ||
    text.toUpperCase().includes(`${symbol}/USD`) ||
    text.toUpperCase().includes(`${symbol} USD`)
  );
}

// Função para extrair símbolos de palavras-chave
function extractSymbolsFromKeywords(keywords: string[]): string[] {
  const allSymbols = [
    'BTC', 'ETH', 'XRP', 'LTC', 'ADA', 'DOT', 'LINK', 'DOGE', 'SOL', 'BNB',
    'AVAX', 'MATIC', 'UNI', 'SHIB', 'TRX', 'ATOM', 'XLM', 'ALGO', 'FTM',
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'PYPL', 'NFLX'
  ];
  
  const upperKeywords = keywords.map(k => k.toUpperCase());
  return allSymbols.filter(symbol => upperKeywords.some(k => k.includes(symbol)));
}

// Função para extrair símbolos de texto
function extractSymbolsFromText(text: string): string[] {
  const allSymbols = [
    'BTC', 'ETH', 'XRP', 'LTC', 'ADA', 'DOT', 'LINK', 'DOGE', 'SOL', 'BNB',
    'AVAX', 'MATIC', 'UNI', 'SHIB', 'TRX', 'ATOM', 'XLM', 'ALGO', 'FTM',
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'PYPL', 'NFLX'
  ];
  
  return allSymbols.filter(symbol => 
    text.toUpperCase().includes(symbol) || 
    text.toUpperCase().includes(`${symbol}USD`) ||
    text.toUpperCase().includes(`${symbol}/USD`) ||
    text.toUpperCase().includes(`${symbol} USD`)
  );
} 
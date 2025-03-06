import { API_KEYS } from './apiKeys';
import { MarketNews } from './types';

// Interface para artigos de notícias
export interface NewsArticle {
  id?: string;
  title: string;
  description: string;
  content: string;
  url: string;
  imageUrl: string;
  source: string;
  publishedAt: string;
  author?: string;
  relatedSymbols?: string[];
  sentiment?: number;
}

// Função para buscar notícias financeiras
export async function fetchFinancialNews(
  query: string = 'finance OR investing OR stock market OR economy',
  from: string = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  to: string = new Date().toISOString(),
  language: string = 'pt',
  pageSize: number = 20
): Promise<NewsArticle[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const encodedFrom = encodeURIComponent(from);
    const encodedTo = encodeURIComponent(to);
    
    const url = `https://newsapi.org/v2/everything?q=${encodedQuery}&from=${encodedFrom}&to=${encodedTo}&language=${language}&pageSize=${pageSize}&sortBy=publishedAt&apiKey=${API_KEYS.NEWS_API.API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`NewsAPI Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(`NewsAPI Error: ${data.code} - ${data.message}`);
    }
    
    const articles = await Promise.all(data.articles.map(async (article: any, index: number) => {
      const sentiment = await analyzeSentiment(article.title + ' ' + (article.description || ''));
      const relatedSymbols = extractSymbolsFromText(article.title + ' ' + (article.description || ''));
      
      return {
        id: `news-${Date.now()}-${index}`,
        title: article.title || 'Sem título',
        description: article.description || '',
        content: article.content || article.description || '',
        url: article.url || '',
        imageUrl: article.urlToImage || '',
        source: article.source?.name || 'Desconhecido',
        publishedAt: article.publishedAt || new Date().toISOString(),
        author: article.author || '',
        relatedSymbols,
        sentiment
      };
    }));
    
    return articles;
  } catch (error) {
    console.error('Erro ao buscar notícias financeiras:', error);
    return [];
  }
}

// Função para buscar notícias específicas de uma empresa/símbolo (versão antiga)
// Renomeada para não conflitar com a versão mais nova
export async function fetchCompanyNews(
  symbol: string,
  pageSize: number = 10
): Promise<NewsArticle[]> {
  try {
    // Criar uma consulta relevante para o símbolo
    const query = encodeURIComponent(`${symbol} stock OR ${symbol} market OR ${symbol} investing OR ${symbol} finance`);
    const from = encodeURIComponent(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    const to = encodeURIComponent(new Date().toISOString());
    
    const url = `https://newsapi.org/v2/everything?q=${query}&from=${from}&to=${to}&pageSize=${pageSize}&sortBy=publishedAt&apiKey=${API_KEYS.NEWS_API.API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`NewsAPI Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(`NewsAPI Error: ${data.code} - ${data.message}`);
    }
    
    return data.articles.map((article: any, index: number) => ({
      id: `news-${Date.now()}-${index}`,
      title: article.title || 'Sem título',
      description: article.description || '',
      content: article.content || article.description || '',
      url: article.url || '',
      imageUrl: article.urlToImage || '',
      source: article.source?.name || 'Desconhecido',
      publishedAt: article.publishedAt || new Date().toISOString(),
      author: article.author || '',
      relatedSymbols: [symbol, ...extractStockSymbols(article.title + ' ' + (article.description || ''))],
      sentiment: 0 // Placeholder para análise de sentimento
    }));
  } catch (error) {
    console.error(`Erro ao buscar notícias para ${symbol}:`, error);
    return [];
  }
}

// Função para buscar manchetes de notícias
export async function fetchNewsHeadlines(
  category: 'business' | 'technology' | 'general' = 'business',
  country: string = 'br',
  pageSize: number = 10
): Promise<NewsArticle[]> {
  try {
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=${pageSize}&apiKey=${API_KEYS.NEWS_API.API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`NewsAPI Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(`NewsAPI Error: ${data.code} - ${data.message}`);
    }
    
    return data.articles.map((article: any, index: number) => ({
      id: `headline-${Date.now()}-${index}`,
      title: article.title || 'Sem título',
      description: article.description || '',
      content: article.content || article.description || '',
      url: article.url || '',
      imageUrl: article.urlToImage || '',
      source: article.source?.name || 'Desconhecido',
      publishedAt: article.publishedAt || new Date().toISOString(),
      author: article.author || '',
      relatedSymbols: extractStockSymbols(article.title + ' ' + (article.description || '')),
      sentiment: 0 // Placeholder para análise de sentimento
    }));
  } catch (error) {
    console.error('Erro ao buscar manchetes de notícias:', error);
    return [];
  }
}

// Função para extrair símbolos de ações do texto
function extractStockSymbols(text: string): string[] {
  if (!text) return [];
  
  // Regex para encontrar símbolos de ações comuns
  const stockPattern = /\b[A-Z]{2,6}\b(?:\.SA)?/g;
  const matches = text.match(stockPattern) || [];
  
  // Filtrar falsos positivos comuns
  const commonWords = new Set(['US', 'UK', 'EU', 'CEO', 'CFO', 'IPO', 'GDP', 'FBI', 'CIA', 'NYSE', 'NASDAQ']);
  return [...new Set(matches)].filter(symbol => !commonWords.has(symbol));
}

// Função para extrair símbolos de criptomoedas do texto
function extractCryptoSymbols(text: string): string[] {
  if (!text) return [];
  
  // Lista de criptomoedas comuns e seus símbolos
  const commonCryptos = new Map([
    ['BITCOIN', 'BTC'],
    ['ETHEREUM', 'ETH'],
    ['BINANCE', 'BNB'],
    ['CARDANO', 'ADA'],
    ['SOLANA', 'SOL'],
    ['RIPPLE', 'XRP'],
    ['DOGECOIN', 'DOGE'],
    ['POLKADOT', 'DOT'],
    ['POLYGON', 'MATIC']
  ]);
  
  const symbols = new Set<string>();
  
  // Procurar por símbolos diretos
  const symbolPattern = /\b(?:BTC|ETH|BNB|ADA|SOL|XRP|DOGE|DOT|MATIC)\b/g;
  const symbolMatches = text.match(symbolPattern) || [];
  symbolMatches.forEach(symbol => symbols.add(symbol));
  
  // Procurar por nomes de criptomoedas
  const upperText = text.toUpperCase();
  commonCryptos.forEach((symbol, name) => {
    if (upperText.includes(name)) {
      symbols.add(symbol);
    }
  });
  
  return Array.from(symbols);
}

// Função para extrair símbolos de qualquer texto
function extractSymbolsFromText(text: string): string[] {
  const stockSymbols = extractStockSymbols(text);
  const cryptoSymbols = extractCryptoSymbols(text);
  return [...new Set([...stockSymbols, ...cryptoSymbols])];
}

// Função para extrair símbolos de palavras-chave
function extractSymbolsFromKeywords(keywords: string[]): string[] {
  return keywords.reduce((symbols: string[], keyword: string) => {
    const extractedSymbols = extractSymbolsFromText(keyword);
    return [...symbols, ...extractedSymbols];
  }, []);
}

// Chave da API Finnhub 
const FINNHUB_API_KEY = 'cv2i8npr01qhefskfc2gcv2i8npr01qhefskfc30';

// Função para buscar manchetes da NewsAPI
export async function fetchNewsApiHeadlines(query: string, limit: number = 10): Promise<MarketNews[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const from = encodeURIComponent(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    const to = encodeURIComponent(new Date().toISOString());
    
    const url = `https://newsapi.org/v2/everything?q=${encodedQuery}&from=${from}&to=${to}&pageSize=${limit}&sortBy=publishedAt&apiKey=${API_KEYS.NEWS_API.API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`NewsAPI Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(`NewsAPI Error: ${data.code} - ${data.message}`);
    }
    
    const articles = await Promise.all(data.articles.map(async (article: any, index: number) => {
      const fullText = article.title + ' ' + (article.description || '');
      const sentiment = await analyzeSentiment(fullText);
      const relatedSymbols = extractSymbolsFromText(fullText);
      
      return {
        id: `news-${Date.now()}-${index}`,
        title: article.title || 'Sem título',
        content: article.content || article.description || '',
        description: article.description || '',
        summary: article.description || '',
        source: article.source?.name || 'Desconhecido',
        url: article.url || '',
        imageUrl: article.urlToImage || '',
        publishedAt: article.publishedAt || new Date().toISOString(),
        relatedSymbols,
        sentiment
      };
    }));
    
    return articles;
  } catch (error) {
    console.error('Erro ao buscar manchetes da NewsAPI:', error);
    return [];
  }
}

// Função para buscar notícias do Finnhub
export async function fetchFinnhubNews(category: string = 'general', limit: number = 10): Promise<MarketNews[]> {
  try {
    const url = `https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Finnhub Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.slice(0, limit).map((article: any) => ({
      id: `finnhub-${article.id || Date.now()}`,
      title: article.headline || 'Sem título',
      description: article.summary || '',
      content: article.summary || '',
      summary: article.summary || '',
      source: article.source || 'Finnhub',
      url: article.url || '',
      imageUrl: article.image || '',
      publishedAt: article.datetime ? new Date(article.datetime * 1000).toISOString() : new Date().toISOString(),
      relatedSymbols: article.related ? article.related.split(',') : [],
      sentiment: 0 // Placeholder para análise de sentimento
    }));
  } catch (error) {
    console.error('Erro ao buscar notícias do Finnhub:', error);
    return [];
  }
}

// Função para buscar notícias de empresas do Finnhub
export async function fetchFinnhubCompanyNews(symbol: string, limit: number = 10): Promise<MarketNews[]> {
  try {
    // Calcular período de busca (último mês)
    const currentDate = new Date();
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 1);
    
    const from = pastDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const to = currentDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Finnhub Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.slice(0, limit).map((article: any) => ({
      id: `finnhub-${article.id || Date.now()}`,
      title: article.headline || 'Sem título',
      description: article.summary || '',
      content: article.summary || '',
      summary: article.summary || '',
      source: article.source || 'Finnhub',
      url: article.url || '',
      imageUrl: article.image || '',
      publishedAt: article.datetime ? new Date(article.datetime * 1000).toISOString() : new Date().toISOString(),
      relatedSymbols: [symbol],
      sentiment: 0 // Placeholder para análise de sentimento
    }));
  } catch (error) {
    console.error(`Erro ao buscar notícias do Finnhub para ${symbol}:`, error);
    return [];
  }
}

// Função para buscar todas as notícias do mercado
export async function fetchAllMarketNews(limit: number = 10): Promise<MarketNews[]> {
  try {
    // Buscar tanto da NewsAPI quanto do Finnhub
    const newsApiResults = await fetchNewsApiHeadlines('finance OR crypto OR market OR stock OR investing', limit / 2);
    const finnhubResults = await fetchFinnhubNews('general', limit / 2);
    
    // Combinar resultados
    const combinedResults = [...newsApiResults, ...finnhubResults];
    
    // Ordenar por data de publicação (mais recentes primeiro)
    combinedResults.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return dateB - dateA;
    });
    
    return combinedResults.slice(0, limit);
  } catch (error) {
    console.error('Erro ao buscar todas as notícias do mercado:', error);
    return [];
  }
}

// Função para buscar notícias relacionadas a um símbolo específico
export async function fetchSymbolNews(symbol: string, limit: number = 10): Promise<MarketNews[]> {
  try {
    // Buscar de ambas as fontes
    const newsApiResults = await fetchNewsApiHeadlines(`${symbol} stock OR ${symbol} market OR ${symbol} trading OR ${symbol} price`, limit / 2);
    const finnhubResults = await fetchFinnhubCompanyNews(symbol, limit / 2);
    
    // Combinar resultados
    const combinedResults = [...newsApiResults, ...finnhubResults];
    
    // Ordenar por data de publicação (mais recentes primeiro)
    combinedResults.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return dateB - dateA;
    });
    
    return combinedResults.slice(0, limit);
  } catch (error) {
    console.error(`Erro ao buscar notícias para ${symbol}:`, error);
    return [];
  }
}

// Função para analisar o sentimento do texto
export function analyzeSentiment(text: string): number {
  try {
    // Lista de palavras positivas e negativas em português e inglês
    const positiveWords = new Set([
      // Português
      'alta', 'subida', 'ganho', 'lucro', 'crescimento', 'positivo', 'otimista',
      'valorização', 'avanço', 'recuperação', 'sucesso', 'forte', 'robusto',
      // Inglês
      'up', 'gain', 'profit', 'growth', 'positive', 'optimistic', 'bullish',
      'surge', 'rally', 'recovery', 'success', 'strong', 'robust'
    ]);

    const negativeWords = new Set([
      // Português
      'queda', 'baixa', 'perda', 'prejuízo', 'recuo', 'negativo', 'pessimista',
      'desvalorização', 'retração', 'fraco', 'risco', 'preocupação',
      // Inglês
      'down', 'loss', 'decline', 'negative', 'bearish', 'pessimistic', 'weak',
      'risk', 'concern', 'worry', 'fall', 'drop', 'plunge'
    ]);

    // Normalizar texto
    const normalizedText = text.toLowerCase();
    const words = normalizedText.split(/\s+/);

    let positiveCount = 0;
    let negativeCount = 0;

    // Contar palavras positivas e negativas
    words.forEach(word => {
      if (positiveWords.has(word)) positiveCount++;
      if (negativeWords.has(word)) negativeCount++;
    });

    // Calcular pontuação de sentimento (-1 a 1)
    const totalWords = words.length;
    const sentimentScore = totalWords > 0 
      ? (positiveCount - negativeCount) / Math.sqrt(totalWords)
      : 0;

    // Normalizar para o intervalo -1 a 1
    return Math.max(-1, Math.min(1, sentimentScore));
  } catch (error) {
    console.error('Erro na análise de sentimento:', error);
    return 0; // Neutro em caso de erro
  }
} 
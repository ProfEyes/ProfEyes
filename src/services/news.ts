import { API_KEYS } from "./apiKeys";
import { MarketNews } from "./types";

// Interface para os dados retornados pela API Finnhub
interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export const fetchMarketNews = async (options?: { language?: string, limit?: number }) => {
  try {
    console.log('Buscando notícias do Finnhub');
    const limit = options?.limit || 20;
    
    // Categorias suportadas pelo Finnhub: general, forex, crypto, merger
    const categories = ['general', 'forex', 'crypto', 'merger'];
    let allNews: FinnhubNewsItem[] = [];
    
    // Buscar notícias de diferentes categorias para ter uma variedade maior
    for (const category of categories) {
      try {
        const url = `https://finnhub.io/api/v1/news?category=${category}&token=${API_KEYS.FINNHUB.API_KEY}`;
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          console.warn(`Erro ao buscar notícias da categoria ${category}: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          // Adicionar apenas as notícias com imagens
          const newsWithImages = data.filter(item => item.image && item.image.trim() !== '');
          allNews = [...allNews, ...newsWithImages];
        }
      } catch (error) {
        console.warn(`Erro ao processar notícias da categoria ${category}:`, error);
      }
    }
    
    // Remover duplicatas baseadas no ID
    const uniqueNewsMap = new Map();
    allNews.forEach((item) => {
      if (!uniqueNewsMap.has(item.id)) {
        uniqueNewsMap.set(item.id, item);
      }
    });
    
    let uniqueNews = Array.from(uniqueNewsMap.values());
    
    // Ordenar por data (mais recentes primeiro)
    uniqueNews.sort((a, b) => b.datetime - a.datetime);
    
    // Limitar o número de notícias
    uniqueNews = uniqueNews.slice(0, limit);
    
    // Converter para o formato esperado pelo frontend
    return uniqueNews.map((item) => ({
      id: `finnhub-${item.id || Date.now()}`,
      title: item.headline || '',
      headline: item.headline || '',
      description: item.summary || '',
      summary: item.summary || '',
      content: item.summary || '',
      source: item.source || '',
      url: item.url || '',
      publishedAt: item.datetime * 1000, // Finnhub usa segundos, convertemos para ms
      datetime: item.datetime * 1000,
      imageUrl: item.image || '',
      image: item.image || '',
      category: item.category || 'business',
      relatedSymbols: item.related ? item.related.split(',').filter(Boolean) : []
    }));
    
  } catch (error) {
    console.error('Erro ao buscar notícias do Finnhub:', error);
    // Retornar array vazio em caso de erro
    return [];
  }
};
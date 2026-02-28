import { API_KEYS } from "./apiKeys";
import { MarketNews } from "./types";
import { fetchNewsWithAutoUpdate } from "./newsDatabase";

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

// Verificar se temos a chave da API
if (!API_KEYS.FINNHUB.API_KEY) {
  console.warn('⚠️ FINNHUB_API_KEY não configurada!');
}

/**
 * ✅ NOVA IMPLEMENTAÇÃO: BUSCAR DO BANCO DE DADOS
 * 
 * As notícias agora são armazenadas no Supabase e compartilhadas entre todos.
 * Isso economiza requisições da API Finnhub (que tem limite).
 */
export const fetchMarketNewsFromDatabase = async (options?: { language?: string, limit?: number }) => {
  try {
    const limit = options?.limit || 20;
    
    // Buscando notícias (silenciado)
    
    // Buscar do banco com atualização automática se necessário
    const news = await fetchNewsWithAutoUpdate(limit);
    
    // Notícias carregadas (silenciado)
    
    return news;
  } catch (error) {
    console.error('❌ [News] Erro ao buscar notícias do banco:', error);
    
    // Fallback: tentar API direta em caso de erro
    // Tentando fallback (silenciado)
    return await fetchMarketNewsLegacy(options);
  }
};

/**
 * ⚠️ FALLBACK LEGADO: BUSCAR DA API DIRETAMENTE
 * 
 * Usado apenas se o banco falhar (não recomendado para uso contínuo).
 */

const fetchMarketNewsLegacy = async (options?: { language?: string, limit?: number }) => {
  try {
    // Buscando via Finnhub (silenciado)
    
    const limit = options?.limit || 20;
    const FINNHUB_API_KEY = API_KEYS.FINNHUB.API_KEY;
    
    // Categorias suportadas pelo Finnhub: general, forex, crypto, merger
    const categories = ['general', 'forex', 'crypto', 'merger'];
    let allNews: any[] = [];
    
    // Buscar notícias de diferentes categorias
    for (const category of categories) {
      try {
        // ✅ Tentar proxy primeiro, depois fallback direto
        let data: any = null;
        
        // Tentar proxy (funciona no Vercel)
        try {
          const proxyUrl = `/api/finnhub-news?category=${category}`;
          // Tentando proxy (silenciado)
          
          const proxyResponse = await fetch(proxyUrl, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            cache: 'no-store'
          });
          
          if (proxyResponse.ok) {
            const result = await proxyResponse.json();
            if (result.success && Array.isArray(result.news)) {
              data = result.news;
              // Proxy funcionou (silenciado)
            }
          }
        } catch (proxyError) {
          // Proxy falhou (silenciado)
        }
        
        // Se proxy falhou, tentar direto (funciona localmente)
        if (!data) {
          const directUrl = `https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_API_KEY}`;
          // Tentando acesso direto (silenciado)
          
          const directResponse = await fetch(directUrl);
          
          if (directResponse.ok) {
            const rawData: FinnhubNewsItem[] = await directResponse.json();
            
            // Filtrar apenas CNBC e CoinDesk com imagens
            const filtered = rawData.filter(item => {
              if (!item.image || item.image.trim() === '') return false;
              const source = item.source?.toUpperCase() || '';
              return source.includes('CNBC') || source.includes('COINDESK');
            });
            
            // Converter para formato esperado
            data = filtered.map((item) => ({
              id: `finnhub-${item.id || Date.now()}`,
              title: item.headline || '',
              headline: item.headline || '',
              description: item.summary || '',
              summary: item.summary || '',
              content: item.summary || '',
              source: item.source || '',
              url: item.url || '',
              publishedAt: item.datetime * 1000,
              datetime: item.datetime * 1000,
              imageUrl: item.image || '',
              image: item.image || '',
              category: item.category || 'business',
              relatedSymbols: item.related ? item.related.split(',').filter(Boolean) : []
            }));
            
            console.log(`✅ Acesso direto funcionou - ${category}: ${data.length} notícias`);
          }
        }
        
        if (data && data.length > 0) {
          allNews = [...allNews, ...data];
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao processar notícias da categoria ${category}:`, error);
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
    uniqueNews.sort((a, b) => {
      const dateA = a.datetime || a.publishedAt || 0;
      const dateB = b.datetime || b.publishedAt || 0;
      return dateB - dateA;
    });
    
    // Limitar o número de notícias
    uniqueNews = uniqueNews.slice(0, limit);
    
    // Total de notícias (silenciado)
    
    // As notícias já vêm convertidas do proxy
    return uniqueNews;
    
  } catch (error) {
    console.error('❌ Erro ao buscar notícias do Finnhub:', error);
    // Retornar array vazio em caso de erro
    return [];
  }
};

// Exportar a nova função como padrão
export const fetchMarketNews = fetchMarketNewsFromDatabase;
import { supabase } from "@/integrations/supabase/client";
import { MarketNews } from "./types";
import { API_KEYS } from "./apiKeys";
import { fetchFinancialNews, fetchSymbolNews as fetchNewsApiSymbolNews, fetchNewsHeadlines } from "./newsApi";
import { fetchCompanyNews as fetchFinnhubCompanyNews } from "./finnhubApi";
import { 
  fetchNewsDataHeadlines, 
  fetchCryptoNews, 
  fetchSymbolNews as fetchNewsDataSymbolNews 
} from "./newsDataApi";

// Função para buscar notícias de mercado
export async function fetchMarketNews(options: { limit?: number; symbols?: string[] } = {}): Promise<MarketNews[]> {
  try {
    console.log('Buscando notícias de mercado...');
    const limit = options.limit || 10;
    const symbols = options.symbols || [];
    
    // Buscar notícias do Supabase primeiro
    let query = supabase
      .from('market_news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);
      
    // Se tiver símbolos específicos, filtrar por eles
    if (symbols && symbols.length > 0) {
      // Buscar notícias relacionadas aos símbolos fornecidos
      query = query.or(symbols.map(symbol => `related_symbols.cs.{${symbol}}`).join(','));
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar notícias do Supabase:', error);
      // Continuar e tentar buscar de APIs
    } else if (data && data.length > 0) {
      console.log(`${data.length} notícias encontradas no Supabase`);
      
      // Converter dados do Supabase para o formato MarketNews
      const news: MarketNews[] = data.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        summary: item.summary,
        source: item.source,
        url: item.url,
        imageUrl: item.image_url,
        publishedAt: item.published_at,
        relatedSymbols: item.related_symbols || [],
        sentiment: item.sentiment || 0
      }));
      
      return news;
    }
    
    // Se não encontrar no Supabase, buscar de APIs externas
    console.log('Buscando notícias de APIs externas...');

    // Array para armazenar promessas de busca de notícias
    const newsPromises = [];
    
    // 1. Buscar do Finnhub (primeira prioridade com a nova API key)
    newsPromises.push(fetchFinnhubNews());
    
    // 2. Buscar da NewsAPI (segunda prioridade)
    newsPromises.push(fetchNewsApiNews());
    
    // 3. Tentar NewsData.io como backup
    newsPromises.push(fetchNewsDataNews());
    
    // Executar todas as buscas em paralelo
    const results = await Promise.allSettled(newsPromises);
    
    // Processar resultados, priorizando as fontes na ordem definida
    let allNews: MarketNews[] = [];
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
        allNews = [...allNews, ...result.value];
        
        // Se já temos notícias suficientes, podemos parar
        if (allNews.length >= limit) break;
      }
    }
    
    // Remover possíveis duplicatas (baseado no título)
    const uniqueNews = allNews.filter((news, index, self) =>
      index === self.findIndex((t) => t.title === news.title)
    );
    
    // Limitar ao número solicitado
    const news = uniqueNews.slice(0, limit);
    
    if (news && news.length > 0) {
      console.log(`${news.length} notícias encontradas de APIs externas`);
      
      // Salvar no Supabase para uso futuro
      try {
        const newsToInsert = news.map(item => ({
          title: item.title,
          content: item.content,
          summary: item.summary,
          source: item.source,
          url: item.url,
          image_url: item.imageUrl,
          published_at: item.publishedAt,
          related_symbols: item.relatedSymbols,
          sentiment: item.sentiment
        }));
        
        await supabase.from('market_news').insert(newsToInsert);
      } catch (saveError) {
        console.error('Erro ao salvar notícias no Supabase:', saveError);
        // Continuar mesmo com erro de salvamento
      }
      
      return news;
    }
    
    // Se todas as tentativas falharem, retornar array vazio
    console.log('Não foi possível obter notícias de nenhuma fonte.');
    return [];
  } catch (error) {
    console.error('Erro ao buscar notícias de mercado:', error);
    return [];
  }
}

// Função auxiliar para buscar notícias do Finnhub
async function fetchFinnhubNews(): Promise<MarketNews[]> {
  try {
    // Lista de símbolos populares para buscar notícias
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'BTC', 'ETH'];
    let allNews: MarketNews[] = [];
    
    // Buscar notícias para cada símbolo
    for (const symbol of symbols) {
      if (allNews.length >= 20) break; // Limitar a 20 notícias no total
      
      try {
        const finnhubResults = await fetchFinnhubCompanyNews(symbol);
        
        if (finnhubResults && finnhubResults.length > 0) {
          // Converter para o formato MarketNews
          const symbolNews: MarketNews[] = finnhubResults.slice(0, 5).map((item, index) => ({
            id: `finnhub-${Date.now()}-${symbol}-${index}`,
            title: item.headline,
            content: item.summary,
            summary: item.summary,
            source: item.source,
            url: item.url,
            imageUrl: item.image || '',
            publishedAt: new Date(item.datetime * 1000).toISOString(),
            relatedSymbols: [symbol],
            sentiment: 0 // Será calculado depois se necessário
          }));
          
          allNews = [...allNews, ...symbolNews];
        }
      } catch (err) {
        console.warn(`Erro ao buscar notícias do Finnhub para ${symbol}:`, err);
        // Continuar com próximo símbolo
      }
    }
    
    return allNews;
  } catch (error) {
    console.error('Erro geral ao buscar notícias do Finnhub:', error);
    return [];
  }
}

// Função auxiliar para buscar notícias da NewsAPI
async function fetchNewsApiNews(): Promise<MarketNews[]> {
  try {
    // Buscar notícias de negócios
    const newsApiResults = await fetchNewsHeadlines('business', 'br', 10);
    
    if (newsApiResults && newsApiResults.length > 0) {
      // Converter para o formato MarketNews
      const news: MarketNews[] = newsApiResults.map((item, index) => ({
        id: `newsapi-${Date.now()}-${index}`,
        title: item.title,
        content: item.content,
        summary: item.description,
        source: item.source,
        url: item.url,
        imageUrl: item.imageUrl,
        publishedAt: item.publishedAt,
        relatedSymbols: item.relatedSymbols || [],
        sentiment: 0 // Será calculado depois se necessário
      }));
      
      return news;
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar notícias da NewsAPI:', error);
    return [];
  }
}

// Função auxiliar para buscar notícias do NewsData.io
async function fetchNewsDataNews(): Promise<MarketNews[]> {
  try {
    // Buscar notícias de negócios e criptomoedas
    const [businessNews, cryptoNews] = await Promise.all([
      fetchNewsDataHeadlines('business', 'pt,en', 5),
      fetchCryptoNews('pt,en', 5)
    ]);
    
    // Combinar os resultados
    let combinedNews: MarketNews[] = [...businessNews, ...cryptoNews];
    
    // Remover possíveis duplicatas (baseado no título)
    const uniqueNews = combinedNews.filter((news, index, self) =>
      index === self.findIndex((t) => t.title === news.title)
    );
    
    return uniqueNews;
  } catch (error) {
    console.error('Erro ao buscar notícias do NewsData.io:', error);
    return [];
  }
}

// Função para buscar notícias específicas para um símbolo
export async function fetchNewsForSymbol(symbol: string): Promise<MarketNews[]> {
  try {
    console.log(`Buscando notícias para ${symbol}...`);
    
    // Buscar do Supabase primeiro
    const { data, error } = await supabase
      .from('market_news')
      .select('*')
      .contains('related_symbols', [symbol])
      .order('published_at', { ascending: false })
      .limit(5);
      
    if (error) {
      console.error(`Erro ao buscar notícias para ${symbol} do Supabase:`, error);
      // Continuar e tentar buscar de APIs
    } else if (data && data.length > 0) {
      console.log(`${data.length} notícias encontradas para ${symbol} no Supabase`);
      
      // Converter dados do Supabase para o formato MarketNews
      const news: MarketNews[] = data.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        summary: item.summary,
        source: item.source,
        url: item.url,
        imageUrl: item.image_url,
        publishedAt: item.published_at,
        relatedSymbols: item.related_symbols || [],
        sentiment: item.sentiment || 0
      }));
      
      return news;
    }
    
    // Se não encontrar no Supabase, buscar de APIs externas
    console.log(`Buscando notícias para ${symbol} de APIs externas...`);
    
    // Tentar buscar do Finnhub primeiro (notícias mais específicas para ações)
    try {
      const finnhubResults = await fetchFinnhubCompanyNews(symbol);
      
      if (finnhubResults && finnhubResults.length > 0) {
        // Converter para o formato MarketNews
        const news: MarketNews[] = finnhubResults.slice(0, 5).map((item, index) => ({
          id: `finnhub-${Date.now()}-${index}`,
          title: item.headline,
          content: item.summary,
          summary: item.summary,
          source: item.source,
          url: item.url,
          imageUrl: item.image || '',
          publishedAt: new Date(item.datetime * 1000).toISOString(),
          relatedSymbols: [symbol],
          sentiment: 0 // Será calculado depois se necessário
        }));
        
        // Salvar no Supabase para uso futuro
        try {
          const newsToInsert = news.map(item => ({
            title: item.title,
            content: item.content,
            summary: item.summary,
            source: item.source,
            url: item.url,
            image_url: item.imageUrl,
            published_at: item.publishedAt,
            related_symbols: item.relatedSymbols,
            sentiment: item.sentiment
          }));
          
          await supabase.from('market_news').insert(newsToInsert);
        } catch (saveError) {
          console.error(`Erro ao salvar notícias para ${symbol} no Supabase:`, saveError);
          // Continuar mesmo com erro de salvamento
        }
        
        return news;
      }
    } catch (finnhubError) {
      console.error(`Erro ao buscar notícias do Finnhub para ${symbol}:`, finnhubError);
    }
    
    // Se Finnhub falhar, tentar NewsAPI (que tem mais notícias gerais de negócios)
    try {
      const query = `${symbol} stock OR ${symbol} market OR ${symbol} investing`;
      const newsApiResults = await fetchFinancialNews(query, undefined, undefined, 'pt,en', 5);
      
      if (newsApiResults && newsApiResults.length > 0) {
        // Converter para o formato MarketNews
        const news: MarketNews[] = newsApiResults.map((item, index) => ({
          id: `newsapi-${Date.now()}-${index}`,
          title: item.title,
          content: item.content,
          summary: item.description,
          source: item.source,
          url: item.url,
          imageUrl: item.imageUrl,
          publishedAt: item.publishedAt,
          relatedSymbols: [symbol, ...(item.relatedSymbols || [])],
          sentiment: item.sentiment || 0
        }));
        
        // Salvar no Supabase para uso futuro
        try {
          const newsToInsert = news.map(item => ({
            title: item.title,
            content: item.content,
            summary: item.summary,
            source: item.source,
            url: item.url,
            image_url: item.imageUrl,
            published_at: item.publishedAt,
            related_symbols: item.relatedSymbols,
            sentiment: item.sentiment
          }));
          
          await supabase.from('market_news').insert(newsToInsert);
        } catch (saveError) {
          console.error(`Erro ao salvar notícias para ${symbol} no Supabase:`, saveError);
          // Continuar mesmo com erro de salvamento
        }
        
        return news;
      }
    } catch (newsApiError) {
      console.error(`Erro ao buscar notícias da NewsAPI para ${symbol}:`, newsApiError);
    }
    
    // Se todas as APIs falharem, retornar array vazio
    console.log(`Não foi possível obter notícias para ${symbol} de nenhuma fonte.`);
    return [];
  } catch (error) {
    console.error(`Erro geral ao buscar notícias para ${symbol}:`, error);
    return [];
  }
} 
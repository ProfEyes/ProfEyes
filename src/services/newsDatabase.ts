/**
 * SERVIÇO DE NOTÍCIAS VIA BANCO DE DADOS (CACHE GLOBAL)
 * 
 * Este serviço busca notícias do banco Supabase ao invés da API diretamente.
 * 
 * BENEFÍCIOS:
 * - Economiza requisições de API (limite do Finnhub)
 * - Todos os usuários veem as mesmas notícias
 * - Atualização centralizada a cada 5 horas
 * - Cache automático via Supabase
 */

import { supabase } from '../lib/supabase';

export interface DatabaseNews {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image_url: string;
  category: string;
  published_at: string;
  related_symbols: string[];
}

/**
 * Busca notícias do banco de dados
 */
export const fetchNewsFromDatabase = async (limit: number = 20): Promise<any[]> => {
  try {
    // Buscando do banco (silenciado)

    // Chamar função RPC do Supabase
    const { data, error } = await supabase
      .rpc('get_latest_market_news', { news_limit: limit });

    if (error) {
      console.error('❌ [News DB] Erro ao buscar notícias:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      // Nenhuma notícia encontrada (silenciado)
      
      // Tentar atualizar notícias
      await triggerNewsUpdate();
      
      return [];
    }

    // Notícias carregadas (silenciado)

    // Converter para formato esperado pelo frontend
    const convertedNews = data.map((item: DatabaseNews) => ({
      id: item.id,
      title: item.headline,
      headline: item.headline,
      description: item.summary,
      summary: item.summary,
      content: item.summary,
      source: item.source,
      url: item.url,
      publishedAt: new Date(item.published_at).getTime(),
      datetime: new Date(item.published_at).getTime(),
      imageUrl: item.image_url,
      image: item.image_url,
      category: item.category,
      relatedSymbols: item.related_symbols || []
    }));

    return convertedNews;
  } catch (error) {
    console.error('❌ [News DB] Erro ao buscar notícias:', error);
    throw error;
  }
};

/**
 * Verifica se precisa atualizar as notícias
 */
export const shouldUpdateNews = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('should_update_news');

    if (error) {
      console.error('❌ [News DB] Erro ao verificar atualização:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('❌ [News DB] Erro ao verificar atualização:', error);
    return false;
  }
};

/**
 * Dispara atualização de notícias
 * 
 * ⚠️ NOTA: Em desenvolvimento local, execute manualmente:
 * npm run update-news
 * 
 * Ou rode o updater automático em segundo plano:
 * npm run news-updater
 */
export const triggerNewsUpdate = async (): Promise<void> => {
  try {
    // Atualização necessária (silenciado)
  } catch (error) {
    console.error('❌ [News DB] Erro:', error);
  }
};

/**
 * Busca notícias com atualização automática se necessário
 */
export const fetchNewsWithAutoUpdate = async (limit: number = 20): Promise<any[]> => {
  try {
    // Verificar se precisa atualizar
    const needsUpdate = await shouldUpdateNews();
    
    if (needsUpdate) {
      // Notícias desatualizadas (silenciado)
      
      // Disparar atualização (não aguardar, retornar cache)
      triggerNewsUpdate().catch(console.error);
    }

    // Buscar notícias do banco (sempre retorna cache atual)
    return await fetchNewsFromDatabase(limit);
  } catch (error) {
    console.error('❌ [News DB] Erro ao buscar notícias:', error);
    return [];
  }
};

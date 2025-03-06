import { createClient } from '@supabase/supabase-js';
import { NewsArticle } from './newsApi';

// Configuração do cliente Supabase
const supabaseUrl = 'https://syzclaaocrlwqudebrwt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5emNsYWFvY3Jsd3F1ZGVicnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwNjIwMTYsImV4cCI6MjA1NjYzODAxNn0.zzSnomEvbzS6pdEy2z31BkH8OFwNjATvP7RTkUQIvyI';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para buscar notícias do mercado do Supabase
export async function fetchMarketNewsFromSupabase(limit: number = 10, category?: string): Promise<any[]> {
  try {
    console.log(`Buscando notícias do mercado no Supabase (limite: ${limit}, categoria: ${category || 'todas'})`);

    // Construir a query
    let query = supabase.from('market_news').select('*');
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query.order('published_at', { ascending: false }).limit(limit);
    
    if (error) {
      console.error('Erro ao buscar dados do Supabase:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Erro ao conectar com Supabase:', error);
    return [];
  }
}

// Função para salvar notícias no Supabase
export async function saveNewsToSupabase(news: NewsArticle[]): Promise<void> {
  try {
    // Transformar o formato das notícias para o formato do Supabase
    const formattedNews = news.map(item => ({
      title: item.title,
      description: item.description || '',
      summary: item.description || '',
      content: item.content || '',
      url: item.url,
      image_url: item.imageUrl || '',
      source: item.source,
      published_at: item.publishedAt,
      related_symbols: item.relatedSymbols || [],
      sentiment: item.sentiment || 0,
      category: 'general'
    }));

    // Inserir notícias no Supabase
    const { error } = await supabase.from('market_news').insert(formattedNews);

    if (error) {
      console.error('Erro ao salvar notícias no Supabase:', error);
    }
  } catch (error) {
    console.error('Erro ao salvar notícias:', error);
  }
}

// Função para buscar sinais de trading do Supabase
export async function fetchTradingSignals(limit: number = 15): Promise<any[]> {
  try {
    console.log(`Buscando sinais de trading (limite: ${limit})`);
    
    const { data, error } = await supabase
      .from('trading_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Erro ao buscar sinais de trading:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Erro ao conectar com Supabase para sinais de trading:', error);
    return [];
  }
}

// Função para buscar sinais de trading por tipo
export async function fetchTradingSignalsByType(
  type: 'buy' | 'sell',
  limit: number = 10
): Promise<any[]> {
  try {
    console.log(`Buscando sinais de trading do tipo ${type} (limite: ${limit})`);
    
    const { data, error } = await supabase
      .from('trading_signals')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error(`Erro ao buscar sinais de trading do tipo ${type}:`, error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Erro ao conectar com Supabase para sinais por tipo:', error);
    return [];
  }
}

// Função para buscar sinais de trading fortes (com alta taxa de sucesso)
export async function fetchStrongTradingSignals(
  successRateThreshold: number = 0.75,
  limit: number = 5
): Promise<any[]> {
  try {
    console.log(`Buscando sinais de trading fortes (taxa de sucesso > ${successRateThreshold}, limite: ${limit})`);
    
    const { data, error } = await supabase
      .from('trading_signals')
      .select('*')
      .gte('success_rate', successRateThreshold)
      .eq('status', 'active')
      .order('success_rate', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Erro ao buscar sinais de trading fortes:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Erro ao conectar com Supabase para sinais fortes:', error);
    return [];
  }
}

// Função para atualizar o status de um sinal de trading
export async function updateTradingSignalStatus(id: string, status: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('trading_signals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      console.error('Erro ao atualizar status do sinal:', error);
    }
  } catch (error) {
    console.error('Erro ao conectar com Supabase para atualização de status:', error);
  }
}

// Função para criar tabelas no Supabase
export async function createTables() {
  const { error: tradingSignalsError } = await supabase.rpc('create_table', {
    name: 'trading_signals',
    definition: `
      CREATE TABLE IF NOT EXISTS trading_signals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        symbol VARCHAR NOT NULL,
        type VARCHAR NOT NULL,
        signal VARCHAR NOT NULL,
        reason TEXT,
        strength FLOAT,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        price FLOAT,
        entry_price FLOAT,
        stop_loss FLOAT,
        target_price FLOAT,
        success_rate FLOAT,
        timeframe VARCHAR,
        expiry TIMESTAMPTZ,
        risk_reward FLOAT,
        status VARCHAR DEFAULT 'active',
        score FLOAT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
  })

  if (tradingSignalsError) {
    console.error('Error creating trading_signals table:', tradingSignalsError)
  }

  const { error: marketNewsError } = await supabase.rpc('create_table', {
    name: 'market_news',
    definition: `
      CREATE TABLE IF NOT EXISTS market_news (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR NOT NULL,
        description TEXT,
        url VARCHAR,
        source VARCHAR,
        published_at TIMESTAMPTZ,
        sentiment FLOAT,
        relevance FLOAT,
        symbols TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
  })

  if (marketNewsError) {
    console.error('Error creating market_news table:', marketNewsError)
  }
}

// Exportar o cliente Supabase para uso em outros módulos
export { supabase }; 
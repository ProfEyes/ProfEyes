/**
 * SERVIDOR LOCAL - ATUALIZAÇÃO AUTOMÁTICA DE NOTÍCIAS
 * 
 * Este script:
 * 1. Atualiza notícias a cada 5 horas automaticamente
 * 2. Roda em segundo plano enquanto você desenvolve
 * 3. Substitui o Vercel Cron Jobs para desenvolvimento local
 * 
 * COMO USAR:
 * node scripts/start-news-updater.mjs
 * 
 * PARAR:
 * Ctrl + C
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const FINNHUB_API_KEY = 'd09dep1r01qnv9ci80tgd09dep1r01qnv9ci80u0';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://arkrjextwpwqhrvcijyr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Intervalo de atualização (5 horas em milissegundos)
const UPDATE_INTERVAL = 5 * 60 * 60 * 1000; // 5 horas
// const UPDATE_INTERVAL = 60 * 1000; // 1 minuto (para testes)

// Validar variáveis de ambiente
if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ ERRO: SUPABASE_SERVICE_ROLE_KEY não configurada!');
  console.log('📝 Configure no arquivo .env:');
  console.log('   VITE_SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui');
  process.exit(1);
}

async function updateNews() {
  try {
    console.log('\n📰 [News Updater] Iniciando atualização...');
    console.log('⏰', new Date().toLocaleString('pt-BR'));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const categories = ['general', 'forex', 'crypto', 'merger'];
    let allNews = [];

    for (const category of categories) {
      try {
        const finnhubUrl = `https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_API_KEY}`;
        
        const response = await fetch(finnhubUrl);
        if (!response.ok) continue;

        const data = await response.json();
        
        const allowedSources = ['CNBC', 'CoinDesk'];
        const filteredNews = data
          .filter(item => {
            if (!item.image || item.image.trim() === '') return false;
            const source = item.source?.toUpperCase() || '';
            return allowedSources.some(allowed => source.includes(allowed.toUpperCase()));
          })
          .map((item) => ({
            id: `finnhub-${item.id}`,
            headline: item.headline || '',
            summary: item.summary || '',
            source: item.source || '',
            url: item.url || '',
            image_url: item.image || '',
            category: item.category || 'business',
            published_at: new Date(item.datetime * 1000).toISOString(),
            related_symbols: item.related ? item.related.split(',').filter(Boolean) : []
          }));

        allNews = [...allNews, ...filteredNews];
      } catch (error) {
        console.warn(`⚠️ Erro em ${category}:`, error.message);
      }
    }

    if (allNews.length === 0) {
      console.log('⚠️ Nenhuma notícia encontrada');
      return;
    }

    // Limpar antigas
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await supabase.from('market_news').delete().lt('published_at', twoDaysAgo);

    // Salvar
    const { data: inserted, error } = await supabase
      .from('market_news')
      .upsert(allNews, { onConflict: 'id' })
      .select();

    if (error) throw error;

    // Log
    await supabase.from('news_update_log').insert({
      news_count: inserted?.length || 0,
      status: 'success',
      error: null
    });

    console.log(`✅ ${inserted?.length} notícias atualizadas`);
    console.log(`⏰ Próxima atualização: ${new Date(Date.now() + UPDATE_INTERVAL).toLocaleString('pt-BR')}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar imediatamente
console.log('🚀 News Updater iniciado!');
console.log(`🔄 Atualizando a cada ${UPDATE_INTERVAL / (60 * 60 * 1000)} horas`);
console.log('⏹️  Pressione Ctrl+C para parar\n');

updateNews();

// Agendar atualizações periódicas
setInterval(updateNews, UPDATE_INTERVAL);

/**
 * SCRIPT LOCAL - ATUALIZAR NOTÍCIAS NO BANCO
 * 
 * Este script:
 * 1. Busca notícias da API Finnhub
 * 2. Salva no banco Supabase (compartilhado entre todos)
 * 3. Pode ser executado manualmente ou via scheduler
 * 
 * COMO USAR:
 * node scripts/update-news-local.mjs
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const FINNHUB_API_KEY = 'd09dep1r01qnv9ci80tgd09dep1r01qnv9ci80u0';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://arkrjextwpwqhrvcijyr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validar variáveis de ambiente
if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ ERRO: SUPABASE_SERVICE_ROLE_KEY não configurada!');
  console.log('📝 Configure no arquivo .env:');
  console.log('   VITE_SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui');
  process.exit(1);
}

async function updateNews() {
  try {
    console.log('📰 [Update News] Iniciando atualização de notícias...');
    console.log('⏰', new Date().toLocaleString('pt-BR'));

    // Criar cliente Supabase com service_role (bypass RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // ============================================
    // 1. BUSCAR NOTÍCIAS DA API FINNHUB
    // ============================================
    
    const categories = ['general', 'forex', 'crypto', 'merger'];
    let allNews = [];

    for (const category of categories) {
      try {
        const finnhubUrl = `https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_API_KEY}`;
        
        console.log(`🔍 Buscando categoria: ${category}...`);
        
        const response = await fetch(finnhubUrl, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.error(`❌ Finnhub API erro: ${response.status} para ${category}`);
          continue;
        }

        const data = await response.json();
        console.log(`✅ Categoria ${category}: ${data?.length || 0} notícias recebidas`);

        // Filtrar apenas notícias com imagens E de fontes específicas
        const allowedSources = ['CNBC', 'CoinDesk'];
        const filteredNews = data.filter(item => {
          if (!item.image || item.image.trim() === '') return false;
          const source = item.source?.toUpperCase() || '';
          return allowedSources.some(allowed => source.includes(allowed.toUpperCase()));
        });

        console.log(`📰 Filtradas ${filteredNews.length} notícias de CNBC/CoinDesk (de ${data.length} totais)`);

        // Converter para o formato do banco
        const convertedNews = filteredNews.map((item) => ({
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

        allNews = [...allNews, ...convertedNews];
      } catch (error) {
        console.warn(`⚠️ Erro ao processar notícias da categoria ${category}:`, error);
      }
    }

    console.log(`📊 Total de ${allNews.length} notícias para salvar no banco`);

    // ============================================
    // 2. SALVAR NO BANCO (UPSERT)
    // ============================================

    if (allNews.length === 0) {
      // Registrar log de atualização (sem notícias)
      await supabase.from('news_update_log').insert({
        news_count: 0,
        status: 'warning',
        error: 'Nenhuma notícia encontrada'
      });

      console.log('⚠️ Nenhuma notícia nova encontrada');
      return;
    }

    // Limpar notícias antigas (manter apenas últimas 48 horas)
    console.log('🧹 Limpando notícias antigas (>48h)...');
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { error: deleteError } = await supabase
      .from('market_news')
      .delete()
      .lt('published_at', twoDaysAgo);

    if (deleteError) {
      console.warn('⚠️ Erro ao limpar notícias antigas:', deleteError);
    } else {
      console.log('✅ Notícias antigas removidas');
    }

    // Inserir/atualizar notícias (upsert)
    console.log('💾 Salvando notícias no banco...');
    const { data: insertedNews, error: insertError } = await supabase
      .from('market_news')
      .upsert(allNews, { onConflict: 'id' })
      .select();

    if (insertError) {
      console.error('❌ Erro ao salvar notícias:', insertError);
      
      // Registrar log de erro
      await supabase.from('news_update_log').insert({
        news_count: 0,
        status: 'error',
        error: insertError.message
      });

      throw insertError;
    }

    console.log(`✅ ${insertedNews?.length || 0} notícias salvas no banco`);

    // ============================================
    // 3. REGISTRAR LOG DE SUCESSO
    // ============================================

    await supabase.from('news_update_log').insert({
      news_count: insertedNews?.length || 0,
      status: 'success',
      error: null
    });

    console.log('\n🎉 Atualização concluída com sucesso!');
    console.log(`📊 Total: ${insertedNews?.length} notícias`);
    console.log(`⏰ ${new Date().toLocaleString('pt-BR')}\n`);

  } catch (error) {
    console.error('\n❌ [Update News] Erro:', error);
    process.exit(1);
  }
}

// Executar
updateNews();

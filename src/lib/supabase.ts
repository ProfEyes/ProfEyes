import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = 'https://nkvqddfphyiiufkuqavd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdnFkZGZwaHlpaXVma3VxYXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MDY3MzgsImV4cCI6MjA1Njk4MjczOH0.fX9wm_fBTigakGCcH2nW2VVr_aqbtsusVMeEKQz2Fpw';

// Função para fazer fetch com retry
const fetchWithRetry = async (url, options = {}, retries = 3, backoff = 300) => {
  try {
    const timeout = 30000; // 30 segundos de timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    if (retries === 0) {
      throw err;
    }
    
    console.warn(`Erro na requisição, tentando novamente em ${backoff}ms...`, err);
    
    // Esperar antes de tentar novamente
    await new Promise(resolve => setTimeout(resolve, backoff));
    
    // Tentar novamente com mais tempo de backoff
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  }
};

// Cria um cliente Supabase com configuração melhorada
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    flowType: 'implicit',
    debug: false  // Desativar para produção
  },
  global: {
    fetch: fetchWithRetry
  },
  // Melhorando as opções de conexão
  realtime: {
    params: {
      eventsPerSecond: 1
    }
  }
});

// A chave de service role abaixo deve ser usada apenas no backend por questões de segurança
// Não exponha esta chave no front-end
// Se precisar usar essa chave, crie um endpoint no backend para operações administrativas
// Exemplo de como criar um cliente com role de serviço (NÃO use no front-end)
// export const supabaseAdmin = createClient(supabaseUrl, 'SUA_SERVICE_ROLE_KEY'); 
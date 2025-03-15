import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = 'https://nkvqddfphyiiufkuqavd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdnFkZGZwaHlpaXVma3VxYXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MDY3MzgsImV4cCI6MjA1Njk4MjczOH0.fX9wm_fBTigakGCcH2nW2VVr_aqbtsusVMeEKQz2Fpw';

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
    fetch: (url, options) => {
      const timeout = 30000; // 30 segundos de timeout para todas as requisições
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Usar a fetch padrão, mas com timeout
      return fetch(url, {
        ...options,
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));
    }
  }
});

// A chave de service role abaixo deve ser usada apenas no backend por questões de segurança
// Não exponha esta chave no front-end
// Se precisar usar essa chave, crie um endpoint no backend para operações administrativas
// Exemplo de como criar um cliente com role de serviço (NÃO use no front-end)
// export const supabaseAdmin = createClient(supabaseUrl, 'SUA_SERVICE_ROLE_KEY'); 
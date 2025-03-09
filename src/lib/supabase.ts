import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nkvqddfphyiiufkuqavd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdnFkZGZwaHlpaXVma3VxYXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MDY3MzgsImV4cCI6MjA1Njk4MjczOH0.fX9wm_fBTigakGCcH2nW2VVr_aqbtsusVMeEKQz2Fpw';

// Cria um cliente Supabase com configuração básica
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: window.localStorage
  }
});

// A chave de service role abaixo deve ser usada apenas no backend por questões de segurança
// Não exponha esta chave no front-end
// Se precisar usar essa chave, crie um endpoint no backend para operações administrativas
// Exemplo de como criar um cliente com role de serviço (NÃO use no front-end)
// export const supabaseAdmin = createClient(supabaseUrl, 'SUA_SERVICE_ROLE_KEY'); 
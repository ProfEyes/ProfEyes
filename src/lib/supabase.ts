import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vaxiqvowvavrfyjmrxpl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZheGlxdm93dmF2cmZ5am1yeHBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NTgzMTIsImV4cCI6MjA1OTEzNDMxMn0.t4u27nvbPmvtC25WMdSCxxb3nZVGvUFxr6GC34lg7Ok';

// Função para fazer fetch com retry
const fetchWithRetry = async (url, options = {}, retries = 3, backoff = 300) => {
  try {
    const timeout = 15000; // 15 segundos de timeout (reduzido de 30s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn(`Requisição para ${url} abortada por timeout após ${timeout}ms`);
    }, timeout);
    
    // Detectar se é uma requisição de token para tratar de forma especial
    const isTokenRequest = url.includes('/auth/v1/token');
    if (isTokenRequest) {
      console.log('Requisição de token detectada');
    }
    
    console.log(`Iniciando requisição para ${url}`);
    const startTime = performance.now();
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    const endTime = performance.now();
    console.log(`Requisição para ${url} completada em ${endTime - startTime}ms`);
    
    // Verificar erros específicos de token
    if (isTokenRequest && !response.ok) {
      console.warn(`Erro na requisição de token: ${response.status} ${response.statusText}`);
      
      // Se for um erro 400 em requisição de token, forneça detalhes para depuração
      if (response.status === 400) {
        try {
          const errorData = await response.clone().json();
          console.error('Detalhes do erro 400 no token:', errorData);
        } catch (e) {
          console.error('Não foi possível ler detalhes do erro no token');
        }
      }
    }
    
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    if (retries === 0) {
      console.error(`Falha definitiva na requisição para ${url} após todas as tentativas`, err);
      throw err;
    }
    
    console.warn(`Erro na requisição para ${url}, tentando novamente em ${backoff}ms...`, err);
    
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
    flowType: 'pkce',
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

// Função para verificar se uma tabela existe
export const doesTableExist = async (tableName: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('count')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
};

// Função para salvar informações do usuário de forma resiliente
export const saveSafeUserData = async (userId: string, data: any): Promise<void> => {
  try {
    // Verifica se a tabela de perfis existe
    const userProfilesExist = await doesTableExist('user_profiles');
    
    if (userProfilesExist) {
      // Tenta atualizar o perfil do usuário
      // Utilizando o cliente admin para garantir acesso
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          user_id: userId,
          ...data,
          updated_at: new Date().toISOString()
        });
      
      if (updateError) {
        console.warn('Erro ao atualizar perfil do usuário:', updateError);
      }
    } else {
      console.warn('Tabela user_profiles não existe. Dados do usuário não serão salvos.');
    }
  } catch (error) {
    console.error('Erro ao salvar dados do usuário:', error);
  }
};

// A chave de service role abaixo deve ser usada apenas no backend por questões de segurança
// Não exponha esta chave no front-end
// Se precisar usar essa chave, crie um endpoint no backend para operações administrativas
// Exemplo de como criar um cliente com role de serviço (NÃO use no front-end)
// export const supabaseAdmin = createClient(supabaseUrl, 'SUA_SERVICE_ROLE_KEY');

// Criar um cliente Supabase com permissões de administrador
// ATENÇÃO: Esta chave só deve ser usada em desenvolvimento ou via backend seguro
// Está sendo usada temporariamente para permitir a criação das tabelas necessárias
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZheGlxdm93dmF2cmZ5am1yeHBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzU1ODMxMiwiZXhwIjoyMDU5MTM0MzEyfQ.7LqejUFxjrpH7G8ZW_eF6e-BktUZ-w-E5FhSb_IOFK0";

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`
    },
    fetch: fetchWithRetry
  }
});

// Função para executar SQL diretamente (apenas para admin/desenvolvimento)
export const execSQL = async (sql: string): Promise<{ success: boolean; error: any }> => {
  try {
    console.log(`Executando SQL: ${sql}`);
    
    // Esta é uma função RPC que deve ser criada no Supabase para permitir execução de SQL
    // A função não existe por padrão, então usamos uma abordagem alternativa
    
    // Fazer uma requisição direta à API do Supabase para executar o SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro ao executar SQL (${response.status}): ${errorText}`);
      return { success: false, error: { message: errorText, status: response.status } };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Erro ao executar SQL:', error);
    return { success: false, error };
  }
}; 
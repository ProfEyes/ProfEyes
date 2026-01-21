import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { PostgrestError, PostgrestFilterBuilder } from '@supabase/postgrest-js';

// Variáveis para armazenar as instâncias singleton com verificação mais robusta
const _supabaseInstance: SupabaseClient<Database> | null = null;
const _supabaseNoPKCEInstance: SupabaseClient<Database> | null = null;
const _supabaseAdminInstance: SupabaseClient<Database> | null = null;

// Flag para garantir que as instâncias sejam criadas apenas uma vez
const _instancesInitialized = false;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://arkrjextwpwqhrvcijyr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFya3JqZXh0d3B3cWhydmNpanlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDM4OTUsImV4cCI6MjA4NDQ3OTg5NX0.qAmrahULxsyZsmwwSR1FbEclNMwLe-vnUeAvpxDTdkY';

// Log detalhado para debug
console.log('🔍 DEBUG - Configuração Supabase:');
console.log('   URL:', supabaseUrl);
console.log('   Anon Key (primeiros 50 chars):', supabaseAnonKey.substring(0, 50) + '...');
console.log('   VITE_SUPABASE_URL do env:', import.meta.env.VITE_SUPABASE_URL);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key são obrigatórios');
}

// Limpar dados antigos do projeto anterior (trbbmwtiggmkzvrliomr)
if (typeof window !== 'undefined') {
  const oldProjectId = 'trbbmwtiggmkzvrliomr.supabase.co';
  const localKeysToRemove: string[] = [];
  const sessionKeysToRemove: string[] = [];
  
  // Procurar por todas as chaves no localStorage que contenham o ID do projeto antigo
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(oldProjectId)) {
      localKeysToRemove.push(key);
    }
  }
  
  // Procurar por todas as chaves no sessionStorage que contenham o ID do projeto antigo
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.includes(oldProjectId)) {
      sessionKeysToRemove.push(key);
    }
  }
  
  // Remover as chaves antigas do localStorage
  if (localKeysToRemove.length > 0) {
    console.log(`🧹 Limpando ${localKeysToRemove.length} chaves antigas do localStorage...`);
    localKeysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`   Removido: ${key}`);
    });
  }
  
  // Remover as chaves antigas do sessionStorage
  if (sessionKeysToRemove.length > 0) {
    console.log(`🧹 Limpando ${sessionKeysToRemove.length} chaves antigas do sessionStorage...`);
    sessionKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`   Removido: ${key}`);
    });
  }
  
  if (localKeysToRemove.length > 0 || sessionKeysToRemove.length > 0) {
    console.log('✅ Limpeza de dados antigos concluída!');
  }
}

// Função para fazer fetch com retry
const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3, backoff = 300) => {
  try {
    const timeout = 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn(`Requisição para ${url} abortada por timeout após ${timeout}ms`);
    }, timeout);
    
    const isTokenRequest = url.includes('/auth/v1/token');
    if (isTokenRequest) {
      console.log('Requisição de token detectada');
    }
    
    const headers = new Headers(options.headers);
    
    // Adicionar headers básicos
    headers.set('apikey', supabaseAnonKey);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');

    // Verificar se é uma requisição para a API REST do Supabase
    if (url.includes('/rest/v1/')) {
      headers.set('Accept-Profile', 'public');
      headers.set('Content-Profile', 'public');
      
      // Adicionar token de autenticação se disponível
      const session = JSON.parse(localStorage.getItem('sb-' + supabaseUrl.split('//')[1] + '-auth-token') || '{}');
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
      }
    }

    const response = await fetch(url, {
      ...options,
      headers: headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    if (retries === 0) throw err;
    await new Promise(resolve => setTimeout(resolve, backoff));
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  }
};

// Função para obter o token de autenticação do localStorage
const getStoredSession = () => {
  try {
    const key = `sb-${supabaseUrl.split('//')[1]}-auth-token`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.currentSession?.access_token) {
        return parsed.currentSession;
      }
    }
  } catch (error) {
    console.warn('Erro ao recuperar sessão do localStorage:', error);
  }
  return null;
};

// Implementação de Proxy para lazy loading e melhor handling de erros
function createLazySupabaseClient(type: 'regular' | 'admin' | 'noPKCE') {
  let instance: SupabaseClient<Database> | null = null;
  
  // Criar uma função de handler para o Proxy
  const handler = {
    get(target: Record<string, unknown>, prop: string) {
      // Inicializar instância sob demanda
      if (!instance) {
        console.log(`📦 Criando cliente Supabase (${type}) sob demanda`);
        console.log(`   URL para conexão: ${supabaseUrl}`);
        try {
          switch (type) {
            case 'regular':
              // Extrair o project ref da URL para usar no storageKey
              const projectRef = supabaseUrl.split('//')[1].split('.')[0];
              console.log(`📦 Usando storageKey: sb-${projectRef}-auth-token`);
              
              instance = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                  storage: window.localStorage,
                  storageKey: `sb-${projectRef}-auth-token`,
                  autoRefreshToken: true,
                  persistSession: true,
                  detectSessionInUrl: true
                },
                global: {
                  headers: {
                    'X-Client-Info': 'supabase-js-web'
                  }
                }
              });
              // Salvar referência global para evitar múltiplas instâncias
              if (typeof window !== 'undefined') {
                (window as unknown as Record<string, unknown>).__supabase_client = instance;
              }
              break;
              
            case 'admin': {
              const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFya3JqZXh0d3B3cWhydmNpanlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODkwMzg5NSwiZXhwIjoyMDg0NDc5ODk1fQ.2acjkcHYdKAT7jDCJP5b9nAl0J81vgZxwaZaJ-opnKk';
              
              instance = createClient(supabaseUrl, serviceRoleKey, {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false,
                  storageKey: 'supabase-auth-admin'
                },
                global: {
                  headers: {
                    'X-Client-Info': 'supabase-js-admin'
                  }
                }
              });
              // Salvar referência global para evitar múltiplas instâncias
              if (typeof window !== 'undefined') {
                (window as unknown as Record<string, unknown>).__supabase_admin = instance;
              }
              break;
            }
              
            case 'noPKCE':
              instance = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                  persistSession: false,
                  autoRefreshToken: false,
                  detectSessionInUrl: false,
                  flowType: 'implicit',
                  debug: false,
                  storageKey: 'supabase-auth-nopkce'
                },
                global: {
                  headers: {
                    'X-Client-Info': 'supabase-js-nopkce'
                  }
                }
              });
              // Salvar referência global para evitar múltiplas instâncias
              if (typeof window !== 'undefined') {
                (window as unknown as Record<string, unknown>).__supabase_nopkce = instance;
              }
              break;
          }
        } catch (error) {
          console.error(`❌ Erro ao criar cliente Supabase (${type}):`, error);
          throw new Error(`Falha ao inicializar cliente Supabase (${type})`);
        }
      }
      
      // Interceptar métodos específicos para adicionar tratamento de erros
      if (prop === 'auth' && instance[prop]) {
        // Proxy para métodos de autenticação
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Proxy(instance[prop], {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          get(authTarget: any, authMethod: string) {
            const original = authTarget[authMethod];
            if (typeof original === 'function') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return async (...args: any[]) => {
                try {
                  // Adicionar retry para métodos de autenticação
                  let attempts = 0;
                  const maxAttempts = 3;
                  let lastError = null;
                  
                  while (attempts < maxAttempts) {
                    try {
                      console.log(`🔄 Tentativa ${attempts + 1} de ${maxAttempts} para auth.${String(authMethod)}`);
                      console.log(`   URL Supabase em uso: ${supabaseUrl}`);
                      const result = await original.apply(authTarget, args);
                      console.log(`✅ auth.${String(authMethod)} bem-sucedido`);
                      return result;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (error: any) {
                      lastError = error;
                      attempts++;
                      
                      console.error(`❌ Erro na tentativa ${attempts} de auth.${String(authMethod)}:`, {
                        message: error?.message,
                        status: error?.status,
                        name: error?.name,
                        stack: error?.stack?.split('\n').slice(0, 3).join('\n')
                      });
                      
                      // Verificar se vale a pena tentar novamente
                      const shouldRetry = error?.status >= 500 || // Erros de servidor
                                          error?.status === 429 || // Rate limit
                                          error?.message?.includes('network'); // Erros de rede
                      
                      if (!shouldRetry || attempts >= maxAttempts) {
                        console.error(`⛔ Todas as tentativas falharam para auth.${String(authMethod)}`);
                        break; // Não tenta mais
                      }
                      
                      // Espera exponencial entre tentativas
                      const delay = 1000 * Math.pow(2, attempts - 1);
                      console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                      await new Promise(r => setTimeout(r, delay));
                    }
                  }
                  
                  // Se chegou aqui, todas as tentativas falharam
                  throw lastError;
                } catch (error) {
                  console.error(`❌ Erro em auth.${String(authMethod)}:`, error);
                  throw error;
                }
              };
            }
            return original;
          }
        });
      }
      
      return instance[prop];
    }
  };
  
  return new Proxy({}, handler);
}

// Usar Proxy para lazy-loading e evitar instanciação prematura
export const getSupabase = () => {
  // Verificar se já temos uma instância global
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__supabase_client) {
    return (window as unknown as Record<string, unknown>).__supabase_client;
  }
  
  // Retornar proxy que criará cliente quando necessário
  return createLazySupabaseClient('regular');
};

// Cliente admin via proxy - VERSÃO UNIFICADA
export const getSupabaseAdmin = () => {
  // Verificar se já temos uma instância global
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__supabase_admin) {
    return (window as unknown as Record<string, unknown>).__supabase_admin;
  }
  
  // Retornar proxy que criará cliente quando necessário
  return createLazySupabaseClient('admin');
};

// Cliente sem PKCE via proxy
export const getSupabaseNoPKCE = () => {
  // Verificar se já temos uma instância global
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__supabase_nopkce) {
    return (window as unknown as Record<string, unknown>).__supabase_nopkce;
  }
  
  // Retornar proxy que criará cliente quando necessário
  return createLazySupabaseClient('noPKCE');
};

// Manter exportação do cliente direto para compatibilidade retroativa
// mas usando proxy sob o capô
export const supabase = getSupabase();

// REMOVER função duplicada - comentada para referência histórica
/*
// Função para obter cliente admin
export const getSupabaseAdmin = (): SupabaseClient<Database> => {
  if (!_supabaseAdminInstance) {
    // Service role key do mcp-config.json ou das variáveis de ambiente
    const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyYmJtd3RpZ2dta3p2cmxpb21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDAxNDQ1OSwiZXhwIjoyMDY1NTkwNDU5fQ.87u3vMLfI8bQDeM0KQBkeebiXfOJe4Dp8iEpyP896JM';
    
    if (serviceRoleKey) {
      _supabaseAdminInstance = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        realtime: {
          // Desabilitar Realtime para evitar erros de WebSocket
          params: {
            eventsPerSecond: -1 // Desabilita completamente
          }
        },
        global: {
          headers: {
            'X-Client-Info': 'supabase-js-admin'
          }
        }
      });
    } else {
      // Fallback para cliente normal se não tiver service role key
      console.warn('Service role key não encontrada, usando cliente normal');
      return supabase;
    }
  }
  
  return _supabaseAdminInstance;
};
*/

// REMOVER - Funções duplicadas - já definidas acima com proxy
/*
// Função para obter cliente normal
export const getSupabase = (): SupabaseClient<Database> => {
  return supabase;
};

// Cliente Supabase alternativo sem PKCE para operações específicas como reset de senha
export const getSupabaseNoPKCE = () => {
  if (_supabaseNoPKCEInstance) return _supabaseNoPKCEInstance;
  
  // Verificação adicional para evitar múltiplas instâncias
  if (typeof window !== 'undefined' && (window as any).__supabase_nopkce) {
    _supabaseNoPKCEInstance = (window as any).__supabase_nopkce;
    return _supabaseNoPKCEInstance;
  }
  
  _supabaseNoPKCEInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'implicit',  // Usar implicit em vez de pkce
      debug: false,
      storageKey: 'supabase-auth-nopkce' // Chave única para evitar conflitos
    },
    global: {
      fetch: fetchWithRetry
    }
  });
  
  // Armazenar globalmente para evitar duplicação
  if (typeof window !== 'undefined') {
    (window as any).__supabase_nopkce = _supabaseNoPKCEInstance;
  }
  
  return _supabaseNoPKCEInstance;
};
*/

// Função para verificar se uma tabela existe
export const doesTableExist = async (tableName: keyof Database['public']['Tables'] | string): Promise<boolean> => {
  try {
    const supabase = getSupabase();
    
    if (tableName === 'user_profiles') {
      return true;
    }
    
    const { error } = await (supabase as SupabaseClient<Database>)
      .from(tableName as keyof Database['public']['Tables'])
      .select('*', { count: 'exact', head: true })
      .limit(1);

    return !error;
  } catch (error) {
    console.error(`Erro ao verificar tabela ${tableName}:`, error);
    return false;
  }
};

// Função para salvar informações do usuário de forma resiliente
export const saveSafeUserData = async (userId: string, data: Record<string, unknown>): Promise<void> => {
  try {
    // Verifica se a tabela de perfis existe
    const userProfilesExist = await doesTableExist('user_profiles');
    
    if (userProfilesExist) {
      try {
        // Tenta atualizar o perfil do usuário
        // Utilizando o cliente admin para garantir acesso
        const { error: updateError } = await (getSupabaseAdmin() as SupabaseClient<Database>)
          .from('user_profiles')
          .upsert({
            user_id: userId,
            ...data,
            updated_at: new Date().toISOString()
          });
        
        if (updateError) {
          console.warn('Erro ao atualizar perfil do usuário:', updateError);
        }
      } catch (updateError) {
        console.error('Erro ao atualizar perfil:', updateError);
      }
    } else {
      console.warn('Tabela user_profiles não existe. Dados do usuário não serão salvos.');
    }
  } catch (error) {
    console.error('Erro ao salvar dados do usuário:', error);
  }
};

/**
 * Função específica para salvar o avatar do usuário tanto nos metadados da autenticação 
 * quanto na tabela user_profiles para garantir persistência completa
 * 
 * @param userId ID do usuário
 * @param avatarUrl URL do avatar
 * @returns Promise com o resultado da operação
 */
export const saveUserAvatar = async (userId: string, avatarUrl: string): Promise<{success: boolean; error: string | null}> => {
  try {
    if (!userId || !avatarUrl) {
      return { success: false, error: "ID do usuário ou URL do avatar inválidos" };
    }
    
    console.log(`Salvando avatar para usuário ${userId}`);
    
    // 1. Atualizar os metadados do usuário na tabela auth.users
    const { data: authData, error: authError } = await (getSupabase() as SupabaseClient<Database>).auth.updateUser({
      data: {
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      }
    });
    
    if (authError) {
      console.error("Erro ao atualizar avatar nos metadados:", authError);
    }
    
    // 2. Atualizar a tabela user_profiles para persistência completa com fallback para admin
    let profileError = null;
    try {
      const { error } = await (getSupabase() as SupabaseClient<Database>).from('user_profiles')
        .upsert({
          user_id: userId,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id' 
        });
      
      profileError = error;
      
      // Se houver erro 401/403, tentar com cliente admin
      if (error && (error.code === '401' || error.code === '403' || error.code === 'PGRST301')) {
        console.warn('Tentando salvar avatar com cliente admin devido a erro de autorização');
        
        const { error: adminError } = await (getSupabaseAdmin() as SupabaseClient<Database>)
          .from('user_profiles')
          .upsert({
            user_id: userId,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'user_id' 
          });
        
        profileError = adminError;
      }
    } catch (error) {
      profileError = error;
    }
    
    if (profileError) {
      console.error("Erro ao atualizar avatar na tabela user_profiles:", profileError);
      return { success: false, error: profileError };
    }
    
    // Se chegou aqui, pelo menos uma das operações foi bem-sucedida
    return { 
      success: true, 
      error: authError ? "Avatar salvo parcialmente" : null 
    };
  } catch (error) {
    console.error("Erro inesperado ao salvar avatar:", error);
    return { success: false, error };
  }
};

/**
 * Função específica para salvar o nome de exibição do usuário
 * 
 * @param userId ID do usuário
 * @param displayName Nome de exibição do usuário
 * @returns Promise com o resultado da operação
 */
export const saveUserDisplayName = async (userId: string, displayName: string): Promise<{success: boolean; error: string | null}> => {
    if (!userId || !displayName) {
    console.error("ID de usuário ou nome de exibição vazios");
    return { success: false, error: "ID de usuário ou nome de exibição vazios" };
  }
  
  // Validar comprimento do nome
  if (displayName.length < 2 || displayName.length > 30) {
    console.error("Nome de exibição deve ter entre 2 e 30 caracteres");
    return { success: false, error: "Nome de exibição deve ter entre 2 e 30 caracteres" };
    }

  try {
    // Verificar se há caracteres inválidos ou problemas de truncamento
    const displayNameToSave = displayName.trim();

    if (import.meta.env.DEV) {
      console.log(`Salvando nome original: "${displayName}" | Após trim: "${displayNameToSave}" | Comprimento: ${displayNameToSave.length}`);
      console.log(`Hex: ${Array.from(displayNameToSave).map(c => c.charCodeAt(0).toString(16)).join(' ')}`);
    }
    
    // 1. Atualizar metadados do usuário
    let authError = null;
    try {
      const { error } = await (getSupabase() as SupabaseClient<Database>).auth.updateUser({
        data: { display_name: displayNameToSave }
      });
      authError = error;
    } catch (error) {
      console.error("Erro ao atualizar nome nos metadados:", authError);
    }

    // 2. Atualizar a tabela user_profiles para persistência completa
    let profileError = null;
    try {
      // CORREÇÃO: Usando a sintaxe correta para upsert no Supabase v2
      const { error } = await (getSupabase() as SupabaseClient<Database>)
        .from('user_profiles')
        .upsert({
        user_id: userId,
        display_name: displayNameToSave,
        updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id' 
        });

      // Se houver erro 401/403, tentar com cliente admin
      if (error?.code === '401' || error?.code === '403' || error?.code === 'PGRST301') {
        console.warn('Tentando salvar nome com cliente admin devido a erro de autorização');
        // CORREÇÃO: Mesma sintaxe correta para o cliente admin
        const { error: adminError } = await (getSupabaseAdmin() as SupabaseClient<Database>)
          .from('user_profiles')
          .upsert({
          user_id: userId,
          display_name: displayNameToSave,
          updated_at: new Date().toISOString()
          }, { 
            onConflict: 'user_id' 
          });

        profileError = adminError;
      } else {
        profileError = error;
      }
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      profileError = error;
    }

    // Atualizar localStorage e disparar evento mesmo se houver erros parciais
    localStorage.setItem("user-name", displayNameToSave);
    
    try {
      window.dispatchEvent(new CustomEvent('username-updated', { 
        detail: { 
          userName: displayNameToSave, 
          fromSave: true, 
          originalLength: displayNameToSave.length 
        }
      }));
    } catch (eventError) {
      console.warn("Erro ao disparar evento:", eventError);
    }

    // Uma verificação final para garantir que o valor no localStorage permanece consistente
    const finalSavedValue = localStorage.getItem("user-name");
    if (finalSavedValue !== displayNameToSave) {
      console.warn("AVISO: O valor no localStorage foi alterado durante o salvamento!");
      localStorage.setItem("user-name", displayNameToSave);
    }

    return { 
      success: true, 
      error: (authError || profileError) ? "Nome salvo parcialmente" : null
    };
  } catch (error) {
    console.error("Erro inesperado ao salvar nome:", error);
    
    // Mesmo com erro, garantir que o localStorage esteja atualizado
    if (displayName) {
      localStorage.setItem("user-name", displayName);
      
      try {
        window.dispatchEvent(new CustomEvent('username-updated', { 
          detail: { 
            userName: displayName, 
            fromSave: true, 
            originalLength: displayName.length 
          }
        }));
      } catch (eventError) {
        console.warn("Erro ao disparar evento:", eventError);
      }
    }
    
    return { success: false, error };
  }
};

/**
 * Executa SQL diretamente no banco de dados
 * Usa a função exec_sql criada no banco de dados
 */
export const execSQL = async (sql: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log('Executando SQL: ', sql);
    
    const { error } = await (getSupabaseAdmin() as SupabaseClient<Database>).rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`Erro ao executar SQL (${error.code}):`, error);
      return { success: false, error: error.message || 'Erro ao executar SQL' };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Erro ao executar SQL:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao executar SQL' };
  }
};

// Configurações de email personalizadas
export const emailConfig = {
  // Template para email de confirmação
  confirmationTemplate: {
    subject: 'Confirme seu email - Trending',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #000000; color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%); padding: 40px 20px; text-align: center;">
          <img src="${window.location.origin}/profeyes-logo-removebg-preview.png" alt="Trending Logo" style="width: 80px; height: auto; margin-bottom: 20px;">
          <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 600;">Bem-vindo ao Trending!</h1>
        </div>
        
        <div style="padding: 40px 20px; background-color: #111111;">
          <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 20px;">Confirme seu email</h2>
          <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Obrigado por se cadastrar no Trending! Para ativar sua conta e começar a usar nossa plataforma, 
            clique no botão abaixo para confirmar seu endereço de email.
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="{{ .ConfirmationURL }}" 
               style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); 
                      color: #000000; 
                      text-decoration: none; 
                      padding: 15px 30px; 
                      border-radius: 8px; 
                      font-weight: 600; 
                      font-size: 16px; 
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(74, 222, 128, 0.3);">
              Confirmar Email
            </a>
          </div>
          
          <p style="color: #888888; font-size: 14px; line-height: 1.6; margin-top: 30px;">
            Se você não conseguir clicar no botão, copie e cole o link abaixo no seu navegador:
          </p>
          <p style="color: #4ade80; font-size: 14px; word-break: break-all; margin: 10px 0;">
            {{ .ConfirmationURL }}
          </p>
          
          <hr style="border: none; border-top: 1px solid #333333; margin: 30px 0;">
          
          <p style="color: #666666; font-size: 12px; line-height: 1.5;">
            Se você não criou uma conta no Trending, pode ignorar este email com segurança.
            <br><br>
            Este link expira em 24 horas por motivos de segurança.
          </p>
        </div>
        
        <div style="background-color: #000000; padding: 20px; text-align: center; border-top: 1px solid #333333;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            © 2024 Trending. Todos os direitos reservados.
          </p>
        </div>
      </div>
    `
  },
  
  // Template para email de recuperação de senha
  recoveryTemplate: {
    subject: 'Redefinir senha - Trending',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #000000; color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%); padding: 40px 20px; text-align: center;">
          <img src="${window.location.origin}/profeyes-logo-removebg-preview.png" alt="Trending Logo" style="width: 80px; height: auto; margin-bottom: 20px;">
          <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 600;">Redefinir Senha</h1>
        </div>
        
        <div style="padding: 40px 20px; background-color: #111111;">
          <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 20px;">Solicitação de nova senha</h2>
          <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Recebemos uma solicitação para redefinir a senha da sua conta no Trending. 
            Clique no botão abaixo para criar uma nova senha.
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="{{ .ConfirmationURL }}" 
               style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
                      color: #000000; 
                      text-decoration: none; 
                      padding: 15px 30px; 
                      border-radius: 8px; 
                      font-weight: 600; 
                      font-size: 16px; 
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
              Redefinir Senha
            </a>
          </div>
          
          <p style="color: #888888; font-size: 14px; line-height: 1.6; margin-top: 30px;">
            Se você não conseguir clicar no botão, copie e cole o link abaixo no seu navegador:
          </p>
          <p style="color: #f59e0b; font-size: 14px; word-break: break-all; margin: 10px 0;">
            {{ .ConfirmationURL }}
          </p>
          
          <hr style="border: none; border-top: 1px solid #333333; margin: 30px 0;">
          
          <p style="color: #666666; font-size: 12px; line-height: 1.5;">
            Se você não solicitou a redefinição de senha, pode ignorar este email com segurança.
            <br><br>
            Este link expira em 1 hora por motivos de segurança.
          </p>
        </div>
        
        <div style="background-color: #000000; padding: 20px; text-align: center; border-top: 1px solid #333333;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            © 2024 Trending. Todos os direitos reservados.
          </p>
        </div>
      </div>
    `
  }
}; 

// Sistema de exportação com lazy loading para evitar múltiplas instâncias GoTrueClient
// As instâncias só são criadas quando realmente acessadas

// Cache das instâncias exportadas para evitar recriação
let _cachedSupabase: SupabaseClient<Database> | null = null;
let _cachedSupabaseAdmin: SupabaseClient<Database> | null = null;
let _cachedSupabaseNoPKCE: SupabaseClient<Database> | null = null;

// Exportação com lazy loading para supabase principal
export const supabaseProxy = new Proxy({}, {
  get(target, prop) {
    if (!_cachedSupabase) {
      _cachedSupabase = getSupabase() as SupabaseClient<Database>;
    }
    const value = _cachedSupabase[prop as keyof SupabaseClient<Database>];
    return typeof value === 'function' ? value.bind(_cachedSupabase) : value;
  }
}) as SupabaseClient<Database>;

// Exportação com lazy loading para supabaseAdmin
export const supabaseAdminProxy = new Proxy({}, {
  get(target, prop) {
    if (!_cachedSupabaseAdmin) {
      _cachedSupabaseAdmin = getSupabaseAdmin() as SupabaseClient<Database>;
    }
    const value = _cachedSupabaseAdmin[prop as keyof SupabaseClient<Database>];
    return typeof value === 'function' ? value.bind(_cachedSupabaseAdmin) : value;
  }
}) as SupabaseClient<Database>;

// Exportação com lazy loading para supabaseNoPKCE
export const supabaseNoPKCEProxy = new Proxy({}, {
  get(target, prop) {
    if (!_cachedSupabaseNoPKCE) {
      _cachedSupabaseNoPKCE = getSupabaseNoPKCE() as SupabaseClient<Database>;
    }
    const value = _cachedSupabaseNoPKCE[prop as keyof SupabaseClient<Database>];
    return typeof value === 'function' ? value.bind(_cachedSupabaseNoPKCE) : value;
  }
}) as SupabaseClient<Database>; 

// Log para debug
console.log('📦 Módulo supabase.ts carregado com proxy pattern'); 
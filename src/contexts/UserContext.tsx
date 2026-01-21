import * as React from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { supabase } from '@/lib/supabase';
import { getSavedAvatar, saveAvatar, updateProfileAvatar, startAvatarPersistenceService, initAvatarPreloading } from '@/utils/imageUtils';
import { getSavedUserName, saveUserName, loadUserName } from '@/utils/userNameUtils';
import { loadUserSettings, saveUserSettings, updateDisplayName, updateUserAvatar } from '@/utils/userPersistence';
import { attemptAutoLogin, hasValidSession, hasInconsistentAuthData, clearInvalidAuthData, forceLogout } from '@/utils/autoAuth';

// 🛡️ VERIFICAÇÃO DE SEGURANÇA MÁXIMA DO REACT
const REACT_VALIDATION = (() => {
  try {
    const checks = [
      React !== null && React !== undefined,
      typeof React.useState === 'function',
      typeof React.useEffect === 'function', 
      typeof React.useContext === 'function',
      typeof React.createContext === 'function',
      typeof React.useCallback === 'function',
      typeof React.useMemo === 'function'
    ];
    
    const allValid = checks.every(check => check === true);
    if (import.meta.env.DEV) {
      console.log('🔍 [UserContext] Verificação React:', allValid ? '✅ PASSOU' : '❌ FALHOU');
    }
    return allValid;
  } catch (error) {
    console.error('❌ [UserContext] Erro na verificação React:', error);
    return false;
  }
})();

// ⛔ PARAR EXECUÇÃO SE REACT INVÁLIDO
if (!REACT_VALIDATION) {
  const errorMsg = '❌ FATAL ERROR: React hooks não disponíveis. Aplicação não pode inicializar.';
  console.error(errorMsg);
  throw new Error(errorMsg);
}

// Tipagem do cliente Supabase
const typedSupabase = supabase as SupabaseClient<Database>;

// 🏷️ INTERFACE DO CONTEXTO
interface UserContextType {
  userName: string;
  setUserName: (name: string) => void;
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  updateProfile: (data: { name?: string; avatar?: string | null; display_name?: string }) => void;
  refreshUserData: () => Promise<void>;
}

// 🌍 CONTEXTO PRINCIPAL
const UserContext = React.createContext<UserContextType | undefined>(undefined);

// 🛡️ PROVIDER ULTRA-SEGURO
const SecureUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 📊 ESTADOS SEGUROS COM INICIALIZAÇÃO DEFENSIVA
  // Nota: REACT_VALIDATION já foi verificado no nível superior (linha 35) e lançou erro se falhar
  const [userName, setUserName] = React.useState<string>(() => {
    try {
      const savedName = getSavedUserName();
      const result = savedName?.trim() || "";
      if (import.meta.env.DEV) {
        console.log('🏁 [UserContext] Estado inicial userName:', result);
        console.log('🏁 [UserContext] localStorage user-name:', localStorage.getItem('user-name'));
      }
      return result;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ [UserContext] Erro ao carregar nome inicial:', error);
      }
      return "";
    }
  });

  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(() => {
    try {
      const savedAvatar = getSavedAvatar();
      const result = savedAvatar?.trim() || null;
      if (import.meta.env.DEV) {
        console.log('🏁 [UserContext] Estado inicial avatarUrl:', result);
      }
      return result;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ [UserContext] Erro ao carregar avatar inicial:', error);
      }
      return null;
    }
  });

  // 🔒 ESTADO PARA CONTROLAR SE HÁ SESSÃO ATIVA
  const [hasActiveSession, setHasActiveSession] = React.useState<boolean>(false);
  const [sessionCheckAttempts, setSessionCheckAttempts] = React.useState<number>(0);
  const [shouldRedirectToAuth, setShouldRedirectToAuth] = React.useState<boolean>(false);
  
  // 🔍 FUNÇÃO DE VERIFICAÇÃO DE SESSÃO - ULTRA-INTELIGENTE COM DETECÇÃO DE INCONSISTÊNCIAS
  const checkSession = React.useCallback(async (): Promise<boolean> => {
    try {
      // PASSO 1: Verificar se há dados inconsistentes no localStorage
      const hasInconsistencies = await hasInconsistentAuthData();
      
      if (hasInconsistencies) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ [UserContext] 🧹 DADOS INCONSISTENTES DETECTADOS - Limpando...');
        }
        
        // Limpar dados inválidos
        clearInvalidAuthData();
        setHasActiveSession(false);
        setSessionCheckAttempts(0);
        setShouldRedirectToAuth(false);
        
        if (import.meta.env.DEV) {
          console.log('✅ [UserContext] Dados inconsistentes limpos - sistema limpo');
        }
        return false;
      }
      
      // PASSO 2: Verificar sessão válida no servidor (não apenas localStorage)
      const serverHasSession = await hasValidSession();
      
      // Atualizar estado apenas se houver mudança
      if (hasActiveSession !== serverHasSession) {
        setHasActiveSession(serverHasSession);
      }
      
      if (!serverHasSession) {
        setSessionCheckAttempts(prev => {
          const newAttempts = prev + 1;
          
          // Se não há sessão após 3 tentativas, considerar redirecionamento
          if (newAttempts >= 3) {
            // Verificar se não estamos já na página de auth
            const isAuthPage = window.location.pathname.includes('/auth');
            
            if (!isAuthPage && import.meta.env.DEV) {
              console.log('🔄 [UserContext] Múltiplas tentativas sem sessão - modo desenvolvimento');
            } else if (!isAuthPage) {
              setShouldRedirectToAuth(true);
            }
          }
          
          return newAttempts;
        });
      } else {
        // Reset attempts quando sessão é encontrada
        setSessionCheckAttempts(0);
        setShouldRedirectToAuth(false);
      }
      
      return serverHasSession;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ [UserContext] Erro na verificação de sessão:', error);
      }
      setHasActiveSession(false);
      setSessionCheckAttempts(prev => prev + 1);
      return false;
    }
  }, [hasActiveSession]); // Dependência otimizada
  
  // 🔍 FUNÇÃO PRINCIPAL DE BUSCA DE DADOS - ULTRA SEGURA
  const fetchUserData = React.useCallback(async (): Promise<void> => {
    try {
      if (import.meta.env.DEV) {
        console.log('🔍 [UserContext] === INICIANDO BUSCA DE DADOS ===');
      }
      
      let userData: Awaited<ReturnType<typeof typedSupabase.auth.getUser>>['data'] | null = null;
      let userId: string = '';
      let newDisplayName: string | null = null;
      let newAvatarUrl: string | null = null;
      
      // 🔐 VERIFICAÇÃO DE AUTENTICAÇÃO INICIAL
      try {
        const { data: authData, error: authError } = await typedSupabase.auth.getUser();
        
        if (authError) {
          // Se for erro de token expirado, tentar refresh
          if (authError.message?.includes('refresh_token_not_found') || 
              authError.message?.includes('Invalid Refresh Token') ||
              authError.status === 401) {
            if (import.meta.env.DEV) {
              console.warn('⚠️ [UserContext] Token expirado, tentando refresh...');
            }
            
            // Tentar refresh da sessão
            const { error: refreshError } = await typedSupabase.auth.refreshSession();
            if (refreshError) {
              if (import.meta.env.DEV) {
                console.warn('⚠️ [UserContext] Falha no refresh, usuário precisa fazer login novamente');
              }
              return;
            }
            
            // Se chegou aqui, conseguiu recuperar a sessão
            const { data: refreshedData } = await typedSupabase.auth.getUser();
            userData = refreshedData;
          } else {
            // Outro tipo de erro de autenticação
            return;
          }
        } else {
          userData = authData;
        }
        
        if (!userData?.user) {
          return;
        }
        
        userId = userData.user.id;
        if (import.meta.env.DEV) {
          console.log(`📍 [UserContext] Processando usuário: ${userId}`);
        }
        
        // 🏦 ESTRATÉGIA 1: Banco de dados (prioridade máxima)
        try {
          if (import.meta.env.DEV) {
            console.log('🔍 [UserContext] Consultando banco de dados...');
          }
          const { data: profileData, error: profileError } = await typedSupabase
            .from('user_profiles')
            .select('display_name, avatar_url')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (profileError && profileError.code !== 'PGRST116') {
            if (import.meta.env.DEV) {
              console.warn('⚠️ [UserContext] Erro na consulta do banco:', profileError);
            }
          } else if (profileData) {
            if (import.meta.env.DEV) {
              console.log('✅ [UserContext] Dados encontrados no banco:', profileData);
            }
            
            if (profileData.display_name?.trim()) {
              newDisplayName = profileData.display_name.trim();
              localStorage.setItem("user-name", newDisplayName);
              if (import.meta.env.DEV) {
                console.log(`👤 [UserContext] Nome do banco CARREGADO: "${newDisplayName}"`);
                console.log(`📦 [UserContext] Nome salvo no localStorage: "${newDisplayName}"`);
              }
            }
            
            if (profileData.avatar_url?.trim()) {
              newAvatarUrl = profileData.avatar_url.trim();
              localStorage.setItem("user-avatar", newAvatarUrl);
              if (import.meta.env.DEV) {
                console.log(`🖼️ [UserContext] Avatar do banco: "${newAvatarUrl}"`);
              }
            }
          }
        } catch (dbError) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ [UserContext] Exceção no acesso ao banco:', dbError);
          }
        }
        
        // 💾 ESTRATÉGIA 2: LocalStorage (fallback confiável)
        if (!newDisplayName) {
          try {
            const localName = getSavedUserName();
            if (localName?.trim()) {
              newDisplayName = localName.trim();
              if (import.meta.env.DEV) {
                console.log(`💾 [UserContext] Nome do localStorage: "${newDisplayName}"`);
              }
          
              // Sincronizar com banco em background se temos um ID de usuário
              if (userId) {
                saveUserName(newDisplayName, userId, true).catch(syncError => {
                  if (import.meta.env.DEV) {
                    console.warn('⚠️ [UserContext] Erro na sincronização do nome:', syncError);
                  }
                });
              }
            }
          } catch (localError) {
            if (import.meta.env.DEV) {
              console.warn('⚠️ [UserContext] Erro ao acessar localStorage (nome):', localError);
            }
          }
        }
        
        if (!newAvatarUrl) {
          try {
            const localAvatar = getSavedAvatar();
            if (localAvatar?.trim()) {
              newAvatarUrl = localAvatar.trim();
              if (import.meta.env.DEV) {
                console.log(`💾 [UserContext] Avatar do localStorage: "${newAvatarUrl}"`);
              }
            }
          } catch (localError) {
            if (import.meta.env.DEV) {
              console.warn('⚠️ [UserContext] Erro ao acessar localStorage (avatar):', localError);
            }
          }
        }
        
        // 🏷️ ESTRATÉGIA 3: Metadados do usuário
        if (!newDisplayName && userData?.user) {
          try {
            const metaName = userData.user.user_metadata?.display_name ||
                              userData.user.user_metadata?.name || 
                              userData.user.user_metadata?.full_name;
          
            if (metaName?.trim()) {
              newDisplayName = metaName.trim();
              localStorage.setItem("user-name", newDisplayName);
              if (import.meta.env.DEV) {
                console.log(`🏷️ [UserContext] Nome dos metadados: "${newDisplayName}"`);
              }
            
              // Sincronizar com banco
              saveUserName(newDisplayName, userId, true).catch(syncError => {
                if (import.meta.env.DEV) {
                  console.warn('⚠️ [UserContext] Erro na sincronização dos metadados:', syncError);
                }
              });
            }
          } catch (metaError) {
            if (import.meta.env.DEV) {
              console.warn('⚠️ [UserContext] Erro ao acessar metadados (nome):', metaError);
            }
          }
        }
        
        if (!newAvatarUrl && userData?.user) {
          try {
            const metaAvatar = userData.user.user_metadata?.avatar_url;
            if (metaAvatar?.trim()) {
              newAvatarUrl = metaAvatar.trim();
              localStorage.setItem("user-avatar", newAvatarUrl);
              if (import.meta.env.DEV) {
                console.log(`🏷️ [UserContext] Avatar dos metadados: "${newAvatarUrl}"`);
              }
            }
          } catch (metaError) {
            if (import.meta.env.DEV) {
              console.warn('⚠️ [UserContext] Erro ao acessar metadados (avatar):', metaError);
            }
          }
        }
          
        // 📧 ESTRATÉGIA 4: Email como último recurso
        if (!newDisplayName && userData?.user?.email) {
          try {
            newDisplayName = userData.user.email.split('@')[0];
            localStorage.setItem("user-name", newDisplayName);
            if (import.meta.env.DEV) {
              console.log(`📧 [UserContext] Nome extraído do email: "${newDisplayName}"`);
            }
            
            // Salvar no banco
            saveUserName(newDisplayName, userId, true).catch(syncError => {
              if (import.meta.env.DEV) {
                console.warn('⚠️ [UserContext] Erro ao salvar nome do email:', syncError);
              }
            });
          } catch (emailError) {
            if (import.meta.env.DEV) {
              console.warn('⚠️ [UserContext] Erro ao processar email:', emailError);
            }
          }
        }
        
        // 🔄 ATUALIZAR ESTADOS APENAS SE NECESSÁRIO
        let hasChanges = false;
        
        if (newDisplayName && newDisplayName !== userName) {
          if (import.meta.env.DEV) {
            console.log(`🔄 [UserContext] Atualizando userName: "${userName}" → "${newDisplayName}"`);
            console.log(`🎯 [UserContext] Estado userName será atualizado para: "${newDisplayName}"`);
          }
          setUserName(newDisplayName);
          
          window.dispatchEvent(new CustomEvent('username-updated', {
            detail: { userName: newDisplayName, fromLoad: true }
          }));
          
          hasChanges = true;
          
          if (import.meta.env.DEV) {
            console.log(`✅ [UserContext] Evento username-updated disparado com: "${newDisplayName}"`);
          }
        }
        
        if (newAvatarUrl !== avatarUrl) {
          if (import.meta.env.DEV) {
            console.log(`🔄 [UserContext] Atualizando avatarUrl: "${avatarUrl}" → "${newAvatarUrl}"`);
          }
          setAvatarUrl(newAvatarUrl);
          
          if (newAvatarUrl) {
            window.dispatchEvent(new CustomEvent('avatar-updated', {
              detail: { avatarUrl: newAvatarUrl }
            }));
          }
          
          hasChanges = true;
        }
        
        if (import.meta.env.DEV) {
          if (hasChanges) {
            console.log('✅ [UserContext] Estados atualizados com sucesso');
          } else {
            console.log('ℹ️ [UserContext] Nenhuma mudança necessária nos estados');
          }
        }
        
        if (import.meta.env.DEV) {
          console.log('✅ [UserContext] === BUSCA CONCLUÍDA COM SUCESSO ===');
        }
        
      } catch (authCheckError) {
        // SILENCIAR erros de autenticação - apenas logar em desenvolvimento
        if (import.meta.env.DEV) {
          console.error('❌ [UserContext] Erro ao verificar autenticação:', authCheckError);
        }
        return;
      }
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ [UserContext] Erro fatal na busca de dados:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkSession]); // avatarUrl e userName não são usados dentro desta função, são apenas atualizados via setState

  // 🔧 FUNÇÃO DE ATUALIZAÇÃO DE PERFIL - ULTRA SEGURA
  const updateProfile = React.useCallback(async (data: { name?: string; avatar?: string | null; display_name?: string }): Promise<void> => {
    try {
      if (import.meta.env.DEV) {
        console.log('🔧 [UserContext] === INICIANDO ATUALIZAÇÃO DE PERFIL ===', data);
      }
      
      const { data: userData, error: authError } = await typedSupabase.auth.getUser();
      if (authError) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ [UserContext] Erro de autenticação na atualização:', authError);
        }
        return;
      }
      
      if (!userData?.user) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ [UserContext] Usuário não autenticado para atualização');
        }
        return;
      }

      const userId = userData.user.id;
      if (import.meta.env.DEV) {
        console.log(`📍 [UserContext] Atualizando perfil do usuário: ${userId}`);
      }
      
      // 👤 ATUALIZAR NOME SE FORNECIDO
      if (data.name?.trim() || data.display_name?.trim()) {
        const newName = (data.display_name || data.name)!.trim();
        if (import.meta.env.DEV) {
          console.log(`👤 [UserContext] Processando novo nome: "${newName}"`);
        }
        
        setUserName(newName);
        localStorage.setItem("user-name", newName);
        
        try {
          await saveUserName(newName, userId, true);
          if (import.meta.env.DEV) {
            console.log('✅ [UserContext] Nome salvo no banco com sucesso');
          }
        } catch (saveError) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ [UserContext] Erro ao salvar nome no banco:', saveError);
          }
        }
      }
      
      // 🖼️ ATUALIZAR AVATAR SE FORNECIDO
      if (data.avatar !== undefined) {
        if (import.meta.env.DEV) {
          console.log(`🖼️ [UserContext] Processando novo avatar: "${data.avatar}"`);
        }
        
        setAvatarUrl(data.avatar);
        
        if (data.avatar) {
          localStorage.setItem("user-avatar", data.avatar);
        } else {
          localStorage.removeItem("user-avatar");
        }
        
        try {
          await updateUserAvatar(data.avatar);
          if (import.meta.env.DEV) {
            console.log('✅ [UserContext] Avatar salvo no banco com sucesso');
          }
        } catch (saveError) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ [UserContext] Erro ao salvar avatar no banco:', saveError);
          }
        }
      }
      
      if (import.meta.env.DEV) {
        console.log('✅ [UserContext] === ATUALIZAÇÃO DE PERFIL CONCLUÍDA ===');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ [UserContext] ERRO CRÍTICO na atualização de perfil:', error);
      }
    }
  }, []); // setUserName e setAvatarUrl são funções setState estáveis e não precisam estar nas dependências
    
  // 🔄 FUNÇÃO DE REFRESH - ULTRA SEGURA E SILENCIOSA
  const refreshUserData = React.useCallback(async (): Promise<void> => {
    if (import.meta.env.DEV) {
      console.log('🔄 [UserContext] === INICIANDO REFRESH ===');
    }
    await fetchUserData();
    if (import.meta.env.DEV) {
      console.log('✅ [UserContext] === REFRESH CONCLUÍDO ===');
    }
  }, [fetchUserData]);

  // 🔄 EFEITO PARA LIDAR COM REDIRECIONAMENTO DE AUTENTICAÇÃO
  React.useEffect(() => {
    if (shouldRedirectToAuth) {
      if (import.meta.env.DEV) {
        console.log('🔄 [UserContext] Redirecionamento para autenticação necessário');
      }
      
      // Aguardar um pouco antes de redirecionar para dar chance de recuperar a sessão
      const timeoutId = setTimeout(() => {
        if (shouldRedirectToAuth && !hasActiveSession) {
          // Salvar a URL atual para retornar após login
          const currentPath = window.location.pathname + window.location.search;
          if (currentPath !== '/auth') {
            localStorage.setItem('auth_redirect_url', currentPath);
          }
          
          // Redirecionar para a página de autenticação
          window.location.href = '/auth';
        }
      }, 3000); // 3 segundos de delay
      
      return () => clearTimeout(timeoutId);
    }
  }, [shouldRedirectToAuth, hasActiveSession]);

  // 🚀 INICIALIZAÇÃO AUTOMÁTICA DO PROVIDER
  React.useEffect(() => {
    const initializeProvider = async (): Promise<void> => {
      try {
        if (import.meta.env.DEV) {
          console.log('🚀 [UserContext] === INICIALIZANDO PROVIDER ===');
        }
        
        // Verificar sessão primeiro
        const hasSession = await checkSession();
        
        if (hasSession) {
          // Se há sessão ativa, carregar dados automaticamente
          await fetchUserData();
          
          // Carregar configurações persistentes automaticamente
        try {
          const userSettings = loadUserSettings();
            
            if (userSettings.displayName && userSettings.displayName.trim() !== '') {
              setUserName(userSettings.displayName);
          if (import.meta.env.DEV) {
                console.log('✅ [UserContext] Nome carregado automaticamente:', userSettings.displayName);
              }
          }
          
            if (userSettings.avatarUrl) {
              setAvatarUrl(userSettings.avatarUrl);
            if (import.meta.env.DEV) {
                console.log('✅ [UserContext] Avatar carregado automaticamente:', userSettings.avatarUrl);
              }
            }
          } catch (settingsError) {
            if (import.meta.env.DEV) {
              console.warn('⚠️ [UserContext] Erro ao carregar configurações persistentes:', settingsError);
          }
        }
        }
        
        if (import.meta.env.DEV) {
          console.log('✅ [UserContext] Inicialização do provider concluída');
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('❌ [UserContext] Erro na inicialização do provider:', error);
        }
      }
    };
    
    // Executar inicialização
    initializeProvider();
    
    // Configurar listener para login bem-sucedido
    const handleAuthLoginSuccess = (event: Event) => {
      if (import.meta.env.DEV) {
        console.log('🔐 [UserContext] Login bem-sucedido detectado - recarregando dados');
      }
      
      setTimeout(async () => {
        try {
          await fetchUserData();
          
          // Carregar configurações após login
          const userSettings = loadUserSettings();
      
          if (userSettings.displayName && userSettings.displayName.trim() !== '') {
            setUserName(userSettings.displayName);
            if (import.meta.env.DEV) {
              console.log('✅ [UserContext] Nome carregado após login:', userSettings.displayName);
            }
          }
          
          if (userSettings.avatarUrl) {
            setAvatarUrl(userSettings.avatarUrl);
          if (import.meta.env.DEV) {
              console.log('✅ [UserContext] Avatar carregado após login:', userSettings.avatarUrl);
            }
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ [UserContext] Erro ao recarregar dados após login:', error);
        }
        }
      }, 300);
    };
    
    window.addEventListener('auth-login-success', handleAuthLoginSuccess);
    
    return () => {
      window.removeEventListener('auth-login-success', handleAuthLoginSuccess);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez na inicialização. fetchUserData e checkSession não devem estar aqui para evitar loops

  // 📝 VALOR DO CONTEXTO MEMOIZADO PARA PERFORMANCE
  const contextValue = React.useMemo(() => {
    const value = {
      userName, 
      setUserName, 
      avatarUrl, 
      setAvatarUrl,
      updateProfile,
      refreshUserData,
    };
    
    if (import.meta.env.DEV) {
      console.log('📝 [UserContext] Contexto atualizado:', {
        userName: value.userName,
        avatarUrl: value.avatarUrl ? 'SET' : 'NULL'
      });
    }
    
    return value;
  }, [userName, avatarUrl, updateProfile, refreshUserData]);

  return React.createElement(
    UserContext.Provider,
    { value: contextValue },
    children
  );
};

// 🎣 HOOK ULTRA SEGURO PARA USAR O CONTEXTO
// eslint-disable-next-line react-refresh/only-export-components
export function useUser(): UserContextType {
  if (!REACT_VALIDATION) {
    const errorMsg = '❌ React hooks indisponíveis no useUser';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  const context = React.useContext(UserContext);
  if (context === undefined) {
    const errorMsg = '❌ useUser deve ser usado dentro de um UserProvider';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  return context;
} 

// 📤 EXPORT PRINCIPAL
export const UserProvider = SecureUserProvider; 
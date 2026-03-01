import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { userService } from '@/services/userService';
import { getSupabase } from '@/lib/supabase';
import { AuthContextType, AuthState, Provider, Session, User, UserProfile } from '@/types/auth';
import { toast } from 'sonner';

// Contexto de autenticação
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Estado inicial de autenticação
const initialAuthState: AuthState = {
  user: null,
  session: null,
  profile: null,
  loading: true,
  error: null,
  isAdmin: false,
};

interface AuthProviderProps {
  children: ReactNode;
}

// 🚀 Função para tentar restaurar sessão do localStorage (FAST RESTORE)
const tryFastRestore = (): AuthState => {
  try {
    const authKey = `sb-${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'arkrjextwpwqhrvcijyr'}-auth-token`;
    const storedAuth = localStorage.getItem(authKey);
    
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        if (authData?.access_token && authData?.user) {
          // Sessão restaurada (silenciado)
          return {
            user: authData.user,
            session: authData,
            profile: null,
            isAdmin: false,
            loading: false, // ✅ INSTANTÂNEO!
            error: null
          };
        }
      } catch (parseError) {
        // Erro ao parsear sessão (silenciado)
      }
    }
  } catch (error) {
    // Erro no fast restore (silenciado)
  }
  
  // Se não conseguiu restaurar, usar estado inicial padrão
  return initialAuthState;
};

// Componente provedor de autenticação 
export const AuthProvider = React.memo<AuthProviderProps>(({ children }) => {
  const [state, setState] = useState<AuthState>(() => tryFastRestore());
  
  // DEBUG: Monitorar mudanças de estado (silenciado)
  useEffect(() => {
    // Estado mudou
  }, [state.user, state.session, state.profile, state.loading, state.error, state.isAdmin]);
  
  // ✅ SIMPLIFICAÇÃO RADICAL: Apenas um useEffect simples
  useEffect(() => {
    let isMounted = true;
    
    // 🚀 Verificar se já temos sessão restaurada (do estado inicial)
    const hasRestoredSession = !!state.user && !state.loading;
    if (hasRestoredSession) {
      // Sessão já restaurada (silenciado)
    }
    
    // ⚡ Timeout de segurança AUMENTADO: se após 20s não terminou, forçar loading=false
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        // Timeout de segurança (silenciado)
        setState(prev => ({ ...prev, loading: false }));
      }
    }, 20000);
    
    const initAuth = async () => {
      try {
        // Iniciando autenticação (silenciado)
        
        // Verificar localStorage antes de chamar Supabase (silenciado)
        const authKeys = Object.keys(localStorage).filter(k => 
          k.includes('auth') || k.includes('supabase') || k.includes('sb-')
        );
        
        const supabase = getSupabase();
        
        // Timeout OTIMIZADO para 8s
        // Chamando getSession (silenciado)
        const getSessionStart = Date.now();
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getSession timeout')), 8000)
        );
        
        let session;
        try {
          const result = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]) as any;
          session = result.data.session;
          // getSession completou (silenciado)
        } catch (timeoutError) {
          const getSessionDuration = Date.now() - getSessionStart;
          // getSession timeout (silenciado)
          // 🔥 NÃO limpar localStorage - apenas prosseguir sem sessão
          session = null;
        }
        if (!isMounted) return;
        
        if (session?.user) {
          const user = session.user;
          // Usuário encontrado, buscando perfil (silenciado)
          
          // 🚀 Se já temos sessão restaurada, apenas ATUALIZAR profile/admin em background
          if (hasRestoredSession) {
            // Sessão já restaurada (silenciado)
          }
          
          // ✅ CRÍTICO: Limpar TODOS os caches de sinais ao fazer login para garantir dados frescos
          localStorage.removeItem('realtime_signals_cache'); // Dashboard (3 sinais)
          localStorage.removeItem('extended_signals_cache'); // Aba Trades (7 sinais)
          localStorage.removeItem('extended_signals_cache_date'); // Data do cache
          // Caches de sinais limpos (silenciado)
          
          // Buscar perfil do usuário com timeout
          const profileSearchStart = Date.now();
          const profilePromise = supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          const profileTimeout = new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Profile search timeout')), 5000)
          );
          
          let profile;
          try {
            const result = await Promise.race([profilePromise, profileTimeout]);
            profile = result.data;
            const profileSearchDuration = Date.now() - profileSearchStart;
            // Perfil buscado (silenciado)
          } catch (timeoutError) {
            const profileSearchDuration = Date.now() - profileSearchStart;
            // Busca timeout (silenciado)
            profile = null;
          }
          
          // Perfil encontrado (silenciado)
          
          // Se não existe perfil, criar um básico
          if (!profile) {
            // Criando perfil básico (silenciado)
            const { data: newProfile } = await supabase
              .from('user_profiles')
              .upsert({
                user_id: user.id,
                email: user.email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                verified_email: true
              }, { onConflict: 'user_id' })
              .select()
              .maybeSingle();
            
            if (isMounted) {
              // Estado atualizado (silenciado)
              clearTimeout(safetyTimeout);
              setState(prev => ({
                user,
                session,
                profile: newProfile || null,
                loading: hasRestoredSession ? prev.loading : false, // 🔥 MANTER loading se fast restore
                error: null,
                isAdmin: false
              }));
            }
          } else {
            if (isMounted) {
              // Estado atualizado com perfil (silenciado)
              clearTimeout(safetyTimeout);
              
              // 🚀 Se já temos sessão restaurada, MANTER loading=false, apenas atualizar perfil/admin
              setState(prev => {
                // setState chamado (silenciado)
                
                const newState = {
                  user,
                  session,
                  profile,
                  loading: hasRestoredSession ? prev.loading : false, // 🔥 MANTER loading se fast restore
                  error: null,
                  isAdmin: false
                };
                // Novo loading (silenciado)
                return newState;
              });
              
              // setState executado (silenciado)
            }
          }
        } else {
          if (isMounted) {
            // Sem sessão (silenciado)
            clearTimeout(safetyTimeout);
            
            // 🔥 Se não há sessão, limpar estado completamente (sem fast restore)
            setState(prev => {
              // setState chamado sem sessão (silenciado)
              const newState = { ...initialAuthState, loading: false };
              // Novo loading (silenciado)
              return newState;
            });
          }
        }
      } catch (error) {
        console.error('❌ AuthContext: Erro ao inicializar:', error);
        if (isMounted) {
          clearTimeout(safetyTimeout);
          setState({ ...initialAuthState, loading: false, error: error as Error });
        }
      }
    };
    
    initAuth();
    
    // Configurar listener de mudanças de autenticação
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const authStartTime = Date.now();
        // onAuthStateChange (silenciado)
        // onAuthStateChange iniciado
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            const user = session.user;
            
            // 🔥 CRÍTICO: Verificar se é um LOGIN NORMAL (não cadastro)
            const isNormalLogin = sessionStorage.getItem('normal-login-in-progress') === 'true';
            
            // Verificar flags de proteção contra login automático após cadastro
            const justRegistered = sessionStorage.getItem('just-registered') === 'true';
            const preventAuthRedirect = sessionStorage.getItem('prevent_auth_redirect') === 'true';
            const preventDashboardRedirect = localStorage.getItem('prevent_dashboard_redirect') === 'true';
            
            // 🔥 Se é login normal, LIMPAR todas as flags preventivas
            if (isNormalLogin) {
              // Login normal detectado (silenciado)
              sessionStorage.removeItem('just-registered');
              sessionStorage.removeItem('prevent_auth_redirect');
              localStorage.removeItem('prevent_dashboard_redirect');
              localStorage.removeItem('prevent_dashboard_redirect_expiration');
              sessionStorage.removeItem('normal-login-in-progress');
            }
            
            // Só bloquear login se houver flags E não for login normal
            if ((justRegistered || preventAuthRedirect || preventDashboardRedirect) && event === 'SIGNED_IN' && !isNormalLogin) {
              // Bloqueando login automático (silenciado)
              try {
                await supabase.auth.signOut();
              } catch (e) {
                // Erro no logout (silenciado)
              }
              return;
            }
            
            // Buscar perfil
            // Buscando perfil do usuário (silenciado)
            
            let profile = null;
            let profileError = null;
            
            try {
              // Executando query (silenciado)
              const searchStartTime = Date.now();
              
              // 🔥 TIMEOUT ESPECÍFICO para busca de perfil
              const profilePromise = supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
              
              const profileTimeout = new Promise<any>((_, reject) => 
                setTimeout(() => reject(new Error('Profile search timeout')), 5000)
              );
              
              let result;
              try {
                result = await Promise.race([profilePromise, profileTimeout]);
                const searchDuration = Date.now() - searchStartTime;
                // Busca completou (silenciado)
              } catch (timeoutError) {
                const searchDuration = Date.now() - searchStartTime;
                // Busca timeout (silenciado)
                throw timeoutError;
              }
              
              profile = result.data;
              profileError = result.error;
              
              // Resultado da busca (silenciado)
            } catch (searchError) {
              // EXCEÇÃO ao buscar perfil (silenciado)
              profileError = searchError;
              // 🔥 CRIAR perfil mesmo se a busca falhar
              profile = null;
            }
            
            // 🔥 CRIAR perfil se não existir (NÃO fazer logout!)
            if (!profile) {
              // Perfil não encontrado (silenciado)
              
              try {
                const createStartTime = Date.now();
                // Executando upsert (silenciado)
                
                // 🔥 TIMEOUT de 10s para criar perfil
                const createPromise = supabase
                  .from('user_profiles')
                  .upsert({
                    user_id: user.id,
                    email: user.email,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    verified_email: true
                  }, { onConflict: 'user_id' })
                  .select()
                  .maybeSingle();
                
                const createTimeout = new Promise<any>((_, reject) => 
                  setTimeout(() => reject(new Error('Profile creation timeout')), 5000)
                );
                
                let createResult;
                try {
                  createResult = await Promise.race([createPromise, createTimeout]);
                  const createDuration = Date.now() - createStartTime;
                  // Upsert completou (silenciado)
                } catch (timeoutError) {
                  const createDuration = Date.now() - createStartTime;
                  // Timeout (silenciado)
                  // Continuar sem perfil
                  profile = null;
                  createResult = { data: null, error: timeoutError };
                }
                
                const { data: newProfile, error: createError } = createResult;
                
                // Resultado da criação (silenciado)
                
                if (createError) {
                  // Erro ao criar perfil (silenciado)
                  profile = null;
                } else {
                  profile = newProfile;
                  // Perfil criado (silenciado)
                }
              } catch (createException) {
                // EXCEÇÃO ao criar perfil (silenciado)
                profile = null;
              }
            } else {
              // Perfil encontrado (silenciado)
            }
            
            // Verificando se é admin (silenciado)
            let isAdmin = false;
            try {
              const adminCheckStart = Date.now();
              isAdmin = await userService.isAdmin();
              const adminCheckDuration = Date.now() - adminCheckStart;
              // isAdmin verificado (silenciado)
            } catch (adminError) {
              // Erro ao verificar admin (silenciado)
            }
            
            // Preparando para atualizar estado (silenciado)
            
            // 🔥 CRÍTICO: SEMPRE setar user, mesmo sem perfil!
            if (!user) {
              // Erro crítico (silenciado)
              return; // Não atualizar estado se não tiver usuário
            }
            
            // User válido (silenciado)
            
            setState(prev => {
              // setState executando (silenciado)
              
              const newState = {
                user,
                session,
                profile: profile || null, // Pode ser null!
                isAdmin,
                loading: false,
                error: null
              };
              
              // Novo estado (silenciado)
              
              return newState;
            });
            
            // setState chamado (silenciado)
            
            // Aguardar React processar
            await new Promise(resolve => setTimeout(resolve, 100));
            // React processou o setState (silenciado)
            
            // 🔥 Limpar flags e sinalizar sucesso
            setTimeout(() => {
              const stillInProgress = sessionStorage.getItem('normal-login-in-progress');
              if (stillInProgress) {
                // Limpando flag (silenciado)
                sessionStorage.removeItem('normal-login-in-progress');
              }
              
              // 🔥 Sinalizar que o login completou com sucesso
              const loginId = sessionStorage.getItem('current-login-id');
              if (loginId) {
                sessionStorage.setItem('login-completed', loginId);
                sessionStorage.removeItem('current-login-id');
                // Login completado (silenciado)
              }
            }, 500);
            
            // Disparar evento de login bem-sucedido
            setTimeout(() => {
              // Disparando evento (silenciado)
              window.dispatchEvent(new CustomEvent('auth-login-success'));
            }, 100);
          }
        } else if (event === 'SIGNED_OUT') {
          // SIGNED_OUT (silenciado)
          setState({ ...initialAuthState, loading: false });
        }
      }
    );
    
    // Cleanup
    return () => {
      clearTimeout(safetyTimeout);
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Executar APENAS uma vez

  // Função para atualizar o perfil do usuário
  const refreshUserProfile = useCallback(async () => {
    if (state.user) {
      try {
        setState(prevState => ({ ...prevState, loading: true }));
        const { data: profile } = await userService.getUserProfile();
        const isAdmin = await userService.isAdmin();
        setState(prevState => ({
          ...prevState,
          profile,
          isAdmin,
          loading: false,
        }));
      } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        setState(prevState => ({
          ...prevState,
          error: error as Error,
          loading: false,
        }));
      }
    }
  }, [state.user]);

  // Função para verificar estado do token e sessão
  const checkTokenState = useCallback(async () => {
    try {
      const session = localStorage.getItem('supabase.auth.token');
      if (session) {
        // Token encontrado (silenciado)
      } else {
        // Nenhum token (silenciado)
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
    }
  }, []);

  // Fazer login com email/senha
  const signInWithEmail = useCallback(async (email: string, password: string, remember: boolean = false) => {
    const totalLoginStart = Date.now();
    // signInWithEmail chamado (silenciado)
    
    // 🔥 MARCAR que é um login normal (não cadastro)
    sessionStorage.setItem('normal-login-in-progress', 'true');
    // Flag definida (silenciado)
    
    // 🔥 Criar ID único para este login para rastrear
    const loginId = `login-${Date.now()}`;
    sessionStorage.setItem('current-login-id', loginId);
    // Login ID criado (silenciado)
    
    // 🔥 TIMEOUT DE SEGURANÇA GLOBAL: Se demorar > 25s, forçar loading=false
    // Tempo otimizado para melhor experiência do usuário
    const signInTimeout = setTimeout(() => {
      console.error('⏰ [AuthContext] TIMEOUT GLOBAL! signInWithEmail demorou > 25s, forçando loading=false');
      console.error('⚠️ [AuthContext] Se você vê esta mensagem, o Supabase está muito lento!');
      console.error('⚠️ [AuthContext] Estado atual antes do timeout:', {
        hasUser: !!state.user,
        loading: state.loading
      });
      setState(prevState => {
        // Forçando loading=false (silenciado)
        return { ...prevState, loading: false };
      });
    }, 25000);
    
    try {
      // Setando loading (silenciado)
      setState(prevState => ({ ...prevState, loading: true }));
      
      // Verificando token (silenciado)
      await checkTokenState();
      
      // Chamando userService (silenciado)
      const signInStartTime = Date.now();
      
      // 🔥 CRÍTICO: NÃO usar timeout aqui! Deixar o onAuthStateChange fazer o trabalho
      // O timeout de 20s global (signInTimeout) já protege contra travamento
      // Aguardando resposta (silenciado)
      
      let data, error;
      try {
        const result = await userService.signInWithEmail(email, password, remember);
        const signInDuration = Date.now() - signInStartTime;
        // userService respondeu (silenciado)
        
        data = result.data;
        error = result.error;
      } catch (serviceError) {
        const signInDuration = Date.now() - signInStartTime;
        console.error('❌ [AuthContext] Erro no userService após', signInDuration, 'ms!', serviceError);
        clearTimeout(signInTimeout);
        setState(prevState => ({
          ...prevState,
          error: serviceError as Error,
          loading: false,
        }));
        return { error: serviceError as Error };
      }
      
      // Resposta recebida (silenciado)
      
      if (error) {
        console.error('❌ [AuthContext] Erro no signIn, retornando erro');
        clearTimeout(signInTimeout); // Limpar timeout
        setState(prevState => ({
          ...prevState,
          error: error as Error,
          loading: false,
        }));
        return { error };
      }
      
      // Login bem-sucedido (silenciado)
      
      // 🔥 OTIMIZAÇÃO: onAuthStateChange já vai buscar perfil e isAdmin
      // Não precisamos fazer aqui para evitar duplicação e race conditions
      const profile = null;
      const isAdmin = false;
      
      // signInWithEmail completou (silenciado)
      
      // 🔥 CRÍTICO: NÃO setar loading=false aqui!
      // O onAuthStateChange vai buscar perfil e ENTÃO setar loading=false
      // Isso evita race conditions e redirecionamentos prematuros
      
      // signInWithEmail com sucesso (silenciado)
      
      // Se a opção "lembrar" estiver marcada, salvar no localStorage
      if (remember) {
        localStorage.setItem('remember-user', 'true');
        // remember-user salvo (silenciado)
        
        if (data?.user?.id) {
          // 🔥 NÃO BLOQUEAR: saveAuthorizedDevice em background
          userService.saveAuthorizedDevice(data.user.id).catch(err => 
            console.warn('⚠️ saveAuthorizedDevice falhou (não bloqueante):', err)
          );
        }
      } else {
        localStorage.removeItem('remember-user');
      }
      
      // 🔥 IMPORTANTE: NÃO limpar timeout aqui!
      // Deixar ele ativo para proteger se onAuthStateChange travar
      // Mantendo timeout ativo (silenciado)
      
      // signInWithEmail concluído (silenciado)
      return { error: null };
    } catch (error) {
      console.error('❌ [AuthContext] Erro no processo de login:', error);
      clearTimeout(signInTimeout); // Limpar timeout de erro
      
      // 🔥 Limpar flag de login normal em caso de erro
      sessionStorage.removeItem('normal-login-in-progress');
      
      setState(prevState => ({
        ...prevState,
        error: error as Error,
        loading: false,
      }));
      return { error: error as Error };
    } finally {
      // 🔥 Aguardar um pouco para dar tempo do onAuthStateChange completar
      // signInWithEmail finally (silenciado)
      
      // Aguardar até 5 segundos para o onAuthStateChange completar
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const loginCompleted = sessionStorage.getItem('login-completed');
        if (loginCompleted === loginId) {
          clearTimeout(signInTimeout);
          sessionStorage.removeItem('login-completed');
          break;
        }
        
        
      }
      
      const totalLoginDuration = Date.now() - totalLoginStart;
      // signInWithEmail finally completado (silenciado)
      
    }
  }, [checkTokenState]);

  // Fazer cadastro com email
  const signUp = useCallback(async (email: string, password: string, birthdate?: string, displayName?: string, investorType?: string) => {
    try {
      setState(prevState => ({ ...prevState, loading: true }));
      
      const { data, error } = await userService.signUp(email, password, birthdate, displayName, investorType);
      
      if (error) {
        setState(prevState => ({
          ...prevState,
          error: error as Error,
          loading: false,
        }));
        return { error };
      }
      
      setState(prevState => ({
        ...prevState,
        loading: false,
        error: null,
      }));
      
      return { error: null };
    } catch (error) {
      console.error('Erro durante cadastro:', error);
      setState(prevState => ({
        ...prevState,
        error: error as Error,
        loading: false,
      }));
      return { error: error as Error };
    }
  }, []);

  // Fazer login com provedor (Google, GitHub, etc.)
  const signInWithProvider = async (provider: Provider) => {
    try {
      setState({ ...state, loading: true });
      
      const { data, error } = await userService.signInWithProvider(provider);
      
      if (error) {
        setState({
          ...state,
          error: error as Error,
          loading: false,
        });
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      console.error(`Erro ao fazer login com ${provider}:`, error);
      setState({
        ...state,
        error: error as Error,
        loading: false,
      });
      return { error: error as Error };
    }
  };

  // Fazer logout
  const signOut = async () => {
    try {
      setState({ ...state, loading: true });
      
      // Salvar o idioma atual antes de fazer logout
      const appLanguage = localStorage.getItem('app-language');
      
      const { error } = await userService.signOut();
      
      if (error) {
        setState({
          ...state,
          error,
          loading: false,
        });
        return;
      }
      
      // Restaurar o idioma no localStorage após o logout
      if (appLanguage) {
        localStorage.setItem('app-language', appLanguage);
      }
      
      setState({ ...initialAuthState, loading: false });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setState({
        ...state,
        error: error as Error,
        loading: false,
      });
    }
  };

  // Verificar email
  const verifyEmail = async (email: string) => {
    try {
      setState({ ...state, loading: true });
      
      const { error } = await userService.verifyEmail(email);
      
      setState({
        ...state,
        loading: false,
        error: error as Error,
      });
      
      if (!error) {
        toast.success(
          'Email de verificação enviado com sucesso!',
          { duration: 5000 }
        );
      }
      
      return { error };
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      setState({
        ...state,
        error: error as Error,
        loading: false,
      });
      return { error: error as Error };
    }
  };

  // Recuperação de senha
  const resetPassword = async (email: string) => {
    try {
      setState({ ...state, loading: true });
      
      const { error } = await userService.resetPassword(email);
      
      setState({
        ...state,
        loading: false,
        error: error as Error,
      });
      
      if (!error) {
        toast.success(
          'Email de recuperação de senha enviado com sucesso!',
          { duration: 5000 }
        );
      }
      
      return { error };
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      setState({
        ...state,
        error: error as Error,
        loading: false,
      });
      return { error: error as Error };
    }
  };

  // Atualizar perfil
  const updateProfile = async (profile: Partial<UserProfile>) => {
    try {
      setState({ ...state, loading: true });
      
      const { data, error } = await userService.updateUserProfile(profile);
      
      if (error) {
        setState({
          ...state,
          error: error as Error,
          loading: false,
        });
        return { error };
      }
      
      setState({
        ...state,
        profile: data,
        loading: false,
        error: null,
      });
      
      toast.success('Perfil atualizado com sucesso!');
      
      return { error: null };
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setState({
        ...state,
        error: error as Error,
        loading: false,
      });
      return { error: error as Error };
    }
  };

  // Verificar força da senha
  const isStrongPassword = userService.isStrongPassword;

  const contextValue: AuthContextType = {
    ...state,
    signInWithEmail,
    signUp,
    signOut,
    verifyEmail,
    resetPassword,
    updateProfile,
    isStrongPassword,
    refreshUserProfile,
    signInWithProvider,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
});

AuthProvider.displayName = 'AuthProvider';

// Hook para usar o contexto de autenticação
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
}

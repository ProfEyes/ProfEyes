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

// Componente provedor de autenticação 
export const AuthProvider = React.memo<AuthProviderProps>(({ children }) => {
  const [state, setState] = useState<AuthState>(initialAuthState);
  
  // Inicializar autenticação quando o componente monta
  useEffect(() => {
    let isMounted = true;
    
    // Gerar um ID para esta sessão de autenticação para rastreamento de logs
    const authId = Math.random().toString(36).substring(2, 9);
    console.log(`Iniciando verificação de autenticação [${authId}]...`);
    
    // Timeout de segurança para evitar loading infinito
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Timeout de segurança do AuthContext: forçando fim do loading');
        setState(prevState => ({ ...prevState, loading: false }));
      }
    }, 15000); // 15 segundos
    
    const fetchSession = async () => {
      try {
        const supabase = getSupabase();
        
        // Limpar chaves antigas conflitantes (apenas uma vez)
        const cleanupKey = 'auth-storage-cleanup-done';
        if (!sessionStorage.getItem(cleanupKey)) {
          const keysToRemove = ['supabase-auth-client', 'supabase-auth-client-nopkce', 'supabase-auth-client-admin'];
          keysToRemove.forEach(key => {
            if (localStorage.getItem(key)) {
              console.log(`🧹 Removendo chave conflitante: ${key}`);
              localStorage.removeItem(key);
            }
          });
          sessionStorage.setItem(cleanupKey, 'true');
        }
        
        // O Supabase gerencia automaticamente a sessão no localStorage
        // Chave padrão: sb-arkrjextwpwqhrvcijyr-auth-token
        console.log('Verificando sessão armazenada pelo Supabase...');
        
        // Debug: Verificar o que existe no localStorage ANTES de tentar recuperar
        const storageKeys = Object.keys(localStorage).filter(key => key.includes('supabase') || key.includes('auth'));
        console.log('🔍 DEBUG [AuthContext] - Chaves de autenticação no localStorage:', storageKeys);
        
        storageKeys.forEach(key => {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              console.log(`🔍 DEBUG [AuthContext] - ${key}:`, {
                hasSession: !!parsed,
                hasAccessToken: !!(parsed?.access_token || parsed?.currentSession?.access_token),
                expiresAt: parsed?.expires_at || parsed?.currentSession?.expires_at || 'N/A'
              });
            }
          } catch (e) {
            console.log(`🔍 DEBUG [AuthContext] - ${key}: (não é JSON)`);
          }
        });
        
        // Obter sessão atual do Supabase
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Erro ao obter sessão:', sessionError);
          throw sessionError;
        }

        let session = initialSession;

        if (session?.user) {
          const user = session.user;
          console.log('Sessão válida encontrada para usuário:', user.email);

          // Verificar se o token está próximo de expirar
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = expiresAt - now;
          
          // Se faltar menos de 5 minutos para expirar, renovar o token
          if (timeUntilExpiry < 300) {
            console.log('Token próximo de expirar, renovando...');
            const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('Erro ao renovar token:', refreshError);
              throw refreshError;
            }
            
            if (newSession) {
              console.log('Token renovado com sucesso');
              session = newSession;
            }
          }

          // Verificar se o usuário existe na tabela user_profiles
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Erro ao buscar perfil:', profileError);
          }

          // Se não existir perfil, criar um básico
          if (!profile && !profileError) {
            console.log('Criando perfil básico para usuário:', user.email);
            const { data: newProfile, error: createError } = await supabase
              .from('user_profiles')
              .upsert({
                user_id: user.id,
                email: user.email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                verified_email: true
              })
              .select()
              .maybeSingle();

            if (createError) {
              console.error('Erro ao criar perfil:', createError);
            }

            if (!createError && newProfile) {
              if (isMounted) {
                setState(prevState => ({
                  ...prevState,
                  session,
                  user,
                  profile: newProfile,
                  loading: false
                }));
              }
              return;
            }
          }

          // Atualizar estado com os dados disponíveis
          if (isMounted) {
            setState(prevState => ({
              ...prevState,
              session,
              user,
              profile: profile || null,
              loading: false
            }));
          }
        } else {
          console.log('Nenhuma sessão ativa encontrada');
          if (isMounted) {
            setState({ ...initialAuthState, loading: false });
          }
        }
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
        if (isMounted) {
          setState(prevState => ({
            ...prevState,
            error: error as Error,
            loading: false
          }));
        }
      }
    };

    fetchSession();

    // Configurar listeners de mudanças de autenticação
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Evento de autenticação:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session) {
            console.log('Sessão atualizada:', event);
            const user = session.user;
            
            // ULTRA-CRÍTICO: BLOQUEIO MÁXIMO de login automático após cadastro
            const justRegistered = sessionStorage.getItem('just-registered') === 'true';
            const preventAuthRedirect = sessionStorage.getItem('prevent_auth_redirect') === 'true';
            const preventDashboardRedirect = localStorage.getItem('prevent_dashboard_redirect') === 'true';
            
            // Verificar expiração da flag prevent_dashboard_redirect
            let preventDashboardRedirectValid = preventDashboardRedirect;
            if (preventDashboardRedirect) {
              const expirationTime = localStorage.getItem('prevent_dashboard_redirect_expiration');
              if (expirationTime && parseInt(expirationTime) < Date.now()) {
                console.log('🕒 Flag prevent_dashboard_redirect expirada, removendo...');
                localStorage.removeItem('prevent_dashboard_redirect');
                localStorage.removeItem('prevent_dashboard_redirect_expiration');
                preventDashboardRedirectValid = false;
              }
            }
            
            // Qualquer uma das flags de proteção bloqueia o login automático
            if ((justRegistered || preventAuthRedirect || preventDashboardRedirectValid) && event === 'SIGNED_IN') {
              console.log('🛑 BLOQUEIO MÁXIMO: Usuário acabou de se cadastrar, IGNORANDO login automático');
              console.log('🔒 Proteções ativas:', { justRegistered, preventAuthRedirect, preventDashboardRedirect: preventDashboardRedirectValid });
              
              // Fazer logout imediato para garantir que não haverá redirecionamento
              try {
                getSupabase().auth.signOut();
                console.log('🔒 Logout automático preventivo executado com sucesso');
                
                // Garantir que o estado não seja atualizado
                setState(prevState => ({
                  ...prevState,
                  loading: false
                }));
                
                // Forçar retorno para evitar qualquer processamento adicional
                return;
              } catch (e) {
                console.warn('Erro no logout preventivo:', e);
              }
              
              // Não atualizar estado para manter na tela de cadastro concluído
              return;
            }
            
            setState(prevState => ({
              ...prevState,
              user, 
              session,
              loading: true
            }));
            
            try {
              // Verificar se o usuário existe na tabela user_profiles
              const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
              
              if (profileError) {
                console.error('Erro ao buscar perfil após evento:', profileError);
              }
              
              if (!profile) {
                console.log('Perfil não encontrado após evento de autenticação');
                await supabase.auth.signOut();
                setState({ ...initialAuthState, loading: false });
                return;
              }
              
              const isAdmin = await userService.isAdmin();
              
              setState({
                user,
                session,
                profile,
                isAdmin,
                loading: false,
                error: null
              });
              
              // Disparar evento de login bem-sucedido para componentes
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('auth-login-success'));
              }, 100);
              
            } catch (error) {
              console.error('Erro ao processar evento de autenticação:', error);
              setState(prevState => ({
                ...prevState,
                loading: false,
                error: error as Error
              }));
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('Usuário desconectado');
          setState({ ...initialAuthState, loading: false });
        }
      }
    );

    // Cleanup
    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      isMounted = false;
    };
  }, []);

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
      // Verificar se há um token no localStorage
      const session = localStorage.getItem('supabase.auth.token');
      if (session) {
        console.log('Token encontrado no localStorage');
      } else {
        console.log('Nenhum token encontrado no localStorage');
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
    }
  }, []);

  // Fazer login com email/senha
  const signInWithEmail = useCallback(async (email: string, password: string, remember: boolean = false) => {
    try {
      setState(prevState => ({ ...prevState, loading: true }));
      
      console.time('totalLoginTime');
      console.log('Iniciando processo de login...');
      
      // Verificar estado atual do token antes do login
      await checkTokenState();
      
      const { data, error } = await userService.signInWithEmail(email, password, remember);
      
      if (error) {
        console.error('Erro retornado pelo userService:', error);
        setState(prevState => ({
          ...prevState,
          error: error as Error,
          loading: false,
        }));
        console.timeEnd('totalLoginTime');
        return { error };
      }
      
      // Obter perfil do usuário
      console.log('Login bem-sucedido, obtendo perfil...');
      const { data: profile } = await userService.getUserProfile();
      const isAdmin = await userService.isAdmin();
      
      setState(prevState => ({
        ...prevState,
        user: data?.user || null,
        session: data,
        profile,
        isAdmin,
        loading: false,
        error: null,
      }));
      
      console.log('Processo de login completo com sucesso');
      console.timeEnd('totalLoginTime');
      
      // 🚀 Disparar evento para notificar outros componentes sobre login bem-sucedido
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('auth-login-success', {
          detail: { user: data?.user, profile }
        }));
        console.log('🔐 Evento auth-login-success disparado');
      }, 100);
      
      // Se a opção "lembrar" estiver marcada, salvar no localStorage
      if (remember) {
        localStorage.setItem('remember-user', 'true');
        
        // Salvar o dispositivo como autorizado para este usuário
        if (data?.user?.id) {
          await userService.saveAuthorizedDevice(data.user.id);
        }
      } else {
        localStorage.removeItem('remember-user');
      }
      
      return { error: null };
    } catch (error) {
      console.error('Erro não tratado no processo de login:', error);
      setState(prevState => ({
        ...prevState,
        error: error as Error,
        loading: false,
      }));
      console.timeEnd('totalLoginTime');
      return { error: error as Error };
    }
  }, [checkTokenState]);

  // Fazer cadastro com email
  const signUp = useCallback(async (email: string, password: string, birthdate?: string, displayName?: string, investorType?: string) => {
    try {
      setState(prevState => ({ ...prevState, loading: true }));
      
      const { data, error } = await userService.signUp(email, password, birthdate, displayName, investorType);
      
      if (error) {
        console.error('Erro retornado pelo userService.signUp:', error);
        setState(prevState => ({
          ...prevState,
          error: error as Error,
          loading: false,
        }));
        return { error };
      }
      
      console.log('Cadastro processado com sucesso pelo userService');
      
      setState(prevState => ({
        ...prevState,
        loading: false,
        error: null,
      }));
      
      return { error: null };
    } catch (error) {
      console.error('Erro no contexto de autenticação durante cadastro:', error);
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
      
      // Aqui não atualizamos o estado imediatamente pois o OAuth redireciona o usuário
      // O estado será atualizado quando o usuário retornar pelo callback
      
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
      
      // Executar o logout
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
}; 
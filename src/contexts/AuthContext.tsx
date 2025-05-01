import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { userService } from '@/services/userService';
import { supabase } from '@/lib/supabase';
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
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(initialAuthState);
  
  // Inicializar autenticação quando o componente monta
  useEffect(() => {
    let isMounted = true;
    
    // Usar ID de instância único para os logs
    const authId = Math.random().toString(36).substring(2, 9);
    console.log(`Inicializando autenticação [${authId}]...`);
    
    const fetchSession = async () => {
      try {
        console.log(`Buscando sessão [${authId}]...`);
        
        // Obter a sessão do usuário
        const session = await userService.getCurrentSession();
        
        // Se o componente foi desmontado durante a busca, não atualizar o estado
        if (!isMounted) return;
        
        if (session) {
          // Se houver sessão, obtém o usuário e o perfil
          const user = session.user;
          
          // Atualizar o estado imediatamente com informações básicas do usuário
          // para permitir navegação enquanto dados adicionais carregam
          setState(prevState => ({
            ...prevState,
            user,
            session: session as unknown as Session,
            loading: false, // Permitir navegação básica sem esperar pelo perfil
          }));
          
          // Após liberar a navegação, carregar dados do perfil em background
          setTimeout(async () => {
            if (!isMounted) return;
            
            try {
              console.log(`Carregando dados de perfil [${authId}]...`);
              
              // Carregar dados do perfil e admin em paralelo
              const [profileResult, isAdmin] = await Promise.all([
                userService.getUserProfile(),
                userService.isAdmin()
              ]);
              
              // Se o componente foi desmontado, não atualizar o estado
              if (!isMounted) return;
              
              const profile = profileResult.data;
              
              // Atualizar o estado com informações completas
              setState(prevState => ({
                ...prevState,
                profile,
                isAdmin,
              }));
              
              console.log(`Autenticação concluída com sucesso [${authId}]`);
            } catch (error) {
              console.warn(`Erro ao carregar perfil completo [${authId}]:`, error);
              // Não alteramos o estado loading, usuário já pode navegar com os dados básicos
            }
          }, 100); // Delay mínimo para garantir que a UI atualize primeiro
        } else {
          // Se não houver sessão, restaura o estado inicial
          if (isMounted) {
            setState({ ...initialAuthState, loading: false });
            console.log(`Autenticação concluída - sem sessão [${authId}]`);
          }
        }
      } catch (error) {
        console.error(`Erro ao carregar sessão [${authId}]:`, error);
        // Se o componente ainda estiver montado, atualizar o estado
        if (isMounted) {
          setState({
            ...initialAuthState,
            error: error as Error,
            loading: false,
          });
        }
      }
    };

    // Configurar listeners de mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Evento de autenticação:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Se o usuário fizer login, atualiza o estado
          if (session) {
            const user = session.user;
            const { data: profile } = await userService.getUserProfile();
            const isAdmin = await userService.isAdmin();
            
            setState({
              ...state,
              user,
              session,
              profile,
              isAdmin,
              loading: false,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          // Se o usuário fizer logout, restaura o estado inicial
          setState({ ...initialAuthState, loading: false });
        }
      }
    );

    // Carregar sessão inicial
    fetchSession();

    // Limpar subscription ao desmontar
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Função para atualizar o perfil do usuário
  const refreshUserProfile = async () => {
    if (state.user) {
      try {
        setState({ ...state, loading: true });
        const { data: profile } = await userService.getUserProfile();
        const isAdmin = await userService.isAdmin();
        setState({
          ...state,
          profile,
          isAdmin,
          loading: false,
        });
      } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        setState({
          ...state,
          error: error as Error,
          loading: false,
        });
      }
    }
  };

  // Função para verificar estado do token e sessão
  const checkTokenState = async () => {
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
  };

  // Fazer login com email
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setState({ ...state, loading: true });
      
      console.time('totalLoginTime');
      console.log('Iniciando processo de login...');
      
      // Verificar estado atual do token antes do login
      await checkTokenState();
      
      const { data, error } = await userService.signInWithEmail(email, password, true);
      
      if (error) {
        console.error('Erro retornado pelo userService:', error);
        setState({
          ...state,
          error: error as Error,
          loading: false,
        });
        console.timeEnd('totalLoginTime');
        return { error };
      }
      
      // Obter perfil do usuário
      console.log('Login bem-sucedido, obtendo perfil...');
      const { data: profile } = await userService.getUserProfile();
      const isAdmin = await userService.isAdmin();
      
      setState({
        ...state,
        user: data?.user || null,
        session: data,
        profile,
        isAdmin,
        loading: false,
        error: null,
      });
      
      console.log('Processo de login completo com sucesso');
      console.timeEnd('totalLoginTime');
      
      return { error: null };
    } catch (error) {
      console.error('Erro não tratado no processo de login:', error);
      setState({
        ...state,
        error: error as Error,
        loading: false,
      });
      console.timeEnd('totalLoginTime');
      return { error: error as Error };
    }
  };

  // Fazer cadastro com email
  const signUp = async (email: string, password: string, birthdate?: string) => {
    try {
      setState({ ...state, loading: true });
      
      const { data, error } = await userService.signUp(email, password, birthdate);
      
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
        loading: false,
        error: null,
      });
      
      toast.success(
        'Cadastro realizado com sucesso! Verifique seu email para confirmar o cadastro.',
        { duration: 5000 }
      );
      
      return { error: null };
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      setState({
        ...state,
        error: error as Error,
        loading: false,
      });
      return { error: error as Error };
    }
  };

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
}

// Hook para usar o contexto de autenticação
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
}; 
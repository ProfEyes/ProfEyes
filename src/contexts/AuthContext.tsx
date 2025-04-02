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
  
  // Efeito para carregar a sessão no carregamento inicial
  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Obtém a sessão atual
        const session = await userService.getCurrentSession();
        
        if (session) {
          // Se houver sessão, obtém o usuário e o perfil
          const user = session.user;
          const { data: profile } = await userService.getUserProfile();
          const isAdmin = await userService.isAdmin();
          
          setState({
            ...initialAuthState,
            user,
            session,
            profile,
            isAdmin,
            loading: false,
          });
        } else {
          // Se não houver sessão, restaura o estado inicial
          setState({ ...initialAuthState, loading: false });
        }
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
        setState({
          ...initialAuthState,
          error: error as Error,
          loading: false,
        });
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

  // Fazer login com email
  const signInWithEmail = async (email: string, password: string, remember = false) => {
    try {
      setState({ ...state, loading: true });
      
      const { data, error } = await userService.signInWithEmail(email, password);
      
      if (error) {
        setState({
          ...state,
          error: error as Error,
          loading: false,
        });
        return { error };
      }
      
      // Obter perfil do usuário
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
      
      return { error: null };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      setState({
        ...state,
        error: error as Error,
        loading: false,
      });
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
      
      await userService.signOut();
      
      setState({
        ...initialAuthState,
        loading: false,
      });
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
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
}; 
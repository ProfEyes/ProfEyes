import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Database } from '@/types/supabase';
import { supabase } from '@/lib/supabase';

// Tipo para o perfil do usuário
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

// Tipo simplificado para usuário simulado
type MockedUser = {
  id: string;
  email: string;
  password: string;
  verified: boolean;
  created_at: string;
};

// Define o tipo de contexto para autenticação
type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  verifyEmail: (email: string) => Promise<{ error: AuthError | null }>;
  isStrongPassword: (password: string) => { isStrong: boolean; message: string };
};

// Cria o contexto de autenticação
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props para o provedor de autenticação
type AuthProviderProps = {
  children: ReactNode;
};

// Chave para armazenar usuários mockados no localStorage
const LOCAL_STORAGE_USERS_KEY = 'mock_users';
const LOCAL_STORAGE_CURRENT_USER_KEY = 'current_user';

// Componente provedor de autenticação 
export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Funções auxiliares para gerenciar usuários mockados no localStorage
  const getLocalUsers = (): MockedUser[] => {
    const usersJSON = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    return usersJSON ? JSON.parse(usersJSON) : [];
  };
  
  const saveLocalUsers = (users: MockedUser[]) => {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  };
  
  const saveCurrentUser = (mockedUser: MockedUser) => {
    // Não permite salvar usuário atual se o email não estiver verificado
    if (!mockedUser.verified) {
      return null;
    }
    
    const mockSession = {
      user: {
        id: mockedUser.id,
        email: mockedUser.email,
        user_metadata: { 
          email: mockedUser.email,
          email_verified: mockedUser.verified
        }
      }
    };
    localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(mockSession));
    return mockSession;
  };
  
  const loadCurrentUser = () => {
    const userJSON = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
    return userJSON ? JSON.parse(userJSON) : null;
  };
  
  // Função para validar senha forte
  const isStrongPassword = (password: string) => {
    const minLength = 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (password.length < minLength) {
      return { 
        isStrong: false, 
        message: `A senha deve ter pelo menos ${minLength} caracteres` 
      };
    }
    
    const requirements = [];
    if (!hasUpperCase) requirements.push("uma letra maiúscula");
    if (!hasLowerCase) requirements.push("uma letra minúscula");
    if (!hasNumbers) requirements.push("um número");
    if (!hasSpecialChar) requirements.push("um caractere especial");
    
    if (requirements.length > 0) {
      return {
        isStrong: false,
        message: `A senha deve conter pelo menos ${requirements.join(", ")}`
      };
    }
    
    return { isStrong: true, message: "Senha forte" };
  };

  useEffect(() => {
    // Sincronizar com o estado de autenticação do Supabase
    const getCurrentUser = async () => {
      try {
        setLoading(true);
        
        // Adicionar um timeout para evitar carregamento infinito
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Timeout ao verificar autenticação'));
          }, 5000); // 5 segundos de timeout
        });
        
        // Verificar se existe uma sessão ativa
        const sessionPromise = supabase.auth.getSession();
        
        // Usar Promise.race para aplicar o timeout
        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (error) {
          console.error('Erro ao verificar autenticação:', error);
          setLoading(false);
          return;
        }
        
        if (session) {
          setSession(session);
          setUser(session.user);
          
          try {
            // Carregar o perfil do usuário
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
              
            if (profileData) {
              setProfile(profileData);
            }
          } catch (profileError) {
            console.error('Erro ao carregar perfil:', profileError);
            // Continuar mesmo se houver erro ao carregar o perfil
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        // Em caso de erro, considerar que não há usuário autenticado
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        // Garantir que o loading seja definido como false
        setLoading(false);
      }
    };
    
    getCurrentUser();
    
    // Configurar o listener para mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Carregar o perfil do usuário quando a sessão mudar
        try {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
            
          setProfile(profileData || null);
        } catch (error) {
          console.error('Erro ao carregar perfil:', error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });
    
    // Limpar o listener quando o componente for desmontado
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Função para login com email e senha via Supabase
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Fazer login utilizando o Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Erro ao fazer login:', error);
        
        // Traduzir as mensagens de erro comuns do Supabase
        if (error.message.includes('Invalid login credentials')) {
          return { 
            error: {
              message: 'Email ou senha incorretos. Por favor, verifique suas credenciais.',
              name: 'InvalidCredentials'
            } as any 
          };
        }
        
        if (error.message.includes('Email not confirmed')) {
          return {
            error: {
              message: 'Email não verificado. Por favor, verifique seu email antes de fazer login.',
              name: 'EmailNotVerified'
            } as any
          };
        }
        
        return { error };
      }
      
      if (!data.session || !data.user) {
        return { 
          error: {
            message: 'Erro ao fazer login. Por favor, tente novamente.',
            name: 'LoginFailed'
          } as any 
        };
      }
      
      // Atualizar o estado com os dados do usuário
      setSession(data.session);
      setUser(data.user);
      
      return { data };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return {
        error: {
          message: 'Erro ao fazer login. Por favor, tente novamente.',
          name: 'LoginFailed'
        } as any
      };
    } finally {
      setLoading(false);
    }
  };

  // Função para cadastro com email e senha via Supabase
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Verificar se a senha é forte
      const passwordCheck = isStrongPassword(password);
      if (!passwordCheck.isStrong) {
        return {
          error: {
            message: passwordCheck.message,
            name: 'WeakPassword'
          } as any
        };
      }
      
      // Realizar o cadastro utilizando o Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Configurar o redirecionamento para a página de confirmação
          emailRedirectTo: `${window.location.origin}/auth`,
          // Dados adicionais do usuário
          data: {
            display_name: email.split('@')[0],
          }
        }
      });
      
      if (error) {
        console.error('Erro ao criar conta:', error);
        
        // Traduzir as mensagens de erro comuns do Supabase
        if (error.message.includes('already registered')) {
          return { 
            error: {
              message: 'Este email já está cadastrado. Tente fazer login.',
              name: 'UserExists'
            } as any 
          };
        }
        
        return { error };
      }
      
      // Verificar se o email de confirmação foi enviado
      if (data?.user && !data.user.email_confirmed_at) {
        toast.success('Conta criada com sucesso!', {
          description: 'Um email de confirmação foi enviado para o seu endereço. Por favor, verifique sua caixa de entrada e spam.'
        });
      } else {
        toast.success('Conta criada com sucesso!');
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Erro ao criar conta:', error);
      toast.error(`Erro ao criar conta: ${error.message}`);
      return { error: error as any };
    } finally {
      setLoading(false);
    }
  };
  
  // Função para verificar email via Supabase (enviar email de verificação)
  const verifyEmail = async (email: string) => {
    try {
      setLoading(true);
      
      // Enviar email de verificação para o usuário
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        }
      });
      
      if (error) {
        console.error('Erro ao enviar email de verificação:', error);
        
        if (error.message.includes('rate limit')) {
          return { 
            error: {
              message: 'Muitas solicitações. Por favor, aguarde alguns minutos antes de tentar novamente.',
              name: 'RateLimitExceeded'
            } as any
          };
        }
        
        return { error };
      }
      
      toast.success('Email de verificação enviado!', {
        description: 'Por favor, verifique sua caixa de entrada e spam para confirmar sua conta.'
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Erro ao enviar email de verificação:', error);
      toast.error(`Erro ao enviar email de verificação: ${error.message}`);
      return { error: error as any };
    } finally {
      setLoading(false);
    }
  };

  // Função para logout via Supabase
  const signOut = async () => {
    try {
      setLoading(true);
      
      // Fazer logout utilizando o Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Erro ao fazer logout:', error);
        throw error;
      }
      
      // Limpar o estado
      setUser(null);
      setSession(null);
      setProfile(null);
      
      toast.success('Logout realizado com sucesso');
    } catch (error: any) {
      console.error('Erro ao fazer logout:', error);
      toast.error(`Erro ao fazer logout: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Função para resetar a senha
  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      
      if (error) {
        console.error('Erro ao enviar email de recuperação:', error);
        
        // Traduzir as mensagens de erro comuns do Supabase
        if (error.message.includes('User not found')) {
          return { 
            error: {
              message: 'Email não encontrado. Por favor, verifique o email informado.',
              name: 'UserNotFound'
            } as any 
          };
        }
        
        return { error };
      }
      
      return { data: true };
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      return {
        error: {
          message: 'Erro ao enviar email de recuperação. Por favor, tente novamente.',
          name: 'ResetFailed'
        } as any
      };
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar o perfil do usuário
  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Atualiza o perfil local
      setProfile(prev => prev ? { ...prev, ...data } : null);
      
      toast.success('Perfil atualizado com sucesso!');
      return { error: null };
    } catch (error: any) {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
      return { error };
    }
  };

  // Valor do contexto a ser fornecido
  const value = {
    session,
    user,
    profile,
    loading,
    signInWithEmail,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    verifyEmail,
    isStrongPassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook para usar o contexto de autenticação
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
} 
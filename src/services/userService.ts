import { supabase } from '@/lib/supabase';
import type { UserProfile, Session, Provider } from '@/types/auth';
import { v4 as uuidv4 } from 'uuid';

// Serviço para gerenciar usuários no PostgreSQL via Supabase
export const userService = {
  /**
   * Autenticação com Email/Senha
   */
  async signInWithEmail(email: string, password: string): Promise<{ data: Session | null; error: any }> {
    try {
      // Registra a tentativa de login
      await this.logUserAction({
        action: 'login',
        details: { email },
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return { data: null, error };
    }
  },

  /**
   * Cadastro de usuário
   */
  async signUp(email: string, password: string, birthdate?: string): Promise<{ data: any; error: any }> {
    try {
      // Verificar se o usuário já existe
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
        .single();

      if (existingUser) {
        return { data: null, error: { message: 'Este email já está cadastrado.' } };
      }

      // Cadastrar o usuário no auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            birthdate,
          },
        },
      });

      if (error) throw error;

      // Registra a ação
      await this.logUserAction({
        action: 'create',
        details: { email },
        targetUserId: data.user?.id,
      });

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
      return { data: null, error };
    }
  },

  /**
   * Login com provedor OAuth (Google, GitHub, etc.)
   */
  async signInWithProvider(provider: Provider): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error(`Erro ao fazer login com ${provider}:`, error);
      return { data: null, error };
    }
  },

  /**
   * Logout
   */
  async signOut(): Promise<{ error: any }> {
    try {
      // Registra o logout
      await this.logUserAction({
        action: 'logout',
        details: {},
      });

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      return { error };
    }
  },

  /**
   * Recuperação de senha
   */
  async resetPassword(email: string): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      // Registra a ação
      await this.logUserAction({
        action: 'reset_password',
        details: { email },
      });

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao solicitar redefinição de senha:', error);
      return { data: null, error };
    }
  },

  /**
   * Verificação de email
   */
  async verifyEmail(email: string): Promise<{ data: any; error: any }> {
    try {
      // Implementação dependente do fluxo de verificação do Supabase
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;

      // Registra a ação
      await this.logUserAction({
        action: 'verify_email',
        details: { email },
      });

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      return { data: null, error };
    }
  },

  /**
   * Obter perfil de usuário
   */
  async getUserProfile(userId?: string): Promise<{ data: UserProfile | null; error: any }> {
    try {
      // Se userId não for fornecido, usa o usuário atual
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;

      if (!targetUserId) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao obter perfil do usuário:', error);
      return { data: null, error };
    }
  },

  /**
   * Atualizar perfil de usuário
   */
  async updateUserProfile(profile: Partial<UserProfile>): Promise<{ data: UserProfile | null; error: any }> {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(profile)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Registra a ação
      await this.logUserAction({
        action: 'update',
        details: { profile },
        targetUserId: userId,
      });

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao atualizar perfil do usuário:', error);
      return { data: null, error };
    }
  },

  /**
   * Obter configurações de notificação
   */
  async getNotificationSettings(userId?: string): Promise<{ data: any; error: any }> {
    try {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;

      if (!targetUserId) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao obter configurações de notificação:', error);
      return { data: null, error };
    }
  },

  /**
   * Atualizar configurações de notificação
   */
  async updateNotificationSettings(settings: any): Promise<{ data: any; error: any }> {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('notification_settings')
        .update(settings)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao atualizar configurações de notificação:', error);
      return { data: null, error };
    }
  },

  /**
   * Obter preferências de trading
   */
  async getTradingPreferences(userId?: string): Promise<{ data: any; error: any }> {
    try {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;

      if (!targetUserId) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('trading_preferences')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao obter preferências de trading:', error);
      return { data: null, error };
    }
  },

  /**
   * Atualizar preferências de trading
   */
  async updateTradingPreferences(preferences: any): Promise<{ data: any; error: any }> {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('trading_preferences')
        .update(preferences)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao atualizar preferências de trading:', error);
      return { data: null, error };
    }
  },

  /**
   * Verificar se o usuário é administrador
   */
  async isAdmin(): Promise<boolean> {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!userId) {
        return false;
      }

      const { data } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('user_id', userId)
        .single();

      return data?.is_admin === true;
    } catch (error) {
      console.error('Erro ao verificar se o usuário é admin:', error);
      return false;
    }
  },

  /**
   * Listar todos os usuários (apenas para admins)
   */
  async listUsers(): Promise<{ data: any[]; error: any }> {
    try {
      // Verifica se é admin
      const isAdmin = await this.isAdmin();

      if (!isAdmin) {
        throw new Error('Acesso não autorizado. Apenas administradores podem listar usuários.');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      return { data: [], error };
    }
  },

  /**
   * Excluir usuário (apenas admin)
   */
  async deleteUser(userId: string): Promise<{ success: boolean; error: any }> {
    try {
      // Verifica se é admin
      const isAdmin = await this.isAdmin();

      if (!isAdmin) {
        throw new Error('Acesso não autorizado. Apenas administradores podem excluir usuários.');
      }

      // Registra a ação
      await this.logUserAction({
        action: 'delete',
        targetUserId: userId,
        details: { userId },
      });

      // Exclui o usuário via API Admin do Supabase (requer função no back-end)
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      return { success: false, error };
    }
  },

  /**
   * Registrar ação do usuário
   */
  async logUserAction({
    action,
    details = {},
    targetUserId = null,
  }: {
    action: 'create' | 'update' | 'delete' | 'reset_password' | 'login' | 'logout' | 'verify_email';
    details?: any;
    targetUserId?: string | null;
  }): Promise<void> {
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      const adminId = currentUser?.id || null;

      const logEntry = {
        id: uuidv4(),
        admin_id: adminId,
        action,
        target_user_id: targetUserId,
        details,
        ip_address: null, // Isso seria obtido do servidor em um ambiente real
        user_agent: navigator.userAgent,
      };

      await supabase.from('user_management_logs').insert([logEntry]);
    } catch (error) {
      console.error('Erro ao registrar ação:', error);
      // Não propaga o erro, apenas loga
    }
  },

  /**
   * Obter logs de gerenciamento (apenas admin)
   */
  async getUserLogs(): Promise<{ data: any[]; error: any }> {
    try {
      // Verifica se é admin
      const isAdmin = await this.isAdmin();

      if (!isAdmin) {
        throw new Error('Acesso não autorizado. Apenas administradores podem visualizar logs.');
      }

      const { data, error } = await supabase
        .from('user_management_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao obter logs:', error);
      return { data: [], error };
    }
  },

  /**
   * Verificar força da senha
   */
  isStrongPassword(password: string): { isStrong: boolean; message: string } {
    // Regras de validação de senha
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

    if (password.length < minLength) {
      return { isStrong: false, message: `A senha deve ter no mínimo ${minLength} caracteres.` };
    }

    if (!hasUppercase) {
      return { isStrong: false, message: 'A senha deve conter pelo menos uma letra maiúscula.' };
    }

    if (!hasLowercase) {
      return { isStrong: false, message: 'A senha deve conter pelo menos uma letra minúscula.' };
    }

    if (!hasNumber) {
      return { isStrong: false, message: 'A senha deve conter pelo menos um número.' };
    }

    if (!hasSpecialChar) {
      return { isStrong: false, message: 'A senha deve conter pelo menos um caractere especial.' };
    }

    return { isStrong: true, message: 'Senha forte' };
  },

  /**
   * Verificar sessão atual
   */
  async getCurrentSession(): Promise<Session | null> {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch (error) {
      console.error('Erro ao obter sessão:', error);
      return null;
    }
  },

  /**
   * Obter usuário atual
   */
  async getCurrentUser() {
    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      return null;
    }
  },
}; 
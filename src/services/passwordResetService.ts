import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token_hash: string;
  email: string;
  used_at?: string;
  created_at: string;
  expires_at: string;
}

export const passwordResetService = {
  /**
   * Registrar um novo token de redefinição de senha
   */
  async registerResetToken(
    userId: string,
    email: string,
    tokenHash: string
  ): Promise<{ success: boolean; error?: Error | unknown }> {
    try {
      const { error } = await (supabase as SupabaseClient<Database>).from('password_reset_tokens')
        .insert({
          user_id: userId,
          email: email,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hora
        });

      if (error) {
        console.error('Erro ao registrar token de reset:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao registrar token de reset:', error);
      return { success: false, error };
    }
  },

  /**
   * Verificar se um token é válido (não expirado e não usado)
   */
  async isTokenValid(tokenHash: string): Promise<boolean> {
    try {
      const { data, error } = await (supabase as SupabaseClient<Database>).rpc('is_password_reset_token_valid', {
          token_hash_param: tokenHash
        });

      if (error) {
        console.error('Erro ao verificar token:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return false;
    }
  },

  /**
   * Marcar um token como usado
   */
  async markTokenAsUsed(tokenHash: string): Promise<{ success: boolean; error?: Error | unknown }> {
    try {
      const { data, error } = await (supabase as SupabaseClient<Database>).rpc('mark_password_reset_token_used', {
          token_hash_param: tokenHash
        });

      if (error) {
        console.error('Erro ao marcar token como usado:', error);
        return { success: false, error };
      }

      return { success: data === true };
    } catch (error) {
      console.error('Erro ao marcar token como usado:', error);
      return { success: false, error };
    }
  },

  /**
   * Obter detalhes de um token
   */
  async getTokenDetails(tokenHash: string): Promise<{ data: PasswordResetToken | null; error?: Error | unknown }> {
    try {
      const { data, error } = await (supabase as SupabaseClient<Database>).from('password_reset_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .single();

      if (error) {
        console.error('Erro ao obter detalhes do token:', error);
        return { data: null, error };
      }

      return { data };
    } catch (error) {
      console.error('Erro ao obter detalhes do token:', error);
      return { data: null, error };
    }
  },

  /**
   * Limpar tokens expirados
   */
  async cleanupExpiredTokens(): Promise<{ success: boolean; error?: Error | unknown }> {
    try {
      const { error } = await (supabase as SupabaseClient<Database>).rpc('cleanup_expired_password_reset_tokens');

      if (error) {
        console.error('Erro ao limpar tokens expirados:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao limpar tokens expirados:', error);
      return { success: false, error };
    }
  },

  /**
   * Obter tokens de um usuário
   */
  async getUserTokens(userId: string): Promise<{ data: PasswordResetToken[]; error?: Error | unknown }> {
    try {
      const { data, error } = await (supabase as SupabaseClient<Database>).from('password_reset_tokens')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao obter tokens do usuário:', error);
        return { data: [], error };
      }

      return { data: data || [] };
    } catch (error) {
      console.error('Erro ao obter tokens do usuário:', error);
      return { data: [], error };
    }
  },

  /**
   * Extrair token hash da URL
   */
  extractTokenFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      
      // Tentar pegar de diferentes parâmetros
      const code = urlObj.searchParams.get('code');
      if (code) return code;

      const accessToken = urlObj.searchParams.get('access_token');
      if (accessToken) return accessToken;

      const refreshToken = urlObj.searchParams.get('refresh_token');
      if (refreshToken) return refreshToken;

      // Tentar extrair do path
      const pathParts = urlObj.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      
      if (lastPart && lastPart !== 'reset-password' && lastPart.length > 10) {
        return lastPart;
      }

      return null;
    } catch (error) {
      console.error('Erro ao extrair token da URL:', error);
      return null;
    }
  },

  /**
   * Validar e processar link de redefinição
   */
  async validateResetLink(url: string): Promise<{
    isValid: boolean;
    tokenHash?: string;
    message?: string;
  }> {
    const tokenHash = this.extractTokenFromUrl(url);
    
    if (!tokenHash) {
      return {
        isValid: false,
        message: 'Token de redefinição não encontrado na URL'
      };
    }

    const isValid = await this.isTokenValid(tokenHash);
    
    if (!isValid) {
      return {
        isValid: false,
        tokenHash,
        message: 'Este link de redefinição já foi usado ou expirou'
      };
    }

    return {
      isValid: true,
      tokenHash,
      message: 'Link de redefinição válido'
    };
  }
}; 
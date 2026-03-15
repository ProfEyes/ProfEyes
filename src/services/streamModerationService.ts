import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export interface BlockedUser {
  id: string;
  streamer_id: string;
  blocked_user_id: string;
  blocked_at: string;
  reason: string | null;
}

export interface StreamSettings {
  id: string;
  stream_id: string;
  chat_enabled: boolean;
  chat_delay_seconds: number;
  subscribers_only: boolean;
  slow_mode_seconds: number;
  emotes_only: boolean;
  links_allowed: boolean;
}

export const streamModerationService = {
  /**
   * Bloquear um usuário para um streamer específico
   */
  async blockUser(streamerId: string, blockedUserId: string, reason?: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('blocked_users')
        .insert({
          streamer_id: streamerId,
          blocked_user_id: blockedUserId,
          reason: reason || null
        });

      if (error) {
        console.error('Erro ao bloquear usuário:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Erro ao bloquear usuário:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  },

  /**
   * Desbloquear um usuário
   */
  async unblockUser(streamerId: string, blockedUserId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('blocked_users')
        .delete()
        .eq('streamer_id', streamerId)
        .eq('blocked_user_id', blockedUserId);

      if (error) {
        console.error('Erro ao desbloquear usuário:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Erro ao desbloquear usuário:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  },

  /**
   * Verificar se um usuário está bloqueado pelo streamer
   */
  async isUserBlocked(streamerId: string, userId: string): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('blocked_users')
        .select('id')
        .eq('streamer_id', streamerId)
        .eq('blocked_user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar bloqueio:', error);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error('Erro ao verificar bloqueio:', err);
      return false;
    }
  },

  /**
   * Listar todos os usuários bloqueados por um streamer
   */
  async getBlockedUsers(streamerId: string): Promise<BlockedUser[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('blocked_users')
        .select('*')
        .eq('streamer_id', streamerId)
        .order('blocked_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usuários bloqueados:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Erro ao buscar usuários bloqueados:', err);
      return [];
    }
  },

  /**
   * Obter configurações de uma transmissão
   */
  async getStreamSettings(streamId: string): Promise<StreamSettings | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('stream_settings')
        .select('*')
        .eq('stream_id', streamId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar configurações:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
      return null;
    }
  },

  /**
   * Atualizar configurações de uma transmissão
   */
  async updateStreamSettings(streamId: string, settings: Partial<StreamSettings>): Promise<{ success: boolean; error: string | null }> {
    try {
      // Primeiro verifica se já existe
      const existing = await this.getStreamSettings(streamId);

      if (existing) {
        // Atualizar
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('stream_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .eq('stream_id', streamId);

        if (error) {
          console.error('Erro ao atualizar configurações:', error);
          return { success: false, error: error.message };
        }
      } else {
        // Criar
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('stream_settings')
          .insert({
            stream_id: streamId,
            ...settings
          });

        if (error) {
          console.error('Erro ao criar configurações:', error);
          return { success: false, error: error.message };
        }
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  }
};

import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export interface ModeratorPermissions {
  manage_chat: boolean;
  edit_stream_info: boolean;
  manage_moderators: boolean;
  view_analytics: boolean;
  send_announcements: boolean;
}

export interface StreamModerator {
  id: string;
  streamer_id: string;
  moderator_id: string;
  added_at: string;
  added_by: string | null;
  is_active: boolean;
  moderator_email?: string;
  moderator_name?: string;
  moderator_avatar?: string;
  permissions?: ModeratorPermissions;
}

export const streamModeratorsService = {
  /**
   * Buscar usuários por email ou nome (autocompletar)
   */
  async searchUsers(query: string): Promise<Array<{ id: string; email: string; name: string; avatar: string | null }>> {
    console.log('🔍 [searchUsers] Iniciando busca com query:', query);
    
    try {
      if (!query || query.length < 2) {
        console.log('⚠️ [searchUsers] Query muito curta, retornando vazio');
        return [];
      }

      const searchTerm = query.toLowerCase().trim();
      console.log('🔍 [searchUsers] Termo de busca processado:', searchTerm);

      // Buscar por email ou nome
      console.log('🔍 [searchUsers] Executando query no Supabase...');
      const { data, error } = await (supabase as SupabaseClient<Database>)
        .from('user_profiles')
        .select('user_id, email, display_name, avatar_url')
        .or(`email.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
        .limit(5);

      console.log('✅ [searchUsers] Resposta do Supabase:', { 
        error: error?.message, 
        data: data,
        count: data?.length 
      });

      if (error) {
        console.error('❌ [searchUsers] Erro do Supabase:', error);
        return [];
      }

      if (!data) {
        console.log('⚠️ [searchUsers] Nenhum dado retornado');
        return [];
      }

      const results = data.map(user => ({
        id: user.user_id,
        email: user.email || '',
        name: user.display_name || 'Usuário',
        avatar: user.avatar_url
      }));

      console.log('✅ [searchUsers] Resultados mapeados:', results);
      return results;
    } catch (err) {
      console.error('❌ [searchUsers] Erro ao buscar usuários:', err);
      return [];
    }
  },

  /**
   * Buscar usuário por email
   */
  async findUserByEmail(email: string): Promise<{ id: string; email: string; name: string; avatar: string | null } | null> {
    try {
      // Buscar no auth.users através do admin
      const { data, error } = await (supabase as SupabaseClient<Database>)
        .from('user_profiles')
        .select('user_id, display_name, avatar_url')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.user_id,
        email: email,
        name: data.display_name || 'Usuário',
        avatar: data.avatar_url
      };
    } catch (err) {
      console.error('Erro ao buscar usuário:', err);
      return null;
    }
  },

  /**
   * Adicionar moderador
   */
  async addModerator(
    streamerId: string, 
    moderatorEmail: string,
    permissions?: ModeratorPermissions
  ): Promise<{ success: boolean; error: string | null; moderator?: StreamModerator }> {
    try {
      console.log('📝 [addModerator] Iniciando adição de moderador:', { streamerId, moderatorEmail, permissions });
      
      // Verificar se há usuário autenticado
      const { data: { user: currentUser } } = await (supabase as SupabaseClient<Database>).auth.getUser();
      if (!currentUser) {
        console.error('❌ [addModerator] Nenhum usuário autenticado');
        return { success: false, error: 'Você precisa estar autenticado para adicionar moderadores' };
      }
      
      console.log('✅ [addModerator] Usuário autenticado:', currentUser.id);
      
      // Verificar se o usuário atual é o streamer
      if (currentUser.id !== streamerId) {
        console.error('❌ [addModerator] Usuário não é o streamer. Current:', currentUser.id, 'Expected:', streamerId);
        return { success: false, error: 'Você não tem permissão para adicionar moderadores para este streamer' };
      }
      
      // Buscar usuário pelo email
      const user = await this.findUserByEmail(moderatorEmail);
      
      if (!user) {
        console.log('❌ [addModerator] Usuário não encontrado');
        return { success: false, error: 'Usuário não encontrado com este email' };
      }

      console.log('✅ [addModerator] Usuário encontrado:', user);

      // Não permitir adicionar a si mesmo como moderador
      if (user.id === streamerId) {
        console.log('❌ [addModerator] Tentativa de adicionar a si mesmo');
        return { success: false, error: 'Você não pode adicionar a si mesmo como moderador' };
      }

      // Verificar se já é moderador do streamer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('streamer_moderators')
        .select('id, is_active')
        .eq('streamer_id', streamerId)
        .eq('moderator_id', user.id)
        .single();

      if (existing) {
        if (existing.is_active) {
          console.log('❌ [addModerator] Já é moderador ativo');
          return { success: false, error: 'Este usuário já é moderador' };
        } else {
          // Reativar moderador inativo
          console.log('♻️ [addModerator] Reativando moderador');
          
          // Permissões padrão se não fornecidas
          const defaultPermissions: ModeratorPermissions = permissions || {
            manage_chat: true,
            edit_stream_info: false,
            manage_moderators: false,
            view_analytics: false,
            send_announcements: false
          };
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: updateError } = await (supabase as any)
            .from('streamer_moderators')
            .update({ 
              is_active: true, 
              updated_at: new Date().toISOString(),
              permissions: defaultPermissions
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error('❌ [addModerator] Erro ao reativar:', updateError);
            return { success: false, error: 'Erro ao reativar moderador' };
          }

          return {
            success: true,
            error: null,
            moderator: {
              id: existing.id,
              streamer_id: streamerId,
              moderator_id: user.id,
              added_at: new Date().toISOString(),
              added_by: streamerId,
              is_active: true,
              moderator_email: user.email,
              moderator_name: user.name,
              moderator_avatar: user.avatar,
              permissions: defaultPermissions
            }
          };
        }
      }

      // Adicionar novo moderador
      console.log('➕ [addModerator] Inserindo novo moderador');
      
      // Permissões padrão se não fornecidas
      const defaultPermissions: ModeratorPermissions = permissions || {
        manage_chat: true,
        edit_stream_info: false,
        manage_moderators: false,
        view_analytics: false,
        send_announcements: false
      };
      
      console.log('📊 [addModerator] Dados a inserir:', {
        streamer_id: streamerId,
        moderator_id: user.id,
        added_by: streamerId,
        is_active: true,
        permissions: defaultPermissions
      });
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('streamer_moderators')
        .insert({
          streamer_id: streamerId,
          moderator_id: user.id,
          added_by: streamerId,
          is_active: true,
          permissions: defaultPermissions
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [addModerator] Erro ao inserir:', error);
        console.error('❌ [addModerator] Detalhes do erro:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return { success: false, error: 'Erro ao adicionar moderador: ' + error.message };
      }

      console.log('✅ [addModerator] Moderador adicionado com sucesso:', data);

      return {
        success: true,
        error: null,
        moderator: {
          id: data.id,
          streamer_id: streamerId,
          moderator_id: user.id,
          added_at: data.added_at,
          added_by: streamerId,
          is_active: true,
          moderator_email: user.email,
          moderator_name: user.name,
          moderator_avatar: user.avatar,
          permissions: data.permissions
        }
      };
    } catch (err) {
      console.error('❌ [addModerator] Erro geral:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  },

  /**
   * Remover moderador
   */
  async removeModerator(
    streamerId: string,
    moderatorId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      console.log('🗑️ [removeModerator] Removendo moderador:', { streamerId, moderatorId });
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('streamer_moderators')
        .delete()
        .eq('streamer_id', streamerId)
        .eq('moderator_id', moderatorId);

      if (error) {
        console.error('❌ [removeModerator] Erro ao remover:', error);
        return { success: false, error: 'Erro ao remover moderador' };
      }

      console.log('✅ [removeModerator] Moderador removido com sucesso');
      return { success: true, error: null };
    } catch (err) {
      console.error('❌ [removeModerator] Erro geral:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  },

  /**
   * Atualizar permissões de um moderador
   */
  async updateModeratorPermissions(
    streamerId: string,
    moderatorRecordId: string,
    permissions: ModeratorPermissions
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      console.log('🔧 [updateModeratorPermissions] Atualizando permissões:', { streamerId, moderatorRecordId, permissions });
      
      // Verificar se há usuário autenticado
      const { data: { user: currentUser } } = await (supabase as SupabaseClient<Database>).auth.getUser();
      if (!currentUser) {
        console.error('❌ [updateModeratorPermissions] Nenhum usuário autenticado');
        return { success: false, error: 'Você precisa estar autenticado' };
      }
      
      // Verificar se o usuário atual é o streamer
      if (currentUser.id !== streamerId) {
        console.error('❌ [updateModeratorPermissions] Usuário não é o streamer');
        return { success: false, error: 'Você não tem permissão para atualizar permissões' };
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('streamer_moderators')
        .update({ 
          permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', moderatorRecordId)
        .eq('streamer_id', streamerId);

      if (error) {
        console.error('❌ [updateModeratorPermissions] Erro ao atualizar:', error);
        return { success: false, error: 'Erro ao atualizar permissões: ' + error.message };
      }

      console.log('✅ [updateModeratorPermissions] Permissões atualizadas com sucesso');
      return { success: true, error: null };
    } catch (err) {
      console.error('❌ [updateModeratorPermissions] Erro geral:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  },

  /**
   * Listar moderadores de um streamer
   */
  async getModerators(streamerId: string): Promise<StreamModerator[]> {
    try {
      console.log('📋 [getModerators] Buscando moderadores do streamer:', streamerId);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('streamer_moderators')
        .select(`
          id,
          streamer_id,
          moderator_id,
          added_at,
          added_by,
          is_active,
          permissions
        `)
        .eq('streamer_id', streamerId)
        .eq('is_active', true)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('❌ [getModerators] Erro ao buscar:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('ℹ️ [getModerators] Nenhum moderador encontrado');
        return [];
      }

      console.log(`✅ [getModerators] ${data.length} moderador(es) encontrado(s)`);

      // Buscar informações dos moderadores do banco de dados
      const moderatorIds = data.map((m: { moderator_id: string }) => m.moderator_id);
      const { data: profiles } = await (supabase as SupabaseClient<Database>)
        .from('user_profiles')
        .select('user_id, display_name, avatar_url, email')
        .in('user_id', moderatorIds);

      const profileMap = new Map(
        profiles?.map((p: { user_id: string }) => [p.user_id, p]) || []
      );

      return data.map((mod: { id: string; streamer_id: string; moderator_id: string; added_at: string; added_by: string | null; is_active: boolean; permissions?: ModeratorPermissions }) => ({
        id: mod.id,
        streamer_id: mod.streamer_id,
        moderator_id: mod.moderator_id,
        added_at: mod.added_at,
        added_by: mod.added_by,
        is_active: mod.is_active,
        moderator_email: (profileMap.get(mod.moderator_id) as unknown as { email?: string })?.email || '',
        moderator_name: (profileMap.get(mod.moderator_id) as unknown as { display_name?: string })?.display_name || 'Usuário',
        moderator_avatar: (profileMap.get(mod.moderator_id) as unknown as { avatar_url?: string })?.avatar_url || null,
        permissions: mod.permissions || {
          manage_chat: true,
          edit_stream_info: false,
          manage_moderators: false,
          view_analytics: false,
          send_announcements: false
        }
      }));
    } catch (err) {
      console.error('❌ [getModerators] Erro geral:', err);
      return [];
    }
  },

  /**
   * Verificar se usuário é moderador
   */
  async isModerator(streamerId: string, userId: string): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('streamer_moderators')
        .select('id')
        .eq('streamer_id', streamerId)
        .eq('moderator_id', userId)
        .eq('is_active', true)
        .single();

      return !error && !!data;
    } catch (err) {
      return false;
    }
  },

  /**
   * Verificar se usuário pode moderar uma live específica
   */
  async canModerateStream(userId: string, streamId: string): Promise<boolean> {
    try {
      // Buscar o dono da live
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: stream } = await (supabase as any)
        .from('live_streams')
        .select('user_id')
        .eq('id', streamId)
        .single();

      if (!stream) return false;

      // É o próprio streamer?
      if (stream.user_id === userId) return true;

      // É moderador do streamer?
      return await this.isModerator(stream.user_id, userId);
    } catch (err) {
      console.error('Erro ao verificar permissão de moderação:', err);
      return false;
    }
  },

  /**
   * Obter configurações de links
   */
  async getLinkSettings(streamId: string): Promise<{ linksAllowed: boolean; linksModeratorOnly: boolean }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('stream_settings')
        .select('links_allowed, links_moderator_only')
        .eq('stream_id', streamId)
        .single();

      return {
        linksAllowed: data?.links_allowed ?? true,
        linksModeratorOnly: data?.links_moderator_only ?? false
      };
    } catch (err) {
      return { linksAllowed: true, linksModeratorOnly: false };
    }
  },

  /**
   * Atualizar configurações de links
   */
  async updateLinkSettings(
    streamId: string,
    linksAllowed: boolean,
    linksModeratorOnly: boolean
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('stream_settings')
        .upsert({
          stream_id: streamId,
          links_allowed: linksAllowed,
          links_moderator_only: linksModeratorOnly,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao atualizar configurações de links:', error);
        return { success: false, error: 'Erro ao atualizar configurações' };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Erro ao atualizar configurações de links:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  }
};

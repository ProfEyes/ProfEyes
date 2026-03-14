import { supabase } from '@/lib/supabase';

export interface StreamModerator {
  id: string;
  streamer_id: string;
  moderator_id: string;
  added_at: string;
  added_by: string | null;
  moderator_email?: string;
  moderator_name?: string;
  moderator_avatar?: string;
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
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, email, full_name, avatar_url')
        .or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
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
        name: user.full_name || 'Usuário',
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
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.user_id,
        email: email,
        name: data.full_name || 'Usuário',
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
    moderatorEmail: string
  ): Promise<{ success: boolean; error: string | null; moderator?: StreamModerator }> {
    try {
      // Buscar usuário pelo email
      const user = await this.findUserByEmail(moderatorEmail);
      
      if (!user) {
        return { success: false, error: 'Usuário não encontrado com este email' };
      }

      // Verificar se já é moderador
      const { data: existing } = await supabase
        .from('stream_moderators')
        .select('id')
        .eq('streamer_id', streamerId)
        .eq('moderator_id', user.id)
        .single();

      if (existing) {
        return { success: false, error: 'Este usuário já é moderador' };
      }

      // Adicionar moderador
      const { data, error } = await supabase
        .from('stream_moderators')
        .insert({
          streamer_id: streamerId,
          moderator_id: user.id,
          added_by: streamerId
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar moderador:', error);
        return { success: false, error: 'Erro ao adicionar moderador' };
      }

      return {
        success: true,
        error: null,
        moderator: {
          ...data,
          moderator_email: user.email,
          moderator_name: user.name,
          moderator_avatar: user.avatar
        }
      };
    } catch (err) {
      console.error('Erro ao adicionar moderador:', err);
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
      const { error } = await supabase
        .from('stream_moderators')
        .delete()
        .eq('streamer_id', streamerId)
        .eq('moderator_id', moderatorId);

      if (error) {
        console.error('Erro ao remover moderador:', error);
        return { success: false, error: 'Erro ao remover moderador' };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Erro ao remover moderador:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  },

  /**
   * Listar moderadores de um streamer
   */
  async getModerators(streamerId: string): Promise<StreamModerator[]> {
    try {
      const { data, error } = await supabase
        .from('stream_moderators')
        .select(`
          id,
          streamer_id,
          moderator_id,
          added_at,
          added_by
        `)
        .eq('streamer_id', streamerId)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar moderadores:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Buscar informações dos moderadores
      const moderatorIds = data.map(m => m.moderator_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url, email')
        .in('user_id', moderatorIds);

      const profileMap = new Map(
        profiles?.map(p => [p.user_id, p]) || []
      );

      return data.map(mod => ({
        ...mod,
        moderator_email: profileMap.get(mod.moderator_id)?.email || '',
        moderator_name: profileMap.get(mod.moderator_id)?.full_name || 'Usuário',
        moderator_avatar: profileMap.get(mod.moderator_id)?.avatar_url || null
      }));
    } catch (err) {
      console.error('Erro ao buscar moderadores:', err);
      return [];
    }
  },

  /**
   * Verificar se usuário é moderador
   */
  async isModerator(streamerId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('stream_moderators')
        .select('id')
        .eq('streamer_id', streamerId)
        .eq('moderator_id', userId)
        .single();

      return !error && !!data;
    } catch (err) {
      return false;
    }
  },

  /**
   * Obter configurações de links
   */
  async getLinkSettings(streamId: string): Promise<{ linksAllowed: boolean; linksModeratorOnly: boolean }> {
    try {
      const { data } = await supabase
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
      const { error } = await supabase
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

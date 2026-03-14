import { supabase } from '@/lib/supabase';

export interface AddedViewers {
  id: string;
  stream_id: string;
  added_count: number;
  created_at: string;
  updated_at: string;
}

export const addedViewersService = {
  /**
   * Obter número de viewers adicionados para uma stream
   */
  async getAddedViewers(streamId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('stream_added_viewers')
        .select('added_count')
        .eq('stream_id', streamId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar viewers adicionados:', error);
        return 0;
      }

      return data?.added_count || 0;
    } catch (err) {
      console.error('Erro ao buscar viewers adicionados:', err);
      return 0;
    }
  },

  /**
   * Definir número de viewers adicionados
   */
  async setAddedViewers(streamId: string, count: number): Promise<{ success: boolean; error: string | null }> {
    try {
      // Garantir que o count seja um número válido não negativo
      const validCount = Math.max(0, Math.floor(count));

      // Verificar se já existe registro
      const { data: existing } = await supabase
        .from('stream_added_viewers')
        .select('id')
        .eq('stream_id', streamId)
        .single();

      if (existing) {
        // Atualizar
        const { error } = await supabase
          .from('stream_added_viewers')
          .update({
            added_count: validCount,
            updated_at: new Date().toISOString()
          })
          .eq('stream_id', streamId);

        if (error) {
          console.error('Erro ao atualizar viewers adicionados:', error);
          return { success: false, error: error.message };
        }
      } else {
        // Inserir
        const { error } = await supabase
          .from('stream_added_viewers')
          .insert({
            stream_id: streamId,
            added_count: validCount
          });

        if (error) {
          console.error('Erro ao inserir viewers adicionados:', error);
          return { success: false, error: error.message };
        }
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Erro ao definir viewers adicionados:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  },

  /**
   * Remover viewers adicionados
   */
  async removeAddedViewers(streamId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('stream_added_viewers')
        .delete()
        .eq('stream_id', streamId);

      if (error) {
        console.error('Erro ao remover viewers adicionados:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Erro ao remover viewers adicionados:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  },

  /**
   * Obter contagem total de viewers (reais + adicionados)
   */
  async getTotalViewerCount(streamId: string, realViewers: number): Promise<{ total: number; added: number; real: number }> {
    const addedCount = await this.getAddedViewers(streamId);
    return {
      total: realViewers + addedCount,
      added: addedCount,
      real: realViewers
    };
  }
};

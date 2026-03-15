import { supabase } from '@/lib/supabase';

/**
 * Verifica se as tabelas necessárias para o live streaming existem no Supabase
 * Retorna true se todas as tabelas existirem, false caso contrário
 */
export async function checkLiveStreamTables(): Promise<boolean> {
  try {
    console.log('Verificando tabelas de live streaming...');
    
    // Verificar se a tabela live_streams existe
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: liveStreamsData, error: liveStreamsError } = await (supabase as any)
      .from('live_streams')
      .select('id')
      .limit(1);
    
    // Verificar se a tabela stream_comments existe
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: commentsData, error: commentsError } = await (supabase as any)
      .from('stream_comments')
      .select('id')
      .limit(1);
    
    // Verificar se a tabela stream_permissions existe
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: permissionsData, error: permissionsError } = await (supabase as any)
      .from('stream_permissions')
      .select('id')
      .limit(1);
    
    // Verificar se a tabela stream_viewers existe
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: viewersData, error: viewersError } = await (supabase as any)
      .from('stream_viewers')
      .select('id')
      .limit(1);
    
    // Se alguma tabela não existir ou retornar erro, retornar false
    if (
      liveStreamsError?.message?.includes('does not exist') ||
      commentsError?.message?.includes('does not exist') ||
      permissionsError?.message?.includes('does not exist') ||
      viewersError?.message?.includes('does not exist')
    ) {
      console.log('Algumas tabelas de live streaming não existem:', {
        liveStreamsError: liveStreamsError?.message,
        commentsError: commentsError?.message, 
        permissionsError: permissionsError?.message,
        viewersError: viewersError?.message
      });
      return false;
    }
    
    console.log('Todas as tabelas de live streaming existem!');
    return true;
  } catch (error) {
    console.error('Erro ao verificar tabelas de live streaming:', error);
    return false;
  }
} 
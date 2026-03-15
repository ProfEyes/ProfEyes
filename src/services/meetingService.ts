import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { MeetingData } from '@/types/meeting';

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meetingUrl: string;
  createdBy: string;
  createdAt: string;
  status: 'active' | 'ended';
  participants: number;
  endedAt?: string | null;
}

// Interface para os dados que vêm diretamente do banco
interface MeetingDB {
  id: string;
  title: string;
  description: string | null;
  meeting_url: string;
  created_by: string;
  created_at: string;
  status: string;
  participants: number;
  ended_at?: string | null;
}

// Converter do formato DB para o formato da interface
const convertMeetingFromDB = (meeting: MeetingDB): Meeting => ({
  id: meeting.id,
  title: meeting.title,
  description: meeting.description,
  meetingUrl: meeting.meeting_url,
  createdBy: meeting.created_by,
  createdAt: meeting.created_at,
  status: meeting.status as 'active' | 'ended',
  participants: meeting.participants,
  endedAt: meeting.ended_at
});

/**
 * Obter todas as reuniões ativas
 */
export const getActiveMeetings = async (): Promise<Meeting[]> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('meetings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((meeting: any) => convertMeetingFromDB(meeting as MeetingDB));
  } catch (error: unknown) {
    console.error('Erro ao buscar reuniões ativas:', error);
    throw error;
  }
};

/**
 * Obter detalhes de uma reunião específica
 */
export const getMeetingById = async (meetingId: string): Promise<Meeting | null> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();
    
    if (error) throw error;
    
    return data ? convertMeetingFromDB(data as MeetingDB) : null;
  } catch (error: unknown) {
    console.error(`Erro ao buscar reunião ${meetingId}:`, error);
    throw error;
  }
};

/**
 * Criar uma nova reunião
 */
export const createMeeting = async (
  userId: string,
  meetingData: {
    title: string;
    description?: string;
    meetingUrl: string;
  }
): Promise<Meeting> => {
  try {
    // Validar dados
    if (!meetingData.title) {
      throw new Error('O título da reunião é obrigatório');
    }
    
    if (!meetingData.meetingUrl) {
      throw new Error('A URL da reunião é obrigatória');
    }
    
    // Gerar ID único para a reunião
    const meetingId = `m-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Criar a reunião no banco de dados
    const meetingRecord = {
      id: meetingId,
      title: meetingData.title,
      description: meetingData.description || null,
      meeting_url: meetingData.meetingUrl,
      created_by: userId,
      created_at: new Date().toISOString(),
      status: 'active',
      participants: 0
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('meetings')
      .insert([meetingRecord])
      .select()
      .single();
    
    if (error) throw error;
    
    return convertMeetingFromDB(data as MeetingDB);
  } catch (error: unknown) {
    console.error('Erro ao criar reunião:', error);
    throw error;
  }
};

/**
 * Finalizar uma reunião
 */
export const endMeeting = async (meetingId: string, userId: string): Promise<boolean> => {
  try {
    // Verificar se a reunião existe e pertence ao usuário
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: meeting, error: fetchError } = await (supabase as any).from('meetings')
      .select('created_by')
      .eq('id', meetingId)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (!meeting) {
      throw new Error('Reunião não encontrada');
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((meeting as any).created_by !== userId) {
      throw new Error('Você não tem permissão para finalizar esta reunião');
    }
    
    // Atualizar o status da reunião
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('meetings')
      .update({
        status: 'deleted',
        ended_at: new Date().toISOString()
      })
      .eq('id', meetingId);
    
    if (error) throw error;
    
    return true;
  } catch (error: unknown) {
    console.error('Erro ao finalizar reunião:', error);
    throw error;
  }
};

/**
 * Atualizar o contador de participantes
 */
export const updateParticipantsCount = async (
  meetingId: string,
  increment: boolean = true
): Promise<number> => {
  try {
    // Primeiro, obter o contador atual
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: meeting, error: fetchError } = await (supabase as any).from('meetings')
      .select('participants')
      .eq('id', meetingId)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (!meeting) {
      throw new Error('Reunião não encontrada');
    }
    
    // Calcular o novo valor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentCount = (meeting as any).participants || 0;
    const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);
    
    // Atualizar o contador
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('meetings')
      .update({ participants: newCount })
      .eq('id', meetingId);
    
    if (error) throw error;
    
    return newCount;
  } catch (error: unknown) {
    console.error(`Erro ao ${increment ? 'incrementar' : 'decrementar'} contador de participantes:`, error);
    throw error;
  }
};

/**
 * Configurar listener para mudanças em reuniões
 */
export const subscribeToMeetingsChanges = (
  callback: (newMeetings: Meeting[]) => void
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = (supabase as any)
    .channel('meetings-changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'meetings' 
    }, async () => {
      // Quando qualquer mudança acontecer, buscar a lista atualizada
      try {
        const meetings = await getActiveMeetings();
        callback(meetings);
      } catch (error) {
        console.error('Erro ao atualizar reuniões após mudança:', error);
      }
    })
    .subscribe();
  
  // Retornar função para desinscrever
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return () => (supabase as any).removeChannel(subscription);
};

/**
 * Serviço para gerenciar reuniões e transmissões ao vivo
 */
export const meetingService = {
  /**
   * Busca todas as reuniões/transmissões ao vivo disponíveis
   * @returns Promise<MeetingData[]> Lista de reuniões
   */
  fetchLiveMeetings: async (): Promise<MeetingData[]> => {
    try {
      // Simulação de chamada API - substituir por chamada real posteriormente
      // Aqui podemos implementar a chamada real para a API quando estiver disponível
      
      // Simula um atraso de rede
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // No futuro, isso seria: return await api.get('/meetings/live');
      return [];
    } catch (error) {
      console.error('Erro ao buscar reuniões:', error);
      throw error;
    }
  },
  
  /**
   * Cria uma nova reunião/transmissão ao vivo
   * @param meetingData Dados da reunião a ser criada
   * @returns Promise<MeetingData> Dados da reunião criada
   */
  createMeeting: async (meetingData: Partial<MeetingData>): Promise<MeetingData> => {
    try {
      // Simulação de chamada API - substituir por chamada real posteriormente
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const newMeeting: MeetingData = {
        id: `meeting_${Date.now()}`,
        title: meetingData.title || 'Nova reunião',
        description: meetingData.description || '',
        startDate: meetingData.startDate || new Date().toISOString(),
        endDate: meetingData.endDate,
        status: meetingData.status || 'agendada',
        thumbnailUrl: meetingData.thumbnailUrl || '/images/meeting-placeholder.jpg',
        hostName: meetingData.hostName || 'Dr. Anônimo',
        participantCount: 0,
        streamUrl: '',
        ...meetingData,
      };
      
      // No futuro, isso seria: return await api.post('/meetings', meetingData);
      return newMeeting;
    } catch (error) {
      console.error('Erro ao criar reunião:', error);
      throw error;
    }
  },
  
  /**
   * Inicia uma transmissão ao vivo
   * @param meetingId ID da reunião a ser iniciada
   * @returns Promise<MeetingData> Dados atualizados da reunião
   */
  startLiveStream: async (meetingId: string): Promise<MeetingData> => {
    try {
      // Simulação de chamada API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // No futuro, isso seria: return await api.put(`/meetings/${meetingId}/start`);
      return {
        id: meetingId,
        title: 'Transmissão iniciada',
        description: 'Esta transmissão está agora ao vivo',
        startDate: new Date().toISOString(),
        status: 'ao vivo',
        thumbnailUrl: '/images/meeting-placeholder.jpg',
        hostName: 'Dr. Silva',
        participantCount: 0,
        streamUrl: 'https://example.com/stream',
      };
    } catch (error) {
      console.error('Erro ao iniciar transmissão:', error);
      throw error;
    }
  },
};

export default meetingService; 
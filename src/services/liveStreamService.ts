import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { useNotifications } from '@/contexts/NotificationContext';
import { PeerPublisher, PeerViewer, PeerConnectionStatus } from './webrtc/peerService';

export interface StreamUser {
  id: string;
  name: string;
  avatar: string;
  canStream: boolean;
}

export interface LiveStream {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  streamerName: string;
  streamerAvatar: string;
  streamerId: string;
  viewerCount: number;
  startedAt: Date;
  tags: string[];
  isPremium: boolean;
  rtmpUrl?: string;
  playbackId?: string;
  status: 'live' | 'ended' | 'scheduled';
  language: string;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  themeColor?: string;
}

export interface StreamComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  message: string;
  timestamp: Date;
  isStreamer: boolean;
  likes: number;
}

export interface CommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
}

// Opções para filtros de streams
export interface StreamFilters {
  languages?: string[];
  categories?: string[];
  levels?: ('beginner' | 'intermediate' | 'advanced')[];
  isPremium?: boolean;
  searchQuery?: string;
}

// Checa se o usuário atual tem permissão para transmitir
export const checkStreamPermission = async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  
  try {
    // Para fins de teste, permitir que qualquer usuário logado inicie transmissão
    const allowAllUsers = true; // Defina como false para usar apenas a lista de administradores
    
    if (allowAllUsers) {
      console.log(`Permitindo usuário ${userId} iniciar transmissão (modo de teste)`);
      return true;
    }
    
    // Verificar se o usuário é um administrador pelo ID
    const ADMIN_USER_IDS = [
      'f9f4c3bb-8a6a-494e-aae2-8eeca8a3d85b',
      // Adicione aqui o ID do seu usuário para garantir acesso
    ];
    
    // Se o usuário for admin, permitir acesso direto
    if (ADMIN_USER_IDS.includes(userId)) {
      console.log(`Usuário ${userId} é administrador, permissão concedida automaticamente`);
      return true;
    }
    
    // Verificar no Supabase se o usuário tem permissão
    const { data, error } = await (supabase as SupabaseClient<Database>).from('stream_permissions')
      .select('can_create')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Erro ao verificar permissão de transmissão:', error);
      return false;
    }
    
    return data?.can_create || false;
  } catch (error) {
    console.error('Erro ao verificar permissão de transmissão:', error);
    return false;
  }
};

// Configurar permissão de streaming para um usuário específico por email
export const grantStreamPermission = async (email: string): Promise<boolean> => {
  try {
    // Buscar o usuário pelo email
    const { data: userData, error: userError } = await (supabase as SupabaseClient<Database>).from('profiles')
      .select('id')
      .eq('email', email)
      .single();
    
    if (userError || !userData) {
      console.error('Usuário não encontrado:', email);
      return false;
    }
    
    const userId = userData.id;
    
    // Verificar se já existe uma entrada para este usuário
    const { data: existingPermission } = await (supabase as SupabaseClient<Database>).from('stream_permissions')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (existingPermission) {
      // Atualizar permissão existente
      const { error } = await (supabase as SupabaseClient<Database>).from('stream_permissions')
        .update({ can_create: true })
        .eq('user_id', userId);
      
      if (error) {
        console.error('Erro ao atualizar permissão:', error);
        return false;
      }
    } else {
      // Criar nova permissão
      const { error } = await (supabase as SupabaseClient<Database>).from('stream_permissions')
        .insert([{ user_id: userId, can_create: true }]);
      
      if (error) {
        console.error('Erro ao criar permissão:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao conceder permissão de streaming:', error);
    return false;
  }
};

// Idiomas disponíveis para as transmissões
export const availableLanguages = [
  { id: 'pt', name: 'Português', flag: '🇧🇷' },
  { id: 'en', name: 'Inglês', flag: '🇺🇸' },
  { id: 'es', name: 'Espanhol', flag: '🇪🇸' },
];

// Categorias disponíveis para as transmissões
export const availableCategories = [
  { id: 'technical', name: 'Análise Técnica', icon: '📊' },
  { id: 'fundamental', name: 'Análise Fundamentalista', icon: '📈' },
  { id: 'crypto', name: 'Criptomoedas', icon: '₿' },
  { id: 'forex', name: 'Forex', icon: '💱' },
  { id: 'stocks', name: 'Ações', icon: '📉' },
  { id: 'education', name: 'Educacional', icon: '🎓' },
  { id: 'news', name: 'Notícias', icon: '📰' },
  { id: 'discussion', name: 'Discussão', icon: '💬' },
];

// Obter transmissões ativas
export const getActiveStreams = async (filters?: StreamFilters): Promise<LiveStream[]> => {
  try {
    // Preparar a consulta base
    let query = (supabase as SupabaseClient<Database>)
      .from('live_streams')
      .select('*')
      .eq('status', 'live')
      .order('viewer_count', { ascending: false });
    
    // Aplicar filtros se fornecidos
    if (filters) {
      // Filtrar por idioma
      if (filters.languages && filters.languages.length > 0) {
        query = query.in('language', filters.languages);
      }
      
      // Filtrar por categoria
      if (filters.categories && filters.categories.length > 0 && !filters.categories.includes('todas')) {
        query = query.in('category', filters.categories);
      }
      
      // Filtrar por nível
      if (filters.levels && filters.levels.length > 0) {
        query = query.in('level', filters.levels);
      }
      
      // Filtrar por busca de texto
      if (filters.searchQuery) {
        const searchTerm = filters.searchQuery.toLowerCase();
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,streamer_name.ilike.%${searchTerm}%`);
      }
    }
    
    // Executar a consulta
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar transmissões:', error);
      return [];
    }
    
    // Mapear os resultados para o formato LiveStream
    return data.map(stream => ({
        id: stream.id,
        title: stream.title,
        description: stream.description,
      thumbnail: stream.thumbnail,
      streamerName: stream.streamer_name,
      streamerAvatar: stream.streamer_avatar,
      streamerId: stream.streamer_id,
      viewerCount: stream.viewer_count,
        startedAt: new Date(stream.started_at),
        tags: stream.tags || [],
      isPremium: stream.is_premium,
      rtmpUrl: stream.rtmp_url,
      playbackId: stream.playback_id,
        status: stream.status,
      language: stream.language,
        category: stream.category,
        level: stream.level,
      themeColor: stream.theme_color
    }));
  } catch (error) {
    console.error('Erro ao buscar transmissões:', error);
    return [];
  }
};

// Iniciar transmissão
export const startLiveStream = async (
  userId: string, 
  streamData: { 
    title: string; 
    description: string; 
    tags?: string[]; 
    isPremium?: boolean;
    language?: string;
    category: string;
    level?: 'beginner' | 'intermediate' | 'advanced';
    themeColor?: string;
    withoutMedia?: boolean;
    thumbnail?: string;
  }
): Promise<{ success: boolean; stream?: LiveStream; error?: string }> => {
  try {
    // Verificar se o usuário tem permissão para transmitir
    const hasPermission = await checkStreamPermission(userId);
    
    if (!hasPermission) {
      return {
        success: false,
        error: 'Você não tem permissão para iniciar transmissões ao vivo'
      };
    }
    
    // Verificar se a categoria foi fornecida
    if (!streamData.category) {
      return {
        success: false,
        error: 'A categoria é obrigatória'
      };
    }
    
    // Buscar dados do perfil do usuário
    const { data: userData, error: userError } = await (supabase as SupabaseClient<Database>).from('profiles')
      .select('full_name, avatar_url')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Erro ao buscar dados do usuário:', userError);
      return {
        success: false,
        error: 'Erro ao buscar dados do perfil do usuário'
      };
    }
    
    // Processar tags se vier como string
    let processedTags = streamData.tags || [];
    if (typeof processedTags === 'string') {
      processedTags = (processedTags as string)
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    }
    
    // Gerar chave de stream única
    const streamKey = `${userId}-${Date.now()}`;
    
    // Configurar URL do servidor RTMP para streaming (em produção, isso seria um serviço real)
    const rtmpUrl = streamData.withoutMedia 
      ? `screen:${userId}-${Date.now()}` // Formato especial para compartilhamento de tela
      : `rtmp://live.example.com/live/${streamKey}`;
    
    // Adicionar flag para transmissões sem mídia
    const streamType = streamData.withoutMedia ? 'screen_share' : 'webcam';
    
    // Buscar o display_name do usuário para usar como username
    let username = 'Usuário';
    try {
      const { data: profile } = await (supabase as SupabaseClient<Database>).from('user_profiles')
        .select('display_name')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (profile?.display_name) {
        username = profile.display_name;
      } else if (userData.full_name) {
        username = userData.full_name;
      }
    } catch (profileError) {
      console.warn('Não foi possível buscar display_name, usando nome do perfil como fallback');
      if (userData.full_name) {
        username = userData.full_name;
      }
    }
    
    // Inserir registro da transmissão no banco de dados
    const { data, error } = await (supabase as SupabaseClient<Database>).from('live_streams')
      .insert([
        {
          title: streamData.title,
          description: streamData.description,
          user_id: userId,
          username: username,
          stream_key: streamKey,
          stream_url: rtmpUrl,
          status: 'scheduled',
          started_at: null,
          tags: processedTags,
          language: streamData.language || 'pt',
          category: streamData.category,
          viewers_count: 0,
          thumbnail_url: streamData.thumbnail || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar transmissão:', error);
      return {
        success: false,
        error: 'Erro ao criar transmissão: ' + error.message
      };
    }
    
    // Iniciar a transmissão (atualizar status para 'live')
    const { error: startError } = await (supabase as SupabaseClient<Database>).from('live_streams')
      .update({ 
        status: 'live',
        started_at: new Date().toISOString()
      })
      .eq('id', data.id);
    
    if (startError) {
      console.error('Erro ao iniciar transmissão:', startError);
      return {
        success: false,
        error: 'Erro ao iniciar transmissão: ' + startError.message
      };
    }
    
    // Criar objeto formatado para retorno
    const streamObject: LiveStream = {
      id: data.id,
      title: data.title,
      description: data.description,
      thumbnail: data.thumbnail_url,
      streamerName: userData.full_name || 'Usuário',
      streamerAvatar: userData.avatar_url || '',
      streamerId: userId,
      viewerCount: 0,
      startedAt: new Date(),
      tags: processedTags,
      isPremium: false,
      rtmpUrl: rtmpUrl,
      playbackId: streamKey,
      status: 'live',
      language: data.language || 'pt',
      category: data.category,
      level: data.level as any,
      themeColor: streamData.themeColor
    };
    
    return {
      success: true,
      stream: streamObject
    };
  } catch (error: unknown) {
    console.error('Erro ao iniciar transmissão:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao iniciar transmissão'
    };
  }
};

// Finalizar uma transmissão ao vivo
export const endLiveStream = async (streamId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Verificar se o usuário é o dono da transmissão
    const { data: streamData, error: streamError } = await (supabase as SupabaseClient<Database>).from('live_streams')
      .select('user_id')
      .eq('id', streamId)
      .single();
    
    if (streamError) {
      console.error('Erro ao verificar propriedade da transmissão:', streamError);
      return {
        success: false,
        error: 'Erro ao verificar propriedade da transmissão'
      };
    }
    
    if (streamData.user_id !== userId) {
      return {
        success: false,
        error: 'Você não tem permissão para encerrar esta transmissão'
      };
    }
    
    // Atualizar status da transmissão
    const { error } = await (supabase as SupabaseClient<Database>).from('live_streams')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', streamId);
    
    if (error) {
      console.error('Erro ao encerrar transmissão:', error);
      return {
        success: false,
        error: 'Erro ao encerrar transmissão no banco de dados'
      };
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Erro ao encerrar transmissão:', error);
    return {
      success: false,
      error: 'Ocorreu um erro inesperado ao encerrar a transmissão'
    };
  }
};

// Enviar um comentário para uma transmissão
export const sendStreamComment = async (
  streamId: string,
  userId: string,
  userName: string,
  userAvatar: string,
  message: string,
  isStreamer: boolean = false
): Promise<{ success: boolean; comment?: StreamComment; error?: string }> => {
  try {
    // Obter o avatar atual do usuário
    const currentAvatar = await getUserAvatar(userId);
    
    const comment: StreamComment = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userName,
      userAvatar: currentAvatar || userAvatar, // Usar o avatar atual se disponível
      message,
      timestamp: new Date(),
      isStreamer,
      likes: 0
    };
    
    const { error } = await (supabase as SupabaseClient<Database>).from('stream_comments')
      .insert([{
          stream_id: streamId,
          user_id: userId,
        user_name: userName,
        user_avatar: currentAvatar || userAvatar,
        message,
        is_streamer: isStreamer
      }]);
    
    if (error) {
      console.error('Erro ao enviar comentário:', error);
      return { success: false, error: 'Erro ao enviar comentário' };
    }
    
    return { success: true, comment };
  } catch (error) {
    console.error('Erro ao enviar comentário:', error);
    return { success: false, error: 'Erro ao enviar comentário' };
  }
};

// Obter comentários de uma transmissão
export const getStreamComments = async (streamId: string): Promise<StreamComment[]> => {
  try {
    // Buscar os comentários com contagem de likes
    const { data, error } = await (supabase as SupabaseClient<Database>).from('stream_comments')
      .select(`
        id,
        user_id,
        user_name,
        content,
        created_at
      `)
      .eq('stream_id', streamId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erro ao buscar comentários:', error);
      return [];
    }
    
    // Buscando avatares dos usuários
    const userIds = [...new Set(data.map(comment => comment.user_id))];
    const { data: userProfiles, error: userError } = await (supabase as SupabaseClient<Database>).from('profiles')
      .select('id, avatar_url')
      .in('id', userIds);
    
    if (userError) {
      console.error('Erro ao buscar perfis de usuário:', userError);
    }
    
    const userAvatars = userProfiles?.reduce((acc, profile) => {
      acc[profile.id] = profile.avatar_url;
      return acc;
    }, {}) || {};
    
    // Verificar se a transmissão existe para determinar o streamerId
    const { data: streamData, error: streamError } = await (supabase as SupabaseClient<Database>).from('live_streams')
      .select('user_id')
      .eq('id', streamId)
      .single();
    
    const streamerId = streamError ? null : streamData?.user_id;
    
    // Buscar contagem de likes para cada comentário
    const likesCount = {};
    for (const comment of data) {
      // Para cada comentário, buscar a contagem de likes individualmente
      const { count, error: countError } = await (supabase as SupabaseClient<Database>).from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', comment.id);
      
      if (countError) {
        console.error(`Erro ao buscar likes para comentário ${comment.id}:`, countError);
        likesCount[comment.id] = 0;
      } else {
        likesCount[comment.id] = count || 0;
      }
    }
    
    // Construir e retornar os comentários com todos os dados
    return data.map(comment => ({
      id: comment.id,
      userId: comment.user_id,
      userName: comment.user_name,
      userAvatar: userAvatars[comment.user_id] || '/assets/default-avatar.png',
      message: comment.content,
      timestamp: new Date(comment.created_at),
      isStreamer: comment.user_id === streamerId,
      likes: likesCount[comment.id] || 0,
    }));
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    return [];
  }
};

// Verificar se um usuário já curtiu um comentário
export const hasUserLikedComment = async (commentId: string, userId: string): Promise<boolean> => {
  try {
    const { data, error } = await (supabase as SupabaseClient<Database>).from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Erro ao verificar curtida:', error);
      return false;
    }
    
    return data.length > 0;
  } catch (error) {
    console.error('Erro ao verificar curtida:', error);
    return false;
  }
};

// Curtir um comentário (com verificação para permitir apenas um like por usuário)
export const likeStreamComment = async (commentId: string, userId: string): Promise<boolean> => {
  try {
    // Verificar se o usuário já curtiu este comentário
    const alreadyLiked = await hasUserLikedComment(commentId, userId);
    
    if (alreadyLiked) {
      // Se já curtiu, remover a curtida (toggle)
      const { error } = await (supabase as SupabaseClient<Database>).from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Erro ao remover curtida:', error);
        return false;
      }
      
      return false; // Retorna false para indicar que a curtida foi removida
    } else {
      // Se não curtiu, adicionar curtida
      const { error } = await (supabase as SupabaseClient<Database>).from('comment_likes')
        .insert([{ comment_id: commentId, user_id: userId }]);
      
      if (error) {
        console.error('Erro ao adicionar curtida:', error);
        return false;
      }
      
      return true; // Retorna true para indicar que a curtida foi adicionada
    }
  } catch (error) {
    console.error('Erro ao curtir comentário:', error);
    return false;
  }
};

// Incrementar contador de visualizações
export const incrementViewerCount = async (streamId: string): Promise<boolean> => {
  try {
    await (supabase as SupabaseClient<Database>).rpc('increment_viewer_count', { stream_id: streamId });
    return true;
  } catch (error) {
    console.error('Erro ao incrementar contador de visualizações:', error);
    return false;
  }
};

// Decrementar contador de visualizações
export const decrementViewerCount = async (streamId: string): Promise<boolean> => {
  try {
    await (supabase as SupabaseClient<Database>).rpc('decrement_viewer_count', { stream_id: streamId });
    return true;
  } catch (error) {
    console.error('Erro ao decrementar contador de visualizações:', error);
    return false;
  }
};

// Configurar notificações para novas transmissões
export const setupStreamNotifications = () => {
  const channel = (supabase as SupabaseClient<Database>)
    .channel('public:live_streams')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'live_streams',
      filter: 'status=eq.live'
    }, payload => {
      // Emitir evento personalizado para notificação
      const event = new CustomEvent('new-live-stream', { detail: payload.new });
      window.dispatchEvent(event);
    })
    .subscribe();
  
  return () => {
    (supabase as SupabaseClient<Database>).removeChannel(channel);
  };
};

// Escutar por novos comentários em uma transmissão
export const listenForComments = (streamId: string, callback: (comment: StreamComment) => void) => {
  const channel = (supabase as SupabaseClient<Database>)
    .channel(`comments-${streamId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'stream_comments',
      filter: `stream_id=eq.${streamId}`
    }, async payload => {
      const newComment = payload.new;
      
      // Buscar avatar do usuário
      const { data: userData, error: userError } = await (supabase as SupabaseClient<Database>).from('profiles')
        .select('avatar_url')
        .eq('id', newComment.user_id)
        .single();
      
      // Verificar se o usuário é o streamer
      const { data: streamData, error: streamError } = await (supabase as SupabaseClient<Database>).from('live_streams')
        .select('user_id')
        .eq('id', streamId)
        .single();
      
      const comment: StreamComment = {
        id: newComment.id,
        userId: newComment.user_id,
        userName: newComment.user_name,
        userAvatar: userData?.avatar_url || '/assets/default-avatar.png',
        message: newComment.content,
        timestamp: new Date(newComment.created_at),
        isStreamer: streamData?.user_id === newComment.user_id,
        likes: 0
      };
      
      callback(comment);
    })
    .subscribe();
  
  return () => {
    (supabase as SupabaseClient<Database>).removeChannel(channel);
  };
};

interface StreamingProvider {
  createStream: () => Promise<{ rtmpUrl: string; playbackId: string }>;
  getStreamStatus: (playbackId: string) => Promise<'live' | 'idle' | 'error'>;
  deleteStream: (playbackId: string) => Promise<boolean>;
}

export const streamingProvider: StreamingProvider = {
  createStream: async () => {
    // Simular criação de stream
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    return {
      rtmpUrl: `rtmp://live.example.com/live/${uniqueId}`,
      playbackId: `pb_${uniqueId}`
    };
  },
  
  getStreamStatus: async (playbackId: string) => {
    // Simular verificação de status
    return 'live';
  },
  
  deleteStream: async (playbackId: string) => {
    // Simular deleção de stream
    return true;
  }
};

/**
 * Interface para o estado do vídeo local e configurações de transmissão
 */
export interface VideoState {
  videoEnabled: boolean;
  audioEnabled: boolean;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
}

/**
 * Classe de serviço para gerenciar a transmissão via WebRTC
 */
export class WebRTCStreamingService {
  private publisher: PeerPublisher | null = null;
  private viewer: PeerViewer | null = null;
  private userId: string;
  private videoState: VideoState = {
    videoEnabled: true,
    audioEnabled: true,
    localStream: null,
    screenStream: null
  };

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Inicializa o stream local (câmera e microfone)
   */
  async initializeLocalStream(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      this.videoState.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Erro ao obter stream local:', error);
      return null;
    }
  }

  /**
   * Inicia a transmissão como streamer
   */
  async startPublishing(streamId: string, videoElement?: HTMLVideoElement): Promise<boolean> {
    if (!this.videoState.localStream) {
      const stream = await this.initializeLocalStream();
      if (!stream) return false;
    }

    try {
      const publisher = new PeerPublisher(this.userId, streamId);
      this.publisher = publisher;

      // Inicializar o publisher com o stream local
      const success = await publisher.initialize(this.videoState.localStream!);
      
      // Se fornecido um elemento de vídeo, mostrar o preview
      if (success && videoElement) {
        videoElement.srcObject = this.videoState.localStream;
        videoElement.play().catch(err => console.error('Erro ao reproduzir vídeo local:', err));
      }

      return success;
    } catch (error) {
      console.error('Erro ao iniciar publicação:', error);
      return false;
    }
  }

  /**
   * Inicia a visualização como espectador
   */
  async startViewing(streamId: string, videoElement: HTMLVideoElement): Promise<boolean> {
    try {
      // Criar nova instância de PeerViewer
      const viewer = new PeerViewer(this.userId, streamId, { current: videoElement });
      this.viewer = viewer;

      // Inicializar o viewer com o elemento de vídeo
      const success = await viewer.initialize();
      return success;
    } catch (error) {
      console.error('Erro ao iniciar visualização:', error);
      return false;
    }
  }

  /**
   * Para a transmissão ou visualização
   */
  async stop(): Promise<void> {
    try {
      // Parar publicação se estiver ativa
      if (this.publisher) {
        await this.publisher.stop();
        this.publisher = null;
      }

      // Parar visualização se estiver ativa
      if (this.viewer) {
        await this.viewer.stop();
        this.viewer = null;
      }

      // Liberar recursos de mídia local
      if (this.videoState.localStream) {
        this.videoState.localStream.getTracks().forEach(track => track.stop());
        this.videoState.localStream = null;
      }

      // Liberar recursos de compartilhamento de tela
      if (this.videoState.screenStream) {
        this.videoState.screenStream.getTracks().forEach(track => track.stop());
        this.videoState.screenStream = null;
      }
    } catch (error) {
      console.error('Erro ao parar serviço WebRTC:', error);
    }
  }

  /**
   * Alterna o estado do microfone
   */
  toggleMicrophone(): boolean {
    if (!this.videoState.localStream) return false;

    const audioTracks = this.videoState.localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    const newState = !this.videoState.audioEnabled;
    audioTracks.forEach(track => track.enabled = newState);
    this.videoState.audioEnabled = newState;
    
    return newState;
  }

  /**
   * Alterna o estado da câmera
   */
  toggleCamera(): boolean {
    if (!this.videoState.localStream) return false;

    const videoTracks = this.videoState.localStream.getVideoTracks();
    if (videoTracks.length === 0) return false;

    const newState = !this.videoState.videoEnabled;
    videoTracks.forEach(track => track.enabled = newState);
    this.videoState.videoEnabled = newState;
    
    return newState;
  }

  /**
   * Inicia compartilhamento de tela
   */
  async startScreenSharing(videoElement?: HTMLVideoElement): Promise<boolean> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      this.videoState.screenStream = screenStream;

      // Se for streamer, substituir o stream local pelo stream de tela no publisher
      if (this.publisher) {
        // TODO: Implementar troca de stream no PeerPublisher
      }

      // Se fornecido um elemento de vídeo, mostrar o preview
      if (videoElement) {
        videoElement.srcObject = screenStream;
        videoElement.play().catch(err => console.error('Erro ao reproduzir vídeo de tela:', err));
      }

      return true;
    } catch (error) {
      console.error('Erro ao iniciar compartilhamento de tela:', error);
      return false;
    }
  }

  /**
   * Para o compartilhamento de tela
   */
  stopScreenSharing(videoElement?: HTMLVideoElement): boolean {
    if (!this.videoState.screenStream) return false;

    // Parar todas as trilhas do stream de tela
    this.videoState.screenStream.getTracks().forEach(track => track.stop());
    this.videoState.screenStream = null;

    // Se for streamer, voltar para o stream local
    if (this.publisher) {
      // TODO: Implementar volta para o stream local no PeerPublisher
    }

    // Se fornecido um elemento de vídeo, voltar para o stream local
    if (videoElement && this.videoState.localStream) {
      videoElement.srcObject = this.videoState.localStream;
      videoElement.play().catch(err => console.error('Erro ao voltar para vídeo local:', err));
    }

    return true;
  }

  /**
   * Registra callback para mudanças de status
   */
  onConnectionStatusChange(callback: (status: PeerConnectionStatus) => void): void {
    if (this.publisher) {
      this.publisher.onStatusChange(callback);
    } else if (this.viewer) {
      this.viewer.onStatusChange(callback);
    }
  }

  /**
   * Registra callback para quando um espectador se conecta
   */
  onViewerConnected(callback: (viewerId: string) => void): void {
    if (this.publisher) {
      this.publisher.onViewerConnected(callback);
    }
  }

  /**
   * Registra callback para quando um espectador se desconecta
   */
  onViewerDisconnected(callback: (viewerId: string) => void): void {
    if (this.publisher) {
      this.publisher.onViewerDisconnected(callback);
    }
  }

  /**
   * Registra callback para quando um stream é adicionado (modo espectador)
   */
  onStreamAdded(callback: (stream: MediaStream) => void): void {
    if (this.viewer) {
      this.viewer.onStreamAdded(callback);
    }
  }

  /**
   * Registra callback para erros
   */
  onError(callback: (error: Error) => void): void {
    if (this.publisher) {
      this.publisher.onError(callback);
    } else if (this.viewer) {
      this.viewer.onError(callback);
    }
  }

  /**
   * Obtém o estado atual do vídeo
   */
  getVideoState(): VideoState {
    return { ...this.videoState };
  }

  /**
   * Obtém o número atual de espectadores (modo streamer)
   */
  getViewerCount(): number {
    if (this.publisher) {
      return this.publisher.getViewerCount();
    }
    return 0;
  }

  /**
   * Obtém o status atual da conexão
   */
  getConnectionStatus(): PeerConnectionStatus {
    if (this.publisher) {
      return this.publisher.getStatus();
    } else if (this.viewer) {
      return this.viewer.getStatus();
    }
    return 'disconnected';
  }
} 

// Função para atualizar o avatar do streamer
export const updateStreamerAvatar = async (streamId: string, newAvatar: string): Promise<boolean> => {
  try {

    const { data: stream } = await (supabase as SupabaseClient<Database>).from('live_streams')
      .select('streamer_id')
      .eq('id', streamId)
      .single();
      
    if (!stream) {
      console.error('Stream não encontrada');
      return false;
    }
    
    // Atualizar o avatar no perfil do usuário
    const { error: profileError } = await (supabase as SupabaseClient<Database>).from('user_profiles')
      .update({ avatar_url: newAvatar })
      .eq('user_id', stream.streamer_id);
      
    if (profileError) {
      console.error('Erro ao atualizar avatar no perfil:', profileError);
      return false;
    }
    
    // Atualizar o avatar na stream
    const { error: streamError } = await (supabase as SupabaseClient<Database>).from('live_streams')
      .update({ streamer_avatar: newAvatar })
      .eq('id', streamId);
      
    if (streamError) {
      console.error('Erro ao atualizar avatar na stream:', streamError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar avatar do streamer:', error);
    return false;
  }
};

// Função para atualizar o avatar do usuário nos comentários
export const updateUserAvatar = async (userId: string, newAvatar: string): Promise<boolean> => {
  try {

    // Atualizar o avatar no perfil do usuário
    const { error: profileError } = await (supabase as SupabaseClient<Database>).from('user_profiles')
      .update({ avatar_url: newAvatar })
      .eq('user_id', userId);
      
    if (profileError) {
      console.error('Erro ao atualizar avatar no perfil:', profileError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar avatar do usuário:', error);
    return false;
  }
};

// Função para obter o avatar atual do usuário
export const getUserAvatar = async (userId: string): Promise<string | null> => {
  try {

    const { data: profile } = await (supabase as SupabaseClient<Database>).from('user_profiles')
      .select('avatar_url')
      .eq('user_id', userId)
      .single();
      
    return profile?.avatar_url || null;
  } catch (error) {
    console.error('Erro ao obter avatar do usuário:', error);
    return null;
  }
}; 
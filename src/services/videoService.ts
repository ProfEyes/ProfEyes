import { getSupabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { Video, Short, LiveStream, VideoComment } from '@/types/video';
import { toast } from 'sonner';

// Verificar se o usuário está verificado (coluna correta: verified_email)
export const isUserVerified = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await (getSupabase() as SupabaseClient<Database>).from('user_profiles')
      .select('verified_email')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    
    return data?.verified_email === true;
  } catch (error) {
    console.error('Erro ao verificar status de verificação do usuário:', error);
    return false;
  }
};

// Obter todos os vídeos publicados
export const fetchVideos = async (filters?: {
  category?: string;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
}): Promise<Video[]> => {
  try {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;
    
    let query = (getSupabase() as SupabaseClient<Database>)
      .from('videos')
      .select('*')
      .eq('type', 'video')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (filters?.category && filters.category !== 'Todos') {
      query = query.eq('category', filters.category);
    }
    
    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }
    
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data as Video[];
  } catch (error) {
    console.error('Erro ao buscar vídeos:', error);
    return [];
  }
};

// Obter todos os shorts publicados
export const fetchShorts = async (page: number = 1, limit: number = 10): Promise<Short[]> => {
  try {
    const offset = (page - 1) * limit;
    
    const { data, error } = await (getSupabase() as SupabaseClient<Database>).from('videos')
      .select('*')
      .eq('type', 'short')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return data as Short[];
  } catch (error) {
    console.error('Erro ao buscar shorts:', error);
    return [];
  }
};

// Obter todas as transmissões ao vivo ativas
export const fetchLiveStreams = async (): Promise<LiveStream[]> => {
  try {
    const { data, error } = await (getSupabase() as SupabaseClient<Database>).from('live_streams')
      .select('*')
      .eq('status', 'live')
      .order('started_at', { ascending: false });
    
    if (error) throw error;
    
    return data as LiveStream[];
  } catch (error) {
    console.error('Erro ao buscar transmissões ao vivo:', error);
    return [];
  }
};

// Obter detalhes de um vídeo específico
export const fetchVideoById = async (id: string): Promise<Video | null> => {
  try {
    const { data, error } = await (getSupabase() as SupabaseClient<Database>).from('videos')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    
    if (!data) return null;
    
    // Incrementar visualizações
    await incrementVideoViews(id);
    
    return data as Video;
  } catch (error) {
    console.error('Erro ao buscar vídeo por ID:', error);
    return null;
  }
};

// Incrementar visualizações de um vídeo
const incrementVideoViews = async (videoId: string): Promise<void> => {
  try {
    const { error } = await (getSupabase() as SupabaseClient<Database>).rpc('increment_video_views', {
      video_id: videoId
    });
    
    if (error) throw error;
  } catch (error) {
    console.error('Erro ao incrementar visualizações do vídeo:', error);
  }
};

// Obter comentários de um vídeo
export const fetchVideoComments = async (videoId: string): Promise<VideoComment[]> => {
  try {
    const { data, error } = await (getSupabase() as SupabaseClient<Database>).from('video_comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data as VideoComment[];
  } catch (error) {
    console.error('Erro ao buscar comentários do vídeo:', error);
    return [];
  }
};

// Adicionar comentário em um vídeo
export const addVideoComment = async (
  videoId: string, 
  userId: string,
  username: string,
  content: string,
  parentId?: string
): Promise<VideoComment | null> => {
  try {
    const { data, error } = await (getSupabase() as SupabaseClient<Database>).from('video_comments')
      .insert({
        video_id: videoId,
        user_id: userId,
        username,
        content,
        parent_id: parentId,
        created_at: new Date().toISOString(),
        likes: 0,
        replies_count: 0,
        is_pinned: false
      })
      .select()
      .maybeSingle();
    
    if (error) throw error;
    
    // Incrementar contagem de comentários
    if (!parentId) {
      await (getSupabase() as SupabaseClient<Database>).from('videos')
        .update({ comments_count: (getSupabase() as SupabaseClient<Database>).rpc('increment', { row_id: videoId, table_name: 'videos', column_name: 'comments_count' }) })
        .eq('id', videoId);
    } else {
      await (getSupabase() as SupabaseClient<Database>).from('video_comments')
        .update({ replies_count: (getSupabase() as SupabaseClient<Database>).rpc('increment', { row_id: parentId, table_name: 'video_comments', column_name: 'replies_count' }) })
        .eq('id', parentId);
    }
    
    return data as VideoComment;
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    return null;
  }
};

// Upload de vídeo
export const uploadVideo = async (
  userId: string,
  file: File,
  metadata: {
    title: string;
    description: string;
    category: string;
    tags: string[];
    isShort: boolean;
    language: string;
    thumbnail?: File;
  }
): Promise<{ success: boolean; videoId?: string; error?: string }> => {
  try {
    // Verificar se o usuário está verificado
    const verified = await isUserVerified(userId);
    if (!verified) {
      return { 
        success: false, 
        error: 'Apenas usuários verificados podem fazer upload de vídeos' 
      };
    }

    // Validar tipo de arquivo de vídeo
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!validVideoTypes.includes(file.type)) {
      return { 
        success: false, 
        error: 'Formato de vídeo inválido. Formatos aceitos: MP4, WebM, Ogg' 
      };
    }

    // Gerar IDs únicos
    const videoId = crypto.randomUUID();
    const videoFileName = `${userId}/${videoId}-${file.name.replace(/\s+/g, '-')}`;

    // Upload do vídeo para o storage
    const { error: uploadError } = await (getSupabase() as SupabaseClient<Database>).storage
      .from('videos')
      .upload(videoFileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) throw uploadError;

    // Obter URL pública do vídeo
    const { data: videoUrl } = (getSupabase() as SupabaseClient<Database>).storage
      .from('videos')
      .getPublicUrl(videoFileName);

    // Upload da thumbnail
    let thumbnailUrl = '';
    if (metadata.thumbnail) {
      const thumbnailFileName = `${userId}/${videoId}-thumbnail.jpg`;
      const { error: thumbnailError } = await (getSupabase() as SupabaseClient<Database>).storage
        .from('thumbnails')
        .upload(thumbnailFileName, metadata.thumbnail, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        });
      
      if (thumbnailError) throw thumbnailError;
      
      const { data: thumbnail } = (getSupabase() as SupabaseClient<Database>).storage
        .from('thumbnails')
        .getPublicUrl(thumbnailFileName);
      
      thumbnailUrl = thumbnail.publicUrl;
    }

    // Obter informações do usuário
    const { data: userData } = await (getSupabase() as SupabaseClient<Database>).from('user_profiles')
      .select('display_name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();

    // Inserir metadados do vídeo no banco de dados
    const { data, error } = await (getSupabase() as SupabaseClient<Database>).from('videos')
      .insert({
        id: videoId,
        title: metadata.title,
        description: metadata.description,
        thumbnail: thumbnailUrl,
        video_url: videoUrl.publicUrl,
        user_id: userId,
        username: userData?.display_name || 'Usuário',
        avatar_url: userData?.avatar_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: metadata.tags,
        category: metadata.category,
        language: metadata.language,
        duration: 0, // Será atualizado após processamento
        views: 0,
        likes: 0,
        comments_count: 0,
        is_premium: false,
        status: 'processing',
        type: metadata.isShort ? 'short' : 'video',
        ...(metadata.isShort && { aspect_ratio: 'vertical' }),
        qualities: [{
          resolution: '720p',
          url: videoUrl.publicUrl
        }]
      })
      .select()
      .maybeSingle();
    
    if (error) throw error;

    // Simular processamento do vídeo
    setTimeout(async () => {
      await (getSupabase() as SupabaseClient<Database>).from('videos')
        .update({
          status: 'published',
          duration: metadata.isShort ? 30 : 180 // Valores simulados
        })
        .eq('id', videoId);
    }, 5000);

    return { 
      success: true, 
      videoId: data?.id
    };
  } catch (error: unknown) {
    console.error('Erro ao fazer upload de vídeo:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao fazer upload do vídeo'
    };
  }
}; 
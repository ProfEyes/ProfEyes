import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  fetchVideos, 
  fetchShorts, 
  fetchLiveStreams, 
  fetchVideoById, 
  fetchVideoComments,
  addVideoComment,
  uploadVideo,
  isUserVerified
} from '@/services/videoService';
import { Video, Short, LiveStream, VideoComment } from '@/types/video';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface VideoContextProps {
  videos: Video[];
  shorts: Short[];
  liveStreams: LiveStream[];
  currentVideo: Video | null;
  currentComments: VideoComment[];
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  isUserVerified: boolean;
  getVideos: (filters?: Record<string, unknown>) => Promise<void>;
  getShorts: (page?: number) => Promise<void>;
  getLiveStreams: () => Promise<void>;
  getVideoById: (id: string) => Promise<Video | null>;
  getVideoComments: (videoId: string) => Promise<void>;
  addComment: (videoId: string, content: string, parentId?: string) => Promise<boolean>;
  handleVideoUpload: (file: File, metadata: VideoMetadata) => Promise<boolean>;
  handleShortUpload: (file: File, metadata: VideoMetadata) => Promise<boolean>;
}

// Interface para metadados de vídeo
interface VideoMetadata {
  title: string;
  description: string;
  category: string;
  tags: string[];
  language: string;
  thumbnail?: File | string;
  [key: string]: unknown;
}

const VideoContext = createContext<VideoContextProps | undefined>(undefined);

export const VideoProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [currentComments, setCurrentComments] = useState<VideoComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userVerificationStatus, setUserVerificationStatus] = useState(false);

  // Verificar se o usuário é verificado
  useEffect(() => {
    if (user) {
      const checkVerification = async () => {
        const verified = await isUserVerified(user.id);
        setUserVerificationStatus(verified);
      };
      checkVerification();
    } else {
      setUserVerificationStatus(false);
    }
  }, [user]);

  // Buscar vídeos com filtros
  const getVideos = async (filters?: Record<string, unknown>) => {
    try {
      setIsLoading(true);
      const data = await fetchVideos(filters);
      setVideos(data);
    } catch (error) {
      console.error('Erro ao buscar vídeos:', error);
      toast.error('Não foi possível carregar os vídeos');
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar shorts
  const getShorts = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const data = await fetchShorts(page);
      if (page === 1) {
        setShorts(data);
      } else {
        setShorts(prevShorts => [...prevShorts, ...data]);
      }
    } catch (error) {
      console.error('Erro ao buscar shorts:', error);
      toast.error('Não foi possível carregar os shorts');
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar transmissões ao vivo
  const getLiveStreams = async () => {
    try {
      setIsLoading(true);
      const data = await fetchLiveStreams();
      setLiveStreams(data);
    } catch (error) {
      console.error('Erro ao buscar transmissões ao vivo:', error);
      toast.error('Não foi possível carregar as transmissões');
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar vídeo pelo ID
  const getVideoById = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await fetchVideoById(id);
      setCurrentVideo(data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar vídeo:', error);
      toast.error('Não foi possível carregar o vídeo');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar comentários de um vídeo
  const getVideoComments = async (videoId: string) => {
    try {
      setIsLoading(true);
      const data = await fetchVideoComments(videoId);
      setCurrentComments(data);
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      toast.error('Não foi possível carregar os comentários');
    } finally {
      setIsLoading(false);
    }
  };

  // Adicionar comentário a um vídeo
  const addComment = async (videoId: string, content: string, parentId?: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para comentar');
      return false;
    }

    try {
      const username = String(user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário');
      
      const result = await addVideoComment(
        videoId,
        user.id,
        username,
        content,
        parentId
      );
      
      if (result) {
        await getVideoComments(videoId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast.error('Não foi possível adicionar o comentário');
      return false;
    }
  };

  // Upload de vídeo
  const handleVideoUpload = async (file: File, metadata: VideoMetadata) => {
    if (!user) {
      toast.error('Você precisa estar logado para fazer upload');
      return false;
    }

    if (!userVerificationStatus) {
      toast.error('Apenas usuários verificados podem fazer upload de vídeos');
      return false;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const uploadMetadata = {
        title: metadata.title,
        description: metadata.description,
        category: metadata.category,
        tags: metadata.tags,
        language: metadata.language,
        isShort: false as const,
        ...(metadata.thumbnail instanceof File && { thumbnail: metadata.thumbnail })
      };
      const result = await uploadVideo(user.id, file, uploadMetadata);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        toast.success('Vídeo enviado com sucesso! Aguarde o processamento.');
        return true;
      } else {
        toast.error(result.error || 'Erro ao fazer upload do vídeo');
        return false;
      }
    } catch (error) {
      console.error('Erro ao fazer upload do vídeo:', error);
      toast.error('Erro ao enviar o vídeo');
      return false;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Upload de short
  const handleShortUpload = async (file: File, metadata: VideoMetadata) => {
    if (!user) {
      toast.error('Você precisa estar logado para fazer upload');
      return false;
    }

    if (!userVerificationStatus) {
      toast.error('Apenas usuários verificados podem fazer upload de shorts');
      return false;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const uploadMetadata = {
        title: metadata.title,
        description: metadata.description,
        category: metadata.category,
        tags: metadata.tags,
        language: metadata.language,
        isShort: true as const,
        ...(metadata.thumbnail instanceof File && { thumbnail: metadata.thumbnail })
      };
      const result = await uploadVideo(user.id, file, uploadMetadata);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        toast.success('Short enviado com sucesso! Aguarde o processamento.');
        return true;
      } else {
        toast.error(result.error || 'Erro ao fazer upload do short');
        return false;
      }
    } catch (error) {
      console.error('Erro ao fazer upload do short:', error);
      toast.error('Erro ao enviar o short');
      return false;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Carregar conteúdo inicial quando o contexto for montado
  useEffect(() => {
    if (user) {
      getVideos();
      getShorts();
      getLiveStreams();
    }
  }, [user]);

  const value = {
    videos,
    shorts,
    liveStreams,
    currentVideo,
    currentComments,
    isLoading,
    isUploading,
    uploadProgress,
    isUserVerified: userVerificationStatus,
    getVideos,
    getShorts,
    getLiveStreams,
    getVideoById,
    getVideoComments,
    addComment,
    handleVideoUpload,
    handleShortUpload
  };

  return (
    <VideoContext.Provider value={value}>
      {children}
    </VideoContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useVideo = () => {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error('useVideo deve ser usado dentro de um VideoProvider');
  }
  return context;
}; 
import { User } from './auth';

// Tipo base para todos os conteúdos de vídeo
export interface VideoBase {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  category: string;
  language: string;
  duration: number; // em segundos
  views: number;
  likes: number;
  comments_count: number;
  is_premium: boolean;
  status: 'processing' | 'published' | 'private' | 'unlisted';
}

// Interface para vídeos comuns (mais longos)
export interface Video extends VideoBase {
  video_url: string;
  type: 'video';
  qualities: VideoQuality[];
}

// Interface para shorts (vídeos curtos verticais)
export interface Short extends VideoBase {
  video_url: string;
  type: 'short';
  aspect_ratio: 'vertical'; // Shorts são sempre verticais (9:16)
}

// Interface para transmissões ao vivo
export interface LiveStream extends Omit<VideoBase, 'status'> {
  stream_key: string;
  stream_url: string;
  type: 'live';
  status: 'scheduled' | 'live' | 'ended';
  started_at: string | null;
  ended_at: string | null;
  viewers_count: number;
  peak_viewers: number;
}

// Qualidades de vídeo disponíveis
export interface VideoQuality {
  resolution: '240p' | '360p' | '480p' | '720p' | '1080p' | '1440p' | '2160p';
  url: string;
}

// Interface para comentários em vídeos
export interface VideoComment {
  id: string;
  video_id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  content: string;
  created_at: string;
  likes: number;
  replies_count: number;
  is_pinned: boolean;
  parent_id?: string; // para respostas a comentários
}

// Interface para resposta a um comentário
export interface CommentReply extends VideoComment {
  parent_id: string;
} 
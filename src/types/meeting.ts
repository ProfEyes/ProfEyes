/**
 * Interface para dados de reuniões e transmissões ao vivo
 */

// Interface para o tipo de dados das reuniões
export interface MeetingData {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  status: 'agendada' | 'ao vivo' | 'encerrada' | 'cancelada' | 'scheduled' | 'live' | 'ended' | 'deleted';
  thumbnailUrl?: string;
  thumbnail?: string;
  hostName?: string;
  hostId?: string;
  hostAvatar?: string;
  participantCount?: number;
  tags?: string[];
  streamUrl?: string;
  startedAt?: string;
  startTime?: string;
  createdAt?: string;
  isVerifiedHost?: boolean;
  userId?: string;
}

// Interface para dados de transmissões ao vivo
export interface LiveStream {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  streamKey?: string;
  streamUrl?: string;
  status: 'scheduled' | 'live' | 'ended' | 'deleted';
  scheduledStart?: string;
  startedAt?: string;
  endedAt?: string;
  userId?: string;
  viewerCount?: number;
  tags?: string[];
  language?: string;
  category?: string;
  level?: string;
  webcamEnabled?: boolean;
  screenShareEnabled?: boolean;
  streamSettings?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// Interface estendida para LiveStream usada no componente MeetingCard
export interface ExtendedLiveStream {
  id: string;
  title: string;
  description?: string;
  streamerId?: string;
  streamerName: string;
  streamerAvatar: string;
  viewerCount: number;
  status: string;
  startedAt?: Date | string;
  scheduledFor?: string;
  endedAt?: string;
  thumbnail: string;
  language: string;
  category?: string;
  tags?: string[];
  accessType?: 'public' | 'private' | 'invite';
  themeColor?: string;
  isPremium?: boolean;
} 
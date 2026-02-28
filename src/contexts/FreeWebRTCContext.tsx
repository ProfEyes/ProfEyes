import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';

// Tipos
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';
export type WebRTCRole = 'publisher' | 'viewer';

export interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  streamKey: string;
  streamUrl: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'deleted';
  startedAt: string | null;
  endedAt: string | null;
  userId: string;
  username?: string;
  viewerCount: number;
  tags: string[];
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface StreamComment {
  id: string;
  streamId: string;
  userId: string;
  username?: string;
  content: string;
  createdAt: string;
}

// Configuração WebRTC GRATUITA
const FREE_WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

// Simple WebRTC Service para demonstration
class SimpleWebRTCService {
  private role: WebRTCRole;
  private streamId: string;
  private userId: string;
  private localStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private websocket: WebSocket | null = null;
  private statusCallback?: (status: ConnectionStatus) => void;
  private errorCallback?: (error: Error) => void;
  private localStreamCallback?: (stream: MediaStream) => void;
  private remoteStreamCallback?: (stream: MediaStream) => void;

  constructor(role: WebRTCRole, streamId: string, userId: string) {
    this.role = role;
    this.streamId = streamId;
    this.userId = userId;
  }

  onStatusChange(callback: (status: ConnectionStatus) => void) {
    this.statusCallback = callback;
  }

  onError(callback: (error: Error) => void) {
    this.errorCallback = callback;
  }

  onLocalStream(callback: (stream: MediaStream) => void) {
    this.localStreamCallback = callback;
  }

  onRemoteStream(callback: (stream: MediaStream) => void) {
    this.remoteStreamCallback = callback;
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('🆓 [SimpleWebRTC] Inicializando...', { role: this.role, streamId: this.streamId });
      
      this.statusCallback?.('connecting');

      // Para publisher, obter mídia local
      if (this.role === 'publisher') {
        await this.initializePublisher();
      } else {
        await this.initializeViewer();
      }

      this.statusCallback?.('connected');
      return true;
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Erro na inicialização:', error);
      this.errorCallback?.(error instanceof Error ? error : new Error('Erro desconhecido'));
      this.statusCallback?.('failed');
      return false;
    }
  }

  private async initializePublisher(): Promise<void> {
    console.log('🎬 [SimpleWebRTC] Inicializando publisher...');
    
    try {
      // Obter mídia local
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('✅ [SimpleWebRTC] Mídia local obtida');
      this.localStreamCallback?.(this.localStream);

      // Criar peer connection
      this.peerConnection = new RTCPeerConnection(FREE_WEBRTC_CONFIG);
      
      // Adicionar tracks local
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      console.log('✅ [SimpleWebRTC] Publisher configurado');
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Erro no publisher:', error);
      throw error;
    }
  }

  private async initializeViewer(): Promise<void> {
    console.log('👁️ [SimpleWebRTC] Inicializando viewer...');
    
    try {
      // Criar peer connection
      this.peerConnection = new RTCPeerConnection(FREE_WEBRTC_CONFIG);
      
      // Configurar recebimento de stream remoto
      this.peerConnection.ontrack = (event) => {
        console.log('📺 [SimpleWebRTC] Stream remoto recebido');
        if (event.streams && event.streams[0]) {
          this.remoteStreamCallback?.(event.streams[0]);
        }
      };

      console.log('✅ [SimpleWebRTC] Viewer configurado');
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Erro no viewer:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 [SimpleWebRTC] Parando...');
    
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }

      this.statusCallback?.('disconnected');
      console.log('✅ [SimpleWebRTC] Parado com sucesso');
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Erro ao parar:', error);
    }
  }

  async shareScreen(): Promise<boolean> {
    if (this.role !== 'publisher' || !this.peerConnection) {
      return false;
    }

    try {
      console.log('🖥️ [SimpleWebRTC] Compartilhando tela...');
      
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Substituir track de vídeo
      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = this.peerConnection.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );

      if (sender) {
        await sender.replaceTrack(videoTrack);
      }

      console.log('✅ [SimpleWebRTC] Tela compartilhada');
      return true;
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Erro ao compartilhar tela:', error);
      return false;
    }
  }

  sendChatMessage(message: string): void {
    console.log('💬 [SimpleWebRTC] Enviando mensagem:', message);
    // Implementar via data channel ou websocket
  }
}

// Context Type
export interface FreeWebRTCContextType {
  streams: LiveStream[];
  activeStream: LiveStream | null;
  comments: StreamComment[];
  isLoadingStreams: boolean;
  isLoadingComments: boolean;
  isProcessingAction: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  viewerCount: number;
  
  // Stream Management
  fetchStreams: () => Promise<LiveStream[]>;
  fetchStreamById: (streamId: string) => Promise<LiveStream | null>;
  createStream: (streamData: Partial<LiveStream>) => Promise<LiveStream | null>;
  updateStream: (streamId: string, updateData: Partial<LiveStream>) => Promise<boolean>;
  deleteStream: (streamId: string) => Promise<boolean>;
  startStream: (streamId: string) => Promise<boolean>;
  endStream: (streamId: string) => Promise<boolean>;
  
  // Comments
  fetchComments: (streamId: string) => Promise<void>;
  addComment: (streamId: string, content: string) => Promise<boolean>;
  
  // WebRTC
  initializePublisher: (streamId: string, videoElement: HTMLVideoElement) => Promise<boolean>;
  initializeViewer: (streamId: string, videoElement: HTMLVideoElement) => Promise<boolean>;
  stopWebRTC: () => Promise<void>;
  shareScreen: () => Promise<boolean>;
  sendChatMessage: (message: string) => void;
  
  // Utils
  generateStreamKey: () => string;
  hasStreamingPermission: boolean;
}

// Context
const FreeWebRTCContext = createContext<FreeWebRTCContextType | undefined>(undefined);

// Provider
export function FreeWebRTCProvider({ children }: { children: ReactNode }) {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [activeStream, setActiveStream] = useState<LiveStream | null>(null);
  const [comments, setComments] = useState<StreamComment[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [viewerCount, setViewerCount] = useState(0);
  const [hasStreamingPermission] = useState(true); // GRÁTIS para todos!
  
  // WebRTC Service
  const webrtcServiceRef = useRef<SimpleWebRTCService | null>(null);
  const roleRef = useRef<WebRTCRole | null>(null);
  
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  // Limpar erro após 5 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Buscar transmissões
  const fetchStreams = async (): Promise<LiveStream[]> => {
    if (!user) return [];
    
    setIsLoadingStreams(true);
    setError(null);
    
    try {
      console.log('🔍 [FreeWebRTC] Buscando transmissões...');
      
      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          *,
          user_profiles(
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ [FreeWebRTC] Erro ao buscar streams:', error);
        throw error;
      }
      
      const formattedStreams = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        thumbnailUrl: item.thumbnail_url,
        streamKey: item.stream_key,
        streamUrl: item.stream_url,
        status: item.status,
        startedAt: item.started_at,
        endedAt: item.ended_at,
        userId: item.user_id,
        username: item.user_profiles?.display_name || 'Usuário',
        viewerCount: item.viewer_count || 0,
        tags: item.tags || [],
        language: item.language || 'pt',
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      
      setStreams(formattedStreams);
      console.log(`✅ [FreeWebRTC] ${formattedStreams.length} transmissões carregadas`);
      
      return formattedStreams;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro ao carregar transmissões: ${errorMessage}`);
      return [];
    } finally {
      setIsLoadingStreams(false);
    }
  };

  // Buscar transmissão por ID
  const fetchStreamById = async (streamId: string): Promise<LiveStream | null> => {
    try {
      console.log('🔍 [FreeWebRTC] Buscando stream:', streamId);
      
      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          *,
          user_profiles(
            display_name,
            avatar_url
          )
        `)
        .eq('id', streamId)
        .maybeSingle();
      
      if (error) {
        console.error('❌ [FreeWebRTC] Erro ao buscar stream:', error);
        return null;
      }
      
      if (!data) {
        console.warn('⚠️ [FreeWebRTC] Stream não encontrada:', streamId);
        return null;
      }
      
      const stream = {
        id: data.id,
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnail_url,
        streamKey: data.stream_key,
        streamUrl: data.stream_url,
        status: data.status,
        startedAt: data.started_at,
        endedAt: data.ended_at,
        userId: data.user_id,
        username: data.user_profiles?.display_name || 'Usuário',
        viewerCount: data.viewer_count || 0,
        tags: data.tags || [],
        language: data.language || 'pt',
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      setActiveStream(stream);
      console.log('✅ [FreeWebRTC] Stream carregada:', stream.title);
      
      return stream;
      
    } catch (err) {
      console.error('❌ [FreeWebRTC] Erro ao buscar stream:', err);
      return null;
    }
  };

  // Criar transmissão
  const createStream = async (streamData: Partial<LiveStream>): Promise<LiveStream | null> => {
    if (!user) return null;
    
    setIsProcessingAction(true);
    setError(null);
    
    try {
      console.log('🎬 [FreeWebRTC] Criando transmissão...');
      
      const streamKey = generateStreamKey();
      
      const insertData = {
        title: streamData.title || 'Transmissão Sem Título',
        description: streamData.description || null,
        thumbnail_url: streamData.thumbnailUrl || null,
        stream_key: streamKey,
        stream_url: null,
        status: 'scheduled',
        user_id: user.id,
        viewer_count: 0,
        tags: streamData.tags || [],
        language: streamData.language || 'pt'
      };
      
      console.log('📤 [FreeWebRTC] Dados para inserção:', insertData);
      
      const { data, error } = await supabase
        .from('live_streams')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ [FreeWebRTC] Erro ao criar stream:', error);
        throw error;
      }
      
      const newStream = {
        id: data.id,
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnail_url,
        streamKey: data.stream_key,
        streamUrl: data.stream_url,
        status: data.status,
        startedAt: data.started_at,
        endedAt: data.ended_at,
        userId: data.user_id,
        username: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Usuário',
        viewerCount: data.viewer_count || 0,
        tags: data.tags || [],
        language: data.language || 'pt',
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      setStreams(prev => [newStream, ...prev]);
      setActiveStream(newStream);
      
      console.log('✅ [FreeWebRTC] Transmissão criada:', newStream.id);
      addNotification({
        type: 'success',
        title: 'Transmissão criada!',
        message: `"${newStream.title}" foi criada com sucesso.`,
        timestamp: new Date()
      });
      
      return newStream;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro ao criar transmissão: ${errorMessage}`);
      addNotification({
        type: 'error',
        title: 'Erro ao criar transmissão',
        message: errorMessage,
        timestamp: new Date()
      });
      return null;
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Atualizar transmissão
  const updateStream = async (streamId: string, updateData: Partial<LiveStream>): Promise<boolean> => {
    if (!user) return false;
    
    setIsProcessingAction(true);
    
    try {
      console.log('📝 [FreeWebRTC] Atualizando stream:', streamId);
      
      const { error } = await supabase
        .from('live_streams')
        .update({
          title: updateData.title,
          description: updateData.description,
          thumbnail_url: updateData.thumbnailUrl,
          tags: updateData.tags,
          language: updateData.language,
          updated_at: new Date().toISOString()
        })
        .eq('id', streamId)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('❌ [FreeWebRTC] Erro ao atualizar stream:', error);
        throw error;
      }
      
      // Atualizar estado local
      setStreams(prev => prev.map(s => 
        s.id === streamId ? { ...s, ...updateData } : s
      ));
      
      if (activeStream?.id === streamId) {
        setActiveStream(prev => prev ? { ...prev, ...updateData } : null);
      }
      
      console.log('✅ [FreeWebRTC] Stream atualizada');
      return true;
      
    } catch (err) {
      console.error('❌ [FreeWebRTC] Erro ao atualizar stream:', err);
      return false;
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Deletar transmissão
  const deleteStream = async (streamId: string): Promise<boolean> => {
    if (!user) return false;
    
    setIsProcessingAction(true);
    
    try {
      console.log('🗑️ [FreeWebRTC] Deletando stream:', streamId);
      
      const { error } = await supabase
        .from('live_streams')
        .delete()
        .eq('id', streamId)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('❌ [FreeWebRTC] Erro ao deletar stream:', error);
        throw error;
      }
      
      setStreams(prev => prev.filter(s => s.id !== streamId));
      
      if (activeStream?.id === streamId) {
        setActiveStream(null);
      }
      
      console.log('✅ [FreeWebRTC] Stream deletada');
      return true;
      
    } catch (err) {
      console.error('❌ [FreeWebRTC] Erro ao deletar stream:', err);
      return false;
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Iniciar transmissão
  const startStream = async (streamId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      console.log('▶️ [FreeWebRTC] Iniciando stream:', streamId);
      
      const { error } = await supabase
        .from('live_streams')
        .update({
          status: 'live',
          started_at: new Date().toISOString()
        })
        .eq('id', streamId)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('❌ [FreeWebRTC] Erro ao iniciar stream:', error);
        throw error;
      }
      
      // Atualizar estado local
      setStreams(prev => prev.map(s => 
        s.id === streamId 
          ? { ...s, status: 'live', startedAt: new Date().toISOString() }
          : s
      ));
      
      if (activeStream?.id === streamId) {
        setActiveStream(prev => prev ? {
          ...prev,
          status: 'live',
          startedAt: new Date().toISOString()
        } : null);
      }
      
      console.log('✅ [FreeWebRTC] Stream iniciada');
      return true;
      
    } catch (err) {
      console.error('❌ [FreeWebRTC] Erro ao iniciar stream:', err);
      return false;
    }
  };

  // Finalizar transmissão
  const endStream = async (streamId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      console.log('⏹️ [FreeWebRTC] Finalizando stream:', streamId);
      
      const { error } = await supabase
        .from('live_streams')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', streamId)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('❌ [FreeWebRTC] Erro ao finalizar stream:', error);
        throw error;
      }
      
      // Parar WebRTC se ativo
      if (webrtcServiceRef.current) {
        await stopWebRTC();
      }
      
      // Atualizar estado local
      setStreams(prev => prev.map(s => 
        s.id === streamId 
          ? { ...s, status: 'ended', endedAt: new Date().toISOString() }
          : s
      ));
      
      if (activeStream?.id === streamId) {
        setActiveStream(prev => prev ? {
          ...prev,
          status: 'ended',
          endedAt: new Date().toISOString()
        } : null);
      }
      
      console.log('✅ [FreeWebRTC] Stream finalizada');
      return true;
      
    } catch (err) {
      console.error('❌ [FreeWebRTC] Erro ao finalizar stream:', err);
      return false;
    }
  };

  // Buscar comentários
  const fetchComments = async (streamId: string): Promise<void> => {
    setIsLoadingComments(true);
    
    try {
      console.log('💬 [FreeWebRTC] Buscando comentários para:', streamId);
      
      const { data, error } = await supabase
        .from('stream_comments')
        .select(`
          *,
          user_profiles(
            display_name
          )
        `)
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('❌ [FreeWebRTC] Erro ao buscar comentários:', error);
        return;
      }
      
      const formattedComments = (data || []).map(comment => ({
        id: comment.id,
        streamId: comment.stream_id,
        userId: comment.user_id,
        username: comment.user_profiles?.display_name || 'Usuário',
        content: comment.content,
        createdAt: comment.created_at
      }));
      
      setComments(formattedComments);
      console.log(`✅ [FreeWebRTC] ${formattedComments.length} comentários carregados`);
      
    } catch (err) {
      console.error('❌ [FreeWebRTC] Erro ao buscar comentários:', err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Adicionar comentário
  const addComment = async (streamId: string, content: string): Promise<boolean> => {
    if (!user || !content.trim()) return false;
    
    try {
      console.log('✍️ [FreeWebRTC] Adicionando comentário...');
      
      const { data, error } = await supabase
        .from('stream_comments')
        .insert({
          stream_id: streamId,
          user_id: user.id,
          content: content.trim()
        })
        .select(`
          *,
          user_profiles(
            display_name
          )
        `)
        .single();
      
      if (error) {
        console.error('❌ [FreeWebRTC] Erro ao adicionar comentário:', error);
        return false;
      }
      
      const newComment = {
        id: data.id,
        streamId: data.stream_id,
        userId: data.user_id,
        username: data.user_profiles?.display_name || 'Usuário',
        content: data.content,
        createdAt: data.created_at
      };
      
      setComments(prev => [...prev, newComment]);
      console.log('✅ [FreeWebRTC] Comentário adicionado');
      
      return true;
      
    } catch (err) {
      console.error('❌ [FreeWebRTC] Erro ao adicionar comentário:', err);
      return false;
    }
  };

  // Inicializar Publisher (Streamer)
  const initializePublisher = async (streamId: string, videoElement: HTMLVideoElement): Promise<boolean> => {
    if (!user) return false;
    
    try {
      console.log('🎬 [FreeWebRTC] Inicializando publisher...');
      setConnectionStatus('connecting');
      
      // Parar serviço anterior se existir
      if (webrtcServiceRef.current) {
        await webrtcServiceRef.current.stop();
      }
      
      // Criar novo serviço WebRTC como publisher
      const webrtcService = new SimpleWebRTCService('publisher', streamId, user.id);
      webrtcServiceRef.current = webrtcService;
      roleRef.current = 'publisher';
      
      // Configurar callbacks
      webrtcService.onStatusChange((status) => {
        console.log('📊 [FreeWebRTC] Status do publisher:', status);
        setConnectionStatus(status);
      });
      
      webrtcService.onLocalStream((stream) => {
        console.log('📹 [FreeWebRTC] Stream local recebido');
        videoElement.srcObject = stream;
      });
      
      webrtcService.onError((error) => {
        console.error('❌ [FreeWebRTC] Erro no publisher:', error);
        setError(error.message);
        addNotification({
          type: 'error',
          title: 'Erro na transmissão',
          message: error.message,
          timestamp: new Date()
        });
      });
      
      // Inicializar serviço
      const success = await webrtcService.initialize();
      
      if (success) {
        console.log('✅ [FreeWebRTC] Publisher inicializado com sucesso');
        
        // Iniciar stream no banco de dados
        await startStream(streamId);
        
        return true;
      } else {
        console.error('❌ [FreeWebRTC] Falha ao inicializar publisher');
        setError('Não foi possível iniciar a transmissão');
        return false;
      }
      
    } catch (err) {
      console.error('❌ [FreeWebRTC] Erro ao inicializar publisher:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      setConnectionStatus('failed');
      return false;
    }
  };

  // Inicializar Viewer (Espectador)
  const initializeViewer = async (streamId: string, videoElement: HTMLVideoElement): Promise<boolean> => {
    if (!user) return false;
    
    try {
      console.log('👁️ [FreeWebRTC] Inicializando viewer...');
      setConnectionStatus('connecting');
      
      // Verificar se stream existe e está ativa
      const stream = await fetchStreamById(streamId);
      if (!stream || stream.status !== 'live') {
        setError('Transmissão não encontrada ou não está ativa');
        setConnectionStatus('failed');
        return false;
      }
      
      // Parar serviço anterior se existir
      if (webrtcServiceRef.current) {
        await webrtcServiceRef.current.stop();
      }
      
      // Criar novo serviço WebRTC como viewer
      const webrtcService = new SimpleWebRTCService('viewer', streamId, user.id);
      webrtcServiceRef.current = webrtcService;
      roleRef.current = 'viewer';
      
      // Configurar callbacks
      webrtcService.onStatusChange((status) => {
        console.log('📊 [FreeWebRTC] Status do viewer:', status);
        setConnectionStatus(status);
      });
      
      webrtcService.onRemoteStream((stream) => {
        console.log('📺 [FreeWebRTC] Stream remoto recebido');
        videoElement.srcObject = stream;
      });
      
      webrtcService.onError((error) => {
        console.error('❌ [FreeWebRTC] Erro no viewer:', error);
        setError(error.message);
        addNotification({
          type: 'error',
          title: 'Erro ao conectar',
          message: error.message,
          timestamp: new Date()
        });
      });
      
      // Inicializar serviço
      const success = await webrtcService.initialize();
      
      if (success) {
        console.log('✅ [FreeWebRTC] Viewer inicializado com sucesso');
        
        // Incrementar contador de viewers
        const { error: updateError } = await supabase
          .from('live_streams')
          .update({
            viewer_count: (stream.viewerCount || 0) + 1
          })
          .eq('id', streamId);
        
        if (!updateError) {
          setViewerCount(prev => prev + 1);
        }
        
        return true;
      } else {
        console.error('❌ [FreeWebRTC] Falha ao inicializar viewer');
        setError('Não foi possível conectar à transmissão');
        return false;
      }
      
    } catch (err) {
      console.error('❌ [FreeWebRTC] Erro ao inicializar viewer:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      setConnectionStatus('failed');
      return false;
    }
  };

  // Parar WebRTC
  const stopWebRTC = async (): Promise<void> => {
    try {
      console.log('🛑 [FreeWebRTC] Parando WebRTC...');
      
      if (webrtcServiceRef.current) {
        await webrtcServiceRef.current.stop();
        webrtcServiceRef.current = null;
      }
      
      roleRef.current = null;
      setConnectionStatus('disconnected');
      
      console.log('✅ [FreeWebRTC] WebRTC parado');
      
    } catch (err) {
      console.error('❌ [FreeWebRTC] Erro ao parar WebRTC:', err);
    }
  };

  // Compartilhar tela
  const shareScreen = async (): Promise<boolean> => {
    if (!webrtcServiceRef.current || roleRef.current !== 'publisher') {
      return false;
    }
    
    try {
      console.log('🖥️ [FreeWebRTC] Compartilhando tela...');
      
      const success = await webrtcServiceRef.current.shareScreen();
      
      if (success) {
        addNotification({
          type: 'success',
          title: 'Compartilhamento iniciado',
          message: 'Sua tela está sendo compartilhada',
          timestamp: new Date()
        });
      }
      
      return success;
      
    } catch (err) {
      console.error('❌ [FreeWebRTC] Erro ao compartilhar tela:', err);
      return false;
    }
  };

  // Enviar mensagem de chat
  const sendChatMessage = (message: string): void => {
    if (!webrtcServiceRef.current || !message.trim()) return;
    
    try {
      webrtcServiceRef.current.sendChatMessage(message.trim());
      console.log('💬 [FreeWebRTC] Mensagem de chat enviada:', message);
    } catch (err) {
      console.error('❌ [FreeWebRTC] Erro ao enviar mensagem:', err);
    }
  };

  // Gerar chave de stream
  const generateStreamKey = (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${user?.id}-${timestamp}-${random}`;
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.stop();
      }
    };
  }, []);

  const value: FreeWebRTCContextType = {
    streams,
    activeStream,
    comments,
    isLoadingStreams,
    isLoadingComments,
    isProcessingAction,
    error,
    connectionStatus,
    viewerCount,
    fetchStreams,
    fetchStreamById,
    createStream,
    updateStream,
    deleteStream,
    startStream,
    endStream,
    fetchComments,
    addComment,
    initializePublisher,
    initializeViewer,
    stopWebRTC,
    shareScreen,
    sendChatMessage,
    generateStreamKey,
    hasStreamingPermission
  };

  return (
    <FreeWebRTCContext.Provider value={value}>
      {children}
    </FreeWebRTCContext.Provider>
  );
}

// Hook para usar o contexto
export const useFreeWebRTC = () => {
  const context = useContext(FreeWebRTCContext);
  if (!context) {
    throw new Error('useFreeWebRTC deve ser usado dentro de FreeWebRTCProvider');
  }
  return context;
}; 
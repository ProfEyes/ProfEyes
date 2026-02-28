/**
 * ✨ NOVO SISTEMA DE STREAMING - WebRTC Puro + Supabase Realtime
 * 
 * Arquitetura simples e robusta:
 * 1. Streamer: Cria offer → Salva no Supabase
 * 2. Viewer: Pega offer → Cria answer → Salva no Supabase
 * 3. Ambos: Trocam ICE candidates via Realtime
 * 4. WebRTC: Estabelece conexão P2P automaticamente
 */

import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// TIPOS
// ============================================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
  timestamp: string;
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const DEFAULT_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

// ============================================================================
// PUBLISHER (STREAMER)
// ============================================================================

export class SimplePublisher {
  private streamId: string;
  private userId: string;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private viewers: Map<string, RTCPeerConnection> = new Map();
  
  private status: ConnectionStatus = 'disconnected';
  private onStatusChange?: (status: ConnectionStatus) => void;
  private onViewerConnected?: (viewerId: string) => void;
  private onViewerDisconnected?: (viewerId: string) => void;

  constructor(
    streamId: string,
    userId: string,
    callbacks?: {
      onStatusChange?: (status: ConnectionStatus) => void;
      onViewerConnected?: (viewerId: string) => void;
      onViewerDisconnected?: (viewerId: string) => void;
    }
  ) {
    this.streamId = streamId;
    this.userId = userId;
    this.onStatusChange = callbacks?.onStatusChange;
    this.onViewerConnected = callbacks?.onViewerConnected;
    this.onViewerDisconnected = callbacks?.onViewerDisconnected;
    
    console.log('🏗️ [SimplePublisher] Construtor chamado:', { streamId, userId });
  }

  /**
   * Inicializar publisher com stream de mídia
   */
  async initialize(mediaStream: MediaStream): Promise<boolean> {
    try {
      console.log('🎬 [SimplePublisher] Inicializando...', {
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length,
      });

      this.localStream = mediaStream;
      this.updateStatus('connecting');

      // Configurar canal Realtime para sinalização
      await this.setupRealtimeChannel();

      // Salvar stream_id no banco para viewers descobrirem
      await this.registerStream();

      this.updateStatus('connected');
      console.log('✅ [SimplePublisher] Inicializado com sucesso!');
      return true;
    } catch (error) {
      console.error('💥 [SimplePublisher] Erro ao inicializar:', error);
      this.updateStatus('failed');
      return false;
    }
  }

  /**
   * Configurar canal Realtime para sinalização
   */
  private async setupRealtimeChannel(): Promise<void> {
    const channelName = `stream:${this.streamId}`;
    console.log('📡 [SimplePublisher] Configurando canal Realtime:', channelName);

    this.realtimeChannel = supabase.channel(channelName);

    // Escutar ofertas de viewers (viewers enviam offer para o publisher)
    this.realtimeChannel
      .on('broadcast', { event: 'viewer-offer' }, async ({ payload }: any) => {
        console.log('📞 [SimplePublisher] Recebendo offer de viewer:', {
          from: payload.from,
          hasOffer: !!payload.offer,
          offerType: payload.offer?.type,
          iceCandidatesCount: payload.iceCandidates?.length || 0
        });
        await this.handleViewerOffer(payload.from, payload.offer, payload.iceCandidates || []);
      })
      .on('broadcast', { event: 'renegotiate-answer' }, async ({ payload }: any) => {
        console.log('📥 [SimplePublisher] Evento renegotiate-answer recebido:', {
          from: payload.from,
          hasAnswer: !!payload.answer
        });
        await this.handleRenegotiateAnswer(payload.from, payload.answer);
      })
      .subscribe((status) => {
        console.log('📡 [SimplePublisher] Status do canal Realtime:', status);
      });
  }

  /**
   * Registrar stream no banco
   */
  private async registerStream(): Promise<void> {
    console.log('💾 [SimplePublisher] Registrando stream no banco...');

    const { error } = await supabase
      .from('live_streams')
      .update({
        status: 'live',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.streamId);

    if (error) {
      console.error('❌ [SimplePublisher] Erro ao registrar stream:', error);
      throw error;
    }

    console.log('✅ [SimplePublisher] Stream registrada no banco');
  }

  /**
   * Lidar com offer de viewer
   */
  private async handleViewerOffer(
    viewerId: string,
    offer: RTCSessionDescriptionInit,
    iceCandidates: RTCIceCandidateInit[]
  ): Promise<void> {
    try {
      console.log('🔧 [SimplePublisher] Criando PeerConnection para viewer:', viewerId);

      // Criar nova PeerConnection para este viewer
      const pc = new RTCPeerConnection(DEFAULT_CONFIG);
      this.viewers.set(viewerId, pc);

      // Adicionar tracks do stream local
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          console.log('📤 [SimplePublisher] Adicionando track:', track.kind);
          pc.addTrack(track, this.localStream!);
        });
      }

      // Configurar eventos
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 [SimplePublisher] Enviando ICE candidate para viewer:', viewerId);
          this.sendIceCandidate(viewerId, event.candidate);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('🔗 [SimplePublisher] Connection state com viewer:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          this.onViewerConnected?.(viewerId);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          this.onViewerDisconnected?.(viewerId);
          this.viewers.delete(viewerId);
        }
      };

      // Configurar remote description (offer do viewer)
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('✅ [SimplePublisher] Remote description configurada');

      // Adicionar ICE candidates do viewer
      for (const candidate of iceCandidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      // Criar answer com alta qualidade
      const answer = await pc.createAnswer();
      
      // ✅ Modificar SDP para aumentar bitrate
      if (answer.sdp) {
        answer.sdp = answer.sdp.replace(
          /(a=fmtp:.*)\r\n/g,
          '$1;x-google-max-bitrate=10000;x-google-min-bitrate=5000;x-google-start-bitrate=8000\r\n'
        );
      }
      
      await pc.setLocalDescription(answer);
      console.log('✅ [SimplePublisher] Answer criada com alta qualidade');

      // Enviar answer para o viewer
      await this.sendAnswer(viewerId, answer);
      
    } catch (error) {
      console.error('💥 [SimplePublisher] Erro ao processar offer do viewer:', error);
    }
  }

  /**
   * ✅ NOVO: Processar answer de renegociação do viewer
   */
  private async handleRenegotiateAnswer(viewerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.viewers.get(viewerId);
    if (!pc) {
      console.error('❌ [SimplePublisher] PeerConnection não encontrada para viewer:', viewerId);
      return;
    }

    try {
      console.log('🔄 [SimplePublisher] Processando answer de renegociação de viewer:', viewerId, {
        connectionState: pc.connectionState,
        signalingState: pc.signalingState,
        hasAnswer: !!answer,
        answerType: answer.type
      });
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ [SimplePublisher] Remote description atualizada para viewer:', viewerId, {
        signalingState: pc.signalingState,
        connectionState: pc.connectionState
      });
    } catch (error) {
      console.error('❌ [SimplePublisher] Erro ao processar answer de renegociação:', error);
    }
  }

  /**
   * Enviar answer para viewer
   */
  private async sendAnswer(viewerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    console.log('📤 [SimplePublisher] Enviando answer para viewer:', viewerId);

    await this.realtimeChannel?.send({
      type: 'broadcast',
      event: 'publisher-answer',
      payload: {
        to: viewerId,
        from: this.userId,
        answer: answer,
      },
    });
  }

  /**
   * Enviar ICE candidate para viewer
   */
  private async sendIceCandidate(viewerId: string, candidate: RTCIceCandidate): Promise<void> {
    await this.realtimeChannel?.send({
      type: 'broadcast',
      event: 'publisher-ice',
      payload: {
        to: viewerId,
        from: this.userId,
        candidate: candidate.toJSON(),
      },
    });
  }

  /**
   * Atualizar status
   */
  private updateStatus(status: ConnectionStatus): void {
    this.status = status;
    this.onStatusChange?.(status);
  }

  /**
   * Obter status atual
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Obter número de viewers conectados
   */
  getViewerCount(): number {
    return this.viewers.size;
  }

  /**
   * ✅ NOVO: Atualizar stream (adicionar/remover tracks)
   * Usado quando o streamer ativa compartilhamento de tela, muda câmera, etc.
   */
  async updateStream(newStream: MediaStream): Promise<void> {
    console.log('🔄 [SimplePublisher] Atualizando stream:', {
      oldVideoTracks: this.localStream?.getVideoTracks().length || 0,
      oldAudioTracks: this.localStream?.getAudioTracks().length || 0,
      newVideoTracks: newStream.getVideoTracks().length,
      newAudioTracks: newStream.getAudioTracks().length,
    });

    // ✅ Parar APENAS tracks que NÃO estão no novo stream
    if (this.localStream) {
      const newTrackIds = new Set(newStream.getTracks().map(t => t.id));
      
      this.localStream.getTracks().forEach((track) => {
        // ✅ Só parar se o track NÃO estiver no novo stream
        if (!newTrackIds.has(track.id)) {
          console.log('🛑 [SimplePublisher] Parando track antigo:', track.kind, track.id);
          track.stop();
        } else {
          console.log('♻️ [SimplePublisher] Mantendo track (ainda em uso):', track.kind, track.id);
        }
      });
    }

    // Atualizar para o novo stream
    this.localStream = newStream;

    // Atualizar tracks em todas as conexões com viewers
    const updatePromises: Promise<void>[] = [];
    
    this.viewers.forEach((pc, viewerId) => {
      const updatePromise = (async () => {
        console.log('🔄 [SimplePublisher] Atualizando tracks para viewer:', viewerId);

        // Remover todos os senders antigos
        const senders = pc.getSenders();
        senders.forEach((sender) => {
          console.log('🗑️ [SimplePublisher] Removendo sender antigo:', sender.track?.kind);
          pc.removeTrack(sender);
        });

        // Adicionar novos tracks
        newStream.getTracks().forEach((track) => {
          console.log('➕ [SimplePublisher] Adicionando novo track:', track.kind, track.id);
          pc.addTrack(track, newStream);
        });
        
        // ✅ NOVO: Renegociar conexão (criar nova offer)
        console.log('🔄 [SimplePublisher] Renegociando conexão com viewer:', viewerId, {
          connectionState: pc.connectionState,
          signalingState: pc.signalingState
        });
        try {
          // ✅ Criar offer com configurações de alta qualidade
          const offer = await pc.createOffer({
            offerToReceiveAudio: false,  // Apenas enviar, não receber
            offerToReceiveVideo: false,
          });
          
          console.log('✅ [SimplePublisher] Offer criada:', {
            type: offer.type,
            hasSdp: !!offer.sdp
          });
          
          // ✅ Modificar SDP para aumentar bitrate
          if (offer.sdp) {
            offer.sdp = offer.sdp.replace(
              /(a=fmtp:.*)\r\n/g,
              '$1;x-google-max-bitrate=10000;x-google-min-bitrate=5000;x-google-start-bitrate=8000\r\n'
            );
          }
          
          await pc.setLocalDescription(offer);
          console.log('✅ [SimplePublisher] Local description atualizada:', {
            signalingState: pc.signalingState
          });
          
          // Enviar nova offer para o viewer via Realtime
          await this.realtimeChannel?.send({
            type: 'broadcast',
            event: 'renegotiate-offer',
            payload: {
              to: viewerId,
              offer: offer,
            },
          });
          
          console.log('✅ [SimplePublisher] Renegociação offer enviada para viewer:', viewerId);
        } catch (error) {
          console.error('❌ [SimplePublisher] Erro ao renegociar com viewer:', viewerId, error);
        }
      })();
      
      updatePromises.push(updatePromise);
    });
    
    // Aguardar todas as atualizações
    await Promise.all(updatePromises);

    console.log('✅ [SimplePublisher] Stream atualizada para todos os viewers');
  }

  /**
   * Finalizar e limpar recursos
   */
  async destroy(): Promise<void> {
    console.log('🧹 [SimplePublisher] Destruindo...');

    // Fechar todas as conexões com viewers
    this.viewers.forEach((pc, viewerId) => {
      console.log('🔌 [SimplePublisher] Fechando conexão com viewer:', viewerId);
      pc.close();
    });
    this.viewers.clear();

    // Desinscrever do canal Realtime
    if (this.realtimeChannel) {
      await supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    // Parar tracks do stream local
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Atualizar status no banco
    await supabase
      .from('live_streams')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', this.streamId);

    this.updateStatus('disconnected');
    console.log('✅ [SimplePublisher] Destruído com sucesso');
  }
}

// ============================================================================
// VIEWER (ESPECTADOR)
// ============================================================================

export class SimpleViewer {
  private streamId: string;
  private userId: string;
  private publisherId: string;
  private peerConnection: RTCPeerConnection | null = null;
  private remoteStream: MediaStream | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private videoElement: HTMLVideoElement;
  
  private status: ConnectionStatus = 'disconnected';
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  
  private onStatusChange?: (status: ConnectionStatus) => void;
  private onStreamReceived?: (stream: MediaStream) => void;

  constructor(
    streamId: string,
    userId: string,
    publisherId: string,
    videoElement: HTMLVideoElement,
    callbacks?: {
      onStatusChange?: (status: ConnectionStatus) => void;
      onStreamReceived?: (stream: MediaStream) => void;
    }
  ) {
    this.streamId = streamId;
    this.userId = userId;
    this.publisherId = publisherId;
    this.videoElement = videoElement;
    this.onStatusChange = callbacks?.onStatusChange;
    this.onStreamReceived = callbacks?.onStreamReceived;
    
    console.log('🏗️ [SimpleViewer] Construtor chamado:', { streamId, userId, publisherId });
  }

  /**
   * Inicializar viewer e conectar ao publisher
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🎬 [SimpleViewer] Inicializando...');
      this.updateStatus('connecting');

      // Configurar canal Realtime
      await this.setupRealtimeChannel();

      // Criar PeerConnection
      this.createPeerConnection();

      // Criar offer e enviar para o publisher
      await this.createAndSendOffer();

      return true;
    } catch (error) {
      console.error('💥 [SimpleViewer] Erro ao inicializar:', error);
      this.updateStatus('failed');
      return false;
    }
  }

  /**
   * Configurar canal Realtime
   */
  private async setupRealtimeChannel(): Promise<void> {
    const channelName = `stream:${this.streamId}`;
    console.log('📡 [SimpleViewer] Configurando canal Realtime:', channelName);

    this.realtimeChannel = supabase.channel(channelName);

    // Escutar answer do publisher
    this.realtimeChannel
      .on('broadcast', { event: 'publisher-answer' }, async ({ payload }: any) => {
        console.log('📥 [SimpleViewer] Mensagem recebida:', { to: payload.to, myId: this.userId, match: payload.to === this.userId });
        if (payload.to === this.userId) {
          console.log('📞 [SimpleViewer] Recebendo answer do publisher');
          await this.handlePublisherAnswer(payload.answer);
        }
      })
      .on('broadcast', { event: 'publisher-ice' }, async ({ payload }: any) => {
        if (payload.to === this.userId) {
          console.log('🧊 [SimpleViewer] Recebendo ICE candidate do publisher');
          await this.handlePublisherIceCandidate(payload.candidate);
        }
      })
      .on('broadcast', { event: 'renegotiate-offer' }, async ({ payload }: any) => {
        console.log('📥 [SimpleViewer] Evento renegotiate-offer recebido:', {
          to: payload.to,
          myId: this.userId,
          match: payload.to === this.userId,
          hasOffer: !!payload.offer
        });
        
        if (payload.to === this.userId) {
          console.log('🔄 [SimpleViewer] Recebendo offer de renegociação do publisher');
          await this.handleRenegotiateOffer(payload.offer);
        }
      })
      .subscribe((status) => {
        console.log('📡 [SimpleViewer] Status do canal Realtime:', status);
      });
  }

  /**
   * Criar PeerConnection
   */
  private createPeerConnection(): void {
    console.log('🔧 [SimpleViewer] Criando PeerConnection...');

    this.peerConnection = new RTCPeerConnection(DEFAULT_CONFIG);

    // Evento: Receber stream remoto
    this.peerConnection.ontrack = (event) => {
      console.log('🎵 [SimpleViewer] ========== TRACK RECEBIDO ==========');
      console.log('🎵 [SimpleViewer] Track recebido:', {
        kind: event.track.kind,
        id: event.track.id,
        label: event.track.label,
        readyState: event.track.readyState,
        enabled: event.track.enabled,
        muted: event.track.muted,
        hasRemoteStream: !!this.remoteStream,
        streamsCount: event.streams.length
      });
      
      // ✅ CRIAR stream se não existir
      if (!this.remoteStream) {
        console.log('📺 [SimpleViewer] Criando novo MediaStream');
        this.remoteStream = new MediaStream();
        this.videoElement.srcObject = this.remoteStream;
        console.log('✅ [SimpleViewer] srcObject definido no videoElement');
        
        // Listener para metadata
        this.videoElement.onloadedmetadata = () => {
          console.log('🎬 [SimpleViewer] Metadata carregada!', {
            videoWidth: this.videoElement.videoWidth,
            videoHeight: this.videoElement.videoHeight,
            readyState: this.videoElement.readyState,
            duration: this.videoElement.duration
          });
        };
        
        // Tentar fazer play
        this.videoElement.play()
          .then(() => console.log('✅ [SimpleViewer] Video.play() bem-sucedido'))
          .catch(e => console.warn('⚠️ [SimpleViewer] Autoplay bloqueado:', e));
      }
      
      // ✅ REMOVER tracks antigos do mesmo tipo antes de adicionar novo
      const existingTracks = this.remoteStream.getTracks().filter(t => t.kind === event.track.kind);
      if (existingTracks.length > 0) {
        console.log(`🗑️ [SimpleViewer] Removendo ${existingTracks.length} track(s) antigo(s) do tipo ${event.track.kind}:`, 
          existingTracks.map(t => ({ id: t.id, label: t.label, readyState: t.readyState }))
        );
        existingTracks.forEach(track => {
          this.remoteStream!.removeTrack(track);
          track.stop();  // Parar track antigo
        });
        console.log('✅ [SimpleViewer] Tracks antigos removidos');
      } else {
        console.log('ℹ️ [SimpleViewer] Nenhum track antigo do tipo', event.track.kind, 'para remover');
      }
      
      // Adicionar novo track
      console.log(`➕ [SimpleViewer] Adicionando novo track ${event.track.kind}:`, {
        id: event.track.id,
        label: event.track.label,
        readyState: event.track.readyState,
        enabled: event.track.enabled
      });
      this.remoteStream.addTrack(event.track);
      console.log(`✅ [SimpleViewer] Track ${event.track.kind} adicionado ao stream`);
      
      // ✅ NÃO resetar srcObject! Apenas dar play se necessário
      console.log('▶️ [SimpleViewer] Verificando estado do vídeo...');
      console.log('📊 [SimpleViewer] Estado do videoElement:', {
        srcObject: !!this.videoElement.srcObject,
        paused: this.videoElement.paused,
        readyState: this.videoElement.readyState,
        videoWidth: this.videoElement.videoWidth,
        videoHeight: this.videoElement.videoHeight,
        currentTime: this.videoElement.currentTime
      });
      
      // ✅ Se é track de VÍDEO e está com readyState baixo, tentar load
      if (event.track.kind === 'video' && this.videoElement.readyState < 2) {
        console.log('🔄 [SimpleViewer] Track de vídeo recebido, chamando load()...');
        this.videoElement.load();
      }
      
      // ✅ Forçar play se pausado
      if (this.videoElement.paused) {
        console.log('⏸️ [SimpleViewer] Vídeo pausado, tentando dar play...');
        this.videoElement.play()
          .then(() => console.log('✅ [SimpleViewer] Play SUCESSO'))
          .catch(e => console.warn('❌ [SimpleViewer] Play bloqueado:', e));
      } else {
        console.log('▶️ [SimpleViewer] Vídeo já está tocando');
      }
      
      console.log('📊 [SimpleViewer] Tracks no stream após atualização:', {
        total: this.remoteStream.getTracks().length,
        video: this.remoteStream.getVideoTracks().length,
        audio: this.remoteStream.getAudioTracks().length,
        videoTracks: this.remoteStream.getVideoTracks().map(t => ({
          id: t.id,
          label: t.label,
          readyState: t.readyState,
          enabled: t.enabled,
          muted: t.muted
        })),
        audioTracks: this.remoteStream.getAudioTracks().map(t => ({
          id: t.id,
          label: t.label,
          readyState: t.readyState,
          enabled: t.enabled,
          muted: t.muted
        }))
      });
      console.log('🎵 [SimpleViewer] ========== FIM TRACK RECEBIDO ==========');
      
      // Verificar se recebemos tracks
      if (this.remoteStream.getTracks().length >= 1) {
        console.log('✅ [SimpleViewer] Stream recebida!');
        console.log('🎥 [SimpleViewer] Video element:', {
          srcObject: !!this.videoElement.srcObject,
          paused: this.videoElement.paused,
          currentTime: this.videoElement.currentTime,
          readyState: this.videoElement.readyState,
          videoWidth: this.videoElement.videoWidth,
          videoHeight: this.videoElement.videoHeight
        });
        this.updateStatus('connected');
        this.onStreamReceived?.(this.remoteStream);
      }
    };

    // Evento: ICE candidate
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 [SimpleViewer] Coletando ICE candidate');
        this.pendingIceCandidates.push(event.candidate.toJSON());
      }
    };

    // Evento: Connection state
    this.peerConnection.onconnectionstatechange = () => {
      console.log('🔗 [SimpleViewer] Connection state:', this.peerConnection?.connectionState);
      
      if (this.peerConnection?.connectionState === 'connected') {
        this.updateStatus('connected');
      } else if (this.peerConnection?.connectionState === 'failed') {
        this.updateStatus('failed');
      }
    };
  }

  /**
   * Criar offer e enviar para publisher
   */
  private async createAndSendOffer(): Promise<void> {
    if (!this.peerConnection) return;

    console.log('📤 [SimpleViewer] Criando offer...');

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.peerConnection.setLocalDescription(offer);
    console.log('✅ [SimpleViewer] Offer criada');

    // Aguardar ICE candidates serem coletados
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Enviar offer para o publisher
    console.log('📤 [SimpleViewer] Enviando offer para publisher via Realtime');
    await this.realtimeChannel?.send({
      type: 'broadcast',
      event: 'viewer-offer',
      payload: {
        from: this.userId,
        offer: offer,
        iceCandidates: this.pendingIceCandidates,
      },
    });
  }

  /**
   * Processar answer do publisher
   */
  private async handlePublisherAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;

    console.log('📥 [SimpleViewer] Processando answer do publisher...');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log('✅ [SimpleViewer] Remote description configurada');
  }

  /**
   * Processar ICE candidate do publisher
   */
  private async handlePublisherIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;

    console.log('🧊 [SimpleViewer] Adicionando ICE candidate do publisher');
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * ✅ NOVO: Processar offer de renegociação (quando streamer muda stream)
   */
  private async handleRenegotiateOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      console.error('❌ [SimpleViewer] PeerConnection não existe para renegociação');
      return;
    }

    try {
      console.log('🔄 [SimpleViewer] Processando offer de renegociação...', {
        connectionState: this.peerConnection.connectionState,
        signalingState: this.peerConnection.signalingState,
        hasOffer: !!offer,
        offerType: offer.type
      });
      
      // Definir remote description (nova offer do publisher)
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('✅ [SimpleViewer] Remote description atualizada:', {
        signalingState: this.peerConnection.signalingState
      });
      
      // Criar answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('✅ [SimpleViewer] Answer criada para renegociação:', {
        signalingState: this.peerConnection.signalingState
      });
      
      // Enviar answer de volta para o publisher
      await this.realtimeChannel.send({
        type: 'broadcast',
        event: 'renegotiate-answer',
        payload: {
          from: this.userId,
          answer: answer,
        },
      });
      
      console.log('✅ [SimpleViewer] Answer de renegociação enviada para publisher');
    } catch (error) {
      console.error('❌ [SimpleViewer] Erro ao processar renegociação:', error);
    }
  }

  /**
   * Atualizar status
   */
  private updateStatus(status: ConnectionStatus): void {
    this.status = status;
    this.onStatusChange?.(status);
  }

  /**
   * Obter status atual
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Finalizar e limpar recursos
   */
  async destroy(): Promise<void> {
    console.log('🧹 [SimpleViewer] Destruindo...');

    // Fechar PeerConnection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Desinscrever do canal Realtime
    if (this.realtimeChannel) {
      await supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    // Limpar stream remoto
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    this.videoElement.srcObject = null;
    this.updateStatus('disconnected');
    console.log('✅ [SimpleViewer] Destruído com sucesso');
  }
}

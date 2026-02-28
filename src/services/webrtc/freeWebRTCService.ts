/**
 * 🆓 FREE WebRTC Service - 100% Gratuito e Eficaz
 * Baseado em WebRTC + WebSocket para sinalização
 * Inspirado no modelo fornecido pelo usuário
 */

export type WebRTCRole = 'publisher' | 'viewer';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  websocketUrl?: string;
}

export interface StreamMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-room' | 'leave-room' | 'chat';
  streamId: string;
  userId: string;
  data?: RTCSessionDescriptionInit | RTCIceCandidate | unknown;
  message?: string;
}

export class FreeWebRTCService {
  private role: WebRTCRole;
  private streamId: string;
  private userId: string;
  private websocket: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private status: ConnectionStatus = 'disconnected';
  
  // Callbacks
  private onStatusChangeCallback: ((status: ConnectionStatus) => void) | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onLocalStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private onChatMessageCallback: ((message: string, userId: string) => void) | null = null;

  // Configuração WebRTC
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ]
  };

  constructor(role: WebRTCRole, streamId: string, userId: string, config?: Partial<WebRTCConfig>) {
    this.role = role;
    this.streamId = streamId;
    this.userId = userId;
    
    if (config?.iceServers) {
      this.rtcConfig.iceServers = config.iceServers;
    }
    
    console.log(`🆓 [FreeWebRTC] Inicializando ${role} para stream ${streamId}`);
  }

  /**
   * Inicializar serviço WebRTC
   */
  async initialize(): Promise<boolean> {
    try {
      console.log(`🚀 [FreeWebRTC] Iniciando ${this.role}...`);
      
      // 1. Conectar ao WebSocket
      await this.connectWebSocket();
      
      // 2. Configurar WebRTC
      this.setupPeerConnection();
      
      // 3. Se é publisher, capturar mídia local
      if (this.role === 'publisher') {
        await this.startCapture();
      }
      
      // 4. Entrar na sala
      this.joinRoom();
      
      this.setStatus('connecting');
      return true;
      
    } catch (error) {
      console.error('❌ [FreeWebRTC] Erro na inicialização:', error);
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Conectar ao WebSocket para sinalização
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Usar WebSocket do próprio servidor (mesma origem)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log('🌐 [FreeWebRTC] Conectando WebSocket:', wsUrl);
        
        // Fallback para servidor local em desenvolvimento
        const fallbackUrl = 'ws://127.0.0.1:8095/ws';
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
          console.log('✅ [FreeWebRTC] WebSocket conectado');
          resolve();
        };
        
        this.websocket.onerror = (error) => {
          console.warn('⚠️ [FreeWebRTC] Erro WebSocket principal, tentando fallback...');
          
          // Tentar fallback
          this.websocket = new WebSocket(fallbackUrl);
          
          this.websocket.onopen = () => {
            console.log('✅ [FreeWebRTC] WebSocket fallback conectado');
            resolve();
          };
          
          this.websocket.onerror = () => {
            console.error('❌ [FreeWebRTC] Todos os WebSockets falharam');
            reject(new Error('Não foi possível conectar ao servidor de sinalização'));
          };
          
          this.setupWebSocketHandlers();
        };
        
        this.setupWebSocketHandlers();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Configurar handlers do WebSocket
   */
  private setupWebSocketHandlers(): void {
    if (!this.websocket) return;

    this.websocket.onmessage = async (event) => {
      try {
        const message: StreamMessage = JSON.parse(event.data);
        
        // Ignorar mensagens próprias
        if (message.userId === this.userId) return;
        
        console.log('📨 [FreeWebRTC] Mensagem recebida:', message.type);
        
        await this.handleWebSocketMessage(message);
        
      } catch (error) {
        console.error('❌ [FreeWebRTC] Erro ao processar mensagem:', error);
      }
    };

    this.websocket.onclose = () => {
      console.log('🔌 [FreeWebRTC] WebSocket desconectado');
      this.setStatus('disconnected');
    };

    this.websocket.onerror = (error) => {
      console.error('❌ [FreeWebRTC] Erro WebSocket:', error);
      this.handleError(new Error('Erro de comunicação com servidor'));
    };
  }

  /**
   * Processar mensagens do WebSocket
   */
  private async handleWebSocketMessage(message: StreamMessage): Promise<void> {
    switch (message.type) {
      case 'offer':
        if (this.role === 'viewer') {
          await this.handleOffer(message.data as RTCSessionDescriptionInit);
        }
        break;
        
      case 'answer':
        if (this.role === 'publisher') {
          await this.handleAnswer(message.data as RTCSessionDescriptionInit);
        }
        break;
        
      case 'ice-candidate':
        await this.handleIceCandidate(message.data as RTCIceCandidate);
        break;
        
      case 'chat':
        if (this.onChatMessageCallback) {
          this.onChatMessageCallback(message.message || '', message.userId);
        }
        break;
        
      default:
        console.log('🤷 [FreeWebRTC] Tipo de mensagem desconhecido:', message.type);
    }
  }

  /**
   * Configurar conexão WebRTC
   */
  private setupPeerConnection(): void {
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);
    
    // Handler para candidatos ICE
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendMessage({
          type: 'ice-candidate',
          streamId: this.streamId,
          userId: this.userId,
          data: event.candidate
        });
      }
    };

    // Handler para stream remoto (viewers)
    this.peerConnection.ontrack = (event) => {
      console.log('🎥 [FreeWebRTC] Stream remoto recebido');
      this.remoteStream = event.streams[0];
      
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
      
      this.setStatus('connected');
    };

    // Handler para mudanças de estado da conexão
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('🔄 [FreeWebRTC] Estado da conexão:', state);
      
      switch (state) {
        case 'connected':
          this.setStatus('connected');
          break;
        case 'failed':
        case 'closed':
          this.setStatus('failed');
          break;
        case 'connecting':
          this.setStatus('connecting');
          break;
      }
    };
  }

  /**
   * Capturar mídia local (publisher)
   */
  private async startCapture(): Promise<void> {
    try {
      console.log('📹 [FreeWebRTC] Capturando mídia local...');
      
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      
      console.log('✅ [FreeWebRTC] Mídia local capturada');
      
      // Adicionar tracks à conexão WebRTC
      if (this.peerConnection) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }
      
      if (this.onLocalStreamCallback) {
        this.onLocalStreamCallback(this.localStream);
      }
      
    } catch (error) {
      console.error('❌ [FreeWebRTC] Erro ao capturar mídia:', error);
      throw new Error('Não foi possível acessar câmera/microfone');
    }
  }

  /**
   * Entrar na sala de transmissão
   */
  private joinRoom(): void {
    this.sendMessage({
      type: 'join-room',
      streamId: this.streamId,
      userId: this.userId,
      data: { role: this.role }
    });

    // Se é publisher, criar oferta
    if (this.role === 'publisher') {
      setTimeout(() => this.createOffer(), 1000);
    }
  }

  /**
   * Criar oferta (publisher)
   */
  private async createOffer(): Promise<void> {
    if (!this.peerConnection) return;
    
    try {
      console.log('📤 [FreeWebRTC] Criando oferta...');
      
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.sendMessage({
        type: 'offer',
        streamId: this.streamId,
        userId: this.userId,
        data: offer
      });
      
      console.log('✅ [FreeWebRTC] Oferta enviada');
      
    } catch (error) {
      console.error('❌ [FreeWebRTC] Erro ao criar oferta:', error);
      this.handleError(error instanceof Error ? error : new Error('Erro ao criar oferta'));
    }
  }

  /**
   * Processar oferta (viewer)
   */
  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    
    try {
      console.log('📥 [FreeWebRTC] Processando oferta...');
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.sendMessage({
        type: 'answer',
        streamId: this.streamId,
        userId: this.userId,
        data: answer
      });
      
      console.log('✅ [FreeWebRTC] Resposta enviada');
      
    } catch (error) {
      console.error('❌ [FreeWebRTC] Erro ao processar oferta:', error);
      this.handleError(error instanceof Error ? error : new Error('Erro ao processar oferta'));
    }
  }

  /**
   * Processar resposta (publisher)
   */
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    
    try {
      console.log('📥 [FreeWebRTC] Processando resposta...');
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      
      console.log('✅ [FreeWebRTC] Resposta processada');
      
    } catch (error) {
      console.error('❌ [FreeWebRTC] Erro ao processar resposta:', error);
      this.handleError(error instanceof Error ? error : new Error('Erro ao processar resposta'));
    }
  }

  /**
   * Processar candidato ICE
   */
  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;
    
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('🧊 [FreeWebRTC] Candidato ICE adicionado');
      
    } catch (error) {
      console.error('❌ [FreeWebRTC] Erro ao adicionar candidato ICE:', error);
    }
  }

  /**
   * Enviar mensagem via WebSocket
   */
  private sendMessage(message: StreamMessage): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ [FreeWebRTC] WebSocket não conectado, mensagem perdida');
    }
  }

  /**
   * Enviar mensagem de chat
   */
  sendChatMessage(message: string): void {
    this.sendMessage({
      type: 'chat',
      streamId: this.streamId,
      userId: this.userId,
      message: message
    });
  }

  /**
   * Compartilhar tela (publisher)
   */
  async shareScreen(): Promise<boolean> {
    if (this.role !== 'publisher') return false;
    
    try {
      console.log('🖥️ [FreeWebRTC] Iniciando compartilhamento de tela...');
      
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true, 
        audio: true 
      });
      
      // Substituir tracks de vídeo
      if (this.peerConnection && this.localStream) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = this.peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }
      
      console.log('✅ [FreeWebRTC] Compartilhamento de tela iniciado');
      return true;
      
    } catch (error) {
      console.error('❌ [FreeWebRTC] Erro ao compartilhar tela:', error);
      return false;
    }
  }

  /**
   * Parar transmissão
   */
  async stop(): Promise<void> {
    console.log('🛑 [FreeWebRTC] Parando transmissão...');
    
    // Fechar streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
    
    // Fechar conexão WebRTC
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Sair da sala
    this.sendMessage({
      type: 'leave-room',
      streamId: this.streamId,
      userId: this.userId
    });
    
    // Fechar WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.setStatus('disconnected');
    console.log('✅ [FreeWebRTC] Transmissão parada');
  }

  /**
   * Callbacks
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.onStatusChangeCallback = callback;
  }

  onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback;
  }

  onLocalStream(callback: (stream: MediaStream) => void): void {
    this.onLocalStreamCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  onChatMessage(callback: (message: string, userId: string) => void): void {
    this.onChatMessageCallback = callback;
  }

  /**
   * Getters
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Utilitários privados
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      console.log(`📊 [FreeWebRTC] Status: ${status}`);
      
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback(status);
      }
    }
  }

  private handleError(error: Error): void {
    console.error('💥 [FreeWebRTC] Erro:', error);
    this.setStatus('failed');
    
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }
} 
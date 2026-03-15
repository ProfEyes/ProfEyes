import Peer, { MediaConnection } from 'peerjs';
import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Status da conexão PeerJS
export type PeerConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

// Interface para estatísticas da transmissão
export interface StreamStats {
  bitrate?: number;
  packetsLost?: number;
  frameRate?: number;
  resolution?: { width: number; height: number };
  viewerCount?: number;
  bandwidthUsage?: number;
  cpuUsage?: number;
  qualityScore?: number;
  timestamp?: number;
}

// Configurações para o serviço PeerJS
export interface PeerConfig {
  host?: string;
  port?: number;
  path?: string; 
  secure?: boolean;
  debug?: number; // 0 = desativado, 1 = erros, 2 = avisos, 3 = completo
  config?: {
    iceServers: RTCIceServer[];
  };
}

/**
 * Configuração de servidores PeerJS com fallback
 */
const PEER_SERVERS = [
  // Servidor principal - PeerJS oficial
  {
    host: 'broker-cloud.millicast.com',
    port: 443,
    path: '/peerjs',
    secure: true,
    name: 'Millicast PeerJS'
  },
  // Fallback 1 - Servidor PeerJS original
  {
  host: '0.peerjs.com',
    port: 443,
    path: '/',
  secure: true,
    name: 'PeerJS Official'
  },
  // Fallback 2 - Servidor CDN alternativo
  {
    secure: true,
    name: 'PeerJS CDN Default',
    // Sem host específico, usa o padrão do PeerJS
  },
  // Fallback 3 - Servidor alternativo para produção
  {
    host: 'peerjs.92k.de',
  port: 443,
  path: '/',
    secure: true,
    name: 'Alternative PeerJS Server'
  }
];

/**
 * Configuração padrão do PeerJS para compatibilidade
 */
export const DEFAULT_PEER_CONFIG = {
  host: '0.peerjs.com',
  port: 443,
  path: '/',
  secure: true,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'turn:0.peerjs.com:3478', username: 'peerjs', credential: 'peerjsp' }
    ]
  }
};

/**
 * Criar configuração PeerJS com fallback automático
 */
const createPeerConfig = (serverIndex: number = 0): PeerConfig => {
  const server = PEER_SERVERS[serverIndex];
  
  return {
    ...server,
    debug: 2, // Reduzir debug para produção
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    }
  };
};

/**
 * Gerar ID único para evitar conflitos
 */
const generateUniqueId = (prefix: string, userId: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${userId}-${timestamp}-${random}`;
};

/**
 * Sistema de Heartbeat para verificar se publisher está ativo
 */
class PublisherHeartbeat {
  private static instance: PublisherHeartbeat;
  private activePublishers: Map<string, { lastSeen: number; peerId: string }> = new Map();
  private heartbeatInterval: number | null = null;

  static getInstance(): PublisherHeartbeat {
    if (!PublisherHeartbeat.instance) {
      PublisherHeartbeat.instance = new PublisherHeartbeat();
    }
    return PublisherHeartbeat.instance;
  }

  startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = window.setInterval(() => {
      const now = Date.now();
      // Remove publishers que não foram vistos há mais de 30 segundos
      for (const [publisherId, data] of this.activePublishers) {
        if (now - data.lastSeen > 30000) {
          console.log('💔 [Heartbeat] Publisher inativo removido:', publisherId);
          this.activePublishers.delete(publisherId);
        }
      }
    }, 10000); // Verifica a cada 10 segundos
  }

  registerPublisher(publisherId: string, peerId: string) {
    console.log('💓 [Heartbeat] Publisher registrado:', { publisherId, peerId });
    this.activePublishers.set(publisherId, {
      lastSeen: Date.now(),
      peerId
    });
    this.startHeartbeat();
  }

  updatePublisherHeartbeat(publisherId: string) {
    const publisher = this.activePublishers.get(publisherId);
    if (publisher) {
      publisher.lastSeen = Date.now();
      console.log('💓 [Heartbeat] Publisher atualizado:', publisherId);
    }
  }

  isPublisherActive(publisherId: string): boolean {
    const publisher = this.activePublishers.get(publisherId);
    if (!publisher) return false;
    
    const timeSinceLastSeen = Date.now() - publisher.lastSeen;
    return timeSinceLastSeen < 30000; // Ativo se visto nos últimos 30 segundos
  }

  getPublisherPeerId(publisherId: string): string | null {
    const publisher = this.activePublishers.get(publisherId);
    return publisher ? publisher.peerId : null;
  }

  unregisterPublisher(publisherId: string) {
    console.log('💔 [Heartbeat] Publisher removido:', publisherId);
    this.activePublishers.delete(publisherId);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

/**
 * Classe para transmissão usando PeerJS (Publisher)
 */
export class PeerPublisher {
  private peer: Peer | null = null;
  private myStream: MediaStream | null = null;
  private userId: string;
  private streamId: string;
  private peerId: string;
  private connections: Record<string, MediaConnection> = {};
  private statusChangeCallback: ((status: PeerConnectionStatus) => void) | null = null;
  private viewerConnectedCallback: ((viewerId: string) => void) | null = null;
  private viewerDisconnectedCallback: ((viewerId: string) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private onStatsCallback: ((stats: StreamStats) => void) | null = null;
  private currentStatus: PeerConnectionStatus = 'disconnected';
  private statsInterval: number | null = null;
  private heartbeatInterval: number | null = null;
  private heartbeat = PublisherHeartbeat.getInstance();
  
  constructor(userId: string, streamId: string) {
    this.userId = userId;
    this.streamId = streamId;
    this.peerId = generateUniqueId('pub', userId);
    console.log('🏗️ [PeerPublisher] Construtor chamado:', { userId, streamId, peerId: this.peerId });
  }
  
  /**
   * Inicializar o serviço PeerJS para transmissão
   */
  async initialize(stream: MediaStream): Promise<boolean> {
    console.log('🔄 [PeerPublisher] Iniciando inicialização com stream:', {
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
      peerId: this.peerId,
      userId: this.userId,
      streamId: this.streamId
    });

    if (!this.userId || !stream) {
      console.error('❌ [PeerPublisher] Falha na inicialização: parâmetros inválidos', {
        userId: !!this.userId,
        stream: !!stream
      });
      return false;
    }

    try {
      this.myStream = stream;
      this.setStatus('connecting');
      
      console.log('🔧 [PeerPublisher] Configurando instância Peer para ID:', this.peerId);
      
      // Tentar conectar com fallback de servidores
      let peerCreated = false;
      for (let serverIndex = 0; serverIndex < PEER_SERVERS.length && !peerCreated; serverIndex++) {
        try {
          console.log(`🌐 [PeerPublisher] Tentando servidor ${serverIndex + 1}/${PEER_SERVERS.length}: ${PEER_SERVERS[serverIndex].name}`);
          
          this.peer = new Peer(this.peerId, createPeerConfig(serverIndex));
          
          const success = await new Promise<boolean>((resolve) => {
        if (!this.peer) {
          resolve(false);
          return;
        }

            let resolved = false;
            const timeout = setTimeout(() => {
              if (!resolved) {
                console.error(`⏱️ [PeerPublisher] Timeout no servidor ${PEER_SERVERS[serverIndex].name}`);
                resolved = true;
                resolve(false);
              }
            }, 10000);

        this.peer.on('open', (id) => {
              if (resolved) return;
              resolved = true;
              clearTimeout(timeout);
              
              console.log('✅ [PeerPublisher] Peer conectado com ID:', id);
              console.log('🔄 [PeerPublisher] Iniciando configuração do publisher...');
              
              // Garantir que o peerId está correto
              this.peerId = id;
              
              // Configurar eventos do peer
              this.setupPeerEvents();
              
              // Salvar informações no banco de dados
              this.savePublisherInfo(this.peerId);
              
              // Atualizar status
          this.setStatus('connected');
              
              // Configurar heartbeat e estatísticas
              this.heartbeat.registerPublisher(this.userId, this.peerId);
              this.startHeartbeatUpdates();
              
              if (this.onStatsCallback) {
                this.setupStatsReporting();
              }
              
              console.log('🎉 [PeerPublisher] Publisher inicializado com sucesso!');
              console.log('📊 [PeerPublisher] Estatísticas:', {
                peerId: this.peerId,
                userId: this.userId,
                streamId: this.streamId,
                connections: Object.keys(this.connections).length,
                streamTracks: {
                  video: this.myStream?.getVideoTracks().length || 0,
                  audio: this.myStream?.getAudioTracks().length || 0
                }
              });
              
          resolve(true);
        });

            this.peer.on('error', (err) => {
              if (resolved) return;
              resolved = true;
              clearTimeout(timeout);
              
              console.error(`💥 [PeerPublisher] Erro no servidor ${PEER_SERVERS[serverIndex].name}:`, err);
              resolve(false);
            });

            this.peer.on('disconnected', () => {
              if (resolved) return;
              console.warn(`🔌 [PeerPublisher] Desconectado do servidor ${PEER_SERVERS[serverIndex].name}`);
              
              // Tentar reconectar ao mesmo servidor
              setTimeout(() => {
                if (this.peer && !this.peer.destroyed) {
                  console.log('🔄 [PeerPublisher] Tentando reconectar...');
                  this.peer.reconnect();
                }
              }, 3000);
          });
        });
          
          if (success) {
            peerCreated = true;
            console.log(`✅ [PeerPublisher] Conectado com sucesso ao servidor: ${PEER_SERVERS[serverIndex].name}`);
            break;
          } else {
            console.warn(`⚠️ [PeerPublisher] Falha no servidor: ${PEER_SERVERS[serverIndex].name}`);
            if (this.peer) {
              this.peer.destroy();
              this.peer = null;
            }
          }
        } catch (serverError) {
          console.error(`💥 [PeerPublisher] Erro crítico no servidor ${PEER_SERVERS[serverIndex].name}:`, serverError);
          if (this.peer) {
            this.peer.destroy();
            this.peer = null;
          }
        }
        
        // Delay entre tentativas de servidor
        if (!peerCreated && serverIndex < PEER_SERVERS.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!peerCreated) {
        console.error('❌ [PeerPublisher] Falha em todos os servidores PeerJS');
        this.setStatus('failed');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('💥 [PeerPublisher] Erro crítico na inicialização:', error);
      this.setStatus('failed');
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }
  
  /**
   * Configurar eventos do peer
   */
  private setupPeerEvents(): void {
    if (!this.peer) return;

        this.peer.on('call', (call) => {
          const viewerId = call.peer;
      console.log('📞 [PeerPublisher] Recebendo chamada de viewer:', viewerId);
          
          try {
            // ✅ VALIDAÇÃO: Verificar se a stream está válida antes de responder
            if (!this.myStream) {
              console.error('❌ [PeerPublisher] myStream está NULL! Não pode responder à chamada.');
              return;
            }
            
            const videoTracks = this.myStream.getVideoTracks();
            const audioTracks = this.myStream.getAudioTracks();
            
            console.log('📤 [PeerPublisher] Respondendo chamada com stream local:', {
              streamId: this.myStream.id,
              videoTracks: videoTracks.length,
              audioTracks: audioTracks.length,
              videoEnabled: videoTracks[0]?.enabled,
              audioEnabled: audioTracks[0]?.enabled,
              videoReadyState: videoTracks[0]?.readyState,
              audioReadyState: audioTracks[0]?.readyState,
              streamActive: this.myStream.active
            });
            
            // ✅ CORREÇÃO: Adicionar metadata e configurar listeners ANTES de responder
            call.on('error', (err) => {
              console.error('💥 [PeerPublisher] Erro na chamada ao responder:', err);
            });
            
            // ✅ Log quando a conexão for estabelecida
            call.peerConnection.oniceconnectionstatechange = () => {
              console.log('🔗 [PeerPublisher] ICE Connection State com viewer:', call.peerConnection.iceConnectionState);
            };
            
            call.peerConnection.onconnectionstatechange = () => {
              console.log('🔗 [PeerPublisher] Connection State com viewer:', call.peerConnection.connectionState);
            };
            
            // ✅ IMPORTANTE: Responder com a stream
            console.log('🎬 [PeerPublisher] Executando call.answer()...');
            call.answer(this.myStream);
            console.log('✅ [PeerPublisher] call.answer() executado com sucesso');
            
            this.connections[viewerId] = call;
            console.log('👥 [PeerPublisher] Total de conexões após resposta:', Object.keys(this.connections).length);
            
            if (this.viewerConnectedCallback) {
              console.log('🔔 [PeerPublisher] Notificando novo espectador:', viewerId);
              this.viewerConnectedCallback(viewerId);
            }

            call.on('close', () => {
              console.log('🚪 [PeerPublisher] Chamada fechada pelo espectador:', viewerId);
              delete this.connections[viewerId];
              console.log('👥 [PeerPublisher] Total de conexões após fechamento:', Object.keys(this.connections).length);
              
              if (this.viewerDisconnectedCallback) {
                console.log('🔔 [PeerPublisher] Notificando desconexão de espectador:', viewerId);
                this.viewerDisconnectedCallback(viewerId);
              }
            });

            call.on('error', (err) => {
              console.error('💥 [PeerPublisher] Erro na chamada com espectador:', viewerId, err);
          delete this.connections[viewerId];
              if (this.errorCallback) {
                this.errorCallback(err);
              }
            });
          } catch (error) {
            console.error('💥 [PeerPublisher] Erro ao responder chamada:', error);
            if (this.errorCallback) {
              this.errorCallback(error instanceof Error ? error : new Error(String(error)));
            }
          }
        });
  }
  
  /**
   * Configurar coleta de estatísticas
   */
  private setupStatsReporting(): void {
    // Limpar intervalo anterior se existir
    if (this.statsInterval) {
      window.clearInterval(this.statsInterval);
    }
    
    // Coletar estatísticas a cada 5 segundos
    this.statsInterval = window.setInterval(() => {
      if (Object.keys(this.connections).length === 0 || !this.onStatsCallback) return;
      
      // Como exemplo, apenas reportamos o número de espectadores
      const stats: StreamStats = {
        viewerCount: this.getViewerCount(),
        bandwidthUsage: 0, // Placeholders - implementação real usaria getStats() da RTCPeerConnection
        cpuUsage: 0,
        qualityScore: 100,
        timestamp: Date.now()
      };
      
      this.onStatsCallback(stats);
    }, 5000);
  }
  
  /**
   * Atualizar o status da transmissão no banco de dados
   */
  private async updateStreamStatus(status: 'live' | 'ended'): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString()
      };
      
      if (status === 'live') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'ended') {
        updateData.ended_at = new Date().toISOString();
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('live_streams')
        .update(updateData)
        .eq('id', this.streamId);
      
      console.log(`Status da transmissão atualizado para: ${status}`);
    } catch (error) {
      console.error('Erro ao atualizar status da transmissão:', error);
    }
  }
  
  /**
   * Atualizar contagem de espectadores no banco de dados
   */
  private async updateViewerCount(): Promise<void> {
    try {
      const viewerCount = Object.keys(this.connections).length;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('live_streams')
        .update({ viewer_count: viewerCount, updated_at: new Date().toISOString() })
        .eq('id', this.streamId);
      
      console.log(`Contagem de espectadores atualizada: ${viewerCount}`);
    } catch (error) {
      console.error('Erro ao atualizar contagem de espectadores:', error);
    }
  }
  
  /**
   * Atualizar status da conexão
   */
  private setStatus(status: PeerConnectionStatus): void {
    console.log(`🔄 [PeerPublisher] Alterando status: ${this.currentStatus} -> ${status}`);
    this.currentStatus = status;
    if (this.statusChangeCallback) {
      this.statusChangeCallback(status);
    }
  }
  
  /**
   * Tratar erros
   */
  private handleError(error: Error): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }
  
  /**
   * Limpar recursos
   */
  private cleanup(): void {
    // Parar coleta de estatísticas
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    
    // Fechar conexões com espectadores
    Object.values(this.connections).forEach((connection) => {
      connection.close();
    });
    this.connections = {};
    
    // Parar trilhas do stream local
    if (this.myStream) {
      this.myStream.getTracks().forEach(track => track.stop());
      this.myStream = null;
    }
  }
  
  /**
   * Parar a transmissão e limpar recursos
   */
  async stop(): Promise<void> {
    console.log('🛑 [PeerPublisher] Parando transmissão...');
    
    try {
      this.setStatus('disconnected');
      
      // Parar heartbeat
      if (this.heartbeatInterval) {
        window.clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      // Remover do sistema de heartbeat
      this.heartbeat.unregisterPublisher(this.userId);
      
      // Fechar todas as conexões com espectadores
      for (const [viewerId, connection] of Object.entries(this.connections)) {
        console.log('🚪 [PeerPublisher] Fechando conexão com espectador:', viewerId);
        connection.close();
      }
      this.connections = {};
      
      // Atualizar status no banco para 'ended'
      await this.updateStreamStatus('ended');
      
      // Parar o peer
      if (this.peer && !this.peer.destroyed) {
        console.log('🔌 [PeerPublisher] Destruindo peer');
      this.peer.destroy();
      }
      this.peer = null;
      
      // Limpar estatísticas
      this.cleanup();
      
      console.log('✅ [PeerPublisher] Transmissão parada com sucesso');
    } catch (error) {
      console.error('💥 [PeerPublisher] Erro ao parar transmissão:', error);
      throw error;
    }
  }
  
  /**
   * Registrar callback para mudanças de status
   */
  onStatusChange(callback: (status: PeerConnectionStatus) => void): void {
    this.statusChangeCallback = callback;
  }
  
  /**
   * Registrar callback para quando um espectador se conecta
   */
  onViewerConnected(callback: (viewerId: string) => void): void {
    this.viewerConnectedCallback = callback;
  }
  
  /**
   * Registrar callback para quando um espectador se desconecta
   */
  onViewerDisconnected(callback: (viewerId: string) => void): void {
    this.viewerDisconnectedCallback = callback;
  }
  
  /**
   * Registrar callback para erros
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }
  
  /**
   * Registrar callback para estatísticas
   */
  onStats(callback: (stats: StreamStats) => void): void {
    this.onStatsCallback = callback;
  }
  
  /**
   * Obter status atual da conexão
   */
  getStatus(): PeerConnectionStatus {
    return this.currentStatus;
  }
  
  /**
   * Obter quantidade de espectadores conectados
   */
  getViewerCount(): number {
    return Object.keys(this.connections).length;
  }

  /**
   * Salvar informações do publisher no banco de dados
   */
  private async savePublisherInfo(peerId: string, retryCount: number = 0) {
    const maxRetries = 3;
    
    try {
      console.log('💾 [PeerPublisher] Tentando salvar peer ID no banco:', {
        peerId,
        streamId: this.streamId,
        userId: this.userId,
        retry: retryCount
      });

      const { supabase } = await import('@/lib/supabase');
      
      // Primeiro, verificar se o stream existe
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingStream, error: checkError } = await (supabase as any).from('live_streams')
        .select('id, user_id, status, peer_id')
        .eq('id', this.streamId)
        .single();
        
      if (checkError) {
        console.error('❌ [PeerPublisher] Erro ao verificar stream existente:', checkError);
        if (retryCount < maxRetries) {
          setTimeout(() => this.savePublisherInfo(peerId, retryCount + 1), 2000);
        }
        return;
      }

      console.log('📋 [PeerPublisher] Stream encontrado:', existingStream);

      // Verificar se o user_id confere
      if ((existingStream as { user_id: string }).user_id !== this.userId) {
        console.error('❌ [PeerPublisher] ERRO: user_id do stream não confere!', {
          expected: this.userId,
          actual: (existingStream as { user_id: string }).user_id
        });
        return;
      }

      // Salvar o peer_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from('live_streams')
        .update({
          peer_id: peerId,
          status: 'live',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.streamId)
        .eq('user_id', this.userId) // Segurança extra
        .select();

      if (error) {
        console.error('❌ [PeerPublisher] Erro ao salvar peer ID:', error);
        if (retryCount < maxRetries) {
          console.log(`🔄 [PeerPublisher] Tentando novamente em 2s (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => this.savePublisherInfo(peerId, retryCount + 1), 2000);
        } else {
          console.error('💥 [PeerPublisher] Esgotadas tentativas de salvar peer ID');
        }
      } else {
        console.log('✅ [PeerPublisher] Peer ID salvo no banco com sucesso:', {
          peerId,
          streamData: data
        });

        // Verificar se realmente foi salvo
        setTimeout(() => this.verifyPeerIdSaved(peerId), 1000);
        
        // Registrar no heartbeat local para outros componentes encontrarem
        this.heartbeat.registerPublisher(this.userId, peerId);
      }
    } catch (error) {
      console.error('💥 [PeerPublisher] Erro crítico ao salvar peer ID:', error);
      if (retryCount < maxRetries) {
        setTimeout(() => this.savePublisherInfo(peerId, retryCount + 1), 2000);
      }
    }
  }

  /**
   * Verificar se o peer ID foi realmente salvo no banco
   */
  private async verifyPeerIdSaved(peerId: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from('live_streams')
        .select('id, peer_id, status, user_id')
        .eq('id', this.streamId)
        .single();

      if (error) {
        console.error('❌ [PeerPublisher] Erro ao verificar peer ID salvo:', error);
      } else {
        console.log('🔍 [PeerPublisher] Verificação do peer ID salvo:', {
          expected: peerId,
          actual: (data as { peer_id: string }).peer_id,
          match: (data as { peer_id: string }).peer_id === peerId,
          streamData: data
        });

        if ((data as { peer_id: string }).peer_id !== peerId) {
          console.error('🚨 [PeerPublisher] ATENÇÃO: Peer ID no banco não confere!');
          // Tentar salvar novamente
          this.savePublisherInfo(peerId);
        }
      }
    } catch (error) {
      console.error('💥 [PeerPublisher] Erro ao verificar peer ID:', error);
    }
  }

  /**
   * Iniciar atualizações de heartbeat
   */
  private startHeartbeatUpdates() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = window.setInterval(() => {
      if (this.currentStatus === 'connected') {
        this.heartbeat.updatePublisherHeartbeat(this.userId);
      }
    }, 5000); // Atualiza a cada 5 segundos
  }

  getPeerId(): string {
    return this.peerId;
  }
}

/**
 * Classe para visualização usando PeerJS (Viewer)
 */
export class PeerViewer {
  private peer: Peer | null = null;
  private viewerId: string;
  private publisherId: string;
  private publisherPeerId: string | null = null;
  private mediaConnection: MediaConnection | null = null;
  private remoteVideoRef: React.RefObject<HTMLVideoElement> | HTMLVideoElement | null = null;
  private statusChangeCallback: ((status: PeerConnectionStatus) => void) | null = null;
  private streamAddedCallback: ((stream: MediaStream) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private currentStatus: PeerConnectionStatus = 'disconnected';
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;
  private retryInterval: number = 2000; // 2 segundos entre tentativas
  private heartbeat = PublisherHeartbeat.getInstance();

  constructor(viewerId: string, publisherId: string, remoteVideoRef: React.RefObject<HTMLVideoElement> | HTMLVideoElement) {
    this.viewerId = generateUniqueId('viewer', viewerId);
    this.publisherId = publisherId;
    this.remoteVideoRef = remoteVideoRef;
    console.log('🏗️ [PeerViewer] Construtor chamado:', { 
      viewerId: this.viewerId,
      publisherId: this.publisherId,
      hasVideoRef: !!(remoteVideoRef && (
        (remoteVideoRef as React.RefObject<HTMLVideoElement>).current || 
        (remoteVideoRef as HTMLVideoElement).tagName === 'VIDEO'
      ))
    });
  }

  private getVideoElement(): HTMLVideoElement | null {
    if (this.remoteVideoRef) {
      // Se é um React.RefObject
      if ('current' in this.remoteVideoRef) {
        return this.remoteVideoRef.current;
      }
      // Se é um HTMLVideoElement direto
      if ('tagName' in this.remoteVideoRef && this.remoteVideoRef.tagName === 'VIDEO') {
        return this.remoteVideoRef as HTMLVideoElement;
      }
    }
    return null;
  }

  /**
   * Inicializar conexão com publisher
   */
  async initialize(): Promise<boolean> {
    console.log('🔍 [PeerViewer] Iniciando inicialização avançada:', {
      viewerId: this.viewerId,
      publisherId: this.publisherId,
      hasVideoRef: !!this.remoteVideoRef
    });

    if (!this.publisherId || !this.remoteVideoRef) {
      console.error('❌ [PeerViewer] Inicialização falhou: parâmetros inválidos');
      this.handleError(new Error('Publisher ID ou elemento de vídeo não fornecido'));
      return false;
    }

    try {
      this.setStatus('connecting');
      
      // FASE 1: Verificar disponibilidade do publisher no banco
      console.log('🔍 [PeerViewer] FASE 1: Verificando disponibilidade do publisher...');
      const publisherAvailable = await this.checkPublisherAvailability();
      
      if (!publisherAvailable) {
        console.error('❌ [PeerViewer] Publisher não está disponível ou não registrado');
          this.setStatus('failed');
        this.handleError(new Error('A transmissão não está ativa no momento. Aguarde o streamer iniciar.'));
        return false;
      }
      
      console.log('✅ [PeerViewer] Publisher está disponível, prosseguindo...');
      
      // FASE 2: Inicializar conexão PeerJS com retry inteligente
      console.log('🔍 [PeerViewer] FASE 2: Inicializando conexão PeerJS...');
      const peerConnected = await this.initializePeerConnection();
      
      if (!peerConnected) {
        console.error('❌ [PeerViewer] Falha na inicialização do peer');
          this.setStatus('failed');
        this.handleError(new Error('Não foi possível estabelecer conexão P2P'));
        return false;
      }
      
      // FASE 3: Conectar ao publisher
      console.log('🔍 [PeerViewer] FASE 3: Conectando ao publisher...');
      const connected = await this.connectToPublisher();
      
      if (connected) {
        console.log('🎉 [PeerViewer] Conexão estabelecida com sucesso!');
        this.setStatus('connected');
        return true;
      } else {
        console.error('❌ [PeerViewer] Falha na conexão com publisher');
        this.setStatus('failed');
        this.handleError(new Error('Não foi possível conectar à transmissão'));
        return false;
      }
    } catch (error) {
      console.error('💥 [PeerViewer] Erro crítico na inicialização:', error);
      this.setStatus('failed');
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Verificar se o publisher está disponível no banco de dados
   */
  private async checkPublisherAvailability(): Promise<boolean> {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      console.log('🔍 [PeerViewer] Verificando disponibilidade do publisher:', this.publisherId);
      
      // Verificar se há uma stream ativa para este publisher
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: streamData, error: streamError } = await (supabase as any).from('live_streams')
        .select('id, status, peer_id, user_id, updated_at')
        .eq('user_id', this.publisherId)
        .eq('status', 'live')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (streamError) {
        console.error('❌ [PeerViewer] Erro ao verificar stream:', streamError);
        return false;
      }
      
      if (!streamData) {
        console.warn('⚠️ [PeerViewer] Nenhuma stream ativa encontrada para publisher:', this.publisherId);
        return false;
      }
      
      console.log('📊 [PeerViewer] Stream encontrada:', {
        id: (streamData as { id: string }).id,
        status: (streamData as { status: string }).status,
        peer_id: (streamData as { peer_id: string }).peer_id,
        user_id: (streamData as { user_id: string }).user_id,
        updated_at: (streamData as { updated_at: string }).updated_at
      });
      
      // Verificar se a stream foi atualizada recentemente (últimos 2 minutos = 120000ms)
      const lastUpdate = new Date((streamData as { updated_at: string }).updated_at);
      const now = new Date();
      const timeDiff = now.getTime() - lastUpdate.getTime();
      const maxInactiveTime = 120000; // 2 minutos
      
      if (timeDiff > maxInactiveTime) {
        const minutesAgo = Math.round(timeDiff / 60000);
        console.error(`❌ [PeerViewer] Stream inativa há ${minutesAgo} minutos. Última atualização: ${lastUpdate.toISOString()}`);
        console.error('❌ [PeerViewer] Esta transmissão provavelmente já terminou ou o streamer está offline.');
        return false; // ✅ REJEITAR streams antigas
      }
      
      console.log('✅ [PeerViewer] Stream foi atualizada recentemente (últimos 2 minutos)');
      
      // Verificar se há peer_id registrado
      if (!(streamData as { peer_id: string | null }).peer_id) {
        console.warn('⚠️ [PeerViewer] Stream ativa mas sem peer_id registrado. Aguardando...');
        
        // Aguardar alguns segundos para o publisher registrar o peer_id
        for (let i = 0; i < 6; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: retryData } = await (supabase as any).from('live_streams')
            .select('peer_id')
            .eq('id', (streamData as { id: string }).id)
            .single();
          
          if ((retryData as { peer_id: string | null })?.peer_id) {
            console.log('✅ [PeerViewer] Peer ID encontrado após aguardar:', (retryData as { peer_id: string }).peer_id);
            return true;
          }
          
          console.log(`⏳ [PeerViewer] Aguardando peer_id... tentativa ${i + 1}/6`);
        }
        
        console.error('❌ [PeerViewer] Timeout aguardando peer_id do publisher');
        return false;
      }
      
      console.log('✅ [PeerViewer] Publisher está disponível com peer_id:', (streamData as { peer_id: string }).peer_id);
      return true;
      
    } catch (error) {
      console.error('💥 [PeerViewer] Erro ao verificar disponibilidade:', error);
      return false;
    }
  }

  /**
   * Inicializar conexão PeerJS com múltiplos servidores
   */
  private async initializePeerConnection(): Promise<boolean> {
    const maxRetries = PEER_SERVERS.length;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const serverConfig = createPeerConfig(attempt);
        const serverName = PEER_SERVERS[attempt]?.name || `Servidor ${attempt + 1}`;
        
        console.log(`🌐 [PeerViewer] Tentando servidor ${attempt + 1}/${maxRetries}: ${serverName}`);
        
        this.peer = new Peer(this.viewerId, serverConfig);
        
        const connected = await new Promise<boolean>((resolve) => {
          let resolved = false;
          
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              console.error(`⏱️ [PeerViewer] Timeout no servidor: ${serverName}`);
              resolve(false);
            }
          }, 8000);
          
          this.peer!.on('open', (id) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              console.log(`✅ [PeerViewer] Conectado ao servidor: ${serverName} (ID: ${id})`);
              resolve(true);
            }
          });
          
          this.peer!.on('error', (err) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              console.error(`💥 [PeerViewer] Erro no servidor ${serverName}:`, err);
              resolve(false);
            }
          });
          
          this.peer!.on('disconnected', () => {
            console.warn(`🔌 [PeerViewer] Desconectado do servidor: ${serverName}`);
            if (!resolved && this.peer && !this.peer.destroyed) {
              console.log('🔄 [PeerViewer] Tentando reconectar...');
              this.peer.reconnect();
            }
          });
        });
        
        if (connected) {
          console.log(`🎉 [PeerViewer] Peer conectado com sucesso ao servidor: ${serverName}`);
          return true;
        } else {
          console.warn(`⚠️ [PeerViewer] Falha no servidor: ${serverName}`);
          if (this.peer) {
            this.peer.destroy();
            this.peer = null;
          }
        }
        
    } catch (error) {
        console.error(`💥 [PeerViewer] Erro crítico no servidor ${attempt + 1}:`, error);
        if (this.peer) {
          this.peer.destroy();
          this.peer = null;
        }
      }
      
      // Delay entre tentativas
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.error('❌ [PeerViewer] Falha em todos os servidores PeerJS');
    return false;
  }

  /**
   * Conectar ao publisher com retry inteligente
   */
  private async connectToPublisher(): Promise<boolean> {
    if (!this.peer) {
      console.error('❌ [PeerViewer] Peer não inicializado');
      return false;
    }
    
    // CORREÇÃO CRÍTICA: Obter o peer_id correto do publisher registrado no banco
    const actualPublisherPeerId = await this.getActualPublisherPeerId();
    if (!actualPublisherPeerId) {
      console.error('❌ [PeerViewer] Não foi possível obter o peer_id do publisher');
      return false;
    }
    
    console.log('🔍 [PeerViewer] Usando peer_id do publisher:', actualPublisherPeerId);
    
    const maxRetries = 5;
    const baseDelay = 2000;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`📞 [PeerViewer] Tentativa ${attempt + 1}/${maxRetries} de conexão com publisher peer_id: ${actualPublisherPeerId}`);
        
        // Verificar se o peer publisher ainda está ativo
        if (attempt > 0) {
          const stillActive = await this.checkPublisherStillActive(actualPublisherPeerId);
          if (!stillActive) {
            console.error('❌ [PeerViewer] Publisher não está mais ativo');
            return false;
          }
        }
        
        // Criar uma mídia stream vazia para a chamada (requerido pelo PeerJS)
        const dummyStream = new MediaStream();
        
        // CORREÇÃO: Usar o peer_id real em vez do userId
        const call = this.peer.call(actualPublisherPeerId, dummyStream);
        
        if (!call) {
          console.error(`❌ [PeerViewer] Falha ao criar chamada para peer_id: ${actualPublisherPeerId}`);
          if (attempt < maxRetries - 1) {
            console.log(`⏳ [PeerViewer] Aguardando ${baseDelay * (attempt + 1)}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, baseDelay * (attempt + 1)));
            continue;
          }
          return false;
        }
        
        // Aguardar resposta da chamada
        const streamReceived = await new Promise<boolean>((resolve) => {
          let resolved = false;
          
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              console.error(`⏱️ [PeerViewer] Timeout na chamada após 20s (tentativa ${attempt + 1})`);
              call.close();
              resolve(false);
            }
          }, 20000); // ✅ Aumentado de 10s para 20s
          
          // ✅ Adicionar log de progresso da conexão
          call.peerConnection.oniceconnectionstatechange = () => {
            console.log('🔗 [PeerViewer] ICE Connection State:', call.peerConnection.iceConnectionState);
          };
          
          call.peerConnection.onconnectionstatechange = () => {
            console.log('🔗 [PeerViewer] Connection State:', call.peerConnection.connectionState);
          };
          
          // ✅ FALLBACK: Verificar se a stream chega via evento 'track' (mais baixo nível)
          const receivedStreams = new Map<string, MediaStream>();
          call.peerConnection.ontrack = (event) => {
            console.log('🎵 [PeerViewer] Track recebido:', {
              kind: event.track.kind,
              id: event.track.id,
              readyState: event.track.readyState,
              streamsCount: event.streams.length
            });
            
            if (event.streams && event.streams.length > 0) {
              const stream = event.streams[0];
              if (!receivedStreams.has(stream.id)) {
                receivedStreams.set(stream.id, stream);
                console.log('📺 [PeerViewer] Stream completa montada via ontrack:', {
                  streamId: stream.id,
                  videoTracks: stream.getVideoTracks().length,
                  audioTracks: stream.getAudioTracks().length
                });
                
                // Se temos todos os tracks necessários, processar a stream
                if (stream.getTracks().length >= 2 && !resolved) { // Esperando vídeo + áudio
                  resolved = true;
                  clearTimeout(timeout);
                  console.log('✅ [PeerViewer] Stream recebida via ontrack (fallback)!');
                  this.handleStreamReceived(stream);
                  resolve(true);
                }
              }
            }
          };
          
          call.on('stream', (remoteStream) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              
              console.log('🎥 [PeerViewer] Stream recebido:', {
                streamId: remoteStream.id,
          videoTracks: remoteStream.getVideoTracks().length,
                audioTracks: remoteStream.getAudioTracks().length
              });
              
              this.handleStreamReceived(remoteStream);
              resolve(true);
            }
          });
          
          call.on('error', (err) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              console.error(`💥 [PeerViewer] Erro na chamada (tentativa ${attempt + 1}):`, err);
              call.close();
              resolve(false);
            }
          });
          
          call.on('close', () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              console.log(`🚪 [PeerViewer] Chamada fechada (tentativa ${attempt + 1})`);
              resolve(false);
            }
          });
        });
        
        if (streamReceived) {
          console.log('🎉 [PeerViewer] Conexão com publisher estabelecida com sucesso!');
          return true;
        }
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // Backoff exponencial
          console.log(`⏳ [PeerViewer] Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        console.error(`💥 [PeerViewer] Erro na tentativa ${attempt + 1}:`, error);
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error('❌ [PeerViewer] Esgotadas todas as tentativas de conexão');
    return false;
  }

  /**
   * Obter o peer_id real do publisher no banco de dados
   */
  private async getActualPublisherPeerId(): Promise<string | null> {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      console.log('🔍 [PeerViewer] Buscando peer_id para publisher:', this.publisherId);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: streamData, error } = await (supabase as any).from('live_streams')
        .select('peer_id, status, updated_at')
        .eq('user_id', this.publisherId)
        .eq('status', 'live')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('❌ [PeerViewer] Erro ao buscar peer_id:', error);
        return null;
      }
      
      if (!streamData || !(streamData as { peer_id: string | null }).peer_id) {
        console.error('❌ [PeerViewer] Stream ativa sem peer_id encontrada');
        return null;
      }
      
      console.log('✅ [PeerViewer] Peer_id encontrado:', (streamData as { peer_id: string }).peer_id);
      return (streamData as { peer_id: string }).peer_id;
      
    } catch (error) {
      console.error('💥 [PeerViewer] Erro ao obter peer_id do publisher:', error);
      return null;
    }
  }

  /**
   * Verificar se o publisher ainda está ativo
   */
  private async checkPublisherStillActive(publisherPeerId: string): Promise<boolean> {
    try {
      // ✅ CORREÇÃO: Heartbeat local não funciona cross-tab, confiar apenas no DB
      const locallyActive = this.heartbeat.isPublisherActive(this.publisherId);
      if (!locallyActive) {
        console.log('ℹ️ [PeerViewer] Publisher não encontrado no heartbeat local (normal para cross-tab)');
      }
      
      // Verificar no banco de dados
      const { supabase } = await import('@/lib/supabase');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: streamData, error } = await (supabase as any).from('live_streams')
        .select('status, peer_id, updated_at')
        .eq('user_id', this.publisherId)
        .eq('peer_id', publisherPeerId)
        .eq('status', 'live')
        .maybeSingle();
      
      if (error) {
        console.error('❌ [PeerViewer] Erro ao verificar status do publisher:', error);
        return false;
      }
      
      if (!streamData) {
        console.error('❌ [PeerViewer] Stream não encontrada ou não está mais ativa');
        return false;
      }
      
      // Verificar se foi atualizada recentemente (últimos 2 minutos = 120000ms)
      const lastUpdate = new Date((streamData as { updated_at: string }).updated_at);
      const now = new Date();
      const timeDiff = now.getTime() - lastUpdate.getTime();
      const maxInactiveTime = 120000; // 2 minutos
      
      if (timeDiff > maxInactiveTime) {
        const minutesAgo = Math.round(timeDiff / 60000);
        console.error(`❌ [PeerViewer] Stream inativa há ${minutesAgo} minutos`);
        return false; // ✅ REJEITAR streams antigas
      }
      
      console.log('✅ [PeerViewer] Publisher ainda está ativo');
      return true;
      
    } catch (error) {
      console.error('💥 [PeerViewer] Erro ao verificar atividade do publisher:', error);
      return false;
    }
  }

  /**
   * Lidar com stream recebido
   */
  private handleStreamReceived(stream: MediaStream): void {
    console.log('📺 [PeerViewer] Configurando stream no elemento de vídeo:', {
      streamId: stream.id,
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
      streamActive: stream.active
    });
    
    // Obter elemento de vídeo com método robusto
    const videoElement = this.getVideoElement();
    
    if (!videoElement) {
      console.error('❌ [PeerViewer] Elemento de vídeo não está disponível');
      this.handleError(new Error('Elemento de vídeo não encontrado para reprodução'));
      return;
    }
    
    try {
      // Limpar stream anterior se existir
      if (videoElement.srcObject) {
        console.log('🔄 [PeerViewer] Limpando stream anterior');
        const oldStream = videoElement.srcObject as MediaStream;
        if (oldStream && oldStream !== stream) {
          // Não parar as tracks do stream antigo aqui, deixar o PeerJS gerenciar
          videoElement.srcObject = null;
        }
      }
      
      // Configurar novo stream
      videoElement.srcObject = stream;
      
      // Configurar propriedades do vídeo
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = false; // Permitir áudio
      videoElement.controls = false; // Sem controles nativos
      
      console.log('🎥 [PeerViewer] Stream configurado, tentando reproduzir...');
      
      // Salvar referência da conexão
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.mediaConnection = stream as any; // Hack para manter referência
      
      // Tentar reproduzir com tratamento robusto de erros
      videoElement.play().then(() => {
        console.log('▶️ [PeerViewer] Reprodução iniciada com sucesso');
        
        // Verificar se as tracks estão realmente ativas
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();
        
        console.log('🔍 [PeerViewer] Status das tracks:', {
          videoEnabled: videoTracks.length > 0 && videoTracks[0].enabled,
          audioEnabled: audioTracks.length > 0 && audioTracks[0].enabled,
          videoReadyState: videoTracks.length > 0 ? videoTracks[0].readyState : 'N/A',
          audioReadyState: audioTracks.length > 0 ? audioTracks[0].readyState : 'N/A'
        });
        
        // Notificar que o stream foi adicionado
        if (this.streamAddedCallback) {
          this.streamAddedCallback(stream);
        }
        
        // Configurar listeners para eventos do stream
        this.setupStreamEventListeners(stream);
        
      }).catch((error) => {
        console.error('❌ [PeerViewer] Erro ao reproduzir:', error);
        
        if (error.name === 'NotAllowedError') {
          console.log('👆 [PeerViewer] Reprodução requer interação do usuário');
          this.handleError(new Error('Clique no vídeo para ativar a reprodução'));
        } else if (error.name === 'AbortError') {
          console.log('⚠️ [PeerViewer] Reprodução foi interrompida');
        } else {
          console.error('💥 [PeerViewer] Erro desconhecido na reprodução:', error);
          this.handleError(new Error(`Erro na reprodução: ${error.message}`));
        }
      });
      
    } catch (error) {
      console.error('💥 [PeerViewer] Erro crítico ao configurar stream:', error);
      this.handleError(new Error(`Erro ao configurar stream: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  /**
   * Configurar listeners para eventos do stream
   */
  private setupStreamEventListeners(stream: MediaStream): void {
    // Listener para quando tracks são adicionadas
    stream.addEventListener('addtrack', (event) => {
      console.log('➕ [PeerViewer] Track adicionada ao stream:', {
        kind: event.track.kind,
        label: event.track.label,
        enabled: event.track.enabled
      });
    });

    // Listener para quando tracks são removidas
    stream.addEventListener('removetrack', (event) => {
      console.log('➖ [PeerViewer] Track removida do stream:', {
        kind: event.track.kind,
        label: event.track.label
      });
    });

    // Listeners para cada track
    stream.getTracks().forEach((track, index) => {
      track.addEventListener('ended', () => {
        console.log(`🏁 [PeerViewer] Track ${track.kind} ${index} finalizou`);
      });

      track.addEventListener('mute', () => {
        console.log(`🔇 [PeerViewer] Track ${track.kind} ${index} foi mutada`);
      });

      track.addEventListener('unmute', () => {
        console.log(`🔊 [PeerViewer] Track ${track.kind} ${index} foi desmutada`);
      });
    });
  }
  
  /**
   * Atualizar status da conexão
   */
  private setStatus(status: PeerConnectionStatus): void {
    console.log(`🔄 [PeerViewer] Alterando status: ${this.currentStatus} -> ${status}`);
    this.currentStatus = status;
    if (this.statusChangeCallback) {
      this.statusChangeCallback(status);
    }
  }
  
  /**
   * Tratar erros
   */
  private handleError(error: Error): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }
  
  /**
   * Parar visualização
   */
  async stop(): Promise<void> {
    // Fechar conexão com o transmissor
    if (this.mediaConnection) {
      this.mediaConnection.close();
      this.mediaConnection = null;
    }
    
    // Limpar elemento de vídeo
    if (this.remoteVideoRef) {
      const videoElement = 'current' in this.remoteVideoRef ? this.remoteVideoRef.current : this.remoteVideoRef;
      if (videoElement) {
        videoElement.srcObject = null;
      }
    }
    
    // Fechar conexão PeerJS
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    this.setStatus('disconnected');
    console.log('Visualização encerrada');
  }
  
  /**
   * Registrar callback para mudanças de status
   */
  onStatusChange(callback: (status: PeerConnectionStatus) => void): void {
    this.statusChangeCallback = callback;
  }
  
  /**
   * Registrar callback para quando o stream é adicionado
   */
  onStreamAdded(callback: (stream: MediaStream) => void): void {
    this.streamAddedCallback = callback;
  }
  
  /**
   * Registrar callback para erros
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }
  
  /**
   * Obter status atual da conexão
   */
  getStatus(): PeerConnectionStatus {
    return this.currentStatus;
  }
}

/**
 * Funções de debug e diagnóstico do sistema
 */
export class StreamingDebugger {
  /**
   * Executar diagnóstico completo do sistema de streaming
   */
  static async runCompleteDiagnostic(publisherId: string, streamId?: string): Promise<void> {
    console.log('🔬 [StreamingDebugger] === DIAGNÓSTICO COMPLETO DO SISTEMA ===');
    
    try {
      // 1. Verificar heartbeat local
      console.log('💓 [StreamingDebugger] 1. Verificando heartbeat local...');
      const heartbeat = PublisherHeartbeat.getInstance();
      const isActive = heartbeat.isPublisherActive(publisherId);
      const peerId = heartbeat.getPublisherPeerId(publisherId);
      
      console.log('💓 [StreamingDebugger] Resultado heartbeat:', {
        publisherId,
        isActive,
        peerId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allActivePublishers: Array.from((heartbeat as any).activePublishers.keys())
      });

      // 2. Verificar banco de dados
      console.log('🗄️ [StreamingDebugger] 2. Verificando banco de dados...');
      const { supabase } = await import('@/lib/supabase');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allStreams, error } = await (supabase as any).from('live_streams')
        .select(`
          id, 
          title, 
          status, 
          user_id, 
          peer_id, 
          started_at, 
          ended_at, 
          viewer_count,
          created_at,
          updated_at
        `)
        .eq('user_id', publisherId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ [StreamingDebugger] Erro na consulta ao banco:', error);
      } else {
        console.log('📊 [StreamingDebugger] Streams no banco:', allStreams);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const liveStreams = (allStreams as any[])?.filter((s: any) => s.status === 'live') || [];
        console.log('🔴 [StreamingDebugger] Streams LIVE:', liveStreams);
        
        if (liveStreams.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stream = liveStreams[0] as any;
          console.log('🎯 [StreamingDebugger] Stream ativo principal:', {
            id: stream.id,
            title: stream.title,
            peer_id: stream.peer_id,
            started_at: stream.started_at,
            viewer_count: stream.viewer_count,
            timeSinceStart: Date.now() - new Date(stream.started_at).getTime()
          });
        }
      }

      // 3. Testar conectividade PeerJS com fallback
      console.log('🌐 [StreamingDebugger] 3. Testando conectividade PeerJS...');
      let peerTestResult = false;
      
      for (let serverIndex = 0; serverIndex < PEER_SERVERS.length; serverIndex++) {
        const server = PEER_SERVERS[serverIndex];
        console.log(`🌐 [StreamingDebugger] Testando servidor ${serverIndex + 1}: ${server.name}`);
        
        try {
          const testPeerId = `debug-test-${Date.now()}`;
          const peerConfig = createPeerConfig(serverIndex);
          const testPeer = new Peer(testPeerId, peerConfig);

          const serverTestResult = await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
              console.log(`⏱️ [StreamingDebugger] Timeout no servidor ${server.name}`);
              resolve(false);
            }, 8000);

            testPeer.on('open', (id) => {
              console.log(`✅ [StreamingDebugger] Conectividade OK no servidor ${server.name}, ID:`, id);
              clearTimeout(timeout);
              testPeer.destroy();
              resolve(true);
            });

            testPeer.on('error', (err) => {
              console.error(`❌ [StreamingDebugger] Erro no servidor ${server.name}:`, err);
              clearTimeout(timeout);
              resolve(false);
            });
          });

          if (serverTestResult) {
            peerTestResult = true;
            console.log(`✅ [StreamingDebugger] Servidor funcional encontrado: ${server.name}`);
            break;
          }
        } catch (error) {
          console.error(`💥 [StreamingDebugger] Erro testando servidor ${server.name}:`, error);
        }
        
        // Aguardar antes de testar próximo servidor
        if (serverIndex < PEER_SERVERS.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 4. Verificar disponibilidade do publisher (se especificado)
      if (peerId && peerTestResult) {
        console.log('🎯 [StreamingDebugger] 4. Testando disponibilidade do publisher...');
        
        // Encontrar servidor que funciona para teste
        let publisherAvailable = false;
        
        for (let serverIndex = 0; serverIndex < PEER_SERVERS.length; serverIndex++) {
          const server = PEER_SERVERS[serverIndex];
          
          try {
            const peerConfig = createPeerConfig(serverIndex);
            const publisherTestPeer = new Peer(`debug-publisher-test-${Date.now()}`, peerConfig);

            publisherAvailable = await new Promise<boolean>((resolve) => {
              const timeout = setTimeout(() => {
                console.log(`⏱️ [StreamingDebugger] Timeout testando publisher via ${server.name}`);
                resolve(false);
              }, 8000);

              publisherTestPeer.on('open', () => {
                console.log(`🔍 [StreamingDebugger] Tentando chamar publisher via ${server.name}:`, peerId);
                
                try {
                  const emptyStream = new MediaStream();
                  const call = publisherTestPeer.call(peerId, emptyStream);
                  
                  if (call) {
                    console.log(`✅ [StreamingDebugger] Publisher respondeu via ${server.name}`);
                    clearTimeout(timeout);
                    call.close();
                    publisherTestPeer.destroy();
                    resolve(true);
                  } else {
                    console.log(`❌ [StreamingDebugger] Publisher não respondeu via ${server.name}`);
                    clearTimeout(timeout);
                    publisherTestPeer.destroy();
                    resolve(false);
                  }
                } catch (error) {
                  console.error(`💥 [StreamingDebugger] Erro chamando publisher via ${server.name}:`, error);
                  clearTimeout(timeout);
                  publisherTestPeer.destroy();
                  resolve(false);
                }
              });

              publisherTestPeer.on('error', (err) => {
                console.error(`❌ [StreamingDebugger] Erro no peer de teste via ${server.name}:`, err);
                clearTimeout(timeout);
                resolve(false);
              });
            });

            if (publisherAvailable) {
              console.log(`✅ [StreamingDebugger] Publisher disponível via ${server.name}`);
              break;
            }
          } catch (error) {
            console.error(`💥 [StreamingDebugger] Erro testando publisher via ${server.name}:`, error);
          }
        }

        console.log('📊 [StreamingDebugger] Publisher disponível:', publisherAvailable);
      }

      // 5. Resumo do diagnóstico
      console.log('📋 [StreamingDebugger] === RESUMO DO DIAGNÓSTICO ===');
      console.log('📋 [StreamingDebugger] Heartbeat local:', isActive ? '✅' : '❌');
      console.log('📋 [StreamingDebugger] Streams no banco:', allStreams?.length || 0);
      console.log('📋 [StreamingDebugger] Streams LIVE:', allStreams?.filter(s => s.status === 'live').length || 0);
      console.log('📋 [StreamingDebugger] Conectividade PeerJS:', peerTestResult ? '✅' : '❌');
      console.log('📋 [StreamingDebugger] Publisher disponível:', peerId ? (heartbeat.isPublisherActive(publisherId) ? '✅' : '❌') : 'N/A');

    } catch (error) {
      console.error('💥 [StreamingDebugger] Erro durante diagnóstico:', error);
    }
  }

  /**
   * Monitorar sistema em tempo real
   */
  static startRealTimeMonitoring(publisherId: string): number {
    console.log('📊 [StreamingDebugger] Iniciando monitoramento em tempo real...');
    
    return window.setInterval(async () => {
      const heartbeat = PublisherHeartbeat.getInstance();
      const isActive = heartbeat.isPublisherActive(publisherId);
      const peerId = heartbeat.getPublisherPeerId(publisherId);
      
      // Verificar banco de dados
      const { supabase } = await import('@/lib/supabase');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: liveStreams } = await (supabase as any).from('live_streams')
        .select('id, status, peer_id, viewer_count')
        .eq('user_id', publisherId)
        .eq('status', 'live');

      console.log('📊 [StreamingDebugger] Monitor:', {
        timestamp: new Date().toISOString(),
        heartbeat: isActive,
        peerId,
        liveStreamsCount: liveStreams?.length || 0,
        hasValidPeerId: (liveStreams as { peer_id: string | null }[])?.some((s: { peer_id: string | null }) => s.peer_id) || false
      });
    }, 10000); // A cada 10 segundos
  }

  /**
   * Parar monitoramento
   */
  static stopRealTimeMonitoring(intervalId: number): void {
    window.clearInterval(intervalId);
    console.log('📊 [StreamingDebugger] Monitoramento parado');
  }
} 
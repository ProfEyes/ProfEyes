import { generateLiveKitToken, generateStreamerToken, generateViewerToken } from '@/services/livekitService';

export interface TokenRequest {
  roomName: string;
  userId: string;
  userName: string;
  userType?: 'streamer' | 'viewer' | 'participant';
  metadata?: Record<string, any>;
}

export interface TokenResponse {
  token: string;
  serverUrl: string;
  participantIdentity: string;
  participantName: string;
  roomName: string;
  expiresAt: number;
}

/**
 * API função para gerar token LiveKit
 * Simula um endpoint /api/getToken
 */
export async function getLiveKitToken(request: TokenRequest): Promise<TokenResponse> {
  const { roomName, userId, userName, userType = 'participant', metadata } = request;

  console.log('🎫 Gerando token LiveKit:', { roomName, userId, userName, userType });

  // Validações básicas
  if (!roomName || !userId || !userName) {
    const error = 'Parâmetros obrigatórios: roomName, userId, userName';
    console.error('❌ Erro de validação:', error);
    throw new Error(error);
  }

  // Sanitizar roomName (remover caracteres especiais)
  const sanitizedRoomName = roomName.replace(/[^a-zA-Z0-9-_]/g, '');
  if (!sanitizedRoomName) {
    const error = 'Nome da sala inválido';
    console.error('❌ Erro de validação:', error);
    throw new Error(error);
  }

  // Preparar dados do token
  const tokenRequest = {
    roomName: sanitizedRoomName,
    participantIdentity: `user-${userId}`,
    participantName: userName,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
  };

  console.log('🔧 Dados do token preparados:', tokenRequest);

  let token: string;

  try {
    // Gerar token baseado no tipo de usuário
    switch (userType) {
      case 'streamer':
        console.log('👑 Gerando token de STREAMER...');
        token = await generateStreamerToken(tokenRequest);
        break;
      case 'viewer':
        console.log('👁️ Gerando token de VIEWER...');
        token = await generateViewerToken(tokenRequest);
        break;
      default:
        console.log('👤 Gerando token de PARTICIPANTE...');
        token = await generateLiveKitToken(tokenRequest);
        break;
    }

    console.log('✅ Token gerado com sucesso, tamanho:', token.length);

    // Calcular tempo de expiração (tokens LiveKit geralmente expiram em 6 horas)
    const expiresAt = Date.now() + (6 * 60 * 60 * 1000); // 6 horas

    const response = {
      token,
      serverUrl: 'wss://elion-6bws36yp.livekit.cloud',
      participantIdentity: tokenRequest.participantIdentity,
      participantName: tokenRequest.participantName,
      roomName: sanitizedRoomName,
      expiresAt,
    };

    console.log('🎯 Token response preparado:', {
      ...response,
      token: `${token.substring(0, 20)}...` // Log apenas parte do token por segurança
    });

    return response;

  } catch (error: any) {
    console.error('❌ Erro ao gerar token:', error);
    throw new Error(`Falha na geração do token: ${error.message}`);
  }
}

/**
 * Função helper para usar em componentes React
 */
export async function fetchLiveKitToken(
  roomName: string,
  userId: string,
  userName: string,
  userType: 'streamer' | 'viewer' | 'participant' = 'participant'
): Promise<TokenResponse> {
  try {
    // Em um cenário real, isso seria uma chamada HTTP para o backend
    // Por agora, vamos simular o endpoint localmente
    
    const response = await getLiveKitToken({
      roomName,
      userId,
      userName,
      userType,
      metadata: {
        joinedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }
    });

    console.log('🎫 Token LiveKit gerado:', {
      roomName: response.roomName,
      participantName: response.participantName,
      userType,
      expiresAt: new Date(response.expiresAt).toLocaleString()
    });

    return response;
  } catch (error) {
    console.error('❌ Erro ao gerar token LiveKit:', error);
    throw error;
  }
}

/**
 * Função para renovar token antes da expiração
 */
export async function renewLiveKitToken(
  currentToken: string,
  roomName: string,
  userId: string,
  userName: string,
  userType: 'streamer' | 'viewer' | 'participant' = 'participant'
): Promise<TokenResponse | null> {
  try {
    // Verificar se o token atual está próximo da expiração (30 minutos antes)
    const parts = currentToken.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    const expirationTime = payload.exp * 1000; // Converter para milissegundos
    const currentTime = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    
    // Se ainda tem mais de 30 minutos, não renovar
    if (expirationTime - currentTime > thirtyMinutes) {
      return null;
    }
    
    console.log('🔄 Renovando token LiveKit que expira em breve...');
    
    // Gerar novo token
    return await fetchLiveKitToken(roomName, userId, userName, userType);
  } catch (error) {
    console.error('❌ Erro ao renovar token:', error);
    return null;
  }
} 
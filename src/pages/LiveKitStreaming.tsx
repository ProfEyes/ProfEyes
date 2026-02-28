import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { useLiveKit } from '@/contexts/LiveKitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Square, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  Users, 
  MessageCircle,
  Send,
  Camera,
  Settings,
  Loader2,
  ArrowLeft,
  Share2
} from 'lucide-react';
import { fetchLiveKitToken } from '@/api/livekit-token';
import { LIVEKIT_CONFIG } from '@/services/livekitService';

interface StreamData {
  id: string;
  title: string;
  description?: string;
  createdBy: string;
  isLive: boolean;
  tags?: string[];
}

export default function LiveKitStreaming() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') as 'streamer' | 'viewer' | null;

  const [view, setView] = useState<'list' | 'create' | 'room'>('list');
  const [token, setToken] = useState<string>('');
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Estados para criação de stream
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Estados da sala atual
  const [currentRoom, setCurrentRoom] = useState<string>('');
  const [userType, setUserType] = useState<'streamer' | 'viewer'>('viewer');

  // Streams mockadas (em produção viriam do Supabase)
  const [availableStreams] = useState<StreamData[]>([
    {
      id: 'room1',
      title: 'Stream de Teste 1',
      description: 'Primeira transmissão de teste',
      createdBy: 'Igor',
      isLive: true,
      tags: ['teste', 'crypto']
    },
    {
      id: 'room2', 
      title: 'Análise de Mercado',
      description: 'Discussão sobre o mercado atual',
      createdBy: 'Analista',
      isLive: false,
      tags: ['análise', 'mercado']
    }
  ]);

  // Carregar token quando entrar em uma sala
  useEffect(() => {
    if (roomId && mode && user && view === 'room') {
      loadTokenForRoom(roomId, mode);
    }
  }, [roomId, mode, user, view]);

  // Verificar parâmetros da URL ao carregar
  useEffect(() => {
    if (roomId && mode) {
      setCurrentRoom(roomId);
      setUserType(mode);
      setView('room');
    }
  }, [roomId, mode]);

  // Carregar token para a sala
  const loadTokenForRoom = async (roomName: string, userType: 'streamer' | 'viewer') => {
    if (!user) {
      console.error('❌ Usuário não autenticado');
      setConnectionError('Usuário não autenticado');
      return;
    }

    console.log('🎫 Iniciando carregamento de token:', { roomName, userType, userId: user.id });

    setIsLoadingToken(true);
    setConnectionError(null);

    try {
      console.log('🔧 Dados do usuário:', {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        metadata: user.user_metadata
      });

      const tokenData = await fetchLiveKitToken(
        roomName,
        user.id,
        String(user.user_metadata?.name || user.email || 'Usuário'),
        userType
      );

      if (!tokenData || !tokenData.token) {
        throw new Error('Token inválido recebido da API');
      }

      console.log('✅ Token carregado com sucesso:', {
        roomName: tokenData.roomName,
        participantName: tokenData.participantName,
        participantIdentity: tokenData.participantIdentity,
        serverUrl: tokenData.serverUrl,
        tokenLength: tokenData.token.length,
        expiresAt: new Date(tokenData.expiresAt).toLocaleString()
      });

      // Verificar se token tem estrutura JWT válida
      const tokenParts = tokenData.token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Token JWT inválido (estrutura incorreta)');
      }

      // Tentar decodificar payload para verificação
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log('🔍 Token payload:', {
          issuer: payload.iss,
          subject: payload.sub,
          name: payload.name,
          room: payload.video?.room,
          permissions: {
            canPublish: payload.video?.canPublish,
            canSubscribe: payload.video?.canSubscribe,
            roomAdmin: payload.video?.roomAdmin,
            roomCreate: payload.video?.roomCreate
          },
          expiresAt: new Date(payload.exp * 1000).toLocaleString()
        });

        // Verificar se token não expirou
        if (payload.exp * 1000 < Date.now()) {
          throw new Error('Token já expirado');
        }

        // Verificar permissões específicas do tipo de usuário
        if (userType === 'viewer' && payload.video?.canPublish !== false) {
          console.warn('⚠️ Token de VIEWER permite publicação (pode ser problemático)');
        }
        
        if (userType === 'streamer' && payload.video?.roomAdmin !== true) {
          console.warn('⚠️ Token de STREAMER não tem permissões de admin');
        }

      } catch (decodeError) {
        console.error('❌ Erro ao decodificar payload do token:', decodeError);
        throw new Error('Token JWT inválido (payload corrompido)');
      }

      setToken(tokenData.token);
      console.log('🎯 Token definido no estado, pronto para conexão');

    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('❌ ERRO DETALHADO ao carregar token:', {
        message: errorMsg,
        stack: errorStack,
        roomName,
        userType,
        userId: user.id,
        userName: user.user_metadata?.name || user.email
      });

      // Mensagens de erro mais específicas
      let errorMessage = 'Erro ao conectar à transmissão';
      
      if (errorMsg.includes('Token inválido')) {
        errorMessage = 'Erro na validação do token de acesso';
      } else if (errorMsg.includes('jwt')) {
        errorMessage = 'Erro na geração do token JWT';
      } else if (errorMsg.includes('expirado')) {
        errorMessage = 'Token de acesso expirado';
      } else if (errorMsg.includes('Falha na geração')) {
        errorMessage = 'Erro no servidor de tokens';
      } else if (errorMsg.includes('Parâmetros obrigatórios')) {
        errorMessage = 'Dados de usuário incompletos';
      }

      setConnectionError(`${errorMessage}: ${errorMsg}`);
      
      // Sugerir ações ao usuário
      console.log('💡 DICAS DE SOLUÇÃO:');
      console.log('1. Verifique sua conexão com a internet');
      console.log('2. Tente fazer logout e login novamente');
      console.log('3. Limpe o cache do navegador');
      console.log('4. Verifique se as credenciais LiveKit estão corretas');
      
    } finally {
      setIsLoadingToken(false);
    }
  };

  // Criar nova transmissão
  const handleCreateStream = async () => {
    if (!streamTitle.trim() || !user) return;

    setIsCreating(true);

    try {
      // Gerar ID único para a sala
      const roomName = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('🎬 Criando nova transmissão:', { roomName, title: streamTitle });

      // Aqui você salvaria no Supabase
      // const { data, error } = await supabase.from('live_streams').insert({
      //   id: roomName,
      //   title: streamTitle,
      //   description: streamDescription,
      //   user_id: user.id,
      //   status: 'scheduled'
      // });

      // Redirecionar para a sala como streamer
      navigate(`/livekit-streaming/${roomName}?mode=streamer`);

    } catch (error: unknown) {
      console.error('❌ Erro ao criar transmissão:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro ao criar transmissão';
      setConnectionError(errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  // Entrar em transmissão como viewer
  const handleJoinStream = (streamId: string) => {
    navigate(`/livekit-streaming/${streamId}?mode=viewer`);
  };

  // Sair da sala
  const handleLeaveRoom = () => {
    setToken('');
    setCurrentRoom('');
    setView('list');
    navigate('/livekit-streaming');
  };

  // Formatar duração
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render da lista de streams
  const renderStreamList = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">🎥 LiveKit Streaming</h1>
        <Button onClick={() => setView('create')} className="bg-green-600 hover:bg-green-700">
          <Camera className="w-4 h-4 mr-2" />
          Nova Transmissão
        </Button>
      </div>

      {connectionError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-600">
            ❌ {connectionError}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Transmissões Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableStreams.length === 0 ? (
            <p className="text-gray-500 text-center p-8">
              Nenhuma transmissão disponível
            </p>
          ) : (
            <div className="space-y-4">
              {availableStreams.map((stream) => (
                <div key={stream.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{stream.title}</h3>
                        <Badge variant={stream.isLive ? "default" : "secondary"}>
                          {stream.isLive ? '🔴 AO VIVO' : '⏸️ Parada'}
                        </Badge>
                      </div>
                      
                      {stream.description && (
                        <p className="text-gray-600 text-sm mb-2">{stream.description}</p>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Por: {stream.createdBy}</span>
                        {stream.tags && (
                          <div className="flex gap-1">
                            {stream.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleJoinStream(stream.id)}
                        size="sm"
                        disabled={!stream.isLive}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Assistir
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render do formulário de criação
  const renderCreateForm = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView('list')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">📹 Nova Transmissão</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurar Transmissão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Título da Transmissão *
            </label>
            <Input
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              placeholder="Ex: Análise de sinais em tempo real"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Descrição (opcional)
            </label>
            <Textarea
              value={streamDescription}
              onChange={(e) => setStreamDescription(e.target.value)}
              placeholder="Descreva sobre o que será a transmissão..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCreateStream}
              disabled={!streamTitle.trim() || isCreating}
              className="flex-1"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Iniciar Transmissão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render da sala LiveKit
  const renderLiveKitRoom = () => {
    if (!token) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeaveRoom}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
          </div>
          
          {isLoadingToken ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>Conectando à transmissão...</p>
            </>
          ) : connectionError ? (
            <>
              <p className="text-red-600">❌ {connectionError}</p>
              <Button onClick={() => loadTokenForRoom(currentRoom, userType)}>
                Tentar Novamente
              </Button>
            </>
          ) : (
            <p>Carregando...</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Header da sala */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeaveRoom}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Sair
            </Button>
            
            <div>
              <h1 className="text-xl font-bold">
                {userType === 'streamer' ? '📡 Transmitindo' : '👁️ Assistindo'}: {currentRoom}
              </h1>
              <Badge variant={userType === 'streamer' ? "default" : "secondary"}>
                {userType === 'streamer' ? 'Streamer' : 'Viewer'}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-1" />
              Compartilhar
            </Button>
          </div>
        </div>

        {/* Sala LiveKit */}
        <div className="rounded-lg overflow-hidden border bg-black min-h-[600px]">
          <LiveKitRoom
            serverUrl={LIVEKIT_CONFIG.serverUrl}
            token={token}
            connect={true}
            audio={userType === 'streamer'}
            video={userType === 'streamer'}
            onError={(error) => {
              console.error('❌ Erro na sala LiveKit:', error);
              setConnectionError(error.message || 'Erro na conexão');
            }}
            onConnected={() => {
              console.log('✅ Conectado à sala LiveKit');
              setConnectionError(null);
            }}
            onDisconnected={(reason) => {
              console.log('🔌 Desconectado da sala:', reason);
              if (reason) {
                setConnectionError(`Desconectado: ${reason}`);
              }
            }}
          >
            <VideoConference />
          </LiveKitRoom>
        </div>
      </div>
    );
  };

  // Render principal
  return (
    <div className="container mx-auto px-4 py-6">
      {view === 'list' && renderStreamList()}
      {view === 'create' && renderCreateForm()}
      {view === 'room' && renderLiveKitRoom()}
    </div>
  );
} 
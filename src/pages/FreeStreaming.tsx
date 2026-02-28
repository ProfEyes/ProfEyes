import React, { useState, useRef, useEffect } from 'react';
import { useFreeWebRTC } from '@/contexts/FreeWebRTCContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Loader2
} from 'lucide-react';

export default function FreeStreaming() {
  const { user } = useAuth();
  const {
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
    createStream,
    initializePublisher,
    initializeViewer,
    stopWebRTC,
    shareScreen,
    fetchComments,
    addComment,
    sendChatMessage
  } = useFreeWebRTC();

  const [mode, setMode] = useState<'list' | 'create' | 'stream' | 'view'>('list');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Carregar streams ao montar
  useEffect(() => {
    if (user) {
      fetchStreams();
    }
  }, [user]);

  // Carregar comentários quando há uma stream ativa
  useEffect(() => {
    if (currentStreamId) {
      fetchComments(currentStreamId);
    }
  }, [currentStreamId]);

  // Status badge
  const getStatusBadge = () => {
    const statusMap = {
      disconnected: { color: 'bg-gray-500', text: 'Desconectado' },
      connecting: { color: 'bg-yellow-500', text: 'Conectando' },
      connected: { color: 'bg-green-500', text: 'Conectado' },
      failed: { color: 'bg-red-500', text: 'Falhou' }
    };
    
    const status = statusMap[connectionStatus];
    return (
      <Badge className={`${status.color} text-white`}>
        {status.text}
      </Badge>
    );
  };

  // Criar nova transmissão
  const handleCreateStream = async () => {
    if (!streamTitle.trim()) return;
    
    const streamData = {
      title: streamTitle,
      description: streamDescription || null,
      tags: ['teste', 'gratuito'],
      language: 'pt'
    };
    
    const newStream = await createStream(streamData);
    if (newStream) {
      setCurrentStreamId(newStream.id);
      setMode('stream');
      setStreamTitle('');
      setStreamDescription('');
    }
  };

  // Iniciar transmissão
  const handleStartStreaming = async () => {
    if (!currentStreamId || !videoRef.current) return;
    
    const success = await initializePublisher(currentStreamId, videoRef.current);
    if (success) {
      setIsStreaming(true);
    }
  };

  // Parar transmissão
  const handleStopStreaming = async () => {
    await stopWebRTC();
    setIsStreaming(false);
  };

  // Assistir transmissão
  const handleWatchStream = async (streamId: string) => {
    if (!videoRef.current) return;
    
    setCurrentStreamId(streamId);
    setMode('view');
    
    const success = await initializeViewer(streamId, videoRef.current);
    if (success) {
      console.log('✅ Assistindo transmissão');
    }
  };

  // Enviar mensagem do chat
  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !currentStreamId) return;
    
    const success = await addComment(currentStreamId, chatMessage);
    if (success) {
      setChatMessage('');
      sendChatMessage(chatMessage);
    }
  };

  // Compartilhar tela
  const handleShareScreen = async () => {
    const success = await shareScreen();
    if (success) {
      console.log('✅ Tela compartilhada');
    }
  };

  // Render da lista de streams
  const renderStreamList = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">🆓 Streaming Gratuito</h1>
        <Button onClick={() => setMode('create')} className="bg-green-600 hover:bg-green-700">
          <Camera className="w-4 h-4 mr-2" />
          Nova Transmissão
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">❌ {error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Transmissões Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingStreams ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Carregando transmissões...
            </div>
          ) : streams.length === 0 ? (
            <p className="text-gray-500 text-center p-8">
              Nenhuma transmissão disponível
            </p>
          ) : (
            <div className="space-y-4">
              {streams.map((stream) => (
                <div key={stream.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{stream.title}</h3>
                      <p className="text-gray-600 text-sm">{stream.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={stream.status === 'live' ? 'default' : 'secondary'}>
                          {stream.status === 'live' ? '🔴 AO VIVO' : '⭕ Agendada'}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          👤 {stream.username}
                        </span>
                        <span className="text-sm text-gray-500">
                          👥 {stream.viewerCount} assistindo
                        </span>
                      </div>
                    </div>
                    {stream.status === 'live' && (
                      <Button 
                        onClick={() => handleWatchStream(stream.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Assistir
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render da criação de stream
  const renderCreateStream = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => setMode('list')}>
          ← Voltar
        </Button>
        <h1 className="text-3xl font-bold">Criar Nova Transmissão</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações da Transmissão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Título</label>
            <Input
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              placeholder="Digite o título da transmissão"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Descrição</label>
            <Textarea
              value={streamDescription}
              onChange={(e) => setStreamDescription(e.target.value)}
              placeholder="Descreva sua transmissão"
              rows={3}
            />
          </div>
          <Button 
            onClick={handleCreateStream}
            disabled={!streamTitle.trim() || isProcessingAction}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isProcessingAction ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            Criar Transmissão
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // Render da interface de streaming
  const renderStreamInterface = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setMode('list')}>
            ← Voltar
          </Button>
          <h1 className="text-2xl font-bold">🎬 Transmitindo</h1>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{viewerCount} assistindo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vídeo */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  {isStreaming && (
                    <Badge className="bg-red-600 text-white">
                      🔴 AO VIVO
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controles */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {!isStreaming ? (
                  <Button 
                    onClick={handleStartStreaming}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar Transmissão
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStopStreaming}
                    className="bg-gray-600 hover:bg-gray-700"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Parar Transmissão
                  </Button>
                )}
                
                <Button variant="outline" onClick={handleShareScreen}>
                  <Monitor className="w-4 h-4 mr-2" />
                  Compartilhar Tela
                </Button>
                
                <Button variant="outline" onClick={() => setIsVideoEnabled(!isVideoEnabled)}>
                  {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </Button>
                
                <Button variant="outline" onClick={() => setIsAudioEnabled(!isAudioEnabled)}>
                  {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat */}
        <div>
          <Card className="h-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Chat ao Vivo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="text-sm">
                    <span className="font-semibold text-blue-600">
                      {comment.username}:
                    </span>
                    <span className="ml-2">{comment.content}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button onClick={handleSendMessage} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // Render da interface de visualização
  const renderViewInterface = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setMode('list')}>
            ← Voltar
          </Button>
          <h1 className="text-2xl font-bold">👁️ Assistindo</h1>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{viewerCount} assistindo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vídeo */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-red-600 text-white">
                    🔴 AO VIVO
                  </Badge>
                </div>
                {connectionStatus === 'failed' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                    <div className="text-center text-white">
                      <p>❌ Erro ao conectar à transmissão</p>
                      <Button 
                        variant="outline" 
                        className="mt-2"
                        onClick={() => currentStreamId && handleWatchStream(currentStreamId)}
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat */}
        <div>
          <Card className="h-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Chat ao Vivo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="text-sm">
                    <span className="font-semibold text-blue-600">
                      {comment.username}:
                    </span>
                    <span className="ml-2">{comment.content}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button onClick={handleSendMessage} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // Render principal
  return (
    <div className="container mx-auto px-4 py-8">
      {mode === 'list' && renderStreamList()}
      {mode === 'create' && renderCreateStream()}
      {mode === 'stream' && renderStreamInterface()}
      {mode === 'view' && renderViewInterface()}
    </div>
  );
} 
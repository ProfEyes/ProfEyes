import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { shouldShowStartLiveButton } from "@/utils/permissions";
import { format } from "date-fns";
import { toast } from "sonner";
import { useLiveStreamPermission } from "@/components/LiveStreamPermissionProvider";
import { useLiveStream } from "@/contexts/LiveStreamContext";
import { useTrendingNotifications } from "@/contexts/TrendingNotificationContext";
import { MeetingCard as MeetingCardComponent } from "@/components/MeetingCard";
import { 
  Play, 
  Calendar, 
  Clock, 
  Video, 
  Users, 
  Eye, 
  Heart,
  MoreVertical, 
  Globe, 
  Link as LinkIcon, 
  Search, 
  Hash, 
  Send, 
  X,
  MessageSquare, 
  Lock,
  Shield,
  ThumbsUp, 
  UserPlus,
  Mic,
  MicOff,
  VideoOff,
  Monitor,
  RefreshCw,
  ScreenShare,
  Square,
  Circle,
  User,
  Presentation, 
  Camera,
  AlertCircle,
  FileCheck,
  Crown,
  Image,
  ArrowRight,
  UploadCloud,
  XIcon,
  CheckIcon,
  XCircle,
  Loader2,
  Info,
  CheckCircle,
  Video as VideoIcon,
  Presentation as PresentationIcon,
  SendHorizonal,
  Tv,
  Trash
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { supabase } from "@/lib/supabase";

// Adicionar ao início do arquivo, após os imports
declare global {
  interface Window {
    checkStreamStatus?: (streamId: string) => void;
    publisherPeer?: unknown;
    viewerPeer?: unknown;
    localStream?: MediaStream;
  }
}

// Dados simulados para comentários
const mockComments = [
  {
    id: "comment1",
    userId: "user1",
    userName: "Ricardo",
    userAvatar: "https://i.pravatar.cc/150?img=12",
    message: "Excelente análise! Você acha que o BTC vai romper essa resistência?",
    timestamp: new Date(Date.now() - 12 * 60 * 1000), // 12 minutos atrás
    isStreamer: false,
    likes: 0
  },
  {
    id: "comment2",
    userId: "user2",
    userName: "Carla",
    userAvatar: "https://i.pravatar.cc/150?img=20",
    message: "Concordo com sua análise. Os indicadores estão mostrando força.",
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutos atrás
    isStreamer: false,
    likes: 0
  },
  {
    id: "comment3",
    userId: "user3",
    userName: "Marcos",
    userAvatar: "https://i.pravatar.cc/150?img=33",
    message: "Qual é o suporte mais próximo caso ocorra um pullback?",
    timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutos atrás
    isStreamer: false,
    likes: 0
  }
];

// Definir interfaces próprias para o componente para evitar conflitos
interface MeetingData {
  id: string;
  title: string;
  description: string;
  tags: string[];
  userId: string;
  status: 'scheduled' | 'live' | 'ended' | 'deleted';
  thumbnail?: string;
  meetingId?: string;  // Identificador da reunião
  hostId?: string;     // ID do anfitrião da reunião
  hostName?: string;   // Nome do anfitrião da reunião
  hostAvatar?: string; // Avatar do anfitrião
  startTime?: Date;    // Horário agendado
  participantCount?: number; // Número de participantes
  recordingId?: string; // ID da gravação
  startedAt?: Date;    // Quando a reunião começou efetivamente
  createdAt?: Date;
  isVerifiedHost?: boolean; // Anfitrião verificado
}

// Adicionado: Interface MeetingModalProps que faltava
interface MeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMeetingCreated: (meeting: MeetingData) => void;
}

// Modal para criar uma reunião
const MeetingModal: React.FC<MeetingModalProps> = ({ open, onOpenChange, onMeetingCreated }) => {
  // Definição local de texts para resolver referências no componente
  const texts = {
    modalTitle: "Nova Transmissão",
    modalDescription: "Configure sua transmissão e compartilhe seus conhecimentos ao vivo",
    allCategories: "Todas categorias"
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [streamPreview, setStreamPreview] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [language, setLanguage] = useState("pt");
  const [streamType, setStreamType] = useState<'live' | 'scheduled'>('live');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { user } = useAuth();
  const { createStream, generateStreamKey } = useLiveStream();
  const navigate = useNavigate();
  const { canStartLive } = useLiveStreamPermission();
  const { toast: showToast } = useToast(); // ✅ Renomeado para evitar conflito com toast do sonner
  
  // Iniciar visualização da câmera
  const startPreview = async () => {
    setIsConfiguring(true);
    setError(null);
    
    // Declarar as variáveis no escopo da função para evitar problemas de escopo
    let hasCamera = false;
    let hasMicrophone = false;
    
    try {
      // Verificar dispositivos disponíveis primeiro
      const devices = await navigator.mediaDevices.enumerateDevices();
      hasCamera = devices.some(device => device.kind === 'videoinput');
      hasMicrophone = devices.some(device => device.kind === 'audioinput');
      
      if (!hasCamera && !hasMicrophone) {
        throw new Error('Nenhuma câmera ou microfone foi encontrado no seu dispositivo');
      }
      
      // Configurar restrições baseadas em dispositivos disponíveis
      const constraints = {
        video: hasCamera ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        } : false,
        audio: hasMicrophone
      };
      
      console.log('Tentando acessar mídia com restrições:', constraints);
      
      // Solicitar acesso à câmera e/ou microfone
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setMediaStream(stream);
      setStreamPreview(true);
      
      // Importante: utilizamos setTimeout para garantir que o DOM seja atualizado antes de configurar o vídeo
      setTimeout(() => {
        // Associar o stream ao elemento de vídeo
        if (videoPreviewRef.current) {
          console.log('Configurando vídeo preview');
          videoPreviewRef.current.srcObject = stream;
          
          // Garantir que o vídeo seja reproduzido imediatamente
          videoPreviewRef.current.play().catch(e => {
            console.error('Erro ao iniciar reprodução do vídeo:', e);
          });
        } else {
          console.warn('Elemento de vídeo não encontrado');
        }
      }, 100);
    } catch (err: unknown) {
      console.error('Erro ao acessar dispositivos de mídia:', err);
      
      // Mensagens de erro mais amigáveis baseadas no tipo de erro
      let mensagemErro = 'Verifique as permissões do navegador';
      
      if (err instanceof Error) {
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        mensagemErro = 'Nenhum dispositivo de mídia encontrado. Conecte uma câmera ou microfone e tente novamente.';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        mensagemErro = 'Permissão para acessar câmera/microfone negada. Verifique as configurações do seu navegador.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        mensagemErro = 'Não foi possível acessar a câmera/microfone. O dispositivo pode estar sendo usado por outro aplicativo.';
      } else if (err.name === 'OverconstrainedError') {
        mensagemErro = 'As configurações solicitadas não são suportadas pelo seu dispositivo.';
      } else if (err.name === 'TypeError') {
        mensagemErro = 'Configuração inválida para acesso aos dispositivos.';
        }
      }
      
      setError(`Erro ao acessar câmera/microfone: ${mensagemErro}`);
    } finally {
      setIsConfiguring(false);
    }
  };
  
  // Parar a visualização da câmera
  const stopPreview = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    
    // Limpar o elemento de vídeo se existir
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    
    setMediaStream(null);
    setStreamPreview(false);
    setIsConfiguring(false);
    
    // Não limpar a thumbnail aqui para manter a imagem se já tiver sido configurada
  };

  // Função para lidar com o submit do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('O título é obrigatório');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log('Iniciando criação de transmissão...');
      
      // Processar as tags
      const processedTags = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      // Criar dados básicos da transmissão
      const streamData = {
        title,
        description,
        thumbnailUrl: thumbnail || '',
        tags: processedTags,
        language,
        category,
        streamSettings: {
          webcamEnabled: !!mediaStream?.getVideoTracks().length,
          screenShareEnabled: false,
          chatEnabled: true,
          hostName: user?.user_metadata?.name || user?.email || 'Anfitrião',
          hostAvatar: user?.user_metadata?.avatar_url || '',
        }
      };
      
      console.log('Dados da transmissão:', streamData);
      
      // Criar a transmissão
      const newStream = await createStream(streamData);
      
      if (!newStream) {
        throw new Error('Falha ao criar transmissão');
      }
      
      console.log('Transmissão criada:', newStream);
        
      // Converter para o formato esperado
        const meetingData: MeetingData = {
          id: newStream.id,
          title: newStream.title || '',
          description: newStream.description || '',
          tags: Array.isArray(newStream.tags) ? newStream.tags : [],
          userId: newStream.userId || '',
          status: (newStream.status || 'scheduled') as 'scheduled' | 'live' | 'ended' | 'deleted',
          thumbnail: newStream.thumbnailUrl || '',
          meetingId: newStream.id,
          hostId: newStream.userId || '',
          hostName: String(streamData.streamSettings?.hostName || 'Anfitrião'),
          hostAvatar: String(streamData.streamSettings?.hostAvatar || ''),
          participantCount: 0,
          startedAt: newStream.startedAt ? new Date(newStream.startedAt) : undefined,
          startTime: newStream.scheduledStart ? new Date(newStream.scheduledStart) : undefined,
          createdAt: newStream.createdAt ? new Date(newStream.createdAt) : new Date(),
          isVerifiedHost: true
        };
        
      // Parar o preview de mídia antes de fechar o modal
      stopPreview();
      
      // Notificar sucesso
      onMeetingCreated(meetingData);
      onOpenChange(false);
      // Mostrar mensagem de sucesso
      console.log("Transmissão criada com sucesso");
      
      // Redirecionar para a página do streamer
      navigate(`/streamer/${newStream.id}`);
      
    } catch (err: unknown) {
      console.error('Erro ao criar transmissão:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar transmissão';
      setError(errorMessage);
      
      // Mostrar mensagem de erro
      console.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remover a função capturePhoto e substituir por uma função de upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Verificar se é uma imagem
    if (!file.type.match('image.*')) {
      showToast({
        title: "Erro",
        description: "O arquivo deve ser uma imagem",
        variant: "destructive"
      });
      return;
    }
    
    // Verificar tamanho do arquivo (limite de 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast({
        title: "Erro",
        description: "A imagem deve ter no máximo 2MB",
        variant: "destructive"
      });
      return;
    }
    
    // Carregar a imagem como data URL
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      if (loadEvent.target?.result) {
        setThumbnail(loadEvent.target.result as string);
        showToast({
          title: "Sucesso",
          description: "Thumbnail carregada com sucesso!",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Funções para lidar com drag and drop de imagens
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-blue-500');
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500');
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500');
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      // Verificar se é uma imagem
      if (!file.type.match('image.*')) {
        showToast({
          title: "Erro",
          description: "O arquivo deve ser uma imagem",
          variant: "destructive"
        });
      return;
    }
    
      // Carregar a imagem como data URL
    const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (loadEvent.target?.result) {
          setThumbnail(loadEvent.target.result as string);
          showToast({
            title: "Sucesso",
            description: "Thumbnail carregada com sucesso!",
          });
      }
    };
    reader.readAsDataURL(file);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border border-zinc-800/30 text-white max-w-4xl rounded-xl shadow-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-4 pb-3 border-b border-zinc-800/40 bg-gradient-to-r from-black to-zinc-950">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-white text-xl font-semibold">
              {texts.modalTitle}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-zinc-400 text-sm mt-1 ml-[42px]">
            {texts.modalDescription}
          </DialogDescription>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Coluna esquerda */}
            <div className="space-y-4">
              {/* Configuração da câmera e visualização */}
              <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/30 shadow-md">
                <h3 className="font-medium text-white mb-3 flex items-center gap-2 text-sm">
                  <div className="p-1.5 bg-indigo-900/30 rounded-md">
                    <Camera className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <span className="text-zinc-200">Configuração da Câmera</span>
                </h3>
                
                {streamPreview ? (
                  <div className="relative">
                    {mediaStream && mediaStream.getVideoTracks().length > 0 ? (
                      <div className="video-container w-full aspect-video bg-black rounded-lg overflow-hidden group shadow-inner shadow-black/60" style={{maxHeight: "180px"}}>
                        <video
                          ref={videoPreviewRef}
                          autoPlay
                          playsInline
                          muted
                          controls={false}
                          className="w-full h-full object-cover"
                          style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }}
                        />
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-indigo-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                          Câmera ativa
                        </div>
                        
                        {/* Controles que aparecem no hover */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="flex justify-between items-center">
                            <div className="flex gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 bg-black/70 hover:bg-black/90 border-zinc-700/40 text-white"
                                onClick={() => setIsMirrored(!isMirrored)}
                                title={isMirrored ? "Desativar espelhamento" : "Ativar espelhamento"}
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-7 text-xs bg-black/70 hover:bg-black border-red-900/30 text-red-500 hover:text-red-400 gap-1"
                              onClick={stopPreview}
                            >
                              <X className="h-3.5 w-3.5" />
                              Parar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-black rounded-lg flex items-center justify-center border border-zinc-800/30 shadow-inner shadow-black/60" style={{maxHeight: "180px"}}>
                        <div className="text-center p-4">
                          <VideoOff className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                          <p className="text-xs text-zinc-400 font-medium">
                            {mediaStream ? 
                              "Transmissão apenas com áudio" : 
                              "Transmissão sem áudio e vídeo"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    className="group w-full aspect-video border-[1.5px] border-dashed border-zinc-800/50 bg-zinc-900/20 hover:bg-zinc-900/30 rounded-lg flex flex-col items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-sm"
                    onClick={() => !isConfiguring && startPreview()}
                    style={{maxHeight: "150px"}}
                  >
                    {isConfiguring ? (
                      <>
                        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500/70" />
                        <p className="text-zinc-400 text-xs font-medium">Configurando câmera...</p>
                      </>
                    ) : (
                      <>
                        <div className="p-3 rounded-full bg-zinc-900/70 group-hover:bg-indigo-900/20 transition-colors duration-300">
                          <Camera className="h-6 w-6 text-zinc-600 group-hover:text-indigo-400 transition-colors duration-300" />
                        </div>
                        <p className="text-zinc-300 text-sm font-medium group-hover:text-indigo-300 transition-colors">Configurar câmera</p>
                        <p className="text-xs text-zinc-500 max-w-[80%] text-center">Clique para ativar sua câmera e microfone</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {/* Tipo de transmissão */}
              <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/30 shadow-md">
                <h3 className="font-medium text-white mb-3 flex items-center gap-2 text-sm">
                  <div className="p-1.5 bg-indigo-900/30 rounded-md">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <span className="text-zinc-200">Tipo de Transmissão</span>
                </h3>
                
                <div className="flex gap-3 mt-1">
                  <div 
                    className={`flex-1 border rounded-lg p-2.5 cursor-pointer transition-all duration-300 ${
                      streamType === 'live' 
                        ? 'bg-indigo-950/30 border-indigo-800/40 shadow-sm shadow-indigo-900/20' 
                        : 'bg-zinc-900/30 border-zinc-800/20 hover:bg-zinc-900/50 hover:border-zinc-700/30'
                    }`}
                    onClick={() => setStreamType('live')}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`p-1 rounded-md ${streamType === 'live' ? 'bg-indigo-900/40' : 'bg-zinc-800/40'}`}>
                        <Video className={`h-3 w-3 ${streamType === 'live' ? 'text-indigo-400' : 'text-zinc-400'}`} />
                      </div>
                      <span className={`font-medium text-xs ${streamType === 'live' ? 'text-indigo-300' : 'text-zinc-300'}`}>Ao Vivo</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 ml-5">Iniciar transmissão imediatamente</p>
                  </div>
                  
                  <div 
                    className={`flex-1 border rounded-lg p-2.5 cursor-pointer transition-all duration-300 ${
                      streamType === 'scheduled' 
                        ? 'bg-indigo-950/30 border-indigo-800/40 shadow-sm shadow-indigo-900/20' 
                        : 'bg-zinc-900/30 border-zinc-800/20 hover:bg-zinc-900/50 hover:border-zinc-700/30'
                    }`}
                    onClick={() => setStreamType('scheduled')}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`p-1 rounded-md ${streamType === 'scheduled' ? 'bg-indigo-900/40' : 'bg-zinc-800/40'}`}>
                        <Calendar className={`h-3 w-3 ${streamType === 'scheduled' ? 'text-indigo-400' : 'text-zinc-400'}`} />
                      </div>
                      <span className={`font-medium text-xs ${streamType === 'scheduled' ? 'text-indigo-300' : 'text-zinc-300'}`}>Agendar</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 ml-5">Programar para uma data futura</p>
                  </div>
                </div>
                
                {streamType === 'scheduled' && (
                  <div className="mt-3 pt-2 border-t border-zinc-800/30">
                    <Label htmlFor="scheduled-date" className="text-zinc-400 text-xs mb-1 block">Data e hora</Label>
                    <div className="relative">
                      <input 
                        type="datetime-local" 
                        id="scheduled-date"
                        title="Selecione a data e hora da transmissão"
                        placeholder="Selecione data e hora"
                        className="w-full bg-zinc-900/70 border border-zinc-800/50 rounded-md p-1.5 text-zinc-300 focus:border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-zinc-700/50 text-xs [color-scheme:dark]"
                        min={new Date().toISOString().slice(0, 16)}
                        onChange={(e) => setScheduledDate(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Upload de Thumbnail */}
              <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/30 shadow-md">
                <h3 className="font-medium text-white mb-3 flex items-center gap-2 text-sm">
                  <div className="p-1.5 bg-indigo-900/30 rounded-md">
                    <Image className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <span className="text-zinc-200">Thumbnail da Transmissão</span>
                </h3>
                
                {thumbnail ? (
                  <div 
                    className="relative border border-zinc-800/30 rounded-lg overflow-hidden shadow-inner shadow-black/60 aspect-video"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <img 
                      src={thumbnail} 
                      alt="Thumbnail" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-black/70 hover:bg-black border-red-900/30 text-red-500 hover:text-red-400 gap-1 text-xs"
                        onClick={() => setThumbnail('')}
                      >
                        <Trash className="h-3.5 w-3.5" />
                        Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="group relative w-full aspect-video border-[1.5px] border-dashed border-zinc-800/50 bg-zinc-900/20 hover:bg-zinc-900/30 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer shadow-sm"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('thumbnail-upload')?.click()}
                  >
                    <div className="p-2 rounded-full bg-zinc-900/70 group-hover:bg-indigo-900/20 transition-colors duration-300">
                      <UploadCloud className="h-5 w-5 text-zinc-600 group-hover:text-indigo-400 transition-colors duration-300" />
                    </div>
                    <p className="text-zinc-300 text-xs font-medium group-hover:text-indigo-300 transition-colors">
                      Arraste uma imagem ou clique para fazer upload
                    </p>
                    <p className="text-[10px] text-zinc-500 max-w-[90%] text-center">
                      Tamanho recomendado: 1920 x 1080 pixels (16:9) • Máximo: 2MB
                    </p>
                    <Label htmlFor="thumbnail-upload" className="sr-only">Upload de miniatura</Label>
                    <input
                      type="file"
                      id="thumbnail-upload"
                      aria-label="Upload de miniatura"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Coluna direita */}
            <div className="space-y-4">
              {/* Detalhes da transmissão */}
              <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/30 shadow-md">
                <h3 className="font-medium text-white mb-3 flex items-center gap-2 text-sm">
                  <div className="p-1.5 bg-indigo-900/30 rounded-md">
                    <Info className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <span className="text-zinc-200">Detalhes da Transmissão</span>
                </h3>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="title" className="text-zinc-400 text-xs">Título <span className="text-red-500">*</span></Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Análise técnica do Bitcoin"
                      className="bg-zinc-900/70 border-zinc-800/50 text-zinc-300 focus:border-zinc-700/60 focus:ring-1 focus:ring-zinc-700/50 placeholder:text-zinc-600 text-xs h-8"
                      required
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="description" className="text-zinc-400 text-xs">Descrição</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descreva o que você irá abordar na sua transmissão..."
                      className="bg-zinc-900/70 border-zinc-800/50 text-zinc-300 focus:border-zinc-700/60 focus:ring-1 focus:ring-zinc-700/50 placeholder:text-zinc-600 min-h-[80px] text-xs resize-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="category" className="text-zinc-400 text-xs">Categoria</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="bg-zinc-900/70 border-zinc-800/50 text-zinc-300 focus:border-zinc-800/50 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:shadow-none h-8 text-xs">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 backdrop-blur-md border-white/5 shadow-2xl">
                          <SelectItem value="all" className="text-white/80 hover:bg-white/5 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus:shadow-none">{texts.allCategories}</SelectItem>
                          <SelectItem value="crypto" className="text-white/80 hover:bg-white/5 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus:shadow-none">Criptomoedas</SelectItem>
                          <SelectItem value="stocks" className="text-white/80 hover:bg-white/5 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus:shadow-none">Ações</SelectItem>
                          <SelectItem value="forex" className="text-white/80 hover:bg-white/5 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus:shadow-none">Forex</SelectItem>
                          <SelectItem value="education" className="text-white/80 hover:bg-white/5 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus:shadow-none">Educacional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="language" className="text-zinc-400 text-xs">Idioma</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="bg-zinc-900/70 border-zinc-800/50 text-zinc-300 focus:border-zinc-800/50 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:shadow-none h-8 text-xs">
                          <SelectValue placeholder="Selecione um idioma" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 backdrop-blur-md border-white/5 shadow-2xl">
                          <SelectItem value="pt" className="text-white/80 hover:bg-white/5 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus:shadow-none">Português</SelectItem>
                          <SelectItem value="en" className="text-white/80 hover:bg-white/5 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus:shadow-none">Inglês</SelectItem>
                          <SelectItem value="es" className="text-white/80 hover:bg-white/5 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus:shadow-none">Espanhol</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="tags" className="text-zinc-400 text-xs">Tags (separadas por vírgula)</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Ex: bitcoin, análise técnica, trader"
                      className="bg-zinc-900/70 border-zinc-800/50 text-zinc-300 focus:border-zinc-700/60 focus:ring-1 focus:ring-zinc-700/50 placeholder:text-zinc-600 text-xs h-8"
                    />
                    {tags && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.split(',').map((tag, index) => (
                          tag.trim() && (
                            <div 
                              key={index} 
                              className="bg-indigo-950/30 border border-indigo-900/30 rounded-full px-1.5 py-0.5 text-[10px] text-zinc-400 flex items-center"
                            >
                              <Hash className="h-2.5 w-2.5 mr-0.5 text-indigo-500/70" />
                              <span>{tag.trim()}</span>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-950/20 text-red-400 text-xs px-3 py-2 rounded-lg border border-red-900/30 flex items-start gap-2 mt-4">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                {error}
                {error.includes('câmera/microfone') && (
                  <div className="mt-1.5">
                    <Button 
                      type="button" 
                      variant="outline"
                      size="sm"
                      className="bg-red-950/30 hover:bg-red-950/50 border-red-900/30 text-red-400 text-[10px] h-6 px-2" 
                      onClick={() => setStreamPreview(true)}
                    >
                      Continuar sem câmera/microfone
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-4 pt-3 border-t border-zinc-800/40 flex justify-end">
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="bg-gradient-to-r from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white min-w-[140px] border-0 shadow-md h-9 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Tv className="mr-1.5 h-3.5 w-3.5" />
                  Criar transmissão
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Definindo interfaces necessárias
interface StreamComment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: Date;
  likes: number;
  isLiked: boolean;
  isHost: boolean;
}

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  status: 'scheduled' | 'live' | 'ended' | 'deleted';
  thumbnail?: string;
  meetingId?: string;
  hostId?: string;
  hostName?: string;
  hostAvatar?: string;
  startedAt?: string;
  participantCount?: number;
  recordingId?: string;
}

// Componente de Reunião
const MeetingComponent: React.FC<{ stream: MeetingData }> = ({ stream }) => {
  const [isStreaming, setIsStreaming] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [viewerCount, setViewerCount] = useState(0);
  const [streamTime, setStreamTime] = useState(0);
  const [streamIntervalId, setStreamIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [participantList, setParticipantList] = useState<{id: string, name: string, avatar: string}[]>([]);
  const [chatOpen, setChatOpen] = useState(true); // Chat já aberto por padrão
  // Estado para foto do perfil atual
  const [currentHostAvatar, setCurrentHostAvatar] = useState<string>('');
  const [currentHostName, setCurrentHostName] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast: showToast } = useToast(); // ✅ Renomeado para evitar conflito com toast do sonner
  
  // Definir as funções antes de usá-las no useEffect
  const initializeVideoConnection = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Aqui seria implementada a lógica real de conexão WebRTC
      // Usando biblioteca como simple-peer ou Twilio
      
      // Simulação para desenvolvimento
      setTimeout(() => {
        setConnectionStatus('connected');
        setIsStreaming(true);
        setViewerCount(Math.floor(Math.random() * 10) + 1);
      }, 500); // Reduzido para carregar mais rápido
      
    } catch (error) {
      console.error("Erro ao inicializar conexão de vídeo:", error);
      setConnectionStatus('error');
      showToast({
        title: "Erro na conexão",
        description: "Não foi possível estabelecer a conexão de vídeo",
        variant: "destructive"
      });
    }
  };

  const endMeeting = () => {
    // Lógica para finalizar a reunião
    if (window.localStream) {
      window.localStream.getTracks().forEach(track => track.stop());
    }
    
    setIsStreaming(false);
    setConnectionStatus('disconnected');
    
    if (streamIntervalId) {
      clearInterval(streamIntervalId);
    }
    
    // Redirecionar para a página principal após finalizar
    navigate('/');
    
    showToast({
      title: "Reunião finalizada",
      description: "Sua reunião foi encerrada com sucesso",
    });
  };
  
  // useEffect para atualizar foto e nome do perfil em tempo real
  useEffect(() => {
    const updateUserProfile = () => {
      if (user) {
        // Atualizar foto do perfil (várias fontes possíveis)
        const userRecord = user as unknown as Record<string, unknown>;
        const avatarUrl = String(user.user_metadata?.avatar_url || 
                         userRecord.avatar_url || 
                         user.user_metadata?.avatar || 
                         user.user_metadata?.picture ||
                         '');
        
        // Atualizar nome do usuário (várias fontes possíveis) 
        const userName = String(user.user_metadata?.name ||
                        user.user_metadata?.full_name ||
                        user.user_metadata?.display_name ||
                        (typeof user.email === 'string' ? user.email.split('@')[0] : null) ||
                        'Usuário');
                        
        setCurrentHostAvatar(avatarUrl);
        setCurrentHostName(userName);
        
        console.log('✅ Perfil atualizado em tempo real:', {
          avatarUrl,
          userName,
          userMetadata: user.user_metadata
        });
      }
    };
    
    // Atualizar perfil imediatamente
    updateUserProfile();
    
    // Configurar intervalo para atualizar a cada 5 segundos
    const profileUpdateInterval = setInterval(updateUserProfile, 5000);
    
    return () => {
      clearInterval(profileUpdateInterval);
    };
  }, [user]);
  
  useEffect(() => {
    if (stream) {
      // Inicializar a conexão de vídeo automaticamente
      initializeVideoConnection();
      
      // Configurar contador de tempo de reunião
      const interval = setInterval(() => {
        setStreamTime(prev => prev + 1);
      }, 1000);
      
      setStreamIntervalId(interval);
      
      // Simular alguns participantes iniciais (apenas para demonstração)
      setParticipantList([
        { id: "1", name: "Maria Silva", avatar: "/avatars/avatar-1.png" },
        { id: "2", name: "João Santos", avatar: "/avatars/avatar-2.png" },
        { id: "3", name: "Ana Oliveira", avatar: "/avatars/avatar-3.png" }
      ]);
      
      return () => {
        clearInterval(interval);
        endMeeting();
      };
    }
  }, [stream, navigate]); // Só incluímos navigate como dependência, pois as outras funções são definidas no componente

  const toggleMute = () => {
    if (window.localStream) {
      const audioTracks = window.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (window.localStream) {
      const videoTracks = window.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream;
          screenShareRef.current.play();
        }
        
        // Aqui implementaria a lógica para enviar o stream de compartilhamento
        // para os outros participantes
        
        setIsScreenSharing(true);
        } else {
        // Parar o compartilhamento
        if (screenShareRef.current && screenShareRef.current.srcObject) {
          const tracks = (screenShareRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(track => track.stop());
          screenShareRef.current.srcObject = null;
        }
        
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error("Erro ao compartilhar tela:", error);
      showToast({
        title: "Erro no compartilhamento",
        description: "Não foi possível compartilhar sua tela",
        variant: "destructive"
      });
    }
  };

  const toggleRecording = () => {
    // Implementação simplificada para interface
    setIsRecording(!isRecording);
    
    if (!isRecording) {
      showToast({
        title: "Gravação iniciada",
        description: "Sua reunião está sendo gravada",
      });
      } else {
      showToast({
        title: "Gravação finalizada",
        description: "A gravação da reunião foi salva",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].join(':');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between bg-black p-4 border-b border-zinc-800/50">
        <div className="flex items-center space-x-3">
          <div className="bg-red-600 w-2 h-2 rounded-full animate-pulse" />
          <span className="text-white font-medium">Ao vivo</span>
          <span className="text-white/60 text-sm">({formatTime(streamTime)})</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4 text-white/60" />
            <span className="text-white/80 text-sm">{viewerCount}</span>
          </div>
          
          <Button
            variant="destructive" 
            size="sm"
            onClick={endMeeting}
            className="text-xs bg-red-600 hover:bg-red-700"
          >
            Encerrar
          </Button>
        </div>
      </div>
      
      <div className="flex flex-1 h-full">
        {/* Área principal da reunião */}
        <div className="flex-1 bg-black relative">
          {connectionStatus === 'connecting' ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <RefreshCw className="h-8 w-8 text-white/80 animate-spin mb-4" />
                <p className="text-white/80">Conectando à reunião...</p>
              </div>
            </div>
          ) : connectionStatus === 'error' ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <p className="text-white/80 mb-2">Erro ao conectar à reunião</p>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={initializeVideoConnection}
                  className="border-white/20 text-white/80 hover:bg-white/10"
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 p-4 h-full">
              <div className="bg-zinc-900 rounded-lg overflow-hidden relative">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  className="w-full h-full object-cover"
                />
                {isCameraOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                    {currentHostAvatar ? (
                      <img 
                        src={currentHostAvatar} 
                        alt={currentHostName}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                      />
                    ) : (
                    <User className="h-16 w-16 text-white/20" />
                    )}
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-xs flex items-center space-x-2">
                  {currentHostAvatar && (
                    <img 
                      src={currentHostAvatar} 
                      alt={currentHostName}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  )}
                  <span>{currentHostName} (Anfitrião)</span>
                </div>
              </div>
            
              {isScreenSharing && (
                <div className="bg-zinc-900 rounded-lg overflow-hidden relative">
                  <video 
                    ref={screenShareRef} 
                    autoPlay 
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-xs">
                    Compartilhamento de tela
                  </div>
                </div>
              )}
              
              {participantList.map((participant) => (
                <div key={participant.id} className="bg-zinc-900 rounded-lg overflow-hidden relative">
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
                    <User className="h-16 w-16 text-white/20" />
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-xs">
                    {participant.name}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Controles da reunião simplificados */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-zinc-900/90 rounded-full px-4 py-2">
            <Button
              size="icon"
              variant={isMuted ? "destructive" : "secondary"}
              onClick={toggleMute}
              className={isMuted ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            
            <Button 
              size="icon" 
              variant={isCameraOff ? "destructive" : "secondary"}
              onClick={toggleCamera}
              className={isCameraOff ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
            
            <Button 
              size="icon" 
              variant={isScreenSharing ? "destructive" : "secondary"}
              onClick={toggleScreenShare}
              className={isScreenSharing ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              <ScreenShare className="h-5 w-5" />
            </Button>
          </div>
        </div>
            
        {/* Painel de chat (sempre visível) */}
        <div className="w-80 bg-zinc-700 border-l border-zinc-600 flex flex-col">
          <div className="p-3 border-b border-zinc-600 flex justify-between items-center bg-zinc-800">
            <h3 className="text-white font-medium">Chat da Transmissão</h3>
          </div>
            
          <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-zinc-700">
            {/* Implementar mensagens do chat aqui */}
            <div className="flex items-start space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={currentHostAvatar || "/avatars/avatar-1.png"} 
                  alt={currentHostName || "Anfitrião"} 
                />
                <AvatarFallback className="bg-zinc-700 text-white">
                  {currentHostName ? currentHostName.charAt(0).toUpperCase() : 'A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-white text-sm font-medium">
                    {currentHostName || 'Anfitrião'} 
                    <span className="text-indigo-400 ml-1 text-xs">(Host)</span>
                  </span>
                  <span className="text-zinc-400 text-xs">12:45</span>
                </div>
                <p className="text-white text-sm bg-indigo-600 rounded-lg px-2 py-1 mt-1">Olá pessoal! Bem-vindos à minha transmissão!</p>
              </div>
            </div>
              
            <div className="flex items-start space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatars/avatar-2.png" alt="João" />
                <AvatarFallback className="bg-zinc-700 text-white">JS</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-white text-sm font-medium">João Santos</span>
                  <span className="text-zinc-400 text-xs">12:47</span>
                </div>
                <p className="text-white text-sm bg-zinc-600 rounded-lg px-2 py-1 mt-1">Olá! Obrigado pela transmissão!</p>
              </div>
            </div>
          </div>
        
          <div className="p-3 border-t border-zinc-600 bg-zinc-800">
            <div className="relative">
              <Input 
                placeholder="Digite sua mensagem..." 
                className="bg-zinc-600 border-zinc-500 text-white pr-10 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
              />
              <Button
                size="icon" 
                variant="ghost"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Funções mock para corrigir erros do linter (a serem implementadas adequadamente)
const checkStreamPermission = async (userId: string) => {
  // Implementação provisória
  return true;
};

const getActiveStreams = async () => {
  // Implementação provisória
  return [];
};

const getStreamComments = async (streamId: string) => {
  // Implementação provisória
  return [];
};

const incrementViewerCount = async (streamId: string) => {
  // Implementação provisória
  return;
};

const sendStreamComment = async (streamId: string, userId: string, userName: string, userAvatar: string, comment: string, isHost: boolean) => {
  // Implementação provisória
  return null;
};

const likeStreamComment = async (commentId: string) => {
  // Implementação provisória
  return;
};

// Card de transmissão
const MeetingCard: React.FC<{ meeting: MeetingData; onClick: () => void }> = ({ meeting, onClick }) => {
  const { status, title, hostName, thumbnail, participantCount, startedAt, startTime, createdAt } = meeting;
  const { canStartLive } = useLiveStreamPermission();
  
  // Corrigido: Verificar se o usuário pode iniciar transmissão ao vivo
  const isHost = canStartLive;
  
  // Função para formatar tempo relativo
  const formatRelativeTime = (date?: Date) => {
    if (!date) return '';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Se for no futuro (agendada)
    if (diff < 0) {
      const days = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
      if (days > 0) return `Em ${days} dia${days > 1 ? 's' : ''}`;
      
      const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
      if (hours > 0) return `Em ${hours} hora${hours > 1 ? 's' : ''}`;
      
      const minutes = Math.floor(Math.abs(diff) / (1000 * 60));
      return `Em ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    }
    
    // Se for no passado
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `Há ${days} dia${days > 1 ? 's' : ''}`;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `Há ${hours} hora${hours > 1 ? 's' : ''}`;
    
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes > 0) return `Há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    
    return 'Agora mesmo';
  };
  
  // Função para formatar data em formato amigável
  const formatDate = (date?: Date) => {
    if (!date) return '';
    
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const getStatusInfo = () => {
    switch (status) {
      case 'live':
    return {
          badgeText: 'AO VIVO',
          badgeClass: 'bg-gradient-to-r from-red-700 to-red-600',
          iconComponent: <Video className="h-3.5 w-3.5 text-red-300" />
        };
      case 'scheduled':
        return {
          badgeText: 'AGENDADA',
          badgeClass: 'bg-gradient-to-r from-amber-700 to-amber-600',
          iconComponent: <Calendar className="h-3.5 w-3.5 text-amber-300" />
        };
      case 'ended':
        return {
          badgeText: 'FINALIZADA',
          badgeClass: 'bg-gradient-to-r from-gray-700 to-gray-600',
          iconComponent: <FileCheck className="h-3.5 w-3.5 text-gray-300" />
        };
      default:
        return {
          badgeText: 'INDISPONÍVEL',
          badgeClass: 'bg-gradient-to-r from-gray-700 to-gray-600',
          iconComponent: <XCircle className="h-3.5 w-3.5 text-gray-300" />
        };
    }
  };
  
  const { badgeText, badgeClass, iconComponent } = getStatusInfo();
  const timeText = status === 'live' 
    ? formatRelativeTime(startedAt || createdAt)
    : status === 'scheduled'
      ? formatDate(startTime) 
      : formatRelativeTime(startedAt || createdAt);

  return (
    <div 
      className="group flex flex-col overflow-hidden bg-gradient-to-br from-gray-950 to-black rounded-xl border border-gray-800/30 hover:border-gray-700/50 shadow-lg shadow-black/60 transition-all duration-500 cursor-pointer transform hover:-translate-y-1"
      onClick={onClick}
    >
      {/* Thumbnail com overlay e efeitos */}
      <div className="relative aspect-video overflow-hidden bg-gray-950">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="p-4 rounded-full bg-gray-800/50 group-hover:bg-gray-700/50 transition-colors duration-300">
              <Video className="h-12 w-12 text-gray-600 group-hover:text-gray-400 transition-colors duration-300" />
            </div>
          </div>
        )}
        
        {/* Overlay gradiente aprimorado */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
        
        {/* Badge de status com design aprimorado */}
        <div className={`absolute top-2 left-2 ${badgeClass} px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-black/30 backdrop-blur-sm`}>
          {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-300 animate-pulse"></span>}
          {iconComponent}
          <span className="text-white">{badgeText}</span>
        </div>
            
        {/* Badge de anfitrião se for o próprio usuário */}
        {isHost && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-indigo-700 to-indigo-600 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-black/30 backdrop-blur-sm">
            <Crown className="h-3.5 w-3.5 text-indigo-300" />
            <span className="text-white">SEU CANAL</span>
          </div>
        )}
        
        {/* Contador de participantes para lives */}
        {status === 'live' && (
          <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border border-white/5">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-white">{participantCount || 0} <span className="text-white/70">participante{participantCount !== 1 ? 's' : ''}</span></span>
          </div>
        )}
        
        {/* Tempo com design aprimorado */}
        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border border-white/5">
          <Clock className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-white">{timeText}</span>
        </div>
      </div>
      
      {/* Conteúdo do card */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-white font-medium line-clamp-2 transition-colors mb-1">{title}</h3>
        
        {/* Descrição */}
        {meeting.description && (
          <p className="text-gray-400 text-sm line-clamp-2 mb-2 leading-relaxed">
            {meeting.description}
          </p>
        )}
        
        {/* Tags, se existirem */}
        {meeting.tags && meeting.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
            {(() => {
              // Verificar se tags é um array ou string
              const tagsArray = Array.isArray(meeting.tags) 
                ? meeting.tags 
                : (typeof meeting.tags === 'string' 
                    ? (meeting.tags as string).split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
                    : []
                  );
              
              return tagsArray.slice(0, 3).map((tag, index) => (
              <div key={index} className="px-1.5 py-0.5 bg-gray-800/50 rounded-md text-[10px] text-gray-400">
                #{tag}
              </div>
              ));
            })()}
            {(() => {
              const tagsArray = Array.isArray(meeting.tags) 
                ? meeting.tags 
                : (typeof meeting.tags === 'string' 
                    ? (meeting.tags as string).split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
                    : []
                  );
              
              return tagsArray.length > 3 && (
              <div className="px-1.5 py-0.5 bg-gray-800/50 rounded-md text-[10px] text-gray-400">
                  +{tagsArray.length - 3}
              </div>
              );
            })()}
          </div>
        )}
        
        <div className="mt-auto pt-3 flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-700 to-indigo-900 overflow-hidden flex-shrink-0 mr-2.5 ring-2 ring-black">
            {meeting.hostAvatar ? (
              <img src={meeting.hostAvatar} alt={hostName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white text-xs">
                {hostName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="flex-grow">
            <p className="text-sm text-white/90 font-medium line-clamp-1 flex items-center">
              {hostName || 'Anônimo'}
              {meeting.isVerifiedHost && (
                <span className="ml-1.5 bg-blue-500 p-0.5 rounded-full flex items-center justify-center">
                  <CheckIcon className="h-2.5 w-2.5 text-white" />
                </span>
              )}
            </p>
            
            {/* Status adicional */}
            {status === 'live' && (
              <p className="text-[11px] text-indigo-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                Transmitindo agora
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente principal da página Live
export default function Live() {
  const auth = useAuth();
  const { language } = useLanguage();
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingData | null>(null);
  const [showEndedMeetings, setShowEndedMeetings] = useState(false);
  const navigate = useNavigate();
  const { canStartLive } = useLiveStreamPermission();
  const { fetchStreams, createStream } = useLiveStream();
  const { sendLiveNotification } = useTrendingNotifications();
  
  // Função para obter textos traduzidos baseado no idioma atual
  const getTexts = () => {
    switch (language) {
      case 'en':
        return {
          title: 'Live Broadcasts',
          description: 'Share your knowledge, interact in real time and learn from financial market experts.',
          tabLive: 'Live',
          tabScheduled: 'Scheduled',
          allCategories: 'All categories',
          searchPlaceholder: 'Search broadcasts',
          loadingTitle: 'Loading broadcasts',
          loadingMessage: 'Please wait while we fetch available broadcasts...',
          noLiveTitle: 'No live broadcasts',
          noLiveMessage: 'There are no broadcasts happening at the moment.',
          startStreaming: 'Start Streaming',
          noScheduledMessage: 'There are no scheduled broadcasts to happen soon.',
          modalTitle: 'New Broadcast',
          modalDescription: 'Configure your broadcast and share your knowledge live'
        };
      case 'es':
        return {
          title: 'Transmisiones en Vivo',
          description: 'Comparte tu conocimiento, interactúa en tiempo real y aprende de expertos del mercado financiero.',
          tabLive: 'En Vivo',
          tabScheduled: 'Programadas',
          allCategories: 'Todas las categorías',
          searchPlaceholder: 'Buscar transmisiones',
          loadingTitle: 'Cargando transmisiones',
          loadingMessage: 'Espera mientras buscamos las transmisiones disponibles...',
          noLiveTitle: 'No hay transmisiones en vivo',
          noLiveMessage: 'En este momento no hay transmisiones en curso.',
          startStreaming: 'Iniciar Transmisión',
          noScheduledMessage: 'No hay transmisiones programadas para suceder pronto.',
          modalTitle: 'Nueva Transmisión',
          modalDescription: 'Configure su transmisión y comparta sus conocimientos en vivo'
        };
      default: // 'pt'
        return {
          title: 'Transmissões ao vivo',
          description: 'Compartilhe seu conhecimento, interaja em tempo real e aprenda com especialistas do mercado financeiro.',
          tabLive: 'Ao Vivo',
          tabScheduled: 'Agendadas',
          allCategories: 'Todas categorias',
          searchPlaceholder: 'Pesquisar transmissões',
          loadingTitle: 'Carregando transmissões',
          loadingMessage: 'Aguarde enquanto buscamos as transmissões disponíveis...',
          noLiveTitle: 'Nenhuma transmissão ao vivo',
          noLiveMessage: 'No momento não há transmissões acontecendo.',
          startStreaming: 'Iniciar Transmissão',
          noScheduledMessage: 'Não há transmissões agendadas para acontecer em breve.',
          modalTitle: 'Nova Transmissão',
          modalDescription: 'Configure sua transmissão e compartilhe seus conhecimentos ao vivo'
        };
    }
  };

  const texts = getTexts();
  
  useEffect(() => {
    loadMeetings();
    
    // Definir um timeout para parar o loading após 5 segundos
    const timeoutId = setTimeout(() => {
      setLoadingTimeout(true);
    }, 5000);
    
    // ✅ NOVO: Atualizar streams a cada 10 segundos
    const intervalId = setInterval(() => {
      console.log('🔄 [Live] Atualizando lista de transmissões...');
      loadMeetings();
    }, 10000); // 10 segundos
    
    // ✅ NOVO: Atualizar quando a página recebe foco
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ [Live] Página visível, recarregando transmissões...');
        loadMeetings();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  const loadMeetings = async () => {
    setIsLoading(true);
    
    try {
      // Carregando transmissões (silenciado)
      
      // Buscar transmissões usando o contexto
      const streams = await fetchStreams();
      
      if (streams && Array.isArray(streams)) {
        // Converter streams para o formato MeetingData
        const meetingsData: MeetingData[] = streams.map(stream => ({
          id: stream.id,
          title: stream.title,
          description: stream.description || '',
          tags: Array.isArray(stream.tags) 
            ? stream.tags 
            : (typeof stream.tags === 'string' 
                ? (stream.tags as string).split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
                : []
              ),
          userId: stream.userId,
          status: stream.status as 'scheduled' | 'live' | 'ended' | 'deleted',
          thumbnail: stream.thumbnailUrl || '',
          meetingId: stream.id,
          hostId: stream.userId,
          hostName: String(stream.streamSettings?.hostName || 'Streamer'),
          hostAvatar: String(stream.streamSettings?.hostAvatar || ''),
          participantCount: stream.viewerCount || 0,
          startedAt: stream.startedAt ? new Date(stream.startedAt) : undefined,
          startTime: stream.scheduledStart ? new Date(stream.scheduledStart) : undefined,
          createdAt: new Date(stream.createdAt),
          isVerifiedHost: true
        }));
        
        setMeetings(meetingsData);
        // Transmissões carregadas (silenciado)
      }
    } catch (error) {
      console.error('Erro ao carregar transmissões:', error);
      toast("Erro ao carregar transmissões. Tente novamente mais tarde.");
    } finally {
      setIsLoading(false);
      setLoadingTimeout(true);
    }
  };
  
  // Função para lidar com a criação de uma nova reunião
  const handleMeetingCreated = (meeting: MeetingData) => {
    setMeetings(prev => [meeting, ...prev]);
    
    // Enviar notificação quando a live for criada e estiver ao vivo
    if (meeting.status === 'live') {
      sendLiveNotification({
        id: meeting.id,
        title: meeting.title,
        streamerName: meeting.hostName || 'Streamer',
        startedAt: new Date()
      });
    }
    
    toast.success("Sucesso!", { description: "Sua transmissão foi criada com sucesso" });
  };
  
  // Função para selecionar uma reunião
  const handleSelectMeeting = (meeting: MeetingData) => {
    if (meeting.status === 'live') {
      // Verificar se o usuário é o dono da transmissão
      if (meeting.userId === auth.user?.id) {
        // Se for o dono, vai para o dashboard do streamer
        navigate(`/streamer/${meeting.id}`);
      } else {
        // Se não for o dono, vai para a página de visualização
        navigate(`/watch/${meeting.id}`);
      }
    } else {
      setSelectedMeeting(meeting);
      // Exibir detalhes da reunião agendada
    }
  };

  // Função helper para verificar permissões
  const hasPermission = (): boolean => {
    return canStartLive;
  };

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
        {/* Hero section com design escuro premium */}
        <div className="rounded-2xl overflow-hidden bg-black border border-gray-900/30 p-8 md:p-10 relative backdrop-blur-md">
          <div className="absolute inset-0 bg-grid-white/[0.005] [mask-image:linear-gradient(0deg,transparent,#000)]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/40 via-black to-gray-950/40"></div>
          
          {/* Efeitos de iluminação sutil */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/3 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-purple-500/3 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              {texts.title}
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-6">
              {texts.description}
            </p>
            
            {/* Status de permissão do usuário - só mostra se tem permissão */}
            {hasPermission() && (
              <div className="mb-6 p-4 bg-gray-950/60 backdrop-blur-sm border border-gray-800/30 rounded-xl">
                <p className="text-gray-400 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-gray-500" />
                  <span>Você tem permissão para iniciar transmissões ao vivo</span>
                </p>
              </div>
            )}
            
            {/* Botão de iniciar transmissão deve aparecer apenas para usuários autorizados */}
            {hasPermission() && (
              <Dialog open={openModal} onOpenChange={setOpenModal}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-gradient-to-r from-gray-900 to-black hover:from-gray-800 hover:to-gray-900 text-white border border-gray-700/50 rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-3xl backdrop-blur-sm">
                    <Video className="h-5 w-5 mr-2" />
                    {texts.startStreaming}
                  </Button>
                </DialogTrigger>
                
                <MeetingModal 
                  open={openModal}
                  onOpenChange={setOpenModal}
                  onMeetingCreated={handleMeetingCreated}
                />
              </Dialog>
            )}
          </div>
        
          {/* Elementos decorativos sutis */}
          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gray-900/10 rounded-full blur-3xl"></div>
          <div className="absolute top-10 right-10 w-24 h-24 bg-gray-900/8 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 -left-4 w-16 h-16 bg-gray-900/5 rounded-full blur-xl"></div>
          
          {/* Borda com gradiente sutil */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-600/5 via-transparent to-gray-600/5 p-px">
            <div className="w-full h-full bg-transparent rounded-2xl"></div>
          </div>
        </div>
                  
        {/* Abas para as transmissões */}
        <Tabs defaultValue="live" className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList className="bg-black/60 border border-gray-900/30 p-1 rounded-xl backdrop-blur-sm">
              <TabsTrigger value="live" className="rounded-lg data-[state=active]:bg-black/80 data-[state=active]:text-gray-200 text-gray-500 hover:text-gray-300 px-4 py-2 transition-all duration-200">
                <Video className="h-4 w-4 mr-2" />
                <span>{texts.tabLive}</span>
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="rounded-lg data-[state=active]:bg-black/80 data-[state=active]:text-gray-200 text-gray-500 hover:text-gray-300 px-4 py-2 transition-all duration-200">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{texts.tabScheduled}</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="hidden sm:flex items-center gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px] bg-black/20 border-white/10 focus:border-white/10 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:shadow-none">
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 backdrop-blur-md border-white/5 shadow-2xl">
                  <SelectItem value="all" className="text-white/80 hover:bg-white/5 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus:shadow-none">{texts.allCategories}</SelectItem>
                  <SelectItem value="crypto" className="text-white/80 hover:bg-white/5 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus:shadow-none">Criptomoedas</SelectItem>
                  <SelectItem value="stocks" className="text-white/80 hover:bg-white/5 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus:shadow-none">Ações</SelectItem>
                  <SelectItem value="forex" className="text-white/80 hover:bg-white/5 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus:shadow-none">Forex</SelectItem>
                  <SelectItem value="education" className="text-white/80 hover:bg-white/5 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus:shadow-none">Educacional</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder={texts.searchPlaceholder} 
                  className="pl-9 bg-black/20 border-white/10 w-[220px] focus:border-zinc-700/60 focus:ring-1 focus:ring-zinc-700/50 focus:outline-none" 
                />
              </div>
            </div>
          </div>
          
          {isLoading && !loadingTimeout ? (
            <div className="relative flex flex-col items-center justify-center py-24 px-12 text-center bg-black rounded-2xl border border-gray-900/30 backdrop-blur-md overflow-hidden min-h-80">
              {/* Efeitos de iluminação de fundo */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-950/40 via-black to-gray-950/40"></div>
              <div className="absolute top-0 left-1/4 w-72 h-72 bg-gray-500/3 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gray-600/3 rounded-full blur-3xl"></div>
              
              {/* Grade sutil de fundo */}
              <div className="absolute inset-0 bg-grid-white/[0.005] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
              
              <div className="relative z-10 flex flex-col items-center">
                {/* Spinner simples */}
                <div className="relative mb-8">
                  <div className="animate-spin w-12 h-12 border-4 border-gray-800/40 border-t-gray-500 rounded-full"></div>
                </div>
                
                {/* Texto de carregamento */}
                <h3 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                  {texts.loadingTitle}
                </h3>
                <p className="text-gray-500 text-base">
                  {texts.loadingMessage}
                </p>
              </div>
              
              {/* Borda com gradiente sutil */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-600/5 via-transparent to-gray-600/5 p-px">
                <div className="w-full h-full bg-black/10 rounded-2xl"></div>
              </div>
            </div>
          ) : (
            <>
              <TabsContent value="live" className="space-y-4">
                {meetings.filter(m => m.status === 'live').length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {meetings
                      .filter(meeting => meeting.status === 'live')
                      .map(meeting => (
                        <MeetingCard
                          key={meeting.id}
                          meeting={meeting}
                          onClick={() => handleSelectMeeting(meeting)}
                        />
                      ))}
                    </div>
                  ) : (
                  <div className="relative flex flex-col items-center justify-center py-24 px-12 text-center bg-black rounded-2xl border border-gray-900/30 backdrop-blur-md overflow-hidden min-h-80">
                    {/* Efeitos de iluminação de fundo */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-950/40 via-black to-gray-950/40"></div>
                    <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-0 w-48 h-48 bg-blue-500/3 rounded-full blur-2xl"></div>
                    <div className="absolute top-1/2 right-0 w-64 h-64 bg-violet-500/3 rounded-full blur-2xl"></div>
                                        
                    {/* Grade sutil de fundo */}
                    <div className="absolute inset-0 bg-grid-white/[0.005] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                      {/* Ícone sem glow */}
                      <div className="relative mb-8">
                        <div className="relative bg-gradient-to-br from-gray-900 to-black p-8 rounded-full border border-gray-800/50 shadow-2xl">
                          <Video className="h-16 w-16 text-gray-600" />
                        </div>
                      </div>
                      
                      {/* Título com gradiente */}
                      <h3 className="text-4xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                        {texts.noLiveTitle}
                      </h3>
                      
                      {/* Descrição */}
                      <p className="text-gray-400 text-lg max-w-lg leading-relaxed mb-8">
                        {texts.noLiveMessage}
                      </p>
                      
                      {/* Usando a nova função helper */}
                      {hasPermission() && (
                        <Dialog open={openModal} onOpenChange={setOpenModal}>
                          <DialogTrigger asChild>
                            <Button className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl border border-indigo-500/30">
                              <Video className="h-5 w-5 mr-2" />
                              {texts.startStreaming}
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      )}
                    </div>
                    
                    {/* Borda com gradiente sutil */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-600/5 via-transparent to-purple-600/5 p-px">
                      <div className="w-full h-full bg-black/10 rounded-2xl"></div>
                    </div>
                  </div>
              )}
              </TabsContent>
              
              <TabsContent value="scheduled" className="space-y-4">
                {meetings.filter(m => m.status === 'scheduled').length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {meetings
                      .filter(meeting => meeting.status === 'scheduled')
                      .map(meeting => (
                        <MeetingCard
                          key={meeting.id}
                          meeting={meeting}
                          onClick={() => handleSelectMeeting(meeting)}
                        />
                      ))
                    }
            </div>
                ) : (
                  <div className="relative flex flex-col items-center justify-center py-24 px-12 text-center bg-black rounded-2xl border border-gray-900/30 backdrop-blur-md overflow-hidden min-h-80">
                    {/* Efeitos de iluminação de fundo */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-950/40 via-black to-gray-950/40"></div>
                    <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-0 w-48 h-48 bg-cyan-500/3 rounded-full blur-2xl"></div>
                    <div className="absolute top-1/2 right-0 w-64 h-64 bg-emerald-500/3 rounded-full blur-2xl"></div>
                    
                                        {/* Grade sutil de fundo */}
                    <div className="absolute inset-0 bg-grid-white/[0.005] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                      {/* Ícone sem glow */}
                      <div className="relative mb-8">
                        <div className="relative bg-gradient-to-br from-gray-900 to-black p-8 rounded-full border border-gray-800/50 shadow-2xl">
                          <Calendar className="h-16 w-16 text-gray-600" />
                        </div>
                      </div>
                      
                      {/* Título com gradiente */}
                      <h3 className="text-4xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                        Nenhuma transmissão agendada
                      </h3>
                      
                      {/* Descrição */}
                      <p className="text-gray-400 text-lg max-w-lg leading-relaxed mb-8">
                        {texts.noScheduledMessage}
                      </p>
                      
                      {/* Usando a nova função helper */}
                      {hasPermission() && (
                        <Dialog open={openModal} onOpenChange={setOpenModal}>
                          <DialogTrigger asChild>
                            <Button className="mt-8 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-8 py-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl border border-blue-500/30">
                              <Video className="h-5 w-5 mr-2" />
                              {texts.startStreaming}
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      )}
                    </div>
                    
                    {/* Borda com gradiente sutil */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600/5 via-transparent to-teal-600/5 p-px">
                      <div className="w-full h-full bg-black/10 rounded-2xl"></div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
            </div>
    </Layout>
  );
}
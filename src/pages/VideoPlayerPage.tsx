import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useVideo } from "@/contexts/VideoContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { VideoCard } from "@/components/ui/video-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Heart,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  Flag,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipForward,
  SkipBack,
  Settings,
  MoreVertical,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function VideoPlayerPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    videos,
    currentVideo,
    currentComments,
    isLoading,
    getVideoById,
    getVideoComments,
    getVideos,
    addComment
  } = useVideo();

  // Estados do player
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Carregar vídeo e comentários
  useEffect(() => {
    if (videoId) {
      // Carregar vídeo principal
      const loadVideo = async () => {
        const video = await getVideoById(videoId);
        if (video) {
          setLikeCount(video.likes || 0);
          // Carregar comentários
          getVideoComments(videoId);
          
          // Carregar vídeos relacionados (excluindo o atual)
          getVideos({ category: video.category });
        }
      };
      
      loadVideo();
    }
  }, [videoId]);
  
  // Controlar visualização de controles
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
      
      controlsTimerRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };
    
    const container = videoContainerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", () => {
        if (isPlaying) {
          setShowControls(false);
        }
      });
    }
    
    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", () => {});
      }
      
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, [isPlaying]);
  
  // Funções do player
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    const newMuted = !isMuted;
    video.muted = newMuted;
    setIsMuted(newMuted);
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    const video = videoRef.current;
    if (video) {
      video.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };
  
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = progressRef.current;
    const video = videoRef.current;
    if (!progressBar || !video) return;
    
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * video.duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const toggleFullscreen = () => {
    const container = videoContainerRef.current;
    if (!container) return;
    
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };
  
  // Formato de tempo (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Funções de interação
  const handleLikeClick = () => {
    if (!user) {
      toast.error("Faça login para curtir vídeos");
      return;
    }
    
    if (liked) {
      setLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      setLiked(true);
      if (disliked) {
        setDisliked(false);
      }
      setLikeCount(prev => prev + 1);
    }
  };
  
  const handleDislikeClick = () => {
    if (!user) {
      toast.error("Faça login para avaliar vídeos");
      return;
    }
    
    if (disliked) {
      setDisliked(false);
    } else {
      setDisliked(true);
      if (liked) {
        setLiked(false);
        setLikeCount(prev => prev - 1);
      }
    }
  };
  
  const handleSaveClick = () => {
    if (!user) {
      toast.error("Faça login para salvar vídeos");
      return;
    }
    
    setSaved(!saved);
    toast.success(saved ? "Vídeo removido da biblioteca" : "Vídeo salvo na biblioteca");
  };
  
  const handleShareClick = () => {
    if (navigator.share) {
      navigator.share({
        title: currentVideo?.title || "Vídeo compartilhado",
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para área de transferência");
    }
  };
  
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Faça login para comentar");
      return;
    }
    
    if (!commentText.trim()) {
      return;
    }
    
    setIsSubmittingComment(true);
    
    try {
      if (videoId) {
        const success = await addComment(videoId, commentText);
        if (success) {
          setCommentText("");
          toast.success("Comentário adicionado");
        }
      }
    } catch (error) {
      toast.error("Erro ao adicionar comentário");
    } finally {
      setIsSubmittingComment(false);
    }
  };
  
  // Formatação de data
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR
    });
  };
  
  // Formatação de visualizações
  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)} M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)} mil`;
    }
    return views.toString();
  };

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="container py-6 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Vídeo principal (loading) */}
            <div className="flex-1 space-y-4">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-8 w-2/3" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
            
            {/* Sidebar (loading) */}
            <div className="lg:w-[360px] space-y-4">
              {Array(5).fill(null).map((_, idx) => (
                <div key={idx} className="flex gap-2">
                  <Skeleton className="w-[168px] h-[94px] rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Se não encontrar o vídeo
  if (!currentVideo) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Vídeo não encontrado</h2>
          <p className="text-muted-foreground mb-6">O vídeo que você está procurando não existe ou foi removido.</p>
          <Button onClick={() => navigate("/videos")}>Explorar vídeos</Button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Coluna principal */}
          <div className="flex-1 space-y-6">
            {/* Player de vídeo */}
            <div 
              ref={videoContainerRef}
              className="relative aspect-video bg-black rounded-lg overflow-hidden"
            >
              <video
                ref={videoRef}
                src={currentVideo.video_url}
                className="w-full h-full"
                poster={currentVideo.thumbnail}
                autoPlay
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
                onDurationChange={() => videoRef.current && setDuration(videoRef.current.duration)}
                onVolumeChange={() => videoRef.current && setVolume(videoRef.current.volume)}
              />
              
              {/* Controles do vídeo */}
              <div 
                className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 transition-opacity duration-300",
                  showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
              >
                {/* Barra de progresso */}
                <div
                  ref={progressRef}
                  className="absolute bottom-12 left-0 right-0 h-1 bg-white/30 cursor-pointer mx-4"
                  onClick={handleProgressClick}
                >
                  <div 
                    className="absolute top-0 left-0 h-full bg-red-600"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                
                {/* Controles inferiores */}
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={togglePlay} 
                      className="text-white hover:text-white/80 transition"
                      title={isPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
                      aria-label={isPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
                    >
                      {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={toggleMute} 
                        className="text-white hover:text-white/80 transition"
                        title={isMuted ? "Ativar som" : "Desativar som"}
                        aria-label={isMuted ? "Ativar som do vídeo" : "Desativar som do vídeo"}
                      >
                        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      </button>
                      
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-16 accent-red-600"
                        title="Controle de volume"
                        aria-label="Controle de volume do vídeo"
                      />
                    </div>
                    
                    <div className="text-white text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={toggleFullscreen} 
                      className="text-white hover:text-white/80 transition"
                      title="Tela cheia"
                      aria-label="Ativar modo de tela cheia"
                    >
                      <Maximize className="h-5 w-5" />
                    </button>
                    
                    <button 
                      className="text-white hover:text-white/80 transition"
                      title="Configurações do vídeo"
                      aria-label="Abrir configurações do vídeo"
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Informações do vídeo */}
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">{currentVideo.title}</h1>
              
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={currentVideo.avatar_url} />
                    <AvatarFallback>{currentVideo.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{currentVideo.username}</span>
                      <CheckCircle className="h-4 w-4 text-blue-500 fill-blue-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatViews(currentVideo.views)} visualizações • {formatDate(currentVideo.created_at)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="bg-muted rounded-full flex">
                    <Button
                      variant={liked ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "rounded-l-full pr-3 gap-1 hover:bg-accent",
                        liked && "bg-primary hover:bg-primary/90"
                      )}
                      onClick={handleLikeClick}
                      title="Gostei"
                      aria-label="Gostei do vídeo"
                    >
                      <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} />
                      {likeCount > 0 && <span>{formatViews(likeCount)}</span>}
                    </Button>
                    
                    <Button
                      variant={disliked ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "rounded-r-full hover:bg-accent",
                        disliked && "bg-primary hover:bg-primary/90"
                      )}
                      onClick={handleDislikeClick}
                      title="Não gostei"
                      aria-label="Não gostei do vídeo"
                    >
                      <ThumbsDown className={cn("h-4 w-4", disliked && "fill-current")} />
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full gap-1.5"
                    onClick={handleShareClick}
                  >
                    <Share2 className="h-4 w-4" />
                    Compartilhar
                  </Button>
                  
                  <Button
                    variant={saved ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "rounded-full gap-1.5",
                      saved && "bg-primary hover:bg-primary/90"
                    )}
                    onClick={handleSaveClick}
                  >
                    <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
                    {saved ? "Salvo" : "Salvar"}
                  </Button>
                </div>
              </div>
              
              {/* Descrição do vídeo */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex gap-2 flex-wrap mb-2">
                  <Badge variant="outline">{currentVideo.category}</Badge>
                  {currentVideo.tags.map(tag => (
                    <Badge key={tag} variant="secondary">#{tag}</Badge>
                  ))}
                </div>
                
                <p className="whitespace-pre-line">{currentVideo.description}</p>
              </div>
            </div>
            
            {/* Comentários */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {currentComments.length} {currentComments.length === 1 ? 'comentário' : 'comentários'}
              </h3>
              
              {/* Formulário de comentário */}
              {user ? (
                <form onSubmit={handleCommentSubmit} className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={String(user.user_metadata?.avatar_url || '')} />
                    <AvatarFallback>{String(user.user_metadata?.name || '').charAt(0) || user.email?.charAt(0)?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Adicione um comentário..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      disabled={isSubmittingComment}
                    />
                    
                    {commentText.trim() && (
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCommentText("")}
                          disabled={isSubmittingComment}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!commentText.trim() || isSubmittingComment}
                        >
                          Comentar
                        </Button>
                      </div>
                    )}
                  </div>
                </form>
              ) : (
                <p className="text-center py-2 text-sm text-muted-foreground">
                  <Button variant="link" onClick={() => navigate("/auth")}>Faça login</Button>
                  para adicionar um comentário
                </p>
              )}
              
              <Separator className="my-4" />
              
              {/* Lista de comentários */}
              <div className="space-y-6">
                {currentComments.length > 0 ? (
                  currentComments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={comment.avatar_url} />
                        <AvatarFallback>{comment.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{comment.username}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                        </div>
                        
                        <p className="text-sm mt-1">{comment.content}</p>
                        
                        <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                          <button 
                            className="flex items-center gap-1 text-xs hover:text-foreground"
                            title="Gostei"
                            aria-label="Gostei do comentário"
                          >
                            <ThumbsUp className="h-3 w-3" />
                            {comment.likes || 0}
                          </button>
                          <button 
                            className="flex items-center gap-1 text-xs hover:text-foreground"
                            title="Não gostei"
                            aria-label="Não gostei do comentário"
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                          <button 
                            className="text-xs hover:text-foreground"
                            title="Responder ao comentário"
                            aria-label="Responder ao comentário"
                          >
                            Responder
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-muted-foreground">Ainda não há comentários neste vídeo.</p>
                    <p className="text-sm text-muted-foreground">Seja o primeiro a comentar!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Coluna lateral (Vídeos relacionados) */}
          <div className="lg:w-[360px] space-y-4">
            <h3 className="font-medium text-muted-foreground">Vídeos relacionados</h3>
            
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="pr-4 space-y-3">
                {videos
                  .filter(video => video.id !== currentVideo.id)
                  .slice(0, 10)
                  .map(video => (
                    <VideoCard key={video.id} video={video} variant="list" />
                  ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </Layout>
  );
} 
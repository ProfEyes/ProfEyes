import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useVideo } from "@/contexts/VideoContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Heart,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  Music,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  X,
  Send,
  Play,
  Pause
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ShortCard } from "@/components/ui/short-card";
import { motion, AnimatePresence } from "framer-motion";

export default function ShortsPlayer() {
  const { shortId } = useParams<{ shortId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    shorts,
    currentVideo,
    currentComments,
    isLoading,
    getVideoById,
    getVideoComments,
    getShorts,
    addComment
  } = useVideo();

  // Estados do player
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [userInteractions, setUserInteractions] = useState<Record<string, {
    liked: boolean;
    saved: boolean;
    likeCount: number;
  }>>({});
  
  // Refs
  const videoRefs = useRef<Record<string, HTMLVideoElement>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Carregar shorts
  useEffect(() => {
    // Carregar todos os shorts
    getShorts();
    
    // Se tiver um shortId específico, ir para ele
    if (shortId) {
      const loadShort = async () => {
        const short = await getVideoById(shortId);
        if (short) {
          const shortIndex = shorts.findIndex(s => s.id === shortId);
          if (shortIndex >= 0) {
            setCurrentIndex(shortIndex);
          }
          // Carregar comentários do short
          getVideoComments(shortId);
        }
      };
      
      loadShort();
    }
  }, [shortId]);
  
  // Inicializar interações do usuário para cada short
  useEffect(() => {
    if (shorts.length > 0) {
      const initialInteractions: Record<string, { liked: boolean; saved: boolean; likeCount: number }> = {};
      
      shorts.forEach(short => {
        initialInteractions[short.id] = {
          liked: false,
          saved: false,
          likeCount: short.likes || 0
        };
      });
      
      setUserInteractions(initialInteractions);
    }
  }, [shorts.length]);
  
  // Carregar comentários quando o short mudar
  useEffect(() => {
    if (shorts.length > 0 && currentIndex >= 0 && currentIndex < shorts.length) {
      const currentShort = shorts[currentIndex];
      getVideoComments(currentShort.id);
    }
  }, [currentIndex, shorts.length]);
  
  // Intersection Observer para determinar o short visível
  useEffect(() => {
    if (!containerRef.current || shorts.length === 0) return;
    
    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.8
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          const index = shorts.findIndex(short => short.id === id);
          if (index !== -1) {
            setCurrentIndex(index);
            
            // Pausar todos os vídeos e reproduzir apenas o visível
            Object.entries(videoRefs.current).forEach(([videoId, videoElement]) => {
              if (videoId === id) {
                if (isPlaying) videoElement.play().catch(e => console.error("Erro ao reproduzir:", e));
              } else {
                videoElement.pause();
              }
            });
          }
        }
      });
    }, options);
    
    // Observar todos os vídeos
    const shortElements = containerRef.current.querySelectorAll(".short-item");
    shortElements.forEach(element => {
      observer.observe(element);
    });
    
    return () => {
      shortElements.forEach(element => {
        observer.unobserve(element);
      });
    };
  }, [shorts.length, isPlaying]);
  
  // Ações do usuário
  const togglePlay = () => {
    if (shorts.length === 0 || currentIndex < 0 || currentIndex >= shorts.length) return;
    
    const currentShort = shorts[currentIndex];
    const video = videoRefs.current[currentShort.id];
    
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(e => console.error("Erro ao reproduzir:", e));
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
    
    // Aplicar mudo a todos os vídeos
    Object.values(videoRefs.current).forEach(video => {
      video.muted = !isMuted;
    });
  };
  
  const handleLike = (shortId: string) => {
    if (!user) {
      toast.error("Faça login para curtir vídeos");
      return;
    }
    
    setUserInteractions(prev => {
      const current = prev[shortId] || { liked: false, saved: false, likeCount: 0 };
      return {
        ...prev,
        [shortId]: {
          ...current,
          liked: !current.liked,
          likeCount: current.liked ? current.likeCount - 1 : current.likeCount + 1
        }
      };
    });
  };
  
  const handleSave = (shortId: string) => {
    if (!user) {
      toast.error("Faça login para salvar vídeos");
      return;
    }
    
    setUserInteractions(prev => {
      const current = prev[shortId] || { liked: false, saved: false, likeCount: 0 };
      const newState = { ...prev, [shortId]: { ...current, saved: !current.saved } };
      
      if (!current.saved) {
        toast.success("Short salvo na sua biblioteca");
      } else {
        toast.success("Short removido da sua biblioteca");
      }
      
      return newState;
    });
  };
  
  const handleShare = (shortId: string, title: string) => {
    if (navigator.share) {
      navigator.share({
        title: title,
        url: `${window.location.origin}/shorts/${shortId}`
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/shorts/${shortId}`);
      toast.success("Link copiado para área de transferência");
    }
  };
  
  const handleNextShort = () => {
    if (currentIndex < shorts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  const handlePreviousShort = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Faça login para comentar");
      return;
    }
    
    if (!commentText.trim() || !shorts[currentIndex]) {
      return;
    }
    
    setIsSubmittingComment(true);
    
    try {
      const currentShort = shorts[currentIndex];
      const success = await addComment(currentShort.id, commentText);
      
      if (success) {
        setCommentText("");
        toast.success("Comentário adicionado");
        // Recarregar comentários
        getVideoComments(currentShort.id);
      }
    } catch (error) {
      toast.error("Erro ao adicionar comentário");
    } finally {
      setIsSubmittingComment(false);
    }
  };
  
  // Formatação de números
  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };
  
  // Formatação de data
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR
    });
  };
  
  // Estado de loading
  if (isLoading || shorts.length === 0) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <Skeleton className="w-[360px] h-[640px] rounded-xl" />
      </div>
    );
  }
  
  return (
    <div className="h-screen w-full bg-black overflow-hidden">
      {/* Botão para voltar */}
      <button
        className="fixed top-4 left-4 z-50 bg-black/40 backdrop-blur-sm p-2 rounded-full text-white hover:bg-black/60 transition-colors"
        onClick={() => navigate(-1)}
        title="Voltar"
        aria-label="Voltar à página anterior"
      >
        <X className="h-6 w-6" />
      </button>
      
      {/* Botões de navegação vertical */}
      <div className="fixed inset-y-0 left-4 z-30 flex items-center pointer-events-none">
        <div className="space-y-3 pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
            onClick={handlePreviousShort}
            disabled={currentIndex === 0}
          >
            <ChevronUp className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
            onClick={handleNextShort}
            disabled={currentIndex === shorts.length - 1}
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Container principal de shorts */}
      <div 
        ref={containerRef} 
        className="h-full snap-y snap-mandatory overflow-y-auto"
      >
        {shorts.map((short, index) => {
          const interaction = userInteractions[short.id] || { 
            liked: false, 
            saved: false, 
            likeCount: short.likes || 0 
          };
          
          return (
            <div 
              key={short.id} 
              id={short.id} 
              className="short-item h-full w-full snap-start snap-always relative"
            >
              {/* Vídeo do short */}
              <div className="relative h-full w-full flex items-center justify-center bg-black">
                <video
                  ref={el => {
                    if (el) videoRefs.current[short.id] = el;
                  }}
                  src={short.video_url}
                  poster={short.thumbnail}
                  loop
                  playsInline
                  muted={isMuted}
                  autoPlay={index === currentIndex}
                  className="h-full w-full object-contain"
                  onClick={togglePlay}
                  onPlay={() => index === currentIndex && setIsPlaying(true)}
                  onPause={() => index === currentIndex && setIsPlaying(false)}
                />
                
                {/* Overlay para tap e controles */}
                <div className="absolute inset-0 flex items-center justify-center" onClick={togglePlay}>
                  {!isPlaying && (
                    <div className="w-16 h-16 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play className="h-8 w-8 text-white" fill="white" />
                    </div>
                  )}
                </div>
                
                {/* Informações e botões de interação */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                  <div className="flex items-end justify-between">
                    {/* Informações do autor e descrição */}
                    <div className="flex-1 text-white">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-white">
                          <AvatarImage src={short.avatar_url} />
                          <AvatarFallback>{short.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{short.username}</span>
                        <Button variant="outline" size="sm" className="h-7 text-xs rounded-full bg-transparent border-white text-white hover:bg-white/10">
                          Seguir
                        </Button>
                      </div>
                      
                      <p className="mt-2 line-clamp-2">{short.title}</p>
                      
                      {/* Música/áudio */}
                      <div className="flex items-center gap-2 mt-2">
                        <Music className="h-4 w-4" />
                        <span className="text-sm">Áudio original • {short.username}</span>
                      </div>
                    </div>
                    
                    {/* Botões de interação vertical */}
                    <div className="flex flex-col items-center gap-6">
                      <button 
                        className="flex flex-col items-center gap-1"
                        onClick={() => handleLike(short.id)}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center",
                          interaction.liked && "bg-red-500 text-white"
                        )}>
                          <ThumbsUp className={cn("h-5 w-5", interaction.liked && "fill-white")} />
                        </div>
                        <span className="text-white text-xs">{formatCount(interaction.likeCount)}</span>
                      </button>
                      
                      <button 
                        className="flex flex-col items-center gap-1"
                        onClick={() => setShowComments(true)}
                      >
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <span className="text-white text-xs">{formatCount(short.comments_count || 0)}</span>
                      </button>
                      
                      <button 
                        className="flex flex-col items-center gap-1"
                        onClick={() => handleSave(short.id)}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center",
                          interaction.saved && "bg-blue-500 text-white"
                        )}>
                          <Bookmark className={cn("h-5 w-5", interaction.saved && "fill-white")} />
                        </div>
                        <span className="text-white text-xs">Salvar</span>
                      </button>
                      
                      <button 
                        className="flex flex-col items-center gap-1"
                        onClick={() => handleShare(short.id, short.title)}
                      >
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                          <Share2 className="h-5 w-5" />
                        </div>
                        <span className="text-white text-xs">Compartilhar</span>
                      </button>
                      
                      <button
                        className="flex flex-col items-center gap-1"
                        onClick={toggleMute}
                      >
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                        </div>
                        <span className="text-white text-xs">{isMuted ? "Som" : "Mudo"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Modal de comentários */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="w-full max-w-md h-[70vh] p-0 rounded-t-xl bottom-0 top-auto bg-background border-t-0" onEscapeKeyDown={() => setShowComments(false)}>
          <div className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-lg">Comentários</h2>
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setShowComments(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[calc(70vh-140px)] p-4">
            <div className="space-y-4">
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
                        <button className="flex items-center gap-1 text-xs hover:text-foreground">
                          <ThumbsUp className="h-3 w-3" />
                          <span>{comment.likes || 0}</span>
                        </button>
                        <button className="text-xs hover:text-foreground">Responder</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-muted-foreground">Ainda não há comentários neste short.</p>
                  <p className="text-sm text-muted-foreground">Seja o primeiro a comentar!</p>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Formulário de comentário */}
          <div className="p-4 border-t">
            {user ? (
              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={String(user.user_metadata?.avatar_url || '')} />
                  <AvatarFallback>
                    {String(user.user_metadata?.name || '').charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    placeholder="Adicione um comentário..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={isSubmittingComment}
                    className="flex-1"
                  />
                  
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!commentText.trim() || isSubmittingComment}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowComments(false);
                  navigate("/auth");
                }}
              >
                Faça login para comentar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
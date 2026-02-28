import { Video } from "@/types/video";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Play, Clock, Eye, ThumbsUp, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";
import { useNavigate } from "react-router-dom";

interface VideoCardProps {
  video: Video;
  variant?: "default" | "trending" | "grid" | "list";
  className?: string;
}

export const VideoCard = ({
  video,
  variant = "default",
  className,
}: VideoCardProps) => {
  const navigate = useNavigate();
  
  // Formatar tempo relativo (ex: "há 3 dias")
  const formattedDate = formatDistanceToNow(new Date(video.created_at), { 
    addSuffix: true, 
    locale: ptBR 
  });
  
  // Formatar duração do vídeo (ex: "12:34")
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };
  
  // Formatar visualizações
  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)} M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)} mil`;
    } else {
      return `${views}`;
    }
  };
  
  // Ir para página do vídeo
  const handleClick = () => {
    navigate(`/video/${video.id}`);
  };
  
  // Card padrão (semelhante ao YouTube)
  if (variant === "default") {
    return (
      <div 
        className={cn(
          "group flex flex-col gap-2 cursor-pointer transition-transform hover:scale-[1.02]",
          className
        )}
        onClick={handleClick}
      >
        {/* Thumbnail com duração */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium py-0.5 px-1 rounded">
            {formatDuration(video.duration)}
          </div>
          
          {/* Overlay de hover */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        
        {/* Informações do vídeo */}
        <div className="flex gap-3">
          {/* Avatar do autor */}
          <Avatar className="h-9 w-9 rounded-full">
            <AvatarImage src={video.avatar_url} />
            <AvatarFallback>{video.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          {/* Título e metadados */}
          <div className="flex flex-col">
            <h3 className="font-medium text-base line-clamp-2">{video.title}</h3>
            
            <div className="flex flex-col text-xs text-muted-foreground">
              <span className="hover:text-foreground">{video.username}</span>
              <div className="flex items-center gap-1">
                <span>{formatViews(video.views)} visualizações</span>
                <span className="inline-block w-1 h-1 bg-muted-foreground rounded-full mx-1"></span>
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Variante "trending" (destaque)
  if (variant === "trending") {
    return (
      <div 
        className={cn(
          "group flex gap-4 cursor-pointer rounded-lg p-2 hover:bg-accent/50 transition-colors",
          className
        )}
        onClick={handleClick}
      >
        {/* Thumbnail maior */}
        <div className="relative aspect-video w-[240px] rounded-lg overflow-hidden bg-black">
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium py-0.5 px-1 rounded">
            {formatDuration(video.duration)}
          </div>
          
          {/* Número de trending */}
          <div className="absolute top-2 left-2 bg-red-600 text-white w-6 h-6 flex items-center justify-center font-bold rounded">
            1
          </div>
        </div>
        
        {/* Informações do vídeo */}
        <div className="flex flex-col flex-1 gap-1">
          <h3 className="font-medium text-base line-clamp-2">{video.title}</h3>
          
          <div className="flex flex-col text-xs text-muted-foreground">
            <span className="hover:text-foreground">{video.username}</span>
            
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center">
                <Eye className="h-3 w-3 mr-1" />
                <span>{formatViews(video.views)}</span>
              </div>
              
              <div className="flex items-center">
                <ThumbsUp className="h-3 w-3 mr-1" />
                <span>{formatViews(video.likes)}</span>
              </div>
            </div>
            
            <span className="mt-1">{formattedDate}</span>
          </div>
          
          {/* Tags/categoria */}
          <div className="flex gap-1 mt-auto">
            <Badge variant="outline" className="text-xs py-0 px-2">
              {video.category}
            </Badge>
            
            {video.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs py-0 px-2">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // Variante de grade
  if (variant === "grid") {
    return (
      <div 
        className={cn(
          "group flex flex-col gap-1 cursor-pointer",
          className
        )}
        onClick={handleClick}
      >
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium py-0.5 px-1 rounded">
            {formatDuration(video.duration)}
          </div>
        </div>
        
        <h3 className="font-medium text-sm line-clamp-1 mt-1">{video.title}</h3>
        
        <div className="flex items-center text-xs text-muted-foreground">
          <span className="line-clamp-1">{video.username}</span>
          <span className="inline-block w-1 h-1 bg-muted-foreground rounded-full mx-1"></span>
          <span>{formattedDate}</span>
        </div>
      </div>
    );
  }
  
  // Variante de lista
  if (variant === "list") {
    return (
      <div 
        className={cn(
          "group flex gap-3 cursor-pointer p-2 hover:bg-accent/50 rounded-lg transition-colors",
          className
        )}
        onClick={handleClick}
      >
        <div className="relative w-[120px] aspect-video rounded-lg overflow-hidden bg-black shrink-0">
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="w-full h-full object-cover"
          />
          
          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-medium py-0.5 px-1 rounded">
            {formatDuration(video.duration)}
          </div>
        </div>
        
        <div className="flex flex-col">
          <h3 className="font-medium text-sm line-clamp-2">{video.title}</h3>
          <span className="text-xs text-muted-foreground">{video.username}</span>
          <div className="flex items-center text-xs text-muted-foreground mt-auto">
            <span>{formatViews(video.views)} visualizações</span>
            <span className="inline-block w-1 h-1 bg-muted-foreground rounded-full mx-1"></span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
}; 
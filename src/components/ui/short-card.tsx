import { Short } from "@/types/video";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Play, Heart, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";

interface ShortCardProps {
  short: Short;
  variant?: "default" | "grid" | "feed";
  index?: number; // Para ordem na listagem
  className?: string;
}

export const ShortCard = ({
  short,
  variant = "default",
  index,
  className,
}: ShortCardProps) => {
  const navigate = useNavigate();
  
  // Formatar tempo relativo (ex: "há 3 dias")
  const formattedDate = formatDistanceToNow(new Date(short.created_at), { 
    addSuffix: true, 
    locale: ptBR 
  });
  
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
  
  // Ir para página do short
  const handleClick = () => {
    navigate(`/shorts/${short.id}`);
  };
  
  // Card padrão para shorts (vertical como TikTok/YouTube Shorts)
  if (variant === "default") {
    return (
      <div 
        className={cn(
          "group relative cursor-pointer transition-transform hover:scale-[1.03]",
          className
        )}
        onClick={handleClick}
      >
        {/* Thumbnail vertical */}
        <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black">
          <img 
            src={short.thumbnail} 
            alt={short.title}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay gradiente para legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/70"></div>
          
          {/* Duração/indicador de short */}
          <Badge variant="secondary" className="absolute top-2 right-2 bg-red-600 text-white border-none">
            Short
          </Badge>
          
          {/* Overlay de hover com ícone de play */}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-8 w-8 text-white" fill="white" />
            </div>
          </div>
          
          {/* Informações do short na parte inferior */}
          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
            {/* Título */}
            <h3 className="font-medium text-sm line-clamp-2 mb-1">
              {short.title}
            </h3>
            
            {/* Autor */}
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={short.avatar_url} />
                <AvatarFallback>{short.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-white/90">{short.username}</span>
            </div>
            
            {/* Estatísticas */}
            <div className="flex items-center justify-between text-xs text-white/70">
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  <Heart className="h-3 w-3 mr-1" />
                  <span>{formatViews(short.likes)}</span>
                </div>
                <div className="flex items-center">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  <span>{short.comments_count}</span>
                </div>
              </div>
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Variante de grade (mais compacta)
  if (variant === "grid") {
    return (
      <div 
        className={cn(
          "group relative cursor-pointer",
          className
        )}
        onClick={handleClick}
      >
        <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-black">
          <img 
            src={short.thumbnail} 
            alt={short.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70"></div>
          
          <Badge variant="secondary" className="absolute top-2 right-2 bg-red-600 text-white border-none text-[10px] py-0">
            Short
          </Badge>
          
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <h3 className="text-white font-medium text-xs line-clamp-1">{short.title}</h3>
            
            <div className="flex items-center mt-1">
              <span className="text-white/80 text-[10px]">{formatViews(short.views)} visualizações</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Variante feed (formato lista)
  if (variant === "feed") {
    return (
      <div 
        className={cn(
          "group flex gap-3 items-center cursor-pointer p-2 hover:bg-accent/40 rounded-lg transition-colors",
          className
        )}
        onClick={handleClick}
      >
        {/* Número do índice */}
        {index !== undefined && (
          <div className="flex-shrink-0 w-6 font-semibold text-lg text-muted-foreground">
            {(index + 1).toString().padStart(2, '0')}
          </div>
        )}
        
        {/* Thumbnail vertical */}
        <div className="relative w-[100px] aspect-[9/16] rounded-lg overflow-hidden bg-black flex-shrink-0">
          <img 
            src={short.thumbnail} 
            alt={short.title}
            className="w-full h-full object-cover"
          />
          
          <Badge variant="secondary" className="absolute top-1 right-1 bg-red-600 text-white border-none text-[10px] py-0 px-1">
            Short
          </Badge>
        </div>
        
        {/* Informações */}
        <div className="flex flex-col">
          <h3 className="font-medium text-sm line-clamp-2">{short.title}</h3>
          
          <span className="text-xs text-muted-foreground">{short.username}</span>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>{formatViews(short.views)} visualizações</span>
            <span className="inline-block w-1 h-1 bg-muted-foreground rounded-full"></span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
}; 
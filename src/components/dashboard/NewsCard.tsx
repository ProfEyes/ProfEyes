import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchMarketNews } from "@/services";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState, useMemo } from "react";
import { Loader } from "lucide-react";

// Array de imagens alternativas para notícias sem imagem
const fallbackImages = [
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&q=80",
  "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=500&q=80",
  "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=500&q=80",
  "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=500&q=80",
  "https://images.unsplash.com/photo-1579226905180-636b76d96082?w=500&q=80",
];

// Mapa para rastrear quais imagens já foram usadas
const usedImagesMap = new Map<string, boolean>();

// Função para obter uma imagem aleatória do array de fallback que ainda não foi usada
const getRandomFallbackImage = (newsId: string) => {
  // Se já temos uma imagem para esta notícia no localStorage, retorná-la
  const cachedImage = localStorage.getItem(`news_image_${newsId}`);
  if (cachedImage) return cachedImage;
  
  // Filtrar imagens que ainda não foram usadas
  const availableImages = fallbackImages.filter(img => 
    !Array.from(usedImagesMap.values()).includes(img as any)
  );
  
  // Se todas as imagens já foram usadas, resetar e usar todas novamente
  const imagePool = availableImages.length > 0 ? availableImages : fallbackImages;
  
  // Selecionar uma imagem aleatória
  const randomIndex = Math.floor(Math.random() * imagePool.length);
  const selectedImage = imagePool[randomIndex];
  
  // Marcar esta imagem como usada para esta notícia
  usedImagesMap.set(newsId, selectedImage as any);
  
  // Armazenar no localStorage para persistência
  localStorage.setItem(`news_image_${newsId}`, selectedImage);
  
  return selectedImage;
};

const NewsCard = () => {
  const navigate = useNavigate();
  const [showAllNews, setShowAllNews] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const { data: news, isLoading, error, refetch } = useQuery({
    queryKey: ['marketNews', retryCount],
    queryFn: () => fetchMarketNews({ limit: 10 }),
    refetchInterval: 1800000, // Atualiza a cada 30 minutos (1800000 ms)
    staleTime: 1800000, // Considera os dados obsoletos após 30 minutos
    retry: 2,
    retryDelay: 1000
  });

  // Efeito para fazer nova tentativa se não tivermos notícias
  useEffect(() => {
    if (!isLoading && !error && (!news || news.length === 0) && retryCount < 3) {
      console.log('Nenhuma notícia carregada, tentando novamente...');
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [news, isLoading, error, retryCount]);

  // Garantir que as notícias tenham imagens únicas
  const newsWithImages = useMemo(() => {
    if (!news || news.length === 0) return [];
    
    // Conjunto para rastrear imagens já usadas
    const usedImages = new Set<string>();
    
    return news.map(item => {
      // Se já tem uma imagem válida, usá-la
      if (item.imageUrl && item.imageUrl.startsWith('http')) {
        // Se a imagem já foi usada, atribuir uma nova
        if (usedImages.has(item.imageUrl)) {
          const newImage = getRandomFallbackImage(item.id);
          return { ...item, imageUrl: newImage };
        }
        
        // Adicionar a imagem ao conjunto de imagens usadas
        usedImages.add(item.imageUrl);
        return item;
      } else {
        // Se não tiver imagem, usar uma fallback
        const fallbackImage = getRandomFallbackImage(item.id);
        return { ...item, imageUrl: fallbackImage };
      }
    });
  }, [news]);

  useEffect(() => {
    if (error) {
      console.error("NewsCard - Erro ao buscar notícias:", error);
    }
    
    // Configurar um intervalo para atualizar as notícias a cada 30 minutos
    const intervalId = setInterval(() => {
      console.log("Atualizando notícias automaticamente...");
      refetch();
    }, 1800000); // 30 minutos em milissegundos
    
    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(intervalId);
  }, [error, refetch]);

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle>Notícias Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader className="w-6 h-6 animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando notícias...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle>Notícias Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Erro ao carregar notícias. Tente novamente mais tarde.</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setRetryCount(prev => prev + 1);
                refetch();
              }}
              className="mt-2"
            >
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!newsWithImages || newsWithImages.length === 0) {
    return (
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle>Notícias Recentes</CardTitle>
          <Button 
            variant="ghost" 
            className="text-sm text-muted-foreground hover:text-white"
            onClick={() => navigate('/news')}
          >
            Ver todas
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Nenhuma notícia disponível no momento.</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setRetryCount(prev => prev + 1);
                refetch();
              }}
              className="mt-2"
            >
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Limitar o número de notícias exibidas conforme a flag showAllNews
  const displayedNews = showAllNews ? newsWithImages : newsWithImages.slice(0, 3);

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle>Notícias Recentes</CardTitle>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setRetryCount(prev => prev + 1);
              refetch();
            }}
            title="Atualizar notícias"
            className="h-8 w-8 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
              <path d="M16 21h5v-5"></path>
            </svg>
          </Button>
          <Button 
            variant="ghost" 
            className="text-sm text-muted-foreground hover:text-white"
            onClick={() => navigate('/news')}
          >
            Ver todas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedNews.map((item) => (
            <div key={item.id} className="group border-b border-white/10 pb-4 cursor-pointer" onClick={() => window.open(item.url, '_blank')}>
              <div className="h-32 mb-3 overflow-hidden rounded-lg">
                <img 
                  src={item.imageUrl} 
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    // Se a imagem falhar, usar uma nova imagem de fallback
                    target.src = getRandomFallbackImage(item.id);
                  }}
                  loading="lazy"
                />
              </div>
              <p className="font-medium group-hover:text-white transition-colors">
                {item.title}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-muted-foreground">
                  {item.source}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(item.publishedAt), "dd/MM HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          {newsWithImages.length > 3 && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => showAllNews ? navigate('/news') : setShowAllNews(true)}
            >
              {showAllNews ? "Ver página completa de notícias" : "Ver todas as notícias"}
            </Button>
          )}
          {showAllNews && (
            <Button 
              variant="link" 
              className="mt-2 w-full"
              onClick={() => setShowAllNews(false)}
            >
              Mostrar menos
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsCard;

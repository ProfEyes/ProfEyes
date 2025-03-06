import { useQuery } from "@tanstack/react-query";
import { fetchMarketNews } from "@/services";
import { updateNewsImages } from "@/services/imageService";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Newspaper, RefreshCw, AlertTriangle } from "lucide-react";

// Array de imagens alternativas para notícias sem imagem
const fallbackImages = [
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&q=80",
  "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=500&q=80",
  "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=500&q=80",
  "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=500&q=80",
  "https://images.unsplash.com/photo-1579226905180-636b76d96082?w=500&q=80",
  "https://images.unsplash.com/photo-1642543348745-03b1219733d9?w=500&q=80",
  "https://images.unsplash.com/photo-1642543392566-1ea3d2c0c9fe?w=500&q=80",
  "https://images.unsplash.com/photo-1642543392566-1ea3d2c0c9fe?w=500&q=80",
  "https://images.unsplash.com/photo-1642543392566-1ea3d2c0c9fe?w=500&q=80",
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&q=80",
];

// Mapa para rastrear quais imagens já foram usadas
const usedImagesMap = new Map<string, boolean>();

// Função para obter uma imagem aleatória do array de fallback que ainda não foi usada
const getRandomFallbackImage = (newsId: string) => {
  // Se já temos uma imagem para esta notícia, retorná-la
  if (usedImagesMap.has(newsId)) {
    const cachedImage = localStorage.getItem(`news_image_${newsId}`);
    if (cachedImage) return cachedImage;
  }

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

// Estilo para animação de carregamento de notícias
const newsLoadingStyles = `
  @keyframes newsLoadingPulse {
    0% {
      opacity: 0.6;
      transform: scale(0.98);
    }
    50% {
      opacity: 0.9;
      transform: scale(1);
    }
    100% {
      opacity: 0.6;
      transform: scale(0.98);
    }
  }
  
  @keyframes newsIconSpin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  
  .news-loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    animation: newsLoadingPulse 2s infinite ease-in-out;
  }
  
  .news-loading-icon {
    margin-bottom: 1rem;
    animation: newsIconSpin 3s infinite linear;
  }
  
  .news-loading-text {
    font-size: 1rem;
    font-weight: 500;
    text-align: center;
  }
`;

const News = () => {
  const [newsWithImages, setNewsWithImages] = useState<any[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  
  // Adicionar o estilo de animação ao documento
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = newsLoadingStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  const { data: news, isLoading, error, refetch } = useQuery({
    queryKey: ['marketNews'],
    queryFn: () => fetchMarketNews({ limit: 20 }), // Busca até 20 notícias para a página completa
    refetchInterval: 1800000, // Atualiza a cada 30 minutos (1800000 ms)
    staleTime: 1800000, // Considera os dados obsoletos após 30 minutos
  });

  // Efeito para processar as imagens das notícias com otimização
  useEffect(() => {
    if (news && news.length > 0) {
      // Inicialmente, usar as imagens que já existem ou fallbacks
      const initialNewsWithImages = news.map(item => {
        // Verificar se já temos uma imagem em cache para esta notícia
        const cachedImage = localStorage.getItem(`news_image_${item.id}`);
        
        if (item.imageUrl) {
          return item;
        } else if (cachedImage) {
          return { ...item, imageUrl: cachedImage, isTemporaryImage: true };
        } else {
          // Se não tiver imagem, usar uma fallback temporária única
          const fallbackImage = getRandomFallbackImage(item.id);
          return { ...item, imageUrl: fallbackImage, isTemporaryImage: true };
        }
      });
      
      setNewsWithImages(initialNewsWithImages);
      
      // Iniciar o processo de extração de imagens reais
      setIsLoadingImages(true);
      
      // Extrair imagens reais das URLs das notícias com timeout para não bloquear a interface
      setTimeout(() => {
        updateNewsImages(news)
          .then(updatedNews => {
            // Armazenar as imagens extraídas no localStorage para uso futuro
            updatedNews.forEach(item => {
              if (item.imageUrl && !item.isTemporaryImage) {
                localStorage.setItem(`news_image_${item.id}`, item.imageUrl);
              }
            });
            
            setNewsWithImages(updatedNews);
            setIsLoadingImages(false);
          })
          .catch(error => {
            console.error("Erro ao atualizar imagens das notícias:", error);
            setIsLoadingImages(false);
          });
      }, 100);
    }
  }, [news]);

  // Garantir que as notícias tenham imagens únicas
  const uniqueNewsWithImages = useMemo(() => {
    if (!newsWithImages || newsWithImages.length === 0) return [];
    
    // Conjunto para rastrear imagens já usadas
    const usedImages = new Set<string>();
    
    return newsWithImages.map(item => {
      // Se a imagem já foi usada, atribuir uma nova
      if (item.imageUrl && usedImages.has(item.imageUrl)) {
        const newImage = getRandomFallbackImage(item.id);
        return { ...item, imageUrl: newImage, isTemporaryImage: true };
      }
      
      // Adicionar a imagem ao conjunto de imagens usadas
      if (item.imageUrl) {
        usedImages.add(item.imageUrl);
      }
      
      return item;
    });
  }, [newsWithImages]);

  useEffect(() => {
    if (error) {
      console.error("News Page - Erro ao buscar notícias:", error);
    }
    
    // Configurar um intervalo para atualizar as notícias a cada 30 minutos
    const intervalId = setInterval(() => {
      console.log("Atualizando notícias automaticamente...");
      refetch();
    }, 1800000); // 30 minutos em milissegundos
    
    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(intervalId);
  }, [error, refetch]);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notícias do Mercado</h1>
            <p className="text-muted-foreground">
              Acompanhe as últimas notícias do mercado de criptomoedas e finanças
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <div className="grid gap-6">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="news-loading-container">
                  <div className="news-loading-icon">
                    <Newspaper size={32} />
                  </div>
                  <p className="news-loading-text">Buscando as últimas notícias do mercado...</p>
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                  <p className="text-lg font-medium">Erro ao carregar notícias</p>
                  <p className="text-muted-foreground mb-4">Tente novamente mais tarde.</p>
                  <p className="text-sm text-red-500 mt-2 max-w-full overflow-hidden text-ellipsis">{String(error)}</p>
                  <Button 
                    variant="outline" 
                    onClick={() => refetch()}
                    className="mt-4"
                  >
                    Tentar novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : !uniqueNewsWithImages || uniqueNewsWithImages.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Newspaper className="h-12 w-12 text-muted-foreground mb-4" />
                  <p>Nenhuma notícia disponível no momento.</p>
                  <Button 
                    variant="outline" 
                    onClick={() => refetch()}
                    className="mt-4"
                  >
                    Tentar novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) :
            uniqueNewsWithImages?.map((item) => (
              <Card key={item.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => window.open(item.url, '_blank')}>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-[300px,1fr] gap-6">
                    <div className="h-48 overflow-hidden rounded-lg relative">
                      <img 
                        src={item.imageUrl || getRandomFallbackImage(item.id)} 
                        alt={item.title}
                        className={`w-full h-full object-cover ${item.isTemporaryImage ? 'opacity-80' : ''}`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getRandomFallbackImage(item.id);
                        }}
                        loading="lazy"
                      />
                      {item.isTemporaryImage && isLoadingImages && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <h2 className="text-2xl font-semibold">{item.title}</h2>
                      <p className="text-muted-foreground line-clamp-3">{item.summary || item.content}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {item.source}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(item.publishedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {item.relatedSymbols && item.relatedSymbols.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.relatedSymbols.map((symbol) => (
                            <span key={symbol} className="px-2 py-1 bg-white/10 rounded-md text-xs">
                              {symbol}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </div>
      </div>
    </Layout>
  );
};

export default News;

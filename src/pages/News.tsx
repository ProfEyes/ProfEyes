import { useQuery } from "@tanstack/react-query";
import { fetchMarketNews } from "@/services/news";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { format, formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Newspaper, RefreshCw, AlertTriangle, Check, Clock } from "lucide-react";
import { MarketNews as BaseMarketNews } from "@/services/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

// Definir uma interface para o formato dos dados retornados pela API Finnhub
interface FinnhubNewsItem {
  id: string | number;
  title?: string;
  headline?: string;
  description?: string;
  summary?: string;
  content?: string;
  source?: string;
  url?: string;
  publishedAt?: number;
  datetime?: number;
  imageUrl?: string;
  image?: string;
  relatedSymbols?: string[];
}

// Estendendo a interface MarketNews para adicionar propriedades específicas desta página
interface MarketNews extends BaseMarketNews {
  id: string;
  headline?: string;
  image?: string;
  isTemporaryImage?: boolean;
  relatedSymbols?: string[];
  category?: string;
}

// Estilo para animação de carregamento de notícias
const newsLoadingStyles = `
  @keyframes newsLoadingPulse {
    0% {
      opacity: 0.7;
      transform: scale(0.99);
    }
    50% {
      opacity: 0.9;
      transform: scale(1);
    }
    100% {
      opacity: 0.7;
      transform: scale(0.99);
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
    padding: 1.5rem;
    animation: newsLoadingPulse 1.5s infinite ease-in-out;
  }
  
  .news-loading-icon {
    margin-bottom: 0.75rem;
    animation: newsIconSpin 2s infinite linear;
  }
  
  .news-loading-text {
    font-size: 0.95rem;
    font-weight: 500;
    text-align: center;
  }
`;

// Função para calcular o tempo relativo da publicação
const getRelativeTime = (datetime: number | string): string => {
  try {
    // Converter para um timestamp numérico (em milissegundos)
    let timestamp: number;
    
    if (typeof datetime === 'string') {
      // Se for uma string ISO, converter para Date
      timestamp = new Date(datetime).getTime();
    } else if (typeof datetime === 'number') {
      // Se já for um número, verificar se está em segundos (Finnhub) ou milissegundos
      timestamp = datetime < 10000000000 ? datetime * 1000 : datetime;
    } else {
      // Se não for string nem número, usar data atual (fallback)
      console.warn('Formato de data inválido:', datetime);
      return '';
    }
    
    // Verificar se o timestamp é válido e não é no futuro
    const now = new Date().getTime();
    if (isNaN(timestamp) || timestamp > now) {
      console.warn('Timestamp inválido ou no futuro:', timestamp);
      return '';
    }
    
    // Se o timestamp for mais de 1 ano atrás, pode ser um erro
    // (algumas APIs têm bugs que retornam datas muito antigas)
    const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
    if (timestamp < oneYearAgo) {
      console.warn('Timestamp muito antigo (possível erro):', timestamp);
      // Usar um valor mais recente como fallback
      return 'recentemente';
    }
    
    // Calcular o tempo relativo em português
    return formatDistance(new Date(timestamp), new Date(), { 
      addSuffix: true,
      locale: ptBR 
    });
  } catch (error) {
    console.error('Erro ao calcular tempo relativo:', error);
    return 'recentemente'; // Fallback seguro em caso de erro
  }
};

const News = () => {
  const [newsWithImages, setNewsWithImages] = useState<MarketNews[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  // Estado para controlar a animação do botão de atualizar (similar ao NewsCard)
  const [refreshButtonState, setRefreshButtonState] = useState<'default' | 'success' | 'error'>('default');
  // Referência para armazenar o timestamp da última atualização bem-sucedida
  const lastSuccessfulUpdate = useRef<number>(Date.now());
  const { language } = useLanguage();
  
  // Buscar notícias com React Query
  const { data: news, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['allMarketNews', language],
    queryFn: () => fetchMarketNews({ language }), // Passar o idioma atual para a API
    refetchInterval: 1800000, // Atualiza a cada 30 minutos (1800000 ms)
    staleTime: 1800000, // Considera os dados obsoletos após 30 minutos
    // Usar cache já existente imediatamente
    gcTime: 1800000, // Substituindo cacheTime que está obsoleto
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  
  // Adicionar o estilo de animação ao documento
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = newsLoadingStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Efeito para processar as imagens das notícias com otimização
  useEffect(() => {
    if (news && Array.isArray(news) && news.length > 0) {
      // Converter dados da API para o formato MarketNews
      const processedNews = news.map((item: FinnhubNewsItem) => {
        // Processar o timestamp das notícias para garantir que está em formato correto
        let processedDatetime = item.datetime || item.publishedAt || Date.now();
        
        // Se o timestamp estiver em segundos (formato Finnhub), converter para milissegundos
        if (typeof processedDatetime === 'number' && processedDatetime < 10000000000) {
          processedDatetime *= 1000;
        }
        
        const newsItem: MarketNews = {
          id: String(item.id || Date.now()),
          title: item.title || item.headline || '',
          content: item.content || item.summary || '',
          summary: item.summary || item.description || '',
          source: item.source || '',
          url: item.url || '',
          imageUrl: (item.imageUrl || item.image || ''),
          published_at: new Date(processedDatetime).toISOString(),
          sentiment: 0,
          symbols: item.relatedSymbols || [],
          datetime: processedDatetime,
          relatedSymbols: item.relatedSymbols || [],
          category: item.source === 'CNBC' ? 'CNBC' : undefined
        };
        return newsItem;
      });
      
      // Filtrar APENAS notícias com imagens
      const newsWithImagesOnly = processedNews.filter(item => item.imageUrl && item.imageUrl.trim() !== '');
      
      // Separar notícias da CNBC e de outras fontes
      const cnbcNews = newsWithImagesOnly.filter(item => item.source === 'CNBC');
      const otherNews = newsWithImagesOnly.filter(item => item.source !== 'CNBC');
      
      // Combinar colocando notícias da CNBC primeiro
      setNewsWithImages([...cnbcNews, ...otherNews]);
      setIsLoadingImages(false);
    }
  }, [news]);

  // Garantir que as notícias tenham formato adequado
  const uniqueNewsWithImages = useMemo(() => {
    if (!newsWithImages || newsWithImages.length === 0) return [];
    return newsWithImages;
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

  // Função de refetch modificada para não usar imagens de fallback
  const handleRefetch = () => {
    // Verificar se as notícias já foram atualizadas recentemente (nos últimos 30 segundos)
    const now = Date.now();
    const timeSinceLastUpdate = now - lastSuccessfulUpdate.current;
    const isRecentlyUpdated = timeSinceLastUpdate < 30000; // 30 segundos
    
    if (isRecentlyUpdated && news && news.length > 0) {
      // Se já estiver atualizado recentemente, mostrar animação de sucesso
      setRefreshButtonState('success');
      
      // Retornar ao estado normal após 2 segundos com uma transição mais suave
      setTimeout(() => {
        setRefreshButtonState('default');
      }, 2000);
    } else {
      // Se não for atualização recente, proceder com a atualização personalizada
      // Armazenar as notícias atuais
      const currentNews = newsWithImages || [];
      
      // Buscar novas notícias diretamente da API
      fetchMarketNews({ language }).then(newNews => {
        if (newNews && Array.isArray(newNews) && newNews.length > 0) {
          // Processar as notícias para usar apenas imagens da API
          const processedNews = newNews.map((item: FinnhubNewsItem) => {
            // Processar o timestamp das notícias para garantir que está em formato correto
            let processedDatetime = item.datetime || item.publishedAt || Date.now();
            
            // Se o timestamp estiver em segundos (formato Finnhub), converter para milissegundos
            if (typeof processedDatetime === 'number' && processedDatetime < 10000000000) {
              processedDatetime *= 1000;
            }
            
            const newsItem: MarketNews = {
              id: String(item.id || Date.now()),
              title: item.title || item.headline || '',
              content: item.content || item.summary || '',
              summary: item.summary || item.description || '',
              source: item.source || '',
              url: item.url || '',
              imageUrl: (item.imageUrl || item.image || ''),
              published_at: new Date(processedDatetime).toISOString(),
              sentiment: 0,
              symbols: item.relatedSymbols || [],
              datetime: processedDatetime,
              relatedSymbols: item.relatedSymbols || [],
              category: item.source === 'CNBC' ? 'CNBC' : undefined
            };
            return newsItem;
          });
          
          // Filtrar APENAS notícias com imagens
          const newsWithImagesOnly = processedNews.filter(item => item.imageUrl && item.imageUrl.trim() !== '');
          
          // Separar notícias da CNBC e de outras fontes
          const cnbcNews = newsWithImagesOnly.filter(item => item.source === 'CNBC');
          const otherNews = newsWithImagesOnly.filter(item => item.source !== 'CNBC');
          
          // Combinar colocando notícias da CNBC primeiro
          setNewsWithImages([...cnbcNews, ...otherNews]);
          setIsLoadingImages(false);
          
          // Atualizar o timestamp da última atualização
          lastSuccessfulUpdate.current = now;
          
          // Mostrar animação de sucesso
          setRefreshButtonState('success');
          setTimeout(() => {
            setRefreshButtonState('default');
          }, 2000);
        } else {
          // Se não conseguimos buscar novas notícias, usar o refetch padrão
          refetch().then((result) => {
            if (result.data) {
              lastSuccessfulUpdate.current = now;
              setRefreshButtonState('success');
              setTimeout(() => {
                setRefreshButtonState('default');
              }, 2000);
            }
          });
        }
      }).catch(err => {
        console.error("Erro ao atualizar notícias:", err);
        setRefreshButtonState('error');
        setTimeout(() => {
          setRefreshButtonState('default');
        }, 2000);
      });
    }
  };

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
          <div className="relative min-w-[120px] h-9 flex items-center justify-end">
            {/* Botão de sucesso com fade-in/fade-out suave */}
            <div 
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-all duration-300",
                refreshButtonState === 'success' 
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 translate-y-1 pointer-events-none"
              )}
            >
              <Button 
                variant="outline"
                size="sm"
                className={cn(
                  "bg-black/30 border-white/10 shadow-sm transition-all duration-300 ease-out",
                  refreshButtonState === 'success' && "news-refresh-success"
                )}
                tabIndex={refreshButtonState === 'success' ? 0 : -1}
              >
                <Check className="h-4 w-4 text-green-400 mr-1.5" />
                <span className="text-green-400 text-xs font-normal">Atualizado!</span>
              </Button>
            </div>
            
            {/* Botão de atualização padrão */}
            <div 
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-all duration-300",
                refreshButtonState !== 'success'
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 translate-y-1 pointer-events-none"
              )}
            >
              <Button 
                variant="outline"
                onClick={handleRefetch}
                disabled={isFetching || isLoading}
                tabIndex={refreshButtonState !== 'success' ? 0 : -1}
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", (isFetching || isLoading) && "animate-spin")} />
                Atualizar
              </Button>
            </div>
          </div>
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
                    onClick={handleRefetch}
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
                    onClick={handleRefetch}
                    className="mt-4"
                  >
                    Tentar novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) :
            uniqueNewsWithImages?.map((item) => (
              <Card 
                key={item.id} 
                className="hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => window.open(item.url, '_blank')}
              >
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-[300px,1fr] gap-6">
                    {item.imageUrl ? (
                      // Exibir imagem apenas se existir imageUrl
                      <div className="h-48 overflow-hidden rounded-lg">
                      <img 
                          src={item.imageUrl} 
                        alt={item.headline || item.title || "Notícia"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          // Otimização para melhorar carregamento de imagens
                          fetchPriority="high"
                          decoding="async"
                        onError={(e) => {
                            // Se a imagem falhar, esconder o elemento
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      // Espaço para notícias sem imagem
                      <div className="h-48 bg-gradient-to-r from-gray-700 to-gray-900 rounded-lg flex items-center justify-center">
                        <Newspaper size={48} className="text-gray-400 opacity-50" />
                        </div>
                      )}
                    <div className="space-y-4">
                      <h2 className="text-2xl font-semibold">{item.headline || item.title || "Notícia sem título"}</h2>
                      <p className="text-muted-foreground line-clamp-3">{item.summary || item.content}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <p className="text-sm text-muted-foreground">
                            {item.source === "CNBC" ? "CNBC" : item.source}
                          </p>
                          {item.category && item.source !== "CNBC" && item.category !== "CNBC" && (
                            <span className="ml-2 text-xs bg-white/10 px-2 py-0.5 rounded-full">
                              {item.category}
                            </span>
                          )}
                        </div>
                        {(item.datetime || item.published_at) && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            <span>{getRelativeTime(item.published_at || item.datetime)}</span>
                          </div>
                        )}
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

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw, ArrowRight, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR as ptBR } from "date-fns/locale";
import { MarketNews } from "@/services/types";
import { fetchMarketNews, symbolToCompanyName } from '@/services/newsService';
import { cn } from '@/lib/utils';
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";

// Verificar se o cache de notícias está válido
function isNewsCacheValid(): boolean {
  try {
    const cachedTimestamp = localStorage.getItem('cached_market_news_timestamp');
    if (cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();
      // Se o cache for mais recente que 3 minutos, considerá-lo válido
      return now - timestamp < 3 * 60 * 1000;
    }
  } catch (e) {
    console.warn('Erro ao verificar cache:', e);
  }
  return false;
}

// Determinar se deve buscar notícias automaticamente
function shouldPrefetchNews(): boolean {
  // Se não houver cache ou se o cache for inválido, buscar notícias
  return !isNewsCacheValid();
}

export function NewsCard() {
  const navigate = useNavigate();
  
  // Estado para controlar o atraso adicional de exibição
  const [isDelayedLoading, setIsDelayedLoading] = useState(true);
  
  // Referência para rastrear se é a primeira carga ou uma recarga manual
  const isManualRefetch = useRef(false);
  
  // Estado para controlar a animação do botão de atualizar
  const [refreshButtonState, setRefreshButtonState] = useState<'default' | 'success'>('default');
  
  // Referência para armazenar o timestamp da última atualização bem-sucedida
  const lastSuccessfulUpdate = useRef<number>(Date.now());
  
  // Usar React Query para gerenciar o estado do fetch e cache
  const { 
    data: news, 
    isLoading: isQueryLoading, 
    isError, 
    error, 
    refetch,
    isFetching,
    isSuccess,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['marketNews'],
    queryFn: async () => {
      return await fetchMarketNews({ limit: 5 });
    },
    // Não buscar automaticamente se o cache estiver válido
    enabled: shouldPrefetchNews(),
    // Manter os dados em cache por 5 minutos
    staleTime: 5 * 60 * 1000,
    // Em caso de erro, tentar novamente 1 vez após 2 segundos
    retry: 1,
    retryDelay: 2000
  });
  
  // Efeito para adicionar o atraso adicional de um segundo após o carregamento real
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (!isQueryLoading) {
      timeoutId = setTimeout(() => {
        setIsDelayedLoading(false);
      }, 1000); // Atraso de 1 segundo
    } else {
      setIsDelayedLoading(true);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isQueryLoading]);
  
  // Efeito para mostrar notificação quando as notícias forem carregadas após um refetch manual
  useEffect(() => {
    // Se não está carregando, não é erro, tem notícias, e foi um refetch manual
    if (!isQueryLoading && !isError && news && news.length > 0 && isManualRefetch.current) {
      // Resetar o flag de refetch manual
      isManualRefetch.current = false;
      // Atualizar o timestamp da última atualização bem-sucedida
      lastSuccessfulUpdate.current = Date.now();
      // Mostrar toast de sucesso
      toast.success("Notícias carregadas com sucesso!");
    }
  }, [isQueryLoading, isError, news]);
  
  // Agregação dos estados de carregamento (real + atraso)
  const isLoading = isQueryLoading || isDelayedLoading;
  
  // Função para navegar para a página de notícias
  const goToNewsPage = useCallback(() => {
    navigate('/news');
  }, [navigate]);
  
  // Função para recarregar notícias com verificação de recenticidade
  const handleRefetch = useCallback(() => {
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
      // Se não for atualização recente, proceder com a atualização normal
      isManualRefetch.current = true;
      refetch();
    }
  }, [refetch, news]);
  
  // Função para gerar um fallback para avatar baseado no nome da fonte
  const getSourceInitials = useCallback((source: string): string => {
    if (!source) return '??';
    return source
      .split(' ')
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase();
  }, []);

  // Formatar data relativa (ex: "há 3 horas")
  const formatRelativeDate = useCallback((dateValue: string | number): string => {
    try {
      let date: Date;
      
      // Verificar se o valor é um número (timestamp)
      if (typeof dateValue === 'number') {
        date = new Date(dateValue);
      } 
      // Verificar se o valor é uma string que representa um número (timestamp em string)
      else if (dateValue && !isNaN(Number(dateValue))) {
        date = new Date(Number(dateValue));
      }
      // Caso contrário, assume que é uma string de data
      else {
        date = new Date(dateValue);
      }
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.warn('Data inválida recebida:', dateValue);
        return 'Publicado recentemente';
      }
      
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (e) {
      console.error('Erro ao formatar data:', e, 'Valor recebido:', dateValue);
      return 'Publicado recentemente';
    }
  }, []);

  // Verificar se a URL da imagem contém Yahoo
  const isYahooImage = useCallback((url?: string): boolean => {
    if (!url) return false;
    return url.toLowerCase().includes('yahoo') || url.toLowerCase().includes('yimg');
  }, []);
  
  // Imagens de fallback confiáveis para casos de erro
  const FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1560221328-12fe60f83ab8?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1559526324-593bc073d938?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1569025690938-a00729c9e1f9?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=600&auto=format&fit=crop&q=80"
  ];
  
  // Função para obter uma imagem de fallback com base no índice
  const getImageFallback = useCallback((index: number): string => {
    return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  }, []);

  // Função para obter o nome completo da empresa para o tooltip
  const getCompanyFullName = useCallback((symbol: string): string => {
    return symbolToCompanyName[symbol] || symbol;
  }, []);

  // Componente para renderizar uma tag com tooltip
  const SymbolBadge = useCallback(({ symbol }: { symbol: string }) => {
    const fullName = getCompanyFullName(symbol);
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge key={symbol} variant="outline" className="text-xs px-1.5 py-0 cursor-help">
              {symbol}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{fullName}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }, [getCompanyFullName]);

  // Função para renderizar um item de notícia
  const renderNewsItem = useCallback((item: any, index: number) => {
    // Verificar se a imagem é do Yahoo
    let imageUrl = item.imageUrl || item.image;
    
    // Se não houver URL de imagem ou for do Yahoo, usar imagem alternativa
    if (!imageUrl || isYahooImage(imageUrl)) {
      imageUrl = getImageFallback(index);
    }
    
    // Determinar a data de publicação a ser exibida (preferir publishedAt, depois datetime)
    const publicationDate = item.publishedAt || item.datetime;
    
    // Determinar o título a ser exibido (preferir headline, depois title)
    const title = item.headline || item.title || "Notícia sem título";
    
    return (
      <div key={item.id || index} className="py-4 first:pt-0 last:pb-0 border-b last:border-0 border-border/50">
        <div className="flex flex-col gap-3">
          {/* Título da notícia com link */}
          <a 
            href={item.url} 
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline text-base"
          >
            {title}
          </a>
          
          {/* Imagem da notícia */}
          <a 
            href={item.url} 
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-28 overflow-hidden rounded-md bg-muted/30"
          >
            <img 
              src={imageUrl}
              alt={title} 
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // Se a imagem falhar, substituir por uma imagem alternativa
                (e.target as HTMLImageElement).src = getImageFallback(index);
              }}
              loading="lazy"
            />
          </a>
          
          {/* Resumo da notícia */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.summary || item.content}
          </p>
          
          {/* Metadados: fonte, data e símbolos relacionados */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={(() => {
                  try {
                    // Verificar se a URL é válida antes de tentar construí-la
                    if (item.url && item.url !== '#' && /^https?:\/\//.test(item.url)) {
                      const urlObj = new URL(item.url);
                      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
                    }
                    // Fallback para URLs inválidas
                    return '';
                  } catch (e) {
                    console.warn('URL inválida:', item.url);
                    return '';
                  }
                })()} />
                <AvatarFallback className="text-[10px]">{getSourceInitials(item.source)}</AvatarFallback>
              </Avatar>
              <span>{item.source}</span>
            </div>
            <span>•</span>
            <span>{formatRelativeDate(publicationDate)}</span>
            {item.relatedSymbols && item.relatedSymbols.length > 0 && (
              <>
                <span>•</span>
                <div className="flex gap-1 flex-wrap">
                  {item.relatedSymbols.slice(0, 3).map((symbol: string) => (
                    <SymbolBadge key={symbol} symbol={symbol} />
                  ))}
                  {item.relatedSymbols.length > 3 && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      +{item.relatedSymbols.length - 3}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }, [formatRelativeDate, getSourceInitials, isYahooImage, getImageFallback, SymbolBadge]);

  // Renderizar esqueleto de carregamento
  const renderLoadingSkeleton = useCallback(() => {
    return Array(3).fill(0).map((_, index) => (
      <div key={`skeleton-${index}`} className="py-4 first:pt-0 last:pb-0 border-b last:border-0 border-border/50">
        <div className="flex flex-col gap-3">
          {/* Título */}
          <Skeleton className="h-5 w-full" />
          
          {/* Imagem - altura reduzida para h-28 */}
          <Skeleton className="h-28 w-full rounded-md" />
          
          {/* Conteúdo */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[80%]" />
          
          {/* Metadados */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
        </div>
      </div>
    ));
  }, []);

  // Renderizar mensagem amigável de erro
  const renderErrorMessage = useCallback(() => {
    // Extrair a mensagem de erro se disponível
    let errorMessage = "Não foi possível carregar as notícias";
    
    if (error instanceof Error) {
      // Não mostrar erros 401 para o usuário, mostrar uma mensagem mais amigável
      if (error.message.includes('401')) {
        errorMessage = "Fonte de notícias temporariamente indisponível";
      } else {
        errorMessage = "Erro ao carregar notícias: " + error.message;
      }
    }
    
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground mb-4">{errorMessage}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefetch}
          disabled={isFetching}
        >
          <RefreshCcw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
          Tentar novamente
        </Button>
      </div>
    );
  }, [error, isFetching, handleRefetch]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Notícias do Mercado</CardTitle>
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
                variant="ghost"
                size="icon"
                onClick={handleRefetch}
                disabled={isFetching}
                title="Atualizar notícias"
                tabIndex={refreshButtonState !== 'success' ? 0 : -1}
              >
                <RefreshCcw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* Loading state */}
        {isLoading ? renderLoadingSkeleton() : null}
        
        {/* Error state */}
        {!isLoading && isError ? renderErrorMessage() : null}
        
        {/* Data loaded state */}
        {!isLoading && !isError && news && news.length > 0 ? (
          <div className="divide-y">
            {/* Mostrar apenas as 3 primeiras notícias no Dashboard */}
            {news.slice(0, 3).map(renderNewsItem)}
          </div>
        ) : null}
        
        {/* Empty state - no news found but no error */}
        {!isLoading && !isError && (!news || news.length === 0) ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Nenhuma notícia encontrada</p>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="pt-0 flex justify-end">
        {/* Botão para ver todas as notícias - adicionado */}
        <Button variant="default" size="sm" onClick={goToNewsPage} className="rounded-full">
          Ver todas
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}

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
import { fetchMarketNews } from '@/services/news';
import { symbolToCompanyName } from '@/services/newsService';
import { cn } from '@/lib/utils';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

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

// ✅ CACHE DE TRADUÇÃO para melhorar performance
const translationCache: Record<string, string> = {};

// Função para gerar chave de cache
function getCacheKey(text: string, targetLang: string): string {
  return `translation_${targetLang}_${text.substring(0, 100)}`;
}

// Função para carregar cache do localStorage
function loadTranslationCache(): void {
  try {
    const cached = localStorage.getItem('translation_cache_google');
    if (cached) {
      const parsed = JSON.parse(cached);
      Object.assign(translationCache, parsed);
      console.log(`💾 [Tradução Google] Cache carregado: ${Object.keys(translationCache).length} entradas`);
    }
  } catch (e) {
    console.warn('⚠️ [Tradução] Erro ao carregar cache:', e);
  }
}

// Função para salvar cache no localStorage
function saveTranslationCache(): void {
  try {
    localStorage.setItem('translation_cache_google', JSON.stringify(translationCache));
  } catch (e) {
    console.warn('⚠️ [Tradução] Erro ao salvar cache:', e);
  }
}

// Carregar cache ao iniciar
loadTranslationCache();

// ✅ Função para traduzir texto usando Google Translate (GRATUITA E ILIMITADA)
async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text || text.trim() === '') {
    return text;
  }
  
  // ✅ Verificar cache primeiro
  const cacheKey = getCacheKey(text, targetLang);
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }
  
  try {
    // ✅ Usar Google Translate público (gratuito, ilimitado e sem API key)
    // Traduzindo (silenciado)
    
    // Usar endpoint público do Google Translate
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text.slice(0, 5000))}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`⚠️ [Google Translate] Erro ${response.status}`);
      return text;
    }
    
    const data = await response.json();
    
    // Google Translate retorna array com estrutura: [[[texto_traduzido, texto_original, ...]]]
    const translated = data[0]?.map((item: any) => item[0]).join('') || text;
    
    // Tradução sucesso (silenciado)
    
    // ✅ Salvar no cache
    translationCache[cacheKey] = translated;
    saveTranslationCache();
    
    return translated;
    
  } catch (error) {
    console.warn(`⚠️ [Google Translate] Erro ao traduzir:`, error);
    // ✅ Fallback: retornar texto original
    return text;
  }
}

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

// Tipo mais abrangente para notícias que inclui todas as propriedades possíveis
type ExtendedMarketNews = Partial<MarketNews> & {
  headline?: string;
  title?: string;
  description?: string;
  summary?: string;
  content?: string;
  source?: string;
  url?: string;
  publishedAt?: number | string;
  published_at?: string;
  datetime?: number | string;
  imageUrl?: string;
  image?: string;
  relatedSymbols?: string[];
  [key: string]: unknown; // Permite qualquer propriedade adicional
};

export function NewsCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  
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
    queryKey: ['dashboardMarketNews', language],
    queryFn: async () => {
      try {
        const result = await fetchMarketNews();
        
        // ✅ PRIORIZAR CNBC: Ordenar notícias com CNBC primeiro
        const sortedResult = result.sort((a, b) => {
          const aIsCNBC = a.source?.toUpperCase().includes('CNBC') ? 1 : 0;
          const bIsCNBC = b.source?.toUpperCase().includes('CNBC') ? 1 : 0;
          
          // CNBC vem primeiro (ordem decrescente)
          if (aIsCNBC !== bIsCNBC) {
            return bIsCNBC - aIsCNBC;
          }
          
          // Para mesma fonte, ordenar por data (mais recente primeiro)
          const dateA = new Date(a.publishedAt || a.datetime || 0).getTime();
          const dateB = new Date(b.publishedAt || b.datetime || 0).getTime();
          return dateB - dateA;
        });
        
        // Pegar apenas 3 primeiras notícias
        const newsToShow = sortedResult.slice(0, 3);
        
        // Determinar idioma de destino
        const targetLang = language === 'pt' ? 'pt' : 
                          language === 'es' ? 'es' : 
                          language === 'en' ? 'en' : 'pt';
        
        // Se idioma for inglês, retornar imediatamente
        if (targetLang === 'en') {
          return newsToShow;
        }
        
        // ✅ TRADUZIR IMEDIATAMENTE (bloquear até terminar)
        const translated = await Promise.all(
          newsToShow.map(async (item) => {
            try {
              const translatedTitle = await translateText(item.headline || item.title || '', targetLang);
              const translatedSummary = await translateText(item.summary || item.content || '', targetLang);
              
              return {
                ...item,
                title: translatedTitle || item.title,
                headline: translatedTitle || item.headline,
                summary: translatedSummary || item.summary,
                content: translatedSummary || item.content,
              };
            } catch (err) {
              console.warn('⚠️ Erro ao traduzir notícia, usando original:', err);
              return item;
            }
          })
        );
        
        return translated;
      } catch (e) {
        console.error('❌ [NewsCard] Erro ao buscar notícias:', e);
        return [] as ExtendedMarketNews[];
      }
    },
    // ✅ SEMPRE buscar notícias ao carregar
    enabled: true,
    // Reduzir cache para 30 minutos para garantir tradução atualizada
    staleTime: 30 * 60 * 1000,
    // ✅ Atualizar automaticamente a cada hora
    refetchInterval: 60 * 60 * 1000,
    // Continuar refetch mesmo quando a aba estiver em background
    refetchIntervalInBackground: true,
    // Em caso de erro, tentar novamente 2 vezes
    retry: 2,
    retryDelay: 3000,
    // ✅ IMPORTANTE: Refetch ao focar na janela para garantir tradução correta
    refetchOnWindowFocus: true,
    // ✅ SEMPRE buscar ao abrir a página para garantir idioma correto
    refetchOnMount: 'always',
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
    }
  }, [isQueryLoading, isError, news]);
  
  // ✅ LISTENER: Invalidar cache quando o idioma mudar
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboardMarketNews'] });
  }, [language, queryClient]);
  
  // Agregação dos estados de carregamento (real + atraso)
  const isLoading = isQueryLoading || isDelayedLoading;
  
  // ✅ As notícias já vêm traduzidas da query
  const displayNews = news;
  
  // Função para navegar para a página de notícias
  const goToNewsPage = useCallback(() => {
    // Antes de navegar, garantir que temos notícias em cache para evitar AbortError na página de notícias
    const currentNews = news || [];
    if (currentNews.length > 0) {
      // Salvar as notícias atuais no cache antes de navegar
      localStorage.setItem('cached_market_news', JSON.stringify(currentNews));
      localStorage.setItem('cached_market_news_timestamp', Date.now().toString());
    }
    
    // Navegar para a página de notícias
    navigate('/news');
  }, [navigate, news]);
  
  // Função para recarregar notícias com verificação de recenticidade
  const handleRefetch = useCallback(async () => {
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
      isManualRefetch.current = true;
      
      // Armazenar temporariamente as notícias atuais
      const currentNews = news || [];
      
      // Usar um AbortController para limitar o tempo da requisição
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      // Fazer a chamada para buscar novas notícias com timeout
      try {
        const newNews = await fetchMarketNews();
        clearTimeout(timeoutId); // Limpar o timeout se a requisição for bem-sucedida
        if (newNews && Array.isArray(newNews) && newNews.length > 0) {
          // Filtrar notícias para manter apenas as mais recentes ou da mesma data
          if (currentNews.length > 0) {
            // Manter 30% das notícias anteriores que sejam mais relevantes
            const numberOfNewsToKeep = Math.max(1, Math.floor(currentNews.length * 0.3));
            const olderNewsToKeep = currentNews.slice(0, numberOfNewsToKeep);
            
            // Extrair datas das notícias em formato comparável
            const getDate = (newsItem: ExtendedMarketNews) => {
              const date = new Date(newsItem.publishedAt || newsItem.datetime || Date.now());
              return date.toISOString().split('T')[0]; // YYYY-MM-DD
            };
            
            // Remover duplicatas das novas notícias
            const uniqueIdMap = new Map<string, ExtendedMarketNews>();
            
            // Primeiramente adicionar as novas notícias 
            newNews.forEach(item => {
              // Gerar um ID único baseado no título e URL
              const uniqueId = `${item.url || ''}${item.headline || item.title || ''}`;
              if (!uniqueIdMap.has(uniqueId)) {
                uniqueIdMap.set(uniqueId, item);
              }
            });
            
            // Adicionar algumas notícias antigas mantidas, se não forem duplicatas
            olderNewsToKeep.forEach(oldNews => {
              const uniqueId = `${oldNews.url || ''}${oldNews.headline || oldNews.title || ''}`;
              if (!uniqueIdMap.has(uniqueId)) {
                uniqueIdMap.set(uniqueId, oldNews);
              }
            });
            
            // Converter o mapa de volta para array
            const combinedNews: ExtendedMarketNews[] = Array.from(uniqueIdMap.values());
            
            // Ordenar por data (mais recentes primeiro)
            combinedNews.sort((a, b) => {
              const dateA = new Date(a.publishedAt || a.datetime || 0);
              const dateB = new Date(b.publishedAt || b.datetime || 0);
              return dateB.getTime() - dateA.getTime();
            });
            
            // Atualizar cache em localStorage
            localStorage.setItem('cached_market_news', JSON.stringify(combinedNews));
            localStorage.setItem('cached_market_news_timestamp', now.toString());
            
            // Atualizar o estado de notícias com a nova combinação
            queryClient.setQueryData(['dashboardMarketNews'], combinedNews);
            
            // Atualizar timestamp da última atualização
            lastSuccessfulUpdate.current = now;
            
            // Mostrar animação de sucesso
            setRefreshButtonState('success');
            setTimeout(() => {
              setRefreshButtonState('default');
            }, 2000);
            
            // Notícias atualizadas com sucesso
            // Notícias atualizadas (silenciado)
          } else {
            // Se não há notícias anteriores, apenas usar as novas notícias
            queryClient.setQueryData(['dashboardMarketNews'], newNews);
            
            // Mostrar animação de sucesso
            setRefreshButtonState('success');
            setTimeout(() => {
              setRefreshButtonState('default');
            }, 2000);
            
            // Notícias carregadas com sucesso
            // Notícias carregadas (silenciado)
          }
        } else {
          // Se não houver novas notícias, apenas fazer refetch
          refetch();
        }
      } catch (error) {
        // Limpar o timeout em caso de erro
        clearTimeout(timeoutId);

        // Verificar se é um AbortError e fornecer uma mensagem mais clara
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('A requisição de notícias foi abortada devido ao timeout. Tentando refetch padrão.');
        }

        console.warn('Erro ao recarregar notícias:', error);
        // Em caso de erro, fazer a refetch normal
        refetch();
      }
    }
  }, [refetch, news, queryClient]);
  
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

  // Função para obter o favicon de uma URL
  const getFaviconUrl = (url: string): string => {
    try {
      if (!url || url === '#' || !/^https?:\/\//.test(url)) {
        return '/assets/news/default-news-icon.svg';
      }
      const urlObj = new URL(url);
      // Tentar obter o favicon diretamente do site
      return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
    } catch (error) {
      // Em caso de erro, retornar um ícone padrão do nosso sistema
      return '/assets/news/default-news-icon.svg';
    }
  };

  // Função para renderizar um item de notícia
  const renderNewsItem = useCallback((item: ExtendedMarketNews, index: number) => {
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
        <div className="flex flex-col gap-4">
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
            className="block w-full h-44 overflow-hidden rounded-lg bg-muted/30 transition-shadow duration-300 hover:shadow-md hover:shadow-black/50"
          >
            <img 
              src={imageUrl}
              alt={title} 
              className="w-full h-full object-cover hover:scale-105 transition-all duration-300"
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
                <AvatarImage src={getFaviconUrl(item.url || '')} />
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
        <div className="flex flex-col gap-4">
          {/* Título */}
          <Skeleton className="h-5 w-full" />
          
          {/* Imagem com altura h-44 */}
          <Skeleton className="h-44 w-full rounded-lg" />
          
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
    let errorMessage = t('news.error.loading');
    
    if (error instanceof Error) {
      // Não mostrar erros 401 para o usuário, mostrar uma mensagem mais amigável
      if (error.message.includes('401')) {
        errorMessage = t('news.error.loading');
      } else {
        errorMessage = `${t('news.error.loading')}: ${error.message}`;
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
          {t('news.tryAgain')}
        </Button>
      </div>
    );
  }, [error, isFetching, handleRefetch, t]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{t('nav.news.title')}</CardTitle>
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
                <span className="text-green-400 text-xs font-normal">{t('news.updated')}</span>
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
                title={t('news.refresh')}
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
        {!isLoading && !isError && displayNews && displayNews.length > 0 ? (
          <div className="divide-y">
            {/* Mostrar apenas as 3 primeiras notícias no Dashboard */}
            {displayNews.slice(0, 3).map((item, index) => renderNewsItem(item as ExtendedMarketNews, index))}
          </div>
        ) : null}
        
        {/* Empty state - no news found but no error */}
        {!isLoading && !isError && (!displayNews || displayNews.length === 0) ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">{t('news.none')}</p>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="pt-0 flex justify-end">
        {/* Botão para ver todas as notícias - adicionado */}
        <Button variant="default" size="sm" onClick={goToNewsPage} className="rounded-full">
          {t('notifications.viewAll')}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}

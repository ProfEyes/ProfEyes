import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchMarketNews } from "@/services/marketData";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect } from "react";

const NewsCard = () => {
  const navigate = useNavigate();
  const { data: news, isLoading, error, refetch } = useQuery({
    queryKey: ['marketNews'],
    queryFn: () => fetchMarketNews({ limit: 3 }), // Busca 3 notícias para o card
    refetchInterval: 1800000, // Atualiza a cada 30 minutos (1800000 ms)
    staleTime: 1800000, // Considera os dados obsoletos após 30 minutos
  });

  useEffect(() => {
    console.log("NewsCard - Dados de notícias:", news);
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
  }, [news, error, refetch]);

  if (isLoading) {
    return (
      <Card className="hover-scale glass">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle>Notícias Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Carregando notícias...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="hover-scale glass">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle>Notícias Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Erro ao carregar notícias. Tente novamente mais tarde.</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!news || news.length === 0) {
    return (
      <Card className="hover-scale glass">
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
              onClick={() => refetch()}
              className="mt-2"
            >
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover-scale glass">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle>Notícias Recentes</CardTitle>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => refetch()}
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
          {news?.map((item) => (
            <div key={item.id} className="group border-b border-white/10 pb-4 cursor-pointer" onClick={() => window.open(item.url, '_blank')}>
              <div className="h-32 mb-3 overflow-hidden rounded-lg">
                <img 
                  src={item.imageUrl || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&q=80"} 
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&q=80";
                  }}
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
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/news')}
          >
            Ver todas as notícias
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsCard;

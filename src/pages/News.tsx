import { useQuery } from "@tanstack/react-query";
import { fetchMarketNews } from "@/services/marketData";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const News = () => {
  const { data: news, isLoading, error, refetch } = useQuery({
    queryKey: ['marketNews'],
    queryFn: () => fetchMarketNews({ limit: 20 }), // Busca até 20 notícias para a página completa
    refetchInterval: 1800000, // Atualiza a cada 30 minutos (1800000 ms)
    staleTime: 1800000, // Considera os dados obsoletos após 30 minutos
  });

  useEffect(() => {
    console.log("News Page - Dados de notícias:", news);
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
  }, [news, error, refetch]);

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
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
              <path d="M16 21h5v-5"></path>
            </svg>
            Atualizar
          </Button>
        </div>

        <div className="grid gap-6">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <p>Carregando notícias...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="p-6">
                <p>Erro ao carregar notícias. Tente novamente mais tarde.</p>
                <p className="text-sm text-red-500 mt-2">{error.toString()}</p>
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  className="mt-4"
                >
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : !news || news.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p>Nenhuma notícia disponível no momento.</p>
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  className="mt-4"
                >
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : (
            news?.map((item) => (
              <Card key={item.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => window.open(item.url, '_blank')}>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-[300px,1fr] gap-6">
                    <div className="h-48 overflow-hidden rounded-lg">
                      <img 
                        src={item.imageUrl || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&q=80"} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&q=80";
                        }}
                      />
                    </div>
                    <div className="space-y-4">
                      <h2 className="text-2xl font-semibold">{item.title}</h2>
                      <p className="text-muted-foreground">{item.summary || item.content}</p>
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
          )}
        </div>
      </div>
    </Layout>
  );
};

export default News;

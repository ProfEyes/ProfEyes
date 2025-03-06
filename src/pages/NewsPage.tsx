import { useQuery } from 'react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Newspaper } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fetchMarketNews } from '@/services/news';

const NewsPage = () => {
  const { data: news, isLoading } = useQuery({
    queryKey: ['allNews'],
    queryFn: async () => {
      const allNews = await fetchMarketNews();
      // Garantir que todas as notícias tenham imageUrl
      return allNews.filter(item => item.imageUrl && item.imageUrl.trim() !== '');
    },
  });

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notícias do Mercado</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          // Estado de carregamento
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse space-y-4">
              <div className="h-48 bg-white/10 rounded-lg" />
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
            </div>
          ))
        ) : news && news.length > 0 ? (
          news.map((item, index) => (
            <a
              key={item.id || index}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white/5 rounded-lg overflow-hidden hover:bg-white/10 transition-colors"
            >
              <div className="relative w-full h-48 overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 space-y-3">
                <h3 className="font-medium text-lg line-clamp-2">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <Newspaper className="w-4 h-4 mr-1" />
                    {item.source}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(item.publishedAt), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </a>
          ))
        ) : (
          <div className="col-span-full flex items-center justify-center p-8">
            <span className="text-muted-foreground">Nenhuma notícia disponível</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsPage; 
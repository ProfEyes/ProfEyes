import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoCard } from "@/components/ui/video-card";
import { ShortCard } from "@/components/ui/short-card";
import { LiveStreamCard } from "@/components/ui/livestream-card";
import { useVideo } from "@/contexts/VideoContext";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Video, 
  VideoOff, 
  Radio, 
  Search, 
  TrendingUp, 
  Play, 
  Upload, 
  Clock, 
  Compass, 
  ChevronRight, 
  Film
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

// Lista de categorias disponíveis
const CATEGORIES = [
  "Todos", "Criptomoedas", "Trading", "Educação", "Notícias", "Análises", "Tutoriais", "Entrevistas"
];

export default function MediaHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { 
    videos, shorts, liveStreams, 
    isLoading, isUserVerified, uploadProgress,
    getVideos, getShorts, getLiveStreams 
  } = useVideo();
  
  const [activeTab, setActiveTab] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Carregar dados iniciais
  useEffect(() => {
    // Carregar tudo na primeira visita
    getVideos();
    getShorts();
    getLiveStreams();
  }, []);
  
  // Filtrar por categoria quando mudar a seleção
  useEffect(() => {
    if (selectedCategory !== "Todos") {
      getVideos({ category: selectedCategory });
    } else {
      getVideos();
    }
  }, [selectedCategory]);
  
  // Função para pesquisar
  const handleSearch = () => {
    if (searchQuery.trim()) {
      getVideos({ search: searchQuery });
      toast.success(`Buscando por "${searchQuery}"`);
    }
  };
  
  // Renderizar videos em formato de loading
  const renderVideoSkeletons = (count = 6) => {
    return Array(count)
      .fill(null)
      .map((_, idx) => (
        <div key={idx} className="flex flex-col gap-2">
          <Skeleton className="w-full aspect-video rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </div>
      ));
  };
  
  // Renderizar skeleton de shorts
  const renderShortSkeletons = (count = 6) => {
    return Array(count)
      .fill(null)
      .map((_, idx) => (
        <div key={idx} className="flex-shrink-0 w-[180px]">
          <Skeleton className="w-full aspect-[9/16] rounded-xl" />
          <div className="space-y-2 mt-2">
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-2 w-2/3" />
          </div>
        </div>
      ));
  };
  
  // Navegar para upload
  const handleUploadClick = () => {
    if (!user) {
      toast.error("Você precisa fazer login para enviar vídeos.");
      navigate("/auth");
      return;
    }
    
    if (!isUserVerified) {
      toast.error("Apenas usuários verificados podem fazer upload de vídeos.");
      return;
    }
    
    navigate("/upload");
  };
  
  return (
    <Layout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Film className="h-6 w-6" />
            Media Hub
          </h1>
          
          <div className="flex gap-3">
            <div className="relative w-64">
              <Input
                placeholder={t("Pesquisar vídeos...")}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="pr-9"
              />
              <Search
                className="h-4 w-4 absolute right-3 top-3 text-muted-foreground cursor-pointer"
                onClick={handleSearch}
              />
            </div>
            
            <Button 
              onClick={handleUploadClick}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {t("Enviar")}
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex justify-between">
            <TabsList>
              <TabsTrigger value="home" className="gap-2">
                <Compass className="h-4 w-4" />
                {t("Início")}
              </TabsTrigger>
              <TabsTrigger value="videos" className="gap-2">
                <Play className="h-4 w-4" />
                {t("Vídeos")}
              </TabsTrigger>
              <TabsTrigger value="shorts" className="gap-2">
                <Film className="h-4 w-4" />
                {t("Shorts")}
              </TabsTrigger>
              <TabsTrigger value="live" className="gap-2">
                <Radio className="h-4 w-4" />
                {t("Ao vivo")}
              </TabsTrigger>
              {user && (
                <TabsTrigger value="library" className="gap-2">
                  <Clock className="h-4 w-4" />
                  {t("Biblioteca")}
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          
          {/* Página inicial */}
          <TabsContent value="home" className="space-y-8">
            {/* Transmissão em destaque */}
            {liveStreams.length > 0 && (
              <section className="mb-8">
                <LiveStreamCard 
                  stream={liveStreams[0]} 
                  variant="featured" 
                />
              </section>
            )}
            
            {/* Transmissões ao vivo */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Radio className="h-5 w-5 text-red-500" />
                  {t("Transmissões ao vivo")}
                </h2>
                <Button
                  variant="link"
                  onClick={() => setActiveTab("live")}
                  className="text-sm font-medium"
                >
                  {t("Ver todos")}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderVideoSkeletons(3)}
                </div>
              ) : liveStreams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {liveStreams.slice(0, 3).map(stream => (
                    <LiveStreamCard key={stream.id} stream={stream} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <VideoOff className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{t("Nenhuma transmissão ao vivo no momento.")}</p>
                  <Button variant="link" onClick={() => navigate("/live/create")}>
                    {t("Comece a transmitir")}
                  </Button>
                </div>
              )}
            </section>
            
            {/* Shorts em destaque */}
            <section className="mt-10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Film className="h-5 w-5" />
                  {t("Shorts")}
                </h2>
                <Button
                  variant="link"
                  onClick={() => setActiveTab("shorts")}
                  className="text-sm font-medium"
                >
                  {t("Ver todos")}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              
              <ScrollArea className="pb-4 -mx-2 px-2">
                <div className="flex gap-4 pb-4">
                  {isLoading ? (
                    renderShortSkeletons(8)
                  ) : shorts.length > 0 ? (
                    shorts.slice(0, 8).map(short => (
                      <div key={short.id} className="flex-shrink-0 w-[180px]">
                        <ShortCard short={short} variant="default" />
                      </div>
                    ))
                  ) : (
                    <div className="w-full text-center py-10">
                      <VideoOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">{t("Nenhum short disponível.")}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </section>
            
            {/* Vídeos em alta */}
            <section className="mt-10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t("Vídeos em alta")}
                </h2>
                <Button
                  variant="link"
                  onClick={() => setActiveTab("videos")}
                  className="text-sm font-medium"
                >
                  {t("Ver todos")}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderVideoSkeletons(6)}
                </div>
              ) : videos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.slice(0, 6).map(video => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <VideoOff className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{t("Nenhum vídeo disponível.")}</p>
                  <Button variant="link" onClick={handleUploadClick}>
                    {t("Envie o primeiro vídeo")}
                  </Button>
                </div>
              )}
            </section>
          </TabsContent>
          
          {/* Página de Vídeos */}
          <TabsContent value="videos">
            {/* Categorias */}
            <div className="mb-6 overflow-x-auto pb-2">
              <div className="flex gap-2">
                {CATEGORIES.map(category => (
                  <Badge
                    key={category}
                    variant={category === selectedCategory ? "default" : "outline"}
                    className={cn(
                      "px-3 py-1 cursor-pointer transition-colors",
                      category === selectedCategory ? "bg-primary" : "hover:bg-accent"
                    )}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {t(category)}
                  </Badge>
                ))}
              </div>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {renderVideoSkeletons(12)}
              </div>
            ) : videos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map(video => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <VideoOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t("Nenhum vídeo encontrado")}</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  {searchQuery ? 
                    t(`Nenhum resultado para "${searchQuery}". Tente uma busca diferente.`) : 
                    t("Nenhum vídeo disponível nesta categoria.")}
                </p>
                {user && isUserVerified && (
                  <Button onClick={handleUploadClick}>
                    <Upload className="mr-2 h-4 w-4" />
                    {t("Enviar um vídeo")}
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
          
          {/* Página de Shorts */}
          <TabsContent value="shorts">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array(12).fill(null).map((_, idx) => (
                  <Skeleton key={idx} className="w-full aspect-[9/16] rounded-xl" />
                ))}
              </div>
            ) : shorts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {shorts.map(short => (
                  <ShortCard key={short.id} short={short} variant="default" />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <VideoOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t("Nenhum short encontrado")}</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  {t("Ainda não temos shorts disponíveis.")}
                </p>
                {user && isUserVerified && (
                  <Button onClick={() => navigate("/upload?type=short")}>
                    <Upload className="mr-2 h-4 w-4" />
                    {t("Criar um short")}
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
          
          {/* Página de transmissões ao vivo */}
          <TabsContent value="live">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Radio className="h-5 w-5 text-red-500" />
                {t("Transmissões ao vivo")}
              </h2>
              
              <Button onClick={() => navigate("/live/create")}>
                <Radio className="mr-2 h-4 w-4" />
                {t("Iniciar transmissão")}
              </Button>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {renderVideoSkeletons(6)}
              </div>
            ) : liveStreams.length > 0 ? (
              <>
                {/* Stream em destaque */}
                {liveStreams.length > 0 && (
                  <div className="mb-8">
                    <LiveStreamCard stream={liveStreams[0]} variant="featured" />
                  </div>
                )}
                
                {/* Outras streams */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {liveStreams.slice(1).map(stream => (
                    <LiveStreamCard key={stream.id} stream={stream} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <VideoOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t("Nenhuma transmissão ao vivo")}</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  {t("Não há transmissões ao vivo no momento.")}
                </p>
                <Button onClick={() => navigate("/live/create")}>
                  <Radio className="mr-2 h-4 w-4" />
                  {t("Iniciar uma transmissão")}
                </Button>
              </div>
            )}
          </TabsContent>
          
          {/* Biblioteca (histórico, assistir mais tarde) */}
          <TabsContent value="library">
            {user ? (
              <div className="grid grid-cols-1 gap-6">
                <section>
                  <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {t("Histórico")}
                  </h2>
                  
                  <div className="space-y-2">
                    {/* Histórico do usuário (simulado) */}
                    {videos.slice(0, 5).map(video => (
                      <VideoCard key={video.id} video={video} variant="list" />
                    ))}
                    
                    {videos.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">{t("Seu histórico está vazio.")}</p>
                      </div>
                    )}
                  </div>
                </section>
                
                <Separator className="my-6" />
                
                <section>
                  <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {t("Assistir mais tarde")}
                  </h2>
                  
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">{t("Sua lista está vazia.")}</p>
                    <Button variant="link" onClick={() => setActiveTab("videos")}>
                      {t("Explorar vídeos")}
                    </Button>
                  </div>
                </section>
              </div>
            ) : (
              <div className="text-center py-20">
                <h3 className="text-xl font-semibold mb-2">{t("Faça login para acessar sua biblioteca")}</h3>
                <Button onClick={() => navigate("/auth")}>
                  {t("Fazer login")}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
} 
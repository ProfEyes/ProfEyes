import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { BellRing, RefreshCw, PlayCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardCard from "@/components/dashboard/DashboardCard";
import { default as SignalsCard } from "@/components/dashboard/SignalsCard";
import { NewsCard } from "@/components/dashboard/NewsCard";
import { fetchMarketData } from "@/services";
// import { monitorSignals } from "@/services/tradingSignals"; // Removido - arquivo não existe mais
import { toast } from "sonner";
import { getLatestPrices } from "@/services/getSimulatedPrices";
import { NotificationButton } from "@/components/ui/notification-button";
import { notificationService } from "@/services/notificationService";
import { useNavigate } from "react-router-dom";
import { VideoPlayer } from "@/components/ui/video-player";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
// Importar o serviço de links do trader
import { traderLinkService } from "@/services/traderLinkService";

// Lista de estatísticas do desempenho do trader
const DASHBOARD_STATS = [
  'SINAIS_TOTAL', 'ACERTOS', 'GANHO_MENSAL', 'PERDA_MENSAL', 
  'LUCRO_TOTAL', 'OPERACOES_HOJE', 'TEMPO_ONLINE', 'DIAS_ATIVOS'
];

// Mapeamento para nomes amigáveis das estatísticas
const STAT_NAMES: Record<string, string> = {
  'SINAIS_TOTAL': 'Total de Sinais',
  'ACERTOS': 'Taxa de Acerto',
  'GANHO_MENSAL': 'Ganho Mensal',
  'PERDA_MENSAL': 'Perda Mensal',
  'LUCRO_TOTAL': 'Lucro Total',
  'OPERACOES_HOJE': 'Operações Hoje',
  'TEMPO_ONLINE': 'Tempo Online',
  'DIAS_ATIVOS': 'Dias Ativos'
};

const Index = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // Estado local para armazenar dados de mercado em tempo real
  const [realtimeData, setRealtimeData] = useState<Record<string, { price: string; change: string; changePercent: string }>>({});
  
  // Estado para controlar a animação de atualização
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Estado para o link do trader - MOVIDO PARA O INÍCIO DO COMPONENTE
  const [traderLink, setTraderLink] = useState<string>('');
  
  // Função para abrir o link do trader - MOVIDA PARA O INÍCIO DO COMPONENTE
  const openTraderLink = useCallback(() => {
    if (!traderLink) {
      console.warn('⚠️ Index - Tentativa de abrir link do trader, mas o link ainda não foi carregado');
      // Fallback para o link padrão caso o traderLink ainda não tenha sido carregado
      window.open('https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree', '_blank');
      return;
    }
    console.log('🔗 Index - Abrindo link do trader:', traderLink);
    window.open(traderLink, '_blank');
  }, [traderLink]);
  
  // Carregar o link do trader no início
  useEffect(() => {
    const loadTraderLink = async () => {
      try {
        const link = await traderLinkService.getCurrentTraderLink();
        console.log('📌 Index - Link do trader carregado:', link);
        setTraderLink(link);
      } catch (error) {
        console.error('❌ Index - Erro ao carregar link do trader:', error);
        // Em caso de erro, manter o link padrão
        setTraderLink('https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree');
      }
    };
    
    loadTraderLink();
  }, []);
  
  // Consulta para obter dados iniciais e atualizações periódicas de outros dados
  const { data: marketData, isLoading, error, refetch } = useQuery({
    queryKey: ['marketData'],
    queryFn: async () => {
      // Obter dados para cada símbolo e retornar como array
      const promises = DASHBOARD_STATS.map(symbol => fetchMarketData(symbol));
      return Promise.all(promises);
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos para outros dados (como variação)
    staleTime: 15000, // Considera dados obsoletos após 15 segundos
    meta: {
      onError: (error: Error) => {
        toast.error("Erro ao carregar dados do mercado");
      }
    }
  });

  // Adicionar monitoramento automático de sinais
  const [monitoringActive, setMonitoringActive] = useState(false);
  
  // Função para monitorar sinais - DESATIVADA (arquivo tradingSignals removido)
  const checkSignals = async () => {
    try {
      // const result = await monitorSignals();
      // Funcionalidade desativada - arquivo tradingSignals.ts foi removido
      console.log('Monitoramento de sinais desativado');
    } catch (error) {
      console.error('Erro ao monitorar sinais:', error);
    }
  };
  
  // Iniciar monitoramento automático ao carregar a página
  useEffect(() => {
    // Função para monitorar periodicamente
    const startMonitoring = () => {
      if (!monitoringActive) {
        setMonitoringActive(true);
        
        // Verificar sinais imediatamente
        checkSignals();
        
        // Configurar verificação periódica a cada 5 minutos
        const monitoringInterval = setInterval(() => {
          checkSignals();
        }, 5 * 60 * 1000); // 5 minutos
        
        // Limpar intervalo quando o componente for desmontado
        return () => {
          clearInterval(monitoringInterval);
          setMonitoringActive(false);
        };
      }
    };
    
    // Iniciar monitoramento
    const cleanup = startMonitoring();
    
    // Limpar intervalo quando componente for desmontado
    return cleanup;
  }, []);

  // Função para buscar preços em tempo real (memoizada para manter identidade estável)
  const fetchRealTimePrices = useCallback(async () => {
    try {
      // Verificar se temos preços em cache para exibir imediatamente
      const cachedPrices = localStorage.getItem('cached-crypto-prices');
      let initialPrices = {};
      
      if (cachedPrices) {
        try {
          initialPrices = JSON.parse(cachedPrices);
          // Atualizar o estado com dados do cache imediatamente
          setRealtimeData(prev => ({...prev, ...initialPrices}));
        } catch (e) {
          console.error('Erro ao analisar dados do cache:', e);
        }
      }
      
      // Buscar preços atuais (estatísticas)
      const prices = await getLatestPrices(DASHBOARD_STATS);
      
      // Preparar dados simulados para as estatísticas do trader
      const statsMap: Record<string, { 
        priceChange: string; 
        priceChangePercent: string; 
      }> = {};
      
      // Gerar dados estáticos para cada estatística
      DASHBOARD_STATS.forEach(symbol => {
        let change = "";
        const changePercent = "";
        
        switch(symbol) {
          case 'SINAIS_TOTAL':
            change = "287 sinais";
            break;
          case 'ACERTOS':
            change = "72% de acerto";
            break;
          case 'GANHO_MENSAL':
            change = "+R$ 4.328,50";
            break;
          case 'PERDA_MENSAL':
            change = "-R$ 1.256,80";
            break;
          case 'LUCRO_TOTAL':
            change = "+R$ 37.245,90";
            break;
          case 'OPERACOES_HOJE':
            change = "5 operações";
            break;
          case 'TEMPO_ONLINE':
            change = "126 horas";
            break;
          case 'DIAS_ATIVOS':
            change = "45 dias consecutivos";
            break;
          default:
            change = "";
        }
        
        statsMap[symbol] = {
          priceChange: change,
          priceChangePercent: changePercent
        };
      });
      
      // Criar um novo objeto diretamente em vez de copiar o anterior
      const updated: Record<string, { price: string; change: string; changePercent: string }> = {};
      
      // Processar todos os dados de uma vez
      prices.forEach(item => {
        if (!item || typeof item !== 'object') return;
        
        const symbol = item.symbol || '';
        if (!symbol) return; // Pular itens sem símbolo
        
        let price = "";
        
        // Formatar valores para cada tipo de estatística
        switch(symbol) {
          case 'SINAIS_TOTAL':
            price = "287";
            break;
          case 'ACERTOS':
            price = "72%";
            break;
          case 'GANHO_MENSAL':
            price = "R$ 4.328";
            break;
          case 'PERDA_MENSAL':
            price = "R$ 1.256";
            break;
          case 'LUCRO_TOTAL':
            price = "R$ 37.245";
            break;
          case 'OPERACOES_HOJE':
            price = "5";
            break;
          case 'TEMPO_ONLINE':
            price = "126h";
            break;
          case 'DIAS_ATIVOS':
            price = "45";
            break;
          default:
            price = item.price || "0";
        }
        
        // Obter dados de variação das estatísticas personalizadas
        const stats = statsMap[symbol];
        let change = "";
        let changePercent = "";
        
        if (stats) {
          change = stats.priceChange || "";
          changePercent = stats.priceChangePercent || "";
        }
        
        updated[symbol] = {
          price: price || "0",
          change: change || "0",
          changePercent: changePercent || "0%"
        };
      });
      
      // Atualizar o estado apenas uma vez com todos os dados
      setRealtimeData(prev => {
        const newState = {...prev, ...updated};
        // Salvar no localStorage para persistência
        localStorage.setItem('cached-crypto-prices', JSON.stringify(newState));
        return newState;
      });
    } catch (error) {
      console.error("Erro ao buscar dados personalizados:", error);
      
      // Se ocorrer um erro, verificar se temos cache e usar
      const cachedPrices = localStorage.getItem('cached-crypto-prices');
      if (cachedPrices) {
        try {
          const parsedCache = JSON.parse(cachedPrices);
          setRealtimeData(prev => ({...prev, ...parsedCache}));
        } catch (e) {
          console.error('Erro ao analisar dados do cache:', e);
        }
      }
    }
  }, []);

  // Efeito para configurar atualizações em tempo real
  useEffect(() => {
    // Buscar preços iniciais e configurar atualizações periódicas
    fetchRealTimePrices();

    // Configurar intervalo para atualização (1s) - mantemos a função memoizada
    const interval = setInterval(() => {
      fetchRealTimePrices();
    }, 1000);

    // Busca dados iniciais de variação
    refetch();

    // Limpar na desmontagem do componente
    return () => {
      clearInterval(interval);
    };
    // Intencionalmente deixamos dependências vazias para evitar recriar o intervalo
    // e rely on memoized fetchRealTimePrices. `refetch` do react-query é estável,
    // mas se seu lint reclamar, podemos colocá-lo em uma ref.
  }, []);
  
  // Efeito para atualizar dados de variação quando marketData for atualizado
  useEffect(() => {
    if (marketData && Array.isArray(marketData)) {
      setRealtimeData(prev => {
        const updated = { ...prev };
        
        marketData.forEach(item => {
          if (updated[item.symbol]) {
            // Manter o preço em tempo real, mas atualizar dados de variação
            // Converter valores numéricos para string
            updated[item.symbol].change = item.change != null ? item.change.toString() : '0';
            updated[item.symbol].changePercent = item.change != null ? `${item.change}%` : '0%';
          } else {
            // Adicionar item completo se não existir
            updated[item.symbol] = {
              price: `$${item.price != null ? item.price.toString() : '0'}`,
              change: item.change != null ? item.change.toString() : '0',
              changePercent: item.change != null ? `${item.change}%` : '0%'
            };
          }
        });
        
        return updated;
      });
    }
  }, [marketData]);

  // Preparar dados para exibição
  const displayData = Object.entries(realtimeData).map(([symbol, data]) => ({
    symbol: STAT_NAMES[symbol] || symbol,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent
  }));

  // Verificar se está carregando market data ou se ainda não temos dados
  const isDataLoading = isLoading || Object.keys(realtimeData).length === 0;

  // Configurar notificações quando o componente montar
  useEffect(() => {
    notificationService.setConfig({
      onSignalSuccess: (signal) => {
        // Atualizar interface quando um sinal for bem-sucedido
        queryClient.invalidateQueries({ queryKey: ['dashboardSignals'] });
      },
      onNewSignal: (signal) => {
        // Atualizar interface quando houver um novo sinal
        queryClient.invalidateQueries({ queryKey: ['dashboardSignals'] });
      },
      onHighProbabilitySignal: (signal) => {
        // Destacar sinais de alta probabilidade na interface
        toast.info("Sinal de Alta Probabilidade Disponível!", {
          description: `Novo sinal para ${signal.pair} com ${(signal.success_rate * 100).toFixed(1)}% de chance de sucesso.`,
          action: {
            label: "Ver Sinal",
            onClick: () => navigate('/signals')
          }
        });
      },
      onUpcomingSignal: (signal) => {
        // Notificar sobre sinais prestes a entrar (5 minutos antes)
        // Criar dois toasts diferentes para ter dois botões distintos
        toast.info("⏰ ATENÇÃO: Sinal em 5 minutos!", {
          description: `Prepare-se para o sinal de ${signal.signal === 'BUY' ? 'COMPRA' : 'VENDA'} para ${signal.pair || signal.symbol}
          \nPreço de entrada: ${signal.entry_price || 'N/A'}
          \nConfidência: ${signal.success_rate ? (signal.success_rate * 100).toFixed(1) + '%' : 'N/A'}`,
          action: {
            label: "Abrir Corretora", 
            onClick: () => openTraderLink()
          },
          duration: 15000, // 15 segundos
        });
        
        // Segundo toast para o botão "Ver Sinais"
        toast.info("⏰ Ver detalhes do sinal", {
          description: `Clique para ver todos os detalhes do sinal para ${signal.pair || signal.symbol}`,
          action: {
            label: "Ver Sinais",
            onClick: () => navigate('/signals')
          },
          duration: 15000, // 15 segundos
        });
        
        // Habilitar notificações para este sinal
        notificationService.setEnabled(true);
      },
      onSignalResult: (signal, result) => {
        // Notificação de resultado de sinal (após 10 minutos da entrada)
        if (result === 'success') {
          // Notificação de GANHO
          toast.success(`🎯 GANHO: ${signal.pair || signal.symbol}!`, {
            description: `Sua operação de ${signal.signal === 'BUY' ? 'COMPRA' : 'VENDA'} resultou em ganho!
            \nParabéns pelo resultado! Continue operando.`,
            action: {
              label: "Nova Operação",
              onClick: () => navigate('/signals')
            },
            duration: 20000, // 20 segundos
          });
        } else {
          // Notificação de PERDA
          toast.error(`❌ PERDA: ${signal.pair || signal.symbol}`, {
            description: `Sua operação de ${signal.signal === 'BUY' ? 'COMPRA' : 'VENDA'} resultou em perda.
            \nO próximo sinal pode ser vencedor! Continue operando.`,
            action: {
              label: "Tentar Novamente",
              onClick: () => navigate('/signals')
            },
            duration: 20000, // 20 segundos
          });
        }
        
        // Atualizar interface
        queryClient.invalidateQueries({ queryKey: ['dashboardSignals'] });
      },
      onMarketNews: (news) => {
        // Mostrar notícias importantes na interface
        toast.info("Nova Notícia do Mercado", {
          description: news.headline,
          action: {
            label: "Ler Mais",
            onClick: () => window.open(news.url, '_blank')
          }
        });
      }
    });
    
    // Habilitar o serviço de notificações
    notificationService.setEnabled(true);
  }, [queryClient, navigate, openTraderLink]);

  // Função para disparar a atualização com animação
  const handleRefresh = useCallback(() => {
    // Não fazer nada se já estiver carregando
    if (isLoading) return;
    
    // Iniciar a animação apenas do botão
    setIsRefreshing(true);
    
    // Efeito de som de atualização (opcional)
    try {
      const audio = new Audio('/refresh-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(e => console.log('Som de atualização não disponível', e));
    } catch (e) {
      // Ignorar erros de áudio - recurso opcional
    }
    
    // Executar as atualizações (sem atualizar sinais)
    refetch();
    fetchRealTimePrices();
    // checkSignals(); // Removido para manter os sinais estáveis
    
    // Finalizar a animação após 2 segundos
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
  }, [isLoading, refetch, fetchRealTimePrices]);

  const [isVideoHidden, setIsVideoHidden] = useState(() => {
    const savedState = localStorage.getItem('dashboard-video-hidden');
    return savedState ? JSON.parse(savedState) : false;
  });
  
  // Função para salvar o estado do vídeo
  const handleVideoVisibilityChange = (isHidden: boolean) => {
    setIsVideoHidden(isHidden);
    localStorage.setItem('dashboard-video-hidden', JSON.stringify(isHidden));
  };
  
  // Referência para o vídeo
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  
  // Função para confirmar que o vídeo foi carregado
  const handleVideoLoaded = useCallback(() => {
    console.log("Vídeo carregado no dashboard");
    setIsVideoLoaded(true);
  }, []);

  return (
    <Layout>
      <div className="animate-fade space-y-8">
        {/* Elementos decorativos flutuantes */}
        <div className="fixed w-full h-full inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] right-[5%] w-32 h-32 bg-gradient-to-r from-purple-500/10 to-violet-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[20%] left-[8%] w-40 h-40 bg-gradient-to-r from-emerald-500/5 to-teal-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-[40%] left-[30%] w-24 h-24 bg-gradient-to-br from-white/5 to-white/10 rounded-full blur-2xl"></div>
        </div>
        
        <div className="flex items-center justify-between relative z-10">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight relative pb-1
                          text-white
                          drop-shadow-[0_0px_6px_rgba(255,255,255,0.2)]">
              <span className="relative">
                <span className="relative z-10">Dashboard</span>
                <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent"></span>
                <span className="absolute -bottom-2 left-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></span>
              </span>
            </h1>
            <p className="text-sm text-white/60 tracking-wide pl-0">
              {t('signals.advanced.monitoring')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isLoading}
              className={`border-white/10 bg-black/40 backdrop-blur-md hover:bg-white/10 flex items-center gap-2 
                        transition-all duration-500 
                        ${isRefreshing ? 'refresh-animation shadow-[0_0_15px_rgba(255,255,255,0.15)] bg-white/10' : 
                                         'shadow-[0_0_10px_rgba(255,255,255,0.05)]'}`}
            >
              {isLoading || isRefreshing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 opacity-80 animate-spin" />
                  <span className="animate-pulse">{t('dashboard.signals.loading')}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 opacity-80" /> {t('dashboard.refresh.all')}
                </>
              )}
            </Button>
            <NotificationButton className="border-white/10 bg-black/40 backdrop-blur-md hover:bg-white/10 
                                        transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.05)]" />
          </div>
        </div>

        {/* Área do vídeo */}
        <div className="relative w-full mb-8">
          <VideoPlayer
            videoKey="video.main"
            className="shadow-[0_0_20px_rgba(0,0,0,0.3)] -mx-4 sm:-mx-8 md:-mx-12 lg:-mx-16 xl:-mx-24 rounded-none sm:rounded-lg"
            controls={true}
            autoPlay={true}
            muted={true}
            loop={true}
            canHide={true}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-5 relative z-10">
          <div className="md:col-span-3">
            <SignalsCard />
          </div>
          <div className="md:col-span-2">
            <NewsCard />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;

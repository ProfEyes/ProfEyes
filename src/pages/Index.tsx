import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { BellRing } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardCard from "@/components/dashboard/DashboardCard";
import SignalsCard from "@/components/dashboard/SignalsCard";
import NewsCard from "@/components/dashboard/NewsCard";
import { fetchMarketData, monitorSignals } from "@/services";
import { toast } from "sonner";
import { getLatestPrices } from "@/services/binanceApi";
import { NotificationButton } from "@/components/ui/notification-button";
import { notificationService } from "@/services/notificationService";
import { useNavigate } from "react-router-dom";

// Lista de símbolos que queremos monitorar
const CRYPTO_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 
  'DOGEUSDT', 'ADAUSDT', 'DOTUSDT'
];

// Mapeamento de símbolos para nomes amigáveis
const SYMBOL_NAMES: Record<string, string> = {
  'BTCUSDT': 'BTC',
  'ETHUSDT': 'ETH',
  'BNBUSDT': 'BNB',
  'SOLUSDT': 'SOL',
  'XRPUSDT': 'XRP',
  'DOGEUSDT': 'DOGE',
  'ADAUSDT': 'Cardano',
  'DOTUSDT': 'Polkadot'
};

const Index = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Estado local para armazenar dados de mercado em tempo real
  const [realtimeData, setRealtimeData] = useState<Record<string, { price: string; change: string; changePercent: string }>>({});
  
  // Consulta para obter dados iniciais e atualizações periódicas de outros dados
  const { data: marketData, isLoading, error, refetch } = useQuery({
    queryKey: ['marketData'],
    queryFn: fetchMarketData,
    refetchInterval: 30000, // Atualiza a cada 30 segundos para outros dados (como variação)
    staleTime: 15000, // Considera dados obsoletos após 15 segundos
    meta: {
      onError: () => {
        toast.error("Erro ao carregar dados do mercado");
      }
    }
  });

  // Adicionar monitoramento automático de sinais
  const [monitoringActive, setMonitoringActive] = useState(false);
  
  // Função para monitorar sinais
  const checkSignals = async () => {
    try {
      const result = await monitorSignals();
      
      // Verificar se algum sinal foi atualizado ou substituído
      if (result.updated.length > 0) {
        console.log(`${result.updated.length} sinais monitorados.`);
        
        // Verificar sinais que foram concluídos ou cancelados
        const completedSignals = result.updated.filter(
          signal => signal.status === 'CONCLUÍDO' || signal.status === 'CANCELADO'
        );
        
        if (completedSignals.length > 0) {
          toast.info(`${completedSignals.length} sinais atingiram alvo ou stop.`);
        }
      }
      
      // Verificar se algum sinal foi substituído
      if (result.replaced.length > 0) {
        toast.success(`${result.replaced.length} novos sinais gerados para substituir os sinais concluídos.`, {
          duration: 5000,
        });
      }
      
      // Reiniciar a busca de sinais para atualizar a interface
      queryClient.invalidateQueries({ queryKey: ['dashboardSignals'] });
      
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

  // Função para buscar preços atualizados da Binance
  const fetchRealTimePrices = async () => {
    try {
      // Buscar preços atuais
      const prices = await getLatestPrices(CRYPTO_SYMBOLS);
      
      // Buscar estatísticas de 24h para obter as variações
      const statsPromises = CRYPTO_SYMBOLS.map(async (symbol) => {
        try {
          // Importar a função get24hStats diretamente
          const { get24hStats } = await import('@/services/binanceApi');
          return await get24hStats(symbol);
        } catch (error) {
          console.error(`Erro ao buscar estatísticas para ${symbol}:`, error);
          return null;
        }
      });
      
      // Aguardar todas as requisições de estatísticas
      const statsResults = await Promise.all(statsPromises);
      
      // Criar mapa de estatísticas por símbolo
      const statsMap: Record<string, any> = {};
      statsResults.forEach(stat => {
        if (stat && stat.symbol) {
          statsMap[stat.symbol] = stat;
        }
      });
      
      // Otimização: Criar um novo objeto diretamente em vez de copiar o anterior
      const updated: Record<string, any> = {};
      
      // Processar todos os preços de uma vez
      prices.forEach(item => {
        const symbol = item.symbol;
        const price = parseFloat(item.price).toFixed(2);
        
        // Obter dados de variação das estatísticas de 24h
        const stats = statsMap[symbol];
        let change = "0.00";
        let changePercent = "0.00%";
        
        if (stats) {
          // Formatar variação de preço com 2 casas decimais
          change = parseFloat(stats.priceChange).toFixed(2);
          // Formatar variação percentual com 2 casas decimais
          changePercent = `${parseFloat(stats.priceChangePercent).toFixed(2)}%`;
        }
        
        updated[symbol] = {
          price: `$${price}`,
          change,
          changePercent
        };
      });
      
      // Atualizar o estado apenas uma vez com todos os dados
      setRealtimeData(prev => ({...prev, ...updated}));
    } catch (error) {
      console.error("Erro ao buscar preços em tempo real:", error);
    }
  };

  // Efeito para configurar atualizações em tempo real
  useEffect(() => {
    // Buscar preços iniciais e configurar atualizações periódicas
    fetchRealTimePrices();
    
    // Configurar intervalo para atualização a cada 0,1 segundos com dados reais
    const interval = setInterval(() => {
      fetchRealTimePrices();
    }, 100);
    
    // Busca dados iniciais de variação
    refetch();
    
    // Limpar na desmontagem do componente
    return () => {
      clearInterval(interval);
    };
  }, [refetch]);
  
  // Efeito para atualizar dados de variação quando marketData for atualizado
  useEffect(() => {
    if (marketData && Array.isArray(marketData)) {
      setRealtimeData(prev => {
        const updated = { ...prev };
        
        marketData.forEach(item => {
          if (updated[item.symbol]) {
            // Manter o preço em tempo real, mas atualizar dados de variação
            updated[item.symbol].change = item.change;
            updated[item.symbol].changePercent = item.changePercent;
          } else {
            // Adicionar item completo se não existir
            updated[item.symbol] = {
              price: item.price,
              change: item.change,
              changePercent: item.changePercent
            };
          }
        });
        
        return updated;
      });
    }
  }, [marketData]);

  // Preparar dados para exibição
  const displayData = Object.entries(realtimeData).map(([symbol, data]) => ({
    symbol: SYMBOL_NAMES[symbol] || symbol,
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
  }, [queryClient, navigate]);

  return (
    <Layout>
      <div className="animate-fade space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Acompanhe o mercado em tempo real
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                refetch();
                fetchRealTimePrices();
                checkSignals();
              }}
              disabled={isLoading}
              className="border-white/10 bg-white/5 hover:bg-white/10 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Atualizando...
                </>
              ) : (
                <>
                  ⟳ Atualizar Todos
                </>
              )}
            </Button>
            <NotificationButton />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {displayData.slice(0, 8).map((item, index) => (
            <DashboardCard
              key={index}
              title={item.symbol}
              value={item.price}
              trend={parseFloat(item.change) >= 0 ? "up" : "down"}
              trendValue={`${item.change} (${item.changePercent})`}
            />
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SignalsCard />
          <NewsCard />
        </div>
      </div>
    </Layout>
  );
};

export default Index;

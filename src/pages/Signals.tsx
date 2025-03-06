import Layout from "@/components/Layout";
import { ArrowDownRight, ArrowUpRight, Target, Shield, ArrowRightCircle, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TradingSignal, fetchTradingSignals, getLatestPrices } from "@/services";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect, useRef } from "react";
import { SignalStrength, SignalType } from "@/services/types";

// Adicionar estilos para as animações
const styles = `
  @keyframes pulse {
    0%, 100% { opacity: 0.6; transform: scale(0.98); }
    50% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  @keyframes rotateGlow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    position: relative;
  }
  
  .loading-text {
    font-size: 1.2rem;
    font-weight: 600;
    background: linear-gradient(90deg, #ffffff, #a5a5a5, #ffffff);
    background-size: 200% auto;
    color: transparent;
    background-clip: text;
    -webkit-background-clip: text;
    animation: gradientShift 2s ease infinite;
    margin-top: 1.5rem;
  }
  
  .loading-subtext {
    margin-top: 0.5rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
    animation: pulse 1.5s ease-in-out infinite;
    text-align: center;
  }
  
  .circular-loader {
    position: relative;
    width: 60px;
    height: 60px;
  }
  
  .loader-circle {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 3px solid transparent;
    border-top-color: rgba(255, 255, 255, 0.7);
    animation: rotateGlow 1s linear infinite;
  }
  
  .loader-inner-circle {
    position: absolute;
    inset: 6px;
    border-radius: 50%;
    border: 3px solid transparent;
    border-top-color: rgba(100, 200, 255, 0.8);
    animation: rotateGlow 1.5s linear infinite reverse;
  }
  
  .loader-inner-circle-2 {
    position: absolute;
    inset: 12px;
    border-radius: 50%;
    border: 3px solid transparent;
    border-top-color: rgba(200, 100, 255, 0.8);
    animation: rotateGlow 2s linear infinite;
  }
  
  .animated-dot {
    display: inline-block;
    animation: pulse 1s infinite;
  }
  
  .animated-dot:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .animated-dot:nth-child(3) {
    animation-delay: 0.4s;
  }
`;

const Signals = () => {
  const [filterType, setFilterType] = useState<SignalType | 'ALL'>('ALL');
  const [currentPrices, setCurrentPrices] = useState<Record<string, string>>({});
  const intervalRef = useRef<number | null>(null);
  const queryClient = useQueryClient();
  
  const { data: signals, isLoading, refetch } = useQuery({
    queryKey: ['trading-signals'],
    queryFn: () => fetchTradingSignals(true),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Filtragem de sinais por tipo
  const filteredSignals = signals?.filter(signal => 
    filterType === 'ALL' || signal.type === filterType
  ).sort((a, b) => {
    // Ordenar primeiro por força do sinal (STRONG primeiro)
    if (a.strength !== b.strength) {
      return a.strength === 'STRONG' ? -1 : b.strength === 'STRONG' ? 1 : 0;
    }
    // Depois por taxa de sucesso (se existir)
    if (a.success_rate && b.success_rate) {
      return b.success_rate - a.success_rate;
    }
    return 0;
  });

  // Função para obter os preços atualizados
  const updatePrices = async () => {
    if (!signals || signals.length === 0) return;
    
    try {
      // Extrair símbolos únicos dos sinais
      const symbols = [...new Set(signals.map((signal: any) => signal.symbol || signal.pair || ''))];
      if (symbols.length === 0) return;
      
      // Buscar preços atualizados
      const prices = await getLatestPrices(symbols);
      
      // Atualizar estado com os novos preços
      const priceMap: Record<string, string> = {};
      prices.forEach(price => {
        priceMap[price.symbol] = price.price;
      });
      
      setCurrentPrices(priceMap);
    } catch (error) {
      console.error('Erro ao atualizar preços:', error);
    }
  };

  // Configurar e limpar o intervalo de atualização
  useEffect(() => {
    // Iniciar buscando os preços imediatamente
    updatePrices();
    
    // Configurar o intervalo para atualizar a cada 500ms (0.5 segundos)
    intervalRef.current = window.setInterval(updatePrices, 500);
    
    // Função de limpeza ao desmontar o componente
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [signals]); // Recriar o intervalo quando os sinais mudarem

  const getStrengthColor = (strength: SignalStrength) => {
    switch(strength) {
      case SignalStrength.STRONG:
        return "text-green-400";
      case SignalStrength.MODERATE:
        return "text-yellow-400";
      case SignalStrength.WEAK:
        return "text-orange-400";
      default:
        return "text-gray-400";
    }
  };

  const getStrengthText = (strength: SignalStrength) => {
    switch(strength) {
      case SignalStrength.STRONG:
        return "Alta";
      case SignalStrength.MODERATE:
        return "Média";
      case SignalStrength.WEAK:
        return "Baixa";
      default:
        return "Indeterminada";
    }
  };
  
  const getTypeColor = (type: SignalType) => {
    switch(type) {
      case SignalType.TECHNICAL:
        return "bg-blue-500/20 text-blue-400";
      case SignalType.FUNDAMENTAL:
        return "bg-purple-500/20 text-purple-400";
      case SignalType.NEWS:
        return "bg-amber-500/20 text-amber-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  // Função para obter o preço de entrada do sinal
  const getEntryPrice = (signal: any): string => {
    // Verificar os diferentes possíveis campos para entrada
    if (signal.entry_price !== undefined) {
      return signal.entry_price.toString();
    }
    if (signal.entry !== undefined) {
      return signal.entry.toString();
    }
    // Se não encontrar, usar o preço atual
    return signal.price?.toString() || "N/A";
  };

  // Função para obter o preço alvo do sinal
  const getTargetPrice = (signal: any): string => {
    // Verificar os diferentes possíveis campos para alvo
    if (signal.target_price !== undefined) {
      return signal.target_price.toString();
    }
    if (signal.target !== undefined) {
      return signal.target.toString();
    }
    return "N/A";
  };

  // Função para obter o preço de stop loss do sinal
  const getStopLossPrice = (signal: any): string => {
    // Verificar os diferentes possíveis campos para stop loss
    if (signal.stop_loss !== undefined) {
      return signal.stop_loss.toString();
    }
    if (signal.stopLoss !== undefined) {
      return signal.stopLoss.toString();
    }
    return "N/A";
  };

  // Função para formatar preço com o número correto de casas decimais
  const formatPrice = (price: string, symbol: string): string => {
    if (price === "N/A") return price;
    
    // Determinar número de casas decimais baseado no ativo
    const numDecimals = symbol.includes("USD") ? 
      (parseFloat(price) < 1 ? 4 : 2) : 2;
    
    return parseFloat(price).toFixed(numDecimals);
  };

  // Função para obter o símbolo do par de trading
  const getSymbol = (signal: any): string => {
    // Verificar os diferentes campos possíveis para o símbolo do par
    return signal.symbol || signal.pair || "";
  };

  // Função para obter o preço atual, usando o estado atualizado ou o valor do sinal
  const getCurrentPrice = (signal: any): string => {
    const symbol = signal.symbol || signal.pair || '';
    if (currentPrices[symbol]) {
      return currentPrices[symbol];
    }
    return signal.price?.toString() || 'N/A';
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Sinais de Trading
          </h1>
          <p className="text-muted-foreground">
            Oportunidades de mercado baseadas em análise de dados reais
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Os sinais são ordenados por força (Alta, Média, Baixa) e depois por data, mostrando os mais recentes primeiro.
          </p>
        </div>
        
        {/* Filtro por tipo de sinal */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterType === 'ALL' 
                ? 'bg-white/20 text-white' 
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType(SignalType.TECHNICAL)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterType === SignalType.TECHNICAL 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            Técnicos
          </button>
          <button
            onClick={() => setFilterType(SignalType.FUNDAMENTAL)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterType === SignalType.FUNDAMENTAL 
                ? 'bg-purple-500/20 text-purple-400' 
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            Fundamentalistas
          </button>
          <button
            onClick={() => setFilterType(SignalType.NEWS)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterType === SignalType.NEWS 
                ? 'bg-amber-500/20 text-amber-400' 
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            Notícias
          </button>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <div className="loading-container">
              <style>{styles}</style>
              <div className="circular-loader">
                <div className="loader-circle"></div>
                <div className="loader-inner-circle"></div>
                <div className="loader-inner-circle-2"></div>
              </div>
              <div className="loading-text">
                Analisando mercado
                <span className="animated-dot">.</span>
                <span className="animated-dot">.</span>
                <span className="animated-dot">.</span>
              </div>
              <div className="loading-subtext">
                Processando sinais e condições de trading em tempo real
              </div>
            </div>
          ) : filteredSignals && filteredSignals.length > 0 ? (
            filteredSignals.map((signal: any, index) => {
              const entryPrice = getEntryPrice(signal);
              const targetPrice = getTargetPrice(signal);
              const stopLossPrice = getStopLossPrice(signal);
              const symbol = getSymbol(signal);
              const currentPrice = getCurrentPrice(signal);
              
              return (
                <div 
                  key={signal.id || `signal-${index}`} 
                  className="flex flex-col md:flex-row md:items-center md:justify-between p-6 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start gap-6 mb-4 md:mb-0">
                    <div className={signal.signal === "BUY" ? "bg-market-up/10 p-3 rounded-full" : "bg-market-down/10 p-3 rounded-full"}>
                      {signal.signal === "BUY" ? (
                        <ArrowUpRight className="h-6 w-6 text-market-up" />
                      ) : (
                        <ArrowDownRight className="h-6 w-6 text-market-down" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xl font-medium">{symbol}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(signal.type as any)}`}>
                            {signal.type}
                          </span>
                        </div>
                      </div>
                      <p className={`${signal.signal === "BUY" ? "text-market-up" : "text-market-down"}`}>
                        {signal.signal === "BUY" ? "COMPRA" : "VENDA"} • <span className={getStrengthColor(signal.strength as any)}>
                          Confiança {getStrengthText(signal.strength as any)}
                        </span>
                      </p>
                      <p className="text-sm text-white/70 mt-1 max-w-lg">{signal.reason}</p>
                    </div>
                  </div>
                  <div className="md:text-right">
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                      <div className="flex items-center justify-start md:justify-end gap-2">
                        <p className="text-white/70">Preço atual:</p>
                        <span className="font-medium text-lg">${formatPrice(currentPrice, symbol)}</span>
                      </div>
                      
                      <div className="flex items-center justify-start md:justify-end gap-2">
                        <div className="flex items-center gap-1 text-blue-400">
                          <ArrowRightCircle className="h-4 w-4" />
                          <p>Entrada:</p>
                        </div>
                        <span className="font-medium">${formatPrice(entryPrice, symbol)}</span>
                      </div>
                      
                      <div className="flex items-center justify-start md:justify-end gap-2">
                        <div className="flex items-center gap-1 text-market-up">
                          <Target className="h-4 w-4" />
                          <p>Alvo:</p>
                        </div>
                        <span className="font-medium">${formatPrice(targetPrice, symbol)}</span>
                      </div>
                      
                      <div className="flex items-center justify-start md:justify-end gap-2">
                        <div className="flex items-center gap-1 text-market-down">
                          <Shield className="h-4 w-4" />
                          <p>Stop:</p>
                        </div>
                        <span className="font-medium">${formatPrice(stopLossPrice, symbol)}</span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground col-span-2 md:col-span-1 text-left md:text-right">
                        {format(new Date(signal.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center p-8">
              <span className="text-muted-foreground">Nenhum sinal {filterType !== 'ALL' ? `do tipo ${filterType}` : ''} disponível no momento</span>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Signals;


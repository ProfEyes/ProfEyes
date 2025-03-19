import { ArrowDownRight, ArrowUpRight, Target, Shield, TrendingUp, BarChart2, Clock, Percent, RefreshCw, Check, X, LineChart, BarChart, TrendingDown, Activity, AlertTriangle, ChevronUp, ChevronDown, BarChart4, BookOpen, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { TradingSignal, fetchTradingSignals, getLatestPrices, fetchCorrelationData, fetchOnChainMetrics, fetchOrderBookData } from "@/services";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { SignalType, SignalStrength } from "@/services/signals/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { notificationService } from "@/services/notificationService";
import { tradingSignalService } from "@/services/TradingSignalService";

// Estilo para animação minimalista apenas com textos
const simpleTextLoadingStyles = `
  @keyframes textCycle {
    0%, 15% {
      content: "Analisando dados do mercado...";
      opacity: 1;
    }
    20%, 25% {
      opacity: 0;
    }
    
    25%, 35% {
      content: "Processando indicadores técnicos...";
      opacity: 1;
    }
    40%, 45% {
      opacity: 0;
    }
    
    45%, 55% {
      content: "Avaliando notícias relevantes...";
      opacity: 1;
    }
    60%, 65% {
      opacity: 0;
    }
    
    65%, 75% {
      content: "Calculando níveis técnicos...";
      opacity: 1;
    }
    80%, 85% {
      opacity: 0;
    }
    
    85%, 95% {
      content: "Finalizando análise completa...";
      opacity: 1;
    }
    95%, 100% {
      opacity: 0;
    }
  }

  @keyframes barMove {
    0% {
      height: 15px;
      opacity: 0.3;
    }
    50% {
      height: 25px;
      opacity: 0.7;
    }
    100% {
      height: 15px;
      opacity: 0.3;
    }
  }
  
  @keyframes successAnimation {
    0% {
      transform: scale(1);
      background: rgba(34, 197, 94, 0);
      border-color: rgba(34, 197, 94, 0.3);
    }
    50% {
      transform: scale(1.02);
      background: rgba(34, 197, 94, 0.15);
      border-color: rgba(34, 197, 94, 0.8);
    }
    100% {
      transform: scale(1);
      background: rgba(34, 197, 94, 0);
      border-color: rgba(34, 197, 94, 0.3);
    }
  }

  @keyframes failureAnimation {
    0% {
      transform: scale(1);
      background: rgba(239, 68, 68, 0);
      border-color: rgba(239, 68, 68, 0.3);
    }
    50% {
      transform: scale(1.02);
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.8);
    }
    100% {
      transform: scale(1);
      background: rgba(239, 68, 68, 0);
      border-color: rgba(239, 68, 68, 0.3);
    }
  }
  
  @keyframes priceUpdatePulse {
    0% {
      color: inherit;
    }
    50% {
      color: #22C55E;
      text-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
    }
    100% {
      color: inherit;
    }
  }
  
  @keyframes priceDownPulse {
    0% {
      color: inherit;
    }
    50% {
      color: #EF4444;
      text-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
    }
    100% {
      color: inherit;
    }
  }
  
  .price-update-up {
    animation: priceUpdatePulse 0.8s ease-in-out;
  }
  
  .price-update-down {
    animation: priceDownPulse 0.8s ease-in-out;
  }
  
  .simple-loader {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 120px;
    width: 100%;
    padding: 1rem;
    position: relative;
  }
  
  .loading-text-container {
    position: relative;
    text-align: center;
    height: 60px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .loading-text {
    font-size: 1rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    position: relative;
    white-space: nowrap;
    min-height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .loading-text::after {
    content: "Analisando mercado financeiro...";
    animation: textCycle 15s linear infinite;
  }
  
  .bars-container {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 30px;
  }

  .bar {
    width: 3px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 1px;
    animation: barMove 1s ease-in-out infinite;
  }

  .bar:nth-child(1) { animation-delay: -0.4s; }
  .bar:nth-child(2) { animation-delay: -0.2s; }
  .bar:nth-child(3) { animation-delay: 0s; }
  .bar:nth-child(4) { animation-delay: -0.6s; }
  .bar:nth-child(5) { animation-delay: -0.8s; }

  .signal-success {
    animation: successAnimation 2s ease-in-out;
  }

  .signal-failure {
    animation: failureAnimation 2s ease-in-out;
  }
`;

interface EnrichedSignal extends TradingSignal {
  qualityScore: number;
  newsAnalysis?: any;
  correlationAnalysis?: any;
  onChainMetrics?: any;
  orderBookAnalysis?: any;
}

const SignalsCard = () => {
  const navigate = useNavigate();
  const [currentPrices, setCurrentPrices] = useState<Record<string, string>>({});
  const [completedSignals, setCompletedSignals] = useState<Set<string>>(new Set());
  const [animatingSignals, setAnimatingSignals] = useState<Record<string, string>>({});
  const [retryCount, setRetryCount] = useState(0);
  
  // Adicionar o estilo de animação ao documento
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = simpleTextLoadingStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  const { data: signals, isLoading, error, refetch } = useQuery<EnrichedSignal[]>({
    queryKey: ['dashboardSignals', retryCount],
    queryFn: async () => {
      try {
        // Buscar sinais diretamente do tradingSignalService
        let allSignals = await tradingSignalService.fetchTradingSignals(retryCount > 0);
        
        if (!allSignals || allSignals.length === 0) {
          console.log('Nenhum sinal encontrado via TradingSignalService, tentando fetchTradingSignals');
          // Tente a implementação alternativa como fallback
          allSignals = await fetchTradingSignals(true);
        }
        
        if (!allSignals || allSignals.length === 0) {
          console.warn('Nenhum sinal encontrado em ambas as fontes');
          return [];
        }
        
        console.log(`${allSignals.length} sinais encontrados`);
        
        // Enriquecer sinais com dados adicionais
        const enrichedSignals: EnrichedSignal[] = await Promise.all(
          allSignals.map(async (signal) => {
            // Calcular uma pontuação de qualidade baseada nas propriedades do sinal
            const qualityScore = calculateTechnicalQuality(signal);
            
            try {
              // Tentar atualizar o preço atual
              const updatedSignal = await tradingSignalService.updateSignalCurrentPrice(signal);
              
              // Retornar sinal enriquecido
              return {
                ...updatedSignal,
                qualityScore,
                // Adicionar dados de análise vazios por enquanto, serão preenchidos assincronamente
                newsAnalysis: {},
                correlationAnalysis: {},
                onChainMetrics: {},
                orderBookAnalysis: {}
              };
            } catch (err) {
              console.error(`Erro ao atualizar preço do sinal ${signal.symbol}:`, err);
              // Retornar sinal enriquecido mesmo se falhar a atualização de preço
              return {
          ...signal,
                qualityScore,
                newsAnalysis: {},
                correlationAnalysis: {},
                onChainMetrics: {},
                orderBookAnalysis: {}
              };
            }
          })
        );
        
        // Ordenar sinais pela qualidade/força
        return enrichedSignals.sort((a, b) => {
          // Ordenar por força e taxa de sucesso
          const strengthOrder = { 'STRONG': 3, 'MODERATE': 2, 'WEAK': 1 };
          const strengthDiff = (strengthOrder[b.strength] || 0) - (strengthOrder[a.strength] || 0);
          
          if (strengthDiff !== 0) return strengthDiff;
          
          // Em caso de empate, ordenar por qualidade
          return b.qualityScore - a.qualityScore;
        });
      } catch (error) {
        console.error('Erro ao buscar e processar sinais:', error);
        return [];
      }
    },
    refetchInterval: 60000, // Atualizar a cada 1 minuto
    staleTime: 30000, // Considerar dados obsoletos após 30 segundos
    retry: 2,
    retryDelay: 1000
  });
  
  // Efeito para tentar novamente se não tivermos sinais
  useEffect(() => {
    if (!isLoading && !error && (!signals || signals.length === 0) && retryCount < 3) {
      console.log('Nenhum sinal carregado, tentando novamente...');
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [signals, isLoading, error, retryCount]);
  
  // Função para atualizar continuamente os preços atuais
  useEffect(() => {
    const updatePrices = async () => {
      try {
        // Verificar se temos sinais
        if (!signals || signals.length === 0) return;
        
        // Obter os símbolos únicos dos sinais
        const symbols = [...new Set(signals.map(signal => signal.symbol))];
        
        // Verificar se todos os símbolos são strings válidas
        if (symbols.some(symbol => typeof symbol !== 'string')) {
          console.error('Símbolos inválidos detectados:', symbols);
          return;
        }
        
        // Buscar preços mais recentes com tratamento de erro
        let prices;
        try {
          prices = await getLatestPrices(symbols);
        } catch (fetchError) {
          console.error('Erro ao buscar preços:', fetchError);
          return; // Não atualizar preços em caso de erro
        }
        
        if (!prices || prices.length === 0) {
          console.warn('Nenhum preço retornado da API');
          return;
        }
        
        // Criar um novo objeto de preços
        const newPrices: Record<string, string> = {};
        
        // Processar cada preço
        prices.forEach(priceData => {
          if (!priceData || !priceData.symbol) return;
          
          const symbol = priceData.symbol;
          const formattedPrice = formatPrice(priceData.price || "0.00", symbol);
          newPrices[symbol] = formattedPrice;
        });
        
        // Atualizar estado com novos preços
        setCurrentPrices(prevPrices => {
          const updatedPrices = { ...prevPrices, ...newPrices };
          
          // Verificar se algum sinal atingiu seu alvo ou stop
          if (signals) {
            signals.forEach(signal => {
              // Ignorar sinais já completados
              if (completedSignals.has(signal.id)) return;
              
              const rawPrice = prices.find(p => p.symbol === signal.symbol)?.price;
              if (rawPrice) {
                const currentPrice = parseFloat(rawPrice);
                checkSignalCompletion(signal, currentPrice);
              }
            });
          }
          
          return updatedPrices;
        });
              } catch (error) {
        console.error("Erro ao atualizar preços:", error);
      }
    };
    
    // Atualizar preços imediatamente e a cada segundo
    updatePrices();
    const interval = setInterval(updatePrices, 1000);
    
    // Limpar intervalo quando componente for desmontado
    return () => clearInterval(interval);
  }, [signals, completedSignals]);
  
  // Verificar se um sinal atingiu seu alvo ou stop loss
  const checkSignalCompletion = (signal: TradingSignal, currentPrice: number) => {
    // Se o preço atual for inválido ou o sinal já estiver completo, retornar
    if (!currentPrice || completedSignals.has(signal.id)) return;
    
    // Verificar se atingiu o alvo para sinais de compra
    if (signal.signal === 'BUY') {
      if (currentPrice >= signal.target_price) {
        // Alvo atingido para sinal de compra
        handleSignalCompletion(signal, 'success', currentPrice);
      } else if (currentPrice <= signal.stop_loss) {
        // Stop loss atingido para sinal de compra
        handleSignalCompletion(signal, 'failure', currentPrice);
      }
    } 
    // Verificar se atingiu o alvo para sinais de venda
    else if (signal.signal === 'SELL') {
      if (currentPrice <= signal.target_price) {
        // Alvo atingido para sinal de venda
        handleSignalCompletion(signal, 'success', currentPrice);
      } else if (currentPrice >= signal.stop_loss) {
        // Stop loss atingido para sinal de venda
        handleSignalCompletion(signal, 'failure', currentPrice);
      }
    }
  };
  
  // Lidar com a conclusão de um sinal
  const handleSignalCompletion = (signal: TradingSignal, result: 'success' | 'failure', exitPrice: number) => {
    // Adicionar à lista de sinais completados
    setCompletedSignals(prev => new Set(prev).add(signal.id));
    
    // Definir classe de animação
    setAnimatingSignals(prev => ({
      ...prev,
      [signal.id]: result === 'success' ? 'signal-success' : 'signal-failure'
    }));
    
    // Atualizar status no banco de dados
    tradingSignalService.updateSignalStatus(
      signal, 
      'CONCLUÍDO', 
      exitPrice
    );
    
    // Notificar através do serviço de notificações
    notificationService.notifySignalCompletion(signal, result === 'success', exitPrice);
  };
  
  // Função para obter o preço atual formatado de um sinal
  const getCurrentPrice = (signal: any): string => {
    // Se temos o preço atual do sinal, retorná-lo formatado
    return currentPrices[signal.symbol] || formatPrice(signal.price.toString(), signal.symbol);
  };
  
  // Função para formatar preço conforme o símbolo
  const formatPrice = (price: string, symbol: string): string => {
    // Converter para número
    const numericPrice = parseFloat(price);
    
    // Formatar baseado no símbolo
    if (symbol.includes('BTC') || symbol.includes('ETH')) {
      // Para Bitcoin e Ethereum, usar mais casas decimais
      return numericPrice >= 1000 
        ? `$${numericPrice.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
        : `$${numericPrice.toFixed(2)}`;
    } else if (numericPrice < 0.1) {
      // Para preços muito baixos, mostrar mais casas decimais
      return `$${numericPrice.toFixed(6)}`;
    } else if (numericPrice < 1) {
      // Para preços baixos
      return `$${numericPrice.toFixed(4)}`;
    } else if (numericPrice < 10) {
      // Para preços médios
      return `$${numericPrice.toFixed(3)}`;
    } else if (numericPrice < 1000) {
      // Para preços altos
      return `$${numericPrice.toFixed(2)}`;
    } else {
      // Para preços muito altos
      return `$${numericPrice.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    }
  };
  
  // Função para obter a cor baseada na força do sinal
  const getStrengthColor = (strength: SignalStrength) => {
    switch (strength) {
      case 'STRONG':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'MODERATE':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'WEAK':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  // Função para obter o texto da força do sinal
  const getStrengthText = (strength: SignalStrength) => {
    switch (strength) {
      case 'STRONG':
        return 'Forte';
      case 'MODERATE':
        return 'Moderado';
      case 'WEAK':
        return 'Fraco';
      default:
        return 'Desconhecido';
    }
  };
  
  // Função para obter a cor baseada no tipo de sinal
  const getTypeColor = (type: SignalType) => {
    switch (type) {
      case 'BUY':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'SELL':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  // Calcula o potencial de lucro do sinal
  const calculatePotential = (signal: TradingSignal) => {
    // Se o sinal estiver concluído, usar preço de saída
    if (signal.status === 'CONCLUÍDO' && signal.exit_price) {
      const potential = signal.signal === 'BUY'
        ? ((signal.exit_price - signal.entry_price) / signal.entry_price) * 100
        : ((signal.entry_price - signal.exit_price) / signal.entry_price) * 100;
      
      return potential.toFixed(2) + '%';
    }
    
    // Caso contrário, calcular baseado no preço alvo
    const potential = signal.signal === 'BUY'
      ? ((signal.target_price - signal.entry_price) / signal.entry_price) * 100
      : ((signal.entry_price - signal.target_price) / signal.entry_price) * 100;
    
    return `${potential.toFixed(2)}%`;
  };
  
  // Calcula a relação risco:retorno (R:R)
  const calculateRiskReward = (signal: TradingSignal) => {
    // Calcular distância até o alvo
    const targetDistance = signal.signal === 'BUY'
      ? signal.target_price - signal.entry_price
      : signal.entry_price - signal.target_price;
    
    // Calcular distância até o stop loss
    const stopDistance = signal.signal === 'BUY'
      ? signal.entry_price - signal.stop_loss
      : signal.stop_loss - signal.entry_price;
    
    // Evitar divisão por zero
    if (stopDistance <= 0) return "1:1";
    
    // Calcular razão e retornar
    const ratio = targetDistance / stopDistance;
    return `${ratio.toFixed(1)}:1`;
  };

  // Calcular a pontuação de qualidade técnica do sinal
  const calculateTechnicalQuality = (signal: any) => {
    // Considerar vários fatores para determinar a qualidade técnica
    const factors = [
      signal.strength === 'STRONG' ? 25 : signal.strength === 'MODERATE' ? 15 : 5,
      signal.success_rate ? signal.success_rate * 100 : 50,
      Math.random() * 10 + 20 // Componente aleatório para evitar sinais idênticos
    ];
    
    // Calcular média ponderada
    const totalWeight = 2 + 3 + 1;
    const weightedSum = (factors[0] * 2) + (factors[1] * 3) + (factors[2] * 1);
    return Math.min(100, Math.round(weightedSum / totalWeight));
  };

  if (isLoading) {
      return (
      <Card className="glass col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle>Sinais de Trading</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm text-muted-foreground">Analisando sinais de trading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle>Sinais de Trading</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Erro ao carregar sinais. Tente novamente mais tarde.</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setRetryCount(prev => prev + 1);
                refetch();
              }}
              className="mt-2"
            >
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!signals || signals.length === 0) {
  return (
      <Card className="glass col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle>Sinais de Trading</CardTitle>
        <Button 
          variant="ghost" 
          className="text-sm text-muted-foreground hover:text-white"
          onClick={() => navigate('/signals')}
        >
          Ver todos
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            <p>Nenhum sinal disponível no momento.</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setRetryCount(prev => prev + 1);
                refetch();
              }}
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
    <Card className="glass col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle>Sinais de Trading</CardTitle>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setRetryCount(prev => prev + 1);
              refetch();
            }}
            title="Atualizar sinais"
            className="h-8 w-8 rounded-full"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            className="text-sm text-muted-foreground hover:text-white"
            onClick={() => navigate('/signals')}
          >
            Ver todos
          </Button>
                          </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {signals.slice(0, 5).map((signal) => (
            <div 
              key={signal.id} 
              className={`border-b border-white/10 pb-4 ${animatingSignals[signal.id] || ''}`}
              onClick={() => navigate(`/signals?signal=${signal.id}`)}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <div className="font-medium text-lg">{signal.symbol}</div>
                  <Badge className={getTypeColor(signal.signal as SignalType)}>
                    {signal.signal === 'BUY' ? 'Compra' : 'Venda'}
                            </Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={getStrengthColor(signal.strength as SignalStrength)}>
                    {getStrengthText(signal.strength as SignalStrength)}
                            </Badge>
                  <div className="text-lg font-semibold">
                    {getCurrentPrice(signal)}
                        </div>
                    </div>
                  </div>
                  
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="flex items-center text-sm space-x-1">
                  <Target className="h-4 w-4 text-green-500" />
                  <span>Alvo: {formatPrice(signal.target_price.toString(), signal.symbol)}</span>
                            </div>
                <div className="flex items-center text-sm space-x-1">
                  <Shield className="h-4 w-4 text-red-500" />
                  <span>Stop: {formatPrice(signal.stop_loss.toString(), signal.symbol)}</span>
                          </div>
                <div className="flex items-center text-sm space-x-1">
                  <TrendingUp className="h-4 w-4 text-cyan-500" />
                  <span>Potencial: {calculatePotential(signal)}</span>
                            </div>
                <div className="flex items-center text-sm space-x-1">
                  <BarChart2 className="h-4 w-4 text-purple-500" />
                  <span>Risco:Recompensa: {calculateRiskReward(signal)}</span>
                          </div>
                  </div>
                  
              <div className="mt-2 flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{signal.elapsed_time || format(new Date(signal.timestamp), "dd/MM HH:mm", { locale: ptBR })}</span>
                    </div>
                <div className="flex items-center space-x-1">
                  <Percent className="h-3 w-3" />
                  <span>Assertividade: {signal.success_rate ? `${(signal.success_rate * 100).toFixed(1)}%` : '80%'}</span>
                    </div>
                  </div>
                    </div>
          ))}
                    </div>
        <Button 
          variant="outline" 
          className="w-full mt-4"
          onClick={() => navigate('/signals')}
        >
          Ver todos os sinais
        </Button>
      </CardContent>
    </Card>
  );
};

export default SignalsCard;


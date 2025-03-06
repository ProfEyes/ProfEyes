import { ArrowDownRight, ArrowUpRight, Target, Shield, TrendingUp, BarChart2, Clock, Percent, RefreshCw, Check, X, LineChart, BarChart, TrendingDown, Activity, AlertTriangle, ChevronUp, ChevronDown, BarChart4, BookOpen, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { TradingSignal, fetchTradingSignals, getLatestPrices, fetchMarketNews, fetchCorrelationData, fetchOnChainMetrics, fetchOrderBookData } from "@/services";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { SignalType, SignalStrength } from "@/services/signals/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { notificationService } from "@/services/notificationService";

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
  
  // Adicionar o estilo de animação ao documento
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = simpleTextLoadingStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  const { data: signals, isLoading, refetch } = useQuery<EnrichedSignal[]>({
    queryKey: ['dashboardSignals'],
    queryFn: async () => {
      // Buscar apenas os sinais inicialmente
      const allSignals = await fetchTradingSignals(true);
      
      // Ordenar sinais por critérios básicos primeiro
      const initialSortedSignals = allSignals
        .sort((a, b) => {
          // Ordenar por força e taxa de sucesso
          const strengthOrder = { 'STRONG': 3, 'MODERATE': 2, 'WEAK': 1 };
          const strengthDiff = strengthOrder[b.strength] - strengthOrder[a.strength];
          
          if (strengthDiff !== 0) return strengthDiff;
          return b.success_rate - a.success_rate;
        })
        .slice(0, 3); // Pegar os 3 melhores sinais

      // Buscar dados adicionais apenas para os 3 sinais selecionados
      const symbols = [...new Set(initialSortedSignals.map(signal => signal.symbol))];
      
      // Buscar dados adicionais em paralelo apenas para os símbolos necessários
      const [marketNews, correlationData, onChainData, orderBookData] = await Promise.all([
        fetchMarketNews(),
        fetchCorrelationData(),
        fetchOnChainMetrics(),
        fetchOrderBookData()
      ].map(promise => promise.catch(error => {
        console.error('Erro ao buscar dados:', error);
        return {};
      })));

      // Enriquecer apenas os sinais selecionados com dados adicionais
      const enrichedSignals = initialSortedSignals.map(signal => {
        const symbol = signal.symbol;
        
        // Calcular pontuação básica (0-100 pontos)
        let score = 0;
        
        // 1. Força do Sinal (0-30 pontos)
        if (signal.strength === SignalStrength.STRONG) score += 30;
        else if (signal.strength === SignalStrength.MODERATE) score += 20;
        else if (signal.strength === SignalStrength.WEAK) score += 10;
        
        // 2. Taxa de Acerto (0-40 pontos)
        score += signal.success_rate * 40;
        
        // 3. Tipo de Análise (0-30 pontos)
        if (signal.type === SignalType.TECHNICAL) score += 30;
        else if (signal.type === SignalType.FUNDAMENTAL) score += 25;
        else if (signal.type === SignalType.NEWS) score += 20;

        // Adicionar dados complementares se disponíveis
        const enrichedSignal: EnrichedSignal = {
          ...signal,
          qualityScore: score,
          newsAnalysis: marketNews[symbol],
          correlationAnalysis: correlationData[symbol],
          onChainMetrics: onChainData[symbol],
          orderBookAnalysis: orderBookData[symbol]
        };

        // Gerar razão do sinal de forma otimizada
        enrichedSignal.reason = generateEnhancedSignalReason(enrichedSignal);

        return enrichedSignal;
      });

      return enrichedSignals;
    },
    gcTime: 60000, // Tempo de garbage collection
    staleTime: Infinity, // Nunca considerar os dados desatualizados automaticamente
    refetchOnWindowFocus: false, // Não atualizar quando a janela ganhar foco
    refetchOnMount: false, // Não atualizar quando o componente for montado novamente
    refetchOnReconnect: false // Não atualizar quando a conexão for restabelecida
  });

  // Função para gerar explicação mais detalhada do sinal
  const generateEnhancedSignalReason = (signal: any) => {
    const reasons = [];
    
    // Análise básica
    if (signal.strength === SignalStrength.STRONG) {
      reasons.push('Força do sinal alta');
    }
    
    if (signal.success_rate >= 0.85) {
      reasons.push(`Taxa de acerto ${(signal.success_rate * 100).toFixed(0)}%`);
    }
    
    // Análise técnica
    if (signal.type === SignalType.TECHNICAL) {
      reasons.push('Confirmação técnica');
    }
    
    // Dados complementares (se disponíveis)
    if (signal.correlationAnalysis?.sectorStrength > 0.7) {
      reasons.push('Alinhamento setorial');
    }
    
    if (signal.onChainMetrics?.whaleActivity === 'accumulating') {
      reasons.push('Acumulação institucional');
    }
    
    if (signal.orderBookAnalysis?.imbalance > 0.7) {
      reasons.push('Desequilíbrio no book');
    }
    
    // Limitar a 3 razões principais para manter a interface limpa
    return reasons.slice(0, 3).join(' • ');
  };

  // Função para verificar se o sinal atingiu alvo ou stop
  const checkSignalCompletion = (signal: TradingSignal, currentPrice: number) => {
    if (!signal.id || completedSignals.has(signal.id)) return null;

    const price = currentPrice;
    
    if (signal.signal === "BUY") {
      if (price >= signal.target_price) {
        return "success";
      } else if (price <= signal.stop_loss) {
        return "failure";
      }
    } else {
      if (price <= signal.target_price) {
        return "success";
      } else if (price >= signal.stop_loss) {
        return "failure";
      }
    }
    
    return null;
  };

  // Efeito para monitorar preços e verificar conclusão dos sinais
  useEffect(() => {
    if (!signals || signals.length === 0) return;
    
    const symbols = [...new Set(signals.map(signal => signal.symbol))];
    if (symbols.length === 0) return;
    
    // Função para atualizar preços - otimizada para máxima performance
    const updatePrices = async () => {
      try {
        // Buscar preços mais recentes da API
        const prices = await getLatestPrices(symbols);
        
        // Criar mapa de preços diretamente sem processamento adicional
        const priceMap: Record<string, string> = {};
        prices.forEach(price => {
          priceMap[price.symbol] = price.price;
        });
        
        // Atualizar estado de preços
        setCurrentPrices(priceMap);
        
        // Verificar cada sinal para conclusão
        for (const signal of signals) {
          // Pular sinais já completados
          if (signal.id && completedSignals.has(signal.id)) continue;
          
          const currentPrice = parseFloat(priceMap[signal.symbol]);
          if (!currentPrice) continue;
          
          const completion = checkSignalCompletion(signal, currentPrice);
          if (completion && signal.id) {
            // Iniciar animação
            setAnimatingSignals(prev => ({ ...prev, [signal.id!]: completion }));
            
            // Após a animação, processar a conclusão do sinal
            setTimeout(async () => {
              setCompletedSignals(prev => new Set([...prev, signal.id!]));
              setAnimatingSignals(prev => {
                const newState = { ...prev };
                delete newState[signal.id!];
                return newState;
              });
              
              // Notificar sobre o resultado do sinal
              if (completion === 'success') {
                notificationService.notifySignalSuccess(signal);
              }
              
              try {
                // Aguardar análise completa antes de buscar novo sinal
                await new Promise(resolve => setTimeout(resolve, 2000)); // Tempo para processamento
                
                // Forçar nova análise completa para substituir o sinal
                await refetch();
              } catch (error) {
                console.error('Erro ao buscar novo sinal:', error);
              }
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar sinais:', error);
      }
    };
    
    // Iniciar atualização imediata
    updatePrices();
    
    // Verificar a cada 50ms (0.05 segundos) para atualização de preços
    // Esta é uma taxa de atualização extremamente alta para dados em tempo real
    const interval = setInterval(updatePrices, 50);
    return () => clearInterval(interval);
  }, [signals, completedSignals]);
  
  // Função para obter o preço atual - otimizada para performance
  const getCurrentPrice = (signal: any): string => {
    const symbol = signal.symbol || signal.pair || '';
    // Usar o preço atual do estado ou fallback para o preço do sinal
    const price = currentPrices[symbol] || signal.price?.toString() || 'N/A';
    
    // Formatar o preço com a função otimizada
    return formatPrice(price, symbol);
  };
  
  // Função para formatar preço com casas decimais adequadas - otimizada
  const formatPrice = (price: string, symbol: string): string => {
    if (price === "N/A") return price;
    
    try {
      const numValue = parseFloat(price);
      
      // Cache de formatação para evitar recálculos desnecessários
      const cacheKey = `${price}-${symbol}`;
      const cachedValue = (window as any).priceFormatCache?.[cacheKey];
      if (cachedValue) return cachedValue;
      
      // Determinar número de casas decimais baseado no ativo
      let numDecimals = 2;
      
      // Criptomoedas com valores menores que 1 precisam de mais precisão
      if (symbol.includes("USD")) {
        numDecimals = numValue < 1 ? 4 : 2;
      } else if (symbol.includes("BTC") || symbol.includes("ETH")) {
        numDecimals = 6; // Pares de trading com BTC/ETH precisam de mais precisão
      }
      
      // Formatar o valor com as casas decimais apropriadas
      const formattedValue = numValue.toFixed(numDecimals);
      
      // Adicionar símbolo $ para preços em USD
      const result = symbol.includes("USD") ? `$${formattedValue}` : formattedValue;
      
      // Armazenar em cache para uso futuro
      if (!(window as any).priceFormatCache) {
        (window as any).priceFormatCache = {};
      }
      (window as any).priceFormatCache[cacheKey] = result;
      
      return result;
    } catch (e) {
      // Em caso de erro, retornar o preço original
      console.error("Erro ao formatar preço:", e);
      return price;
    }
  };

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

  // Calcular o potencial de lucro/perda
  const calculatePotential = (signal: TradingSignal) => {
    if (!signal.entry_price || !signal.target_price) return null;
    
    const entry = signal.entry_price;
    const target = signal.target_price;
    
    if (signal.signal === "BUY") {
      return ((target - entry) / entry) * 100;
    } else {
      return ((entry - target) / entry) * 100;
    }
  };
  
  // Calcular a relação risco/recompensa
  const calculateRiskReward = (signal: TradingSignal) => {
    if (!signal.entry_price || !signal.target_price || !signal.stop_loss) return null;
    
    const entry = signal.entry_price;
    const target = signal.target_price;
    const stop = signal.stop_loss;
    
    if (signal.signal === "BUY") {
      const reward = target - entry;
      const risk = entry - stop;
      return reward / risk;
    } else {
      const reward = entry - target;
      const risk = stop - entry;
      return reward / risk;
    }
  };

  // Monitorar mudanças nos sinais
  useEffect(() => {
    if (!signals) return;

    signals.forEach(signal => {
      // Verificar sinais de alta probabilidade
      if (signal.success_rate >= 0.85) {
        notificationService.notifyHighProbabilitySignal(signal);
      }

      // Verificar sinais concluídos com sucesso
      if (signal.status === 'CONCLUÍDO') {
        notificationService.notifySignalSuccess(signal);
      }

      // Notificar sobre novos sinais
      if (signal.status === 'ATIVO' && !signal.notified) {
        notificationService.notifyNewSignal(signal);
        // Marcar como notificado para evitar duplicatas
        signal.notified = true;
      }
    });
  }, [signals]);

  // Funções auxiliares para análise avançada
  const calculateAdvancedTA = (signal: TradingSignal) => {
    const result = {
      divergences: false,
      harmonicPatterns: false,
      marketCycles: false,
      impliedVolatility: false
    };
    
    // Verificar divergências em múltiplos timeframes
    if (signal.indicators) {
      const { rsi, macd, momentum } = signal.indicators;
      result.divergences = checkDivergences(signal.price_data, { rsi, macd, momentum });
    }
    
    // Identificar padrões harmônicos
    if (signal.price_data) {
      result.harmonicPatterns = findHarmonicPatterns(signal.price_data);
    }
    
    // Analisar ciclos de mercado
    if (signal.market_data) {
      result.marketCycles = analyzeCycles(signal.market_data);
    }
    
    // Avaliar volatilidade implícita
    if (signal.volatility_data) {
      result.impliedVolatility = isVolatilityFavorable(signal.volatility_data, signal.signal);
    }
    
    return result;
  };

  // Análise de níveis críticos de preço
  const analyzePriceLevels = (signal: TradingSignal) => {
    const result = {
      keyLevelProximity: false,
      gapAnalysis: false,
      psychologicalLevels: false
    };
    
    if (signal.price_data && signal.support_resistance) {
      // Verificar proximidade com níveis importantes
      result.keyLevelProximity = checkKeyLevels(
        signal.price_data.current,
        signal.support_resistance
      );
      
      // Analisar gaps de preço
      result.gapAnalysis = analyzeGaps(signal.price_data.history);
      
      // Verificar níveis psicológicos
      result.psychologicalLevels = checkPsychologicalLevels(
        signal.price_data.current,
        signal.signal
      );
    }
    
    return result;
  };

  // Funções de prioridade para ordenação
  const getMultiSourceConfirmation = (signal: any) => {
    let confirmations = 0;
    
    // Contagem de confirmações técnicas
    if (signal.technical_indicators) {
      const confirmedCount = signal.technical_indicators.filter(i => i.confirms_signal).length;
      confirmations += confirmedCount / signal.technical_indicators.length;
    }
    
    // Confirmação por correlações
    if (signal.correlationAnalysis?.sectorStrength > 0.7) confirmations++;
    if (signal.correlationAnalysis?.indexAlignment > 0.7) confirmations++;
    
    // Confirmação por dados on-chain
    if (signal.onChainMetrics?.whaleActivity === 'accumulating') confirmations++;
    if (signal.onChainMetrics?.exchangeFlow === 'outflow') confirmations++;
    
    // Confirmação por order book
    if (signal.orderBookAnalysis?.imbalance > 0.7) confirmations++;
    
    return confirmations;
  };

  const getMacroAlignment = (signal: any) => {
    let alignment = 0;
    
    // Alinhamento com tendência macro
    if (signal.market_data?.trend_alignment > 0.7) alignment++;
    
    // Alinhamento com ciclo de mercado
    if (signal.advancedTechnicals?.marketCycles) alignment++;
    
    // Alinhamento com fluxos institucionais
    if (signal.institutional_data?.flow_alignment > 0.7) alignment++;
    
    return alignment;
  };

  const getTechnicalQuality = (signal: any) => {
    let quality = 0;
    
    // Qualidade dos níveis técnicos
    if (signal.criticalLevels?.keyLevelProximity) quality++;
    if (signal.criticalLevels?.psychologicalLevels) quality++;
    
    // Padrões técnicos avançados
    if (signal.advancedTechnicals?.harmonicPatterns) quality++;
    if (signal.advancedTechnicals?.divergences) quality++;
    
    return quality;
  };

  const getMarketMomentum = (signal: any) => {
    let momentum = 0;
    
    // Força do momentum atual
    if (signal.momentum_indicators?.strength > 0.7) momentum++;
    
    // Volatilidade favorável
    if (signal.advancedTechnicals?.impliedVolatility) momentum++;
    
    // Pressão do order book
    if (signal.orderBookAnalysis?.pressure === signal.signal) momentum++;
    
    return momentum;
  };

  // Funções de análise técnica avançada
  const checkDivergences = (priceData: any, indicators: any) => {
    if (!priceData?.history || !indicators) return false;
    
    const { rsi, macd, momentum } = indicators;
    const prices = priceData.history;
    let divergencesFound = 0;
    
    // Verificar divergência no RSI
    if (rsi?.values) {
      const rsiDivergence = checkIndicatorDivergence(prices, rsi.values);
      if (rsiDivergence) divergencesFound++;
    }
    
    // Verificar divergência no MACD
    if (macd?.histogram) {
      const macdDivergence = checkIndicatorDivergence(prices, macd.histogram);
      if (macdDivergence) divergencesFound++;
    }
    
    // Verificar divergência no Momentum
    if (momentum?.values) {
      const momentumDivergence = checkIndicatorDivergence(prices, momentum.values);
      if (momentumDivergence) divergencesFound++;
    }
    
    // Retorna true se encontrou pelo menos 2 divergências
    return divergencesFound >= 2;
  };

  const checkIndicatorDivergence = (prices: number[], indicator: number[]) => {
    if (prices.length < 10 || indicator.length < 10) return false;
    
    const priceHighs = findLocalExtremes(prices, 'high');
    const priceLows = findLocalExtremes(prices, 'low');
    const indicatorHighs = findLocalExtremes(indicator, 'high');
    const indicatorLows = findLocalExtremes(indicator, 'low');
    
    // Verificar divergência de alta (preço fazendo mínimas mais baixas, indicador fazendo mínimas mais altas)
    const bullishDivergence = checkExtremeDivergence(priceLows, indicatorLows, 'bullish');
    
    // Verificar divergência de baixa (preço fazendo máximas mais altas, indicador fazendo máximas mais baixas)
    const bearishDivergence = checkExtremeDivergence(priceHighs, indicatorHighs, 'bearish');
    
    return bullishDivergence || bearishDivergence;
  };

  const findLocalExtremes = (data: number[], type: 'high' | 'low') => {
    const result = [];
    const comparison = type === 'high' ? 
      (a: number, b: number) => a > b :
      (a: number, b: number) => a < b;
    
    for (let i = 1; i < data.length - 1; i++) {
      if (comparison(data[i], data[i-1]) && comparison(data[i], data[i+1])) {
        result.push({ value: data[i], index: i });
      }
    }
    
    return result;
  };

  const checkExtremeDivergence = (
    priceExtremes: Array<{value: number, index: number}>,
    indicatorExtremes: Array<{value: number, index: number}>,
    type: 'bullish' | 'bearish'
  ) => {
    if (priceExtremes.length < 2 || indicatorExtremes.length < 2) return false;
    
    const last2PriceExtremes = priceExtremes.slice(-2);
    const last2IndicatorExtremes = indicatorExtremes.slice(-2);
    
    if (type === 'bullish') {
      return (
        last2PriceExtremes[1].value < last2PriceExtremes[0].value &&
          last2IndicatorExtremes[1].value > last2IndicatorExtremes[0].value
      );
    } else {
      return (
        last2PriceExtremes[1].value > last2PriceExtremes[0].value &&
          last2IndicatorExtremes[1].value < last2IndicatorExtremes[0].value
      );
    }
  };

  const findHarmonicPatterns = (priceData: any) => {
    if (!priceData?.history) return false;
    
    const prices = priceData.history;
    const patterns = [
      checkGartleyPattern,
      checkButterflyPattern,
      checkBatPattern,
      checkCrabPattern,
      checkSharkPattern
    ];
    
    // Retorna true se encontrar qualquer padrão harmônico
    return patterns.some(pattern => pattern(prices));
  };

  const analyzeCycles = (marketData: any) => {
    if (!marketData?.cycle_data) return false;
    
    const { 
      current_phase,
      cycle_position,
      momentum_alignment,
      historical_accuracy
    } = marketData.cycle_data;
    
    // Verificar se estamos em uma fase favorável do ciclo
    const favorablePhase = ['acumulação', 'markup'].includes(current_phase);
    
    // Verificar se a posição no ciclo está alinhada
    const goodPosition = cycle_position > 0.7;
    
    // Verificar alinhamento do momentum
    const goodMomentum = momentum_alignment > 0.7;
    
    // Verificar precisão histórica do ciclo
    const reliableHistory = historical_accuracy > 0.8;
    
    // Retorna true se a maioria dos fatores está favorável
    return [favorablePhase, goodPosition, goodMomentum, reliableHistory]
      .filter(Boolean).length >= 3;
  };

  const isVolatilityFavorable = (volatilityData: any, signalType: string) => {
    if (!volatilityData) return false;
    
    const {
      implied_volatility,
      historical_volatility,
      volatility_skew,
      term_structure
    } = volatilityData;
    
    // Verificar se IV está em nível favorável
    const ivFavorable = implied_volatility < historical_volatility * 1.2;
    
    // Verificar skew da volatilidade
    const skewFavorable = signalType === "BUY" ? 
      volatility_skew < -0.1 : // Skew negativo favorável para compra
      volatility_skew > 0.1;   // Skew positivo favorável para venda
    
    // Verificar estrutura a termo
    const termStructureFavorable = term_structure === "contango" && signalType === "BUY" ||
                                  term_structure === "backwardation" && signalType === "SELL";
    
    // Retorna true se a maioria dos fatores está favorável
    return [ivFavorable, skewFavorable, termStructureFavorable]
      .filter(Boolean).length >= 2;
  };

  const checkKeyLevels = (currentPrice: number, supportResistance: any) => {
    if (!supportResistance?.levels) return false;
    
    const { supports, resistances } = supportResistance.levels;
    const proximityThreshold = 0.02; // 2% de proximidade
    
    // Verificar proximidade com suportes
    const nearSupport = supports.some(level => 
      Math.abs(currentPrice - level) / level < proximityThreshold
    );
    
    // Verificar proximidade com resistências
    const nearResistance = resistances.some(level => 
      Math.abs(currentPrice - level) / level < proximityThreshold
    );
    
    return nearSupport || nearResistance;
  };

  const analyzeGaps = (priceHistory: number[]) => {
    if (!priceHistory || priceHistory.length < 20) return false;
    
    const significantGapThreshold = 0.02; // 2% para gap significativo
    let hasSignificantGap = false;
    
    for (let i = 1; i < priceHistory.length; i++) {
      const gap = Math.abs(priceHistory[i] - priceHistory[i-1]) / priceHistory[i-1];
      if (gap > significantGapThreshold) {
        hasSignificantGap = true;
        break;
      }
    }
    
    return hasSignificantGap;
  };

  const checkPsychologicalLevels = (currentPrice: number, signalType: string) => {
    // Níveis psicológicos comuns (números redondos, fibonacci, etc)
    const psychologicalLevels = [
      ...generateRoundNumbers(currentPrice),
      ...generateFibonacciLevels(currentPrice)
    ];
    
    const proximityThreshold = 0.01; // 1% de proximidade
    
    return psychologicalLevels.some(level => 
      Math.abs(currentPrice - level) / level < proximityThreshold
    );
  };

  const generateRoundNumbers = (price: number) => {
    const magnitude = Math.floor(Math.log10(price));
    const base = Math.pow(10, magnitude);
    
    return [
      Math.floor(price / base) * base,     // Nível inferior
      Math.ceil(price / base) * base,      // Nível superior
      Math.round(price / base) * base,     // Nível mais próximo
      Math.round(price / (base/2)) * (base/2) // Meio nível
    ];
  };

  const generateFibonacciLevels = (price: number) => {
    const fibRatios = [0.236, 0.382, 0.5, 0.618, 0.786];
    const range = price * 0.1; // 10% do preço atual
    
    return fibRatios.flatMap(ratio => [
      price + (range * ratio),
      price - (range * ratio)
    ]);
  };

  // Funções para análise de padrões harmônicos
  const checkGartleyPattern = (prices: number[]) => {
    const swings = findPriceSwings(prices);
    if (swings.length < 5) return false;
    
    const [X, A, B, C, D] = swings.slice(-5);
    
    // Ratios do padrão Gartley
    const XAB = Math.abs((B - A) / (A - X));
    const ABC = Math.abs((C - B) / (B - A));
    const BCD = Math.abs((D - C) / (C - B));
    const XAD = Math.abs((D - A) / (A - X));
    
    return (
      isWithinRange(XAB, 0.618, 0.02) &&
      isWithinRange(ABC, 0.382, 0.02) &&
      isWithinRange(BCD, 0.786, 0.02) &&
      isWithinRange(XAD, 0.786, 0.02)
    );
  };

  const checkButterflyPattern = (prices: number[]) => {
    const swings = findPriceSwings(prices);
    if (swings.length < 5) return false;
    
    const [X, A, B, C, D] = swings.slice(-5);
    
    // Ratios do padrão Butterfly
    const XAB = Math.abs((B - A) / (A - X));
    const ABC = Math.abs((C - B) / (B - A));
    const BCD = Math.abs((D - C) / (C - B));
    const XAD = Math.abs((D - A) / (A - X));
    
    return (
      isWithinRange(XAB, 0.786, 0.02) &&
      isWithinRange(ABC, 0.382, 0.02) &&
      isWithinRange(BCD, 1.618, 0.03) &&
      isWithinRange(XAD, 1.27, 0.03)
    );
  };

  const checkBatPattern = (prices: number[]) => {
    const swings = findPriceSwings(prices);
    if (swings.length < 5) return false;
    
    const [X, A, B, C, D] = swings.slice(-5);
    
    // Ratios do padrão Bat
    const XAB = Math.abs((B - A) / (A - X));
    const ABC = Math.abs((C - B) / (B - A));
    const BCD = Math.abs((D - C) / (C - B));
    const XAD = Math.abs((D - A) / (A - X));
    
    return (
      isWithinRange(XAB, 0.382, 0.02) &&
      isWithinRange(ABC, 0.382, 0.02) &&
      isWithinRange(BCD, 1.618, 0.03) &&
      isWithinRange(XAD, 0.886, 0.02)
    );
  };

  const checkCrabPattern = (prices: number[]) => {
    const swings = findPriceSwings(prices);
    if (swings.length < 5) return false;
    
    const [X, A, B, C, D] = swings.slice(-5);
    
    // Ratios do padrão Crab
    const XAB = Math.abs((B - A) / (A - X));
    const ABC = Math.abs((C - B) / (B - A));
    const BCD = Math.abs((D - C) / (C - B));
    const XAD = Math.abs((D - A) / (A - X));
    
    return (
      isWithinRange(XAB, 0.382, 0.02) &&
      isWithinRange(ABC, 0.886, 0.02) &&
      isWithinRange(BCD, 2.618, 0.03) &&
      isWithinRange(XAD, 1.618, 0.03)
    );
  };

  const checkSharkPattern = (prices: number[]) => {
    const swings = findPriceSwings(prices);
    if (swings.length < 5) return false;
    
    const [X, A, B, C, D] = swings.slice(-5);
    
    // Ratios do padrão Shark
    const XAB = Math.abs((B - A) / (A - X));
    const ABC = Math.abs((C - B) / (B - A));
    const BCD = Math.abs((D - C) / (C - B));
    const XAD = Math.abs((D - A) / (A - X));
    
    return (
      isWithinRange(XAB, 0.446, 0.02) &&
      isWithinRange(ABC, 1.618, 0.03) &&
      isWithinRange(BCD, 1.13, 0.02) &&
      isWithinRange(XAD, 0.886, 0.02)
    );
  };

  const findPriceSwings = (prices: number[]) => {
    if (prices.length < 10) return [];
    
    const swings: number[] = [];
    let isHighSwing = true;
    
    for (let i = 2; i < prices.length - 2; i++) {
      const current = prices[i];
      const prev2 = prices[i-2];
      const prev1 = prices[i-1];
      const next1 = prices[i+1];
      const next2 = prices[i+2];
      
      if (isHighSwing) {
        // Procurando por swing high
        if (current > prev2 && current > prev1 && current > next1 && current > next2) {
          swings.push(current);
          isHighSwing = false;
        }
      } else {
        // Procurando por swing low
        if (current < prev2 && current < prev1 && current < next1 && current < next2) {
          swings.push(current);
          isHighSwing = true;
        }
      }
    }
    
    return swings;
  };

  const isWithinRange = (value: number, target: number, tolerance: number) => {
    return Math.abs(value - target) <= tolerance;
  };

  return (
    <Card className="col-span-2 glass">
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
          {isLoading ? (
            <div className="simple-loader">
              <style>{simpleTextLoadingStyles}</style>
              <div className="loading-text-container">
                <div className="loading-text"></div>
              </div>
              <div className="bars-container">
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
              </div>
            </div>
          ) : signals && signals.length > 0 ? (
            signals.map((signal, index) => {
              const potential = calculatePotential(signal);
              const riskReward = calculateRiskReward(signal);
              const currentPrice = getCurrentPrice(signal);
              const symbol = signal.symbol || signal.pair || '';
              const isAnimating = animatingSignals[signal.id];
              
              return (
                <div 
                  key={signal.id || `signal-${index}`} 
                  className={`flex flex-col p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors ${
                    isAnimating ? `signal-${isAnimating}` : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={signal.signal === "BUY" ? "bg-market-up/10 p-2 rounded-full" : "bg-market-down/10 p-2 rounded-full"}>
                        {signal.signal === "BUY" ? (
                          <ArrowUpRight className="h-5 w-5 text-market-up" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-market-down" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-lg">{symbol}</p>
                          <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${getTypeColor(signal.type)}`}>
                            {signal.type}
                          </span>
                            <span 
                              className="text-xs bg-white/10 px-2 py-1 rounded-full font-medium text-white"
                              style={{ 
                                fontVariantNumeric: 'tabular-nums',
                                letterSpacing: '0.01em'
                              }}
                            >
                              {currentPrice}
                            </span>
                          </div>
                          
                          {/* Status do sinal */}
                          {signal.status && (
                            <Badge 
                              variant="outline" 
                              className={`ml-1 ${
                                signal.status === 'active' || signal.status === 'ATIVO' 
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-600/30' 
                                  : signal.status === 'completed' || signal.status === 'CONCLUÍDO'
                                  ? 'bg-green-500/20 text-green-300 border-green-600/30'
                                  : signal.status === 'cancelled' || signal.status === 'CANCELADO'
                                  ? 'bg-red-500/20 text-red-300 border-red-600/30'
                                  : 'bg-gray-500/20 text-gray-300 border-gray-600/30'
                              }`}
                            >
                              {signal.status === 'active' || signal.status === 'ATIVO' ? (
                                <span className="flex items-center text-xs">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1 animate-pulse"></div>
                                  Ativo
                                </span>
                              ) : signal.status === 'completed' || signal.status === 'CONCLUÍDO' ? (
                                <span className="flex items-center text-xs">
                                  <Check className="h-3 w-3 mr-0.5" />
                                  Alvo atingido
                                </span>
                              ) : signal.status === 'cancelled' || signal.status === 'CANCELADO' ? (
                                <span className="flex items-center text-xs">
                                  <X className="h-3 w-3 mr-0.5" />
                                  Stop atingido
                                </span>
                              ) : (
                                signal.status
                              )}
                            </Badge>
                          )}
                          
                          {/* Indicador de sinal substituído */}
                          {signal.replacement_id && (
                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-600/30">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              <span className="text-xs">Substituído</span>
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm ${signal.signal === "BUY" ? "text-market-up" : "text-market-down"}`}>
                          {signal.signal === "BUY" ? "COMPRA" : "VENDA"} • <span className={getStrengthColor(signal.strength)}>
                            {getStrengthText(signal.strength)}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {format(new Date(signal.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-xs">
                        <Percent className="h-3 w-3 inline mr-1" />
                        Precisão: <span className={`font-medium ${signal.success_rate >= 0.95 ? 'text-green-400' : 'text-blue-400'}`}>
                          {(signal.success_rate * 100).toFixed(1)}%
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center p-2 rounded-md bg-white/5 border border-white/10">
                            <div className="flex items-center text-xs text-muted-foreground mb-1">
                              <TrendingUp className="h-3 w-3 mr-1" /> Entrada
                            </div>
                            <p className="font-medium">${signal.entry_price?.toFixed(2) || signal.price?.toFixed(2)}</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Preço de entrada recomendado</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center p-2 rounded-md bg-white/5 border border-white/10">
                            <div className="flex items-center text-xs text-market-up mb-1">
                              <Target className="h-3 w-3 mr-1" /> Alvo
                            </div>
                            <p className="font-medium">${signal.target_price?.toFixed(2)}</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Preço alvo para lucro</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center p-2 rounded-md bg-white/5 border border-white/10">
                            <div className="flex items-center text-xs text-market-down mb-1">
                              <Shield className="h-3 w-3 mr-1" /> Stop
                            </div>
                            <p className="font-medium">${signal.stop_loss?.toFixed(2)}</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Stop loss recomendado</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                    <div>
                      <BarChart2 className="h-3 w-3 inline mr-1" />
                      Timeframe: <span className="font-medium">{signal.timeframe || "1d"}</span>
                    </div>
                    <div>
                      {riskReward && (
                        <span>
                          R/R: <span className="font-medium">{riskReward.toFixed(2)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {signal.reason && (
                    <div className="mt-2 text-xs text-muted-foreground border-t border-white/10 pt-2">
                      <p>{signal.reason}</p>
                    </div>
                  )}
                  
                  {/* Adicionar indicador de conclusão */}
                  {completedSignals.has(signal.id) && (
                    <div className="absolute top-0 right-0 m-2">
                      {isAnimating === 'success' ? (
                        <Check className="h-5 w-5 text-green-400" />
                      ) : (
                        <X className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center p-4">
              <span className="text-sm text-muted-foreground">Nenhum sinal disponível no momento</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalsCard;


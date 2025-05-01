import Layout from "@/components/Layout";
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  Target, 
  TrendingUp, 
  BarChart3, 
  ListFilter,
  RefreshCw, 
  ChevronDown,
  ChevronRight,
  CheckCheck,
  Timer,
  Clock4,
  ExternalLink,
  Filter,
  Zap,
  Sparkles,
  Briefcase
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TradingSignal, fetchTradingSignals, getLatestPrices } from "@/services";
import { format, formatDistanceToNow, addMinutes, isAfter, addDays, startOfDay, parse, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { SignalStrength as SignalStrengthEnum, SignalType } from "@/services/types";
import { tradingSignalService } from "@/services/TradingSignalService";
import { motion, AnimatePresence } from "framer-motion";
import { TimeZoneSelector } from "@/components/dashboard/TimeZoneSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTimeZone } from "@/contexts/TimeZoneContext";

// Constantes para controle dos tempos dos sinais
const SIGNAL_EXPIRY_TIME = 5; // Tempo de expiração em minutos (sempre 5 minutos)
const TIME_BETWEEN_SIGNALS = 10; // Tempo entre sinais (10 minutos após o horário de Reentrada 2)
const FIRST_SIGNAL_TIME = "00:03"; // Horário do primeiro sinal do dia
const WIN_LOSS_RATIO = 10; // Proporção de 10 ganhos para 1 perda

// Lista de ativos disponíveis com suas categorias
const ATIVOS_CATEGORIAS: Record<string, string> = {
  // Ativos Digital
  "Gold/Silver (OTC)": "Digital",
  "ETH/USD (OTC)": "Digital",
  "EUR/JPY (OTC)": "Digital",
  "AIG (OTC)": "Digital",
  "BTC/USD (OTC)": "Digital",
  "1000Sats (OTC)": "Digital",
  "AUD/CAD (OTC)": "Digital"
};

// Objeto para uso mais fácil no código
const SignalStrength = {
  STRONG: 'STRONG' as SignalStrengthEnum,
  MODERATE: 'MODERATE' as SignalStrengthEnum,
  WEAK: 'WEAK' as SignalStrengthEnum
};

// Estilos para as animações
const styles = `
  @keyframes pulse {
    0%, 100% { opacity: 0.6; transform: scale(0.98); }
    50% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 8px rgba(255, 255, 255, 0.05); }
    50% { box-shadow: 0 0 18px rgba(255, 255, 255, 0.12); }
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
  
  @keyframes slowFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  
  @keyframes subtleBreathing {
    0%, 100% { opacity: 0.85; }
    50% { opacity: 1; }
  }
  
  /* Remover animações para sinais completados */
  .signal-completed-win {
    background-color: rgba(34, 197, 94, 0.15) !important;
    border: 1px solid rgba(34, 197, 94, 0.3) !important;
    position: relative;
    overflow: hidden;
    z-index: 1;
  }
  
  .signal-completed-win::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(to bottom, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.05));
    z-index: -1;
  }
  
  .signal-completed-loss {
    background-color: rgba(220, 38, 38, 0.25) !important;
    border: 1px solid rgba(220, 38, 38, 0.4) !important;
    position: relative;
    overflow: hidden;
    z-index: 1;
  }
  
  .signal-completed-loss::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(to bottom, rgba(220, 38, 38, 0.3), rgba(220, 38, 38, 0.1));
    z-index: -1;
  }
  
  .gradient-text {
    background: linear-gradient(90deg, #ffffff, #e8e8e8, #ffffff);
    background-size: 200% auto;
    color: transparent;
    background-clip: text;
    -webkit-background-clip: text;
    animation: gradientShift 3s ease infinite;
  }

  @keyframes goldenShimmer {
    0% { background-position: -100% 0; opacity: 0.7; }
    50% { opacity: 1; }
    100% { background-position: 200% 0; opacity: 0.7; }
  }
  
  .golden-button {
    position: relative;
    overflow: hidden;
  }
  
  .golden-button::after {
    content: '';
    position: absolute;
    top: -100%;
    left: -100%;
    width: 300%;
    height: 300%;
    background: linear-gradient(
      60deg,
      rgba(255, 215, 0, 0) 0%,
      rgba(255, 215, 0, 0) 30%,
      rgba(255, 215, 0, 0.15) 45%,
      rgba(255, 215, 0, 0.2) 50%,
      rgba(255, 215, 0, 0.15) 55%,
      rgba(255, 215, 0, 0) 70%,
      rgba(255, 215, 0, 0) 100%
    );
    transform: rotate(25deg);
    animation: goldenShimmer 8s ease-in-out infinite;
    z-index: 1;
    pointer-events: none;
  }
  
  .golden-shadow {
    box-shadow: 0 5px 15px rgba(212, 175, 55, 0.2);
    transition: all 0.4s ease;
  }
  
  .golden-shadow:hover {
    box-shadow: 0 5px 20px rgba(212, 175, 55, 0.3), 0 0 5px rgba(255, 215, 0, 0.25);
    transform: translateY(-1px);
  }

  .signal-badge {
    position: relative;
    overflow: hidden;
  }
  
  .signal-badge::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%);
    transform: translateX(-100%);
    animation: shine 3s infinite;
  }
  
  @keyframes shine {
    100% {
      transform: translateX(100%);
    }
  }
  
  .glow-hover {
    transition: all 0.5s ease;
    backdrop-filter: blur(8px);
  }
  
  .glow-hover:hover {
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.08);
    transform: translateY(-3px) scale(1.02);
    backdrop-filter: blur(12px);
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5rem 2rem;
    background: rgba(15, 15, 25, 0.4);
    border-radius: 1rem;
    backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.07);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    animation: glowPulse 3s ease-in-out infinite;
  }
  
  /* Classes específicas para a página de sinais */
  .signals-page-light-accent {
    position: absolute;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 70%);
    animation: subtleBreathing 4s infinite ease-in-out;
    z-index: 0;
  }
  
  .signals-page-color-accent {
    position: absolute;
    width: 350px;
    height: 350px;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.07;
    z-index: 0;
    animation: subtleBreathing 7s infinite ease-in-out alternate;
  }
  
  .floating-element {
    animation: slowFloat 5s ease-in-out infinite;
  }
  
  /* Classe específica para os cartões da página de sinais */
  .signals-page-card-glass {
    background: rgba(10, 10, 15, 0.35);
    backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.01);
    transition: all 0.3s ease;
  }
  
  .signals-page-card-glass:hover {
    background: rgba(12, 12, 18, 0.45);
    border-color: rgba(255, 255, 255, 0.03);
  }
  
  .shimmer-effect {
    overflow: hidden;
    position: relative;
  }
  
  .shimmer-effect::before {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 150%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
    animation: shimmer 3s infinite;
    transform: skewX(-20deg);
    z-index: 1;
  }
  
  @keyframes shimmer {
    0% { left: -150%; }
    100% { left: 150%; }
  }
`;

// Interface para sinais de placeholder compatível com TradingSignal
interface PlaceholderSignal extends TradingSignal {
  id: string;
  symbol: string;
  exchange: string;
  signal: 'BUY' | 'SELL';
  entry_time: string;
  timeframe: string;
  expiry_time_str: string;
  gale1_time: string;
  gale2_time: string;
  result?: 'win' | 'loss' | null;
  completedTime?: number;
  resultDetermined?: boolean;  // Flag para indicar se o resultado já foi determinado
}

const Signals = () => {
  const { t } = useLanguage();
  const { convertTimeToSelected, adjustTime } = useTimeZone();
  const [filterType, setFilterType] = useState<SignalType | 'ALL'>('ALL');
  const [currentPrices, setCurrentPrices] = useState<Record<string, string>>({});
  const [previousPrices, setPreviousPrices] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExpiredSignals, setShowExpiredSignals] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [signalsPerPage] = useState(7);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [completedSignals, setCompletedSignals] = useState<Record<string, 'win' | 'loss'>>({});
  const [signalsToRemove, setSignalsToRemove] = useState<string[]>([]);
  const [newPlaceholderSignal, setNewPlaceholderSignal] = useState<PlaceholderSignal | null>(null);
  const [signalCompletionCount, setSignalCompletionCount] = useState<{wins: number, losses: number}>({wins: 0, losses: 0});
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [winCount, setWinCount] = useState<number>(0); // Contador de ganhos consecutivos
  const [totalCount, setTotalCount] = useState<number>(0); // Contador total de resultados
  const queryClient = useQueryClient();
  
  // Função para converter o tempo de string para Date
  const convertTimeStringToDate = (timeString: string): Date => {
    if (!timeString) return new Date();
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const now = new Date();
      now.setHours(hours, minutes, 0, 0);
      return adjustTime(now);
    } catch (error) {
      console.error('Erro ao converter string de tempo para Date:', error);
      return new Date();
    }
  };
  
  // Função para calcular o próximo horário com base em um horário inicial e um intervalo em minutos
  const calculateNextTime = (timeStr: string, minutesToAdd: number): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes + minutesToAdd;
    
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };
  
  // Função para selecionar um ativo aleatório
  const getRandomAsset = (): string => {
    const assets = Object.keys(ATIVOS_CATEGORIAS);
    return assets[Math.floor(Math.random() * assets.length)];
  };

  // Função para criar um novo sinal aleatório (baseado no ciclo definido)
  const createRandomPlaceholderSignal = useCallback((): PlaceholderSignal => {
    // Obter os sinais diários
    const dailySignals = generateDailySignals();
    
    // Obter o horário atual
    const now = new Date();
    
    // Encontrar o próximo sinal baseado no horário atual
    let nextSignal = dailySignals[0];
    
    for (const signal of dailySignals) {
      const entryTime = convertTimeStringToDate(signal.entry_time);
      
      // Se encontrarmos um sinal com horário de entrada futuro, usamos ele
      if (entryTime.getTime() > now.getTime()) {
        nextSignal = signal;
        break;
      }
    }
    
    // Se não encontramos nenhum sinal futuro, pegar o primeiro do próximo ciclo
    if (!nextSignal) {
      nextSignal = dailySignals[0];
    }
    
    // Garantir que o ID seja único
    return {
      ...nextSignal,
      id: 'placeholder-' + Math.random().toString(36).substring(2, 9),
    };
  }, []);

  // Efeito para checar os sinais que devem ser completados com base no tempo exato de reentrada 2 + 1 minuto
  useEffect(() => {
    const checkExpiredSignals = () => {
      const now = new Date();

      // Converter os sinais para PlaceholderSignal para poder modificá-los
      const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']) || [];
      const modifiedSignals = [...currentSignals] as PlaceholderSignal[];
      
      let hasChanges = false;
      let newCompleted: Record<string, 'win' | 'loss'> = {...completedSignals};
      
      modifiedSignals.forEach((signal: PlaceholderSignal) => {
        if (signal.status === 'active' && !signal.result && !signal.resultDetermined) {
          // Verificar se já passou do tempo de reentrada 2 + 1 minuto
          const gale2Time = convertTimeStringToDate(signal.gale2_time || '');
          
          // Adicionar 1 minuto ao tempo de reentrada 2
          const completionTime = new Date(gale2Time);
          completionTime.setMinutes(completionTime.getMinutes() + 1);
          
          if (isAfter(now, completionTime)) {
            // Calcular se este sinal deve ser ganho ou perda, mantendo a proporção de 10:1
            let result: 'win' | 'loss';
            const updatedTotalCount = totalCount + 1;
            
            // Se tivermos 10 ganhos consecutivos, o próximo deve ser perda
            if (winCount >= WIN_LOSS_RATIO) {
              result = 'loss';
              setWinCount(0); // Resetar contagem de ganhos
            } else {
              result = 'win';
              setWinCount(winCount + 1); // Incrementar contador de ganhos
            }
            
            setTotalCount(updatedTotalCount);
            
            signal.result = result;
            signal.completedTime = Date.now();
            signal.resultDetermined = true;
            
            // Atualizar contadores
            setSignalCompletionCount(prev => ({
              wins: result === 'win' ? prev.wins + 1 : prev.wins,
              losses: result === 'loss' ? prev.losses + 1 : prev.losses
            }));
            
            // Armazenar o resultado para mostrar a animação
            newCompleted[signal.id] = result;
            hasChanges = true;
            
            // Agendar a remoção após a animação
            setTimeout(() => {
              setSignalsToRemove(prev => [...prev, signal.id]);
              
              // Criar um novo sinal para substituir - usar a função de criar sinais baseada no ciclo
              const newSignal = createRandomPlaceholderSignal();
              setNewPlaceholderSignal(newSignal);
            }, 5000);
          }
        }
      });
      
      if (hasChanges) {
        // Atualizar o estado dos sinais completados
        setCompletedSignals(newCompleted);
        
        // Atualizar o cache de sinais
        queryClient.setQueryData(['tradingSignals'], modifiedSignals);
      }
    };
    
    // Verificar a cada 2 segundos
    const intervalId = setInterval(checkExpiredSignals, 2000);
    return () => clearInterval(intervalId);
  }, [completedSignals, queryClient, createRandomPlaceholderSignal, winCount, totalCount, convertTimeStringToDate]);
  
  // Adicionar função para reiniciar contadores quando a página é carregada
  useEffect(() => {
    setSignalCompletionCount({wins: 0, losses: 0});
  }, []);
  
  // Efeito para subscrever às atualizações de sinais
  useEffect(() => {
    const unsubscribe = tradingSignalService.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['tradingSignals'] });
    });
    
    return () => {
      unsubscribe();
    };
  }, [queryClient]);
  
  // Processar sinais que precisam ser removidos
  useEffect(() => {
    if (signalsToRemove.length > 0 && newPlaceholderSignal) {
      // Obter sinais atuais
      const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']) || [];
      
      // Remover sinais marcados para remoção
      const filteredSignals = currentSignals.filter(
        signal => !signalsToRemove.includes(signal.id)
      );
      
      // Quando um sinal é completado:
      // 1. O sinal na primeira posição (o que foi completado) é removido
      // 2. O sinal na segunda posição se torna o primeiro
      // 3. O sinal na terceira posição se torna o segundo
      // 4. Um novo sinal é adicionado na terceira posição

      // Pegar os sinais que permaneceram (2º e 3º)
      const remainingSignals = [...filteredSignals];
      
      // Novo sinal (que deve ficar na 3ª posição)
      const updatedSignals = [...remainingSignals, newPlaceholderSignal];
      
      // Atualizar o cache
      queryClient.setQueryData(['tradingSignals'], updatedSignals);
      
      // Limpar estados
      setSignalsToRemove([]);
      setNewPlaceholderSignal(null);
      
      // Limpar as entradas de completedSignals que foram removidas
      const updatedCompleted = {...completedSignals};
      signalsToRemove.forEach(id => {
        delete updatedCompleted[id];
      });
      setCompletedSignals(updatedCompleted);
    }
  }, [signalsToRemove, newPlaceholderSignal, completedSignals, queryClient]);
  
  // Função para gerar a sequência de sinais para o dia todo, começando à meia-noite
  const generateDailySignals = useCallback((): PlaceholderSignal[] => {
    console.log('Gerando sinais para o dia todo...');
    const dailySignals: PlaceholderSignal[] = [];
    
    // Definir a hora inicial como 00:03 (primeiro sinal do dia)
    let currentEntryTime = FIRST_SIGNAL_TIME;
    
    // Gerar sinais para o dia todo
    while (true) {
      // Calcular os horários para este sinal
      const entryTime = currentEntryTime;
      const expiryTime = calculateNextTime(entryTime, SIGNAL_EXPIRY_TIME);
      const gale1Time = expiryTime; // Reentrada 1 é igual ao horário de expiração
      const gale2Time = calculateNextTime(gale1Time, SIGNAL_EXPIRY_TIME); // Reentrada 2 é Reentrada 1 + tempo de expiração
      
      // Selecionar um ativo aleatório
      const symbol = getRandomAsset();
      
      // Adicionar este sinal ao conjunto
      const signal = createBasePlaceholderData({
        id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        exchange: ATIVOS_CATEGORIAS[symbol] || "Digital",
        signal: Math.random() > 0.5 ? 'BUY' : 'SELL',
        strength: Math.random() > 0.7 ? SignalStrength.STRONG : (Math.random() > 0.5 ? SignalStrength.MODERATE : SignalStrength.WEAK),
        entry_time: entryTime,
        timeframe: "5m", // Sempre 5 minutos
        expiry_time_str: expiryTime,
        gale1_time: gale1Time,
        gale2_time: gale2Time,
        success_rate: 0.85 // Taxa de sucesso base, será ajustada no filteredSignals
      });
      
      dailySignals.push(signal);
      
      // Definir o horário de entrada do próximo sinal (10 minutos após a Reentrada 2)
      currentEntryTime = calculateNextTime(gale2Time, TIME_BETWEEN_SIGNALS);
      
      // Verificar se já passamos da meia-noite do próximo dia
      const [hours] = currentEntryTime.split(':').map(Number);
      // Se voltamos para meia-noite e já temos mais de um sinal, paramos
      if (hours === 0 && dailySignals.length > 1) {
        break;
      }
      
      // Segurança para evitar loops infinitos
      if (dailySignals.length >= 100) {
        break;
      }
    }
    
    console.log(`Gerados ${dailySignals.length} sinais para o dia`);
    return dailySignals;
  }, []);
  
  // Filtrar os sinais mais relevantes para o horário atual
  const filterRelevantSignals = useCallback((allSignals: PlaceholderSignal[]): PlaceholderSignal[] => {
    const now = new Date();
    
    // Ordenar sinais por proximidade ao horário atual
    allSignals.sort((a, b) => {
      const timeA = convertTimeStringToDate(a.entry_time);
      const timeB = convertTimeStringToDate(b.entry_time);
      
      // Priorizar sinais que ainda não aconteceram
      const aInFuture = timeA.getTime() > now.getTime();
      const bInFuture = timeB.getTime() > now.getTime();
      
      if (aInFuture && !bInFuture) return -1;
      if (!aInFuture && bInFuture) return 1;
      
      // Se ambos são futuros ou ambos já passaram, pegar o mais próximo
      return Math.abs(timeA.getTime() - now.getTime()) - Math.abs(timeB.getTime() - now.getTime());
    });
    
    // Pegar os 3 primeiros sinais (ou menos se não houver 3)
    return allSignals.slice(0, Math.min(allSignals.length, 3)) as PlaceholderSignal[];
  }, [convertTimeStringToDate]);

  // Função para pegar os sinais diários com base na hora atual
  const getDailySignalsForCurrentTime = useCallback(async (): Promise<TradingSignal[]> => {
    // Verificar se temos sinais gerados em cache
    const cachedSignals = localStorage.getItem('dailyTradingSignals');
    const cachedDate = localStorage.getItem('dailyTradingSignalsDate');
    
    // Verificar se o cache é do dia atual
    const today = new Date();
    const isCurrentDay = cachedDate && 
      startOfDay(new Date(cachedDate)).getTime() === startOfDay(today).getTime();
    
    console.log(`Obtendo sinais para ${today.toLocaleTimeString()}. Cache válido: ${isCurrentDay}`);
    
    // Se temos sinais em cache do dia atual, usar eles
    if (cachedSignals && isCurrentDay) {
      const parsedSignals = JSON.parse(cachedSignals) as PlaceholderSignal[];
      console.log(`Usando ${parsedSignals.length} sinais em cache do dia ${cachedDate}`);
      
      // Filtrar os sinais para mostrar apenas os 3 mais relevantes no momento atual
      return filterRelevantSignals(parsedSignals);
    }
    
    // Caso contrário, gerar novos sinais para o dia atual
    console.log('Gerando novos sinais para o dia todo...');
    const allDailySignals = generateDailySignals();
    
    // Salvar em cache
    localStorage.setItem('dailyTradingSignals', JSON.stringify(allDailySignals));
    localStorage.setItem('dailyTradingSignalsDate', today.toISOString());
    
    // Filtrar os sinais para mostrar apenas os 3 mais relevantes no momento atual
    return filterRelevantSignals(allDailySignals);
  }, [filterRelevantSignals, generateDailySignals]);

  // Consulta para obter sinais de trading
  const { data: signals, isLoading, refetch } = useQuery({
    queryKey: ['tradingSignals'],
    queryFn: async () => {
      console.log('Página Sinais - Obtendo sinais do sistema');
      // Usar o gerador de sinais diários para obter os sinais
      const currentSignals = await getDailySignalsForCurrentTime();
      return currentSignals;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  // Efeito para atualizar a cada 1 minuto para mostrar os sinais corretos
  useEffect(() => {
    // Função para atualizar os sinais baseado no horário atual
    const updateSignalsBasedOnTime = async () => {
      const currentSignals = await getDailySignalsForCurrentTime();
      queryClient.setQueryData(['tradingSignals'], currentSignals);
    };
    
    // Definir intervalo para checar se precisamos mudar os sinais mostrados
    const intervalId = setInterval(updateSignalsBasedOnTime, 60 * 1000); // A cada minuto
    
    // Chamar imediatamente na montagem
    updateSignalsBasedOnTime();
    
    return () => clearInterval(intervalId);
  }, [getDailySignalsForCurrentTime, queryClient]);

  // Criar dados base para cada placeholder signal
  const createBasePlaceholderData = (override: Partial<PlaceholderSignal> = {}): PlaceholderSignal => ({
    id: 'placeholder-' + Math.random().toString(36).substring(2, 9),
    symbol: 'BTC/USD',
    exchange: 'Blitz',
    signal: 'BUY',
    status: 'active',
    strength: SignalStrengthEnum.STRONG,
    entry_time: '00:00',
    timeframe: '5m',
    expiry_time_str: '00:05',
    gale1_time: '00:06',
    gale2_time: '00:07',
    created_at: new Date().toISOString(),
    expiry: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    
    // Campos obrigatórios de TradingSignal
    type: SignalType.TECHNICAL,
    reason: 'Análise de mercado',
    timestamp: Date.now(),
    price: 100,
    entry_price: 100,
    stop_loss: 90,
    target_price: 110,
    success_rate: Math.random() * (0.97 - 0.80) + 0.80, // Taxa de sucesso entre 80% e 97%
    risk_reward: '1:2',
    pair: '',
    metadata: {},
    ...override
  });

  // Dados para sinais quando não há dados suficientes disponíveis
  const placeholderSignals: PlaceholderSignal[] = useMemo(() => {
    // Gerar sinais diários para o dia todo e pegar os 3 primeiros
    const dailySignals = generateDailySignals();
    const now = new Date();
    
    // Ordenar por horário de entrada
    dailySignals.sort((a, b) => {
      const timeA = convertTimeStringToDate(a.entry_time);
      const timeB = convertTimeStringToDate(b.entry_time);
      
      // Priorizar sinais que ainda não aconteceram
      const aInFuture = timeA.getTime() > now.getTime();
      const bInFuture = timeB.getTime() > now.getTime();
      
      if (aInFuture && !bInFuture) return -1;
      if (!aInFuture && bInFuture) return 1;
      
      // Se ambos são futuros ou ambos já passaram, pegar o mais próximo
      return Math.abs(timeA.getTime() - now.getTime()) - Math.abs(timeB.getTime() - now.getTime());
    });
    
    // Retornar no máximo 3 sinais
    return dailySignals.slice(0, 3) as PlaceholderSignal[];
  }, [generateDailySignals, convertTimeStringToDate]);

  // Ajustando para garantir que temos o número adequado de sinais
  const ensureSevenSignals = (signalsInput: TradingSignal[] | undefined): TradingSignal[] => {
    if (!signalsInput || signalsInput.length === 0) {
      return placeholderSignals as TradingSignal[];
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Criar uma cópia dos sinais para não modificar o original
    let signalsCopy = [...signalsInput];
    
    // Remover sinais com horários passados (mais de 5 minutos atrás)
    signalsCopy = signalsCopy.filter(signal => {
      if (!signal.entry_time) return true;
      
      const [hours, minutes] = signal.entry_time.split(':').map(Number);
      const entryDate = new Date();
      entryDate.setHours(hours, minutes, 0, 0);
      
      // Manter apenas sinais que ocorrerão em menos de 5 minutos atrás
      const diff = now.getTime() - entryDate.getTime();
      return diff < 5 * 60 * 1000 || entryDate.getTime() > now.getTime();
    });
    
    // Encontrar o próximo horário válido a partir de agora (terminando em 03, 23 ou 43)
    const getNextValidEntryTime = () => {
      let nextHour = currentHour;
      let nextMinute: number;
      
      if (currentMinute < 3) {
        nextMinute = 3;
      } else if (currentMinute < 23) {
        nextMinute = 23;
      } else if (currentMinute < 43) {
        nextMinute = 43;
      } else {
        nextHour = (currentHour + 1) % 24;
        nextMinute = 3;
      }
      
      return {
        hours: nextHour,
        minutes: nextMinute
      };
    };
    
    // Garantir que temos sinais suficientes para a página (7 sinais)
    if (signalsCopy.length < 7) {
      // Verificar se temos placeholder signals para usar
      const remainingPlaceholdersNeeded = 7 - signalsCopy.length;
      
      // Base para o próximo horário válido
      const nextValid = getNextValidEntryTime();
      let nextHour = nextValid.hours;
      let nextMinute = nextValid.minutes;
      
      for (let i = 0; i < remainingPlaceholdersNeeded; i++) {
        const baseSignal = signalsCopy[i % signalsCopy.length] || placeholderSignals[0];
        
        // Copiar propriedades existentes e adicionar novas
        const newSignal = {
          ...baseSignal,
          id: `generated_signal_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
        } as TradingSignal;
        
        // Definir o horário de entrada com base no padrão 03, 23, 43 a partir do próximo horário válido
        let entryTimeStr = `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
        
        // Avançar para o próximo slot de tempo
        if (nextMinute === 3) {
          nextMinute = 23;
        } else if (nextMinute === 23) {
          nextMinute = 43;
        } else { // nextMinute === 43
          nextHour = (nextHour + 1) % 24;
          nextMinute = 3;
        }
        
        // Definir os tempos do sinal
        if ('entry_time' in newSignal) {
          newSignal.entry_time = entryTimeStr;
          
          // Ajustar horários de expiração e gales
          if ('expiry_time_str' in newSignal) {
            // Expiração: 5 minutos após a entrada
            const entryDate = new Date();
            const [entryHours, entryMinutes] = entryTimeStr.split(':').map(Number);
            entryDate.setHours(entryHours, entryMinutes, 0, 0);
            
            const expiryDate = new Date(entryDate);
            expiryDate.setMinutes(expiryDate.getMinutes() + 5);
            
            const expiryHours = expiryDate.getHours().toString().padStart(2, '0');
            const expiryMinutes = expiryDate.getMinutes().toString().padStart(2, '0');
            newSignal.expiry_time_str = `${expiryHours}:${expiryMinutes}`;
            
            if ('gale1_time' in newSignal) {
              newSignal.gale1_time = newSignal.expiry_time_str;
            }
            
            if ('gale2_time' in newSignal) {
              // Gale2: 5 minutos após gale1
              const gale2Date = new Date(expiryDate);
              gale2Date.setMinutes(gale2Date.getMinutes() + 5);
              
              const gale2Hours = gale2Date.getHours().toString().padStart(2, '0');
              const gale2Minutes = gale2Date.getMinutes().toString().padStart(2, '0');
              newSignal.gale2_time = `${gale2Hours}:${gale2Minutes}`;
            }
          }
        }
        
        // Gerar propriedades randômicas para diversidade
        newSignal.signal = Math.random() > 0.5 ? 'BUY' : 'SELL';
        newSignal.success_rate = 0.77 + Math.random() * 0.205; // Entre 77% e 97.5%
        newSignal.symbol = getRandomAsset(); // Usar a função existente para obter um ativo aleatório
        
        // Garantir que não temos sinais duplicados (mesmo horário e ativo)
        const isDuplicate = signalsCopy.some(signal => 
          signal.entry_time === newSignal.entry_time && signal.symbol === newSignal.symbol
        );
        
        if (!isDuplicate) {
          signalsCopy.push(newSignal);
        } else {
          // Se for duplicado, tentar novamente com outro ativo
          i--; // Fazer este loop novamente
        }
      }
    }
    
    // Ordenar por horário de entrada
    signalsCopy.sort((a, b) => {
      if (!a.entry_time || !b.entry_time) return 0;
      
      const [aHours, aMinutes] = a.entry_time.split(':').map(Number);
      const [bHours, bMinutes] = b.entry_time.split(':').map(Number);
      
      const aDate = new Date();
      aDate.setHours(aHours, aMinutes, 0, 0);
      
      const bDate = new Date();
      bDate.setHours(bHours, bMinutes, 0, 0);
      
      return aDate.getTime() - bDate.getTime();
    });
    
    // Se temos mais de 7 sinais, manter apenas os primeiros 7
    return signalsCopy.slice(0, 7);
  };

  // Filtragem de sinais por tipo
  const filteredSignals = useMemo(() => {
    if (!signals) return ensureSevenSignals([]);
    
    const signalsArray = signals as TradingSignal[];
    
    let filtered = signalsArray.filter(signal => 
      filterType === 'ALL' || signal.type === filterType
    );
    
    // Filtrar por status (expirado/ativo)
    if (!showExpiredSignals) {
      filtered = filtered.filter(signal => signal.status === 'active');
    }
    
    // Função auxiliar para obter o horário de entrada como Date
    const getEntryTimeAsDate = (signal: TradingSignal): Date => {
      if (!signal.entry_time) return new Date();
      
      const now = currentTime; // Usar o horário atualizado constantemente
      const [hours, minutes] = signal.entry_time.split(':').map(Number);
      const entryDate = new Date(now);
      entryDate.setHours(hours, minutes, 0, 0);
      
      return entryDate;
    };
    
    // Função para calcular a diferença de tempo em minutos
    const getTimeToEntry = (signal: TradingSignal): number => {
      const entryDate = getEntryTimeAsDate(signal);
      const now = currentTime; // Usar o horário atualizado constantemente
      return (entryDate.getTime() - now.getTime()) / (60 * 1000); // diferença em minutos
    };
    
    // Ordenar sinais por proximidade do horário de entrada atual
    filtered = filtered.sort((a, b) => {
      const timeToEntryA = getTimeToEntry(a);
      const timeToEntryB = getTimeToEntry(b);
      
      // Nova lógica de ordenação - ordenar por diferença absoluta em relação ao tempo atual
      // Isso garantirá que o mais próximo venha primeiro, mesmo que alguns já tenham passado
      const absTimeToEntryA = Math.abs(timeToEntryA);
      const absTimeToEntryB = Math.abs(timeToEntryB);
      
      // Prioridade para horários futuros (ainda não expirados)
      const aFuture = timeToEntryA >= 0;
      const bFuture = timeToEntryB >= 0;
      
      // Se um é futuro e outro já passou
      if (aFuture && !bFuture) return -1; // A está no futuro, vem primeiro
      if (!aFuture && bFuture) return 1;  // B está no futuro, vem primeiro
      
      // Se ambos são do futuro ou ambos já passaram, ordena pelo mais próximo do horário atual
      return absTimeToEntryA - absTimeToEntryB;
    });
    
    // Ajustar taxas de sucesso para garantir valores diferentes e mínimo de 77%
    // Base para as taxas de sucesso: começa com 97.5% e vai diminuindo
    const successRateBase = 97.5;
    const successRateDecrement = 2.8;
    
    filtered = filtered.map((signal, index) => {
      // Taxa de sucesso decrescente, nunca menor que 77%
      const successRate = Math.max(
        successRateBase - (index * successRateDecrement), 
        77.0
      ) / 100;
      
      return {
        ...signal,
        success_rate: successRate
      };
    });
    
    // Garantir que temos 7 sinais (não mais 3)
    return ensureSevenSignals(filtered);
  }, [signals, filterType, showExpiredSignals, currentTime]);

  // Paginação
  const indexOfLastSignal = activePage * signalsPerPage;
  const indexOfFirstSignal = indexOfLastSignal - signalsPerPage;
  const paginatedSignals = filteredSignals.slice(indexOfFirstSignal, indexOfLastSignal);
  const totalPages = Math.ceil(filteredSignals.length / signalsPerPage);

  // Função para lidar com a atualização de dados
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    await refetch();
    await updatePrices();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Função para atualizar preços
  const updatePrices = async () => {
    try {
      // Armazenar preços anteriores
      setPreviousPrices(currentPrices);
      
      // Obter símbolos únicos de todos os sinais
      const signalsArray = signals as TradingSignal[] || [];
      
      const symbols = signalsArray.length > 0
        ? [...new Set(signalsArray.map(signal => signal.symbol || signal.pair || ''))]
        : [];
      
      if (symbols.length === 0) return;
      
      // Obter preços atualizados
      const prices = await getLatestPrices(symbols);
      
      // Converter os preços para o formato Record<string, string>
      const pricesRecord: Record<string, string> = {};
      prices.forEach(price => {
        if (price.symbol && price.price) {
          pricesRecord[price.symbol] = price.price.toString();
        }
      });
      
      setCurrentPrices(pricesRecord);
    } catch (error) {
      console.error('Erro ao atualizar preços:', error);
    }
  };

  // Funções auxiliares para exibir informações do sinal
  const getPriceChange = (symbol: string): 'up' | 'down' | 'equal' => {
    if (!previousPrices[symbol] || !currentPrices[symbol]) return 'equal';
    
    const prev = parseFloat(previousPrices[symbol]);
    const curr = parseFloat(currentPrices[symbol]);
    
    if (curr > prev) return 'up';
    if (curr < prev) return 'down';
    return 'equal';
  };

  const isNewSignal = (signal: TradingSignal): boolean => {
    const createdAt = signal.created_at ? new Date(signal.created_at) : new Date(signal.timestamp);
    const now = new Date();
    return now.getTime() - createdAt.getTime() < 30 * 60 * 1000; // 30 minutos
  };

  const isExpiringSignal = (signal: TradingSignal): boolean => {
    const expiry = new Date(signal.expiry);
    const now = new Date();
    const timeLeft = expiry.getTime() - now.getTime();
    return timeLeft > 0 && timeLeft < 10 * 60 * 1000; // Menos de 10 minutos
  };

  const formatExpiry = (expiry: string): string => {
    try {
      const now = new Date();
      const expiryDate = parse(expiry, "HH:mm", new Date());
      
      // Se expira em menos de 24 horas
      if (expiryDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
        return `${t('signals.expires')} ${formatDistanceToNow(expiryDate, { addSuffix: true, locale: ptBR })}`;
      }
      
      // Se expira em mais de 24 horas
      return `${t('signals.expires')} ${format(expiryDate, "dd 'de' MMM", { locale: ptBR })}`;
    } catch (error) {
      return t('signals.invalid.date') || "Data inválida";
    }
  };

  const getStrengthColor = (strength: SignalStrengthEnum) => {
    switch (strength) {
      case SignalStrength.STRONG:
        return "text-gray-200";
      case SignalStrength.MODERATE:
        return "text-gray-300";
      case SignalStrength.WEAK:
        return "text-gray-400";
      default:
        return "text-gray-300";
    }
  };

  const getStrengthText = (strength: SignalStrengthEnum) => {
    switch (strength) {
      case SignalStrength.STRONG:
        return t('signals.strength.strong') || "Alta confiança";
      case SignalStrength.MODERATE:
        return t('signals.strength.moderate') || "Confiança média";
      case SignalStrength.WEAK:
        return t('signals.strength.weak') || "Baixa confiança";
      default:
        return t('signals.strength.moderate') || "Confiança média";
    }
  };

  // Substituir a verificação de sinal expirando pelo formato da taxa de sucesso
  const formatSuccessRate = (rate: number): string => {
    // Garantir que a taxa está entre 77% e 100%
    const validRate = Math.min(Math.max(rate || 0.77, 0.77), 1.0);
    // Formatação com uma casa decimal
    return `${(validRate * 100).toFixed(1)}%`;
  };

  return (
    <Layout>
      <div className="space-y-6 relative signals-page-dark-gradient p-4 rounded-xl min-h-screen -mx-4 -my-4 shadow-inner">
        {/* Camada preta por cima das luzes de fundo - MAIS TRANSPARENTE */}
        <div className="absolute inset-0 bg-black/40 z-[1]"></div>

        {/* Efeitos de luz de fundo com MAIOR opacidade */}
        <div className="signals-page-light-accent top-20 left-20 z-[2]" style={{ opacity: 0.15 }}></div>
        <div className="signals-page-light-accent bottom-40 right-20 z-[2]" style={{ opacity: 0.15 }}></div>
        <div className="signals-page-light-accent top-1/2 left-1/2 z-[2]" style={{ opacity: 0.15 }}></div>
        
        {/* Acentos coloridos */}
        <div className="signals-page-color-accent top-0 left-10 z-[2]" style={{ background: '#300000', opacity: 0.15 }}></div>
        <div className="signals-page-color-accent bottom-20 right-10 z-[2]" style={{ background: '#200000', opacity: 0.15 }}></div>
        <div className="signals-page-color-accent top-40 right-40 z-[2]" style={{ background: '#350000', opacity: 0.15 }}></div>
        
        {/* Cabeçalho da página com título mais brilhante */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 z-[3] relative">
          <div className="floating-element">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-red-700 via-red-900 to-black bg-clip-text text-transparent">
              {t('signals.title')}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-white/60 mt-1">
                {t('signals.subtitle')}
              </p>
              
              <div className="flex items-center gap-2">
                <TimeZoneSelector variant="compact" className="mt-1" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-all
                ${isRefreshing 
                  ? 'bg-white/5 text-white/40 cursor-not-allowed' 
                  : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white signals-page-card-glass'
                }`}
              title={t('signals.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{t('signals.refresh')}</span>
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-all
                ${showFilters 
                  ? 'bg-white/10 text-white' 
                  : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white signals-page-card-glass'
                }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden md:inline">{t('signals.filters')}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Área de filtros */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden z-10 relative"
            >
              <div className="p-5 rounded-xl signals-page-card-glass">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Filtro por tipo de sinal */}
                  <div className="space-y-2">
                    <p className="text-sm text-white/70 font-medium">{t('signals.type')}</p>
                    <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('ALL')}
                        className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                filterType === 'ALL' 
                            ? 'bg-white/20 text-white shimmer-effect' 
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
                        {t('signals.type.all')}
            </button>
            <button
              onClick={() => setFilterType(SignalType.TECHNICAL)}
                        className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                filterType === SignalType.TECHNICAL 
                            ? 'bg-blue-500/20 text-blue-200 border border-blue-500/20 shimmer-effect' 
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
                        <BarChart3 className="w-4 h-4 inline mr-1.5 opacity-70" />
                        {t('signals.type.technical')}
            </button>
            <button
              onClick={() => setFilterType(SignalType.FUNDAMENTAL)}
                        className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                filterType === SignalType.FUNDAMENTAL 
                            ? 'bg-purple-500/20 text-purple-200 border border-purple-500/20 shimmer-effect' 
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
                        <TrendingUp className="w-4 h-4 inline mr-1.5 opacity-70" />
                        {t('signals.type.fundamental')}
            </button>
            <button
              onClick={() => setFilterType(SignalType.NEWS)}
                        className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                filterType === SignalType.NEWS 
                            ? 'bg-amber-500/20 text-amber-200 border border-amber-500/20 shimmer-effect' 
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
                        <Clock4 className="w-4 h-4 inline mr-1.5 opacity-70" />
                        {t('signals.type.news')}
            </button>
                    </div>
          </div>

                  {/* Opções adicionais */}
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-white/70 font-medium">{t('signals.options')}</p>
                    <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowExpiredSignals(!showExpiredSignals)}
                        className={`flex items-center px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                showExpiredSignals
                            ? 'bg-gray-500/20 text-gray-300 border border-gray-500/20 shimmer-effect' 
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
                        <Clock className="w-4 h-4 mr-1.5 opacity-70" />
                        {showExpiredSignals ? t('signals.options.hide.expired') : t('signals.options.show.expired')}
            </button>
                      
                      <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`flex items-center px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                          autoRefresh 
                            ? 'bg-teal-500/20 text-teal-200 border border-teal-500/20 shimmer-effect' 
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
                        }`}
                      >
                        <RefreshCw className="w-4 h-4 mr-1.5 opacity-70" />
                        {t('signals.options.auto.refresh')}
                      </button>
          </div>
        </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Injetar estilos CSS */}
        <style>{styles}</style>

        {/* Conteúdo principal com os sinais */}
        <div className="grid gap-6 relative z-[3]">
          {isLoading ? (
            <div className="loading-container">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 border-2 border-white/10 border-t-gray-300/30 rounded-full animate-spin"></div>
                  <div className="w-12 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-white/10 border-b-gray-300/30 rounded-full animate-spin"></div>
              </div>
              </div>
              <h3 className="gradient-text font-medium text-lg mb-2">{t('signals.analyzing.market')}</h3>
              <p className="text-sm text-white/50 text-center max-w-xs">
                {t('signals.processing')}
              </p>
            </div>
          ) : filteredSignals && filteredSignals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {paginatedSignals.map((signal: any, index) => {
                const isNew = isNewSignal(signal);
                const isExpiring = isExpiringSignal(signal);
                const isCompleted = completedSignals[signal.id];
                const resultClass = isCompleted 
                  ? (completedSignals[signal.id] === 'win' ? 'signal-completed-win' : 'signal-completed-loss') 
                  : '';
                
                // Converter horários para o fuso horário selecionado
                const entryTime = convertTimeToSelected(signal.entry_time);
                const expiryTime = convertTimeToSelected(signal.expiry_time_str);
                const gale1Time = convertTimeToSelected(signal.gale1_time);
                const gale2Time = convertTimeToSelected(signal.gale2_time);
                
                return (
                  <motion.div 
                    key={`${signal.id}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`flex flex-col rounded-xl overflow-hidden transition-all duration-300 glow-hover
                      ${signal.status === 'active' 
                        ? 'signals-page-card-glass' 
                        : 'bg-black/30 border border-white/5 opacity-75'
                      }
                      ${isNew ? 'ring-1 ring-indigo-500/30' : ''}
                      ${resultClass}
                    `}
                  >
                    {isCompleted && completedSignals[signal.id] === 'win' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/30 backdrop-filter backdrop-blur-sm">
                        <div className="text-center">
                          <span className="text-lg font-medium text-green-400">
                            {t('signals.result.win') || "GANHO"}
                          </span>
                        </div>
                      </div>
                    )}

                    {isCompleted && completedSignals[signal.id] === 'loss' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/30 backdrop-filter backdrop-blur-sm">
                        <div className="text-center">
                          <span className="text-lg font-medium text-red-400">
                            {t('signals.result.loss') || "PERDA"}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="relative p-4 border-b border-white/[0.05] backdrop-blur-md bg-black/40">
                      {/* Simbolo e nome do ativo - CORRIGIDO */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white leading-tight overflow-hidden text-ellipsis" style={{ wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' }}>
                            {signal.symbol}
                          </h3>
                          <div className="flex items-center text-sm text-white/70 mt-1">
                            <span className="truncate">{signal.exchange || 'Corretora'}</span>
                          </div>
                        </div>
                      
                        <span className={`text-sm py-1 px-2 rounded-md flex-shrink-0 h-fit ${
                          signal.signal === 'BUY' 
                            ? 'bg-gradient-to-r from-emerald-950/80 to-emerald-900/80 text-emerald-400' 
                            : 'bg-gradient-to-r from-red-950/80 to-rose-900/80 text-rose-400'
                          } font-medium`}
                        >
                          {signal.signal === 'BUY' ? t('signals.buy') || "COMPRA" : t('signals.sell') || "VENDA"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 flex-grow relative backdrop-blur-md bg-black/20">
                      {/* Indicadores de status */}
                      <div className="flex flex-wrap gap-2 mb-4 h-8 items-center">
                              {isNew && (
                          <span className="text-xs h-6 px-2 py-1 rounded-full bg-indigo-900/15 text-indigo-300/80 border border-indigo-800/10 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600/70 mr-1.5 animate-pulse"></span>
                                  {t('signals.new') || "NOVO"}
                                </span>
                              )}
                              {/* Substituir EXPIRANDO pela taxa de sucesso */}
                              <span className="text-xs h-6 px-2 py-1 rounded-full bg-emerald-900/15 text-emerald-300/80 border border-emerald-800/10 flex items-center">
                                <CheckCheck className="w-3 h-3 mr-1" />
                                {formatSuccessRate(signal.success_rate || 0.77)}
                                </span>
                        <span className={`text-xs h-6 px-2 py-1 rounded-full flex items-center text-teal-300/70 bg-teal-900/15 border border-teal-800/10`}>
                          <CheckCheck className="w-3 h-3 mr-1" />
                          {getStrengthText(signal.strength)}
                            </span>
                      </div>
                      
                      {/* Dados do sinal */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-center justify-between bg-black/50 backdrop-blur-md rounded-lg p-3 border border-white/[0.02] shadow-inner min-h-[50px]">
                            <div>
                              <p className="text-sm font-medium text-white/70">{t('dashboard.signals.entry') || "Entrada"}</p>
                            </div>
                            <p className="text-base font-semibold text-white/80">{entryTime || "00:00"}</p>
                          </div>
                          
                          <div className="flex items-center justify-between bg-black/50 backdrop-blur-md rounded-lg p-3 border border-white/[0.02] shadow-inner min-h-[50px]">
                            <div>
                              <p className="text-sm font-medium text-white/70">{t('dashboard.signals.expiration') || "Expiração"}</p>
                            </div>
                            <p className="text-base font-semibold text-white/80">{signal.timeframe || "1m"}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-center justify-between bg-black/50 backdrop-blur-md rounded-lg p-3 border border-white/[0.02] shadow-inner min-h-[50px]">
                            <div>
                              <p className="text-sm font-medium text-white/70">{t('dashboard.signals.reentry1') || "Reentrada 1"}</p>
                            </div>
                            <p className="text-base font-semibold text-white/80">{gale1Time || "00:29"}</p>
                          </div>
                          
                          <div className="flex items-center justify-between bg-black/50 backdrop-blur-md rounded-lg p-3 border border-white/[0.02] shadow-inner min-h-[50px]">
                            <div>
                              <p className="text-sm font-medium text-white/70">{t('dashboard.signals.reentry2') || "Reentrada 2"}</p>
                            </div>
                            <p className="text-base font-semibold text-white/80">{gale2Time || "00:30"}</p>
                          </div>
                        </div>
                      </div>
                      
                    {/* Botão de ação */}
                    <div className="p-4 border-t border-white/[0.02] bg-black/50">
                      <button
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-amber-700/80 via-yellow-600/70 to-amber-600/90 hover:from-amber-800/80 hover:via-yellow-700/70 hover:to-amber-700/90 text-amber-50 font-medium transition-all duration-300 flex items-center justify-center relative overflow-hidden shadow-lg backdrop-blur-sm border border-amber-500/20 group golden-button golden-shadow"
                        onClick={() => window.open('https://trade.xxbroker.com/register?aff=751924&aff_model=revenue&afftrack=', '_blank')}
                      >
                        <span className="absolute inset-0 w-full h-full bg-black opacity-30 group-hover:opacity-20 transition-opacity duration-300"></span>
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-tr from-amber-500/20 via-yellow-400/10 to-amber-300/20"></span>
                        <span className="relative z-10 flex items-center">
                          <Zap className="w-4 h-4 mr-2 text-amber-100" />
                          {t('dashboard.signals.trade') || "Realizar Trade"}
                        </span>
                        <ExternalLink className="w-4 h-4 ml-2 relative z-10 text-amber-100" />
                      </button>
                    </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 signals-page-card-glass rounded-xl">
              <div className="bg-white/5 p-4 rounded-full mb-4">
                <ListFilter className="w-10 h-10 text-white/30" />
              </div>
              <h3 className="text-xl font-medium mb-2">Nenhum sinal encontrado</h3>
              <p className="text-white/60 text-center max-w-md mb-6">
                {filterType !== 'ALL' 
                  ? `Não encontramos sinais do tipo ${filterType} com os filtros atuais.` 
                  : 'Não encontramos sinais de trading ativos no momento.'}
              </p>
              <button
                onClick={() => {
                  setFilterType('ALL');
                  setShowExpiredSignals(true);
                }}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
              >
                Mostrar todos os sinais
              </button>
            </div>
          )}
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 gap-2">
              <button 
                onClick={() => setActivePage(prev => Math.max(1, prev - 1))}
                disabled={activePage === 1}
                className="p-2 rounded-lg signals-page-card-glass hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none transition-all"
                aria-label="Página anterior"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }).map((_, index) => {
                  // Mostrar apenas 5 botões de página no total
                  if (totalPages <= 5 || 
                      index === 0 || 
                      index === totalPages - 1 || 
                      (index >= activePage - 2 && index <= activePage)) {
                    return (
                  <button 
                    key={`page-${index + 1}`}
                    onClick={() => setActivePage(index + 1)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      activePage === index + 1 
                            ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white font-medium border border-white/10 shimmer-effect' 
                            : 'signals-page-card-glass hover:bg-white/10 text-white/70'
                    }`}
                  >
                    {index + 1}
                  </button>
                    );
                  } else if (index === 1 && activePage > 3) {
                    return <span key="ellipsis-start" className="px-1 self-end text-white/50">...</span>;
                  } else if (index === totalPages - 2 && activePage < totalPages - 2) {
                    return <span key="ellipsis-end" className="px-1 self-end text-white/50">...</span>;
                  }
                  return null;
                })}
              </div>
              
              <button 
                onClick={() => setActivePage(prev => Math.min(totalPages, prev + 1))}
                disabled={activePage === totalPages}
                className="p-2 rounded-lg signals-page-card-glass hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none transition-all"
                aria-label="Próxima página"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Signals;


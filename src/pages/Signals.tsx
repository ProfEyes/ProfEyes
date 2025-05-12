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

// Cache de sinais para o dia
interface GenericCache {
  signals: PlaceholderSignal[];
  date: string; 
}

let signalCache: GenericCache | null = null;

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
  WEAK: 'WEAK' as SignalStrengthEnum,
  VERY_STRONG: 'VERY_STRONG' as SignalStrengthEnum
};

// Estilos para as animações
const styles = `
  @keyframes pulse {
    0%, 100% { opacity: 0.6; transform: scale(0.98); }
    50% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 8px rgba(0, 0, 0, 0.2); }
    50% { box-shadow: 0 0 18px rgba(0, 0, 0, 0.25); }
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
  
  /* Animações para sinais completados */
  @keyframes winPulse {
    0% { background-color: rgba(34, 197, 94, 0.05); box-shadow: 0 0 15px rgba(34, 197, 94, 0.1); }
    50% { background-color: rgba(34, 197, 94, 0.1); box-shadow: 0 0 25px rgba(34, 197, 94, 0.15); }
    100% { background-color: rgba(34, 197, 94, 0.05); box-shadow: 0 0 15px rgba(34, 197, 94, 0.1); }
  }
  
  @keyframes lossPulse {
    0% { background-color: rgba(220, 38, 38, 0.1); box-shadow: 0 0 15px rgba(220, 38, 38, 0.15); }
    50% { background-color: rgba(220, 38, 38, 0.15); box-shadow: 0 0 25px rgba(220, 38, 38, 0.2); }
    100% { background-color: rgba(220, 38, 38, 0.1); box-shadow: 0 0 15px rgba(220, 38, 38, 0.15); }
  }
  
  @keyframes winConfetti {
    0% { opacity: 0; transform: translateY(0) rotate(0); }
    10% { opacity: 1; }
    100% { opacity: 0; transform: translateY(-100px) rotate(720deg); }
  }
  
  .signal-completed-win {
    animation: winPulse 1.5s ease-in-out infinite;
    background-color: rgba(34, 197, 94, 0.05) !important;
    border: 1px solid rgba(34, 197, 94, 0.1) !important;
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
    background: linear-gradient(to bottom, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.02));
    z-index: -1;
  }
  
  .signal-completed-loss {
    animation: lossPulse 1.5s ease-in-out infinite;
    background-color: rgba(220, 38, 38, 0.1) !important;
    border: 1px solid rgba(220, 38, 38, 0.15) !important;
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
    background: linear-gradient(to bottom, rgba(220, 38, 38, 0.1), rgba(220, 38, 38, 0.02));
    z-index: -1;
  }
  
  .confetti {
    position: absolute;
    width: 10px;
    height: 10px;
    background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(34,197,94,0.7) 100%);
    border-radius: 50%;
    animation: winConfetti 2s ease-out forwards;
  }
  
  /* Animações para os ícones de resultado */
  @keyframes iconScaleIn {
    0% { transform: scale(0); opacity: 0; }
    40% { transform: scale(1.2); opacity: 1; }
    60% { transform: scale(0.9); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  
  @keyframes winIconRotate {
    0% { transform: scale(1) rotate(0deg); }
    25% { transform: scale(1.2) rotate(-10deg); }
    50% { transform: scale(1.2) rotate(10deg); }
    75% { transform: scale(1.1) rotate(-5deg); }
    100% { transform: scale(1) rotate(0deg); }
  }
  
  @keyframes lossIconShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-10px); }
    40% { transform: translateX(10px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
  }
  
  .result-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    animation: iconScaleIn 0.5s ease-out forwards;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(5px);
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.4);
    border: 2px solid;
  }
  
  .win-icon {
    border-color: rgba(34, 197, 94, 0.3);
    animation: iconScaleIn 0.5s ease-out forwards, winIconRotate 2s ease-in-out 0.5s infinite;
  }
  
  .loss-icon {
    border-color: rgba(255, 80, 80, 0.3);
    animation: iconScaleIn 0.5s ease-out forwards, lossIconShake 1s ease-in-out 0.5s infinite;
  }
  
  .result-text {
    font-size: 24px;
    font-weight: bold;
    text-align: center;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    animation: iconScaleIn 0.5s ease-out forwards;
    margin-top: 10px;
  }
  
  /* Classe específica para a página de sinais - não afeta o Dashboard */
  .signals-page-dark-gradient {
    background: #000000;
  }
  
  .gradient-text {
    background: linear-gradient(90deg, #ffffff, #aaaaaa, #ffffff);
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

  /* Estilo unificado para todos os cards de sinais */
  .signal-card {
    border: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(15px);
    transition: all 0.3s ease;
    overflow: hidden;
  }
  
  .signal-card:hover {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(5, 5, 10, 0.65);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.08);
    transform: translateY(-3px) scale(1.02);
  }

  /* Estilo unificado para todos os divisores */
  .signal-divider {
    border-color: rgba(255, 255, 255, 0.05);
  }

  /* Estilo para tags/badges */
  .signal-badge {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);
  }

  /* Estilo para as caixas de informação */
  .signal-info-box {
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
  }
  
  /* Classes específicas para a página de sinais */
  .signals-page-light-accent {
    position: absolute;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.01) 0%, rgba(0,0,0,0) 70%);
    animation: subtleBreathing 4s infinite ease-in-out;
    z-index: 0;
  }
  
  .signals-page-color-accent {
    position: absolute;
    width: 350px;
    height: 350px;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.03;
    z-index: 0;
    animation: subtleBreathing 7s infinite ease-in-out alternate;
  }
  
  .floating-element {
    animation: slowFloat 5s ease-in-out infinite;
  }
  
  /* Classe específica para os cartões da página de sinais */
  .signals-page-card-glass {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
  }
  
  .signals-page-card-glass:hover {
    background: rgba(5, 5, 10, 0.65);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.05);
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
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.04), transparent);
    animation: shimmer 3s infinite;
    transform: skewX(-20deg);
    z-index: 1;
  }
  
  @keyframes shimmer {
    0% { left: -150%; }
    100% { left: 150%; }
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5rem 2rem;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 1rem;
    backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.03);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    animation: glowPulse 3s ease-in-out infinite;
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

// Adicionar a propriedade para o TypeScript no nível superior do arquivo
declare global {
  interface Window {
    _cacheDailySignals?: PlaceholderSignal[];
  }
}

// Adicionar esta interface estendida para garantir que id é uma propriedade
interface SignalWithId extends TradingSignal {
  id: string;
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
  const [signalCompletionCount, setSignalCompletionCount] = useState<{wins: number, losses: number}>({wins: 0, losses: 0});
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [winCount, setWinCount] = useState<number>(0); // Contador de ganhos consecutivos
  const [totalCount, setTotalCount] = useState<number>(0); // Contador total de resultados
  const queryClient = useQueryClient();
  const [dashboardSignals, setDashboardSignals] = useState<TradingSignal[]>([]);
  
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
          if (!signal.gale2_time) return;
          
          const gale2Time = convertTimeStringToDate(signal.gale2_time);
          
          // Adicionar 1 minuto ao tempo de reentrada 2
          const completionTime = new Date(gale2Time);
          completionTime.setMinutes(completionTime.getMinutes() + 1);
          
          if (isAfter(now, completionTime)) {
            console.log(`Sinal ID: ${signal.id} (${signal.symbol}) completado às ${now.toLocaleTimeString()}`);
            console.log(`Tempo de expiração era: ${completionTime.toLocaleTimeString()}`);
            
            // Calcular se este sinal deve ser ganho ou perda, mantendo a proporção de 10:1
            let result: 'win' | 'loss';
            const updatedTotalCount = totalCount + 1;
            
            // Se tivermos WIN_LOSS_RATIO ganhos consecutivos, o próximo deve ser perda
            if (winCount >= WIN_LOSS_RATIO) {
              result = 'loss';
              setWinCount(0); // Resetar contagem de ganhos
              console.log(`Resultado: LOSS após ${WIN_LOSS_RATIO} ganhos consecutivos. Resetando contador.`);
            } else {
              result = 'win';
              const newWinCount = winCount + 1;
              setWinCount(newWinCount); // Incrementar contador de ganhos
              console.log(`Resultado: WIN (${newWinCount}/${WIN_LOSS_RATIO} consecutivos)`);
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
            
            // Agendar a rotação dos sinais após a animação (5 segundos)
            console.log(`Agendando rotação do sinal ID: ${signal.id} em 5 segundos`);
            const signalIdToRotate = signal.id;
            setTimeout(() => {
              rotateSignals(signalIdToRotate);
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
  }, [completedSignals, queryClient, convertTimeStringToDate, winCount, totalCount]);

  // Função para rotacionar os sinais quando um é completado
  const rotateSignals = useCallback((completedSignalId: string) => {
    const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']) || [];
    
    // Se não há sinais suficientes, não fazer nada
    if (currentSignals.length < 4) return;
    
    console.log(`Rotacionando sinais após completar o sinal ID: ${completedSignalId}`);
    
    // Identificar todos os sinais, separando os da dashboard (que devem ser preservados)
    const dashboardIds = dashboardSignals.map(s => s.id);
    
    // Vamos rotacionar apenas os sinais não-dashboard
    const dashboardSignalsInList = currentSignals.filter(s => dashboardIds.includes(s.id));
    let otherSignals = currentSignals.filter(s => !dashboardIds.includes(s.id));
    
    // Encontrar o índice do sinal completado
    const completedIndex = otherSignals.findIndex(s => s.id === completedSignalId);
    
    // Se o sinal completado não foi encontrado entre os sinais não-dashboard, não fazer nada
    if (completedIndex === -1) {
      console.log('Sinal completado não encontrado na lista de sinais não-dashboard.');
      return;
    }
    
    // Verificar se o sinal completado é o último da lista
    const isLastSignal = completedIndex === otherSignals.length - 1;
    
    // Se for o último sinal, não rotacionar para manter estabilidade
    if (isLastSignal) {
      console.log('Sinal completado é o último da lista. Não será rotacionado para manter estabilidade.');
      
      // Apenas marcar como processado sem remover
      const updatedSignals = [...currentSignals];
      const signalIndex = updatedSignals.findIndex(s => s.id === completedSignalId);
      
      if (signalIndex !== -1) {
        updatedSignals[signalIndex] = {
          ...updatedSignals[signalIndex],
          processed: true
        };
        
        // Atualizar o cache
        queryClient.setQueryData(['tradingSignals'], updatedSignals);
      }
      
      // Limpar o sinal do estado de completados
      setCompletedSignals(prev => {
        const updated = {...prev};
        delete updated[completedSignalId];
        return updated;
      });
      
      // Limpar da lista de remoção
      setSignalsToRemove(prev => prev.filter(id => id !== completedSignalId));
      
      return;
    }
    
    console.log(`Removendo o sinal completado na posição ${completedIndex} da lista de sinais não-dashboard.`);
    
    // Lógica de rotação: remover o sinal completado e mover todos um nível acima
    otherSignals.splice(completedIndex, 1);
    
    // Gerar um novo horário para o sinal adicional seguindo o padrão XX:03, XX:23, XX:43
    const now = new Date();
    const validMinutes = [3, 23, 43];
    
    // Encontrar o último horário usado nos sinais existentes (combinando dashboard e outros)
    const allExistingSignals = [...dashboardSignalsInList, ...otherSignals];
    const existingTimes = allExistingSignals
      .map(s => s.entry_time || '')
      .filter(time => time !== '');
    
    // Ordenar por horário crescente
    existingTimes.sort((a, b) => a.localeCompare(b));
    
    // Pegar o último horário (mais distante no futuro)
    const lastTime = existingTimes.length > 0 ? existingTimes[existingTimes.length - 1] : null;
    
    let nextHour, nextMinute;
    
    if (lastTime) {
      // Se temos um último horário, gerar o próximo após ele
      const [lastHour, lastMinutes] = lastTime.split(':').map(Number);
      
      // Determinar qual é o próximo minuto válido após o último
      const lastMinuteIndex = validMinutes.findIndex(m => m === lastMinutes);
      
      if (lastMinuteIndex !== -1) {
        // Se encontramos o último minuto na lista, pegar o próximo
        const nextMinuteIndex = (lastMinuteIndex + 1) % validMinutes.length;
        nextMinute = validMinutes[nextMinuteIndex];
        
        // Se voltamos ao início da lista, avançar uma hora
        if (nextMinuteIndex === 0) {
          nextHour = (lastHour + 1) % 24;
        } else {
          nextHour = lastHour;
        }
      } else {
        // Se não encontramos (o que não deveria acontecer), usar o próximo valor após o último minuto
        let foundNext = false;
        nextHour = lastHour;
        
        for (const minute of validMinutes) {
          if (minute > lastMinutes) {
            nextMinute = minute;
            foundNext = true;
            break;
          }
        }
        
        if (!foundNext) {
          // Se não encontramos um minuto maior, avançar para a próxima hora
          nextHour = (lastHour + 1) % 24;
          nextMinute = validMinutes[0];
        }
      }
    } else {
      // Se não temos um último horário, usar o próximo horário válido a partir de agora
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Encontrar o próximo minuto válido
      let foundNext = false;
      nextHour = currentHour;
      
      for (const minute of validMinutes) {
        if (minute > currentMinute) {
          nextMinute = minute;
          foundNext = true;
          break;
        }
      }
      
      if (!foundNext) {
        // Se não encontramos um minuto válido na hora atual, ir para a próxima hora
        nextHour = (currentHour + 1) % 24;
        nextMinute = validMinutes[0];
      }
    }
    
    // Formatar o novo horário de entrada
    const newEntryTime = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;
    
    // Calcular os horários de expiração e reentradas
    const expiryTime = calculateNextTime(newEntryTime, SIGNAL_EXPIRY_TIME); // Expiração = entrada + 5 min
    const gale1Time = expiryTime; // Reentrada 1 = expiração
    const gale2Time = calculateNextTime(gale1Time, SIGNAL_EXPIRY_TIME); // Reentrada 2 = reentrada 1 + 5 min
    
    console.log(`Criando novo sinal com horário de entrada: ${newEntryTime}, expiração: ${expiryTime}, gale1: ${gale1Time}, gale2: ${gale2Time}`);
    
    // Criar um novo sinal
    const baseSignal = otherSignals[0] || dashboardSignalsInList[0];
    
    // Selecionar um ativo aleatório não usado ainda
    const usedAssets = new Set(allExistingSignals.map(s => s.symbol));
    const availableAssets = Object.keys(ATIVOS_CATEGORIAS).filter(asset => !usedAssets.has(asset));
    const newAsset = availableAssets.length > 0 
      ? availableAssets[Math.floor(Math.random() * availableAssets.length)]
      : getRandomAsset(); // Fallback para qualquer ativo se todos já estiverem usados
    
    // Gerar um ID estável baseado no horário e no ativo
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const stableId = `rotated_signal_${newEntryTime.replace(':', '')}_${newAsset.replace(/[^a-zA-Z0-9]/g, '_')}_${seed}`;
    
    const newSignal = {
      ...baseSignal,
      id: stableId,
      symbol: newAsset,
      exchange: ATIVOS_CATEGORIAS[newAsset] || "Digital",
      entry_time: newEntryTime,
      expiry_time_str: expiryTime,
      gale1_time: gale1Time,
      gale2_time: gale2Time,
      signal: Math.random() > 0.5 ? 'BUY' as const : 'SELL' as const,
      strength: Math.random() > 0.7 ? SignalStrength.STRONG : (Math.random() > 0.5 ? SignalStrength.MODERATE : SignalStrength.WEAK),
      processed: false,
      result: undefined,
      isAnimating: false,
      status: 'active' as const
    };
    
    // Adicionar o novo sinal à lista
    otherSignals.push(newSignal);
    
    // Ordenar os sinais por horário de entrada
    otherSignals.sort((a, b) => {
      const timeA = a.entry_time || '00:00';
      const timeB = b.entry_time || '00:00';
      return timeA.localeCompare(timeB);
    });
    
    // Combinar os sinais da dashboard com os restantes (garantindo dashboard sempre no início)
    const updatedSignals = [...dashboardSignalsInList, ...otherSignals];
    
    // Limitar a 7 sinais no total
    const finalSignals = updatedSignals.slice(0, 7);
    
    console.log(`Lista final com ${finalSignals.length} sinais (${dashboardSignalsInList.length} da dashboard + ${finalSignals.length - dashboardSignalsInList.length} não-dashboard)`);
    
    // Atualizar o cache
    queryClient.setQueryData(['tradingSignals'], finalSignals);
    
    // Limpar o sinal do estado de completados
    setCompletedSignals(prev => {
      const updated = {...prev};
      delete updated[completedSignalId];
      return updated;
    });
    
    // Limpar da lista de remoção
    setSignalsToRemove(prev => prev.filter(id => id !== completedSignalId));
  }, [queryClient, dashboardSignals, calculateNextTime, getRandomAsset]);
  
  // Adicionar função para reiniciar contadores quando a página é carregada
  useEffect(() => {
    setSignalCompletionCount({wins: 0, losses: 0});
    
    // Definir filtros padrão: mostrar todos os tipos e não mostrar expirados
    setFilterType('ALL');
    setShowExpiredSignals(false);
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
    // Este código foi substituído pela função rotateSignals
    // que gerencia toda a lógica de rotação de sinais
  }, []);
  
  // Função para gerar a sequência de sinais para o dia todo, começando à meia-noite
  const generateDailySignals = useCallback((): PlaceholderSignal[] => {
    // Verificar se já temos sinais gerados em cache de memória
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
    
    if (signalCache && signalCache.signals.length > 0 && signalCache.date === todayStr) {
      console.log('Usando sinais em cache de memória');
      return signalCache.signals;
    }
    
    console.log('Gerando sinais para o dia todo...');
    const dailySignals: PlaceholderSignal[] = [];
    
    // Definir os minutos para os horários de entrada (XX:03, XX:23, XX:43)
    const validMinutes = ['03', '23', '43'];
    
    // Usar semente para geração aleatória baseada no dia atual
    // Isso garante que os sinais serão os mesmos para o dia todo
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const seededRandom = (max: number) => {
      const x = Math.sin(seed + dailySignals.length) * 10000;
      return Math.floor((x - Math.floor(x)) * max);
    };
    
    // Criar um conjunto para rastrear ativos já usados
    const usedAssets = new Set<string>();
    
    // Manter um registro dos horários já usados para evitar repetições
    const usedTimeSlots = new Map<string, Set<string>>();
    
    // Definir o número de sinais a gerar por horário (3 sinais por horário)
    const signalsPerTimeSlot = 3;
    
    // Iniciar com um horário padrão (hora atual com o primeiro minuto válido)
    let currentHour = today.getHours();
    let currentMinuteIndex = 0;
    
    // Garantir que usamos o próximo horário válido a partir da hora atual
    const currentMinute = today.getMinutes();
    
    // Encontrar o próximo horário válido
    let foundValidTime = false;
    
    // Primeiro verificar minutos na hora atual
    for (let i = 0; i < validMinutes.length; i++) {
      if (parseInt(validMinutes[i]) > currentMinute) {
        currentMinuteIndex = i;
        foundValidTime = true;
        break;
      }
    }
    
    // Se não encontrou na hora atual, usar o primeiro minuto da próxima hora
    if (!foundValidTime) {
      currentHour = (currentHour + 1) % 24;
      currentMinuteIndex = 0;
    }
    
    // Gerar 24 sinais sequenciais progredindo nos horários
    const totalSignals = 24; // Limitar a 24 sinais para manter a interface limpa
    
    for (let i = 0; i < totalSignals; i++) {
      // Formatar o horário atual
      const entryHour = currentHour.toString().padStart(2, '0');
      const entryMinute = validMinutes[currentMinuteIndex];
      const entryTime = `${entryHour}:${entryMinute}`;
      
      // Calcular os horários de expiração e reentradas
      const expiryTime = calculateNextTime(entryTime, SIGNAL_EXPIRY_TIME); // Expiração = entrada + 5 min
      const gale1Time = expiryTime; // Reentrada 1 é igual ao horário de expiração
      const gale2Time = calculateNextTime(gale1Time, SIGNAL_EXPIRY_TIME); // Reentrada 2 = reentrada 1 + 5 min
      
      // Obter todos os ativos disponíveis que ainda não foram usados neste grupo de sinais
      const allAssets = Object.keys(ATIVOS_CATEGORIAS).filter(asset => !usedAssets.has(asset));
      
      // Se não houver mais ativos disponíveis, resetar a lista
      if (allAssets.length === 0) {
        usedAssets.clear();
        const allAssetsReset = Object.keys(ATIVOS_CATEGORIAS);
        
        // Selecionar um ativo aleatório
        const randomIndex = seededRandom(allAssetsReset.length);
        const symbol = allAssetsReset[randomIndex];
        usedAssets.add(symbol);
        
        // Criar um ID estável baseado no horário e no asset
        const stableId = `signal_${entryTime.replace(':', '')}_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}_${seed}_${i}`;
        
        // Gerar taxas de sucesso entre 80% e 93.4%
        const successRate = 0.80 + (seededRandom(100) / 100) * (0.934 - 0.80);
        
        // Determinar força do sinal com base na taxa de sucesso
        let strength;
        if (successRate >= 0.90) {
          strength = SignalStrength.VERY_STRONG; // Altíssima confiança (≥ 90%)
        } else if (successRate >= 0.85) {
          strength = SignalStrength.STRONG; // Alta confiança (≥ 85%)
        } else {
          strength = SignalStrength.MODERATE; // Média confiança (< 85%)
        }
        
        // Alternância entre COMPRA e VENDA baseada no índice
        const signalType = i % 2 === 0 ? 'BUY' : 'SELL';
        
        // Adicionar este sinal ao conjunto
        const signal = createBasePlaceholderData({
          id: stableId,
          symbol,
          exchange: ATIVOS_CATEGORIAS[symbol] || "Digital",
          signal: signalType,
          strength,
          entry_time: entryTime,
          timeframe: "5m", // Sempre 5 minutos
          expiry_time_str: expiryTime,
          gale1_time: gale1Time,
          gale2_time: gale2Time,
          success_rate: successRate
        });
        
        dailySignals.push(signal);
      } else {
        // Selecionar um ativo aleatório
        const randomIndex = seededRandom(allAssets.length);
        const symbol = allAssets[randomIndex];
        usedAssets.add(symbol);
        
        // Criar um ID estável baseado no horário e no asset
        const stableId = `signal_${entryTime.replace(':', '')}_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}_${seed}_${i}`;
        
        // Gerar taxas de sucesso entre 80% e 93.4%
        const successRate = 0.80 + (seededRandom(100) / 100) * (0.934 - 0.80);
        
        // Determinar força do sinal com base na taxa de sucesso
        let strength;
        if (successRate >= 0.90) {
          strength = SignalStrength.VERY_STRONG; // Altíssima confiança (≥ 90%)
        } else if (successRate >= 0.85) {
          strength = SignalStrength.STRONG; // Alta confiança (≥ 85%)
        } else {
          strength = SignalStrength.MODERATE; // Média confiança (< 85%)
        }
        
        // Alternância entre COMPRA e VENDA baseada no índice
        const signalType = i % 2 === 0 ? 'BUY' : 'SELL';
        
        // Adicionar este sinal ao conjunto
        const signal = createBasePlaceholderData({
          id: stableId,
          symbol,
          exchange: ATIVOS_CATEGORIAS[symbol] || "Digital",
          signal: signalType,
          strength,
          entry_time: entryTime,
          timeframe: "5m", // Sempre 5 minutos
          expiry_time_str: expiryTime,
          gale1_time: gale1Time,
          gale2_time: gale2Time,
          success_rate: successRate
        });
        
        dailySignals.push(signal);
      }
      
      // Avançar para o próximo horário válido
      currentMinuteIndex = (currentMinuteIndex + 1) % validMinutes.length;
      
      // Se voltamos ao primeiro minuto, avançar para a próxima hora
      if (currentMinuteIndex === 0) {
        currentHour = (currentHour + 1) % 24;
      }
    }
    
    console.log(`Gerados ${dailySignals.length} sinais para o dia`);
    
    // Armazenar em cache de memória
    signalCache = {
      signals: dailySignals,
      date: todayStr
    };
    
    return dailySignals;
  }, [calculateNextTime]);
  
  // Filtrar os sinais mais relevantes para o horário atual
  const filterRelevantSignals = useCallback((allSignals: PlaceholderSignal[]): PlaceholderSignal[] => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    console.log(`Filtrando sinais relevantes para o horário atual: ${currentTime}`);
    
    // Ordenar todos os sinais por horário
    const sortedSignals = [...allSignals].sort((a, b) => {
      if (!a.entry_time || !b.entry_time) return 0;
      
      // Converter para objetos Date para comparação
      const timeA = convertTimeStringToDate(a.entry_time);
      const timeB = convertTimeStringToDate(b.entry_time);
      
      return timeA.getTime() - timeB.getTime();
    });
    
    // Criar um mapa dos sinais por horário de entrada
    const signalsByTime = new Map<string, PlaceholderSignal[]>();
    
    // Agrupar sinais por horário de entrada
    sortedSignals.forEach(signal => {
      if (!signal.entry_time) return;
      
      if (!signalsByTime.has(signal.entry_time)) {
        signalsByTime.set(signal.entry_time, []);
      }
      
      signalsByTime.get(signal.entry_time)?.push(signal);
    });
    
    // Verificar se há horários com múltiplos sinais e ajustá-los
    signalsByTime.forEach((signals, time) => {
      // Se houver mais de um sinal no mesmo horário, ajustar os horários
      if (signals.length > 1) {
        console.log(`Detectados ${signals.length} sinais no mesmo horário ${time}. Ajustando...`);
        
        // Manter o primeiro sinal com o horário original
        // Para os demais, incrementar 20 minutos para cada
        for (let i = 1; i < signals.length; i++) {
          const [hours, minutes] = time.split(':').map(Number);
          let newMinutes = minutes + (i * 20);
          let newHours = hours;
          
          // Ajustar para próxima hora se necessário
          while (newMinutes >= 60) {
            newHours = (newHours + 1) % 24;
            newMinutes -= 60;
          }
          
          // Verificar o último dígito e ajustar para 03, 23 ou 43
          const validMinutes = ['03', '23', '43'];
          const lastDigit = newMinutes % 10;
          
          // Encontrar o minuto válido mais próximo
          let nextValidMinute = 3; // Padrão: usar XX:03
          
          if (lastDigit < 3) {
            nextValidMinute = 3;
          } else if (lastDigit >= 3 && lastDigit < 23) {
            nextValidMinute = 23;
          } else {
            nextValidMinute = 43;
          }
          
          // Ajustar para o minuto válido mais próximo
          newMinutes = Math.floor(newMinutes / 10) * 10 + nextValidMinute;
          
          // Verificar novamente se passou da hora
          if (newMinutes >= 60) {
            newHours = (newHours + 1) % 24;
            newMinutes -= 60;
          }
          
                      // Verificar se este novo horário já existe
            let finalTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
            if (signalsByTime.has(finalTime)) {
              // Se já existe sinal neste horário, tentar o próximo horário válido
              let found = false;
              for (let attempt = 0; attempt < 24 && !found; attempt++) {
                // Buscar o próximo horário válido
                let nextIndex = validMinutes.findIndex(min => parseInt(min) === newMinutes % 100);
                if (nextIndex === -1) {
                  // Se não encontrado, usar o próximo válido acima
                  for (let j = 0; j < validMinutes.length; j++) {
                    if (parseInt(validMinutes[j]) > newMinutes % 100) {
                      nextIndex = j;
                      break;
                    }
                  }
                  // Se nenhum for maior, usar o primeiro da próxima hora
                  if (nextIndex === -1) {
                    newHours = (newHours + 1) % 24;
                    nextIndex = 0;
                  }
                } else {
                  // Usar o próximo na sequência
                  nextIndex = (nextIndex + 1) % validMinutes.length;
                  if (nextIndex === 0) {
                    newHours = (newHours + 1) % 24;
                  }
                }
                
                newMinutes = parseInt(validMinutes[nextIndex]);
                const testTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
                
                if (!signalsByTime.has(testTime)) {
                  finalTime = testTime;
                  found = true;
                  break;
                }
              }
            }
          
                      // Atualizar o horário do sinal
            signals[i].entry_time = finalTime;
            
            // Adicionar o sinal com o novo horário ao mapa
            if (!signalsByTime.has(finalTime)) {
              signalsByTime.set(finalTime, []);
            }
            signalsByTime.get(finalTime)?.push(signals[i]);
            
            // Remover o sinal da lista original para evitar duplicidade
            const originalList = signalsByTime.get(time) || [];
            const updatedList = originalList.filter(s => s !== signals[i]);
            signalsByTime.set(time, updatedList);
            
            // Recalcular horários de expiração e reentradas
            signals[i].expiry_time_str = calculateNextTime(finalTime, SIGNAL_EXPIRY_TIME);
            signals[i].gale1_time = signals[i].expiry_time_str;
            signals[i].gale2_time = calculateNextTime(signals[i].gale1_time, SIGNAL_EXPIRY_TIME);
            
            console.log(`Sinal ajustado: ${signals[i].symbol} movido de ${time} para ${finalTime}`);
        }
      }
    });
    
    // Reconstruir a lista de sinais ajustados
    const adjustedSignals: PlaceholderSignal[] = [];
    signalsByTime.forEach(signals => {
      adjustedSignals.push(...signals);
    });
    
    // Reordenar por horário após ajustes
    adjustedSignals.sort((a, b) => {
      if (!a.entry_time || !b.entry_time) return 0;
      
      // Converter para objetos Date para comparação
      const timeA = convertTimeStringToDate(a.entry_time);
      const timeB = convertTimeStringToDate(b.entry_time);
      
      return timeA.getTime() - timeB.getTime();
    });
    
    // Encontrar os sinais mais próximos do horário atual
    const relevantSignals: PlaceholderSignal[] = [];
    const nowTime = now.getTime();
    
    // Primeiro, procurar por sinais futuros (ainda não ocorreram)
    const futureSignals = adjustedSignals.filter(signal => {
      if (!signal.entry_time) return false;
      const signalTime = convertTimeStringToDate(signal.entry_time).getTime();
      return signalTime > nowTime;
    });
    
    // Depois, procurar por sinais passados (últimas 2 horas)
    const recentPastSignals = adjustedSignals.filter(signal => {
      if (!signal.entry_time) return false;
      const signalTime = convertTimeStringToDate(signal.entry_time).getTime();
      const hoursDiff = (nowTime - signalTime) / (1000 * 60 * 60);
      return signalTime <= nowTime && hoursDiff <= 2;
    });
    
    // Adicionar primeiro os mais recentes do passado (últimos 3)
    relevantSignals.push(...recentPastSignals.slice(-3));
    
    // Adicionar os próximos 4 sinais do futuro
    relevantSignals.push(...futureSignals.slice(0, 4));
    
    // Limitar a 7 sinais no total e ordenar novamente por horário de entrada
    const result = relevantSignals.slice(0, 7).sort((a, b) => {
      if (!a.entry_time || !b.entry_time) return 0;
      
      // Extrair hora e minutos
      const [aHour, aMin] = a.entry_time.split(':').map(Number);
      const [bHour, bMin] = b.entry_time.split(':').map(Number);
      
      // Converter para minutos totais para facilitar a comparação
      const aTotalMinutes = aHour * 60 + aMin;
      const bTotalMinutes = bHour * 60 + bMin;
      
      // Ordenar crescente
      return aTotalMinutes - bTotalMinutes;
    });
    
    console.log(`Retornando ${result.length} sinais relevantes após ajustes`);
    
    // Verificação final para garantir que não há duplicatas nos horários de entrada
    const finalTimes = new Set<string>();
    const finalSignals: PlaceholderSignal[] = [];
    
    for (const signal of result) {
      if (!signal.entry_time) {
        finalSignals.push(signal);
        continue;
      }
      
      if (finalTimes.has(signal.entry_time)) {
        console.log(`Ainda existe duplicata no horário ${signal.entry_time}, ajustando novamente...`);
        
        // Ajustar o horário para o próximo válido
        const [hours, minutes] = signal.entry_time.split(':').map(Number);
        let newHours = hours;
        let newMinutes = minutes;
        const validMinutes = ['03', '23', '43'];
        
        // Encontrar o próximo horário válido que não está em uso
        let nextTimeFound = false;
        
        for (let attempt = 0; attempt < 24 && !nextTimeFound; attempt++) {
          // Avançar para o próximo slot de tempo válido
          let currentIndex = validMinutes.findIndex(m => parseInt(m) === newMinutes);
          if (currentIndex === -1) {
            // Se não encontramos o minuto na lista de válidos, usar o próximo maior
            for (let j = 0; j < validMinutes.length; j++) {
              if (parseInt(validMinutes[j]) > newMinutes) {
                currentIndex = j - 1; // Usar o anterior para que o próximo seja esse
                break;
              }
            }
            // Se nenhum for maior, usar o último
            if (currentIndex === -1) currentIndex = validMinutes.length - 1;
          }
          
          // Avançar para o próximo minuto válido
          const nextIndex = (currentIndex + 1) % validMinutes.length;
          newMinutes = parseInt(validMinutes[nextIndex]);
          
          // Se voltamos ao primeiro minuto válido, avançar uma hora
          if (nextIndex === 0) {
            newHours = (newHours + 1) % 24;
          }
          
          // Formatar o novo horário
          const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
          
          // Verificar se este novo horário está disponível
          if (!finalTimes.has(newTime)) {
            // Atualizar o sinal
            signal.entry_time = newTime;
            signal.expiry_time_str = calculateNextTime(newTime, SIGNAL_EXPIRY_TIME);
            signal.gale1_time = signal.expiry_time_str;
            signal.gale2_time = calculateNextTime(signal.gale1_time, SIGNAL_EXPIRY_TIME);
            console.log(`Sinal ajustado para ${newTime}`);
            nextTimeFound = true;
          }
        }
      }
      
      finalTimes.add(signal.entry_time);
      finalSignals.push(signal);
    }
    
    return finalSignals;
  }, [calculateNextTime, convertTimeStringToDate]);

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
    // Referência para o último timestamp em que atualizamos os sinais
    let lastUpdateTimestamp = 0;
    
    // Função para atualizar os sinais baseado no horário atual
    const updateSignalsBasedOnTime = async () => {
      const now = new Date();
      const currentTimestamp = now.getTime();
      
      // Verificar se já se passou pelo menos 30 segundos desde a última atualização
      // Isso evita atualizações desnecessárias se o componente atualizar por outros motivos
      if (currentTimestamp - lastUpdateTimestamp < 30000) {
        console.log("Ignorando atualização, última atualização foi há menos de 30 segundos");
        return;
      }
      
      console.log("Atualizando sinais baseado na hora atual:", now.toLocaleTimeString());
      lastUpdateTimestamp = currentTimestamp;
      
      // Se já temos sinais em cache, verificar se precisamos atualizá-los
      const existingSignalsInCache = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']);
      
      if (existingSignalsInCache && existingSignalsInCache.length >= 7) {
        // Verificar se os horários ainda são relevantes antes de buscar novos sinais
        // Só atualizar se o minuto mudou e estamos no padrão de tempo correto (XX:03, XX:23, XX:43)
        const currentMinute = now.getMinutes();
        const lastMinute = Math.floor(lastUpdateTimestamp / 60000) % 60;
        
        // Verificar se estamos em um minuto de atualização (3, 23, 43)
        const isUpdateMinute = [3, 23, 43].includes(currentMinute);
        
        if (currentMinute === lastMinute || !isUpdateMinute) {
          console.log("Sinais ainda são relevantes ou não estamos em minuto de atualização, ignorando atualização");
          return;
        }
      }
      
      // Se chegou até aqui, obter novos sinais mas preservando os últimos
      // para evitar atualizações constantes
      const currentSignals = await getDailySignalsForCurrentTime();
      
      // Obter sinais existentes novamente (podem ter mudado desde a verificação acima)
      const existingSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']) || [];
      
      // Se já temos sinais, preservar o último para evitar atualizações constantes
      if (existingSignals.length >= 7) {
        // Preservar o último sinal
        const lastSignal = existingSignals[existingSignals.length - 1];
        
        // Combinar os novos sinais (exceto o último) com o último sinal preservado
        const combinedSignals = [...currentSignals.slice(0, -1), lastSignal];
        
        // Atualizar o cache
        queryClient.setQueryData(['tradingSignals'], combinedSignals);
      } else {
        // Se não temos sinais suficientes, usar os novos normalmente
      queryClient.setQueryData(['tradingSignals'], currentSignals);
      }
    };
    
    // Definir intervalo para checar se precisamos mudar os sinais mostrados
    // Aumentar para 120 segundos (2 minutos) para reduzir atualizações desnecessárias
    const intervalId = setInterval(updateSignalsBasedOnTime, 120 * 1000);
    
    // Chamar imediatamente na montagem, mas com um pequeno delay
    // para evitar múltiplas chamadas simultâneas durante a inicialização
    const initialTimeoutId = setTimeout(updateSignalsBasedOnTime, 500);
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(initialTimeoutId);
    };
  }, [getDailySignalsForCurrentTime, queryClient]);

  // Atualizar o horário atual constantemente com intervalo maior
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date());
    };
    
    // Atualizar a cada 5 segundos em vez de cada segundo
    // Isso reduz o número de renderizações desnecessárias
    const timeInterval = setInterval(updateTime, 5000);
    
    // Chamar imediatamente
    updateTime();
    
    return () => clearInterval(timeInterval);
  }, []);

  // Criar dados base para cada placeholder signal
  const createBasePlaceholderData = (override: Partial<PlaceholderSignal> = {}): PlaceholderSignal => ({
    id: 'placeholder-' + Math.random().toString(36).substring(2, 9),
    symbol: 'BTC/USD',
    exchange: 'Blitz',
    signal: 'BUY',
    status: 'active',
    strength: SignalStrengthEnum.MODERATE, // Default para média confiança
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
    success_rate: Math.random() * (0.93 - 0.80) + 0.80, // Taxa de sucesso entre 80% e 93%
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

  // Buscar os sinais da dashboard
  useEffect(() => {
    // Função para buscar os sinais da dashboard de localStorage
    const fetchDashboardSignals = () => {
      try {
        const cachedSignalsData = localStorage.getItem('dashboardSignals');
        if (cachedSignalsData) {
          const { signals } = JSON.parse(cachedSignalsData);
          if (signals && Array.isArray(signals) && signals.length > 0) {
            // Garantir que temos exatamente 3 sinais da dashboard
            const limitedSignals = signals.slice(0, 3);
            
            // Converter para o formato correto se necessário
            const formattedSignals = limitedSignals.map(signal => {
              // Garantir que todos os campos necessários estão presentes
              return {
                ...signal,
                id: signal.id || 'dashboard-' + Math.random().toString(36).substring(2, 9),
                status: 'active',
                success_rate: Math.min(signal.success_rate || 0.85, 0.934), // Limitar a 93.4%
                isDashboard: true // Marcar como sinal da dashboard
              };
            });
            
            setDashboardSignals(formattedSignals);
            
            // Se houver mais de 3, corrigir no localStorage
            if (signals.length > 3) {
              console.log(`Encontrados ${signals.length} sinais na dashboard. Limitando para 3.`);
              localStorage.setItem('dashboardSignals', JSON.stringify({
                signals: limitedSignals,
                timestamp: new Date().getTime()
              }));
            }
            
            console.log("Sinais da dashboard carregados:", formattedSignals);
            return;
          }
        }
        setDashboardSignals([]);
      } catch (error) {
        console.error('Erro ao buscar sinais da dashboard:', error);
        setDashboardSignals([]);
      }
    };

    fetchDashboardSignals();

    // Verificar por atualizações a cada 30 segundos
    const interval = setInterval(fetchDashboardSignals, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Função para garantir que temos 7 sinais, incluindo os 3 da dashboard
  const ensureSevenSignals = (signalsInput: TradingSignal[] | undefined): TradingSignal[] => {
    if (!signalsInput) signalsInput = [];
    
    // Criar uma cópia para evitar modificações no objeto original
    let signalsCopy = [...signalsInput];
    
    // Verificar se os sinais da dashboard têm os horários corretos (XX:03, XX:23, XX:43)
    const validMinutes = ['03', '23', '43'];
    
    // Verificar quantos sinais da dashboard já estão incluídos
    const dashboardIdsInInput = new Set(signalsInput.map(s => s.id));
    const dashboardIncluded = dashboardSignals.filter(s => dashboardIdsInInput.has(s.id));
    const dashboardToAdd = dashboardSignals.filter(s => !dashboardIdsInInput.has(s.id));
          
    // Se já temos sinais da dashboard incluídos, não modificá-los
    // Adicionar sinais da dashboard que ainda não estão incluídos, sem modificação
    signalsCopy = [...signalsCopy, ...dashboardToAdd];
      
    // Identificar os IDs dos sinais da dashboard para preservá-los
    const dashboardIds = new Set(dashboardSignals.map(s => s.id));
    
    // Mapear os horários já usados para evitar duplicatas
    const usedTimes = new Set<string>();
    signalsCopy.forEach(signal => {
      if (signal.entry_time) {
        usedTimes.add(signal.entry_time);
      }
    });
    
    // Completar até 7 sinais com horários únicos
    const finalSignals: TradingSignal[] = [];
    
    // Primeiro, adicionar todos os sinais da dashboard presentes (preservando-os exatamente como estão)
    const dashboardSignalsInCopy = signalsCopy.filter(s => dashboardIds.has(s.id as string));
    finalSignals.push(...dashboardSignalsInCopy);
    
    // Depois, adicionar os outros sinais até completar 7, ajustando horários se necessário
    const nonDashboardSignals = signalsCopy.filter(s => !dashboardIds.has(s.id as string));
    
    for (const signal of nonDashboardSignals) {
      // Se já temos 7 sinais, parar
      if (finalSignals.length >= 7) break;
      
      // Se o horário já está em uso, ajustar
      if (signal.entry_time && usedTimes.has(signal.entry_time)) {
        // Encontrar um novo horário único
        const now = new Date();
        const currHour = now.getHours();
        const currMinute = now.getMinutes();
        
        // Valores de minutos válidos (03, 23, 43)
        const validMinutes = [3, 23, 43];
        
        // Encontrar o próximo minuto válido disponível
        let foundValidTime = false;
        
        // Primeiro tentar horários na hora atual ou nas próximas 3 horas
        for (let h = 0; h < 4 && !foundValidTime; h++) {
          const checkHour = (currHour + h) % 24;
          
          for (const validMinute of validMinutes) {
            // Se estamos na hora atual, só considerar minutos futuros
            if (h === 0 && validMinute <= currMinute) {
              continue;
            }
            
            const checkTime = `${checkHour.toString().padStart(2, '0')}:${validMinute.toString().padStart(2, '0')}`;
            
            if (!usedTimes.has(checkTime)) {
              // Encontramos um horário disponível
              signal.entry_time = checkTime;
              usedTimes.add(checkTime);
              
              // Recalcular expiração e reentradas
              signal.expiry_time_str = calculateNextTime(checkTime, SIGNAL_EXPIRY_TIME);
              signal.gale1_time = signal.expiry_time_str;
              signal.gale2_time = calculateNextTime(signal.gale1_time, SIGNAL_EXPIRY_TIME);
              
              foundValidTime = true;
              break;
            }
          }
          
          if (foundValidTime) break;
        }
        
        // Se não encontrou nas próximas 3 horas, tentar nas 24 horas
        if (!foundValidTime) {
          for (let h = 0; h < 24 && !foundValidTime; h++) {
            const checkHour = (currHour + h) % 24;
            
            for (const validMinute of validMinutes) {
              // Se estamos na hora atual, só considerar minutos futuros
              if (h === 0 && validMinute <= currMinute) {
                continue;
              }
              
              const checkTime = `${checkHour.toString().padStart(2, '0')}:${validMinute.toString().padStart(2, '0')}`;
              
              if (!usedTimes.has(checkTime)) {
                // Encontramos um horário disponível
                signal.entry_time = checkTime;
                usedTimes.add(checkTime);
                
                // Recalcular expiração e reentradas
                signal.expiry_time_str = calculateNextTime(checkTime, SIGNAL_EXPIRY_TIME);
                signal.gale1_time = signal.expiry_time_str;
                signal.gale2_time = calculateNextTime(signal.gale1_time, SIGNAL_EXPIRY_TIME);
                
                foundValidTime = true;
                break;
              }
            }
            
            if (foundValidTime) break;
          }
        }
      } else if (signal.entry_time) {
        // O horário não está sendo usado, registrar
        usedTimes.add(signal.entry_time);
      } else {
        // Se não tem horário de entrada, criar um
        const now = new Date();
        const currHour = now.getHours();
        const currMinute = now.getMinutes();
        
        // Encontrar um horário não usado
        let foundUnusedTime = false;
        const validMinutes = [3, 23, 43];
        
        // Primeiro tentar horários na hora atual ou nas próximas 3 horas
        for (let h = 0; h < 4 && !foundUnusedTime; h++) {
          const checkHour = (currHour + h) % 24;
          
          for (const validMinute of validMinutes) {
            // Se estamos na hora atual, só considerar minutos futuros
            if (h === 0 && validMinute <= currMinute) {
              continue;
            }
            
            const checkTime = `${checkHour.toString().padStart(2, '0')}:${validMinute.toString().padStart(2, '0')}`;
            
            if (!usedTimes.has(checkTime)) {
              // Encontramos um horário disponível
              signal.entry_time = checkTime;
              usedTimes.add(checkTime);
              
              // Recalcular expiração e reentradas
              signal.expiry_time_str = calculateNextTime(checkTime, SIGNAL_EXPIRY_TIME);
              signal.gale1_time = signal.expiry_time_str;
              signal.gale2_time = calculateNextTime(signal.gale1_time, SIGNAL_EXPIRY_TIME);
              
              foundUnusedTime = true;
              break;
            }
          }
          
          if (foundUnusedTime) break;
        }
        
        // Se não encontrou nas próximas 3 horas, tentar nas 24 horas
        if (!foundUnusedTime) {
          for (let h = 0; h < 24 && !foundUnusedTime; h++) {
            const checkHour = (currHour + h) % 24;
            
            for (const validMinute of validMinutes) {
              // Se estamos na hora atual, só considerar minutos futuros
              if (h === 0 && validMinute <= currMinute) {
                continue;
              }
              
              const checkTime = `${checkHour.toString().padStart(2, '0')}:${validMinute.toString().padStart(2, '0')}`;
              
              if (!usedTimes.has(checkTime)) {
                // Encontramos um horário disponível
                signal.entry_time = checkTime;
                usedTimes.add(checkTime);
                
                // Recalcular expiração e reentradas
                signal.expiry_time_str = calculateNextTime(checkTime, SIGNAL_EXPIRY_TIME);
                signal.gale1_time = signal.expiry_time_str;
                signal.gale2_time = calculateNextTime(signal.gale1_time, SIGNAL_EXPIRY_TIME);
                
                foundUnusedTime = true;
                break;
              }
            }
            
            if (foundUnusedTime) break;
          }
        }
      }
      
      // Adicionar à lista final
      finalSignals.push(signal);
    }
    
    // Se ainda não temos 7 sinais, gerar novos
    while (finalSignals.length < 7) {
      // Gerar um novo sinal com horário único
      const now = new Date();
      const currHour = now.getHours();
      const currMinute = now.getMinutes();
      
      // Determinar o próximo horário válido a partir da hora atual
      const validMinutes = [3, 23, 43];
      
      // Encontrar um horário não usado a partir do horário atual
      let entryTime = "";
      let foundUnusedTime = false;
      
      // Primeiro tentar encontrar um horário válido na hora atual
      // ou nas próximas 3 horas (mais relevante para o usuário)
      for (let h = 0; h < 4; h++) {
        const checkHour = (currHour + h) % 24;
        
        for (const validMinute of validMinutes) {
          // Se estamos na hora atual, só considerar minutos futuros
          if (h === 0 && validMinute <= currMinute) {
            continue;
          }
          
          const checkTime = `${checkHour.toString().padStart(2, '0')}:${validMinute.toString().padStart(2, '0')}`;
          
          if (!usedTimes.has(checkTime)) {
            entryTime = checkTime;
            usedTimes.add(checkTime);
            foundUnusedTime = true;
            break;
          }
        }
        
        if (foundUnusedTime) break;
      }
      
      // Se não encontrou nas próximas 3 horas, procurar nas próximas 24 horas
      if (!foundUnusedTime) {
        for (let h = 0; h < 24; h++) {
          const checkHour = (currHour + h) % 24;
          
          for (const validMinute of validMinutes) {
            // Se estamos na hora atual, só considerar minutos futuros
            if (h === 0 && validMinute <= currMinute) {
              continue;
            }
            
            const checkTime = `${checkHour.toString().padStart(2, '0')}:${validMinute.toString().padStart(2, '0')}`;
            
            if (!usedTimes.has(checkTime)) {
              entryTime = checkTime;
              usedTimes.add(checkTime);
              foundUnusedTime = true;
              break;
            }
          }
          
          if (foundUnusedTime) break;
        }
      }
      
      // Calcular os demais horários
      const expiryTime = calculateNextTime(entryTime, SIGNAL_EXPIRY_TIME);
      const gale1Time = expiryTime;
      const gale2Time = calculateNextTime(gale1Time, SIGNAL_EXPIRY_TIME);
      
      // Criar um novo sinal
      const newSignal: TradingSignal = {
        id: `generated-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        symbol: getRandomAsset(),
        exchange: "Digital",
        signal: Math.random() > 0.5 ? 'BUY' : 'SELL',
        status: 'active',
        type: SignalType.TECHNICAL,
        reason: 'Análise técnica',
        strength: SignalStrength.MODERATE,
        timestamp: Date.now(),
        price: 100,
        entry_price: 100,
        stop_loss: 90,
        target_price: 110,
        success_rate: 0.85 + (Math.random() * 0.07),
        timeframe: "5m",
        expiry: new Date().toISOString(),
        risk_reward: "1:2",
        entry_time: entryTime,
        expiry_time_str: expiryTime,
        gale1_time: gale1Time,
        gale2_time: gale2Time
      };
      
      finalSignals.push(newSignal);
    }
    
    // Ordenar sinais, garantindo que os da dashboard vêm primeiro
    finalSignals.sort((a, b) => {
      // Verificar se são sinais da dashboard
      const aIsDashboard = dashboardIds.has(a.id as string);
      const bIsDashboard = dashboardIds.has(b.id as string);
      
      // Dashboard sempre primeiro
      if (aIsDashboard && !bIsDashboard) return -1;
      if (!aIsDashboard && bIsDashboard) return 1;
      
      // Se ambos são da dashboard ou nenhum é, ordenar por horário
      if (!a.entry_time || !b.entry_time) return 0;
        
      const [aHour, aMin] = a.entry_time.split(':').map(Number);
      const [bHour, bMin] = b.entry_time.split(':').map(Number);
        
      const aTotalMinutes = aHour * 60 + aMin;
      const bTotalMinutes = bHour * 60 + bMin;
        
      return aTotalMinutes - bTotalMinutes;
    });
    
    // Limitar a exatamente 7 sinais, preservando os da dashboard
    // Primeiro os sinais da dashboard
    const dashboardInFinal = finalSignals.filter(s => dashboardIds.has(s.id as string));
    // Depois os outros, até completar 7
    const nonDashboardInFinal = finalSignals.filter(s => !dashboardIds.has(s.id as string));
    
    const result = [
      ...dashboardInFinal.slice(0, Math.min(dashboardInFinal.length, 3)),
      ...nonDashboardInFinal.slice(0, Math.max(0, 7 - dashboardInFinal.length))
    ];
    
    return result;
  };

  // Memorizar os IDs dos sinais para evitar recriação quando apenas a ordem muda
  const signalIds = useMemo(() => {
    return signals ? signals.map(s => s.id).join('|') : '';
  }, [signals]);
  
  // Filtragem de sinais por tipo
  const filteredSignals = useMemo(() => {
    if (!signals) return ensureSevenSignals([]);
    
    // Garantir que os 3 primeiros sinais sejam exatamente os da dashboard
    let finalSignals: TradingSignal[] = [];
    
    // Primeiro adicionar os sinais da dashboard sem nenhuma modificação
    if (dashboardSignals && dashboardSignals.length > 0) {
      // Adicionar os sinais da dashboard no início, exatamente como estão
      finalSignals = [...dashboardSignals];
      console.log(`Adicionados ${finalSignals.length} sinais da dashboard sem modificações`);
    }
    
    // Verificar a hora atual para filtrar horários passados
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Para os sinais restantes até completar 7, usar os sinais gerados
    if (signals) {
      const signalsArray = signals as TradingSignal[];
      
      // Filtrar para não incluir sinais que já estão na dashboard (por ID)
      const dashboardIds = new Set(finalSignals.map(s => s.id));
      let remainingSignals = signalsArray.filter(signal => !dashboardIds.has(signal.id));
      
      // Filtrar sinais ativos e com horários válidos (futuros ou recentes)
      remainingSignals = remainingSignals.filter(signal => {
        if (signal.status !== 'active') return false;
        
        // Se não tem horário de entrada, permitir (será ajustado depois)
        if (!signal.entry_time) return true;
        
        // Verificar se o horário é futuro ou passado
        const [hours, minutes] = signal.entry_time.split(':').map(Number);
        
        // Considerar horários futuros ou na mesma hora (se o minuto for maior)
        if (hours > currentHour) return true;
        if (hours === currentHour && minutes > currentMinute) return true;
        
        // Horários passados só são aceitos se forem muito recentes (até 30 minutos atrás)
        if (hours === currentHour && currentMinute - minutes <= 30) return true;
        if (hours === currentHour - 1 && minutes >= 30 && currentMinute <= 30) return true;
        
        // Outros horários passados são rejeitados
        return false;
      });
      
      // Mapear os horários já usados pelos sinais da dashboard
      const usedTimes = new Set<string>();
      finalSignals.forEach(signal => {
        if (signal.entry_time) {
          usedTimes.add(signal.entry_time);
        }
      });
      
      // Ajustar os horários dos sinais restantes para evitar duplicatas
      remainingSignals = remainingSignals.map(signal => {
        // Se o horário já está sendo usado, ajustar
        if (signal.entry_time && usedTimes.has(signal.entry_time)) {
          // Lógica de ajuste mantida igual
        } else if (signal.entry_time) {
          // Verificar se o horário é passado
          const [hours, minutes] = signal.entry_time.split(':').map(Number);
          const isPastTime = (hours < currentHour) || 
                            (hours === currentHour && minutes <= currentMinute);
          
          // Se for um horário passado, gerar um novo horário futuro
          if (isPastTime) {
            // Usar a lógica para encontrar o próximo horário válido
            const validMinutes = [3, 23, 43];
            let foundValidTime = false;
            
            // Procurar nas próximas 3 horas
            for (let h = 0; h < 4 && !foundValidTime; h++) {
              const checkHour = (currentHour + h) % 24;
              
              for (const validMinute of validMinutes) {
                // Se estamos na hora atual, só considerar minutos futuros
                if (h === 0 && validMinute <= currentMinute) {
                  continue;
                }
                
                const checkTime = `${checkHour.toString().padStart(2, '0')}:${validMinute.toString().padStart(2, '0')}`;
                
                if (!usedTimes.has(checkTime)) {
                  // Encontramos um horário disponível
                  signal.entry_time = checkTime;
                  usedTimes.add(checkTime);
                  
                  // Recalcular expiração e reentradas
                  signal.expiry_time_str = calculateNextTime(checkTime, SIGNAL_EXPIRY_TIME);
                  signal.gale1_time = signal.expiry_time_str;
                  signal.gale2_time = calculateNextTime(signal.gale1_time, SIGNAL_EXPIRY_TIME);
                  
                  foundValidTime = true;
                  break;
                }
              }
              
              if (foundValidTime) break;
            }
          } else {
            // Registrar este horário como usado
            usedTimes.add(signal.entry_time);
          }
        }
        
        return signal;
      });
    }
    
    // Se ainda não temos 7 sinais, gerar mais sinais
    if (finalSignals.length < 7) {
      // Usar a função ensureSevenSignals para completar, mas preservando os sinais da dashboard
      const dashboardOnly = finalSignals.slice(0, Math.min(finalSignals.length, 3));
      const withAdditional = ensureSevenSignals([...dashboardOnly]);
      
      // Garantir que não modificou os sinais da dashboard originais
      for (let i = 0; i < dashboardOnly.length; i++) {
        withAdditional[i] = dashboardOnly[i];
      }
      
      finalSignals = withAdditional;
    }
    
    // Verificação final: garantir 7 sinais sem horários duplicados
    const signalsByTime = new Map<string, TradingSignal[]>();
    const finalSignalsWithUniqueTime: TradingSignal[] = [];
    
    // Preservar os sinais da dashboard intactos (primeiros 3)
    const dashboardCount = Math.min(dashboardSignals.length, 3);
    finalSignalsWithUniqueTime.push(...finalSignals.slice(0, dashboardCount));
    
    // Mapear os horários já usados
    const usedTimes = new Set<string>();
    finalSignalsWithUniqueTime.forEach(signal => {
      if (signal.entry_time) usedTimes.add(signal.entry_time);
    });
    
    // Adicionar os sinais restantes, ajustando horários se necessário
    for (const signal of finalSignals.slice(dashboardCount)) {
      // Se o horário já está sendo usado, ajustar
      if (signal.entry_time && usedTimes.has(signal.entry_time)) {
        // Ajustar para um novo horário único
        const now = new Date();
        const currHour = now.getHours();
        const currMinute = now.getMinutes();
        
        // Valores de minutos válidos (03, 23, 43)
        const validMinutes = [3, 23, 43];
        
        // Encontrar o próximo minuto válido disponível
        let foundValidTime = false;
        
        // Primeiro tentar horários na hora atual ou nas próximas 3 horas
        for (let h = 0; h < 4 && !foundValidTime; h++) {
          const checkHour = (currHour + h) % 24;
          
          for (const validMinute of validMinutes) {
            // Se estamos na hora atual, só considerar minutos futuros
            if (h === 0 && validMinute <= currMinute) {
              continue;
            }
            
            const checkTime = `${checkHour.toString().padStart(2, '0')}:${validMinute.toString().padStart(2, '0')}`;
            
            if (!usedTimes.has(checkTime)) {
              // Encontramos um horário disponível
              signal.entry_time = checkTime;
              usedTimes.add(checkTime);
              
              // Recalcular expiração e reentradas
              signal.expiry_time_str = calculateNextTime(checkTime, SIGNAL_EXPIRY_TIME);
              signal.gale1_time = signal.expiry_time_str;
              signal.gale2_time = calculateNextTime(signal.gale1_time, SIGNAL_EXPIRY_TIME);
              
              foundValidTime = true;
              break;
            }
          }
          
          if (foundValidTime) break;
        }
        
        // Se não encontrou nas próximas 3 horas, tentar nas 24 horas
        if (!foundValidTime) {
          for (let h = 0; h < 24 && !foundValidTime; h++) {
            const checkHour = (currHour + h) % 24;
            
            for (const validMinute of validMinutes) {
              // Se estamos na hora atual, só considerar minutos futuros
              if (h === 0 && validMinute <= currMinute) {
                continue;
              }
              
              const checkTime = `${checkHour.toString().padStart(2, '0')}:${validMinute.toString().padStart(2, '0')}`;
              
              if (!usedTimes.has(checkTime)) {
                // Encontramos um horário disponível
                signal.entry_time = checkTime;
                usedTimes.add(checkTime);
                
                // Recalcular expiração e reentradas
                signal.expiry_time_str = calculateNextTime(checkTime, SIGNAL_EXPIRY_TIME);
                signal.gale1_time = signal.expiry_time_str;
                signal.gale2_time = calculateNextTime(signal.gale1_time, SIGNAL_EXPIRY_TIME);
                
                foundValidTime = true;
                break;
              }
            }
            
            if (foundValidTime) break;
          }
        }
      } else if (signal.entry_time) {
        // O horário não está sendo usado, registrar
        usedTimes.add(signal.entry_time);
      }
      
      finalSignalsWithUniqueTime.push(signal);
    }
    
    // Garantir que temos exatamente 7 sinais
    return finalSignalsWithUniqueTime.slice(0, 7);
  }, [signals, dashboardSignals, calculateNextTime, ensureSevenSignals]);

  // Paginação
  const indexOfLastSignal = activePage * signalsPerPage;
  const indexOfFirstSignal = indexOfLastSignal - signalsPerPage;
  
  // Ordenar novamente os sinais filtrados por horário de entrada antes de paginar
  const sortedFilteredSignals = [...filteredSignals].sort((a, b) => {
    // Fazer cast para acessar a propriedade entry_time
    const signalA = a as TradingSignal & { entry_time?: string };
    const signalB = b as TradingSignal & { entry_time?: string };
    
    if (!signalA.entry_time || !signalB.entry_time) return 0;
    
    // Extrair hora e minutos
    const [aHour, aMin] = signalA.entry_time.split(':').map(Number);
    const [bHour, bMin] = signalB.entry_time.split(':').map(Number);
    
    // Converter para minutos totais para facilitar a comparação
    const aTotalMinutes = aHour * 60 + aMin;
    const bTotalMinutes = bHour * 60 + bMin;
    
    // Ordenar crescente
    return aTotalMinutes - bTotalMinutes;
  });
  
  const paginatedSignals = sortedFilteredSignals.slice(indexOfFirstSignal, indexOfLastSignal);
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
      case SignalStrength.VERY_STRONG:
        return "text-green-200";
      case SignalStrength.STRONG:
        return "text-blue-200";
      case SignalStrength.MODERATE:
        return "text-yellow-200";
      case SignalStrength.WEAK:
        return "text-yellow-200"; // Mesmo para WEAK, usar a cor de MODERATE
      default:
        return "text-yellow-200";
    }
  };

  const getStrengthText = (strength: SignalStrengthEnum) => {
    switch (strength) {
      case SignalStrength.VERY_STRONG:
        return t('signals.strength.very_strong');
      case SignalStrength.STRONG:
        return t('signals.strength.strong');
      case SignalStrength.MODERATE:
        return t('signals.strength.moderate');
      case SignalStrength.WEAK:
        return t('signals.strength.weak');
      default:
        return t('signals.strength.moderate');
    }
  };

  // Substituir a verificação de sinal expirando pelo formato da taxa de sucesso
  const formatSuccessRate = (rate: number): string => {
    // Garantir que a taxa está entre 77% e 100%
    const validRate = Math.min(Math.max(rate || 0.77, 0.77), 1.0);
    // Formatação com uma casa decimal
    return `${(validRate * 100).toFixed(1)}%`;
  };

  // Efeito para limpar cache antigo na inicialização
  useEffect(() => {
    // Verificar se há sinais em cache e se estão desatualizados
    const cachedSignalsData = localStorage.getItem('dailyTradingSignals');
    const cachedDate = localStorage.getItem('dailyTradingSignalsDate');
    
    if (cachedSignalsData && cachedDate) {
      const cacheTime = new Date(cachedDate).getTime();
      const now = new Date().getTime();
      const cacheAgeHours = (now - cacheTime) / (1000 * 60 * 60);
      
      // Se o cache for mais antigo que 1 hora, limpar
      if (cacheAgeHours > 1) {
        console.log("Limpando cache de sinais antigos");
        localStorage.removeItem('dailyTradingSignals');
        localStorage.removeItem('dailyTradingSignalsDate');
      }
    }
    
    // Também limpar localStorage do dashboard se estiver desatualizado
    const dashboardData = localStorage.getItem('dashboardSignals');
    if (dashboardData) {
      try {
        const { timestamp } = JSON.parse(dashboardData);
        const age = (Date.now() - timestamp) / (1000 * 60 * 60);
        
        if (age > 1) {
          console.log("Limpando cache de sinais do dashboard");
          localStorage.removeItem('dashboardSignals');
        }
      } catch (e) {
        // Em caso de erro ao analisar, melhor limpar
        localStorage.removeItem('dashboardSignals');
      }
    }
  }, []);

  return (
    <Layout>
      <div className="space-y-6 relative signals-page-dark-gradient p-4 rounded-xl min-h-screen -mx-4 -my-4 shadow-inner">
        {/* Camada preta por cima das luzes de fundo - MAIS ESCURA */}
        <div className="absolute inset-0 bg-black/70 z-[1]"></div>

        {/* Efeitos de luz de fundo com MENOR opacidade */}
        <div className="signals-page-light-accent top-20 left-20 z-[2]" style={{ opacity: 0.05 }}></div>
        <div className="signals-page-light-accent bottom-40 right-20 z-[2]" style={{ opacity: 0.05 }}></div>
        <div className="signals-page-light-accent top-1/2 left-1/2 z-[2]" style={{ opacity: 0.05 }}></div>
        
        {/* Acentos coloridos muito sutis */}
        <div className="signals-page-color-accent top-0 left-10 z-[2]" style={{ background: '#000000', opacity: 0.05 }}></div>
        <div className="signals-page-color-accent bottom-20 right-10 z-[2]" style={{ background: '#000000', opacity: 0.05 }}></div>
        <div className="signals-page-color-accent top-40 right-40 z-[2]" style={{ background: '#080808', opacity: 0.05 }}></div>
        
        {/* Cabeçalho da página com título mais escuro */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 z-[3] relative mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400 bg-clip-text text-transparent">
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
                  ? 'bg-black/60 text-white/40 cursor-not-allowed' 
                  : 'bg-black/70 hover:bg-gray-900/90 text-white/80 hover:text-white signals-page-card-glass'
                }`}
              title={t('signals.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{t('signals.refresh')}</span>
            </button>
          </div>
        </div>

        {/* Injetar estilos CSS */}
        <style>{styles}</style>

        {/* Conteúdo principal com os sinais */}
        <div className="grid gap-6 relative z-[3]">
          {isLoading ? (
            <div className="loading-container">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 border-2 border-black/90 border-t-gray-600/30 rounded-full animate-spin"></div>
                  <div className="w-12 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-black/90 border-b-gray-600/30 rounded-full animate-spin"></div>
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
                    className="flex flex-col rounded-xl signal-card"
                    data-signal-number={index + 1}
                  >
                    <div className="relative p-4 border-b signal-divider backdrop-blur-md bg-black/70">
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
                            ? 'bg-gradient-to-r from-green-950/90 to-green-950/80 text-green-500' 
                            : 'bg-gradient-to-r from-red-950/90 to-red-950/80 text-red-500'
                          } font-medium`}
                        >
                          {signal.signal === 'BUY' ? t('signals.buy') || "COMPRA" : t('signals.sell') || "VENDA"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 flex-grow relative backdrop-blur-md bg-black/70">
                      {/* Indicadores de status */}
                      <div className="flex flex-wrap gap-2 mb-4 h-8 items-center">
                        {/* Taxa de sucesso */}
                        <span className="text-xs h-6 px-2 py-1 rounded-full bg-emerald-900/30 text-emerald-300/80 border border-white/5 flex items-center">
                                <CheckCheck className="w-3 h-3 mr-1" />
                                {formatSuccessRate(signal.success_rate || 0.77)}
                                </span>
                        {/* Nível de confiança */}
                        <span className={`text-xs h-6 px-2 py-1 rounded-full flex items-center text-teal-300/70 bg-teal-900/30 border border-white/5`}>
                          <CheckCheck className="w-3 h-3 mr-1" />
                          {getStrengthText(signal.strength)}
                            </span>
                      </div>
                      
                      {/* Dados do sinal */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-center justify-between bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/5 shadow-inner min-h-[50px] signal-info-box">
                            <div>
                              <p className="text-sm font-medium text-white/70">{t('dashboard.signals.entry') || "Entrada"}</p>
                            </div>
                            <p className="text-base font-semibold text-white/80">{entryTime || "00:00"}</p>
                          </div>
                          
                          <div className="flex items-center justify-between bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/5 shadow-inner min-h-[50px] signal-info-box">
                            <div>
                              <p className="text-sm font-medium text-white/70">{t('dashboard.signals.expiration') || "Expiração"}</p>
                            </div>
                            <div className="flex items-center gap-1 text-base font-semibold text-white/80">
                              <span>5m</span>
                              <span className="text-xs text-white/50">({expiryTime})</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-center justify-between bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/5 shadow-inner min-h-[50px] signal-info-box">
                            <div>
                              <p className="text-sm font-medium text-white/70">{t('dashboard.signals.reentry1') || "Reentrada 1"}</p>
                            </div>
                            <p className="text-base font-semibold text-white/80">{gale1Time || "00:29"}</p>
                          </div>
                          
                          <div className="flex items-center justify-between bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/5 shadow-inner min-h-[50px] signal-info-box">
                            <div>
                              <p className="text-sm font-medium text-white/70">{t('dashboard.signals.reentry2') || "Reentrada 2"}</p>
                            </div>
                            <p className="text-base font-semibold text-white/80">{gale2Time || "00:30"}</p>
                          </div>
                        </div>
                      </div>
                      
                    {/* Botão de ação */}
                    <div className="p-4 border-t signal-divider bg-black/80">
                      <button
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-amber-700/80 via-yellow-600/70 to-amber-600/90 hover:from-amber-800/80 hover:via-yellow-700/70 hover:to-amber-700/90 text-amber-50 font-medium transition-all duration-300 flex items-center justify-center relative overflow-hidden shadow-lg backdrop-blur-sm border border-amber-500/20 golden-button golden-shadow"
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
              <div className="bg-black/60 p-4 rounded-full mb-4">
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
                className="px-4 py-2 rounded-lg bg-black/70 hover:bg-gray-900/80 text-white/80 hover:text-white transition-all"
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
                className="p-2 rounded-lg bg-black/80 hover:bg-gray-900/80 disabled:opacity-50 disabled:pointer-events-none transition-all"
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
                            ? 'bg-gray-900/90 text-white font-medium border border-gray-800/30 shimmer-effect' 
                            : 'bg-black/80 hover:bg-gray-900/70 text-white/70'
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
                className="p-2 rounded-lg bg-black/80 hover:bg-gray-900/80 disabled:opacity-50 disabled:pointer-events-none transition-all"
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



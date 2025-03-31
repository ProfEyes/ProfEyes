import { ArrowDownRight, ArrowUpRight, Target, Shield, TrendingUp, BarChart2, Clock, Percent, RefreshCw, Check, X, LineChart, BarChart, TrendingDown, Activity, AlertTriangle, ChevronUp, ChevronDown, BarChart4, BookOpen, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TradingSignal, fetchTradingSignals, fetchCorrelationData, fetchOnChainMetrics, fetchOrderBookData, tradingSignalService } from "@/services";
import { getLatestPrices } from "@/services/getSimulatedPrices";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { SignalType, SignalStrength } from "@/services/signals/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useCallback, useRef } from "react";
import { notificationService } from "@/services/notificationService";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Tempo de cache em milissegundos (10 minutos)
const CACHE_DURATION = 10 * 60 * 1000;

// Chave para armazenar sinais no localStorage
const SIGNALS_CACHE_KEY = 'profeyes_signals_cache';

// Chave para armazenar todos os sinais do dia no localStorage
const DAILY_SIGNALS_CACHE_KEY = 'profeyes_daily_signals_cache';

// Cache global para evitar regeneração de sinais entre trocas de aba
let globalSignalsCache = null;

// Cache global para sinais do dia todo
let globalDailySignalsCache = null;

// Função auxiliar para obter o slot de tempo atual (a cada 10 min)
const getInitialTimeSlot = (): string => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const minuteSlot = Math.floor(minutes / 10);
  return `${hours.toString().padStart(2, '0')}:${minuteSlot}`;
};

// Verificar se temos sinais do dia no localStorage
const checkDailySignalsCache = () => {
  // Verificar primeiro o cache global
  if (globalDailySignalsCache && globalDailySignalsCache.timestamp) {
    const now = Date.now();
    // Verificar se o cache ainda é do mesmo dia
    const cacheDate = new Date(globalDailySignalsCache.timestamp);
    const currentDate = new Date();
    
    if (cacheDate.toDateString() === currentDate.toDateString()) {
      console.log('Usando sinais do dia do cache global');
      return globalDailySignalsCache;
    }
  }

  try {
    const cachedData = localStorage.getItem(DAILY_SIGNALS_CACHE_KEY);
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const now = Date.now();
      
      // Verificar se o cache é do dia atual
      const cacheDate = new Date(parsedData.timestamp);
      const currentDate = new Date();
      
      if (cacheDate.toDateString() === currentDate.toDateString()) {
        console.log('Usando sinais do dia do localStorage');
        // Atualizar o cache global
        globalDailySignalsCache = {
          valid: true,
          data: parsedData.data,
          timestamp: parsedData.timestamp,
          timeSlots: parsedData.timeSlots
        };
        return globalDailySignalsCache;
      }
    }
  } catch (error) {
    console.error('Erro ao verificar sinais do dia no localStorage:', error);
  }
  return { valid: false, data: null, timestamp: 0, timeSlots: [] };
};

// Verificar se temos sinais armazenados no localStorage
const checkLocalStorageSignals = () => {
  // Verificar primeiro o cache global
  if (globalSignalsCache && globalSignalsCache.timestamp) {
    const now = Date.now();
    if ((now - globalSignalsCache.timestamp) <= CACHE_DURATION) {
      console.log('Usando sinais do cache global - evitando regeneração em troca de aba');
      return globalSignalsCache;
    }
  }

  try {
    const cachedData = localStorage.getItem(SIGNALS_CACHE_KEY);
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const now = Date.now();
      
      // Garantir que usamos os sinais do slot atual, mesmo que tenham sido
      // gerados anteriormente na mesma sessão de navegação
      const currentTimeSlot = getInitialTimeSlot();
      if (parsedData.timeSlot === currentTimeSlot) {
        console.log(`Usando sinais do localStorage para o slot ${currentTimeSlot}`);
        // Atualizar o cache global
        globalSignalsCache = {
          valid: true,
          data: parsedData.data,
          timestamp: parsedData.timestamp,
          timeSlot: parsedData.timeSlot
        };
        return globalSignalsCache;
      }
    }
  } catch (error) {
    console.error('Erro ao verificar sinais no localStorage:', error);
  }
  return { valid: false, data: null, timestamp: 0, timeSlot: '' };
};

// Salvar cache no localStorage e no cache global
const saveSignalsToLocalStorage = (signals, timestamp, timeSlot) => {
  try {
    const cacheData = {
      data: signals,
      timestamp: timestamp,
      timeSlot: timeSlot
    };
    
    // Atualizar cache global primeiro
    globalSignalsCache = {
      valid: true,
      data: signals,
      timestamp: timestamp,
      timeSlot: timeSlot
    };
    
    // Depois atualizar localStorage
    localStorage.setItem(SIGNALS_CACHE_KEY, JSON.stringify(cacheData));
    console.log(`Sinais salvos no cache global e localStorage para o slot ${timeSlot} com timestamp:`, new Date(timestamp).toLocaleTimeString());
  } catch (error) {
    console.error('Erro ao salvar sinais no localStorage:', error);
  }
};

// Salvar todos os sinais do dia no localStorage
const saveDailySignalsToLocalStorage = (signals, timeSlots) => {
  try {
    const timestamp = Date.now();
    const cacheData = {
      data: signals,
      timestamp: timestamp,
      timeSlots: timeSlots
    };
    
    // Atualizar cache global primeiro
    globalDailySignalsCache = {
      valid: true,
      data: signals,
      timestamp: timestamp,
      timeSlots: timeSlots
    };
    
    // Depois atualizar localStorage
    localStorage.setItem(DAILY_SIGNALS_CACHE_KEY, JSON.stringify(cacheData));
    console.log('Sinais do dia inteiro salvos no cache global e localStorage com timestamp:', new Date(timestamp).toLocaleTimeString());
  } catch (error) {
    console.error('Erro ao salvar sinais do dia no localStorage:', error);
  }
};

// Gerar todos os sinais do dia
const generateDailySignals = async () => {
  console.log('Gerando todos os sinais para o dia...');
  
  try {
    // Buscar sinais base do serviço
    const baseSignals = await tradingSignalService.fetchTradingSignals(true);
    
    // Criar slots de tempo para o dia todo - de 10 em 10 minutos
    const timeSlots = [];
    const signalsBySlot = {};
    
    // Obter o dia atual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Criar slots de 10 em 10 minutos ao longo do dia (144 slots por dia)
    for (let i = 0; i < 144; i++) {
      const slotTime = new Date(today);
      slotTime.setMinutes(i * 10);
      
      const slotKey = slotTime.toISOString();
      timeSlots.push(slotKey);
      
      // Gerar 3 sinais para cada slot
      signalsBySlot[slotKey] = [];
      
      // Gerar sinais para este slot de tempo
      for (let j = 0; j < 3; j++) {
        // Usar sinais base como modelo, mas alterando propriedades para cada slot
        if (baseSignals && baseSignals.length > 0) {
          // Selecionar um sinal base aleatoriamente
          const randomIndex = Math.floor(Math.random() * baseSignals.length);
          const baseSignal = baseSignals[randomIndex];
          
          // Clonar para evitar modificar o original
          const newSignal = JSON.parse(JSON.stringify(baseSignal));
          
          // Modificar propriedades
          newSignal.id = `signal_${slotTime.getTime()}_${j}`;
          newSignal.timestamp = slotTime.toISOString();
          
          // Definir horários com base no slot
          const entryHour = slotTime.getHours();
          const entryMinute = slotTime.getMinutes();
          
          // Entrada no horário do slot
          newSignal.entry_time = `${entryHour.toString().padStart(2, '0')}:${entryMinute.toString().padStart(2, '0')}`;
          
          // Primeira reentrada 2 minutos depois
          const gale1Time = new Date(slotTime);
          gale1Time.setMinutes(entryMinute + 2);
          newSignal.gale1_time = `${gale1Time.getHours().toString().padStart(2, '0')}:${gale1Time.getMinutes().toString().padStart(2, '0')}`;
          
          // Segunda reentrada 4 minutos depois
          const gale2Time = new Date(slotTime);
          gale2Time.setMinutes(entryMinute + 4);
          newSignal.gale2_time = `${gale2Time.getHours().toString().padStart(2, '0')}:${gale2Time.getMinutes().toString().padStart(2, '0')}`;
          
          // Alternar entre COMPRA e VENDA
          newSignal.signal = j % 2 === 0 ? 'BUY' : 'SELL';
          
          // Adicionar ao slot
          signalsBySlot[slotKey].push(newSignal);
        }
      }
    }
    
    // Salvar todos os sinais do dia
    saveDailySignalsToLocalStorage(signalsBySlot, timeSlots);
    
    return { signalsBySlot, timeSlots };
  } catch (error) {
    console.error('Erro ao gerar sinais do dia:', error);
    return null;
  }
};

// Obter os sinais para o slot de tempo atual
const getCurrentTimeSlotSignals = (signalsBySlot, timeSlots) => {
  if (!signalsBySlot || !timeSlots || timeSlots.length === 0) {
    return [];
  }
  
  const now = new Date();
  
  // Encontrar o slot de tempo mais próximo (arredondar para o slot de 10 minutos anterior)
  now.setMinutes(Math.floor(now.getMinutes() / 10) * 10);
  now.setSeconds(0);
  now.setMilliseconds(0);
  
  // Converter para formato ISO para comparar com as chaves
  const currentSlotKey = now.toISOString();
  
  // Verificar se existe um slot exato
  if (signalsBySlot[currentSlotKey]) {
    console.log(`Usando sinais do slot ${new Date(currentSlotKey).toLocaleTimeString()}`);
    return signalsBySlot[currentSlotKey];
  }
  
  // Se não encontrou um slot exato, encontrar o mais próximo
  console.log(`Slot exato não encontrado para ${now.toLocaleTimeString()}, buscando o mais próximo...`);
  
  // Percorrer os slots para encontrar o mais próximo
  let closestSlot = timeSlots[0];
  let minDiff = Infinity;
  
  for (const slot of timeSlots) {
    const slotTime = new Date(slot).getTime();
    const diff = Math.abs(slotTime - now.getTime());
    
    if (diff < minDiff) {
      minDiff = diff;
      closestSlot = slot;
    }
  }
  
  console.log(`Usando sinais do slot mais próximo: ${new Date(closestSlot).toLocaleTimeString()}`);
  return signalsBySlot[closestSlot] || [];
};

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
  const [animatingSignals, setAnimatingSignals] = useState<Set<string>>(new Set());
  const [cachedSignals, setCachedSignals] = useState<EnrichedSignal[]>([]);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string>(getInitialTimeSlot());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const animationsRef = useRef<Record<string, any>>({});
  const queryClient = useQueryClient();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingSignals, setRefreshingSignals] = useState(false);
  const [refreshButtonState, setRefreshButtonState] = useState<'idle' | 'loading' | 'success'>('idle');
  
  const slotCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const getCurrentTimeSlot = useCallback(() => {
    const now = new Date();
    const minutes = Math.floor(now.getMinutes() / 10) * 10;
    return `${now.getHours().toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, []);
  
  const loadCachedSignalsIfAvailable = useCallback(() => {
    const cache = checkLocalStorageSignals();
    if (cache.valid && cache.data && cache.timeSlot === currentTimeSlot) {
      console.log(`Carregando sinais em cache para o slot ${currentTimeSlot}`);
      setCachedSignals(cache.data);
      return true;
    }
    return false;
  }, [currentTimeSlot]);
  
  useEffect(() => {
    const initialSlot = getCurrentTimeSlot();
    setCurrentTimeSlot(initialSlot);
    
    loadCachedSignalsIfAvailable();
    
    const checkTimeSlot = () => {
      const newSlot = getCurrentTimeSlot();
      if (newSlot !== currentTimeSlot) {
        console.log(`Slot de tempo mudou: ${currentTimeSlot} -> ${newSlot}`);
        setCurrentTimeSlot(newSlot);
        setCachedSignals([]);
        setRetryCount(prev => prev + 1);
      }
    };
    
    slotCheckIntervalRef.current = setInterval(checkTimeSlot, 60 * 1000);
    
    return () => {
      if (slotCheckIntervalRef.current) {
        clearInterval(slotCheckIntervalRef.current);
      }
    };
  }, [getCurrentTimeSlot, currentTimeSlot, loadCachedSignalsIfAvailable]);
  
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = simpleTextLoadingStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Atualizar horário atual constantemente
  useEffect(() => {
    // Função para atualizar o horário atual a cada segundo
    const updateCurrentTime = () => {
      setCurrentTime(new Date());
    };
    
    // Atualizar imediatamente e depois a cada segundo
    updateCurrentTime();
    timeUpdateIntervalRef.current = setInterval(updateCurrentTime, 1000);
    
    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, []);

  // Ordenar sinais por proximidade do horário de entrada
  const sortSignalsByEntryTime = useCallback((signals: any[]) => {
    if (!signals) return [];
    
    // Função auxiliar para obter o horário de entrada como Date
    const getEntryTimeAsDate = (signal: any): Date => {
      if (!signal.entry_time) return new Date();
      
      const now = new Date();
      const [hours, minutes] = signal.entry_time.split(':').map(Number);
      const entryDate = new Date(now);
      entryDate.setHours(hours, minutes, 0, 0);
      
      return entryDate;
    };
    
    // Função para calcular a diferença de tempo em minutos
    const getTimeToEntry = (signal: any): number => {
      const entryDate = getEntryTimeAsDate(signal);
      const now = currentTime;
      return (entryDate.getTime() - now.getTime()) / (60 * 1000); // diferença em minutos
    };
    
    // Ordenar por proximidade do horário atual
    return [...signals].sort((a, b) => {
      const timeToEntryA = getTimeToEntry(a);
      const timeToEntryB = getTimeToEntry(b);
      
      // Ordenar por diferença absoluta para mostrar sempre o mais próximo primeiro
      const absTimeToEntryA = Math.abs(timeToEntryA);
      const absTimeToEntryB = Math.abs(timeToEntryB);
      
      // Prioridade para horários futuros
      const aFuture = timeToEntryA >= 0;
      const bFuture = timeToEntryB >= 0;
      
      if (aFuture && !bFuture) return -1; // A está no futuro, vem primeiro
      if (!aFuture && bFuture) return 1;  // B está no futuro, vem primeiro
      
      // Se ambos são do futuro ou ambos já passaram, ordena pelo mais próximo do horário atual
      return absTimeToEntryA - absTimeToEntryB;
    });
  }, [currentTime]);

  const fetchSignals = useCallback(async () => {
    console.log(`Dashboard - Obtendo sinais para o slot atual: ${currentTimeSlot}`);
    
    if (cachedSignals.length > 0) {
      console.log(`Usando ${cachedSignals.length} sinais em cache para o slot ${currentTimeSlot}`);
      return sortSignalsByEntryTime(cachedSignals);
    }
    
    const hasCachedSignals = loadCachedSignalsIfAvailable();
    if (hasCachedSignals && cachedSignals.length > 0) {
      return sortSignalsByEntryTime(cachedSignals);
    }
    
    try {
      const tradingSignals = await tradingSignalService.fetchTradingSignals(false);
      
      // Se não houver sinais disponíveis, gerar 3 sinais aleatórios para o dashboard
      if (!tradingSignals || tradingSignals.length === 0) {
        console.log('Gerando 3 sinais aleatórios para o dashboard');
        
        // Símbolos possíveis para os sinais
        const symbols = [
          { symbol: 'PEN/USD (OTC)', exchange: 'Binary' },
          { symbol: 'NOT (OTC)', exchange: 'Binary' },
          { symbol: 'DOGE/USD (OTC)', exchange: 'Binary' },
          { symbol: 'TSLA (OTC)', exchange: 'Blitz' },
          { symbol: 'MSFT (OTC)', exchange: 'Binary' },
          { symbol: 'AMZN (OTC)', exchange: 'Blitz' },
        ];
        
        // Tempos de expiração possíveis
        const timeframes = ['30s', '60s', '1m', '2m', '5m'];
        
        // Gerar 3 sinais com horários diferentes
        const generatedSignals = Array.from({ length: 3 }).map((_, i) => {
          // Selecionar símbolo e timeframe aleatórios
          const symbolIndex = Math.floor(Math.random() * symbols.length);
          const timeframeIndex = Math.floor(Math.random() * timeframes.length);
          
          // Calcular horário de entrada (entre 0-15 minutos no futuro)
          const now = new Date();
          const entryDate = new Date(now);
          const futureMinutes = Math.floor(Math.random() * 16); // 0-15 minutos
          
          // Adicionar offset para cada sinal (2, 5, 8 minutos) para garantir horários diferentes
          const signalOffset = i * 3 + 2;
          entryDate.setMinutes(now.getMinutes() + futureMinutes + signalOffset);
          
          const entryHour = entryDate.getHours();
          const entryMinute = entryDate.getMinutes();
          
          // Calcular horário de expiração
          const timeframe = timeframes[timeframeIndex];
          let expiryMinutes = entryMinute;
          let expiryHour = entryHour;
          
          // Converter timeframe para minutos
          let expiryAddMinutes = 1;
          if (timeframe.includes('m')) {
            expiryAddMinutes = parseInt(timeframe.replace('m', ''));
          } else if (timeframe.includes('s')) {
            expiryAddMinutes = Math.ceil(parseInt(timeframe.replace('s', '')) / 60);
          }
          
          expiryMinutes += expiryAddMinutes;
          if (expiryMinutes >= 60) {
            expiryHour = (expiryHour + Math.floor(expiryMinutes / 60)) % 24;
            expiryMinutes %= 60;
          }
          
          // Calcular gale1 (+1 minuto após expiração)
          let gale1Minutes = expiryMinutes + 1;
          let gale1Hour = expiryHour;
          if (gale1Minutes >= 60) {
            gale1Hour = (gale1Hour + 1) % 24;
            gale1Minutes %= 60;
          }
          
          // Calcular gale2 (+2 minutos após gale1)
          let gale2Minutes = gale1Minutes + 2;
          let gale2Hour = gale1Hour;
          if (gale2Minutes >= 60) {
            gale2Hour = (gale2Hour + 1) % 24;
            gale2Minutes %= 60;
          }
          
          // Alternar entre BUY e SELL para os sinais
          const signal = i % 2 === 0 ? 'BUY' : 'SELL';
          const randomID = `dashboard-${i+1}-${Date.now()}`;
          
          return {
            id: randomID,
            symbol: symbols[symbolIndex].symbol,
            exchange: symbols[symbolIndex].exchange,
            signal: signal,
            type: 'TECHNICAL',
            entry_time: `${entryHour.toString().padStart(2, '0')}:${entryMinute.toString().padStart(2, '0')}`,
            timeframe: timeframe,
            expiry_time_str: `${expiryHour.toString().padStart(2, '0')}:${expiryMinutes.toString().padStart(2, '0')}`,
            gale1_time: `${gale1Hour.toString().padStart(2, '0')}:${gale1Minutes.toString().padStart(2, '0')}`,
            gale2_time: `${gale2Hour.toString().padStart(2, '0')}:${gale2Minutes.toString().padStart(2, '0')}`,
            success_rate: 0.85 + (Math.random() * 0.12), // Entre 85% e 97%
            status: 'active',
            price: 100 + Math.random() * 900,
            strength: Math.random() > 0.5 ? 'STRONG' : 'MODERATE',
            qualityScore: 75 + Math.random() * 23, // 75-98
            reason: 'Análise técnica algorítmica',
            categoria: Math.random() > 0.5 ? "Alta Precisão" : "Sinal Premium"
          } as EnrichedSignal;
        });
        
        // Atualizar o cache
        setCachedSignals(generatedSignals);
        saveSignalsToLocalStorage(generatedSignals, Date.now(), currentTimeSlot);
        
        return sortSignalsByEntryTime(generatedSignals);
      }
      
      // Se temos sinais do backend, usar os primeiros 3
      let selectedSignals = tradingSignals.slice(0, 3);
      
      // Se temos menos de 3, gerar os restantes
      if (selectedSignals.length < 3) {
        // Adicionar sinais gerados para completar 3
        const symbolsToUse = [
          { symbol: 'PEN/USD (OTC)', exchange: 'Binary' },
          { symbol: 'DOGE/USD (OTC)', exchange: 'Binary' },
          { symbol: 'TSLA (OTC)', exchange: 'Blitz' },
        ];
        
        for (let i = selectedSignals.length; i < 3; i++) {
          const now = new Date();
          const entryDate = new Date(now);
          entryDate.setMinutes(now.getMinutes() + (i * 5) + 3);
          
          const entryHour = entryDate.getHours();
          const entryMinute = entryDate.getMinutes();
          
          const timeframe = "5m";
          
          let expiryMinutes = entryMinute + 5;
          let expiryHour = entryHour;
          if (expiryMinutes >= 60) {
            expiryHour = (expiryHour + 1) % 24;
            expiryMinutes %= 60;
          }
          
          selectedSignals.push({
            id: `dashboard-gen-${i}-${Date.now()}`,
            symbol: symbolsToUse[i % symbolsToUse.length].symbol,
            exchange: symbolsToUse[i % symbolsToUse.length].exchange,
            signal: i % 2 === 0 ? 'BUY' : 'SELL',
            type: 'TECHNICAL',
            entry_time: `${entryHour.toString().padStart(2, '0')}:${entryMinute.toString().padStart(2, '0')}`,
            timeframe: timeframe,
            expiry_time_str: `${expiryHour.toString().padStart(2, '0')}:${expiryMinutes % 60}`,
            success_rate: 0.90,
            status: 'active',
            price: 100 + Math.random() * 900,
            strength: 'STRONG',
            qualityScore: 80 + Math.random() * 18,
            reason: 'Análise combinada',
            categoria: "Sinal Premium"
          });
        }
      }
      
      const updatedSignals = await Promise.all(
        selectedSignals.map(async (signal) => {
          const signalWithPrice = await tradingSignalService.updateSignalCurrentPrice(signal);
          
          return {
            ...signalWithPrice,
            qualityScore: signal.success_rate ? signal.success_rate * 100 : 80,
            categoria: signal.categoria || "Não categorizado"
          } as EnrichedSignal;
        })
      );
      
      console.log(`Exibindo ${updatedSignals.length} sinais para o Dashboard no slot ${currentTimeSlot}`);
      
      setCachedSignals(updatedSignals);
      saveSignalsToLocalStorage(updatedSignals, Date.now(), currentTimeSlot);
      
      return sortSignalsByEntryTime(updatedSignals);
    } catch (error) {
      console.error("Erro ao buscar sinais de trading:", error);
      throw error;
    }
  }, [currentTimeSlot, cachedSignals, loadCachedSignalsIfAvailable, sortSignalsByEntryTime]);
  
  // Usar o useQuery para gerenciar o estado de carregamento e erros
  const { data: signals, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboardSignals', retryCount, currentTimeSlot],
    queryFn: fetchSignals,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
    staleTime: Infinity,
    cacheTime: CACHE_DURATION
  });

  // Efeito para reordenar os sinais constantemente com base no horário atual
  useEffect(() => {
    if (signals && signals.length > 0) {
      const sortedSignals = sortSignalsByEntryTime(signals);
      // Comparar apenas as IDs e horários de entrada para evitar re-renderizações desnecessárias
      const currentSignalIds = signals.map(s => `${s.id}:${s.entry_time}`).join(',');
      const sortedSignalIds = sortedSignals.map(s => `${s.id}:${s.entry_time}`).join(',');
      
      if (currentSignalIds !== sortedSignalIds) {
        // Atualizar o cache de sinais ordenados
        queryClient.setQueryData(['dashboardSignals', retryCount, currentTimeSlot], sortedSignals);
      }
    }
  }, [currentTime, signals, sortSignalsByEntryTime, queryClient, retryCount, currentTimeSlot]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Página ficou visível novamente');
        const newSlot = getCurrentTimeSlot();
        if (newSlot !== currentTimeSlot) {
          console.log(`Slot de tempo mudou enquanto aba estava em segundo plano: ${currentTimeSlot} -> ${newSlot}`);
          setCurrentTimeSlot(newSlot);
          setRetryCount(prev => prev + 1);
        } else {
          if (!signals || signals.length === 0) {
            console.log('Aba ficou visível, recarregando sinais...');
            refetch();
          } else {
            console.log('Aba ficou visível, mantendo os sinais existentes para o mesmo slot');
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const handleFocus = () => {
      console.log('Janela recebeu foco');
      const newSlot = getCurrentTimeSlot();
      if (newSlot !== currentTimeSlot) {
        console.log(`Slot de tempo mudou enquanto janela estava sem foco: ${currentTimeSlot} -> ${newSlot}`);
        setCurrentTimeSlot(newSlot);
        setRetryCount(prev => prev + 1);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [getCurrentTimeSlot, currentTimeSlot, fetchSignals]);
  
  useEffect(() => {
    const updatePrices = async () => {
      try {
        if (!signals || signals.length === 0) return;
        
        const symbolsArray = signals.map((signal: any) => signal.symbol);
        const symbols = [...new Set(symbolsArray)] as string[];
        
        if (symbols.some(symbol => typeof symbol !== 'string')) {
          console.error('Símbolos inválidos detectados:', symbols);
          return;
        }
        
        let prices;
        try {
          prices = await getLatestPrices(symbols);
        } catch (fetchError) {
          console.error('Erro ao buscar preços:', fetchError);
          return;
        }
        
        if (!prices || prices.length === 0) {
          console.warn('Nenhum preço retornado do serviço simulado');
          return;
        }
        
        const newPrices: Record<string, string> = {};
        
        prices.forEach(priceData => {
          if (!priceData || !priceData.symbol) return;
          
          const symbol = priceData.symbol;
          const formattedPrice = formatPrice(priceData.price || "0.00", symbol);
          newPrices[symbol] = formattedPrice;
        });
        
        setCurrentPrices(prevPrices => {
          const updatedPrices = { ...prevPrices, ...newPrices };
          
          signals.forEach((signal: any) => {
            if (completedSignals.has(signal.id)) return;
            
            const rawPrice = prices.find((p: any) => p.symbol === signal.symbol)?.price;
            if (rawPrice) {
              const currentPrice = parseFloat(rawPrice);
              checkSignalCompletion(signal, currentPrice);
            }
          });
          
          return updatedPrices;
        });
      } catch (error) {
        console.error("Erro ao atualizar preços:", error);
      }
    };
    
    // Atualizar os preços a cada 2 segundos
    const interval = setInterval(updatePrices, 2000);
    
    // Iniciar com uma atualização imediata
    updatePrices();
    
    return () => clearInterval(interval);
  }, [signals, completedSignals]);
  
  const checkSignalCompletion = (signal: any, currentPrice: number) => {
    if (!currentPrice || completedSignals.has(signal.id)) return;
    
    if (signal.signal === 'BUY') {
      if (currentPrice >= signal.target_price) {
        handleSignalCompletion(signal, 'success', currentPrice);
      } else if (currentPrice <= signal.stop_loss) {
        handleSignalCompletion(signal, 'failure', currentPrice);
      }
    } else if (signal.signal === 'SELL') {
      if (currentPrice <= signal.target_price) {
        handleSignalCompletion(signal, 'success', currentPrice);
      } else if (currentPrice >= signal.stop_loss) {
        handleSignalCompletion(signal, 'failure', currentPrice);
      }
    }
  };
  
  const handleSignalCompletion = (signal: any, result: 'success' | 'failure', exitPrice: number) => {
    setCompletedSignals(prev => new Set([...prev, signal.id]));
    
    setAnimatingSignals(prev => new Set([...prev, signal.id]));
    
    try {
      if (notificationService && 
          typeof notificationService === 'object' && 
          'notifySignalCompletion' in notificationService && 
          typeof (notificationService as any).notifySignalCompletion === 'function') {
        (notificationService as any).notifySignalCompletion(signal, result === 'success', exitPrice);
      } else {
        console.log('Sinal concluído:', signal.symbol, result, exitPrice);
      }
    } catch (error) {
      console.log('Erro ao notificar conclusão de sinal:', error);
    }
    
    try {
      if (tradingSignalService && 
          typeof tradingSignalService === 'object' && 
          'updateSignalStatus' in tradingSignalService && 
          typeof tradingSignalService.updateSignalStatus === 'function') {
        tradingSignalService.updateSignalStatus(
          signal, 
          'CONCLUÍDO', 
          exitPrice
        );
      }
    } catch (error) {
      console.log('Erro ao atualizar status do sinal:', error);
    }
  };
  
  const getCurrentPrice = (signal: any): string => {
    return currentPrices[signal.symbol] || formatPrice(signal.price.toString(), signal.symbol);
  };
  
  const formatPrice = (price: string, symbol: string): string => {
    const numericPrice = parseFloat(price);
    
    if (symbol.includes('BTC') || symbol.includes('ETH')) {
      return numericPrice >= 1000 
        ? `$${numericPrice.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
        : `$${numericPrice.toFixed(2)}`;
    } else if (numericPrice < 0.1) {
      return `$${numericPrice.toFixed(6)}`;
    } else if (numericPrice < 1) {
      return `$${numericPrice.toFixed(4)}`;
    } else if (numericPrice < 10) {
      return `$${numericPrice.toFixed(3)}`;
    } else if (numericPrice < 1000) {
      return `$${numericPrice.toFixed(2)}`;
    } else {
      return `$${numericPrice.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    }
  };
  
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
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BUY':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'SELL':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const calculatePotential = (signal: any) => {
    if (signal.status === 'CONCLUÍDO' && signal.exit_price) {
      const potential = signal.signal === 'BUY'
        ? ((signal.exit_price - signal.entry_price) / signal.entry_price) * 100
        : ((signal.entry_price - signal.exit_price) / signal.entry_price) * 100;
      
      return potential.toFixed(2) + '%';
    }
    
    const potential = signal.signal === 'BUY'
      ? ((signal.target_price - signal.entry_price) / signal.entry_price) * 100
      : ((signal.entry_price - signal.target_price) / signal.entry_price) * 100;
    
    return `${potential.toFixed(2)}%`;
  };
  
  const calculateRiskReward = (signal: any) => {
    const targetDistance = signal.signal === 'BUY'
      ? signal.target_price - signal.entry_price
      : signal.entry_price - signal.target_price;
    
    const stopDistance = signal.signal === 'BUY'
      ? signal.entry_price - signal.stop_loss
      : signal.stop_loss - signal.entry_price;
    
    if (stopDistance <= 0) return "1:1";
    
    const ratio = targetDistance / stopDistance;
    return `${ratio.toFixed(1)}:1`;
  };

  const handleRefresh = () => {
    setRefreshButtonState('loading');
    setIsRefreshing(true);
    
    // Simular carregamento por 1 segundo
    setTimeout(() => {
      setRefreshButtonState('success');
      setIsRefreshing(false);
      
      // Exibir mensagem de sucesso
      toast.success(`Sinais atualizados para ${currentTimeSlot}`, {
        duration: 3000,
      });
      
      // Voltar ao estado inicial após 3 segundos
      setTimeout(() => {
        setRefreshButtonState('idle');
      }, 3000);
    }, 1000);
  };

  if (isLoading) {
    return (
      <Card className="h-full shadow-md border border-white/5 bg-black/20">
        <CardHeader className="relative pb-2 border-b border-white/10">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <CardTitle className="text-sm font-light tracking-wide text-white/90">
              Sinais
            </CardTitle>
          </div>
          
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-3.5 h-3.5 text-white/40 animate-spin" />
            </div>
          </div>
          
          <div className="h-8"></div>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <div className="px-4 py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-pulse"></div>
                <div className="absolute inset-2 rounded-full bg-indigo-500/20 animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                <div className="absolute inset-4 rounded-full bg-indigo-500/30 animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                <Activity className="absolute inset-0 w-full h-full text-indigo-300/80 p-4" />
              </div>
              <p className="text-sm text-white/60 font-light">Carregando sinais...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full shadow-md border border-white/5 bg-black/20">
        <CardHeader className="relative pb-2 border-b border-white/10">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <CardTitle className="text-sm font-light tracking-wide text-white/90">
              Sinais
            </CardTitle>
          </div>
          
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Button 
              size="sm" 
              variant="ghost"
              className="h-7 px-2 text-xs text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => navigate('/signals')}
            >
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
              Ver todos
            </Button>
          </div>
          
          <div className="h-8"></div>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-sm font-medium text-white/90 mb-1">Falha ao carregar sinais</h3>
            <p className="text-xs text-white/60 mb-4 max-w-[240px]">Não foi possível obter os sinais de trading no momento.</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetchSignals()}
              className="text-xs bg-white/5 border-white/10 hover:bg-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!signals || signals.length === 0) {
    return (
      <Card className="h-full shadow-md border border-white/5 bg-black/20">
        <CardHeader className="flex space-y-1 pb-2">
          <CardTitle className="text-lg font-bold">
            <div className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-indigo-500" />
              <span>Sinais em Tempo Real</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex flex-col space-y-2 pt-1 h-[340px] justify-center items-center">
            <Clock className="w-12 h-12 text-white/40 animate-pulse" />
            <p className="text-sm text-white/60 text-center animate-pulse">
              Aguardando novos sinais...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="h-full overflow-hidden flex flex-col shadow-md border border-white/5 
                 bg-black/20 
                 transition-all duration-300 signals-card-container">
      <CardHeader className="relative pb-2 border-b border-white/10 signal-header-gradient">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <CardTitle className="text-sm font-light tracking-wide text-white/90">
            Sinais
          </CardTitle>
        </div>
        
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="flex items-center space-x-2">
            {/* Botão de sucesso com fadeIn/fadeOut */}
            <div 
              className={cn(
                "relative",
                refreshButtonState === 'success' ? 'opacity-100' : 'opacity-0'
              )}
              style={{ 
                transition: 'opacity 0.3s ease-out',
                position: refreshButtonState !== 'success' ? 'absolute' : 'relative'
              }}
            >
              <Badge variant="outline" className="bg-green-950/30 text-green-400 border-green-500/30 flex items-center px-2 py-1">
                <Check className="h-3.5 w-3.5 mr-1.5" />
                <span className="text-xs">Atualizado</span>
              </Badge>
            </div>
            
            <div 
              className={cn(
                "relative",
                refreshButtonState !== 'success' ? 'opacity-100' : 'opacity-0'
              )}
              style={{ 
                transition: 'opacity 0.3s ease-out',
                position: refreshButtonState === 'success' ? 'absolute' : 'relative'
              }}
            >
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => handleRefresh()}
                disabled={isRefreshing}
                className={`h-7 w-7 p-0 rounded-full ${isRefreshing ? 'opacity-50' : 'opacity-90 hover:opacity-100'}`}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            <Button 
              size="sm" 
              variant="ghost"
              className="h-7 px-2 text-xs text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => navigate('/signals')}
            >
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
              Ver todos
            </Button>
          </div>
        </div>
        
        <div className="h-8"></div>
      </CardHeader>
      
      <CardContent className="p-0 overflow-y-auto flex-grow custom-scrollbar">
        <div className="relative">
          {/* Efeito de brilho decorativo no topo */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
          
          <div className="divide-y divide-white/10 signals-container">
            {signals.map((signal, index) => {
              const delay = refreshingSignals ? 0 : index * 60;
              const isCompra = signal.signal === 'BUY';
              const accentColor = isCompra ? 'from-green-500 to-emerald-600' : 'from-red-500 to-red-700';
              const bgAccent = isCompra ? 'from-green-800/20 to-emerald-800/5' : 'from-red-900/20 to-red-800/5';
              
              return (
                <div 
                  key={signal.id || index} 
                  className={cn(
                    "relative group signal-item-hover",
                    refreshingSignals ? "opacity-0" : "opacity-100"
                  )}
                  style={{
                    opacity: refreshingSignals ? 0 : 1,
                    transition: 'opacity 0.5s ease-out, transform 0.3s ease-out',
                    transitionDelay: `${delay}ms`,
                    animation: `fade-in-up 0.5s ease-out ${delay}ms backwards`
                  }}
                >
                  {/* Linha de acento */}
                  <div className={`signal-accent-line ${isCompra ? 'compra-accent' : 'venda-accent'}`}></div>
                  <div className={`signal-accent-glow ${isCompra ? 'compra-accent' : 'venda-accent'}`}></div>
                  
                  {/* Fundo com gradiente subtil */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${bgAccent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  
                  {/* Conteúdo do sinal */}
                  <div className="relative z-10 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div className={`relative rounded-full p-0.5 bg-gradient-to-r ${accentColor}`}>
                          <div className="absolute inset-0 rounded-full blur-sm bg-gradient-to-r ${accentColor} opacity-50"></div>
                          <div className="relative rounded-full bg-black/40 backdrop-blur-sm p-1.5">
                            {isCompra 
                              ? <ArrowUpRight className="w-4 h-4 text-green-300" /> 
                              : <ArrowDownRight className="w-4 h-4 text-rose-300" />}
                          </div>
                        </div>
                        
                        <div className="ml-3">
                          <h3 className="font-medium text-base">{signal.symbol}</h3>
                          <div className="flex items-center mt-0.5 text-xs text-white/60 signal-time-badge">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{signal.entry_time || "HH:MM"}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Badge 
                        variant="outline"
                        className={`px-2 py-0.5 rounded-md border border-white/10 text-xs font-light ${
                          isCompra 
                          ? 'text-green-400' 
                          : 'text-red-500'
                        }`}
                      >
                        {isCompra ? 'COMPRA' : 'VENDA'}
                      </Badge>
                    </div>
                    
                    <div className="mt-3 mb-2">
                      <div className="h-0.5 w-full border-t border-white/10 mb-2"></div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="border border-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
                          <div className="p-2.5">
                            <p className="text-xs text-white/50 mb-1">Entrada</p>
                            <p className="text-sm font-medium">{signal.entry_time || "HH:MM"}</p>
                          </div>
                        </div>
                        
                        <div className="border border-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
                          <div className="p-2.5">
                            <p className="text-xs text-white/50 mb-1">Expiração</p>
                            <p className="text-sm font-medium">
                              {signal.timeframe || "1m"}
                              {signal.expiry_time_str ? ` (${signal.expiry_time_str})` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="border border-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
                          <div className="p-2.5">
                            <p className="text-xs text-white/50 mb-1">Reentrada 1</p>
                            <p className="text-sm font-medium">{signal.gale1_time || "HH:MM"}</p>
                          </div>
                        </div>
                        
                        <div className="border border-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
                          <div className="p-2.5">
                            <p className="text-xs text-white/50 mb-1">Reentrada 2</p>
                            <p className="text-sm font-medium">{signal.gale2_time || "HH:MM"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3.5 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`text-xs h-8 px-3 border border-white/10 ${
                          isCompra 
                          ? 'text-green-400 hover:text-green-300 hover:border-green-400/30' 
                          : 'text-red-500 hover:text-red-400 hover:border-red-500/30'
                        }`}
                        onClick={() => window.open('https://trade.xxbroker.com/register?aff=751924&aff_model=revenue&afftrack=', '_blank')}
                      >
                        <LineChart className="w-3.5 h-3.5 mr-1.5" />
                        <span>Realizar trade</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Efeito de brilho decorativo no final */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalsCard;
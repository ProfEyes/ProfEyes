import { ArrowDownRight, ArrowUpRight, Target, Shield, TrendingUp, BarChart2, Clock, Percent, RefreshCw, Check, X, LineChart, BarChart, TrendingDown, Activity, AlertTriangle, ChevronUp, ChevronDown, BarChart4, BookOpen, ChevronRight, Loader2, ChevronsUp, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTradingSignals, fetchCorrelationData, fetchOnChainMetrics, fetchOrderBookData, tradingSignalService } from "@/services";
import { getLatestPrices } from "@/services/getSimulatedPrices";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { SignalType, SignalStrength } from "@/services/types";
import type { TradingSignal as ServiceTradingSignal } from "@/services/types";
import type { TradingSignal } from "@/types/tradingSignals";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useCallback, useRef } from "react";
import { notificationService } from "@/services/notificationService";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { TimeZoneSelector } from "@/components/dashboard/TimeZoneSelector";
import { useTimeZone } from "@/contexts/TimeZoneContext";
import { motion, AnimatePresence } from "framer-motion";
import { useSignalNotifications } from "@/hooks/useSignalNotifications";

// Tempo de espera antes de processar automaticamente um sinal (10 minutos em ms)
const AUTO_COMPLETE_TIMEOUT = 10 * 60 * 1000;

// Modo de teste para processamento rápido (30 segundos)
const TEST_MODE = false;
const TEST_TIMEOUT = 30 * 1000;

// Tempo de expiração fixo em 5 minutos
const SIGNAL_EXPIRY_TIME = 5;

// Tempo entre sinais (10 minutos)
const TIME_BETWEEN_SIGNALS = 10;

// Definir a proporção de ganho/perda (14 ganhos para 1 perda)
const WIN_LOSS_RATIO = 14;

// Tempo de cache em milissegundos (10 minutos)
const CACHE_DURATION = 10 * 60 * 1000;

// Chave para armazenar sinais no localStorage
const SIGNALS_CACHE_KEY = 'trending_signals_cache';

// Chave para armazenar todos os sinais do dia no localStorage
const DAILY_SIGNALS_CACHE_KEY = 'trending_daily_signals_cache';

// Cache global para evitar regeneração de sinais entre trocas de aba
let globalSignalsCache = null;

// Cache global para sinais do dia todo
let globalDailySignalsCache = null;

// Variável para controlar a contagem de sinais processados (para gerar 1 perda a cada WIN_LOSS_RATIO sinais)
let signalProcessCount = 0;

// Declaração de tipo global para a flag de reconstrução
declare global {
  interface Window {
    isSignalReconstructionInProgress?: boolean;
    // Adicionar variáveis para previnir múltiplas montagens
    signalsCardMounted?: boolean;
    displayedSignalsRef?: EnrichedSignal[];
    completedSignalsRef?: Set<string>;
    lastMountTimestamp?: number;
    // Adicionar variáveis para persistência dos timers entre navegações
    signalTimersMap?: Record<string, {
      id: string;
      scheduledTime: number;
      processingTime: number;
      processed: boolean;
    }>;
  }
}

// Constantes para padrão de horários
const VALID_MINUTES = [3, 23, 43];
const MINUTES_INTERVAL = 20; // Intervalo de 20 minutos entre os horários de entrada

// Função para validar se um horário está no formato correto XX:03, XX:23 ou XX:43
const isValidEntryTime = (timeStr: string): boolean => {
  if (!timeStr || typeof timeStr !== 'string') return false;
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return false;
  
  return VALID_MINUTES.includes(minutes);
};

// Função para gerar o próximo horário válido após um determinado horário
const getNextValidTime = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Encontrar o próximo minuto válido
  let nextMinuteIndex = VALID_MINUTES.findIndex(m => m > minutes);
  
  // Se não encontrarmos um minuto maior, vamos para a próxima hora
  if (nextMinuteIndex === -1) {
    const nextHour = (hours + 1) % 24;
    return `${nextHour.toString().padStart(2, '0')}:${VALID_MINUTES[0].toString().padStart(2, '0')}`;
  }
  
  // Caso contrário, mantemos a hora e atualizamos apenas os minutos
  return `${hours.toString().padStart(2, '0')}:${VALID_MINUTES[nextMinuteIndex].toString().padStart(2, '0')}`;
};

// Função para calcular os próximos 3 horários válidos a partir de agora
const calculateNextThreeValidTimes = (): string[] => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Formatar hora atual
  const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
  
  // Encontrar o primeiro horário válido após o horário atual
  let firstValidTime: string;
  
  // Verificar qual é o próximo minuto válido dentro da hora atual
  const nextValidMinute = VALID_MINUTES.find(m => m > currentMinute);
  
  if (nextValidMinute) {
    // Se encontrarmos um minuto válido na hora atual
    firstValidTime = `${currentHour.toString().padStart(2, '0')}:${nextValidMinute.toString().padStart(2, '0')}`;
  } else {
    // Se não, vamos para o primeiro minuto válido da próxima hora
    const nextHour = (currentHour + 1) % 24;
    firstValidTime = `${nextHour.toString().padStart(2, '0')}:${VALID_MINUTES[0].toString().padStart(2, '0')}`;
  }
  
  // Calcular os próximos dois horários
  const secondValidTime = getNextValidTime(firstValidTime);
  const thirdValidTime = getNextValidTime(secondValidTime);
  
  return [firstValidTime, secondValidTime, thirdValidTime];
};

// Definir a lista de ativos disponíveis no escopo global para uso em múltiplas funções
const availableAssets = [
  { symbol: 'Gold/Silver (OTC)', exchange: 'Digital' },
  { symbol: 'Worldcoin (OTC)', exchange: 'Digital' },
  { symbol: 'USD/THB (OTC)', exchange: 'Digital' },
  { symbol: 'ETH/USD (OTC)', exchange: 'Digital' },
  { symbol: 'CHF/JPY (OTC)', exchange: 'Digital' },
  { symbol: 'Pepe (OTC)', exchange: 'Digital' },
  { symbol: 'GBP/AUD (OTC)', exchange: 'Digital' },
  { symbol: 'GBP/CHF (OTC)', exchange: 'Digital' },
  { symbol: 'GBP/CAD (OTC)', exchange: 'Digital' },
  { symbol: 'EUR/JPY (OTC)', exchange: 'Digital' },
  { symbol: 'AUD/CHF (OTC)', exchange: 'Digital' },
  { symbol: 'GER 30 (OTC)', exchange: 'Digital' },
  { symbol: 'AUD/CHF (OTC)', exchange: 'Digital' },
  { symbol: 'EUR/AUD (OTC)', exchange: 'Digital' },
  { symbol: 'USD/CAD (OTC)', exchange: 'Digital' },
  { symbol: 'BTC/USD (OTC)', exchange: 'Digital' },
  { symbol: 'Amazon/Ebay (OTC)', exchange: 'Digital' },
  { symbol: 'Coca-Cola Company (OTC)', exchange: 'Digital' },
  { symbol: 'AIG (OTC)', exchange: 'Digital' },
  { symbol: 'Amazon/Alibaba (OTC)', exchange: 'Digital' },
  { symbol: 'Bitcoin Cash (OTC)', exchange: 'Digital' },
  { symbol: 'AUD/USD (OTC)', exchange: 'Digital' },
  { symbol: 'DASH (OTC)', exchange: 'Digital' },
  { symbol: 'BTC/USD (OTC)', exchange: 'Digital' },
  { symbol: 'SP 35 (OTC)', exchange: 'Digital' },
  { symbol: 'TRUMP Coin (OTC)', exchange: 'Digital' },
  { symbol: 'US 100 (OTC)', exchange: 'Digital' },
  { symbol: 'EUR/CAD (OTC)', exchange: 'Digital' },
  { symbol: 'HK 33 (OTC)', exchange: 'Digital' },
  { symbol: 'Alphabet/Microsoft (OTC)', exchange: 'Digital' },
  { symbol: '1000Sats (OTC)', exchange: 'Digital' },
  { symbol: 'USD/ZAR (OTC)', exchange: 'Digital' },
  { symbol: 'Litecoin (OTC)', exchange: 'Digital' },
  { symbol: 'Hamster Kombat (OTC)', exchange: 'Digital' },
  { symbol: 'USD Currency Index (OTC)', exchange: 'Digital' },
  { symbol: 'AUS 200 (OTC)', exchange: 'Digital' },
  { symbol: 'USD/CAD (OTC)', exchange: 'Digital' },
  { symbol: 'MELANIA Coin (OTC)', exchange: 'Digital' },
  { symbol: 'JP 225 (OTC)', exchange: 'Digital' },
  { symbol: 'AUD/CAD (OTC)', exchange: 'Digital' },
  { symbol: 'AUD/JPY (OTC)', exchange: 'Digital' },
  { symbol: 'US 500 (OTC)', exchange: 'Digital' }
];

// Obter o tempo de expiração dependendo do modo
const getExpirationTimeout = () => {
  return TEST_MODE ? TEST_TIMEOUT : AUTO_COMPLETE_TIMEOUT;
};

// Função para calcular o próximo horário válido (03, 23, 43)
const calculateNextValidTime = (currentTime: string): string => {
  const [hours, minutes] = currentTime.split(':').map(Number);
  
  // Padrões válidos de minutos
  const validMinutes = [3, 23, 43];
  
  // Encontrar o próximo minuto válido
  let nextMinute = validMinutes.find(m => m > minutes);
  let nextHour = hours;
  
  // Se não encontrou um minuto válido na hora atual, usar o primeiro da próxima hora
  if (!nextMinute) {
    nextMinute = validMinutes[0]; // 03
    nextHour = (hours + 1) % 24;
  }
  
  return `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;
};

// Função auxiliar para obter o slot de tempo atual (a cada 10 min)
const getInitialTimeSlot = (): string => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const minuteSlot = Math.floor(minutes / 10);
  return `${hours.toString().padStart(2, '0')}:${minuteSlot}`;
};

// Função auxiliar para calcular o próximo horário
const calculateNextTime = (timeStr, minutesToAdd) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  let newMinutes = minutes + minutesToAdd;
  let newHours = hours;
  
  while (newMinutes >= 60) {
    newHours = (newHours + 1) % 24;
    newMinutes -= 60;
  }
  
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
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
  try {
    const cachedSignalsStr = localStorage.getItem('dashboard-signals-cache');
    if (cachedSignalsStr) {
      const cachedData = JSON.parse(cachedSignalsStr);
      if (cachedData && cachedData.signals && cachedData.timestamp) {
        // Verificar se o cache expirou (10 minutos)
      const now = Date.now();
        if (now - cachedData.timestamp < CACHE_DURATION) {
          console.log(`Usando sinais do localStorage para o slot ${cachedData.timeSlot || 'unknown'}`);
          
          // Validar os sinais do cache
          const validatedSignals = validateCachedSignals(cachedData.signals);
          
          // Se não houver sinais válidos após validação, retornar null
          if (!validatedSignals || validatedSignals.length === 0) {
            console.log('Nenhum sinal válido no cache');
            return null;
          }
          
          return {
            signals: validatedSignals,
            timestamp: cachedData.timestamp,
            timeSlot: cachedData.timeSlot
          };
        } else {
          console.log('Cache expirado, limpando...');
          localStorage.removeItem('dashboard-signals-cache');
        }
      }
    }
  } catch (e) {
    console.error('Erro ao verificar sinais no localStorage:', e);
    // Em caso de erro, limpar o cache por segurança
    localStorage.removeItem('dashboard-signals-cache');
  }
  return null;
};

// Função para validar sinais do cache
const validateCachedSignals = (signals: EnrichedSignal[]): EnrichedSignal[] | null => {
  if (!signals || !Array.isArray(signals)) return null;
  
  // Verificar a hora atual para validar horários
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Filtrar sinais com horários válidos
  const validSignals = signals.filter(signal => {
    if (!signal.entry_time) return false;
    
    // Extrair hora e minuto do sinal
    const [entryHour, entryMin] = signal.entry_time.split(':').map(Number);
    
    // Calcular diferença de tempo
    let hourDiff = entryHour - currentHour;
    if (hourDiff < -12) hourDiff += 24; // Ajustar para ciclo de 24h
    if (hourDiff > 12) hourDiff -= 24;
    
    // Aceitar apenas sinais com horários próximos ou futuros
    // (até 2 horas para trás ou até 6 horas para frente)
    const isValidTime = (hourDiff >= -2 && hourDiff <= 6);
    
    if (!isValidTime) {
      console.log(`Sinal ${signal.symbol} com horário inválido: ${signal.entry_time}`);
    }
    
    return isValidTime;
  });
  
  console.log(`Sinais validados: ${validSignals.length} de ${signals.length}`);
  
  if (validSignals.length === 0) return null;
  
  // Certificar que temos IDs únicos
  const timestamp = Date.now();
  return validSignals.map((signal, index) => ({
    ...signal,
    id: signal.id || `signal_${timestamp}_${index}_${Math.random().toString(36).substring(2, 9)}`
  }));
};

// Salvar cache no localStorage e no cache global
const saveSignalsToLocalStorage = (signals, timestamp, timeSlot) => {
  try {
    // Verificar se temos sinais válidos
    if (!signals || signals.length === 0) {
      console.warn('Tentativa de salvar sinais vazios no localStorage');
      return;
    }
    
    // Preparar dados para salvar
    const dataToSave = {
      signals: signals,
      timestamp: timestamp || Date.now(),
      timeSlot: timeSlot || getInitialTimeSlot()
    };
    
    // Salvar no localStorage
    localStorage.setItem('dashboard-signals-cache', JSON.stringify(dataToSave));
    
    console.log(`Sinais da dashboard salvos no localStorage: Array(${signals.length})`);
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

// Função para criar um objeto de sinal
const createSignalObject = (timeConfig) => {
  // Escolher um ativo aleatório
  const selectedAsset = availableAssets[Math.floor(Math.random() * availableAssets.length)];
  
  // Decidir entre BUY ou SELL de forma explícita
  const signalType: 'BUY' | 'SELL' = Math.random() > 0.5 ? 'BUY' : 'SELL';
  
  // Validar e corrigir o horário de entrada para o padrão XX:03, XX:23, XX:43
  let entry_time = timeConfig.entry_time || "00:00";
  
  if (!isValidEntryTime(entry_time)) {
    console.warn(`Horário de entrada inválido: ${entry_time}. Corrigindo para formato válido...`);
    
    // Se for uma string de horário, extrair a parte da hora
    if (entry_time && typeof entry_time === 'string' && entry_time.includes(':')) {
      const [hours, minutes] = entry_time.split(':').map(Number);
      
      // Encontrar o minuto válido mais próximo (03, 23, 43)
      const closestMinute = VALID_MINUTES.reduce((prev, curr) => {
        return Math.abs(curr - minutes) < Math.abs(prev - minutes) ? curr : prev;
      }, VALID_MINUTES[0]);
      
      entry_time = `${hours.toString().padStart(2, '0')}:${closestMinute.toString().padStart(2, '0')}`;
    } else {
      // Se não temos um horário válido, usar o próximo horário válido a partir de agora
      const [time1, time2, time3] = calculateNextThreeValidTimes();
      entry_time = time1;
    }
    
    console.log(`Horário corrigido para: ${entry_time}`);
  }
  
  // Recalcular os outros horários com base no horário de entrada corrigido
  const expiry_time_str = timeConfig.expiry_time_str || calculateNextTime(entry_time, SIGNAL_EXPIRY_TIME);
  const gale1_time = timeConfig.gale1_time || expiry_time_str;
  const gale2_time = timeConfig.gale2_time || calculateNextTime(entry_time, SIGNAL_EXPIRY_TIME * 2);
  
  // Criar o sinal
  return {
    id: `signal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    symbol: timeConfig.symbol || selectedAsset.symbol,
    exchange: timeConfig.exchange || selectedAsset.exchange,
    type: Math.random() > 0.5 ? SignalType.TECHNICAL : SignalType.FUNDAMENTAL,
    signal: signalType,
              strength: SignalStrength.STRONG,
    reason: 'Análise algorítmica de padrões',
    timestamp: new Date().toISOString(),
    price: 100 + Math.random() * 900,
    entry_price: 100 + Math.random() * 900,
    stop_loss: 90 + Math.random() * 800,
    target_price: 110 + Math.random() * 1000,
    success_rate: 0.8 + Math.random() * 0.15,
    timeframe: '5m',
    expiry: '5m',
    risk_reward: '1.5:1',
              status: 'active',
    entry_time,
    expiry_time_str,
    gale1_time,
    gale2_time,
    qualityScore: 70 + Math.floor(Math.random() * 30),
    processed: false,
    result: undefined,
    signalNumber: 0,
  };
};

// Função para verificar e evitar sinais com horários duplicados
const validateUniqueEntryTimes = (signals: EnrichedSignal[]): EnrichedSignal[] => {
  if (!signals || signals.length < 2) return signals;
  
  // Mapa para rastrear horários já utilizados
  const entryTimeMap = new Map<string, boolean>();
  
  // Ordenar sinais por horário de entrada
  const orderedSignals = [...signals].sort((a, b) => {
    if (!a.entry_time || !b.entry_time) return 0;
    return a.entry_time.localeCompare(b.entry_time);
  });
  
  // Iterar sobre os sinais e ajustar horários duplicados
  return orderedSignals.map((signal, index) => {
    if (!signal.entry_time) return signal;
    
    // Se este horário já foi usado, precisamos ajustá-lo
    if (entryTimeMap.has(signal.entry_time)) {
      console.log(`Encontrado horário duplicado: ${signal.entry_time}, ajustando...`);
      
      // Calcular um novo horário 2 minutos depois
      const [hours, minutes] = signal.entry_time.split(':').map(Number);
      let newMinutes = minutes + 2;
      let newHours = hours;
      
      // Ajustar hora se necessário
      if (newMinutes >= 60) {
        newHours = (newHours + 1) % 24;
        newMinutes -= 60;
      }
      
      // Formatar o novo horário
      const newEntryTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
      
      // Recalcular os outros horários derivados
      const newExpiryTime = calculateNextTime(newEntryTime, SIGNAL_EXPIRY_TIME);
      const newGale1Time = newExpiryTime;
      const newGale2Time = calculateNextTime(newGale1Time, SIGNAL_EXPIRY_TIME);
      
      console.log(`Horário ajustado para: ${newEntryTime}`);
      
      // Atualizar o sinal com os novos horários
      return {
        ...signal,
        entry_time: newEntryTime,
        expiry_time_str: newExpiryTime,
        gale1_time: newGale1Time,
        gale2_time: newGale2Time
      };
    }
    
    // Marcar este horário como usado
    entryTimeMap.set(signal.entry_time, true);
    return signal;
  });
};

// Função para gerar a sequência de sinais para o dia todo, começando à meia-noite
const generateDailySignals = async () => {
  console.log('Verificando e gerando sinais atualizados com base no horário atual...');
  
  // Verificar se já temos sinais salvos no localStorage
  const savedSignalsData = localStorage.getItem('dailySignalsData');
  const currentDate = new Date().toLocaleDateString();
  
  // Obter hora atual
  const agora = new Date();
  const horaAtual = agora.getHours();
  const minutoAtual = agora.getMinutes();
  
  // Sequência de sinais (para manter histórico)
  let todosSignais = [];
  let todosTimeSlots = [];
  
  // Lista de números de sinal que terão resultado de perda (sinais #7, #24, #42, #57)
  const perdasNumeros = [7, 24, 42, 57];
  
  // Verifica se é a primeira execução do dia ou se não temos dados salvos
  const isFirstRun = !savedSignalsData || 
                    (JSON.parse(savedSignalsData).date !== currentDate && 
                    new Date().getHours() === 0 && 
                    new Date().getMinutes() < 10);
  
  if (isFirstRun) {
    console.log('Primeira execução do dia. Gerando sequência completa de 72 sinais...');
    
    // Gerar a sequência completa de sinais para as 24 horas do dia
    let numeroSinal = 1; // Contador para identificar cada sinal (usado para determinar ganho/perda)
    
    // Para cada hora do dia (0-23)
    for (let hora = 0; hora < 24; hora++) {
      const horaFormatada = hora.toString().padStart(2, '0');
      
      // Para cada padrão de minuto (03, 23, 43)
      const minutosEntrada = ['03', '23', '43'];
      
      for (const minuto of minutosEntrada) {
        // Criar horários para o sinal
        const horarioEntrada = `${horaFormatada}:${minuto}`;
        const horarioExpiracao = calculateNextTime(horarioEntrada, SIGNAL_EXPIRY_TIME); // +5min
        const horarioGale1 = horarioExpiracao; // mesmo que expiração
        const horarioGale2 = calculateNextTime(horarioGale1, SIGNAL_EXPIRY_TIME); // +5min
        const horarioAnimacao = calculateNextTime(horarioGale2, 6); // +6min após gale2
        
        // Criar o objeto do sinal
        const signal = createSignalObject({
          entry_time: horarioEntrada,
          expiry_time_str: horarioExpiracao,
          gale1_time: horarioGale1,
          gale2_time: horarioGale2
        });
        
        // Definir número do sinal para controle
        signal.signalNumber = numeroSinal;
        
        // Determinar se o sinal já passou com base no horário atual
        const [entryHour, entryMin] = horarioEntrada.split(':').map(Number);
        const [animHour, animMin] = horarioAnimacao.split(':').map(Number);
        
        const entradaJaPassou = 
          (horaAtual > entryHour) || 
          (horaAtual === entryHour && minutoAtual >= entryMin);
        
        // Calcular 20 minutos após a entrada
        let twentyMinutesAfterHour = entryHour;
        let twentyMinutesAfterMin = entryMin + 20;
        
        if (twentyMinutesAfterMin >= 60) {
          twentyMinutesAfterHour = (twentyMinutesAfterHour + 1) % 24;
          twentyMinutesAfterMin = twentyMinutesAfterMin - 60;
        }
        
        const twentyMinutesPassou = 
          (horaAtual > twentyMinutesAfterHour) || 
          (horaAtual === twentyMinutesAfterHour && minutoAtual >= twentyMinutesAfterMin);
        
        // Se passaram 20 minutos da entrada, marcar como processado
        if (twentyMinutesPassou) {
          signal.processed = true;
          
          // Definir o resultado com base na lista de sinais com perda
          signal.result = perdasNumeros.includes(numeroSinal) ? 'failure' : 'success';
        } 
        // Se a entrada já passou mas ainda não completou 20 minutos, manter o sinal ativo
        else if (entradaJaPassou) {
          // Calcular 20 minutos após a entrada
          const [entryHour, entryMin] = horarioEntrada.split(':').map(Number);
          let twentyMinutesAfterHour = entryHour;
          let twentyMinutesAfterMin = entryMin + 20;
          
          if (twentyMinutesAfterMin >= 60) {
            twentyMinutesAfterHour = (twentyMinutesAfterHour + 1) % 24;
            twentyMinutesAfterMin = twentyMinutesAfterMin - 60;
          }
          
          const twentyMinutesPassou = 
            (horaAtual > twentyMinutesAfterHour) || 
            (horaAtual === twentyMinutesAfterHour && minutoAtual >= twentyMinutesAfterMin);
          
                  if (twentyMinutesPassou) {
          // Após 20 minutos, processar diretamente
          signal.processed = true;
            signal.result = perdasNumeros.includes(numeroSinal) ? 'failure' : 'success';
        } else {
          // Ainda não completou 20 minutos, manter como ativo
          signal.processed = false;
          }
        }
        
        // Adicionar à lista
        todosSignais.push(signal);
        todosTimeSlots.push(horarioEntrada);
        
        // Incrementar o contador de sinal
        numeroSinal++;
      }
    }
  } else {
    // Não é a primeira execução, recuperar dados do localStorage
    console.log('Recuperando dados de sinais do localStorage...');
    const savedData = JSON.parse(savedSignalsData);
    todosSignais = savedData.signals || [];
    todosTimeSlots = savedData.timeSlots || [];
    
    // Atualizar o status dos sinais com base no horário atual
    todosSignais.forEach(signal => {
      if (!signal.entry_time || !signal.gale2_time) return;
      
      // Extrair número do sinal
      const numeroSinal = signal.signalNumber || 0;
      
      // Calcular horário de animação (6min após gale2)
      const horarioAnimacao = calculateNextTime(signal.gale2_time, 6);
      
      // Verificar se a entrada já passou
      const [entryHour, entryMin] = signal.entry_time.split(':').map(Number);
      const entradaJaPassou = 
        (horaAtual > entryHour) || 
        (horaAtual === entryHour && minutoAtual >= entryMin);
      
      // Verificar se o gale2 já passou
      const [gale2Hour, gale2Min] = signal.gale2_time.split(':').map(Number);
      const gale2JaPassou = 
        (horaAtual > gale2Hour) || 
        (horaAtual === gale2Hour && minutoAtual >= gale2Min);
      
      // Verificar se o momento da animação já passou
      const [animHour, animMin] = horarioAnimacao.split(':').map(Number);
      const animacaoJaPassou = 
        (horaAtual > animHour) || 
        (horaAtual === animHour && minutoAtual >= animMin);
      
      // Atualizar o estado do sinal - só processar após 20 minutos da entrada
      if (!signal.processed) {
        // Calcular 20 minutos após a entrada
        const [entryHour, entryMin] = signal.entry_time.split(':').map(Number);
        let twentyMinutesAfterHour = entryHour;
        let twentyMinutesAfterMin = entryMin + 20;
        
        if (twentyMinutesAfterMin >= 60) {
          twentyMinutesAfterHour = (twentyMinutesAfterHour + 1) % 24;
          twentyMinutesAfterMin = twentyMinutesAfterMin - 60;
        }
        
        const twentyMinutesPassou = 
          (horaAtual > twentyMinutesAfterHour) || 
          (horaAtual === twentyMinutesAfterHour && minutoAtual >= twentyMinutesAfterMin);
        
        if (twentyMinutesPassou) {
          // Completou 20 minutos, processar diretamente
          signal.processed = true;
          signal.result = perdasNumeros.includes(numeroSinal) ? 'failure' : 'success';
        }
      }
    });
  }
  
  // Filtrar para manter apenas os sinais relevantes para exibição
  // Queremos mostrar:
  // 1. Sinais não processados (futuros ou em andamento)
  // 2. Sinais processados recentemente
  let sinaisRelevantes = [...todosSignais].filter(signal => {
    if (!signal.entry_time) return false;
    
    // Sinais não processados são relevantes
    if (!signal.processed) return true;
    
    // Sinais processados recentemente (última hora)
    if (signal.processed) {
      const [entryHour, entryMin] = signal.entry_time.split(':').map(Number);
      const horaEntrada = new Date();
      horaEntrada.setHours(entryHour, entryMin, 0, 0);
      
      const diffMs = agora.getTime() - horaEntrada.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);
      
      return diffHoras <= 1; // Mostrar sinais processados na última hora
    }
    
    return false;
  });
  
  // Ordenar por horário de entrada
  sinaisRelevantes = sinaisRelevantes.sort((a, b) => {
    if (!a.entry_time || !b.entry_time) return 0;
    
    // Extrair hora e minuto
    const [aHour, aMin] = a.entry_time.split(':').map(Number);
    const [bHour, bMin] = b.entry_time.split(':').map(Number);
    
    // Converter para minutos totais para comparação
    const aTotalMinutos = aHour * 60 + aMin;
    const bTotalMinutos = bHour * 60 + bMin;
    
    // Ajustar para considerar a virada do dia (00:00)
    const horaTotalAgora = horaAtual * 60 + minutoAtual;
    
    // Se um sinal já passou e outro ainda não
    const aJaPassou = aTotalMinutos < horaTotalAgora;
    const bJaPassou = bTotalMinutos < horaTotalAgora;
    
    if (aJaPassou && !bJaPassou) return 1; // b vem primeiro
    if (!aJaPassou && bJaPassou) return -1; // a vem primeiro
    
    // Ambos passaram ou ambos não passaram, ordenar por horário
    return aTotalMinutos - bTotalMinutos;
  });
  
  // Garantir que temos pelo menos 3 sinais visíveis
  if (sinaisRelevantes.length < 3) {
    console.log('Menos de 3 sinais relevantes. Buscando nos sinais futuros mais próximos...');
    
    // Buscar sinais futuros mais próximos
    const sinaisFuturos = todosSignais
      .filter(s => !s.processed && s.entry_time && !sinaisRelevantes.includes(s))
      .sort((a, b) => {
        if (!a.entry_time || !b.entry_time) return 0;
        return a.entry_time.localeCompare(b.entry_time);
      });
    
    // Adicionar sinais futuros até termos 3 sinais
    while (sinaisRelevantes.length < 3 && sinaisFuturos.length > 0) {
      sinaisRelevantes.push(sinaisFuturos.shift());
    }
  }
  
  // Se ainda não temos 3 sinais, criar sinais emergenciais
  if (sinaisRelevantes.length < 3) {
    console.log('Gerando sinais emergenciais para completar o fluxo...');
    
    // Determinar qual o próximo horário válido (XX:03, XX:23 ou XX:43)
    let proximaHora = horaAtual;
    let proximoMinuto;
    
    if (minutoAtual < 3) {
      proximoMinuto = '03';
    } else if (minutoAtual < 23) {
      proximoMinuto = '23';
    } else if (minutoAtual < 43) {
      proximoMinuto = '43';
    } else {
      proximaHora = (horaAtual + 1) % 24;
      proximoMinuto = '03';
    }
    
    // Criar sinais emergenciais
    const quantidadeFaltante = 3 - sinaisRelevantes.length;
    
    for (let i = 0; i < quantidadeFaltante; i++) {
      const horarioEntrada = `${proximaHora.toString().padStart(2, '0')}:${proximoMinuto}`;
      const horarioExpiracao = calculateNextTime(horarioEntrada, SIGNAL_EXPIRY_TIME);
      const horarioGale1 = horarioExpiracao;
      const horarioGale2 = calculateNextTime(horarioGale1, SIGNAL_EXPIRY_TIME);
      
      const emergencySignal = createSignalObject({
        entry_time: horarioEntrada,
        expiry_time_str: horarioExpiracao,
        gale1_time: horarioGale1,
        gale2_time: horarioGale2
      });
      
      // Configurar o sinal de emergência
      emergencySignal.processed = false;
      emergencySignal.status = 'active' as 'active' | 'completed' | 'cancelled';
      
      // Adicionar à lista de sinais
      sinaisRelevantes.push(emergencySignal);
      todosSignais.push(emergencySignal);
      todosTimeSlots.push(horarioEntrada);
      
      // Avançar para o próximo horário na sequência
      if (proximoMinuto === '03') {
        proximoMinuto = '23';
      } else if (proximoMinuto === '23') {
        proximoMinuto = '43';
      } else {
        proximaHora = (proximaHora + 1) % 24;
        proximoMinuto = '03';
      }
    }
    
    // Reordenar após adicionar sinais de emergência
    sinaisRelevantes = sinaisRelevantes.sort((a, b) => {
      if (!a.entry_time || !b.entry_time) return 0;
      return a.entry_time.localeCompare(b.entry_time);
    });
  }
  
  // Limitar a 7 sinais para exibição
  sinaisRelevantes = sinaisRelevantes.slice(0, 7);
  
  console.log(`Selecionados ${sinaisRelevantes.length} sinais relevantes para exibição`);
  
  // Salvar todos os sinais no cache
  saveDailySignalsToLocalStorage(todosSignais, todosTimeSlots);
  
  // Preparar formato de retorno compatível
  const signalsBySlot = {};
  sinaisRelevantes.forEach(signal => {
    if (signal.entry_time) {
      signalsBySlot[signal.entry_time] = [signal];
    }
  });
  
  return {
    signals: sinaisRelevantes,
    timeSlots: sinaisRelevantes.map(s => s.entry_time),
    signalsBySlot
  };
};

// Obter os sinais para o slot de tempo atual
const getCurrentTimeSlotSignals = (dailySignals, timeSlots) => {
  if (!dailySignals || !timeSlots || timeSlots.length === 0) {
    return [];
  }
  
  const now = new Date();
  const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // Encontrar os 3 sinais mais relevantes para o horário atual
  const relevantSignals = [...dailySignals].sort((a, b) => {
    // Comparar os horários de entrada para encontrar os mais próximos do horário atual
    if (!a.entry_time || !b.entry_time) return 0;
    
    const diffA = getTimeDifferenceInMinutes(a.entry_time, currentTimeStr);
    const diffB = getTimeDifferenceInMinutes(b.entry_time, currentTimeStr);
    
    return diffA - diffB;
  }).slice(0, 3);
  
  console.log(`Usando ${relevantSignals.length} sinais mais relevantes para o horário atual: ${currentTimeStr}`);
  return relevantSignals;
};

// Função para calcular a diferença em minutos entre dois horários no formato "HH:MM"
const getTimeDifferenceInMinutes = (time1: string, time2: string): number => {
  const [hours1, minutes1] = time1.split(':').map(Number);
  const [hours2, minutes2] = time2.split(':').map(Number);
  
  const totalMinutes1 = hours1 * 60 + minutes1;
  const totalMinutes2 = hours2 * 60 + minutes2;
  
  return Math.abs(totalMinutes1 - totalMinutes2);
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

// Nossa interface EnrichedSignal personalizada
interface EnrichedSignal {
  id: string;
  symbol: string;
  type: SignalType;
  signal: 'BUY' | 'SELL';
  reason: string;
  strength: SignalStrength;
  timestamp: string;
  price: number;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  success_rate: number;
  timeframe: string;
  expiry: string;
  risk_reward: string;
  status: 'active' | 'completed' | 'cancelled';
  qualityScore: number;
  entry_time?: string;
  expiry_time_str?: string;
  gale1_time?: string;
  gale2_time?: string;
  exchange?: string;
  categoria?: string;
  newsAnalysis?: any;
  correlationAnalysis?: any;
  onChainMetrics?: any;
  orderBookAnalysis?: any;
  entryTimestamp?: number; // Timestamp para cálculo de tempo decorrido
  processed?: boolean; // Indica se o sinal já foi processado (ganho/perda)
  result?: 'success' | 'failure'; // Resultado do sinal após processamento
  // isAnimating removido - sem animações
  [key: string]: any; // Permite campos adicionais
}

// Estilos CSS para animações personalizadas
const signalCardStyles = `
  @keyframes signalPulse {
    0%, 100% { 
      transform: scale(1);
      opacity: 1;
    }
    50% { 
      transform: scale(1.05);
      opacity: 0.8;
    }
  }
  
  @keyframes signalGlow {
    0%, 100% { 
      filter: drop-shadow(0 0 3px rgba(52, 211, 153, 0.4));
    }
    50% { 
      filter: drop-shadow(0 0 6px rgba(52, 211, 153, 0.7));
    }
  }
  
  @keyframes signalFloat {
    0%, 100% { 
      transform: translateY(0px);
    }
    50% { 
      transform: translateY(-1px);
    }
  }
  
  .signal-highlight-icon {
    animation: signalPulse 3s ease-in-out infinite, signalGlow 3s ease-in-out infinite, signalFloat 2s ease-in-out infinite;
    color: rgb(52, 211, 153);
    transition: all 0.3s ease;
  }
  
  .signal-highlight-icon:hover {
    transform: scale(1.1);
    filter: drop-shadow(0 0 8px rgba(52, 211, 153, 0.8));
  }
`;

const SignalsCard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { convertTimeToSelected } = useTimeZone();
  const [currentPrices, setCurrentPrices] = useState<Record<string, string>>({});
  
  // Use refs para dados que precisam persistir entre re-renderizações
  const mountedRef = useRef<boolean>(false);
  const [completedSignals, setCompletedSignals] = useState<Set<string>>(
    window.completedSignalsRef || new Set()
  );
  const [animatingSignals, setAnimatingSignals] = useState<Set<string>>(new Set());
  const [cachedSignals, setCachedSignals] = useState<EnrichedSignal[]>([]);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string>(getInitialTimeSlot());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Inicializar displayedSignals com valor armazenado globalmente, se disponível
  const [displayedSignals, setDisplayedSignals] = useState<EnrichedSignal[]>(
    window.displayedSignalsRef || []
  );
  
  const [signalQueue, setSignalQueue] = useState<EnrichedSignal[]>([]);
  const animationsRef = useRef<Record<string, any>>({});
  const autoCompleteTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const queryClient = useQueryClient();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingSignals, setRefreshingSignals] = useState(false);
  const [refreshButtonState, setRefreshButtonState] = useState<'idle' | 'loading' | 'success'>('idle');
  
  const slotCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Constante para tempo real de processamento (20 minutos em produção, 30 segundos em teste)
  const SIGNAL_PROCESSING_TIME = TEST_MODE ? 30 * 1000 : 20 * 60 * 1000; // 20 minutos em ms

  // Inicializar o mapa de timers global se não existir
  if (!window.signalTimersMap) {
    window.signalTimersMap = {};
  }

  // Função para verificar se um sinal deve ser processado com base no tempo de entrada
  const shouldProcessSignal = (signal: EnrichedSignal): boolean => {
    if (!signal.entry_time) return false;
    if (signal.processed) return false;
    
    // Converter entry_time para Date
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Extrair a hora e minuto da entrada
    const [hours, minutes] = signal.entry_time.split(':').map(Number);
    
    // Criar um objeto de data para o horário de entrada (hoje)
    const entryDate = new Date(`${today}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
    
    // Ajustar para o dia seguinte se for um horário passado mais de 12 horas
    if (now.getTime() - entryDate.getTime() > 12 * 60 * 60 * 1000) {
      entryDate.setDate(entryDate.getDate() + 1);
    }
    
    // Calcular o tempo de processamento (20 minutos após a entrada)
    const processingTime = new Date(entryDate.getTime() + SIGNAL_PROCESSING_TIME);
    
    // Verificar se já passou do tempo de processamento
    return now.getTime() >= processingTime.getTime();
  };

  // Função para registrar timer persistente por sinal
  const registerPersistentTimer = useCallback((signal) => {
    if (!signal || !signal.entry_time) {
      console.log('Sinal sem horário de entrada, não é possível registrar timer');
      return;
    }
    
    try {
      // Extrair hora e minuto da entrada
      const [entryHour, entryMin] = signal.entry_time.split(':').map(Number);
      
      // Criar objeto de data para o horário de entrada
      const entryDate = new Date();
      entryDate.setHours(entryHour, entryMin, 0, 0);
      
      // Adicionar 20 minutos para obter o horário de processamento
      const processingDate = new Date(entryDate);
      processingDate.setMinutes(processingDate.getMinutes() + 20);
      
      // Ajustar para o próximo dia se necessário
      const now = new Date();
      if (processingDate < now && processingDate.getHours() < now.getHours()) {
        processingDate.setDate(processingDate.getDate() + 1);
      }
      
      // Registrar o timer na janela para persistência
      if (!window.signalTimersMap) {
        window.signalTimersMap = {};
      }
      
    window.signalTimersMap[signal.id] = {
      id: signal.id,
      scheduledTime: entryDate.getTime(),
        processingTime: processingDate.getTime(),
      processed: signal.processed || false
    };
    
      console.log(`Timer persistente registrado para ${signal.symbol} (${signal.id}): será processado em ${processingDate.getHours()}:${processingDate.getMinutes()}:${processingDate.getSeconds()}`);
      
      // Definir um timeout para processar o sinal
      const currentTimeMs = now.getTime();
      const timeToProcessing = processingDate.getTime() - currentTimeMs;
      
      if (timeToProcessing > 0) {
        console.log(`Timer configurado para sinal ${signal.symbol} (ID: ${signal.id}) - Será processado em 20 minutos`);
        
        // Não criar setTimeout para economizar recursos - verificaremos periodicamente
      } else {
        console.log(`Sinal ${signal.symbol} (ID: ${signal.id}) já deveria ter sido processado. Tempo de atraso: ${-timeToProcessing/1000}s`);
      }
    } catch (error) {
      console.error('Erro ao registrar timer persistente:', error);
    }
  }, []);
  
  // Função para rotação automática de sinais após o tempo de expiração (20 minutos)
  const rotateSignals = useCallback(() => {
    console.log('Executando rotação automática de sinais...');
    
    setDisplayedSignals(prev => {
      // Verificar se prev é um array válido com pelo menos 3 sinais
      if (!prev || !Array.isArray(prev) || prev.length < 3) {
        console.log('Não há sinais suficientes para rotação. Tentando recuperar do localStorage...');
        
        // Tentar recuperar sinais do localStorage
        try {
          const cachedData = localStorage.getItem('dashboard-signals-cache');
          if (cachedData) {
            const { signals } = JSON.parse(cachedData);
            if (signals && Array.isArray(signals) && signals.length >= 3) {
              console.log('Recuperados sinais do localStorage');
              return signals;
            }
          }
        } catch (error) {
          console.error('Erro ao recuperar sinais do localStorage:', error);
        }
        
        // Se não conseguir recuperar, manter os sinais atuais
        console.log('Não foi possível recuperar sinais. Mantendo os atuais.');
        return prev;
      }
      
      try {
        console.log('Realizando rotação automática dos sinais...');
        
        // O segundo sinal se torna o primeiro
        const newFirstSignal = { 
          ...prev[1],
          processed: false, // Garantir que o sinal não esteja processado
          result: undefined // Limpar qualquer resultado anterior
        };
        
        // O terceiro sinal se torna o segundo
        const newSecondSignal = { 
          ...prev[2],
          processed: false, // Garantir que o sinal não esteja processado
          result: undefined // Limpar qualquer resultado anterior
        };
        
        // Gerar um novo terceiro sinal baseado no segundo original (que agora é o primeiro)
        // Calcular horário de entrada (20 minutos após o segundo sinal original)
        const [entryHour, entryMin] = prev[1].entry_time.split(':').map(Number);
        let newEntryHour = entryHour;
        let newEntryMin = entryMin + 20; // 20 minutos após o segundo sinal original
        
        // Ajustar se passou de 60 minutos
        if (newEntryMin >= 60) {
          newEntryMin -= 60;
          newEntryHour = (newEntryHour + 1) % 24;
        }
        
        // Formatar novo horário de entrada
        const newEntryTime = `${newEntryHour.toString().padStart(2, '0')}:${newEntryMin.toString().padStart(2, '0')}`;
        
        // Calcular horário de expiração (entrada + 5 minutos)
        let expiryHour = newEntryHour;
        let expiryMin = newEntryMin + 5;
        if (expiryMin >= 60) {
          expiryMin -= 60;
          expiryHour = (expiryHour + 1) % 24;
        }
        const expiryTime = `${expiryHour.toString().padStart(2, '0')}:${expiryMin.toString().padStart(2, '0')}`;
        
        // Calcular Gale 1 (mesma hora que expiração)
        const gale1Time = expiryTime;
        
        // Calcular Gale 2 (Gale 1 + 5 minutos)
        let gale2Hour = expiryHour;
        let gale2Min = expiryMin + 5;
        if (gale2Min >= 60) {
          gale2Min -= 60;
          gale2Hour = (gale2Hour + 1) % 24;
        }
        const gale2Time = `${gale2Hour.toString().padStart(2, '0')}:${gale2Min.toString().padStart(2, '0')}`;
        
        // Gerar um novo sinal com estes horários
        const symbolOptions = [
          'EUR/USD (OTC)', 'GBP/USD (OTC)', 'AUD/USD (OTC)', 'USD/CAD (OTC)', 'USD/CHF (OTC)', 
          'NZD/USD (OTC)', 'EUR/CAD (OTC)', 'EUR/AUD (OTC)', 'USD/JPY (OTC)', 'EUR/JPY (OTC)',
          'GBP/JPY (OTC)', 'AUD/JPY (OTC)', 'USD/MXN (OTC)', 'USD/ZAR (OTC)', 'USD/THB (OTC)',
          'USD/CNH (OTC)', 'Gold/Silver (OTC)', 'Amazon/Alibaba (OTC)', 
          'TRUMP Coin (OTC)', 'MELANIA Coin (OTC)', 'Amazon/Ebay (OTC)', 'Apple/Samsung (OTC)'
        ];
        
        // Escolher um símbolo que não seja igual aos outros dois
        let newSymbol;
        do {
          newSymbol = symbolOptions[Math.floor(Math.random() * symbolOptions.length)];
        } while (newSymbol === newFirstSignal.symbol || newSymbol === newSecondSignal.symbol);
        
        // Criar o novo terceiro sinal
        const timestamp = Date.now();
        const newThirdSignal = {
          ...createSignalObject({
            symbol: newSymbol,
            signal: Math.random() > 0.5 ? 'BUY' : 'SELL',
            entry_time: newEntryTime,
            expiry: '5m',
            expiry_time_str: expiryTime,
            gale1_time: gale1Time,
            gale2_time: gale2Time,
          }),
          id: `signal-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
          processed: false,
          timeframe: '5m'
        };
        
        // Retornar os três sinais atualizados
        const newSignals = [newFirstSignal, newSecondSignal, newThirdSignal];
        
        console.log('Rotação concluída:');
        console.log('- Primeiro sinal (antigo segundo):', newFirstSignal.symbol, newFirstSignal.entry_time);
        console.log('- Segundo sinal (antigo terceiro):', newSecondSignal.symbol, newSecondSignal.entry_time);
        console.log('- Novo terceiro sinal:', newThirdSignal.symbol, newThirdSignal.entry_time);
        
        // Salvar no localStorage para persistência
        try {
          localStorage.setItem('dashboard-signals-cache', JSON.stringify({
            signals: newSignals,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error('Erro ao salvar sinais no localStorage:', error);
        }
        
        return newSignals;
      } catch (error) {
        console.error('Erro durante a rotação de sinais:', error);
        return prev;
      }
    });
  }, []);
  
  // Efeito para gerenciar montagem única
  useEffect(() => {
    const now = Date.now();
    
    // Verificar se o componente já está montado e se a última montagem foi recente (menos de 1 segundo)
    if (window.signalsCardMounted && window.lastMountTimestamp && now - window.lastMountTimestamp < 1000) {
      console.log('SignalsCard já está montado, evitando montagem duplicada');
      mountedRef.current = false;
      return;
    }
    
    console.log('Montando SignalsCard pela primeira vez ou após período adequado');
    window.signalsCardMounted = true;
    window.lastMountTimestamp = now;
    mountedRef.current = true;
    
    return () => {
      // Limpar apenas se esta instância estiver realmente montada
      if (mountedRef.current) {
        console.log('Desmontando SignalsCard (instância ativa)');
        window.signalsCardMounted = false;
        mountedRef.current = false;
      }
    };
  }, []);
  
  // Efeito para sincronizar estado global
  useEffect(() => {
    if (!mountedRef.current) return;
    
    window.displayedSignalsRef = displayedSignals;
    window.completedSignalsRef = completedSignals;
  }, [displayedSignals, completedSignals]);
  
  // Hook para enviar notificações 5 minutos antes do horário de entrada dos sinais
  // e 10 minutos após para informar o resultado (70% ganho, 30% perda)
  const { notificationsEnabled } = useSignalNotifications(
    // Converter para o formato esperado pelo hook
    displayedSignals?.map(signal => ({
      ...signal,
      timestamp: typeof signal.timestamp === 'string' ? new Date(signal.timestamp).getTime() : 0,
      pair: signal.symbol
    })) as any,
    {
      notifyMinutesBefore: 5,       // Notificar 5 minutos antes da entrada
      notifyResultAfterMinutes: 10, // Notificar resultado 10 minutos após a entrada
      successRate: 0.7,             // 70% de chance de sucesso
      enabled: mountedRef.current   // Ativar apenas para a instância principal
    }
  );
  
  const getCurrentTimeSlot = useCallback(() => {
    const now = new Date();
    const minutes = Math.floor(now.getMinutes() / 10) * 10;
    return `${now.getHours().toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, []);
  
  const loadCachedSignalsIfAvailable = useCallback(() => {
    const cache = checkLocalStorageSignals();
    if (cache && cache.signals && cache.timeSlot === currentTimeSlot) {
      console.log(`Carregando sinais em cache para o slot ${currentTimeSlot}`);
      setCachedSignals(cache.signals);
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
        
        // Verificar se os sinais existentes já passaram 20 minutos do seu horário de entrada
        const now = new Date();
        const shouldReload = !displayedSignals || displayedSignals.every(signal => {
          if (!signal.entry_time) return true;
          
          // Verificar se passou 20 minutos desde o horário de entrada
          return shouldProcessSignal(signal);
        });
        
        // Só limpar o cache se todos os sinais já tiverem passado do tempo de processamento
        if (shouldReload) {
          console.log('Todos os sinais já passaram do tempo de processamento, gerando novos sinais');
          setCachedSignals([]);
          setRetryCount(prev => prev + 1);
        } else {
          console.log('Mantendo sinais existentes pois ainda não completaram 20 minutos');
        }
      }
    };
    
    slotCheckIntervalRef.current = setInterval(checkTimeSlot, 30 * 1000); // Verificar a cada 30 segundos
    
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

  // Efeito para salvar os sinais da dashboard no localStorage
  useEffect(() => {
    if (displayedSignals && displayedSignals.length > 0) {
      try {
        // Limitar para no máximo 3 sinais
        const signalsToSave = displayedSignals.slice(0, 3);
        
        // Salvar no localStorage
        localStorage.setItem('dashboardSignals', JSON.stringify({
          signals: signalsToSave,
          timestamp: new Date().getTime()
        }));
        
        console.log('Sinais da dashboard salvos no localStorage:', signalsToSave);
      } catch (error) {
        console.error('Erro ao salvar sinais da dashboard:', error);
      }
    }
  }, [displayedSignals]);

  // Efeito removido - sem animações

  // Efeito removido - sem animações

  // Função auxiliar para obter o horário de entrada como Date
  const getEntryTimeAsDate = useCallback((signal: any): Date => {
    if (!signal.entry_time) return new Date();
    
    const now = new Date();
    const [hours, minutes] = signal.entry_time.split(':').map(Number);
    const entryDate = new Date(now);
    entryDate.setHours(hours, minutes, 0, 0);
    
    return entryDate;
  }, []);

  const sortSignalsByEntryTime = useCallback((signals: any[]) => {
    if (!signals) return [];
    
    // Ordenar por horário de entrada crescente (menor para maior)
    return [...signals].sort((a, b) => {
      const entryTimeA = getEntryTimeAsDate(a).getTime();
      const entryTimeB = getEntryTimeAsDate(b).getTime();
      
      return entryTimeA - entryTimeB; // Ordem crescente: menor horário primeiro
    });
  }, [getEntryTimeAsDate]);

  const fetchSignals = useCallback(async (): Promise<EnrichedSignal[]> => {
    console.log('Buscando sinais de trading...');
    
    try {
      // Verificar se temos sinais em cache primeiro
      if (cachedSignals.length > 0) {
        console.log('Usando sinais em cache');
        
        // Verificar se algum sinal expirou
        const now = new Date();
        const updatedSignals = cachedSignals.map(signal => {
          if (signal.expiry_time_str) {
            const [expiryHour, expiryMin] = signal.expiry_time_str.split(':').map(Number);
            const expiryTime = new Date();
            expiryTime.setHours(expiryHour, expiryMin, 0);
            
            if (now > expiryTime && !signal.processed) {
              console.log(`Sinal ${signal.symbol} expirou`);
              return { ...signal, expired: true };
            }
          }
          return signal;
        });
        
        // Atualizar os sinais expirados
        setCachedSignals(updatedSignals);
        // Garantir que retornamos exatamente 3 sinais ordenados
        const sortedSignals = sortSignalsByEntryTime(updatedSignals);
        console.log(`Limitando para exatamente 3 sinais do cache (antes: ${sortedSignals.length})`);
        return sortedSignals.slice(0, 3);
      }
      
      // Tente carregar sinais do cache
      if (loadCachedSignalsIfAvailable()) {
        console.log('Carregando sinais de cache...');
        // Garantir que retornamos exatamente 3 sinais ordenados
        const sortedSignals = sortSignalsByEntryTime(cachedSignals);
        console.log(`Limitando para exatamente 3 sinais do cache carregado (antes: ${sortedSignals.length})`);
        return sortedSignals.slice(0, 3);
      }
      
      console.log('Gerando novos sinais...');
      
      // Obter sinais diários
      const dailySignalsData = await generateDailySignals();
      
      // Verificar se temos sinais para o slot atual
      const signalsForCurrentSlot = getCurrentTimeSlotSignals(
        dailySignalsData.signals, 
        dailySignalsData.timeSlots
      );
      
      // Verificar se temos sinais relevantes
      let relevantSignals = signalsForCurrentSlot;
      
      // Se não temos sinais, usar um conjunto padrão de sinais
      if (relevantSignals.length === 0) {
        console.log('Nenhum sinal encontrado para o slot atual, usando todos os sinais disponíveis');
        relevantSignals = dailySignalsData.signals;
      }
      
      // Garantir que existam no mínimo 3 sinais, garantindo o fluxo XX:03, XX:23, XX:43
      if (relevantSignals.length < 3) {
        console.log(`Poucos sinais disponíveis (${relevantSignals.length}). Gerando mais sinais para garantir o fluxo.`);
        
        // Obter o último sinal para referência ou criar um horário inicial
        let ultimoHorario = "00:03";
        if (relevantSignals.length > 0 && relevantSignals[relevantSignals.length - 1].entry_time) {
          ultimoHorario = relevantSignals[relevantSignals.length - 1].entry_time;
        }
        
        // Calcular os próximos horários na sequência
        const proximosHorarios = [];
        let [hora, minuto] = ultimoHorario.split(':').map(Number);
        
        // Determinar o próximo horário válido na sequência
        if (minuto < 3) minuto = 3;
        else if (minuto < 23) minuto = 23;
        else if (minuto < 43) minuto = 43;
        else {
          hora = (hora + 1) % 24;
          minuto = 3;
        }
        
        // Calcular quantos sinais precisamos gerar
        const quantidadeFaltante = 3 - relevantSignals.length;
        
        // Gerar os novos horários
        for (let i = 0; i < quantidadeFaltante; i++) {
          const horarioFormatado = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
          proximosHorarios.push(horarioFormatado);
          
          // Avançar para o próximo horário na sequência
          if (minuto === 3) minuto = 23;
          else if (minuto === 23) minuto = 43;
          else {
            hora = (hora + 1) % 24;
            minuto = 3;
          }
        }
        
        // Criar os sinais complementares
        for (const horario of proximosHorarios) {
          const expiryTime = calculateNextTime(horario, SIGNAL_EXPIRY_TIME);
          const gale1Time = expiryTime;
          const gale2Time = calculateNextTime(gale1Time, SIGNAL_EXPIRY_TIME);
          
          // Criar um novo sinal
          const novoSinal = createSignalObject({
            entry_time: horario,
            expiry_time_str: expiryTime,
            gale1_time: gale1Time,
            gale2_time: gale2Time
          });
          
          // Garantir que esteja ativo
          novoSinal.processed = false;
          novoSinal.status = 'active' as 'active' | 'completed' | 'cancelled';
          
          // Adicionar à lista de sinais
          relevantSignals.push(novoSinal);
        }
      }
      
      // Ordenar os sinais por horário
      relevantSignals = sortSignalsByEntryTime(relevantSignals);
      
      // Verificar se temos pelo menos 3 sinais diferentes no padrão XX:03, XX:23, XX:43
      const horariosUnicos = new Set(relevantSignals.map(s => s.entry_time?.slice(-2)));
      
      if (horariosUnicos.size < 3) {
        console.log('Não temos sinais nos 3 padrões diferentes (XX:03, XX:23, XX:43). Complementando...');
        
        // Verificar quais padrões estão faltando
        const padroesMinutos = ['03', '23', '43'];
        const padroesFaltantes = padroesMinutos.filter(p => !horariosUnicos.has(p));
        
        // Para cada padrão faltante, criar um novo sinal
        for (const padrao of padroesFaltantes) {
          // Determinar a próxima hora válida
          const now = new Date();
          let hora = now.getHours();
          const minutoAtual = now.getMinutes();
          
          // Se o minuto do padrão já passou na hora atual, usar a próxima hora
          if (parseInt(padrao) <= minutoAtual) {
            hora = (hora + 1) % 24;
          }
          
          const horarioEntrada = `${hora.toString().padStart(2, '0')}:${padrao}`;
          
          // Verificar se este horário já existe
          if (relevantSignals.some(s => s.entry_time === horarioEntrada)) {
            continue;
          }
          
          const expiryTime = calculateNextTime(horarioEntrada, SIGNAL_EXPIRY_TIME);
          const gale1Time = expiryTime;
          const gale2Time = calculateNextTime(gale1Time, SIGNAL_EXPIRY_TIME);
          
          // Criar um novo sinal com este padrão
          const complementoSinal = createSignalObject({
            entry_time: horarioEntrada,
            expiry_time_str: expiryTime,
            gale1_time: gale1Time,
            gale2_time: gale2Time
          });
          
          // Garantir que esteja ativo
          complementoSinal.processed = false;
          complementoSinal.status = 'active' as 'active' | 'completed' | 'cancelled';
          
          // Adicionar à lista de sinais
          relevantSignals.push(complementoSinal);
        }
        
        // Reordenar após as adições
        relevantSignals = sortSignalsByEntryTime(relevantSignals);
      }
      
      // Limitar a no máximo 7 sinais, garantindo no mínimo 3
      if (relevantSignals.length > 7) {
        relevantSignals = relevantSignals.slice(0, 7);
      }
      
      console.log(`Exibindo ${relevantSignals.length} sinais para o Dashboard`);
      
      // Atualizar preços atuais dos sinais
      const updatedSignals: EnrichedSignal[] = await Promise.all(
        relevantSignals.map(async (signal: any) => {
          try {
            // Tentar atualizar o preço atual do sinal
            const signalWithPrice = await tradingSignalService.updateSignalCurrentPrice(signal as any);
            return {
              ...signalWithPrice,
              id: signalWithPrice.id || `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              // Garantir que todos os campos obrigatórios estejam presentes
              type: signalWithPrice.type || SignalType.TECHNICAL,
              strength: signalWithPrice.strength || SignalStrength.STRONG,
              timestamp: typeof signalWithPrice.timestamp === 'string' 
                    ? signalWithPrice.timestamp 
                : new Date().toISOString(),
              qualityScore: signalWithPrice.success_rate ? signalWithPrice.success_rate * 100 : 90
            } as EnrichedSignal;
          } catch (error) {
            console.error('Erro ao atualizar preço do sinal:', error);
            return signal as EnrichedSignal;
          }
        })
      );
      
      // Validar e garantir que não temos horários duplicados
      const uniqueTimeSignals = validateUniqueEntryTimes(updatedSignals);
      
      // Atualizar o cache
      setCachedSignals(uniqueTimeSignals);
      saveSignalsToLocalStorage(uniqueTimeSignals, Date.now(), currentTimeSlot);
      
      // Antes de retornar os sinais, garantir que temos exatamente 3
      const finalSignals = ensureThreeSignals(uniqueTimeSignals);
      
      // Verificação extra para garantir que temos exatamente 3 sinais
      if (finalSignals.length > 3) {
        console.log(`Limitando ${finalSignals.length} sinais para apenas 3 na dashboard`);
        return finalSignals.slice(0, 3);
      }
      
      return finalSignals;
    } catch (error) {
      console.error("Erro ao buscar sinais de trading:", error);
      throw error;
    }
  }, [currentTimeSlot, cachedSignals, loadCachedSignalsIfAvailable, sortSignalsByEntryTime]);
  
  // Corrigir a configuração do useQuery
  const { data: signals, isLoading, error, refetch } = useQuery<EnrichedSignal[], Error>({
    queryKey: ['dashboardSignals', retryCount, currentTimeSlot],
    queryFn: fetchSignals,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
    staleTime: Infinity,
    gcTime: CACHE_DURATION
  });

  // Efeito para processar novos sinais, garantindo sempre exatamente 3 sinais
  useEffect(() => {
    if (!signals) return;
    
    const signalsArray = signals as EnrichedSignal[] | undefined;
    if (!signalsArray) return;
    
    try {
      // Primeiro, limitar a exatamente 3 sinais no dados originais para evitar duplicação
      const limitedSignals = signalsArray.slice(0, 3);
      
      // Verificar se há sinais novos para adicionar, mas sempre limitar ao máximo de 3
      const currentSignalIds = limitedSignals.map(s => s.id).join(',');
      const displayedIds = displayedSignals.map(s => s.id).join(',');
      
      // Verificar se os sinais são realmente diferentes
      if (currentSignalIds !== displayedIds) {
        // Se não há sinais exibidos ainda, simplesmente atualizar com os novos sinais limitados
        if (displayedSignals.length === 0) {
          console.log(`Inicializando com ${limitedSignals.length} sinais (limitado a 3)`);
          setDisplayedSignals(limitedSignals);
        } else {
          console.log('Detectada alteração nos sinais, atualizando e mantendo limite de 3');
          
          // Manter sinais existentes na mesma ordem, apenas adicionar novos até o limite de 3
          const existingSignals = [...displayedSignals];
          const newSignals = limitedSignals.filter(s => !existingSignals.some(es => es.id === s.id));
          
          if (newSignals.length > 0) {
            console.log(`Adicionando ${newSignals.length} novos sinais, mantendo limite de 3`);
            const combinedSignals = [...existingSignals, ...newSignals];
            // Garantir sempre o limite de 3 sinais
            const updatedSignals = combinedSignals.slice(0, 3);
            console.log(`Total após atualização: ${updatedSignals.length} sinais`);
            
            // Atualizar tanto o estado local quanto o cache do React Query
            setDisplayedSignals(updatedSignals);
            queryClient.setQueryData(['dashboardSignals', retryCount, currentTimeSlot], updatedSignals);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao processar sinais:', error);
    }
  }, [signals, displayedSignals, queryClient, retryCount, currentTimeSlot]);

  // Função para atualizar sinais (movida para antes do seu uso)
  const handleRefresh = useCallback(() => {
    console.log('Solicitação de atualização manual dos sinais');
    
    // Limpar completamente todas as caches
        localStorage.removeItem('dashboard-signals-cache');
        localStorage.removeItem('dashboard-signals-lastUpdated');
        localStorage.removeItem('dashboardSignals');
    
    // Limpar também os timers persistentes
    if (window.signalTimersMap) {
      window.signalTimersMap = {};
    }
    
    // Limpar sinais atuais e completamente resetar o estado
    setDisplayedSignals([]);
    setCachedSignals([]);
    
    // Reiniciar contagem para proporção de ganho/perda
    signalProcessCount = 0;
    
    // Definir como atualizando para mostrar animação
    setIsRefreshing(true);
    setRefreshingSignals(true);
    
    // Gerar novos sinais completamente novos
        setTimeout(() => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Encontrar horários válidos a partir de agora
      const validTimes = calculateNextThreeValidTimes();
      console.log('Gerando sinais com novos horários:', validTimes);
      
      // Gerar sinais completamente novos
      const newSignals = generateNewSignals(validTimes);
      
      // Atualizar sinais e salvar no localStorage
      setDisplayedSignals(newSignals);
      saveSignalsToLocalStorage(newSignals, Date.now(), getInitialTimeSlot());
      
      // Configurar timers para os novos sinais
      newSignals.forEach(signal => {
        registerPersistentTimer(signal);
      });
      
      // Remover estados de atualização
      setIsRefreshing(false);
    setTimeout(() => {
        setRefreshingSignals(false);
        
        // Mostrar o badge de sucesso temporariamente
        setRefreshButtonState('success');
        setTimeout(() => setRefreshButtonState('default'), 3000);
      }, 500);
    }, 1000);
  }, []);

  // Verificador automático de expiração de sinais que controla a rotação
  // A rotação ocorre automaticamente quando o primeiro sinal atinge 20 minutos após seu horário de entrada
  // O sistema verifica a cada 30 segundos se é necessário fazer a rotação, não sendo necessário um botão manual
  const checkExpiredSignals = useCallback(() => {
    // Verificar se displayedSignals existe e tem pelo menos um elemento
    if (!displayedSignals || !Array.isArray(displayedSignals) || displayedSignals.length === 0) {
      console.log('Não há sinais para verificar expiração');
      return;
    }
    
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      console.log(`Verificando expiração às ${currentHour}:${currentMinute}`);
      
      // Verificar o primeiro sinal - apenas ele controla a rotação
      const firstSignal = displayedSignals[0];
      if (!firstSignal || !firstSignal.entry_time) {
        console.log('Primeiro sinal inválido ou sem horário de entrada');
        return;
      }
      
      // Extrair horário de entrada do primeiro sinal
      const [entryHour, entryMin] = firstSignal.entry_time.split(':').map(Number);
      
      // Calcular diferença em minutos
      let hourDiff = currentHour - entryHour;
      let minuteDiff = currentMinute - entryMin;
      
      // Ajustar para casos de virada do dia
      if (hourDiff < 0) hourDiff += 24;
      const totalMinutesDiff = (hourDiff * 60) + minuteDiff;
      
      console.log(`Primeiro sinal ${firstSignal.symbol} (entrada: ${firstSignal.entry_time}) - Diferença: ${totalMinutesDiff} minutos`);
      
      // Se já passou 20 minutos ou mais desde o horário de entrada, realizar a rotação automática
      if (totalMinutesDiff >= 20) {
        console.log(`Primeiro sinal ${firstSignal.symbol} expirou (${totalMinutesDiff} minutos após entrada) - Iniciando rotação automática`);
        
        // Log dos sinais antes da rotação
        console.log('Estado dos sinais antes da rotação:');
        displayedSignals.forEach((signal, index) => {
          console.log(`- Sinal ${index + 1}: ${signal.symbol} (entrada: ${signal.entry_time})`);
        });
        
        // Marcar o sinal como processado se necessário
        if (!firstSignal.processed) {
          const updatedSignals = [...displayedSignals];
          updatedSignals[0] = {
            ...firstSignal,
            processed: true,
            result: 'success' // Maioria dos resultados são sucessos
          };
          
          // Atualizar sinais
          setDisplayedSignals(updatedSignals);
        }
        
        // Acionar rotação automática
        console.log('Iniciando rotação automática de sinais...');
        setTimeout(() => rotateSignals(), 100);
      } else {
        console.log(`Primeiro sinal ainda não expirou. Faltam ${20 - totalMinutesDiff} minutos para rotação.`);
      }
    } catch (error) {
      console.error('Erro ao verificar expiração de sinais:', error);
    }
  }, [displayedSignals, rotateSignals]);

  // Função para gerar novos sinais com horários válidos
  const generateNewSignals = (validTimes) => {
    const timestamp = Date.now();
    const newSignals = [];
    
    // Símbolos disponíveis para os sinais
    const symbolOptions = [
      'EUR/USD (OTC)', 'GBP/USD (OTC)', 'AUD/USD (OTC)', 'USD/CAD (OTC)', 'USD/CHF (OTC)', 
      'NZD/USD (OTC)', 'EUR/CAD (OTC)', 'EUR/AUD (OTC)', 'USD/JPY (OTC)', 'EUR/JPY (OTC)',
      'GBP/JPY (OTC)', 'AUD/JPY (OTC)', 'USD/MXN (OTC)', 'USD/ZAR (OTC)', 'USD/THB (OTC)',
      'USD/CNH (OTC)', 'Gold/Silver (OTC)', 'Amazon/Alibaba (OTC)', 
      'TRUMP Coin (OTC)', 'MELANIA Coin (OTC)', 'Amazon/Ebay (OTC)', 'Apple/Samsung (OTC)'
    ];
    
    // Gerar três sinais com horários diferentes
    for (let i = 0; i < 3; i++) {
      // Pegar o próximo horário válido
      const entryTime = validTimes[i];
      
      // Calcular horário de expiração (entrada + 5 minutos)
      const [entryHour, entryMin] = entryTime.split(':').map(Number);
          let expiryHour = entryHour;
      let expiryMin = entryMin + 5;
          
      if (expiryMin >= 60) {
        expiryMin -= 60;
            expiryHour = (expiryHour + 1) % 24;
      }
      
      const expiryTime = `${expiryHour.toString().padStart(2, '0')}:${expiryMin.toString().padStart(2, '0')}`;
      
      // Reentrada 1 é igual ao horário de expiração
      const gale1Time = expiryTime;
      
      // Reentrada 2 é 5 minutos após a Reentrada 1
      let gale2Hour = expiryHour;
      let gale2Min = expiryMin + 5;
      
      if (gale2Min >= 60) {
        gale2Min -= 60;
        gale2Hour = (gale2Hour + 1) % 24;
      }
      
      const gale2Time = `${gale2Hour.toString().padStart(2, '0')}:${gale2Min.toString().padStart(2, '0')}`;
      
      // Escolher um símbolo diferente dos já escolhidos
      let symbolIndex;
      let symbol;
      
      do {
        symbolIndex = Math.floor(Math.random() * symbolOptions.length);
        symbol = symbolOptions[symbolIndex];
      } while (newSignals.some(s => s.symbol === symbol));
      
      // Determinar operação aleatória (COMPRA ou VENDA)
      const operation = Math.random() > 0.5 ? 'BUY' : 'SELL';
      
      // Criar o sinal
      const signal = createSignalObject({
        symbol,
        signal: operation,
          entry_time: entryTime,
        expiry: '5m',
          expiry_time_str: expiryTime,
          gale1_time: gale1Time,
          gale2_time: gale2Time
      });
      
      // Adicionar um ID único para o sinal
      newSignals.push({
        ...signal,
        id: `signal-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
      processed: false,
        timeframe: '5m'
      });
    }
    
    return newSignals;
  };

  useEffect(() => {
    // Configurar timers para cada sinal
    if (displayedSignals && displayedSignals.length > 0) {
      console.log('Configurando timers para sinais atualizados...');
      
      // Registrar timers para cada sinal
      displayedSignals.forEach(signal => {
        registerPersistentTimer(signal);
      });
      
      // Verificar se algum sinal já expirou
      checkExpiredSignals();
      
      // Salvar sinais no localStorage
      saveSignalsToLocalStorage(displayedSignals, Date.now(), getInitialTimeSlot());
    }
  }, [displayedSignals, registerPersistentTimer, checkExpiredSignals]);
  
  // Configurar verificação periódica de expiração
  useEffect(() => {
    console.log('Configurando verificação periódica de expiração de sinais...');
    
    // Verificar imediatamente ao montar
    checkExpiredSignals();
    
    console.log('Verificação inicial de expiração concluída, configurando intervalo periódico...');
    
    // Verificar a cada 30 segundos
    const interval = setInterval(() => {
      console.log('Executando verificação periódica de expiração...');
    checkExpiredSignals();
    }, 30 * 1000); // 30 segundos
    
    return () => {
      console.log('Limpando intervalo de verificação de expiração...');
      clearInterval(interval);
    };
  }, [checkExpiredSignals]);

  // Efeito para detectar quando o usuário volta à aba após ficar um tempo fora
  useEffect(() => {
    // Função para lidar com a visibilidade da página
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Usuário retornou à aba. Verificando sinais...');
        
        // Verificar se signals está definido corretamente
        if (!signals || !Array.isArray(signals) || signals.length === 0) {
          console.log('Sinais indefinidos ou vazios. Tentando recuperar do localStorage...');
          
          try {
            // Tentar recuperar sinais do localStorage
            const cachedData = localStorage.getItem('dashboard-signals-cache');
            if (cachedData) {
              const { signals: cachedSignals } = JSON.parse(cachedData);
              if (cachedSignals && Array.isArray(cachedSignals) && cachedSignals.length > 0) {
                console.log('Recuperados sinais do localStorage após retorno à aba');
                setDisplayedSignals(cachedSignals);
              }
            }
          } catch (error) {
            console.error('Erro ao recuperar sinais do localStorage após retorno à aba:', error);
          }
        } else {
          console.log('Sinais existentes encontrados após retorno à aba');
        }
        
        // Verificar se há sinais expirados
        setTimeout(() => {
          checkExpiredSignals();
        }, 1000);
      }
    };
    
    // Adicionar listener para mudanças de visibilidade
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Remover listener quando o componente for desmontado
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [signals, checkExpiredSignals]);

  if (isLoading) {
    return (
      <Card className="h-full shadow-md border border-white/5 bg-black/20">
        <CardHeader className="flex space-y-1 pb-2">
          <CardTitle className="text-lg font-bold">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-indigo-500" />
                <span>{t('dashboard.signals.realtime')}</span>
              </div>
              <TimeZoneSelector variant="compact" className="w-auto max-w-[160px]" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          {isLoading || (!signals && !error) ? (
            <div className="flex flex-col space-y-4 pt-1 h-[350px]">
              {/* Esqueletos de carregamento */}
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg border border-white/10 bg-black/40">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col space-y-2">
                      <Skeleton className="h-5 w-32 bg-white/5" />
                      <div className="flex gap-2">
                        <Skeleton className="h-4 w-16 bg-white/5" />
                        <Skeleton className="h-4 w-16 bg-white/5" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-16 bg-white/5" />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Skeleton className="h-4 w-full bg-white/5" />
                    <Skeleton className="h-4 w-full bg-white/5" />
                    <Skeleton className="h-4 w-full bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[350px] text-center p-4">
              <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
              <h3 className="text-lg font-medium mb-2">Erro ao carregar sinais</h3>
              <p className="text-sm text-white/60 mb-4">
                {typeof error === 'object' && error !== null && 'message' in error 
                  ? (error as Error).message 
                  : 'Ocorreu um erro ao buscar os sinais. Tente novamente mais tarde.'}
              </p>
              <Button
                onClick={() => fetchSignals()}
                variant="outline"
                className="gap-1 text-xs bg-black/40 border-white/10"
              >
                <RefreshCw className="h-3 w-3" /> Tentar novamente
              </Button>
            </div>
          ) : !displayedSignals || displayedSignals.length === 0 ? (
            <div className="flex flex-col space-y-2 pt-1 h-[350px] justify-center items-center">
              <Clock className="w-12 h-12 text-white/40 animate-pulse" />
              <p className="text-sm text-white/60 text-center animate-pulse">
                {t('dashboard.signals.waiting')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-2 pt-1 overflow-hidden">
              <AnimatePresence>
                {displayedSignals.map((signal, index) => (
                  <motion.div
                    key={signal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      backgroundColor: signal.isAnimating 
                        ? 'transparent' 
                        : (signal.processed && !signal.isAnimating 
                          ? signal.result === 'success' ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                          : 'transparent')
                    }}
                    exit={signal.isAnimating ? { 
                      opacity: 0,
                      transition: { duration: 0.5 }
                    } : { opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={cn(
                      "group p-3 rounded-lg border border-white/10 hover:border-white/20 bg-black/40 backdrop-blur-md relative",
                      signal.processed ? (signal.result === 'success' ? 'border-l-2 border-l-green-500' : 'border-l-2 border-l-red-500') : ''
                    )}
                  >
                    {/* Animações removidas completamente */}
                    
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <span className="font-semibold text-white/90">{signal.symbol}</span>
                          <Badge className={`ml-2 text-[10px] py-0 h-4 ${getTypeColor(signal.signal)}`}>
                            {signal.signal}
                          </Badge>
                          
                          {signal.exchange && (
                            <Badge className="ml-1 text-[10px] py-0 h-4 bg-zinc-500/20 text-zinc-400 border-zinc-500/20">
                              {signal.exchange}
                            </Badge>
                          )}
                          
                          {/* Remover os blocos de código de indicadores de sucesso/falha */}
                          {/* Código dos indicadores removido completamente */}
                          
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1 mt-2">
                          <div className="flex items-center text-xs text-white/60">
                            <Clock className="h-3 w-3 mr-1 text-white/50" />
                            <span className="mr-1">Entrada:</span>
                            <span className="font-medium">{signal.entry_time || '--:--'}</span>
                          </div>
                          
                          <div className="flex items-center text-xs text-white/60">
                            <Clock className="h-3 w-3 mr-1 text-white/50" />
                            <span className="mr-1">Expiração:</span>
                            <span className="font-medium">{signal.expiry_time_str || '--:--'}</span>
                            <span className="ml-1 text-[10px] text-white/40">
                              ({signal.expiry || '5m'})
                            </span>
                          </div>
                          
                          <div className="flex items-center text-xs text-white/60">
                            <RefreshCw className="h-3 w-3 mr-1 text-white/50" />
                            <span className="mr-1">Reentrada 1:</span>
                            <span className="font-medium">{signal.gale1_time || '--:--'}</span>
                          </div>
                          
                          <div className="flex items-center text-xs text-white/60">
                            <RefreshCw className="h-3 w-3 mr-1 text-white/50" />
                            <span className="mr-1">Reentrada 2:</span>
                            <span className="font-medium">{signal.gale2_time || '--:--'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <div className="text-sm font-semibold">
                          {getCurrentPrice(signal)}
                        </div>
                        <div className="text-xs text-white/60">
                          Potencial: {calculatePotential(signal)}
                        </div>
                        <button 
                          className="mt-2 px-2 py-1 text-xs rounded bg-gradient-to-r from-indigo-600/50 to-indigo-800/50 hover:from-indigo-600/70 hover:to-indigo-800/70 text-white border border-indigo-800/60"
                        >
                          Realizar trade
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* ... existing code ... */}
            </div>
          )}
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
              {t('nav.signals')}
            </CardTitle>
          </div>
          
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="flex items-center space-x-2">
              <TimeZoneSelector variant="compact" />
            <Button 
              size="sm" 
              variant="ghost"
              className="h-7 px-2 text-xs text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => navigate('/signals')}
            >
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
              {t('dashboard.signals.view_all')}
            </Button>
            </div>
          </div>
          
          <div className="h-8"></div>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-sm font-medium text-white/90 mb-1">{t('dashboard.signals.loading_error')}</h3>
            <p className="text-xs text-white/60 mb-4 max-w-[240px]">{t('dashboard.signals.loading_error_desc')}</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetchSignals()}
              className="text-xs bg-white/5 border-white/10 hover:bg-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              {t('dashboard.refresh.all')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!displayedSignals || displayedSignals.length === 0) {
    return (
      <Card className="h-full shadow-md border border-white/5 bg-black/20">
        <CardHeader className="flex space-y-1 pb-2">
          <CardTitle className="text-lg font-bold">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-indigo-500" />
                <span>{t('dashboard.signals.realtime')}</span>
              </div>
              <TimeZoneSelector variant="compact" className="w-auto max-w-[160px]" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          {isLoading || (!signals && !error) ? (
            <div className="flex flex-col space-y-4 pt-1 h-[350px]">
              {/* Esqueletos de carregamento */}
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg border border-white/10 bg-black/40">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col space-y-2">
                      <Skeleton className="h-5 w-32 bg-white/5" />
                      <div className="flex gap-2">
                        <Skeleton className="h-4 w-16 bg-white/5" />
                        <Skeleton className="h-4 w-16 bg-white/5" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-16 bg-white/5" />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Skeleton className="h-4 w-full bg-white/5" />
                    <Skeleton className="h-4 w-full bg-white/5" />
                    <Skeleton className="h-4 w-full bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[350px] text-center p-4">
              <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
              <h3 className="text-lg font-medium mb-2">Erro ao carregar sinais</h3>
              <p className="text-sm text-white/60 mb-4">
                {typeof error === 'object' && error !== null && 'message' in error 
                  ? (error as Error).message 
                  : 'Ocorreu um erro ao buscar os sinais. Tente novamente mais tarde.'}
              </p>
              <Button
                onClick={() => fetchSignals()}
                variant="outline"
                className="gap-1 text-xs bg-black/40 border-white/10"
              >
                <RefreshCw className="h-3 w-3" /> Tentar novamente
              </Button>
            </div>
          ) : !displayedSignals || displayedSignals.length === 0 ? (
            <div className="flex flex-col space-y-2 pt-1 h-[350px] justify-center items-center">
              <Clock className="w-12 h-12 text-white/40 animate-pulse" />
              <p className="text-sm text-white/60 text-center animate-pulse">
                {t('dashboard.signals.waiting')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-2 pt-1 overflow-hidden">
              <AnimatePresence>
                {displayedSignals.map((signal, index) => (
                  <motion.div
                    key={signal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      backgroundColor: signal.isAnimating 
                        ? 'transparent' 
                        : (signal.processed && !signal.isAnimating 
                          ? signal.result === 'success' ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                          : 'transparent')
                    }}
                    exit={signal.isAnimating ? { 
                      opacity: 0,
                      transition: { duration: 0.5 }
                    } : { opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={cn(
                      "group p-3 rounded-lg border border-white/10 hover:border-white/20 bg-black/40 backdrop-blur-md relative",
                      signal.processed ? (signal.result === 'success' ? 'border-l-2 border-l-green-500' : 'border-l-2 border-l-red-500') : ''
                    )}
                  >
                    {/* Animações removidas completamente */}
                    
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <span className="font-semibold text-white/90">{signal.symbol}</span>
                          <Badge className={`ml-2 text-[10px] py-0 h-4 ${getTypeColor(signal.signal)}`}>
                            {signal.signal}
                          </Badge>
                          
                          {signal.exchange && (
                            <Badge className="ml-1 text-[10px] py-0 h-4 bg-zinc-500/20 text-zinc-400 border-zinc-500/20">
                              {signal.exchange}
                            </Badge>
                          )}
                          
                          {/* Remover os blocos de código de indicadores de sucesso/falha */}
                          {/* Código dos indicadores removido completamente */}
                          
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1 mt-2">
                          <div className="flex items-center text-xs text-white/60">
                            <Clock className="h-3 w-3 mr-1 text-white/50" />
                            <span className="mr-1">Entrada:</span>
                            <span className="font-medium">{signal.entry_time || '--:--'}</span>
                          </div>
                          
                          <div className="flex items-center text-xs text-white/60">
                            <Clock className="h-3 w-3 mr-1 text-white/50" />
                            <span className="mr-1">Expiração:</span>
                            <span className="font-medium">{signal.expiry_time_str || '--:--'}</span>
                            <span className="ml-1 text-[10px] text-white/40">
                              ({signal.expiry || '5m'})
                            </span>
                          </div>
                          
                          <div className="flex items-center text-xs text-white/60">
                            <RefreshCw className="h-3 w-3 mr-1 text-white/50" />
                            <span className="mr-1">Reentrada 1:</span>
                            <span className="font-medium">{signal.gale1_time || '--:--'}</span>
                          </div>
                          
                          <div className="flex items-center text-xs text-white/60">
                            <RefreshCw className="h-3 w-3 mr-1 text-white/50" />
                            <span className="mr-1">Reentrada 2:</span>
                            <span className="font-medium">{signal.gale2_time || '--:--'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <div className="text-sm font-semibold">
                          {getCurrentPrice(signal)}
                        </div>
                        <div className="text-xs text-white/60">
                          Potencial: {calculatePotential(signal)}
                        </div>
                        <button 
                          className="mt-2 px-2 py-1 text-xs rounded bg-gradient-to-r from-indigo-600/50 to-indigo-800/50 hover:from-indigo-600/70 hover:to-indigo-800/70 text-white border border-indigo-800/60"
                        >
                          Realizar trade
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* ... existing code ... */}
            </div>
          )}
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
          <CardTitle className="text-sm font-light tracking-wide text-white/90 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 signal-highlight-icon" />
            {t('dashboard.signals.title')}
          </CardTitle>
        </div>
        
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="flex items-center space-x-2">
            {/* Timezone Selector (compact version) */}
            <TimeZoneSelector variant="compact" />
            
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
                <span className="text-xs">{t('dashboard.signals.updated')}</span>
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
              {t('dashboard.signals.view_all')}
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
            {(signals && Array.isArray(signals) ? signals : []).map((signal, index) => {
              const delay = refreshingSignals ? 0 : index * 60;
              const isCompra = signal.signal === 'BUY';
              const accentColor = isCompra ? 'from-green-500 to-emerald-600' : 'from-red-500 to-red-700';
              const bgAccent = isCompra ? 'from-green-800/20 to-emerald-800/5' : 'from-red-900/20 to-red-800/5';
              
              // Garantir que todas as informações de tempo estejam corretas, mesmo para sinais antigos
              const entryTime = convertTimeToSelected(signal.entry_time || "00:00");
              
              // Extrair hora e minutos da entrada para cálculos
              const [entryHourRaw, entryMinuteRaw] = (signal.entry_time || "00:00").split(":").map(Number);
              
              // Calcular horário de expiração correto (entrada + 5 minutos)
              let expiryMinute = entryMinuteRaw + 5;
              let expiryHour = entryHourRaw;
              if (expiryMinute >= 60) {
                expiryMinute -= 60;
                expiryHour = (expiryHour + 1) % 24;
              }
              
              // Formatar horário de expiração
              const correctExpiryTimeStr = `${expiryHour.toString().padStart(2, '0')}:${expiryMinute.toString().padStart(2, '0')}`;
              const expiryTime = convertTimeToSelected(correctExpiryTimeStr);
              
              // Reentrada 1 = horário de expiração (sempre)
              const gale1Time = expiryTime;
              
              // Calcular Reentrada 2 correta (Reentrada 1 + 5 minutos = entrada + 10 minutos)
              let gale2Minute = expiryMinute + 5;
              let gale2Hour = expiryHour;
              if (gale2Minute >= 60) {
                gale2Minute -= 60;
                gale2Hour = (gale2Hour + 1) % 24;
              }
              
              // Formatar horário de Reentrada 2
              const correctGale2TimeStr = `${gale2Hour.toString().padStart(2, '0')}:${gale2Minute.toString().padStart(2, '0')}`;
              const gale2Time = convertTimeToSelected(correctGale2TimeStr);
              
              // Atualizar o objeto do sinal com os valores corretos
              signal.timeframe = '5m';
              signal.expiry_time_str = correctExpiryTimeStr;
              signal.gale1_time = correctExpiryTimeStr;
              signal.gale2_time = correctGale2TimeStr;
              
              return (
                <div 
                  key={signal.id || index} 
                  className={cn(
                    "relative group signal-item-hover",
                    !isCompra && "signal-venda-hover",
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
                            <Tag className="h-3 w-3 mr-1" />
                            <span>Digital</span>
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
                            <p className="text-xs text-white/50 mb-1">{t('dashboard.signals.entry')}</p>
                            <p className="text-sm font-medium">{entryTime || "HH:MM"}</p>
                          </div>
                        </div>
                        
                        <div className="border border-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
                          <div className="p-2.5">
                            <p className="text-xs text-white/50 mb-1">{t('dashboard.signals.expiration')}</p>
                            <p className="text-sm font-medium">
                              {signal.timeframe || "5m"}
                              {expiryTime ? ` (${expiryTime})` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="border border-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
                          <div className="p-2.5">
                            <p className="text-xs text-white/50 mb-1">{t('dashboard.signals.reentry1')}</p>
                            <p className="text-sm font-medium">{gale1Time || "HH:MM"}</p>
                          </div>
                        </div>
                        
                        <div className="border border-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
                          <div className="p-2.5">
                            <p className="text-xs text-white/50 mb-1">{t('dashboard.signals.reentry2')}</p>
                            <p className="text-sm font-medium">{gale2Time || "HH:MM"}</p>
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
                        <span>{t('dashboard.signals.trade')}</span>
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

// Adicionar estilos CSS personalizados ao documento
if (typeof document !== 'undefined') {
  const styleId = 'signal-card-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = signalCardStyles;
    document.head.appendChild(style);
  }
}

export default SignalsCard;
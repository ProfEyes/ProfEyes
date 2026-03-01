import { ArrowDownRight, ArrowUpRight, Target, Shield, TrendingUp, BarChart2, Clock, Percent, RefreshCw, Check, X, LineChart, BarChart, TrendingDown, Activity, AlertTriangle, ChevronUp, ChevronDown, BarChart4, BookOpen, ChevronRight, Loader2, ChevronsUp, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTradingSignals } from "@/services";
import { getLatestPrices } from "@/services/binanceApi";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { SignalType, SignalStrength } from "@/services/types";
import type { TradingSignal as ServiceTradingSignal } from "@/services/types";
import type { TradingSignal } from "@/types/tradingSignals";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
import { notificationService } from "@/services/notificationService";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { TimeZoneSelector } from "@/components/dashboard/TimeZoneSelector";
import { useTimeZone } from "@/contexts/TimeZoneContext";
import { motion, AnimatePresence } from "framer-motion";
import { useSignalNotifications } from "@/hooks/useSignalNotifications";
import { isBackgroundModeEnabled } from '../../utils/visibilityManager';
import { traderLinkService } from "@/services/traderLinkService";
import { useRealtimeSignals } from "@/hooks/useRealtimeSignals";

// Declarações globais para TypeScript
declare global {
  interface Window {
    isRotating?: boolean;
    signalTimersMap?: Record<string, {
      id: string;
      scheduledTime: number;
      processingTime: number;
      processed: boolean;
    }>;
    signalsCardMounted?: boolean;
    lastMountTimestamp?: number;
    lastRotationStarted?: number;
    dashboardRotationTimer?: NodeJS.Timeout | null;
    lastRotationCheck?: number;
    _cacheDailySignals?: unknown[];
    completedSignalsRef?: Record<string, string>;
    displayedSignalsRef?: EnrichedSignal[];
    // Propriedades para monitoramento de rotação
    rotationTimer?: {
      entryTime: string;
      entryTimestamp: number;
      minutesSinceEntry: number;
      nextRotationTime: number;
      lastUpdateTimestamp: number;
    };
    rotationSuppressUntil?: number;
    displayedSignalsOwner?: string;
    rotationMonitorInterval?: NodeJS.Timeout | null;
    rotationMonitorTimestamp?: number;
    executeRotationDirect?: () => void;
    forceRotationAndSync?: () => void;
    // Propriedades para sincronização bidirecional
    lastSyncTimestamp?: number;
    lastSyncSource?: string;
    tradesSignalsUpdated?: Event;
  }
}

// Inicializar flags globais se não existirem
if (typeof window !== 'undefined') {
  // Flags para controle de rotação
  window.isRotating = window.isRotating || false;
  window.signalsCardMounted = window.signalsCardMounted || false;
  window.lastRotationStarted = window.lastRotationStarted || 0;
  
  // Criar mapa global de timers se não existir
  if (!window.signalTimersMap) {
    window.signalTimersMap = {};
  }
  
  // Inicializar timer de rotação
  if (!window.rotationTimer) {
    window.rotationTimer = {
      entryTime: '',
      entryTimestamp: 0,
      minutesSinceEntry: 0,
      nextRotationTime: 0,
      lastUpdateTimestamp: 0
    };
  }
}

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
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

// Chave para armazenar sinais no localStorage
const SIGNALS_CACHE_KEY = 'trending_signals_cache';

// Chave para armazenar todos os sinais do dia no localStorage
const DAILY_SIGNALS_CACHE_KEY = 'trending_daily_signals_cache';

// Cache global para evitar regeneração de sinais entre trocas de aba
const globalSignalsCache = null;

// Cache global para sinais do dia todo
let globalDailySignalsCache = null;

// Variável para controlar a contagem de sinais processados (para gerar 1 perda a cada WIN_LOSS_RATIO sinais)
let signalProcessCount = 0;

// Sistema de rotação automática de sinais

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

// Função auxiliar para obter o próximo horário com um minuto específico
const getNextSpecificMinuteTime = (currentTime: string, targetMinute: number, advanceHour: boolean = false): string => {
  const [hours, minutes] = currentTime.split(':').map(Number);
  
  // Determinar se precisamos avançar a hora
  // 1. Avançamos se o parâmetro advanceHour for explicitamente true
  // 2. Avançamos também se o minuto alvo já passou na hora atual
  const shouldAdvanceHour = advanceHour || (minutes > targetMinute);
  
  // Calcular a hora correta
  const nextHour = shouldAdvanceHour ? (hours + 1) % 24 : hours;
  
  // Garantir que o formato tenha dois dígitos
  const result = `${nextHour.toString().padStart(2, '0')}:${targetMinute.toString().padStart(2, '0')}`;
  
  // getNextSpecificMinuteTime (silenciado)
  
  return result;
};

// Função para gerar o próximo horário válido após um determinado horário
// Implementação que segue ESTRITAMENTE as regras baseadas no padrão 03 → 23 → 43 → 03 (próxima hora)
const getNextValidTime = (timeStr: string, removedSignalTime?: string): string => {
  // Calculando próximo horário (silenciado)
  
  // Se temos um horário do sinal removido, usamos ele para determinar o próximo horário válido
  if (removedSignalTime) {
    const [_, removedMinutes] = removedSignalTime.split(':').map(Number);
    
    // Regras específicas baseadas no minuto de entrada do sinal removido
    if (removedMinutes === 3) {
      // Se o sinal removido tinha entrada XX:03, o novo terá entrada na próxima ocorrência de XX:23
      const result = getNextSpecificMinuteTime(timeStr, 23);
      // Sinal removido tinha entrada :03 (silenciado)
      return result;
    } else if (removedMinutes === 23) {
      // Se o sinal removido tinha entrada XX:23, o novo terá entrada na próxima ocorrência de XX:43
      const result = getNextSpecificMinuteTime(timeStr, 43);
      // Sinal removido tinha entrada :23 (silenciado)
      return result;
    } else if (removedMinutes === 43) {
      // Se o sinal removido tinha entrada XX:43, o novo terá entrada na próxima ocorrência de XX:03 (próxima hora)
      const result = getNextSpecificMinuteTime(timeStr, 3, true); // true = avançar hora
      // Sinal removido tinha entrada :43 (silenciado)
      return result;
    }
    
    // FALLBACK CASO O MINUTO NÃO SEJA UM DOS PADRÕES - Forçar para o padrão correto

    // Determinar qual é o próximo minuto válido na sequência 03→23→43→03
    if (removedMinutes < 3) {
      return getNextSpecificMinuteTime(timeStr, 3);
    } else if (removedMinutes < 23) {
      return getNextSpecificMinuteTime(timeStr, 23);
    } else if (removedMinutes < 43) {
      return getNextSpecificMinuteTime(timeStr, 43);
    } else {
      return getNextSpecificMinuteTime(timeStr, 3, true); // próxima hora
    }
  }
  
  // Quando não temos um horário de sinal removido, calcular próximo horário válido
  // baseado no horário atual
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Calculando próximo horário baseado no atual (silenciado)
  
  // Determinar próximo minuto válido na sequência 03→23→43→03
  let nextMinute;
  let nextHour = currentHour;
  
  if (currentMinute < 3) {
    nextMinute = 3;
  } else if (currentMinute < 23) {
    nextMinute = 23;
  } else if (currentMinute < 43) {
    nextMinute = 43;
  } else {
    nextMinute = 3;
    nextHour = (currentHour + 1) % 24;
  }
  
  const result = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;
  // Próximo horário calculado (silenciado)
  return result;
};

// Função para calcular os próximos 3 horários válidos a partir de agora
const calculateNextThreeValidTimes = (): string[] => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Lista de minutos válidos (sempre: 03, 23, 43)
  const validMinutes = [3, 23, 43];
  const times: string[] = [];
  
  // Encontrar o primeiro horário válido que seja futuro
  let currentHourToCheck = currentHour;
  let nextValidMinuteIdx = 0;
  let found = false;
  
  // Determinando qual é o próximo minuto válido baseado na hora atual
  if (currentMinute < 3) {
    // Se estamos antes do minuto 03, o próximo é 03 da hora atual
    nextValidMinuteIdx = 0; // 03
    found = true;
  } else if (currentMinute < 23) {
    // Se estamos entre 03 e 23, o próximo é 23 da hora atual
    nextValidMinuteIdx = 1; // 23
    found = true;
  } else if (currentMinute < 43) {
    // Se estamos entre 23 e 43, o próximo é 43 da hora atual
    nextValidMinuteIdx = 2; // 43
    found = true;
  } else {
    // Se estamos após 43, o próximo é 03 da próxima hora
    nextValidMinuteIdx = 0; // 03
    currentHourToCheck = (currentHour + 1) % 24; // Avançar para próxima hora
    found = true;
  }
  
  if (!found) {
    // Fallback (não deveria acontecer)

    // Forçar para 03 da próxima hora como segurança
    nextValidMinuteIdx = 0;
    currentHourToCheck = (currentHour + 1) % 24;
  }
  
  // Gerar o primeiro horário
  const firstValidMinute = validMinutes[nextValidMinuteIdx];
  const firstTime = `${currentHourToCheck.toString().padStart(2, '0')}:${firstValidMinute.toString().padStart(2, '0')}`;
        times.push(firstTime);

  // Gerar o segundo horário (seguindo a sequência 03→23→43→03)
  nextValidMinuteIdx = (nextValidMinuteIdx + 1) % 3;
  let secondHour = currentHourToCheck;
  
  // Se o primeiro minuto era 43 e o próximo é 03, avançar uma hora
  if (validMinutes[nextValidMinuteIdx] === 3 && firstValidMinute === 43) {
    secondHour = (secondHour + 1) % 24;
  }
  
  const secondTime = `${secondHour.toString().padStart(2, '0')}:${validMinutes[nextValidMinuteIdx].toString().padStart(2, '0')}`;
  times.push(secondTime);

  // Gerar o terceiro horário (continuando a sequência)
  let thirdHour = secondHour;
  nextValidMinuteIdx = (nextValidMinuteIdx + 1) % 3;
  
  // Se o segundo minuto era 43 e o próximo é 03, avançar uma hora
  if (validMinutes[nextValidMinuteIdx] === 3 && validMinutes[(nextValidMinuteIdx + 2) % 3] === 43) {
    thirdHour = (thirdHour + 1) % 24;
    }
    
  const thirdTime = `${thirdHour.toString().padStart(2, '0')}:${validMinutes[nextValidMinuteIdx].toString().padStart(2, '0')}`;
  times.push(thirdTime);

  // VERIFICAÇÃO FINAL: Garantir que todos os horários são futuros
  const allAreFuture = times.every(time => {
    const [hour, minute] = time.split(':').map(Number);
    const timeAsDate = new Date();
    timeAsDate.setHours(hour, minute, 0, 0);
    
    // Se o horário gerado for menor que o atual, considerar que é do dia seguinte
    if (timeAsDate < now) {
      timeAsDate.setDate(timeAsDate.getDate() + 1);
    }
    
    return timeAsDate > now;
  });
  
  if (!allAreFuture) {



  }

  return times;
};

// ===== IMPORTAÇÃO COMPLETA DAS CONSTANTES DA ABA SIGNALS =====

// Lista de ativos PERMITIDOS explicitamente (forçada pela especificação do usuário)
const ALLOWED_ASSETS: string[] = [
  // Ações
  "AIG", "Alibaba Group Holding", "Amazon", "Amazon/Alibaba", "Amazon/Ebay", "Apple", 
  "Baidu, Inc. ADR", "Citigroup, Inc", "Coca-Cola Company", "Meta", "Google", 
  "Alphabet/Microsoft", "Goldman Sachs Group, Inc.", "Intel Corporation", "Intel/IBM", 
  "JPMorgan Chase E Co.", "McDonald´s Corporation", "Meta/Alphabet", "Morgan Stanley", 
  "Microsoft Corporation", "Microsoft/Apple", "Netflix/Amazon", "Snap Inc.", "Tesla", "Tesla/Ford",

  // Commodities
  "Crude Oil Brent", "Crude Oil WTI", "Silver", "Ouro/Prata", "Gold", "Gás Natural",

  // Índices
  "AUS 200", "EU 50", "FR 40", "GER 30", "GER30/UK100", "HK 33", "JP 225", "SP 35", 
  "US 500", "UK 100", "US100/JP225", "US2000", "US 30", "US30/JP225", "US500/JP225", "US 100",

  // Cripto
  "Arbitrum", "Cosmos", "Bitcoin Cash", "Bonk", "Bitcoin", "Cardano", "Dash", "Dogecoin", 
  "Polkadot", "DYDX", "EOS", "Ethereum", "Fartcoin", "Artificial Superintelligence Alliance", 
  "Floki", "Gala", "Graph", "Hedera", "ICP", "Immutable", "Injective", "IOTA", "Júpiter", 
  "Chainlink", "Litecoin", "Decentraland", "Polygon", "MELANIA Coin", "NEAR", "Ondo", 
  "Onyxcoin", "ORDI", "Pudgy Penguins", "Pepe", "Pyth", "Raydium", "Render", "Ronin", 
  "Sandbox", "1000Sats", "Sei", "Shiba Inu", "Solana", "Stacks", "Sui", "Bittensor", 
  "Celestia", "TON", "TRON/USD", "TRUMP Coin", "Dogwifhat", "World Coin", "Ripple",

  // Forex
  "AUD/CAD (OTC)", "AUD/JPY (OTC)", "AUD/NZD (OTC)", "AUD/USD (OTC)", "CAD/CHF (OTC)", 
  "CAD/JPY (OTC)", "CHF/JPY", "CHFNOK", "Dollar Index", "EUR/AUD (OTC)", "EUR/CAD (OTC)", 
  "EUR/CHF (OTC)", "EUR/GBP (OTC)", "EUR/JPY (OTC)", "EUR/NZD (OTC)", "EUR/THB (OTC)", 
  "EUR/USD (OTC)", "GBP/AUD (OTC)", "GBP/CAD (OTC)", "GBP/CHF (OTC)", "GBP/JPY (OTC)", 
  "GBP/NZD (OTC)", "GBP/USD (OTC)", "JPY/THB (OTC)", "NOK/JPY (OTC)", "NZD/CAD (OTC)", 
  "NZDCHF", "NZD/JPY (OTC)", "NZD/USD (OTC)", "PEN/USD (OTC)", "USD/BRL (OTC)", 
  "USD/CAD (OTC)", "USD/CHF (OTC)", "USD/COP (OTC)", "USD/HKD (OTC)", "USD/INR (OTC)", 
  "USD/JPY (OTC)", "USD/MXN (OTC)", "USD/NOK (OTC)", "USD/PLN (OTC)", "USD/SEK (OTC)", 
  "USD/SGD (OTC)", "USD/THB (OTC)", "USD/TRY (OTC)", "USD/XOF (OTC)", "USD/ZAR (OTC)", 
  "Yen Index", "GBP/CHF", "GBP/NZD", "GBP/AUD", "EUR/AUD", "EUR/NZD", "AUD/CHF", 
  "AUD/USD", "USD/CAD", "GBP/USD", "EUR/GBP", "GBP/JPY", "EUR/CAD", "GBP/CAD", 
  "CAD/CHF", "AUD/JPY", "AUD/CAD", "USD/CHF"
];

const ALLOWED_SET = new Set(ALLOWED_ASSETS.map(a => a.trim()));

// Mapeamento completo de categorias dos ativos
const ATIVOS_CATEGORIAS: Record<string, string> = {
  // Ações
  "AIG": "Ações",
  "Alibaba Group Holding": "Ações",
  "Amazon": "Ações",
  "Amazon/Alibaba": "Ações",
  "Amazon/Ebay": "Ações",
  "Apple": "Ações",
  "Baidu, Inc. ADR": "Ações",
  "Citigroup, Inc": "Ações",
  "Coca-Cola Company": "Ações",
  "Meta": "Ações",
  "Google": "Ações",
  "Alphabet/Microsoft": "Ações",
  "Goldman Sachs Group, Inc.": "Ações",
  "Intel Corporation": "Ações",
  "Intel/IBM": "Ações",
  "JPMorgan Chase E Co.": "Ações",
  "McDonald´s Corporation": "Ações",
  "Meta/Alphabet": "Ações",
  "Morgan Stanley": "Ações",
  "Microsoft Corporation": "Ações",
  "Microsoft/Apple": "Ações",
  "Netflix/Amazon": "Ações",
  "Snap Inc.": "Ações",
  "Tesla": "Ações",
  "Tesla/Ford": "Ações",
  
  // Commodities
  "Crude Oil Brent": "Commodities",
  "Crude Oil WTI": "Commodities",
  "Silver": "Commodities",
  "Ouro/Prata": "Commodities",
  "Gold": "Commodities",
  "Gás Natural": "Commodities",
  
  // Índices
  "AUS 200": "Índices",
  "EU 50": "Índices",
  "FR 40": "Índices",
  "GER 30": "Índices",
  "GER30/UK100": "Índices",
  "HK 33": "Índices",
  "JP 225": "Índices",
  "SP 35": "Índices",
  "US 500": "Índices",
  "UK 100": "Índices",
  "US100/JP225": "Índices",
  "US2000": "Índices",
  "US 30": "Índices",
  "US30/JP225": "Índices",
  "US500/JP225": "Índices",
  "US 100": "Índices",
  
  // Cripto
  "Arbitrum": "Cripto",
  "Cosmos": "Cripto",
  "Bitcoin Cash": "Cripto",
  "Bonk": "Cripto",
  "Bitcoin": "Cripto",
  "Cardano": "Cripto",
  "Dash": "Cripto",
  "Dogecoin": "Cripto",
  "Polkadot": "Cripto",
  "DYDX": "Cripto",
  "EOS": "Cripto",
  "Ethereum": "Cripto",
  "Fartcoin": "Cripto",
  "Artificial Superintelligence Alliance": "Cripto",
  "Floki": "Cripto",
  "Gala": "Cripto",
  "Graph": "Cripto",
  "Hedera": "Cripto",
  "ICP": "Cripto",
  "Immutable": "Cripto",
  "Injective": "Cripto",
  "IOTA": "Cripto",
  "Júpiter": "Cripto",
  "Chainlink": "Cripto",
  "Litecoin": "Cripto",
  "Decentraland": "Cripto",
  "Polygon": "Cripto",
  "MELANIA Coin": "Cripto",
  "NEAR": "Cripto",
  "Ondo": "Cripto",
  "Onyxcoin": "Cripto",
  "ORDI": "Cripto",
  "Pudgy Penguins": "Cripto",
  "Pepe": "Cripto",
  "Pyth": "Cripto",
  "Raydium": "Cripto",
  "Render": "Cripto",
  "Ronin": "Cripto",
  "Sandbox": "Cripto",
  "1000Sats": "Cripto",
  "Sei": "Cripto",
  "Shiba Inu": "Cripto",
  "Solana": "Cripto",
  "Stacks": "Cripto",
  "Sui": "Cripto",
  "Bittensor": "Cripto",
  "Celestia": "Cripto",
  "TON": "Cripto",
  "TRON/USD": "Cripto",
  "TRUMP Coin": "Cripto",
  "Dogwifhat": "Cripto",
  "World Coin": "Cripto",
  "Ripple": "Cripto",

  // Forex
  "AUD/CAD (OTC)": "Forex",
  "AUD/JPY (OTC)": "Forex",
  "AUD/NZD (OTC)": "Forex",
  "AUD/USD (OTC)": "Forex",
  "CAD/CHF (OTC)": "Forex",
  "CAD/JPY (OTC)": "Forex",
  "CHF/JPY": "Forex",
  "CHFNOK": "Forex",
  "Dollar Index": "Forex",
  "EUR/AUD (OTC)": "Forex",
  "EUR/CAD (OTC)": "Forex",
  "EUR/CHF (OTC)": "Forex",
  "EUR/GBP (OTC)": "Forex",
  "EUR/JPY (OTC)": "Forex",
  "EUR/NZD (OTC)": "Forex",
  "EUR/THB (OTC)": "Forex",
  "EUR/USD (OTC)": "Forex",
  "GBP/AUD (OTC)": "Forex",
  "GBP/CAD (OTC)": "Forex",
  "GBP/CHF (OTC)": "Forex",
  "GBP/JPY (OTC)": "Forex",
  "GBP/NZD (OTC)": "Forex",
  "GBP/USD (OTC)": "Forex",
  "JPY/THB (OTC)": "Forex",
  "NOK/JPY (OTC)": "Forex",
  "NZD/CAD (OTC)": "Forex",
  "NZDCHF": "Forex",
  "NZD/JPY (OTC)": "Forex",
  "NZD/USD (OTC)": "Forex",
  "PEN/USD (OTC)": "Forex",
  "USD/BRL (OTC)": "Forex",
  "USD/CAD (OTC)": "Forex",
  "USD/CHF (OTC)": "Forex",
  "USD/COP (OTC)": "Forex",
  "USD/HKD (OTC)": "Forex",
  "USD/INR (OTC)": "Forex",
  "USD/JPY (OTC)": "Forex",
  "USD/MXN (OTC)": "Forex",
  "USD/NOK (OTC)": "Forex",
  "USD/PLN (OTC)": "Forex",
  "USD/SEK (OTC)": "Forex",
  "USD/SGD (OTC)": "Forex",
  "USD/THB (OTC)": "Forex",
  "USD/TRY (OTC)": "Forex",
  "USD/XOF (OTC)": "Forex",
  "USD/ZAR (OTC)": "Forex",
  "Yen Index": "Forex",
  "GBP/CHF": "Forex",
  "GBP/NZD": "Forex",
  "GBP/AUD": "Forex",
  "EUR/AUD": "Forex",
  "EUR/NZD": "Forex",
  "AUD/CHF": "Forex",
  "AUD/USD": "Forex",
  "USD/CAD": "Forex",
  "GBP/USD": "Forex",
  "EUR/GBP": "Forex",
  "GBP/JPY": "Forex",
  "EUR/CAD": "Forex",
  "GBP/CAD": "Forex",
  "CAD/CHF": "Forex",
  "AUD/JPY": "Forex",
  "AUD/CAD": "Forex",
  "USD/CHF": "Forex"
};

// Horários de disponibilidade de cada ativo (formato: [hora_inicio, minuto_inicio, hora_fim, minuto_fim])
const HORARIOS_DISPONIBILIDADE: Record<string, Array<[number, number, number, number]>> = {
  // Ações
  "AIG": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "Alibaba Group Holding": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "Amazon": [[0, 0, 15, 30], [16, 0, 23, 59]],
  "Amazon/Alibaba": [[0, 0, 6, 30], [7, 0, 23, 59]],
  "Amazon/Ebay": [[0, 0, 6, 30], [7, 0, 23, 59]],
  "Apple": [[0, 0, 15, 30], [16, 0, 23, 59]],
  "Baidu, Inc. ADR": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "Citigroup, Inc": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "Coca-Cola Company": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "Meta": [[0, 0, 15, 30], [16, 35, 23, 59]],
  "Google": [[0, 0, 15, 30], [16, 35, 23, 59]],
  "Alphabet/Microsoft": [[0, 0, 6, 30], [7, 0, 23, 59]],
  "Goldman Sachs Group, Inc.": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "Intel Corporation": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "Intel/IBM": [[0, 0, 6, 30], [7, 0, 23, 59]],
  "JPMorgan Chase E Co.": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "McDonald´s Corporation": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "Meta/Alphabet": [[0, 0, 6, 30], [7, 40, 23, 59]],
  "Morgan Stanley": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "Microsoft Corporation": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "Microsoft/Apple": [[0, 0, 6, 30], [7, 40, 23, 59]],
  "Netflix/Amazon": [[0, 0, 6, 30], [7, 0, 23, 59]],
  "Snap Inc.": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "Tesla": [[0, 0, 15, 30], [16, 0, 23, 59]],
  "Tesla/Ford": [[0, 0, 6, 30], [7, 0, 23, 59]],
  
  // Commodities
  "Crude Oil Brent": [[0, 0, 6, 0], [7, 5, 23, 59]],
  "Crude Oil WTI": [[0, 0, 6, 0], [7, 5, 23, 59]],
  "Silver": [[0, 0, 6, 0], [7, 5, 23, 59]],
  "Ouro/Prata": [[0, 0, 6, 30], [7, 40, 23, 59]],
  "Gold": [[0, 0, 6, 0], [7, 5, 23, 59]],
  "Gás Natural": [[0, 0, 6, 0], [7, 5, 23, 59]],
  
  // Índices
  "AUS 200": [[0, 0, 22, 0], [22, 30, 23, 59]],
  "EU 50": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "FR 40": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "GER 30": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "GER30/UK100": [[0, 0, 6, 30], [7, 0, 23, 59]],
  "HK 33": [[0, 0, 15, 0], [15, 30, 23, 59]],
  "JP 225": [[0, 0, 22, 0], [23, 5, 23, 59]],
  "SP 35": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "US 500": [[11, 35, 17, 55]],
  "UK 100": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "US100/JP225": [[0, 0, 6, 30], [7, 40, 23, 59]],
  "US2000": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "US 30": [[0, 0, 15, 0], [16, 10, 23, 59]],
  "US30/JP225": [[0, 0, 6, 30], [7, 40, 23, 59]],
  "US500/JP225": [[0, 0, 6, 30], [7, 0, 23, 59]],
  "US 100": [[0, 0, 15, 0], [16, 10, 23, 59]],
  
  // Cripto
  "Arbitrum": [[0, 0, 12, 0], [12, 30, 23, 59]],
  "Cosmos": [[0, 0, 12, 0], [13, 10, 23, 59]],
  "Bitcoin Cash": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "Bonk": [[0, 0, 17, 40], [18, 50, 23, 59]],
  "Bitcoin": [[0, 0, 12, 0], [12, 30, 23, 59]],
  "Cardano": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "Dash": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "Dogecoin": [[0, 0, 17, 45], [18, 55, 23, 59]],
  "Polkadot": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "DYDX": [[0, 0, 17, 40], [18, 50, 23, 59]],
  "EOS": [[0, 0, 22, 0], [22, 30, 23, 59]],
  "Ethereum": [[0, 0, 12, 0], [13, 10, 23, 59]],
  "Fartcoin": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "Artificial Superintelligence Alliance": [[0, 0, 17, 40], [18, 50, 23, 59]],
  "Floki": [[0, 0, 17, 40], [18, 50, 23, 59]],
  "Gala": [[0, 0, 17, 40], [18, 50, 23, 59]],
  "Graph": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "Hedera": [[0, 0, 17, 40], [18, 50, 23, 59]],
  "ICP": [[0, 0, 17, 40], [18, 50, 23, 59]],
  "Immutable": [[0, 0, 17, 40], [18, 50, 23, 59]],
  "Injective": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "IOTA": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "Júpiter": [[0, 0, 17, 40], [18, 50, 23, 59]],
  "Chainlink": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "Litecoin": [[0, 0, 22, 0], [23, 5, 23, 59]],
  "Decentraland": [[0, 0, 17, 40], [18, 50, 23, 59]],
  "Polygon": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "MELANIA Coin": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "NEAR": [[0, 0, 17, 40], [18, 50, 23, 59]],
  "Ondo": [[0, 0, 12, 0], [13, 10, 23, 59]],
  "Onyxcoin": [[0, 0, 12, 0], [12, 30, 23, 59]],
  "ORDI": [[0, 0, 12, 0], [12, 30, 23, 59]],
  "Pudgy Penguins": [[0, 0, 12, 0], [13, 10, 23, 59]],
  "Pepe": [[0, 0, 12, 0], [13, 10, 23, 59]],
  "Pyth": [[0, 0, 12, 0], [13, 10, 23, 59]],
  "Raydium": [[0, 0, 12, 0], [13, 10, 23, 59]],
  "Render": [[0, 0, 12, 0], [12, 30, 23, 59]],
  "Ronin": [[0, 0, 12, 0], [12, 30, 23, 59]],
  "Sandbox": [[0, 0, 12, 0], [12, 30, 23, 59]],
  "1000Sats": [[0, 0, 12, 0], [12, 30, 23, 59]],
  "Sei": [[0, 0, 12, 0], [12, 30, 23, 59]],
  "Shiba Inu": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "Solana": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "Stacks": [[0, 0, 12, 0], [13, 10, 23, 59]],
  "Sui": [[0, 0, 12, 0], [12, 30, 23, 59]],
  "Bittensor": [[0, 0, 12, 0], [13, 10, 23, 59]],
  "Celestia": [[0, 0, 12, 0], [12, 30, 23, 59]],
  "TON": [[0, 0, 12, 0], [13, 10, 23, 59]],
  "TRON/USD": [[0, 0, 17, 45], [18, 55, 23, 59]],
  "TRUMP Coin": [[0, 0, 12, 0], [13, 10, 23, 59]],
  "Dogwifhat": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "World Coin": [[0, 0, 17, 45], [18, 15, 23, 59]],
  "Ripple": [[0, 0, 22, 0], [22, 30, 23, 59]],

  // Forex
  "AUD/CAD (OTC)": [[0, 0, 1, 0], [2, 10, 23, 59]],
  "AUD/CAD": [[8, 0, 13, 0]],
  "AUD/JPY (OTC)": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "AUD/JPY": [[7, 0, 12, 0]],
  "AUD/NZD (OTC)": [[0, 0, 22, 0], [22, 30, 23, 59]],
  "AUD/USD (OTC)": [[0, 0, 22, 0], [22, 30, 23, 59]],
  "AUD/USD": [[2, 0, 6, 0], [9, 30, 15, 0]],
  "CAD/CHF (OTC)": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "CAD/CHF": [[4, 0, 16, 0]],
  "CAD/JPY (OTC)": [[0, 0, 22, 0], [22, 30, 23, 59]],
  "CHF/JPY": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "CHFNOK": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "Dollar Index": [[0, 0, 10, 0], [11, 10, 22, 0], [23, 10, 23, 59]],
  "EUR/AUD (OTC)": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "EUR/AUD": [[0, 0, 16, 0]],
  "EUR/CAD (OTC)": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "EUR/CAD": [[4, 0, 16, 0]],
  "EUR/CHF (OTC)": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "EUR/GBP (OTC)": [[0, 0, 1, 0], [2, 10, 23, 59]],
  "EUR/GBP": [[3, 0, 13, 0]],
  "EUR/JPY (OTC)": [[0, 0, 1, 0], [1, 30, 23, 59]],
  "EUR/NZD (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  "EUR/NZD": [[0, 0, 16, 0]],
  "EUR/THB (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  "EUR/USD (OTC)": [[0, 0, 1, 0], [1, 30, 23, 59]],
  "GBP/AUD (OTC)": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "GBP/AUD": [[0, 0, 16, 0]],
  "GBP/CAD (OTC)": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "GBP/CAD": [[4, 0, 15, 0]],
  "GBP/CHF (OTC)": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "GBP/CHF": [[0, 0, 16, 0]],
  "GBP/JPY (OTC)": [[0, 0, 1, 0], [2, 10, 23, 59]],
  "GBP/JPY": [[3, 0, 17, 0]],
  "GBP/NZD (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  "GBP/NZD": [[0, 0, 16, 0]],
  "GBP/USD (OTC)": [[0, 0, 1, 0], [1, 30, 23, 59]],
  "GBP/USD": [[3, 0, 17, 0]],
  "JPY/THB (OTC)": [[0, 0, 22, 0], [22, 30, 23, 59]],
  "NOK/JPY (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  "NZD/CAD (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  "NZDCHF": [[0, 0, 22, 0], [23, 5, 23, 59]],
  "NZD/JPY (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  "NZD/USD (OTC)": [[0, 0, 1, 0], [1, 30, 23, 59]],
  "PEN/USD (OTC)": [[0, 0, 0, 45], [1, 15, 23, 59]],
  "USD/BRL (OTC)": [[0, 0, 0, 50], [2, 20, 23, 59]],
  "USD/CAD (OTC)": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "USD/CAD": [[3, 0, 15, 0]],
  "USD/CHF (OTC)": [[0, 0, 1, 0], [1, 30, 23, 59]],
  "USD/CHF": [[10, 0, 14, 0]],
  "USD/COP (OTC)": [[0, 0, 0, 45], [1, 15, 23, 59]],
  "USD/HKD (OTC)": [[0, 0, 22, 0], [22, 30, 23, 59]],
  "USD/INR (OTC)": [[0, 0, 1, 0], [1, 30, 23, 59]],
  "USD/JPY (OTC)": [[0, 0, 1, 0], [2, 10, 23, 59]],
  "USD/MXN (OTC)": [[0, 0, 0, 50], [2, 20, 23, 59]],
  "USD/NOK (OTC)": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "USD/PLN (OTC)": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "USD/SEK (OTC)": [[0, 0, 5, 0], [5, 30, 23, 59]],
  "USD/SGD (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  "USD/THB (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  "USD/TRY (OTC)": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "USD/XOF (OTC)": [[0, 0, 1, 0], [1, 30, 23, 59]],
  "USD/ZAR (OTC)": [[0, 0, 5, 0], [6, 10, 23, 59]],
  "Yen Index": [[0, 0, 10, 0], [10, 30, 22, 0], [22, 30, 23, 59]]
};

// Helper: retorna a lista unificada de ativos conhecidos + permitidos
const getAllAssetNames = (): string[] => {
  const base = Object.keys(ATIVOS_CATEGORIAS);
  const merged = new Set<string>([...base, ...ALLOWED_SET]);
  return Array.from(merged);
};

// Função para verificar se um ativo estará disponível por pelo menos 3 horas
const isAssetAvailableForSignal = (asset: string, entryDate: Date = new Date()): boolean => {
  // Verificação especial para USD Currency Index com horários específicos por dia da semana
  if (asset === "USD Currency Index (OTC)") {
    const dayOfWeek = entryDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const hora = entryDate.getHours();
    const minuto = entryDate.getMinutes();
    const entryTimeMinutes = hora * 60 + minuto;
    
    // Sábado: Mercado fechado
    if (dayOfWeek === 6) {
      return false;
    }
    
    // Domingo: 19:00 – 23:59
    if (dayOfWeek === 0) {
      const isInRange = entryTimeMinutes >= (19 * 60) && entryTimeMinutes <= (23 * 60 + 59);
      const timeRemaining = (23 * 60 + 59) - entryTimeMinutes;
      return isInRange && timeRemaining >= 180;
    }
    
    // Segunda a Quinta: 00:00-10:00, 11:10-22:00, 23:10-23:59
    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      // Primeiro intervalo: 00:00-10:00
      if (entryTimeMinutes >= 0 && entryTimeMinutes <= (10 * 60)) {
        const timeRemaining = (10 * 60) - entryTimeMinutes;
        return timeRemaining >= 180;
      }
      // Segundo intervalo: 11:10-22:00
      if (entryTimeMinutes >= (11 * 60 + 10) && entryTimeMinutes <= (22 * 60)) {
        const timeRemaining = (22 * 60) - entryTimeMinutes;
        return timeRemaining >= 180;
      }
      // Terceiro intervalo: 23:10-23:59
      if (entryTimeMinutes >= (23 * 60 + 10) && entryTimeMinutes <= (23 * 60 + 59)) {
        const timeRemaining = (23 * 60 + 59) - entryTimeMinutes;
        return timeRemaining >= 180;
      }
      return false;
    }
    
    // Sexta: 00:00-10:00, 11:10-21:00
    if (dayOfWeek === 5) {
      // Primeiro intervalo: 00:00-10:00
      if (entryTimeMinutes >= 0 && entryTimeMinutes <= (10 * 60)) {
        const timeRemaining = (10 * 60) - entryTimeMinutes;
        return timeRemaining >= 180;
      }
      // Segundo intervalo: 11:10-21:00
      if (entryTimeMinutes >= (11 * 60 + 10) && entryTimeMinutes <= (21 * 60)) {
        const timeRemaining = (21 * 60) - entryTimeMinutes;
        return timeRemaining >= 180;
      }
      return false;
    }
    
    return false;
  }
  
  // Se o ativo não estiver na lista de horários, assume-se que está disponível 24/7
  if (!HORARIOS_DISPONIBILIDADE[asset]) {
    return true;
  }
  
  const hora = entryDate.getHours();
  const minuto = entryDate.getMinutes();
  const entryTimeMinutes = hora * 60 + minuto;
  
  // Verificar se o ativo estará disponível por pelo menos 3 horas a partir do horário de entrada
  const requiredEndTime = entryTimeMinutes + 180; // 180 minutos (3 horas) após a entrada
  
  const isAvailable = HORARIOS_DISPONIBILIDADE[asset].some(([horaInicio, minutoInicio, horaFim, minutoFim]) => {
    const inicioEmMinutos = horaInicio * 60 + minutoInicio;
    const fimEmMinutos = horaFim * 60 + minutoFim;
    
    // Verifica se o horário de entrada está dentro do intervalo
    // E se há pelo menos 3 horas de disponibilidade restante
    const entryInRange = entryTimeMinutes >= inicioEmMinutos && entryTimeMinutes <= fimEmMinutos;
    const availableTimeRemaining = fimEmMinutos - entryTimeMinutes; // Tempo restante de disponibilidade
    const hasEnoughTime = availableTimeRemaining >= 180; // Pelo menos 180 minutos (3 horas) restantes
    
    return entryInRange && hasEnoughTime;
  });
  
  return isAvailable;
};

// Função para inferir categoria do ativo
const inferExchangeCategory = (symbol: string): string => {
  const s = symbol.replace("(OTC)", "").trim();
  const lower = s.toLowerCase();

  // Ações
  const stockKeywords = [
    'aig','alibaba','amazon','apple','baidu','citigroup','coca-cola','meta','google','alphabet','goldman sachs',
    'intel','jpmorgan','mcdonald','morgan stanley','microsoft','netflix','snap','tesla','ford','ibm'
  ];
  if (stockKeywords.some(k => lower.includes(k))) return 'Ações';
  const stockPairs = ['amazon/alibaba','amazon/ebay','alphabet/microsoft','intel/ibm','meta/alphabet','microsoft/apple','netflix/amazon','tesla/ford'];
  if (stockPairs.some(k => lower.includes(k))) return 'Ações';

  // Commodities
  const commodities = ['crude oil brent','crude oil wti','silver','ouro/prata','gold','gás natural','gold/silver'];
  if (commodities.some(k => lower.includes(k))) return 'Commodities';

  // Índices
  const indices = ['aus 200','eu 50','fr 40','ger 30','ger30/uk100','hk 33','jp 225','sp 35','us 500','uk 100','us100/jp225','us2000','us 30','us30/jp225','us500/jp225','us 100'];
  if (indices.some(k => lower.includes(k))) return 'Índices';

  // Cripto
  const cryptos = [
    'arbitrum','cosmos','bitcoin cash','bonk','bitcoin','cardano','dash','dogecoin','polkadot','dydx','eos','ethereum','fartcoin',
    'artificial superintelligence alliance','floki','gala','graph','hedera','icp','immutable','injective','iota','júpiter','jupiter','chainlink',
    'litecoin','decentraland','polygon','melania coin','near','ondo','onyxcoin','ordi','pudgy penguins','pepe','pyth','raydium','render','ronin',
    'sandbox','1000sats','sei','shiba inu','solana','stacks','sui','bittensor','celestia','ton','tron/usd','trump coin','dogwifhat','world coin','ripple'
  ];
  if (cryptos.some(k => lower.includes(k))) return 'Cripto';

  // Forex (pares e índices de moedas)
  const forexKeywords = [
    'aud/cad','aud/jpy','aud/nzd','aud/usd','cad/chf','cad/jpy','chf/jpy','chfnok','dollar index','eur/aud','eur/cad','eur/chf','eur/gbp','eur/jpy','eur/nzd','eur/thb','eur/usd',
    'gbp/aud','gbp/cad','gbp/chf','gbp/jpy','gbp/nzd','gbp/usd','jpy/thb','nok/jpy','nzd/cad','nzdchf','nzd/jpy','nzd/usd','pen/usd',
    'usd/brl','usd/cad','usd/chf','usd/cop','usd/hkd','usd/inr','usd/jpy','usd/mxn','usd/nok','usd/pln','usd/sek','usd/sgd','usd/thb','usd/try','usd/xof','usd/zar',
    'yen index'
  ];
  if (forexKeywords.some(k => lower.includes(k))) return 'Forex';

  // Demais casos: manter categorização existente ou assumir "Cripto" como fallback
  return ATIVOS_CATEGORIAS[symbol] || 'Cripto';
};

// Função para obter um ativo aleatório disponível no momento atual com verificação de horários
const getRandomAsset = (entryDate?: Date): string => {
  const checkDate = entryDate || new Date();
  
  // Filtrar ativos que estão na lista permitida E disponíveis no horário
  const availableAssets = getAllAssetNames().filter(asset => {
    const assetLower = asset.toLowerCase();
    const categoryLower = (ATIVOS_CATEGORIAS[asset] || '').toLowerCase();
    
    return (
      ALLOWED_SET.has(asset) &&
      isAssetAvailableForSignal(asset, checkDate) &&
      !assetLower.includes('binance') && 
      !categoryLower.includes('binance')
    );
  });
  
  // Log para debug - apenas se houver problemas
  if (availableAssets.length === 0) {

  }
  
  // Se não houver ativos disponíveis, usar ativos padrão que são sempre seguros
  if (availableAssets.length === 0) {
    const safeAssets = [
      "Bitcoin", 
      "Ethereum", 
      "Ouro/Prata",
      "USD/CAD (OTC)",
      "EUR/JPY (OTC)"
    ];
    const randomIndex = Math.floor(Math.random() * safeAssets.length);
    return safeAssets[randomIndex];
  }
  
  // Lista de ativos prioritários para maior variação
  const priorityAssets = [
    "GER 30", "USD/ZAR (OTC)", "MELANIA Coin", 
    "Dollar Index", "World Coin", "TRUMP Coin", "GBP/CAD (OTC)",
    "Ouro/Prata", "Ethereum", "1000Sats", "Pepe",
    "Bitcoin", "USD/CAD (OTC)", "EUR/JPY (OTC)", "GBP/AUD (OTC)"
  ].filter(asset => 
    availableAssets.includes(asset) && ALLOWED_SET.has(asset) &&
    !asset.toLowerCase().includes('binance')
  );
  
  // Se temos ativos prioritários disponíveis, escolher entre eles
  if (priorityAssets.length > 0) {
    const randomIndex = Math.floor(Math.random() * priorityAssets.length);
    return priorityAssets[randomIndex];
  }
  
  // Caso contrário, retornar um ativo aleatório da lista completa de disponíveis
  const filteredAvailableAssets = availableAssets.filter(asset => ALLOWED_SET.has(asset) && !asset.toLowerCase().includes('binance'));
  
  if (filteredAvailableAssets.length > 0) {
    const randomIndex = Math.floor(Math.random() * filteredAvailableAssets.length);
    return filteredAvailableAssets[randomIndex];
  }
  
  // Fallback final
  return "Bitcoin";
};

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
const calculateNextTime = (time: string, minutesToAdd: number): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes + minutesToAdd, 0, 0);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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

          // Validar os sinais do cache
          const validatedSignals = validateCachedSignals(cachedData.signals);
          
          // Se não houver sinais válidos após validação, retornar null
          if (!validatedSignals || validatedSignals.length === 0) {

            return null;
          }
          
          return {
            signals: validatedSignals,
            timestamp: cachedData.timestamp,
            timeSlot: cachedData.timeSlot
          };
        } else {

          localStorage.removeItem('dashboard-signals-cache');
        }
      }
    }
  } catch (e) {

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
  const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

  // Filtrar sinais APENAS com horários FUTUROS
  const validSignals = signals.filter(signal => {
    if (!signal.entry_time) {

      return false;
    }
    
    // Extrair hora e minuto do sinal
    const [entryHour, entryMin] = signal.entry_time.split(':').map(Number);
    
    // Converter para minutos totais para comparação precisa
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const entryTotalMinutes = entryHour * 60 + entryMin;
    
    // REGRA ULTRA-RIGOROSA: Apenas sinais que são pelo menos 1 minuto no futuro
    const isFutureSignal = entryTotalMinutes > currentTotalMinutes;
    
    // Ajustar para virada de dia (caso o sinal seja para o próximo dia)
    const isNextDaySignal = entryTotalMinutes < currentTotalMinutes && 
                           (currentTotalMinutes - entryTotalMinutes) > 12 * 60; // Mais de 12 horas de diferença
    
    const isValidFutureTime = isFutureSignal || isNextDaySignal;
    
    if (!isValidFutureTime) {

    } else {

    }
    
    return isValidFutureTime;
  });

  // Se não temos sinais futuros válidos, retornar null para forçar regeneração
  if (validSignals.length === 0) {

    return null;
  }
  
  // Se temos menos de 3 sinais válidos, também regenerar
  if (validSignals.length < 3) {

    return null;
  }
  
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

      return;
    }
    
    // Preparar dados para salvar
    const dataToSave = {
      signals: signals,
      timestamp: timestamp || Date.now(),
      timeSlot: timeSlot || getInitialTimeSlot()
    };
    
    // CORREÇÃO: Salvar no localStorage com a mesma chave usada para leitura
    localStorage.setItem('dashboardSignals', JSON.stringify(dataToSave));
    
    // Sinais salvos (silenciado)
  } catch (error) {

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

  } catch (error) {

  }
};

// Função para obter ativo aleatório da lista permitida (substitui DEFAULT_SYMBOL_POOL)
const getRandomAssetFromAllowed = (): string => {
  const randomIndex = Math.floor(Math.random() * ALLOWED_ASSETS.length);
  return ALLOWED_ASSETS[randomIndex];
};

// Função para criar um objeto de sinal com propriedades completas
// agora com verificação de horários de funcionamento
const createSignalObject = (entryTime: string, position: number, preferredSymbol?: string): EnrichedSignal => {
  // Direções aleatórias para maior variedade de sinais
  const directions = [
    'VENDA',  // Posição 1
    'COMPRA', // Posição 2
    Math.random() > 0.5 ? 'COMPRA' : 'VENDA'  // Posição 3 (aleatória)
  ];

  // Criar data para o horário específico do sinal
  const [hours, minutes] = entryTime.split(':').map(Number);
  const signalDate = new Date();
  signalDate.setHours(hours, minutes, 0, 0);

  // Determinar símbolo: verificar se preferredSymbol está disponível, senão escolher da lista permitida
  let symbol: string;
  if (preferredSymbol && ALLOWED_SET.has(preferredSymbol) && isAssetAvailableForSignal(preferredSymbol, signalDate)) {
    symbol = preferredSymbol;
  } else {
    symbol = getRandomAsset(signalDate);
  }
  
  const direction = directions[position - 1] || (Math.random() > 0.5 ? 'COMPRA' : 'VENDA');
  
  // Calcular horários de expiração e reentrada (reutilizar hours e minutes já definidos)
  
  // Adicionar 5 minutos para expiração
  const expiryDate = new Date();
  expiryDate.setHours(hours, minutes + 5);
  const expiryTime = `${String(expiryDate.getHours()).padStart(2, '0')}:${String(expiryDate.getMinutes()).padStart(2, '0')}`;
  
  // Reentrada 1 é igual à expiração
  const reentry1Time = expiryTime;
  
  // Adicionar 5 minutos para segunda reentrada (total 10 min após entrada)
  const reentry2Date = new Date();
  reentry2Date.setHours(hours, minutes + 10);
  const reentry2Time = `${String(reentry2Date.getHours()).padStart(2, '0')}:${String(reentry2Date.getMinutes()).padStart(2, '0')}`;

  return {
    id: `signal-${Date.now()}-${position}`,
    position,
    symbol,
    type: direction === 'COMPRA' ? SignalType.COMPRA : SignalType.VENDA,
    signal: direction === 'COMPRA' ? 'BUY' : 'SELL',
    entry_time: entryTime,
    expiry_time_str: expiryTime,
    expiry: '5m',
    gale1_time: reentry1Time,
    gale2_time: reentry2Time,
    strength: SignalStrength.STRONG,
    timestamp: new Date().toISOString(),
    qualityScore: 0.85 + Math.random() * 0.1,
    exchange: inferExchangeCategory(symbol),
    processed: false,
    status: 'active',
    reason: 'Technical Analysis',
    price: 0,
    entry_price: 0,
    target_price: 0,
    stop_loss: 0,
    success_rate: 0.85 + Math.random() * 0.1,
    expired: false,
    timeframe: '5m',
    risk_reward: '1:2',
    isDashboard: true,
    dashboardPosition: position - 1,
    entryTimestamp: Date.now()
  };
};

// Escolher próximo símbolo para novo sinal com maior aleatoriedade
const pickNextSymbol = (existingSymbols: string[] = []): string => {
  // Usar a lista completa de ativos permitidos
  const pool = [...ALLOWED_ASSETS];
  
  // Embaralhar o pool para maior aleatoriedade
  const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
  
  // Primeiro, tentar encontrar um símbolo que não está em uso
  for (const sym of shuffledPool) {
    if (!existingSymbols.includes(sym)) return sym;
  }
  
  // Se todos os símbolos já estão em uso, selecionar aleatoriamente
  return shuffledPool[Math.floor(Math.random() * shuffledPool.length)];
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
        const signal = createSignalObject(horarioEntrada, numeroSinal % 3 + 1);
        
        // Definir número do sinal para controle
        (signal as EnrichedSignal & { signalNumber?: number }).signalNumber = numeroSinal;
        
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

    const savedData = JSON.parse(savedSignalsData);
    todosSignais = savedData.signals || [];
    todosTimeSlots = savedData.timeSlots || [];
    
    // Atualizar o status dos sinais com base no horário atual
    todosSignais.forEach(signal => {
      if (!signal.entry_time || !signal.gale2_time) return;
      
      // Extrair número do sinal
      const numeroSinal = (signal as EnrichedSignal & { signalNumber?: number }).signalNumber || 0;
      
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
      
      const emergencySignal = createSignalObject(horarioEntrada, i + 1);
      
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
  entry_time: string;
  type: SignalType;
  strength: SignalStrength;
  timestamp: string;
  qualityScore: number;
  symbol: string;
  exchange: string;
  processed: boolean;
  status: 'active' | 'completed' | 'cancelled';
  signal: 'BUY' | 'SELL';
  reason: string;
  price: number;
  entry_price: number;
  target_price: number;
  stop_loss: number;
  success_rate: number;
  expired: boolean;
  timeframe: string;
  expiry: string;
  risk_reward: string;
  expiry_time_str?: string;
  gale1_time?: string;
  gale2_time?: string;
  result?: 'success' | 'failure';
  isAnimating?: boolean;
  categoria?: string;
  newsAnalysis?: Record<string, unknown>;
  correlationAnalysis?: Record<string, unknown>;
  onChainMetrics?: Record<string, unknown>;
  orderBookAnalysis?: Record<string, unknown>;
  isDashboard?: boolean;
  dashboardPosition?: number;
  entryTimestamp?: number;
  position?: number;
  [key: string]: unknown; // Permite campos adicionais
}

// Estilos CSS para animações personalizadas
const signalCardStyles = `
  @keyframes signalPulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.02); /* suavizado */
      opacity: 0.9;
    }
  }
  
  @keyframes signalGlow {
    0%, 100% {
      filter: drop-shadow(0 0 2px rgba(147, 51, 234, 0.3));
    }
    50% {
      filter: drop-shadow(0 0 4px rgba(147, 51, 234, 0.5));
    }
  }
  
  @keyframes signalFloat {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-0.5px); /* menos deslocamento */
    }
  }
  
  .signal-highlight-icon {
    animation: signalPulse 4s ease-in-out infinite, signalGlow 4s ease-in-out infinite, signalFloat 3s ease-in-out infinite;
    color: rgb(147, 51, 234);
    transition: transform 0.2s ease;
    will-change: transform, filter;
  }
  
  .signal-highlight-icon:hover {
    transform: scale(1.06);
    filter: drop-shadow(0 0 6px rgba(147, 51, 234, 0.6));
  }
  
  /* Respeitar usuários que preferem menos animações */
  @media (prefers-reduced-motion: reduce) {
    .signal-highlight-icon {
      animation: none !important;
    }
  }
`;

// Função para converter string de horário (no fuso de Brasília GMT-3) em timestamp UTC correto.
// Os sinais são sempre armazenados no horário de Brasília, independente do fuso do usuário.
const parseTimeString = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Brasília é sempre UTC-3 (sem horário de verão desde 2019)
  // Para converter BRT → UTC: UTC_hours = BRT_hours + 3
  const BRASILIA_UTC_OFFSET = 3; // horas a SOMAR para obter UTC

  const now = new Date();

  // Criar o timestamp UTC correspondente ao horário de entrada em Brasília
  const date = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    hours + BRASILIA_UTC_OFFSET,
    minutes,
    0,
    0
  ));

  // Ajuste inteligente: escolher a ocorrência mais próxima (hoje, ontem ou amanhã)
  const diffMs = date.getTime() - now.getTime();
  const twelveHoursMs = 12 * 60 * 60 * 1000;

  if (diffMs > twelveHoursMs) {
    // Mais de 12h no futuro → pertence ao dia anterior
    date.setUTCDate(date.getUTCDate() - 1);
  } else if (diffMs < -twelveHoursMs) {
    // Mais de 12h no passado → pertence ao dia seguinte
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
};

// Componente isolado para o countdown — re-renderiza apenas quando o timer muda
const RotationCountdown = memo(({ state }: {
  state: { secondsRemaining: number } | null
}) => {
  if (!state) return null;
  const mins = Math.max(0, Math.floor(state.secondsRemaining / 60));
  const secs = Math.max(0, state.secondsRemaining % 60);
  return (
    <span className="ml-2 text-xs text-white/70">
      • até rotação {mins}m {secs}s
    </span>
  );
});

const SignalsCard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { convertTimeToSelected } = useTimeZone();
  const [currentPrices, setCurrentPrices] = useState<Record<string, string>>({});
  
  // Use refs para dados que precisam persistir entre re-renderizações
  const mountedRef = useRef<boolean>(false);
  const [completedSignals, setCompletedSignals] = useState<Set<string>>(new Set());
  const [animatingSignals, setAnimatingSignals] = useState<Set<string>>(new Set());
  const [cachedSignals, setCachedSignals] = useState<EnrichedSignal[]>([]);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string>('');
  const currentTimeRef = useRef<Date>(new Date()); // ref: sem re-render desnecessário
  
  // 🔒 SISTEMA ULTRA-FIXO: Estado dos sinais com persistência ABSOLUTA
  const [displayedSignals, setDisplayedSignals] = useState<EnrichedSignal[]>(() => {
    // PRIORIDADE 1: Verificar se há sinais fixos no localStorage
    try {
      const fixedSignalsData = localStorage.getItem('dashboard_signals_fixed');
      if (fixedSignalsData) {
        const { signals, fixedUntil, timestamp } = JSON.parse(fixedSignalsData);
        const now = Date.now();
        
        // Se os sinais ainda estão no período de fixação, USAR OBRIGATORIAMENTE
        if (Array.isArray(signals) && signals.length === 3 && fixedUntil > now) {

          window.displayedSignalsRef = signals;
          return signals;
        }
      }
    } catch (err) {

    }
    
    // PRIORIDADE 2: Verificar localStorage normal
    try {
      const stored = localStorage.getItem('dashboard_signals');
      if (stored) {
        const { signals, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp <= 30 * 60 * 1000 && Array.isArray(signals) && signals.length === 3) {
          window.displayedSignalsRef = signals;
          return signals;
        }
      }
    } catch (err) {

    }
    
    return window.displayedSignalsRef || [];
  });
  
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [signalQueue, setSignalQueue] = useState<EnrichedSignal[]>([]);
  const animationsRef = useRef<Record<string, boolean>>({});
  const autoCompleteTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const queryClient = useQueryClient();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingSignals, setRefreshingSignals] = useState(false);
  const [refreshButtonState, setRefreshButtonState] = useState<'idle' | 'loading' | 'success' | 'default'>('idle');
  
  const slotCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeSlotRef = useRef<string>('');
  
  // Constante para tempo real de processamento (15 minutos)
  const SIGNAL_PROCESSING_TIME = 15 * 60 * 1000; // 15 minutos em ms
  const SIGNAL_FIXED_PERIOD = 15 * 60 * 1000; // 15 minutos de período fixo

  // Estado local para exibir o timer da dashboard (entrada do primeiro sinal)
  const [rotationTimerState, setRotationTimerState] = useState<null | {
    entryTime: string;
    entryTimestamp: number;
    minutesSinceEntry: number;
    secondsRemaining: number;
    nextRotationTime: number;
  }>(null);

  // Ref para evitar logs repetitivos em cada segundo
  const lastLoggedMinutesRef = useRef<number | null>(null);

  // ✅ NOVO: Calcular e emitir timer de rotação quando sinais mudarem
  useEffect(() => {
    if (!displayedSignals || displayedSignals.length === 0) return;
    
    const firstSignal = displayedSignals[0];
    if (!firstSignal || !firstSignal.entry_time) return;
    
    // ✅ USAR FUNÇÃO UTILITÁRIA CENTRALIZADA
    // Importar quando necessário: import { calculateSignalTimestamps } from '@/utils/timeCalculations';
    const now = Date.now();
    const [hours, minutes] = firstSignal.entry_time.split(':').map(Number);
    
    // ✅ Validar entrada
    if (isNaN(hours) || isNaN(minutes)) {

      return;
    }
    
    // Sinais são sempre em horário de Brasília (GMT-3 = UTC-3)
    // Para converter BRT → UTC: UTC_hours = BRT_hours + 3
    const BRASILIA_UTC_OFFSET = 3;
    const nowDate = new Date(now);

    // Criar timestamp UTC correto para o horário de entrada em Brasília
    const entryDate = new Date(Date.UTC(
      nowDate.getUTCFullYear(),
      nowDate.getUTCMonth(),
      nowDate.getUTCDate(),
      hours + BRASILIA_UTC_OFFSET,
      minutes,
      0,
      0
    ));

    // ✅ LÓGICA CORRETA: Verificar se já passou do tempo de rotação (15 min após entrada)
    const minutesDiff = (entryDate.getTime() - now) / (60 * 1000);

    // Se o horário está muito no passado (mais de 3 horas), considerar amanhã
    if (minutesDiff < -180) {
      entryDate.setUTCDate(entryDate.getUTCDate() + 1);
    }
    
    const entryTimestamp = entryDate.getTime();
    const nextRotationTime = entryTimestamp + (15 * 60 * 1000); // 15 minutos APÓS entrada
    const msToRotation = Math.max(0, nextRotationTime - now);
    const secondsRemaining = Math.floor(msToRotation / 1000);
    const minutesSinceEntry = Math.floor((now - entryTimestamp) / (60 * 1000));
    
    // ✅ VALIDAÇÃO CRÍTICA: Detectar valores absurdos
    const minutesToRotation = Math.floor(secondsRemaining / 60);
    
    if (minutesToRotation > 60) {
      // Timer com valor absurdo - aplicar correção
      const safeNow = new Date();
      const safeEntryDate = new Date(Date.UTC(
        safeNow.getUTCFullYear(),
        safeNow.getUTCMonth(),
        safeNow.getUTCDate(),
        hours + 3,
        minutes,
        0,
        0
      ));
      
      // Se já passou da hora de entrada, deve ser hoje (dentro das 24h)
      const diffMs = safeEntryDate.getTime() - now;
      if (diffMs < 0 && Math.abs(diffMs) < 24 * 60 * 60 * 1000) {
        // Já passou mas foi hoje - manter data

      }
      
      return; // ✅ Abortar este ciclo e aguardar próximo render
    }
    
    // Emitir evento inicial
    const timerData = {
      entryTime: firstSignal.entry_time,
      entryTimestamp,
      minutesSinceEntry,
      secondsRemaining,
      nextRotationTime
    };
    
    setRotationTimerState(timerData);
    
    // Emitir evento para sincronizar com outras abas
    window.dispatchEvent(new CustomEvent('rotationTimerUpdated', { detail: timerData }));
    
    // Timer reinicializado
    
    // ✅ VALIDAÇÃO: Timer zerado mas já passou da rotação
    if (secondsRemaining === 0 && minutesSinceEntry > 15) {


    }
    
    // Atualizar timer a cada segundo
    const interval = setInterval(() => {
      const currentNow = Date.now();
      const currentMsToRotation = Math.max(0, nextRotationTime - currentNow);
      const currentSecondsRemaining = Math.floor(currentMsToRotation / 1000);
      const currentMinutesSinceEntry = Math.floor((currentNow - entryTimestamp) / (60 * 1000));
      
      const updatedData = {
        entryTime: firstSignal.entry_time,
        entryTimestamp,
        minutesSinceEntry: currentMinutesSinceEntry,
        secondsRemaining: currentSecondsRemaining,
        nextRotationTime
      };
      
      setRotationTimerState(updatedData);
      window.dispatchEvent(new CustomEvent('rotationTimerUpdated', { detail: updatedData }));
      window.dispatchEvent(new CustomEvent('dashboardRotationTimerUpdate', { detail: updatedData }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [displayedSignals]);

  // Ouvir eventos globais emitidos por outros componentes (atualização do timer)
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail as {
          entryTime: string;
          entryTimestamp: number;
          minutesSinceEntry: number;
          secondsRemaining: number;
          nextRotationTime: number;
        } | undefined;
        if (!detail) return;
        setRotationTimerState({
          entryTime: detail.entryTime,
          entryTimestamp: detail.entryTimestamp,
          minutesSinceEntry: detail.minutesSinceEntry,
          secondsRemaining: detail.secondsRemaining,
          nextRotationTime: detail.nextRotationTime
        });

        // Logar alterações significativas no tempo até a rotação (apenas quando minuto mudar)
        const nowMs = Date.now();
        const msToRotation = detail.nextRotationTime - nowMs;
        const minutesToRotation = Math.max(0, Math.ceil(msToRotation / (1000 * 60)));
        if (lastLoggedMinutesRef.current !== minutesToRotation) {
          lastLoggedMinutesRef.current = minutesToRotation;
          const secondsRem = Math.max(0, Math.ceil((msToRotation % (1000 * 60)) / 1000));
          // Dashboard Timer atualizado
        }
      } catch (err) {
        // ignorar
      }
    };

    window.addEventListener('dashboardRotationTimerUpdate', handler as EventListener);
    return () => window.removeEventListener('dashboardRotationTimerUpdate', handler as EventListener);
  }, []);

  // Inicializar o mapa de timers global se não existir
  if (!window.signalTimersMap) {
    window.signalTimersMap = {};
  }

  // Sistema simplificado - não precisa de funções complexas

  // Função melhorada para sincronizar sinais de forma bidirecional
  const saveDashboardSignalsForSync = useCallback((signals: EnrichedSignal[]) => {
    try {
      // SINCRONIZAÇÃO BIDIRECIONAL (silenciado)
      
      // CORREÇÃO: Garantir que temos exatamente 3 sinais, mesmo que não tenham propriedade position
      // Pegamos os 3 primeiros do array ou limitamos a 3 se tiver mais
      let signalsToSync = [...signals];
      if (signalsToSync.length > 3) {
        signalsToSync = signalsToSync.slice(0, 3);
      }
      
      // Adicionar propriedades necessárias para cada sinal
      const enrichedSignals = signalsToSync.map((signal, index) => ({
        ...signal,
        // Garantir que os sinais tenham as propriedades necessárias para sincronização
        isDashboard: true,
        // Se não tiver position, adicionar baseado no índice
        position: signal.position || (index + 1),
        // Adicionar dashboardPosition baseado no índice (0, 1, 2)
        dashboardPosition: index,
        entryTimestamp: signal.entryTimestamp || Date.now(),
        syncTimestamp: Date.now()
      }));
      
      // Verificar se temos exatamente 3 sinais
      if (enrichedSignals.length !== 3) {

      }
      
      // Criar objeto de dados para salvar
      const dataToSave = {
        signals: enrichedSignals,
        timestamp: Date.now(),
        version: '2.0',
        source: 'dashboard'
      };
      
      // Salvar APENAS no dashboardSignals (não sobrescrever tradesSignals)
      localStorage.setItem('dashboardSignals', JSON.stringify(dataToSave));
      
      // Sinais salvos (silenciado)
      
      // Disparar eventos para sincronizar com outras abas/componentes
      // A aba Trades vai ouvir e atualizar seus 3 primeiros sinais
      window.dispatchEvent(new CustomEvent('dashboardSignalsUpdated', { detail: dataToSave }));
      window.dispatchEvent(new CustomEvent('forceDashboardSync', { detail: dataToSave }));
      
      // Registrar o último timestamp de sincronização
      (window as Window & { lastSyncTimestamp?: number; lastSyncSource?: string }).lastSyncTimestamp = Date.now();
      (window as Window & { lastSyncTimestamp?: number; lastSyncSource?: string }).lastSyncSource = 'dashboard';
    } catch (error) {

    }
  }, []);

  // Ref para armazenar os sinais atuais sem causar re-render  
  const displayedSignalsRef = useRef<EnrichedSignal[]>([]);
  
  // Atualizar ref quando os sinais mudarem
  useEffect(() => {
    displayedSignalsRef.current = displayedSignals;
  }, [displayedSignals]);

  // Efeito: Monitorar o primeiro sinal da dashboard e contar 20 minutos a partir do horário de entrada
  useEffect(() => {
    // Limpar intervalo anterior, se existir
    try {
      if (window.rotationMonitorInterval) {
        clearInterval(window.rotationMonitorInterval);
        window.rotationMonitorInterval = null;
      }
    } catch (err) {

    }

    // Função de tick para verificar condições de rotação a cada segundo
    const tick = () => {
      try {
        // Usar ref para evitar dependência que causa re-render
        const currentSignals = displayedSignalsRef.current;
        
        if (!currentSignals || currentSignals.length === 0) {
          // Resetar estado global de monitoramento
          if (window.rotationTimer) {
            window.rotationTimer.entryTime = '';
            window.rotationTimer.entryTimestamp = 0;
            window.rotationTimer.minutesSinceEntry = 0;
            window.rotationTimer.nextRotationTime = 0;
            window.rotationTimer.lastUpdateTimestamp = Date.now();
          }
          return;
        }

        const firstSignal = currentSignals[0];
        if (!firstSignal || !firstSignal.entry_time) return;

        // Converter entry_time (HH:MM) para Date usando parseTimeString
        const entryDate = parseTimeString(firstSignal.entry_time);
        const targetDate = new Date(entryDate.getTime() + SIGNAL_PROCESSING_TIME); // +20 minutos

        // Inicializar objeto global rotationTimer
        if (!window.rotationTimer) {
          window.rotationTimer = {
            entryTime: firstSignal.entry_time,
            entryTimestamp: entryDate.getTime(),
            minutesSinceEntry: 0,
            nextRotationTime: targetDate.getTime(),
            lastUpdateTimestamp: Date.now()
          };
        } else {
          window.rotationTimer.entryTime = firstSignal.entry_time;
          window.rotationTimer.entryTimestamp = entryDate.getTime();
          window.rotationTimer.nextRotationTime = targetDate.getTime();
          window.rotationTimer.lastUpdateTimestamp = Date.now();
          window.rotationTimer.minutesSinceEntry = 0;
        }
      const now = Date.now();
        const minutesSinceEntry = Math.floor((now - entryDate.getTime()) / (1000 * 60));
        const secondsRemaining = Math.max(0, Math.ceil((targetDate.getTime() - now) / 1000));

        if (window.rotationTimer) {
          window.rotationTimer.minutesSinceEntry = minutesSinceEntry;
          window.rotationTimer.lastUpdateTimestamp = now;
          window.rotationTimer.nextRotationTime = targetDate.getTime();
        }

      // Disparar evento para listeners externos (ex: UI, logs)
      try {
        window.dispatchEvent(new CustomEvent('dashboardRotationTimerUpdate', {
          detail: {
            entryTime: firstSignal.entry_time,
            entryTimestamp: entryDate.getTime(),
            minutesSinceEntry,
            secondsRemaining,
            nextRotationTime: targetDate.getTime()
          }
        }));
      } catch (err) {
        // Ignorar erros de dispatch
        // Intentionally empty
      }

      // Quando chegar a 0 segundos restantes, sinalizar evento e garantir execução da rotação
      if (secondsRemaining <= 0) {
        // Monitor: Primeiro sinal atingiu 20 minutos (silenciado)
        try {
          window.dispatchEvent(new CustomEvent('dashboardFirstSignal20MinReached', { detail: { signal: firstSignal } }));
        } catch (err) {
          // Intentionally empty
        }

        // Suprimir novas tentativas por 30s enquanto tentamos garantir a rotação
        window.rotationSuppressUntil = Date.now() + 30 * 1000;

        // Função auxiliar: tenta executar rotação e valida se ocorreu (até N tentativas)
        const ensureRotation = async (maxAttempts = 3) => {
          let attempts = 0;
          // Guardar id do primeiro sinal atual para comparar após rotação
          const initialFirstId = (window.displayedSignalsRef && window.displayedSignalsRef[0] && window.displayedSignalsRef[0].id) || (displayedSignals && displayedSignals[0] && displayedSignals[0].id) || null;

          while (attempts < maxAttempts) {
            attempts += 1;
            try {
              if (typeof (window as Window & { executeRotationDirect?: () => void }).executeRotationDirect === 'function') {
                // Monitor: Tentativa (silenciado)
                try { 
                  (window as Window & { executeRotationDirect?: () => void }).executeRotationDirect?.(); 
                } catch (e) { 

                }
              } else {
                // Monitor: Tentativa fallback (silenciado)
                try { await executeSignalRotation(); } catch { /* ignorar */ }
              }
            } catch (e) {

            }

            // Aguarda 2s para ver se a rotação aconteceu
            await new Promise(res => setTimeout(res, 2000));

            // Verificar se o primeiro sinal mudou
            const currentFirstId = (window.displayedSignalsRef && window.displayedSignalsRef[0] && window.displayedSignalsRef[0].id) || (displayedSignals && displayedSignals[0] && displayedSignals[0].id) || null;
            if (initialFirstId && currentFirstId && initialFirstId !== currentFirstId) {
              // Rotação detectada (silenciado)
              return true;
            }

            // Se não há initialFirstId (estado incerto), verificar se há sinais com posição atualizada
            if (!initialFirstId && window.displayedSignalsRef && window.displayedSignalsRef.length >=3) {
              // considerar sucesso se primeira posição for diferente do símbolo esperado

            }
          }

          // Falha ao detectar rotação (silenciado)
          return false;
        };

        // Iniciar as tentativas (não bloquear o tick)
        void ensureRotation(3);

        // Limpar o intervalo do monitor (evitar múltiplas invocações imediatas)
        if (window.rotationMonitorInterval) {
          clearInterval(window.rotationMonitorInterval);
          window.rotationMonitorInterval = null;
        }
      }
      } catch (error) {

      }
    };

    // Rodar primeiro tick imediatamente
    tick();
    // Verificar a cada 5s — precisão suficiente para detectar momento de rotação
    window.rotationMonitorInterval = setInterval(tick, 5000);

    // Cleanup
    return () => {
      if (window.rotationMonitorInterval) {
        clearInterval(window.rotationMonitorInterval);
        window.rotationMonitorInterval = null;
      }
    };
  }, []); // Dependências vazias - só roda uma vez na montagem

  // Quando o evento global 'dashboardFirstSignal20MinReached' for disparado,
  // iniciar a rotação de sinais usando a função executeSignalRotation
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        // Evitar rotação concorrente
        if (window.isRotating) {

          return;
        }

        // Garantir que temos sinais suficientes
        if (!displayedSignals || displayedSignals.length < 3) {

          return;
        }

        // Chamar a rotação real
        // executeSignalRotation pode ser assíncrono
        void executeSignalRotation();
      } catch (err) {

      }
    };

    window.addEventListener('dashboardFirstSignal20MinReached', handler as EventListener);

    return () => {
      window.removeEventListener('dashboardFirstSignal20MinReached', handler as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedSignals]);

  // ❌❌❌ FUNÇÃO OBSOLETA: Rotação é feita no SUPABASE via rotate_signals() ❌❌❌
  // Esta função foi DESATIVADA - O Supabase gerencia a rotação automaticamente
  const executeSignalRotation = useCallback(async () => {

    return; // RETURN EARLY - não executar lógica obsoleta
    
    // Proteção contra múltiplas rotações simultâneas
    if (window.isRotating) {

        return;
      }

    if (!displayedSignals || displayedSignals.length < 3) {

        return;
      }
      
    // Marcar que rotação está em andamento
    window.isRotating = true;

      const firstSignal = displayedSignals[0];
    const secondSignal = displayedSignals[1];
    const thirdSignal = displayedSignals[2];




    // LÓGICA CORRIGIDA: Gerar próximo horário válido baseado no horário do sinal removido
    // Usar o horário de entrada do sinal que está sendo removido (firstSignal) para determinar o próximo horário válido
    // Seguindo regra: 03→23, 23→43, 43→03 (próxima hora)
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const nextEntryTime = getNextValidTime(currentTime, firstSignal.entry_time);

    // Criar novo sinal para terceira posição com horário correto
      const newThirdSignal = createSignalObject(nextEntryTime, 3);
      
      // Definir atributos adicionais
      newThirdSignal.expired = false;
      newThirdSignal.status = 'active' as const;
      newThirdSignal.processed = false;
      newThirdSignal.qualityScore = 0.8;
      newThirdSignal.timeframe = '5m';
      newThirdSignal.expiry = '5min';
      newThirdSignal.risk_reward = '1:2';
      newThirdSignal.entryTimestamp = Date.now();

    // ROTAÇÃO REAL: 2º→1º, 3º→2º, novo→3º (1º sinal SAI da lista)
      const rotatedSignals: EnrichedSignal[] = [
        { 
        ...secondSignal, 
          expired: false,
          status: 'active' as const,
        processed: false,
        dashboardPosition: 0
        },
        { 
        ...thirdSignal, 
          expired: false,
          status: 'active' as const,
        processed: false,
        dashboardPosition: 1
      },
      {
        ...newThirdSignal,
        dashboardPosition: 2
      }
    ];

    // Atualizar sinais
      setDisplayedSignals(rotatedSignals);
      
      // Salvar no localStorage
      saveSignalsToLocalStorage(rotatedSignals, Date.now(), getInitialTimeSlot());
      
      // Sincronizar com a aba Signals usando função otimizada
      saveDashboardSignalsForSync(rotatedSignals);
      // Removido evento duplicado - já é disparado na função saveDashboardSignalsForSync
      
      // ROTAÇÃO CONCLUÍDA (silenciado)
    
    // Limpar flag de rotação
    window.isRotating = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedSignals, createSignalObject, calculateNextTime, saveSignalsToLocalStorage, getInitialTimeSlot, saveDashboardSignalsForSync]);

  // Sistema automático - não precisa de registro global

  // Sistema simplificado - não precisa de verificação de período fixo

  // Sistema simplificado - não precisa de bloqueio de período fixo

  // Função para garantir que temos exatamente 3 sinais
  const ensureThreeSignals = (signals: EnrichedSignal[]): EnrichedSignal[] => {
    if (!signals || signals.length === 0) return [];
    
    // Se temos mais de 3, limitar a 3
    if (signals.length > 3) {
      return signals.slice(0, 3);
    }
    
    // Se temos 3 ou menos, retornar como está
    return signals;
  };

  // Função para obter a cor baseada no tipo de sinal
  const getTypeColor = (signalType: string): string => {
    switch (signalType?.toUpperCase()) {
      case 'BUY':
      case 'COMPRA':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'SELL':
      case 'VENDA':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  // Função para obter o preço atual (simulado)
  const getCurrentPrice = (signal: EnrichedSignal): string => {
    if (signal.price) {
      return signal.price.toFixed(4);
    }
    
    // Gerar preço simulado baseado no símbolo
    const basePrice = signal.symbol.includes('USD') ? 1.0000 : 
                     signal.symbol.includes('BTC') ? 45000 :
                     signal.symbol.includes('Gold') ? 2000 :
                     1.2000;
    
    const variation = (Math.random() - 0.5) * 0.01;
    return (basePrice + variation).toFixed(4);
  };

  // Função para calcular potencial de ganho
  const calculatePotential = (signal: EnrichedSignal): string => {
    if (signal.success_rate) {
      const percentage = (signal.success_rate * 100).toFixed(1);
      return `${percentage}%`;
    }
    
    // Gerar potencial baseado no tipo de sinal
    const basePotential = signal.signal === 'BUY' ? 85 : 82;
    const variation = Math.random() * 10;
    return `${(basePotential + variation).toFixed(1)}%`;
  };

  // FUNÇÃO VERIFICADORA: Verifica se primeiro sinal atingiu EXATOS 20 minutos desde entrada
  const shouldTriggerRotation = useCallback((): boolean => {
    if (!displayedSignals || displayedSignals.length === 0) return false;
    
    const firstSignal = displayedSignals[0];
    if (!firstSignal.entry_time) return false;
    
    const now = new Date();
    const [entryHour, entryMin] = firstSignal.entry_time.split(':').map(Number);
    
    // Criar horário de entrada
    const entryTime = new Date();
    entryTime.setHours(entryHour, entryMin, 0, 0);
    
    // Se o horário de entrada for no futuro, ajustar para ontem
    if (entryTime > now) {
      entryTime.setDate(entryTime.getDate() - 1);
    }
    
    // Calcular diferença em minutos desde a entrada
    const timeDiffMs = now.getTime() - entryTime.getTime();
    const minutesSinceEntry = Math.floor(timeDiffMs / (1000 * 60));
    
    // ROTAÇÃO EXATA: Só rotacionar quando atingir EXATOS 20 minutos
    const shouldRotate = minutesSinceEntry >= 20;
    
    if (shouldRotate) {

    } else if (minutesSinceEntry >= 18) {

    }
    
    return shouldRotate;
  }, [displayedSignals]);

  // FUNÇÃO VERIFICADORA: Verificar se um sinal deve ser processado
  const shouldProcessSignal = (signal: EnrichedSignal): boolean => {
    if (!signal.entry_time) return false;
    if (signal.processed) return false;
    
    const now = new Date();
    const [entryHour, entryMin] = signal.entry_time.split(':').map(Number);
    
    // Criar horário de entrada
    const entryTime = new Date();
    entryTime.setHours(entryHour, entryMin, 0, 0);
    
    // Se o horário de entrada for no futuro, ajustar para ontem
    if (entryTime > now) {
      entryTime.setDate(entryTime.getDate() - 1);
    }
    
    // Calcular diferença em minutos desde a entrada
    const timeDiffMs = now.getTime() - entryTime.getTime();
    const minutesSinceEntry = Math.floor(timeDiffMs / (1000 * 60));
    
    // Só processar se passou 20 minutos desde a entrada
    return minutesSinceEntry >= 20;
  };

  // Registrar timer baseado no horário de ENTRADA + 20 minutos
  const registerPersistentTimer = useCallback((signal) => {
    if (!signal || !signal.entry_time) {

      return;
    }
    
    try {
      // Extrair hora e minuto da entrada
      const [entryHour, entryMin] = signal.entry_time.split(':').map(Number);
      
      // Usar horário de ENTRADA diretamente
      const entryDate = new Date();
      entryDate.setHours(entryHour, entryMin, 0, 0);
      
      // Calcular horário de processamento: ENTRADA + 20 minutos
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

    } catch (error) {

    }
  }, []);
  
  // Efeito para gerenciar montagem única
  useEffect(() => {
    const now = Date.now();
    
    // Verificar se o componente já está montado e se a última montagem foi recente (menos de 1 segundo)
    if (window.signalsCardMounted && window.lastMountTimestamp && now - window.lastMountTimestamp < 1000) {

      mountedRef.current = false;
      return;
    }
    
    // Montando SignalsCard
    window.signalsCardMounted = true;
    window.lastMountTimestamp = now;
    mountedRef.current = true;
    
    return () => {
      // Limpar apenas se esta instância estiver realmente montada
      if (mountedRef.current) {
        // Desmontando SignalsCard
        window.signalsCardMounted = false;
        mountedRef.current = false;
      }
    };
  }, []);
  
  // Efeito para sincronizar estado global (SEM dependências para evitar loop)
  useEffect(() => {
    if (!mountedRef.current) return;

    // Usar um intervalo para sincronizar periodicamente em vez de a cada mudança
    const syncInterval = setInterval(() => {
      const currentSignals = displayedSignalsRef.current;
      if (currentSignals && currentSignals.length > 0) {
        window.displayedSignalsRef = currentSignals;
        // Converter Set para Record para compatibilidade
        window.completedSignalsRef = Object.fromEntries(
          Array.from(completedSignals).map(id => [id, 'completed'])
        );
        // Marcar que estes sinais pertencem a esta instância da dashboard
        try {
          if (currentSignals.length >= 3) {
            window.displayedSignalsOwner = 'dashboard';
          }
        } catch (e) {
          // ignore
        }
      }
    }, 2000); // Sincronizar a cada 2 segundos

    return () => clearInterval(syncInterval);
  }, []); // SEM dependências - usa ref e intervalo
  
  // Estado para sinais de notificação (atualizado periodicamente para evitar loops)
  const [signalsForNotifications, setSignalsForNotifications] = useState<ServiceTradingSignal[]>([]);
  
  // Atualizar sinais para notificação periodicamente em vez de a cada mudança
  useEffect(() => {
    const updateNotificationSignals = () => {
      const currentSignals = displayedSignalsRef.current;
      if (currentSignals && currentSignals.length > 0) {
        const converted = currentSignals.map(signal => ({
          ...signal,
          timestamp: typeof signal.timestamp === 'string' 
            ? new Date(signal.timestamp).getTime() 
            : (typeof signal.timestamp === 'number' ? signal.timestamp : Date.now()),
          pair: signal.symbol
        })) as ServiceTradingSignal[];
        setSignalsForNotifications(converted);
      }
    };
    
    // Atualizar inicialmente
    updateNotificationSignals();
    
    // Atualizar a cada 5 segundos para evitar mudanças constantes
    const interval = setInterval(updateNotificationSignals, 5000);
    
    return () => clearInterval(interval);
  }, []); // SEM dependências - usa ref
  
  // Hook para enviar notificações 5 minutos antes do horário de entrada dos sinais
  const { notificationsEnabled } = useSignalNotifications(
    signalsForNotifications,
    {
      notifyMinutesBefore: 5,       // Notificar 5 minutos antes da entrada
      enabled: mountedRef.current,  // Ativar apenas para a instância principal
      notificationType: 'signals' // Classificação para a aba de notificações
    }
  );
  
  // CORREÇÃO DEFINITIVA: TimeSlot baseado em horários de rotação (20 minutos após expiração)
  const getCurrentTimeSlot = useCallback(() => {
    const now = new Date();
    // Usar intervalos de 30 minutos para evitar mudanças frequentes
    const minutes = Math.floor(now.getMinutes() / 30) * 30;
    return `${now.getHours().toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, []);
  
  const loadCachedSignalsIfAvailable = useCallback(() => {
    const cache = checkLocalStorageSignals();
    if (cache && cache.signals && cache.timeSlot === currentTimeSlot) {

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
      const currentSlotValue = currentTimeSlotRef.current;
      if (newSlot !== currentSlotValue) {
        // Slot de tempo mudou
        currentTimeSlotRef.current = newSlot;
        setCurrentTimeSlot(newSlot);
        
        // VERIFICAÇÃO REMOVIDA: Evitar chamada prematura de executeSignalRotation
        // A rotação será gerenciada pelo timer separado declarado após executeSignalRotation
        // Slot atualizado
      }
    };
    
    // Verificar a cada 60 segundos para garantir rotação precisa
    slotCheckIntervalRef.current = setInterval(checkTimeSlot, 60 * 1000);
    
    return () => {
      if (slotCheckIntervalRef.current) {
        clearInterval(slotCheckIntervalRef.current);
      }
    };
  }, [getCurrentTimeSlot, loadCachedSignalsIfAvailable]); // Removido currentTimeSlot das dependências

  // REMOVIDO: Efeito de normalização que estava fixando símbolos
  // Isso estava forçando sempre os mesmos símbolos no pool padrão
  // Agora permitimos qualquer símbolo válido vindo da aba Trades
  
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = simpleTextLoadingStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Atualizar horário atual — usando ref para não causar re-render desnecessário
  useEffect(() => {
    const tick = () => { currentTimeRef.current = new Date(); };
    tick();
    timeUpdateIntervalRef.current = setInterval(tick, 1000);
    return () => {
      if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
    };
  }, []);

  // REMOVIDO: Timer duplicado já foi substituído pelo timer consolidado acima

  // Efeito removido - sem animações

  // Efeito removido - sem animações

  // Função auxiliar para obter o horário de entrada como Date
  const getEntryTimeAsDate = useCallback((signal: EnrichedSignal): Date => {
    if (!signal.entry_time) return new Date();
    
    const now = new Date();
    const [hours, minutes] = signal.entry_time.split(':').map(Number);
    const entryDate = new Date(now);
    entryDate.setHours(hours, minutes, 0, 0);
    
    return entryDate;
  }, []);

  const sortSignalsByEntryTime = useCallback((signals: EnrichedSignal[]) => {
    if (!signals) return [];
    
    // Ordenar por horário de entrada crescente (menor para maior)
    return [...signals].sort((a, b) => {
      const entryTimeA = getEntryTimeAsDate(a).getTime();
      const entryTimeB = getEntryTimeAsDate(b).getTime();
      
      return entryTimeA - entryTimeB; // Ordem crescente: menor horário primeiro
    });
  }, [getEntryTimeAsDate]);

  // =============================================
  // NOVO SISTEMA: SINAIS EM TEMPO REAL
  // =============================================
  const { 
    signals: realtimeSignals, 
    isLoading: realtimeLoading, 
    error: realtimeError,
    refresh: refreshRealtime 
  } = useRealtimeSignals();

  // Converter sinais do Realtime para EnrichedSignal
  const convertRealtimeToEnriched = useCallback((rtSignals: typeof realtimeSignals): EnrichedSignal[] => {
    if (!rtSignals || rtSignals.length === 0) {
      return [];
    }

    // Converter para EnrichedSignal
    const enrichedSignals: EnrichedSignal[] = rtSignals.map((signal, index) => ({
      id: signal.id,
      entry_time: signal.entry_time,
      type: SignalType.TECHNICAL,
      strength: (signal.strength as SignalStrength) || SignalStrength.STRONG,
      timestamp: signal.created_at,
      qualityScore: Math.round(signal.success_rate * 100),
      symbol: signal.symbol,
      display_name: signal.display_name, // 🔥 CRÍTICO: Incluir display_name!
      exchange: signal.category,
      processed: false,
      status: 'active' as const,
      signal: signal.signal_type,
      reason: 'Technical Analysis',
      price: 0,
      entry_price: 0,
      target_price: 0,
      stop_loss: 0,
      timeframe: '5m',
      success_rate: signal.success_rate,
      entryTimestamp: new Date(signal.created_at).getTime(),
      expiry_time_str: signal.expiry_time,
      gale1_time: signal.gale1_time,
      gale2_time: signal.gale2_time,
      position: signal.position,
      source: 'realtime',
      expired: false,
      expiry: signal.expiry_time,
      risk_reward: '2:1',
      categoria: signal.category
    }));

    return enrichedSignals;
  }, []);

  // FALLBACK: Função para gerar sinais locais se Realtime falhar
  const generateFallbackSignals = useCallback((): EnrichedSignal[] => {
    try {

      // FALLBACK: Gerar localmente se banco falhar
      // Verificar se há cache válido
      const cachedData = localStorage.getItem('dashboard-signals-cache');
      if (cachedData) {
        try {
          const { signals: cachedSignals } = JSON.parse(cachedData);
          const validatedSignals = validateCachedSignals(cachedSignals);
          
          if (validatedSignals && validatedSignals.length === 3) {

            return validatedSignals;
          }
        } catch (e) {

        }
        localStorage.removeItem('dashboard-signals-cache');
      }
      
      // Gerar novos sinais
      const validTimes = calculateNextThreeValidTimes();
      
      // Criar sinais base
      const baseSignals: EnrichedSignal[] = validTimes.map((time, index) => {
        // Criar data para o horário específico do sinal
        const [hours, minutes] = time.split(':').map(Number);
        const signalDate = new Date();
        signalDate.setHours(hours, minutes, 0, 0);
        
        const selectedAsset = getRandomAsset(signalDate);
        const expiryTime = calculateNextTime(time, 5);
        const signalDirection: 'BUY' | 'SELL' = Math.random() > 0.5 ? 'BUY' : 'SELL';
        
        return {
          id: `signal-${Date.now()}-${index}`,
          entry_time: time,
          type: SignalType.TECHNICAL,
          strength: SignalStrength.STRONG,
          timestamp: new Date().toISOString(),
          qualityScore: 90,
          symbol: selectedAsset,
          exchange: ATIVOS_CATEGORIAS[selectedAsset] || inferExchangeCategory(selectedAsset),
          processed: false,
          status: 'active' as const,
          signal: signalDirection,
          reason: 'Technical Analysis',
          price: 0,
          entry_price: 0,
          target_price: 0,
          stop_loss: 0,
          expiry_time_str: expiryTime,
          gale1_time: expiryTime,
          gale2_time: calculateNextTime(expiryTime, 5),
          success_rate: 0.85 + Math.random() * 0.1,
          expired: false,
          timeframe: '5m',
          expiry: '5m',
          risk_reward: '2:1'
        };
      });

      // Salvar no cache
      setCachedSignals(baseSignals);
      saveSignalsToLocalStorage(baseSignals, Date.now(), currentTimeSlot);

      return baseSignals;
      
    } catch (error) {

      throw error;
    }
  }, [currentTimeSlot]);
          
  // ❌ USEEFFECT REMOVIDO: Estava causando loop infinito
  // PROBLEMA: Dependia de displayedSignals E currentTimeSlot, causando re-execuções constantes
  // SOLUÇÃO: Processamento feito apenas no useEffect do useQuery abaixo
  
  // Processar sinais do Realtime para EnrichedSignal (MEMOIZADO para evitar re-renderizações)
  const signals = useMemo(() => {
    return convertRealtimeToEnriched(realtimeSignals);
  }, [realtimeSignals, convertRealtimeToEnriched]);
  
  const isLoading = realtimeLoading;
  const error = realtimeError;
  const refetch = refreshRealtime;

  // Efeito para processar os sinais quando disponíveis - PRIORIZAR SINAIS DA ABA TRADES
  const hasInitializedSignals = useRef(false);
  const previousSignalsRef = useRef<typeof signals>([]);
  
  useEffect(() => {
    // Processar sinais quando: 
    // 1. Não há sinais exibidos OU 
    // 2. Chegaram novos sinais do Realtime
    const shouldProcess = (
      (signals && signals.length > 0 && displayedSignals.length === 0) || 
      (signals && signals.length > 0 && !hasInitializedSignals.current)
    );
    
    if (shouldProcess) {
      hasInitializedSignals.current = true;
      // PROCESSANDO SINAIS (silenciado)
      
      // PRIORIDADE 1: Verificar se temos sinais da aba Trades no localStorage
      try {
        const tradesData = localStorage.getItem('tradesSignals');
        if (tradesData) {
          const parsedData = JSON.parse(tradesData);
          if (parsedData && parsedData.signals && Array.isArray(parsedData.signals) && 
              parsedData.signals.length >= 3) {
            // PRIORIDADE 1 (silenciado)
            
            // Usar sinais da aba Trades
            setDisplayedSignals(parsedData.signals.slice(0, 3));
            setCachedSignals(parsedData.signals.slice(0, 3));
            
            // Registrar fonte de dados
            window.displayedSignalsOwner = 'trades';
            window.displayedSignalsRef = parsedData.signals.slice(0, 3);
            
            return; // Importante: sair depois de processar sinais prioritários
          }
        }
      } catch (e) {

      }
      
      // PRIORIDADE 2: Se não há sinais da aba Trades, usar sinais do useQuery
      setDisplayedSignals(signals);
      setCachedSignals(signals);
      
      // Sincronizar com a aba Signals
      if (signals.length >= 3) {
        // CORREÇÃO DE SINCRONIZAÇÃO: Garantir que os sinais são enviados para a aba Trades
        saveDashboardSignalsForSync(signals);
        
        // ✅ Disparar evento para notificar aba Trades
        window.dispatchEvent(new CustomEvent('signalsRotated', {
          detail: {
            signals: signals,
            timestamp: Date.now()
          }
        }));
        // Evento disparado (inicial)
      }
    }
    
    // ✅ DETECTAR MUDANÇAS NOS SINAIS APÓS INICIALIZAÇÃO (para rotações)
    if (hasInitializedSignals.current && signals && signals.length > 0) {
      const hasChanged = JSON.stringify(previousSignalsRef.current) !== JSON.stringify(signals);
      
      if (hasChanged) {
        // Sinais mudaram via Realtime
        previousSignalsRef.current = signals;
        
        // Atualizar displayedSignals
        setDisplayedSignals(signals);
        
        // Disparar evento para notificar aba Trades
        window.dispatchEvent(new CustomEvent('signalsRotated', {
          detail: {
            signals: signals,
            timestamp: Date.now()
          }
        }));
        // Evento disparado (rotação)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals]); // Removido displayedSignals.length das dependências

  // 🚫 USEEFFECTS DE SINCRONIZAÇÃO REMOVIDOS: Estavam causando interferências na rotação
  // PROBLEMA: Executavam sempre que displayedSignals mudava, causando loops e rotações prematuras
  // SOLUÇÃO: Implementar sincronização bidirecional inteligente

  // SINCRONIZAÇÃO BIDIRECIONAL APRIMORADA: Ouvir mudanças da aba Trades e sincronizar sinais
  useEffect(() => {
    // Variável para evitar loops infinitos
    let isProcessingEvent = false;
    // Manter registro dos últimos sinais recebidos para evitar loops
    let lastProcessedTimestamp = 0;
    
    // Função para atualizar sinais da Dashboard quando a aba Trades mudar
    const handleTradesSignalsUpdate = (event: CustomEvent) => {
      // Ignorar eventos originados pela própria dashboard para evitar loop
      const eventDetail = event?.detail as { source?: string; signals?: EnrichedSignal[]; timestamp?: number } | undefined;
      const src = eventDetail?.source || null;
      if (src === 'dashboard') {
        return;
      }

      // Evitar processamento recursivo
      if (isProcessingEvent) {
        return;
      }

      // Evitar processamentos muito frequentes do mesmo evento/dados
      const now = Date.now();
      const timestamp = eventDetail?.timestamp || now;

      if ((now - lastProcessedTimestamp) < 500 && timestamp <= lastProcessedTimestamp) {
        return;
      }

      lastProcessedTimestamp = timestamp;
      isProcessingEvent = true;
      try {
        // Flag para debugging
        // Sincronização prioritária
        
        // Flag para debugging
        window.lastSyncTimestamp = now;
        window.lastSyncSource = 'trades';

        // Verificar evento
        if (!eventDetail) {

          // Tentar recuperar do localStorage como alternativa
          try {
            const storedData = localStorage.getItem('tradesSignals');
            if (storedData) {
              const parsedData = JSON.parse(storedData);
              if (parsedData && parsedData.signals && Array.isArray(parsedData.signals)) {

                return handleTradesSignalsUpdate(new CustomEvent('tradesSignalsUpdated', { detail: parsedData }));
              }
            }
          } catch (err) {

          }
          return;
        }

        // Verificar sinais
        if (!eventDetail.signals || !Array.isArray(eventDetail.signals)) {

          return;
        }

        // Garantir que temos pelo menos 3 sinais para sincronizar
        if (eventDetail.signals.length < 3) {

          return;
        }

        // Sinais da aba Trades

        // VALIDAR DADOS: Verificar se os sinais têm as propriedades mínimas necessárias
        const invalidSignals = eventDetail.signals.slice(0, 3).filter(
          s => !s.symbol || !s.entry_time || !s.signal
        );
        
        if (invalidSignals.length > 0) {

          return;
        }

        // Pegar os primeiros 3 sinais da aba Trades
        const tradesSignals = [...eventDetail.signals.slice(0, 3)];
        
        // Enriquecer os sinais com propriedades necessárias para a Dashboard
        const enrichedSignals = tradesSignals.map((signal, index) => ({
          ...signal,
          isDashboard: true,
          position: index + 1,
          dashboardPosition: index,
          // Garantir que propriedades críticas existam
          id: signal.id || `trades-signal-${Date.now()}-${index}`,
          exchange: signal.exchange || inferExchangeCategory(signal.symbol),
          expiry_time_str: signal.expiry_time_str || calculateNextTime(signal.entry_time, 5),
          gale1_time: signal.gale1_time || calculateNextTime(signal.entry_time, 5),
          gale2_time: signal.gale2_time || calculateNextTime(signal.entry_time, 10),
          timeframe: signal.timeframe || '5m',
          processed: false,
          status: 'active' as 'active' | 'completed' | 'cancelled'
        }));

        // FORCECARR ATUALIZACAO: Guardar IDs atuais para comparar
        const currentIds = displayedSignals.slice(0, 3).map(s => s.symbol);
        const newIds = enrichedSignals.map(s => s.symbol);
        
        // Verificar se realmente há mudança de símbolos
        const symbolsChanged = !currentIds.every((id, i) => id === newIds[i]);
        if (symbolsChanged || currentIds.length === 0) {
          // ATUALIZAÇÃO NECESSÁRIA (silenciado)
          
          // Atualizar os sinais da Dashboard
          setDisplayedSignals(enrichedSignals);
          
          // Registrar a atualização para debug
          window.displayedSignalsRef = enrichedSignals;
          window.displayedSignalsOwner = 'trades';
          
          // Salvar para persistência
          localStorage.setItem('dashboardSignals', JSON.stringify({
            signals: enrichedSignals,
            timestamp: Date.now(),
            version: '2.0-trades-sync'
          }));

          // Dashboard sincronizada (silenciado)
        } else {
          // Sinais idênticos
        }
      } catch (error) {

      } finally {
        // Garantir que a flag seja resetada
        isProcessingEvent = false;
      }
    };

    // Registrar ouvinte para eventos da aba Trades
    window.addEventListener('tradesSignalsUpdated', handleTradesSignalsUpdate as EventListener);
    window.addEventListener('forceDashboardSync', handleTradesSignalsUpdate as EventListener);

    // Verificar imediatamente se há sinais da aba Trades no localStorage
    try {
      // Verificar em múltiplos locais de armazenamento (robustez)
      const possibleStorageKeys = ['tradesSignals', 'trades_signals', 'persistent-signals-navigation'];
      
      for (const key of possibleStorageKeys) {
        const storedData = localStorage.getItem(key);
        if (!storedData) continue;
        
        let parsedData;
        try {
          parsedData = JSON.parse(storedData);
        } catch (e) {

          continue;
        }
        
        // Verificar onde estão os sinais na estrutura de dados
        let signals = null;
        if (parsedData.signals && Array.isArray(parsedData.signals)) {
          signals = parsedData.signals;
          // Sinais encontrados
        } else if (Array.isArray(parsedData)) {
          signals = parsedData;
          // Array direto
        } else if (parsedData.data && Array.isArray(parsedData.data)) {
          signals = parsedData.data;
          // Sinais em .data
        }
        
        // Se encontramos sinais válidos, usar
        if (signals && signals.length >= 3) {
          // Carregando sinais iniciais
          handleTradesSignalsUpdate(new CustomEvent('tradesSignalsUpdated', { 
            detail: { signals, timestamp: Date.now() }
          }));
          break; // Usar o primeiro conjunto válido encontrado
        }
      }
    } catch (error) {

    }

    // VERIFICACAO AUTOMÁTICA: Verificar a cada 10 segundos
    const intervalId = setInterval(() => {
      try {
        const tradesData = localStorage.getItem('tradesSignals');
        if (!tradesData) return;
        
        const parsedData = JSON.parse(tradesData);
        if (parsedData && parsedData.signals && parsedData.timestamp) {
          // Verificar se dados são recentes (menos de 30 segundos)
          const now = Date.now();
          const isRecent = now - parsedData.timestamp < 30 * 1000;
          
          if (isRecent) {
            // Verificar se os sinais são diferentes dos atuais
            const newSymbols = parsedData.signals.slice(0, 3).map(s => s.symbol);
            const currentSymbols = displayedSignals.slice(0, 3).map(s => s.symbol);
            
            const needsUpdate = !newSymbols.every((symbol, idx) => symbol === currentSymbols[idx]);
            if (needsUpdate) {

              handleTradesSignalsUpdate(new CustomEvent('tradesSignalsUpdated', { detail: parsedData }));
            }
          }
        }
      } catch (error) {
        // Ignore erros durante verificação automática
      }
    }, 10000); // Verificar a cada 10 segundos

    return () => {
      // Remover ouvintes ao desmontar
      window.removeEventListener('tradesSignalsUpdated', handleTradesSignalsUpdate as EventListener);
      window.removeEventListener('forceDashboardSync', handleTradesSignalsUpdate as EventListener);
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateNextTime]); // REMOVIDO displayedSignals das dependências - usa displayedSignalsRef

  // Efeito para iniciar o carregamento dos sinais - com ref para evitar loop
  const isRefreshingRef = useRef(false);
  
  useEffect(() => {
    if (!signals && !isLoading && !isRefreshingRef.current) {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      refetch().finally(() => {
        setIsRefreshing(false);
        isRefreshingRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals, isLoading]); // Removido refetch das dependências

  // FUNÇÃO CORRIGIDA: Verificar se um sinal já excedeu 20 minutos desde a ENTRADA
  const isSignalOutdated = useCallback((signal: EnrichedSignal): boolean => {
    if (!signal.entry_time) return false;
    
    const now = new Date();
    const [entryHour, entryMin] = signal.entry_time.split(':').map(Number);
    
    // Criar horário de entrada
    const entryTime = new Date();
    entryTime.setHours(entryHour, entryMin, 0, 0);
    
    // Se o horário de entrada for no futuro, ajustar para ontem
    if (entryTime > now) {
      entryTime.setDate(entryTime.getDate() - 1);
    }
    
    // Calcular diferença em minutos desde a entrada
    const timeDiffMs = now.getTime() - entryTime.getTime();
    const minutesSinceEntry = Math.floor(timeDiffMs / (1000 * 60));
    
    // Sinal é considerado desatualizado se passou 20 ou mais minutos desde a entrada
    return minutesSinceEntry >= 20;
  }, []);

  // REMOVIDO - função moveida para depois da declaração de executeSignalRotation

  // REMOVIDO - função moveida para resolver ordem de declaração

  // Função para forçar rotação manual
  const forceRotation = useCallback(() => {

    executeSignalRotation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🎯 LÓGICA ESPECÍFICA: Calcular próximo horário de rotação baseado no padrão 03→23→43→03
  const calculateNextRotationTime = (entryTime: string): string => {
    const [hour, minute] = entryTime.split(':').map(Number);
    
    // Determinar próximo horário baseado na regra específica
    if (minute === 3) {
      // 03 → 23 (mesmo hora)
      return `${hour.toString().padStart(2, '0')}:23`;
    } else if (minute === 23) {
      // 23 → 43 (mesmo hora) 
      return `${hour.toString().padStart(2, '0')}:43`;
    } else if (minute === 43) {
      // 43 → 03 (próxima hora)
      const nextHour = (hour + 1) % 24;
      return `${nextHour.toString().padStart(2, '0')}:03`;
    }
    
    // Fallback para outros casos (não deveria acontecer)

    return entryTime;
  };

  // FUNÇÃO DEFINITIVA para execução de rotação com máxima confiabilidade
  // Esta função verifica se o primeiro sinal já passou do tempo de rotação (20 minutos)
  // e executa a rotação seguindo a regra: 1º sinal sai, 2º→1º, 3º→2º, novo sinal→3º
  const executeRotationDirect = () => {
    try {
      // CAMADA 0: Verificar se é uma execução durante inicialização
      const now = new Date();
      const mountTime = window.lastMountTimestamp || 0;
      const timeSinceMounting = Date.now() - mountTime;
      
      // Se o componente foi montado há pouco, permitir execução após um curto delay
      // Reduzimos de 10s para 2s para não pular a verificação inicial que ocorre aos 5s
      const MOUNT_SKIP_MS = 2000; // 2 segundos
      if (mountTime > 0 && timeSinceMounting < MOUNT_SKIP_MS) {
        // Componente montado recentemente (silenciado)
        window.isRotating = false;
        return;
      }
      
      // CAMADA 1: Verificar se já está rotacionando para evitar operações simultâneas
      
      // Se já estiver rotacionando, abortar para evitar rotações simultâneas
      if (window.isRotating) {

        return;
      }
      
      // Indicar início da rotação com flag global
      window.isRotating = true;
      window.lastRotationStarted = now.getTime();
      
      // INICIANDO VERIFICAÇÃO (silenciado)

      // CAMADA 2: Verificar se há sinais para processar
      let signalsToRotate = displayedSignals;

      // Se o estado React estiver vazio, tentar usar referência global (outras abas podem ter atualizado)
      if ((!signalsToRotate || signalsToRotate.length < 3) && window.displayedSignalsRef && window.displayedSignalsRef.length >= 3) {
        // Se a referência global existir, verificar se ela foi criada por esta instância da Dashboard
        if (window.displayedSignalsOwner && window.displayedSignalsOwner === 'dashboard') {

          signalsToRotate = window.displayedSignalsRef;
          try { setDisplayedSignals(signalsToRotate); } catch (e) {
            // Intentionally empty
          }
        } else {

        }
      }

      // CORREÇÃO ROBUSTA: Se não temos sinais no estado, tentar buscar do localStorage
      if (!signalsToRotate || signalsToRotate.length < 3) {

        try {
          // Tentar carregar sinais do localStorage de múltiplas chaves possíveis
          // Priorizar a chave exata `dashboardSignals` criada pela dashboard
          const storedData = localStorage.getItem('dashboardSignals') || localStorage.getItem('dashboard_signals') || localStorage.getItem('dashboard-signals');
          
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            if (parsedData) {
              // Verificar diversos formatos possíveis dos dados
              let signalsArray = null;
              
              if (parsedData.signals && Array.isArray(parsedData.signals)) {
                signalsArray = parsedData.signals;

              } else if (Array.isArray(parsedData)) {
                signalsArray = parsedData;

              }

              // Verificar se encontramos um array válido com pelo menos 3 elementos
              if (signalsArray && signalsArray.length >= 3) {
                // Primeiro, verificar se os sinais salvos têm a flag isDashboard
                const dashboardSignals = signalsArray.filter(s => s && s.isDashboard === true && s.entry_time);
                if (dashboardSignals.length >= 3) {

                  signalsToRotate = dashboardSignals.slice(0, 3);
                  setDisplayedSignals(signalsToRotate);
                } else {
                  // Se não houver sinais marcados explicitamente, recusar usar sinais vindos de outras abas

                  // Não definir signalsToRotate aqui; deixaremos a verificação criar novos sinais se necessário
                }
              }
            }
          } else {

          }
        } catch (localStorageError) {

        }
      }

      // Se ainda não temos sinais suficientes, tentar criar novos sinais
      if (!signalsToRotate || signalsToRotate.length < 3) {

        try {
          // Gerar 3 novos horários seguindo o padrão 03→23→43→03
          const validTimes = calculateNextThreeValidTimes();
          
          // Criar 3 sinais com os horários válidos e símbolos fixos
          const newSignals: EnrichedSignal[] = [
            createSignalObject(validTimes[0], 1), // Worldcoin (OTC)
            createSignalObject(validTimes[1], 2), // Pepe (OTC)
            createSignalObject(validTimes[2], 3)  // Gold/Silver (OTC)
          ];

          signalsToRotate = newSignals;
          
          // Atualizar o estado React e salvar no localStorage
          setDisplayedSignals(newSignals);
          saveSignalsToLocalStorage(newSignals, Date.now(), getInitialTimeSlot());
          saveDashboardSignalsForSync(newSignals);
          
          // Como acabamos de criar novos sinais, não precisamos rotacionar ainda

          window.isRotating = false;
          return;
        } catch (createError) {

          window.isRotating = false;
          return;
        }
      }

      // CAMADA 3: Extrair o primeiro sinal (posição 1) para verificar seu horário de entrada
      // Ordenar sinais por posição para garantir ordem correta
      const sortedSignals = [...signalsToRotate]
        .filter(signal => signal && [1, 2, 3].includes(signal.position))
        .sort((a, b) => a.position - b.position);
      
      if (sortedSignals.length < 3) {

        window.isRotating = false;
        return;
      }
      
      // Usar o primeiro após ordenação OU buscar especificamente o de posição 1
      let firstSignal = sortedSignals[0];
      if (!firstSignal) {
        firstSignal = signalsToRotate.find(signal => signal && signal.position === 1);
      }
      
      // Verificação rigorosa do primeiro sinal e seu horário
      if (!firstSignal || !firstSignal.entry_time || typeof firstSignal.entry_time !== 'string') {

        window.isRotating = false;
        return;
      }
      
      // Primeiro sinal (silenciado)
      
      // CAMADA 4: Calcular timestamp do horário de entrada usando parseTimeString
      // parseTimeString já aplica heurística para dias (não força para ontem horários futuros próximos)
      const entryDate = parseTimeString(firstSignal.entry_time);
      const entryDateTimestamp = entryDate.getTime();
      
      // CAMADA 5: Verificação CRÍTICA - calcular minutos desde a entrada (pode ser negativo se entrada no futuro)
      const millisSinceEntry = now.getTime() - entryDateTimestamp;
      const minutesSinceEntry = Math.floor(millisSinceEntry / (1000 * 60));

      // Log detalhado para diagnóstico
      // VERIFICAÇÃO DE ROTAÇÃO (silenciado)

      // Se a entrada ainda está no futuro, informar quanto falta para a entrada e para a rotação
      if (minutesSinceEntry < 0) {
        const minutesToEntry = Math.ceil(Math.abs(millisSinceEntry) / (1000 * 60));
        const millisToRotation = entryDateTimestamp + SIGNAL_PROCESSING_TIME - now.getTime();
        const minutesToRotation = Math.max(0, Math.ceil(millisToRotation / (1000 * 60)));
        // Entrada futura (silenciado)
        window.isRotating = false;
        return;
      }

      // VERIFICAÇÃO CRÍTICA: Rotação EXATAMENTE após 20 minutos desde a entrada
      const shouldRotate = minutesSinceEntry >= Math.floor(SIGNAL_PROCESSING_TIME / (1000 * 60));

      if (!shouldRotate) {
        // Ainda não é hora (silenciado)
        window.isRotating = false;
        return;
      }
      
      // CAMADA 6: Executar rotação real
      // EXECUTANDO ROTAÇÃO (silenciado)
      
      // Extrair os 3 sinais atuais para realizar a rotação
      const currentSignals = [...signalsToRotate].filter(signal => [1, 2, 3].includes(signal.position));
      currentSignals.sort((a, b) => a.position - b.position);
      
      if (currentSignals.length < 3) {

        window.isRotating = false;
        return;
      }
      
      // ANTES DA ROTAÇÃO (silenciado)
      currentSignals.forEach((signal, index) => {
        // Sinal (silenciado)
      });
      
      // Remover o primeiro sinal (que será substituído pelo segundo)
      const [firstToRemove, secondToFirst, thirdToSecond] = currentSignals;
      
      // Verificar qual será o próximo horário válido para o novo sinal (posição 3)
      const nextEntryTime = getNextValidTime(now.getHours() + ':' + now.getMinutes(), firstToRemove.entry_time);
      // Próximo horário válido (silenciado)
      // Gerar novo terceiro sinal escolhendo símbolo que não esteja nas 2 primeiras posições
      const existingSymbols = [secondToFirst.symbol, thirdToSecond.symbol];
      const chosenSymbol = pickNextSymbol(existingSymbols);
      const newThirdSignal = createSignalObject(nextEntryTime, 3, chosenSymbol);
      
      // Atualizar posições dos sinais remanescentes
      secondToFirst.position = 1;
      thirdToSecond.position = 2;
      
      // Criar nova lista de sinais com a rotação aplicada
      const updatedSignals: EnrichedSignal[] = displayedSignals.map(signal => {
        if (signal.id === firstToRemove.id) return null; // Remover primeiro sinal
        if (signal.id === secondToFirst.id) return { ...signal, position: 1 }; // Segundo → Primeiro
        if (signal.id === thirdToSecond.id) return { ...signal, position: 2 }; // Terceiro → Segundo
        return signal;
      }).filter(Boolean) as EnrichedSignal[]; // Remover null (primeiro sinal)
      
      // Adicionar o novo terceiro sinal
      updatedSignals.push(newThirdSignal);
      
      // DEPOIS DA ROTAÇÃO (silenciado)
      
      // Atualizar estado com a nova lista de sinais
      // Atualizando sinais (silenciado)
      
      // Garantir que cada sinal tenha a propriedade position correta (1, 2, 3)
      const finalSignals = updatedSignals.map((signal, index) => ({
        ...signal,
        position: index + 1,
        dashboardPosition: index
      }));
      
      // Atualizar estado e persistir
      setDisplayedSignals(finalSignals);
      
      // Salvar no localStorage e disparar eventos
      saveSignalsToLocalStorage(finalSignals, Date.now(), getInitialTimeSlot());
      
      // CORREÇÃO DE SINCRONIZAÇÃO: Garantir que os sinais são enviados para a aba Trades
      saveDashboardSignalsForSync(finalSignals);
      // SINCRONIZAÇÃO (silenciado)
      
      // ✅ Disparar evento customizado para notificar aba Trades
      window.dispatchEvent(new CustomEvent('signalsRotated', {
        detail: {
          signals: finalSignals,
          timestamp: Date.now()
        }
      }));
      // Evento disparado para Trades
      
      // ROTAÇÃO CONCLUÍDA (silenciado)
    } catch (error) {

    } finally {
      // Garantir que a flag de rotação seja sempre limpa no final
      window.isRotating = false;
    }
  };

  // Disponibilizar função para acesso global
  Object.defineProperty(window, 'executeRotationDirect', {
    value: executeRotationDirect,
    writable: true,
    configurable: true
  });

  // ❌❌❌ TIMER OBSOLETO: Rotação é feita no SUPABASE, não no cliente! ❌❌❌
  // A função rotate_signals() no Supabase faz a rotação automática
  // Este useEffect foi DESATIVADO para eliminar logs obsoletos
  useEffect(() => {
    // Timer client-side desativado
    return; // RETURN EARLY - não executar lógica obsoleta
    
    // LIMPEZA COMPLETA: Remover TODOS os timers existentes para garantir que não há duplicação

    // Limpar timer de rotação principal
    if (window.dashboardRotationTimer) {

      clearInterval(window.dashboardRotationTimer);
      window.dashboardRotationTimer = null;
    }
    
    // Limpar timer de monitoramento
    if (window.rotationMonitorInterval) {

      clearInterval(window.rotationMonitorInterval);
      window.rotationMonitorInterval = null;
    }
    
    // Limpar qualquer outro timer global que possa estar interferindo
    Object.keys(window).forEach(key => {
      if (key.includes('timer') || key.includes('Timer') || key.includes('Interval')) {
        try {
          const value = window[key];
          if (typeof value === 'number') {

            clearTimeout(value);
            clearInterval(value);
            window[key] = null;
          }
        } catch (e) {
          // Ignorar erros de limpeza
        }
      }
    });

    // VERIFICAÇÃO INICIAL: Executar após 5 segundos para dar tempo de carregar
    const initialCheck = setTimeout(() => {

      if (window.signalsCardMounted) {
        executeRotationDirect();
      }
    }, 5000);
    
    // TIMER ÚNICO: Verificar a cada 30 segundos
    const mainTimer = setInterval(() => {
      try {
        if (!window.signalsCardMounted) return;
        
        // Log detalhado apenas a cada 5 verificações para não poluir o console
        const now = Date.now();
        const lastCheck = window.lastRotationCheck || 0;
        const checkInterval = now - lastCheck;
        
        if (checkInterval > 150000) { // Log detalhado a cada 2.5 minutos

          window.lastRotationCheck = now;
        } else {

        }
        
        // Executar verificação de rotação
        executeRotationDirect();
        
        // Garantir sincronização com a aba Trades mesmo sem rotação
        if (displayedSignals && displayedSignals.length >= 3) {
          // Sincronizar a cada 2 minutos para garantir que as abas estão atualizadas
          const shouldSync = checkInterval > 120000;
          if (shouldSync) {

            saveDashboardSignalsForSync(displayedSignals);
          }
        }
      } catch (error) {

      }
    }, 30000); // 30 segundos - balanceando precisão e performance
    
    // Salvar referência global para acesso externo
    window.dashboardRotationTimer = mainTimer;
    window.signalsCardMounted = true;
    window.lastMountTimestamp = Date.now();
    
    // Limpeza completa ao desmontar
    return () => {

      clearTimeout(initialCheck);
      clearInterval(mainTimer);
      
      // Limpar referências globais
      window.dashboardRotationTimer = null;
      window.signalsCardMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sem dependências para evitar recriação do timer
  
  // SISTEMA REMOVIDO: Substituído pelo timer único acima
  // Este useEffect duplicado foi removido para evitar conflitos de timers
  
  // TIMER DE MONITORAMENTO REMOVIDO: Substituído pelo timer único acima
  // Este useEffect foi removido para evitar conflitos de timers

  // ... existing code ...

  // FUNÇÃO PARA GERAR NOVOS SINAIS COM HORÁRIOS VÁLIDOS
  const generateNewSignals = useCallback((validTimes: string[]): EnrichedSignal[] => {

    return validTimes.map((time, index) => {
      const assetSymbol = getRandomAsset(); // Retorna string
      const entryTime = time;
      const expiryTime = calculateNextTime(time, 5); // 5 minutos após entrada
      const gale1Time = expiryTime; // Primeira reentrada no horário de expiração
      const gale2Time = calculateNextTime(expiryTime, 5); // Segunda reentrada 5 minutos após expiração
      
      return {
        id: `signal-${Date.now()}-${index}`,
          entry_time: entryTime,
        type: SignalType.TECHNICAL,
        strength: SignalStrength.STRONG,
        timestamp: new Date().toISOString(),
        qualityScore: 90,
        symbol: assetSymbol,
        exchange: inferExchangeCategory(assetSymbol),
        processed: false,
        status: 'active' as 'active' | 'completed' | 'cancelled',
        signal: Math.random() > 0.5 ? ('BUY' as const) : ('SELL' as const),
        reason: 'Technical Analysis',
        price: 0,
        entry_price: 0,
        target_price: 0,
        stop_loss: 0,
          expiry_time_str: expiryTime,
          gale1_time: gale1Time,
        gale2_time: gale2Time,
        success_rate: 0.85 + Math.random() * 0.1,
        expired: false,
        timeframe: '5m',
        expiry: '5m',
        risk_reward: '2:1',
        isDashboard: true,
        dashboardPosition: index,
        entryTimestamp: Date.now() // Adicionar timestamp de entrada
      } as EnrichedSignal;
    });
  }, []);

  // Função para atualizar sinais (movida após as outras declarações)
  const handleRefresh = useCallback(() => {

    // Verificar se há pelo menos um sinal atrasado (>20 min após entrada)
    const hasOutdated = displayedSignals.some(isSignalOutdated);

    if (!hasOutdated) {
      toast.info('Os sinais atuais ainda são válidos. Aguarde a próxima rotação.', { duration: 4000 });
      return;
    }

    // Prosseguir com a atualização completa apenas se houver sinais atrasados

    // Limpar completamente todas as caches
    localStorage.removeItem('dashboard-signals-cache');
    localStorage.removeItem('dashboard-signals-lastUpdated');
    localStorage.removeItem('dashboardSignals');
    localStorage.removeItem('dashboard_signals');

    // Limpar timers persistentes
    if (window.signalTimersMap) {
      window.signalTimersMap = {};
    }

    // Resetar estados
    setDisplayedSignals([]);
    setCachedSignals([]);
    signalProcessCount = 0;

    setIsRefreshing(true);
    setRefreshingSignals(true);

    setTimeout(() => {
      const validTimes = calculateNextThreeValidTimes();

      const newSignals = generateNewSignals(validTimes);

      setDisplayedSignals(newSignals);
      saveSignalsToLocalStorage(newSignals, Date.now(), getInitialTimeSlot());

      newSignals.forEach(registerPersistentTimer);

      setIsRefreshing(false);
      setTimeout(() => {
        setRefreshingSignals(false);
        setRefreshButtonState('success');
        setTimeout(() => setRefreshButtonState('idle'), 3000);
      }, 500);
    }, 500);
  }, [isSignalOutdated, generateNewSignals, registerPersistentTimer]); // REMOVIDO displayedSignals das dependências

  // EFEITO DE PRESERVAÇÃO DESABILITADO: Interferia com rotação
  // useEffect(() => {
  //   if (!displayedSignals || displayedSignals.length === 0) return;
    
  //   // Verificar se os sinais têm timestamp de entrada
  //   const signalsWithoutTimestamp = displayedSignals.filter(signal => !signal.entryTimestamp);
    
  //   if (signalsWithoutTimestamp.length > 0) {
  //     // Adicionar timestamp de entrada para sinais que não têm
  //     const updatedSignals = displayedSignals.map(signal => ({
  //       ...signal,
  //       entryTimestamp: signal.entryTimestamp || (() => {
  //         // Calcular timestamp baseado no horário de entrada
  //         const [hours, minutes] = signal.entry_time.split(':').map(Number);
  //         const entryDate = new Date();
  //         entryDate.setHours(hours, minutes, 0, 0);
          
  //         // Se o horário for no futuro, usar timestamp atual
  //         const now = new Date();
  //         return entryDate > now ? Date.now() : entryDate.getTime();
  //       })()
  //     }));
      
  //     setDisplayedSignals(updatedSignals);
  //     saveDashboardSignalsForSync(updatedSignals);
  //   }
  // }, [displayedSignals, saveDashboardSignalsForSync]);





  // 🔒 EFEITO BLOQUEADOR REMOVIDO: Era vazio e não fazia nada útil

  // ❌ SINCRONIZAÇÃO COM PÁGINA SIGNALS REMOVIDA: Evitar interferências na rotação
  // A sincronização será feita apenas durante a rotação controlada

  // Sincronizar entryTimestamp DESABILITADO: Interferia com rotação
  // useEffect(() => {
  //   if (displayedSignals && displayedSignals.length > 0) {
  //     const updatedSignals = displayedSignals.map(signal => ({
  //       ...signal,
  //       entryTimestamp: (() => {
  //         const [hours, minutes] = signal.entry_time.split(':').map(Number);
  //         const entryDate = new Date();
  //         entryDate.setHours(hours, minutes, 0, 0);
          
  //         // Se o horário for no futuro, usar timestamp atual
  //         const now = new Date();
  //         return entryDate > now ? Date.now() : entryDate.getTime();
  //       })()
  //     }));
      
  //     setDisplayedSignals(updatedSignals);
  //     saveDashboardSignalsForSync(updatedSignals);
  //   }
  // }, [displayedSignals, saveDashboardSignalsForSync]);

  // Efeito para inicializar consistentemente o localStorage na montagem
  useEffect(() => {
    try {
      // Inicializando SignalsCard
      
      // Marcar componente como montado
      window.signalsCardMounted = true;
      window.lastMountTimestamp = Date.now();
      
      // Verificar se há dados no localStorage com diferentes chaves e padronizar
      const dashboardDataOld = localStorage.getItem('dashboard-signals');
      const dashboardDataNew = localStorage.getItem('dashboardSignals');
      
      // Se temos dados na chave antiga e não na nova, migrar
      if (dashboardDataOld && !dashboardDataNew) {

        localStorage.setItem('dashboardSignals', dashboardDataOld);
      }
      
      // Se temos dados na chave nova, verificar se são válidos
      if (dashboardDataNew) {
        try {
          const { signals, timestamp } = JSON.parse(dashboardDataNew);
          
          // Verificar se os dados são válidos
          if (Array.isArray(signals) && signals.length >= 3 && timestamp) {
            const dataAge = Date.now() - timestamp;
            
            // Se os dados são recentes (menos de 2 horas)
            if (dataAge < 2 * 60 * 60 * 1000) {
              // Dados válidos
              setDisplayedSignals(signals);
            } else {

              // Os sinais serão renovados no fluxo normal da aplicação
            }
          } else {

            // Os sinais serão renovados no fluxo normal da aplicação
          }
        } catch (error) {

          // Os sinais serão renovados no fluxo normal da aplicação
        }
      }
      
      // Remover chave antiga para evitar confusão
      if (dashboardDataOld) {
        localStorage.removeItem('dashboard-signals');
      }
    } catch (error) {

    }
    
    return () => {
      // Limpar flag de componente montado ao desmontar
      window.signalsCardMounted = false;
      // SignalsCard desmontado
    };
  }, []);

  const [traderLink, setTraderLink] = useState<string>('');
  
  // Carregar o link do trader no início
  useEffect(() => {
    const loadTraderLink = async () => {
      try {
        const link = await traderLinkService.getCurrentTraderLink();
        // Link do trader carregado (silenciado)
        setTraderLink(link);
      } catch (error) {

        // Em caso de erro, manter o link padrão
        setTraderLink('https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree');
      }
    };
    
    loadTraderLink();
  }, []);
  
  // ... existing code ...
  
  // Função para abrir o link do trader
  const openTraderLink = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    if (!traderLink) {

      // Fallback para o link padrão caso o traderLink ainda não tenha sido carregado
      window.open('https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree', '_blank');
      return;
    }

    window.open(traderLink, '_blank');
  }, [traderLink]);
  
  // ... rest of existing code ...

  // Função para forçar rotação de sinais e sincronização com a aba Trades
  const forceRotationAndSync = () => {

    // Executar rotação diretamente
    executeRotationDirect();
    
    // Verificação pós-rotação
    setTimeout(() => {
      try {
        const dashboardData = localStorage.getItem('dashboardSignals');
        if (dashboardData) {
          const { signals, timestamp } = JSON.parse(dashboardData);
          if (signals && Array.isArray(signals) && signals.length >= 3) {


            // Forçar sincronização com a aba Trades
            saveDashboardSignalsForSync(signals);

          }
        }
      } catch (error) {

      }
    }, 500); // Pequeno delay para garantir que a rotação foi concluída
  };

  // Remover exposição global de funções para evitar interferências de scripts externos

  // Função ultra-robusta para garantir a inicialização correta dos sinais
  const ensureCorrectSignalsInitialization = useCallback(() => {
    try {

      // Flag para controlar se temos sinais válidos
      let hasValidSignals = false;
      
      // VERIFICAÇÃO 1: Verificar se já temos sinais válidos no estado
      if (displayedSignals && displayedSignals.length >= 3) {

        hasValidSignals = true;
      }
      
      // VERIFICAÇÃO 2: Se não temos sinais no estado, verificar localStorage
      if (!hasValidSignals) {

        try {
          // Tentar carregar de diferentes chaves no localStorage
          const sources = [
            'dashboardSignals',
            'dashboard_signals',
            'dashboard_signals_fixed'
          ];
          
          for (const source of sources) {
            const storedData = localStorage.getItem(source);
            if (!storedData) continue;
            
            let parsedData;
            try {
              parsedData = JSON.parse(storedData);
            } catch (e) {

              continue;
            }
            
            // Verificar se temos sinais válidos
            if (parsedData && parsedData.signals && Array.isArray(parsedData.signals) && parsedData.signals.length >= 3) {

              // Verificar se os sinais estão no formato correto (posição 1, 2, 3)
              const validPositions = parsedData.signals.filter(s => [1, 2, 3].includes(s.position));
              if (validPositions.length >= 3) {
                // Atualizar estado React com os sinais encontrados
                const filteredSignals = validPositions.sort((a, b) => a.position - b.position).slice(0, 3);

                // Atualizar estado
                setDisplayedSignals(filteredSignals);
                
                // Verificar se primeiro sinal já passou do tempo de rotação
                const firstSignal = filteredSignals.find(s => s.position === 1);
                if (firstSignal && firstSignal.entry_time) {
                  const [hours, minutes] = firstSignal.entry_time.split(':').map(Number);
                  const entryDate = new Date();
                  entryDate.setHours(hours, minutes, 0, 0);
                  
                  // Se o horário for no futuro, considerar que é de ontem
                  const now = new Date();
                  if (entryDate > now) {
                    entryDate.setDate(entryDate.getDate() - 1);
                  }
                  
                  const millisSinceEntry = now.getTime() - entryDate.getTime();
                  const minutesSinceEntry = Math.floor(millisSinceEntry / (1000 * 60));

                  // Se já passou 20 minutos, devemos executar uma rotação imediatamente
                  if (minutesSinceEntry >= 20) {

                    // Atrasar a rotação para dar tempo dos estados serem atualizados
                    setTimeout(() => {
                      if (window.signalsCardMounted) {
                        executeRotationDirect();
                      }
                    }, 1000);
                  }
                }
                
                hasValidSignals = true;
                break;
              }
            }
          }
        } catch (error) {

          hasValidSignals = false;
        }
      }
      
      // Se não há sinais válidos, inicializar com novos sinais
      if (!hasValidSignals) {

        // Gerar 3 novos horários seguindo o padrão 03→23→43→03
        const validTimes = calculateNextThreeValidTimes();
        
        // Criar 3 sinais com os horários válidos e símbolos fixos
        const newSignals: EnrichedSignal[] = [
          createSignalObject(validTimes[0], 1), // Worldcoin (OTC)
          createSignalObject(validTimes[1], 2), // Pepe (OTC)
          createSignalObject(validTimes[2], 3)  // Gold/Silver (OTC)
        ];
        
        // Atualizar estado e localStorage

        setDisplayedSignals(newSignals);
        saveSignalsToLocalStorage(newSignals, Date.now(), getInitialTimeSlot());
        
        // Sincronizar com a aba Signals
        saveDashboardSignalsForSync(newSignals);
      }

      // Atualizar referência global para debug
      window.displayedSignalsRef = displayedSignals;

    } catch (error) {

    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ❌❌❌ TIMER OBSOLETO 2: Rotação é feita no SUPABASE, não no cliente! ❌❌❌  
  useEffect(() => {
    // Timer automático desativado
    return; // RETURN EARLY - não executar lógica obsoleta
    
    // Timer único que verifica periodicamente SEM depender de displayedSignals

    // CORREÇÃO: Verificar e limpar qualquer timer existente para evitar duplicações
    if (window.dashboardRotationTimer) {

      clearInterval(window.dashboardRotationTimer);
      window.dashboardRotationTimer = null;
    }
    
    // Inicialização imediata dos sinais com delay para garantir montagem completa
    setTimeout(() => {

      ensureCorrectSignalsInitialization();
    }, 100);
    
    // CORREÇÃO: Verificação inicial após 5 segundos apenas para diagnóstico, SEM executar rotação
    const initialCheck = setTimeout(() => {

      // Verificar estado dos sinais sem executar rotação
      try {
        // Verificar se temos sinais
        if (!displayedSignals || displayedSignals.length < 3) {

          return;
        }
        
        // Verificar primeiro sinal
        const firstSignal = displayedSignals.find(signal => signal.position === 1);
        if (!firstSignal || !firstSignal.entry_time) {

          return;
        }
        
        // Calcular tempo desde entrada
        const [entryHour, entryMin] = firstSignal.entry_time.split(':').map(Number);
        const entryDate = new Date();
        entryDate.setHours(entryHour, entryMin, 0, 0);
        
        // Se o horário for no futuro, considerar que é de ontem
        const now = new Date();
        if (entryDate > now) {
          entryDate.setDate(entryDate.getDate() - 1);
        }
        
        const millisSinceEntry = now.getTime() - entryDate.getTime();
        const minutesSinceEntry = Math.floor(millisSinceEntry / (1000 * 60));


        // NÃO executar rotação, apenas diagnóstico
      } catch (error) {

      }
    }, 5000);

    // CORREÇÃO: Usar intervalo de 30 segundos para evitar sobrecarga
    const interval = setInterval(() => {
      try {
        // Verificar se o componente ainda está montado usando flag global
        if (!window.signalsCardMounted) {

          return;
        }

        // DIAGNÓSTICO: Monitorar tempo desde última execução
        const now = Date.now();
        const lastCheck = window.lastRotationCheck || 0;
        const timeSinceLastCheck = now - lastCheck;
        
        if (lastCheck > 0 && timeSinceLastCheck > 60000) {

        }
        
        window.lastRotationCheck = now;
        
        // Executar verificação de rotação
        executeRotationDirect();
        
      } catch (error) {

      }
    }, 30 * 1000); // 30 segundos para verificações periódicas - tempo ideal para não sobrecarregar

    // Guardar referência global ao timer para diagnóstico e limpeza
    window.dashboardRotationTimer = interval;
    
    // Definir flag de componente montado
    window.signalsCardMounted = true;
    
    // Limpar timer ao desmontar
    return () => {
      window.signalsCardMounted = false;
      clearInterval(interval);
      clearTimeout(initialCheck);
      
      // Limpar referência global
      if (window.dashboardRotationTimer === interval) {
        window.dashboardRotationTimer = null;
      }

    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sem dependências para garantir que o timer seja criado apenas uma vez

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
                onClick={() => refetch()}
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
                          <span className="font-semibold text-white/90">{signal.display_name || signal.symbol}</span>
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
                            <span className="font-medium">{convertTimeToSelected(signal.entry_time) || '--:--'}</span>
                          </div>
                          
                          <div className="flex items-center text-xs text-white/60">
                            <Clock className="h-3 w-3 mr-1 text-white/50" />
                            <span className="mr-1">Expiração:</span>
                            <span className="font-medium">{convertTimeToSelected(signal.expiry_time_str) || '--:--'}</span>
                            <span className="ml-1 text-[10px] text-white/40">
                              ({signal.expiry || '5m'})
                            </span>
                          </div>
                          
                          <div className="flex items-center text-xs text-white/60">
                            <RefreshCw className="h-3 w-3 mr-1 text-white/50" />
                            <span className="mr-1">Reentrada 1:</span>
                            <span className="font-medium">{convertTimeToSelected(signal.gale1_time) || '--:--'}</span>
                          </div>
                          
                          <div className="flex items-center text-xs text-white/60">
                            <RefreshCw className="h-3 w-3 mr-1 text-white/50" />
                            <span className="mr-1">Reentrada 2:</span>
                            <span className="font-medium">{convertTimeToSelected(signal.gale2_time) || '--:--'}</span>
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
                          onClick={openTraderLink}
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

  // ✅ CORREÇÃO: Tentar carregar sinais do cache antes de mostrar erro
  if (error) {
    // Verificar se há sinais em cache antes de mostrar erro
    let cachedSignalsToUse: EnrichedSignal[] | null = null;
    
    try {
      // Tentar carregar do cache da aba Trades
      const tradesData = localStorage.getItem('tradesSignals');
      if (tradesData) {
        const parsedData = JSON.parse(tradesData);
        if (parsedData?.signals && Array.isArray(parsedData.signals) && parsedData.signals.length >= 3) {
          cachedSignalsToUse = parsedData.signals.slice(0, 3);
        }
      }
      
      // Se não achou nos Trades, tentar no cache do Dashboard
      if (!cachedSignalsToUse) {
        const dashboardCache = localStorage.getItem('dashboard-signals-cache');
        if (dashboardCache) {
          const parsedCache = JSON.parse(dashboardCache);
          if (parsedCache?.signals && Array.isArray(parsedCache.signals) && parsedCache.signals.length >= 3) {
            cachedSignalsToUse = parsedCache.signals.slice(0, 3);
          }
        }
      }
    } catch (e) {

    }
    
    // Se encontrou sinais em cache, usar eles ao invés de mostrar erro
    if (cachedSignalsToUse && cachedSignalsToUse.length >= 3) {
      // Atualizar displayedSignals com os sinais do cache
      if (displayedSignals.length === 0) {
        setDisplayedSignals(cachedSignalsToUse);
      }
      
      // Não mostrar erro, continuar renderização normal
      // (o fluxo vai cair no próximo if abaixo)
    } else {
      // Realmente não há sinais disponíveis - mostrar erro
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
                onClick={() => refetch()}
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
                onClick={() => refetch()}
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
                          <span className="font-semibold text-white/90">{signal.display_name || signal.symbol}</span>
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
                            <span className="font-medium">{convertTimeToSelected(signal.entry_time) || '--:--'}</span>
                          </div>
                          
                          <div className="flex items-center text-xs text-white/60">
                            <Clock className="h-3 w-3 mr-1 text-white/50" />
                            <span className="mr-1">Expiração:</span>
                            <span className="font-medium">{convertTimeToSelected(signal.expiry_time_str) || '--:--'}</span>
                            <span className="ml-1 text-[10px] text-white/40">
                              ({signal.expiry || '5m'})
                            </span>
                          </div>
                          
                          <div className="flex items-center text-xs text-white/60">
                            <RefreshCw className="h-3 w-3 mr-1 text-white/50" />
                            <span className="mr-1">Reentrada 1:</span>
                            <span className="font-medium">{convertTimeToSelected(signal.gale1_time) || '--:--'}</span>
                          </div>
                          
                          <div className="flex items-center text-xs text-white/60">
                            <RefreshCw className="h-3 w-3 mr-1 text-white/50" />
                            <span className="mr-1">Reentrada 2:</span>
                            <span className="font-medium">{convertTimeToSelected(signal.gale2_time) || '--:--'}</span>
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
                          onClick={openTraderLink}
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
                 transition-all duration-300 signals-card-container" data-component="signals-card">
      <CardHeader className="pb-2 border-b border-white/10 signal-header-gradient">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <CardTitle className="text-sm font-light tracking-wide text-white/90 flex items-center gap-2 shrink-0">
            <TrendingUp className="h-4 w-4 signal-highlight-icon" />
            <span className="hidden xs:inline">{t('dashboard.signals.title')}</span>
          </CardTitle>
          
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 overflow-hidden">
            {/* Timezone Selector (compact version) */}
            <TimeZoneSelector variant="compact" />
            
            {/* Botão de sucesso com fadeIn/fadeOut */}
            <div 
              className={cn(
                "relative transition-opacity duration-300 ease-out",
                refreshButtonState === 'success' ? 'opacity-100' : 'opacity-0 absolute'
              )}
            >
              <Badge variant="outline" className="bg-green-950/30 text-green-400 border-green-500/30 flex items-center px-2 py-1">
                <Check className="h-3.5 w-3.5 mr-1.5" />
                <span className="text-xs hidden sm:inline">{t('dashboard.signals.updated')}</span>
              </Badge>
            </div>
            
            <div 
              className={cn(
                "relative transition-opacity duration-300 ease-out",
                refreshButtonState !== 'success' ? 'opacity-100' : 'opacity-0 absolute'
              )}
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
              className="h-7 px-2 text-xs text-white/80 hover:text-white hover:bg-white/10 shrink-0"
              onClick={() => navigate('/signals')}
            >
              <ChevronRight className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">{t('dashboard.signals.view_all')}</span>
            </Button>
          </div>
        </div>
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
                    "relative group signal-item-hover animate-signal-fade-in",
                    !isCompra && "signal-venda-hover",
                    refreshingSignals ? "opacity-0" : "opacity-100"
                  )}
                  data-delay={delay}
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
                          <h3 className="font-medium text-base">{signal.display_name || signal.symbol}</h3>
                          <div className="flex items-center mt-0.5 text-xs text-white/60 signal-time-badge">
                            <Tag className="h-3 w-3 mr-1" />
                            <span>{signal.exchange || inferExchangeCategory(signal.symbol)}</span>
                            {index === 0 && (
                              <RotationCountdown state={rotationTimerState} />
                            )}
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
                        onClick={openTraderLink}
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
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

// Tempo de espera antes de processar automaticamente um sinal (10 minutos em ms)
const AUTO_COMPLETE_TIMEOUT = 10 * 60 * 1000;

// Modo de teste para processamento rápido (30 segundos)
const TEST_MODE = true;
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

// Definir a lista de ativos disponíveis no escopo global para uso em múltiplas funções
const availableAssets = [
  { symbol: 'Gold/Silver (OTC)', exchange: 'Digital' },
  { symbol: 'Worldcoin (OTC)', exchange: 'Digital' },
  { symbol: 'USD/THB (OTC)', exchange: 'Digital' },
  { symbol: 'ETH/USD (OTC)', exchange: 'Digital' },
  { symbol: 'CHF/JPY (OTC)', exchange: 'Digital' },
  { symbol: 'Pepe (OTC)', exchange: 'Digital' },
  { symbol: 'GBP/AUD (OTC)', exchange: 'Digital' },
  { symbol: 'GBP/CHF', exchange: 'Digital' },
  { symbol: 'GBP/CAD (OTC)', exchange: 'Digital' },
  { symbol: 'EUR/JPY (OTC)', exchange: 'Digital' },
  { symbol: 'AUD/CHF', exchange: 'Digital' },
  { symbol: 'GER 30 (OTC)', exchange: 'Digital' },
  { symbol: 'AUD/CHF (OTC)', exchange: 'Digital' },
  { symbol: 'EUR/AUD', exchange: 'Digital' },
  { symbol: 'USD/CAD (OTC)', exchange: 'Digital' },
  { symbol: 'BTC/USD', exchange: 'Digital' },
  { symbol: 'Amazon/Ebay (OTC)', exchange: 'Digital' },
  { symbol: 'Coca-Cola Company (OTC)', exchange: 'Digital' },
  { symbol: 'AIG (OTC)', exchange: 'Digital' },
  { symbol: 'Amazon/Alibaba (OTC)', exchange: 'Digital' },
  { symbol: 'Bitcoin Cash (OTC)', exchange: 'Digital' },
  { symbol: 'AUD/USD', exchange: 'Digital' },
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
  { symbol: 'USD/CAD', exchange: 'Digital' },
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
      
      // Garantir que usamos os sinais do slot atual
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

// Função para criar um objeto de sinal
const createSignalObject = (timeConfig) => {
  // Escolher um ativo aleatório
  const selectedAsset = availableAssets[Math.floor(Math.random() * availableAssets.length)];
  
  // Decidir entre BUY ou SELL de forma explícita
  const signalType: 'BUY' | 'SELL' = Math.random() > 0.5 ? 'BUY' : 'SELL';
  
  // Criar o sinal
  return {
    id: `signal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              symbol: selectedAsset.symbol,
              exchange: selectedAsset.exchange,
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
    entry_time: timeConfig.entry_time,
    expiry_time_str: timeConfig.expiry_time_str,
    gale1_time: timeConfig.gale1_time,
    gale2_time: timeConfig.gale2_time,
    qualityScore: 70 + Math.floor(Math.random() * 30), // Adicionar qualityScore para compatibilidade com EnrichedSignal
    processed: false, // Adicionar propriedade processed com valor padrão false
    result: undefined, // Adicionar propriedade result com valor padrão undefined
    isAnimating: false, // Adicionar propriedade isAnimating para completude
    signalNumber: 0, // Adicionar propriedade signalNumber para controle de ganhos/perdas
  };
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
        
        const animacaoJaPassou = 
          (horaAtual > animHour) || 
          (horaAtual === animHour && minutoAtual >= animMin);
        
        // Se o momento da animação já passou, marcar como processado
        if (animacaoJaPassou) {
          signal.processed = true;
          signal.isAnimating = false;
          
          // Definir o resultado com base na lista de sinais com perda
          signal.result = perdasNumeros.includes(numeroSinal) ? 'failure' : 'success';
        } 
        // Se a entrada já passou mas a animação ainda não, pode estar aguardando ou em gale
        else if (entradaJaPassou) {
          signal.processed = false;
          
          // Verificar se está no momento de animação
          const [gale2Hour, gale2Min] = horarioGale2.split(':').map(Number);
          const gale2JaPassou = 
            (horaAtual > gale2Hour) || 
            (horaAtual === gale2Hour && minutoAtual >= gale2Min);
          
          if (gale2JaPassou) {
            // Está entre o gale2 e a animação (6 minutos de espera)
            signal.isAnimating = true;
            
            // Determinar resultado antecipadamente, mas ainda não processado
            signal.result = perdasNumeros.includes(numeroSinal) ? 'failure' : 'success';
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
      
      // Atualizar o estado do sinal
      if (!signal.processed) {
        if (animacaoJaPassou) {
          // A animação já passou, marcar como processado
          signal.processed = true;
          signal.isAnimating = false;
          signal.result = perdasNumeros.includes(numeroSinal) ? 'failure' : 'success';
        } else if (gale2JaPassou) {
          // Está entre o gale2 e a animação, mostrar animação
          signal.isAnimating = true;
          signal.result = perdasNumeros.includes(numeroSinal) ? 'failure' : 'success';
        }
      }
    });
  }
  
  // Filtrar para manter apenas os sinais relevantes para exibição
  // Queremos mostrar:
  // 1. Sinais não processados (futuros ou em andamento)
  // 2. Sinais sendo animados
  // 3. Sinais processados recentemente
  let sinaisRelevantes = [...todosSignais].filter(signal => {
    if (!signal.entry_time) return false;
    
    // Sinais sendo animados sempre são relevantes
    if (signal.isAnimating) return true;
    
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
      emergencySignal.isAnimating = false;
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
  isAnimating?: boolean; // Indica se o sinal está em animação
  [key: string]: any; // Permite campos adicionais
}

const SignalsCard = () => {
  const { t } = useLanguage();
  const { convertTimeToSelected } = useTimeZone();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSignals, setActiveSignals] = useState<EnrichedSignal[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string>(getInitialTimeSlot());
  const signalTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const autoRefreshTimer = useRef<NodeJS.Timeout | null>(null);
  const priceUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Mover a função fetchSignals para dentro do componente
  const fetchSignals = useCallback(async (): Promise<EnrichedSignal[]> => {
    // Buscar sinais relevantes...
    let relevantSignals: EnrichedSignal[] = [];
    
    try {
      // Aqui iria a lógica existente de busca de sinais
      // Por enquanto, retornamos um array vazio para satisfazer o tipo de retorno
      
      // Antes de retornar os sinais, garantir que temos exatamente 3
      const finalSignals = ensureThreeSignals(relevantSignals);
      return finalSignals;
    } catch (error) {
      console.error('Erro ao buscar sinais:', error);
      return [];
    }
  }, [/* dependencies existentes */]);

  // ... rest of the component code ...

  // ... existing code ...

  // Constantes usadas nas funções abaixo
  const VALID_MINUTE_PATTERNS = ["03", "23", "43"];

  // Função para encontrar um horário válido para o próximo sinal
  const findValidEntryTime = (currentTime: string, existingTimes: string[]): string => {
    // Calcular o próximo horário disponível com base no tempo atual
    let nextTime = calculateNextTime(currentTime, TIME_BETWEEN_SIGNALS);
    
    // Ajustar para terminar em 3 ou 7 se necessário
    const [hours, minutes] = nextTime.split(':').map(Number);
    const lastDigit = minutes % 10;
    
    // Se não termina em 3 ou 7, ajustar
    if (lastDigit !== 3 && lastDigit !== 7) {
      let newMinutes;
      if (lastDigit < 3) {
        newMinutes = Math.floor(minutes / 10) * 10 + 3;
      } else if (lastDigit < 7) {
        newMinutes = Math.floor(minutes / 10) * 10 + 7;
      } else {
        newMinutes = Math.floor(minutes / 10) * 10 + 10 + 3; // Próxima dezena + 3
      }
      
      // Ajustar hora se necessário
      let newHours = hours;
      if (newMinutes >= 60) {
        newHours = (newHours + 1) % 24;
        newMinutes -= 60;
      }
      
      nextTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    }
    
    // Verificar se não há conflitos com os horários existentes
    const minIntervalMinutes = 10; // Mínimo de 10 minutos entre sinais
    
    let isValid = true;
    for (const existingTime of existingTimes) {
      const timeDiff = getTimeDifferenceInMinutes(existingTime, nextTime);
      if (timeDiff < minIntervalMinutes) {
        isValid = false;
        break;
      }
    }
    
    // Se houver conflito, adicionar mais alguns minutos e verificar novamente
    if (!isValid) {
      return findValidEntryTime(calculateNextTime(nextTime, 5), existingTimes);
    }
    
    return nextTime;
  };

  // Função para garantir que temos exatamente 3 sinais relevantes
  const ensureThreeSignals = (signals: EnrichedSignal[]): EnrichedSignal[] => {
    if (!signals || signals.length === 0) {
      return [];
    }
    
    // Criar uma cópia dos sinais para não modificar o original
    let signalsCopy = [...signals];
    
    // Se temos menos de 3 sinais, gerar mais
    if (signalsCopy.length < 3) {
      // Preparar para gerar sinais adicionais
      const now = new Date();
      
      // Encontrar o próximo horário válido a partir de agora (terminando em 03, 23 ou 43)
      const currentMinute = now.getMinutes();
      let nextValidMinute: string;
      
      if (currentMinute < 3) {
        nextValidMinute = "03";
      } else if (currentMinute < 23) {
        nextValidMinute = "23";
      } else if (currentMinute < 43) {
        nextValidMinute = "43";
      } else {
        // Avançar para a próxima hora
        now.setHours(now.getHours() + 1);
        nextValidMinute = "03";
      }
      
      // Hora base para o próximo sinal
      const baseHour = now.getHours();
      
      // Gerar sinais até termos 3
      while (signalsCopy.length < 3) {
        const entryTimeHours = baseHour + Math.floor(signalsCopy.length / 3);
        const entryTime = `${String(entryTimeHours % 24).padStart(2, '0')}:${nextValidMinute}`;
        const expiryTime = calculateNextTime(entryTime, SIGNAL_EXPIRY_TIME);
        const gale1Time = expiryTime;
        const gale2Time = calculateNextTime(gale1Time, SIGNAL_EXPIRY_TIME);
        
        // Criar um novo sinal
        const newSignal = createSignalObject({
          entry_time: entryTime,
          expiry_time_str: expiryTime,
          gale1_time: gale1Time,
          gale2_time: gale2Time
        }) as EnrichedSignal;
        
        // Adicionar o sinal à lista
        signalsCopy.push(newSignal);
        
        // Avançar para o próximo horário válido
        const minuteIndex = VALID_MINUTE_PATTERNS.indexOf(nextValidMinute);
        nextValidMinute = VALID_MINUTE_PATTERNS[(minuteIndex + 1) % VALID_MINUTE_PATTERNS.length];
      }
    }
    
    // Se temos mais de 3 sinais, manter apenas os 3 mais relevantes
    if (signalsCopy.length > 3) {
      // Ordenar sinais por relevância (priorizando futuros e próximos)
      const now = new Date();
      signalsCopy.sort((a, b) => {
        // Converter horários para timestamps
        const aTime = convertTimeStringToDate(a.entry_time || "00:00").getTime();
        const bTime = convertTimeStringToDate(b.entry_time || "00:00").getTime();
        
        // Verificar se são futuros
        const aIsFuture = aTime > now.getTime();
        const bIsFuture = bTime > now.getTime();
        
        // Priorizar sinais futuros
        if (aIsFuture && !bIsFuture) return -1;
        if (!aIsFuture && bIsFuture) return 1;
        
        // Se ambos são futuros ou ambos já passaram, ordenar pelo mais próximo
        return Math.abs(aTime - now.getTime()) - Math.abs(bTime - now.getTime());
      });
      
      // Manter apenas os 3 primeiros
      signalsCopy = signalsCopy.slice(0, 3);
    }
    
    return signalsCopy;
  };

  // Função para converter string de tempo para objeto Date
  const convertTimeStringToDate = (timeString: string): Date => {
    if (!timeString) return new Date();
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const now = new Date();
      now.setHours(hours, minutes, 0, 0);
      return now;
    } catch (error) {
      console.error('Erro ao converter string de tempo para Date:', error);
      return new Date();
    }
  };
  
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
        <div className="flex flex-col space-y-2 pt-1 h-[350px] justify-center items-center">
          <Clock className="w-12 h-12 text-white/40 animate-pulse" />
          <p className="text-sm text-white/60 text-center animate-pulse">
            {t('dashboard.signals.waiting')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
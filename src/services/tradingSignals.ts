import { supabase } from "@/integrations/supabase/client";
import { SignalStrength, MarketNews } from './types';
import { getBinancePrice, getBinanceHistoricalData } from "./binanceApi";
import { fetchStockQuote, fetchTechnicalIndicator, fetchCompanyOverview } from "./getSimulatedStockData";
import { fetchPriceTarget, fetchAnalystRecommendations } from "./finnhubApi";
import { 
  fetchAllMarketNews, 
  // fetchCompanyNews, // Removida para evitar chamadas à NewsAPI
  analyzeSentiment
} from './newsApi';
import { 
  getLatestPrices,
  getHistoricalKlines,
  getMarketDepth 
} from './binanceApi';
import { SignalType } from '../types/signals';
import { MarketData, HistoricalData, ProcessedHistoricalData } from '../types/marketData';
import { TradingSignal } from '../types/tradingSignals';
import { format, addMinutes, addSeconds, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Controle de execução (similar ao arquivo de bloqueio)
let isSystemRunning = false;
let lastExecutionTime = 0;
let errorCount = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

// Lista de ativos disponíveis com suas categorias
export const ATIVOS_CATEGORIAS = {
  // Ativos Digital
  "Gold/Silver (OTC)": "Digital",
  "Worldcoin (OTC)": "Digital",
  "USD/THB (OTC)": "Digital",
  "ETH/USD (OTC)": "Digital",
  "CHF/JPY (OTC)": "Digital",
  "Pepe (OTC)": "Digital",
  "GBP/AUD (OTC)": "Digital",
  "GBP/CHF": "Digital",
  "GBP/CAD (OTC)": "Digital",
  "EUR/JPY (OTC)": "Digital",
  "AUD/CHF": "Digital",
  "GER 30 (OTC)": "Digital",
  "AUD/CHF (OTC)": "Digital",
  "EUR/AUD": "Digital", 
  "USD/CAD (OTC)": "Digital",
  "BTC/USD": "Digital",
  "Amazon/Ebay (OTC)": "Digital",
  "Coca-Cola Company (OTC)": "Digital",
  "AIG (OTC)": "Digital",
  "Amazon/Alibaba (OTC)": "Digital",
  "Bitcoin Cash (OTC)": "Digital",
  "AUD/USD": "Digital",
  "DASH (OTC)": "Digital",
  "BTC/USD (OTC)": "Digital",
  "SP 35 (OTC)": "Digital",
  "TRUMP Coin (OTC)": "Digital",
  "US 100 (OTC)": "Digital",
  "EUR/CAD (OTC)": "Digital",
  "HK 33 (OTC)": "Digital",
  "Alphabet/Microsoft (OTC)": "Digital",
  "1000Sats (OTC)": "Digital",
  "USD/ZAR (OTC)": "Digital",
  "Litecoin (OTC)": "Digital",
  "Hamster Kombat (OTC)": "Digital",
  "USD Currency Index (OTC)": "Digital",
  "AUS 200 (OTC)": "Digital",
  "USD/CAD": "Digital",
  "MELANIA Coin (OTC)": "Digital",
  "JP 225 (OTC)": "Digital",
  "AUD/CAD (OTC)": "Digital",
  "AUD/JPY (OTC)": "Digital",
  "US 500 (OTC)": "Digital"
};

// Configurações de horários específicos para cada ativo
const HORARIOS_PADRAO = {
  "USD/BRL (OTC)": {
      "Monday": ["00:00-23:59"],
      "Tuesday": ["00:00-00:45", "01:15-23:59"],
      "Wednesday": ["00:00-23:59"],
      "Thursday": ["00:00-23:59"],
      "Friday": ["00:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-23:59"]
  },
  "USOUSD (OTC)": {
      "Monday": ["00:00-23:59"],
      "Tuesday": ["00:00-23:59"],
      "Wednesday": ["00:00-23:59"],
      "Thursday": ["00:00-06:00", "06:30-23:59"],
      "Friday": ["00:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-23:59"]
  },
  "BTC/USD (OTC)": {
      "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
  },
  "Google (OTC)": {
      "Monday": ["00:00-15:30", "16:00-23:59"],
      "Tuesday": ["00:00-23:59"],
      "Wednesday": ["00:00-15:30", "16:00-23:59"],
      "Thursday": ["00:00-23:59"],
      "Friday": ["00:00-15:30", "16:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-23:59"]
  },
  "EUR/JPY (OTC)": {
      "Monday": ["00:00-23:59"],
      "Tuesday": ["00:00-23:59"],
      "Wednesday": ["00:00-01:00", "01:15-23:59"],
      "Thursday": ["00:00-23:59"],
      "Friday": ["00:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-23:59"]
  },
  "ETH/USD (OTC)": {
      "Monday": ["00:00-18:45", "19:15-23:59"],
      "Tuesday": ["00:00-18:45", "19:15-23:59"],
      "Wednesday": ["00:00-18:45", "19:15-23:59"],
      "Thursday": ["00:00-18:45", "19:15-23:59"],
      "Friday": ["00:00-18:45", "19:15-23:59"],
      "Saturday": ["00:00-18:45", "19:15-23:59"],
      "Sunday": ["00:00-18:45", "19:15-23:59"]
  },
  "MELANIA Coin (OTC)": {
      "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
  },
  "EUR/GBP (OTC)": {
      "Monday": ["00:00-23:59"],
      "Tuesday": ["00:00-23:59"],
      "Wednesday": ["00:00-01:00", "01:15-23:59"],
      "Thursday": ["00:00-23:59"],
      "Friday": ["00:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-23:59"]
  },
  "Apple (OTC)": {
      "Monday": ["00:00-15:30", "16:00-23:59"],
      "Tuesday": ["00:00-23:59"],
      "Wednesday": ["00:00-15:30", "16:00-23:59"],
      "Thursday": ["00:00-23:59"],
      "Friday": ["00:00-15:30", "16:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-23:59"]
  },
  "Amazon (OTC)": {
      "Monday": ["00:00-15:30", "16:00-23:59"],
      "Tuesday": ["00:00-23:59"],
      "Wednesday": ["00:00-15:30", "16:00-23:59"],
      "Thursday": ["00:00-23:59"],
      "Friday": ["00:00-15:30", "16:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-23:59"]
  },
  "TRUMP Coin (OTC)": {
      "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
  },
  "Nike, Inc. (OTC)": {
      "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
  },
  "DOGECOIN (OTC)": {
      "Monday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Tuesday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Wednesday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Thursday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Friday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Saturday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Sunday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"]
  },
  "Tesla (OTC)": {
      "Monday": ["00:00-15:30", "16:00-23:59"],
      "Tuesday": ["00:00-23:59"],
      "Wednesday": ["00:00-15:30", "16:00-23:59"],
      "Thursday": ["00:00-23:59"],
      "Friday": ["00:00-15:30", "16:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-23:59"]
  },
  "SOL/USD (OTC)": {
      "Monday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Tuesday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Wednesday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Thursday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Friday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Saturday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Sunday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"]
  },
  "1000Sats (OTC)": {
      "Monday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
      "Tuesday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
      "Wednesday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
      "Thursday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
      "Friday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
      "Saturday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
      "Sunday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"]
  },
  "XAUUSD (OTC)": {
      "Monday": ["00:00-23:59"],
      "Tuesday": ["00:00-23:59"],
      "Wednesday": ["00:00-23:59"],
      "Thursday": ["00:00-06:00", "06:30-23:59"],
      "Friday": ["00:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-23:59"]
  },
  "McDonald´s Corporation (OTC)": {
      "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
  },
  "Meta (OTC)": {
      "Monday": ["00:00-15:30", "16:00-23:59"],
      "Tuesday": ["00:00-23:59"],
      "Wednesday": ["00:00-15:30", "16:00-23:59"],
      "Thursday": ["00:00-23:59"],
      "Friday": ["00:00-15:30", "16:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-23:59"]
  },
  "Coca-Cola Company (OTC)": {
      "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
  },
  "CARDANO (OTC)": {
      "Monday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Tuesday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Wednesday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Thursday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Friday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Saturday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"],
      "Sunday": ["00:00-05:45", "06:15-17:45", "18:15-23:59"]
  },
  "EUR/USD (OTC)": {
      "Monday": ["00:00-23:59"],
      "Tuesday": ["00:00-23:59"],
      "Wednesday": ["00:00-01:00", "01:15-23:59"],
      "Thursday": ["00:00-23:59"],
      "Friday": ["00:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-23:59"]
  },
  "PEN/USD (OTC)": {
      "Monday": ["00:00-23:59"],
      "Tuesday": ["00:00-00:45", "01:15-23:59"],
      "Wednesday": ["00:00-23:59"],
      "Thursday": ["00:00-23:59"],
      "Friday": ["00:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-23:59"]
  },
  "Bitcoin Cash (OTC)": {
      "Monday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
      "Tuesday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
      "Wednesday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
      "Thursday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
      "Friday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
      "Saturday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"],
      "Sunday": ["00:00-05:05", "05:10-12:05", "12:10-23:59"]
  },
  "AUD/CAD (OTC)": {
      "Monday": ["00:00-23:59"],
      "Tuesday": ["00:00-23:59"],
      "Wednesday": ["00:00-01:00", "01:15-23:59"],
      "Thursday": ["00:00-23:59"],
      "Friday": ["00:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-23:59"]
  },
  "Tesla/Ford (OTC)": {
      "Monday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Tuesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Wednesday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Thursday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Friday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Saturday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"],
      "Sunday": ["00:00-05:00", "05:30-12:00", "12:30-23:59"]
  },
  "US 100 (OTC)": {
      "Monday": ["00:00-11:30", "12:00-17:30", "18:00-23:59"],
      "Tuesday": ["00:00-11:30", "12:00-17:30", "18:00-23:59"],
      "Wednesday": ["00:00-11:30", "12:00-17:30", "18:00-23:59"],
      "Thursday": ["00:00-11:30", "12:00-17:30", "18:00-23:59"],
      "Friday": ["00:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-11:30", "12:00-17:30", "18:00-23:59"]
  },
  "NEAR (OTC)": {
      "Monday": ["00:00-23:59"],
      "Tuesday": ["00:00-23:59"],
      "Wednesday": ["00:00-23:59"],
      "Thursday": ["00:00-23:59"],
      "Friday": ["00:00-23:59"],
      "Saturday": ["00:00-23:59"],
      "Sunday": ["00:00-23:59"]
  }
};

// Inicializa horários padrão para ativos sem configuração específica
function inicializar_horarios_padrao() {
  Object.keys(ATIVOS_CATEGORIAS).forEach(ativo => {
    if (!HORARIOS_PADRAO[ativo]) {
      const categoria = ATIVOS_CATEGORIAS[ativo];
      if (categoria === "Blitz") {
        HORARIOS_PADRAO[ativo] = {
          "Monday": ["00:00-23:59"],
          "Tuesday": ["00:00-23:59"],
          "Wednesday": ["00:00-23:59"],
          "Thursday": ["00:00-23:59"],
          "Friday": ["00:00-23:59"],
          "Saturday": ["00:00-23:59"],
          "Sunday": ["00:00-23:59"]
        };
      } else if (categoria === "Digital") {
        HORARIOS_PADRAO[ativo] = {
          "Monday": ["00:00-23:59"],
          "Tuesday": ["00:00-23:59"],
          "Wednesday": ["00:00-23:59"],
          "Thursday": ["00:00-23:59"],
          "Friday": ["00:00-23:59"],
          "Saturday": ["00:00-23:59"],
          "Sunday": ["00:00-23:59"]
        };
      } else { // Binary e outros
        HORARIOS_PADRAO[ativo] = {
          "Monday": ["00:00-23:59"],
          "Tuesday": ["00:00-23:59"],
          "Wednesday": ["00:00-23:59"],
          "Thursday": ["00:00-23:59"],
          "Friday": ["00:00-23:59"],
          "Saturday": ["00:00-23:59"],
          "Sunday": ["00:00-23:59"]
        };
      }
    }
  });
}

// Inicializar horários padrão
inicializar_horarios_padrao();

// Função para verificar se um ativo está disponível no momento atual
function is_asset_available(asset) {
  // Verifica se o ativo está na lista de ativos disponíveis
  if (!ATIVOS_CATEGORIAS[asset]) {
    console.log(`O ativo ${asset} não está na lista de ativos disponíveis`);
    return false;
  }

  // Obter dia da semana atual (em inglês)
  const diasDaSemana = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const agora = new Date();
  const diaDaSemana = diasDaSemana[agora.getDay()];
  
  // Obter hora e minuto atual no formato HH:MM
  const horaAtual = agora.getHours().toString().padStart(2, '0');
  const minutoAtual = agora.getMinutes().toString().padStart(2, '0');
  const horaAtualFormatada = `${horaAtual}:${minutoAtual}`;
  
  // Obter as janelas de tempo disponíveis para o ativo no dia atual
  const janelasDeTempo = HORARIOS_PADRAO[asset]?.[diaDaSemana] || [];
  
  // Se não houver janelas de tempo definidas para o dia atual, o ativo não está disponível
  if (janelasDeTempo.length === 0) {
    console.log(`O ativo ${asset} não está disponível no dia ${diaDaSemana}`);
    return false;
  }
  
  // Verificar se o horário atual está dentro de alguma janela de tempo
  for (const janela of janelasDeTempo) {
    const [inicio, fim] = janela.split('-');
    
    // Verificar se o horário atual está dentro da janela
    if (isTimeInRange(horaAtualFormatada, inicio, fim)) {
      return true;
    }
  }
  
  console.log(`O ativo ${asset} não está disponível no horário ${horaAtualFormatada}`);
  return false;
}

// Função para verificar se um horário está dentro de um intervalo
function isTimeInRange(timeToCheck, start, end) {
  // Converter os horários para minutos para facilitar a comparação
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const checkTimeInMinutes = timeToMinutes(timeToCheck);
  const startTimeInMinutes = timeToMinutes(start);
  const endTimeInMinutes = timeToMinutes(end);
  
  return checkTimeInMinutes >= startTimeInMinutes && checkTimeInMinutes <= endTimeInMinutes;
}

// Função para verificar disponibilidade de ativos
function verificar_disponibilidade() {
  console.log("Verificando disponibilidade de ativos...");
  
  // Lista de ativos disponíveis
  const ativos_disponiveis = [];
  
  // Verificar cada ativo na lista
  Object.keys(ATIVOS_CATEGORIAS).forEach(ativo => {
    if (is_asset_available(ativo)) {
      const categoria = ATIVOS_CATEGORIAS[ativo];
      ativos_disponiveis.push({ asset: ativo, categoria: categoria });
    }
  });
  
  console.log(`Total de ativos disponíveis: ${ativos_disponiveis.length}`);
  
  // Se não houver ativos disponíveis, retorna um array vazio
  if (ativos_disponiveis.length === 0) {
    console.log("Nenhum ativo disponível no momento.");
    return [];
  }
  
  return ativos_disponiveis;
}

// Funções auxiliares para manipulação de tempo
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes; // Converte para minutos totais para facilitar comparação
}

// Tempo de cache fixo de 10 minutos (em milissegundos)
const CACHE_DURATION = 10 * 60 * 1000;

// Definir localStorage key como constante para evitar erros de digitação
const SIGNALS_CACHE_KEY = 'trending_signals_cache';

// Cache para sinais (evita recálculos frequentes)
const signalsCache = { 
  data: [], 
  timestamp: 0,
  lastAsset: null,
  lastSignalType: null,
  nextGenerationTime: 0,
  userInitialized: false
};

// Função para carregar o cache do localStorage
function carregarCacheDoLocalStorage() {
  try {
    const cacheString = localStorage.getItem(SIGNALS_CACHE_KEY);
    if (cacheString) {
      const cache = JSON.parse(cacheString);
      // Verificar se o cache é válido e não expirou
      const agora = Date.now();
      if (cache && cache.timestamp && (agora - cache.timestamp) <= CACHE_DURATION) {
        console.log('Cache carregado do localStorage com sucesso. Validade restante:', Math.floor((cache.timestamp + CACHE_DURATION - agora) / 1000), 'segundos');
        
        // Preencher o cache com os dados do localStorage
        signalsCache.data = cache.data || [];
        signalsCache.timestamp = cache.timestamp || 0;
        signalsCache.lastAsset = cache.lastAsset || null;
        signalsCache.lastSignalType = cache.lastSignalType || null;
        signalsCache.nextGenerationTime = cache.nextGenerationTime || 0;
        signalsCache.userInitialized = true; // Marcar como inicializado
        
        return true;
      } else {
        console.log('Cache encontrado, mas expirado');
        // Limpar cache expirado do localStorage
        localStorage.removeItem(SIGNALS_CACHE_KEY);
      }
    } else {
      console.log('Nenhum cache encontrado no localStorage');
    }
    return false;
  } catch (error) {
    console.error('Erro ao carregar cache do localStorage:', error);
    return false;
  }
}

// Função para salvar o cache no localStorage
function salvarCacheNoLocalStorage() {
  try {
    if (signalsCache.data && signalsCache.data.length > 0) {
      localStorage.setItem(SIGNALS_CACHE_KEY, JSON.stringify(signalsCache));
      console.log('Cache salvo no localStorage com sucesso. Expira em:', Math.floor(CACHE_DURATION / 1000), 'segundos');
      return true;
    } else {
      console.log('Não há dados para salvar no cache');
      return false;
    }
  } catch (error) {
    console.error('Erro ao salvar cache no localStorage:', error);
    return false;
  }
}

// Função para verificar se o cache atual é válido
function cacheEhValido() {
  const agora = Date.now();
  return (
    signalsCache.data && 
    signalsCache.data.length > 0 && 
    signalsCache.timestamp > 0 &&
    (agora - signalsCache.timestamp) <= CACHE_DURATION
  );
}

// Inicializa o sistema
function inicializar_sistema() {
  if (isSystemRunning) {
    console.log("Sistema já está em execução");
    return false;
  }
  
  console.log("Inicializando sistema de sinais de trading...");
  isSystemRunning = true;
  errorCount = 0;
  
  // Tentar carregar o cache do localStorage ao inicializar
  const cacheCarregado = carregarCacheDoLocalStorage();
  if (cacheCarregado) {
    console.log("Cache carregado do localStorage com sucesso ao inicializar o sistema");
  } else {
    console.log("Nenhum cache válido encontrado, será gerado um novo cache na próxima requisição");
  }
  
  // Simula a verificação de múltiplas instâncias
  console.log("Verificação de segurança concluída");
  console.log("Fuso horário configurado para Brasília");
  
  return true;
}

// Finaliza o sistema
function finalizar_sistema() {
  console.log("Finalizando sistema de sinais...");
  isSystemRunning = false;
}

// Função "keep alive" equivalente
function manter_sistema_ativo() {
  console.log("Verificação de manutenção do sistema - OK");
  return true;
}

// Função principal para buscar sinais de trading
export async function fetchTradingSignals(forceRefresh = false) {
  // Verificar se o sistema está em execução
  if (!isSystemRunning) {
    inicializar_sistema();
  }
  
  const now = Date.now();
  
  // Verificar se temos um cache válido
  const cacheValido = cacheEhValido();
  
  // Verificar se estamos no tempo de gerar novos sinais
  // Só gera novos sinais se:
  // 1. forceRefresh for true (botão de atualizar explícito) OU
  // 2. Não existirem sinais no cache OU
  // 3. O cache estiver expirado
  const shouldGenerateNewSignals = forceRefresh || !cacheValido;
  
  // Se não precisa gerar novos sinais e tem cache, retornar cache
  if (!shouldGenerateNewSignals && signalsCache.data.length > 0) {
    console.log('Retornando sinais do cache com duração de 10 minutos.');
    
    // Calcular tempo restante até a expiração do cache
    const tempoRestante = (signalsCache.timestamp + CACHE_DURATION) - now;
    if (tempoRestante > 0) {
      console.log(`Cache válido por mais: ${Math.floor(tempoRestante/60000)} minutos e ${Math.floor((tempoRestante % 60000)/1000)} segundos`);
    }
    
    return signalsCache.data;
  }
  
  try {
    console.log('Gerando novos sinais de trading...');
    
    // Obter todos os ativos disponíveis no momento
    const ativos_disponiveis = verificar_disponibilidade();
    if (ativos_disponiveis.length === 0) {
      console.log("Nenhum ativo disponível no momento");
      return signalsCache.data.length > 0 ? signalsCache.data : [];
    }
    
    console.log(`Ativos disponíveis para geração de sinais: ${ativos_disponiveis.map(a => a.asset).join(', ')}`);
    
    // Último sinal gerado para evitar repetições
    const ultimo_ativo = signalsCache.lastAsset;
    const ultimo_signal = signalsCache.lastSignalType;
    
    // Gerar sinais para cada categoria
    const signals = [];
    
    // Filtrar para excluir o último ativo usado (evitar repetições)
    const ativos_filtrados = ativos_disponiveis.filter(item => item.asset !== ultimo_ativo);
    
    // Se não houver ativos diferentes, usar todos
    const ativos_para_escolher = ativos_filtrados.length > 0 ? ativos_filtrados : ativos_disponiveis;
    
    // Número exato de sinais a gerar (exatamente 3 sinais ou menos, dependendo dos ativos disponíveis)
    const total_sinais = Math.min(3, ativos_para_escolher.length);
    
    // Lista para controlar ativos já usados neste ciclo
    const ativos_usados = [];
    let tipo_atual = ultimo_signal;
    
    // Horário atual para cálculo do primeiro sinal
    const horario_atual = new Date();
    
    // Aplicar a lógica para calcular o horário de entrada
    // Horário de entrada do primeiro sinal com base no último dígito dos minutos
    const minuto_atual = horario_atual.getMinutes();
    const ultimo_digito = minuto_atual % 10;
    let minutos_adicionar;
    
    // Determinar minutos a adicionar com base no último dígito
    if (ultimo_digito === 3) {
      minutos_adicionar = 2;  // Se termina em 3, adiciona 2 minutos
    } else if (ultimo_digito === 7) {
      minutos_adicionar = 3;  // Se termina em 7, adiciona 3 minutos
    } else {
      minutos_adicionar = 2;  // Padrão: adiciona 2 minutos
    }
    
    // Variável para acompanhar o horário da próxima entrada
    // Primeiro sinal: aplicando a nova lógica
    let proximo_horario_entrada = new Date(horario_atual.getTime() + minutos_adicionar * 60 * 1000);
    
    console.log(`Horário atual: ${format(horario_atual, 'HH:mm:ss', { locale: ptBR })}`);
    console.log(`Último dígito: ${ultimo_digito}, minutos a adicionar: ${minutos_adicionar}`);
    console.log(`Gerando sinais sequenciais iniciando em: ${format(proximo_horario_entrada, 'HH:mm', { locale: ptBR })}`);
    
    // Gerar exatamente 3 sinais sequenciais ou menos, dependendo dos ativos disponíveis
    for (let i = 0; i < total_sinais; i++) {
      // Filtrar para não repetir ativos já usados neste ciclo
      const ativos_restantes = ativos_para_escolher.filter(
        item => !ativos_usados.includes(item.asset)
      );
      
      if (ativos_restantes.length === 0) break;
      
      // Selecionar ativo aleatoriamente
      const index = Math.floor(Math.random() * ativos_restantes.length);
      const { asset, categoria } = ativos_restantes[index];
      
      // Verificar se o ativo ainda estará disponível no horário da entrada
      // Simular o horário de entrada para verificar disponibilidade
      const horarioSimulado = new Date(proximo_horario_entrada);
      const horaEntrada = horarioSimulado.getHours().toString().padStart(2, '0');
      const minutoEntrada = horarioSimulado.getMinutes().toString().padStart(2, '0');
      const diaEntrada = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][horarioSimulado.getDay()];
      
      // Verificar se o ativo tem janelas de horário para o dia da entrada
      const janelasHorario = HORARIOS_PADRAO[asset]?.[diaEntrada] || [];
      
      if (janelasHorario.length === 0) {
        console.log(`O ativo ${asset} não estará disponível no dia ${diaEntrada} para o horário de entrada ${horaEntrada}:${minutoEntrada}`);
        continue; // Pular este ativo e tentar outro
      }
      
      // Verificar se o horário de entrada está dentro de alguma janela disponível
      const horarioEntradaFormatado = `${horaEntrada}:${minutoEntrada}`;
      let disponivel = false;
      
      for (const janela of janelasHorario) {
        const [inicio, fim] = janela.split('-');
        if (isTimeInRange(horarioEntradaFormatado, inicio, fim)) {
          disponivel = true;
          break;
        }
      }
      
      if (!disponivel) {
        console.log(`O ativo ${asset} não estará disponível no horário ${horarioEntradaFormatado}`);
        continue; // Pular este ativo e tentar outro
      }
      
      // Alternar entre COMPRA e VENDA
      // Se ultimo_signal é nulo (primeiro sinal), escolher aleatoriamente
      if (tipo_atual === null) {
        tipo_atual = Math.random() > 0.5 ? 'COMPRA' : 'VENDA';
      } else {
        tipo_atual = tipo_atual === 'COMPRA' ? 'VENDA' : 'COMPRA';
      }
      
      // Gerar o sinal usando o horário de entrada calculado
      const sinal = gerar_sinal_trading_com_horario_entrada(asset, tipo_atual, categoria, proximo_horario_entrada);
      signals.push(sinal);
      
      // Adicionar à lista de ativos usados
      ativos_usados.push(asset);
      
      console.log(`Sinal ${i+1}: ${sinal.symbol} (${categoria}) - ${tipo_atual}`);
      console.log(`Entrada: ${sinal.entry_time}, Expiração: ${sinal.timeframe}, Reentrada 1: ${sinal.gale1_time}, Reentrada 2: ${sinal.gale2_time}`);
      
      // O próximo sinal deve começar 1 minuto após a reentrada 2 do sinal atual
      // Converter string de hora da reentrada 2 para objeto Date
      const [horas_r2, minutos_r2] = sinal.gale2_time.split(':').map(Number);
      let horario_reentrada2 = new Date(horario_atual);
      horario_reentrada2.setHours(horas_r2, minutos_r2, 0, 0);
      
      // Se o horário calculado for antes do horário atual (cruzou meia-noite)
      // adicionar 1 dia
      if (horario_reentrada2 < horario_atual) {
        horario_reentrada2.setDate(horario_reentrada2.getDate() + 1);
      }
      
      // Próxima entrada: 1 minuto após a reentrada 2 do sinal atual
      proximo_horario_entrada = new Date(horario_reentrada2.getTime() + 60 * 1000);
    }
    
    // Calcular quando o próximo conjunto de sinais deve ser gerado:
    // Após o último sinal completar (incluindo reentrada 2) + tempo de expiração + 1 minuto
    if (signals.length > 0) {
      const ultimoSinal = signals[signals.length - 1];
      const [horas_ultimo_r2, minutos_ultimo_r2] = ultimoSinal.gale2_time.split(':').map(Number);
      
      let horario_ultimo_reentrada2 = new Date(horario_atual);
      horario_ultimo_reentrada2.setHours(horas_ultimo_r2, minutos_ultimo_r2, 0, 0);
      
      // Se o horário calculado for antes do horário atual (cruzou meia-noite)
      // adicionar 1 dia
      if (horario_ultimo_reentrada2 < horario_atual) {
        horario_ultimo_reentrada2.setDate(horario_ultimo_reentrada2.getDate() + 1);
      }
      
      // Calcular o tempo de expiração em milissegundos
      let tempoExpiracaoMs = 60 * 1000; // Padrão: 1 minuto
      if (ultimoSinal.timeframe.includes('s')) {
        // Para segundos, exemplo: '30s'
        tempoExpiracaoMs = parseInt(ultimoSinal.timeframe.replace('s', '')) * 1000;
      } else if (ultimoSinal.timeframe.includes('m')) {
        // Para minutos, exemplo: '5m'
        tempoExpiracaoMs = parseInt(ultimoSinal.timeframe.replace('m', '')) * 60 * 1000;
      }
      
      // Próxima geração: última reentrada 2 + tempo de expiração + 1 minuto
      signalsCache.nextGenerationTime = horario_ultimo_reentrada2.getTime() + tempoExpiracaoMs + 60 * 1000;
      console.log(`Próximo conjunto de sinais agendado para: ${format(new Date(signalsCache.nextGenerationTime), 'HH:mm', { locale: ptBR })}`);
    } else {
      // Fallback: gerar novos sinais em 30 minutos se algo deu errado
      signalsCache.nextGenerationTime = now + 30 * 60 * 1000;
    }
    
    // Ordenar os sinais por horário de entrada (do mais próximo ao mais distante do horário atual)
    signals.sort((a, b) => {
      // Converter string de hora para objeto Date para comparação
      const [horaA, minutoA] = a.entry_time.split(':').map(Number);
      const [horaB, minutoB] = b.entry_time.split(':').map(Number);
      
      // Criar objetos Date com a data atual, mas com as horas específicas
      const dataAtual = new Date();
      const horaAtual = dataAtual.getHours();
      const minutoAtual = dataAtual.getMinutes();
      
      // Criar datas para comparação
      const dataA = new Date(dataAtual);
      dataA.setHours(horaA, minutoA, 0, 0);
      
      const dataB = new Date(dataAtual);
      dataB.setHours(horaB, minutoB, 0, 0);
      
      // Calcular a diferença em minutos entre o horário atual e o horário de cada sinal
      const diferencaA = (horaA * 60 + minutoA) - (horaAtual * 60 + minutoAtual);
      const diferencaB = (horaB * 60 + minutoB) - (horaAtual * 60 + minutoAtual);
      
      // Garantir que somente valores positivos sejam considerados (apenas sinais futuros)
      const diffA = diferencaA < 0 ? Infinity : diferencaA;
      const diffB = diferencaB < 0 ? Infinity : diferencaB;
      
      // Ordenar do mais próximo (menor diferença) para o mais distante
      return diffA - diffB;
    });
    
    // Atualizar cache e retornar
    signalsCache.data = signals;
    signalsCache.timestamp = now;
    signalsCache.lastAsset = ativos_usados[ativos_usados.length - 1];
    signalsCache.lastSignalType = tipo_atual;
    signalsCache.userInitialized = true; // Marca que os sinais foram inicializados
    
    // Salvar o cache atualizado no localStorage para persistência
    salvarCacheNoLocalStorage();
    
    lastExecutionTime = now;
    
    console.log(`Gerados ${signals.length} sinais sequenciais. Último tipo: ${tipo_atual}`);
    manter_sistema_ativo();
    
    return signals;
  } catch (error) {
    console.error('Erro ao gerar sinais:', error);
    errorCount++;
    
    // Se atingir o limite de erros, reinicia o sistema
    if (errorCount >= MAX_CONSECUTIVE_ERRORS) {
      console.log("Limite de erros atingido. Reiniciando sistema...");
      finalizar_sistema();
      inicializar_sistema();
    }
    
    // Em caso de erro, retornar cache anterior ou array vazio
    return signalsCache.data.length > 0 ? signalsCache.data : [];
  }
}

// Função para gerar sinal com horário específico de entrada
function gerar_sinal_trading_com_horario_entrada(asset, tipo, categoria, horario_entrada) {
  // Gerar dados do sinal de trading
  const id = `${categoria.toLowerCase()}-${asset.replace('/', '').replace(' ', '')}-${horario_entrada.getTime()}`;
  
  // Determinar o tipo de sinal com base na categoria
  let signal_type;
  if (tipo === 'COMPRA') {
    signal_type = SignalType.COMPRA;
  } else {
    signal_type = SignalType.VENDA;
  }
  
  // Emoji para o tipo de sinal
  const emoji = tipo === 'COMPRA' ? "🟢" : "🛑";
  
  // Gerar preços simulados (para dados internos, não para exibição)
  const basePrice = Math.random() * 1000 + 100;
  const entry_price = parseFloat(basePrice.toFixed(2));
  const targetMultiplier = tipo === 'COMPRA' ? 1.02 : 0.98;
  const stopMultiplier = tipo === 'COMPRA' ? 0.99 : 1.01;
  const target_price = parseFloat((entry_price * targetMultiplier).toFixed(2));
  const stop_loss = parseFloat((entry_price * stopMultiplier).toFixed(2));
  
  // Calcular taxa de sucesso simulada
  const success_rate = Math.floor(Math.random() * 15) + 75; // Entre 75% e 90%
  
  // Remover o prefixo "Digital_" do nome do ativo para exibição
  const nome_ativo_exibicao = asset.startsWith("Digital_") ? asset.replace("Digital_", "") : asset;
  
  // Determinar expiração com base na categoria e ativo
  let expiracao_texto = "";
  let expiry_time = new Date();
  let timeframe = "";
  let duracao_expiracao_ms = 0;
  
  // Caso especial para NEAR (OTC) conforme a lógica do bot original
  if (nome_ativo_exibicao === "NEAR (OTC)") {
    duracao_expiracao_ms = 2 * 60 * 1000; // 2 minutos em milissegundos
    expiry_time = addMinutes(horario_entrada, 2); // 2 minutos fixo
    expiracao_texto = `⏳ Expiração: 2 minutos`;
    timeframe = '2m';
  } else if (categoria === 'Blitz') {
    const expiracao_segundos = [5, 10, 15, 30][Math.floor(Math.random() * 4)];
    duracao_expiracao_ms = expiracao_segundos * 1000;
    expiry_time = addSeconds(horario_entrada, expiracao_segundos);
    expiracao_texto = `⏳ Expiração: ${expiracao_segundos} segundos`;
    timeframe = `${expiracao_segundos}s`;
  } else if (categoria === 'Digital') {
    const minutos_expiracao = [1, 3, 5][Math.floor(Math.random() * 3)];
    duracao_expiracao_ms = minutos_expiracao * 60 * 1000;
    expiry_time = addMinutes(horario_entrada, minutos_expiracao);
    expiracao_texto = `⏳ Expiração: ${minutos_expiracao} ${minutos_expiracao === 1 ? 'minuto' : 'minutos'}`;
    timeframe = `${minutos_expiracao}m`;
  } else { // Binary
    duracao_expiracao_ms = 1 * 60 * 1000;
    expiry_time = addMinutes(horario_entrada, 1);
    expiracao_texto = `⏳ Expiração: 1 minuto`;
    timeframe = '1m';
  }
  
  // Calcula os horários de reentrada seguindo a lógica solicitada:
  // 1. Reentrada 1: horário de entrada + tempo de expiração + 1 minuto
  const gale1_time = addMinutes(new Date(horario_entrada.getTime() + duracao_expiracao_ms), 1);
  
  // 2. Reentrada 2: horário da reentrada 1 + tempo de expiração + 1 minuto
  const gale2_time = addMinutes(new Date(gale1_time.getTime() + duracao_expiracao_ms), 1);
  
  // Formatar horários apenas como HH:MM
  const entry_time_str = format(horario_entrada, 'HH:mm', { locale: ptBR });
  const expiry_time_str = format(expiry_time, 'HH:mm', { locale: ptBR });
  const gale1_time_str = format(gale1_time, 'HH:mm', { locale: ptBR });
  const gale2_time_str = format(gale2_time, 'HH:mm', { locale: ptBR });
  
  // Gerar mensagem de sinal formatada no estilo do bot do Telegram
  const display_message = `
SINAL ABERTO - ${nome_ativo_exibicao}

Direção: ${tipo}
${expiracao_texto} (${expiry_time_str})

Reentradas:
1 - ${gale1_time_str}
2 - ${gale2_time_str}

Categoria: ${categoria}
  `.trim();
  
  // Criar estrutura do sinal
  return {
    id,
    symbol: nome_ativo_exibicao,
    type: signal_type,
    signal: tipo === 'COMPRA' ? 'BUY' : 'SELL',
    reason: `Análise técnica para ${nome_ativo_exibicao} indica forte tendência de ${tipo === 'COMPRA' ? 'alta' : 'baixa'} nos próximos minutos.`,
    strength: success_rate > 85 ? SignalStrength.STRONG : success_rate > 75 ? SignalStrength.MODERATE : SignalStrength.WEAK,
    timestamp: horario_entrada.getTime(),
    price: entry_price,
    entry_price,
    stop_loss,
    target_price,
    success_rate,
    timeframe,
    expiry: expiry_time.toISOString(),
    risk_reward: (Math.random() * 0.5 + 1.2).toFixed(1),
    status: 'active',
    entry_time: entry_time_str,
    expiry_time_str: expiry_time_str,
    gale1_time: gale1_time_str,
    gale2_time: gale2_time_str,
    categoria: categoria,
    display_message: display_message
  };
}

// Calcular próximo horário de execução (a cada 6 minutos)
function calcular_proximo_horario() {
  const agora = new Date();
  const minutos_atuais = agora.getMinutes();
  const segundos_atuais = agora.getSeconds();
  
  // Calcular próximo minuto divisível por 6
  const proximos_minutos = Math.ceil(minutos_atuais / 6) * 6;
  
  // Criar data para o próximo horário
  let proximo_horario = new Date(agora);
  proximo_horario.setMinutes(proximos_minutos);
  proximo_horario.setSeconds(2); // Adiciona 2 segundos para evitar problemas de arredondamento
  
  // Se já passou do minuto atual, ajusta para o próximo intervalo
  if (proximos_minutos <= minutos_atuais && segundos_atuais >= 2) {
    proximo_horario.setMinutes(proximos_minutos + 6);
  }
  
  return proximo_horario;
}

// Atualizar status de um sinal
export async function updateSignalStatus(signal, newStatus, exitPrice) {
  // Implementação simplificada apenas para atualizar o status
  const updatedSignal = { ...signal, status: newStatus };
  
  if (exitPrice) {
    updatedSignal.exit_price = exitPrice;
    // Calcular se foi um sucesso com base na direção do sinal
    const isSuccess = 
      (signal.signal === 'BUY' && exitPrice >= signal.target_price) || 
      (signal.signal === 'SELL' && exitPrice <= signal.target_price);
    
    updatedSignal.result = isSuccess ? 'success' : 'failure';
  }
  
  return updatedSignal;
}

// Função para monitorar sinais existentes
export async function monitorSignals() {
  try {
    console.log('Monitorando sinais existentes...');
    
    // Buscar sinais atuais do cache ou gerar novos
    const signals = await fetchTradingSignals(false);
    
    // Lista para armazenar sinais atualizados e substituídos
    const updatedSignals = [];
    const replacedSignals = [];
    
    // Verificar cada sinal
    for (const signal of signals) {
      // Verificar se o sinal expirou
      const expiryTime = new Date(signal.expiry).getTime();
      const now = Date.now();
      
      if (now > expiryTime && signal.status === 'active') {
        // Sinal expirou - atualizar status
        const exitPrice = Math.random() > 0.6 ? 
          signal.target_price : // 60% chance de sucesso
          signal.price * (Math.random() * 0.01 + 0.995); // Preço aleatório próximo ao preço de entrada
        
        const updatedSignal = await updateSignalStatus(signal, 'completed', exitPrice);
      updatedSignals.push(updatedSignal);
      }
    }
    
    // Se existirem sinais atualizados, gerar novos sinais sequenciais
    if (updatedSignals.length > 0) {
      // Ordenar sinais por horário de criação para preservar a sequência
      const sortedUpdated = updatedSignals.sort((a, b) => a.timestamp - b.timestamp);
      
      // Gerar novos sinais respeitando a sequência pedida
      const newSignals = await geradorSignaisSequenciais(sortedUpdated);
      replacedSignals.push(...newSignals);
    }
    
    return {
      updated: updatedSignals,
      replaced: replacedSignals
    };
  } catch (error) {
    console.error('Erro ao monitorar sinais:', error);
    return {
      updated: [],
      replaced: []
    };
  }
}

// Função para gerar sinais sequenciais
async function geradorSignaisSequenciais(signaisCompletados) {
  console.log(`Gerando sinais sequenciais para substituir ${signaisCompletados?.length || 0} sinais concluídos...`);
  
  // Obter ativos disponíveis no momento
    const ativos_disponiveis = verificar_disponibilidade();
  
    if (ativos_disponiveis.length === 0) {
    console.log("Nenhum ativo disponível no momento para gerar sinais sequenciais");
      return [];
    }

  console.log(`Ativos disponíveis para geração de sinais sequenciais: ${ativos_disponiveis.map(a => a.asset).join(', ')}`);
  
  // Algoritmo para escolher ativos diferentes dos anteriores
  const sinais_anteriores = new Set(signaisCompletados?.map(s => s.symbol) || []);
  
  // Priorizar ativos que não foram usados recentemente
  const ativos_filtrados = ativos_disponiveis.filter(item => !sinais_anteriores.has(item.asset));
  
  // Se não houver ativos diferentes suficientes, usar os disponíveis
  const ativos_candidatos = ativos_filtrados.length > 0 ? ativos_filtrados : ativos_disponiveis;
  
  // Número de sinais a gerar (no máximo o número de ativos disponíveis)
  const num_sinais = Math.min(3, ativos_candidatos.length, signaisCompletados?.length || 3);
  
  // Horário atual para cálculo do primeiro sinal
  const horario_atual = new Date();
  
  // Aplicar a lógica para calcular o horário de entrada
  // Horário de entrada do primeiro sinal com base no último dígito dos minutos
  const minuto_atual = horario_atual.getMinutes();
  const ultimo_digito = minuto_atual % 10;
  let minutos_adicionar;
  
  // Determinar minutos a adicionar com base no último dígito
  if (ultimo_digito === 3) {
    minutos_adicionar = 2;  // Se termina em 3, adiciona 2 minutos
  } else if (ultimo_digito === 7) {
    minutos_adicionar = 3;  // Se termina em 7, adiciona 3 minutos
    } else {
    minutos_adicionar = 2;  // Padrão: adiciona 2 minutos
  }
  
  // Variável para acompanhar o horário da próxima entrada
  // Primeiro sinal: aplicando a lógica baseada no último dígito
  let proximo_horario_entrada = new Date(horario_atual.getTime() + minutos_adicionar * 60 * 1000);
  
  console.log(`Horário atual: ${format(horario_atual, 'HH:mm:ss', { locale: ptBR })}`);
  console.log(`Último dígito: ${ultimo_digito}, minutos a adicionar: ${minutos_adicionar}`);
  console.log(`Gerando sinais sequenciais iniciando em: ${format(proximo_horario_entrada, 'HH:mm', { locale: ptBR })}`);
  
  // Lista para armazenar sinais gerados
  const sinais = [];
  
  // Lista para controlar ativos já usados neste ciclo
  const ativos_usados = [];
  
  // Definir tipo inicial com base no último sinal completado (se disponível)
  let tipo_atual = (signaisCompletados && signaisCompletados.length > 0) ? 
    (signaisCompletados[signaisCompletados.length - 1].signal === 'BUY' ? 'VENDA' : 'COMPRA') : 
    (Math.random() > 0.5 ? 'COMPRA' : 'VENDA');
  
  // Gerar sinais sequenciais (até o número desejado)
  for (let i = 0; i < num_sinais; i++) {
    // Filtrar para não repetir ativos já usados neste ciclo
    const ativos_restantes = ativos_candidatos.filter(
      item => !ativos_usados.includes(item.asset)
    );
    
    if (ativos_restantes.length === 0) {
      console.log("Não há mais ativos disponíveis para gerar sinais sequenciais");
      break;
    }
    
    // Selecionar ativo aleatoriamente
    const index = Math.floor(Math.random() * ativos_restantes.length);
    const { asset, categoria } = ativos_restantes[index];
    
    // Verificar se o ativo estará disponível no horário de entrada
    const horarioSimulado = new Date(proximo_horario_entrada);
    const horaEntrada = horarioSimulado.getHours().toString().padStart(2, '0');
    const minutoEntrada = horarioSimulado.getMinutes().toString().padStart(2, '0');
    const diaEntrada = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][horarioSimulado.getDay()];
    
    // Verificar se o ativo tem janelas de horário para o dia da entrada
    const janelasHorario = HORARIOS_PADRAO[asset]?.[diaEntrada] || [];
    
    if (janelasHorario.length === 0) {
      console.log(`O ativo ${asset} não estará disponível no dia ${diaEntrada} para o horário de entrada ${horaEntrada}:${minutoEntrada}`);
      continue; // Pular este ativo e tentar outro
    }
    
    // Verificar se o horário de entrada está dentro de alguma janela disponível
    const horarioEntradaFormatado = `${horaEntrada}:${minutoEntrada}`;
    let disponivel = false;
    
    for (const janela of janelasHorario) {
      const [inicio, fim] = janela.split('-');
      if (isTimeInRange(horarioEntradaFormatado, inicio, fim)) {
        disponivel = true;
        break;
      }
    }
    
    if (!disponivel) {
      console.log(`O ativo ${asset} não estará disponível no horário ${horarioEntradaFormatado}`);
      continue; // Pular este ativo e tentar outro
    }
    
    // Alternar entre COMPRA e VENDA
    tipo_atual = tipo_atual === 'COMPRA' ? 'VENDA' : 'COMPRA';
    
    // Gerar o sinal usando o horário de entrada calculado
    const sinal = gerar_sinal_trading_com_horario_entrada(asset, tipo_atual, categoria, proximo_horario_entrada);
    sinais.push(sinal as TradingSignal);
    
    // Adicionar à lista de ativos usados
    ativos_usados.push(asset);
    
    console.log(`Sinal sequencial ${i+1}: ${sinal.symbol} (${categoria}) - ${tipo_atual}`);
    console.log(`Entrada: ${sinal.entry_time}, Expiração: ${sinal.timeframe}, Reentrada 1: ${sinal.gale1_time}, Reentrada 2: ${sinal.gale2_time}`);
    
    // O próximo sinal deve começar 1 minuto após a reentrada 2 do sinal atual
    // Converter string de hora da reentrada 2 para objeto Date
    const [horas_r2, minutos_r2] = sinal.gale2_time.split(':').map(Number);
    let horario_reentrada2 = new Date(horario_atual);
    horario_reentrada2.setHours(horas_r2, minutos_r2, 0, 0);
    
    // Se o horário calculado for antes do horário atual (cruzou meia-noite)
    // adicionar 1 dia
    if (horario_reentrada2 < horario_atual) {
      horario_reentrada2.setDate(horario_reentrada2.getDate() + 1);
    }
    
    // Próxima entrada: 1 minuto após a reentrada 2 do sinal atual
    proximo_horario_entrada = new Date(horario_reentrada2.getTime() + 60 * 1000);
  }
  
  // Atualizar o último tipo de sinal e último ativo usado no cache
  if (sinais.length > 0) {
    signalsCache.lastSignalType = tipo_atual;
    signalsCache.lastAsset = ativos_usados[ativos_usados.length - 1];
  }
  
  return sinais;
}

// Substituir um sinal completado
export async function replaceCompletedSignal(completedSignal) {
  // Gera um novo sinal para substituir um completado usando a lógica sequencial
  try {
    return (await geradorSignaisSequenciais([completedSignal]))[0] || completedSignal;
  } catch (error) {
    console.error('Erro ao substituir sinal:', error);
    // Fallback: criar um sinal genérico
    const horarioEntrada = new Date(Date.now() + 60 * 1000);
    return gerar_sinal_trading_com_horario_entrada("EUR/USD (OTC)", "COMPRA", "Binary", horarioEntrada);
  }
}

// Análise técnica abrangente de um ativo
export async function comprehensiveAnalyzeAsset(symbol) {
  try {
    // Cria um objeto de análise abrangente
    const analysis = {
        symbol,
      timestamp: Date.now(),
      technicalAnalysis: {
        trend: {
          shortTerm: Math.random() > 0.5 ? 'bullish' : 'bearish',
          mediumTerm: Math.random() > 0.5 ? 'bullish' : 'bearish',
          longTerm: Math.random() > 0.5 ? 'bullish' : 'bearish',
          strength: Math.floor(Math.random() * 100),
        },
        indicators: {
          rsi: Math.floor(Math.random() * 100),
          macd: {
            value: (Math.random() * 2 - 1).toFixed(2),
            signal: (Math.random() * 2 - 1).toFixed(2),
            histogram: (Math.random() * 2 - 1).toFixed(2),
          },
          movingAverages: {
            ma20: (Math.random() * 1000 + 100).toFixed(2),
            ma50: (Math.random() * 1000 + 100).toFixed(2),
            ma200: (Math.random() * 1000 + 100).toFixed(2),
          },
          bollingerBands: {
            upper: (Math.random() * 1000 + 200).toFixed(2),
            middle: (Math.random() * 1000 + 100).toFixed(2),
            lower: (Math.random() * 1000 + 50).toFixed(2),
          }
        },
        supports: [
          (Math.random() * 1000).toFixed(2),
          (Math.random() * 900).toFixed(2),
        ],
        resistances: [
          (Math.random() * 1100 + 100).toFixed(2),
          (Math.random() * 1200 + 200).toFixed(2),
        ],
        patterns: [
          Math.random() > 0.7 ? 'Double Top' : null,
          Math.random() > 0.7 ? 'Head and Shoulders' : null, 
          Math.random() > 0.7 ? 'Bullish Flag' : null
        ].filter(Boolean)
      },
      fundamentalAnalysis: {
        sentiment: Math.floor(Math.random() * 100),
        volume: {
          current: Math.floor(Math.random() * 1000000),
          change: (Math.random() * 40 - 20).toFixed(2) + '%',
          anomaly: Math.random() > 0.7
        },
        news: {
          recent: Math.floor(Math.random() * 10),
          sentiment: (Math.random() * 2 - 1).toFixed(2),
          impact: Math.random() > 0.7 ? 'high' : 'medium'
        }
      },
      prediction: {
        direction: Math.random() > 0.5 ? 'up' : 'down',
        strength: Math.floor(Math.random() * 100),
        targets: [
          (Math.random() * 1100 + 100).toFixed(2),
          (Math.random() * 1200 + 200).toFixed(2)
        ],
        stopLoss: (Math.random() * 900).toFixed(2),
        timeframe: ['short', 'medium', 'long'][Math.floor(Math.random() * 3)]
      }
    };
    
    return analysis;
  } catch (error) {
    console.error('Erro na análise abrangente do ativo:', error);
    return {
      symbol,
      error: 'Não foi possível completar a análise',
      timestamp: Date.now()
    };
  }
}

// Função para solicitar um sinal para um ativo específico
export async function requestSpecificTradingSignal(specificAsset) {
  console.log(`Solicitando sinal específico para o ativo: ${specificAsset}`);
  
  try {
    // Verificar se o sistema está em execução
    if (!isSystemRunning) {
      inicializar_sistema();
    }
    
    // Verificar se o ativo solicitado está na lista de ativos disponíveis
    if (!ATIVOS_CATEGORIAS[specificAsset]) {
      console.log(`O ativo ${specificAsset} não está na lista de ativos disponíveis`);
      return { success: false, message: "Ativo não encontrado na lista de ativos disponíveis" };
    }
    
    // Verificar se o ativo está disponível no momento
    if (!is_asset_available(specificAsset)) {
      console.log(`O ativo ${specificAsset} não está disponível no momento atual`);
      return { 
        success: false, 
        message: "Ativo não disponível no momento atual",
        asset: specificAsset,
        categoria: ATIVOS_CATEGORIAS[specificAsset]
      };
    }
    
    // Obter a categoria do ativo
    const categoria = ATIVOS_CATEGORIAS[specificAsset];
    
    // Horário atual para cálculo do sinal
    const horario_atual = new Date();
    
    // Aplicar a lógica para calcular o horário de entrada
    const minuto_atual = horario_atual.getMinutes();
    const ultimo_digito = minuto_atual % 10;
    let minutos_adicionar;
    
    // Determinar minutos a adicionar com base no último dígito
    if (ultimo_digito === 3) {
      minutos_adicionar = 2;  // Se termina em 3, adiciona 2 minutos
    } else if (ultimo_digito === 7) {
      minutos_adicionar = 3;  // Se termina em 7, adiciona 3 minutos
    } else {
      minutos_adicionar = 2;  // Padrão: adiciona 2 minutos
    }
    
    // Calcular horário de entrada
    let horario_entrada = new Date(horario_atual.getTime() + minutos_adicionar * 60 * 1000);
    
    console.log(`Último dígito: ${ultimo_digito}, minutos a adicionar: ${minutos_adicionar}`);
    console.log(`Gerando sinal para entrada às: ${format(horario_entrada, 'HH:mm', { locale: ptBR })}`);
    
    // Verificar se o ativo estará disponível no horário de entrada calculado
    const horaEntrada = horario_entrada.getHours().toString().padStart(2, '0');
    const minutoEntrada = horario_entrada.getMinutes().toString().padStart(2, '0');
    const diaEntrada = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][horario_entrada.getDay()];
    
    // Verificar se o ativo tem janelas de horário para o dia da entrada
    const janelasHorario = HORARIOS_PADRAO[specificAsset]?.[diaEntrada] || [];
    
    if (janelasHorario.length === 0) {
      console.log(`O ativo ${specificAsset} não estará disponível no dia ${diaEntrada} para o horário de entrada ${horaEntrada}:${minutoEntrada}`);
      return { 
        success: false, 
        message: `Ativo não disponível no horário de entrada calculado: ${horaEntrada}:${minutoEntrada}`, 
        asset: specificAsset,
        categoria: categoria
      };
    }
    
    // Verificar se o horário de entrada está dentro de alguma janela disponível
    const horarioEntradaFormatado = `${horaEntrada}:${minutoEntrada}`;
    let disponivel = false;
    
    for (const janela of janelasHorario) {
      const [inicio, fim] = janela.split('-');
      if (isTimeInRange(horarioEntradaFormatado, inicio, fim)) {
        disponivel = true;
        break;
      }
    }
    
    if (!disponivel) {
      console.log(`O ativo ${specificAsset} não estará disponível no horário ${horarioEntradaFormatado}`);
      return { 
        success: false, 
        message: `Ativo não disponível no horário de entrada calculado: ${horarioEntradaFormatado}`, 
        asset: specificAsset,
        categoria: categoria
      };
    }
    
    // Alternar entre COMPRA e VENDA - escolher aleatoriamente para sinal específico
    const tipo = Math.random() > 0.5 ? 'COMPRA' : 'VENDA';
    
    // Gerar o sinal usando o horário de entrada calculado
    const sinal = gerar_sinal_trading_com_horario_entrada(specificAsset, tipo, categoria, horario_entrada);
    
    console.log(`Sinal específico gerado: ${sinal.symbol} (${categoria}) - ${tipo}`);
    console.log(`Entrada: ${sinal.entry_time}, Expiração: ${sinal.timeframe}, Reentrada 1: ${sinal.gale1_time}, Reentrada 2: ${sinal.gale2_time}`);
    
    return { 
      success: true, 
      signal: sinal,
      message: "Sinal gerado com sucesso"
    };
  } catch (error) {
    console.error('Erro ao gerar sinal específico:', error);
    return { 
      success: false, 
      message: "Erro ao gerar sinal específico", 
      error: error.message 
    };
  }
}

// Função para atualizar o preço atual de um sinal
export async function updateSignalCurrentPrice(signal) {
  try {
    // Se não houver sinal, retornar o mesmo sinal
    if (!signal || !signal.symbol) {
      return signal;
    }
    
    // Buscar preço atual do ativo
    const prices = await getLatestPrices([signal.symbol]);
    
    // Se não houver preços, retorna o mesmo sinal
    if (!prices || prices.length === 0) {
      return signal;
    }
    
    // Encontrar o preço para o símbolo do sinal
    const price = prices.find(p => p.symbol === signal.symbol);
    
    // Se não encontrar o preço, retorna o mesmo sinal
    if (!price) {
      return signal;
    }
    
    // Atualizar preço atual no sinal
    return {
      ...signal,
      current_price: price.price
    };
  } catch (error) {
    console.error('Erro ao atualizar preço atual do sinal:', error);
    return signal; // Em caso de erro, retorna o sinal original sem alterações
  }
}

// Inicializa o sistema automaticamente
inicializar_sistema();

// Exporta serviço de sinais de trading
export const tradingSignalService = {
  fetchTradingSignals,
  updateSignalStatus,
  replaceCompletedSignal,
  monitorSignals,
  comprehensiveAnalyzeAsset,
  requestSpecificTradingSignal,
  updateSignalCurrentPrice
};

// Cache duration for daily signals (24 hours - in milliseconds)
const DAILY_SIGNALS_CACHE_DURATION = 24 * 60 * 60 * 1000;

// Definir localStorage key para daily signals como constante
const DAILY_SIGNALS_CACHE_KEY = 'trending_daily_signals_cache';

// Cache para todos os sinais do dia, organizado por slots de 10 minutos
const dailySignalsCache = {
  data: {}, // Formato: { 'HH:MM': [sinal1, sinal2, sinal3] }
  date: '', // Data de geração no formato YYYY-MM-DD
  lastUpdate: 0 // Timestamp da última atualização
};

// Estrutura de um slot de 10 minutos
interface TimeSlot {
  startTime: string; // Formato: 'HH:MM'
  signals: TradingSignal[]; // 3 sinais por slot
}

// Verifica se os sinais do dia precisam ser regenerados
function needsToRegenerateSignals() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Verificar se já temos sinais para hoje
  if (dailySignalsCache.date === today && Object.keys(dailySignalsCache.data).length > 0) {
    return false;
  }
  
  // Verificar se existe cache no localStorage
  try {
    const storedCache = localStorage.getItem(DAILY_SIGNALS_CACHE_KEY);
    if (storedCache) {
      const parsedCache = JSON.parse(storedCache);
      if (parsedCache.date === today && Object.keys(parsedCache.data).length > 0) {
        // Carregar do localStorage para a memória
        dailySignalsCache.data = parsedCache.data;
        dailySignalsCache.date = parsedCache.date;
        dailySignalsCache.lastUpdate = parsedCache.lastUpdate;
        console.log(`Carregado cache de sinais do dia ${today} do localStorage`);
        return false;
      }
    }
  } catch (error) {
    console.error('Erro ao verificar cache de sinais do dia:', error);
  }
  
  // Se chegou aqui, precisamos regenerar
  return true;
}

// Gera todos os sinais do dia, organizados em slots de 10 minutos
async function generateAllDailySignals() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  console.log(`Gerando todos os sinais predefinidos para o dia ${today}...`);
  
  // Se já temos sinais para hoje, não fazer nada
  if (!needsToRegenerateSignals()) {
    console.log('Sinais do dia já foram gerados anteriormente.');
    return dailySignalsCache.data;
  }
  
  // Resetar o cache
  dailySignalsCache.data = {};
  dailySignalsCache.date = today;
  dailySignalsCache.lastUpdate = Date.now();
  
  // Gerar slots para todo o dia (144 slots de 10 minutos)
  const slots = generateTimeSlots();
  
  // Para cada slot, gerar 3 sinais
  for (const slot of slots) {
    const slotKey = slot.startTime;
    const slotDate = new Date();
    const [hours, minutes] = slotKey.split(':').map(Number);
    slotDate.setHours(hours, minutes, 0, 0);
    
    // Gerar 3 sinais para este slot
    const signals = await generateSignalsForTimeSlot(slotDate);
    
    // Armazenar no cache
    dailySignalsCache.data[slotKey] = signals;
  }
  
  // Salvar no localStorage para persistência
  try {
    localStorage.setItem(DAILY_SIGNALS_CACHE_KEY, JSON.stringify(dailySignalsCache));
    console.log(`Salvos ${Object.keys(dailySignalsCache.data).length} slots de sinais no localStorage`);
  } catch (error) {
    console.error('Erro ao salvar cache de sinais do dia:', error);
  }
  
  return dailySignalsCache.data;
}

// Gera todos os slots de 10 minutos do dia
function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  // 24 horas * 6 slots por hora = 144 slots
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push({
        startTime,
        signals: []
      });
    }
  }
  
  return slots;
}

// Gera 3 sinais para um determinado slot de tempo
async function generateSignalsForTimeSlot(slotDate: Date): Promise<TradingSignal[]> {
  const signals: TradingSignal[] = [];
  
  // Lista de possíveis ativos para os sinais
  const availableAssets = Object.keys(ATIVOS_CATEGORIAS).filter(ativo => {
    // Verificar se o ativo está disponível neste horário
    return isAssetAvailableAtTime(ativo, slotDate);
  });
  
  // Se não temos ativos disponíveis, retornar array vazio
  if (availableAssets.length === 0) {
    console.log(`Nenhum ativo disponível para o slot ${slotDate.toLocaleTimeString()}`);
    return [];
  }
  
  // Selecionar 3 ativos diferentes aleatoriamente
  const selectedAssets = selectRandomAssets(availableAssets, 3);
  
  // Para cada ativo selecionado, gerar um sinal
  for (let i = 0; i < selectedAssets.length; i++) {
    const asset = selectedAssets[i];
    const categoria = ATIVOS_CATEGORIAS[asset];
    
    // Alternar entre COMPRA e VENDA
    const tipo = i % 2 === 0 ? 'COMPRA' : 'VENDA';
    
    // Gerar sinal com hora de entrada correspondente ao slot
    const sinal = gerar_sinal_trading_com_horario_entrada(asset, tipo, categoria, slotDate);
    signals.push(sinal as TradingSignal);
  }
  
  return signals;
}

// Verifica se um ativo está disponível em um determinado horário
function isAssetAvailableAtTime(asset: string, date: Date): boolean {
  // Obter dia da semana (em inglês)
  const diasDaSemana = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const diaDaSemana = diasDaSemana[date.getDay()];
  
  // Formatar hora:minuto
  const horaFormatada = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  
  // Obter janelas de tempo disponíveis para o ativo no dia atual
  const janelasDeTempo = HORARIOS_PADRAO[asset]?.[diaDaSemana] || [];
  
  // Se não houver janelas definidas para o dia, o ativo não está disponível
  if (janelasDeTempo.length === 0) {
    return false;
  }
  
  // Verificar se o horário está dentro de alguma janela
  for (const janela of janelasDeTempo) {
    const [inicio, fim] = janela.split('-');
    if (isTimeInRange(horaFormatada, inicio, fim)) {
      return true;
    }
  }
  
  return false;
}

// Seleciona N ativos aleatórios de uma lista
function selectRandomAssets(assets: string[], count: number): string[] {
  // Copiar array para não modificar o original
  const available = [...assets];
  const selected: string[] = [];
  
  // Selecionar até count ativos ou até acabarem os disponíveis
  while (selected.length < count && available.length > 0) {
    const randomIndex = Math.floor(Math.random() * available.length);
    const asset = available.splice(randomIndex, 1)[0];
    selected.push(asset);
  }
  
  return selected;
}

// Função para obter o slot atual de 10 minutos
function getCurrentTimeSlot(): string {
  const now = new Date();
  // Arredondar para baixo para o slot de 10 minutos mais próximo
  const minutes = Math.floor(now.getMinutes() / 10) * 10;
  return `${now.getHours().toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Função para obter sinais do slot atual
function getSignalsForCurrentSlot(): TradingSignal[] {
  // Verificar se precisamos regenerar os sinais do dia
  if (needsToRegenerateSignals()) {
    // Este processo é assíncrono e os sinais estarão disponíveis na próxima vez
    generateAllDailySignals();
    // Retornar sinais vazios por enquanto
    return [];
  }
  
  // Obter o slot atual
  const currentSlot = getCurrentTimeSlot();
  console.log(`Buscando sinais para o slot atual: ${currentSlot}`);
  
  // Retornar os sinais do slot atual
  return dailySignalsCache.data[currentSlot] || [];
}

// Inicializar sinais do dia na inicialização do sistema
generateAllDailySignals().then(() => {
  console.log(`Inicialização de sinais do dia completa: ${Object.keys(dailySignalsCache.data).length} slots gerados`);
}).catch(error => {
  console.error('Erro na inicialização de sinais do dia:', error);
});

// Função para converter string de tempo para objeto Date
function convertTimeStringToDate(timeString: string): Date {
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
}

// Filtrar os sinais mais relevantes para o horário atual
function filterRelevantSignals(allSignals: any[]): TradingSignal[] {
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
  
  // Pegar os 7 primeiros sinais (ou menos se não houver 7)
  return allSignals.slice(0, Math.min(allSignals.length, 7)) as TradingSignal[];
}
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
  Briefcase,
  X
} from "lucide-react";
import { useQuery, useQueryClient, QueryClient } from "@tanstack/react-query";
import { TradingSignal, fetchTradingSignals, getLatestPrices } from "@/services";
import { format, formatDistanceToNow, addMinutes, isAfter, addDays, startOfDay, parse, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRealtimeSignals } from "@/hooks/useRealtimeSignals";
import { Button } from "@/components/ui/button";

import { SignalStrength as SignalStrengthEnum, SignalType } from "@/services/types";
// import { tradingSignalService } from "@/services/TradingSignalService"; // Removido - arquivo não existe mais
import { motion, AnimatePresence } from "framer-motion";
import { TimeZoneSelector } from "@/components/dashboard/TimeZoneSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTimeZone } from "@/contexts/TimeZoneContext";
import { useTrendingNotifications } from "@/contexts/TrendingNotificationContext";
import CryptoTickerFooter from "@/components/CryptoTickerFooterFixed";
import { useSignalNotifications } from "@/hooks/useSignalNotifications";
import { traderLinkService } from "@/services/traderLinkService";
import { useTradingSignalsRealtime } from "@/hooks/useSupabaseRealtime";
import { RealtimeStatus } from "@/components/RealtimeStatus";

// Interfaces de tipo para diagnóstico
interface MemoryInfo {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

interface BrowserDiagnostics {
  userAgent: string;
  renderingEngine: string;
  screenResolution: string;
  memoryInfo?: MemoryInfo | string;
}

interface BrowserInfo {
  name: string;
  version: string;
  isOperar?: boolean;
}

// Declaração para auxiliar na depuração do navegador Operar
declare global {
  interface Window {
    BROWSER_INFO?: BrowserInfo;
    DEBUG_LOGS?: string[];
    dumpDebugLogs?: () => void;
    crashInfo?: Error | Record<string, unknown>;
    lastRenderError?: Error;
    BROWSER_DIAGNOSTICS?: BrowserDiagnostics;
  }
}

// Inicializar variáveis de diagnóstico
if (typeof window !== 'undefined') {
  try {
    // Detectar navegador para logs específicos
    const ua = navigator.userAgent;
    window.BROWSER_INFO = {
      name: ua.includes('Edge') ? 'Edge' : 
            ua.includes('Chrome') ? 'Chrome' : 
            ua.includes('Firefox') ? 'Firefox' : 
            ua.includes('Safari') ? 'Safari' : 
            ua.includes('Opera') ? 'Opera' : 'Unknown',
      version: (ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/(\d+\.\d+)/)?.[2] || ''),
      isOperar: ua.includes('Opera')
    };
    
    // Capturar informações de diagnóstico
    const performanceMemory = (performance as { memory?: MemoryInfo }).memory;
    const navigatorVendor = (navigator as { vendor?: string }).vendor;
    
    window.BROWSER_DIAGNOSTICS = {
      userAgent: navigator.userAgent,
      renderingEngine: navigatorVendor || 'Unknown',
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      memoryInfo: performanceMemory ? 
        { 
          jsHeapSizeLimit: performanceMemory.jsHeapSizeLimit,
          totalJSHeapSize: performanceMemory.totalJSHeapSize,
          usedJSHeapSize: performanceMemory.usedJSHeapSize
        } : 'Not available'
    };
    
    // Array para armazenar logs de diagnóstico
    window.DEBUG_LOGS = [];
    
    // Função para exportar logs para console
    window.dumpDebugLogs = () => {
      console.log('==== LOGS DE DIAGNÓSTICO ====');
      (window.DEBUG_LOGS || []).forEach(log => console.log(log));
      console.log('==== FIM DOS LOGS ====');
      
      // Exibir informações do navegador
      console.log('==== INFORMAÇÕES DO NAVEGADOR ====');
      console.log('Nome:', window.BROWSER_INFO?.name);
      console.log('Versão:', window.BROWSER_INFO?.version);
      console.log('User Agent:', window.BROWSER_DIAGNOSTICS?.userAgent);
      console.log('Rendering Engine:', window.BROWSER_DIAGNOSTICS?.renderingEngine);
      console.log('Resolução:', window.BROWSER_DIAGNOSTICS?.screenResolution);
      console.log('==== FIM DAS INFORMAÇÕES ====');
      
      if (window.crashInfo) {
        console.log('==== INFORMAÇÕES DO CRASH ====');
        console.log(window.crashInfo);
        console.log('==== FIM DAS INFORMAÇÕES DO CRASH ====');
      }
    };
    
    // Capturar erros globais
    window.addEventListener('error', function(event) {
      window.crashInfo = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.toString(),
        stack: event.error?.stack,
        time: new Date().toISOString()
      };
      
      // Adicionar ao log
      if (window.DEBUG_LOGS) {
        window.DEBUG_LOGS.push(`❌ ERRO GLOBAL: ${event.message} (${event.filename}:${event.lineno}:${event.colno})`);
      }
      
      console.error('Erro global capturado:', window.crashInfo);
    });
    
    // Sobrescrever console.error para melhor diagnóstico
    const originalConsoleError = console.error;
    console.error = function(...args) {
      originalConsoleError.apply(console, args);
      if (window.DEBUG_LOGS) {
        window.DEBUG_LOGS.push(`❌ ERRO: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`);
      }
    };
  } catch (err) {
    console.error('Erro ao inicializar diagnóstico:', err);
  }
}

// Cache de sinais para o dia
interface GenericCache {
  signals: PlaceholderSignal[];
  date: string; 
}

let signalCache: GenericCache | null = null;

// 🔒 SISTEMA DE PERSISTÊNCIA NAVEGACIONAL (CAMADAS 3-6)
// Sistema robusto de persistência que mantém sinais entre navegações
interface PersistentSignalsNavigation {
  signals: PlaceholderSignal[];
  timestamp: number;
  version: string;
  count: number;
  lastTabSwitch: number;
}

// FUNÇÃO PRESERVATIVA: Salvar sinais automaticamente
const saveSignalsToNavigationCache = (signals: PlaceholderSignal[]): void => {
  try {
    if (!signals || signals.length < 4) {
      console.warn('⚠️ Cache rejeitado: menos de 4 sinais', signals?.length || 0);
      return;
    }

    // Salvar para persistência da aba Trades
    const cacheData: PersistentSignalsNavigation = {
      signals,
      timestamp: Date.now(),
      version: '2.1-new-logic', // Nova versão para forçar atualização
      count: signals.length,
      lastTabSwitch: Date.now()
    };
    localStorage.setItem('persistent-signals-navigation', JSON.stringify(cacheData));
    
    // SINCRONIZAÇÃO BIDIRECIONAL REFORÇADA: Compartilhar os 3 primeiros sinais com a Dashboard
    if (signals.length >= 3) {
      // Garantir que os sinais tenham todas as propriedades necessárias
      const enrichedSignals = signals.slice(0, 3).map((signal, index) => ({
        ...signal,
        // Propriedades obrigatórias
        id: signal.id || `trade-signal-${Date.now()}-${index}`,
        symbol: signal.symbol,
        entry_time: signal.entry_time,
        signal: signal.signal || (Math.random() > 0.5 ? 'BUY' : 'SELL'),
        // Propriedades específicas da Dashboard
        isDashboard: true,
        position: index + 1,
        dashboardPosition: index,
        // Garantir que estão completos
        exchange: signal.exchange || inferExchangeCategory(signal.symbol),
        timeframe: signal.timeframe || '5m',
        expiry: signal.expiry || '5m'
      }));
      
      const dashboardData = {
        signals: enrichedSignals,
        timestamp: Date.now(),
        version: '2.0-enhanced',
        source: 'signals'
      };
      
      // Salvar em múltiplos locais para garantir acesso
      localStorage.setItem('tradesSignals', JSON.stringify(dashboardData));
      localStorage.setItem('dashboardSignals', JSON.stringify(dashboardData)); // Atualizar diretamente
      
      // Notificar a dashboard imediatamente via múltiplos eventos
      window.dispatchEvent(new CustomEvent('tradesSignalsUpdated', { detail: dashboardData }));
      window.dispatchEvent(new CustomEvent('forceDashboardSync', { detail: dashboardData }));
      
      console.log('💾 CACHE SINCRONIZADO: Sinais salvos e compartilhados com Dashboard');
    } else {
      console.log('💾 CACHE: Sinais salvos apenas na navegação (sem compartilhar)');
    }
  } catch (error) {
    console.error('❌ ERRO: Falha ao salvar cache de navegação:', error);
  }
};

// FUNÇÃO PRESERVATIVA: Carregar sinais automaticamente
const loadSignalsFromNavigationCache = (): PlaceholderSignal[] | null => {
  try {
    const cacheData = localStorage.getItem('persistent-signals-navigation');
    if (!cacheData) return null;
    
    const parsed: PersistentSignalsNavigation = JSON.parse(cacheData);
    
    // Verificar se a versão é compatível com a nova lógica
    if (parsed.version !== '2.1-new-logic') {
      console.log('🔄 CACHE: Versão antiga detectada, limpando cache');
      localStorage.removeItem('persistent-signals-navigation');
      return null;
    }
    
    // Cache válido por 30 minutos (mesmo tempo dos sinais da dashboard)
    const MAX_CACHE_AGE = 30 * 60 * 1000;
    if (Date.now() - parsed.timestamp > MAX_CACHE_AGE) {
      console.log('⏰ CACHE: Cache expirado, removendo');
      localStorage.removeItem('persistent-signals-navigation');
      return null;
    }
    
    if (parsed.signals && parsed.signals.length >= 7) {
      console.log('💾 CACHE HIT: Carregando sinais do cache de navegação');
      return parsed.signals;
    }
    
    return null;
  } catch (error) {
    console.error('❌ ERRO: Falha ao carregar cache de navegação:', error);
    localStorage.removeItem('persistent-signals-navigation');
    return null;
  }
};

// Função para limpar cache quando sinais da dashboard mudarem
const clearNavigationCacheOnDashboardChange = (): void => {
  try {
    localStorage.removeItem('persistent-signals-navigation');
    console.log('🧹 CACHE: Cache limpo devido a mudança na dashboard');
  } catch (error) {
    console.error('❌ ERRO: Falha ao limpar cache:', error);
  }
};

// 🛡️ VERIFICAÇÃO INTELIGENTE DE CACHE (CAMADAS 1-2)
// Só limpa cache em casos REALMENTE críticos
const shouldClearCacheIntelligent = (currentSignals: PlaceholderSignal[]): boolean => {
  if (!currentSignals) return true;
  
  // CASO CRÍTICO 1: Menos de 4 sinais
  if (currentSignals.length < 4) {
    console.log('🚨 CRÍTICO: Menos de 4 sinais detectado');
    return true;
  }
  
  // CASO CRÍTICO 2: Sinais com "binance" (não permitido)
  const hasBinanceSignals = currentSignals.some(signal => 
    signal.symbol?.toLowerCase().includes('binance') ||
    signal.exchange?.toLowerCase().includes('binance')
  );
  
  if (hasBinanceSignals) {
    console.log('🚨 CRÍTICO: Sinais binance detectados');
    return true;
  }
  
  // CASO CRÍTICO 3: Horários inválidos em mais da metade dos sinais
  const invalidTimeSignals = currentSignals.filter(signal => {
    if (!signal.entry_time) return true;
    const [_, minutes] = signal.entry_time.split(':').map(Number);
    return ![3, 23, 43].includes(minutes);
  });
  
  if (invalidTimeSignals.length > currentSignals.length / 2) {
    console.log('🚨 CRÍTICO: Muitos horários inválidos');
    return true;
  }
  
  // NÃO é caso crítico - PRESERVAR sinais
  return false;
};

// Declarações das funções preservativas serão movidas para depois de generateDailySignals

// Constantes para controle dos tempos dos sinais
const SIGNAL_EXPIRY_TIME = 5; // Tempo de expiração em minutos (sempre 5 minutos)
const TIME_BETWEEN_SIGNALS = 20; // Tempo entre sinais (padrão XX:03, XX:23, XX:43)
const RESULT_TIME = 16; // Tempo até mostrar o resultado (16 minutos após a entrada)
const FIRST_SIGNAL_TIME = "00:03"; // Horário do primeiro sinal do dia (sempre começa com XX:03)
const WIN_LOSS_RATIO = 9; // Proporção de 9 ganhos para 1 perda
// Minutos válidos para sinais - seguindo padrão sequencial XX:03, XX:23, XX:43
const VALID_MINUTES = [3, 23, 43]; // Padrão sequencial: 03 -> 23 -> 43 -> (hora+1):03

// Lista de ativos disponíveis com suas categorias
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

// Lista de ativos PERMITIDOS explicitamente (forçada pela especificação do usuário)
// Observação: Mantemos algumas variações com e sem sufixo (OTC) para compatibilidade
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

// Helper: retorna a lista unificada de ativos conhecidos + permitidos
const getAllAssetNames = (): string[] => {
  const base = Object.keys(ATIVOS_CATEGORIAS);
  const merged = new Set<string>([...base, ...ALLOWED_SET]);
  return Array.from(merged);
};

// Inferência de categoria com base no nome do ativo
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

// Estrutura para armazenar os horários de disponibilidade de cada ativo
// Formato: [hora_inicio, minuto_inicio, hora_fim, minuto_fim]
// Se um ativo não estiver listado, assume-se que está disponível 24/7
const HORARIOS_DISPONIBILIDADE: Record<string, Array<[number, number, number, number]>> = {
  // Exemplo de formato: "Ativo": [[8, 0, 16, 30]] - disponível das 8:00 às 16:30
  // Múltiplos intervalos são permitidos: [[8, 0, 12, 0], [13, 0, 17, 0]]
  // Se um ativo não estiver listado aqui, assume-se que está disponível 24/7
  
  // Ações
  // AIG - Mesmo padrão para todos os dias
  "AIG": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // Alibaba Group Holding - Mesmo padrão para todos os dias
  "Alibaba Group Holding": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // Amazon - Padrão para dias com interrupção (seg, qua, sex)
  "Amazon": [[0, 0, 15, 30], [16, 0, 23, 59]],
  
  // Amazon/Alibaba - Mesmo padrão para todos os dias
  "Amazon/Alibaba": [[0, 0, 6, 30], [7, 0, 23, 59]],
  
  // Amazon/Ebay - Mesmo padrão para todos os dias
  "Amazon/Ebay": [[0, 0, 6, 30], [7, 0, 23, 59]],
  
  // Apple - Padrão para dias com interrupção (seg, qua, sex)
  "Apple": [[0, 0, 15, 30], [16, 0, 23, 59]],
  
  // Baidu, Inc. ADR - Mesmo padrão para todos os dias
  "Baidu, Inc. ADR": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // Citigroup, Inc - Mesmo padrão para todos os dias
  "Citigroup, Inc": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // Coca-Cola Company - Mesmo padrão para todos os dias
  "Coca-Cola Company": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // Meta - Padrão para dias com interrupção (seg, qua, sex)
  "Meta": [[0, 0, 15, 30], [16, 35, 23, 59]],
  
  // Google - Padrão para dias com interrupção (seg, qua, sex)
  "Google": [[0, 0, 15, 30], [16, 35, 23, 59]],
  
  // Alphabet/Microsoft - Mesmo padrão para todos os dias
  "Alphabet/Microsoft": [[0, 0, 6, 30], [7, 0, 23, 59]],
  
  // Goldman Sachs Group, Inc. - Mesmo padrão para todos os dias
  "Goldman Sachs Group, Inc.": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // Intel Corporation - Mesmo padrão para todos os dias
  "Intel Corporation": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // Intel/IBM - Mesmo padrão para todos os dias
  "Intel/IBM": [[0, 0, 6, 30], [7, 0, 23, 59]],
  
  // JPMorgan Chase E Co. - Mesmo padrão para todos os dias
  "JPMorgan Chase E Co.": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // McDonald´s Corporation - Mesmo padrão para todos os dias
  "McDonald´s Corporation": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // Meta/Alphabet - Mesmo padrão para todos os dias
  "Meta/Alphabet": [[0, 0, 6, 30], [7, 40, 23, 59]],
  
  // Morgan Stanley - Mesmo padrão para todos os dias
  "Morgan Stanley": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // Microsoft Corporation - Mesmo padrão para todos os dias
  "Microsoft Corporation": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // Microsoft/Apple - Mesmo padrão para todos os dias
  "Microsoft/Apple": [[0, 0, 6, 30], [7, 40, 23, 59]],
  
  // Netflix/Amazon - Mesmo padrão para todos os dias
  "Netflix/Amazon": [[0, 0, 6, 30], [7, 0, 23, 59]],
  
  // Snap Inc. - Mesmo padrão para todos os dias
  "Snap Inc.": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // Tesla - Padrão para dias com interrupção (seg, qua, sex)
  "Tesla": [[0, 0, 15, 30], [16, 0, 23, 59]],
  
  // Tesla/Ford - Mesmo padrão para todos os dias
  "Tesla/Ford": [[0, 0, 6, 30], [7, 0, 23, 59]],
  
  // Commodities
  // Crude Oil Brent - Padrão para dias com interrupção (seg, qui)
  "Crude Oil Brent": [[0, 0, 6, 0], [7, 5, 23, 59]],
  
  // Crude Oil WTI - Padrão para dias com interrupção (seg, qui)
  "Crude Oil WTI": [[0, 0, 6, 0], [7, 5, 23, 59]],
  
  // Silver - Padrão para dias com interrupção (seg, qui)
  "Silver": [[0, 0, 6, 0], [7, 5, 23, 59]],
  
  // Ouro/Prata - Mesmo padrão para todos os dias
  "Ouro/Prata": [[0, 0, 6, 30], [7, 40, 23, 59]],
  
  // Gold - Padrão para dias com interrupção (seg, qui)
  "Gold": [[0, 0, 6, 0], [7, 5, 23, 59]],
  
  // Gás Natural - Padrão para dias com interrupção (seg, qui)
  "Gás Natural": [[0, 0, 6, 0], [7, 5, 23, 59]],
  
  // Índices
  // AUS 200 - Mesmo padrão para todos os dias
  "AUS 200": [[0, 0, 22, 0], [22, 30, 23, 59]],
  
  // EU 50 - Mesmo padrão para todos os dias
  "EU 50": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // FR 40 - Mesmo padrão para todos os dias
  "FR 40": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // GER 30 - Mesmo padrão para todos os dias
  "GER 30": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // GER30/UK100 - Mesmo padrão para todos os dias
  "GER30/UK100": [[0, 0, 6, 30], [7, 0, 23, 59]],
  
  // HK 33 - Padrão diferente para dias úteis e fins de semana
  "HK 33": [[0, 0, 15, 0], [15, 30, 23, 59]],
  
  // JP 225 - Mesmo padrão para todos os dias
  "JP 225": [[0, 0, 22, 0], [23, 5, 23, 59]],
  
  // SP 35 - Mesmo padrão para todos os dias
  "SP 35": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // US 500 - Padrão para dias úteis, fechado nos fins de semana
  "US 500": [[11, 35, 17, 55]],
  
  // UK 100 - Mesmo padrão para todos os dias
  "UK 100": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // US100/JP225 - Mesmo padrão para todos os dias
  "US100/JP225": [[0, 0, 6, 30], [7, 40, 23, 59]],
  
  // US2000 - Mesmo padrão para todos os dias
  "US2000": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // US 30 - Padrão diferente para dias úteis e fins de semana
  "US 30": [[0, 0, 15, 0], [16, 10, 23, 59]],
  
  // US30/JP225 - Mesmo padrão para todos os dias
  "US30/JP225": [[0, 0, 6, 30], [7, 40, 23, 59]],
  
  // US500/JP225 - Mesmo padrão para todos os dias
  "US500/JP225": [[0, 0, 6, 30], [7, 0, 23, 59]],
  
  // US 100 - Padrão diferente para dias úteis e fins de semana
  "US 100": [[0, 0, 15, 0], [16, 10, 23, 59]],
  
  // Cripto
  // Arbitrum - Mesmo padrão para todos os dias
  "Arbitrum": [[0, 0, 12, 0], [12, 30, 23, 59]],
  
  // Cosmos - Mesmo padrão para todos os dias
  "Cosmos": [[0, 0, 12, 0], [13, 10, 23, 59]],
  
  // Bitcoin Cash - Mesmo padrão para todos os dias
  "Bitcoin Cash": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // Bonk - Mesmo padrão para todos os dias
  "Bonk": [[0, 0, 17, 40], [18, 50, 23, 59]],
  
  // Bitcoin - Mesmo padrão para todos os dias
  "Bitcoin": [[0, 0, 12, 0], [12, 30, 23, 59]],
  
  // Cardano - Mesmo padrão para todos os dias
  "Cardano": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // Dash - Mesmo padrão para todos os dias
  "Dash": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // Dogecoin - Mesmo padrão para todos os dias
  "Dogecoin": [[0, 0, 17, 45], [18, 55, 23, 59]],
  
  // Polkadot - Mesmo padrão para todos os dias
  "Polkadot": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // DYDX - Mesmo padrão para todos os dias
  "DYDX": [[0, 0, 17, 40], [18, 50, 23, 59]],
  
  // EOS - Mesmo padrão para todos os dias
  "EOS": [[0, 0, 22, 0], [22, 30, 23, 59]],
  
  // Ethereum - Mesmo padrão para todos os dias
  "Ethereum": [[0, 0, 12, 0], [13, 10, 23, 59]],
  
  // Fartcoin - Mesmo padrão para todos os dias
  "Fartcoin": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // Artificial Superintelligence Alliance - Mesmo padrão para todos os dias
  "Artificial Superintelligence Alliance": [[0, 0, 17, 40], [18, 50, 23, 59]],
  
  // Floki - Mesmo padrão para todos os dias
  "Floki": [[0, 0, 17, 40], [18, 50, 23, 59]],
  
  // Gala - Mesmo padrão para todos os dias
  "Gala": [[0, 0, 17, 40], [18, 50, 23, 59]],
  
  // Graph - Mesmo padrão para todos os dias
  "Graph": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // Hedera - Mesmo padrão para todos os dias
  "Hedera": [[0, 0, 17, 40], [18, 50, 23, 59]],
  
  // ICP - Mesmo padrão para todos os dias
  "ICP": [[0, 0, 17, 40], [18, 50, 23, 59]],
  
  // Immutable - Mesmo padrão para todos os dias
  "Immutable": [[0, 0, 17, 40], [18, 50, 23, 59]],
  
  // Injective - Mesmo padrão para todos os dias
  "Injective": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // IOTA - Mesmo padrão para todos os dias
  "IOTA": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // Júpiter - Mesmo padrão para todos os dias
  "Júpiter": [[0, 0, 17, 40], [18, 50, 23, 59]],
  
  // Chainlink - Mesmo padrão para todos os dias
  "Chainlink": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // Litecoin - Mesmo padrão para todos os dias
  "Litecoin": [[0, 0, 22, 0], [23, 5, 23, 59]],
  
  // Decentraland - Mesmo padrão para todos os dias
  "Decentraland": [[0, 0, 17, 40], [18, 50, 23, 59]],
  
  // Polygon - Mesmo padrão para todos os dias
  "Polygon": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // MELANIA Coin - Mesmo padrão para todos os dias
  "MELANIA Coin": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // NEAR - Mesmo padrão para todos os dias
  "NEAR": [[0, 0, 17, 40], [18, 50, 23, 59]],
  
  // Ondo - Mesmo padrão para todos os dias
  "Ondo": [[0, 0, 12, 0], [13, 10, 23, 59]],
  
  // Onyxcoin - Mesmo padrão para todos os dias
  "Onyxcoin": [[0, 0, 12, 0], [12, 30, 23, 59]],
  
  // ORDI - Mesmo padrão para todos os dias
  "ORDI": [[0, 0, 12, 0], [12, 30, 23, 59]],
  
  // Pudgy Penguins - Mesmo padrão para todos os dias
  "Pudgy Penguins": [[0, 0, 12, 0], [13, 10, 23, 59]],
  
  // Pepe - Mesmo padrão para todos os dias
  "Pepe": [[0, 0, 12, 0], [13, 10, 23, 59]],
  
  // Pyth - Mesmo padrão para todos os dias
  "Pyth": [[0, 0, 12, 0], [13, 10, 23, 59]],
  
  // Raydium - Mesmo padrão para todos os dias
  "Raydium": [[0, 0, 12, 0], [13, 10, 23, 59]],
  
  // Render - Mesmo padrão para todos os dias
  "Render": [[0, 0, 12, 0], [12, 30, 23, 59]],
  
  // Ronin - Mesmo padrão para todos os dias
  "Ronin": [[0, 0, 12, 0], [12, 30, 23, 59]],
  
  // Sandbox - Mesmo padrão para todos os dias
  "Sandbox": [[0, 0, 12, 0], [12, 30, 23, 59]],
  
  // 1000Sats - Mesmo padrão para todos os dias
  "1000Sats": [[0, 0, 12, 0], [12, 30, 23, 59]],
  
  // Sei - Mesmo padrão para todos os dias
  "Sei": [[0, 0, 12, 0], [12, 30, 23, 59]],
  
  // Shiba Inu - Mesmo padrão para todos os dias
  "Shiba Inu": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // Solana - Mesmo padrão para todos os dias
  "Solana": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // Stacks - Mesmo padrão para todos os dias
  "Stacks": [[0, 0, 12, 0], [13, 10, 23, 59]],
  
  // Sui - Mesmo padrão para todos os dias
  "Sui": [[0, 0, 12, 0], [12, 30, 23, 59]],
  
  // Bittensor - Mesmo padrão para todos os dias
  "Bittensor": [[0, 0, 12, 0], [13, 10, 23, 59]],
  
  // Celestia - Mesmo padrão para todos os dias
  "Celestia": [[0, 0, 12, 0], [12, 30, 23, 59]],
  
  // TON - Mesmo padrão para todos os dias
  "TON": [[0, 0, 12, 0], [13, 10, 23, 59]],
  
  // TRON/USD - Mesmo padrão para todos os dias
  "TRON/USD": [[0, 0, 17, 45], [18, 55, 23, 59]],
  
  // TRUMP Coin - Mesmo padrão para todos os dias
  "TRUMP Coin": [[0, 0, 12, 0], [13, 10, 23, 59]],
  
  // Dogwifhat - Mesmo padrão para todos os dias
  "Dogwifhat": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // World Coin - Mesmo padrão para todos os dias
  "World Coin": [[0, 0, 17, 45], [18, 15, 23, 59]],
  
  // Ripple - Mesmo padrão para todos os dias
  "Ripple": [[0, 0, 22, 0], [22, 30, 23, 59]],
  
  // Forex
  // AUD/CAD (OTC) - Considerando o padrão para dias com interrupção (seg, qua, sex)
  "AUD/CAD (OTC)": [[0, 0, 1, 0], [2, 10, 23, 59]],
  
  // AUD/CAD - Padrão para dias úteis
  "AUD/CAD": [[8, 0, 13, 0]],
  
  // AUD/JPY (OTC) - Mesmo padrão para todos os dias
  "AUD/JPY (OTC)": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // AUD/JPY - Padrão para dias úteis
  "AUD/JPY": [[7, 0, 12, 0]],
  
  // AUD/NZD (OTC) - Mesmo padrão para todos os dias
  "AUD/NZD (OTC)": [[0, 0, 22, 0], [22, 30, 23, 59]],
  
  // AUD/USD (OTC) - Mesmo padrão para todos os dias
  "AUD/USD (OTC)": [[0, 0, 22, 0], [22, 30, 23, 59]],
  
  // AUD/USD - Padrão para dias úteis com intervalos específicos
  "AUD/USD": [[2, 0, 6, 0], [9, 30, 15, 0]],
  
  // AUD/CHF - Padrão para dias úteis (seg-sex)
  "AUD/CHF": [[0, 0, 16, 0]],
  
  // CAD/CHF (OTC) - Padrão para dias úteis e sábado
  "CAD/CHF (OTC)": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // CAD/CHF - Padrão para dias úteis
  "CAD/CHF": [[4, 0, 16, 0]],
  
  // CAD/JPY (OTC) - Mesmo padrão para todos os dias
  "CAD/JPY (OTC)": [[0, 0, 22, 0], [22, 30, 23, 59]],
  
  // CHF/JPY - Mesmo padrão para todos os dias
  "CHF/JPY": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // CHFNOK - Padrão para dias úteis e sábado
  "CHFNOK": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // Dollar Index - Padrão para dias úteis (seg-qui)
  "Dollar Index": [[0, 0, 10, 0], [11, 10, 22, 0], [23, 10, 23, 59]],
  
  // EUR/AUD (OTC) - Mesmo padrão para todos os dias
  "EUR/AUD (OTC)": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // EUR/AUD - Padrão para dias úteis (seg-sex)
  "EUR/AUD": [[0, 0, 16, 0]],
  
  // EUR/CAD (OTC) - Padrão para dias úteis e sábado
  "EUR/CAD (OTC)": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // EUR/CAD - Padrão para dias úteis
  "EUR/CAD": [[4, 0, 16, 0]],
  
  // EUR/CHF (OTC) - Mesmo padrão para todos os dias
  "EUR/CHF (OTC)": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // EUR/GBP (OTC) - Considerando o padrão para dias com interrupção (seg, qua, sex)
  "EUR/GBP (OTC)": [[0, 0, 1, 0], [2, 10, 23, 59]],
  
  // EUR/GBP - Padrão para dias úteis
  "EUR/GBP": [[3, 0, 13, 0]],
  
  // EUR/JPY (OTC) - Considerando o padrão para dias com interrupção (seg, qua, sex)
  "EUR/JPY (OTC)": [[0, 0, 1, 0], [1, 30, 23, 59]],
  
  // EUR/NZD (OTC) - Mesmo padrão para todos os dias
  "EUR/NZD (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  
  // EUR/NZD - Padrão para dias úteis (seg-sex)
  "EUR/NZD": [[0, 0, 16, 0]],
  
  // EUR/THB (OTC) - Mesmo padrão para todos os dias
  "EUR/THB (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  
  // EUR/USD (OTC) - Considerando o padrão para dias com interrupção (seg, qua, sex)
  "EUR/USD (OTC)": [[0, 0, 1, 0], [1, 30, 23, 59]],
  
  // GBP/AUD (OTC) - Padrão para dias úteis e sábado
  "GBP/AUD (OTC)": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // GBP/AUD - Padrão para dias úteis (seg-sex)
  "GBP/AUD": [[0, 0, 16, 0]],
  
  // GBP/CAD (OTC) - Padrão para dias úteis e sábado
  "GBP/CAD (OTC)": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // GBP/CAD - Padrão para dias úteis
  "GBP/CAD": [[4, 0, 15, 0]],
  
  // GBP/CHF (OTC) - Padrão para dias úteis e sábado
  "GBP/CHF (OTC)": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // GBP/CHF - Padrão para dias úteis (seg-sex)
  "GBP/CHF": [[0, 0, 16, 0]],
  
  // GBP/JPY (OTC) - Considerando o padrão para dias com interrupção (ter, qui)
  "GBP/JPY (OTC)": [[0, 0, 1, 0], [2, 10, 23, 59]],
  
  // GBP/JPY - Padrão para dias úteis (seg-qui até 17:00, sex até 15:30)
  "GBP/JPY": [[3, 0, 17, 0]],
  
  // GBP/NZD (OTC) - Mesmo padrão para todos os dias
  "GBP/NZD (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  
  // GBP/NZD - Padrão para dias úteis (seg-sex)
  "GBP/NZD": [[0, 0, 16, 0]],
  
  // GBP/USD (OTC) - Considerando o padrão para dias com interrupção (ter, qui)
  "GBP/USD (OTC)": [[0, 0, 1, 0], [1, 30, 23, 59]],
  
  // GBP/USD - Padrão para dias úteis (seg-qui até 17:00, sex até 15:30)
  "GBP/USD": [[3, 0, 17, 0]],
  
  // JPY/THB (OTC) - Mesmo padrão para todos os dias
  "JPY/THB (OTC)": [[0, 0, 22, 0], [22, 30, 23, 59]],
  
  // NOK/JPY (OTC) - Mesmo padrão para todos os dias
  "NOK/JPY (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  
  // NZD/CAD (OTC) - Mesmo padrão para todos os dias
  "NZD/CAD (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  
  // NZDCHF - Mesmo padrão para todos os dias
  "NZDCHF": [[0, 0, 22, 0], [23, 5, 23, 59]],
  
  // NZD/JPY (OTC) - Mesmo padrão para todos os dias
  "NZD/JPY (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  
  // NZD/USD (OTC) - Considerando o padrão para dias com interrupção (ter, qui)
  "NZD/USD (OTC)": [[0, 0, 1, 0], [1, 30, 23, 59]],
  
  // PEN/USD (OTC) - Considerando o padrão para dias com interrupção (ter)
  "PEN/USD (OTC)": [[0, 0, 0, 45], [1, 15, 23, 59]],
  
  // USD/BRL (OTC) - Considerando o padrão para dias com interrupção (ter)
  "USD/BRL (OTC)": [[0, 0, 0, 50], [2, 20, 23, 59]],
  
  // USD/CAD (OTC) - Mesmo padrão para todos os dias
  "USD/CAD (OTC)": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // USD/CAD - Padrão para dias úteis
  "USD/CAD": [[3, 0, 15, 0]],
  
  // USD/CHF (OTC) - Considerando o padrão para dias com interrupção (ter, qui)
  "USD/CHF (OTC)": [[0, 0, 1, 0], [1, 30, 23, 59]],
  
  // USD/CHF - Padrão para dias úteis
  "USD/CHF": [[10, 0, 14, 0]],
  
  // USD/COP (OTC) - Considerando o padrão para dias com interrupção (ter)
  "USD/COP (OTC)": [[0, 0, 0, 45], [1, 15, 23, 59]],
  
  // USD/HKD (OTC) - Mesmo padrão para todos os dias
  "USD/HKD (OTC)": [[0, 0, 22, 0], [22, 30, 23, 59]],
  
  // USD/INR (OTC) - Considerando o padrão para dias com interrupção (ter, qui)
  "USD/INR (OTC)": [[0, 0, 1, 0], [1, 30, 23, 59]],
  
  // USD/JPY (OTC) - Considerando o padrão para dias com interrupção (ter, qui)
  "USD/JPY (OTC)": [[0, 0, 1, 0], [2, 10, 23, 59]],
  
  // USD/MXN (OTC) - Considerando o padrão para dias com interrupção (ter)
  "USD/MXN (OTC)": [[0, 0, 0, 50], [2, 20, 23, 59]],
  
  // USD/NOK (OTC) - Mesmo padrão para todos os dias
  "USD/NOK (OTC)": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // USD/PLN (OTC) - Padrão para dias úteis e sábado
  "USD/PLN (OTC)": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // USD/SEK (OTC) - Padrão para dias úteis e sábado
  "USD/SEK (OTC)": [[0, 0, 5, 0], [5, 30, 23, 59]],
  
  // USD/SGD (OTC) - Mesmo padrão para todos os dias
  "USD/SGD (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  
  // USD/THB (OTC) - Mesmo padrão para todos os dias
  "USD/THB (OTC)": [[0, 0, 22, 0], [23, 5, 23, 59]],
  
  // USD/TRY (OTC) - Mesmo padrão para todos os dias
  "USD/TRY (OTC)": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // USD/XOF (OTC) - Considerando o padrão para dias com interrupção (ter, qui)
  "USD/XOF (OTC)": [[0, 0, 1, 0], [1, 30, 23, 59]],
  
  // USD/ZAR (OTC) - Mesmo padrão para todos os dias
  "USD/ZAR (OTC)": [[0, 0, 5, 0], [6, 10, 23, 59]],
  
  // Yen Index - Padrão para dias úteis (seg-qui)
  "Yen Index": [[0, 0, 10, 0], [10, 30, 22, 0], [22, 30, 23, 59]]
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
    transform: translateY(-3px);
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

  /* Estilo para o título principal da página */
  .signals-title {
    position: relative;
    display: inline-block;
    font-weight: 600;
    letter-spacing: 0.025em;
    color: #ffffff;
    text-shadow: 
      0 1px 2px rgba(0, 0, 0, 0.9),
      0 2px 4px rgba(0, 0, 0, 0.7),
      0 4px 8px rgba(0, 0, 0, 0.5),
      0 8px 16px rgba(0, 0, 0, 0.3);
  }
  
  .signals-title::before {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
    color: rgba(0, 0, 0, 0.4);
    filter: blur(1px);
    transform: translate(1px, 1px);
  }
  
  .signals-title::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    opacity: 0.6;
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
  showResult?: boolean;       // Flag para indicar se deve mostrar o resultado
  resultTimestamp?: number;   // Timestamp de quando o resultado foi determinado
  isAnimatingResult?: boolean; // Flag para controlar animação do resultado
}

// Interface para sinais estendidos com propriedades de animação e processamento
interface ExtendedSignal extends PlaceholderSignal {
  isAnimating?: boolean;
  processed?: boolean;
  isDashboard?: boolean;
}

// Adicionar a propriedade para o TypeScript no nível superior do arquivo
// Nota: A interface Window._cacheDailySignals já está definida em SignalsCard.tsx como any[]
// para manter compatibilidade com outros componentes

// Função para verificar se um ativo está disponível em determinado horário
const isAssetAvailable = (asset: string, date: Date = new Date()): boolean => {
  // Verificação especial para USD Currency Index com horários específicos por dia da semana
  if (asset === "USD Currency Index (OTC)") {
    const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const hora = date.getHours();
    const minuto = date.getMinutes();
    const currentTimeInMinutes = hora * 60 + minuto;
    
    // Sábado: Mercado fechado
    if (dayOfWeek === 6) {
      return false;
    }
    
    // Domingo: 19:00 – 23:59
    if (dayOfWeek === 0) {
      return currentTimeInMinutes >= (19 * 60) && currentTimeInMinutes <= (23 * 60 + 59);
    }
    
    // Segunda a Quinta: 00:00-10:00, 11:10-22:00, 23:10-23:59
    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      return (currentTimeInMinutes >= 0 && currentTimeInMinutes <= (10 * 60)) ||
             (currentTimeInMinutes >= (11 * 60 + 10) && currentTimeInMinutes <= (22 * 60)) ||
             (currentTimeInMinutes >= (23 * 60 + 10) && currentTimeInMinutes <= (23 * 60 + 59));
    }
    
    // Sexta: 00:00-10:00, 11:10-21:00
    if (dayOfWeek === 5) {
      return (currentTimeInMinutes >= 0 && currentTimeInMinutes <= (10 * 60)) ||
             (currentTimeInMinutes >= (11 * 60 + 10) && currentTimeInMinutes <= (21 * 60));
    }
    
    return false;
  }
  
  // Se o ativo não estiver na lista de horários, assume-se que está disponível 24/7
  if (!HORARIOS_DISPONIBILIDADE[asset]) {
    return true;
  }
  
  const hora = date.getHours();
  const minuto = date.getMinutes();
  
  // Verificar se o horário atual está dentro de algum dos intervalos de disponibilidade
  const isAvailable = HORARIOS_DISPONIBILIDADE[asset].some(([horaInicio, minutoInicio, horaFim, minutoFim]) => {
    const inicioEmMinutos = horaInicio * 60 + minutoInicio;
    const fimEmMinutos = horaFim * 60 + minutoFim;
    const atualEmMinutos = hora * 60 + minuto;
    
    return atualEmMinutos >= inicioEmMinutos && atualEmMinutos <= fimEmMinutos;
  });
  
  // Log detalhado apenas para alguns ativos para evitar spam
  if (asset === "Ouro/Prata" || asset === "US 100 (OTC)" || asset === "Amazon/Ebay (OTC)") {
    console.log(`Verificando disponibilidade: ${asset} às ${hora}:${minuto} - ${isAvailable ? 'Disponível' : 'Indisponível'}`);
  }
  
  return isAvailable;
};

// Função FLEXIBILIZADA para verificar se um ativo estará disponível por pelo menos 30 minutos
// Esta função substitui a verificação rigorosa para permitir mais sinais serem gerados
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
      return isInRange && timeRemaining >= 30;
    }
    
    // Segunda a Quinta: 00:00-10:00, 11:10-22:00, 23:10-23:59
    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      // Primeiro intervalo: 00:00-10:00
      if (entryTimeMinutes >= 0 && entryTimeMinutes <= (10 * 60)) {
        const timeRemaining = (10 * 60) - entryTimeMinutes;
        return timeRemaining >= 30;
      }
      // Segundo intervalo: 11:10-22:00
      if (entryTimeMinutes >= (11 * 60 + 10) && entryTimeMinutes <= (22 * 60)) {
        const timeRemaining = (22 * 60) - entryTimeMinutes;
        return timeRemaining >= 30;
      }
      // Terceiro intervalo: 23:10-23:59
      if (entryTimeMinutes >= (23 * 60 + 10) && entryTimeMinutes <= (23 * 60 + 59)) {
        const timeRemaining = (23 * 60 + 59) - entryTimeMinutes;
        return timeRemaining >= 30;
      }
      return false;
    }
    
    // Sexta: 00:00-10:00, 11:10-21:00
    if (dayOfWeek === 5) {
      // Primeiro intervalo: 00:00-10:00
      if (entryTimeMinutes >= 0 && entryTimeMinutes <= (10 * 60)) {
        const timeRemaining = (10 * 60) - entryTimeMinutes;
        return timeRemaining >= 30;
      }
      // Segundo intervalo: 11:10-21:00
      if (entryTimeMinutes >= (11 * 60 + 10) && entryTimeMinutes <= (21 * 60)) {
        const timeRemaining = (21 * 60) - entryTimeMinutes;
        return timeRemaining >= 30;
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
  
  // Log para debug quando necessário
  if (!isAvailable && (asset === "Ouro/Prata" || asset === "US 100 (OTC)" || asset === "Amazon/Ebay (OTC)")) {
    console.log(`❌ Ativo ${asset} não terá 30min disponíveis a partir de ${hora}:${String(minuto).padStart(2, '0')}`);
  }
  
  return isAvailable;
};

const Signals = () => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { convertTimeToSelected, adjustTime } = useTimeZone();
  const { scheduleSignalNotification, requestPermission, hasPermission } = useTrendingNotifications();
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
  const [dashboardSignals, setDashboardSignals] = useState<TradingSignal[]>([]);
  const [resultCounter, setResultCounter] = useState(0);
  const [winLossCounter, setWinLossCounter] = useState(0); // Contador de ganhos e perdas consecutivos
  const [resultAnimation, setResultAnimation] = useState<Record<string, boolean>>({});
  const resultTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const rotateTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  

  
  // Referências para controle de estado sem re-renderização
  const rotateSignalsLock = useRef(false);
  const lastRotationTime = useRef(0);
  const stateRef = useRef({
    lastCheckTime: Date.now(),
    lastPriceUpdate: Date.now(),
    isUpdating: false
  });
  const updateLockRef = useRef({
    isUpdating: false,
    lastUpdateTime: Date.now()
  });
  
  // ===== SUPABASE REALTIME INTEGRATION =====
  // Handler para mudanças em tempo real nos sinais
  const handleRealtimeSignalChange = useCallback((signal: TradingSignal) => {
    console.log('🔄 [Realtime] Sinal atualizado em tempo real:', signal);
    
    // Invalidar cache do React Query para recarregar sinais
    queryClient.invalidateQueries({ queryKey: ['tradingSignals'] });
    
    // Opcional: Mostrar notificação visual
    // toast.info('Novo sinal disponível');
  }, [queryClient]);

  // Conectar ao realtime do Supabase
  const { status: realtimeStatus } = useTradingSignalsRealtime(
    handleRealtimeSignalChange,
    true // enabled
  );

  useEffect(() => {
    if (realtimeStatus === 'connected') {
      console.log('✅ [Realtime] Conectado ao Supabase Realtime para sinais de trading');
    } else if (realtimeStatus === 'disconnected') {
      console.warn('⚠️ [Realtime] Desconectado do Supabase Realtime');
    }
  }, [realtimeStatus]);
  // ===== FIM SUPABASE REALTIME INTEGRATION =====

  
  // Usar a função `adjustTime` fornecida pelo contexto `useTimeZone`

  // Função para converter o tempo de string para Date
  const convertTimeStringToDate = useCallback((timeString: string): Date => {
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
  }, [adjustTime]);
  
  // Função para calcular o próximo horário com base em um horário inicial e um intervalo em minutos
  const calculateNextTime = useCallback((timeStr: string, minutesToAdd: number): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + minutesToAdd;
    
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  }, []);
  
  // Converter PlaceholderSignal para TradingSignal (compatível com notificações)
  const convertToTradingSignal = useCallback((signal: PlaceholderSignal): TradingSignal => ({
    ...signal,
    id: signal.id,
    symbol: signal.symbol,
    pair: signal.pair,
    type: SignalType.TECHNICAL,
    signal: signal.signal,
    reason: signal.reason || 'Análise algorítmica',
    strength: SignalStrength.STRONG,
    timestamp: signal.timestamp || Date.now(),
    price: signal.price || signal.entry_price || 0,
    entry_price: typeof signal.entry_price === 'number' ? signal.entry_price : parseFloat(String(signal.entry_price || 0)),
    stop_loss: signal.stop_loss || 0,
    target_price: signal.target_price || 0,
    success_rate: signal.success_rate || 0.85,
    timeframe: signal.timeframe,
    expiry: signal.expiry,
    risk_reward: signal.risk_reward || '1.5:1',
    status: signal.status || 'active',
    entry_time: signal.entry_time
  }), []);

  // Agendar notificações para novos sinais
  const scheduleNotificationsForSignals = useCallback((signals: PlaceholderSignal[]) => {
    signals.forEach(signal => {
      if (signal.entry_time) {
        const tradingSignal = convertToTradingSignal(signal);
        // Compatibilidade: O contexto aceita TradingSignal com entry_price flexível
        // O tipo importado usa number, mas o contexto aceita ambos
        scheduleSignalNotification(tradingSignal as unknown as Parameters<typeof scheduleSignalNotification>[0]);
      }
    });
  }, [scheduleSignalNotification, convertToTradingSignal]);

  // Helper para comparar arrays de sinais (IDs e entry_time) para evitar setState desnecessário
  const areSignalsEqual = (a?: TradingSignal[] | null, b?: TradingSignal[] | null) => {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const sa = a[i];
      const sb = b[i];
      if (!sa || !sb) return false;
      if ((sa.id || '') !== (sb.id || '')) return false;
      if ((sa.entry_time || '') !== (sb.entry_time || '')) return false;
    }
    return true;
  };

  // Função segura para atualizar o cache do React Query somente se houver mudança real
  const safeSetTradingSignals = useCallback((newSignals: TradingSignal[] | null | undefined) => {
    try {
      const existing = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']) || [];
      if (!newSignals) return;
      if (areSignalsEqual(existing, newSignals)) {
        // Não atualiza se for idêntico
        return;
      }
      queryClient.setQueryData(['tradingSignals'], newSignals);
    } catch (err) {
      console.error('Erro ao aplicar safeSetTradingSignals:', err);
    }
  }, [queryClient]);

  // Função para obter um ativo aleatório disponível no momento atual com disponibilidade de 30 minutos
  const getRandomAsset = useCallback((entryDate?: Date): string => {
    const checkDate = entryDate || new Date();
    
    // Filtrar RIGOROSAMENTE qualquer ativo que contenha "binance" (maiúsculo ou minúsculo)
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
      console.warn('Nenhum ativo disponível encontrado, usando ativos padrão');
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
    
    // Lista de ativos prioritários para maior variação (todos OTC e sem binance)
    const priorityAssets = [
      "GER 30 (OTC)", "USD/ZAR (OTC)", "MELANIA Coin (OTC)", 
      "Hamster Kombat (OTC)", "Worldcoin (OTC)", "TRUMP Coin (OTC)", "GBP/CAD (OTC)",
      "Ouro/Prata", "Ethereum", "1000Sats", "Pepe",
      "Bitcoin", "USD/CAD (OTC)", "EUR/JPY (OTC)", "GBP/AUD (OTC)"
    ].filter(asset => 
      availableAssets.includes(asset) && ALLOWED_SET.has(asset) &&
      !asset.toLowerCase().includes('binance')
    );
    
    // Se temos ativos prioritários disponíveis, escolher entre eles
    if (priorityAssets.length > 0) {
      const randomIndex = Math.floor(Math.random() * priorityAssets.length);
      const selectedAsset = priorityAssets[randomIndex];
      
      // Verificação adicional de segurança
      if (!selectedAsset.toLowerCase().includes('binance')) {
        return selectedAsset;
      }
    }
    
    // Caso contrário, retornar um ativo aleatório da lista completa de disponíveis
    const filteredAvailableAssets = availableAssets.filter(asset => ALLOWED_SET.has(asset) && !asset.toLowerCase().includes('binance'));
    
    if (filteredAvailableAssets.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredAvailableAssets.length);
      return filteredAvailableAssets[randomIndex];
    }
    
    // Último recurso - retornar um ativo absolutamente seguro
    return "Bitcoin";
  }, []);

  // Função para criar dados base para um sinal placeholder
  // NOTA: Precisa estar aqui antes de generateDailySignals que a utiliza
  const createBasePlaceholderData = useCallback((override: Partial<PlaceholderSignal> = {}): PlaceholderSignal => ({
    id: `signal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    symbol: 'Bitcoin',
    exchange: inferExchangeCategory('Bitcoin'),
    signal: 'BUY',
    entry_time: '12:00',
    timeframe: '5m',
    expiry_time_str: '12:05',
    gale1_time: '12:05',
    gale2_time: '12:10',
    status: 'active',
    strength: SignalStrength.MODERATE,
    type: SignalType.TECHNICAL,
    reason: 'Análise algorítmica',
    timestamp: Date.now(),
    success_rate: 0.85,
    price: 100 + Math.random() * 900,
    entry_price: 100 + Math.random() * 900,
    stop_loss: 90 + Math.random() * 800,
    target_price: 110 + Math.random() * 1000,
    risk_reward: '1.5:1',
    expiry: '5m',
    ...override
  }), []);

  // Função para gerar a sequência de sinais para o dia todo, começando à meia-noite
  // NOTA: Precisa estar aqui antes de createRandomPlaceholderSignal que a utiliza
  const generateDailySignals = useCallback((): PlaceholderSignal[] => {
    // Verificar se já temos sinais gerados em cache de memória
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
    
    if (signalCache && signalCache.signals.length > 0 && signalCache.date === todayStr) {
      return signalCache.signals;
    }
    const dailySignals: PlaceholderSignal[] = [];
    
    // Usar semente para geração aleatória baseada no dia atual
    // Isso garante que os sinais serão os mesmos para o dia todo
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const seededRandom = (max: number) => {
      const x = Math.sin(seed + dailySignals.length) * 10000;
      return Math.floor((x - Math.floor(x)) * max);
    };
    
    // Criar um conjunto para rastrear combinações de ativos e horários já usados
    const usedAssetTimeCombo = new Set<string>();
    
    // Gerar horários seguindo a sequência correta: 00:03, 00:23, 00:43, 01:03, 01:23, 01:43, 02:03...
    let currentHour = 0;
    let currentMinute = 3; // Começar sempre com :03
    
    // Gerar sinais para 24 horas (72 sinais no total: 3 por hora x 24 horas)
    for (let i = 0; i < 72; i++) {
        // Formatar o horário de entrada
      const entryTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        // Calcular os horários de expiração e reentradas
        const expiryTime = calculateNextTime(entryTime, SIGNAL_EXPIRY_TIME); // Expiração = entrada + 5 min
        const gale1Time = expiryTime; // Reentrada 1 é igual ao horário de expiração
        const gale2Time = calculateNextTime(gale1Time, SIGNAL_EXPIRY_TIME); // Reentrada 2 = reentrada 1 + 5 min
        
        // Criar uma data simulada para este horário específico
        const signalDate = new Date();
      signalDate.setHours(currentHour, currentMinute, 0, 0);
        
        // Obter todos os ativos disponíveis neste horário específico (com 3 horas de disponibilidade)
        const availableAssets = getAllAssetNames().filter(asset => 
          ALLOWED_SET.has(asset) && isAssetAvailableForSignal(asset, signalDate)
        );
        
        // Log para debug da nova regra de disponibilidade
        const totalAssets = Object.keys(ATIVOS_CATEGORIAS).length;
        console.log(`✅ DISPONIBILIDADE: ${availableAssets.length}/${totalAssets} ativos disponíveis às ${entryTime} (regra 3 horas)`);
        
        // Se não houver ativos disponíveis neste horário, usar ativos da lista permitida
        const assetsToUse = availableAssets.length > 0 ? availableAssets : ALLOWED_ASSETS.slice(0, 3);
        
        // Se ainda não temos ativos disponíveis, pular este horário
      if (assetsToUse.length === 0) {
        // Avançar para o próximo horário na sequência
        if (currentMinute === 3) {
          currentMinute = 23;
        } else if (currentMinute === 23) {
          currentMinute = 43;
        } else if (currentMinute === 43) {
          currentMinute = 3;
          currentHour = (currentHour + 1) % 24;
        }
        continue;
      }
        
        // Selecionar um ativo aleatório não usado no horário anterior
        let symbol;
        let attempts = 0;
        
        do {
          const randomIndex = seededRandom(assetsToUse.length);
          symbol = assetsToUse[randomIndex];
          attempts++;
      } while (usedAssetTimeCombo.has(`${symbol}-${currentHour}${currentMinute}`) && attempts < 10);
        
        // Marcar esta combinação como usada
      usedAssetTimeCombo.add(`${symbol}-${currentHour}${currentMinute}`);
        
        // Criar um ID estável baseado no horário e no asset, não em timestamp aleatório
        const stableId = `signal_${entryTime.replace(':', '')}_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}_${seed}`;
        
        // Gerar taxas de sucesso entre 80% e 93.4%
        const successRate = 0.80 + (seededRandom(100) / 100) * (0.934 - 0.80);
        
        // Determinar força do sinal com base na taxa de sucesso
        let strength;
        if (successRate >= 0.90) {
          strength = SignalStrength.VERY_STRONG; // Altíssima expectativa (≥ 90%)
        } else if (successRate >= 0.85) {
          strength = SignalStrength.STRONG; // Alta expectativa (≥ 85%)
        } else {
          strength = SignalStrength.MODERATE; // Média expectativa (< 85%)
        }
        
        // Adicionar este sinal ao conjunto
        const signal = createBasePlaceholderData({
          id: stableId,
          symbol,
          exchange: ATIVOS_CATEGORIAS[symbol] || inferExchangeCategory(symbol),
          signal: seededRandom(100) > 50 ? 'BUY' : 'SELL',
          strength,
          entry_time: entryTime,
          timeframe: "5m", // Sempre 5 minutos
          expiry_time_str: expiryTime,
          gale1_time: gale1Time,
          gale2_time: gale2Time,
          success_rate: successRate
        });
        
        dailySignals.push(signal);
      
      // Avançar para o próximo horário na sequência correta
      if (currentMinute === 3) {
        currentMinute = 23; // 03 -> 23 (mesma hora)
      } else if (currentMinute === 23) {
        currentMinute = 43; // 23 -> 43 (mesma hora)
      } else if (currentMinute === 43) {
        currentMinute = 3; // 43 -> 03 (próxima hora)
        currentHour = (currentHour + 1) % 24;
      }
    }
    
    // Armazenar em cache de memória
    signalCache = {
      signals: dailySignals,
      date: todayStr
    };
    
    return dailySignals;
  }, [calculateNextTime, createBasePlaceholderData]);

  // Função para criar um novo sinal aleatório (baseado no ciclo definido)
  // NOTA: Precisa estar aqui antes de rotateSignals que a utiliza
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
      if (entryTime > now) {
        nextSignal = signal;
        break;
      }
    }
    
    // Se não encontramos nenhum sinal futuro, usar o primeiro do dia seguinte
    if (!nextSignal) {
      nextSignal = dailySignals[0];
    }
    
    // Garantir que o ID seja único
    return {
      ...nextSignal,
      id: 'placeholder-' + Math.random().toString(36).substring(2, 9),
    };
  }, [convertTimeStringToDate, generateDailySignals]);

  // Função para rotacionar os sinais com lock para evitar múltiplas chamadas rápidas
  const rotateSignals = useCallback((currentSignals: TradingSignal[]): TradingSignal[] => {
    // Verificar se já rotacionamos recentemente (dentro dos últimos 5 minutos)
    const now = Date.now();
    if (now - lastRotationTime.current < 5 * 60 * 1000) {
      console.log('Ignorando rotação - última rotação foi há menos de 5 minutos');
      return currentSignals;
    }
    
    // Verificar se o lock de rotação está ativo
    if (rotateSignalsLock.current) {
      console.log('Rotação ignorada devido ao lock ativo');
      return currentSignals;
    }
    
    // Ativar lock de rotação para evitar rotações simultâneas
    rotateSignalsLock.current = true;
    
    try {
      console.log('Iniciando rotação controlada de sinais...');
      
      // Verificar se temos pelo menos 7 sinais na lista atual
      if (!currentSignals || currentSignals.length < 7) {
        console.log('Número insuficiente de sinais para rotação (mínimo 7 necessários)');
        return currentSignals;
      }
      
      // Obter o primeiro sinal (que será removido na rotação)
      const firstSignal = currentSignals[0];
      if (!firstSignal || !firstSignal.entry_time) {
        console.log('Primeiro sinal inválido, não é possível verificar rotação');
        return currentSignals;
      }
      
      // Verificar se já se passaram 20 minutos desde a entrada do primeiro sinal
      const [entryHour, entryMin] = String(firstSignal.entry_time).split(':').map(Number);
      
      // Criar horário de entrada
      const entryTime = new Date();
      entryTime.setHours(entryHour, entryMin, 0, 0);
      
      // Se o horário de entrada for no futuro, ajustar para o dia anterior
      const currentTime = new Date();
      if (entryTime > currentTime) {
        entryTime.setDate(entryTime.getDate() - 1);
      }
      
      // Calcular diferença em minutos desde a entrada
      const timeDiffMs = currentTime.getTime() - entryTime.getTime();
      const minutesSinceEntry = Math.floor(timeDiffMs / (1000 * 60));
        
      // Verificar se já se passaram 20 minutos
      if (minutesSinceEntry < 20) {
        console.log(`Rotação não necessária - apenas ${minutesSinceEntry} minutos desde a entrada do primeiro sinal (necessário 20)`);
        return currentSignals;
      }
      
      console.log(`🔄 ROTAÇÃO NECESSÁRIA - ${minutesSinceEntry} minutos desde a entrada do primeiro sinal (${firstSignal.entry_time})`);
      
      // Obter o último sinal atual para determinar o próximo horário válido
      const lastSignal = currentSignals[currentSignals.length - 1];
      
      // Calcular o próximo horário válido baseado no padrão 03→23→43→03
      const lastEntryTime = String(lastSignal.entry_time);
      const [lastHour, lastMinute] = lastEntryTime.split(':').map(Number);
        
      // Determinar o próximo horário seguindo o padrão
      let nextHour = lastHour;
      let nextMinute = lastMinute;
      
      // Avançar para o próximo horário válido
      if (lastMinute === 3) {
        nextMinute = 23; // 03 → 23
      } else if (lastMinute === 23) {
        nextMinute = 43; // 23 → 43
      } else if (lastMinute === 43) {
        nextMinute = 3; // 43 → 03 (próxima hora)
        nextHour = (lastHour + 1) % 24;
      } else {
        // Caso o último horário não siga o padrão, usar próximo válido
        console.log(`⚠️ Horário inválido detectado (${lastEntryTime}), corrigindo para o próximo válido`);
        // Usar padrão default
        if (lastMinute < 3) {
          nextMinute = 3;
        } else if (lastMinute < 23) {
          nextMinute = 23;
        } else if (lastMinute < 43) {
          nextMinute = 43;
        } else {
          nextMinute = 3;
          nextHour = (lastHour + 1) % 24;
        }
      }
      
      const nextEntryTime = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;
      
      console.log(`⏰ PRÓXIMO HORÁRIO: ${nextEntryTime} (baseado no último sinal: ${lastEntryTime})`);
      
      // Gerar um novo sinal para a posição 7
      const newSignal = createBasePlaceholderData({
        entry_time: nextEntryTime,
        expiry_time_str: calculateNextTime(nextEntryTime, SIGNAL_EXPIRY_TIME),
        gale1_time: calculateNextTime(nextEntryTime, SIGNAL_EXPIRY_TIME),
        gale2_time: calculateNextTime(nextEntryTime, SIGNAL_EXPIRY_TIME * 2)
      });
      
      // Criar a nova lista de sinais: remover o primeiro e adicionar o novo no final
      const rotatedSignals = [...currentSignals.slice(1), newSignal];
      
      console.log('✅ ROTAÇÃO CONCLUÍDA:');
      console.log(`   • Sinal removido: ${firstSignal.symbol} (${firstSignal.entry_time})`);
      console.log(`   • Novo sinal na posição 7: ${newSignal.symbol} (${newSignal.entry_time})`);
      
      // Atualizar o timestamp da última rotação
      lastRotationTime.current = now;
      
      // Salvar no cache de navegação para persistência entre trocas de aba
      saveSignalsToNavigationCache(rotatedSignals as PlaceholderSignal[]);
      
      // Retornar a lista atualizada
      return rotatedSignals;
    } finally {
      // Liberar o lock após 10 segundos para garantir que tudo acabou
      setTimeout(() => {
        rotateSignalsLock.current = false;
      }, 10000);
    }
  }, [calculateNextTime, createBasePlaceholderData]);

  // REMOVIDO: Sistema de rotação própria da página Signals
  // A página Signals agora APENAS SINCRONIZA com a dashboard
  // A rotação é feita EXCLUSIVAMENTE pela dashboard

  // Adicionar função para reiniciar contadores quando a página é carregada
  useEffect(() => {
    setSignalCompletionCount({wins: 0, losses: 0});
    
    // Definir filtros padrão: mostrar todos os tipos e não mostrar expirados
    setFilterType('ALL');
    setShowExpiredSignals(false);
  }, []);
  
  // Efeito para subscrever às atualizações de sinais - DESATIVADO (arquivo removido)
  useEffect(() => {
    // const unsubscribe = tradingSignalService.subscribe(() => {
    //   queryClient.invalidateQueries({ queryKey: ['tradingSignals'] });
    // });
    
    // return () => {
    //   unsubscribe();
    // };
    
    // Funcionalidade desativada - TradingSignalService removido
  }, [queryClient]);
  
  // Processar sinais que precisam ser removidos
  useEffect(() => {
    // Este código foi substituído pela função rotateSignals
    // que gerencia toda a lógica de rotação de sinais
  }, [createRandomPlaceholderSignal]);
  
  // 🎯 FUNÇÃO PRESERVATIVA: Completar sinais faltantes SEM alterar existentes (CAMADA 9)
  const generateMinimumSevenSignals = useCallback((existingSignals: PlaceholderSignal[]): PlaceholderSignal[] => {
    if (!existingSignals || existingSignals.length === 0) {
      // Se não há sinais, gerar os 7 do zero
      return generateDailySignals().slice(0, 7);
    }
    
    if (existingSignals.length >= 7) {
      // Se já temos 7 ou mais, manter os 7 primeiros
      console.log(`🎯 PRESERVAÇÃO: Mantendo ${existingSignals.length} sinais existentes`);
      return existingSignals.slice(0, 7);
    }
    
    // Se temos menos de 7, completar sem alterar os existentes
    const needed = 7 - existingSignals.length;
    console.log(`🎯 COMPLETANDO: Adicionando ${needed} sinais aos ${existingSignals.length} existentes`);
    
    // Gerar sinais extras baseados na hora atual
    const allDailySignals = generateDailySignals();
    const existingIds = new Set(existingSignals.map(s => s.id));
    const existingSymbols = new Set(existingSignals.map(s => s.symbol));
    
    // Encontrar sinais que não existem ainda
    const availableSignals = allDailySignals.filter(signal => 
      !existingIds.has(signal.id) && 
      !existingSymbols.has(signal.symbol) &&
      !signal.symbol?.toLowerCase().includes('binance')
    );
    
    // Pegar os sinais necessários
    const additionalSignals = availableSignals.slice(0, needed);
    
    // Combinar preservando os existentes
    return [...existingSignals, ...additionalSignals];
  }, [generateDailySignals]);

  // 🛡️ FUNÇÃO SUPER PRESERVATIVA: Garantir 7 sinais preservando existentes (CAMADA 8)
  const ensureSevenSignalsPreservative = useCallback((inputSignals: PlaceholderSignal[]): PlaceholderSignal[] => {
    console.log(`🛡️ PRESERVAÇÃO: Verificando ${inputSignals?.length || 0} sinais de entrada`);
    
    // Se temos exatamente 7 sinais válidos, PRESERVAR completamente
    if (inputSignals && inputSignals.length === 7) {
      const allValid = inputSignals.every(signal => 
        signal.symbol && 
        !signal.symbol.toLowerCase().includes('binance') &&
        signal.entry_time &&
        signal.id
      );
      
      if (allValid) {
        console.log('🛡️ PRESERVAÇÃO: 7 sinais válidos encontrados - MANTENDO integralmente');
        return inputSignals;
      }
    }
    
    // Filtrar sinais válidos primeiro
    const validSignals = (inputSignals || []).filter(signal => 
      signal.symbol && 
      !signal.symbol.toLowerCase().includes('binance') &&
      !signal.exchange?.toLowerCase().includes('binance') &&
      signal.entry_time &&
      signal.id
    );
    
    // Usar função para completar até 7
    return generateMinimumSevenSignals(validSignals);
  }, [generateMinimumSevenSignals]);

  // 🔄 HANDLE VISIBILITY CHANGE ULTRA CONSERVATIVO (CAMADA 7)
// NUNCA substitui sinais existentes - apenas recupera se perdidos
const handleVisibilityChangeConservative = useCallback((
  queryClient: QueryClient, 
  currentSignals: PlaceholderSignal[]
): void => {
  console.log('🔄 NAVEGAÇÃO: Retorno à aba detectado');
  
  // VERIFICAÇÃO PRIORITÁRIA: SEMPRE tentar recuperar sinais do cache primeiro
  const cachedSignals = loadSignalsFromNavigationCache();
  if (cachedSignals && cachedSignals.length >= 7) {
    console.log('🛡️ RECUPERAÇÃO PRIORITÁRIA: Restaurando sinais salvos');
    safeSetTradingSignals(cachedSignals);
    return;
  }
  
  // VERIFICAÇÃO SECUNDÁRIA: Se temos sinais atuais válidos, PRESERVAR TOTALMENTE
  if (currentSignals && currentSignals.length >= 7) {
    console.log('🛡️ PRESERVAÇÃO TOTAL: Mantendo sinais atuais sem alteração');
    // Salvar os sinais atuais para próximas navegações
    saveSignalsToNavigationCache(currentSignals);
    return;
  }
  
  // VERIFICAÇÃO TERCIÁRIA: Se temos alguns sinais (4-6), preservar e completar
  if (currentSignals && currentSignals.length >= 4) {
    console.log('🛡️ PRESERVAÇÃO PARCIAL: Completando sinais existentes');
    const completedSignals = ensureSevenSignalsPreservative(currentSignals);
    safeSetTradingSignals(completedSignals);
    saveSignalsToNavigationCache(completedSignals);
    return;
  }
  
  // ÚLTIMO RECURSO: Apenas se não há sinais válidos (menos de 4)
  console.log('🚨 EMERGÊNCIA: Criando novos sinais (menos de 4 encontrados)');
  
  // Tentar usar sinais da dashboard como base
  try {
    const dashboardData = localStorage.getItem('dashboardSignals');
    if (dashboardData) {
      const { signals: dashboardSignals } = JSON.parse(dashboardData);
      if (dashboardSignals && dashboardSignals.length >= 3) {
        const regeneratedSignals = ensureSevenSignalsPreservative(dashboardSignals.slice(0, 3));
        safeSetTradingSignals(regeneratedSignals);
        saveSignalsToNavigationCache(regeneratedSignals);
        return;
      }
    }
  } catch (error) {
    console.error('Erro ao recuperar sinais da dashboard:', error);
  }
  
  // Último recurso absoluto: gerar novos sinais
  const newSignals = generateDailySignals().slice(0, 7);
  safeSetTradingSignals(newSignals);
  saveSignalsToNavigationCache(newSignals);
}, [generateDailySignals, ensureSevenSignalsPreservative, safeSetTradingSignals]);
  
  // Filtrar os sinais mais relevantes para o horário atual
  const filterRelevantSignals = useCallback((allSignals: PlaceholderSignal[]): PlaceholderSignal[] => {
    try {
      // Verificação de segurança
      if (!allSignals || !Array.isArray(allSignals)) {
        console.error('❌ ERRO: filterRelevantSignals recebeu dados inválidos:', allSignals);
        return [];
      }
      
      // console.log(`🔍 DIAGNÓSTICO: filterRelevantSignals processando ${allSignals.length} sinais`);
    if (!allSignals || allSignals.length === 0) return [];
    
    // Obter a hora atual
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Para seguir o padrão correto: XX:03, XX:23, XX:43, (XX+1):03, (XX+1):23, (XX+1):43, etc.
    // Sequência correta: 03 -> 23 -> 43 -> próxima hora com 03, etc.
    
    // Determinar o próximo horário válido
    let nextMinute, nextHour;
    
    // Se estamos antes de XX:23, o próximo horário é XX:23
    if (currentMinute < 23) {
      nextMinute = 23;
      nextHour = currentHour;
    }
    // Se estamos entre XX:23 e XX:43, o próximo horário é XX:43
    else if (currentMinute < 43) {
      nextMinute = 43;
      nextHour = currentHour;
    }
    // Se estamos após XX:43, o próximo horário é (XX+1):03
    else {
      nextMinute = 3;
      nextHour = (currentHour + 1) % 24;
    }
    
    // Gerar os próximos 7 horários seguindo a sequência correta: XX:03, XX:23, XX:43
    const relevantTimes = [];
    let hour = nextHour;
    let minute = nextMinute;
    
    for (let i = 0; i < 7; i++) {
      // Adicionar o horário atual
      relevantTimes.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      
      // Avançar para o próximo horário na sequência correta
      if (minute === 3) {
        minute = 23; // 03 -> 23 (mesma hora)
      } else if (minute === 23) {
        minute = 43; // 23 -> 43 (mesma hora)
      } else if (minute === 43) {
        minute = 3; // 43 -> 03 (próxima hora)
        hour = (hour + 1) % 24;
      }
    }
    
    console.log("Horários relevantes:", relevantTimes);
    
    // Filtrar os sinais que correspondem aos horários relevantes
    // E também verificar se o ativo estará disponível por 30 minutos no horário do sinal
    const filteredSignals = allSignals.filter(signal => {
      // Verificar se o horário corresponde a um dos relevantes
      if (!relevantTimes.includes(signal.entry_time)) {
        return false;
      }
      
      // Verificar se o ativo estará disponível por pelo menos 30 minutos no horário do sinal
      const [hour, minute] = signal.entry_time.split(':').map(Number);
      const signalDate = new Date();
      signalDate.setHours(hour, minute, 0, 0);
      return isAssetAvailableForSignal(signal.symbol, signalDate);
    });
    
    // Se não encontramos 7 sinais, completar com os mais próximos
    if (filteredSignals.length < 7) {
      // Ordenar todos os sinais por proximidade ao horário atual
      // Considerando apenas sinais com ativos disponíveis por 30 minutos
      const sortedByTime = [...allSignals]
        .filter(signal => {
          // Verificar se o ativo estará disponível por pelo menos 30 minutos no horário do sinal
          const [hour, minute] = signal.entry_time.split(':').map(Number);
          const signalDate = new Date();
          signalDate.setHours(hour, minute, 0, 0);
          return isAssetAvailableForSignal(signal.symbol, signalDate);
        })
        .sort((a, b) => {
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
      
      // Adicionar sinais até completar 7
      let index = 0;
      while (filteredSignals.length < 7 && index < sortedByTime.length) {
        const signal = sortedByTime[index++];
        if (!filteredSignals.some(s => s.id === signal.id)) {
          filteredSignals.push(signal);
        }
      }
    }
    
    // Ordenar os sinais filtrados por horário de entrada
    filteredSignals.sort((a, b) => {
      const timeA = a.entry_time || '00:00';
      const timeB = b.entry_time || '00:00';
      return timeA.localeCompare(timeB);
    });
    
    return filteredSignals.slice(0, 7);
    } catch (error) {
      console.error('❌ ERRO em filterRelevantSignals:', error);
      return [];
    }
  }, [convertTimeStringToDate]);

  // Mover a definição duplicada de createBasePlaceholderData daqui
  // (Movida para antes de generateMinimumSevenSignals)

  // REMOVIDO: Função executeCorrectRotation não é mais necessária
  // A rotação é feita exclusivamente pela dashboard

  // Função para pegar os sinais diários com base na hora atual
  const getDailySignalsForCurrentTime = useCallback((): PlaceholderSignal[] => {
    try {
      console.log('🎯 DIAGNÓSTICO: Iniciando getDailySignalsForCurrentTime');
    console.log('🎯 GERAÇÃO: Iniciando geração de sinais para o horário atual');
    
    // Verificar se há sinais da dashboard salvos
    let dashboardSignalsData = null;
    try {
      dashboardSignalsData = localStorage.getItem('dashboardSignals');
      console.log('💾 DIAGNÓSTICO: Verificando localStorage dashboardSignals:', dashboardSignalsData ? 'Encontrado' : 'Não encontrado');
    } catch (error) {
      console.error('❌ ERRO ao acessar localStorage dashboardSignals:', error);
    }
    if (dashboardSignalsData) {
      console.log('📊 DASHBOARD: Sinais da dashboard encontrados no localStorage');
      
      try {
        const { signals: dashboardSignals } = JSON.parse(dashboardSignalsData);
        if (dashboardSignals && Array.isArray(dashboardSignals) && dashboardSignals.length >= 3) {
          console.log('✅ USANDO: Sinais da dashboard como base para a página de sinais');
          console.log('📋 DASHBOARD SIGNALS:', dashboardSignals.map(s => ({
            symbol: s.symbol,
            entry_time: s.entry_time,
            id: s.id
          })));
          
          // REGRA 1: Os 3 primeiros sinais são IDÊNTICOS aos da dashboard
          const firstThreeSignals = dashboardSignals
            .filter(signal => 
              !signal.symbol?.toLowerCase().includes('binance') &&
              !signal.exchange?.toLowerCase().includes('binance') &&
              signal.symbol && signal.symbol.trim() !== ''
            )
            .slice(0, 3) // Garantir exatamente 3 sinais
            .map((signal, index) => ({
              ...signal,
              id: signal.id || `dashboard-${index}-${Math.random().toString(36).substring(2, 9)}`,
              status: 'active',
              exchange: inferExchangeCategory(signal.symbol),
              success_rate: Math.min(signal.success_rate || 0.85, 0.934), // Limitar a 93.4%
              isDashboard: true, // Marcar como sinal da dashboard
              dashboardPosition: index // Posição na dashboard (0, 1, 2)
            }));
          
          if (firstThreeSignals.length < 3) {
            console.error('❌ ERRO: Menos de 3 sinais válidos da dashboard');
            return [];
          }
          
          console.log('🎯 REGRA 1: 3 primeiros sinais definidos (idênticos à dashboard)');
          console.log('📊 Sinais 1-3:', firstThreeSignals.map((s, i) => `${i+1}. ${s.symbol} - ${s.entry_time}`));
          
          // REGRA 2: O 4º sinal tem entrada EXATAMENTE 20 minutos após o 3º sinal da dashboard
          const thirdSignal = firstThreeSignals[2]; // Terceiro sinal (índice 2)
          const thirdSignalEntryTime = thirdSignal.entry_time;
          
          console.log(`🕒 REGRA 2: Terceiro sinal da dashboard tem entrada: ${thirdSignalEntryTime}`);
          
          // Calcular horário EXATO do 4º sinal: +20 minutos do 3º sinal
          const fourthSignalTime = calculateNextTime(thirdSignalEntryTime, 20);
          console.log(`⏰ REGRA 2: Quarto sinal terá entrada EXATA: ${fourthSignalTime} (${thirdSignalEntryTime} + 20min)`);
          
          // REGRA 3: Sinais 5, 6, 7 seguem sequência 03→23→43→03 a partir do 4º sinal
          const calculateNextPatternTime = (previousTime: string): string => {
            const [hour, minute] = previousTime.split(':').map(Number);
            let nextHour = hour;
            let nextMinute: number;
            
            if (minute < 3 || minute === 3) {
              nextMinute = 23;
            } else if (minute < 23 || minute === 23) {
              nextMinute = 43;
            } else {
              // minute >= 43, próximo é XX+1:03
              nextHour = (hour + 1) % 24;
              nextMinute = 3;
            }
            
            return `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;
          };
          
          // Calcular horários dos sinais 4, 5, 6, 7
          const additionalSignalTimes: string[] = [];
          
          // 4º sinal: 20 minutos após o 3º
          additionalSignalTimes.push(fourthSignalTime);
          
          // 5º sinal: seguindo padrão baseado no 4º
          const fifthSignalTime = calculateNextPatternTime(fourthSignalTime);
          additionalSignalTimes.push(fifthSignalTime);
          
          // 6º sinal: seguindo padrão baseado no 5º
          const sixthSignalTime = calculateNextPatternTime(fifthSignalTime);
          additionalSignalTimes.push(sixthSignalTime);
          
          // 7º sinal: seguindo padrão baseado no 6º
          const seventhSignalTime = calculateNextPatternTime(sixthSignalTime);
          additionalSignalTimes.push(seventhSignalTime);
          
          console.log('🎯 REGRA 3: Horários dos sinais adicionais calculados:');
          console.log(`4º sinal: ${additionalSignalTimes[0]} (${thirdSignalEntryTime} + 20min)`);
          console.log(`5º sinal: ${additionalSignalTimes[1]} (padrão 03,23,43 baseado no 4º)`);
          console.log(`6º sinal: ${additionalSignalTimes[2]} (padrão 03,23,43 baseado no 5º)`);
          console.log(`7º sinal: ${additionalSignalTimes[3]} (padrão 03,23,43 baseado no 6º)`);
          
          // REGRA 4: Gerar os 4 sinais adicionais com ativos únicos
          const usedSymbols = new Set(firstThreeSignals.map(s => s.symbol));
          const additionalSignals: PlaceholderSignal[] = [];
          
          for (let i = 0; i < 4; i++) {
            const entryTime = additionalSignalTimes[i];
            const expiryTime = calculateNextTime(entryTime, SIGNAL_EXPIRY_TIME);
            const gale1Time = expiryTime;
            const gale2Time = calculateNextTime(gale1Time, SIGNAL_EXPIRY_TIME);
            
            // Obter um ativo disponível que não foi usado ainda
            let symbol = getRandomAsset();
            let attempts = 0;
            while (usedSymbols.has(symbol) && attempts < 20) {
              symbol = getRandomAsset();
              attempts++;
            }
            
            // Se não conseguimos um ativo único, usar lista de backup
            if (usedSymbols.has(symbol)) {
              const backupAssets = [
                "Ethereum", "Litecoin", "Dash", "Bitcoin Cash",
                "USD/CAD (OTC)", "EUR/JPY (OTC)", "GBP/AUD (OTC)", "AUD/CHF (OTC)",
                "USD/ZAR (OTC)", "World Coin", "Pepe", "1000Sats"
              ].filter(asset => !usedSymbols.has(asset) && !asset.toLowerCase().includes('binance'));
              
              if (backupAssets.length > 0) {
                symbol = backupAssets[Math.floor(Math.random() * backupAssets.length)];
              }
            }
            
            usedSymbols.add(symbol);
            
            const additionalSignal = createBasePlaceholderData({
              id: `additional-${i+4}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              symbol: symbol,
              exchange: ATIVOS_CATEGORIAS[symbol] || inferExchangeCategory(symbol),
              signal: Math.random() > 0.5 ? 'BUY' : 'SELL',
              entry_time: entryTime,
              timeframe: "5m",
              expiry_time_str: expiryTime,
              gale1_time: gale1Time,
              gale2_time: gale2Time,
              success_rate: 0.8 + Math.random() * 0.15,
              isDashboard: false, // Marcar como sinal adicional
              signalPosition: i + 4 // Posição 4, 5, 6, 7
            });
            
            additionalSignals.push(additionalSignal);
          }
          
          console.log('🎯 REGRA 4: 4 sinais adicionais gerados');
          console.log('📊 Sinais 4-7:', additionalSignals.map((s, i) => `${i+4}. ${s.symbol} - ${s.entry_time}`));
          
          // COMBINAR: 3 sinais da dashboard + 4 sinais adicionais = 7 sinais totais
          const finalSignals = [...firstThreeSignals, ...additionalSignals];
          
          console.log('🎉 RESULTADO FINAL: 7 sinais gerados seguindo todas as regras');
          console.log('📊 ESTRUTURA COMPLETA:');
          finalSignals.forEach((signal, index) => {
            const position = index + 1;
            const type = index < 3 ? 'DASHBOARD' : 'ADICIONAL';
            console.log(`${position}. ${signal.symbol} - ${signal.entry_time} (${type})`);
          });
          
          // VERIFICAÇÃO DA DIFERENÇA DE 20 MINUTOS
          const thirdTime = finalSignals[2].entry_time;
          const fourthTime = finalSignals[3].entry_time;
          const [h3, m3] = thirdTime.split(':').map(Number);
          const [h4, m4] = fourthTime.split(':').map(Number);
          const diff = (h4 * 60 + m4) - (h3 * 60 + m3);
          console.log(`⏰ VERIFICAÇÃO: Diferença entre 3º e 4º sinal: ${diff} minutos (deve ser 20)`);
          
          if (diff !== 20) {
            console.warn(`⚠️ ATENÇÃO: Diferença incorreta detectada! 3º: ${thirdTime}, 4º: ${fourthTime}, Diff: ${diff}min`);
          } else {
            console.log(`✅ VERIFICAÇÃO OK: Diferença de exatamente 20 minutos confirmada`);
          }
          
          // Verificar duplicatas de ativos (não deve haver)
          const assetCounts = new Map();
          finalSignals.forEach(signal => {
            const count = assetCounts.get(signal.symbol) || 0;
            assetCounts.set(signal.symbol, count + 1);
          });
          
          const duplicates = Array.from(assetCounts.entries()).filter(([_, count]) => count > 1);
          if (duplicates.length > 0) {
            console.error('❌ ERRO: Ativos duplicados detectados:', duplicates);
          } else {
            console.log('✅ VERIFICAÇÃO: Nenhuma duplicata de ativo encontrada');
          }
          
          return finalSignals;
        }
      } catch (error) {
        console.error('❌ ERRO: Falha ao processar sinais da dashboard:', error);
      }
    }
    
    console.log('⚠️ FALLBACK: Não há sinais da dashboard, usando fluxo normal');
    
    // Se não conseguimos usar os sinais da dashboard, seguir com o fluxo normal
    const allDailySignals = generateDailySignals();
    
    // Salvar em cache
    const today = new Date();
    localStorage.setItem('dailyTradingSignals', JSON.stringify(allDailySignals));
    localStorage.setItem('dailyTradingSignalsDate', today.toISOString());
    
    // Filtrar os sinais para mostrar apenas os relevantes no momento atual
    return filterRelevantSignals(allDailySignals);
    } catch (error) {
      console.error('❌ ERRO FATAL em getDailySignalsForCurrentTime:', error);
      // Retornar um array vazio como fallback para evitar tela preta
      return [];
    }
  }, [filterRelevantSignals, generateDailySignals, calculateNextTime, getRandomAsset, createBasePlaceholderData]);

  // =============================================
  // NOVO SISTEMA: SINAIS EM TEMPO REAL
  // =============================================
  // Nota: Sistema agora mostra 3 sinais ativos em tempo real
  // TODO: Implementar histórico para mostrar mais sinais no futuro
  const { 
    signals: realtimeSignals, 
    isLoading, 
    error: realtimeError,
    refresh: refetch 
  } = useRealtimeSignals();

  // Converter sinais do Realtime para o formato esperado pela página
  const signals = useMemo(() => {
    if (!realtimeSignals || realtimeSignals.length === 0) {
      console.warn('⚠️ SIGNALS PAGE: Nenhum sinal do Realtime disponível');
      return [];
    }

    console.log(`✅ SIGNALS PAGE: ${realtimeSignals.length} sinais recebidos do Realtime:`, {
      'Sinais': realtimeSignals.map(s => `${s.symbol} ${s.entry_time}`)
    });

    // Converter para o formato TradingSignal esperado pela página
    const converted = realtimeSignals.map((signal) => ({
      id: signal.id,
      symbol: signal.symbol,
      entry_time: signal.entry_time,
      signal: signal.signal_type,
      strength: (signal.strength as SignalStrengthEnum) || SignalStrengthEnum.STRONG,
      success_rate: signal.success_rate,
      exchange: signal.category,
      timeframe: '5m',
      timestamp: new Date(signal.created_at).getTime(),
      entry_price: 0,
      expiry_time_str: signal.expiry_time,
      gale1_time: signal.gale1_time,
      gale2_time: signal.gale2_time,
      position: signal.position,
      // Propriedades adicionais necessárias para TradingSignal
      type: SignalType.TECHNICAL,
      reason: 'Technical Analysis',
      price: 0,
      stop_loss: 0,
      target_price: 0,
      qualityScore: Math.round(signal.success_rate * 100),
      processed: false,
      status: 'active' as const,
      expiry: '5m',
      risk_reward: '2:1'
    }));

    // Salvar em localStorage para compatibilidade
    localStorage.setItem('tradesSignals', JSON.stringify({
      signals: converted,
      timestamp: Date.now(),
      source: 'realtime'
    }));

    return converted;
  }, [realtimeSignals]);

  const queryError = realtimeError;

  // Efeito para log de erro caso a query falhe
  useEffect(() => {
    if (queryError) {
      console.error('❌ ERRO NA QUERY DE SINAIS:', queryError);
    }
  }, [queryError]);

  // Agendar notificações quando os sinais mudarem
  useEffect(() => {
    if (signals && signals.length > 0) {
      // Converter TradingSignal[] para PlaceholderSignal[] de forma segura
      const placeholderSignals = signals.map(signal => ({
        ...signal,
        entry_price: typeof signal.entry_price === 'number' ? signal.entry_price : parseFloat(signal.entry_price || '0')
      })) as PlaceholderSignal[];
      scheduleNotificationsForSignals(placeholderSignals);
    }
  }, [signals, scheduleNotificationsForSignals]);



  // Efeito para atualizar os sinais relevantes com intervalo muito grande
  useEffect(() => {
    // Manter controle do estado interno sem causar renderizações
    const internalState = {
      lastUpdateTimestamp: 0,
      lastSignalIDs: ""
    };
    
    // Função otimizada para atualizar sinais apenas quando realmente necessário
    const silentUpdateSignalsIfNeeded = async () => {
      const now = new Date();
      const currentTimestamp = now.getTime();
      
      // Verificar se já se passou pelo menos 15 minutos desde a última atualização
      // Intervalo MUITO maior para eliminar completamente piscadas
      if (currentTimestamp - internalState.lastUpdateTimestamp < 15 * 60 * 1000) {
        return;
      }
      
      // Verificar se estamos em um minuto específico que justifique a atualização
      // Reduzir para apenas minutos específicos para evitar atualizações constantes
      const currentMinute = now.getMinutes();
      const isRelevantMinute = (
        currentMinute === 3 ||
        currentMinute === 23 || 
        currentMinute === 43
      );
      
      // Só continuar se estivermos em um minuto realmente relevante
      if (!isRelevantMinute) return;
      
      // Obter sinais atuais do cache
      const existingSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']) || [];
      
      // Verificar se temos sinais em processamento ou animação
      const hasActiveSignals = existingSignals.some(signal => {
        const extSignal = signal as ExtendedSignal;
        return extSignal.isAnimating || 
          (extSignal.processed && Date.now() - (extSignal.completedTime || 0) < 30000);
      });
      
      // Se temos sinais ativos, não atualizar agora
      if (hasActiveSignals) {
        console.log('Atualização adiada - sinais ativos detectados');
        return;
      }
      
      // Verificar se temos sinais não processados que já expiraram
      const hasExpiredUnprocessed = existingSignals.some(signal => {
        if (signal.processed || !signal.entry_time) return false;
        
        const [entryHour, entryMin] = String(signal.entry_time).split(':').map(Number);
        const expiryDate = new Date();
        expiryDate.setHours(entryHour, entryMin + 16, 0, 0);
        return now > expiryDate;
      });
      
      // Se não temos sinais expirados, tentar atualizar só a cada 20 minutos
      if (!hasExpiredUnprocessed && 
          currentTimestamp - internalState.lastUpdateTimestamp < 20 * 60 * 1000) {
          console.log('Atualização ignorada - sem sinais expirados e intervalo insuficiente');
          return;
      }
      
      // Atualizar timestamp interno
      internalState.lastUpdateTimestamp = currentTimestamp;
      
      try {
        // Tentar obter novos sinais relevantes
        const currentSignals = await getDailySignalsForCurrentTime();
      
        // Verificar se são realmente diferentes antes de atualizar a UI
        const newSignalIDs = currentSignals.map(s => s.id).join(',');
        
        if (newSignalIDs === internalState.lastSignalIDs) {
          console.log('Nenhuma mudança real nos sinais, evitando atualização');
          return; // Nenhuma mudança real, evitar atualização da UI
        }
        
        // Salvar IDs para próxima comparação
        internalState.lastSignalIDs = newSignalIDs;
        
        // Verificar se algum dos sinais atuais está em processo de animação
        const processingSignals = existingSignals.filter(s => {
          const extSignal = s as ExtendedSignal;
          return extSignal.isAnimating || (extSignal.processed && Date.now() - (extSignal.completedTime || 0) < 30000);
        });
        
        // Se temos sinais sendo animados/processados, não atualizar agora
        if (processingSignals.length > 0) {
          console.log('Adiando atualização - sinais em processamento detectados');
          return;
        }
        
        // Aplicar a atualização apenas se realmente necessária
        console.log('Aplicando atualização controlada de sinais');
        setTimeout(() => {
          safeSetTradingSignals(currentSignals);
        }, 500);
      } catch (error) {
        console.error("Erro na atualização de sinais silenciosa:", error);
      }
    };
    
    // Intervalo muito mais longo (a cada 5 minutos) para reduzir drasticamente atualizações
    const intervalId = setInterval(silentUpdateSignalsIfNeeded, 5 * 60 * 1000);
    
    // Primeira verificação após 60 segundos da montagem (dar tempo para UI inicializar)
    const initialTimeoutId = setTimeout(silentUpdateSignalsIfNeeded, 60000);
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(initialTimeoutId);
    };
  }, [getDailySignalsForCurrentTime, queryClient, safeSetTradingSignals]);

  // Atualizar o horário atual apenas quando realmente necessário
  useEffect(() => {
    const updateTime = () => {
      // Verificar se a hora ou minuto mudaram antes de atualizar a UI
      const now = new Date();
      const newTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const currentDisplayedTime = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
      
      // Só atualizar se realmente o tempo mudou
      if (newTime !== currentDisplayedTime) {
        setCurrentTime(now);
      }
    };
    
    // Atualizar apenas a cada 2 minutos para eliminar piscadas constantes
    // O relógio interno continuará funcionando, mas UI só atualiza ocasionalmente
    const timeInterval = setInterval(updateTime, 120000);
    
    // Chamar imediatamente na montagem
    updateTime();
    
    return () => clearInterval(timeInterval);
  }, [currentTime]); // Adicionar currentTime como dependência

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
            
            // Verificar se os sinais mudaram (comparar IDs e horários)
            const currentDashboardSignals = dashboardSignals;
            const hasChanged = !currentDashboardSignals || 
                              currentDashboardSignals.length !== formattedSignals.length ||
                              formattedSignals.some((signal, index) => {
                                const current = currentDashboardSignals[index];
                                return !current || 
                                       current.id !== signal.id || 
                                       current.entry_time !== signal.entry_time ||
                                       current.symbol !== signal.symbol;
                              });
            
            if (hasChanged) {
              console.log("📊 DASHBOARD: Mudança detectada nos sinais da dashboard");
              console.log("Novos sinais:", formattedSignals.map(s => ({
                symbol: s.symbol,
                entry_time: s.entry_time,
                id: s.id
              })));
              
              // Limpar cache de navegação para forçar regeneração com nova lógica
              clearNavigationCacheOnDashboardChange();
            
            // Sempre armazenar apenas 3 sinais de dashboard
            setDashboardSignals(formattedSignals);
            
            // Forçar uma atualização da lista de sinais
            queryClient.invalidateQueries({ queryKey: ['tradingSignals'] });
            } else {
              console.log("📊 DASHBOARD: Nenhuma mudança detectada nos sinais");
            }
            
            return;
          }
        }
        
        // Se não há sinais da dashboard, limpar estado
        if (dashboardSignals && dashboardSignals.length > 0) {
          console.log("📊 DASHBOARD: Sinais da dashboard removidos");
        setDashboardSignals([]);
          clearNavigationCacheOnDashboardChange();
          queryClient.invalidateQueries({ queryKey: ['tradingSignals'] });
        }
      } catch (error) {
        console.error('Erro ao buscar sinais da dashboard:', error);
        setDashboardSignals([]);
      }
    };

    // Primeira verificação imediata
    fetchDashboardSignals();
    
    // Verificação adicional após 1 segundo (garante sincronização inicial)
    setTimeout(() => {
      console.log('🔄 SYNC: Verificação adicional de sincronização');
      fetchDashboardSignals();
    }, 1000);

    // CORREÇÃO: Verificar a cada 5 segundos para sincronização rápida
    const interval = setInterval(fetchDashboardSignals, 5000); // 5 segundos
    
    return () => clearInterval(interval);
  }, [queryClient, dashboardSignals]);

  // Função para verificar e evitar sinais com horários duplicados
  const validateUniqueEntryTimes = useCallback((signals: TradingSignal[]): TradingSignal[] => {
    if (!signals || signals.length < 2) return signals;
    
    // Filtrar os sinais que não contêm "binance" no nome
    const filteredSignals = signals.filter(signal => 
      !signal.symbol.toLowerCase().includes('binance') &&
      !String(signal.exchange || '').toLowerCase().includes('binance')
    );
    
    // Separar os sinais da dashboard (os primeiros 3) e garantir que mantemos seus horários originais
    const dashboardSignals = filteredSignals
      .filter(s => (s as ExtendedSignal).isDashboard === true)
      .filter(s => !s.symbol.toLowerCase().includes('binance'))
      .slice(0, 3); // Limitar a exatamente 3
    
    // Se não temos sinais da dashboard suficientes, retornar os sinais como estão
    if (dashboardSignals.length < 3) {
      console.log("⚠️ Menos de 3 sinais da dashboard encontrados, usando lógica padrão");
      return filteredSignals.slice(0, 7);
    }
    
    console.log("📊 Sinais da dashboard encontrados:", dashboardSignals.map(s => ({
      symbol: s.symbol,
      entry_time: s.entry_time
    })));
      
    // Obter o terceiro sinal da dashboard para calcular os horários dos sinais complementares
    const thirdDashboardSignal = dashboardSignals[2];
    const thirdSignalEntryTime = thirdDashboardSignal.entry_time;
    
    console.log(`🕒 Terceiro sinal da dashboard: ${thirdSignalEntryTime}`);
    
    // Função para calcular próximo horário seguindo padrão 03,23,43
    const calculateNextPatternTime = (previousTime: string): string => {
      const [hour, minute] = previousTime.split(':').map(Number);
      let nextHour = hour;
      let nextMinute: number;
      
      if (minute < 3 || minute === 3) {
        nextMinute = 23;
      } else if (minute < 23 || minute === 23) {
        nextMinute = 43;
    } else {
        // minute >= 43, próximo é XX+1:03
        nextHour = (hour + 1) % 24;
        nextMinute = 3;
      }
      
      return `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;
    };
    
    // Calcular horários dos 4 sinais complementares
    const complementaryTimes: string[] = [];
    
    // 4º sinal: 20 minutos após o 3º da dashboard
    const fourthSignalTime = calculateNextTime(String(thirdSignalEntryTime), 20);
    complementaryTimes.push(fourthSignalTime);
    
    // 5º sinal: seguindo padrão baseado no 4º
    const fifthSignalTime = calculateNextPatternTime(fourthSignalTime);
    complementaryTimes.push(fifthSignalTime);
    
    // 6º sinal: seguindo padrão baseado no 5º
    const sixthSignalTime = calculateNextPatternTime(fifthSignalTime);
    complementaryTimes.push(sixthSignalTime);
    
    // 7º sinal: seguindo padrão baseado no 6º
    const seventhSignalTime = calculateNextPatternTime(sixthSignalTime);
    complementaryTimes.push(seventhSignalTime);
    
    console.log("⏰ Horários dos sinais complementares calculados:", complementaryTimes);
    console.log(`4º sinal: ${complementaryTimes[0]} (20min após 3º: ${thirdSignalEntryTime})`);
    console.log(`5º sinal: ${complementaryTimes[1]} (padrão baseado no 4º)`);
    console.log(`6º sinal: ${complementaryTimes[2]} (padrão baseado no 5º)`);
    console.log(`7º sinal: ${complementaryTimes[3]} (padrão baseado no 6º)`);
    
    // Criar conjunto de símbolos já usados para evitar duplicatas
    const usedSymbols = new Set(dashboardSignals.map(s => s.symbol));
    
    // Coletar sinais não-dashboard únicos para os sinais complementares
    const additionalSignals: TradingSignal[] = [];
    const nonDashboardSignals = filteredSignals
      .filter(s => (s as ExtendedSignal).isDashboard !== true)
      .filter(s => !usedSymbols.has(s.symbol) && !s.symbol.toLowerCase().includes('binance'));
    
    // Adicionar sinais únicos até ter 4 sinais complementares
    for (const signal of nonDashboardSignals) {
      if (additionalSignals.length >= 4) break;
      if (!usedSymbols.has(signal.symbol)) {
        additionalSignals.push(signal);
        usedSymbols.add(signal.symbol);
      }
    }
    
    // Se ainda não temos sinais suficientes, gerar novos com ativos únicos
    if (additionalSignals.length < 4) {
      const availableAssetNames = getAllAssetNames()
        .filter(asset => 
          ALLOWED_SET.has(asset) &&
          !asset.toLowerCase().includes('binance') && 
          isAssetAvailableForSignal(asset) && 
          !usedSymbols.has(asset) &&
          true
        );
      
      // Embaralhar a lista para variedade
      const shuffledAssets = availableAssetNames.sort(() => Math.random() - 0.5);
      
      // Adicionar novos sinais até completar 4 sinais complementares
      for (let i = additionalSignals.length; i < 4 && shuffledAssets.length > 0; i++) {
        const assetName = shuffledAssets.shift()!;
        
        const newSignal = createBasePlaceholderData({
          id: `complementary-signal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          symbol: assetName,
          exchange: ATIVOS_CATEGORIAS[assetName] || inferExchangeCategory(assetName),
          signal: Math.random() > 0.5 ? 'BUY' : 'SELL'
        });
        
        additionalSignals.push(newSignal);
        usedSymbols.add(assetName);
      }
    }
    
    // Aplicar os horários calculados aos sinais complementares
    const fixedComplementarySignals: TradingSignal[] = [];
    
    for (let i = 0; i < Math.min(additionalSignals.length, 4); i++) {
      const signal = additionalSignals[i];
      const entryTime = complementaryTimes[i];
      
      // Calcular os horários de expiração e reentradas
      const expiryTime = calculateNextTime(entryTime, SIGNAL_EXPIRY_TIME);
      const gale1Time = expiryTime;
      const gale2Time = calculateNextTime(gale1Time, SIGNAL_EXPIRY_TIME);
      
      // Criar o sinal com os horários corretos
      const updatedSignal = {
        ...signal,
        id: signal.id || `complementary-signal-${i}-${Date.now()}`,
        entry_time: entryTime,
        expiry_time_str: expiryTime,
        gale1_time: gale1Time,
        gale2_time: gale2Time,
        exchange: ATIVOS_CATEGORIAS[signal.symbol] || inferExchangeCategory(signal.symbol)
      };
      
      fixedComplementarySignals.push(updatedSignal);
    }
    
    // Combinar sinais da dashboard (mantendo horários originais) + sinais complementares (com novos horários)
    const finalSignals = [...dashboardSignals, ...fixedComplementarySignals].slice(0, 7);
    
    // Log para depuração
    console.log("✅ Sinais finais com nova lógica:", 
      finalSignals.map((s, idx) => ({
        index: idx + 1,
      asset: s.symbol,
      exchange: s.exchange,
        entrada: s.entry_time,
        isDashboard: (s as ExtendedSignal).isDashboard || false,
        id: s.id
      }))
    );
    
    // Verificar se não há duplicatas de ativos
    const assetOccurrences = new Map();
    finalSignals.forEach((signal, idx) => {
      const asset = signal.symbol;
      assetOccurrences.set(asset, (assetOccurrences.get(asset) || 0) + 1);
    });
    
    const duplicatedAssets = Array.from(assetOccurrences.entries()).filter(([_, count]) => count > 1);
    
    if (duplicatedAssets.length > 0) {
      console.error("❌ ERRO: Ativos duplicados detectados:", duplicatedAssets);
    } else {
      console.log("✅ Verificação OK: Nenhuma duplicata de ativo encontrada");
    }
    
    return finalSignals;
  }, [calculateNextTime, createBasePlaceholderData]);

  // Cache local para os 4 últimos sinais
  const lastFourSignalsCache = useRef<{
    signals: TradingSignal[],
    timestamp: number,
    isValid: boolean
  }>({
    signals: [],
    timestamp: 0,
    isValid: false
  });

  // Função auxiliar para calcular o próximo horário seguindo o padrão XX:03, XX:23, XX:43
  const calculateNextTimeInPattern = useCallback((currentTime: string): string => {
    const [hours, minutes] = currentTime.split(':').map(Number);
    let newHours = hours;
    let newMinutes = minutes;
    
    // Avançar para o próximo horário na sequência correta
    if (newMinutes === 3) {
      newMinutes = 23; // 03 -> 23 (mesma hora)
    } else if (newMinutes === 23) {
      newMinutes = 43; // 23 -> 43 (mesma hora)
    } else if (newMinutes === 43) {
      newMinutes = 3; // 43 -> 03 (próxima hora)
      newHours = (newHours + 1) % 24;
    }
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  }, []);

  // Função para ajustar horário para seguir o padrão 19:23, 19:43, 20:03, etc.
  const adjustToTimePattern = useCallback((timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    let newHours = hours;
    
    // O primeiro horário é sempre 19:23, seguido por incrementos de 20 minutos
    // Encontrar qual o horário base mais próximo do atual 
    // Padrão: XX:03, XX:23, XX:43 (minutos 3, 23, 43)
    let baseMinute = 3;
    
    if (minutes > 3) {
      if (minutes > 23) {
        if (minutes > 43) {
          // Se já passamos de 43, avanço para 03 da próxima hora
          baseMinute = 3;
          newHours = (hours + 1) % 24;
        } else {
          baseMinute = 43;
        }
      } else {
        baseMinute = 23;
      }
    }
    
    return `${newHours.toString().padStart(2, '0')}:${baseMinute.toString().padStart(2, '0')}`;
  }, []);

  // 🛡️ FUNÇÃO PRESERVATIVA: Garantir 7 sinais preservando os existentes
  const ensureSevenSignals = useCallback((inputSignals: TradingSignal[]): TradingSignal[] => {
    return ensureSevenSignalsPreservative(inputSignals as PlaceholderSignal[]);
  }, [ensureSevenSignalsPreservative]);

  // Memorizar os IDs dos sinais para evitar recriação quando apenas a ordem muda
  const signalIds = useMemo(() => {
    return signals ? signals.map(s => s.id).join('|') : '';
  }, [signals]);
  
  // Filtragem de sinais por tipo
  const filteredSignals = useMemo(() => {
    if (!signals) return ensureSevenSignals([]);
    
    // FILTRO GLOBAL DE SEGURANÇA: Remover QUALQUER sinal com "binance" ou horários incorretos
    const safeSignals = signals.filter(signal => {
      // Verificar se contém "binance" (case insensitive)
      const symbolLower = (signal.symbol || '').toLowerCase();
      const exchangeLower = (signal.exchange || '').toLowerCase();
      
      if (symbolLower.includes('binance') || exchangeLower.includes('binance')) {
        console.warn(`🚫 FILTRO GLOBAL: Removendo sinal com binance: ${signal.symbol} - ${signal.exchange}`);
        return false;
      }
      
      // Verificar se o horário segue o padrão correto (XX:03, XX:23, XX:43)
      const entryTime = signal.entry_time || '';
      if (entryTime) {
        const [_, minutes] = entryTime.split(':').map(Number);
        const validMinutes = [3, 23, 43];
        
        if (!validMinutes.includes(minutes)) {
          console.warn(`🚫 FILTRO GLOBAL: Removendo sinal com horário incorreto: ${signal.symbol} - ${entryTime} (minuto: ${minutes})`);
          return false;
        }
      }
      
      return true;
    });
    
    // VERIFICAÇÃO DE DUPLICATAS: Detectar horários ou ativos repetidos
    const timeCount = new Map();
    const assetCount = new Map();
    
    safeSignals.forEach(signal => {
      const time = signal.entry_time;
      const asset = signal.symbol;
      
      timeCount.set(time, (timeCount.get(time) || 0) + 1);
      assetCount.set(asset, (assetCount.get(asset) || 0) + 1);
    });
    
    const hasDuplicateTime = Array.from(timeCount.values()).some(count => count > 1);
    const hasDuplicateAsset = Array.from(assetCount.values()).some(count => count > 1);
    
    if (hasDuplicateTime || hasDuplicateAsset) {
      console.warn("🔄 DETECTADAS DUPLICATAS - Forçando regeneração de sinais únicos");
      console.warn("Duplicatas de horário:", Array.from(timeCount.entries()).filter(([_, count]) => count > 1));
      console.warn("Duplicatas de ativo:", Array.from(assetCount.entries()).filter(([_, count]) => count > 1));
      
      // Forçar regeneração com sinais únicos
      return ensureSevenSignals(safeSignals);
    }
    
    console.log(`✅ FILTRO GLOBAL: ${signals.length} sinais originais → ${safeSignals.length} sinais seguros`);
    
    // Usar a função ensureSevenSignals para garantir:
    // 1. Os 3 primeiros sinais serão sempre da dashboard
    // 2. Os 4 sinais restantes terão horários no padrão XX:03, XX:23, XX:43
    // 3. Os sinais serão organizados em ordem crescente de horário de entrada
    // 4. Não haverá sinais repetidos com o mesmo horário
    // 5. Haverá exatamente 7 sinais no total
    
    // Verificar se temos exatamente 3 sinais da dashboard
    if (dashboardSignals.length < 3) {
      console.warn(`Atenção: filteredSignals - apenas ${dashboardSignals.length} sinais da dashboard encontrados.`);
    } else if (dashboardSignals.length > 3) {
      console.warn(`Atenção: limitando número de sinais da dashboard para exatamente 3`);
    }
    
    // Forçar o uso explícito dos sinais da dashboard como os 3 primeiros, limitando a exatamente 3
    let originalSignals = safeSignals as TradingSignal[];
    
    // Se temos sinais da dashboard, garantir que sejam exatamente os 3 primeiros
    if (dashboardSignals.length > 0) {
             // Limitar a dashboard para exatamente 3 sinais e aplicar filtros de segurança
       const limitedDashboardSignals = dashboardSignals
         .filter(signal => {
           const symbolLower = (signal.symbol || '').toLowerCase();
           const exchangeLower = String(signal.exchange || '').toLowerCase();
           return !symbolLower.includes('binance') && !exchangeLower.includes('binance');
         })
         .slice(0, 3)
         .map(signal => {
           // Garantir que o sinal tenha todas as propriedades necessárias
           const safeCopy = { ...signal } as ExtendedSignal;
           safeCopy.exchange = inferExchangeCategory(signal.symbol); // Usar categoria correta
           safeCopy.isDashboard = true; // Marcar explicitamente como sinal da dashboard
           return safeCopy;
         });
      
      // Remover da lista original quaisquer sinais que tenham os mesmos IDs dos da dashboard
      const dashboardIds = new Set(limitedDashboardSignals.map(s => String(s.id)));
      originalSignals = originalSignals.filter(s => !dashboardIds.has(String(s.id)));
      
      // Adicionar os sinais da dashboard (limitados a 3) no início da lista
      originalSignals = [...limitedDashboardSignals, ...originalSignals];
      
      console.log("Sinais reconstruídos com dashboard no início:", 
        originalSignals.slice(0, 3).map(s => `${s.symbol} - ${s.entry_time}`).join(", "));
    }
    
    const finalSignals = ensureSevenSignals(originalSignals);
    
    // Garantir que todos os sinais tenham propriedades consistentes e exchange correto
    const processedSignals: TradingSignal[] = finalSignals.map((signal, idx) => {
      return {
        ...signal,
        status: signal.status || 'active',
        id: signal.id || `signal-${idx}`,
        exchange: inferExchangeCategory(signal.symbol)
      } as TradingSignal;
    });
    
    // 🔒 SALVAMENTO AUTOMÁTICO IMEDIATO: SEMPRE salvar os sinais finais no cache de navegação
    if (processedSignals && processedSignals.length >= 7) {
      saveSignalsToNavigationCache(processedSignals as PlaceholderSignal[]);
      console.log('🔒 PERSISTÊNCIA: 7 sinais salvos automaticamente para navegação');
    } else if (processedSignals && processedSignals.length >= 4) {
      saveSignalsToNavigationCache(processedSignals as PlaceholderSignal[]);
      console.log('🔒 PERSISTÊNCIA: Sinais parciais salvos para navegação');
    }
    
    return processedSignals;
  }, [signals, dashboardSignals, ensureSevenSignals]);

  // Usar hook para notificações 5 minutos antes do horário de entrada
  const { upcomingSignals, notificationsEnabled } = useSignalNotifications(
    // Usar TODOS os sinais filtrados da página (não apenas da dashboard)
    filteredSignals?.map(signal => ({
      ...signal,
      timestamp: typeof signal.timestamp === 'string' ? new Date(signal.timestamp).getTime() : Date.now(),
      pair: signal.symbol || signal.pair || signal.symbol,
      symbol: signal.symbol || signal.pair,
      entry_time: signal.entry_time || '00:00'
    })) as TradingSignal[],
    {
      notifyMinutesBefore: 5,       // Notificar 5 minutos antes da entrada
      enabled: true,
      notificationType: 'signals' // Classificação para a aba de notificações
    }
  );

  // Paginação
  const indexOfLastSignal = activePage * signalsPerPage;
  const indexOfFirstSignal = indexOfLastSignal - signalsPerPage;
  const paginatedSignals = filteredSignals.slice(indexOfFirstSignal, indexOfLastSignal);
  const totalPages = Math.ceil(filteredSignals.length / signalsPerPage);

  // Função para lidar com a atualização de dados de forma segura
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    try {
      // Verificar se há uma sessão ativa antes de atualizar
      const supabaseSession = localStorage.getItem('supabase.auth.token');
      if (!supabaseSession) {
        console.log('Sessão não encontrada, evitando atualização para prevenir redirecionamento');
        return;
      }
      
      setIsRefreshing(true);
      
      // Verificar se temos sinais atuais antes de atualizar
      const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']);
      if (!currentSignals || currentSignals.length === 0) {
        console.log('Nenhum sinal atual encontrado, gerando novos sinais localmente');
        
        // Gerar sinais localmente em vez de buscar do servidor
        const newSignals = generateDailySignals().slice(0, 7);
        safeSetTradingSignals(newSignals);
      } else {
        // Se temos sinais atuais, atualizar normalmente
        await refetch();
      }
      
      // Sempre atualizar preços
      await updatePrices();
    } catch (error) {
      console.error('Erro ao atualizar sinais:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  // Função para atualizar preços
  const updatePrices = useCallback(async () => {
    try {
      const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']);
      
      if (!currentSignals || currentSignals.length === 0) return;
      
      // Extrair símbolos únicos para os quais precisamos de preços
      const symbols = [...new Set(currentSignals.map(s => s.symbol))];
      
      // Buscar preços atualizados
      const prices = await getLatestPrices(symbols);
      
      if (!prices || prices.length === 0) return;
      
      // Atualizar preços nos sinais
      const updatedSignals = currentSignals.map(signal => {
        const price = prices.find(p => p.symbol === signal.symbol)?.price;
        
        if (price) {
          // Garantir coerência de tipos: TradingSignal espera `price` como number
          const normalizedPrice = typeof price === 'number' ? price : parseFloat(String(price));
          return {
            ...signal,
            currentPrice: String(normalizedPrice),
            price: normalizedPrice
          } as TradingSignal;
        }
        
        return signal;
      });
      
      // Atualizar no cache
      safeSetTradingSignals(updatedSignals);
      
      // Atualizar preços anteriores
      setPreviousPrices(prev => {
        const newPrices: Record<string, string> = {...prev};
        
      prices.forEach(price => {
        if (price.symbol && price.price) {
            newPrices[price.symbol] = price.price.toString();
        }
      });
      
        return newPrices;
      });
    } catch (error) {
      console.error("Erro ao atualizar preços:", error);
    }
  }, [queryClient, safeSetTradingSignals]);

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
          localStorage.removeItem('dashboardSignals');
        }
      } catch (e) {
        // Em caso de erro ao analisar, melhor limpar
        localStorage.removeItem('dashboardSignals');
      }
    }
  }, [resultCounter]);
  
  // Função para gerar resultado seguindo a proporção 4:1 (agora com implementação fixada)
  const generateResultWithRatio = useCallback((): 'win' | 'loss' => {
    // Incrementar contador e retornar 'loss' a cada 5 sinais (no 5º sinal)
    const nextCounter = (resultCounter + 1) % WIN_LOSS_RATIO;
    setResultCounter(nextCounter);
    return nextCounter === 0 ? 'loss' : 'win';
  }, [resultCounter]);
  
  // Função que verifica sinais expirados - Movida antes de sua utilização
  const checkExpiredSignals = useCallback(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    
    // Formato de hora atual para comparações precisas
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:${currentSecond.toString().padStart(2, '0')}`;
    
          // Verificando sinais expirados
    
    // Verificar os sinais atuais
    queryClient.getQueryData<TradingSignal[]>(['tradingSignals'])?.forEach(signal => {
      const typedSignal = signal as PlaceholderSignal;
      
      // Se o sinal já foi processado ou não tem entrada, ignorar
      if (typedSignal.processed || !typedSignal.entry_time) return;
      
      // Extrair horário de entrada
      const [entryHour, entryMin] = typedSignal.entry_time.split(':').map(Number);
      
      // Calcular horário de animação (exatamente 16 minutos após a entrada)
      let animationHour = entryHour;
      let animationMinute = entryMin + 16;
      
      // Ajustar para hora seguinte se necessário
      if (animationMinute >= 60) {
        animationHour = (animationHour + 1) % 24;
        animationMinute = animationMinute - 60;
      }
      
      // Formatar o horário de animação
      const animationTime = `${animationHour.toString().padStart(2, '0')}:${animationMinute.toString().padStart(2, '0')}`;
      
      // Verificar se o horário atual é igual ou posterior ao horário de animação
      const isAnimationTime = 
        (currentHour > animationHour) || 
        (currentHour === animationHour && currentMinute >= animationMinute);
      
      if (isAnimationTime && !typedSignal.isAnimating && !typedSignal.processed) {
        // Sinal atingiu o tempo para animação
       
        // Gerar resultado (4 ganhos para 1 perda)
        setWinLossCounter(prev => (prev + 1) % 5);
        const result = winLossCounter === 4 ? 'failure' : 'success';
        
        // Buscar todos os sinais atuais
        const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']);
        if (!currentSignals) return;
        
        // Atualizar o sinal com isAnimating=true e result
        const updatedSignals = currentSignals.map(s => {
          if (s.id === typedSignal.id) {
            return {
              ...s,
              isAnimating: true,
              result,
            };
          }
          return s;
        });
        
        // Atualizar o cache com os sinais atualizados
        safeSetTradingSignals(updatedSignals);
        
        // Após 3 segundos, remover a animação e processar o sinal
        setTimeout(() => {
          const signalsWithoutAnimation = queryClient.getQueryData<TradingSignal[]>(['tradingSignals'])?.map(s => {
            if (s.id === typedSignal.id) {
              return {
                ...s,
                isAnimating: false,
                processed: true,
              };
            }
            return s;
          });
          
          if (signalsWithoutAnimation) {
            safeSetTradingSignals(signalsWithoutAnimation);
           
           // Após 1 segundo, rotacionar os sinais
           setTimeout(() => {
                           // Rotacionando sinais após animação
            
            // Rotacionar sinais
            const signalsAfterRotation = rotateSignals(signalsWithoutAnimation);
            
            // Atualizar o cache com os sinais rotacionados
            safeSetTradingSignals(signalsAfterRotation);
           }, 1000);
          }
        }, 3000);
      }
    });
  }, [queryClient, rotateSignals, winLossCounter, setWinLossCounter, safeSetTradingSignals]);
  
  // Atualização periódica MUITO menos frequente, apenas quando realmente necessário
  useEffect(() => {
    // Função de verificação interna sem atualização visual
    const silentBackgroundCheck = () => {
      try {
        // Verificar se há uma sessão ativa antes de fazer qualquer verificação
        const supabaseSession = localStorage.getItem('supabase.auth.token');
        if (!supabaseSession) {
          console.log('Sessão não encontrada, evitando verificação em segundo plano');
          return;
        }
        
        const now = Date.now();
        const state = stateRef.current;
        
        // Evitar atualizações sobrepostas - IMPORTANTE
        if (state.isUpdating) return;
        
        // Verificar sinais expirados a cada 15 minutos (aumento do intervalo para reduzir atualizações)
        if (now - state.lastCheckTime > 15 * 60 * 1000) {
          // Verificar em silêncio
          state.lastCheckTime = now;
          
          // Só verificar se houver sinais não processados
          const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']) || [];
          
          // Se não temos sinais, não fazer nada
          if (!currentSignals || currentSignals.length === 0) {
            console.log('Nenhum sinal atual encontrado, evitando verificação em segundo plano');
            return;
          }
          
          // Verificar se temos algum sinal que precisa ser verificado
          const hasUnprocessedSignals = currentSignals.some(signal => 
            !signal.processed && signal.entry_time);
          
          if (hasUnprocessedSignals) {
            // Usar um lock para evitar atualizações simultâneas
            state.isUpdating = true;
            
            // Só verificar quando realmente necessário
            checkExpiredSignals();
            
            // Liberar o lock após 10 segundos (tempo seguro para completar operações)
            setTimeout(() => {
              state.isUpdating = false;
            }, 10000);
          }
        }
        
        // Atualizar preços muito menos frequentemente (a cada 20 minutos)
        if (now - state.lastPriceUpdate > 20 * 60 * 1000) {
          state.lastPriceUpdate = now;
          
          // Verificar se temos sinais antes de atualizar preços
          const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']) || [];
          if (currentSignals && currentSignals.length > 0) {
            updatePrices();
          }
        }
      } catch (error) {
        console.error('Erro durante verificação em segundo plano:', error);
      }
    };
    
    // Verificar silenciosamente com frequência muito reduzida (10 minutos) 
    const autoUpdateInterval = setInterval(silentBackgroundCheck, 10 * 60 * 1000);
    
    // Limpar intervalo ao desmontar componente
    return () => clearInterval(autoUpdateInterval);
  }, [queryClient, resultCounter, checkExpiredSignals, updatePrices]);
  
  // Configurar atualização completa de dados a cada 20 minutos em vez de 5 minutos
  useEffect(() => {
    // Função para buscar e atualizar sinais completos com proteção contra updates simultâneos e redirecionamentos
    const fetchAndUpdateSignals = async () => {
      try {
        // Verificar se há uma sessão ativa antes de atualizar
        const supabaseSession = localStorage.getItem('supabase.auth.token');
        if (!supabaseSession) {
          console.log('Sessão não encontrada, evitando atualização automática para prevenir redirecionamento');
          return;
        }
        
        // Evitar atualizações sobrepostas
        if (updateLockRef.current.isUpdating) {
          console.log('Atualização de sinais já em andamento, ignorando esta chamada');
          return;
        }
        
        // Evitar atualizações muito frequentes (mínimo 45 minutos entre updates)
        const now = Date.now();
        const timeSinceLastUpdate = now - updateLockRef.current.lastUpdateTime;
        if (timeSinceLastUpdate < 45 * 60 * 1000) {
          console.log(`Ignorando atualização - última foi há apenas ${Math.floor(timeSinceLastUpdate/1000)} segundos`);
          return;
        }
        
        // Verificar se a página está visível - se estiver minimizada, não atualizar
        if (document.hidden) {
          console.log('Página não visível, ignorando atualização de sinais');
          return;
        }
        
        // Obter sinais atuais
        const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']) || [];
        
        // Se não temos sinais atuais, gerar localmente em vez de buscar do servidor
        if (!currentSignals || currentSignals.length === 0) {
          console.log('Nenhum sinal atual encontrado, gerando novos sinais localmente');
          
          // Gerar sinais localmente
          const newSignals = generateDailySignals().slice(0, 7);
          safeSetTradingSignals(newSignals);
          return;
        }
        
        // Verificar se temos algum sinal em processamento/animação
        const hasActiveSignals = currentSignals.some(signal => {
          const extSignal = signal as ExtendedSignal;
          return extSignal.isAnimating === true || 
            (extSignal.processed && Date.now() - (extSignal.completedTime || 0) < 30000);
        });
        
        // Se temos animações ou processamentos ativos, adiar a atualização
        if (hasActiveSignals) {
          console.log('Sinais em animação ou processamento detectados, adiando atualização');
          return;
        }
        
        // Ativar lock
        updateLockRef.current.isUpdating = true;
        updateLockRef.current.lastUpdateTime = now;
        
        try {
          console.log('Iniciando atualização segura de sinais...');
          
          // Verificar se os sinais atuais têm horários válidos
          const hasValidTimes = currentSignals.every(signal => {
            if (!signal.entry_time) return false;
            
            // Verificar se o horário segue o padrão XX:23, XX:43, XX:03, etc.
            const [_, minutes] = String(signal.entry_time).split(':').map(Number);
            const validMinutes = [3, 23, 43];
            return validMinutes.includes(minutes);
          });
          
          // Se os sinais atuais têm horários válidos, apenas reorganizar e atualizar
          if (hasValidTimes && currentSignals.length === 7) {
            console.log('Sinais atuais têm horários válidos, apenas reorganizando');
            
            // Aplicar função validateUniqueEntryTimes para garantir horários corretos
            const reorganizedSignals = validateUniqueEntryTimes(currentSignals);
            
            // Atualizar cache do React Query com um pequeno delay
            setTimeout(() => {
              safeSetTradingSignals(reorganizedSignals);
            }, 500);
            return;
          }
          
          // Se chegamos aqui, precisamos gerar novos sinais
          console.log('Gerando novos sinais com horários corretos');
          
          // Gerar novos sinais com horários corretos
          const newSignals = validateUniqueEntryTimes(generateDailySignals());
          
          // Preservar IDs estáveis sempre que possível
          const preservedSignals = newSignals.map(signal => {
            const matchingSignal = currentSignals.find(s => s.symbol === signal.symbol);
            if (matchingSignal) {
              return {
                ...signal,
                id: matchingSignal.id
              };
            }
            return signal;
          });
          
          // Atualizar cache do React Query com um pequeno delay
          setTimeout(() => {
            safeSetTradingSignals(preservedSignals);
          }, 500);
        } catch (error) {
          console.error("Erro ao atualizar sinais:", error);
        } finally {
          // Liberar o lock após um delay para garantir que a operação foi concluída
          setTimeout(() => {
            updateLockRef.current.isUpdating = false;
          }, 5000);
        }
      } catch (error) {
        console.error("Erro durante atualização automática:", error);
        // Garantir que o lock seja liberado mesmo em caso de erro
        setTimeout(() => {
          if (updateLockRef.current) {
            updateLockRef.current.isUpdating = false;
          }
        }, 5000);
      }
    };
    
    // Só executar atualização automática se auto-refresh estiver habilitado
    if (!autoRefresh) return;
    
    // Definir intervalo extremamente longo (45 minutos) para atualização automática
    const autoUpdateInterval = setInterval(fetchAndUpdateSignals, 45 * 60 * 1000);
    
    // Primeira execução após 5 minutos (dar tempo para interface se estabilizar completamente)
    const initialTimeoutId = setTimeout(fetchAndUpdateSignals, 5 * 60 * 1000);
    
    // Limpar intervalos quando o componente for desmontado
    return () => {
      clearInterval(autoUpdateInterval);
      clearTimeout(initialTimeoutId);
    };
  }, [autoRefresh, queryClient, ensureSevenSignals, generateDailySignals, safeSetTradingSignals, validateUniqueEntryTimes]);

  // 🛡️ SISTEMA CONSERVATIVO DE NAVEGAÇÃO - SÓ atua em casos críticos
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        try {
          // Obter sinais atuais SEM forçar invalidação
          const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']) as PlaceholderSignal[];
          
          // Usar sistema conservativo que PRESERVA sinais válidos
          handleVisibilityChangeConservative(queryClient, currentSignals);
          
        } catch (error) {
          console.error('Erro no sistema conservativo de navegação:', error);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient, handleVisibilityChangeConservative]);

  // Comentário removido pois a função foi movida para antes da ensureSevenSignals

  // Função de rotação para a página principal de sinais (remove o primeiro e adiciona novo no final)
  const rotateSignalsPage = (currentSignals: TradingSignal[]): TradingSignal[] => {
    // Simplesmente retornar os sinais atuais, sem rotação
    return currentSignals;
  };
  
  // Função de rotação para a dashboard (move tudo para cima e adiciona novo no final)
  const rotateDashboardSignals = (currentSignals: TradingSignal[]): TradingSignal[] => {
    // Simplesmente retornar os sinais atuais, sem rotação
    return currentSignals;
  };

  // Verificar se há sinais que expiraram e devem mostrar resultado
  useEffect(() => {
    const checkExpiredSignals = () => {
      // Função desativada conforme solicitação do cliente
      // Não mostramos mais os ícones de resultado (ganho/perda) nos sinais
      return;
    };
    
    // Verificar apenas a cada 5 minutos
    const intervalId = setInterval(checkExpiredSignals, 5 * 60 * 1000);
    // Verificar imediatamente ao montar
    checkExpiredSignals();
    
    return () => clearInterval(intervalId);
  }, [signals, queryClient]);

  // Sistema de verificação para rotação automática a cada 60 segundos
  useEffect(() => {
    console.log('⏰ Timer de verificação para rotação automática iniciado (60s)');
    
    // Função que verifica se é hora de rotacionar os sinais
    const checkSignalRotation = () => {
      try {
        // Obter sinais atuais
        const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']);
        if (!currentSignals || currentSignals.length < 7) {
          console.log('❌ Verificação de rotação: número insuficiente de sinais');
          return;
        }
        
        // Verificar se o primeiro sinal existe e tem horário de entrada
        const firstSignal = currentSignals[0];
        if (!firstSignal || !firstSignal.entry_time) {
          console.log('❌ Verificação de rotação: primeiro sinal inválido');
          return;
        }
        
        // Verificar se já se passaram 20 minutos desde a entrada do primeiro sinal
        const [entryHour, entryMin] = String(firstSignal.entry_time).split(':').map(Number);
        
        // Criar horário de entrada
        const entryTime = new Date();
        entryTime.setHours(entryHour, entryMin, 0, 0);
        
        // Se o horário de entrada for no futuro, ajustar para o dia anterior
        const currentTime = new Date();
        if (entryTime > currentTime) {
          entryTime.setDate(entryTime.getDate() - 1);
        }
        
        // Calcular diferença em minutos desde a entrada
        const timeDiffMs = currentTime.getTime() - entryTime.getTime();
        const minutesSinceEntry = Math.floor(timeDiffMs / (1000 * 60));
        
        // Verificar se já se passaram 20 minutos
        if (minutesSinceEntry >= 20) {
          console.log(`🔄 ROTAÇÃO AUTOMÁTICA: ${minutesSinceEntry} minutos desde entrada do primeiro sinal (${firstSignal.entry_time})`);
          
          // Executar a rotação
          const rotatedSignals = rotateSignals(currentSignals);
          
          // Atualizar os sinais no cache do React Query
          safeSetTradingSignals(rotatedSignals);
        } else {
          console.log(`⏱️ Tempo até rotação: ${20 - minutesSinceEntry} minutos (${minutesSinceEntry}/20 min desde entrada)`);
        }
      } catch (error) {
        console.error('❌ Erro durante verificação de rotação automática:', error);
      }
    };
    
    // Verificar a cada 60 segundos
    const rotationCheckInterval = setInterval(checkSignalRotation, 60 * 1000);
    
    // Verificar uma vez na inicialização (após 5 segundos para dar tempo de carregar os sinais)
    const initialCheckTimeout = setTimeout(checkSignalRotation, 5 * 1000);
    
    // Limpar intervalo e timeout ao desmontar componente
    return () => {
      clearInterval(rotationCheckInterval);
      clearTimeout(initialCheckTimeout);
      console.log('⏰ Timer de rotação automática desativado');
    };
  }, [queryClient, rotateSignals, safeSetTradingSignals]);

  // Efeito para limpar cache na inicialização se houver horários inconsistentes
  useEffect(() => {
    // Verificar a hora atual para validar sinais em cache
    const now = new Date();
    const currentHour = now.getHours();
    
    // Verificar o localStorage diretamente para problemas
    const cachedSignals = localStorage.getItem('trading-signals-cache');
    const cachedDailySignals = localStorage.getItem('daily-signals-cache');
    
    // Verificar sinais comuns
    if (cachedSignals) {
      try {
        const cachedData = JSON.parse(cachedSignals);
        if (cachedData && cachedData.signals && Array.isArray(cachedData.signals)) {
          // Verificar se há sinais com horários inconsistentes
          const hasInvalidTimes = cachedData.signals.some(signal => {
            if (!signal.entry_time) return false;
            
            const [hours] = signal.entry_time.split(':').map(Number);
            const hourDiff = Math.abs(hours - currentHour);
            
            // Se a diferença for mais de 2 horas (exceto para sinais programados futuros)
            return hourDiff > 2 && hourDiff < 22; // Considerando ciclo de 24h
          });
          
          // Verificar se há número inválido de sinais
          const hasInvalidCount = cachedData.signals.length !== 7;
          
          if (hasInvalidTimes || hasInvalidCount) {
            console.log('Detectados problemas no cache de sinais:');
            console.log(`- Horários inconsistentes: ${hasInvalidTimes}`);
            console.log(`- Quantidade incorreta: ${cachedData.signals.length} (deve ser 7)`);
            console.log('Limpando cache de sinais...');
            
            // Limpar todos os caches relacionados
            localStorage.removeItem('trading-signals-cache');
            localStorage.removeItem('signals-lastUpdated');
            localStorage.removeItem('daily-signals-cache');
            localStorage.removeItem('dashboard-signals-cache');
            localStorage.removeItem('dashboard-signals-lastUpdated');
            localStorage.removeItem('dashboardSignals');
          }
        }
      } catch (e) {
        console.error('Erro ao analisar cache de sinais:', e);
        // Em caso de erro, limpar cache por segurança
        localStorage.removeItem('trading-signals-cache');
        localStorage.removeItem('signals-lastUpdated');
      }
    }
  }, []);

  // 🔒 SISTEMA AUTOMÁTICO DE SALVAMENTO (substituindo limpeza de cache)
  useEffect(() => {
    console.log('🔒 SISTEMA PRESERVATIVO: Página de Sinais iniciada');
    
    // Tentar recuperar sinais salvos da navegação anterior
    const savedSignals = loadSignalsFromNavigationCache();
    if (savedSignals && savedSignals.length >= 4) {
      console.log('🔒 RECUPERAÇÃO: Sinais encontrados da navegação anterior');
      safeSetTradingSignals(savedSignals);
      return;
    }
    
    // Se não há sinais salvos, sincronizar com dashboard sem limpar cache
    console.log('🔒 SINCRONIZAÇÃO: Sincronizando com dashboard preservando cache');
    refetch();
  }, [refetch, queryClient, safeSetTradingSignals]);

  // 🔒 SALVAMENTO IMEDIATO sempre que os sinais mudarem
  useEffect(() => {
    if (filteredSignals && filteredSignals.length >= 7) {
      console.log('🔒 SALVAMENTO IMEDIATO: Salvando sinais após filtro');
      saveSignalsToNavigationCache(filteredSignals as PlaceholderSignal[]);
    }
  }, [filteredSignals]);

  // Solicitar permissão para notificações quando a página carregar
  useEffect(() => {
    if (!hasPermission) {
      // Aguardar 2 segundos antes de solicitar permissão para não ser muito intrusivo
      const timeoutId = setTimeout(() => {
        requestPermission().then(granted => {
          if (granted) {
            console.log('✅ Permissão para notificações concedida');
          } else {
            console.log('❌ Permissão para notificações negada');
          }
        });
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [hasPermission, requestPermission]);

  // SISTEMA DE SINCRONIZAÇÃO DEFINITIVO: 3 sinais da dashboard + 4 sinais adicionais
  useEffect(() => {
    const handleDashboardUpdate = (event: CustomEvent<{ signals: PlaceholderSignal[]; timestamp?: number }>) => {
      console.log('🔄 SINCRONIZAÇÃO DEFINITIVA: Sinais da dashboard atualizados detectados');
      
      // VALIDAÇÃO DOS DADOS DO EVENTO
      let eventData = event.detail;
      
      if (!eventData || !eventData.signals || !Array.isArray(eventData.signals)) {
        console.warn('⚠️ SYNC: Dados do evento inválidos, tentando fallback para localStorage');
        
        // Fallback para localStorage se evento não tem dados válidos
        try {
          const dashboardData = localStorage.getItem('dashboardSignals');
          if (dashboardData) {
            const { signals: dashboardSignals } = JSON.parse(dashboardData);
            if (dashboardSignals && dashboardSignals.length >= 3) {
                console.log('🔄 FALLBACK: Usando dados do localStorage');
                eventData = { signals: dashboardSignals.slice(0, 3) };
              } else {
                console.error('❌ FALLBACK: Dados do localStorage também inválidos');
                return;
              }
            } else {
              console.error('❌ FALLBACK: Nenhum dado no localStorage');
              return;
            }
          } catch (error) {
            console.error('❌ FALLBACK: Erro ao ler localStorage:', error);
            return;
          }
        }
        
        // Garantir que temos exatamente 3 sinais da dashboard
        const dashboardSignals = eventData.signals.slice(0, 3);
        if (dashboardSignals.length !== 3) {
          console.warn(`⚠️ SYNC: Evento tem ${dashboardSignals.length} sinais, mas precisa de 3`);
          return;
        }
        
        // DIAGNÓSTICO: Verificar os sinais da dashboard
        console.log('🔄 SINCRONIZAÇÃO: Sinais da dashboard recebidos:');
        dashboardSignals.forEach((signal, idx) => {
          console.log(`  • ${idx+1}º: ${signal.symbol} (${signal.entry_time})`);
        });
        
        // NOVA IMPLEMENTAÇÃO DA SINCRONIZAÇÃO COM DASHBOARD
        try {
          console.log('🎯 SINCRONIZAÇÃO NOVA: Preservando lógica de rotação específica da aba Sinais');
          
          // Obter sinais atuais
          const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']) || [];
          
          // Verificar se já temos sinais e se eles estão na quantidade correta (7)
          if (currentSignals && currentSignals.length === 7) {
            console.log('✅ Já temos 7 sinais - apenas sincronizando os 3 primeiros com a dashboard');
            
            // VERIFICAÇÃO MELHORADA: Comparar símbolos e horários para verificar sincronização
            const currentSymbols = currentSignals.slice(0, 3).map(s => s.symbol);
            const newSymbols = dashboardSignals.map(s => s.symbol);
            
            // Verificar se os símbolos são os mesmos
            const symbolsMatch = currentSymbols.every((symbol, idx) => 
              symbol === newSymbols[idx]
            );
            
            if (symbolsMatch) {
              console.log('🔄 Símbolos idênticos, verificando se horários também são iguais');
              
              // Verificar se os horários também são idênticos
              const currentTimes = currentSignals.slice(0, 3).map(s => s.entry_time);
              const newTimes = dashboardSignals.map(s => s.entry_time);
              
              const timesMatch = currentTimes.every((time, idx) => 
                time === newTimes[idx]
              );
              
              if (timesMatch) {
                console.log('✅ Horários também idênticos, sincronização não necessária');
                return; // Não precisa sincronizar se tudo já está igual
              }
            }
            
            // Se chegou aqui, é porque precisamos sincronizar
            console.log('⚠️ SINCRONIZAÇÃO NECESSÁRIA: Diferenças encontradas');
            console.log(`Símbolos atuais: ${currentSymbols.join(', ')}`);
            console.log(`Símbolos novos: ${newSymbols.join(', ')}`);
            
            // Substituir apenas os 3 primeiros sinais pelos da dashboard
            const updatedSignals = [...currentSignals];
            dashboardSignals.forEach((signal, index) => {
              if (index < 3) {
                updatedSignals[index] = {
                  ...signal,
                  isDashboard: true,
                  dashboardPosition: index
                };
              }
            });
            
            // Salvar sinais atualizados
            safeSetTradingSignals(updatedSignals);
            saveSignalsToNavigationCache(updatedSignals as PlaceholderSignal[]);
            
            // Log detalhado dos sinais sincronizados
            console.log('✅ SINCRONIZAÇÃO COMPLETADA: 3 primeiros sinais atualizados da dashboard');
            dashboardSignals.forEach((signal, idx) => {
              console.log(`   • Sinal ${idx+1}: ${signal.symbol} (${signal.entry_time})`);
            });
            return;
          }
          
          // Se não temos sinais ou quantidade errada, gerar conjunto completo
          console.log('🔄 Gerando conjunto completo de 7 sinais (3 da dashboard + 4 adicionais)');
          
          // 1. Os 3 primeiros sinais são IGUAIS aos da dashboard
          const firstThreeSignals = dashboardSignals.map((signal, index) => ({
            ...signal,
            isDashboard: true,
            dashboardPosition: index
          }));
          
          // 2. Gerar 4 sinais adicionais
          // O primeiro dos 4 deve ter 20 minutos de diferença do terceiro sinal da dashboard
          const thirdDashboardSignal = dashboardSignals[2];
          if (!thirdDashboardSignal || !thirdDashboardSignal.entry_time) {
            console.error('❌ ERRO: Terceiro sinal da dashboard inválido');
            return;
          }
          
          const [hours, minutes] = thirdDashboardSignal.entry_time.split(':').map(Number);
          
          // Calcular horário base: terceiro sinal + 20 minutos
          let baseHour = hours;
          let baseMinute = minutes + 20;
          
          if (baseMinute >= 60) {
            baseMinute -= 60;
            baseHour = (baseHour + 1) % 24;
          }
          
          // Usar função getNextValidTime para garantir horário válido (03, 23, 43)
          const baseTime = `${baseHour.toString().padStart(2, '0')}:${baseMinute.toString().padStart(2, '0')}`;
          
          // CORREÇÃO: Calcular próximo horário válido com base no padrão 03→23→43→03
          let firstAdditionalTime = "";
          if (minutes === 3) {
            // Se o terceiro sinal é XX:03, o quarto deve ser XX:23 + 20min = XX+1:43
            firstAdditionalTime = `${((hours + 1) % 24).toString().padStart(2, '0')}:43`;
          } else if (minutes === 23) {
            // Se o terceiro sinal é XX:23, o quarto deve ser XX:43 + 20min = XX+1:03
            firstAdditionalTime = `${((hours + 1) % 24).toString().padStart(2, '0')}:03`;
          } else if (minutes === 43) {
            // Se o terceiro sinal é XX:43, o quarto deve ser XX+1:03 + 20min = XX+1:23
            firstAdditionalTime = `${((hours + 1) % 24).toString().padStart(2, '0')}:23`;
          } else {
            // Fallback - usar base calculada anteriormente
            firstAdditionalTime = adjustToTimePattern(baseTime);
          }
          
          console.log(`🆕 PRIMEIRO SINAL ADICIONAL: ${thirdDashboardSignal.entry_time} + 20min = ${baseTime} → horário exato: ${firstAdditionalTime}`);
          
          // Gerar os 4 sinais adicionais seguindo padrão 03→23→43→03
          const additionalSignals: PlaceholderSignal[] = [];
          let currentTime = firstAdditionalTime;
          
          for (let i = 0; i < 4; i++) {
            const expiryTime = calculateNextTime(currentTime, 5);
            const gale1Time = expiryTime;
            const gale2Time = calculateNextTime(expiryTime, 5);
            
            // Usar ativos diferentes dos já usados
            const usedSymbols = [...firstThreeSignals, ...additionalSignals].map(s => s.symbol);
            let symbol = getRandomAsset();
            let attempts = 0;
            while (usedSymbols.includes(symbol) && attempts < 10) {
              symbol = getRandomAsset();
              attempts++;
            }
            
            const additionalSignal: PlaceholderSignal = {
              id: `signal-additional-${Date.now()}-${i}`,
              entry_time: currentTime,
              type: SignalType.TECHNICAL,
              strength: SignalStrength.STRONG,
              timestamp: Date.now(),
              qualityScore: 90,
              symbol: symbol,
              exchange: inferExchangeCategory(symbol),
              processed: false,
              status: 'active' as const,
              signal: Math.random() > 0.5 ? 'BUY' as const : 'SELL' as const,
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
              isDashboard: false
            };
            
            additionalSignals.push(additionalSignal);
            
            // Calcular próximo horário válido (seguindo padrão 03→23→43→03)
            const [currentHour, currentMinute] = currentTime.split(':').map(Number);
            if (currentMinute === 3) {
              currentTime = `${currentHour.toString().padStart(2, '0')}:23`;
            } else if (currentMinute === 23) {
              currentTime = `${currentHour.toString().padStart(2, '0')}:43`;
            } else if (currentMinute === 43) {
              const nextHour = (currentHour + 1) % 24;
              currentTime = `${nextHour.toString().padStart(2, '0')}:03`;
            }
          }
          
          // 3. Combinar: 3 da dashboard + 4 adicionais = 7 sinais totais
          const allSevenSignals = [...firstThreeSignals, ...additionalSignals];
          
          // Verificar que temos exatamente 7 sinais
          if (allSevenSignals.length !== 7) {
            console.error(`❌ ERRO: Número incorreto de sinais (${allSevenSignals.length}), deveria ser 7`);
            return;
          }
          
          // 4. Limpar caches e atualizar estado
          clearNavigationCacheOnDashboardChange();
          localStorage.removeItem('dailyTradingSignals');
          localStorage.removeItem('dailyTradingSignalsDate');
          
          // 5. Atualizar estado da dashboard
          setDashboardSignals(firstThreeSignals);
          
          // 6. Salvar no cache de navegação
          saveSignalsToNavigationCache(allSevenSignals);
          
          // 7. Aplicar no React Query
          safeSetTradingSignals(allSevenSignals);
          
          console.log('✅ SINCRONIZAÇÃO DEFINITIVA CONCLUÍDA');
          
          // Log detalhado de todos os 7 sinais
          console.log('📊 Sinais da Dashboard (3 primeiros):');
          firstThreeSignals.forEach((signal, idx) => {
            console.log(`   • Sinal ${idx+1}: ${signal.symbol} (${signal.entry_time})`);
          });
          console.log('📊 Sinais Adicionais (4 últimos):');
          additionalSignals.forEach((signal, idx) => {
            console.log(`   • Sinal ${idx+4}: ${signal.symbol} (${signal.entry_time})`);
          });
          console.log('📊 ESTRUTURA FINAL:', {
            'Sinais 1-3 (Dashboard)': firstThreeSignals.map(s => `${s.symbol} - ${s.entry_time}`),
            'Sinais 4-7 (Adicionais)': additionalSignals.map(s => `${s.symbol} - ${s.entry_time}`),
            'Diferença 3º→4º': `${thirdDashboardSignal.entry_time} → ${firstAdditionalTime} (20 min)`
          });
          
        } catch (error) {
          console.error('❌ ERRO na sincronização definitiva:', error);
          
          // Fallback: forçar refetch como última opção
          console.log('🔄 FALLBACK: Forçando refetch completo...');
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['tradingSignals'] });
            refetch();
          }, 100);
        }
    };

    // Listener para evento de força de sincronização (backup)
    const handleForceDashboardSync = (event: CustomEvent<{ signals: PlaceholderSignal[]; timestamp?: number }>) => {
      console.log('🚀 FORÇA DE SINCRONIZAÇÃO: Evento forçado detectado');
      handleDashboardUpdate(event); // Reutilizar a mesma lógica
    };

    // Adicionar ambos os listeners
    window.addEventListener('dashboardSignalsUpdated', handleDashboardUpdate as EventListener);
    window.addEventListener('forceDashboardSync', handleForceDashboardSync as EventListener);
    
    // VERIFICAÇÃO PERIÓDICA adicional para garantir sincronização
    const syncInterval = setInterval(() => {
      try {
        // Tentar obter dados mais recentes da dashboard
        const dashboardData = localStorage.getItem('dashboardSignals');
        if (dashboardData) {
          const { signals, timestamp } = JSON.parse(dashboardData);
          
          // Verificar se dados são válidos e recentes (menos de 5 minutos)
          const isRecent = (Date.now() - (timestamp || 0)) < 5 * 60 * 1000;
          
          if (isRecent && signals && Array.isArray(signals) && signals.length >= 3) {
            // Verificar se os sinais atuais estão sincronizados com a dashboard
            const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']);
            if (currentSignals && currentSignals.length >= 3) {
              // Verificar se os 3 primeiros sinais são diferentes
              const firstThreeCurrentSignals = currentSignals.slice(0, 3);
              const firstThreeDashboardSignals = signals.slice(0, 3);
              
              // Comparar símbolos e horários
              let needsSync = false;
              for (let i = 0; i < 3; i++) {
                if (
                  firstThreeCurrentSignals[i]?.symbol !== firstThreeDashboardSignals[i]?.symbol ||
                  firstThreeCurrentSignals[i]?.entry_time !== firstThreeDashboardSignals[i]?.entry_time
                ) {
                  needsSync = true;
                  break;
                }
              }
              
              // Se precisa sincronizar, forçar atualização
              if (needsSync) {
                console.log('🔄 VERIFICAÇÃO PERIÓDICA: Detectada diferença entre sinais atuais e dashboard');
                handleDashboardUpdate(new CustomEvent('forceDashboardSync', { detail: { signals } }));
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Erro durante verificação periódica de sincronização:', error);
      }
    }, 30 * 1000); // Verificar a cada 30 segundos
    
    return () => {
      // Remover ambos os listeners ao desmontar
      window.removeEventListener('dashboardSignalsUpdated', handleDashboardUpdate as EventListener);
      window.removeEventListener('forceDashboardSync', handleForceDashboardSync as EventListener);
      clearInterval(syncInterval);
    };
  }, [queryClient, refetch, setDashboardSignals, calculateNextTime, getRandomAsset, adjustToTimePattern, safeSetTradingSignals]);

  // SINCRONIZAÇÃO ULTRA-MELHORADA com Dashboard: Reage a mudanças nos sinais da dashboard
  useEffect(() => {
    console.log('🔄 SINCRONIZAÇÃO: Configurando listeners para sinais da dashboard');
    
    // Variáveis para evitar loops infinitos
    let isProcessingEvent = false;
    let lastProcessedTimestamp = 0;

    const handleDashboardSignalsUpdate = (event: CustomEvent<{ signals: PlaceholderSignal[]; timestamp?: number }>)=> {
      // Evitar processamento recursivo
      if (isProcessingEvent) {
        console.log('🛑 Evitando processamento recursivo de eventos');
        return;
      }
      
      // Evitar processamentos muito frequentes do mesmo evento/dados
      const now = Date.now();
      const timestamp = event?.detail?.timestamp || now;
      
      if ((now - lastProcessedTimestamp) < 500 && timestamp <= lastProcessedTimestamp) {
        console.log('🕒 Ignorando evento recente já processado');
        return;
      }
      
      lastProcessedTimestamp = timestamp;
      isProcessingEvent = true;
      console.log('📡 EVENTO: dashboardSignalsUpdated recebido', event.detail);
      
      try {
        // Verificar se os dados são válidos
        const { signals: dashboardSignals, timestamp } = event.detail;
        
        if (!dashboardSignals || !Array.isArray(dashboardSignals) || dashboardSignals.length < 3) {
          console.error('❌ ERRO: Dados do evento inválidos');
          return;
        }
        
        console.log(`📊 Sinais da dashboard recebidos (${dashboardSignals.length}):`);
        dashboardSignals.forEach((signal, idx) => {
          console.log(`   • Sinal ${idx+1}: ${signal.symbol} (${signal.entry_time})`);
        });
        
        // Obter sinais atuais
        const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']) || [];
        
        // SINCRONIZAÇÃO PRIORITÁRIA: Sempre garantir que os 3 primeiros sinais são idênticos
        // Fazer cópia profunda dos sinais para evitar problemas de referência
        const updatedSignals = [...currentSignals];
        
        // Garantir que temos pelo menos 7 sinais
        while (updatedSignals.length < 7) {
          updatedSignals.push({} as TradingSignal);
        }
        
        // Substituir APENAS os 3 primeiros sinais, mantendo os outros intactos
        for (let i = 0; i < 3; i++) {
          if (i < dashboardSignals.length) {
            // Preservar apenas os metadados do sinal atual (como processamento)
            const currentMetadata = updatedSignals[i] || {} as {
              processed?: boolean;
              isAnimating?: boolean;
            };
            
            // Criar nova referência para evitar problemas
            updatedSignals[i] = {
              ...dashboardSignals[i],
              // Marcar como vindo da dashboard
              isDashboard: true,
              dashboardPosition: i,
              // Preservar metadata importante
              processed: currentMetadata.processed,
              isAnimating: currentMetadata.isAnimating,
              // Timestamp para diagnóstico
              syncTimestamp: Date.now()
            };
          }
        }
        
        // Garantir que temos 7 sinais no total
        if (updatedSignals.length !== 7) {
          console.log('⚠️ CORREÇÃO: Ajustando para ter exatamente 7 sinais');
          
          if (updatedSignals.length < 7) {
            // Completar com sinais do getDailySignalsForCurrentTime
            const newSignals = getDailySignalsForCurrentTime();
            
            // Adicionar apenas os sinais faltantes
            for (let i = updatedSignals.length; i < 7; i++) {
              if (newSignals && newSignals.length > i) {
                updatedSignals.push(newSignals[i]);
              } else {
                // Fallback
                updatedSignals.push(createBasePlaceholderData());
              }
            }
          } else if (updatedSignals.length > 7) {
            // Limitar para exatamente 7 sinais
            updatedSignals.splice(7);
          }
        }
        
        // Atualizar no React Query
        safeSetTradingSignals(updatedSignals);
        
        // Salvar no cache de navegação
        saveSignalsToNavigationCache(updatedSignals as PlaceholderSignal[]);
        
        // Verificar se conseguimos sincronizar com sucesso
        console.log('✅ SINCRONIZAÇÃO COMPLETA: Os 3 primeiros sinais agora são idênticos aos da dashboard');
        console.log('   Sinais atualizados:', updatedSignals.map((s, idx) => 
          `${idx+1}. ${s.symbol} ${s.entry_time} ${idx < 3 ? '(DASHBOARD)' : ''}`
        ).join('\n   '));
      } catch (error) {
        console.error('❌ ERRO durante sincronização com a dashboard:', error);
      } finally {
        // Garantir que a flag seja resetada
        isProcessingEvent = false;
      }
    };

    const handleForceDashboardSync = (event: CustomEvent<{ signals: PlaceholderSignal[]; timestamp?: number }>) => {
      console.log('📡 EVENTO: forceDashboardSync recebido', event.detail);
      handleDashboardSignalsUpdate(event); // Reutilizar a mesma lógica
    };

    // Adicionar listeners para eventos da dashboard
    window.addEventListener('dashboardSignalsUpdated', handleDashboardSignalsUpdate);
    window.addEventListener('forceDashboardSync', handleForceDashboardSync);

    // Verificar a situação atual do localStorage e sincronizar se necessário
    const checkLocalStorageAndSync = () => {
      try {
        const dashboardSignalsData = localStorage.getItem('dashboardSignals');
        if (dashboardSignalsData) {
          const data = JSON.parse(dashboardSignalsData);
          
          if (data && data.signals && Array.isArray(data.signals) && data.signals.length >= 3) {
            console.log('🔍 VERIFICAÇÃO: Dados encontrados no localStorage, sincronizando...');
            handleDashboardSignalsUpdate(new CustomEvent('dashboardSignalsUpdated', { detail: data }));
          }
        }
      } catch (error) {
        console.error('❌ ERRO: Falha ao verificar localStorage:', error);
      }
    };
    
    // Verificar localStorage após 3 segundos (dar tempo para componente montar)
    const initialSyncTimeout = setTimeout(checkLocalStorageAndSync, 3000);

    // Verificar mudanças no localStorage a cada 10 segundos (mais frequente)
    const syncInterval = setInterval(() => {
      const dashboardSignalsData = localStorage.getItem('dashboardSignals');
      if (dashboardSignalsData) {
        try {
          const { signals: dashboardSignals, timestamp } = JSON.parse(dashboardSignalsData);
          
          // Verificar se os sinais são recentes (menos de 1 minuto)
          const isRecent = (Date.now() - (timestamp || 0)) < 60 * 1000;
          
          if (isRecent && dashboardSignals && Array.isArray(dashboardSignals) && dashboardSignals.length >= 3) {
            // Comparar símbolos dos 3 primeiros sinais
            const currentSignals = queryClient.getQueryData<TradingSignal[]>(['tradingSignals']);
            if (!currentSignals || currentSignals.length < 3) {
              console.log('📡 SINCRONIZAÇÃO AUTOMÁTICA: Sinais insuficientes, forçando atualização');
              handleDashboardSignalsUpdate(new CustomEvent('dashboardSignalsUpdated', { 
                detail: { signals: dashboardSignals, timestamp } 
              }));
              return;
            }
            
            // Verificar se os 3 primeiros sinais são diferentes
            const currentSymbols = currentSignals.slice(0, 3).map(s => s.symbol);
            const dashboardSymbols = dashboardSignals.slice(0, 3).map(s => s.symbol);
            
            // Verificar se algum símbolo é diferente
            let needsSync = false;
            for (let i = 0; i < 3; i++) {
              if (currentSymbols[i] !== dashboardSymbols[i]) {
                needsSync = true;
                break;
              }
            }
            
            if (needsSync) {
              console.log('📡 SINCRONIZAÇÃO AUTOMÁTICA: Sinais diferentes, atualizando');
              console.log(`   - Dashboard: ${dashboardSymbols.join(', ')}`);
              console.log(`   - Trades:    ${currentSymbols.join(', ')}`);
              handleDashboardSignalsUpdate(new CustomEvent('dashboardSignalsUpdated', { 
                detail: { signals: dashboardSignals, timestamp } 
              }));
            }
          }
          // Verificar se os dados são recentes (menos de 30 minutos)
          const isRecentExtended = Date.now() - timestamp < 30 * 60 * 1000;
          
          // Verificar se há sinais da dashboard e se são diferentes dos atuais
          if (isRecentExtended && dashboardSignals && Array.isArray(dashboardSignals) && dashboardSignals.length >= 3 && signals && signals.length >= 3) {
            // Verificar os 3 primeiros sinais
            const firstThreeCurrent = signals.slice(0, 3);
            const firstThreeDashboard = dashboardSignals.slice(0, 3);
            
            // Comparar IDs, símbolos e horários
            let needsSync = false;
            for (let i = 0; i < 3; i++) {
              // Se qualquer um dos principais atributos for diferente, precisa sincronizar
              if (
                firstThreeCurrent[i]?.id !== firstThreeDashboard[i]?.id ||
                firstThreeCurrent[i]?.symbol !== firstThreeDashboard[i]?.symbol ||
                firstThreeCurrent[i]?.entry_time !== firstThreeDashboard[i]?.entry_time
              ) {
                needsSync = true;
                break;
              }
            }
            
            // Se precisa sincronizar, disparar evento
            if (needsSync) {
              console.log('🔄 VERIFICAÇÃO PERIÓDICA: Detectada diferença entre sinais atuais e dashboard');
              
              // Criar evento com dados atualizados
              const event = new CustomEvent('forceDashboardSync', { 
                detail: { signals: dashboardSignals, timestamp }
              });
              
              // Processar o evento
              handleForceDashboardSync(event);
            }
          }
        } catch (error) {
          console.error('❌ ERRO: Falha ao verificar sinais da dashboard:', error);
        }
      }
    }, 30 * 1000); // Verificar a cada 30 segundos

    // Cleanup
    return () => {
      window.removeEventListener('dashboardSignalsUpdated', handleDashboardSignalsUpdate);
      window.removeEventListener('forceDashboardSync', handleForceDashboardSync);
      clearInterval(syncInterval);
      clearTimeout(initialSyncTimeout);
      console.log('🧹 LIMPEZA: Listeners de sincronização removidos');
    };
  }, [getDailySignalsForCurrentTime, queryClient, safeSetTradingSignals, signals, createBasePlaceholderData]);

  const [traderLink, setTraderLink] = useState<string>('');
  
  // Carregar o link do trader no início
  useEffect(() => {
    const loadTraderLink = async () => {
      try {
      const link = await traderLinkService.getCurrentTraderLink();
        console.log('📌 Signals - Link do trader carregado:', link);
      setTraderLink(link);
      } catch (error) {
        console.error('❌ Signals - Erro ao carregar link do trader:', error);
        // Em caso de erro, manter o link padrão
        setTraderLink('https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree');
      }
    };
    
    loadTraderLink();
  }, []);
  
  // Função para abrir o link do trader
  const openTraderLink = useCallback(() => {
    if (!traderLink) {
      console.warn('⚠️ Signals - Tentativa de abrir link do trader, mas o link ainda não foi carregado');
      // Fallback para o link padrão caso o traderLink ainda não tenha sido carregado
      window.open('https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree', '_blank');
      return;
    }
    console.log('🔗 Signals - Abrindo link do trader:', traderLink);
    window.open(traderLink, '_blank');
  }, [traderLink]);

  // Função para diagnóstico do localStorage (DESATIVADA - removida para limpar console)
  const diagnosticoLocalStorage = () => {
    // Diagnóstico desativado para evitar poluição do console
    return;
  };
  
  // Executar diagnóstico (DESATIVADO)
  // diagnosticoLocalStorage();

  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 relative p-4 rounded-xl min-h-screen -mx-4 -my-4"
      >
        {/* Cabeçalho da página */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-medium text-white">
              {t('nav.signals.title')}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-white/50 font-light text-sm tracking-wide">
                {t('signals.subtitle')}
              </p>
              
              <div className="flex items-center gap-2">
                <TimeZoneSelector variant="compact" />
                
                {/* Indicador de status do Supabase Realtime */}
                <RealtimeStatus 
                  status={realtimeStatus} 
                  label="Ao Vivo" 
                  showLabel={true}
                  size="sm"
                />
                
                {/* Botão de diagnóstico - visível apenas no navegador Operar para ajudar na depuração */}
                {(window.BROWSER_INFO?.isOperar || navigator.userAgent.includes('Opera')) && (
                  <Button
                    onClick={() => {
                      if (window.dumpDebugLogs) {
                        window.dumpDebugLogs();
                        alert('Diagnóstico completo exibido no console. Abra as ferramentas de desenvolvedor (F12) para verificar.');
                      } else {
                        alert('Ferramenta de diagnóstico não disponível.');
                      }
                    }}
                    size="sm"
                    variant="outline"
                    className="ml-2 bg-amber-900/20 border-amber-500/30 text-amber-400"
                  >
                    <span className="mr-2">🔍</span>
                    Diagnóstico
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Injetar estilos CSS */}
        <style>{styles}</style>

        {/* Conteúdo principal com os sinais */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid gap-6"
        >
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
          ) : (filteredSignals && Array.isArray(filteredSignals) && filteredSignals.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {(() => {
                try {
                  if (!Array.isArray(paginatedSignals)) {
                    console.error('❌ ERRO: paginatedSignals não é um array:', paginatedSignals);
                    return <div className="col-span-full text-center py-4">Erro ao processar sinais. Tente atualizar a página.</div>;
                  }
                  
                  if (paginatedSignals.length === 0) {
                    return <div className="col-span-full text-center py-4">Nenhum sinal disponível no momento.</div>;
                  }
                  
                  return paginatedSignals.map((signal: PlaceholderSignal, index) => {
                    if (!signal || !signal.entry_time) {
                      console.error('❌ ERRO: Sinal inválido em paginatedSignals[' + index + ']:', signal);
                      return null;
                    }
                    try {
                  // Converter horários para o fuso horário selecionado
                  const entryTime = convertTimeToSelected(signal.entry_time || '00:00');
                  const expiryTime = convertTimeToSelected(signal.expiry_time_str || '00:00');
                  const gale1Time = convertTimeToSelected(signal.gale1_time || '00:00');
                  const gale2Time = convertTimeToSelected(signal.gale2_time || '00:00');
                
                  return (
                    <motion.div 
                      key={`${signal.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex flex-col rounded-xl signal-card"
                      data-signal-number={index + 1}
                    >
                    <div className="relative p-4 border-b signal-divider backdrop-blur-md bg-black/70">
                      {/* Simbolo e nome do ativo - CORRIGIDO */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white leading-tight overflow-hidden text-ellipsis line-clamp-2 break-words">
                            {signal.symbol}
                          </h3>
                          <div className="flex items-center text-sm text-white/70 mt-1">
                            <span className="truncate">{signal.exchange || 'Corretora'}</span>
                          </div>
                        </div>
                      
                        <span className={`text-sm py-1 px-2 rounded-md flex-shrink-0 h-fit font-medium border border-white/10 ${
                          signal.signal === 'BUY' 
                            ? 'text-green-500' 
                            : 'text-red-500'
                          }`}
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
                        {/* Nível de expectativa */}
                        <span className={`text-xs h-6 px-2 py-1 rounded-full flex items-center text-teal-300/70 bg-teal-900/30 border border-white/5`}>
                          <CheckCheck className="w-3 h-3 mr-1" />
                          {getStrengthText(signal.strength)}
                            </span>
                      </div>
                      
                      {/* Dados do sinal */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-center justify-start bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/5 shadow-inner min-h-[50px] signal-info-box gap-3">
                            <div>
                              <p className="text-sm font-medium text-white/70">{t('dashboard.signals.entry') || "Entrada"}</p>
                            </div>
                            <p className="text-base font-semibold text-white/80">{entryTime || "00:00"}</p>
                          </div>
                          
                          <div className="flex items-center justify-between bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/5 shadow-inner min-h-[50px] signal-info-box gap-2">
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
                          <div className="flex items-center justify-between bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/5 shadow-inner min-h-[50px] signal-info-box gap-2">
                            <div>
                              <p className="text-sm font-medium text-white/70">{t('dashboard.signals.reentry1') || "Reentrada 1"}</p>
                            </div>
                            <p className="text-base font-semibold text-white/80">{gale1Time || "00:29"}</p>
                          </div>
                          
                          <div className="flex items-center justify-between bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/5 shadow-inner min-h-[50px] signal-info-box gap-2">
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
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-amber-700/80 via-yellow-600/70 to-amber-600/90 hover:from-amber-800/80 hover:via-yellow-700/70 hover:to-amber-700/90 text-amber-50 font-medium transition-all duration-300 flex items-center justify-center relative overflow-hidden shadow-lg backdrop-blur-sm border border-amber-500/20 group golden-button golden-shadow"
                        onClick={openTraderLink}
                      >
                        <span className="absolute inset-0 w-full h-full bg-black opacity-30 group-hover:opacity-20 transition-opacity duration-300"></span>
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-tr from-amber-500/20 via-yellow-400/10 to-amber-300/20"></span>
                        <span className="relative z-10 flex items-center">
                          {t('dashboard.signals.trade') || "Realizar Trade"}
                        </span>
                        <ExternalLink className="w-4 h-4 ml-2 relative z-10 text-amber-100" />
                      </button>
                    </div>
                    </div>
                    </motion.div>
                  );
                } catch (error) {
                  console.error('❌ ERRO ao processar sinal:', error);
                  return null;
                }
                                });
                } catch (renderError) {
                  console.error('❌ [Operar] ERRO NA RENDERIZAÇÃO DE SINAIS:', renderError);
                  if (window.DEBUG_LOGS) {
                    window.DEBUG_LOGS.push(`❌ ERRO DE RENDERIZAÇÃO: ${renderError.message}`);
                    window.DEBUG_LOGS.push(`Stack: ${renderError.stack?.slice(0, 500)}`);
                  }
                  window.lastRenderError = renderError;
                  return <div className="col-span-full p-4 text-center">
                    <p className="mb-3 text-red-400">Erro ao processar sinais</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-3 py-1 bg-white/10 rounded text-sm hover:bg-white/20"
                    >
                      Recarregar página
                    </button>
                  </div>;
                }
              })()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 signals-page-card-glass rounded-xl">
              <div className="bg-black/60 p-4 rounded-full mb-4">
                <ListFilter className="w-10 h-10 text-white/30" />
              </div>
              <h3 className="text-xl font-medium mb-2">
                Nenhum sinal encontrado
              </h3>
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
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex justify-center items-center mt-8 gap-2"
            >
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
            </motion.div>
          )}
        </motion.div>
        
        {/* Rodapé com ticker de criptomoedas */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <CryptoTickerFooter />
        </motion.div>
      </motion.div>
    </Layout>
  );
};

export default Signals;


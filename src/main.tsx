import React, { StrictMode } from "react";
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 🔇 Suprimir avisos de bibliotecas externas
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  
  // Suprimir avisos específicos de bibliotecas
  if (
    message.includes('React Router Future Flag Warning') ||
    message.includes('Download the React DevTools') ||
    message.includes('startTransition') ||
    message.includes('v7_')
  ) {
    return; // Silenciar esses avisos
  }
  
  // Manter outros avisos importantes
  originalWarn.apply(console, args);
};

// ✅ CRÍTICO: Limpar APENAS caches de SINAIS (NUNCA tocar em auth!)
// Limpando caches de sinais (silenciado)

// Lista EXCLUSIVA de caches de sinais (NUNCA incluir auth, supabase, device, remember, etc.)
const signalCacheKeys = [
  'realtime_signals_cache',           // Dashboard (3 sinais)
  'realtime_signals_cache_date',      // Data do cache do Dashboard
  'extended_signals_cache',           // Aba Trades (7 sinais)
  'extended_signals_cache_date',      // Data do cache da aba Trades
  'tradesSignals',                    // Cache antigo
  'dailyTradingSignals',              // Cache antigo
  'dashboardSignals',                 // Cache antigo
  'persistent-signals-navigation',    // Cache de navegação entre páginas
  'trading-signals-cache',            // Cache adicional de trading
  'daily-signals-cache',              // Cache adicional diário
  'userNotifications',                // ✅ NOVO: Limpar notificações antigas do localStorage
  'pre-signal-notification-cache'     // ✅ NOVO: Limpar cache de pré-sinais
];

// 🔥 VERIFICAÇÃO DE SEGURANÇA: NUNCA remover chaves de autenticação
const protectedKeys = ['auth', 'supabase', 'device', 'remember', 'sb-'];

signalCacheKeys.forEach(key => {
  // Garantir que não é uma chave protegida
  const isProtected = protectedKeys.some(protectedKey => key.toLowerCase().includes(protectedKey));
  
  if (isProtected) {
    return;
  }
  
  const hadCache = localStorage.getItem(key) !== null;
  if (hadCache) {
    // Removendo cache de sinal (silenciado)
    localStorage.removeItem(key);
  }
});

// Caches limpos (silenciado)

import App from './App.tsx'
import './index.css'
import './global.css'
// Importar o patch de segurança para toasts
import './safe-toast-init'

// Removidas importações duplicadas de React, ReactDOM, QueryClient, etc.
import { BrowserRouter } from 'react-router-dom';

import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { TimeZoneProvider } from './contexts/TimeZoneContext.tsx';
import { NotificationProvider } from './contexts/NotificationContext.tsx';
import { TrendingNotificationProvider } from './contexts/TrendingNotificationContext.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import { Toaster } from 'sonner';

import { initAvatarPreloading, ensureAvatarPreloaded, getSavedAvatar, preloadImage } from './utils/imageUtils';
import { checkPendingSyncOnLoad, startUserSettingsSyncService } from './utils/userPersistence.ts';
import { ensureCorrectPort } from './utils/portRedirect';
import { getSupabase } from './lib/supabase';
import { userService } from './services/userService';
import { initVisibilityManager, setBackgroundMode } from './utils/visibilityManager';
import { removeCachesByPattern } from './utils/cacheValidator';

// ⚡ GARANTIR PORTA CORRETA ANTES DE QUALQUER COISA
ensureCorrectPort();

// 🗑️ LIMPEZA FORÇADA: Remover notificações antigas do localStorage
try {
  localStorage.removeItem('userNotifications');
  localStorage.removeItem('pre-signal-notification-cache');
} catch {
  // ignorar erros de limpeza
}

// Inicializar sistema de pré-carregamento de avatar para evitar flickering
// e garantir persistência entre sessões
initAvatarPreloading();

// Precarregar imagem do avatar no início da execução
const storedAvatar = getSavedAvatar();
if (storedAvatar) {
  // Criar imagem em background para precarregar
  preloadImage(storedAvatar)
    .then(() => {
      // Avatar precarregado (silenciado)
      // Notificar componentes sobre o avatar carregado
      window.dispatchEvent(new CustomEvent('avatar-loaded', { 
        detail: { avatarUrl: storedAvatar }
      }));
    })
    .catch(() => {});
}

// Verificar avatar sempre que a aba receber foco
window.addEventListener('focus', () => {
  ensureAvatarPreloaded(true);
});

// Verificar avatar quando a página estiver completamente carregada
window.addEventListener('load', () => {
  ensureAvatarPreloaded();
});

// Verificar também quando o usuário voltar à aplicação após suspender o dispositivo
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    ensureAvatarPreloaded(true);
  }
});

// ✅ SIMPLIFICAÇÃO: Limpeza única de chaves órfãs na primeira execução
if (!sessionStorage.getItem('app-initialized')) {
  // Primeira inicialização - limpando chaves órfãs
  
  const orphanKeys = [
    'trending-react-query',
    'REACT_QUERY_OFFLINE_CACHE',
    'needs-sync',
    'navigation-pending',
    'form-dirty',
    'unsaved-changes'
  ];
  
  orphanKeys.forEach(key => {
    if (localStorage.getItem(key) || sessionStorage.getItem(key)) {
      // Removendo chave antiga (silenciado)
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  });
  
  sessionStorage.setItem('app-initialized', 'true');
  // Limpeza concluída
}

// ✅ SIMPLIFICAÇÃO: React Query com configurações balanceadas + BACKGROUND
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000, // 3 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      refetchIntervalInBackground: true, // ✅ Continuar atualização em background
      retry: 2,
    },
  },
});

// React Query gerencia automaticamente refetch com refetchOnWindowFocus/refetchOnReconnect

// ✅ CORREÇÃO 3: Limpeza automática de localStorage (liberar espaço e evitar dados corrompidos)
function cleanOldCacheData() {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 dias
    let cleanedCount = 0;
    
    // Iniciando limpeza de cache
    
    keys.forEach(key => {
      // Limpar dados com timestamp antigo
      if (key.includes('_timestamp')) {
        try {
          const timestamp = parseInt(localStorage.getItem(key) || '0', 10);
          if (now - timestamp > MAX_AGE) {
            const dataKey = key.replace('_timestamp', '');
            localStorage.removeItem(key);
            localStorage.removeItem(dataKey);
            cleanedCount++;
            // Removido (silenciado)
          }
        } catch {
          // ignorar
        }
      }
    });
    
    // ✅ Limitar cache de traduções (máximo 500 entradas)
    try {
      const translationCache = localStorage.getItem('translation_cache_google');
      if (translationCache) {
        const parsed = JSON.parse(translationCache);
        const entries = Object.entries(parsed);
        if (entries.length > 500) {
          // Manter apenas as 500 mais recentes
          const limited = Object.fromEntries(entries.slice(-500));
          localStorage.setItem('translation_cache_google', JSON.stringify(limited));
          // Cache reduzido (silenciado)
          cleanedCount++;
        }
      }
    } catch {
      // ignorar
    }
  } catch {
    // ignorar erros de limpeza de cache
  }
}

// Executar limpeza após 5 segundos (não bloqueia inicialização)
setTimeout(cleanOldCacheData, 5000);

// Log do ambiente
// Ambiente e versão (silenciado)

// Obter instância única do Supabase para evitar múltiplas inicializações
const supabaseInstance = getSupabase();

// Adicionar a instância do Supabase ao objeto window para facilitar depuração
// e permitir acesso em outros módulos
(window as any).supabase = supabaseInstance;

// Configurações do toast - Estilo Dark na parte inferior
const toastOptions = {
  position: 'bottom-right' as const,
  duration: 5000,
  closeButton: true,
  richColors: true,
  theme: 'dark' as const,
  style: {
    background: 'rgb(17, 24, 39)', // bg-gray-900
    border: '1px solid rgb(55, 65, 81)', // border-gray-700
    color: 'rgb(243, 244, 246)', // text-gray-100
  },
};

// 🔥 Limpeza SEMPRE ao abrir nova aba/navegador (não confiar em timestamp)
// Limpando todos os caches de sinais (silenciado)
try {
  // SEMPRE limpar - timestamp não garante idade dos DADOS dentro do cache
  localStorage.removeItem('extended_signals_cache');
  localStorage.removeItem('extended_signals_cache_date');
  localStorage.removeItem('realtime_signals_cache');
  localStorage.removeItem('realtime_signals_cache_date');
  localStorage.removeItem('persistent-signals-navigation');
  localStorage.removeItem('trading-signals-cache');
  localStorage.removeItem('daily-signals-cache');
  localStorage.removeItem('userNotifications'); // ✅ Limpar notificações antigas
  localStorage.removeItem('pre-signal-notification-cache'); // ✅ Limpar cache de pré-sinais
  
  // Todos os caches limpos
} catch {
  // ignorar erros de limpeza inicial
}

// Inicializar o gerenciador de visibilidade
initVisibilityManager();

// Habilitar o modo background por padrão
setBackgroundMode(true);

// ✅ SISTEMA APRIMORADO: Força atualização quando a aba volta do background
let lastActiveTime = Date.now();
let backgroundStartTime: number | null = null;
const BACKGROUND_THRESHOLD = 15 * 1000; // 15 segundos (otimizado para responsividade)

// ✅ POLLING ADICIONAL: Verificar periodicamente se deve forçar update (funciona mesmo em background)
let backgroundCheckTimeout: NodeJS.Timeout | null = null;

const scheduleBackgroundCheck = () => {
  if (backgroundCheckTimeout) {
    clearTimeout(backgroundCheckTimeout);
  }
  
  backgroundCheckTimeout = setTimeout(() => {
    // Se está em background, agendar próxima verificação
    if (document.visibilityState === 'hidden' && backgroundStartTime) {
      // Em background (silenciado)
      
      // Continuar verificando
      scheduleBackgroundCheck();
    }
  }, 30000); // Verificar a cada 30 segundos
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const timeInBackground = backgroundStartTime ? Date.now() - backgroundStartTime : 0;
    
    // Aba voltou (silenciado)
    
    // Cancelar verificações de background
    if (backgroundCheckTimeout) {
      clearTimeout(backgroundCheckTimeout);
      backgroundCheckTimeout = null;
    }
    backgroundStartTime = null;
    
    // Se ficou mais de 15 segundos em background, forçar atualização
    if (timeInBackground > BACKGROUND_THRESHOLD) {
      // Forçando atualização (silenciado)
      
      // 1. Invalidar todas as queries do React Query
      queryClient.invalidateQueries();
      
      // 2. Disparar evento customizado para componentes específicos (Extended Signals, etc.)
      window.dispatchEvent(new CustomEvent('force-update-after-background', {
        detail: { timeInBackground }
      }));
      
      // 3. Disparar evento adicional para Dashboard
      window.dispatchEvent(new CustomEvent('force-refresh-signals', {
        detail: { reason: 'background-return', timeInBackground }
      }));
      
      // Eventos disparados (silenciado)
    } else {
      // Tempo curto (silenciado)
    }
    
    lastActiveTime = Date.now();
  } else {
    // Quando a aba fica oculta, salvar o timestamp
    // Aba foi para background (silenciado)
    backgroundStartTime = Date.now();
    lastActiveTime = Date.now();
    
    // Iniciar verificações periódicas em background
    scheduleBackgroundCheck();
  }
});

// Renderização do aplicativo
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <TimeZoneProvider>
          <AuthProvider>
            <UserProvider>
              <NotificationProvider>
                <QueryClientProvider client={queryClient}>
                  <Toaster {...toastOptions} />
                  <App />
                </QueryClientProvider>
              </NotificationProvider>
            </UserProvider>
          </AuthProvider>
        </TimeZoneProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>
);

// ✅ Importar serviço de notificações de sinais
import { signalNotificationService } from './services/signalNotifications';

// Verificar se a API do Supabase está acessível
supabaseInstance.auth.getSession().then(({ data, error }) => {
  if (!error) {
    // Conexão estabelecida
    
    // Só inicializar o serviço de usuários se houver uma sessão ativa
    if (data?.session?.user) {
      // Sessão ativa (silenciado)
      
      signalNotificationService.initialize().catch(() => {});
      
      userService.init().then(() => {
        try {
          import('./scripts/migrateAvatarsToDb').then((module) => {
            module.default();
          }).catch(() => {});
          
          import('./scripts/migrateUserNamesToDb').then((module) => {
            module.default();
          }).catch(() => {});
        } catch {
          // ignorar erros de migração
        }
      }).catch(() => {});
    }
  }
});

checkPendingSyncOnLoad().catch(() => {});

// Iniciar serviço de persistência global
const stopUserSettingsSync = startUserSettingsSyncService();

// ✅ CORREÇÃO: Não usar beforeunload (causa aviso do navegador)
// A limpeza será feita automaticamente pelo navegador

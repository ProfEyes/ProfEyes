import React, { StrictMode } from "react";
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider, persistQueryClientRestore } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
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
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import { Toaster } from 'sonner';

import { initAvatarPreloading, ensureAvatarPreloaded, getSavedAvatar, preloadImage } from './utils/imageUtils';
import { checkPendingSyncOnLoad, startUserSettingsSyncService } from './utils/userPersistence.ts';
import { ensureCorrectPort } from './utils/portRedirect';
import { getSupabase } from './lib/supabase';
import { userService } from './services/userService';
import { initVisibilityManager, setBackgroundMode } from './utils/visibilityManager';

// ⚡ GARANTIR PORTA CORRETA ANTES DE QUALQUER COISA
ensureCorrectPort();

// Inicializar sistema de pré-carregamento de avatar para evitar flickering
// e garantir persistência entre sessões
initAvatarPreloading();

// Precarregar imagem do avatar no início da execução
const storedAvatar = getSavedAvatar();
if (storedAvatar) {
  // Criar imagem em background para precarregar
  preloadImage(storedAvatar)
    .then(() => {
      console.log('Avatar precarregado com sucesso na inicialização');
      // Notificar componentes sobre o avatar carregado
      window.dispatchEvent(new CustomEvent('avatar-loaded', { 
        detail: { avatarUrl: storedAvatar }
      }));
    })
    .catch((error) => {
      console.warn('Erro ao precarregar avatar na inicialização:', error);
    });
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

// Cria uma instância do QueryClient com configuração ajustada
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutos
      gcTime: 20 * 60 * 1000, // 20 minutos (antigamente era cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Cria um persistidor para manter o estado do cache entre recarregamentos da página
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'trending-react-query',
  throttleTime: 1000,
})

// Restaura o estado do cache se disponível
try {
  persistQueryClientRestore({ queryClient, persister })
} catch (error) {
  console.error('Erro ao restaurar o estado do cache:', error)
}

// Log do ambiente
console.log(`Ambiente de execução: ${import.meta.env.MODE}`);
console.log(`Versão: ${import.meta.env.VITE_APP_VERSION || '1.0.0'}`);

// Obter instância única do Supabase para evitar múltiplas inicializações
const supabaseInstance = getSupabase();

// Adicionar a instância do Supabase ao objeto window para facilitar depuração
// e permitir acesso em outros módulos
(window as any).supabase = supabaseInstance;

// Configurações do toast
const toastOptions = {
  position: 'top-center' as const,
  duration: 3000,
  closeButton: true,
  richColors: true,
};

// Inicializar o gerenciador de visibilidade
initVisibilityManager();

// Habilitar o modo background por padrão
setBackgroundMode(true);

// Renderização do aplicativo
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <TimeZoneProvider>
            <AuthProvider>
              <UserProvider>
                <NotificationProvider>
                  <PersistQueryClientProvider
                    client={queryClient}
                    persistOptions={{ persister }}
                    onSuccess={() => console.log('Cache restaurado com sucesso')}
                  >
                    <Toaster {...toastOptions} />
                    <App />
                  </PersistQueryClientProvider>
                </NotificationProvider>
              </UserProvider>
            </AuthProvider>
          </TimeZoneProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);

// Verificar se a API do Supabase está acessível
supabaseInstance.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.warn('Erro ao verificar sessão do Supabase:', error.message);
  } else {
    console.log('Conexão com Supabase estabelecida');
    
    // Só inicializar o serviço de usuários se houver uma sessão ativa
    if (data?.session?.user) {
      console.log('Sessão ativa detectada, inicializando serviços de usuário...');
      
      // Inicializar o serviço de usuários para garantir persistência de perfis
      userService.init().then(() => {
        console.log('Serviço de usuários inicializado com sucesso');
        
        // Tentar inicializar tabelas necessárias para persistência de dados
        // incluindo persistência de avatares e nomes em user_profiles
        try {
          console.log('Inicializando serviços de migração de dados...');
          
          // Importação dinâmica para não bloquear o carregamento inicial
          import('./scripts/migrateAvatarsToDb').then((module) => {
            const initAvatarMigration = module.default;
            initAvatarMigration();
            console.log('Migração de avatares iniciada');
          }).catch(err => {
            console.warn('Aviso: migração de avatares falhou:', err);
          });
          
          // Importar migração de nomes de usuário
          import('./scripts/migrateUserNamesToDb').then((module) => {
            const initUserNameMigration = module.default;
            initUserNameMigration();
            console.log('Migração de nomes de usuário iniciada');
          }).catch(err => {
            console.warn('Aviso: migração de nomes falhou:', err);
          });
        } catch (initError) {
          console.warn('Não foi possível inicializar todos os serviços:', initError);
        }
      }).catch(err => {
        console.warn('Aviso: inicialização do serviço de usuários falhou:', err);
      });
    } else {
      console.log('Nenhuma sessão ativa - serviços de usuário serão inicializados após login');
    }
  }
});

// Verificar sincronização pendente durante o carregamento da aplicação
checkPendingSyncOnLoad().catch(error => {
  console.warn("Erro ao verificar sincronização pendente:", error);
});

// Iniciar serviço de persistência global
const stopUserSettingsSync = startUserSettingsSyncService();

// Registrar limpeza para quando a aplicação for fechada
window.addEventListener('beforeunload', () => {
  if (stopUserSettingsSync) {
    stopUserSettingsSync();
  }
});

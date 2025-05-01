import React from "react";
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider, persistQueryClientRestore } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import App from './App.tsx'
import './index.css'
import './global.css'
import { NotificationProvider } from './contexts/NotificationContext.tsx'
import { LanguageProvider } from './contexts/LanguageContext.tsx'
import { TimeZoneProvider } from './contexts/TimeZoneContext.tsx'

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

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <TimeZoneProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            maxAge: 24 * 60 * 60 * 1000, // 24 horas
          }}
        >
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </PersistQueryClientProvider>
      </TimeZoneProvider>
    </LanguageProvider>
  </React.StrictMode>
)

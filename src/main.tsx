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

// Cria uma instância do QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    },
  },
})

// Cria um persistidor para manter o estado do cache entre recarregamentos da página
const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

// Restaura o estado do cache se disponível
persistQueryClientRestore({ queryClient, persister })

createRoot(document.getElementById('root')!).render(
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
    }}
  >
    <NotificationProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </NotificationProvider>
  </PersistQueryClientProvider>
)

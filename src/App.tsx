import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Index from '@/pages/Index';
import Signals from '@/pages/Signals';
import Settings from '@/pages/Settings';
import News from '@/pages/News';
import NotificationsPage from '@/pages/Notifications';
import NotFound from '@/pages/NotFound';
import Auth from '@/pages/Auth';
import { startSignalMonitoring } from '@/services/signalMonitor';
import { useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from '@/contexts/UserContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Toaster as HotToaster } from 'react-hot-toast';
import Instructions from '@/pages/Instructions';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Duração do cache (10 minutos)
const CACHE_DURATION = 10 * 60 * 1000;

// Persister para dados do React Query
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'profeyes-query-cache', // Chave usada no localStorage
  throttleTime: 1000, // Salvar no máximo a cada 1 segundo
});

// Criar o cliente de query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Configurações padrão para todas as consultas
      refetchOnWindowFocus: false,  // Não atualizar quando a janela ganha foco
      refetchOnReconnect: false,    // Não atualizar quando reconecta à internet
      refetchOnMount: false,        // Não atualizar quando o componente monta
      staleTime: CACHE_DURATION,    // 10 minutos (mesmo tempo do cache)
      cacheTime: CACHE_DURATION * 2,// 20 minutos de cache
      retry: 1,                     // Apenas uma tentativa de retry
    },
  },
});

// Configurar persistência do cache do React Query
persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: CACHE_DURATION, // 10 minutos
  // Importante: tratar errors causados por deserialização de dados
  dehydrateOptions: {
    shouldDehydrateQuery: query => {
      // Só persiste queries que não são de tempo real (como sinais)
      return query.queryKey[0] === 'dashboardSignals' || 
             query.queryKey[0] === 'tradingSignals';
    },
  },
});

// Componente interno que usa os hooks para gerenciar rotas protegidas e públicas
const AppContent = () => {
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const [resourcesReady, setResourcesReady] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [appMounted, setAppMounted] = useState(false);

  // Efeito para controlar o carregamento inicial e recursos
  useEffect(() => {
    const loadResources = async () => {
      try {
        // Aguardar 6 segundos para a animação do logo
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        // Aqui você pode adicionar mais verificações de recursos se necessário
        // Por exemplo, carregar dados iniciais, configurações, etc.
        
        setResourcesReady(true);
      } catch (error) {
        console.error('Erro ao carregar recursos:', error);
        // Mesmo em caso de erro, permitimos que a aplicação continue
        setResourcesReady(true);
      }
    };

    if (!loading) {
      loadResources();
    }
  }, [loading]);

  // Iniciar monitoramento de sinais ao carregar a aplicação
  useEffect(() => {
    // Apenas inicia o monitoramento se o usuário estiver autenticado
    if (!user) return;
    
    // Configurar o monitor de sinais com callbacks para notificações
    const monitor = startSignalMonitoring({
      onSignalComplete: (signal) => {
        const statusText = signal.status === 'completed' ? 'alvo atingido' : 'stop atingido';
        
        toast.info(`Sinal ${signal.symbol} com ${statusText}`, {
          description: `O sinal de ${signal.type} para ${signal.symbol} foi atualizado.`,
          duration: 5000,
        });
        // Não invalidar cache para manter os sinais
      },
      onSignalReplaced: (newSignal) => {
        toast.success(`Novo sinal gerado: ${newSignal.pair}`, {
          description: `Um novo sinal de ${newSignal.type} foi gerado para substituir um sinal concluído.`,
          duration: 7000,
        });
        
        // Não invalidar cache para manter os sinais
      },
      onError: (error) => {
        toast.error('Erro ao monitorar sinais', {
          description: 'Ocorreu um erro durante o monitoramento. O sistema tentará novamente em breve.',
        });
        console.error('Erro no monitoramento de sinais:', error);
      }
    });
    
    // Parar o monitoramento quando o componente for desmontado
    return () => {
      monitor.stop();
    };
  }, [queryClient, user]);

  // Função para lidar com a conclusão da animação
  const handleLoadComplete = () => {
    setAnimationComplete(true);
  };

  // Pré-carregar a aplicação principal para evitar a tela cinza intermediária
  const [appContent, setAppContent] = useState<React.ReactNode>(null);
  const [fadeComplete, setFadeComplete] = useState(false);
  const [startFade, setStartFade] = useState(false);

  useEffect(() => {
    // Checar se todas as condições estão prontas para mostrar o app
    if (resourcesReady && animationComplete && !loading) {
      // Preparar o conteúdo do app antes de mostrar
      const content = (
        <>
          <BrowserRouter>
            <Routes>
              {/* Rotas públicas */}
              <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
              
              {/* Rotas protegidas que exigem autenticação */}
              <Route path="/" element={<AuthGuard checkOnly={true}><Index /></AuthGuard>} />
              <Route path="/signals" element={<AuthGuard checkOnly={true}><Signals /></AuthGuard>} />
              <Route path="/settings" element={<AuthGuard checkOnly={true}><Settings /></AuthGuard>} />
              <Route path="/news" element={<AuthGuard checkOnly={true}><News /></AuthGuard>} />
              <Route path="/notifications" element={<AuthGuard checkOnly={true}><NotificationsPage /></AuthGuard>} />
              <Route path="/instructions" element={<AuthGuard checkOnly={true}><Instructions /></AuthGuard>} />
              
              {/* Rota de fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </>
      );
      
      // Armazenar o conteúdo do app
      setAppContent(content);
      
      // Iniciar a sequência de fade
      setTimeout(() => {
        setStartFade(true);
      }, 1200);
    }
  }, [resourcesReady, animationComplete, loading, user]);
  
  // Efeito para controlar o fade in completo
  useEffect(() => {
    if (startFade) {
      setTimeout(() => {
        setFadeComplete(true);
        
        // Depois que o fade estiver completo, definir que o app está montado
        setTimeout(() => {
          setAppMounted(true);
        }, 300);
      }, 1500); // Tempo para a animação de fade
    }
  }, [startFade]);
  
  // Determinar se devemos mostrar a tela de carregamento
  const showLoadingScreen = !startFade;
  
  // Renderizar o aplicativo com transição suave entre telas
  if (showLoadingScreen) {
    return (
      <LoadingScreen 
        isReady={resourcesReady && animationComplete && !loading}
        onLoadComplete={handleLoadComplete}
      />
    );
  }
  
  // Retornar o conteúdo do app com fade in
  return (
    <div 
      className={`bg-black min-h-screen ${
        fadeComplete ? 'app-fade-in' : 'opacity-0'
      }`}
      style={{
        animationDelay: '200ms',
        animationDuration: '2200ms'
      }}
    >
      <HotToaster position="bottom-center" />
      {appContent}
    </div>
  );
};

// Componente principal que envolve a aplicação com o provider do React Query
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </UserProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

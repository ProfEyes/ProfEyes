import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Index from '@/pages/Index';
import Analysis from '@/pages/Analysis';
import Signals from '@/pages/Signals';
import Settings from '@/pages/Settings';
import News from '@/pages/News';
import Portfolio from '@/pages/Portfolio';
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
import Stocks from '@/pages/Stocks';

// Criar o cliente de query
const queryClient = new QueryClient();

// Componente interno que usa os hooks para gerenciar rotas protegidas e públicas
const AppContent = () => {
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const [resourcesReady, setResourcesReady] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Efeito para controlar o carregamento inicial e recursos
  useEffect(() => {
    const loadResources = async () => {
      try {
        // Aguardar pelo menos 4.5 segundos para a animação do logo
        await new Promise(resolve => setTimeout(resolve, 4500));
        
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
        const statusText = signal.status === 'CONCLUÍDO' ? 'alvo atingido' : 'stop atingido';
        
        toast.info(`Sinal ${signal.pair} com ${statusText}`, {
          description: `O sinal de ${signal.type} para ${signal.pair} foi atualizado.`,
          duration: 5000,
        });
        
        // Invalidar cache para atualizar interface
        queryClient.invalidateQueries({ queryKey: ['dashboardSignals'] });
        queryClient.invalidateQueries({ queryKey: ['tradingSignals'] });
      },
      onSignalReplaced: (newSignal) => {
        toast.success(`Novo sinal gerado: ${newSignal.pair}`, {
          description: `Um novo sinal de ${newSignal.type} foi gerado para substituir um sinal concluído.`,
          duration: 7000,
        });
        
        // Invalidar cache para atualizar interface
        queryClient.invalidateQueries({ queryKey: ['dashboardSignals'] });
        queryClient.invalidateQueries({ queryKey: ['tradingSignals'] });
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
  
  // Determinar se devemos mostrar a tela de carregamento
  const showLoadingScreen = !resourcesReady || !animationComplete || loading;
  
  if (showLoadingScreen) {
    return (
      <LoadingScreen 
        isReady={resourcesReady && !loading}
        onLoadComplete={handleLoadComplete}
      />
    );
  }
  
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Rota pública de autenticação */}
          <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
          
          {/* Rotas protegidas que exigem autenticação */}
          <Route path="/" element={<AuthGuard checkOnly={true}><Index /></AuthGuard>} />
          <Route path="/analysis" element={<AuthGuard checkOnly={true}><Analysis /></AuthGuard>} />
          <Route path="/signals" element={<AuthGuard checkOnly={true}><Signals /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard checkOnly={true}><Settings /></AuthGuard>} />
          <Route path="/news" element={<AuthGuard checkOnly={true}><News /></AuthGuard>} />
          <Route path="/portfolio" element={<AuthGuard checkOnly={true}><Portfolio /></AuthGuard>} />
          <Route path="/stocks" element={<AuthGuard checkOnly={true}><Stocks /></AuthGuard>} />
          <Route path="/notifications" element={<AuthGuard checkOnly={true}><NotificationsPage /></AuthGuard>} />
          
          {/* Rota de fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
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

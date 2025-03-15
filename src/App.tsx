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
import { motion } from 'framer-motion';

// Criar o cliente de query
const queryClient = new QueryClient();

// Componente interno que usa os hooks para gerenciar rotas protegidas e públicas
const AppContent = () => {
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const [initialLoading, setInitialLoading] = useState(true);

  // Efeito para simular um carregamento inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

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
  
  // Mostrar tela de carregamento inicial
  if (initialLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black overflow-hidden">
        <div className="flex flex-col items-center justify-center">
          <h1 
            style={{
              fontFamily: 'Mollen',
              fontWeight: 'bold',
              fontSize: '3.5rem',
              color: 'white',
              marginBottom: '2rem',
              letterSpacing: '0.05em'
            }}
          >
            ProfEyes
          </h1>
          
          <motion.div
            animate={{
              rotate: 360
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
            className="relative"
          >
            <div className="w-16 h-16 rounded-full border-t-4 border-l-4 border-r-4 border-b-4 border-b-transparent border-white/30 border-t-white/90 border-l-white/60 border-r-white/60"></div>
          </motion.div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Rota pública de autenticação */}
          <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
          
          {/* Rotas protegidas que exigem autenticação */}
          <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
          <Route path="/analysis" element={<AuthGuard><Analysis /></AuthGuard>} />
          <Route path="/signals" element={<AuthGuard><Signals /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
          <Route path="/news" element={<AuthGuard><News /></AuthGuard>} />
          <Route path="/portfolio" element={<AuthGuard><Portfolio /></AuthGuard>} />
          <Route path="/notifications" element={<AuthGuard><NotificationsPage /></AuthGuard>} />
          
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

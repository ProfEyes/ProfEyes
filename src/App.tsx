import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useEffect } from 'react';
import { toast } from 'sonner';
import Index from '@/pages/Index';
import Analysis from '@/pages/Analysis';
import Signals from '@/pages/Signals';
import Settings from '@/pages/Settings';
import News from '@/pages/News';
import Portfolio from '@/pages/Portfolio';
import NotFound from '@/pages/NotFound';
import { startSignalMonitoring } from '@/services/signalMonitor';
import { useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Criar o cliente de query
const queryClient = new QueryClient();

// Componente interno que usa os hooks
const AppContent = () => {
  const queryClient = useQueryClient();

  // Iniciar monitoramento de sinais ao carregar a aplicação
  useEffect(() => {
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
  }, [queryClient]);
  
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/news" element={<News />} />
          <Route path="/portfolio" element={<Portfolio />} />
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
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;

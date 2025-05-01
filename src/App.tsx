import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useEffect, useState, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import IndexPage from '@/pages/Index.tsx';
import Signals from '@/pages/Signals';
import Settings from '@/pages/Settings';
import News from '@/pages/News';
import NotificationsPage from '@/pages/Notifications';
import NotFound from '@/pages/NotFound';
import Auth from '@/pages/Auth';
import SplashScreen from '@/pages/SplashScreen';
import LanguageSelectPage from '@/pages/LanguageSelectPage';
import { startSignalMonitoring } from '@/services/signalMonitor';
import { useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from '@/contexts/UserContext';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Toaster as HotToaster } from 'react-hot-toast';
import Instructions from '@/pages/Instructions';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { initSoundSystem } from '@/utils/sounds';
import { SoundProvider } from '@/contexts/SoundContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import Support from '@/pages/Support';
import LivePage from '@/pages/LivePage';
import { LiveStreamProvider } from '@/contexts/LiveStreamContext';
import { LiveStreamPermissionProvider } from '@/components/LiveStreamPermissionProvider';
import MeetingRoom from '@/pages/MeetingRoom';

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
      gcTime: CACHE_DURATION * 2,   // 20 minutos de cache (antigamente era cacheTime)
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
const AppRouter = () => {
  const { user, loading } = useAuth();
  const { updateUserLanguage } = useLanguage();
  const location = useLocation();
  const isPublicRoute = location.pathname === '/splash' || location.pathname === '/auth';
  const [loadingProgress, setLoadingProgress] = useState(0);
  // Garante que a tela de carregamento nunca será exibida em rotas públicas
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  // Verificar se o usuário escolheu permanecer conectado
  const [rememberUser] = useState(() => localStorage.getItem('remember-user') === 'true');

  // Verificar se o usuário já selecionou um idioma após o login
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(() => {
    // Se não houver usuário, não precisamos verificar
    if (!user) return false;
    
    // Verificar primeiro no sessionStorage (tem prioridade porque é mais recente)
    const sessionLanguage = sessionStorage.getItem('user-selected-language');
    if (sessionLanguage) {
      console.log('Idioma encontrado no sessionStorage:', sessionLanguage);
      return true;
    }
    
    // Verificar se existe um idioma associado à conta do usuário
    const userLanguage = localStorage.getItem(`user-language-${user.id}`);
    if (userLanguage) return true;
    
    // Se não tiver idioma específico do usuário, verificar idioma global
    const appLanguage = localStorage.getItem('app-language');
    if (appLanguage) return true;
    
    // Nenhum idioma encontrado
    return false;
  });

  // Verificar se estamos sendo redirecionados da página de idioma
  useEffect(() => {
    // Verificar flags apenas uma vez no mount do componente para evitar loops
    const redirectingFromLanguage = sessionStorage.getItem('redirecting-from-language-select');
    const languageSelectionCompleted = sessionStorage.getItem('language-selection-completed');
    
    // Se temos o flag de redirecionamento da página de idioma
    if (redirectingFromLanguage === 'true' || languageSelectionCompleted === 'true') {
      // Limpar os flags de redirecionamento
      sessionStorage.removeItem('redirecting-from-language-select');
      
      // Forçar o estado para indicar que o idioma foi selecionado
      setHasSelectedLanguage(true);
      
      // Se temos um idioma no sessionStorage, usar ele para atualizar o usuário
      const sessionLanguage = sessionStorage.getItem('user-selected-language');
      if (sessionLanguage && user?.id) {
        updateUserLanguage(user.id, sessionLanguage as any);
        
        // Garantir que o idioma esteja definido no localStorage também
        localStorage.setItem(`user-language-${user.id}`, sessionLanguage);
        localStorage.setItem('app-language', sessionLanguage);
        
        console.log('Idioma atualizado após redirecionamento:', sessionLanguage);
      }
    }
  // Executar apenas uma vez na montagem do componente para evitar loops!
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando o usuário mudar, atualizar o estado de verificação de idioma
  // Adicionamos uma verificação para evitar loops infinitos
  const userIdRef = useRef(user?.id);
  const hasHandledLanguageCheck = useRef(false);

  // Simplificar o efeito para executar apenas quando o usuário realmente mudar
  useEffect(() => {
    // Se já verificamos para este usuário, não fazer nada
    if (user?.id === userIdRef.current && hasHandledLanguageCheck.current) {
      return;
    }
    
    // Atualizar a referência para a próxima comparação
    userIdRef.current = user?.id;
    
    if (user) {
      // Marcar que já fizemos a verificação
      hasHandledLanguageCheck.current = true;
      
      // Verificar primeiro no sessionStorage
      const sessionLanguage = sessionStorage.getItem('user-selected-language');
      if (sessionLanguage) {
        setHasSelectedLanguage(true);
        updateUserLanguage(user.id, sessionLanguage as any);
        return;
      }
      
      // Verificar se existe um idioma associado à conta do usuário
      const userLanguage = localStorage.getItem(`user-language-${user.id}`);
      
      if (userLanguage) {
        // Se já existe um idioma salvo para este usuário, usá-lo
        setHasSelectedLanguage(true);
      } else {
        // Se o usuário não tem idioma associado, verificar idioma global
        const appLanguage = localStorage.getItem('app-language');
        if (appLanguage) {
          // Associar o idioma atual ao usuário
          updateUserLanguage(user.id, appLanguage as any);
          setHasSelectedLanguage(true);
        } else {
          // Não tem idioma salvo para o usuário nem para o app
          setHasSelectedLanguage(false);
        }
      }
    } else {
      // Se não há usuário logado, resetar o estado
      setHasSelectedLanguage(false);
      hasHandledLanguageCheck.current = false;
    }
  // Dependências são apenas id do usuário e a função de atualização
  }, [user?.id, updateUserLanguage]);

  // Monitorar mudanças no estado de carregamento
  useEffect(() => {
    if (!loading) {
      // Quando o carregamento termina, definir o progresso como 100%
      setLoadingProgress(100);
      
      // Após um breve delay, esconder a tela de carregamento
      const timer = setTimeout(() => {
        setShowLoadingScreen(false);
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (!isPublicRoute && user) {
      // Só mostrar a tela de carregamento em rotas protegidas (depois da autenticação)
      // E apenas quando o usuário já estiver autenticado
      setShowLoadingScreen(true);
    }
  }, [loading, isPublicRoute, user]);
  
  // Simular progresso de carregamento quando estiver carregando
  useEffect(() => {
    if (loading && !isPublicRoute) {
      // Iniciar com 20% pois algumas coisas já carregaram
      setLoadingProgress(20);
      
      // Simular progresso incremental até 90% (os últimos 10% serão quando realmente completar)
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          // Acelerar no começo, desacelerar no fim para parecer mais natural
          const increment = prev < 30 ? 10 : prev < 60 ? 5 : prev < 80 ? 2 : 1;
          return Math.min(prev + increment, 90);
        });
      }, 300); // Reduzido de 500ms para 300ms para parecer mais rápido
      
      return () => clearInterval(interval);
    }
  }, [loading, isPublicRoute]);
  
  // Renderizar o spinner apenas se estiver carregando e não estiver em rota pública
  if (showLoadingScreen) {
    return (
      <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-black z-50">
        <div className="flex flex-col items-center max-w-xs w-full">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="w-full bg-gray-900 rounded-full h-2.5 mb-2">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-200 ease-out"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <p className="text-white/70 text-sm">
            {loadingProgress < 30 ? 'Iniciando aplicação...' : 
             loadingProgress < 60 ? 'Carregando dados...' : 
             loadingProgress < 90 ? 'Quase pronto...' : 'Finalizando...'}
          </p>
        </div>
      </div>
    );
  }

  // Memoizar a decisão de redirecionamento da rota principal para evitar renderizações em cascata
  const homePathElement = useMemo(() => {
    const languageSelectionCompleted = sessionStorage.getItem('language-selection-completed') === 'true';
    
    if (!user) {
      return <Navigate to="/splash" replace />;
    }
    
    if (!hasSelectedLanguage && !languageSelectionCompleted) {
      return <Navigate to="/language-select" replace />;
    }
    
    return <AuthGuard checkOnly={true}><IndexPage /></AuthGuard>;
  }, [user, hasSelectedLanguage]);

  // Memoizar a decisão para a rota de splash - implementação mais simples
  const splashPathElement = useMemo(() => {
    if (user || rememberUser) {
      return <Navigate to="/" replace />;
    }
    return <SplashScreen />;
  }, [user, rememberUser]);

  // Memoizar a decisão para a rota de autenticação com lógica mais clara
  const authPathElement = useMemo(() => {
    const languageSelectionCompleted = sessionStorage.getItem('language-selection-completed') === 'true';
    
    if (rememberUser) {
      return <Navigate to="/" replace />;
    }
    
    if (user) {
      if (hasSelectedLanguage || languageSelectionCompleted) {
        return <Navigate to="/" replace />;
      }
      return <Navigate to="/language-select" replace />;
    }
    
    return <Auth />;
  }, [user, hasSelectedLanguage, rememberUser]);

  // Memoizar decisão para a rota de seleção de idioma - simplificada
  const languageSelectPathElement = useMemo(() => {
    if (!user) {
      return <Navigate to="/auth" replace />;
    }
    return <LanguageSelectPage />;
  }, [user]);

  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/" element={homePathElement} />
      <Route path="/splash" element={splashPathElement} />
      <Route path="/auth" element={authPathElement} />
      
      {/* Rota de seleção de idioma - agora protegida, exige autenticação */}
      <Route path="/language-select" element={languageSelectPathElement} />
      
      {/* Rotas protegidas que exigem autenticação */}
      <Route path="/signals" element={<AuthGuard checkOnly={true}><Signals /></AuthGuard>} />
      <Route path="/settings" element={<AuthGuard checkOnly={true}><Settings /></AuthGuard>} />
      <Route path="/news" element={<AuthGuard checkOnly={true}><News /></AuthGuard>} />
      <Route path="/notifications" element={<AuthGuard checkOnly={true}><NotificationsPage /></AuthGuard>} />
      <Route path="/instructions" element={<AuthGuard checkOnly={true}><Instructions /></AuthGuard>} />
      <Route path="/support" element={<AuthGuard checkOnly={true}><Support /></AuthGuard>} />
      <Route path="/live" element={<AuthGuard checkOnly={true}><LivePage /></AuthGuard>} />
      <Route path="/live/:streamId" element={<AuthGuard checkOnly={true}><MeetingRoom /></AuthGuard>} />
      
      {/* Rota de fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Componente intermediário que faz a conexão entre Auth e Language providers
const AuthenticatedApp = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const notificationContext = useNotifications();
  
  // Inicializar sistema de sons ao montar o componente
  useEffect(() => {
    // Inicializa o sistema de sons
    initSoundSystem();
    console.log('Sistema de sons inicializado');
  }, []);

  // Efeito para monitoramento de sinais
  useEffect(() => {
    // Apenas inicia o monitoramento se o usuário estiver autenticado
    if (!user) return;
    
    // Configurar o monitor de sinais com callbacks para notificações
    const monitor = startSignalMonitoring(
      undefined, // callbacks não são necessários aqui
      undefined, // intervalo padrão
      notificationContext // passando o contexto de notificações
    );
    console.log('Monitoramento de sinais iniciado');
    
    // Limpar o monitoramento ao desmontar
    return () => {
      monitor.stop();
      console.log('Monitoramento de sinais parado');
    };
  }, [user, notificationContext]);
  
  // Quando o usuário é autenticado, salvar dados no localStorage para uso no LanguageContext
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('user-data', JSON.stringify({
          id: user.id,
          email: user.email
        }));
      } catch (error) {
        console.error('Erro ao salvar dados do usuário:', error);
      }
    } else {
      localStorage.removeItem('user-data');
    }
  }, [user]);
  
  return (
    <div className="bg-black min-h-screen">
      <HotToaster position="bottom-center" />
      <AppRouter />
      <Toaster />
    </div>
  );
};

// Componente principal que envolve a aplicação com o provider do React Query
const App = () => {
  const [didPreload, setDidPreload] = useState(false);
  
  // Pré-carregar dados essenciais quando o aplicativo monta
  useEffect(() => {
    // Usar um ID único para identificar esta instância de preload nos logs
    const preloadId = Math.random().toString(36).substring(2, 9);
    
    const preloadData = async () => {
      console.log(`Iniciando pré-carregamento de dados [${preloadId}]...`);
      
      try {
        // Usar Promise.allSettled para garantir que erros em um recurso não bloqueiem os outros
        await Promise.allSettled([
          // Pré-carrega os dados do dashboard (não espera pelo resultado)
          queryClient.prefetchQuery({
            queryKey: ['dashboardSignals'],
            queryFn: () => Promise.resolve([]),
            staleTime: 0, // Permitir atualização imediata quando houver dados reais
          }),
          
          // Pré-carregar imagens críticas em paralelo
          (async () => {
            const criticalImages = [
              '/profeyes-logo-removebg-preview.png', 
              '/favicon.ico'
            ];
            
            await Promise.allSettled(
              criticalImages.map(src => preloadImage(src))
            );
            console.log(`Imagens críticas pré-carregadas [${preloadId}]`);
          })(),
          
          // Pré-verifica disponibilidade de assets de vídeo (sem carregar o conteúdo completo)
          (async () => {
            try {
              const response = await fetch('/TUTORIAL PORTUGUES - TRENDING -FIX.mp4', { 
                method: 'HEAD',
                cache: 'force-cache'
              });
              console.log(`Vídeo tutorial está disponível [${preloadId}]:`, response.ok);
            } catch (e) {
              console.warn(`Erro ao verificar vídeo tutorial [${preloadId}]:`, e);
            }
          })(),
        ]);
        
        // Marca como pré-carregado
        setDidPreload(true);
        console.log(`Pré-carregamento concluído com sucesso [${preloadId}]`);
      } catch (error) {
        console.error(`Erro no pré-carregamento [${preloadId}]:`, error);
        // Continua mesmo com erro
        setDidPreload(true);
      }
    };
    
    preloadData();
  }, []);
  
  // Função auxiliar para pré-carregar imagens
  const preloadImage = (src: string) => {
    return new Promise((resolve, reject) => {
      // Verificar se a imagem já foi pré-carregada anteriormente
      const imageCache = localStorage.getItem('image-cache') || '{}';
      const cachedImages = JSON.parse(imageCache);
      
      // Se a imagem já foi carregada anteriormente, não tente novamente
      if (cachedImages[src] === true) {
        console.log(`Imagem ${src} já foi carregada anteriormente, pulando...`);
        return resolve(src);
      }
      
      // Alguns navegadores não suportam carregar favicon via Image
      if (src.includes('favicon.ico')) {
        console.log('Pulando pré-carregamento de favicon.ico pois está disponível por padrão');
        
        // Verificar se o favicon existe com uma requisição HEAD
        fetch(src, { method: 'HEAD', cache: 'force-cache' })
          .then(response => {
            if (response.ok) {
              // Marcar como carregado no cache
              cachedImages[src] = true;
              localStorage.setItem('image-cache', JSON.stringify(cachedImages));
              console.log(`Favicon verificado com sucesso: ${src}`);
            } else {
              console.warn(`Favicon não encontrado: ${src}. Tentando caminho alternativo...`);
            }
            resolve(src); // Resolvemos de qualquer forma para não bloquear outras operações
          })
          .catch(error => {
            console.warn(`Erro ao verificar favicon: ${error}`);
            resolve(null);
          });
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        // Marcar como carregado no cache
        cachedImages[src] = true;
        localStorage.setItem('image-cache', JSON.stringify(cachedImages));
        resolve(src);
      };
      img.onerror = () => {
        console.warn(`Falha ao pré-carregar: ${src}. Tentando caminho alternativo...`);
        
        // Tentar caminho alternativo se a imagem não foi encontrada
        if (src.startsWith('/')) {
          const alternativePath = src.substring(1); // Remover a barra inicial
          console.log(`Tentando caminho alternativo: ${alternativePath}`);
          
          const altImg = new Image();
          altImg.onload = () => {
            cachedImages[alternativePath] = true;
            localStorage.setItem('image-cache', JSON.stringify(cachedImages));
            resolve(alternativePath);
          };
          altImg.onerror = () => {
            console.warn(`Também falhou com caminho alternativo: ${alternativePath}`);
            resolve(null); // Resolve mesmo com erro para não bloquear outros carregamentos
          };
          altImg.src = alternativePath;
        } else {
          resolve(null); // Resolve mesmo com erro para não bloquear outros carregamentos
        }
      };
      img.src = src;
    });
  };
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <UserProvider>
              <SoundProvider>
                <LanguageProvider>
                  <LiveStreamProvider>
                    <LiveStreamPermissionProvider>
                      <AuthenticatedApp />
                    </LiveStreamPermissionProvider>
                  </LiveStreamProvider>
                </LanguageProvider>
              </SoundProvider>
            </UserProvider>
          </NotificationProvider>
        </AuthProvider>
        <Toaster />
        <HotToaster
          position="top-right"
          toastOptions={{
            // Estilo para os toasts
            style: {
              background: 'rgb(var(--bg-card))',
              color: 'rgb(var(--text-primary))',
              border: '1px solid rgb(var(--border))',
              padding: '12px 16px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            },
            // Duração padrão
            duration: 5000,
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;

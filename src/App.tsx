import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useEffect, useState, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import IndexPage from '@/pages/Index.tsx';
import Signals from '@/pages/Signals';
import Settings from '@/pages/Settings';
import News from '@/pages/News';
import NotificationsPage from '@/pages/Notifications';
import NotFound from '@/pages/NotFound';
import Auth from '@/pages/Auth';
import SplashScreen from '@/pages/SplashScreen';
import LanguageSelectPage from '@/pages/LanguageSelectPage';
import ResetPassword from '@/pages/ResetPassword';
// signalMonitor removido - funcionalidade obsoleta
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { TrendingNotificationProvider } from '@/contexts/TrendingNotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Toaster as HotToaster } from 'react-hot-toast';
import Instructions from '@/pages/Instructions';

// Importações das novas páginas
import MediaHub from '@/pages/MediaHub';
import VideoPlayerPage from '@/pages/VideoPlayerPage';
import ShortsPlayer from '@/pages/ShortsPlayer';
import UploadPage from '@/pages/UploadPage';
import { VideoProvider } from '@/contexts/VideoContext';

import { initSoundSystem } from '@/utils/sounds';
import { SoundProvider } from '@/contexts/SoundContext';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import Support from '@/pages/Support';
import LivePage from '@/pages/LivePage';
import { LiveStreamProvider } from '@/contexts/LiveStreamContext';
import { LiveStreamPermissionProvider } from '@/components/LiveStreamPermissionProvider';
import MeetingRoom from '@/pages/MeetingRoom';
import StreamerDashboard from '@/pages/StreamerDashboard';
import StreamViewer from '@/pages/StreamViewer';
import { AvatarPersistence } from '@/components/AvatarPersistence';
import { loadUserSettings, checkPendingSyncOnLoad } from '@/utils/userPersistence';

import { useUserPreferences } from '@/hooks/useUserPreferences';
import FreeStreaming from '@/pages/FreeStreaming';
import { FreeWebRTCProvider } from '@/contexts/FreeWebRTCContext';
import LiveKitStreaming from '@/pages/LiveKitStreaming';
import { LiveKitProvider } from '@/contexts/LiveKitContext';

// Duração do cache (10 minutos)
const CACHE_DURATION = 10 * 60 * 1000;

// Componente para gerenciar persistência de perfil do usuário
const UserProfilePersistence = () => {
  const { user } = useAuth();
  
  // Hook para carregar automaticamente todas as preferências do usuário
  useUserPreferences();

  useEffect(() => {
    // Verificar se há dados pendentes para sincronizar
    if (user) {
      checkPendingSyncOnLoad().catch(error => {
        console.warn("Erro ao verificar sincronização de perfil:", error);
      });
    }
  }, [user]);

  return null; // Componente sem renderização visual
};

// Componente interno que usa os hooks para gerenciar rotas protegidas e públicas
const AppRouter = () => {
  const { user, loading } = useAuth();
  const { updateUserLanguage } = useLanguage();
  const location = useLocation();
  const isPublicRoute = location.pathname === '/splash' || location.pathname === '/auth';
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [rememberUser] = useState(() => localStorage.getItem('remember-user') === 'true');
  const [redirectingFromLanguage, setRedirectingFromLanguage] = useState(false);
  const [isPageRefresh] = useState(() => {
    return window.performance && performance.getEntriesByType('navigation').length > 0 && 
           (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).type === 'reload';
  });

  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(() => {
    if (!user) return false;
    
    const sessionLanguage = sessionStorage.getItem('user-selected-language');
    if (sessionLanguage) {
      console.log('Idioma encontrado no sessionStorage:', sessionLanguage);
      return true;
    }
    
    const userLanguage = localStorage.getItem(`user-language-${user.id}`);
    if (userLanguage) return true;
    
    const appLanguage = localStorage.getItem('app-language');
    if (appLanguage) return true;
    
    return false;
  });

  const hasSelectedLanguageRef = useRef(hasSelectedLanguage);
  
  useEffect(() => {
    hasSelectedLanguageRef.current = hasSelectedLanguage;
  }, [hasSelectedLanguage]);

  useEffect(() => {
    const isRedirectingFromLanguage = sessionStorage.getItem('redirecting-from-language-select') === 'true';
    const languageSelectionCompleted = sessionStorage.getItem('language-selection-completed') === 'true';
    
    if (isRedirectingFromLanguage || languageSelectionCompleted) {
      setRedirectingFromLanguage(true);
      sessionStorage.removeItem('redirecting-from-language-select');
      sessionStorage.removeItem('language-selection-completed');
      
      setHasSelectedLanguage(true);
      
      setShowLoadingScreen(false);
      setLoadingProgress(100);
      
      const sessionLanguage = sessionStorage.getItem('user-selected-language');
      if (sessionLanguage && user?.id) {
        updateUserLanguage(user.id, sessionLanguage as Language);
        
        localStorage.setItem(`user-language-${user.id}`, sessionLanguage);
        localStorage.setItem('app-language', sessionLanguage);
        
        console.log('Idioma atualizado após redirecionamento:', sessionLanguage);
      }
    }
  }, [location.pathname, user, updateUserLanguage]);

  const userIdRef = useRef(user?.id);
  const hasHandledLanguageCheck = useRef(false);

  useEffect(() => {
    if (user?.id === userIdRef.current && hasHandledLanguageCheck.current) {
      return;
    }
    
    if (redirectingFromLanguage) {
      return;
    }
    
    userIdRef.current = user?.id;
    
    if (user) {
      hasHandledLanguageCheck.current = true;
      
      const sessionLanguage = sessionStorage.getItem('user-selected-language');
      if (sessionLanguage) {
        setHasSelectedLanguage(true);
        const existingLanguage = localStorage.getItem(`user-language-${user.id}`);
        if (existingLanguage !== sessionLanguage) {
        updateUserLanguage(user.id, sessionLanguage as Language);
        }
        return;
      }
      
      const userLanguage = localStorage.getItem(`user-language-${user.id}`);
      
      if (userLanguage) {
        setHasSelectedLanguage(true);
      } else {
        const appLanguage = localStorage.getItem('app-language');
        if (appLanguage) {
          const existingLanguage = localStorage.getItem(`user-language-${user.id}`);
          if (existingLanguage !== appLanguage) {
          updateUserLanguage(user.id, appLanguage as Language);
          }
          setHasSelectedLanguage(true);
        } else {
          setHasSelectedLanguage(false);
        }
      }
    } else {
      setHasSelectedLanguage(false);
      hasHandledLanguageCheck.current = false;
    }
  }, [user, user?.id, updateUserLanguage, redirectingFromLanguage]);

  useEffect(() => {
    if (isPageRefresh) {
      setShowLoadingScreen(false);
      setLoadingProgress(100);
      return;
    }

    if (!loading) {
      setLoadingProgress(100);
      
      const timer = setTimeout(() => {
        setShowLoadingScreen(false);
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (!isPublicRoute && user) {
      setShowLoadingScreen(true);
    }
  }, [loading, isPublicRoute, user, isPageRefresh]);
  
  useEffect(() => {
    const isFromLanguageSelect = 
      sessionStorage.getItem('redirecting-from-language-select') === 'true' ||
      sessionStorage.getItem('language-selection-completed') === 'true';
    
    if (isFromLanguageSelect) {
      console.log('Detectado redirecionamento da página de idioma, forçando fim do carregamento');
      setLoadingProgress(100);
      setShowLoadingScreen(false);
      
      setRedirectingFromLanguage(true);
      
      sessionStorage.removeItem('redirecting-from-language-select');
      sessionStorage.removeItem('language-selection-completed');
    }
  }, [location.pathname]);
  
  useEffect(() => {
    if (redirectingFromLanguage) {
      setLoadingProgress(100);
      setShowLoadingScreen(false);
      return;
    }
    
    if (loading && !isPublicRoute) {
      setLoadingProgress(20);
      
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          const increment = prev < 30 ? 10 : prev < 60 ? 5 : prev < 80 ? 2 : 1;
          return Math.min(prev + increment, 90);
        });
      }, 300);
      
      const safetyTimeout = setTimeout(() => {
        console.warn('Timeout de segurança ativado: forçando fim do carregamento');
        setLoadingProgress(100);
        setShowLoadingScreen(false);
      }, 10000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(safetyTimeout);
      };
    }
  }, [loading, isPublicRoute, redirectingFromLanguage]);
  
  const homePathElement = useMemo(() => {
    if (!user) {
      return <Navigate to="/splash" replace />;
    }

    // Definir português como idioma padrão se não houver nenhum
    if (!localStorage.getItem('app-language')) {
      localStorage.setItem('app-language', 'pt');
    }

    // Sempre marcar que o idioma foi selecionado
    sessionStorage.setItem('language-selection-completed', 'true');

    // Ir direto para a página inicial
    return <AuthGuard checkOnly={true}><IndexPage /></AuthGuard>;
  }, [user]);

  const splashPathElement = useMemo(() => {
    if (user || rememberUser) {
      return <Navigate to="/" replace />;
    }
    return <SplashScreen />;
  }, [user, rememberUser]);

  const authPathElement = useMemo(() => {
    const languageSelectionCompleted = sessionStorage.getItem('language-selection-completed') === 'true';
    
    // ULTRA-CRÍTICO: VERIFICAÇÕES MÁXIMAS para garantir tela de cadastro concluído
    const justRegistered = sessionStorage.getItem('just-registered') === 'true';
    const preventAuthRedirect = sessionStorage.getItem('prevent_auth_redirect') === 'true';
    const preventDashboardRedirect = localStorage.getItem('prevent_dashboard_redirect') === 'true';
    
    // Verificar expiração da flag prevent_dashboard_redirect
    let preventDashboardRedirectValid = preventDashboardRedirect;
    if (preventDashboardRedirect) {
      const expirationTime = localStorage.getItem('prevent_dashboard_redirect_expiration');
      if (expirationTime && parseInt(expirationTime) < Date.now()) {
        console.log('🕒 Flag prevent_dashboard_redirect expirada, removendo...');
        localStorage.removeItem('prevent_dashboard_redirect');
        localStorage.removeItem('prevent_dashboard_redirect_expiration');
        preventDashboardRedirectValid = false;
      }
    }
    
    const cadastroConcluido = justRegistered || preventAuthRedirect || preventDashboardRedirectValid;
    
    // Log detalhado para debug
    console.log('🔍 [App.tsx authPathElement] Estado:', {
      user: !!user,
      rememberUser,
      justRegistered,
      preventAuthRedirect,
      preventDashboardRedirect: preventDashboardRedirectValid,
      cadastroConcluido,
      hasSelectedLanguage,
      languageSelectionCompleted
    });
    
    // ULTRA-CRÍTICO: Se acabou de se cadastrar, SEMPRE mostrar Auth (tela de sucesso)
    // Esta verificação tem PRIORIDADE ABSOLUTA MÁXIMA sobre todas as outras
    if (cadastroConcluido) {
      console.log('🔒 PROTEÇÃO MÁXIMA: Proteções anti-redirecionamento ativadas, mantendo tela de cadastro');
      console.log('🔒 Proteções ativas:', { justRegistered, preventAuthRedirect, preventDashboardRedirect: preventDashboardRedirectValid });
      
      // Forçar logout para garantir que não haverá redirecionamento automático
      if (user) {
        console.log('🔒 Usuário autenticado detectado durante cadastro concluído, forçando logout...');
        setTimeout(() => {
          try {
            import('@/lib/supabase').then(({ getSupabase }) => {
              (getSupabase() as SupabaseClient<Database>).auth.signOut();
              console.log('🔒 Logout forçado realizado com sucesso');
            });
          } catch (e) {
            console.warn('Erro ao forçar logout:', e);
          }
        }, 100);
      }
      
      return <Auth />;
    }
    
    // Só processar outros redirecionamentos se NÃO acabou de se cadastrar
    if (!cadastroConcluido) {
      // CORREÇÃO: Só redirecionar se rememberUser E tiver usuário
      if (rememberUser && user) {
        console.log('🔄 RememberUser ativo com usuário: redirecionando para dashboard');
        return <Navigate to="/" replace />;
      }
      
      if (user) {
        if (hasSelectedLanguage || languageSelectionCompleted) {
          console.log('🔄 Usuário logado com idioma selecionado: redirecionando para dashboard');
          return <Navigate to="/" replace />;
        }
        console.log('🔄 Usuário logado sem idioma: redirecionando para seleção de idioma');
        return <Navigate to="/language-select" replace />;
      }
    }
    
    // Se não tem usuário ou outros casos, mostrar Auth
    console.log('📱 Mostrando tela Auth (login/cadastro)');
    return <Auth />;
  }, [user, rememberUser, hasSelectedLanguage]);

  const languageSelectPathElement = useMemo(() => {
    if (!user) {
      return <Navigate to="/auth" replace />;
    }
    return <LanguageSelectPage />;
  }, [user]);

  const memoizedRoutes = useMemo(() => (
    <Routes>
      <Route path="/" element={homePathElement} />
      <Route path="/splash" element={splashPathElement} />
      <Route path="/auth" element={authPathElement} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      <Route path="/language-select" element={languageSelectPathElement} />
      
      <Route path="/signals" element={<AuthGuard checkOnly={true}><Signals /></AuthGuard>} />
      <Route path="/settings" element={<AuthGuard checkOnly={true}><Settings /></AuthGuard>} />
      <Route path="/news" element={<AuthGuard checkOnly={true}><News /></AuthGuard>} />
      <Route path="/notifications" element={<AuthGuard checkOnly={true}><NotificationsPage /></AuthGuard>} />
      <Route path="/instructions" element={<AuthGuard checkOnly={true}><Instructions /></AuthGuard>} />
      <Route path="/support" element={<AuthGuard checkOnly={true}><Support /></AuthGuard>} />
      
      {/* Novas rotas para o sistema de mídia */}
      <Route path="/media" element={<AuthGuard checkOnly={true}><MediaHub /></AuthGuard>} />
      <Route path="/video/:id" element={<AuthGuard checkOnly={true}><VideoPlayerPage /></AuthGuard>} />
      <Route path="/shorts" element={<AuthGuard checkOnly={true}><ShortsPlayer /></AuthGuard>} />
      <Route path="/shorts/:id" element={<AuthGuard checkOnly={true}><ShortsPlayer /></AuthGuard>} />
      <Route path="/upload" element={<AuthGuard checkOnly={true}><UploadPage /></AuthGuard>} />
      
      {/* Rotas existentes de streaming */}
      <Route path="/live" element={<AuthGuard checkOnly={true}><LivePage /></AuthGuard>} />
      <Route path="/live/:streamId" element={<AuthGuard checkOnly={true}><MeetingRoom /></AuthGuard>} />
      <Route path="/streamer/:streamId" element={<AuthGuard checkOnly={true}><StreamerDashboard /></AuthGuard>} />
      <Route path="/watch/:streamId" element={<AuthGuard checkOnly={true}><StreamViewer /></AuthGuard>} />
      <Route path="/streaming" element={<AuthGuard checkOnly={true}><FreeStreaming /></AuthGuard>} />
      <Route path="/livekit-streaming" element={<AuthGuard checkOnly={true}><LiveKitStreaming /></AuthGuard>} />
      <Route path="/livekit-streaming/:roomId" element={<AuthGuard checkOnly={true}><LiveKitStreaming /></AuthGuard>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  ), [homePathElement, splashPathElement, authPathElement, languageSelectPathElement]);
  
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

  return memoizedRoutes;
};



const App = () => {
  const [didPreload, setDidPreload] = useState(false);
  const queryClient = useQueryClient();
  
  // Inicialização de sistemas críticos
  useEffect(() => {
    initSoundSystem();
    console.log('Sistema de sons inicializado');
  }, []);
  
  useEffect(() => {
    const preloadId = Math.random().toString(36).substring(2, 9);
    
    const preloadData = async () => {
      console.log(`Iniciando pré-carregamento de dados [${preloadId}]...`);
      
      try {
        await Promise.allSettled([
          queryClient.prefetchQuery({
            queryKey: ['dashboardSignals'],
            queryFn: () => Promise.resolve([]),
            staleTime: 0,
          }),
          
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
        
        setDidPreload(true);
        console.log(`Pré-carregamento concluído com sucesso [${preloadId}]`);
      } catch (error) {
        console.error(`Erro no pré-carregamento [${preloadId}]:`, error);
        setDidPreload(true);
      }
    };
    
    preloadData();
  }, [queryClient]);
  
  // Removido useEffect duplicado que chamava initSoundSystem()

  useEffect(() => {
    const savedAvatar = localStorage.getItem('user-avatar');
    if (savedAvatar) {
      preloadImage(savedAvatar);
    }
    
    preloadImage('/profeyes-logo-removebg-preview.png');
    preloadImage('/placeholder.svg');
    
    preloadImage('/user-avatar.png');
  }, []);

  const preloadImage = (src: string) => {
    return new Promise((resolve, reject) => {
      const imageCache = localStorage.getItem('image-cache') || '{}';
      const cachedImages = JSON.parse(imageCache);
      
      if (cachedImages[src] === true) {
        console.log(`Imagem ${src} já foi carregada anteriormente, pulando...`);
        return resolve(src);
      }
      
      if (src.includes('favicon.ico')) {
        console.log('Pulando pré-carregamento de favicon.ico pois está disponível por padrão');
        
        fetch(src, { method: 'HEAD', cache: 'force-cache' })
          .then(response => {
            if (response.ok) {
              cachedImages[src] = true;
              localStorage.setItem('image-cache', JSON.stringify(cachedImages));
              console.log(`Favicon verificado com sucesso: ${src}`);
            } else {
              console.warn(`Favicon não encontrado: ${src}. Tentando caminho alternativo...`);
            }
            resolve(src);
          })
          .catch(error => {
            console.warn(`Erro ao verificar favicon: ${error}`);
            resolve(null);
          });
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        cachedImages[src] = true;
        localStorage.setItem('image-cache', JSON.stringify(cachedImages));
        resolve(src);
      };
      img.onerror = () => {
        console.warn(`Falha ao pré-carregar: ${src}. Tentando caminho alternativo...`);
        
        if (src.startsWith('/')) {
          const alternativePath = src.substring(1);
          console.log(`Tentando caminho alternativo: ${alternativePath}`);
          
          const altImg = new Image();
          altImg.onload = () => {
            cachedImages[alternativePath] = true;
            localStorage.setItem('image-cache', JSON.stringify(cachedImages));
            resolve(alternativePath);
          };
          altImg.onerror = () => {
            console.warn(`Também falhou com caminho alternativo: ${alternativePath}`);
            resolve(null);
          };
          altImg.src = alternativePath;
        } else {
          resolve(null);
        }
      };
      img.src = src;
    });
  };

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);

  useEffect(() => {
    // Handler para quando o app volta do background
    const handleBackgroundResume = () => {
      // Não mostrar nenhum indicador visual de carregamento
      setShowLoadingScreen(false);
      setLoadingProgress(100);
    };

    window.addEventListener('background-resume', handleBackgroundResume);
    
    return () => {
      window.removeEventListener('background-resume', handleBackgroundResume);
    };
  }, []);

  // Forçar que o usuário sempre tenha um idioma selecionado para evitar redirecionamento
  useEffect(() => {
    // Se não há idioma definido, definir português como padrão
    if (!localStorage.getItem('app-language')) {
      localStorage.setItem('app-language', 'pt');
    }
    
    // Se o usuário está logado, garantir que tenha idioma associado
    const user = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}')?.user;
    if (user?.id && !localStorage.getItem(`user-language-${user.id}`)) {
      localStorage.setItem(`user-language-${user.id}`, 'pt');
    }

    // Marcar que o idioma foi selecionado para evitar redirecionamento
    sessionStorage.setItem('language-selection-completed', 'true');
  }, []);

  return (
    <TrendingNotificationProvider>
      <SoundProvider>
        <VideoProvider>
          <LiveStreamProvider>
            <FreeWebRTCProvider>
              <LiveKitProvider>
                <LiveStreamPermissionProvider>
                  <AvatarPersistence />
                  <UserProfilePersistence />
                  <div className="bg-black min-h-screen">
                    <HotToaster position="bottom-center" />
                    <AppRouter />
                    <Toaster />
                  </div>
                </LiveStreamPermissionProvider>
              </LiveKitProvider>
            </FreeWebRTCProvider>
          </LiveStreamProvider>
        </VideoProvider>
      </SoundProvider>
    </TrendingNotificationProvider>
  );
};

export default App;

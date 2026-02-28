import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  LayoutDashboard, 
  Newspaper, 
  Settings, 
  Signal,
  Bell,
  Check,
  HelpCircle,
  MessageSquare,
  Video
} from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNotifications } from "@/contexts/NotificationContext";
import { useUser } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect, useRef } from 'react';
import { supabase } from "@/lib/supabase";
import { Badge } from '@/components/ui/badge';
import { ProfileMenu } from "@/components/ui/profile-menu";
import { isBackgroundModeEnabled } from '../utils/visibilityManager';
// Importar o componente de teste apenas em ambiente de desenvolvimento
// import StreamTestUI from '@/components/dev/StreamTestUI';

interface LayoutProps {
  children: React.ReactNode;
}

// Componente personalizado para o badge de notificação
const NotificationBadge = ({ count }: { count: number }) => {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ 
        type: "spring",
        stiffness: 500,
        damping: 15
      }}
      className="relative ml-auto flex items-center justify-center"
    >
      <span className="absolute inset-0 rounded-full animate-ping bg-red-500 opacity-40"></span>
      <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-red-600 px-1.5 text-xs font-semibold text-white shadow-lg ring-1 ring-inset ring-white/10">
        {count}
      </span>
    </motion.div>
  );
};

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  
  // Usando o contexto real de notificações
  const { notifications, unreadCount } = useNotifications();
  const readCount = notifications.filter(n => n.read).length;
  
  // Usando o contexto do usuário
  const { userName, avatarUrl, refreshUserData } = useUser();
  
  // Estado para rastrear transmissões ativas
  const [liveStreamsCount, setLiveStreamsCount] = useState(0);
  
  // Estado para verificar se o componente carregou corretamente
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  
  // Referência para controlar se veio da página de seleção de idioma
  const fromLanguageSelectRef = useRef(
    sessionStorage.getItem('redirecting-from-language-select') === 'true' ||
    sessionStorage.getItem('language-selection-completed') === 'true'
  );
  
  // Verificar e limpar flags de redirecionamento
  useEffect(() => {
    const checkRedirectionFlags = () => {
      const redirectingFromLanguage = sessionStorage.getItem('redirecting-from-language-select') === 'true';
      const languageSelectionCompleted = sessionStorage.getItem('language-selection-completed') === 'true';
      
      if (redirectingFromLanguage || languageSelectionCompleted) {
        console.log('Layout detectou redirecionamento da página de idioma, limpando flags');
        
        // Limpar flags de redirecionamento
        sessionStorage.removeItem('redirecting-from-language-select');
        sessionStorage.removeItem('language-selection-completed');
        
        // Forçar a atualização de dados do usuário
        refreshUserData();
      }
    };
    
    // Verificar flags no carregamento
    checkRedirectionFlags();
    
    // Marcar componente como carregado após um breve delay
    const timer = setTimeout(() => {
      setLayoutLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [refreshUserData]);
  
  // Forçar renderização completa quando vem da página de seleção de idioma
  useEffect(() => {
    if (fromLanguageSelectRef.current) {
      // Aplicar estilos globais para garantir renderização correta
      document.documentElement.classList.add('layout-forced');
      document.body.classList.add('bg-black');
      
      // Limpar a referência após o uso
      fromLanguageSelectRef.current = false;
    }
    
    return () => {
      document.documentElement.classList.remove('layout-forced');
    };
  }, []);
  
  // Precarregar o avatar no cache do navegador para evitar flickering
  useEffect(() => {
    const preloadAvatar = () => {
      // Verificar primeiro no localStorage
      const storedAvatar = localStorage.getItem("user-avatar");
      const avatarToPreload = storedAvatar || avatarUrl;
      
      if (avatarToPreload) {
        const img = new Image();
        img.src = avatarToPreload;
      }
    };
    
    // Precarregar imediatamente
    preloadAvatar();
    
    // Precarregar quando a página carregar completamente
    window.addEventListener('load', preloadAvatar);
    
    return () => {
      window.removeEventListener('load', preloadAvatar);
    };
  }, [avatarUrl]);
  
  // Efeito para verificar alterações na foto de perfil e recarregar dados ao trocar abas
  useEffect(() => {
    // Função para verificar e atualizar dados do usuário silenciosamente
    const syncUserData = async () => {
      // Se o modo background está ativo, não fazer nada
      if (isBackgroundModeEnabled()) {
        return;
      }
      await refreshUserData();
    };

    // Verificar avatar no localStorage silenciosamente
    const storedAvatar = localStorage.getItem("user-avatar");
    if (!avatarUrl && storedAvatar) {
      syncUserData();
    }

    // Executar na montagem do componente
    syncUserData();
    
    // Handler para quando o app volta do background
    const handleBackgroundResume = () => {
      // Se o modo background está ativo, não fazer nada
      if (isBackgroundModeEnabled()) {
        return;
      }
      syncUserData();
    };
    
    // Handler para eventos de avatar atualizado
    const handleAvatarUpdated = () => {
      syncUserData();
    };
    
    window.addEventListener('background-resume', handleBackgroundResume);
    window.addEventListener('avatar-updated', handleAvatarUpdated);
    
    return () => {
      window.removeEventListener('background-resume', handleBackgroundResume);
      window.removeEventListener('avatar-updated', handleAvatarUpdated);
    };
  }, [refreshUserData, avatarUrl]);
  
  // Verificar transmissões ativas
  useEffect(() => {
    const checkActiveStreams = async () => {
      try {
        const { data, error } = await supabase
          .from('live_streams')
          .select('id')
          .eq('status', 'live');
          
        if (!error && data) {
          setLiveStreamsCount(data.length);
        }
      } catch (error) {
        console.error('Erro ao verificar transmissões ativas:', error);
      }
    };
    
    // Verificar streams ativos na inicialização
    checkActiveStreams();
    
    // Usar polling em vez de Realtime para verificar streams ativos
    const pollingInterval = setInterval(checkActiveStreams, 30000); // A cada 30 segundos
      
    return () => {
      clearInterval(pollingInterval);
    };
  }, []);
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Verificar se estamos em ambiente de desenvolvimento
  const isDevelopment = import.meta.env.DEV;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-white/5">
          <SidebarHeader className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Logo />
            </div>
            <ProfileMenu />
          </SidebarHeader>
          <SidebarContent className="p-4 flex flex-col h-[calc(100vh-65px)]">
            {/* Seção principal de navegação */}
            <nav className="space-y-0.5">
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start gap-3 py-3 text-sm font-medium transition-all",
                  "hover:bg-white/5 text-white/80 hover:text-white",
                  isActive('/') 
                    ? "bg-white/5 text-white border-l-2 border-white/60 pl-3" 
                    : "pl-4"
                )} 
                onClick={() => {
                  // Não limpar caches automaticamente ao trocar de aba - isso causa problemas de duplicação
                  navigate('/');
                }}
              >
                <LayoutDashboard className="h-4 w-4 opacity-70" />
                {t('nav.dashboard')}
              </Button>
               
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start gap-3 py-3 text-sm font-medium transition-all",
                  "hover:bg-white/5 text-white/80 hover:text-white",
                  isActive('/signals') 
                    ? "bg-white/5 text-white border-l-2 border-white/60 pl-3" 
                    : "pl-4"
                )} 
                onClick={() => {
                  // Não limpar caches automaticamente ao trocar de aba - isso causa problemas de duplicação
                  navigate('/signals');
                }}
              >
                <Signal className="h-4 w-4 opacity-70" />
                {t('nav.signals') || 'Trades'}
              </Button>
               
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start gap-3 py-3 text-sm font-medium transition-all",
                  "hover:bg-white/5 text-white/80 hover:text-white",
                  isActive('/news') 
                    ? "bg-white/5 text-white border-l-2 border-white/60 pl-3" 
                    : "pl-4"
                )} 
                onClick={() => navigate('/news')}
              >
                <Newspaper className="h-4 w-4 opacity-70" />
                {t('nav.news') || 'Notícias'}
              </Button>
              
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start gap-3 py-3 text-sm font-medium transition-all",
                  "hover:bg-white/5 text-white/80 hover:text-white",
                  isActive('/instructions') 
                    ? "bg-white/5 text-white border-l-2 border-white/60 pl-3" 
                    : "pl-4"
                )} 
                onClick={() => navigate('/instructions')}
              >
                <HelpCircle className="h-4 w-4 opacity-70" />
                {t('nav.instructions')}
              </Button>
              
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start gap-3 py-3 text-sm font-medium transition-all",
                  "hover:bg-white/5 text-white/80 hover:text-white",
                  isActive('/live') 
                    ? "bg-white/5 text-white border-l-2 border-white/60 pl-3" 
                    : "pl-4"
                )} 
                onClick={() => navigate('/live')}
              >
                <Video className="h-4 w-4 opacity-70" />
                {t('nav.live') || 'Ao Vivo'}
                {/* Indicador de transmissão ativa */}
                {liveStreamsCount > 0 && (
                  <span className="ml-auto relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </Button>
            </nav>
            
            {/* Divisor que separa as seções */}
            <div className="my-4 flex items-center gap-2 px-2">
              <div className="h-px flex-1 bg-white/5"></div>
                                            <span className="text-[10px] uppercase text-white/30 font-medium">{t('nav.settings.notifications') || 'Área do Usuário'}</span>
              <div className="h-px flex-1 bg-white/5"></div>
            </div>
            
            {/* Seção de configurações e notificações */}
            <nav className="space-y-0.5">
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start gap-3 py-3 text-sm font-medium transition-all notification-button-group relative",
                  "hover:bg-white/5 text-white/80 hover:text-white",
                  isActive('/notifications') && !location.search.includes('filter=read')
                    ? "bg-white/5 text-white border-l-2 border-white/60 pl-3" 
                    : "pl-4"
                )} 
                onClick={() => navigate('/notifications')}
              >
                <div className="relative">
                  <Bell className="h-4 w-4 opacity-70 notification-button-group-hover:opacity-0 transition-opacity" />
                  <motion.div 
                    className="absolute inset-0 opacity-0 notification-button-group-hover:opacity-100 transition-opacity"
                    animate={isActive('/notifications') || false ? { rotate: [0, -10, 10, -5, 5, 0] } : { rotate: 0 }}
                    transition={{ 
                      duration: 0.5, 
                      repeat: (isActive('/notifications') && unreadCount > 0) ? Infinity : 0, 
                      repeatDelay: 4 
                    }}
                  >
                    <Bell className="h-4 w-4 text-white" />
                  </motion.div>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
                <span>{t('nav.notifications') || 'Notificações'}</span>
                {unreadCount > 0 && (
                  <NotificationBadge count={unreadCount} />
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start gap-3 py-3 text-sm font-medium transition-all",
                  "hover:bg-white/5 text-white/80 hover:text-white",
                  isActive('/settings') 
                    ? "bg-white/5 text-white border-l-2 border-white/60 pl-3" 
                    : "pl-4"
                )} 
                onClick={() => navigate('/settings')}
              >
                <Settings className="h-4 w-4 opacity-70" />
                {t('nav.settings')}
              </Button>
              
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start gap-3 py-3 text-sm font-medium transition-all",
                  "hover:bg-white/5 text-white/80 hover:text-white",
                  isActive('/support') 
                    ? "bg-white/5 text-white border-l-2 border-white/60 pl-3" 
                    : "pl-4"
                )} 
                onClick={() => navigate('/support')}
              >
                <MessageSquare className="h-4 w-4 opacity-70" />
                {t('nav.support') || "Suporte"}
              </Button>
            </nav>
          </SidebarContent>
        </Sidebar>
        
        <main className="flex-1 p-4 md:p-6 overflow-y-auto relative" style={{ overflow: 'visible' }}>
          <div className="md:hidden flex items-center mb-4">
            <SidebarTrigger className="h-9 w-9 border-white/10 bg-black/20" />
            <span className="ml-3 text-sm font-medium">{location.pathname === '/' ? 'Dashboard' : location.pathname.substring(1).charAt(0).toUpperCase() + location.pathname.substring(2)}</span>
          </div>
          
          {/* Botão flutuante para ocultar/mostrar a barra lateral */}
          <div className="fixed top-6 right-6 z-50 hidden md:block">
            <SidebarTrigger className="h-10 w-10 border border-white/10 bg-black/70 shadow-lg hover:bg-black/90 transition-all duration-200 rounded-full" />
          </div>
          
          {children}
          
          {/* Incluir o componente de teste apenas em desenvolvimento */}
          {/* {isDevelopment && <StreamTestUI />} */}
        </main>
      </div>
    </SidebarProvider>
  );
}

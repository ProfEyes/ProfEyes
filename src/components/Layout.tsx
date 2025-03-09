import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  LayoutDashboard, 
  LineChart, 
  Newspaper, 
  PieChart, 
  Settings, 
  Signal,
  Bell,
  Check,
  Divide
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Logo } from "@/components/ui/logo";
import { useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNotifications } from "@/contexts/NotificationContext";
import { useUser } from "@/contexts/UserContext";

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
  
  // Usando o contexto real de notificações
  const { notifications, unreadCount } = useNotifications();
  const readCount = notifications.filter(n => n.read).length;
  
  // Usando o contexto do usuário
  const { userName, avatarUrl } = useUser();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-white/5">
          <SidebarHeader className="flex items-center justify-between p-4">
            <Logo />
            <Avatar className="h-8 w-8 ring-1 ring-white/10 hover:ring-white/20 transition-all">
              <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={userName} />
              <AvatarFallback className="bg-black/20 text-white/80">{userName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
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
                onClick={() => navigate('/')}
              >
                <LayoutDashboard className="h-4 w-4 opacity-70" />
                Dashboard
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
                onClick={() => navigate('/signals')}
              >
                <Signal className="h-4 w-4 opacity-70" />
                Sinais
              </Button>
               
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start gap-3 py-3 text-sm font-medium transition-all",
                  "hover:bg-white/5 text-white/80 hover:text-white",
                  isActive('/analysis') 
                    ? "bg-white/5 text-white border-l-2 border-white/60 pl-3" 
                    : "pl-4"
                )} 
                onClick={() => navigate('/analysis')}
              >
                <LineChart className="h-4 w-4 opacity-70" />
                Análises
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
                Notícias
              </Button>
               
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start gap-3 py-3 text-sm font-medium transition-all",
                  "hover:bg-white/5 text-white/80 hover:text-white",
                  isActive('/portfolio') 
                    ? "bg-white/5 text-white border-l-2 border-white/60 pl-3" 
                    : "pl-4"
                )} 
                onClick={() => navigate('/portfolio')}
              >
                <PieChart className="h-4 w-4 opacity-70" />
                Portfólio
              </Button>
            </nav>
            
            {/* Divisor que separa as seções */}
            <div className="my-4 flex items-center gap-2 px-2">
              <div className="h-px flex-1 bg-white/5"></div>
              <span className="text-[10px] uppercase text-white/30 font-medium">Notificações & Configurações</span>
              <div className="h-px flex-1 bg-white/5"></div>
            </div>
            
            {/* Seção de configurações e notificações */}
            <nav className="space-y-0.5">
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start gap-3 py-3 text-sm font-medium transition-all group relative",
                  "hover:bg-white/5 text-white/80 hover:text-white",
                  isActive('/notifications') && !location.search.includes('filter=read')
                    ? "bg-white/5 text-white border-l-2 border-white/60 pl-3" 
                    : "pl-4"
                )} 
                onClick={() => navigate('/notifications')}
              >
                <div className="relative">
                  <Bell className="h-4 w-4 opacity-70 group-hover:opacity-0 transition-opacity" />
                  <motion.div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                    transition={{ duration: 0.5, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 4 }}
                  >
                    <Bell className="h-4 w-4 text-white" />
                  </motion.div>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
                <span>Notificações</span>
                {unreadCount > 0 && (
                  <NotificationBadge count={unreadCount} />
                )}
              </Button>
              
              {/* Botão para notificações lidas */}
              {readCount > 0 && (
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start gap-3 py-3 text-sm font-medium transition-all",
                    "hover:bg-white/5 text-white/80 hover:text-white",
                    isActive('/notifications') && location.search.includes('filter=read')
                      ? "bg-white/5 text-white border-l-2 border-white/60 pl-3" 
                      : "pl-4"
                  )} 
                  onClick={() => navigate('/notifications?filter=read')}
                >
                  <Check className="h-4 w-4 opacity-70" />
                  <span>Notificações Lidas</span>
                  <span className="ml-auto bg-green-500/80 text-white text-xs min-w-5 h-5 rounded-full flex items-center justify-center">
                    {readCount}
                  </span>
                </Button>
              )}
              
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
                Configurações
              </Button>
            </nav>
            
            {/* Status do sistema (movido para o final) */}
            <div className="mt-auto pt-4 border-t border-white/5">
              <div className="rounded-lg bg-black/20 p-3">
                <p className="text-xs text-white/60 mb-2">Status do sistema</p>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/80"></div>
                  <span className="text-xs font-medium text-white/80">Online</span>
                </div>
              </div>
            </div>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-white/5">
            <header className="h-14 flex items-center px-6">
              <SidebarTrigger>
                <Button variant="ghost" size="icon" className="hover:bg-white/5">
                  <Menu className="h-5 w-5 text-white/80" />
                </Button>
              </SidebarTrigger>
            </header>
          </div>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}

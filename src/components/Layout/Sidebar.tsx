import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  SettingsIcon, 
  ChartIcon, 
  NotificationsIcon,
  UserIcon,
  ShieldIcon
} from '@/components/ui/icons';
import { Video, Film, Upload, PlayCircle, Tv } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { checkAdminPermission } from '@/lib/admin-api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useVideo } from '@/contexts/VideoContext';

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { userName } = useUser();
  const { t } = useLanguage();
  const { isUserVerified } = useVideo();
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  
  // Verificar se o usuário é administrador
  useEffect(() => {
    const checkIsAdmin = async () => {
      if (user) {
        const hasAdminPermission = await checkAdminPermission(user.id);
        setIsAdmin(hasAdminPermission);
      } else {
        setIsAdmin(false);
      }
    };
    
    checkIsAdmin();
  }, [user]);

  // Carregar e atualizar o nome de exibição
  useEffect(() => {
    // Atualizar o nome sempre que o userName do contexto mudar
    if (userName && userName.trim() !== '') {
      setDisplayName(userName);
      console.log("Sidebar: Atualizando displayName do contexto:", userName);
    } else {
      // Se não tiver nome no contexto, verificar localStorage
      const storedName = localStorage.getItem("user-name");
      if (storedName && storedName.trim() !== '') {
        setDisplayName(storedName);
        console.log("Sidebar: Atualizando displayName do localStorage:", storedName);
      } else if (user?.email) {
        // Fallback para email
        setDisplayName(user.email.split('@')[0]);
      }
    }
  }, [userName, user]);

  // Observar alterações e sincronizar com outras partes da aplicação
  useEffect(() => {
    const updateDisplayName = () => {
      // Verificar sempre primeiro o localStorage para máxima consistência
      const storedName = localStorage.getItem("user-name");
      if (storedName && storedName.trim() !== '') {
        setDisplayName(storedName);
        return;
      }

      // Primeira opção: nome do contexto
      if (userName) {
        setDisplayName(userName);
        return;
      }

      // Terceira opção: fallback para o email do usuário
      if (user?.email) {
        setDisplayName(user.email.split('@')[0]);
      }
    };

    // Executar imediatamente
    updateDisplayName();

    // Atualizar quando o nome for alterado em qualquer lugar do aplicativo
    const handleUsernameUpdated = (event: Event) => {
      const { userName: newUserName } = (event as CustomEvent).detail;
      if (newUserName && newUserName.trim() !== '') {
        console.log("Sidebar: Atualizando nome via evento username-updated:", newUserName);
        setDisplayName(newUserName);
      }
    };

    // Verificar quando a página recebe foco para manter sincronizado
    const handleFocus = () => {
      console.log("Sidebar: Verificando nome ao receber foco");
      const storedName = localStorage.getItem("user-name");
      if (storedName && storedName.trim() !== '') {
        setDisplayName(storedName);
      }
    };

    // Verificar quando outras partes do aplicativo atualizam dados
    const handleDataRefreshed = () => {
      console.log("Sidebar: Verificando nome após atualização de dados");
      updateDisplayName();
    };

    // Verificar quando a página é carregada ou recarregada
    const handleLoad = () => {
      console.log("Sidebar: Verificando nome ao carregar página");
      updateDisplayName();
    };

    // Escutar mudanças no localStorage diretamente (caso outra aba altere)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user-name" && e.newValue) {
        console.log("Sidebar: Atualizando nome via mudança de storage:", e.newValue);
        setDisplayName(e.newValue);
      }
    };

    window.addEventListener('username-updated', handleUsernameUpdated);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('user-data-refreshed', handleDataRefreshed);
    window.addEventListener('load', handleLoad);
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('username-updated', handleUsernameUpdated);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('user-data-refreshed', handleDataRefreshed);
      window.removeEventListener('load', handleLoad);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [userName, user]);

  // Links da barra lateral
  const links = [
    { 
      name: t('nav.home'), 
      to: '/', 
      icon: <HomeIcon className="w-5 h-5" />,
      exact: true
    },
    { 
      name: t('nav.dashboard'), 
      to: '/dashboard', 
      icon: <ChartIcon className="w-5 h-5" />,
      exact: false
    },
    { 
      name: t('nav.notifications'), 
      to: '/notifications', 
      icon: <NotificationsIcon className="w-5 h-5" />,
      exact: false
    },
    // Novo link para o Media Hub
    { 
      name: 'Media Hub', 
      to: '/media', 
      icon: <Tv className="w-5 h-5" />,
      exact: false
    },
    // Link para Upload (verificados)
    ...(isUserVerified ? [{
      name: 'Upload', 
      to: '/upload', 
      icon: <Upload className="w-5 h-5" />,
      exact: false,
      verified: true
    }] : []),
    { 
      name: t('nav.settings'), 
      to: '/settings', 
      icon: <SettingsIcon className="w-5 h-5" />,
      exact: false
    },
    { 
      name: 'Live Streaming', 
      to: '/streaming', 
      icon: <PlayCircle className="w-5 h-5" />,
      exact: false
    },
    // Link para administração, mostrado apenas para administradores
    ...(isAdmin ? [{
      name: t('nav.admin') || 'Administração',
      to: '/admin',
      icon: <ShieldIcon className="w-5 h-5" />,
      exact: false,
      adminOnly: true
    }] : [])
  ];

  return (
    <aside className="w-64 h-screen bg-black/30 border-r border-neutral-800 backdrop-blur-md fixed left-0 top-0 z-30">
      <div className="h-full flex flex-col">
        <div className="px-6 py-8">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600">
            ProfEyes
          </h2>
        </div>
        
        <nav className="flex-1 px-3">
          <ul className="space-y-1.5">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.exact}
                  className={({ isActive }) => 
                    `flex items-center py-2.5 px-4 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-green-900/20 text-green-500' 
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/30'
                    }
                    ${link.adminOnly ? 'border-l-2 border-green-800/50' : ''}
                    ${link.verified ? 'border-l-2 border-blue-800/50' : ''}
                    `
                  }
                >
                  <span className="mr-3">{link.icon}</span>
                  <span>{link.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        {user && (
          <div className="px-3 py-4 mt-auto">
            <div className="flex items-center px-4 py-3 rounded-lg bg-neutral-900/60 border border-neutral-800/50">
              <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center mr-3">
                <UserIcon className="w-4 h-4 text-neutral-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-300 truncate">
                  {displayName || userName || user.email?.split('@')[0] || "Usuário"}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
} 
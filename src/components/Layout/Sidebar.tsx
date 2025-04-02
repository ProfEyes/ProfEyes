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
import { useAuth } from '@/contexts/AuthContext';
import { checkAdminPermission } from '@/lib/admin-api';

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  
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

  // Links da barra lateral
  const links = [
    { 
      name: 'Home', 
      to: '/', 
      icon: <HomeIcon className="w-5 h-5" />,
      exact: true
    },
    { 
      name: 'Dashboard', 
      to: '/dashboard', 
      icon: <ChartIcon className="w-5 h-5" />,
      exact: false
    },
    { 
      name: 'Notificações', 
      to: '/notifications', 
      icon: <NotificationsIcon className="w-5 h-5" />,
      exact: false
    },
    { 
      name: 'Configurações', 
      to: '/settings', 
      icon: <SettingsIcon className="w-5 h-5" />,
      exact: false
    },
    // Link para administração, mostrado apenas para administradores
    ...(isAdmin ? [{
      name: 'Administração',
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
                  {user.email?.split('@')[0]}
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
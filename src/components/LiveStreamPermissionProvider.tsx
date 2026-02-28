import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';

interface LiveStreamPermissionContextType {
  canStartLive: boolean;
  canViewLive: boolean;
  canCommentLive: boolean;
  isLoading: boolean;
  userRole: string | null;
  isAdmin: boolean;
}

const LiveStreamPermissionContext = createContext<LiveStreamPermissionContextType>({
  canStartLive: false,
  canViewLive: true,
  canCommentLive: true,
  isLoading: true,
  userRole: null,
  isAdmin: false
});

export const useLiveStreamPermission = () => useContext(LiveStreamPermissionContext);

interface LiveStreamPermissionProviderProps {
  children: ReactNode;
}

// Lista de administradores por ID
const ADMIN_USER_IDS = [
  'f9f4c3bb-8a6a-494e-aae2-8eeca8a3d85b', // admin@trending.com
  '3084c1f3-91bf-456c-bfac-18e03214a34b'  // igorelion8@gmail.com
];

export const LiveStreamPermissionProvider: React.FC<LiveStreamPermissionProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<LiveStreamPermissionContextType>({
    canStartLive: false,
    canViewLive: true,
    canCommentLive: true,
    isLoading: true,
    userRole: null,
    isAdmin: false
  });

  useEffect(() => {
    const checkUserPermissions = async () => {
      if (!user) {
        setPermissions({
          canStartLive: false,
          canViewLive: true,
          canCommentLive: true,
          isLoading: false,
          userRole: null,
          isAdmin: false
        });
        return;
      }

      try {
        
        // 1. Verificar se o usuário é um administrador pelo ID
        const isAdminUser = ADMIN_USER_IDS.includes(user.id);
        
        // 2. Verificar se o email do usuário é o permitido para iniciar lives
        const email = user.email?.toLowerCase();
        const allowedEmails = ['ie702959@gmail.com', 'admin@trending.com', 'igorelion8@gmail.com'];
        const isEmailAllowed = allowedEmails.includes(email || '');
        
        // Inicialmente pode iniciar se for admin por ID ou email
        let canStart = isAdminUser || isEmailAllowed;
        let userRole = isAdminUser ? 'admin' : null;
        
                
        // 3. Consultar a tabela user_profiles para verificar is_admin
          try {
          const { data: profile, error: profileError } = await getSupabase()
              .from('user_profiles')
              .select('is_admin')
              .eq('user_id', user.id)
            .maybeSingle();
            
          if (!profileError && profile) {
            if (profile.is_admin === true) {
              canStart = true;
              userRole = 'admin';
                          }
            }
          } catch (dbError) {
          console.warn('⚠️ Erro ao consultar user_profiles:', dbError);
          }

        // 4. Consultar a tabela stream_permissions para verificar can_create
          try {
          const { data: streamPermissions, error: permError } = await getSupabase()
            .from('stream_permissions')
            .select('can_create, can_moderate')
              .eq('user_id', user.id)
              .maybeSingle();
              
          if (!permError && streamPermissions) {
            if (streamPermissions.can_create === true) {
              canStart = true;
                          }
          }
        } catch (permError) {
          console.warn('⚠️ Erro ao consultar stream_permissions:', permError);
              }

                
        setPermissions({
          canStartLive: canStart,
          canViewLive: true, // Todos os usuários podem ver lives
          canCommentLive: true, // Todos os usuários podem comentar em lives
          isLoading: false,
          userRole,
          isAdmin: isAdminUser
        });
      } catch (error) {
        console.error('❌ Erro ao verificar permissões no LiveStreamPermissionProvider:', error);
        setPermissions({
          canStartLive: false,
          canViewLive: true,
          canCommentLive: true,
          isLoading: false,
          userRole: null,
          isAdmin: false
        });
      }
    };

    checkUserPermissions();
  }, [user]);

  return (
    <LiveStreamPermissionContext.Provider value={permissions}>
      {children}
    </LiveStreamPermissionContext.Provider>
  );
}; 
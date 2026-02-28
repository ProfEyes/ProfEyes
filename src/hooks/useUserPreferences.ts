import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadUserSettings } from '@/utils/userPersistence';
import { userService } from '@/services/userService';

/**
 * Hook para carregar automaticamente as preferências do usuário
 * Este hook garante que as preferências sejam carregadas assim que o usuário estiver logado
 */
export const useUserPreferences = () => {
  const { user } = useAuth();
  const { setUserName, setAvatarUrl } = useUser();
  const { setLanguage, loadUserLanguageFromDB } = useLanguage();

  const loadAllPreferences = useCallback(async () => {
    if (!user?.id) {
      
      return;
    }

    try {
      

      // 1. Carregar configurações persistentes do localStorage primeiro (mais rápido)
      const userSettings = loadUserSettings();
      
      if (userSettings.displayName && userSettings.displayName.trim() !== '') {
        setUserName(userSettings.displayName);
        
      }
      
      if (userSettings.avatarUrl) {
        setAvatarUrl(userSettings.avatarUrl);
        
      }

      // 2. Carregar idioma do banco de dados
      try {
        await loadUserLanguageFromDB(user.id);
        
      } catch (languageError) {
        console.warn('⚠️ [useUserPreferences] Erro ao carregar idioma do banco:', languageError);
        
        // Fallback: carregar do localStorage
        const savedLanguage = localStorage.getItem(`user-language-${user.id}`);
        if (savedLanguage && ['pt', 'en', 'es'].includes(savedLanguage)) {
          setLanguage(savedLanguage as 'pt' | 'en' | 'es');
          
        }
      }

      // 3. Atualizar com dados do banco de dados (para sincronizar)
      try {
        const { data: profileData } = await userService.getUserProfile(user.id);
        
        if (profileData) {
          // Atualizar nome se diferente
          if (profileData.display_name && profileData.display_name !== userSettings.displayName) {
            setUserName(profileData.display_name);
            localStorage.setItem('user-name', profileData.display_name);
            
          }
          
          // Atualizar avatar se diferente
          if (profileData.avatar_url && profileData.avatar_url !== userSettings.avatarUrl) {
            setAvatarUrl(profileData.avatar_url);
            localStorage.setItem('user-avatar', profileData.avatar_url);
            
          }
        }
      } catch (profileError) {
        console.warn('⚠️ [useUserPreferences] Erro ao carregar perfil do banco:', profileError);
      }

      
    } catch (error) {
      console.error('❌ [useUserPreferences] Erro ao carregar preferências:', error);
    }
  }, [user?.id, setUserName, setAvatarUrl, setLanguage, loadUserLanguageFromDB]);

  // Carregar preferências quando o usuário estiver logado
  useEffect(() => {
    if (user?.id) {
      loadAllPreferences();
    }
  }, [user?.id, loadAllPreferences]);

  // Listener para recarregar preferências após login
  useEffect(() => {
    const handleAuthSuccess = () => {
      
      setTimeout(() => {
        loadAllPreferences();
      }, 500); // Pequeno delay para garantir que a sessão está estabelecida
    };

    window.addEventListener('auth-login-success', handleAuthSuccess);
    
    return () => {
      window.removeEventListener('auth-login-success', handleAuthSuccess);
    };
  }, [loadAllPreferences]);

  return {
    loadAllPreferences
  };
}; 
import { useEffect } from 'react';
import { getSavedAvatar, preloadImage, startAvatarPersistenceService } from '@/utils/imageUtils';
import { useUser } from '@/contexts/UserContext';
import { supabase, getSupabaseAdmin } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Componente de serviço invisível que garante a persistência do avatar
 * entre sessões da aplicação, similar ao comportamento do WhatsApp.
 * 
 * Este componente não renderiza nada visualmente, apenas gerencia
 * o estado do avatar.
 */
export const AvatarPersistence = () => {
  const { avatarUrl, setAvatarUrl } = useUser();

  // Inicialização: verificar o avatar salvo localmente e no banco de dados, e restaurar
  useEffect(() => {
    const initAvatar = async () => {
      // Primeiramente verifique o avatar no localStorage para carregamento rápido
      const savedAvatar = getSavedAvatar();
      let finalAvatarUrl = savedAvatar;
      
      if (savedAvatar) {
        try {
          // Tentar precarregar a imagem para verificar se ainda é válida
          await preloadImage(savedAvatar);
          
          // Se chegou aqui, a imagem está disponível localmente
          if (savedAvatar !== avatarUrl) {
            setAvatarUrl(savedAvatar);
          }
        } catch (error) {
          console.warn('Avatar salvo localmente não está mais disponível:', error);
          // Não limpar do localStorage, pode ser um problema temporário de rede
        }
      }
      
      // Agora busque também do banco de dados para garantir que temos a versão mais recente
      try {
        // Verificar se o usuário está autenticado
        const { data: userData } = await (supabase as SupabaseClient).auth.getUser();
        
        if (userData?.user) {
          // 1. Verificar na tabela de auth primeiro (metadados)
          const metadataAvatarUrl = userData.user.user_metadata?.avatar_url;
          
          // 2. Verificar também na tabela user_profiles (mais confiável para persistência)
          const { data: profileData } = await (supabase as SupabaseClient)
            .from('user_profiles')
            .select('avatar_url')
            .eq('user_id', userData.user.id)
            .single();
          
          // Obter o avatar mais recente (prioridade para o perfil persistente)
          const dbAvatarUrl = profileData?.avatar_url || metadataAvatarUrl;
          
          if (dbAvatarUrl && dbAvatarUrl !== finalAvatarUrl) {
            console.log('Avatar encontrado no banco de dados:', dbAvatarUrl);
            
            try {
              // Verificar se podemos acessar a imagem do BD
              await preloadImage(dbAvatarUrl);
              
              // Atualizar o estado e salvar localmente também
              setAvatarUrl(dbAvatarUrl);
              localStorage.setItem('user-avatar', dbAvatarUrl);
              finalAvatarUrl = dbAvatarUrl;
              
              console.log('Avatar do banco de dados carregado com sucesso');
            } catch (imgError) {
              console.warn('Não foi possível carregar o avatar do banco de dados:', imgError);
            }
          } else if (savedAvatar && (!dbAvatarUrl || dbAvatarUrl !== savedAvatar)) {
            // Se temos um avatar local válido mas não está no BD (ou está diferente), sincronize com o BD
            try {
              console.log('Sincronizando avatar local com o banco de dados...');
              // Atualizar na tabela user_profiles usando getSupabaseAdmin() para evitar erros de RLS
              const { error } = await (getSupabaseAdmin() as SupabaseClient)
                .from('user_profiles')
                .update({ 
                  avatar_url: savedAvatar,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', userData.user.id);
              
              if (error) {
                console.warn('Falha ao sincronizar avatar com banco de dados:', error);
              } else {
                console.log('Avatar sincronizado com o banco de dados com sucesso');
              }
            } catch (syncError) {
              console.error('Erro ao sincronizar avatar com o banco de dados:', syncError);
            }
          }
        }
      } catch (dbError) {
        console.error('Erro ao buscar avatar do banco de dados:', dbError);
      }
    };
    
    initAvatar();
  }, [avatarUrl, setAvatarUrl]);
  
  // Iniciar serviço de persistência do avatar (como no WhatsApp)
  useEffect(() => {
    // Iniciar o serviço que mantém o avatar persistente entre sessões
    const cleanup = startAvatarPersistenceService();
    
    // Limpar quando o componente desmontar
    return cleanup;
  }, []);

  // Gerenciar eventos de ciclo de vida da aplicação
  useEffect(() => {
    // Função para restaurar avatar quando a aplicação é reaberta
    const handleAppRestore = async () => {
      // Verificar primeiramente o localStorage
      const savedAvatar = getSavedAvatar();
      
      if (savedAvatar && savedAvatar !== avatarUrl) {
        try {
          // Verificar se a imagem ainda está disponível
          await preloadImage(savedAvatar);
          setAvatarUrl(savedAvatar);
        } catch (error) {
          console.warn('Falha ao restaurar avatar local após reabrir aplicação:', error);
          
          // Tentar restaurar do banco de dados
          try {
            const { data } = await (supabase as SupabaseClient).auth.getUser();
            if (data?.user) {
              // Buscar da tabela user_profiles
              const { data: profileData } = await (supabase as SupabaseClient)
                .from('user_profiles')
                .select('avatar_url')
                .eq('user_id', data.user.id)
                .single();
              
              if (profileData?.avatar_url) {
                try {
                  await preloadImage(profileData.avatar_url);
                  setAvatarUrl(profileData.avatar_url);
                  localStorage.setItem('user-avatar', profileData.avatar_url);
                  console.log('Avatar restaurado do banco de dados');
                } catch (imgError) {
                  console.error('Falha ao carregar imagem do BD:', imgError);
                }
              }
            }
          } catch (dbError) {
            console.error('Falha ao buscar avatar do BD:', dbError);
          }
        }
      }
    };
    
    // Eventos para verificar quando a aplicação é restaurada do background
    window.addEventListener('pageshow', handleAppRestore);
    window.addEventListener('focus', handleAppRestore);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleAppRestore();
      }
    });
    
    // Evento específico para mudanças no localStorage
    window.addEventListener('storage', (e) => {
      if (e.key === 'user-avatar' && e.newValue && e.newValue !== avatarUrl) {
        setAvatarUrl(e.newValue);
      }
    });
    
    return () => {
      window.removeEventListener('pageshow', handleAppRestore);
      window.removeEventListener('focus', handleAppRestore);
      document.removeEventListener('visibilitychange', handleAppRestore);
    };
  }, [avatarUrl, setAvatarUrl]);

  // Este componente não renderiza nada visualmente
  return null;
}; 
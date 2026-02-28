/**
 * Utilidades para manipulação de imagens
 */

/**
 * Constante para o nome da chave utilizada no localStorage
 */
const AVATAR_STORAGE_KEY = "user-avatar";
const AVATAR_TIMESTAMP_KEY = "user-avatar-timestamp";

/**
 * Verifica se existe um avatar salvo e retorna sua URL
 * 
 * @returns URL do avatar ou null se não existir
 */
export const getSavedAvatar = (): string | null => {
  return localStorage.getItem(AVATAR_STORAGE_KEY);
};

/**
 * Salva o avatar no localStorage, no banco de dados e atualiza o timestamp
 * 
 * @param avatarUrl URL do avatar para salvar
 * @param userId ID do usuário (opcional, se omitido tentará obter do Supabase)
 * @returns Promise com um objeto indicando sucesso ou falha
 */
export const saveAvatar = async (avatarUrl: string, userId?: string): Promise<{success: boolean, error?: any}> => {
  // Sempre salva no localStorage para acesso rápido (imediato)
  localStorage.setItem(AVATAR_STORAGE_KEY, avatarUrl);
  localStorage.setItem(AVATAR_TIMESTAMP_KEY, Date.now().toString());
  
  // Avatar salvo (silenciado)
  
  // Função de retry para garantir persistência mesmo com problemas temporários
  const retryOperation = async (operation: () => Promise<any>, maxRetries = 3, initialDelay = 300) => {
    let retries = 0;
    let delay = initialDelay;
    
    while (retries < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        retries++;
        if (retries >= maxRetries) throw error;
        console.warn(`Tentativa ${retries} de salvar avatar falhou, tentando novamente em ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Backoff exponencial
      }
    }
  };
  
  try {
    // Importar dinamicamente para evitar dependência circular
    const { supabase, saveUserAvatar } = await import('@/lib/supabase');
    
    // Se não foi fornecido userId, tentar obter do usuário autenticado
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        userId = data.user.id;
      } else {
        console.warn('Não foi possível obter o ID do usuário atual para salvar o avatar');
        return { success: true, error: 'ID de usuário não disponível - salvamento será apenas local' };
      }
    }
    
    // Registrar status das operações para logging
    // ✅ OTIMIZAÇÃO: Salvar APENAS na tabela user_profiles
    // ❌ NÃO atualizar auth.updateUser() aqui para evitar rate limit
    // A atualização dos metadados do auth será feita UMA ÚNICA VEZ no userPersistence.ts
    
    try {
      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: userId,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
      
      if (upsertError) throw upsertError;
      
      // Avatar salvo
      
      // Disparar evento para notificar componentes sobre a atualização
      window.dispatchEvent(new CustomEvent('avatar-updated', { 
        detail: { avatarUrl, persisted: true }
      }));
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao salvar avatar na tabela user_profiles:', error);
      return { 
        success: false, 
        error: 'Não foi possível salvar o avatar no servidor. Tente novamente.' 
      };
    }
  } catch (error) {
    console.error('Erro geral ao salvar avatar:', error);
    return { success: false, error };
  }
};

/**
 * Verifica quando o avatar foi salvo pela última vez
 * 
 * @returns Timestamp do último salvamento ou null se nunca foi salvo
 */
export const getAvatarTimestamp = (): number | null => {
  const timestamp = localStorage.getItem(AVATAR_TIMESTAMP_KEY);
  return timestamp ? parseInt(timestamp) : null;
};

/**
 * Mantém um mapa de URLs de imagens que já foram pré-carregadas
 */
const preloadedImages = new Map<string, HTMLImageElement>();

/**
 * Redimensiona uma imagem para um tamanho máximo específico mantendo a proporção
 * 
 * @param file Arquivo de imagem a ser redimensionado
 * @param maxWidth Largura máxima da imagem (padrão: 500px)
 * @param maxHeight Altura máxima da imagem (padrão: 500px)
 * @param quality Qualidade da imagem JPEG (0 a 1, padrão: 0.8)
 * @param format Formato da imagem de saída (padrão: 'image/jpeg')
 * @returns Promise que resolve para um Blob da imagem redimensionada
 */
export const resizeImage = (
  file: File, 
  maxWidth: number = 500, 
  maxHeight: number = 500, 
  quality: number = 0.8,
  format: string = 'image/jpeg'
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // Verificar se o arquivo é uma imagem
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo não é uma imagem válida'));
      return;
    }
    
    // Criar um elemento de imagem
    const img = new Image();
    img.onload = () => {
      // Calcular as dimensões mantendo a proporção
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      
      // Criar canvas e redimensionar
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível obter o contexto do canvas'));
        return;
      }
      
      // Desenhar a imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);
      
      // Converter para blob no formato desejado
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao converter canvas para blob'));
          }
        },
        format,
        quality
      );
    };
    
    img.onerror = () => {
      reject(new Error('Erro ao carregar a imagem'));
    };
    
    // Iniciar o carregamento da imagem a partir do arquivo
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Converte um Blob para um objeto File
 */
export const blobToFile = (blob: Blob, fileName: string, fileType: string): File => {
  return new File([blob], fileName, { 
    type: fileType,
    lastModified: Date.now()
  });
};

/**
 * Verifica se uma URL de imagem é válida e acessível
 * @param url URL da imagem para verificar
 * @returns Promise que resolve para true se a imagem é válida e acessível
 */
export const isImageValid = async (url: string): Promise<boolean> => {
  if (!url) return false;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) return false;
    
    const contentType = response.headers.get('content-type');
    return contentType ? contentType.startsWith('image/') : false;
  } catch (error) {
    console.warn('Erro ao validar imagem:', error);
    return false;
  }
};

/**
 * Pré-carrega uma imagem para evitar flickering
 * @param url URL da imagem para pré-carregar
 * @returns Promise que resolve quando a imagem estiver carregada
 */
export const preloadImage = async (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = url;
  });
};

/**
 * Precarrega uma imagem para o avatar do usuário e garante que ela esteja disponível rapidamente
 * 
 * @param force Se true, força o recarregamento mesmo se já estiver em cache
 */
export const ensureAvatarPreloaded = (force: boolean = false): void => {
  // Verificar o localStorage para o avatar
  const avatarUrl = getSavedAvatar();
  if (!avatarUrl) return;
  
  // Verificar se já temos essa imagem em cache
  if (!force && preloadedImages.has(avatarUrl)) return;
  
  // Precarregar a imagem
  preloadImage(avatarUrl)
    .then(() => {
      // Avatar precarregado
    })
    .catch(error => {
      console.warn('Falha ao precarregar avatar:', error);
    });
};

/**
 * Inicializa o precarregamento do avatar logo no início da aplicação
 */
export const initAvatarPreloading = (): void => {
  // Precarregar imediatamente
  ensureAvatarPreloaded();
  
  // Configurar para precarregar novamente quando a aba receber foco
  window.addEventListener('focus', () => {
    ensureAvatarPreloaded(true);
  });
  
  // Recarregar avatar quando uma nova sessão começar (semelhante ao WhatsApp)
  // Esta função será chamada na inicialização, para garantir que a foto seja carregada após fechar o app
  const validateSession = () => {
    // Verificar se o avatar está no localStorage
    const avatarUrl = getSavedAvatar();
    
    if (avatarUrl) {
      // Tentar pré-carregar e verificar se a imagem ainda é válida
      preloadImage(avatarUrl)
        .then(() => {
          // Disparar evento para informar que o avatar foi carregado
          window.dispatchEvent(new CustomEvent('avatar-updated', { 
            detail: { avatarUrl }
          }));
        })
        .catch(() => {
          console.warn('Avatar da sessão anterior não está mais disponível');
          // Não remover do localStorage, pois pode ser um problema temporário de rede
        });
    }
  };
  
  // Executar validação na inicialização
  validateSession();
  
  // Precarregar quando o avatar for atualizado
  window.addEventListener('avatar-updated', (event) => {
    const { avatarUrl } = (event as CustomEvent).detail;
    if (avatarUrl) {
      preloadImage(avatarUrl)
        .then(() => {})
        .catch(error => console.warn('Falha ao precarregar novo avatar:', error));
    }
  });
  
  // Verificar quando a sessão é restaurada
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      validateSession();
    }
  });
};

/**
 * Atualiza a foto de perfil do usuário nos diferentes contextos da aplicação
 * de forma robusta, garantindo persistência similar a Instagram/WhatsApp.
 * 
 * @param avatarUrl URL da nova foto de perfil
 * @param userId ID opcional do usuário (se não fornecido, será obtido automaticamente)
 * @returns Promise que resolve para um objeto com status da operação
 */
export const updateProfileAvatar = async (
  avatarUrl: string, 
  userId?: string
): Promise<{success: boolean; error?: any}> => {
  try {
    console.log(`Iniciando atualização de avatar: ${avatarUrl.slice(0, 30)}...`);
    
    // 1. Verificar se a imagem é válida
    console.log("Verificando validade da imagem...");
    const isValid = await isImageValid(avatarUrl);
    if (!isValid) {
      console.error("A imagem fornecida não é válida ou não está acessível");
      return { 
        success: false, 
        error: 'A imagem fornecida não é válida ou não está acessível' 
      };
    }
    
    // 2. Precarregar a imagem antes de atualizar
    console.log("Pré-carregando imagem...");
    try {
    await preloadImage(avatarUrl);
      console.log("Imagem pré-carregada com sucesso");
    } catch (preloadError) {
      console.warn("Falha ao pré-carregar imagem, continuando com o processo:", preloadError);
      // Não interromper o processo por causa de um erro de preload
    }
    
    // 3. Salvar imediatamente no localStorage para feedback instantâneo
    localStorage.setItem(AVATAR_STORAGE_KEY, avatarUrl);
    localStorage.setItem(AVATAR_TIMESTAMP_KEY, Date.now().toString());
    
    // 4. Disparar evento imediatamente para atualizar a interface
    window.dispatchEvent(new CustomEvent('avatar-updated', { 
      detail: { avatarUrl, temporary: true }
    }));
    
    // 5. Obter o ID do usuário se não foi fornecido
    if (!userId) {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          userId = data.user.id;
          console.log(`ID do usuário obtido: ${userId}`);
        }
      } catch (userIdError) {
        console.warn("Não foi possível obter ID do usuário:", userIdError);
        // Continuar mesmo sem o userId, o avatar ainda será salvo localmente
      }
    }
    
    // 6. Salvar no banco de dados e em todas as fontes de dados
    console.log("Salvando avatar em todas as fontes de dados...");
    const saveResult = await saveAvatar(avatarUrl, userId);
    
    if (!saveResult.success) {
      console.warn("Salvamento parcial do avatar:", saveResult.error);
      // Mesmo com erro no servidor, continuar porque já temos no localStorage
    } else {
      // Avatar salvo (silenciado)
    }
    
    // 7. Verificar e garantir persistência após o salvamento (para mais garantia)
    if (userId) {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('avatar_url')
          .eq('user_id', userId)
          .single();
        
        if (profileError) {
          console.warn("Erro ao verificar persistência do avatar:", profileError);
        } else if (profileData?.avatar_url !== avatarUrl) {
          console.warn("Avatar não foi salvo corretamente no banco. Tentando novamente...");
          // Tentar novamente uma última vez
          await supabase
            .from('user_profiles')
            .upsert({
              user_id: userId,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        } else {
          // Avatar salvo (silenciado)
        }
      } catch (verifyError) {
        console.warn("Erro ao verificar persistência do avatar:", verifyError);
      }
    }
    
    // 8. Disparar evento final com status de persistência
    window.dispatchEvent(new CustomEvent('avatar-updated', { 
      detail: { 
        avatarUrl, 
        persisted: true, 
        serverSaved: saveResult.success 
      }
    }));
    
    // 9. Iniciar monitoramento de persistência para garantir que a foto permaneça disponível
    startAvatarPersistenceService();
    
    return { success: true };
  } catch (error) {
    console.error('Erro geral ao atualizar avatar:', error);
    
    // Mesmo com erro, manter o avatar no localStorage se disponível
    const currentAvatar = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (currentAvatar !== avatarUrl) {
      localStorage.setItem(AVATAR_STORAGE_KEY, avatarUrl);
    }
    
    return { success: false, error };
  }
};

/**
 * Verifica periodicamente se a imagem do avatar ainda está disponível e
 * a mantém persistente, mesmo quando o aplicativo é fechado.
 * 
 * Implementa estratégias avançadas para manter imagens disponíveis, similares
 * às utilizadas por WhatsApp/Instagram:
 * 1. Verificação periódica
 * 2. Solicitação de armazenamento persistente
 * 3. Cache Service Worker (quando disponível)
 * 4. Verificação de consistência entre fontes
 * 
 * @param intervalMs Intervalo em milissegundos para verificação (padrão: 15 minutos)
 * @returns Função para cancelar o monitoramento
 */
export const startAvatarPersistenceService = (intervalMs: number = 15 * 60 * 1000): () => void => {
  // Iniciando serviço de persistência
  
  // Registrar um service worker para ajudar no cache, se disponível
  if ('serviceWorker' in navigator && 'caches' in window) {
    navigator.serviceWorker.ready.then(async (registration) => {
      console.log("Service Worker disponível para auxiliar no cache de avatar");
      
      try {
        // Obter a URL do avatar atual
        const avatarUrl = getSavedAvatar();
        if (avatarUrl) {
          // Armazenar a imagem no cache
          const cache = await caches.open('avatar-cache-v1');
          await cache.add(avatarUrl);
          console.log("Avatar adicionado ao cache do Service Worker");
        }
      } catch (cacheError) {
        console.warn("Não foi possível adicionar avatar ao cache:", cacheError);
      }
    }).catch(err => {
      console.warn("Service Worker não disponível para cache:", err);
    });
  }
  
  // Solicitar armazenamento persistente (comportamento similar ao WhatsApp)
  if ('persist' in navigator && 'storage' in navigator) {
    navigator.storage.persist().then((granted) => {
      if (granted) {
        console.log('Armazenamento persistente garantido para avatar');
      } else {
        console.warn('Armazenamento persistente não foi garantido. O avatar pode não ser mantido após navegador fechado.');
      }
    });
  }
  
  // Testar a URL do avatar para blob:// e criar uma cópia com persistência melhor se necessário
  const avatarUrl = getSavedAvatar();
  if (avatarUrl && avatarUrl.startsWith('blob:')) {
    console.log("Avatar é um blob URL, criando cópia persistente...");
    
    // Converter blob URL para uma imagem persistente via data URL
    fetch(avatarUrl)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          
          // Apenas atualizar para data URL se necessário para persistência
          // O dataURL é mais persistente que blob URLs mas pode ser maior
          localStorage.setItem('avatar-backup-dataurl', dataUrl);
          console.log("Backup do avatar criado como data URL para persistência melhorada");
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.warn("Erro ao criar backup do avatar como data URL:", error);
      });
  }
  
  // Configurar checagem periódica para manter a imagem "viva" e verificar consistência
  const checkAvatarPersistence = async () => {
    const avatarUrl = getSavedAvatar();
    if (!avatarUrl) return;
    
      try {
      // 1. Verificar se a imagem ainda está acessível
      const isValid = await isImageValid(avatarUrl);
        
      if (isValid) {
        
        // Renovar o timestamp para manter a entrada "fresca"
        localStorage.setItem(AVATAR_TIMESTAMP_KEY, Date.now().toString());
        
        // Reprecarregar para manter a imagem no cache do navegador
        preloadImage(avatarUrl).catch(() => {});
      } else {
        console.warn('Avatar não está mais acessível, tentando restaurar...');
        
        // Tentar restaurar do backup ou do servidor
        await tryRestoreAvatar();
      }
      
      // 2. Verificar consistência com o banco de dados, se tivermos ID do usuário
      await checkServerConsistency();
    } catch (error) {
      console.warn('Erro ao verificar persistência do avatar:', error);
    }
  };
  
  // Função para tentar restaurar o avatar de fontes alternativas
  const tryRestoreAvatar = async () => {
    // Verificar se temos um backup como data URL
    const backupDataUrl = localStorage.getItem('avatar-backup-dataurl');
    if (backupDataUrl) {
      console.log('Restaurando avatar do backup data URL');
      localStorage.setItem(AVATAR_STORAGE_KEY, backupDataUrl);
      
      // Notificar que o avatar foi restaurado
      window.dispatchEvent(new CustomEvent('avatar-updated', { 
        detail: { avatarUrl: backupDataUrl, restored: true }
      }));
      return;
    }
    
    // Se não temos backup local, tentar buscar do servidor
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase.auth.getUser();
      
      if (data?.user?.id) {
        // Buscar das várias fontes no servidor
        await fetchAvatarFromServer(data.user.id);
      }
    } catch (serverError) {
      console.warn('Não foi possível restaurar avatar do servidor:', serverError);
    }
  };
  
  // Função para buscar o avatar do servidor
  const fetchAvatarFromServer = async (userId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      // 1. Primeiro tentar buscar da tabela user_profiles
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('user_id', userId)
        .single();
      
      if (profileData?.avatar_url) {
        console.log('Avatar restaurado da tabela user_profiles');
        localStorage.setItem(AVATAR_STORAGE_KEY, profileData.avatar_url);
        
        // Notificar sobre a restauração
        window.dispatchEvent(new CustomEvent('avatar-updated', { 
          detail: { avatarUrl: profileData.avatar_url, restored: true }
        }));
        return;
      }
      
      // 2. Verificar nos metadados do usuário
      const { data: userData } = await supabase.auth.getUser();
      const metadataAvatar = userData?.user?.user_metadata?.avatar_url;
      
      if (metadataAvatar) {
        console.log('Avatar restaurado dos metadados do usuário');
        localStorage.setItem(AVATAR_STORAGE_KEY, metadataAvatar);
        
        // Notificar sobre a restauração
        window.dispatchEvent(new CustomEvent('avatar-updated', { 
          detail: { avatarUrl: metadataAvatar, restored: true }
        }));
        return;
      }
      
      console.warn('Não foi possível encontrar avatar no servidor');
      } catch (error) {
      console.error('Erro ao buscar avatar do servidor:', error);
    }
  };
  
  // Função para garantir consistência entre servidor e localStorage
  const checkServerConsistency = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase.auth.getUser();
      
      if (!data?.user?.id) return;
      
      // Verificar se o avatar no banco corresponde ao localStorage
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('user_id', data.user.id)
        .single();
      
      const localAvatar = getSavedAvatar();
      const serverAvatar = profileData?.avatar_url;
      
      // Se temos valores diferentes e o servidor tem um valor válido, sincronizar
      if (serverAvatar && localAvatar !== serverAvatar) {
        // Verificar se o avatar do servidor é válido
        const isServerAvatarValid = await isImageValid(serverAvatar);
        
        if (isServerAvatarValid) {
          // O servidor tem um avatar válido e diferente do local, atualizar local
          console.log('Avatar no servidor é diferente e válido, sincronizando local');
          localStorage.setItem(AVATAR_STORAGE_KEY, serverAvatar);
          
          // Notificar sobre a atualização
          window.dispatchEvent(new CustomEvent('avatar-updated', { 
            detail: { avatarUrl: serverAvatar, syncedFromServer: true }
          }));
        } else if (localAvatar) {
          // O servidor tem um avatar inválido, mas o local é válido, atualizar servidor
          console.log('Avatar local é válido mas diferente do servidor, sincronizando servidor');
          await saveAvatar(localAvatar, data.user.id);
        }
      }
    } catch (error) {
      console.warn('Erro ao verificar consistência com servidor:', error);
    }
  };
  
  // Executar imediatamente
  checkAvatarPersistence();
  
  // Configurar verificação periódica
  const intervalId = setInterval(checkAvatarPersistence, intervalMs);
  
  // Configurar para executar quando a página receber foco novamente
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('Página recebeu foco, verificando persistência do avatar');
      checkAvatarPersistence();
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // ✅ CORREÇÃO: Removido handleBeforeUnload para evitar aviso do navegador
  // O timestamp será atualizado periodicamente pela verificação automática
  
  // Configurar limpeza do intervalo quando o componente desmontar
  return () => {
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}; 
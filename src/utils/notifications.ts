// Tipos de prioridade das notificações
export type NotificationPriority = 'high' | 'medium' | 'low';

// Interface para as opções de notificação
export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  priority?: NotificationPriority;
  sound?: boolean;
  type?: string;
  data?: any;
}

// Verifica se as notificações estão disponíveis no navegador
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

// Verifica se as notificações estão permitidas
export const isNotificationPermissionGranted = (): boolean => {
  return isNotificationSupported() && Notification.permission === 'granted';
};

// Solicita permissão para notificações
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) {
    console.warn('Notificações não são suportadas neste navegador');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Erro ao solicitar permissão para notificações:', error);
    return false;
  }
};

// Verifica se o horário atual está dentro do horário silencioso
export const isInQuietHours = (
  startTime: string,
  endTime: string,
  enabledQuietHours: boolean
): boolean => {
  if (!enabledQuietHours) return false;

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  // Se o horário de término for menor que o horário de início, significa que atravessa a meia-noite
  if (endTime < startTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }

  return currentTime >= startTime && currentTime <= endTime;
};

// Envia uma notificação
export const sendNotification = async (options: NotificationOptions): Promise<boolean> => {
  if (!isNotificationSupported()) {
    console.warn('Notificações não são suportadas neste navegador');
    return false;
  }

  if (!isNotificationPermissionGranted()) {
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      return false;
    }
  }

  try {
    // Verificar configurações salvas
    const savedSettingsStr = localStorage.getItem('notificationSettings');
    if (savedSettingsStr) {
      const savedSettings = JSON.parse(savedSettingsStr);
      
      // Verificar se as notificações estão em horário silencioso
      if (
        savedSettings.quietHoursEnabled &&
        isInQuietHours(
          savedSettings.quietHoursStart,
          savedSettings.quietHoursEnd,
          savedSettings.quietHoursEnabled
        )
      ) {
        console.log('Notificação não enviada devido ao horário silencioso');
        return false;
      }

      // Verificar se o tipo de notificação está habilitado
      if (options.type) {
        const notificationType = savedSettings.types?.find(
          (type: any) => type.id === options.type
        );
        if (notificationType && !notificationType.enabled) {
          console.log(`Notificação do tipo ${options.type} está desabilitada`);
          return false;
        }
      }

      // Verificar se o som está habilitado para o tipo
      if (options.type && options.sound) {
        const notificationType = savedSettings.types?.find(
          (type: any) => type.id === options.type
        );
        if (notificationType && !notificationType.sound) {
          options.sound = false;
        }
      }
    }

    // Criar e enviar a notificação
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/logo.png',
      silent: options.sound === false,
      data: options.data,
    });

    // Tocar um som se a notificação tiver som
    if (options.sound) {
      playNotificationSound(options.priority || 'medium');
    }

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return false;
  }
};

// Toca um som baseado na prioridade da notificação
export const playNotificationSound = (priority: NotificationPriority): void => {
  try {
    const audioSrc = getAudioSourceByPriority(priority);
    const audio = new Audio(audioSrc);
    
    // Carregar configurações de volume
    const savedSettingsStr = localStorage.getItem('notificationSettings');
    if (savedSettingsStr) {
      const savedSettings = JSON.parse(savedSettingsStr);
      if (savedSettings.volume !== undefined) {
        audio.volume = savedSettings.volume / 100;
      }
    }
    
    audio.play().catch(error => console.error('Erro ao tocar som:', error));
  } catch (error) {
    console.error('Erro ao iniciar som de notificação:', error);
  }
};

// Retorna o caminho do áudio baseado na prioridade
const getAudioSourceByPriority = (priority: NotificationPriority): string => {
  switch (priority) {
    case 'high':
      return '/sounds/high-priority.mp3';
    case 'medium':
      return '/sounds/medium-priority.mp3';
    case 'low':
      return '/sounds/low-priority.mp3';
    default:
      return '/sounds/medium-priority.mp3';
  }
};

// Envia uma notificação de teste
export const sendTestNotification = async (): Promise<boolean> => {
  return sendNotification({
    title: 'Notificação de Teste',
    body: 'Esta é uma notificação de teste. Se você está recebendo isso, as notificações estão funcionando corretamente!',
    icon: '/logo.png',
    priority: 'medium',
    sound: true,
    type: 'test',
  });
};

// Verifica os canais habilitados para um tipo de notificação
export const getEnabledChannelsForType = (
  typeId: string,
  savedSettings: any
): string[] => {
  if (!savedSettings) return [];

  const notificationType = savedSettings.types?.find(
    (type: any) => type.id === typeId
  );

  if (!notificationType) return [];

  // Retorna apenas os IDs dos canais habilitados para este tipo
  return notificationType.channels || [];
};

// Verifica se um canal específico está habilitado para um tipo
export const isChannelEnabledForType = (
  typeId: string,
  channelId: string,
  savedSettings: any
): boolean => {
  const enabledChannels = getEnabledChannelsForType(typeId, savedSettings);
  return enabledChannels.includes(channelId);
}; 
import { toast } from 'sonner';

// Tipos de prioridade das notificações
export type NotificationPriority = 'high' | 'medium' | 'low';
export type NotificationChannel = 'browser' | 'app' | 'sound';

// Interface para as opções de notificação
export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  priority?: NotificationPriority;
  sound?: boolean;
  type?: string;
  data?: any;
  // Opções adicionais específicas para notificações do navegador
  tag?: string;
  badge?: string;
  image?: string;
  vibrate?: number[];
  actions?: { action: string; title: string; icon?: string }[];
  requireInteraction?: boolean;
}

// Sons de notificação por prioridade
const NOTIFICATION_SOUNDS = {
  high: '/sounds/notification-high.mp3',
  medium: '/sounds/notification-medium.mp3',
  low: '/sounds/notification-low.mp3',
  system: '/sounds/notification-system.mp3',
  success: '/sounds/notification-success.mp3',
  error: '/sounds/notification-error.mp3'
};

// Verifica se as notificações estão disponíveis no navegador
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

// Verifica se as notificações estão permitidas
export const isNotificationPermissionGranted = (): boolean => {
  if (!isNotificationSupported()) return false;
  return Notification.permission === 'granted';
};

// Solicita permissão para notificações
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) {
    console.warn('As notificações não são suportadas neste navegador');
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Erro ao solicitar permissão de notificação:', error);
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
export const sendNotification = (options: NotificationOptions): void => {
  try {
    const {
      title,
      body,
      icon = '/logo.png',
      priority = 'medium',
      sound = true,
      type = 'system',
      ...rest
    } = options;
    
    // Obter configurações salvas
    const settingsStr = localStorage.getItem('notificationSettings');
    
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      
      // Verificar se as notificações estão globalmente desativadas
      if (!settings.enabled) return;
      
      // Verificar se este tipo de notificação está habilitado
      const typeConfig = settings.types.find((t: any) => t.id === type);
      if (!typeConfig?.enabled) return;
      
      // Verificar se está no horário silencioso
      if (settings.quietHoursEnabled) {
        const inQuietHours = isInQuietHours(settings.quietHoursStart, settings.quietHoursEnd, settings.quietHoursEnabled);
        if (inQuietHours) {
          console.log('Notificação silenciada por estar dentro do horário silencioso');
          return;
        }
      }
      
      // Verificar se o tipo de notificação está habilitado
      if (type && !typeConfig.enabled) {
        console.log(`Notificação do tipo ${type} está desabilitada`);
        return;
      }

      // Verificar se o som está habilitado para o tipo
      if (type && typeConfig.sound && !sound) {
        console.log(`Som desabilitado para o tipo ${type}`);
        return;
      }
      
      // Notificação do navegador
      if (settings.browserNotifications && isNotificationPermissionGranted()) {
        // Usar apenas as propriedades básicas suportadas pelo browser
        const notification = new Notification(title, {
          body,
          icon,
          tag: rest.tag || `${type}-${Date.now()}`
        });
        
        // Manipuladores de eventos
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          notification.close();
          
          // Navegar para uma URL específica se fornecida
          if (rest.data?.actionLink) {
            window.location.href = rest.data.actionLink;
          }
        };
      }
      
      // Tocar som se habilitado para este tipo
      if (settings.sound && typeConfig.sound && sound) {
        playNotificationSound(priority);
      }
    } else {
      // Se não houver configurações, usa comportamento padrão
      if (isNotificationPermissionGranted()) {
        const notification = new Notification(title, {
          body,
          icon,
          tag: rest.tag || `${type}-${Date.now()}`
        });
        
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
      
      // Tocar som por padrão
      if (sound) {
        playNotificationSound(priority);
      }
    }
    
    // Sempre exibe um toast (usar API específica para evitar passar objeto como child)
    if (priority === 'high') {
      toast.error(title, { description: body, icon: '🔴', position: 'top-right', duration: 8000 });
    } else if (priority === 'medium') {
      toast(title, { description: body, icon: '🟠', position: 'top-right', duration: 5000 });
    } else {
      toast.info(title, { description: body, icon: '🔵', position: 'top-right', duration: 5000 });
    }
    
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    
    // Fallback para toast em caso de erro
    toast(options.title, {
      description: options.body,
      position: 'top-right'
    });
  }
};

// Toca um som baseado na prioridade da notificação
export const playNotificationSound = (priority: NotificationPriority = 'medium'): void => {
  try {
    // Obter o volume das configurações
    let volume = 0.7; // 70% volume padrão
    
    try {
      const settingsStr = localStorage.getItem('notificationSettings');
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        volume = settings.volume ? settings.volume / 100 : 0.7;
      }
    } catch (e) {
      console.error('Erro ao obter volume das configurações:', e);
    }
    
    // Selecionar o som baseado na prioridade
    const soundFile = NOTIFICATION_SOUNDS[priority] || NOTIFICATION_SOUNDS.medium;
    
    // Criar e tocar o áudio
    const audio = new Audio(soundFile);
    audio.volume = volume;
    audio.play().catch(error => {
      console.error('Erro ao tocar som de notificação:', error);
    });
  } catch (error) {
    console.error('Erro ao reproduzir som de notificação:', error);
  }
};

// Envia uma notificação de teste
export const sendTestNotification = (): void => {
  sendNotification({
    title: 'Notificação de Teste',
    body: 'Esta é uma notificação de teste. Se você está vendo isso, o sistema de notificações está funcionando!',
    priority: 'medium',
    sound: true,
    type: 'system',
    requireInteraction: false
  });
};

// Verifica os canais habilitados para um tipo de notificação
export const getEnabledChannelsForType = (type: string): NotificationChannel[] => {
  try {
    // Busca configurações do localStorage
    const settingsStr = localStorage.getItem('notificationSettings');
    if (!settingsStr) return ['app', 'browser', 'sound']; // Configuração padrão se não existir
    
    const settings = JSON.parse(settingsStr);
    
    // Verifica se as notificações estão habilitadas globalmente
    if (!settings.enabled) return [];
    
    // Verifica se este tipo de notificação está habilitado
    const typeConfig = settings.types.find((t: any) => t.id === type);
    if (!typeConfig?.enabled) return [];
    
    // Canais habilitados
    const channels: NotificationChannel[] = [];
    
    // Verifica cada canal
    if (settings.appNotifications) channels.push('app');
    if (settings.browserNotifications) channels.push('browser');
    if (settings.sound && typeConfig.sound) channels.push('sound');
    
    return channels;
  } catch (error) {
    console.error('Erro ao obter canais habilitados:', error);
    return ['app']; // Fallback seguro
  }
};

// Verifica se um canal específico está habilitado para um tipo
export const isChannelEnabledForType = (type: string, channel: NotificationChannel): boolean => {
  const enabledChannels = getEnabledChannelsForType(type);
  return enabledChannels.includes(channel);
}; 
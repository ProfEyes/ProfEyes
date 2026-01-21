import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification, NotificationPriority, requestNotificationPermission, isNotificationPermissionGranted } from '@/utils/notifications';
import { toast } from 'sonner';
import { TradingSignal, SignalType } from '@/services/types';
import { shouldShowToast } from '@/services/notificationSettings';
import preSignalNotificationService from '@/services/signals/PreSignalNotificationService';
import { useLanguage } from './LanguageContext';

// Tipos para as notificações
export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'system' | 'live' | 'signals';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt?: Date;
  timestamp: Date;
  read: boolean;
  linkTo?: string;
  actionLink?: string;
  image?: string;
  duration?: number;
  data?: Record<string, unknown>;
}

// Configurações de notificações
export interface NotificationSettings {
  enabled: boolean;
  browserNotifications: boolean;
  appNotifications: boolean;
  sound: boolean;
  volume: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  types: {
    id: string;
    name: string;
    enabled: boolean;
    sound: boolean;
    description: string;
  }[];
}

// Interface para notificação de sinal
interface SignalNotification {
  type: 'signals';
  title: string;
  message: string;
  confidence: 'high' | 'medium' | 'low';
  pair: string;
  direction: 'buy' | 'sell';
  timestamp: Date;
}

// Interface do contexto
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  notificationsEnabled: boolean;
  browserNotificationsEnabled: boolean;
  appNotificationsEnabled: boolean;
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'read'>, showToast?: boolean) => void;
  addSignalNotification: (signal: TradingSignal, type: string, showToast?: boolean) => void;
  addPreSignalNotification: (signal: TradingSignal) => void;

  showSignalPreview: (signal: TradingSignal) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  clearAllNotifications: () => void;
  removeNotification: (id: string) => void;
  testNotification: () => void;
  requestPermission: () => Promise<boolean>;
  hasPermission: boolean;
  sendLiveNotification: (stream: {
    id: string;
    title: string;
    streamerName: string;
    streamerAvatar: string;
  }) => void;
}

// Função para obter configurações padrão com traduções
const getDefaultSettings = (t: (key: string) => string): NotificationSettings => ({
  enabled: true,
  browserNotifications: true,
  appNotifications: true,
  sound: true,
  volume: 70,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  types: [
    {
      id: 'signals',
      name: t('notifications.types.signals'),
      enabled: true,
      sound: true,
      description: t('notifications.types.signalsDesc')
    },
    {
      id: 'live',
      name: t('notifications.types.live'),
      enabled: true,
      sound: true,
      description: t('notifications.types.liveDesc')
    }
  ]
});

// Criação do contexto
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Hook para usar o contexto
// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationProvider');
  }
  return context;
};

// Provedor do contexto
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const savedNotifications = localStorage.getItem('notifications');
    return savedNotifications 
      ? (JSON.parse(savedNotifications) as Array<Omit<Notification, 'createdAt'> & { createdAt: string }>).map((n) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        }))
      : [];
  });
  const [settings, setSettings] = useState<NotificationSettings>(() => getDefaultSettings(t));
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  
  // Verificar permissão inicial
  useEffect(() => {
    setHasPermission(isNotificationPermissionGranted());
  }, []);
  
  // Atualizar traduções quando idioma mudar
  useEffect(() => {
    setSettings(prevSettings => ({
      ...prevSettings,
      types: getDefaultSettings(t).types.map(defaultType => {
        const existingType = prevSettings.types.find(type => type.id === defaultType.id);
        return existingType ? {
          ...existingType,
          name: defaultType.name,
          description: defaultType.description
        } : defaultType;
      })
    }));
  }, [t]);
  
  // Carregar notificações e configurações salvas ao iniciar
  useEffect(() => {
    try {
      // Carregar notificações
      const savedNotifications = localStorage.getItem('userNotifications');
      if (savedNotifications) {
        const parsedNotifications = JSON.parse(savedNotifications) as Array<Omit<Notification, 'timestamp'> & { timestamp: string }>;
        // Converte strings de timestamp para objetos Date
        const notificationsWithDates = parsedNotifications.map((notif) => ({
          ...notif,
          timestamp: new Date(notif.timestamp)
        }));
        setNotifications(notificationsWithDates);
      }
      
      // Carregar configurações
      const savedSettings = localStorage.getItem('notificationSettings');
      const defaultSettings = getDefaultSettings(t);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings) as Partial<NotificationSettings>;
        // Atualizar nomes e descrições dos tipos com traduções atuais
        const updatedTypes = defaultSettings.types.map(defaultType => {
          const savedType = parsedSettings.types?.find((type) => type.id === defaultType.id);
          return savedType ? {
            ...savedType,
            name: defaultType.name,
            description: defaultType.description
          } : defaultType;
        });
        setSettings({...defaultSettings, ...parsedSettings, types: updatedTypes});
      } else {
        // Se não existir, salva as configurações padrão
        setSettings(defaultSettings);
        localStorage.setItem('notificationSettings', JSON.stringify(defaultSettings));
      }
    } catch (error) {
      console.error('Erro ao carregar dados de notificações:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // t não está sendo usado dentro do useEffect, apenas no estado inicial
  
  // Salvar notificações quando mudam
  useEffect(() => {
    try {
      localStorage.setItem('userNotifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Erro ao salvar notificações:', error);
    }
  }, [notifications]);
  
  // Salvar configurações quando mudam
  useEffect(() => {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Erro ao salvar configurações de notificações:', error);
    }
  }, [settings]);
  
  // Inicializar o serviço de notificação prévia de sinais
  useEffect(() => {
    // Iniciar o serviço de notificações prévias de sinais
    preSignalNotificationService.start();
    
    // Cleanup function - parar o serviço quando o componente for desmontado
    return () => {
      preSignalNotificationService.stop();
    };
  }, []);
  
  // Número de notificações não lidas
  const unreadCount = notifications.filter(notif => !notif.read).length;
  
  // Função para solicitar permissão
  const requestPermission = async (): Promise<boolean> => {
    const granted = await requestNotificationPermission();
    setHasPermission(granted);
    return granted;
  };
  
  // Atualizar configurações
  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };
  
  // Verificar se um tipo de notificação está habilitado
  const isNotificationTypeEnabled = (type: string): boolean => {
    const typeConfig = settings.types.find(t => t.id === type);
    return settings.enabled && typeConfig?.enabled === true;
  };
  
  // Verificar se o som deve ser tocado para um tipo
  const shouldPlaySoundForType = (type: string): boolean => {
    const typeConfig = settings.types.find(t => t.id === type);
    return settings.sound && typeConfig?.sound === true;
  };
  
  // Função para adicionar uma notificação
  const addNotification = (notification: Omit<Notification, 'id' | 'read'>, showToast = true) => {
    // Gerar um ID único para a notificação
    const id = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Adicionar a notificação ao estado
    setNotifications((prev) => [
      ...prev,
      {
        ...notification,
        id,
        read: false,
        createdAt: notification.createdAt || new Date(),
      },
    ]);
    
    // Adicionar notificação toast apenas se showToast for true
    if (showToast && notification.type) {
      const { title, message } = notification;
      
      // Usar toast apenas se configurado para exibir
      if (shouldShowToast(notification.type, 'toast')) {
        switch(notification.type) {
          case 'success':
            toast.success(title, { description: message });
            break;
          case 'error':
            toast.error(title, { description: message });
            break;
          case 'warning':
            toast.warning(title, { description: message });
            break;
          case 'info':
          case 'system':
          case 'signals':
          case 'live':
          default:
            toast.info(title, { description: message });
            break;
        }
      }
    }
  };
    
  // Função para adicionar notificação de sinal
  const addSignalNotification = (signal: TradingSignal, type: string, showToast = true) => {
    // Converter o sinal para uma notificação adequada
    let title = '';
    let message = '';
    
    // Determinar título e mensagem de acordo com o tipo de sinal
    switch(type) {
      case 'new':
        title = `🎯 Novo Sinal de ${signal.signal === 'BUY' ? 'COMPRA' : 'VENDA'}`;
        message = `${signal.pair} - ${signal.type} - Força: ${signal.strength}`;
        break;
      case 'update':
        title = `🔄 Sinal Atualizado`;
        message = `${signal.pair} - ${signal.signal === 'BUY' ? 'COMPRA' : 'VENDA'} - ${signal.type}`;
        break;
      case 'complete':
        title = `✅ Sinal Concluído com Sucesso`;
        message = `${signal.pair} - ${signal.signal === 'BUY' ? 'COMPRA' : 'VENDA'} - Alvo atingido`;
        break;
      case 'stop':
        title = `⚠️ Sinal Interrompido`;
        message = `${signal.pair} - ${signal.signal === 'BUY' ? 'COMPRA' : 'VENDA'} - Stop acionado`;
        break;
      default:
        title = `Sinal de Trading`;
        message = `${signal.pair} - ${signal.signal === 'BUY' ? 'COMPRA' : 'VENDA'}`;
        break;
    }
    
    addNotification({
      type: 'signals',
      title,
      message,
      createdAt: new Date(),
      timestamp: new Date(),
      actionLink: 'https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree',
      data: {
        type,
        pair: signal.pair,
        direction: signal.signal
      }
    }, showToast);

    // Enviar notificação do navegador se permitido E se showToast for true
    if (settings.browserNotifications && showToast) {
      sendNotification({
        title,
        body: message,
        icon: '/logo.png',
        tag: 'signal',
        requireInteraction: true,
        actions: [
          {
            action: 'open_broker',
            title: 'Abrir Corretora'
          }
        ]
      });
    }
  };
  
  // Função para mostrar notificação prévia de sinal
  const showSignalPreview = (signal: TradingSignal) => {
    const signalTime = new Date(signal.timestamp);
    const actionText = signal.signal === 'BUY' ? t('signals.buy') : t('signals.sell');
    
    // Toast removido conforme solicitado
    
    // Também envia uma notificação do navegador
    if (settings.browserNotifications && isNotificationPermissionGranted()) {
      new Notification(t('signals.notification'), {
        body: `${signal.symbol} - ${actionText} - ${t('signals.minutes_before')}`,
        icon: '/favicon.ico',
        tag: `signal-${signal.id || signal.timestamp}`
      });
      
      // Tocar som de notificação se estiver habilitado
      if (settings.sound) {
        const audio = new Audio('/sounds/notification-high.mp3');
        audio.play().catch(err => console.error('Erro ao reproduzir som:', err));
      }
    }
  };

  // Função para adicionar notificação prévia de sinal (5 minutos antes)
  const addPreSignalNotification = (signal: TradingSignal) => {
    const actionText = signal.signal === 'BUY' ? 'COMPRA' : 'VENDA';
    const directionEmoji = signal.signal === 'BUY' ? '📈' : '📉';
    const signalTime = signal.entry_time || new Date(signal.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const symbolName = signal.symbol || signal.pair || "Ativo";
    
    // Calcular informações adicionais do sinal
    const successRate = signal.success_rate ? (signal.success_rate * 100).toFixed(1) + '%' : 'Alta';
    const price = signal.entry_price || signal.price || 'Preço atual';
    
    addNotification({
      type: 'signals',
      title: `${directionEmoji} Sinal de ${actionText} em 5 minutos!`,
      message: `${symbolName} às ${signalTime} - Expectativa: ${successRate} - Preço: ${price}`,
      createdAt: new Date(),
      timestamp: new Date(),
      actionLink: 'https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree',
      data: {
        type: 'pre-signal',
        pair: symbolName,
        direction: signal.signal,
        entry_time: signalTime,
        success_rate: successRate,
        price: price
      }
    }, false); // false para não mostrar toast (já mostrado pelo serviço)
    
    // Toast removido conforme solicitado
  };


  
  // Marcar uma notificação como lida
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };
  
  // Marcar todas as notificações como lidas
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    
    // Toast removido conforme solicitado
  };
  
  // Limpar todas as notificações
  const clearNotifications = () => {
    setNotifications([]);
    // Toast removido conforme solicitado
  };
  
  // Remover uma notificação específica
  const removeNotification = (id: string) => {
    setNotifications(prev =>
      prev.filter(notif => notif.id !== id)
    );
  };
  
  // Função para enviar uma notificação de teste
  const testNotification = () => {
    addNotification({
      title: 'Notificação de Teste',
      message: 'Esta é uma notificação de teste. Seus sistemas de notificação estão funcionando corretamente.',
      type: 'system',
      image: '/logo.png',
      linkTo: '/settings/notifications',
      createdAt: new Date(),
      timestamp: new Date()
    });
  };
  
  // Enviar notificação específica para transmissão ao vivo
  const sendLiveNotification = (stream: {
    id: string;
    title: string;
    streamerName: string;
    streamerAvatar: string;
  }) => {
    addNotification({
      type: 'live',
      title: `${stream.streamerName} está ao vivo agora!`,
      message: `"${stream.title}" começou agora. Clique para assistir.`,
      linkTo: `/live/${stream.id}`,
      image: stream.streamerAvatar,
      createdAt: new Date(),
      timestamp: new Date()
    });
  };
  
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        settings,
        notificationsEnabled: settings.enabled,
        browserNotificationsEnabled: settings.browserNotifications,
        appNotificationsEnabled: settings.appNotifications,
        updateSettings,
        addNotification,
        addSignalNotification,
        addPreSignalNotification,
        showSignalPreview,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        clearAllNotifications: clearNotifications,
        removeNotification,
        testNotification,
        requestPermission,
        hasPermission,
        sendLiveNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}; 
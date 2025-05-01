import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification, NotificationPriority, requestNotificationPermission, isNotificationPermissionGranted } from '@/utils/notifications';
import { toast } from 'sonner';
import { TradingSignal } from '@/services/types';
import { SignalType } from '@/types/signals';

// Tipos para as notificações
export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'system' | 'live';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt?: Date;
  read: boolean;
  linkTo?: string;
  image?: string;
  duration?: number;
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

// Interface do contexto
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  notificationsEnabled: boolean;
  browserNotificationsEnabled: boolean;
  appNotificationsEnabled: boolean;
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'read'>) => void;
  addSignalNotification: (signal: TradingSignal, action: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
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

// Valores padrão para configurações
const defaultSettings: NotificationSettings = {
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
      name: 'Sinais de Trading',
      enabled: true,
      sound: true,
      description: 'Notificações sobre sinais de compra e venda'
    },
    {
      id: 'completed',
      name: 'Sinais Concluídos',
      enabled: true,
      sound: true, 
      description: 'Notificações quando um sinal atinge seu alvo'
    },
    {
      id: 'stopped',
      name: 'Sinais Cancelados',
      enabled: true,
      sound: true,
      description: 'Notificações quando um sinal atinge seu stop loss'
    },
    {
      id: 'system',
      name: 'Sistema',
      enabled: true,
      sound: false,
      description: 'Notificações sobre atualizações e manutenção do sistema'
    },
    {
      id: 'alerts',
      name: 'Alertas',
      enabled: true,
      sound: true,
      description: 'Alertas importantes sobre sua conta e operações'
    }
  ]
};

// Criação do contexto
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Hook para usar o contexto
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationProvider');
  }
  return context;
};

// Provedor do contexto
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const savedNotifications = localStorage.getItem('notifications');
    return savedNotifications 
      ? JSON.parse(savedNotifications).map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        }))
      : [];
  });
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  
  // Verificar permissão inicial
  useEffect(() => {
    setHasPermission(isNotificationPermissionGranted());
  }, []);
  
  // Carregar notificações e configurações salvas ao iniciar
  useEffect(() => {
    try {
      // Carregar notificações
      const savedNotifications = localStorage.getItem('userNotifications');
      if (savedNotifications) {
        const parsedNotifications = JSON.parse(savedNotifications);
        // Converte strings de timestamp para objetos Date
        const notificationsWithDates = parsedNotifications.map((notif: any) => ({
          ...notif,
          timestamp: new Date(notif.timestamp)
        }));
        setNotifications(notificationsWithDates);
      }
      
      // Carregar configurações
      const savedSettings = localStorage.getItem('notificationSettings');
      if (savedSettings) {
        setSettings({...defaultSettings, ...JSON.parse(savedSettings)});
      } else {
        // Se não existir, salva as configurações padrão
        localStorage.setItem('notificationSettings', JSON.stringify(defaultSettings));
      }
    } catch (error) {
      console.error('Erro ao carregar dados de notificações:', error);
    }
  }, []);
  
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
  const addNotification = (notification: Omit<Notification, 'id' | 'read'>) => {
    // Se for uma notificação de erro e o tipo estiver desabilitado, apenas logar no console
    if (notification.type === 'error') {
      console.log('Notificação do tipo error está desabilitada');
      return;
    }
    
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
        duration: notification.duration || 5000, // Duração padrão de 5 segundos
      },
    ]);
    
    // Agendar a remoção da notificação após a duração especificada
    setTimeout(() => {
      removeNotification(id);
    }, notification.duration || 5000);
  };
  
  // Adicionar uma notificação relacionada a um sinal de trading
  const addSignalNotification = (signal: TradingSignal, action: string) => {
    let title = '';
    let message = '';
    let type: NotificationType = 'info';
    
    switch(action) {
      case 'new':
        title = 'Novo Sinal de Trading';
        message = `Um novo sinal de ${signal.type} foi criado para ${signal.symbol}`;
        type = 'success';
        break;
      case 'executed':
        title = 'Sinal Executado';
        message = `O sinal de ${signal.type} para ${signal.symbol} foi executado`;
        type = 'info';
        break;
      case 'completed':
        title = 'Sinal Concluído';
        message = `O sinal de ${signal.type} para ${signal.symbol} atingiu o alvo`;
        type = 'success';
        break;
      case 'stopped':
        title = 'Stop Loss Atingido';
        message = `O sinal de ${signal.type} para ${signal.symbol} atingiu o stop loss`;
        type = 'warning';
        break;
      case 'canceled':
        title = 'Sinal Cancelado';
        message = `O sinal de ${signal.type} para ${signal.symbol} foi cancelado`;
        type = 'warning';
        break;
      case 'updated':
        title = 'Sinal Atualizado';
        message = `O sinal de ${signal.type} foi atualizado. Novo alvo: ${signal.targetPrice}`;
        break;
    }
    
    addNotification({
      title,
      message,
      type,
      image: '/logo.png',
      linkTo: '/signals',
      createdAt: new Date()
    });
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
    
    toast.success("Todas as notificações foram marcadas como lidas");
  };
  
  // Limpar todas as notificações
  const clearNotifications = () => {
    setNotifications([]);
    toast.success("Todas as notificações foram removidas");
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
      title: "Notificação de Teste",
      message: "Esta é uma notificação de teste do sistema. Se você está vendo isso, o sistema de notificações está funcionando corretamente!",
      type: "system",
      image: "/logo.png",
      linkTo: "/notifications",
      createdAt: new Date()
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
      title: 'Nova Transmissão ao Vivo',
      message: `${stream.streamerName} começou a transmitir "${stream.title}"`,
      linkTo: `/live?stream=${stream.id}`,
      image: stream.streamerAvatar,
      createdAt: new Date()
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
        markAsRead,
        markAllAsRead,
        clearNotifications,
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
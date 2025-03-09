import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification, NotificationPriority } from '@/utils/notifications';
import { toast } from 'sonner';

// Tipo de uma notificação
export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: string;
  priority: NotificationPriority;
  icon?: string;
  actionLink?: string;
}

// Interface do contexto
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAllNotifications: () => void;
  removeNotification: (id: string) => void;
  testNotification: () => void;
}

// Criação do contexto
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Hook para usar o contexto
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationProvider');
  }
  return context;
};

// Provedor do contexto
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Carregar notificações salvas ao iniciar
  useEffect(() => {
    try {
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
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
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
  
  // Número de notificações não lidas
  const unreadCount = notifications.filter(notif => !notif.read).length;
  
  // Adicionar uma nova notificação
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: uuidv4(),
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Enviar notificação do navegador
    sendNotification({
      title: notification.title,
      body: notification.message,
      priority: notification.priority,
      type: notification.type,
      icon: notification.icon
    });
    
    // Mostrar toast
    toast({
      title: notification.title,
      description: notification.message,
      duration: 5000,
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
  const clearAllNotifications = () => {
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
      type: "test",
      priority: "medium",
      icon: "/logo.png"
    });
  };
  
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAllNotifications,
        removeNotification,
        testNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}; 
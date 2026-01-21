import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Notification {
  id: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  timestamp?: number;
  read?: boolean;
}

interface NotificationStore {
  hasNotifications: boolean;
  notifications: Notification[];
  toggleNotifications: () => void;
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      hasNotifications: false,
      notifications: [],
      toggleNotifications: () => set((state) => ({ 
        hasNotifications: !state.hasNotifications 
      })),
      addNotification: (notification) => set((state) => ({
        notifications: [...state.notifications, notification],
        hasNotifications: true
      })),
      clearNotifications: () => set({ 
        notifications: [], 
        hasNotifications: false 
      })
    }),
    {
      name: 'notification-store',
    }
  )
); 
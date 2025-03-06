import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationStore {
  hasNotifications: boolean;
  notifications: any[];
  toggleNotifications: () => void;
  addNotification: (notification: any) => void;
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
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import trendingNotifications from '@/services/trendingNotifications';

// Definindo o tipo TradingSignal compatível com o serviço de notificações
interface TradingSignal {
  id?: string;
  symbol?: string;
  pair?: string;
  signal: 'BUY' | 'SELL';
  entry_time?: string;
  entry_price?: string;
  expiry?: string;
}

interface LiveStream {
  id: string;
  title: string;
  streamerName: string;
  startedAt: Date;
}

interface NotificationSettings {
  signalsEnabled: boolean;
  livesEnabled: boolean;
}

interface TrendingNotificationContextType {
  isEnabled: boolean;
  hasPermission: boolean;
  settings: NotificationSettings;
  requestPermission: () => Promise<boolean>;
  setEnabled: (enabled: boolean) => void;
  setSignalsEnabled: (enabled: boolean) => void;
  setLivesEnabled: (enabled: boolean) => void;
  sendSignalNotification: (signal: TradingSignal) => void;
  sendLiveNotification: (stream: LiveStream) => void;
  scheduleSignalNotification: (signal: TradingSignal) => void;
}

const TrendingNotificationContext = createContext<TrendingNotificationContextType | undefined>(undefined);

export function useTrendingNotifications() {
  const context = useContext(TrendingNotificationContext);
  if (!context) {
    throw new Error('useTrendingNotifications deve ser usado dentro de um TrendingNotificationProvider');
  }
  return context;
}

export const TrendingNotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isEnabled, setIsEnabledState] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    signalsEnabled: true,
    livesEnabled: true
  });

  useEffect(() => {
    // Verificar estado inicial das notificações
    const checkPermission = () => {
      const permission = 'Notification' in window && Notification.permission === 'granted';
      setHasPermission(permission);
      setIsEnabledState(permission);
    };

    checkPermission();

    // Carregar configuração salva do usuário
    const savedEnabled = localStorage.getItem('trending-notifications-enabled');
    if (savedEnabled !== null) {
      const enabled = JSON.parse(savedEnabled);
      setIsEnabledState(enabled && hasPermission);
      trendingNotifications.setEnabled(enabled && hasPermission);
    }

    // Carregar configurações específicas
    const savedSettings = localStorage.getItem('trending-notification-settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.warn('Erro ao carregar configurações de notificação:', error);
      }
    }
  }, [hasPermission]);

  const requestPermission = async (): Promise<boolean> => {
    const granted = await trendingNotifications.requestPermission();
    setHasPermission(granted);
    if (granted) {
      setIsEnabledState(true);
      localStorage.setItem('trending-notifications-enabled', 'true');
    }
    return granted;
  };

  const setEnabled = (enabled: boolean) => {
    if (enabled && !hasPermission) {
      console.warn('Permissão de notificação não concedida');
      return;
    }
    
    setIsEnabledState(enabled);
    trendingNotifications.setEnabled(enabled);
    localStorage.setItem('trending-notifications-enabled', JSON.stringify(enabled));
  };

  const setSignalsEnabled = (enabled: boolean) => {
    const newSettings = { ...settings, signalsEnabled: enabled };
    setSettings(newSettings);
    localStorage.setItem('trending-notification-settings', JSON.stringify(newSettings));
  };

  const setLivesEnabled = (enabled: boolean) => {
    const newSettings = { ...settings, livesEnabled: enabled };
    setSettings(newSettings);
    localStorage.setItem('trending-notification-settings', JSON.stringify(newSettings));
  };

  const sendSignalNotification = (signal: TradingSignal) => {
    if (isEnabled && settings.signalsEnabled) {
      trendingNotifications.sendSignalNotification(signal);
    }
  };

  const sendLiveNotification = (stream: LiveStream) => {
    if (isEnabled && settings.livesEnabled) {
      trendingNotifications.sendLiveNotification(stream);
    }
  };

  const scheduleSignalNotification = (signal: TradingSignal) => {
    if (isEnabled && settings.signalsEnabled) {
      trendingNotifications.scheduleSignalNotification(signal);
    }
  };

  const value: TrendingNotificationContextType = {
    isEnabled,
    hasPermission,
    settings,
    requestPermission,
    setEnabled,
    setSignalsEnabled,
    setLivesEnabled,
    sendSignalNotification,
    sendLiveNotification,
    scheduleSignalNotification,
  };

  return (
    <TrendingNotificationContext.Provider value={value}>
      {children}
    </TrendingNotificationContext.Provider>
  );
}; 
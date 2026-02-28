import { useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import preSignalNotificationService from '@/services/signals/PreSignalNotificationService';

/**
 * Hook para inicializar e conectar o serviço de notificações prévias
 * com o contexto de notificações
 */
export function usePreSignalNotifications() {
  const { addPreSignalNotification } = useNotifications();

  useEffect(() => {
    // Configurar callback para que o serviço possa adicionar notificações à aba
    preSignalNotificationService.setNotificationCallback(addPreSignalNotification);

    // Limpar callback quando o componente for desmontado
    return () => {
      preSignalNotificationService.setNotificationCallback(() => {});
    };
  }, [addPreSignalNotification]);

  // Retornar funções úteis do serviço
  return {
    testNotification: () => preSignalNotificationService.testNotification(),
    clearCache: () => preSignalNotificationService.clearCache(),
    start: () => preSignalNotificationService.start(),
    stop: () => preSignalNotificationService.stop()
  };
} 
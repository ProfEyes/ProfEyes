import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '@/services/notificationService';
import { useNotifications } from '@/contexts/NotificationContext';
import { TradingSignal } from '@/services/types';

interface UseSignalNotificationsOptions {
  enabled?: boolean;
  notifyMinutesBefore?: number; // Minutos antes do horário de entrada para notificar
  notifyFinalReminderMinutes?: number; // Minutos antes para lembrete final
  notificationType?: string; // Tipo da notificação para classificação
}

/**
 * Hook para monitorar sinais e enviar notificações antes do horário de entrada
 * e após determinado tempo para informar sobre resultados
 */
export function useSignalNotifications(
  signals: TradingSignal[] = [],
  options: UseSignalNotificationsOptions = {}
) {
  const { 
    enabled = true, 
    notifyMinutesBefore = 5,
    notifyFinalReminderMinutes = 1,
    notificationType = 'signals' // Padrão: Sinais de Trading
  } = options;
  
  const [notifiedSignals, setNotifiedSignals] = useState<Set<string>>(new Set());
  const [finalReminderSignals, setFinalReminderSignals] = useState<Set<string>>(new Set());
  const [upcomingSignals, setUpcomingSignals] = useState<TradingSignal[]>([]);
  const { settings, addPreSignalNotification } = useNotifications();
  
  // Verificar se as notificações estão habilitadas
  const notificationsEnabled = settings.enabled && 
    settings.browserNotifications && 
    enabled;
  
  // Função para verificar se é hora de notificar sobre um sinal
  const checkSignalNotificationTime = useCallback((signal: TradingSignal) => {
    if (!signal.entry_time || typeof signal.entry_time !== 'string') return false;
    
    // Recuperar a data atual
    const now = new Date();
    
    // Converter o horário de entrada para um objeto Date
    const [hours, minutes] = signal.entry_time.split(':').map(Number);
    const entryTime = new Date();
    entryTime.setHours(hours, minutes, 0, 0);
    
    // ✅ CORREÇÃO: Se o horário já passou hoje, considerar que é amanhã
    if (entryTime < now) {
      // Se passou há menos de 1 hora, ainda considerar como hoje
      const hoursSincePassed = (now.getTime() - entryTime.getTime()) / (1000 * 60 * 60);
      if (hoursSincePassed > 1) {
        entryTime.setDate(entryTime.getDate() + 1);
      }
    }
    
    // Calcular o horário para enviar a notificação (X minutos antes)
    const notificationTime = new Date(entryTime);
    notificationTime.setMinutes(notificationTime.getMinutes() - notifyMinutesBefore);
    
    // Verificar se estamos no momento exato para notificar (dentro de um intervalo de 30 segundos)
    const timeDiff = Math.abs(now.getTime() - notificationTime.getTime());
    const shouldNotify = timeDiff <= 30 * 1000; // 30 segundos
    
    // Log apenas quando estiver próximo (para debug)
    if (timeDiff <= 5 * 60 * 1000) { // Dentro de 5 minutos
      const minutesToNotification = Math.floor(timeDiff / (1000 * 60));
      if (minutesToNotification <= 5 && minutesToNotification >= 0) {
        // Faltam X min para notificar
      }
    }
    
    return shouldNotify;
  }, [notifyMinutesBefore]);
  
  // Função para verificar se é hora de enviar lembrete final
  const checkFinalReminderTime = useCallback((signal: TradingSignal) => {
    if (!signal.entry_time || typeof signal.entry_time !== 'string') return false;
    
    // Recuperar a data atual
    const now = new Date();
    
    // Converter o horário de entrada para um objeto Date
    const [hours, minutes] = signal.entry_time.split(':').map(Number);
    const entryTime = new Date();
    entryTime.setHours(hours, minutes, 0, 0);
    
    // Calcular o horário para enviar o lembrete final (X minutos antes)
    const reminderTime = new Date(entryTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - notifyFinalReminderMinutes);
    
    // Verificar se estamos no momento exato para notificar (dentro de um intervalo de 30 segundos)
    const timeDiff = Math.abs(now.getTime() - reminderTime.getTime());
    return timeDiff <= 30 * 1000; // 30 segundos
  }, [notifyFinalReminderMinutes]);
  

  
  // Função para obter sinais próximos (que ainda não entraram)
  const getUpcomingSignals = useCallback(() => {
    if (!signals.length) return [];
    
    const now = new Date();
    return signals.filter(signal => {
      if (!signal.entry_time || typeof signal.entry_time !== 'string') return false;
      
      // Converter o horário de entrada para um objeto Date
      const [hours, minutes] = signal.entry_time.split(':').map(Number);
      const entryTime = new Date();
      entryTime.setHours(hours, minutes, 0, 0);
      
      // O sinal é próximo se o horário de entrada é no futuro
      return entryTime > now;
    });
  }, [signals]);
  
  // Monitorar os sinais e enviar notificações quando necessário
  useEffect(() => {
    if (!notificationsEnabled || !signals.length) {
      return;
    }
    
    // Verificar sinais a cada 30 segundos
    const checkInterval = setInterval(() => {
      const now = new Date();
      
      // Usar callback para acessar o estado atual sem dependência
      setNotifiedSignals(currentNotified => {
        let newNotified = new Set(currentNotified);
        
        signals.forEach((signal, index) => {
          // Criar ID único para o sinal
          const signalId = String(signal.id || `${signal.symbol || signal.pair || ''}-${signal.entry_time || signal.timestamp || ''}`);
          
          // Verificar se já notificamos sobre este sinal (notificação de entrada)
          if (!newNotified.has(signalId)) {
            // Verificar se é hora de notificar sobre este sinal
            if (checkSignalNotificationTime(signal)) {
              // Enviando notificação
              
              // Enviar notificação do navegador
              notificationService.notifyUpcomingSignal(signal as TradingSignal & { entry_time: string });
              
              // Adicionar à aba de notificações
              addPreSignalNotification(signal as TradingSignal & { entry_time: string });
              
              // Marcar como notificado
              newNotified.add(signalId);
              
              // Notificação enviada
            }
          }
        });
        
        // Retornar novo Set apenas se mudou
        return newNotified.size !== currentNotified.size ? newNotified : currentNotified;
      });
      
      setFinalReminderSignals(currentFinal => {
        let newFinal = new Set(currentFinal);
        
        signals.forEach(signal => {
          const signalId = String(signal.id || `${signal.symbol || signal.pair || ''}-${signal.entry_time || signal.timestamp || ''}`);
          
          // Verificar se já enviamos lembrete final para este sinal
          if (!newFinal.has(signalId)) {
            // Verificar se é hora de enviar lembrete final
            if (checkFinalReminderTime(signal)) {
              // Enviar lembrete final
              notificationService.notifyFinalReminder(signal as TradingSignal & { entry_time: string });
              
              // Marcar como lembrete enviado
              newFinal.add(signalId);
            }
          }
        });
        
        // Retornar novo Set apenas se mudou
        return newFinal.size !== currentFinal.size ? newFinal : currentFinal;
      });
      
      // Atualizar lista de sinais próximos
      setUpcomingSignals(getUpcomingSignals());
    }, 30 * 1000); // 30 segundos
    
    // Executar uma vez imediatamente ao montar
    setUpcomingSignals(getUpcomingSignals());
    
    return () => clearInterval(checkInterval);
  }, [
    signals, 
    notificationsEnabled, 
    checkSignalNotificationTime,
    checkFinalReminderTime,
    getUpcomingSignals,
    addPreSignalNotification
  ]); // Removido notifiedSignals e finalReminderSignals das dependências
  
  // Limpar sinais notificados quando a lista de sinais mudar drasticamente
  useEffect(() => {
    if (signals.length === 0) {
      setNotifiedSignals(new Set());
      setFinalReminderSignals(new Set());
    }
  }, [signals]);
  
  return {
    upcomingSignals,
    notifiedSignals: Array.from(notifiedSignals),
    finalReminderSignals: Array.from(finalReminderSignals),
    notificationsEnabled
  };
} 
import { supabase } from "@/integrations/supabase/client";
import { TradingSignal } from './types';
import { monitorSignals } from './tradingSignals';
import { useNotifications } from '@/contexts/NotificationContext';

// Classe para gerenciar o monitoramento de sinais
export class SignalMonitor {
  private monitoringInterval: number | null = null;
  private intervalTime: number = 5 * 60 * 1000; // 5 minutos por padrão
  private isMonitoring: boolean = false;
  private lastCheckTime: number = 0;
  private currentSignals: TradingSignal[] = [];
  private callbacks: {
    onSignalUpdate?: (signals: TradingSignal[]) => void;
    onSignalComplete?: (signal: TradingSignal[]) => void;
    onSignalStop?: (signals: TradingSignal[]) => void;
    onSignalReplace?: (signals: Record<string, TradingSignal>) => void;
    onError?: (error: Error) => void;
  } = {};
  private notificationContext: ReturnType<typeof useNotifications> | null = null;

  constructor(intervalTime?: number) {
    if (intervalTime) {
      this.intervalTime = intervalTime;
    }
  }

  // Configurar os callbacks para eventos
  public setCallbacks(callbacks: {
    onSignalUpdate?: (signals: TradingSignal[]) => void;
    onSignalComplete?: (signal: TradingSignal[]) => void;
    onSignalStop?: (signals: TradingSignal[]) => void;
    onSignalReplace?: (signals: Record<string, TradingSignal>) => void;
    onError?: (error: Error) => void;
  }) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    return this;
  }

  // Iniciar o monitoramento
  public start(): void {
    if (this.isMonitoring) {
      console.log('Monitoramento de sinais já está ativo.');
      return;
    }

    console.log('Iniciando monitoramento de sinais...');
    this.isMonitoring = true;
    this.lastCheckTime = Date.now();

    // Verificar imediatamente
    this.checkSignals();

    // Configurar verificação periódica
    this.monitoringInterval = window.setInterval(() => {
      this.checkSignals();
    }, this.intervalTime);
  }

  // Parar o monitoramento
  public stop(): void {
    if (!this.isMonitoring || this.monitoringInterval === null) {
      console.log('Monitoramento de sinais não está ativo.');
      return;
    }

    console.log('Parando monitoramento de sinais...');
    clearInterval(this.monitoringInterval);
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  // Verificar se o monitoramento está ativo
  public isActive(): boolean {
    return this.isMonitoring;
  }

  // Obter o tempo decorrido desde a última verificação
  public getTimeSinceLastCheck(): number {
    return Date.now() - this.lastCheckTime;
  }

  // Verificar sinais
  private async checkSignals(): Promise<void> {
    if (!this.isActive()) return;
    
    try {
      // Registra o tempo da verificação
      this.lastCheckTime = Date.now();
      
      // Busca sinais atualizados
      const updatedSignals = await this.fetchSignals();
      
      if (updatedSignals && updatedSignals.length > 0) {
        // Cria listas para novos sinais, sinais completos e parados
        const newSignals: TradingSignal[] = [];
        const completedSignals: TradingSignal[] = [];
        const stoppedSignals: TradingSignal[] = [];
        const replacedSignals: Record<string, TradingSignal> = {};
        
        // Compara sinais atuais com os novos
        updatedSignals.forEach(signal => {
          // Verifica se o sinal já existe
          const existingSignalIndex = this.currentSignals.findIndex(s => s.id === signal.id);
          
          if (existingSignalIndex === -1) {
            // É um novo sinal
            newSignals.push(signal);
          } else {
            const existingSignal = this.currentSignals[existingSignalIndex];
            
            // Verifica se o sinal foi completado
            if (!existingSignal.completed && signal.completed) {
              completedSignals.push(signal);
            }
            
            // Verifica se o sinal foi parado (stop loss)
            if (!existingSignal.stopped && signal.stopped) {
              stoppedSignals.push(signal);
            }
            
            // Verifica se é uma atualização de sinal
            if (existingSignal.version !== signal.version) {
              replacedSignals[signal.id] = signal;
            }
          }
        });
        
        // Atualiza a lista de sinais
        this.currentSignals = updatedSignals;
        
        // Envia notificações para novos sinais
        if (newSignals.length > 0 && this.callbacks.onSignalUpdate) {
          this.callbacks.onSignalUpdate(newSignals);
          
          // Envia notificações para cada novo sinal
          if (this.notificationContext) {
            newSignals.forEach(signal => {
              this.notificationContext?.addSignalNotification(signal, 'new');
            });
          }
        }
        
        // Envia notificações para sinais completos
        if (completedSignals.length > 0 && this.callbacks.onSignalComplete) {
          this.callbacks.onSignalComplete(completedSignals);
          
          // Envia notificações para cada sinal completo
          if (this.notificationContext) {
            completedSignals.forEach(signal => {
              this.notificationContext?.addSignalNotification(signal, 'complete');
            });
          }
        }
        
        // Envia notificações para sinais parados
        if (stoppedSignals.length > 0 && this.callbacks.onSignalStop) {
          this.callbacks.onSignalStop(stoppedSignals);
          
          // Envia notificações para cada sinal parado
          if (this.notificationContext) {
            stoppedSignals.forEach(signal => {
              this.notificationContext?.addSignalNotification(signal, 'stop');
            });
          }
        }
        
        // Envia notificações para sinais atualizados
        if (Object.keys(replacedSignals).length > 0 && this.callbacks.onSignalReplace) {
          this.callbacks.onSignalReplace(replacedSignals);
          
          // Envia notificações para cada sinal atualizado
          if (this.notificationContext) {
            Object.values(replacedSignals).forEach(signal => {
              this.notificationContext?.addSignalNotification(signal, 'update');
            });
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar sinais:', error);
      if (this.callbacks.onError) this.callbacks.onError(error as Error);
    }
  }

  /**
   * Busca os sinais de trading atualizados
   * @returns Promise com array de sinais de trading
   */
  private async fetchSignals(): Promise<TradingSignal[]> {
    try {
      // Usar a função monitorSignals importada para buscar os sinais de trading
      const result = await monitorSignals();
      // Verificar se o resultado tem o formato esperado e converter para o formato correto
      if (Array.isArray(result)) {
        return result;
      } else if (result && typeof result === 'object') {
        // Se for um objeto com propriedades, extrair os sinais atualizados
        const signals = result.updated || [];
        return signals as unknown as TradingSignal[];
      }
      return [];
    } catch (error) {
      console.error('Erro ao buscar sinais de trading:', error);
      if (this.callbacks.onError) this.callbacks.onError(error as Error);
      return [];
    }
  }

  /**
   * Configura o contexto de notificações para enviar notificações de sinais
   */
  setNotificationContext(context: ReturnType<typeof useNotifications>) {
    this.notificationContext = context;
  }
}

// Instância singleton para uso em toda a aplicação
export const signalMonitor = new SignalMonitor();

// Exportar função para iniciar o monitoramento facilmente
export function startSignalMonitoring(
  callbacks?: {
    onSignalUpdate?: (signals: TradingSignal[]) => void;
    onSignalComplete?: (signal: TradingSignal[]) => void;
    onSignalStop?: (signals: TradingSignal[]) => void;
    onSignalReplace?: (signals: Record<string, TradingSignal>) => void;
    onError?: (error: Error) => void;
  },
  intervalTime?: number,
  notificationContext?: ReturnType<typeof useNotifications>
): SignalMonitor {
  if (callbacks) {
    signalMonitor.setCallbacks(callbacks);
  }
  
  if (intervalTime) {
    // Reiniciar com novo intervalo
    signalMonitor.stop();
    const newMonitor = new SignalMonitor(intervalTime);
    if (callbacks) {
      newMonitor.setCallbacks(callbacks);
    }
    if (notificationContext) {
      newMonitor.setNotificationContext(notificationContext);
    }
    newMonitor.start();
    return newMonitor;
  }
  
  if (notificationContext) {
    signalMonitor.setNotificationContext(notificationContext);
  }
  signalMonitor.start();
  return signalMonitor;
}

// Exportar função para parar o monitoramento
export function stopSignalMonitoring(): void {
  signalMonitor.stop();
} 
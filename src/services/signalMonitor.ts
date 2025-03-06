import { supabase } from "@/integrations/supabase/client";
import { TradingSignal } from './types';
import { monitorSignals } from './tradingSignals';

// Classe para gerenciar o monitoramento de sinais
export class SignalMonitor {
  private monitoringInterval: number | null = null;
  private intervalTime: number = 5 * 60 * 1000; // 5 minutos por padrão
  private isMonitoring: boolean = false;
  private lastCheckTime: number = 0;
  private callbacks: {
    onSignalUpdate?: (signals: TradingSignal[]) => void;
    onSignalComplete?: (signal: TradingSignal) => void;
    onSignalReplaced?: (newSignal: TradingSignal) => void;
    onError?: (error: Error) => void;
  } = {};

  constructor(intervalTime?: number) {
    if (intervalTime) {
      this.intervalTime = intervalTime;
    }
  }

  // Configurar os callbacks para eventos
  public setCallbacks(callbacks: {
    onSignalUpdate?: (signals: TradingSignal[]) => void;
    onSignalComplete?: (signal: TradingSignal) => void;
    onSignalReplaced?: (newSignal: TradingSignal) => void;
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
    try {
      console.log('Verificando sinais...');
      const result = await monitorSignals();
      this.lastCheckTime = Date.now();

      // Notificar sobre sinais atualizados
      if (this.callbacks.onSignalUpdate && result.updated.length > 0) {
        this.callbacks.onSignalUpdate(result.updated);
      }

      // Notificar sobre sinais que atingiram alvo ou stop
      if (this.callbacks.onSignalComplete) {
        const completedSignals = result.updated.filter(
          signal => signal.status === 'CONCLUÍDO' || signal.status === 'CANCELADO'
        );

        completedSignals.forEach(signal => {
          if (this.callbacks.onSignalComplete) {
            this.callbacks.onSignalComplete(signal);
          }
        });
      }

      // Notificar sobre sinais substituídos
      if (this.callbacks.onSignalReplaced && result.replaced.length > 0) {
        result.replaced.forEach(signal => {
          if (this.callbacks.onSignalReplaced) {
            this.callbacks.onSignalReplaced(signal);
          }
        });
      }
    } catch (error) {
      console.error('Erro ao verificar sinais:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
    }
  }
}

// Instância singleton para uso em toda a aplicação
export const signalMonitor = new SignalMonitor();

// Exportar função para iniciar o monitoramento facilmente
export function startSignalMonitoring(
  callbacks?: {
    onSignalUpdate?: (signals: TradingSignal[]) => void;
    onSignalComplete?: (signal: TradingSignal) => void;
    onSignalReplaced?: (newSignal: TradingSignal) => void;
    onError?: (error: Error) => void;
  },
  intervalTime?: number
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
    newMonitor.start();
    return newMonitor;
  }
  
  signalMonitor.start();
  return signalMonitor;
}

// Exportar função para parar o monitoramento
export function stopSignalMonitoring(): void {
  signalMonitor.stop();
} 
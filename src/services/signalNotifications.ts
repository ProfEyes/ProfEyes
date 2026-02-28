/**
 * Serviço de notificações de sinais
 * Envia notificações 10 minutos antes do entry_time de cada sinal
 */

import { getSupabase } from '@/lib/supabase';

interface SignalNotification {
  id: string;
  symbol: string;
  display_name: string;
  entry_time: string;
  signal_type: 'BUY' | 'SELL';
  success_rate: number;
  category: string;
}

class SignalNotificationService {
  private static instance: SignalNotificationService;
  private checkInterval: NodeJS.Timeout | null = null;
  private notifiedSignals: Set<string> = new Set();
  private isInitialized = false;
  
  private constructor() {}
  
  static getInstance(): SignalNotificationService {
    if (!SignalNotificationService.instance) {
      SignalNotificationService.instance = new SignalNotificationService();
    }
    return SignalNotificationService.instance;
  }
  
  /**
   * Inicializa o serviço de notificações
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }
    
    if (!('Notification' in window)) {
      return false;
    }
    
    const permission = await this.requestPermission();
    if (!permission) {
      return false;
    }
    
    this.isInitialized = true;
    
    // Iniciar verificação periódica
    this.startPeriodicCheck();
    
    return true;
  }
  
  /**
   * Solicita permissão para notificações
   */
  async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }
  
  /**
   * Inicia verificação periódica de sinais (a cada 1 minuto)
   */
  private startPeriodicCheck(): void {
    
    // Verificar imediatamente
    this.checkUpcomingSignals();
    
    // Verificar a cada 1 minuto
    this.checkInterval = setInterval(() => {
      this.checkUpcomingSignals();
    }, 60 * 1000); // 60 segundos
  }
  
  /**
   * Para o serviço de notificações
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isInitialized = false;
  }
  
  /**
   * Verifica sinais que vão entrar em 10 minutos e envia notificações
   */
  private async checkUpcomingSignals(): Promise<void> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Calcular horário daqui a 10 minutos
      const targetDate = new Date(now.getTime() + 10 * 60 * 1000);
      const targetHour = targetDate.getHours();
      const targetMinute = targetDate.getMinutes();
      const targetTime = `${targetHour.toString().padStart(2, '0')}:${targetMinute.toString().padStart(2, '0')}`;
      
      const supabase = getSupabase();
      const { data: signals, error } = await supabase
        .from('active_signals')
        .select('id, symbol, display_name, entry_time, signal_type, success_rate, category')
        .eq('is_active', true)
        .order('position', { ascending: true });
      
      if (error || !signals || signals.length === 0) return;
      
      // Filtrar sinais que entram daqui a ~10 minutos
      for (const signal of signals) {
        const signalTime = signal.entry_time.substring(0, 5); // HH:MM
        
        // Verificar se o horário do sinal corresponde ao horário alvo (±1 minuto de tolerância)
        if (this.isTimeMatch(signalTime, targetTime, currentHour, currentMinute)) {
          // Verificar se já notificamos este sinal
          const notificationKey = `${signal.id}_${signalTime}`;
          
          if (!this.notifiedSignals.has(notificationKey)) {
            await this.sendSignalNotification(signal);
            
            // Marcar como notificado
            this.notifiedSignals.add(notificationKey);
            
            // Limpar notificações antigas (mais de 1 hora)
            this.cleanOldNotifications();
          }
        }
      }
    } catch {
      // ignorar erros de verificação de sinais
    }
  }
  
  /**
   * Verifica se dois horários são próximos (±1 minuto)
   */
  private isTimeMatch(signalTime: string, targetTime: string, currentHour: number, currentMinute: number): boolean {
    const [signalHour, signalMin] = signalTime.split(':').map(Number);
    const [targetHour, targetMin] = targetTime.split(':').map(Number);
    
    // Calcular minutos desde meia-noite
    const signalMinutes = signalHour * 60 + signalMin;
    const targetMinutes = targetHour * 60 + targetMin;
    const currentMinutes = currentHour * 60 + currentMinute;
    
    // Diferença em minutos
    let diff = signalMinutes - targetMinutes;
    
    // Ajustar para meia-noite
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    
    // Aceitar ±2 minutos de tolerância
    const isMatch = Math.abs(diff) <= 2;
    
    // Verificar se ainda não passou o horário do sinal
    let minutesUntilSignal = signalMinutes - currentMinutes;
    if (minutesUntilSignal < 0) minutesUntilSignal += 1440;
    
    // O sinal deve estar entre 8 e 12 minutos no futuro
    const isInWindow = minutesUntilSignal >= 8 && minutesUntilSignal <= 12;
    
    return isMatch && isInWindow;
  }
  
  /**
   * Envia notificação de sinal
   */
  private async sendSignalNotification(signal: SignalNotification): Promise<void> {
    try {
      const title = `🎯 Novo Sinal em 10 Minutos!`;
      const signalTypeText = signal.signal_type === 'BUY' ? 'COMPRA' : 'VENDA';
      const successPercent = (signal.success_rate * 100).toFixed(1);
      
      const body = `${signal.display_name || signal.symbol} • ${signalTypeText}
Entrada: ${signal.entry_time}
Expectativa: ${successPercent}% • ${signal.category}

Prepare-se para realizar o trade!`;
      
      const notification = new Notification(title, {
        body,
        icon: '/icon.png',
        badge: '/icon.png',
        tag: `signal-${signal.id}`,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
          signalId: signal.id,
          symbol: signal.symbol,
          entry_time: signal.entry_time
        }
      });
      
      // Ao clicar, focar na janela e ir para aba Trades
      notification.onclick = () => {
        window.focus();
        // Navegar para aba Trades
        if (window.location.pathname !== '/signals') {
          window.location.href = '/signals';
        }
        notification.close();
      };
      
    } catch {
      // ignorar erros de notificação
    }
  }
  
  /**
   * Limpa notificações antigas do cache
   */
  private cleanOldNotifications(): void {
    // Manter apenas as últimas 50 notificações
    if (this.notifiedSignals.size > 50) {
      const array = Array.from(this.notifiedSignals);
      const toKeep = array.slice(-50);
      this.notifiedSignals = new Set(toKeep);
    }
  }
  
  /**
   * Retorna se o serviço está ativo
   */
  isActive(): boolean {
    return this.isInitialized && Notification.permission === 'granted';
  }
}

// Exportar instância singleton
export const signalNotificationService = SignalNotificationService.getInstance();

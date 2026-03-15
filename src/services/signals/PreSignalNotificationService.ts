import { TradingSignal, SignalType, SignalStrength } from '../types';
import { toast } from 'sonner';

// Cache para evitar duplicação de notificações (compartilhado entre abas via localStorage)
interface NotificationCache {
  [signalId: string]: number; // timestamp da última notificação
}

class PreSignalNotificationService {
  private notificationInterval: NodeJS.Timeout | null = null;
  private checkInterval = 30000; // Verificar a cada 30 segundos
  private onNotificationCallback: ((signal: TradingSignal) => void) | null = null;
  private readonly CACHE_KEY = 'pre-signal-notification-cache';
  private readonly CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutos
  
  constructor() {
    // Limpar cache expirado ao iniciar
    this.cleanExpiredCache();
    // ❌ NÃO iniciar automaticamente - será iniciado pelo NotificationContext
  }
  
  /**
   * Obtém o cache compartilhado do localStorage
   */
  private getSharedCache(): NotificationCache {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return {};
      return JSON.parse(cached);
    } catch {
      return {};
    }
  }
  
  /**
   * Salva o cache no localStorage (compartilhado entre abas)
   */
  private saveSharedCache(cache: NotificationCache): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  }
  
  /**
   * Verifica se uma notificação já foi enviada recentemente
   */
  private wasRecentlyNotified(signalId: string): boolean {
    const cache = this.getSharedCache();
    const lastNotified = cache[signalId];
    if (!lastNotified) return false;
    
    const now = Date.now();
    const timeSinceLastNotification = now - lastNotified;
    
    // Se foi notificado nos últimos 15 minutos, considerar como recente
    return timeSinceLastNotification < this.CACHE_EXPIRY;
  }
  
  /**
   * Marca uma notificação como enviada
   */
  private markAsNotified(signalId: string): void {
    const cache = this.getSharedCache();
    cache[signalId] = Date.now();
    this.saveSharedCache(cache);
  }
  
  /**
   * Limpa entradas expiradas do cache
   */
  private cleanExpiredCache(): void {
    const cache = this.getSharedCache();
    const now = Date.now();
    let modified = false;
    
    Object.keys(cache).forEach(key => {
      if (now - cache[key] > this.CACHE_EXPIRY) {
        delete cache[key];
        modified = true;
      }
    });
    
    if (modified) {
      this.saveSharedCache(cache);
    }
  }

  /**
   * Define uma callback para ser chamada quando uma notificação prévia for enviada
   * Isso permite que o NotificationContext adicione a notificação à aba
   */
  public setNotificationCallback(callback: (signal: TradingSignal) => void): void {
    this.onNotificationCallback = callback;
  }
  
  /**
   * Inicia o serviço de verificação de notificações prévias
   */
  public start(): void {
    if (this.notificationInterval) {
      this.stop(); // Para evitar intervalos duplicados
    }
    
    this.notificationInterval = setInterval(() => {
      this.checkUpcomingSignals();
    }, this.checkInterval);
    
    // Serviço iniciado
  }
  
  /**
   * Para o serviço de verificação
   */
  public stop(): void {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
      // Serviço parado
    }
  }
  
  /**
   * Limpa o cache de notificações
   */
  public clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }
  
  /**
   * Verifica sinais que estão prestes a acontecer
   * e envia notificações 5 minutos antes
   */
  private checkUpcomingSignals(): void {
    try {
      // Obter sinais armazenados no localStorage, se existirem
      const storedSignals = localStorage.getItem('cached-signals');
      if (!storedSignals) {
        // Nenhum sinal no localStorage
        return;
      }
      
      const signals: TradingSignal[] = JSON.parse(storedSignals);
      const now = Date.now();
      
      // Filtrar sinais ativos e que ainda não aconteceram
      const activeSignals = signals.filter(signal => 
        signal.status === 'active' && (
          signal.timestamp > now || 
          (signal.entry_time && this.parseEntryTimeToTimestamp(signal.entry_time as string) > now)
        )
      );
      
      // Verificar quais sinais estão próximos (5 minutos)
      const fiveMinutesInMs = 5 * 60 * 1000;
      const approachingSignals = activeSignals.filter(signal => {
        const signalTimestamp = signal.entry_time ? 
          this.parseEntryTimeToTimestamp(signal.entry_time as string) : 
          signal.timestamp;
        const timeUntilSignal = signalTimestamp - now;
        return timeUntilSignal <= fiveMinutesInMs && timeUntilSignal > 0;
      });
      
      // Enviar notificações para sinais próximos que ainda não foram notificados
      approachingSignals.forEach(signal => {
        const signalId = signal.id || `${signal.symbol}-${(signal.entry_time as string) || signal.timestamp}`;
        
        // ✅ Verificar cache compartilhado entre abas
        if (!this.wasRecentlyNotified(signalId as string)) {
          this.sendPreSignalNotification(signal);
          
          // ✅ Marcar como notificado no cache compartilhado
          this.markAsNotified(signalId as string);
        }
      });
    } catch (error) {
      console.error('Erro ao verificar sinais próximos:', error);
    }
  }

  /**
   * Converte o horário de entrada (formato HH:MM) para timestamp
   */
  private parseEntryTimeToTimestamp(entryTime: string): number {
    try {
      const [hours, minutes] = entryTime.split(':').map(Number);
      const now = new Date();
      const entryDate = new Date(now);
      entryDate.setHours(hours, minutes, 0, 0);
      
      // Se o horário já passou no dia atual, assumir que é para o próximo dia
      if (entryDate.getTime() < now.getTime()) {
        entryDate.setDate(entryDate.getDate() + 1);
      }
      
      return entryDate.getTime();
    } catch (error) {
      console.error('Erro ao converter horário de entrada:', error);
      return Date.now() + 5 * 60 * 1000; // Fallback: 5 minutos no futuro
    }
  }
  
  /**
   * Envia uma notificação prévia para um sinal específico
   */
  private sendPreSignalNotification(signal: TradingSignal): void {
    try {
      const signalTimestamp = signal.entry_time ? 
        this.parseEntryTimeToTimestamp(signal.entry_time as string) : 
        signal.timestamp;
      const signalTime = new Date(signalTimestamp);
      const isBuy = signal.signal === 'BUY';
      const actionText = isBuy ? 'COMPRA' : 'VENDA';
      
      // Mensagens padrão para notificações (com fallbacks para diferentes idiomas)
      const fallbackTexts = {
        pt: {
          title: '🔔 Sinal em 5 minutos!',
          description: `${actionText}: ${signal.symbol} às ${signal.entry_time || signalTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
        },
        en: {
          title: '🔔 Signal in 5 minutes!',
          description: `${isBuy ? 'BUY' : 'SELL'}: ${signal.symbol} at ${signal.entry_time || signalTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
        },
        es: {
          title: '🔔 ¡Señal en 5 minutos!',
          description: `${isBuy ? 'COMPRA' : 'VENTA'}: ${signal.symbol} a las ${signal.entry_time || signalTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
        }
      };
      
      // Detectar idioma atual
      const currentLang = localStorage.getItem('app-language') || 'pt';
      const texts = fallbackTexts[currentLang as keyof typeof fallbackTexts] || fallbackTexts.pt;
      
      // SEMPRE mostrar toast na tela (independente de permissões)
      toast.message(texts.title, {
        duration: 15000, // 15 segundos para dar tempo de ver
        id: `pre-signal-${signal.id || signal.timestamp}`,
        description: texts.description,
        icon: isBuy ? '🟢' : '🔴',
        className: "bg-red-600/90 backdrop-blur-xl border border-white/20 shadow-[0_0_30px_rgba(220,38,38,0.8)] text-white font-bold",
        style: {
          backgroundColor: 'rgba(220, 38, 38, 0.95)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          fontSize: '16px',
          fontWeight: 'bold'
        }
      });
      
      // Tentar notificação do navegador (mas não é essencial)
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            new Notification(texts.title, {
              body: texts.description,
              icon: '/favicon.ico',
              tag: `signal-${signal.id || signal.timestamp}`,
              requireInteraction: true
            });
          } catch (err) {
            // Erro silenciado
          }
        }
      }

      // Chamar callback para adicionar à aba de notificações
      if (this.onNotificationCallback) {
        this.onNotificationCallback(signal);
      }
    } catch (error) {
      console.error('Erro ao enviar notificação prévia:', error);
    }
  }

  /**
   * Método público para testar notificações
   */
  public testNotification(): void {
    const testSignal: TradingSignal = {
      id: `test-${Date.now()}`,
      symbol: 'BTC/USD (OTC)',
      signal: 'BUY',
      type: SignalType.TECHNICAL,
      strength: SignalStrength.STRONG,
      timestamp: Date.now() + 5 * 60 * 1000, // 5 minutos no futuro
      price: 45000,
      entry_price: 45000,
      stop_loss: 44000,
      target_price: 46000,
      success_rate: 0.85,
      timeframe: '5m',
      expiry: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      risk_reward: '1:2',
      status: 'active',
      entry_time: new Date(Date.now() + 5 * 60 * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      reason: 'Teste de notificação'
    };

    this.sendPreSignalNotification(testSignal);
  }
}

// Criar uma instância singleton do serviço
const preSignalNotificationService = new PreSignalNotificationService();

export default preSignalNotificationService; 
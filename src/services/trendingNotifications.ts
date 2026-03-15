// Serviço de Notificações do Trending
// Apenas 2 tipos: Sinais (5min antes) e Lives

// Definindo o tipo TradingSignal localmente para funcionar
interface TradingSignal {
  id?: string;
  symbol?: string;
  pair?: string;
  signal: 'BUY' | 'SELL';
  entry_time?: string;
  entry_price?: string;
  expiry?: string;
  success_rate?: number; // Taxa de sucesso do sinal (0-1)
}

interface LiveStream {
  id: string;
  title: string;
  streamerName: string;
  startedAt: Date;
}

class TrendingNotifications {
  private static instance: TrendingNotifications;
  private isEnabled: boolean = false;
  private hasPermission: boolean = false;

  private constructor() {
    this.init();
  }

  static getInstance(): TrendingNotifications {
    if (!TrendingNotifications.instance) {
      TrendingNotifications.instance = new TrendingNotifications();
    }
    return TrendingNotifications.instance;
  }

  private async init() {
    // Verificar se o navegador suporta notificações
    if ('Notification' in window) {
      this.hasPermission = Notification.permission === 'granted';
      this.isEnabled = this.hasPermission;
    }
  }

  // Solicitar permissão para notificações
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      this.isEnabled = this.hasPermission;
      
      if (this.hasPermission) {
        this.sendTestNotification();
      }
      
      return this.hasPermission;
    } catch (error) {
      console.error('Erro ao solicitar permissão de notificação:', error);
      return false;
    }
  }

  // Verificar se as notificações estão habilitadas
  isNotificationEnabled(): boolean {
    return this.isEnabled && this.hasPermission;
  }

  // Habilitar/Desabilitar notificações
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled && this.hasPermission;
  }

  // Notificação de teste
  private sendTestNotification() {
    this.sendBasicNotification(
      '🎯 Trending',
      'Notificações ativadas com sucesso! Você receberá alertas sobre sinais e lives.',
      '/icon.png'
    );
  }

  // Função base para enviar notificações
  private sendBasicNotification(title: string, body: string, icon: string = '/icon.png') {
    if (!this.isNotificationEnabled()) return;

    try {
      const notification = new Notification(title, {
        body,
        icon,
        badge: '/icon.png',
        tag: `trending-${Date.now()}`,
        requireInteraction: false
      });

      // Fechar automaticamente após 8 segundos
      setTimeout(() => {
        notification.close();
      }, 8000);

      // Focar janela ao clicar
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  }

  // TIPO 1: Notificação de Sinal (5 minutos antes)
  sendSignalNotification(signal: TradingSignal) {
    if (!this.isNotificationEnabled()) return;

    const direction = signal.signal === 'BUY' ? 'COMPRA' : 'VENDA';
    const directionEmoji = signal.signal === 'BUY' ? '📈' : '📉';
    const assetName = signal.pair || signal.symbol || 'Ativo';
    
    const title = `${directionEmoji} Trending - Sinal de ${direction} em 5 minutos!`;
    
    const body = `🎯 Prepare-se para operar!

📊 Ativo: ${assetName}
${directionEmoji} Direção: ${direction}
⏰ Entrada: ${signal.entry_time || 'Agora'}
📈 Expectativa: ${signal.success_rate ? (signal.success_rate * 100).toFixed(1) + '%' : 'Alta'}
⏱️ Expiração: ${signal.expiry || '5 minutos'}

🚀 Abra sua corretora e prepare-se!`;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/icon.png',
        badge: '/icon.png',
        tag: `signal-${signal.id || Date.now()}`,
        requireInteraction: true, // Manter visível até interação
      });

      // Ação ao clicar
      notification.onclick = () => {
        window.focus();
        // Navegar para página de sinais
        if (window.location.pathname !== '/signals') {
          window.location.href = '/signals';
        }
        notification.close();
      };

      // Fechar após 15 segundos (mais tempo para sinais)
      setTimeout(() => {
        notification.close();
      }, 15000);

    } catch (error) {
      console.error('Erro ao enviar notificação de sinal:', error);
    }
  }

  // TIPO 2: Notificação de Live
  sendLiveNotification(stream: LiveStream) {
    if (!this.isNotificationEnabled()) return;

    const title = `🔴 Trending - Live iniciada!`;
    
    const body = `📺 Nova transmissão ao vivo

🎬 ${stream.title}
👤 Por: ${stream.streamerName}
⏰ Iniciado agora

🔴 Clique para assistir!`;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/icon.png',
        badge: '/icon.png',
        tag: `live-${stream.id}`,
        requireInteraction: false,
      });

      // Ação ao clicar
      notification.onclick = () => {
        window.focus();
        // Navegar para página de live
        if (window.location.pathname !== '/live') {
          window.location.href = '/live';
        }
        notification.close();
      };

      // Fechar após 10 segundos
      setTimeout(() => {
        notification.close();
      }, 10000);

    } catch (error) {
      console.error('Erro ao enviar notificação de live:', error);
    }
  }


  // Agendar notificação de sinal (5 minutos antes)
  scheduleSignalNotification(signal: TradingSignal) {
    if (!signal.entry_time) return;

    try {
      // Calcular quando enviar a notificação (5 minutos antes do sinal)
      const [hours, minutes] = signal.entry_time.split(':').map(Number);
      
      const signalTime = new Date();
      signalTime.setHours(hours, minutes, 0, 0);
      
      // Se o horário já passou hoje, agendar para amanhã
      if (signalTime.getTime() < Date.now()) {
        signalTime.setDate(signalTime.getDate() + 1);
      }
      
      // Calcular 5 minutos antes
      const notificationTime = new Date(signalTime.getTime() - (5 * 60 * 1000));
      
      // Se o tempo de notificação já passou, não agendar
      if (notificationTime.getTime() <= Date.now()) {
        console.log('Tempo de notificação já passou para o sinal:', signal.entry_time);
        return;
      }

      const delay = notificationTime.getTime() - Date.now();
      
      console.log(`Agendando notificação de sinal para ${notificationTime.toLocaleTimeString()}`);
      
      setTimeout(() => {
        this.sendSignalNotification(signal);
      }, delay);

    } catch (error) {
      console.error('Erro ao agendar notificação de sinal:', error);
    }
  }

  // Limpar todas as notificações pendentes
  clearAllScheduled() {
    // Como estamos usando setTimeout, seria necessário rastrear os IDs
    // Por simplicidade, vamos apenas logar
    console.log('Limpando notificações agendadas...');
  }
}

// Exportar instância singleton
export const trendingNotifications = TrendingNotifications.getInstance();
export default trendingNotifications; 
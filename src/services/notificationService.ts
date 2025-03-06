import { TradingSignal } from "./types";

interface NotificationConfig {
  onSignalSuccess?: (signal: TradingSignal) => void;
  onNewSignal?: (signal: TradingSignal) => void;
  onHighProbabilitySignal?: (signal: TradingSignal) => void;
  onMarketNews?: (news: any) => void;
}

class NotificationService {
  private static instance: NotificationService;
  private isEnabled: boolean = false;
  private config: NotificationConfig = {};

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  setConfig(config: NotificationConfig) {
    this.config = config;
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  async sendNotification(title: string, body: string, options: NotificationOptions = {}) {
    if (!this.isEnabled) return;

    try {
      const notification = new Notification(title, {
        ...options,
        body,
        icon: "/icon.png",
        badge: "/badge.png",
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
    }
  }

  // Notificar quando um sinal for bem-sucedido
  async notifySignalSuccess(signal: TradingSignal) {
    const title = "🎯 Sinal Concluído com Sucesso!";
    const body = `O sinal de ${signal.signal === 'BUY' ? 'COMPRA' : 'VENDA'} para ${signal.pair} atingiu o alvo.
    \nNossa taxa de acerto continua aumentando! Não perca os próximos sinais.`;

    await this.sendNotification(title, body, {
      tag: "signal-success",
      requireInteraction: true
    });

    this.config.onSignalSuccess?.(signal);
  }

  // Notificar sobre novos sinais com alta probabilidade
  async notifyHighProbabilitySignal(signal: TradingSignal) {
    if (signal.success_rate < 0.85) return; // Só notifica sinais com mais de 85% de chance

    const title = "🔥 Sinal de Alta Probabilidade!";
    const body = `Novo sinal de ${signal.signal === 'BUY' ? 'COMPRA' : 'VENDA'} para ${signal.pair}
    \nProbabilidade de sucesso: ${(signal.success_rate * 100).toFixed(1)}%`;

    await this.sendNotification(title, body, {
      tag: "high-probability",
      requireInteraction: true
    });

    this.config.onHighProbabilitySignal?.(signal);
  }

  // Notificar sobre notícias importantes do mercado
  async notifyMarketNews(news: any) {
    const title = "📰 Notícia Importante do Mercado";
    const body = news.headline;

    await this.sendNotification(title, body, {
      tag: "market-news",
      requireInteraction: true
    });

    this.config.onMarketNews?.(news);
  }

  // Notificar sobre novos sinais
  async notifyNewSignal(signal: TradingSignal) {
    const title = "🎯 Novo Sinal de Trading";
    const body = `${signal.signal === 'BUY' ? 'COMPRA' : 'VENDA'} - ${signal.pair}
    \nTipo: ${signal.type} | Força: ${signal.strength}`;

    await this.sendNotification(title, body, {
      tag: "new-signal",
      requireInteraction: true
    });

    this.config.onNewSignal?.(signal);
  }
}

export const notificationService = NotificationService.getInstance(); 
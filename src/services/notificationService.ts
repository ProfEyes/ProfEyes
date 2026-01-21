import { TradingSignal } from "./types";

// Importar o serviço de links do trader
import { traderLinkService } from './traderLinkService';

// Estendendo a interface NotificationOptions para incluir a propriedade 'actions'
interface ExtendedNotificationOptions extends NotificationOptions {
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

// Definindo a interface para NotificationEvent
interface ExtendedNotificationEvent extends Event {
  action?: string;
}

interface NotificationConfig {
  onSignalSuccess?: (signal: TradingSignal) => void;
  onNewSignal?: (signal: TradingSignal) => void;
  onHighProbabilitySignal?: (signal: TradingSignal) => void;
  onMarketNews?: (news: Record<string, unknown>) => void;
  onUpcomingSignal?: (signal: TradingSignal) => void;
  onFinalReminder?: (signal: TradingSignal) => void;
  onSignalResult?: (signal: TradingSignal, result: 'success' | 'failure') => void;
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

  async sendNotification(title: string, body: string, options: ExtendedNotificationOptions = {}) {
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
  async notifyMarketNews(news: Record<string, unknown>) {
    const title = "📰 Notícia Importante do Mercado";
    const body = String(news.headline || '');

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

  // Notificar sobre sinal prestes a entrar (5 minutos antes do horário de entrada)
  async notifyUpcomingSignal(signal: TradingSignal) {
    const directionText = signal.signal === 'BUY' ? 'COMPRA' : 'VENDA';
    const directionEmoji = signal.signal === 'BUY' ? '📈' : '📉';
    const symbolName = signal.pair || signal.symbol || "Ativo";
    
    // Calcular horários de reentrada se disponíveis
    let reentryInfo = '';
    if (signal.entry_time) {
      const [hours, minutes] = String(signal.entry_time).split(':').map(Number);
      
      // Calcular reentrada 1 (5 minutos após entrada)
      const reentry1Time = new Date();
      reentry1Time.setHours(hours, minutes + 5, 0, 0);
      if (reentry1Time.getMinutes() >= 60) {
        reentry1Time.setHours(reentry1Time.getHours() + 1);
        reentry1Time.setMinutes(reentry1Time.getMinutes() - 60);
      }
      
      // Calcular reentrada 2 (10 minutos após entrada)
      const reentry2Time = new Date();
      reentry2Time.setHours(hours, minutes + 10, 0, 0);
      if (reentry2Time.getMinutes() >= 60) {
        reentry2Time.setHours(reentry2Time.getHours() + 1);
        reentry2Time.setMinutes(reentry2Time.getMinutes() - 60);
      }
      
      reentryInfo = `\n\nReentradas:\n1ª - ${reentry1Time.toTimeString().slice(0, 5)}\n2ª - ${reentry2Time.toTimeString().slice(0, 5)}`;
    }
    
    const title = `${directionEmoji} ATENÇÃO: Sinal de ${directionText} em 5 minutos!`;
    const body = `🎯 PREPARE-SE PARA OPERAR!
    
📊 Ativo: ${symbolName}
${directionEmoji} Direção: ${directionText}
⏰ Entrada: ${signal.entry_time || 'A definir'}
💰 Preço: ${signal.entry_price || signal.price || 'Preço atual'}
📈 Expectativa: ${signal.success_rate ? (signal.success_rate * 100).toFixed(1) + '%' : 'Alta'}
⏱️ Expiração: ${signal.expiry || '5 minutos'}${reentryInfo}

🚀 Abra sua corretora e prepare-se!`;

    try {
      // Criar uma notificação com ações específicas
      const notification = new Notification(title, {
        body,
        icon: "/icon.png",
        badge: "/badge.png",
        tag: "upcoming-signal",
        requireInteraction: true,
        // Definir ações na notificação (não funcionam em todos os navegadores)
        actions: [
          {
            action: 'open_broker',
            title: '🚀 Abrir Corretora'
          },
          {
            action: 'view_signals',
            title: '📊 Ver Sinais'
          }
        ]
      } as ExtendedNotificationOptions);

      // Manipular cliques nos botões da notificação
      notification.onclick = async (event) => {
        window.focus();
        notification.close();
        
        // Verificar qual botão foi clicado
        const extEvent = event as ExtendedNotificationEvent;
        if (extEvent.action) {
          if (extEvent.action === 'open_broker') {
            // Obter link dinâmico da corretora em vez de usar um fixo
            const traderLink = await traderLinkService.getCurrentTraderLink();
            window.open(traderLink, '_blank');
          } else if (extEvent.action === 'view_signals') {
            // Navegar para a página de sinais
            window.location.href = '/signals';
          }
        } else {
          // Comportamento padrão: navegar para a página de sinais
          window.location.href = '/signals';
        }
      };
      
      // Reproduzir som de notificação se disponível
      try {
        const audio = new Audio('/sounds/signal.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Ignorar erro se não conseguir reproduzir o som
        });
      } catch (error) {
        // Ignorar erro de áudio
      }
      
    } catch (error) {
      console.error("Erro ao enviar notificação de sinal próximo:", error);
      
      // Fallback para notificação básica
      await this.sendNotification(title, body, {
        tag: "upcoming-signal",
        requireInteraction: true
      });
    }

    // Chamar callback se definida
    this.config.onUpcomingSignal?.(signal);
  }

  // Notificar lembrete final (1 minuto antes do horário de entrada)
  async notifyFinalReminder(signal: TradingSignal) {
    const directionText = signal.signal === 'BUY' ? 'COMPRA' : 'VENDA';
    const directionEmoji = signal.signal === 'BUY' ? '📈' : '📉';
    const symbolName = signal.pair || signal.symbol || "Ativo";
    
    const title = `🚨 ÚLTIMO AVISO: ${directionText} em 1 minuto!`;
    const body = `⚡ ENTRE AGORA NA CORRETORA!
    
📊 ${symbolName} - ${directionText}
⏰ Entrada: ${signal.entry_time || 'AGORA'}
💰 Preço: ${signal.entry_price || signal.price || 'Preço atual'}
${directionEmoji} Direção: ${directionText}

🔥 ÚLTIMOS SEGUNDOS PARA ENTRAR!
⚡ Não perca esta oportunidade!`;

    try {
      // Criar uma notificação urgente
      const notification = new Notification(title, {
        body,
        icon: "/icon.png",
        badge: "/badge.png",
        tag: "final-reminder",
        requireInteraction: true,
        actions: [
          {
            action: 'open_broker',
            title: '⚡ ENTRAR AGORA'
          }
        ]
      } as ExtendedNotificationOptions);

      // Manipular cliques
      notification.onclick = async (event) => {
        window.focus();
        notification.close();
        
        const extEvent = event as ExtendedNotificationEvent;
        if (extEvent.action === 'open_broker' || !extEvent.action) {
          try {
            // Obter link dinâmico da corretora em vez de usar um fixo
            const traderLink = await traderLinkService.getCurrentTraderLink();
            window.open(traderLink, '_blank');
          } catch (error) {
            console.error("Erro ao obter link do trader:", error);
            // Fallback para link padrão
          window.open('https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree', '_blank');
          }
        }
      };
      
      // Som mais urgente para o lembrete final
      try {
        const audio = new Audio('/sounds/alert.mp3');
        audio.volume = 0.8;
        audio.play().catch(() => {
          // Fallback para som padrão
          const fallbackAudio = new Audio('/sounds/signal.mp3');
          fallbackAudio.volume = 0.8;
          fallbackAudio.play().catch(() => {});
        });
      } catch (error) {
        // Ignorar erro de áudio
      }
      
    } catch (error) {
      console.error("Erro ao enviar lembrete final:", error);
      
      // Fallback para notificação básica
      await this.sendNotification(title, body, {
        tag: "final-reminder",
        requireInteraction: true
      });
    }
    
    // Chamar callback se definida
    this.config.onFinalReminder?.(signal);
  }


}

export const notificationService = NotificationService.getInstance(); 
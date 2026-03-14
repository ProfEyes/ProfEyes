import { useToast } from "@/components/ui/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import { useCallback } from "react";

interface InAppNotificationOptions {
  title: string;
  description: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'system' | 'live' | 'signals';
  variant?: 'default' | 'destructive';
  linkTo?: string;
  image?: string;
  data?: Record<string, unknown>;
}

/**
 * Hook personalizado para enviar notificações internas ao app
 * - Exibe toast visual usando useToast (shadcn/ui)
 * - Salva no banco de dados via NotificationContext
 * - Respeita as configurações do usuário (tipos de notificação habilitados)
 */
export function useInAppNotification() {
  const { toast } = useToast();
  const { addNotification, settings } = useNotifications();

  const notify = useCallback(
    (options: InAppNotificationOptions) => {
      const {
        title,
        description,
        type = 'info',
        variant = 'default',
        linkTo,
        image,
        data,
      } = options;

      // Verificar se as notificações estão globalmente habilitadas
      if (!settings.enabled) {
        return;
      }

      // Verificar se este tipo de notificação está habilitado
      if (type !== 'system') {
        const typeConfig = settings.types.find((t) => t.id === type);
        if (!typeConfig?.enabled) {
          return;
        }
      }

      // Exibir toast visual (sempre dentro do app, nunca do navegador)
      if (settings.appNotifications) {
        toast({
          title,
          description,
          variant,
        });
      }

      // Salvar no banco de dados via NotificationContext
      // (não mostra toast adicional, pois já mostramos acima)
      addNotification(
        {
          type,
          title,
          message: description,
          timestamp: new Date(),
          linkTo,
          image,
          data,
        },
        false // showToast = false (não exibir toast duplicado)
      );
    },
    [toast, addNotification, settings]
  );

  return { notify };
}

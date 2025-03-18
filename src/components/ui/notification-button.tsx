import { useState, useEffect } from 'react';
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function NotificationButton() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  // Função para desativar notificações
  const disableNotifications = () => {
    setIsTransitioning(true);
    setIsDisabling(true);
    setIsEnabled(false);
    toast.info("Notificações desativadas", {
      description: "Você não receberá mais alertas sobre sinais e atualizações."
    });
    setTimeout(() => {
      setIsTransitioning(false);
      setIsDisabling(false);
    }, 1000);
  };

  // Solicitar permissão para notificações
  const requestNotificationPermission = async () => {
    // Se já estiver ativado, desativa
    if (isEnabled) {
      disableNotifications();
      return;
    }

    setIsTransitioning(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setIsEnabled(true);
        setIsAnimating(true);
        toast.success("Notificações ativadas com sucesso!", {
          description: "Você receberá alertas sobre sinais importantes e atualizações do mercado."
        });
      } else {
        setIsEnabled(false);
        toast.error("Permissão de notificação negada", {
          description: "Você não receberá alertas importantes. Considere habilitar as notificações para melhor experiência."
        });
      }
    } catch (error) {
      console.error("Erro ao solicitar permissão:", error);
      toast.error("Erro ao ativar notificações");
      setIsEnabled(false);
    }
    setTimeout(() => {
      setIsTransitioning(false);
      setIsAnimating(false);
    }, 1000);
  };

  // Função para enviar notificação
  const sendNotification = (title: string, body: string) => {
    if (!isEnabled) return;

    try {
      new Notification(title, {
        body,
        icon: "/icon.png",
        badge: "/badge.png",
      });
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
    }
  };

  // Animar o sino quando receber uma notificação
  const animateBell = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={requestNotificationPermission}
      className={cn(
        "border-white/10 bg-white/5 hover:bg-white/10 relative overflow-hidden transition-all duration-300",
        isEnabled && "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20",
        !isEnabled && "border-gray-800 bg-gray-900/50 hover:bg-gray-800/70",
        isTransitioning && "scale-105"
      )}
    >
      <BellRing 
        className={cn(
          "h-5 w-5 transition-all duration-300",
          isEnabled && "text-blue-400",
          !isEnabled && "text-gray-600",
          isAnimating && "animate-bell",
          isTransitioning && "scale-110",
          isDisabling && "animate-bell-disable"
        )} 
      />
      {isEnabled && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      )}
      {!isEnabled && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center",
          isTransitioning ? "animate-disable-notification" : ""
        )}>
          <div className="w-7 h-0.5 bg-red-500/70 rotate-45 transform origin-center scale-x-0 transition-transform duration-300" 
               style={{ transform: !isEnabled ? 'rotate(45deg) scaleX(1)' : 'rotate(45deg) scaleX(0)' }} />
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes bell {
          0%, 100% { transform: rotate(0); }
          20%, 60% { transform: rotate(15deg); }
          40%, 80% { transform: rotate(-15deg); }
        }

        .animate-bell {
          animation: bell 0.5s ease-in-out;
        }

        @keyframes bell-disable {
          0% { 
            transform: rotate(0);
            filter: brightness(1);
          }
          15% { 
            transform: rotate(20deg);
            filter: brightness(0.9);
          }
          30% { 
            transform: rotate(-15deg);
            filter: brightness(0.8);
          }
          45% { 
            transform: rotate(10deg);
            filter: brightness(0.7);
          }
          60% { 
            transform: rotate(-5deg);
            filter: brightness(0.6);
          }
          75% {
            transform: rotate(3deg);
            filter: brightness(0.5);
          }
          90% {
            transform: rotate(-2deg);
            filter: brightness(0.4);
          }
          100% { 
            transform: rotate(0);
            filter: brightness(0.3);
          }
        }

        .animate-bell-disable {
          animation: bell-disable 0.6s ease-in-out forwards;
        }

        @keyframes disable-notification {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }

        .animate-disable-notification {
          animation: disable-notification 0.3s ease-out forwards;
        }

        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }

        .animate-pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}} />
    </Button>
  );
} 
import { useState, useEffect } from 'react';
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationButtonProps {
  className?: string;
}

export function NotificationButton({ className }: NotificationButtonProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Verificar permissão inicial
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Função para desativar notificações
  const disableNotifications = () => {
    setIsTransitioning(true);
    setIsEnabled(false);
    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
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
        setTimeout(() => setIsAnimating(false), 800);
      } else {
        setIsEnabled(false);
      }
    } catch (error) {
      console.error("Erro ao solicitar permissão:", error);
      setIsEnabled(false);
    }
    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  };

  // Função para enviar notificação (só funciona se estiver habilitado)
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

  return (
    <div className="relative group">
      <Button 
        variant="ghost"
        size="icon" 
        onClick={requestNotificationPermission}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          // Base styling - ultra transparent dark theme
          "relative h-10 w-10 rounded-xl border border-white/5 bg-black/20 backdrop-blur-sm",
          "hover:bg-black/40 hover:border-white/10 transition-all duration-300 ease-out",
          "shadow-lg hover:shadow-xl hover:shadow-black/20",
          
          // Enabled state - elegant blue glow
          isEnabled && [
            "bg-gradient-to-br from-blue-500/10 via-black/30 to-purple-500/10",
            "border-blue-400/20 hover:border-blue-400/30",
            "hover:bg-gradient-to-br hover:from-blue-500/20 hover:via-black/40 hover:to-purple-500/20",
            "shadow-blue-500/10 hover:shadow-blue-500/20"
          ],
          
          // Disabled state - subtle red tint
          !isEnabled && [
            "bg-gradient-to-br from-gray-800/20 via-black/30 to-gray-900/20",
            "border-gray-700/20 hover:border-gray-600/30",
            "hover:bg-gradient-to-br hover:from-gray-800/30 hover:via-black/40 hover:to-gray-900/30"
          ],
          
          // Transitioning state
          isTransitioning && "scale-95 brightness-110",
          
          className
        )}
      >
        {/* Background glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300",
          "bg-gradient-to-r from-transparent via-white/5 to-transparent",
          isHovered && "opacity-100"
        )} />
        
        {/* Bell icon with sophisticated styling */}
        <div className="relative z-10">
          {isEnabled ? (
            <Bell 
              className={cn(
                "h-5 w-5 transition-all duration-300 ease-out",
                "text-blue-300 group-hover:text-blue-200",
                isAnimating && "animate-notification-ring",
                isTransitioning && "scale-110 rotate-12"
              )} 
            />
          ) : (
            <BellOff 
              className={cn(
                "h-5 w-5 transition-all duration-300 ease-out",
                "text-gray-400 group-hover:text-gray-300",
                isTransitioning && "scale-110"
              )} 
            />
          )}
        </div>

        {/* Active indicator - removed */}

                 {/* Disabled overlay - sophisticated design */}
         {!isEnabled && (
           <div className={cn(
             "absolute inset-0 flex items-center justify-center z-10",
             "transition-all duration-300 ease-out"
           )}>
             <div className="relative w-full h-full">
               {/* Diagonal line with gradient and glow */}
               <div className={cn(
                 "absolute inset-0 flex items-center justify-center",
                 "transform rotate-45",
                 "transition-all duration-300 ease-out"
               )}>
                 <div className={cn(
                   "h-0.5 w-8",
                   "bg-gradient-to-r from-transparent via-red-500/80 to-transparent",
                   "rounded-full",
                   "shadow-[0_0_10px_rgba(239,68,68,0.3)]",
                   "transition-all duration-300 ease-out",
                   isTransitioning && "scale-110 opacity-80"
                 )} />
               </div>
               
               {/* Subtle circular overlay */}
               <div className={cn(
                 "absolute inset-0 rounded-xl",
                 "bg-gradient-to-br from-red-950/20 via-transparent to-red-900/10",
                 "opacity-0 group-hover:opacity-100",
                 "transition-all duration-300 ease-out"
               )} />
             </div>
           </div>
         )}

        {/* Hover ring effect */}
        <div className={cn(
          "absolute inset-0 rounded-xl border border-white/10 opacity-0",
          "transition-opacity duration-300 ease-out",
          isHovered && "opacity-100"
        )} />
      </Button>

      

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes notification-ring {
          0%, 100% { 
            transform: rotate(0deg) scale(1); 
            filter: brightness(1);
          }
          15% { 
            transform: rotate(15deg) scale(1.05); 
            filter: brightness(1.1);
          }
          30% { 
            transform: rotate(-12deg) scale(1.05); 
            filter: brightness(1.1);
          }
          45% { 
            transform: rotate(8deg) scale(1.02); 
            filter: brightness(1.05);
          }
          60% { 
            transform: rotate(-5deg) scale(1.02); 
            filter: brightness(1.05);
          }
          75% {
            transform: rotate(3deg) scale(1.01);
            filter: brightness(1.02);
          }
        }

        .animate-notification-ring {
          animation: notification-ring 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes pulse-gentle {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.7; 
            transform: scale(0.95);
          }
        }

        .animate-pulse-gentle {
          animation: pulse-gentle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}} />
    </div>
  );
} 
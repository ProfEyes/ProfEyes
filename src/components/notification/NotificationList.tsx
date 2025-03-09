import React from "react";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Trash, Check, Clock, AlertTriangle, Info, Zap, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";

// Formatação relativa de data para exibição amigável
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "Agora";
  } else if (diffMins < 60) {
    return `${diffMins} min`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else if (diffDays === 1) {
    return "Ontem";
  } else if (diffDays < 7) {
    return `${diffDays} dias`;
  } else {
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  }
};

// Componente para cada notificação individual
const NotificationItem: React.FC<{ notification: Notification; compact?: boolean }> = ({ 
  notification, 
  compact = false 
}) => {
  const { markAsRead, removeNotification } = useNotifications();
  
  // Escolher o ícone com base no tipo de notificação
  const renderIcon = () => {
    switch (notification.type) {
      case "alerts":
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case "signals":
        return <Zap className="h-5 w-5 text-blue-400" />;
      case "news":
        return <Info className="h-5 w-5 text-amber-400" />;
      case "portfolio":
        return <MessageSquare className="h-5 w-5 text-purple-400" />;
      case "test":
        return <Bell className="h-5 w-5 text-teal-400" />;
      default:
        return <Bell className="h-5 w-5 text-white/70" />;
    }
  };
  
  // Escolher cor de fundo com base na prioridade
  const getBgColorClass = () => {
    if (notification.read) return "bg-black/20";
    
    switch (notification.priority) {
      case "high":
        return "bg-gradient-to-r from-red-950/30 to-red-900/20 border-red-800/30";
      case "medium":
        return "bg-gradient-to-r from-amber-950/30 to-amber-900/20 border-amber-800/30";
      case "low":
        return "bg-gradient-to-r from-blue-950/30 to-blue-900/20 border-blue-800/30";
      default:
        return "bg-gradient-to-r from-white/10 to-white/5 border-white/10";
    }
  };
  
  // Renderização mais compacta para modo dropdown
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className={cn(
          "p-3 border rounded-md mb-2 last:mb-0 hover:bg-white/5 transition-colors",
          notification.read ? "border-white/5 opacity-70" : "border-white/10",
          getBgColorClass()
        )}
        onClick={() => !notification.read && markAsRead(notification.id)}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{renderIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className={cn(
                "text-sm font-medium truncate",
                notification.read ? "text-white/70" : "text-white/90"
              )}>
                {notification.title}
              </h4>
              <span className="text-xs text-white/50 whitespace-nowrap">
                {formatRelativeTime(notification.timestamp)}
              </span>
            </div>
            <p className="text-xs text-white/60 line-clamp-1">
              {notification.message}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Renderização completa para página de notificações
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "p-4 border rounded-lg mb-3 last:mb-0 relative overflow-hidden",
        notification.read ? "border-white/5 opacity-80" : "border-white/10",
        getBgColorClass()
      )}
    >
      {!notification.read && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
      )}
      
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{renderIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "text-sm font-medium",
              notification.read ? "text-white/70" : "text-white/90"
            )}>
              {notification.title}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 whitespace-nowrap flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatRelativeTime(notification.timestamp)}
              </span>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] py-0 h-5",
                  notification.priority === "high" && "bg-red-500/20 text-red-200",
                  notification.priority === "medium" && "bg-amber-500/20 text-amber-200",
                  notification.priority === "low" && "bg-blue-500/20 text-blue-200"
                )}
              >
                {notification.priority === "high" && "Alta"}
                {notification.priority === "medium" && "Média"}
                {notification.priority === "low" && "Baixa"}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-white/60 mt-1 mb-2">
            {notification.message}
          </p>
          
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-white/40">
              {format(notification.timestamp, "PPp", { locale: ptBR })}
            </div>
            <div className="flex gap-1">
              {!notification.read && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 px-2 text-xs hover:bg-white/10"
                  onClick={() => markAsRead(notification.id)}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Marcar como lida
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-red-300 hover:text-red-200 hover:bg-red-950/30"
                onClick={() => removeNotification(notification.id)}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Remover
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Componente principal da lista de notificações
export const NotificationList: React.FC<{ 
  maxHeight?: string; 
  compact?: boolean;
  showClearButton?: boolean;
  emptyMessage?: string;
  viewFilter?: "all" | "unread" | "read";
}> = ({ 
  maxHeight = "500px", 
  compact = false,
  showClearButton = true,
  emptyMessage = "Não há notificações no momento",
  viewFilter = "all"
}) => {
  const { notifications, unreadCount, markAllAsRead, clearAllNotifications } = useNotifications();
  
  // Aplicando o filtro às notificações
  const filteredNotifications = notifications.filter(notif => {
    if (viewFilter === "unread" && notif.read) return false;
    if (viewFilter === "read" && !notif.read) return false;
    return true;
  });
  
  if (filteredNotifications.length === 0) {
    return (
      <Card className="border-white/5 bg-black/20 backdrop-blur-sm">
        <CardContent className="p-6 flex flex-col items-center justify-center h-48">
          <Bell className="h-12 w-12 text-white/10 mb-3" />
          <p className="text-white/50 text-center">
            {viewFilter === "unread" 
              ? "Não há notificações não lidas no momento" 
              : viewFilter === "read" 
                ? "Não há notificações lidas no momento"
                : emptyMessage}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-white/5 bg-gradient-to-br from-black/40 via-black/30 to-black/20 backdrop-blur-sm relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-semibold text-white/90 flex items-center gap-2">
              <Bell className="h-5 w-5 text-purple-400" />
              {viewFilter === "unread" 
                ? "Notificações não lidas" 
                : viewFilter === "read"
                  ? "Notificações lidas"
                  : "Todas as notificações"}
              {viewFilter === "unread" && unreadCount > 0 && (
                <Badge className="bg-blue-500 text-white ml-2">
                  {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-white/60">
              {viewFilter === "unread" 
                ? `Você tem ${unreadCount} notificação(ões) não lida(s)`
                : viewFilter === "read"
                  ? `Você tem ${notifications.filter(n => n.read).length} notificação(ões) lida(s)`
                  : `Você tem ${notifications.length} notificação(ões) no total`}
            </CardDescription>
          </div>
          
          {showClearButton && (
            <div className="flex items-center gap-2">
              {viewFilter !== "read" && unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs h-8 px-2 hover:bg-white/10"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Marcar todas como lidas
                </Button>
              )}
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={clearAllNotifications}
                className="text-xs h-8 px-2 bg-red-950/50 hover:bg-red-900/50 border border-red-800/50"
              >
                <Trash className="h-3.5 w-3.5 mr-1" />
                Limpar todas
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <Separator className="bg-white/5" />
      
      <CardContent className="pt-4 px-4 pb-2">
        <ScrollArea className={`${maxHeight ? `max-h-[${maxHeight}]` : ''} pr-2`}>
          <AnimatePresence>
            {filteredNotifications.map(notification => (
              <NotificationItem 
                key={notification.id} 
                notification={notification} 
                compact={compact}
              />
            ))}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
      
      {showClearButton && (
        <>
          <Separator className="bg-white/5" />
          <CardFooter className="pt-3 pb-3 flex justify-end gap-2">
            {viewFilter !== "read" && unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs bg-white/5 border-white/10 hover:bg-white/10"
                onClick={markAllAsRead}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              className="text-xs bg-red-950/50 hover:bg-red-900/50 border border-red-800/50"
              onClick={clearAllNotifications}
            >
              <Trash className="h-3.5 w-3.5 mr-1" />
              Limpar notificações
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}; 
import React, { useState, useEffect } from 'react';
import { Notification, useNotifications } from '@/contexts/NotificationContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, Tag, X, ChevronRight, Calendar, Clock, Filter, Trash2, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * Formata o tempo relativo (há quanto tempo aconteceu)
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'Agora mesmo';
  } else if (diffMin < 60) {
    return `${diffMin} min atrás`;
  } else if (diffHour < 24) {
    return `${diffHour}h atrás`;
  } else if (diffDay === 1) {
    return 'Ontem';
  } else if (diffDay < 7) {
    return `${diffDay} dias atrás`;
  } else {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}

/**
 * Formata a data completa
 */
function formatFullDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Configurações de cores por tipo de notificação
const notificationStyles: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  signals: { 
    icon: <Tag size={16} />, 
    color: 'text-blue-600 dark:text-blue-500', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30' 
  },
  completed: { 
    icon: <Check size={16} />, 
    color: 'text-green-600 dark:text-green-500', 
    bgColor: 'bg-green-100 dark:bg-green-900/30' 
  },
  stopped: { 
    icon: <X size={16} />, 
    color: 'text-red-600 dark:text-red-500', 
    bgColor: 'bg-red-100 dark:bg-red-900/30' 
  },
  system: { 
    icon: <Bell size={16} />, 
    color: 'text-purple-600 dark:text-purple-500', 
    bgColor: 'bg-purple-100 dark:bg-purple-900/30' 
  },
  alerts: { 
    icon: <Bell size={16} />, 
    color: 'text-orange-600 dark:text-orange-500', 
    bgColor: 'bg-orange-100 dark:bg-orange-900/30' 
  }
};

// Componente para um item de notificação
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onRemove?: (id: string) => void;
  onClick?: () => void;
  compact?: boolean;
}

const NotificationItem = ({ notification, onMarkAsRead, onRemove, onClick, compact = false }: NotificationItemProps) => {
  const navigate = useNavigate();
  const style = notificationStyles[notification.type] || notificationStyles.system;
  
  const handleAction = () => {
    if (notification.actionLink) {
      navigate(notification.actionLink);
    }
    if (onClick) onClick();
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative border p-4 mb-2 rounded-lg transition-all",
        notification.read 
          ? "bg-muted/30 border-muted/50" 
          : "bg-muted/10 border-muted shadow-sm",
        compact ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-full flex-shrink-0", style.bgColor)}>
          <div className={style.color}>{style.icon}</div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "font-medium line-clamp-1",
              notification.read ? "text-muted-foreground" : "text-foreground"
            )}>
              {notification.title}
            </h4>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <time className="text-xs text-muted-foreground">
                {formatRelativeTime(notification.timestamp)}
                    </time>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{formatFullDate(notification.timestamp)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {!compact && (
                <div className="flex gap-1 ml-2">
                  {!notification.read && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7" 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onMarkAsRead) onMarkAsRead(notification.id);
                            }}
                          >
                            <Check size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Marcar como lida</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-destructive" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onRemove) onRemove(notification.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remover notificação</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </div>
          
          <p className={cn(
            "text-sm mt-1",
            notification.read ? "text-muted-foreground" : "text-foreground"
          )}>
            {notification.message}
          </p>
          
          {notification.data && !compact && (
            <div className="mt-2 p-2 bg-muted/20 rounded text-xs">
              <pre className="overflow-auto max-h-24 whitespace-pre-wrap">
                {JSON.stringify(notification.data, null, 2)}
              </pre>
            </div>
          )}
          
          {notification.actionLink && !compact && (
            <div className="mt-3">
              <Button
                variant="secondary" 
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={handleAction}
              >
                <ChevronRight size={12} />
                Ver mais detalhes
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {!notification.read && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary" />
      )}
      
      {/* Overlay para clique quando compacto */}
      {compact && (
        <button 
          className="absolute inset-0 w-full h-full cursor-pointer"
          onClick={handleAction}
          aria-label="Ver notificação"
        />
      )}
    </motion.div>
  );
};

// Componente para o filtro de notificações
interface NotificationFilterProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  onClear: () => void;
  onMarkAllAsRead: () => void;
  unreadOnly: boolean;
  setUnreadOnly: (value: boolean) => void;
}

const NotificationFilter = ({
  selectedType,
  onSelectType,
  onClear,
  onMarkAllAsRead,
  unreadOnly,
  setUnreadOnly
}: NotificationFilterProps) => {
  const { settings } = useNotifications();
  const notificationTypes = settings.types;
  
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Suas Notificações</h3>
        
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onMarkAllAsRead}>
                  <Check size={14} className="mr-1" />
                  <span className="hidden sm:inline">Marcar todas</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Marcar todas como lidas</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onClear}>
                  <Trash2 size={14} className="mr-1" />
                  <span className="hidden sm:inline">Limpar todas</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remover todas as notificações</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Filter size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filtrar notificações</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Filtrar por tipo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => onSelectType('all')}
                className={selectedType === 'all' ? 'bg-muted' : ''}
              >
                <span className="flex items-center gap-2">
                  <Bell size={14} />
                  Todas
                </span>
                {selectedType === 'all' && <Check size={14} className="ml-auto" />}
              </DropdownMenuItem>
              
              {notificationTypes.map(type => (
                <DropdownMenuItem 
                  key={type.id}
                  onClick={() => onSelectType(type.id)}
                  className={selectedType === type.id ? 'bg-muted' : ''}
                >
                  <span className="flex items-center gap-2">
                    {notificationStyles[type.id]?.icon || <Bell size={14} />}
                    {type.name}
                  </span>
                  {selectedType === type.id && <Check size={14} className="ml-auto" />}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Exibição</DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={() => setUnreadOnly(!unreadOnly)}
                className="flex items-center justify-between"
              >
                <span>Apenas não lidas</span>
                {unreadOnly && <Check size={14} />}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <button 
                  className="flex items-center w-full" 
                  onClick={() => window.location.href = '/settings'}
                >
                  <Settings size={14} className="mr-2" />
                  Configurações de notificações
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {selectedType !== 'all' && (
        <div className="mb-3">
          <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
            {notificationStyles[selectedType]?.icon || <Bell size={12} />}
            <span>
              {settings.types.find(t => t.id === selectedType)?.name || 'Filtrando por tipo'}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-4 w-4 ml-1" 
              onClick={() => onSelectType('all')}
            >
              <X size={10} />
            </Button>
          </Badge>
        </div>
      )}
    </div>
  );
};

// Componente principal
interface NotificationListProps {
  compact?: boolean;
  maxItems?: number;
}

export const NotificationList = ({ compact = false, maxItems }: NotificationListProps) => {
  const { 
    notifications, 
    markAsRead, 
    removeNotification, 
    markAllAsRead, 
    clearAllNotifications 
  } = useNotifications();
  
  const [selectedType, setSelectedType] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Simulação de carregamento para UX
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);
  
  // Filtra notificações com base nos critérios selecionados
  const filteredNotifications = notifications
    .filter(notification => 
      (selectedType === 'all' || notification.type === selectedType) &&
      (!unreadOnly || !notification.read)
    )
    .slice(0, maxItems);
  
  // Renderiza esqueletos durante o carregamento
  if (loading) {
    return (
      <div className="space-y-3">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // Interface para listagem completa
  if (!compact) {
  return (
      <div className="space-y-2">
        <NotificationFilter
          selectedType={selectedType}
          onSelectType={setSelectedType}
          onClear={clearAllNotifications}
          onMarkAllAsRead={markAllAsRead}
          unreadOnly={unreadOnly}
          setUnreadOnly={setUnreadOnly}
        />
        
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unread">Não lidas {notifications.filter(n => !n.read).length > 0 && (
              <Badge className="ml-1 bg-primary">{notifications.filter(n => !n.read).length}</Badge>
            )}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <ScrollArea className="h-[calc(100vh-240px)]">
              <AnimatePresence initial={false}>
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Bell size={40} className="text-muted-foreground opacity-20 mb-4" />
                    <h3 className="text-lg font-medium">Nenhuma notificação encontrada</h3>
                    <p className="text-muted-foreground mt-1">
                      {unreadOnly 
                        ? "Você já leu todas as suas notificações" 
                        : selectedType !== 'all' 
                          ? "Nenhuma notificação deste tipo foi encontrada" 
                          : "Quando houver novidades, elas aparecerão aqui"}
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="unread">
            <ScrollArea className="h-[calc(100vh-240px)]">
              <AnimatePresence initial={false}>
                {notifications.filter(n => !n.read).length > 0 ? (
                  notifications
                    .filter(n => !n.read)
                    .filter(n => selectedType === 'all' || n.type === selectedType)
                    .map(notification => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onRemove={removeNotification}
                      />
                    ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Check size={40} className="text-muted-foreground opacity-20 mb-4" />
                    <h3 className="text-lg font-medium">Nenhuma notificação não lida</h3>
                    <p className="text-muted-foreground mt-1">
                      Você leu todas as suas notificações
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
  // Interface compacta para sidebar/dropdown
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold">Notificações recentes</h3>
              <Button 
          variant="link" 
                size="sm" 
          className="text-xs h-auto p-0"
          onClick={() => window.location.href = '/notifications'}
              >
          Ver todas
              </Button>
            </div>
      
      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map(notification => (
              <NotificationItem 
                key={notification.id} 
                notification={notification} 
                onMarkAsRead={markAsRead}
                onRemove={removeNotification}
                compact={true}
              />
            ))
          ) : (
            <div className="text-center py-5">
              <Bell size={24} className="text-muted-foreground opacity-20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          )}
          </AnimatePresence>
      </div>
      
      {notifications.length > 0 && (
        <div className="mt-3 flex justify-end gap-2">
              <Button
            variant="ghost" 
                size="sm"
            className="text-xs h-7" 
                onClick={markAllAsRead}
              >
            Marcar como lidas
              </Button>
        </div>
      )}
    </div>
  );
}; 
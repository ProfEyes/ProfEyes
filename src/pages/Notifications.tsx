import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { NotificationList } from "@/components/notification/NotificationList";
import { useNotifications } from "@/contexts/NotificationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, Settings2, Check, AlertTriangle, Volume2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation, useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Toaster } from "sonner";

const pulseSubtle = {
  '0%': { opacity: '0.8' },
  '50%': { opacity: '1' },
  '100%': { opacity: '0.8' },
};

const NotificationSkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="p-4 rounded-lg border border-white/10 bg-black/40"
        >
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="w-20 h-6 bg-white/5 rounded animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const NotificationsPage: React.FC = () => {
  const { 
    notifications, 
    settings,
    updateSettings,
    requestPermission,
    hasPermission,
    testNotification
  } = useNotifications();
  const { t, language } = useLanguage();
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Estado local para as configurações que estão sendo editadas
  const [editableSettings, setEditableSettings] = useState(settings);
  const [savedSettings, setSavedSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Simular carregamento inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);
  
  // Atualizar o estado local quando as configurações globais mudarem
  useEffect(() => {
    setEditableSettings(settings);
    setSavedSettings(settings);
  }, [settings]);
  
  // Verificar se houve alterações
  const hasChanges = JSON.stringify(editableSettings) !== JSON.stringify(savedSettings);
  
  // Função para salvar as configurações
  const saveSettings = () => {
    setIsSaving(true);
    updateSettings(editableSettings);
    setSavedSettings(editableSettings);
    toast.success("Configurações salvas com sucesso!", {
      description: "Suas preferências de notificação foram atualizadas.",
      duration: 3000,
      className: "bg-black/80 border border-white/10 text-white",
      style: {
        background: "rgba(0, 0, 0, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "white",
      },
    });
    
    // Resetar o estado após 2 segundos
    setTimeout(() => {
      setIsSaving(false);
    }, 2000);
  };
  
  // Atualizar um tipo de notificação específico
  const updateType = (typeId: string, field: string, value: boolean) => {
    setEditableSettings(prev => {
      const newTypes = prev.types.map(type => 
        type.id === typeId 
          ? { ...type, [field]: value } 
          : type
      );
      
      // Verifica se todos os tipos estão desativados
      const allTypesDisabled = newTypes.every(type => !type.enabled);
      
      return {
        ...prev,
        types: newTypes,
        // Se todos os tipos estiverem desativados, desativa as notificações
        enabled: allTypesDisabled ? false : prev.enabled
      };
    });
  };
  
  // Solicitar permissão para notificações do navegador
  const handleRequestPermission = async () => {
    try {
      const granted = await requestPermission();
      if (granted) {
        // Toast removido conforme solicitado
        
        // Atualizar configurações após conceder permissão
        if (!editableSettings.browserNotifications) {
          setEditableSettings(prev => ({
            ...prev,
            browserNotifications: true
          }));
        }
      } else {
        toast.error("Permissão não concedida. Verifique as configurações do seu navegador.");
      }
    } catch (error) {
              // Toast removido conforme solicitado
      console.error(error);
    }
  };
  
  // Função para enviar uma notificação de teste
  const handleTestNotification = () => {
    const notification = {
      title: "Novo Sinal de Trading",
      body: "Um novo sinal foi gerado! Clique para ver os detalhes.",
      icon: "/logo.png",
      badge: "/logo.png",
      tag: "signal",
      data: {
        url: "https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree"
      },
      requireInteraction: true,
      silent: false,
      type: "signals"
    };

    if ("Notification" in window && Notification.permission === "granted") {
      const notificationInstance = new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon,
        badge: notification.badge,
        tag: notification.tag,
        data: notification.data,
        requireInteraction: notification.requireInteraction,
        silent: notification.silent
      });

      notificationInstance.onclick = () => {
        window.open(notification.data.url, "_blank");
      };
    }

    testNotification();
    // Toast removido conforme solicitado
  };
  
  return (
    <Layout>
      <Toaster position="top-right" richColors theme="dark" />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="space-y-6 relative z-10"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 bg-gradient-to-r from-white via-gray-100 to-gray-200 bg-clip-text text-transparent">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Bell className="h-8 w-8 text-gray-300" />
              </motion.div>
              {t('nav.notifications')}
            </h1>
            {language === "es" ? (
              <div className="text-gray-200 font-medium tracking-wide" style={{width: "auto", display: "inline-block"}}>
                <span style={{whiteSpace: "pre"}}>Notificaciones &amp; Ajustes</span>
              </div>
            ) : (
              <p className="text-gray-200 font-medium tracking-wide">
                {""}
              </p>
            )}
          </motion.div>
        </div>
        
        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="mb-6 bg-black/40 border border-white/10">
            <TabsTrigger 
              value="notifications" 
              className="data-[state=active]:bg-black/80 data-[state=active]:text-white transition-colors duration-300"
            >
              <Bell className="h-4 w-4 mr-2" />
              {t('nav.notifications')}
              {notifications.filter(n => !n.read).length > 0 && (
                <Badge className="ml-2 bg-black/80 border border-white/10 text-white hover:bg-black/90 transition-colors">
                  {notifications.filter(n => !n.read).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:bg-black/80 data-[state=active]:text-white transition-colors duration-300"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              {t('nav.settings')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="notifications">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="grid grid-cols-1 xl:grid-cols-4 gap-6"
            >
              <div className="xl:col-span-3">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <NotificationSkeleton />
                    </motion.div>
                  ) : notifications.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-8"
                    >
                      <p className="text-white/60">{t('notifications.none')}</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="notifications"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <NotificationList />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="space-y-6">
                <Card className="border-white/5 bg-gradient-to-br from-black/40 via-black/30 to-black/20 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-white/90">{t('common.summary')}</CardTitle>
                    <CardDescription className="text-white/60">
                      {t('notifications.overview')}
                    </CardDescription>
                  </CardHeader>
                  
                  <Separator className="bg-white/5" />
                  
                  <CardContent className="pt-4">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="space-y-4"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-white/80">{t('notifications.total')}</span>
                        <Badge variant="outline" className="bg-black/80 border border-white/10 text-white">
                          {notifications.length}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-white/80">{t('notifications.unread')}</span>
                        <Badge variant="outline" className="bg-black/80 border border-white/10 text-white">
                          {notifications.filter(n => !n.read).length}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-white/80">{t('notifications.read')}</span>
                        <Badge className="bg-black/80 border border-white/10 text-white">
                          {notifications.filter(n => n.read).length}
                        </Badge>
                      </div>
                      
                      <Separator className="bg-white/5" />
                      
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="space-y-3"
                      >
                        <p className="text-white/80 text-sm">{t('notifications.byType')}</p>
                        
                        {settings.types.map((type, index) => (
                          <motion.div
                            key={type.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + (index * 0.1), duration: 0.5 }}
                            className="flex justify-between items-center"
                          >
                            <span className="text-white/70 text-sm">{type.name}</span>
                            <Badge variant="outline" className={cn(
                              "bg-gray-800/50 border-0 text-white",
                              type.id === 'signals' && "bg-blue-500/20",
                              type.id === 'live' && "bg-green-500/20"
                            )}>
                              {notifications.filter(n => n.type === type.id).length}
                            </Badge>
                          </motion.div>
                        ))}
                      </motion.div>
                    </motion.div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>
            
          <TabsContent value="settings">
            <Card className="border-white/5 bg-gradient-to-br from-black/60 via-black/50 to-black/40 backdrop-blur-sm shadow-2xl">
              <CardHeader className="relative overflow-hidden py-4 px-6 bg-black/80">
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black to-black/90"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5"></div>
                <CardTitle className="text-lg font-bold text-white/90 relative z-10 tracking-tight">{t('notifications.settings.title')}</CardTitle>
                <CardDescription className="text-white/60 relative z-10 text-sm">
                  {t('notifications.settings.description')}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4 relative px-6 py-4">
                {/* Efeito de partículas de fundo */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent opacity-50"></div>
                
                {/* Configurações gerais */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-3 relative z-10"
                >
                  <div className="flex items-center justify-between p-4 rounded-lg bg-black/40 border border-white/10 hover:bg-black/50 transition-all duration-300 shadow-lg">
                    <div className="space-y-1">
                      <Label htmlFor="notifications-enabled" className="text-white/90 text-base font-medium">{t('notifications.settings.enable')}</Label>
                      <p className="text-sm text-white/60">
                        {t('notifications.settings.enableDesc')}
                      </p>
                    </div>
                    <Switch
                      id="notifications-enabled"
                      checked={editableSettings.enabled}
                      onCheckedChange={(checked) => 
                        setEditableSettings(prev => ({ ...prev, enabled: checked }))
                      }
                      className="scale-95 data-[state=checked]:bg-cyan-500/80"
                    />
                  </div>
                </motion.div>
                
                {/* Tipos de notificação */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="space-y-3 relative z-10"
                >
                  <h3 className="text-base font-semibold text-white/90 tracking-tight">{t('notifications.settings.typesTitle')}</h3>
                  <p className="text-sm text-white/60 -mt-1">
                    {t('notifications.settings.typesDesc')}
                  </p>
                  
                  <div className="space-y-3">
                    {editableSettings.types.map((type, index) => (
                      <motion.div
                        key={type.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex flex-col space-y-2 p-4 rounded-lg border border-white/10 bg-black/40 hover:bg-black/50 transition-all duration-300 group shadow-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "px-2 py-0.5 text-sm transition-all duration-500 ease-in-out group-hover:scale-105 bg-transparent border-white/10 text-white/60",
                                  type.enabled && type.id === 'signals' && "bg-blue-500/10 text-blue-300 border-blue-500/20 animate-pulse-subtle",
                                  type.enabled && type.id === 'live' && "bg-green-500/10 text-green-300 border-green-500/20 animate-pulse-subtle",
                                  !type.enabled && "group-hover:bg-white/5 group-hover:text-white/80 group-hover:border-white/20"
                                )}
                              >
                                {type.name}
                              </Badge>
                            </div>
                            <p className="text-xs text-white/60 group-hover:text-white/70 transition-colors duration-300 pl-1">
                              {type.description}
                            </p>
                          </div>
                          <Switch
                            checked={type.enabled}
                            disabled={!editableSettings.enabled}
                            onCheckedChange={(checked) => updateType(type.id, 'enabled', checked)}
                            className={cn(
                              "scale-95 transition-all duration-500 ease-in-out bg-transparent border border-white/10",
                              type.id === 'signals' && "data-[state=checked]:bg-blue-500/80 data-[state=checked]:border-blue-500/50 data-[state=checked]:animate-pulse-subtle",
                              type.id === 'live' && "data-[state=checked]:bg-green-500/80 data-[state=checked]:border-green-500/50 data-[state=checked]:animate-pulse-subtle"
                            )}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </CardContent>
              
              <CardFooter className="flex justify-end gap-3 border-t border-white/10 pt-4 relative z-10 px-6 pb-3">
                <Button
                  variant="ghost"
                  className="bg-black/40 hover:bg-black/60 text-white/80 hover:text-white border border-white/10 transition-all duration-300 px-4 py-1.5 text-sm"
                  onClick={() => setEditableSettings(savedSettings)}
                  disabled={!hasChanges}
                >
                  {t('notifications.settings.cancel')}
                </Button>
                <Button
                  variant="ghost"
                  className="bg-black/40 hover:bg-black/60 text-white/80 hover:text-white border border-white/10 transition-all duration-300 px-4 py-1.5 text-sm flex items-center gap-2"
                  onClick={handleTestNotification}
                >
                  <Bell className="h-4 w-4" />
                  {t('notifications.settings.testSignal')}
                </Button>
                <Button
                  variant="default"
                  className="bg-black/80 hover:bg-black text-white border border-white/10 transition-all duration-300 shadow-lg px-4 py-1.5 text-sm relative overflow-hidden group"
                  onClick={saveSettings}
                  disabled={!hasChanges || isSaving}
                >
                  <span className="relative z-10 flex items-center">
                    <Check className={cn(
                      "h-4 w-4 mr-1 transition-transform duration-300",
                      isSaving ? "scale-110 text-green-400" : "group-hover:scale-110"
                    )} />
                    <span className={cn(
                      "transition-colors duration-300",
                      isSaving ? "text-green-400" : "text-white"
                    )}>
                      {isSaving ? t('notifications.settings.saved') : t('notifications.settings.save')}
                    </span>
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                  <span className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/20 to-green-500/0 translate-x-[-100%] group-active:translate-x-[100%] transition-transform duration-500"></span>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </Layout>
  );
};

export default NotificationsPage; 
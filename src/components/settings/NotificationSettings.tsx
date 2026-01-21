import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BellRing, Activity, Globe, Mail, MessageSquare, Zap, Volume2, Smartphone, Info, Bell, Trash, List } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  isNotificationSupported, 
  isNotificationPermissionGranted, 
  requestNotificationPermission,
  sendTestNotification
} from "@/utils/notifications";
import { useNotifications } from '@/contexts/NotificationContext';

// Interfaces
interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

interface NotificationType {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: "high" | "medium" | "low";
  sound: boolean;
  channels: string[];
}

// Tipo para os dados de configuração de notificações
interface NotificationSettingsData {
  types: NotificationType[];
  channels: NotificationChannel[];
  volume: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface NotificationSettingsProps {
  onSettingsChange?: (settings: NotificationSettingsData) => void;
  onNotificationTestSent?: () => void;
  onPermissionChange?: (granted: boolean) => void;
}

// Estilo modificado para o cabeçalho de seção  
const SectionHeader = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-white/70">
      {icon}
    </div>
    <div>
      <h3 className="text-base font-medium text-white/80">{title}</h3>
      <p className="text-xs text-white/40">{description}</p>
    </div>
  </div>
);

export function NotificationSettings({
  onSettingsChange,
  onNotificationTestSent,
  onPermissionChange
}: NotificationSettingsProps) {
  // Estado para canais de notificações
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: "browser",
      name: "Notificações no navegador",
      description: "Receba notificações dentro do navegador",
      icon: <Globe className="h-4 w-4 text-blue-400" />,
      enabled: true
    },
    {
      id: "email",
      name: "E-mail",
      description: "Receba notificações via e-mail",
      icon: <Mail className="h-4 w-4 text-amber-400" />,
      enabled: true
    },
    {
      id: "mobile",
      name: "Aplicativo móvel",
      description: "Receba notificações no aplicativo",
      icon: <Smartphone className="h-4 w-4 text-emerald-400" />,
      enabled: false
    },
    {
      id: "telegram",
      name: "Telegram",
      description: "Receba notificações via Telegram",
      icon: <MessageSquare className="h-4 w-4 text-purple-400" />,
      enabled: false
    }
  ]);

  // Estado para tipos de notificações
  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([
    {
      id: "signals",
      name: "Trades",
      description: "Notificações sobre trades de compra e venda",
      enabled: true,
      priority: "high",
      sound: true,
      channels: ["browser", "email", "mobile"]
    },
    {
      id: "live",
      name: "Transmissões ao Vivo",
      description: "Notificações quando uma transmissão ao vivo é iniciada",
      enabled: true,
      priority: "medium",
      sound: true,
      channels: ["browser", "email"]
    }
  ]);
  
  // Estado para volumes e silenciamento
  const [notificationVolume, setNotificationVolume] = useState(70);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState("22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("07:00");
  
  // Definindo um valor inicial explícito para activeTab e garantindo que seja "tipos"
  const [activeTab, setActiveTab] = useState<string>("tipos");
  
  // Estado para as permissões do navegador - usando apenas hasPermission e browserPermission corretamente
  const [hasPermission, setHasPermission] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<"granted" | "denied" | "default" | "unsupported">("unsupported");
  
  // Usando o contexto de notificações
  const { testNotification } = useNotifications();
  
  // Verificação de suporte a notificações do navegador
  useEffect(() => {
    if ("Notification" in window) {
      const permission = Notification.permission as "granted" | "denied" | "default";
      setBrowserPermission(permission);
      setHasPermission(permission === "granted");
    } else {
      setBrowserPermission("unsupported");
      setHasPermission(false);
    }
  }, []);
  
  // Verificar permissão inicial
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPermission(Notification.permission === "granted");
    }
    
    // Carregar configurações salvas do localStorage
    try {
      const savedSettings = localStorage.getItem('notificationSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        
        if (parsedSettings.channels) setChannels(parsedSettings.channels);
        if (parsedSettings.types) setNotificationTypes(parsedSettings.types);
        if (parsedSettings.volume) setNotificationVolume(parsedSettings.volume);
        if (parsedSettings.quietHoursEnabled !== undefined) setQuietHoursEnabled(parsedSettings.quietHoursEnabled);
        if (parsedSettings.quietHoursStart) setQuietHoursStart(parsedSettings.quietHoursStart);
        if (parsedSettings.quietHoursEnd) setQuietHoursEnd(parsedSettings.quietHoursEnd);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações de notificação:", error);
    }
  }, []);
  
  // Salvar configurações no localStorage quando algo mudar
  useEffect(() => {
    try {
      const settingsToSave = {
        channels,
        types: notificationTypes,
        volume: notificationVolume,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd
      };
      
      localStorage.setItem('notificationSettings', JSON.stringify(settingsToSave));
      
      // Aplicar configurações imediatamente
      if (typeof window !== 'undefined') {
        // Aplicar volume para notificações de som
        window.localStorage.setItem('notification-volume', notificationVolume.toString());
        
        // Aplicar configurações de horário silencioso
        window.localStorage.setItem('quiet-hours-enabled', quietHoursEnabled.toString());
        window.localStorage.setItem('quiet-hours-start', quietHoursStart);
        window.localStorage.setItem('quiet-hours-end', quietHoursEnd);
        
        // Salvar canais habilitados
        const enabledChannels = channels
          .filter(channel => channel.enabled)
          .map(channel => channel.id);
        window.localStorage.setItem('enabled-notification-channels', JSON.stringify(enabledChannels));
        
        // Salvar tipos de notificações habilitados
        const enabledTypes = notificationTypes
          .filter(type => type.enabled)
          .map(type => ({ 
            id: type.id, 
            priority: type.priority, 
            sound: type.sound,
            channels: type.channels
          }));
        window.localStorage.setItem('enabled-notification-types', JSON.stringify(enabledTypes));
      }
      
      console.log("Configurações de notificação salvas e aplicadas com sucesso");
    } catch (error) {
      console.error("Erro ao salvar configurações de notificação:", error);
    }
  }, [channels, notificationTypes, notificationVolume, quietHoursEnabled, quietHoursStart, quietHoursEnd]);
  
  // Enviar atualizações de configuração para o componente pai quando algo mudar
  useEffect(() => {
    onSettingsChange?.({
      types: notificationTypes,
      channels: channels,
      volume: notificationVolume,
      quietHoursEnabled: quietHoursEnabled,
      quietHoursStart: quietHoursStart,
      quietHoursEnd: quietHoursEnd
    });
  }, [
    notificationTypes, 
    channels, 
    notificationVolume, 
    quietHoursEnabled, 
    quietHoursStart, 
    quietHoursEnd, 
    onSettingsChange
  ]);
  
  // Função para solicitar permissão de notificação
  const requestPermission = async () => {
    if (!isNotificationSupported()) {
      // Toast removido conforme solicitado
      return;
    }

    try {
      const permissionGranted = await requestNotificationPermission();
      setHasPermission(permissionGranted);
      setBrowserPermission(permissionGranted ? "granted" : "denied");
      
      if (permissionGranted) {
        // Toast removido conforme solicitado
        // Atualize o canal do navegador para ativado
        updateChannel("browser", true);
        onPermissionChange?.(true);
      } else {
        // Toast removido conforme solicitado
        // Desative o canal do navegador
        updateChannel("browser", false);
        onPermissionChange?.(false);
      }
    } catch (error) {
      console.error("Erro ao solicitar permissão de notificação:", error);
      // Toast removido conforme solicitado
      onPermissionChange?.(false);
    }
  };
  
  // Função para enviar notificação de teste atualizada
  const handleTestNotification = () => {
    if (!hasPermission) {
      // Toast removido conforme solicitado
      return;
    }

    testNotification();
    onNotificationTestSent?.();
  };
  
  // Verificar permissão inicial com o utilitário
  useEffect(() => {
    setHasPermission(isNotificationPermissionGranted());
  }, []);
  
  // Atualizar o status de um canal
  const updateChannel = (channelId: string, enabled: boolean) => {
    setChannels(prevChannels => 
      prevChannels.map(channel => 
        channel.id === channelId ? { ...channel, enabled } : channel
      )
    );
    
    // Se o canal for desativado, remova-o de todos os tipos
    if (!enabled) {
      setNotificationTypes(prev => 
        prev.map(type => ({
          ...type,
          channels: type.channels.filter(c => c !== channelId)
        }))
      );
    }
    
    // Toast removido conforme solicitado
  };
  
  // Atualizar o status de um tipo de notificação
  const updateNotificationType = (typeId: string, enabled: boolean) => {
    setNotificationTypes(prevTypes => 
      prevTypes.map(type => 
        type.id === typeId ? { ...type, enabled } : type
      )
    );
    
    // Toast removido conforme solicitado
  };
  
  // Atualizar a prioridade de um tipo de notificação
  const updatePriority = (typeId: string, priority: "high" | "medium" | "low") => {
    setNotificationTypes(prevTypes => 
      prevTypes.map(type => 
        type.id === typeId ? { ...type, priority } : type
      )
    );
  };
  
  // Atualizar o som de um tipo de notificação
  const updateSound = (typeId: string, sound: boolean) => {
    setNotificationTypes(prevTypes => 
      prevTypes.map(type => 
        type.id === typeId ? { ...type, sound } : type
      )
    );
  };
  
  // Atualizar os canais de um tipo de notificação
  const updateTypeChannel = (typeId: string, channelId: string, enabled: boolean) => {
    setNotificationTypes(prevTypes => 
      prevTypes.map(type => {
        if (type.id === typeId) {
          return {
            ...type,
            channels: enabled
              ? [...type.channels, channelId]
              : type.channels.filter(c => c !== channelId)
          };
        }
        return type;
      })
    );
  };
  
  // Função para renderizar prioridade com cores atualizadas
  const renderPriorityBadge = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return <Badge className="bg-rose-500/20 text-rose-200 border-rose-500/30 hover:bg-rose-500/30">Alta</Badge>;
      case "medium":
        return <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/30 hover:bg-amber-500/30">Média</Badge>;
      case "low":
        return <Badge className="bg-slate-500/20 text-slate-200 border-slate-500/30 hover:bg-slate-500/30">Baixa</Badge>;
    }
  };
  
  // Modificação para o render do status de permissão
  const renderBrowserStatus = () => {
    switch (browserPermission) {
      case "granted":
        return (
          <Badge className="bg-green-500/20 text-green-200 border-green-500/30">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span>
              Autorizado
            </span>
          </Badge>
        );
      case "denied":
        return (
          <Badge className="bg-rose-500/20 text-rose-200 border-rose-500/30">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
              Bloqueado
            </span>
          </Badge>
        );
      case "default":
        return (
          <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/30">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
              Não configurado
            </span>
          </Badge>
        );
      case "unsupported":
        return (
          <Badge className="bg-slate-500/20 text-slate-200 border-slate-500/30">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
              Não suportado
            </span>
          </Badge>
        );
    }
  };
  
  useEffect(() => {
    console.log("Estado activeTab alterado para:", activeTab);
  }, [activeTab]);
  
  // Função para limpar todas as notificações
  const clearAllNotifications = () => {
    // Toast removido conforme solicitado
    // Em uma implementação real, você integraria com o sistema de notificações
  };
  
  return (
    <Card className="border-white/5 bg-gradient-to-br from-black/40 via-black/30 to-black/20 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-pink-500/5 opacity-30 group-hover:opacity-50 transition-opacity duration-700" />
      <div className="relative z-10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5 text-white border border-white/10 shadow-inner shadow-white/5">
              <BellRing className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-white/90"></CardTitle>
              <CardDescription className="text-white/60">
                Configure como e quando você receberá notificações
        </CardDescription>
            </div>
          </div>
      </CardHeader>
        
        <Separator className="bg-gradient-to-r from-white/5 via-white/10 to-white/5" />
        
        <CardContent className="pt-5 space-y-5">
          {/* Abas simplificadas usando apenas div e estado */}
          <div className="w-full">
            <div className="grid w-full grid-cols-2 mb-4 bg-white/5 rounded-lg p-1">
              <button
                className={`py-2 rounded-md transition-colors ${
                  activeTab === "tipos" 
                    ? "bg-white/10 text-white font-medium" 
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => setActiveTab("tipos")}
              >
                Tipos de Notificação
              </button>
              <button
                className={`py-2 rounded-md transition-colors ${
                  activeTab === "canais" 
                    ? "bg-white/10 text-white font-medium" 
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => setActiveTab("canais")}
              >
                Canais de Entrega
              </button>
            </div>
            
            {/* Conteúdo da aba Tipos */}
            {activeTab === "tipos" && (
              <div className="space-y-4">
                <AnimatePresence>
                  {notificationTypes.map((type) => (
                    <motion.div
                      key={type.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn(
                        "border border-white/10 rounded-lg p-4 space-y-3",
                        type.enabled ? "bg-white/5" : "bg-black/40 opacity-60"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {type.id === "signals" && <Zap className="h-4 w-4 text-blue-400" />}
                          {type.id === "live" && <Globe className="h-4 w-4 text-green-400" />}
                          <Label className="text-base font-medium cursor-pointer" htmlFor={`switch-${type.id}`}>
                            {type.name}
                          </Label>
                        </div>
                        <Switch
                          id={`switch-${type.id}`}
                          checked={type.enabled}
                          onCheckedChange={(checked) => updateNotificationType(type.id, checked)}
                          className={cn(
                            "data-[state=checked]:bg-purple-500",
                            type.id === "signals" && "data-[state=checked]:bg-blue-500",
                            type.id === "live" && "data-[state=checked]:bg-green-500"
                          )}
                        />
                      </div>
                      
                      <p className="text-sm text-white/60">{type.description}</p>
                      
                      {type.enabled && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2 space-y-4"
                        >
                          <Separator className="bg-white/5" />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm text-white/80" htmlFor={`priority-${type.id}`}>Prioridade</Label>
                              <Select 
                                value={type.priority} 
                                onValueChange={(value: "high" | "medium" | "low") => updatePriority(type.id, value)}
                              >
                                <SelectTrigger id={`priority-${type.id}`} className="bg-white/5 border-white/10">
                                  <SelectValue>{renderPriorityBadge(type.priority)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-black/90 backdrop-blur-md border-white/10">
                                  <SelectItem value="high">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-rose-500/80">Alta</Badge>
                                      <span className="text-xs text-white/60">Alertas imediatos</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="medium">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-amber-500/80">Média</Badge>
                                      <span className="text-xs text-white/60">Atualizações importantes</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="low">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-blue-500/80">Baixa</Badge>
                                      <span className="text-xs text-white/60">Informações gerais</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm text-white/80" htmlFor={`sound-${type.id}`}>Som de notificação</Label>
                                <div className="flex items-center gap-2">
                                  <Volume2 className={cn(
                                    "h-4 w-4",
                                    type.sound ? "text-purple-400" : "text-white/40"
                                  )} />
                                  <Switch
                                    id={`sound-${type.id}`}
                                    checked={type.sound}
                                    onCheckedChange={(checked) => updateSound(type.id, checked)}
                                    className="data-[state=checked]:bg-purple-500"
                                  />
                                </div>
                              </div>
                              
                              <div className="bg-white/5 p-3 rounded-lg space-y-2">
                                <Label className="text-xs text-white/60">Canais de entrega</Label>
                                <div className="space-y-1.5">
                                  {channels.map((channel) => (
                                    <div key={channel.id} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`channel-${type.id}-${channel.id}`}
                                        disabled={!channel.enabled}
                                        checked={type.channels.includes(channel.id) && channel.enabled}
                                        onCheckedChange={(checked) => 
                                          updateTypeChannel(type.id, channel.id, checked === true)
                                        }
                                        className="data-[state=checked]:bg-white/20 data-[state=checked]:text-white"
                                      />
                                      <Label
                                        htmlFor={`channel-${type.id}-${channel.id}`}
                                        className={cn(
                                          "text-xs cursor-pointer",
                                          !channel.enabled && "opacity-50 line-through"
                                        )}
                                      >
                                        {channel.name}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            
            {/* Conteúdo da aba Canais */}
            {activeTab === "canais" && (
              <div className="space-y-4">
                <AnimatePresence>
                  {channels.map((channel) => (
                    <motion.div
                      key={channel.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn(
                        "border border-white/10 rounded-lg p-4 space-y-3",
                        channel.enabled ? "bg-white/5" : "bg-black/40 opacity-60"
                      )}
                    >
        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {channel.icon}
                          <Label className="text-base font-medium cursor-pointer" htmlFor={`switch-channel-${channel.id}`}>
                            {channel.name}
                          </Label>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {channel.id === "browser" && renderBrowserStatus()}
                          <Switch
                            id={`switch-channel-${channel.id}`}
                            checked={channel.enabled}
                            onCheckedChange={(checked) => updateChannel(channel.id, checked)}
                            className="data-[state=checked]:bg-purple-500"
                          />
                        </div>
                      </div>
                      
                      <p className="text-sm text-white/60">{channel.description}</p>
                      
                      {channel.id === "browser" && browserPermission !== "granted" && channel.enabled && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2"
                        >
                          <Separator className="bg-white/5 mb-3" />
                          <Button
                            onClick={requestPermission}
                            className="w-full bg-purple-500/80 hover:bg-purple-600 text-white"
                            disabled={browserPermission === "unsupported"}
                          >
                            Permitir Notificações no Navegador
                          </Button>
                        </motion.div>
                      )}
                      
                      {channel.id === "browser" && browserPermission === "granted" && channel.enabled && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2"
                        >
                          <Separator className="bg-white/5 mb-3" />
                          <Button
                            onClick={handleTestNotification}
                            className="w-full bg-black/20 border border-white/10 hover:bg-white/10"
                          >
                            Enviar Notificação de Teste
                          </Button>
                        </motion.div>
                      )}
                      
                      {channel.id === "telegram" && channel.enabled && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2"
                        >
                          <Separator className="bg-white/5 mb-3" />
                          <div className="grid gap-3">
                            <Label className="text-sm text-white/80" htmlFor="telegram-user">ID do Telegram</Label>
                            <div className="flex gap-2">
                              <Input
                                id="telegram-user"
                                placeholder="Seu nome de usuário do Telegram"
                                className="bg-white/5 border-white/10"
                              />
                              <Button
                                className="shrink-0 bg-purple-500/80 hover:bg-purple-600 text-white"
                              >
                                Conectar
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      
                      {channel.id === "email" && channel.enabled && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2"
                        >
                          <Separator className="bg-white/5 mb-3" />
                          <div className="grid gap-3">
                            <Label className="text-sm text-white/80" htmlFor="email-address">Endereço de e-mail</Label>
                            <div className="flex gap-2">
                              <Input
                                id="email-address"
                                placeholder="seu-email@exemplo.com"
                                type="email"
                                defaultValue="usuario@exemplo.com"
                                className="bg-white/5 border-white/10"
                              />
                              <Button
                                className="shrink-0 bg-white/5 hover:bg-white/10 border border-white/10"
                              >
                                Verificar
                              </Button>
                            </div>
        </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                <div className="pt-4 border-t border-white/10 mt-6">
                  <h3 className="text-sm font-medium text-white/90 mb-4">Configurações Adicionais</h3>
                  
        <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-blue-400" />
                      <Label className="text-base font-medium">Volume das Notificações</Label>
                    </div>
                    <span className="text-sm font-medium">{notificationVolume}%</span>
                  </div>
                  
                  <div className="px-1 pt-2">
                    <Slider
                      value={[notificationVolume]}
                      max={100}
                      step={5}
                      onValueChange={(values) => setNotificationVolume(values[0])}
                      className="[&>span:first-child]:bg-blue-500 [&>span:last-child]:bg-blue-500"
                    />
                  </div>
        </div>
                
                <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-white/5">
        <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BellRing className="h-4 w-4 text-amber-400" />
                      <Label className="text-base font-medium cursor-pointer" htmlFor="quiet-hours">
                        Horário Silencioso
                      </Label>
                    </div>
                    <Switch
                      id="quiet-hours"
                      checked={quietHoursEnabled}
                      onCheckedChange={setQuietHoursEnabled}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>
                  
                  {quietHoursEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-2 gap-4 pt-2"
                    >
                      <div className="space-y-2">
                        <Label className="text-sm text-white/80" htmlFor="quiet-start">Início</Label>
                        <Input
                          id="quiet-start"
                          type="time"
                          value={quietHoursStart}
                          onChange={(e) => setQuietHoursStart(e.target.value)}
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm text-white/80" htmlFor="quiet-end">Fim</Label>
                        <Input
                          id="quiet-end"
                          type="time"
                          value={quietHoursEnd}
                          onChange={(e) => setQuietHoursEnd(e.target.value)}
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Seção de teste e gerenciamento de notificações */}
          <div className="space-y-4 mt-6 border-t border-white/10 pt-6">
            <h3 className="text-sm font-medium text-white/80">Gerenciamento de Notificações</h3>
            <div className="flex flex-col gap-4">
              <div className="border rounded-lg border-white/10 p-4 bg-white/5">
                <div className="text-sm text-white/70 mb-3">
                  Teste e gerenciamento de notificações.
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex gap-2 items-center bg-black/20 border-white/5 hover:bg-white/10" 
                    onClick={handleTestNotification}
                    disabled={!hasPermission}
                  >
                    <Bell className="h-4 w-4" />
                    Testar Notificação
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex gap-2 items-center bg-red-950/30 border-red-900/30 text-red-200 hover:bg-red-900/30" 
                    onClick={clearAllNotifications}
                  >
                    <Trash className="h-4 w-4" />
                    Limpar Notificações
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex gap-2 items-center bg-black/20 border-white/5 hover:bg-white/10" 
                    asChild
                  >
                    <a href="/notifications">
                      <List className="h-4 w-4" />
                      Ver Todas Notificações
                    </a>
                  </Button>
                </div>
              </div>
            </div>
        </div>
      </CardContent>
      </div>
    </Card>
  );
} 
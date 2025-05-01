import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { NotificationList } from "@/components/notification/NotificationList";
import { useNotifications } from "@/contexts/NotificationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, Settings2, Check, AlertTriangle, Volume2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation, useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NotificationsPage: React.FC = () => {
  const { 
    notifications, 
    settings,
    updateSettings,
    requestPermission,
    hasPermission,
    testNotification
  } = useNotifications();
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Estado local para as configurações que estão sendo editadas
  const [editableSettings, setEditableSettings] = useState(settings);
  const [savedSettings, setSavedSettings] = useState(settings);
  
  // Atualizar o estado local quando as configurações globais mudarem
  useEffect(() => {
    setEditableSettings(settings);
    setSavedSettings(settings);
  }, [settings]);
  
  // Verificar se houve alterações
  const hasChanges = JSON.stringify(editableSettings) !== JSON.stringify(savedSettings);
  
  // Função para salvar as configurações
  const saveSettings = () => {
    updateSettings(editableSettings);
    setSavedSettings(editableSettings);
    toast.success("Configurações de notificação salvas com sucesso");
  };
  
  // Atualizar um tipo de notificação específico
  const updateType = (typeId: string, field: string, value: boolean) => {
    setEditableSettings(prev => ({
      ...prev,
      types: prev.types.map(type => 
        type.id === typeId 
          ? { ...type, [field]: value } 
          : type
      )
    }));
  };
  
  // Solicitar permissão para notificações do navegador
  const handleRequestPermission = async () => {
    try {
      const granted = await requestPermission();
      if (granted) {
        toast.success("Permissão de notificações concedida!");
        
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
      toast.error("Ocorreu um erro ao solicitar permissão de notificações");
      console.error(error);
    }
  };
  
  // Função para enviar uma notificação de teste
  const handleTestNotification = () => {
    testNotification();
    toast.success("Notificação de teste enviada!");
  };
  
  return (
    <Layout>
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
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Bell className="h-8 w-8 text-white/80" />
              </motion.div>
              Centro de Notificações
            </h1>
            <p className="text-white/60">
              Gerencie suas notificações e configure suas preferências
            </p>
          </motion.div>
        </div>
        
        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notificações
              {notifications.filter(n => !n.read).length > 0 && (
                <Badge variant="default" className="ml-2 bg-primary">
                  {notifications.filter(n => !n.read).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings2 className="h-4 w-4 mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="notifications">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3">
                <NotificationList />
          </div>
          
          <div className="space-y-6">
            <Card className="border-white/5 bg-gradient-to-br from-black/40 via-black/30 to-black/20 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-white/90">Resumo</CardTitle>
                <CardDescription className="text-white/60">
                  Visão geral das suas notificações
                </CardDescription>
              </CardHeader>
              
              <Separator className="bg-white/5" />
              
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Total de notificações</span>
                    <Badge variant="outline" className="bg-white/5">
                      {notifications.length}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Não lidas</span>
                        <Badge className={notifications.filter(n => !n.read).length > 0 ? "bg-blue-500" : "bg-white/10"}>
                          {notifications.filter(n => !n.read).length}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Lidas</span>
                        <Badge className={notifications.filter(n => n.read).length > 0 ? "bg-green-500/80" : "bg-white/10"}>
                          {notifications.filter(n => n.read).length}
                        </Badge>
                      </div>
                      
                      <Separator className="bg-white/5" />
                      
                      <div className="space-y-3">
                        <p className="text-white/80 text-sm">Por tipo</p>
                        
                        {settings.types.map(type => (
                          <div key={type.id} className="flex justify-between items-center">
                            <span className="text-white/70 text-sm">{type.name}</span>
                            <Badge variant="outline" className={cn(
                              "bg-white/5",
                              type.id === 'signals' && "text-blue-400",
                              type.id === 'completed' && "text-green-400",
                              type.id === 'stopped' && "text-red-400",
                              type.id === 'system' && "text-purple-400",
                              type.id === 'alerts' && "text-orange-400"
                            )}>
                              {notifications.filter(n => n.type === type.id).length}
                        </Badge>
                      </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  </div>
                </div>
          </TabsContent>
            
          <TabsContent value="settings">
            <Card className="border-white/5 bg-gradient-to-br from-black/40 via-black/30 to-black/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl text-white/90">Configurações de Notificações</CardTitle>
                <CardDescription className="text-white/60">
                  Personalize como e quando deseja receber notificações do sistema
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Configurações gerais */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white/90">Geral</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notifications-enabled" className="text-white/80">Notificações</Label>
                      <p className="text-sm text-white/60">
                        Ativar ou desativar todas as notificações
                      </p>
                    </div>
                    <Switch
                      id="notifications-enabled"
                      checked={editableSettings.enabled}
                      onCheckedChange={(checked) => 
                        setEditableSettings(prev => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>
              
              <Separator className="bg-white/5" />
              
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="app-notifications" className="text-white/80">Notificações no Aplicativo</Label>
                      <p className="text-sm text-white/60">
                        Mostrar notificações dentro do aplicativo
                      </p>
                    </div>
                    <Switch
                      id="app-notifications"
                      checked={editableSettings.appNotifications}
                      disabled={!editableSettings.enabled}
                      onCheckedChange={(checked) => 
                        setEditableSettings(prev => ({ ...prev, appNotifications: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="browser-notifications" className="text-white/80">Notificações do Navegador</Label>
                      <p className="text-sm text-white/60">
                        Receber notificações mesmo quando o aplicativo estiver em segundo plano
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!hasPermission && (
                  <Button
                    variant="outline"
                    size="sm"
                          className="bg-white/5 border-white/10 hover:bg-white/10"
                          onClick={handleRequestPermission}
                  >
                          Solicitar Permissão
                  </Button>
                      )}
                      <Switch
                        id="browser-notifications"
                        checked={editableSettings.browserNotifications}
                        disabled={!editableSettings.enabled || !hasPermission}
                        onCheckedChange={(checked) => 
                          setEditableSettings(prev => ({ ...prev, browserNotifications: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>
                
                {/* Configurações de som */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white/90">Som</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sound-enabled" className="text-white/80">Sons de Notificação</Label>
                      <p className="text-sm text-white/60">
                        Tocar sons quando receber novas notificações
                      </p>
                    </div>
                    <Switch
                      id="sound-enabled"
                      checked={editableSettings.sound}
                      disabled={!editableSettings.enabled}
                      onCheckedChange={(checked) => 
                        setEditableSettings(prev => ({ ...prev, sound: checked }))
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="volume" className="text-white/80">Volume</Label>
                      <span className="text-sm text-white/60">
                        {editableSettings.volume}%
                      </span>
                    </div>
                    <Slider
                      id="volume"
                      disabled={!editableSettings.enabled || !editableSettings.sound}
                      value={[editableSettings.volume]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={(value) => 
                        setEditableSettings(prev => ({ ...prev, volume: value[0] }))
                      }
                      className="w-full"
                    />
                  </div>
                </div>
                
                {/* Horário silencioso */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white/90">Horário Silencioso</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="quiet-hours" className="text-white/80">Ativar Horário Silencioso</Label>
                      <p className="text-sm text-white/60">
                        Não receber notificações durante certos horários
                      </p>
                    </div>
                    <Switch
                      id="quiet-hours"
                      checked={editableSettings.quietHoursEnabled}
                      disabled={!editableSettings.enabled}
                      onCheckedChange={(checked) => 
                        setEditableSettings(prev => ({ ...prev, quietHoursEnabled: checked }))
                      }
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quiet-start" className="text-white/80">Início</Label>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-white/60" />
                        <Input
                          id="quiet-start"
                          type="time"
                          value={editableSettings.quietHoursStart}
                          disabled={!editableSettings.enabled || !editableSettings.quietHoursEnabled}
                          onChange={(e) => 
                            setEditableSettings(prev => ({ ...prev, quietHoursStart: e.target.value }))
                          }
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiet-end" className="text-white/80">Fim</Label>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-white/60" />
                        <Input
                          id="quiet-end"
                          type="time"
                          value={editableSettings.quietHoursEnd}
                          disabled={!editableSettings.enabled || !editableSettings.quietHoursEnabled}
                          onChange={(e) => 
                            setEditableSettings(prev => ({ ...prev, quietHoursEnd: e.target.value }))
                          }
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Tipos de notificação */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white/90">Tipos de Notificação</h3>
                  <p className="text-sm text-white/60">
                    Escolha quais tipos de notificação deseja receber e se devem ter som
                  </p>
                  
                  <div className="space-y-3">
                    {editableSettings.types.map((type) => (
                      <div key={type.id} className="flex flex-col space-y-3 p-4 rounded-lg border border-white/10 bg-white/5">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "px-2 py-0.5",
                                  type.id === 'signals' && "bg-blue-950/50 text-blue-300 border-blue-800/30",
                                  type.id === 'completed' && "bg-green-950/50 text-green-300 border-green-800/30",
                                  type.id === 'stopped' && "bg-red-950/50 text-red-300 border-red-800/30",
                                  type.id === 'system' && "bg-purple-950/50 text-purple-300 border-purple-800/30",
                                  type.id === 'alerts' && "bg-orange-950/50 text-orange-300 border-orange-800/30"
                                )}
                              >
                                {type.id === 'signals' && "Sinais"}
                                {type.id === 'completed' && "Concluídos"}
                                {type.id === 'stopped' && "Cancelados"}
                                {type.id === 'system' && "Sistema"}
                                {type.id === 'alerts' && "Alertas"}
                              </Badge>
                              <h4 className="text-sm font-medium text-white/90">{type.name}</h4>
                            </div>
                            <p className="text-sm text-white/60">
                              {type.description}
                            </p>
                          </div>
                          <Switch
                            checked={type.enabled}
                            disabled={!editableSettings.enabled}
                            onCheckedChange={(checked) => updateType(type.id, 'enabled', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <Label htmlFor={`sound-${type.id}`} className="text-sm text-white/80 flex items-center gap-1">
                            <Volume2 className="h-3.5 w-3.5" />
                            Som para este tipo
                          </Label>
                          <Switch
                            id={`sound-${type.id}`}
                            size="sm"
                            checked={type.sound}
                            disabled={!editableSettings.enabled || !type.enabled || !editableSettings.sound}
                            onCheckedChange={(checked) => updateType(type.id, 'sound', checked)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Teste de notificação */}
                <div className="bg-black/20 border border-white/10 rounded-lg p-4 space-y-2">
                  <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Testar notificações
                  </h3>
                  <p className="text-sm text-white/60">
                    Envie uma notificação de teste para verificar se as suas configurações estão funcionando corretamente.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 bg-white/5 border-white/10 hover:bg-white/10"
                    onClick={handleTestNotification}
                    disabled={!editableSettings.enabled}
                  >
                    Enviar notificação de teste
                  </Button>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-end gap-2 border-t border-white/10 pt-6">
                <Button
                  variant="ghost"
                  className="hover:bg-white/5"
                  onClick={() => setEditableSettings(savedSettings)}
                  disabled={!hasChanges}
                >
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={saveSettings}
                  disabled={!hasChanges}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Salvar Configurações
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
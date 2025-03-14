import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { AccountLoginSection } from "@/components/settings/AccountLoginSection";
import { TradingPreferences } from "@/components/settings/TradingPreferences";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Palette, 
  LineChart, 
  Shield, 
  HelpCircle, 
  Info, 
  Save, 
  CheckCircle2,
  Sliders,
  Activity,
  Wrench,
  CreditCard,
  Wallet,
  Laptop,
  Lock,
  BellRing,
  ChartBar,
  GanttChart,
  Database,
  Mail,
  Globe,
  Clock,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Componente para cada seção de configurações
const SettingsSection = ({ title, description, icon, children, className }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <Card className={cn(
      "border-[0.5px] border-white/[0.03] bg-black/20 backdrop-blur-xl overflow-hidden relative transition-all duration-300 group",
      className
    )}>
      <div className="relative z-10">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-black/30 text-white/70 border-[0.5px] border-white/[0.03]">
              {icon}
            </div>
            <div>
              <CardTitle className="text-[15px] font-light tracking-wide text-white/80">{title}</CardTitle>
              <CardDescription className="text-white/40 text-xs">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator className="bg-white/[0.03]" />
        <CardContent className="pt-5">{children}</CardContent>
      </div>
    </Card>
  );
};

// Animação para cada seção
const tabVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5,
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { 
      duration: 0.3
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

const Settings = () => {
  const [activeTab, setActiveTab] = useState("geral");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [riskLevel, setRiskLevel] = useState("moderado");
  const [currency, setCurrency] = useState("usd");
  const [defaultOrderSize, setDefaultOrderSize] = useState(100);
  const [enableCustomIndicators, setEnableCustomIndicators] = useState(false);
  const [enableAdvancedCharts, setEnableAdvancedCharts] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [dataExport, setDataExport] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [emailAuth, setEmailAuth] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  
  // Estados para as configurações de notificação
  const [notificationSettings, setNotificationSettings] = useState({
    types: [] as any[],
    channels: [] as any[],
    volume: 70,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00"
  });
  
  // Função para atualizar as configurações de notificação
  const updateNotificationSettings = useCallback((newSettings: Partial<typeof notificationSettings>) => {
    setNotificationSettings(prev => ({
      ...prev,
      ...newSettings
    }));
    
    // Em uma implementação real, você salvaria isso no backend ou no armazenamento local
    
    // Fingir um atraso para simular o salvamento
    setTimeout(() => {
      toast.success("Configurações de notificação atualizadas", {
        description: "Suas preferências de notificação foram salvas com sucesso."
      });
    }, 500);
  }, []);
  
  // Observar mudanças nas configurações de notificação e salvar quando necessário
  useEffect(() => {
    // Este efeito seria usado em uma implementação real para salvar as configurações
    // quando forem alteradas, possivelmente após um debounce
    
    // Por exemplo:
    // const saveTimeout = setTimeout(() => {
    //   saveConfigurationsToAPI(notificationSettings);
    // }, 2000);
    
    // return () => clearTimeout(saveTimeout);
  }, [notificationSettings]);
  
  // Função de salvar ampliada para incluir todas as configurações
  const saveSettings = () => {
    setSaveStatus("saving");
    
    // Aqui você salvaria todas as configurações (incluindo as de notificação)
    
    // Simulação de salvamento
    setTimeout(() => {
      setSaveStatus("saved");
      toast.success("Configurações salvas com sucesso", {
        description: "Todas as suas preferências foram atualizadas."
      });
      
      // Resetar para o estado inicial após um tempo
      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    }, 1000);
  };
  
  // Quando a notificação de teste é enviada com sucesso
  const handleNotificationTestSent = useCallback(() => {
    toast({
      title: "Notificação de teste enviada",
      description: "Verifique se você recebeu a notificação no navegador",
      variant: "default",
      duration: 3000,
    });
  }, []);
  
  // Quando as permissões de notificação são concedidas
  const handleNotificationPermissionChange = useCallback((granted: boolean) => {
    if (granted) {
      toast.success("Permissões de notificação concedidas", {
        description: "Agora você receberá notificações do sistema"
      });
    } else {
      toast.error("Permissões de notificação negadas", {
        description: "Você não receberá notificações do sistema"
      });
    }
  }, []);

  // Adicionando função de mudança de aba com log de depuração
  const handleTabChange = (tabValue: string) => {
    console.log(`Mudando para a aba: ${tabValue} (anterior: ${activeTab})`);
    setActiveTab(tabValue);
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
            <h1 className="text-3xl font-light tracking-wide flex items-center gap-2 text-white/90">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <SettingsIcon className="h-8 w-8 text-white/60" />
              </motion.div>
              Configurações
            </h1>
            <p className="text-white/40 text-sm tracking-wide">
              Personalize sua experiência e gerencie suas preferências
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button 
              className={cn(
                "gap-2 transition-all duration-500",
                saveStatus === "idle" && "bg-black/20 border-[0.5px] border-white/[0.03] hover:bg-black/30",
                saveStatus === "saving" && "bg-black/30",
                saveStatus === "saved" && "bg-emerald-500/20 text-emerald-300/90"
              )}
              onClick={saveSettings}
              disabled={saveStatus !== "idle"}
            >
              {saveStatus === "idle" && (
                <>
                  <Save className="h-4 w-4 opacity-70" />
                  Salvar Preferências
                </>
              )}
              {saveStatus === "saving" && (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sliders className="h-4 w-4" />
                  </motion.div>
                  Salvando...
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </motion.div>
                  Salvo!
                </>
              )}
            </Button>
          </motion.div>
        </div>

        {/* Sistema de abas simplificado */}
        <div className="space-y-6">
          <div className="relative">
            <ScrollArea className="w-full">
              <div className="border-b border-white/5 pb-1">
                <div className="inline-flex h-12 w-auto gap-1 p-1 bg-black/20 backdrop-blur-sm rounded-xl border-[0.5px] border-white/[0.03]">
                  <button 
                    className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 ${
                      activeTab === "geral" 
                        ? "bg-black/30 text-white/90" 
                        : "text-white/40 hover:text-white/60 hover:bg-black/30"
                    }`}
                    onClick={() => handleTabChange("geral")}
                  >
                    <User className="h-4 w-4 mr-2 opacity-70" />
                    Perfil
                  </button>
                  <button 
                    className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 ${
                      activeTab === "seguranca" 
                        ? "bg-black/30 text-white/90" 
                        : "text-white/40 hover:text-white/60 hover:bg-black/30"
                    }`}
                    onClick={() => handleTabChange("seguranca")}
                  >
                    <Shield className="h-4 w-4 mr-2 opacity-70" />
                    Segurança
                  </button>
                  <button 
                    className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 ${
                      activeTab === "aparencia" 
                        ? "bg-black/30 text-white/90" 
                        : "text-white/40 hover:text-white/60 hover:bg-black/30"
                    }`}
                    onClick={() => handleTabChange("aparencia")}
                  >
                    <Palette className="h-4 w-4 mr-2 opacity-70" />
                    Aparência
                  </button>
                  <button 
                    className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 ${
                      activeTab === "notificacoes" 
                        ? "bg-black/30 text-white/90" 
                        : "text-white/40 hover:text-white/60 hover:bg-black/30"
                    }`}
                    onClick={() => handleTabChange("notificacoes")}
                  >
                    <Bell className="h-4 w-4 mr-2 opacity-70" />
                    Notificações
                  </button>
                  <button 
                    className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 ${
                      activeTab === "trading" 
                        ? "bg-black/30 text-white/90" 
                        : "text-white/40 hover:text-white/60 hover:bg-black/30"
                    }`}
                    onClick={() => handleTabChange("trading")}
                  >
                    <LineChart className="h-4 w-4 mr-2 opacity-70" />
                    Trading
                  </button>
                  <button 
                    className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 ${
                      activeTab === "avancado" 
                        ? "bg-black/30 text-white/90" 
                        : "text-white/40 hover:text-white/60 hover:bg-black/30"
                    }`}
                    onClick={() => handleTabChange("avancado")}
                  >
                    <Wrench className="h-4 w-4 mr-2 opacity-70" />
                    Avançado
                  </button>
                </div>
              </div>
            </ScrollArea>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "geral" && (
              <motion.div
                key="geral"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="grid gap-10 md:grid-cols-2 h-full"
                >
                  <motion.div 
                    variants={itemVariants} 
                    className="h-full relative group"
                  >
                    <Card className="border-[0.5px] border-white/10 relative h-full bg-black/30 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-saturate-150 overflow-hidden rounded-2xl">
                      <CardHeader className="pb-5 border-b border-white/[0.03] relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-b from-white/10 to-white/5 p-2.5 rounded-full shadow-inner backdrop-blur-sm">
                            <User className="h-4 w-4 text-white/70" />
                          </div>
                          <div>
                            <CardTitle className="text-[15px] font-normal tracking-wide text-white/90">Perfil do Usuário</CardTitle>
                            <CardDescription className="text-white/40 text-xs tracking-wide">
                              Informações pessoais e preferências
                            </CardDescription>
                          </div>
              </div>
                      </CardHeader>
                      <CardContent className="p-6 h-[calc(100%-5rem)] overflow-auto pb-6 relative z-10">
                        <ProfileSettings />
            </CardContent>
          </Card>
                  </motion.div>

                  <motion.div 
                    variants={itemVariants} 
                    className="h-full relative group"
                  >
                    <Card className="border-[0.5px] border-white/10 relative h-full bg-black/30 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-saturate-150 overflow-hidden rounded-2xl">
                      <CardHeader className="pb-5 border-b border-white/[0.03] relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-b from-white/10 to-white/5 p-2.5 rounded-full shadow-inner backdrop-blur-sm">
                            <Users className="h-4 w-4 text-white/70" />
                          </div>
                          <div>
                            <CardTitle className="text-[15px] font-normal tracking-wide text-white/90">Conta e Login</CardTitle>
                            <CardDescription className="text-white/40 text-xs tracking-wide">
                              Gerenciamento de credenciais e acesso
                            </CardDescription>
                          </div>
                        </div>
            </CardHeader>
                      <CardContent className="p-6 h-[calc(100%-5rem)] overflow-auto pb-6 relative z-10">
                        <AccountLoginSection />
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {activeTab === "seguranca" && (
              <motion.div
                key="seguranca"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <motion.div variants={itemVariants}>
                  <SettingsSection
                    title="Autenticação"
                    description="Configure suas opções de segurança e autenticação"
                    icon={<Lock className="h-4 w-4 text-blue-400" />}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="space-y-0.5">
                          <Label className="text-white/90 font-medium flex items-center gap-2">
                            <Shield className="h-4 w-4 text-emerald-400" />
                            Autenticação de dois fatores
                          </Label>
                          <p className="text-sm text-white/60">
                            Adicione uma camada extra de segurança à sua conta
                          </p>
                        </div>
                        <Switch
                          checked={twoFactorAuth}
                          onCheckedChange={setTwoFactorAuth}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                      <Separator className="bg-white/5" />
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="space-y-0.5">
                          <Label className="text-white/90 font-medium flex items-center gap-2">
                            <BellRing className="h-4 w-4 text-blue-400" />
                            Verificação por e-mail
                          </Label>
                          <p className="text-sm text-white/60">
                            Confirme operações sensíveis por e-mail
                          </p>
                        </div>
                        <Switch
                          checked={emailAuth}
                          onCheckedChange={setEmailAuth}
                          className="data-[state=checked]:bg-blue-500"
                        />
                      </div>
                    </div>
                  </SettingsSection>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <SettingsSection
                    title="Chaves de API"
                    description="Gerencie suas chaves de API para integração com exchanges"
                    icon={<CreditCard className="h-4 w-4 text-purple-400" />}
                  >
                    <div className="space-y-4">
              <div className="grid gap-2">
                        <Label htmlFor="api-key" className="text-white/90">Chave de API</Label>
                        <div className="relative">
                          <Input
                            id="api-key"
                            type="password"
                            placeholder="Digite sua chave de API"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="bg-white/5 border-white/10 focus:border-blue-500/50 pl-9"
                          />
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                        </div>
              </div>
              <div className="grid gap-2">
                        <Label htmlFor="secret-key" className="text-white/90">Chave Secreta</Label>
                        <div className="relative">
                          <Input
                            id="secret-key"
                            type="password"
                            placeholder="Digite sua chave secreta"
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            className="bg-white/5 border-white/10 focus:border-blue-500/50 pl-9"
                          />
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full bg-gradient-to-r from-white/5 to-white/10 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                        Verificar Conexão
                      </Button>
                    </div>
                  </SettingsSection>
                </motion.div>
              </motion.div>
            )}

            {activeTab === "aparencia" && (
              <motion.div
                key="aparencia"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <motion.div variants={itemVariants}>
                  <AppearanceSettings />
                </motion.div>
              </motion.div>
            )}

            {activeTab === "notificacoes" && (
              <motion.div
                key="notificacoes"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
                onAnimationStart={() => console.log("Iniciando animação da aba de notificações")}
                onAnimationComplete={() => console.log("Animação da aba de notificações concluída")}
              >
                {console.log("Renderizando conteúdo da aba de notificações")}
                <motion.div variants={itemVariants}>
                  <NotificationSettings 
                    onSettingsChange={updateNotificationSettings}
                    onNotificationTestSent={handleNotificationTestSent}
                    onPermissionChange={handleNotificationPermissionChange}
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <SettingsSection
                    title="Resumo de Notificações"
                    description="Visão geral das suas configurações de notificação"
                    icon={<BellRing className="h-4 w-4 text-amber-400" />}
                  >
                    <div className="space-y-4">
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                        <div className="bg-white/5 p-4 rounded-lg">
                          <h4 className="text-sm font-medium mb-2 text-white/90">Canais Ativos</h4>
                          <div className="flex flex-wrap gap-2">
                            {notificationSettings.channels
                              .filter(channel => channel?.enabled)
                              .map(channel => (
                                <Badge key={channel.id} variant="outline" className="bg-black/30">
                                  {channel.name}
                                </Badge>
                              ))}
                            {notificationSettings.channels.filter(channel => channel?.enabled).length === 0 && (
                              <span className="text-xs text-white/60">Nenhum canal ativo</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="bg-white/5 p-4 rounded-lg">
                          <h4 className="text-sm font-medium mb-2 text-white/90">Tipos de Notificação Ativos</h4>
                          <div className="flex flex-wrap gap-2">
                            {notificationSettings.types
                              .filter(type => type?.enabled)
                              .map(type => (
                                <Badge key={type.id} variant="outline" className="bg-black/30">
                                  {type.name}
                                </Badge>
                              ))}
                            {notificationSettings.types.filter(type => type?.enabled).length === 0 && (
                              <span className="text-xs text-white/60">Nenhum tipo ativo</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Separator className="bg-white/5" />
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-white/80">Volume das notificações</span>
                          <span className="text-sm font-medium">{notificationSettings.volume}%</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-white/80">Modo silencioso</span>
                          <Badge variant="outline" className={notificationSettings.quietHoursEnabled ? "bg-purple-500/20" : "bg-white/5"}>
                            {notificationSettings.quietHoursEnabled ? "Ativado" : "Desativado"}
                          </Badge>
                        </div>
                        
                        {notificationSettings.quietHoursEnabled && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/80">Horário silencioso</span>
                            <span className="text-sm font-medium">
                              {notificationSettings.quietHoursStart} - {notificationSettings.quietHoursEnd}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </SettingsSection>
                </motion.div>
              </motion.div>
            )}

            {activeTab === "trading" && (
              <motion.div
                key="trading"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <motion.div variants={itemVariants}>
                  <TradingPreferences 
                    defaultRiskLevel={riskLevel}
                    defaultCurrency={currency}
                    onRiskLevelChange={setRiskLevel}
                    onCurrencyChange={setCurrency}
                  />
                </motion.div>
                
                <motion.div variants={itemVariants}>
                  <SettingsSection
                    title="Configurações de Trading"
                    description="Configure parâmetros para suas operações de trading"
                    icon={<LineChart className="h-4 w-4 text-blue-400" />}
                    className="bg-gradient-to-br from-blue-900/10 via-black/20 to-black/30"
                  >
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="order-size" className="text-white/90 font-medium">Tamanho padrão da ordem</Label>
                          <Badge className="bg-gradient-to-r from-blue-500 to-blue-600">
                            {defaultOrderSize} USD
                          </Badge>
                        </div>
                        <div className="pt-2 px-1">
                          <Slider
                            id="order-size"
                            min={10}
                            max={1000}
                            step={10}
                            value={[defaultOrderSize]}
                            onValueChange={(value) => setDefaultOrderSize(value[0])}
                            className="[&>span:first-child]:bg-blue-500 [&>span:last-child]:bg-blue-500"
                          />
                          <div className="flex justify-between mt-1 text-xs text-white/50">
                            <span>10 USD</span>
                            <span>1000 USD</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="stop-loss" className="text-white/90">Stop Loss padrão (%)</Label>
                          <div className="relative">
                            <Input 
                              id="stop-loss" 
                              type="number" 
                              placeholder="2" 
                              className="bg-white/5 border-white/10 focus:border-rose-500/50 pl-9" 
                            />
                            <div className="absolute left-3 top-2.5 flex items-center">
                              <ArrowDownIcon className="h-4 w-4 text-rose-400" />
                            </div>
                          </div>
              </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="take-profit" className="text-white/90">Take Profit padrão (%)</Label>
                          <div className="relative">
                            <Input 
                              id="take-profit" 
                              type="number" 
                              placeholder="6" 
                              className="bg-white/5 border-white/10 focus:border-emerald-500/50 pl-9" 
                            />
                            <div className="absolute left-3 top-2.5 flex items-center">
                              <ArrowUpIcon className="h-4 w-4 text-emerald-400" />
                            </div>
                          </div>
                        </div>
              </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/5">
                          <Checkbox 
                            id="leverage" 
                            checked={enableCustomIndicators}
                            onCheckedChange={(checked) => 
                              setEnableCustomIndicators(checked === true)
                            }
                            className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                          />
                          <div>
                            <label
                              htmlFor="leverage"
                              className="text-sm font-medium leading-none text-white/90 cursor-pointer"
                            >
                              Habilitar indicadores personalizados
                            </label>
                            <p className="text-xs text-white/60 mt-1">
                              Permite criar e utilizar indicadores técnicos customizados
                            </p>
                          </div>
          </div>
        </div>
      </div>
                  </SettingsSection>
                </motion.div>
              </motion.div>
            )}

            {activeTab === "avancado" && (
              <motion.div
                key="avancado"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <motion.div variants={itemVariants}>
                  <SettingsSection
                    title="Recursos Avançados"
                    description="Configure recursos avançados da plataforma"
                    icon={<Wrench className="h-4 w-4 text-purple-400" />}
                    className="bg-gradient-to-br from-purple-900/10 via-black/20 to-black/30"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="space-y-0.5">
                          <Label className="text-white/90 font-medium flex items-center gap-2">
                            <Laptop className="h-4 w-4 text-blue-400" />
                            Gráficos avançados
                          </Label>
                          <p className="text-sm text-white/60">
                            Habilitar indicadores técnicos complexos e análise avançada
                          </p>
                        </div>
                        <Switch
                          checked={enableAdvancedCharts}
                          onCheckedChange={setEnableAdvancedCharts}
                          className="data-[state=checked]:bg-blue-500"
                        />
                      </div>
                      <Separator className="bg-white/5" />
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="space-y-0.5">
                          <Label className="text-white/90 font-medium flex items-center gap-2">
                            <Database className="h-4 w-4 text-emerald-400" />
                            Backup automático
                          </Label>
                          <p className="text-sm text-white/60">
                            Crie backups automáticos dos seus dados e configurações
                          </p>
                        </div>
                        <Switch
                          checked={autoBackup}
                          onCheckedChange={setAutoBackup}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                      <Separator className="bg-white/5" />
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="space-y-0.5">
                          <Label className="text-white/90 font-medium flex items-center gap-2">
                            <LineChart className="h-4 w-4 text-amber-400" />
                            Exportação de dados
                          </Label>
                          <p className="text-sm text-white/60">
                            Permita exportar histórico de trading e análises
                          </p>
                        </div>
                        <Switch
                          checked={dataExport}
                          onCheckedChange={setDataExport}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                    </div>
                  </SettingsSection>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </Layout>
  );
};

export default Settings;
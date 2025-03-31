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
  Users,
  Video,
  X
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // Estados para as configurações de notificação
  const [notificationSettings, setNotificationSettings] = useState({
    types: [] as any[],
    channels: [] as any[],
    volume: 70,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00"
  });
  
  const { t } = useLanguage();
  
  // Carregar configurações salvas
  useEffect(() => {
    // Carregar configurações do localStorage
    try {
      const savedSettings = localStorage.getItem('app-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // Atualizar estados com valores salvos
        if (settings.riskLevel) setRiskLevel(settings.riskLevel);
        if (settings.currency) setCurrency(settings.currency);
        if (settings.defaultOrderSize) setDefaultOrderSize(settings.defaultOrderSize);
        if (settings.enableCustomIndicators !== undefined) setEnableCustomIndicators(settings.enableCustomIndicators);
        if (settings.enableAdvancedCharts !== undefined) setEnableAdvancedCharts(settings.enableAdvancedCharts);
        if (settings.autoBackup !== undefined) setAutoBackup(settings.autoBackup);
        if (settings.dataExport !== undefined) setDataExport(settings.dataExport);
        if (settings.twoFactorAuth !== undefined) setTwoFactorAuth(settings.twoFactorAuth);
        if (settings.emailAuth !== undefined) setEmailAuth(settings.emailAuth);
        if (settings.priceAlerts !== undefined) setPriceAlerts(settings.priceAlerts);
        
        if (settings.notificationSettings) {
          setNotificationSettings(settings.notificationSettings);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações");
    }
  }, []);
  
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
    
    try {
      // Criar objeto com todas as configurações
      const settings = {
        riskLevel,
        currency,
        defaultOrderSize,
        enableCustomIndicators,
        enableAdvancedCharts,
        autoBackup,
        dataExport,
        twoFactorAuth,
        emailAuth,
        priceAlerts,
        notificationSettings
      };
      
      // Salvar no localStorage
      localStorage.setItem('app-settings', JSON.stringify(settings));
    
    // Simulação de salvamento
    setTimeout(() => {
      setSaveStatus("saved");
        toast.success(t('settings.saveSuccessMessage') || "Configurações salvas com sucesso", {
          description: t('settings.saveSuccessDescription') || "Todas as suas preferências foram atualizadas."
      });
      
      // Resetar para o estado inicial após um tempo
      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
      }, 800);
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error(t('settings.saveErrorMessage') || "Erro ao salvar configurações");
      setSaveStatus("idle");
    }
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
                <SettingsIcon className="h-8 w-8 text-white/80" />
              </motion.div>
              {t('settings.title')}
            </h1>
            <p className="text-white/40 text-sm tracking-wide">
              {t('settings.subtitle')}
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button 
              variant="default" 
              onClick={saveSettings}
              disabled={saveStatus === "saving" || saveStatus === "saved"}
              className="relative overflow-hidden"
            >
              {saveStatus === "idle" && (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('settings.save')}
                </>
              )}
              {saveStatus === "saving" && (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="mr-2 h-4 w-4 border-2 border-t-transparent border-white rounded-full"
                  />
                  {t('settings.saving')}
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('settings.saved')}
                </>
              )}
            </Button>
          </motion.div>
        </div>
        
        <Tabs 
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <TabsList className="bg-black/20 border-[0.5px] border-white/[0.03] rounded-lg h-auto p-1 w-full overflow-x-auto flex flex-nowrap justify-start md:justify-center">
              <TabsTrigger 
                value="geral" 
                className="py-2 px-3 data-[state=active]:bg-white/[0.08] rounded-md"
              >
                <Sliders className="w-4 h-4 mr-2" />
                {t('settings.general')}
              </TabsTrigger>
              <TabsTrigger 
                value="perfil" 
                className="py-2 px-3 data-[state=active]:bg-white/[0.08] rounded-md"
              >
                <User className="w-4 h-4 mr-2" />
                {t('settings.profile')}
              </TabsTrigger>
              <TabsTrigger 
                value="aparencia" 
                className="py-2 px-3 data-[state=active]:bg-white/[0.08] rounded-md"
              >
                <Palette className="w-4 h-4 mr-2" />
                {t('settings.appearance')}
              </TabsTrigger>
              <TabsTrigger 
                value="notificacoes" 
                className="py-2 px-3 data-[state=active]:bg-white/[0.08] rounded-md"
              >
                <Bell className="w-4 h-4 mr-2" />
                {t('settings.notifications')}
              </TabsTrigger>
              <TabsTrigger 
                value="trading" 
                className="py-2 px-3 data-[state=active]:bg-white/[0.08] rounded-md"
              >
                <LineChart className="w-4 h-4 mr-2" />
                {t('settings.trading')}
              </TabsTrigger>
              <TabsTrigger 
                value="seguranca" 
                className="py-2 px-3 data-[state=active]:bg-white/[0.08] rounded-md"
              >
                <Shield className="w-4 h-4 mr-2" />
                {t('settings.security')}
              </TabsTrigger>
              <TabsTrigger 
                value="ajuda" 
                className="py-2 px-3 data-[state=active]:bg-white/[0.08] rounded-md"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                {t('settings.help')}
              </TabsTrigger>
            </TabsList>
          </motion.div>
          
          <TabsContent value="geral" className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="geral"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={tabVariants}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Seção de Idioma */}
                <motion.div variants={itemVariants}>
                  <SettingsSection
                    title={t('settings.language')}
                    description={t('settings.language.description')}
                    icon={<Globe className="h-5 w-5 text-white/70" />}
                  >
                    <div className="space-y-4">
                      <LanguageSelector />
                    </div>
                  </SettingsSection>
                </motion.div>
                
                {/* Seção de Backup */}
                <motion.div variants={itemVariants}>
                  <SettingsSection
                    title="Backup de Dados"
                    description="Configure o backup automático dos seus dados"
                    icon={<Database className="h-5 w-5 text-white/70" />}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-white/90">Backup Automático</Label>
                          <p className="text-xs text-white/50">Backup automático diário dos seus dados</p>
                        </div>
                        <Switch
                          checked={autoBackup}
                          onCheckedChange={setAutoBackup}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-white/90">Exportação de Dados</Label>
                          <p className="text-xs text-white/50">Permitir exportação de dados para CSV</p>
                        </div>
                        <Switch
                          checked={dataExport}
                          onCheckedChange={setDataExport}
                        />
                      </div>
                    </div>
                  </SettingsSection>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
          
          <TabsContent value="perfil" className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="perfil"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={tabVariants}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <motion.div variants={itemVariants} className="md:col-span-2">
                  <ProfileSettings />
                </motion.div>
                <motion.div variants={itemVariants} className="md:col-span-2">
                  <AccountLoginSection />
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
          
          <TabsContent value="aparencia" className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="aparencia"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={tabVariants}
                className="grid grid-cols-1 md:grid-cols-1 gap-6"
              >
                <motion.div variants={itemVariants}>
                  <AppearanceSettings />
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
          
          <TabsContent value="notificacoes" className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="notificacoes"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={tabVariants}
                className="grid grid-cols-1 md:grid-cols-1 gap-6"
              >
                <motion.div variants={itemVariants}>
                  <NotificationSettings 
                    onSettingsChange={(settings) => {
                      setNotificationSettings(settings);
                    }}
                    onNotificationTestSent={handleNotificationTestSent}
                    onPermissionChange={handleNotificationPermissionChange}
                  />
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
          
          <TabsContent value="trading" className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="trading"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={tabVariants}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <motion.div variants={itemVariants}>
                  <TradingPreferences 
                    defaultRiskLevel={riskLevel}
                    defaultCurrency={currency}
                    onRiskLevelChange={(value) => setRiskLevel(value)}
                    onCurrencyChange={(value) => setCurrency(value)}
                  />
                </motion.div>
                
                <motion.div variants={itemVariants}>
                  <SettingsSection
                    title="Configurações de Trading"
                    description="Preferências de indicadores e tamanho de ordem"
                    icon={<ChartBar className="h-5 w-5 text-white/70" />}
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="order-size" className="text-white/90 font-medium">Tamanho Padrão de Ordem</Label>
                        <Select value={String(defaultOrderSize)} onValueChange={(value) => setDefaultOrderSize(Number(value))}>
                          <SelectTrigger id="order-size" className="w-full bg-white/5 border-white/10">
                            <SelectValue placeholder="Selecione um tamanho" />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 backdrop-blur-md border-white/10">
                            <SelectItem value="25">25 unidades</SelectItem>
                            <SelectItem value="50">50 unidades</SelectItem>
                            <SelectItem value="100">100 unidades</SelectItem>
                            <SelectItem value="250">250 unidades</SelectItem>
                            <SelectItem value="500">500 unidades</SelectItem>
                            <SelectItem value="1000">1000 unidades</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-white/90">Indicadores Personalizados</Label>
                          <p className="text-xs text-white/50">Ativar indicadores personalizados</p>
                        </div>
                        <Switch
                          checked={enableCustomIndicators}
                          onCheckedChange={setEnableCustomIndicators}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-white/90">Gráficos Avançados</Label>
                          <p className="text-xs text-white/50">Habilitar recursos avançados nos gráficos</p>
                        </div>
                        <Switch
                          checked={enableAdvancedCharts}
                          onCheckedChange={setEnableAdvancedCharts}
                        />
                      </div>
                    </div>
                  </SettingsSection>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
          
          <TabsContent value="seguranca" className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="seguranca"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={tabVariants}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <motion.div variants={itemVariants}>
                  <SettingsSection
                    title="Autenticação"
                    description="Configure métodos de autenticação e segurança"
                    icon={<Lock className="h-5 w-5 text-white/70" />}
                    className="md:col-span-2"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-white/90">Autenticação de Dois Fatores</Label>
                          <p className="text-xs text-white/50">Ativar verificação em duas etapas</p>
                        </div>
                        <Switch
                          checked={twoFactorAuth}
                          onCheckedChange={setTwoFactorAuth}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-white/90">Autenticação por Email</Label>
                          <p className="text-xs text-white/50">Receber email de autenticação ao entrar</p>
                        </div>
                        <Switch
                          checked={emailAuth}
                          onCheckedChange={setEmailAuth}
                        />
                      </div>
                    </div>
                  </SettingsSection>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
          
          <TabsContent value="ajuda" className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="ajuda"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={tabVariants}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <motion.div variants={itemVariants} className="md:col-span-2">
                  <SettingsSection
                    title="Ajuda e Suporte"
                    description="Obtenha ajuda e suporte para a plataforma"
                    icon={<HelpCircle className="h-5 w-5 text-white/70" />}
                  >
                    <div className="space-y-6">
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h3 className="text-sm font-medium text-white/90 mb-2">Termos de Uso</h3>
                        <p className="text-xs text-white/70 mb-3">
                          Acesse os termos de uso da plataforma e políticas de privacidade.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full bg-black/20 border-white/10 text-white/80"
                          onClick={() => setShowTermsModal(true)}
                        >
                          <Info className="mr-2 h-4 w-4" />
                          Ver Termos de Uso
                        </Button>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h3 className="text-sm font-medium text-white/90 mb-2">Suporte</h3>
                        <p className="text-xs text-white/70 mb-3">
                          Entre em contato com nossa equipe de suporte para resolver suas dúvidas.
                        </p>
                        <Button variant="outline" size="sm" className="w-full bg-black/20 border-white/10 text-white/80">
                          <Mail className="mr-2 h-4 w-4" />
                          Contatar Suporte
                        </Button>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h3 className="text-sm font-medium text-white/90 mb-2">Tutoriais</h3>
                        <p className="text-xs text-white/70 mb-3">
                          Acesse nossos tutoriais em vídeo para aprender a utilizar a plataforma.
                        </p>
                        <Button variant="outline" size="sm" className="w-full bg-black/20 border-white/10 text-white/80">
                          <Video className="mr-2 h-4 w-4" />
                          Ver Tutoriais
                        </Button>
                      </div>
                    </div>
                  </SettingsSection>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </motion.div>
      
      {/* Modal de Termos e Condições */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto bg-black/90 border-white/10 text-white/80">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-medium text-white/90">Termos e Condições</DialogTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowTermsModal(false)}
                className="h-8 w-8 text-white/70 hover:text-white/90 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription className="text-white/50">
              Leia atentamente nossos termos e condições de uso
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-2 text-sm text-white/70">
            <h3 className="font-medium text-white/90">1. Introdução</h3>
            <p>
              Estes Termos e Condições regem o uso do ProfEyes, plataforma de análise de sinais de trading. 
              Ao acessar ou utilizar nossa plataforma, você concorda com estes termos em sua totalidade.
            </p>
            
            <h3 className="font-medium text-white/90">2. Licença de Uso</h3>
            <p>
              Concedemos a você uma licença limitada, não exclusiva e não transferível para acessar e utilizar 
              nossa plataforma para fins pessoais e comerciais, sujeita a estes Termos e Condições.
            </p>
            
            <h3 className="font-medium text-white/90">3. Limitação de Responsabilidade</h3>
            <p>
              A plataforma é fornecida "como está", sem garantias de qualquer tipo. Não garantimos que os sinais de 
              trading gerados resultarão em lucros. O trading de ativos financeiros envolve alto risco, e você deve 
              estar ciente de que pode perder parte ou todo o seu investimento.
            </p>
            
            <h3 className="font-medium text-white/90">4. Uso de Dados</h3>
            <p>
              Ao utilizar nossa plataforma, você concorda que podemos coletar e utilizar dados sobre seu uso, 
              conforme descrito em nossa Política de Privacidade.
            </p>
            
            <h3 className="font-medium text-white/90">5. Restrições de Uso</h3>
            <p>
              Você concorda em não:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Usar a plataforma para qualquer finalidade ilegal ou não autorizada</li>
              <li>Modificar, adaptar ou piratear a plataforma</li>
              <li>Compartilhar sua conta com terceiros</li>
              <li>Tentar acessar dados não destinados a você</li>
              <li>Usar a plataforma de maneira que possa danificá-la ou prejudicar sua disponibilidade</li>
            </ul>
            
            <h3 className="font-medium text-white/90">6. Rescisão</h3>
            <p>
              Reservamos o direito de rescindir ou suspender seu acesso à plataforma, por qualquer motivo, 
              incluindo violação destes Termos e Condições.
            </p>
            
            <h3 className="font-medium text-white/90">7. Alterações aos Termos</h3>
            <p>
              Podemos atualizar estes Termos e Condições periodicamente. Notificaremos você sobre mudanças 
              significativas por meio da plataforma ou por email.
            </p>
            
            <h3 className="font-medium text-white/90">8. Lei Aplicável</h3>
            <p>
              Estes Termos e Condições são regidos pelas leis do Brasil, sem considerar seus princípios de 
              conflito de leis.
            </p>
            
            <div className="pt-4 border-t border-white/10">
              <p className="text-white/50 text-xs">
                Última atualização: 15 de Março de 2024
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Settings;
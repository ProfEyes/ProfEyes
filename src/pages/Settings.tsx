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
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Palette, 
  Shield, 
  HelpCircle, 
  Info, 
  Save, 
  CheckCircle2,
  Sliders,
  Wrench,
  CreditCard,
  Wallet,
  Laptop,
  Lock,
  BellRing,
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
      "border-[0.5px] border-white/[0.02] bg-transparent backdrop-blur-xl overflow-hidden relative transition-all duration-500 group hover:border-white/[0.05]",
      "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/[0.02] before:to-transparent before:opacity-0 before:transition-opacity before:duration-500 group-hover:before:opacity-100",
      "after:absolute after:inset-0 after:bg-gradient-to-tr after:from-white/[0.01] after:to-transparent after:opacity-0 after:transition-opacity after:duration-500 group-hover:after:opacity-100",
      "hover:shadow-[0_0_30px_rgba(255,255,255,0.02)]",
      "hover:translate-y-[-2px]",
      "hover:border-white/[0.08]",
      className
    )}>
      <div className="relative z-10">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2 rounded-lg bg-white/[0.02] text-white/40 border-[0.5px] border-white/[0.02] group-hover:text-white/60 transition-colors duration-300"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              {icon}
            </motion.div>
            <div>
              <CardTitle className="text-[15px] font-light tracking-wide text-white/60 group-hover:text-white/80 transition-colors duration-300">{title}</CardTitle>
              <CardDescription className="text-white/30 text-xs group-hover:text-white/40 transition-colors duration-300">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
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
  const [activeTab, setActiveTab] = useState("perfil");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
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
  
  const handleNotificationTestSent = useCallback(() => {
    toast.success("Notificação de teste enviada", {
      description: "Verifique se você recebeu a notificação no navegador",
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
      <div className="relative min-h-screen">
        {/* Efeitos de fundo decorativos */}
        <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full bg-rose-900/5 blur-[120px] opacity-40 pointer-events-none"></div>
        <div className="absolute bottom-[-300px] right-[-200px] w-[600px] h-[600px] rounded-full bg-amber-900/5 blur-[120px] opacity-30 pointer-events-none"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 container max-w-6xl mx-auto py-12 px-4 sm:px-6"
        >
          <header className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-white/5 to-transparent border border-white/10 shadow-sm">
                <SettingsIcon className="h-6 w-6 text-white/70" />
              </div>
              <div>
                <h1 className="text-3xl font-extralight tracking-tight text-white/90">{t('settings.title') || "Configurações"}</h1>
                <p className="text-white/50 text-sm mt-1">{t('settings.subtitle') || "Personalize sua experiência na plataforma"}</p>
              </div>
            </div>
            <Separator className="bg-white/[0.03] my-6" />
          </header>
          
          <div className="grid grid-cols-12 gap-8">
            {/* Navegação lateral */}
            <div className="col-span-12 md:col-span-3">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="sticky top-24"
              >
                <Card className="border-[0.5px] border-white/[0.03] bg-white/[0.01] backdrop-blur-lg shadow-sm">
                  <CardContent className="p-3">
                    <nav className="flex flex-col gap-1">
                      {[
                        { id: "perfil", label: "Perfil", icon: <User className="h-4 w-4" /> },
                        { id: "notificacoes", label: "Notificações", icon: <Bell className="h-4 w-4" /> },
                        { id: "aparencia", label: "Aparência", icon: <Palette className="h-4 w-4" /> },
                        { id: "privacidade", label: "Privacidade & Segurança", icon: <Shield className="h-4 w-4" /> },
                      ].map((item) => (
                        <motion.button
                          key={item.id}
                          whileHover={{ x: 3 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleTabChange(item.id)}
                          className={cn(
                            "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-all duration-200",
                            activeTab === item.id 
                              ? "bg-gradient-to-r from-white/10 to-white/5 text-white/90 shadow-sm" 
                              : "hover:bg-white/[0.02] text-white/50"
                          )}
                        >
                          <span className={cn(
                            "p-1.5 rounded-md",
                            activeTab === item.id ? "bg-white/10" : "bg-white/5"
                          )}>
                            {item.icon}
                          </span>
                          <span className="text-sm font-light">{item.label}</span>
                          {activeTab === item.id && (
                            <motion.div 
                              layoutId="activeTabIndicator"
                              className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-white/80 to-white/60"
                            />
                          )}
                        </motion.button>
                      ))}
                    </nav>
                  </CardContent>
                </Card>
                
                <Button 
                  onClick={saveSettings}
                  disabled={saveStatus === "saving"}
                  className="group w-full mt-6 relative overflow-hidden bg-gradient-to-r from-black via-black to-[#006400]/90 hover:from-black hover:via-black hover:to-[#006400] text-white/80 border border-black/70 h-12 shadow-md shadow-black/60 hover:shadow-lg hover:shadow-black/70 transition-all duration-300"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-transparent to-[#006400]/5 opacity-0 group-hover:opacity-100 animate-shimmer"></span>
                  <span className="absolute bottom-0 right-0 w-[15%] h-[1px] bg-gradient-to-r from-transparent to-[#006400]/80"></span>
                  
                  <AnimatePresence mode="wait">
                    {saveStatus === "idle" && (
                      <motion.div 
                        key="idle" 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center w-full"
                      >
                        <motion.div
                          className="relative flex items-center"
                          whileHover={{ scale: 1.03 }}
                          transition={{ duration: 0.2 }}
                        >
                          <motion.div 
                            className="absolute -left-1 -top-1 w-6 h-6 rounded-full bg-[#006400]/10"
                            animate={{ 
                              scale: [1, 1.1, 1],
                              opacity: [0.2, 0.3, 0.2]
                            }}
                            transition={{ 
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mr-2.5 text-[#006400]/80" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19.5 9L12 16.5L4.5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 16.5V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M19.5 16.5H4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span>Salvar alterações</span>
                        </motion.div>
                      </motion.div>
                    )}
                    
                    {saveStatus === "saving" && (
                      <motion.div 
                        key="saving" 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center w-full"
                      >
                        <svg className="animate-spin mr-2 h-4 w-4 text-green-600/80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Processando...</span>
                      </motion.div>
                    )}
                    
                    {saveStatus === "saved" && (
                      <motion.div 
                        key="saved" 
                        initial={{ opacity: 0 }} 
                        animate={{ 
                          opacity: 1,
                          transition: { duration: 0.4 }
                        }} 
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center w-full space-x-3"
                      >
                        <motion.div
                          initial={{ scale: 0.6 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20
                          }}
                          className="relative flex items-center justify-center"
                        >
                          <motion.div 
                            className="absolute inset-0 rounded-full bg-[#006400]/10"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ 
                              scale: [0.6, 1.5, 1],
                              opacity: [0, 0.25, 0]
                            }}
                            transition={{ 
                              duration: 1.4,
                              ease: [0.22, 1, 0.36, 1]
                            }}
                          />
                          <svg 
                            width="22" 
                            height="22" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="text-[#006400]"
                            style={{ overflow: 'visible' }}
                          >
                            <motion.path 
                              d="M20 6L9 17L4 12" 
                              stroke="currentColor" 
                              strokeWidth="2.8" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 1 }}
                              transition={{ 
                                pathLength: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
                                opacity: { duration: 0.3 }
                              }}
                            />
                          </svg>
                        </motion.div>
                        <motion.span 
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ 
                            delay: 0.4, 
                            duration: 0.5,
                            ease: [0.16, 1, 0.3, 1]
                          }}
                          className="text-white font-medium"
                        >
                          Configurações salvas
                        </motion.span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </div>
            
            {/* Conteúdo */}
            <div className="col-span-12 md:col-span-9">
              <AnimatePresence mode="wait">
                {activeTab === "perfil" && (
                  <motion.div
                    key="perfil"
                    variants={tabVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-6"
                  >
                    <ProfileSettings />
                    
                    <AccountLoginSection />
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
                  >
                    <NotificationSettings 
                      onSettingsChange={(settings) => setNotificationSettings(settings)}
                      onNotificationTestSent={handleNotificationTestSent}
                      onPermissionChange={handleNotificationPermissionChange}
                    />
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
                    <AppearanceSettings />
                  </motion.div>
                )}
                
                {activeTab === "privacidade" && (
                  <motion.div
                    key="privacidade"
                    variants={tabVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 gap-6">
                      {/* Backup automático */}
                      <SettingsSection
                        title="Backup e Exportação"
                        description="Gerenciar seus dados e backups"
                        icon={<Database className="h-5 w-5 text-amber-400/70" />}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-white/80">Backup automático</Label>
                              <p className="text-xs text-white/40">Armazena suas configurações na nuvem automaticamente</p>
                            </div>
                            <Switch
                              checked={autoBackup}
                              onCheckedChange={setAutoBackup}
                              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-amber-500/90 data-[state=checked]:to-amber-400/90"
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-white/80">Exportação de dados</Label>
                              <p className="text-xs text-white/40">Permite exportar seus dados em formato CSV</p>
                            </div>
                            <Switch
                              checked={dataExport}
                              onCheckedChange={setDataExport}
                              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-amber-500/90 data-[state=checked]:to-amber-400/90"
                            />
                          </div>
                          
                          <div className="flex gap-4 mt-6">
                            <Button variant="outline" size="sm" className="text-xs bg-white/5 border-white/10 hover:bg-white/10 text-white/70">
                              Exportar dados
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs bg-white/5 border-white/10 hover:bg-white/10 text-white/70">
                              Fazer backup agora
                            </Button>
                          </div>
                        </div>
                      </SettingsSection>
                      
                      {/* Autenticação */}
                      <SettingsSection
                        title="Autenticação em Duas Etapas"
                        description="Proteja sua conta com segurança adicional"
                        icon={<Shield className="h-5 w-5 text-rose-400/70" />}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-white/80">Autenticação em duas etapas</Label>
                              <p className="text-xs text-white/40">Solicita um código adicional ao fazer login</p>
                            </div>
                            <Switch
                              checked={twoFactorAuth}
                              onCheckedChange={setTwoFactorAuth}
                              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-rose-500/90 data-[state=checked]:to-rose-400/90"
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-white/80">Autenticação por e-mail</Label>
                              <p className="text-xs text-white/40">Receba códigos de verificação por e-mail</p>
                            </div>
                            <Switch
                              checked={emailAuth}
                              onCheckedChange={setEmailAuth}
                              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-rose-500/90 data-[state=checked]:to-rose-400/90"
                            />
                          </div>
                          
                          <div className="mt-6">
                            {twoFactorAuth ? (
                              <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                                <h4 className="text-sm font-medium text-white/80 mb-2">Configuração segura</h4>
                                <p className="text-xs text-white/60 mb-3">
                                  A autenticação em duas etapas está ativada e funcionando corretamente.
                                </p>
                                <Button variant="outline" size="sm" className="text-xs bg-white/5 border-white/10 hover:bg-white/10 text-white/70">
                                  Alterar configurações
                                </Button>
                              </div>
                            ) : (
                              <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-900/5">
                                <h4 className="text-sm font-medium text-amber-200/80 mb-2">Recomendação de segurança</h4>
                                <p className="text-xs text-white/60 mb-3">
                                  Recomendamos ativar a autenticação em duas etapas para aumentar a segurança da sua conta.
                                </p>
                                <Button size="sm" className="text-xs bg-gradient-to-r from-amber-500/80 to-rose-500/80 hover:from-amber-500/90 hover:to-rose-500/90 border-0">
                                  Ativar agora
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </SettingsSection>
                      
                      {/* Termos de uso */}
                      <SettingsSection
                        title="Termos e Políticas"
                        description="Informações legais e políticas da plataforma"
                        icon={<Info className="h-5 w-5 text-white/70" />}
                      >
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {["Termos de Uso", "Política de Privacidade", "Política de Cookies", "Conformidade LGPD"].map((term) => (
                              <motion.button
                                key={term}
                                whileHover={{ y: -2 }}
                                className="text-left p-4 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200"
                                onClick={() => setShowTermsModal(true)}
                              >
                                <h4 className="text-sm font-medium text-white/80 mb-1">{term}</h4>
                                <p className="text-xs text-white/40">Última atualização: 10/10/2023</p>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      </SettingsSection>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Modal para termos e políticas */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="bg-gradient-to-b from-slate-900/95 to-black/95 border-white/10 backdrop-blur-xl max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-light text-white/90">Termos de Uso</DialogTitle>
            <DialogDescription className="text-white/50">
              Última atualização: 10/10/2023
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="mt-4 max-h-[60vh]">
            <div className="space-y-4 text-sm text-white/70 p-1">
              <p>
                Estes termos e condições ("Termos") regem o uso do serviço ProfEyes ("Serviço") operado pela nossa empresa.
              </p>
              <p>
                Ao acessar ou usar o Serviço, você concorda em estar vinculado a estes Termos. Se você discordar de qualquer parte dos termos, você não poderá acessar o Serviço.
              </p>
              <h4 className="text-white/90 font-medium text-base mt-6 mb-2">1. Contas</h4>
              <p>
                Quando você cria uma conta conosco, você garante que as informações fornecidas são precisas, completas e atualizadas. Informações imprecisas, incompletas ou desatualizadas podem resultar no encerramento imediato da sua conta no Serviço.
              </p>
              <h4 className="text-white/90 font-medium text-base mt-6 mb-2">2. Privacidade e Proteção de Dados</h4>
              <p>
                Nossa Política de Privacidade explica como coletamos, usamos e protegemos as informações que você fornece ao usar nosso Serviço. Ao usar nosso Serviço, você concorda com a coleta e uso de informações de acordo com esta política.
              </p>
              <h4 className="text-white/90 font-medium text-base mt-6 mb-2">3. Segurança</h4>
              <p>
                A segurança de sua conta é importante para nós, mas lembre-se de que nenhum método de transmissão pela Internet ou método de armazenamento eletrônico é 100% seguro. Enquanto nos esforçamos para usar meios comercialmente aceitáveis para proteger suas informações pessoais, não podemos garantir sua segurança absoluta.
              </p>
              <h4 className="text-white/90 font-medium text-base mt-6 mb-2">4. Limitação de Responsabilidade</h4>
              <p>
                Em nenhum caso nossa empresa, nossos diretores, executivos, funcionários, afiliados, agentes, contratados, estagiários, fornecedores, prestadores de serviços ou licenciadores serão responsáveis por quaisquer danos diretos, indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo, mas não se limitando a, perda de lucros, dados, uso, boa vontade, ou outras perdas intangíveis, resultantes do uso ou da incapacidade de usar o serviço.
              </p>
              <h4 className="text-white/90 font-medium text-base mt-6 mb-2">5. Alterações</h4>
              <p>
                Reservamo-nos o direito, a nosso exclusivo critério, de modificar ou substituir estes Termos a qualquer momento. Se uma revisão for material, tentaremos fornecer um aviso com pelo menos 30 dias de antecedência antes que quaisquer novos termos entrem em vigor.
              </p>
              <h4 className="text-white/90 font-medium text-base mt-6 mb-2">6. Contato</h4>
              <p>
                Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco através do e-mail suporte@profeyes.com.
              </p>
            </div>
          </ScrollArea>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowTermsModal(false)} variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white/80">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Settings;
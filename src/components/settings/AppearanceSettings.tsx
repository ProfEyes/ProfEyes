import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Palette, Monitor, Moon, Sun, Sparkles, Zap, EyeOff, CircleDashed, CircleDot, Layers, LayoutGrid } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Theme = "dark" | "light" | "system";

// Componente para card de tema de aparência
const ThemeCard = ({ 
  theme, 
  active, 
  icon, 
  title, 
  description, 
  onClick,
  color = "indigo"
}: { 
  theme: Theme, 
  active: boolean, 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  onClick: () => void,
  color?: string 
}) => {
  const colorMap: Record<string, string> = {
    indigo: "ring-indigo-500/80",
    blue: "ring-blue-500/80",
    rose: "ring-rose-500/80",
    amber: "ring-amber-500/80",
    purple: "ring-purple-500/80"
  };

  const ringColor = colorMap[color] || colorMap.indigo;

  return (
    <motion.div 
      className={cn(
        "relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300",
        "bg-slate-900/60 border border-slate-800 backdrop-blur-xl",
        active ? `ring-2 ${ringColor} ring-offset-2 ring-offset-black/90` : 'hover:ring-1 hover:ring-slate-700'
      )}
      whileHover={{ scale: 1.03, y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative p-4 text-center h-full">
        <div className="flex flex-col items-center justify-center space-y-2 p-4">
          <motion.div 
            className={cn(
              "rounded-full p-3 mb-2 border",
              active ? "bg-slate-800 border-slate-700" : "bg-black/40 border-slate-800"
            )}
            whileHover={{ rotate: 15 }}
            animate={active ? { 
              y: [0, -5, 0],
              scale: [1, 1.05, 1]
            } : {}}
            transition={{ 
              duration: 1, 
              repeat: active ? Infinity : 0, 
              repeatDelay: 3 
            }}
          >
            {icon}
          </motion.div>
          <h3 className="font-medium text-white/90">{title}</h3>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
        
        {/* Indicador selecionado */}
        {active && (
          <motion.div 
            className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 via-indigo-400 to-indigo-600"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>
    </motion.div>
  );
};

export function AppearanceSettings() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [reduceAnimations, setReduceAnimations] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [blurLevel, setBlurLevel] = useState(50);
  const [transparencyLevel, setTransparencyLevel] = useState(70);
  const [activeTab, setActiveTab] = useState("temas");
  const { t } = useLanguage();
  
  // Carregar tema salvo
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme");
    if (savedTheme === "dark" || savedTheme === "light" || savedTheme === "system") {
      setTheme(savedTheme);
    }
    
    const savedReduceAnimations = localStorage.getItem("reduce-animations");
    if (savedReduceAnimations !== null) {
      setReduceAnimations(savedReduceAnimations === "true");
    }
    
    const savedHighContrast = localStorage.getItem("high-contrast");
    if (savedHighContrast !== null) {
      setHighContrastMode(savedHighContrast === "true");
    }
    
    const savedBlurLevel = localStorage.getItem("blur-level");
    if (savedBlurLevel !== null) {
      setBlurLevel(parseInt(savedBlurLevel));
    }
    
    const savedTransparencyLevel = localStorage.getItem("transparency-level");
    if (savedTransparencyLevel !== null) {
      setTransparencyLevel(parseInt(savedTransparencyLevel));
    }
  }, []);
  
  // Salvar e aplicar tema
  const handleThemeChange = (value: Theme) => {
    setTheme(value);
    localStorage.setItem("app-theme", value);
    
    // Aplicar tema ao documento
    if (value === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      document.documentElement.classList.toggle("dark", systemTheme === "dark");
      document.documentElement.setAttribute('data-theme', systemTheme);
    } else {
      document.documentElement.classList.toggle("dark", value === "dark");
      document.documentElement.setAttribute('data-theme', value);
    }
    
    // Disparar evento para avisar o sistema sobre a mudança de tema
    window.dispatchEvent(new CustomEvent('theme-change', { detail: value }));
    
    toast.success("Tema atualizado", {
      description: `O tema foi alterado para ${
        value === "dark" ? "escuro" : value === "light" ? "claro" : "sistema"
      }.`
    });
  };
  
  // Salvar e aplicar redução de animações
  const handleReduceAnimationsChange = (checked: boolean) => {
    setReduceAnimations(checked);
    localStorage.setItem("reduce-animations", String(checked));
    
    if (checked) {
      document.documentElement.classList.add("reduce-animations");
      document.documentElement.style.setProperty('--animation-duration', '0s');
    } else {
      document.documentElement.classList.remove("reduce-animations");
      document.documentElement.style.setProperty('--animation-duration', '0.3s');
    }
    
    // Disparar evento para avisar o sistema sobre a mudança de animações
    window.dispatchEvent(new CustomEvent('animation-setting-change', { detail: checked }));
  };
  
  // Salvar e aplicar modo de alto contraste
  const handleHighContrastChange = (checked: boolean) => {
    setHighContrastMode(checked);
    localStorage.setItem("high-contrast", String(checked));
    
    if (checked) {
      document.documentElement.classList.add("high-contrast");
      document.documentElement.style.setProperty('--contrast-factor', '1.5');
    } else {
      document.documentElement.classList.remove("high-contrast");
      document.documentElement.style.setProperty('--contrast-factor', '1');
    }
    
    // Disparar evento para avisar o sistema sobre a mudança de contraste
    window.dispatchEvent(new CustomEvent('contrast-setting-change', { detail: checked }));
  };
  
  // Salvar e aplicar nível de blur
  const handleBlurLevelChange = (value: number[]) => {
    const level = value[0];
    setBlurLevel(level);
    localStorage.setItem("blur-level", String(level));
    
    // Aplicar nível de blur ao documento
    document.documentElement.style.setProperty('--blur-factor', `${level * 0.05}px`);
    
    const blurClass = document.documentElement.classList;
    ["blur-low", "blur-medium", "blur-high"].forEach(cls => blurClass.remove(cls));
    
    if (level < 33) {
      blurClass.add("blur-low");
      document.documentElement.style.setProperty('--blur-amount', '4px');
    } else if (level < 66) {
      blurClass.add("blur-medium");
      document.documentElement.style.setProperty('--blur-amount', '8px');
    } else {
      blurClass.add("blur-high");
      document.documentElement.style.setProperty('--blur-amount', '12px');
    }
    
    // Disparar evento para avisar o sistema sobre a mudança de blur
    window.dispatchEvent(new CustomEvent('blur-setting-change', { detail: level }));
  };
  
  // Salvar e aplicar nível de transparência
  const handleTransparencyLevelChange = (value: number[]) => {
    const level = value[0];
    setTransparencyLevel(level);
    localStorage.setItem("transparency-level", String(level));
    
    // Aplicar nível de transparência ao documento
    const transparencyValue = level / 100;
    document.documentElement.style.setProperty('--transparency-factor', String(transparencyValue));
    
    const transparencyClass = document.documentElement.classList;
    ["transparency-low", "transparency-medium", "transparency-high"].forEach(cls => transparencyClass.remove(cls));
    
    if (level < 33) {
      transparencyClass.add("transparency-low");
      document.documentElement.style.setProperty('--bg-opacity', '0.9');
    } else if (level < 66) {
      transparencyClass.add("transparency-medium");
      document.documentElement.style.setProperty('--bg-opacity', '0.7');
    } else {
      transparencyClass.add("transparency-high");
      document.documentElement.style.setProperty('--bg-opacity', '0.5');
    }
    
    // Disparar evento para avisar o sistema sobre a mudança de transparência
    window.dispatchEvent(new CustomEvent('transparency-setting-change', { detail: level }));
  };

  // Pré-visualização das configurações
  const resetToDefaults = () => {
    handleThemeChange("dark");
    handleReduceAnimationsChange(false);
    handleHighContrastChange(false);
    handleBlurLevelChange([50]);
    handleTransparencyLevelChange([70]);
    
    toast.success("Configurações padrão restauradas", {
      description: "Todas as configurações de aparência foram redefinidas para os valores padrão."
    });
  };

  return (
    <>
      <SettingsSection
        title="Personalização Visual"
        description="Adapte a aparência da plataforma ao seu estilo"
        icon={<Palette className="h-5 w-5 text-rose-400" />}
        accentColor="rose"
      >
        <Tabs 
          defaultValue={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full"
        >
          {/* Abas de configuração */}
          <TabsList className="grid grid-cols-3 bg-black/30 rounded-xl p-1 mb-6 border border-slate-800/60">
            <TabsTrigger 
              value="temas" 
              className="rounded-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600/30 data-[state=active]:to-rose-600/10 data-[state=active]:shadow-sm py-2"
            >
              <Palette className="h-4 w-4 mr-2 text-rose-400" />
              Temas
            </TabsTrigger>
            <TabsTrigger 
              value="transparencia" 
              className="rounded-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600/30 data-[state=active]:to-rose-600/10 data-[state=active]:shadow-sm py-2"
            >
              <EyeOff className="h-4 w-4 mr-2 text-rose-400" />
              Transparência
            </TabsTrigger>
            <TabsTrigger 
              value="efeitos" 
              className="rounded-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600/30 data-[state=active]:to-rose-600/10 data-[state=active]:shadow-sm py-2"
            >
              <Sparkles className="h-4 w-4 mr-2 text-rose-400" />
              Efeitos
            </TabsTrigger>
          </TabsList>
          
          {/* Conteúdo de Temas */}
          <TabsContent value="temas" className="focus-visible:outline-none focus-visible:ring-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Tema Escuro */}
              <ThemeCard
                theme="dark"
                active={theme === 'dark'}
                icon={<Moon className="h-5 w-5 text-rose-400" />}
                title="Escuro"
                description="Modo noturno"
                  onClick={() => handleThemeChange('dark')}
                color="rose"
              />
              
              {/* Tema Claro */}
              <ThemeCard
                theme="light"
                active={theme === 'light'}
                icon={<Sun className="h-5 w-5 text-amber-400" />}
                title="Claro"
                description="Modo diurno"
                onClick={() => handleThemeChange('light')}
                color="amber"
              />
              
              {/* Tema Sistema */}
              <ThemeCard
                theme="system"
                active={theme === 'system'}
                icon={<Monitor className="h-5 w-5 text-blue-400" />}
                title="Sistema"
                description="Segue as configurações do sistema"
                onClick={() => handleThemeChange('system')}
                color="blue"
              />
                    </div>
                    
            <div className="mt-8">
              <p className="text-sm text-slate-400 mb-4">
                O tema escolhido afeta a aparência geral da plataforma. O tema escuro é ótimo para ambientes com pouca luz e reduz o cansaço visual.
              </p>
                    </div>
          </TabsContent>
          
          {/* Conteúdo de Transparência */}
          <TabsContent value="transparencia" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-8">
              {/* Controle de Transparência */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <Label htmlFor="transparency-level" className="text-sm font-medium text-slate-200">
                      Nível de transparência
                    </Label>
                    <p className="text-xs text-slate-400 mt-1">
                      Ajuste o nível de transparência dos elementos da interface
                    </p>
                  </div>
                  <span className="text-sm font-medium text-rose-400">{transparencyLevel}%</span>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-slate-900/50 to-black/50 rounded-lg opacity-30"></div>
                  <Slider
                    id="transparency-level"
                    defaultValue={[transparencyLevel]}
                    max={100}
                    step={5}
                    onValueChange={handleTransparencyLevelChange}
                    className="pt-1 z-10 relative"
                  />
                    </div>
                    
                {/* Prévia de transparência */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="relative border border-slate-800/40 bg-slate-900/30 rounded-lg p-3 text-center">
                    <p className="text-xs font-medium">Baixa</p>
                    <p className="text-[9px] text-slate-400">10%</p>
                  </div>
                  <div className="relative border border-slate-800/40 bg-slate-900/60 rounded-lg p-3 text-center">
                    <p className="text-xs font-medium">Média</p>
                    <p className="text-[9px] text-slate-400">50%</p>
                    </div>
                  <div className="relative border border-slate-800/40 bg-slate-900/90 rounded-lg p-3 text-center">
                    <p className="text-xs font-medium">Alta</p>
                    <p className="text-[9px] text-slate-400">90%</p>
                  </div>
                </div>
              </div>
                
              {/* Controle de Blur */}
              <div className="space-y-6 pt-4">
                <Separator className="bg-slate-800/40 my-6" />
                
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <Label htmlFor="blur-level" className="text-sm font-medium text-slate-200">
                      Efeito de desfoque (blur)
                    </Label>
                    <p className="text-xs text-slate-400 mt-1">
                      Ajuste a intensidade do efeito de desfoque em fundos e elementos
                    </p>
                  </div>
                  <span className="text-sm font-medium text-rose-400">{blurLevel}%</span>
                      </div>
                
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-slate-900/50 to-black/50 rounded-lg opacity-30"></div>
                  <Slider
                    id="blur-level"
                    defaultValue={[blurLevel]}
                    max={100}
                    step={5}
                    onValueChange={handleBlurLevelChange}
                    className="pt-1 z-10 relative"
                  />
                    </div>
                    
                {/* Prévia de blur */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="relative overflow-hidden border border-slate-800/40 bg-slate-900/30 rounded-lg p-3 text-center">
                    <p className="text-xs font-medium">Sutil</p>
                    <div className="absolute inset-0 backdrop-blur-[2px]"></div>
                      </div>
                  <div className="relative overflow-hidden border border-slate-800/40 bg-slate-900/30 rounded-lg p-3 text-center">
                    <p className="text-xs font-medium">Médio</p>
                    <div className="absolute inset-0 backdrop-blur-[8px]"></div>
                    </div>
                  <div className="relative overflow-hidden border border-slate-800/40 bg-slate-900/30 rounded-lg p-3 text-center">
                    <p className="text-xs font-medium">Intenso</p>
                    <div className="absolute inset-0 backdrop-blur-[16px]"></div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Conteúdo de Efeitos */}
          <TabsContent value="efeitos" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-8">
              <div className="divide-y divide-slate-800/40 space-y-4">
                {/* Redução de animações */}
                <div className="flex items-center justify-between pb-4">
                  <div>
                    <Label htmlFor="reduce-animations" className="text-sm font-medium text-slate-200">
                      Reduzir animações
                    </Label>
                    <p className="text-xs text-slate-400 mt-1">
                      Diminui ou desativa efeitos animados na interface
                    </p>
                  </div>
                  <Switch
                    id="reduce-animations"
                    checked={reduceAnimations}
                    onCheckedChange={handleReduceAnimationsChange}
                    className="data-[state=checked]:bg-rose-600"
                  />
                </div>
              
                {/* Alto contraste */}
                <div className="flex items-center justify-between py-4">
                  <div>
                    <Label htmlFor="high-contrast" className="text-sm font-medium text-slate-200">
                      Modo de alto contraste
                    </Label>
                    <p className="text-xs text-slate-400 mt-1">
                      Aumenta o contraste entre elementos para melhor visualização
                    </p>
                  </div>
                  <Switch
                    id="high-contrast"
                    checked={highContrastMode}
                    onCheckedChange={handleHighContrastChange}
                    className="data-[state=checked]:bg-rose-600"
                  />
                </div>
                
                {/* Separador */}
                <div className="pt-4"></div>
              </div>
              
              {/* Animações de demonstração */}
              {!reduceAnimations && (
                <div className="pt-2">
                  <p className="text-sm text-slate-400 mb-4">
                    Prévia de animações
                  </p>
                  
                  <div className="grid grid-cols-4 gap-3">
                    <motion.div 
                      className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4 flex justify-center items-center"
                      animate={{ 
                        y: [0, -10, 0],
                        opacity: [1, 0.8, 1]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        repeatDelay: 0.5
                      }}
                    >
                      <Zap className="h-6 w-6 text-amber-400" />
                    </motion.div>
                    
                    <motion.div 
                      className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4 flex justify-center items-center"
                      animate={{ 
                        rotate: [0, 180, 360],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        repeatDelay: 1
                      }}
                    >
                      <CircleDashed className="h-6 w-6 text-rose-400" />
                    </motion.div>
                    
                    <motion.div 
                      className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4 flex justify-center items-center"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        repeatDelay: 0.5
                      }}
                    >
                      <Sparkles className="h-6 w-6 text-indigo-400" />
                    </motion.div>
                    
                    <motion.div 
                      className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4 flex justify-center items-center"
                      animate={{ 
                        x: [-5, 5, -5],
                        rotateZ: [-5, 5, -5]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        repeatDelay: 0.3
                      }}
                    >
                      <LayoutGrid className="h-6 w-6 text-teal-400" />
              </motion.div>
                  </div>
                </div>
              )}
              
              {reduceAnimations && (
                <div className="rounded-lg border border-slate-800 p-4 bg-black/20">
                  <p className="text-center text-sm text-slate-400">
                    Animações reduzidas para melhor desempenho e acessibilidade
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Botões de ação */}
        <div className="flex justify-end pt-6">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className="text-sm border-slate-700 bg-slate-900/50 hover:bg-slate-800/70 text-slate-300"
          >
            Restaurar Padrões
          </Button>
        </div>
      </SettingsSection>
    </>
  );
} 
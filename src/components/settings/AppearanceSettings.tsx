import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Palette, Monitor, Moon, Sun, Sparkles, Zap, EyeOff } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type Theme = "dark" | "light" | "system";

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
    } else {
      document.documentElement.classList.toggle("dark", value === "dark");
    }
    
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
    } else {
      document.documentElement.classList.remove("reduce-animations");
    }
  };
  
  // Salvar e aplicar modo de alto contraste
  const handleHighContrastChange = (checked: boolean) => {
    setHighContrastMode(checked);
    localStorage.setItem("high-contrast", String(checked));
    
    if (checked) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  };
  
  // Salvar e aplicar nível de blur
  const handleBlurLevelChange = (value: number[]) => {
    const level = value[0];
    setBlurLevel(level);
    localStorage.setItem("blur-level", String(level));
    
    // Aqui você poderia aplicar a alteração ao documento também
    const blurClass = document.documentElement.classList;
    ["blur-low", "blur-medium", "blur-high"].forEach(cls => blurClass.remove(cls));
    
    if (level < 33) {
      blurClass.add("blur-low");
    } else if (level < 66) {
      blurClass.add("blur-medium");
    } else {
      blurClass.add("blur-high");
    }
  };
  
  // Salvar e aplicar nível de transparência
  const handleTransparencyLevelChange = (value: number[]) => {
    const level = value[0];
    setTransparencyLevel(level);
    localStorage.setItem("transparency-level", String(level));
    
    // Aqui você poderia aplicar a alteração ao documento também
    const transparencyClass = document.documentElement.classList;
    ["transparency-low", "transparency-medium", "transparency-high"].forEach(cls => transparencyClass.remove(cls));
    
    if (level < 33) {
      transparencyClass.add("transparency-low");
    } else if (level < 66) {
      transparencyClass.add("transparency-medium");
    } else {
      transparencyClass.add("transparency-high");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <SettingsSection
        title="Personalização Visual"
        description="Adapte a aparência da plataforma ao seu estilo"
        icon={<Palette className="h-5 w-5 text-rose-400/70" />}
      >
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 bg-black/20 rounded-xl p-1 mb-6 border border-white/5">
            <TabsTrigger 
              value="temas" 
              className="rounded-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500/20 data-[state=active]:to-amber-500/20 data-[state=active]:shadow-sm py-2"
            >
              <Palette className="h-4 w-4 mr-2" />
              Temas
            </TabsTrigger>
            <TabsTrigger 
              value="transparencia" 
              className="rounded-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500/20 data-[state=active]:to-amber-500/20 data-[state=active]:shadow-sm py-2"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Transparência
            </TabsTrigger>
            <TabsTrigger 
              value="efeitos" 
              className="rounded-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500/20 data-[state=active]:to-amber-500/20 data-[state=active]:shadow-sm py-2"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Efeitos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="temas" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Tema Escuro */}
                <motion.div 
                  className={cn(
                    "relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300",
                    theme === 'dark' 
                      ? 'ring-2 ring-rose-500/80 ring-offset-2 ring-offset-black/90' 
                      : 'hover:ring-1 hover:ring-white/20'
                  )}
                  whileHover={{ scale: 1.03, y: -3 }}
                  onClick={() => handleThemeChange('dark')}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-black/90 to-slate-900/90"></div>
                  <div className="relative p-4 text-center h-full">
                    <div className="flex flex-col items-center justify-center space-y-2 p-4">
                      <motion.div 
                        className="rounded-full bg-black/70 p-3 mb-2 border border-white/10"
                        whileHover={{ rotate: 15 }}
                        animate={{ y: theme === 'dark' ? [0, -5, 0] : 0 }}
                        transition={{ duration: 1, repeat: theme === 'dark' ? Infinity : 0, repeatDelay: 3 }}
                      >
                        <Moon className="h-5 w-5 text-rose-300/80" />
                      </motion.div>
                      <h3 className="font-medium text-white/90">Escuro</h3>
                      <p className="text-xs text-white/50">Modo noturno</p>
                    </div>
                    
                    {/* Mini preview */}
                    <div className="bg-black/50 border border-white/10 rounded-lg p-3 mt-2">
                      <div className="h-2 w-16 bg-white/10 rounded mb-2"></div>
                      <div className="h-2 w-12 bg-white/10 rounded"></div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Tema Claro */}
                <motion.div 
                  className={cn(
                    "relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300",
                    theme === 'light' 
                      ? 'ring-2 ring-amber-500/80 ring-offset-2 ring-offset-black/90' 
                      : 'hover:ring-1 hover:ring-white/20'
                  )}
                  whileHover={{ scale: 1.03, y: -3 }}
                  onClick={() => handleThemeChange('light')}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-100/90 to-slate-200/90"></div>
                  <div className="relative p-4 text-center h-full">
                    <div className="flex flex-col items-center justify-center space-y-2 p-4">
                      <motion.div 
                        className="rounded-full bg-white/80 p-3 mb-2 border border-black/5 shadow-sm"
                        whileHover={{ rotate: 15 }}
                        animate={{ y: theme === 'light' ? [0, -5, 0] : 0 }}
                        transition={{ duration: 1, repeat: theme === 'light' ? Infinity : 0, repeatDelay: 3 }}
                      >
                        <Sun className="h-5 w-5 text-amber-500/90" />
                      </motion.div>
                      <h3 className="font-medium text-slate-800">Claro</h3>
                      <p className="text-xs text-slate-600">Modo diurno</p>
                    </div>
                    
                    {/* Mini preview */}
                    <div className="bg-white/80 border border-slate-200 rounded-lg p-3 mt-2 shadow-sm">
                      <div className="h-2 w-16 bg-slate-200 rounded mb-2"></div>
                      <div className="h-2 w-12 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Tema Sistema */}
                <motion.div 
                  className={`relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 ${theme === 'system' ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-black/80' : 'hover:ring-1 hover:ring-emerald-500/50'}`}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleThemeChange('system')}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-700/80 to-slate-800/90"></div>
                  <div className="relative p-4 text-center h-full">
                    <div className="flex flex-col items-center justify-center space-y-2 p-4">
                      <div className="rounded-full bg-slate-600/70 p-2 mb-2">
                        <Monitor className="h-5 w-5 text-emerald-400" />
                      </div>
                      <h3 className="font-medium text-white">Sistema</h3>
                      <p className="text-xs text-white/60">Sincronizado</p>
                    </div>
                    
                    {/* Mini preview */}
                    <div className="bg-slate-800/80 border border-slate-700/50 rounded-lg p-2 mt-2">
                      <div className="flex space-x-2">
                        <div className="h-2 w-8 bg-slate-700/80 rounded"></div>
                        <div className="h-2 w-8 bg-white/20 rounded"></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="efeitos" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-6">
              {/* Reduzir Animações */}
              <motion.div 
                whileHover={{ y: -2 }}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm p-4"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/5 via-transparent to-transparent rounded-bl-full"></div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-400" />
                      <Label className="text-base font-medium text-white/90">Reduzir Animações</Label>
                    </div>
                    <p className="text-sm text-white/50 max-w-md">Minimiza os efeitos animados em toda a plataforma para melhorar o desempenho e reduzir distrações</p>
                  </div>
                  <Switch
                    checked={reduceAnimations}
                    onCheckedChange={handleReduceAnimationsChange}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>
              </motion.div>
              
              <Separator className="bg-white/5 my-6" />
              
              {/* Alto Contraste */}
              <motion.div 
                whileHover={{ y: -2 }}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm p-4"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/5 via-transparent to-transparent rounded-bl-full"></div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-blue-400" />
                      <Label className="text-base font-medium text-white/90">Modo de Alto Contraste</Label>
                    </div>
                    <p className="text-sm text-white/50 max-w-md">Aumenta o contraste entre elementos para melhorar a acessibilidade e leitura em diferentes condições</p>
                  </div>
                  <Switch
                    checked={highContrastMode}
                    onCheckedChange={handleHighContrastChange}
                    className="data-[state=checked]:bg-blue-500"
                  />
                </div>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </SettingsSection>
    </motion.div>
  );
} 
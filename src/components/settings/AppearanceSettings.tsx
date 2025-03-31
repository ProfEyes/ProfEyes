import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Palette, Monitor, Moon, Sun, Layout as LayoutIcon } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

type Theme = "dark" | "light" | "system";

export function AppearanceSettings() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [reduceAnimations, setReduceAnimations] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);
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

  return (
    <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
      <SettingsSection
        title="Aparência"
        description="Personalize a aparência do aplicativo"
        icon={<Palette className="h-4 w-4 text-purple-400" />}
        className="bg-gradient-to-br from-purple-900/10 via-black/20 to-black/30"
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <Label className="text-white/90 font-medium">Tema</Label>
            <RadioGroup value={theme} onValueChange={(value) => handleThemeChange(value as Theme)}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark" className="cursor-pointer flex items-center gap-2">
                    <Moon className="h-4 w-4 text-blue-400" />
                    Escuro
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light" className="cursor-pointer flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-400" />
                    Claro
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                  <RadioGroupItem value="system" id="system" />
                  <Label htmlFor="system" className="cursor-pointer flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-emerald-400" />
                    Sistema
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          
        <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-white/90">Reduzir Animações</Label>
                <p className="text-xs text-white/50">Diminui ou desativa efeitos de animação</p>
            </div>
              <Switch
                checked={reduceAnimations}
                onCheckedChange={handleReduceAnimationsChange}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-white/90">Modo de Alto Contraste</Label>
                <p className="text-xs text-white/50">Aumenta o contraste para melhor visibilidade</p>
              </div>
              <Switch
                checked={highContrastMode}
                onCheckedChange={handleHighContrastChange}
              />
            </div>
          </div>
        </div>
      </SettingsSection>
    </motion.div>
  );
} 
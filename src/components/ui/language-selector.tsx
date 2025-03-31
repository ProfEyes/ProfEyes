import { Language, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LanguageSelectorProps {
  variant?: "minimal" | "full";
  className?: string;
}

export function LanguageSelector({ variant = "full", className = "" }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = (value: string) => {
    if (value === "pt" || value === "en" || value === "es") {
      setLanguage(value);
    }
  };

  // Versão minimal (apenas ícone e select)
  if (variant === "minimal") {
    return (
      <div className={`flex items-center ${className}`}>
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-[70px] bg-black/30 border-white/10">
            <div className="flex items-center gap-2">
              <Globe className="h-3 w-3 text-white/70" />
              <span className="uppercase">{language}</span>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-black/90 border-white/10">
            <SelectItem value="pt">PT</SelectItem>
            <SelectItem value="en">EN</SelectItem>
            <SelectItem value="es">ES</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Versão completa para a página de configurações
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-sm font-medium text-white/70">
        {t('settings.language.select')}
      </label>
      
      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-full bg-black/30 border-white/10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-black/90 border-white/10">
          <SelectItem value="pt">
            <div className="flex items-center gap-2">
              <span className="w-6">🇧🇷</span>
              {t('settings.language.pt')}
            </div>
          </SelectItem>
          <SelectItem value="en">
            <div className="flex items-center gap-2">
              <span className="w-6">🇺🇸</span>
              {t('settings.language.en')}
            </div>
          </SelectItem>
          <SelectItem value="es">
            <div className="flex items-center gap-2">
              <span className="w-6">🇪🇸</span>
              {t('settings.language.es')}
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
} 
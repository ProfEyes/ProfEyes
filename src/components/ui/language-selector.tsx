import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronDown, Check, Globe } from "lucide-react";
import { motion } from "framer-motion";

interface LanguageOption {
  code: string;
  name: string;
  icon: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { 
    code: "pt", 
    name: "Português",
    icon: "🇧🇷",
    flag: "https://flagcdn.com/br.svg"
  },
  { 
    code: "en", 
    name: "English",
    icon: "🇺🇸",
    flag: "https://flagcdn.com/us.svg"
  },
  { 
    code: "es", 
    name: "Español",
    icon: "🇪🇸",
    flag: "https://flagcdn.com/es.svg"
  }
];

export function LanguageSelector() {
  const { language, changeLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  
  // Encontrar o idioma atual
  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          role="combobox" 
          aria-expanded={open}
          className="w-full justify-between bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border-white/10 hover:bg-white/15 hover:border-white/20 transition-all duration-300 group"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-md shadow-md">
              <span className="flex h-full w-full items-center justify-center rounded-md bg-black/20 border border-white/10 p-0.5">
                <span className="text-lg">{currentLanguage.icon}</span>
              </span>
            </span>
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-medium text-white/90">{currentLanguage.name}</span>
              <span className="text-xs text-white/60">Idioma Atual</span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100 transition-all duration-200" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-full min-w-[18rem] overflow-hidden p-1 bg-gradient-to-br from-black/80 to-black/90 backdrop-blur-lg border border-white/10 shadow-xl"
      >
        <div className="py-2 px-3 text-xs font-medium text-white/50 border-b border-white/10 mb-1 flex items-center gap-1.5">
          <Globe className="h-3 w-3" />
          Escolha seu idioma
        </div>
        {languages.map((lang) => (
          <motion.div
            key={lang.code}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.2 }}
          >
            <DropdownMenuItem
              className={`p-2.5 rounded-lg focus:bg-white/10 hover:bg-white/10 cursor-pointer my-1 group ${language === lang.code ? 'bg-white/5' : ''}`}
              onClick={() => {
                changeLanguage(lang.code);
                setOpen(false);
              }}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="relative w-10 h-10 overflow-hidden rounded-md shadow-md">
                  <img 
                    src={lang.flag} 
                    alt={lang.name} 
                    className="w-full h-full object-cover border border-white/10 group-hover:border-white/20 transition-all duration-200"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white/90">{lang.name}</p>
                  <p className="text-xs text-white/50">{lang.code.toUpperCase()}</p>
                </div>
                {language === lang.code && (
                  <div className="h-5 w-5 rounded-full bg-indigo-600/80 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            </DropdownMenuItem>
          </motion.div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 
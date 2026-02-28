import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Globe, ChevronDown, X } from 'lucide-react';

// Usando imagens em vez de emojis
const languageFlags = {
  pt: "/images/flags/brazil.png",
  en: "/images/flags/usa.png",
  es: "/images/flags/spain.png"
};

export const LanguageSwitcher = () => {
  const { language, changeLanguage, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (languageCode: string) => {
    changeLanguage(languageCode as Language);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "rounded-full w-12 h-12 shadow-lg flex items-center justify-center",
          "bg-indigo-600 hover:bg-indigo-700 transition-colors",
          "border-4 border-slate-900"
        )}
        aria-label="Mudar idioma"
      >
        {isOpen ? 
          <X className="h-5 w-5 text-white" /> : 
          <Globe className="h-5 w-5 text-white" />
        }
      </Button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            transition={{ type: "spring", duration: 0.4 }}
            className={cn(
              "absolute bottom-16 right-0 p-2 rounded-lg shadow-xl w-48",
              "bg-slate-900/95 backdrop-blur-md border border-slate-800"
            )}
          >
            <div className="text-sm font-medium text-slate-300 px-2 py-2 border-b border-slate-800/80">
              Selecionar idioma
            </div>
            <div className="mt-2 space-y-1">
              {availableLanguages.map((lang) => (
                <motion.button
                  key={lang.code}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md",
                    "transition-colors duration-200",
                    "text-left",
                    language === lang.code 
                      ? "bg-indigo-600/20 text-indigo-300" 
                      : "text-slate-300 hover:bg-slate-800/70",
                  )}
                >
                  <div className="relative w-6 h-6 mr-1">
                    <img 
                      src={languageFlags[lang.code as keyof typeof languageFlags]} 
                      alt={`Bandeira ${lang.name}`} 
                      className={cn(
                        "w-6 h-6 rounded-sm object-cover",
                        // Aplicando filtro verde apenas para a bandeira do Brasil (pt)
                        lang.code === "pt" ? "filter hue-rotate-90 brightness-110 saturate-150" : ""
                      )}
                    />
                  </div>
                  <span className="flex-1">{lang.name}</span>
                  {language === lang.code && (
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 
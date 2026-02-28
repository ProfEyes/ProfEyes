import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogTrigger
} from "@/components/ui/dialog";
import { TrendingUp, Shield, BarChart3, ArrowRight, Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAuthTranslations } from "@/utils/authTranslations";

interface InvestorTypeOption {
  code: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

// Função para obter a cor de glow específica de cada perfil
const getGlowColor = (typeCode: string) => {
  switch (typeCode) {
    case "arrojado":
      return "shadow-[#B22222]/35";
    case "moderado":
      return "shadow-amber-400/30";
    case "conservador":
      return "shadow-blue-400/30";
    default:
      return "shadow-white/5";
  }
};

// Função para obter a cor de background glow do perfil
const getBgGlow = (typeCode: string) => {
  switch (typeCode) {
    case "arrojado":
      return "bg-gradient-to-br from-[#B22222]/25 via-[#B22222]/15 to-[#8B1A1A]/8";
    case "moderado":
      return "bg-gradient-to-br from-amber-500/20 via-amber-400/12 to-orange-600/5";
    case "conservador":
      return "bg-gradient-to-br from-blue-500/20 via-blue-400/12 to-blue-600/5";
    default:
      return "bg-white/5";
  }
};

export interface InvestorTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function InvestorTypeSelector({ value, onChange, error }: InvestorTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const { language } = useLanguage();
  const authT = getAuthTranslations(language);
  
  // Criar tipos de investidor com traduções
  const investorTypesTranslated: InvestorTypeOption[] = [
    {
      code: "arrojado",
      name: authT.aggressiveInvestor,
      description: authT.aggressiveDescription,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-[#E34F4F]",
      bgColor: "bg-[#B22222]/8",
      borderColor: "border-[#B22222]/40"
    },
    {
      code: "moderado", 
      name: authT.moderateInvestor,
      description: authT.moderateDescription,
      icon: <BarChart3 className="h-5 w-5" />,
      color: "text-amber-400",
      bgColor: "bg-amber-500/8",
      borderColor: "border-amber-500/40"
    },
    {
      code: "conservador",
      name: authT.conservativeInvestor, 
      description: authT.conservativeDescription,
      icon: <Shield className="h-5 w-5" />,
      color: "text-blue-400",
      bgColor: "bg-blue-500/8",
      borderColor: "border-blue-500/40"
    }
  ];
  
  // Encontrar o perfil atual
  const currentType = investorTypesTranslated.find(type => type.code === value);
  
  // Função para alterar o perfil
  const handleTypeChange = (typeCode: string) => {
    onChange(typeCode);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className={cn(
              "w-full h-11 bg-black/30 border border-white/5 hover:bg-black/40 hover:border-white/10 transition-all duration-300 shadow-sm rounded-lg group",
              currentType ? `hover:shadow-lg ${getGlowColor(currentType.code)}` : "hover:shadow-md hover:shadow-white/5",
              error && "border-[#B22222]/50"
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                {/* Ícone */}
                  <div className={cn(
                  "relative h-7 w-7 rounded-full flex items-center justify-center",
                  currentType ? `${currentType.bgColor}` : "bg-black/20"
                )}>
                  {currentType ? (
                    <div className={currentType.color}>
                      {currentType.icon}
                    </div>
                  ) : (
                    <TrendingUp className="h-4 w-4 text-white/40" />
                  )}
                  
                  {/* Sutil efeito de glow */}
                  {currentType && (
                    <div className={cn(
                      "absolute inset-0 rounded-full blur-sm -z-10 opacity-60",
                      getBgGlow(currentType.code)
                    )} />
                  )}
                </div>
                
                {/* Nome do perfil */}
                <span className="text-sm text-white/80">
                  {currentType ? currentType.name : authT.investorType}
                </span>
              </div>
              
              {/* Ícone dropdown */}
              <ChevronDown className="h-4 w-4 text-white/30 group-hover:text-white/60 transition-all duration-300" />
            </div>
          </Button>
        </DialogTrigger>
        
        {/* Modal de seleção redesenhada */}
        <DialogContent className="max-w-md p-0 bg-black/95 backdrop-blur-2xl border border-white/10 shadow-xl rounded-lg overflow-hidden">
          <div className="relative">
            {/* Header com gradiente sutil */}
            <div className="relative px-6 pt-6 pb-5 border-b border-white/5 bg-gradient-to-b from-black/40 to-black/0">
              <h2 className="text-lg font-medium text-white/90 text-center">
                {authT.investorType}
              </h2>
              
              {/* Linha decorativa */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
            
            {/* Conteúdo */}
            <motion.div 
              className="p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid gap-2">
              {investorTypesTranslated.map((type) => (
                <motion.div
                  key={type.code}
                  className={cn(
                      "relative p-3 rounded-md border transition-all duration-300 cursor-pointer group",
                    value === type.code
                        ? `bg-gradient-to-br from-black/60 to-black/40 ${type.borderColor} shadow-sm`
                        : "bg-black/20 border-white/5 hover:bg-black/30 hover:border-white/10"
                  )}
                  onClick={() => handleTypeChange(type.code)}
                  onMouseEnter={() => setHoveredType(type.code)}
                  onMouseLeave={() => setHoveredType(null)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                >
                    {/* Sutil glow effect no hover e quando selecionado */}
                    {(hoveredType === type.code || value === type.code) && (
                      <motion.div
                        className={cn(
                          "absolute inset-0 rounded-md -z-10",
                          getBgGlow(type.code)
                        )}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: value === type.code ? 0.4 : 0.15 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  
                    <div className="flex items-center space-x-3">
                      {/* Ícone */}
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300",
                      value === type.code 
                          ? `${type.bgColor}`
                          : "bg-black/20 group-hover:bg-black/30"
                    )}>
                        <div className={cn(
                          "transition-all duration-300",
                        value === type.code ? type.color : 
                          hoveredType === type.code ? type.color : "text-white/40 group-hover:text-white/60"
                      )}>
                        {type.icon}
                      </div>
                    </div>
                    
                      {/* Informações */}
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <p className={cn(
                            "text-sm font-medium transition-all duration-300 flex items-center",
                            value === type.code ? type.color : "text-white/80"
                        )}>
                          {type.name}
                          </p>
                          <p className="text-xs text-white/50 mt-0.5 line-clamp-1">
                            {type.description}
                          </p>
                        </div>
                        
                        {/* Indicador de selecionado */}
                        {value === type.code && (
                            <div className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center",
                              type.bgColor
                          )}>
                            <Check className={cn("h-3 w-3", type.color)} />
                          </div>
                        )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Erro */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-[#E34F4F] text-xs"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
} 
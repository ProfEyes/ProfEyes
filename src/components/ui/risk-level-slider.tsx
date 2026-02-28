import React, { useState, useEffect } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAuthTranslations } from "@/utils/authTranslations";

export interface RiskLevelSliderProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function RiskLevelSlider({ value, onChange, error }: RiskLevelSliderProps) {
  const { language } = useLanguage();
  const authT = getAuthTranslations(language);
  const [sliderValue, setSliderValue] = useState<number>(50);
  
  // Mapear o valor da string para o slider numérico
  useEffect(() => {
    switch(value) {
      case "conservador":
        setSliderValue(15);
        break;
      case "moderado":
        setSliderValue(50);
        break;
      case "arrojado":
        setSliderValue(85);
        break;
      default:
        setSliderValue(50);
    }
  }, [value]);
  
  // Converter valor do slider para código de perfil
  const handleSliderChange = (newValue: number[]) => {
    const val = newValue[0];
    setSliderValue(val);
    
    let profileCode: string;
    if (val <= 30) {
      profileCode = "conservador";
    } else if (val <= 70) {
      profileCode = "moderado";
    } else {
      profileCode = "arrojado";
    }
    
    if (profileCode !== value) {
      onChange(profileCode);
    }
  };
  
  // Obter cor do perfil atual
  const getProfileColor = () => {
    if (sliderValue <= 30) {
      return "bg-blue-400";
    } else if (sliderValue <= 70) {
      return "bg-amber-400";
    } else {
      return "bg-red-500";
    }
  };
  
  // Obter nome do perfil atual
  const getProfileName = () => {
    if (sliderValue <= 30) {
      return authT.conservativeInvestor;
    } else if (sliderValue <= 70) {
      return authT.moderateInvestor;
    } else {
      return authT.aggressiveInvestor;
    }
  };
  
  const profileColor = getProfileColor();
  
  return (
    <div className="space-y-2">
      <div className="w-full bg-black/20 rounded-lg px-3 pt-3 pb-2.5">
        {/* Slider ultra-minimalista */}
        <SliderPrimitive.Root
          className="relative flex w-full touch-none select-none items-center"
          value={[sliderValue]}
          min={0}
          max={100}
          step={1}
          onValueChange={handleSliderChange}
        >
          <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-black/40 border-t border-white/[0.02]">
            <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-blue-400/70 via-amber-400/70 to-red-500/70" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb 
            className="block h-3.5 w-3.5 rounded-full border border-white/30 shadow-sm bg-white/10 hover:scale-110 hover:bg-white/20 focus:bg-white/20 transition-all focus-visible:outline-none"
          />
        </SliderPrimitive.Root>
        
        {/* Indicadores simplificados */}
        <div className="flex justify-between mt-2 items-center">
          <div className="text-[9px] text-blue-400/80 font-medium">
            CONSERVADOR
          </div>
          <div className="text-[9px] text-amber-400/80 font-medium">
            MODERADO
          </div>
          <div className="text-[9px] text-red-500/80 font-medium">
            ARROJADO
          </div>
        </div>
        
        {/* Mostrador do perfil selecionado */}
        <div className="flex justify-center mt-2">
          <motion.div 
            key={getProfileName()} 
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-full px-3 py-0.5 text-[10px] text-white/80 font-medium border border-white/5 bg-black/40"
          >
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${profileColor}`}></div>
              {getProfileName()}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Mensagem de erro */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-[#E34F4F] text-xs"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
} 
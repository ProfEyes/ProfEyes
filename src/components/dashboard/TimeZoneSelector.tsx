import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTimeZone } from "@/contexts/TimeZoneContext";
import { Check, Globe, ChevronDown, Clock, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { isBackgroundModeEnabled } from '../../utils/visibilityManager';

interface TimeZoneSelectorProps {
  variant?: 'default' | 'compact';
  className?: string;
}

function TimeZoneSelectorImpl({ variant = 'default', className = '' }: TimeZoneSelectorProps) {
  const { t } = useLanguage();
  const { timeZone, setTimeZone, availableTimeZones, isDST, adjustTime, isTimeZoneInDST } = useTimeZone();
  const [open, setOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [currentTime, setCurrentTime] = useState<Record<string, string>>({});
  // Guardar o último conjunto de horários para evitar setState desnecessário
  const lastTimesRef = useRef<Record<string, string>>({});
  const [timeZonesInDST, setTimeZonesInDST] = useState<Record<string, boolean>>({});
  const dstStatesRef = useRef<Record<string, boolean>>({});
  // Refs para valores usados por updateAllTimeZones sem recriar a função
  const availableTimeZonesRef = useRef(availableTimeZones);
  const isTimeZoneInDSTRef = useRef(isTimeZoneInDST);

  useEffect(() => {
    availableTimeZonesRef.current = availableTimeZones;
  }, [availableTimeZones]);

  useEffect(() => {
    isTimeZoneInDSTRef.current = isTimeZoneInDST;
  }, [isTimeZoneInDST]);
  
  // Detectar horários de verão para cada fuso
  useEffect(() => {
    const dstStates: Record<string, boolean> = {};

    availableTimeZones.forEach(tz => {
      dstStates[tz.id] = isTimeZoneInDST(tz);
    });

    // Atualizar estado somente se houver mudança real
    const last = dstStatesRef.current;
    let changed = false;
    const ids = Object.keys(dstStates);
    if (ids.length !== Object.keys(last).length) {
      changed = true;
    } else {
      for (const id of ids) {
        if (last[id] !== dstStates[id]) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      dstStatesRef.current = dstStates;
      setTimeZonesInDST(dstStates);
    }

    // Verificar horário de verão a cada 6 horas
    const dstInterval = setInterval(() => {
      const updatedDstStates: Record<string, boolean> = {};

      availableTimeZones.forEach(tz => {
        updatedDstStates[tz.id] = isTimeZoneInDST(tz);
      });

      // Atualizar somente se mudou
      const lastInner = dstStatesRef.current;
      let innerChanged = false;
      const innerIds = Object.keys(updatedDstStates);
      if (innerIds.length !== Object.keys(lastInner).length) {
        innerChanged = true;
      } else {
        for (const id of innerIds) {
          if (lastInner[id] !== updatedDstStates[id]) {
            innerChanged = true;
            break;
          }
        }
      }

      if (innerChanged) {
        dstStatesRef.current = updatedDstStates;
        setTimeZonesInDST(updatedDstStates);
      }
    }, 6 * 60 * 60 * 1000);

    return () => clearInterval(dstInterval);
  }, [availableTimeZones, isTimeZoneInDST]);
  
  // Função para calcular o horário atual em cada fuso
  // CORREÇÃO: Adicionar array de dependências vazio para garantir que a função
  // não será recriada a cada renderização, evitando o loop infinito
  const updateAllTimeZones = useCallback(() => {
    const now = new Date();
    const times: Record<string, string> = {};

    const zones = availableTimeZonesRef.current;
    zones.forEach(tz => {
      // Obter o offset do fuso
      const offset = tz.offset;
      const offsetHours = parseInt(offset.substring(0, 3));
      const offsetMinutes = parseInt(offset.substring(4, 6)) * (offset.charAt(0) === '-' ? -1 : 1);
      
      // Calcular o UTC
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      
      // Calcular o horário no fuso específico
      const tzTime = new Date(utc + (offsetHours * 60 + offsetMinutes) * 60000);
      
      // Formatar o horário (HH:MM)
      const hours = tzTime.getHours().toString().padStart(2, '0');
      const minutes = tzTime.getMinutes().toString().padStart(2, '0');
      
      times[tz.id] = `${hours}:${minutes}`;
    });
    
    // Atualizar estado somente se houver mudança real nos horários
    const last = lastTimesRef.current;
    let changed = false;
    const tzIds = Object.keys(times);
    if (tzIds.length !== Object.keys(last).length) {
      changed = true;
    } else {
      for (const id of tzIds) {
        if (last[id] !== times[id]) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      lastTimesRef.current = times;
      setCurrentTime(times);
    }
    
    // Evitar logs em dev constantes para não poluir o fluxo de render
  }, []);
  
  // CORREÇÃO: Manter uma referência ao estado "open" que não cause re-renderização
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  
  // TIMER ÚNICO E SIMPLES: Atualização contínua
  useEffect(() => {
    // Atualizar imediatamente
    updateAllTimeZones();
    
    // Timer que atualiza baseado no estado do dropdown
    // Atualizações menos frequentes para evitar forças excessivas no layout (Popper/Dropdown)
    const updateInterval = setInterval(() => {
      updateAllTimeZones();
    }, openRef.current ? 5000 : 60000); // 5s quando aberto, 60s quando fechado
    
    return () => {
      clearInterval(updateInterval);
    };
  }, [updateAllTimeZones]); // CORREÇÃO: Removido "open" das dependências
  
  // Eventos de visibilidade para atualizar quando o usuário volta para a página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateAllTimeZones();
      }
    };
    
    const handleFocus = () => {
        updateAllTimeZones();
    };
    
    // Registrar ouvintes para eventos
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [updateAllTimeZones]);

  // Extrair apenas o nome da cidade/país do fuso horário
  const getDisplayName = useCallback(() => {
    const nameParts = timeZone.name.split('(');
    if (nameParts.length > 0) {
      return nameParts[0].trim();
    }
    return timeZone.name;
  }, [timeZone.name]);
  
  // Função para lidar com a seleção de um novo fuso horário
  const handleTimeZoneChange = useCallback((tz) => {
    // Animar a transição
    setIsChanging(true);
    
    // Atualizar o fuso horário
    setTimeZone(tz);
    
    // Fechar o dropdown
    setOpen(false);
    
    // Atualizar horários imediatamente
    updateAllTimeZones();
    
    // Resetar o estado após a animação
    setTimeout(() => {
      setIsChanging(false);
    }, 700);
  }, [setTimeZone, updateAllTimeZones]);
  

  
  if (variant === 'compact') {
    return (
      <DropdownMenu onOpenChange={setOpen}>
        <DropdownMenuTrigger className="w-full" asChild>
          <button 
            className={`relative w-full cursor-pointer flex items-center gap-2 h-8 px-3 py-1 
              bg-gradient-to-br from-black via-black to-[#0a0a35]
              border border-[#13134d]/20 rounded-md 
              hover:border-[#13134d]/40 hover:shadow-[0_0_10px_rgba(10,10,53,0.15)] 
              transition-all duration-300 ease-out
              ${className} ${isChanging ? 'bg-gradient-to-br from-black via-black to-[#0d0d40] backdrop-blur-lg border-[#13134d]/30 shadow-xl shadow-[#050518]/30' : ''}`}
          >
            {/* Overlay de área clicável */}
            <div className="absolute inset-0 z-10 cursor-pointer"></div>
            
            {/* Efeito de partículas sutis */}
            <div className="absolute inset-0 overflow-hidden rounded-md opacity-8">
              <div className="particles-subtle"></div>
            </div>
            
            {/* Brilho lateral */}
            <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-[#13134d]/20 to-transparent"></div>
            <div className="absolute top-0 right-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-[#13134d]/15 to-transparent"></div>
            
            <motion.div
              animate={isChanging ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <Globe className="h-3.5 w-3.5 text-white/80" />
            </motion.div>
            <motion.span 
              className="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px] flex-1 text-white/90"
              key={timeZone.id}
              initial={isChanging ? { y: -10, opacity: 0 } : { y: 0, opacity: 1 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 120 }}
            >
              {getDisplayName()}
            </motion.span>
            <AnimatePresence>
            {timeZonesInDST[timeZone.id] && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="h-3 w-3 text-white/70" />
            </motion.div>
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          className="w-60 overflow-hidden p-1 bg-black backdrop-blur-lg border border-zinc-800/20 shadow-xl shadow-black/40"
          align="center"
          sideOffset={5}
        >
          <div className="max-h-[300px] overflow-y-auto py-1 custom-scrollbar">
            {availableTimeZones.map((tz) => (
              <motion.div
                key={tz.id}
                whileHover={{ x: 2, backgroundColor: "rgba(255, 255, 255, 0.03)" }}
                transition={{ duration: 0.2 }}
              >
                <DropdownMenuItem
                  className={`py-2 px-2.5 rounded-md my-0.5 cursor-pointer flex items-center justify-between group 
                    ${timeZone.id === tz.id 
                      ? 'bg-black border border-zinc-800/30 shadow-inner shadow-black/50' 
                      : 'hover:bg-zinc-900/50'}`}
                  onClick={() => handleTimeZoneChange(tz)}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-medium text-white/90">{tz.name}</p>
                      {timeZonesInDST[tz.id] && (
                        <motion.div 
                          initial={{ rotate: 0 }}
                          animate={{ rotate: 360 }}
                          transition={{ 
                            duration: 12, 
                            repeat: Infinity, 
                            ease: "linear" 
                          }}
                        >
                        <Sun className="h-3 w-3 text-amber-400" />
                        </motion.div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-2.5 w-2.5 text-white/50" />
                      <p className="text-[10px] text-white/50">
                        {currentTime[tz.id] || "--:--"}
                      </p>
                    </div>
                  </div>
                  
                  {timeZone.id === tz.id && (
                    <motion.div 
                      className="h-4 w-4 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center ml-3 shadow-md shadow-black/50"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3, type: "spring", stiffness: 260 }}
                    >
                      <Check className="h-2.5 w-2.5 text-white" />
                    </motion.div>
                  )}
                </DropdownMenuItem>
              </motion.div>
            ))}
          </div>
          

        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  return (
    <DropdownMenu onOpenChange={setOpen}>
      <DropdownMenuTrigger className="w-full" asChild>
        <button 
          className={`relative w-full text-left cursor-pointer flex items-center justify-between p-3 
            bg-gradient-to-br from-black via-black to-[#0a0a35]
            backdrop-blur-sm border border-[#13134d]/20 rounded-md 
            hover:border-[#13134d]/40 hover:shadow-[0_0_15px_rgba(10,10,53,0.2)] 
            transition-all duration-300 ease-out group ${className} 
            ${isChanging ? 'bg-gradient-to-br from-black via-black to-[#0d0d40] border-[#13134d]/30 shadow-lg shadow-[#050518]/30' : ''}`}
        >
          {/* Overlay de área clicável */}
          <div className="absolute inset-0 z-10 cursor-pointer"></div>
          
          {/* Efeito de partículas sutis */}
          <div className="absolute inset-0 overflow-hidden rounded-md opacity-8">
            <div className="particles-deep"></div>
          </div>
          
          {/* Brilho nos cantos */}
          <div className="absolute top-0 left-0 w-16 h-[1px] bg-gradient-to-r from-[#13134d]/30 to-transparent"></div>
          <div className="absolute top-0 left-0 w-[1px] h-8 bg-gradient-to-b from-[#13134d]/30 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-16 h-[1px] bg-gradient-to-l from-[#13134d]/20 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-[1px] h-8 bg-gradient-to-t from-[#13134d]/20 to-transparent"></div>
          
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-md">
              <div className="flex h-full w-full items-center justify-center rounded-md bg-black/80 border border-[#13134d]/20 p-0.5 group-hover:border-[#13134d]/40 transition-all duration-300">
                <motion.div
                  animate={isChanging ? 
                    { rotate: 360, scale: [1, 1.1, 1] } : 
                    { rotate: 0, scale: 1 }
                  }
                  transition={{ 
                    duration: isChanging ? 0.8 : 0.3, 
                    ease: "easeInOut" 
                  }}
                >
                <Globe className="h-5 w-5 text-white/80" />
                </motion.div>
                {timeZonesInDST[timeZone.id] && (
                  <motion.div
                    className="absolute top-0 right-0 translate-x-1 -translate-y-1"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <Sun className="h-3.5 w-3.5 text-amber-400 filter drop-shadow-glow" />
                  </motion.div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start text-left">
              <div className="flex items-center gap-1.5">
                <motion.span 
                  className="text-sm font-medium text-white/90"
                  key={timeZone.id}
                  initial={isChanging ? { y: -10, opacity: 0 } : { y: 0, opacity: 1 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 120 }}
                >
                  {getDisplayName()}
                </motion.span>
                {timeZonesInDST[timeZone.id] && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <Sun className="h-4 w-4 text-amber-400 filter drop-shadow-glow" />
                  </motion.div>
                )}
              </div>
              <motion.div 
                className="flex items-center gap-1 text-xs text-white/60"
                key={`time-${timeZone.id}`}
                initial={isChanging ? { y: 10, opacity: 0 } : { y: 0, opacity: 1 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, type: "spring", damping: 15 }}
              >
                <Clock className="h-3 w-3" />
                <span>{currentTime[timeZone.id] || "--:--"}</span>
              </motion.div>
            </div>
          </div>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="h-4 w-4 shrink-0 text-white/70 group-hover:text-white/90 transition-all duration-200" />
          </motion.div>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-full min-w-[320px] overflow-hidden p-1 bg-black backdrop-blur-lg border border-zinc-800/20 shadow-xl shadow-black/40"
        align="center"
        sideOffset={5}
      >
        <div className="max-h-[320px] overflow-y-auto py-1 custom-scrollbar">
          {availableTimeZones.map((tz) => (
            <motion.div
              key={tz.id}
              whileHover={{ x: 2, backgroundColor: "rgba(255, 255, 255, 0.03)" }}
              transition={{ duration: 0.2 }}
            >
              <DropdownMenuItem
                className={`py-2.5 px-3 rounded-md my-1 cursor-pointer group 
                  ${timeZone.id === tz.id 
                    ? 'bg-black border border-zinc-800/30 shadow-inner shadow-black/50' 
                    : 'hover:bg-zinc-900/50'}`}
                onClick={() => handleTimeZoneChange(tz)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-md">
                    <div className="flex h-full w-full items-center justify-center rounded-md bg-black/80 border border-zinc-800/20 p-0.5 group-hover:border-zinc-800/40 transition-all duration-200">
                      <Globe className="h-5 w-5 text-white/70" />
                      {timeZonesInDST[tz.id] && (
                        <motion.div
                          className="absolute top-0 left-0 -translate-x-1 -translate-y-1"
                          initial={{ rotate: 0 }}
                          animate={{ rotate: 360 }}
                          transition={{ 
                            duration: 12, 
                            repeat: Infinity, 
                            ease: "linear" 
                          }}
                        >
                          <Sun className="h-4 w-4 text-amber-400 filter drop-shadow-glow" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-white/90">{tz.name}</p>
                      {timeZonesInDST[tz.id] && (
                        <Sun className="h-4 w-4 text-amber-400 filter drop-shadow-glow" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3 w-3 text-white/50" />
                      <p className="text-xs text-white/50">
                        {currentTime[tz.id] || "--:--"}
                      </p>
                    </div>
                  </div>
                  {timeZone.id === tz.id && (
                    <motion.div 
                      className="h-5 w-5 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center ml-3 shadow-md shadow-black/50"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3, type: "spring", stiffness: 260 }}
                    >
                      <Check className="h-3 w-3 text-white" />
                    </motion.div>
                  )}
                </div>
              </DropdownMenuItem>
            </motion.div>
          ))}
        </div>
        
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Memoize para evitar re-renders desnecessários que podem disparar loops
export const TimeZoneSelector = React.memo(TimeZoneSelectorImpl);
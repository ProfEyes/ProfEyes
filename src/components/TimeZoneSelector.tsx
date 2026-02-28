import React, { useState } from 'react';
import { useTimeZone } from '@/contexts/TimeZoneContext';
import type { TimeZone } from '@/contexts/TimeZoneContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Clock, ChevronDown, Sun } from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from "sonner";

interface TimeZoneSelectorProps {
  className?: string;
  variant?: 'compact' | 'full';
}

const TimeZoneSelector = ({ className, variant = 'full' }: TimeZoneSelectorProps) => {
  const { timeZone, setTimeZone, availableTimeZones, isDST } = useTimeZone();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  
  const handleSelectTimeZone = (tz: TimeZone) => {
    setTimeZone(tz);
    setOpen(false); // Fechar o popover quando um fuso horário for selecionado
    
    // Adicionar notificação de confirmação
    toast.success(`${t('timezone.changed')} ${tz.name}`, {
      position: 'bottom-right',
      duration: 3000,
    });
  };
  
  return (
    <div className={cn('flex items-center', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button 
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md bg-black border border-zinc-800 hover:border-zinc-700 text-sm text-white transition-all duration-200 w-full",
              "hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-opacity-30"
            )}
          >
            {variant === 'full' && (
              <span className="text-sm font-medium text-white/70 mr-2 cursor-pointer">
                {t('timezone.label')}:
              </span>
            )}
            <Clock className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
            <span className="flex items-center gap-1 truncate max-w-[180px] flex-grow">
              <span className="truncate">{timeZone.name}</span>
              {isDST && timeZone.hasDST && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Sun className="h-3 w-3 text-amber-400 flex-shrink-0 ml-1" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-black border border-zinc-800 text-white">
                      <p>{t('timezone.dst')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0 ml-auto" />
          </button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[300px] p-0 bg-black border border-zinc-800 shadow-lg shadow-black/40" align="center">
          <div className="max-h-[280px] overflow-y-auto custom-scrollbar pt-2 pb-2 flex flex-col items-center">
            {availableTimeZones.map((tz) => (
              <button
                key={tz.id}
                onClick={() => handleSelectTimeZone(tz)}
                className={cn(
                  "w-[90%] px-4 py-2.5 text-sm flex items-center gap-3 transition-colors rounded-md mb-1",
                  "hover:bg-zinc-900",
                  timeZone.id === tz.id 
                    ? "bg-zinc-900 text-white font-medium" 
                    : "text-zinc-400"
                )}
              >
                <Clock 
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    timeZone.id === tz.id 
                      ? "text-zinc-100" 
                      : "text-zinc-500"
                  )} 
                />
                <div className="flex-1 text-left">
                  <span>{tz.name}</span>
                  {tz.hasDST && isDST && timeZone.id === tz.id && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Sun className="h-3 w-3 text-amber-400 flex-shrink-0 ml-1 inline-block" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-black border border-zinc-800 text-white">
                          <p>{t('timezone.dst')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TimeZoneSelector; 
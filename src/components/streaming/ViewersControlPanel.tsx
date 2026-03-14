import React, { useState, useEffect } from 'react';
import { Eye, Users, TrendingUp, Minus, Plus, RotateCcw, Check, Info } from 'lucide-react';
import { addedViewersService } from '@/services/addedViewersService';
import { toast } from 'sonner';

interface ViewersControlPanelProps {
  streamId: string;
  realViewers: number;
  onViewersUpdate?: (total: number, added: number) => void;
}

export const ViewersControlPanel: React.FC<ViewersControlPanelProps> = ({
  streamId,
  realViewers,
  onViewersUpdate
}) => {
  const [addedViewers, setAddedViewers] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAddedViewers();
  }, [streamId]);

  const loadAddedViewers = async () => {
    const count = await addedViewersService.getAddedViewers(streamId);
    setAddedViewers(count);
    if (onViewersUpdate) {
      onViewersUpdate(realViewers + count, count);
    }
  };

  const updateAddedViewers = async (newCount: number) => {
    setIsLoading(true);
    try {
      const result = await addedViewersService.setAddedViewers(streamId, newCount);
      if (result.success) {
        setAddedViewers(newCount);
        if (onViewersUpdate) {
          onViewersUpdate(realViewers + newCount, newCount);
        }
      } else {
        toast.error('Erro ao atualizar viewers');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdd = (amount: number) => {
    const newCount = Math.max(0, addedViewers + amount);
    updateAddedViewers(newCount);
  };

  const handleSetCustom = () => {
    const value = parseInt(inputValue);
    if (!isNaN(value) && value >= 0) {
      updateAddedViewers(value);
      setInputValue('');
    }
  };

  const totalViewers = realViewers + addedViewers;

  return (
    <div className="bg-gradient-to-b from-black/98 to-black/95 backdrop-blur-2xl rounded-3xl p-7 space-y-7 border border-white/[0.05]">
      {/* Header ultra clean */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/[0.03] rounded-xl border border-white/[0.05]">
          <Eye className="h-4 w-4 text-white/80" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-[13px] font-light text-white/90 tracking-wide">Controle de Audiência</h3>
          <p className="text-[10px] text-white/35 font-extralight mt-0.5">Visível apenas para você</p>
        </div>
      </div>

      <div className="h-[0.5px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Estatísticas ultra clean */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 space-y-3 hover:bg-white/[0.03] transition-all duration-300">
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-white/40" strokeWidth={1.5} />
            <span className="text-[10px] text-white/40 font-extralight tracking-widest uppercase">Real</span>
          </div>
          <div className="text-3xl font-extralight text-white/95 tabular-nums">{realViewers}</div>
        </div>
        
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 space-y-3 hover:bg-white/[0.03] transition-all duration-300">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-blue-400/50" strokeWidth={1.5} />
            <span className="text-[10px] text-blue-400/50 font-extralight tracking-widest uppercase">Boost</span>
          </div>
          <div className="text-3xl font-extralight text-blue-400/90 tabular-nums">{addedViewers}</div>
        </div>
        
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 space-y-3 hover:bg-white/[0.03] transition-all duration-300">
          <div className="flex items-center gap-2">
            <Eye className="h-3 w-3 text-green-400/50" strokeWidth={1.5} />
            <span className="text-[10px] text-green-400/50 font-extralight tracking-widest uppercase">Total</span>
          </div>
          <div className="text-3xl font-extralight text-green-400/90 tabular-nums">{totalViewers}</div>
        </div>
      </div>

      {/* Controles rápidos ultra clean */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-[0.5px] flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <span className="text-[10px] text-white/30 font-extralight tracking-widest uppercase">Ajuste Rápido</span>
          <div className="h-[0.5px] flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        </div>
        
        <div className="grid grid-cols-5 gap-2.5">
          <button
            onClick={() => handleQuickAdd(-100)}
            disabled={addedViewers === 0 || isLoading}
            className="h-12 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] active:scale-95 rounded-2xl text-white/60 hover:text-white/90 text-xs font-light disabled:opacity-10 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1"
          >
            <Minus className="h-3 w-3" strokeWidth={2} />
            <span>100</span>
          </button>
          <button
            onClick={() => handleQuickAdd(-10)}
            disabled={addedViewers === 0 || isLoading}
            className="h-12 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] active:scale-95 rounded-2xl text-white/60 hover:text-white/90 text-xs font-light disabled:opacity-10 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1"
          >
            <Minus className="h-3 w-3" strokeWidth={2} />
            <span>10</span>
          </button>
          <button
            onClick={() => updateAddedViewers(0)}
            disabled={addedViewers === 0 || isLoading}
            className="h-12 bg-white/[0.02] border border-white/[0.05] hover:bg-red-500/[0.06] hover:border-red-500/20 active:scale-95 rounded-2xl text-red-400/60 hover:text-red-400/90 disabled:opacity-10 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => handleQuickAdd(10)}
            disabled={isLoading}
            className="h-12 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] active:scale-95 rounded-2xl text-white/60 hover:text-white/90 text-xs font-light disabled:opacity-10 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
            <span>10</span>
          </button>
          <button
            onClick={() => handleQuickAdd(100)}
            disabled={isLoading}
            className="h-12 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] active:scale-95 rounded-2xl text-white/60 hover:text-white/90 text-xs font-light disabled:opacity-10 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
            <span>100</span>
          </button>
        </div>
      </div>

      {/* Input personalizado ultra clean */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-[0.5px] flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <span className="text-[10px] text-white/30 font-extralight tracking-widest uppercase">Valor Customizado</span>
          <div className="h-[0.5px] flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        </div>
        
        <div className="flex gap-2.5">
          <input
            type="number"
            min="0"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite um número"
            className="flex-1 h-12 bg-white/[0.02] border border-white/[0.05] rounded-2xl px-4 text-sm font-light text-white/90 placeholder:text-white/20 focus:outline-none focus:bg-white/[0.04] focus:border-white/[0.12] transition-all duration-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={handleSetCustom}
            disabled={!inputValue || isLoading}
            className="h-12 px-6 bg-white/95 hover:bg-white active:scale-95 rounded-2xl text-black text-sm font-light disabled:opacity-15 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
          >
            <Check className="h-4 w-4" strokeWidth={2} />
            <span>Aplicar</span>
          </button>
        </div>
      </div>

      {/* Aviso ultra clean */}
      <div className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
        <Info className="h-3.5 w-3.5 text-white/30 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
        <p className="text-[11px] text-white/35 font-extralight leading-relaxed">
          Apenas você visualiza estes controles. Os espectadores veem somente o total combinado.
        </p>
      </div>
    </div>
  );
};

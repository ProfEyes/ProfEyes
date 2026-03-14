import React, { useState } from 'react';
import { Power, AlertTriangle, X } from 'lucide-react';

interface EndStreamButtonProps {
  onEndStream: () => void;
  isEnding?: boolean;
  streamDuration?: string;
  peakViewers?: number;
  totalMessages?: number;
}

export const EndStreamButton: React.FC<EndStreamButtonProps> = ({
  onEndStream,
  isEnding = false,
  streamDuration = '0:00',
  peakViewers = 0,
  totalMessages = 0
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleConfirm = () => {
    setShowConfirmation(false);
    onEndStream();
  };

  return (
    <>
      {/* Botão de encerrar ultra minimalista */}
      <button
        onClick={() => setShowConfirmation(true)}
        disabled={isEnding}
        className="group relative h-11 px-6 bg-white/[0.02] border border-white/[0.05] hover:border-red-500/30 hover:bg-red-500/[0.06] rounded-2xl transition-all duration-300 flex items-center gap-2.5 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
      >
        <Power className="h-3.5 w-3.5 text-white/60 group-hover:text-red-400/80 transition-colors" strokeWidth={1.5} />
        <span className="text-[13px] font-light text-white/60 group-hover:text-red-400/80 tracking-wide transition-colors">
          {isEnding ? 'Encerrando...' : 'Encerrar'}
        </span>
      </button>

      {/* Modal de confirmação ultra minimalista */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-gradient-to-b from-black/98 to-black/95 border border-white/[0.08] rounded-3xl p-8 space-y-6 animate-in zoom-in-95 duration-300">
            {/* Close button */}
            <button
              onClick={() => setShowConfirmation(false)}
              className="absolute top-4 right-4 p-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all duration-200 active:scale-95"
            >
              <X className="h-4 w-4 text-white/60" strokeWidth={1.5} />
            </button>

            {/* Icon */}
            <div className="flex justify-center">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <AlertTriangle className="h-8 w-8 text-red-400" strokeWidth={1.5} />
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h3 className="text-xl font-light text-white/95 tracking-wide">Encerrar transmissão?</h3>
              <p className="text-[13px] text-white/50 font-extralight leading-relaxed">
                Sua live será finalizada e os espectadores serão desconectados
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 text-center space-y-2">
                <div className="text-[10px] text-white/40 font-extralight tracking-widest uppercase">Duração</div>
                <div className="text-lg font-light text-white/90 tabular-nums">{streamDuration}</div>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 text-center space-y-2">
                <div className="text-[10px] text-white/40 font-extralight tracking-widest uppercase">Pico</div>
                <div className="text-lg font-light text-white/90 tabular-nums">{peakViewers}</div>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 text-center space-y-2">
                <div className="text-[10px] text-white/40 font-extralight tracking-widest uppercase">Mensagens</div>
                <div className="text-lg font-light text-white/90 tabular-nums">{totalMessages}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 h-12 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-2xl text-[13px] font-light text-white/80 tracking-wide transition-all duration-200 active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 h-12 bg-red-500/90 hover:bg-red-500 rounded-2xl text-[13px] font-light text-white tracking-wide transition-all duration-200 active:scale-95"
              >
                Sim, encerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

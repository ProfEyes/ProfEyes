import React from 'react';
import { Power } from 'lucide-react';

interface EndStreamButtonProps {
  onEndStream: () => void;
  isEnding?: boolean;
  streamDuration?: string;
  peakViewers?: number;
  totalMessages?: number;
}

export const EndStreamButton: React.FC<EndStreamButtonProps> = ({
  onEndStream,
  isEnding = false
}) => {
  return (
    <button
      onClick={onEndStream}
      disabled={isEnding}
      className="group relative h-11 px-6 bg-white/[0.02] border border-white/[0.05] hover:border-red-500/30 hover:bg-red-500/[0.06] rounded-2xl transition-all duration-300 flex items-center gap-2.5 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
    >
      <Power className="h-3.5 w-3.5 text-white/60 group-hover:text-red-400/80 transition-colors" strokeWidth={1.5} />
      <span className="text-[13px] font-light text-white/60 group-hover:text-red-400/80 tracking-wide transition-colors">
        {isEnding ? 'Encerrando...' : 'Encerrar'}
      </span>
    </button>
  );
};

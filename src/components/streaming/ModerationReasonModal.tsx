import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ModerationActionType = 'ban' | 'mute' | 'timeout' | 'delete';

interface ModerationReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, timeoutMinutes?: number) => void;
  actionType: ModerationActionType;
  userName: string;
  isProcessing?: boolean;
}

const ACTION_LABELS: Record<ModerationActionType, string> = {
  ban: 'Banir Permanentemente',
  mute: 'Mutar',
  timeout: 'Timeout',
  delete: 'Deletar Mensagem'
};

const ACTION_DESCRIPTIONS: Record<ModerationActionType, string> = {
  ban: 'O usuário será banido permanentemente de todas as suas lives',
  mute: 'O usuário não poderá enviar mensagens nas suas lives',
  timeout: 'O usuário não poderá enviar mensagens temporariamente',
  delete: 'A mensagem será removida do chat'
};

const TIMEOUT_OPTIONS = [
  { value: 1, label: '1 minuto' },
  { value: 5, label: '5 minutos' },
  { value: 10, label: '10 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
  { value: 360, label: '6 horas' },
  { value: 720, label: '12 horas' },
  { value: 1440, label: '24 horas' }
];

export const ModerationReasonModal: React.FC<ModerationReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  userName,
  isProcessing = false
}) => {
  const [reason, setReason] = useState('');
  const [timeoutMinutes, setTimeoutMinutes] = useState(5);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!reason.trim()) return;
    
    if (actionType === 'timeout') {
      onConfirm(reason.trim(), timeoutMinutes);
    } else {
      onConfirm(reason.trim());
    }
    
    setReason('');
    setTimeoutMinutes(5);
  };

  const handleClose = () => {
    if (isProcessing) return;
    setReason('');
    setTimeoutMinutes(5);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-black/95 border border-white/[0.08] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-red-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-[15px] font-medium text-white/95">
                {ACTION_LABELS[actionType]}
              </h2>
              <p className="text-[12px] text-white/50 font-light mt-0.5">
                {userName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors disabled:opacity-50"
            aria-label="Fechar modal"
          >
            <X className="h-4 w-4 text-white/60" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Description */}
          <p className="text-[13px] text-white/60 font-light leading-relaxed">
            {ACTION_DESCRIPTIONS[actionType]}
          </p>

          {/* Timeout Duration (apenas para timeout) */}
          {actionType === 'timeout' && (
            <div className="space-y-2">
              <label className="text-[12px] text-white/70 font-medium">
                Duração
              </label>
              <select
                value={timeoutMinutes}
                onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
                disabled={isProcessing}
                aria-label="Duração do timeout"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white/90 font-light focus:border-white/[0.15] focus:outline-none transition-colors disabled:opacity-50"
              >
                {TIMEOUT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-2">
            <label className="text-[12px] text-white/70 font-medium">
              Motivo <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isProcessing}
              placeholder="Descreva o motivo desta ação..."
              rows={4}
              maxLength={500}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white/90 font-light placeholder:text-white/30 focus:border-white/[0.15] focus:outline-none transition-colors resize-none disabled:opacity-50"
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-white/40 font-light">
                O motivo será registrado no histórico
              </p>
              <span className="text-[11px] text-white/40 font-light tabular-nums">
                {reason.length}/500
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.08]">
          <Button
            onClick={handleClose}
            disabled={isProcessing}
            variant="ghost"
            className="px-4 py-2 text-[13px] text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-all disabled:opacity-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim() || isProcessing}
            className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processando...' : 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

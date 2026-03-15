import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Ban, MessageSquareOff, Clock, Trash2 } from 'lucide-react';
import { ModerationReasonModal, ModerationActionType } from './ModerationReasonModal';
import * as moderationService from '@/services/moderationService';
import { toast } from 'sonner';

interface ModerationActionsMenuProps {
  messageId: string;
  userId: string;
  userName: string;
  streamerId: string;
  currentUserId: string;
  isStreamer: boolean;
  isModerator: boolean;
  onDeleteMessage: (messageId: string) => void;
}

export const ModerationActionsMenu: React.FC<ModerationActionsMenuProps> = ({
  messageId,
  userId,
  userName,
  streamerId,
  currentUserId,
  isStreamer,
  isModerator,
  onDeleteMessage
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<ModerationActionType>('delete');
  const [isProcessing, setIsProcessing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Log para debug (remover após corrigir)
  useEffect(() => {
    if (isOpen) {
      console.log('ModerationActionsMenu - Valores:', {
        messageId,
        userId,
        userName,
        streamerId,
        currentUserId,
        isStreamer,
        isModerator
      });
    }
  }, [isOpen, messageId, userId, userName, streamerId, currentUserId, isStreamer, isModerator]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Não mostrar o menu para o próprio streamer ou se não for moderador/streamer
  // Também não mostrar se o usuário alvo for o streamer (moderadores não podem moderar o dono)
  // E não mostrar se o currentUserId for o mesmo que userId (não pode se auto-moderar)
  // Validar também se os IDs não são vazios ou undefined
  if (!userId || !streamerId || !currentUserId || 
      userId === streamerId || 
      currentUserId === userId || 
      (!isStreamer && !isModerator)) {
    return null;
  }

  const handleActionClick = (action: ModerationActionType) => {
    setCurrentAction(action);
    setIsOpen(false);
    setModalOpen(true);
  };

  const handleConfirmAction = async (reason: string, timeoutMinutes?: number) => {
    setIsProcessing(true);
    try {
      // Validar parâmetros antes de chamar as funções
      if (!streamerId || !userId || !currentUserId || !reason) {
        console.error('Parâmetros inválidos:', { streamerId, userId, currentUserId, reason });
        toast.error('Erro: Parâmetros inválidos');
        return;
      }

      console.log('Executando ação de moderação:', {
        action: currentAction,
        streamerId,
        userId,
        currentUserId,
        userName,
        reason: reason.substring(0, 50) + '...'
      });

      switch (currentAction) {
        case 'ban':
          await moderationService.banUser(streamerId, userId, currentUserId, reason);
          toast.success(`${userName} foi banido permanentemente`);
          break;

        case 'mute':
          await moderationService.muteUser(streamerId, userId, currentUserId, reason);
          toast.success(`${userName} foi mutado`);
          break;

        case 'timeout':
          if (timeoutMinutes) {
            await moderationService.timeoutUser(streamerId, userId, currentUserId, reason, timeoutMinutes);
            toast.success(`Timeout de ${timeoutMinutes} minuto(s) aplicado a ${userName}`);
          }
          break;

        case 'delete':
          onDeleteMessage(messageId);
          // Log da ação de deletar mensagem
          await moderationService.logModerationAction(
            streamerId,
            userId,
            currentUserId,
            'delete_message',
            reason,
            { messageId }
          );
          toast.success('Mensagem deletada');
          break;
      }

      setModalOpen(false);
    } catch (error: unknown) {
      console.error('Erro ao executar ação de moderação:', error);
      
      // Mostrar mensagem de erro específica se disponível
      const errorMessage = error instanceof Error ? error.message : 'Erro ao executar ação de moderação';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/[0.08] rounded-lg transition-all duration-200"
          aria-label="Ações de moderação"
        >
          <MoreVertical className="h-3.5 w-3.5 text-white/50" strokeWidth={1.5} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-black/95 border border-white/[0.08] rounded-xl shadow-2xl py-1.5 z-50">
            {/* Deletar mensagem */}
            <button
              onClick={() => handleActionClick('delete')}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
            >
              <Trash2 className="h-4 w-4 text-white/60" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-[13px] text-white/90 font-light">Deletar Mensagem</p>
                <p className="text-[11px] text-white/40 font-extralight">Remove do chat</p>
              </div>
            </button>

            <div className="h-px bg-white/[0.05] my-1.5" />

            {/* Timeout */}
            <button
              onClick={() => handleActionClick('timeout')}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
            >
              <Clock className="h-4 w-4 text-yellow-400/70" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-[13px] text-white/90 font-light">Timeout</p>
                <p className="text-[11px] text-white/40 font-extralight">Silenciar temporariamente</p>
              </div>
            </button>

            {/* Mute */}
            <button
              onClick={() => handleActionClick('mute')}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
            >
              <MessageSquareOff className="h-4 w-4 text-orange-400/70" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-[13px] text-white/90 font-light">Mutar</p>
                <p className="text-[11px] text-white/40 font-extralight">Silenciar permanentemente</p>
              </div>
            </button>

            {/* Ban (apenas streamer) */}
            {isStreamer && (
              <>
                <div className="h-px bg-white/[0.05] my-1.5" />
                <button
                  onClick={() => handleActionClick('ban')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/[0.08] transition-colors text-left"
                >
                  <Ban className="h-4 w-4 text-red-400/70" strokeWidth={1.5} />
                  <div className="flex-1">
                    <p className="text-[13px] text-red-400/90 font-light">Banir</p>
                    <p className="text-[11px] text-red-400/40 font-extralight">Permanentemente</p>
                  </div>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal de motivo */}
      <ModerationReasonModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmAction}
        actionType={currentAction}
        userName={userName}
        isProcessing={isProcessing}
      />
    </>
  );
};

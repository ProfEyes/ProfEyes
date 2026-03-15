import React, { useState, useEffect } from 'react';
import { Ban, MessageSquareOff, Clock, Shield, Trash2, RotateCcw, Search, Users, AlertCircle, Calendar, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as moderationService from '@/services/moderationService';
import type { BannedUser, MutedUser, TimeoutUser, ModerationAction } from '@/services/moderationService';
import { moderationEvents, MODERATION_EVENTS } from '@/services/moderationEvents';
import { toast } from 'sonner';

interface ModerationPanelProps {
  streamerId: string;
}

type ActiveTab = 'bans' | 'mutes' | 'timeouts' | 'logs';

export const ModerationPanel: React.FC<ModerationPanelProps> = ({ streamerId }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('bans');
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [timeoutUsers, setTimeoutUsers] = useState<TimeoutUser[]>([]);
  const [logs, setLogs] = useState<ModerationAction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, streamerId]);

  // Auto-refresh a cada 10 segundos para mostrar novas punições
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, streamerId]);

  // Escutar eventos de moderação para atualização em tempo real
  useEffect(() => {
    const handleModerationEvent = () => {
      console.log('📢 Evento de moderação recebido - Atualizando painel');
      loadData();
    };

    // Registrar todos os eventos de moderação
    moderationEvents.on(MODERATION_EVENTS.BAN_APPLIED, handleModerationEvent);
    moderationEvents.on(MODERATION_EVENTS.MUTE_APPLIED, handleModerationEvent);
    moderationEvents.on(MODERATION_EVENTS.TIMEOUT_APPLIED, handleModerationEvent);
    moderationEvents.on(MODERATION_EVENTS.BAN_REMOVED, handleModerationEvent);
    moderationEvents.on(MODERATION_EVENTS.MUTE_REMOVED, handleModerationEvent);
    moderationEvents.on(MODERATION_EVENTS.TIMEOUT_REMOVED, handleModerationEvent);
    moderationEvents.on(MODERATION_EVENTS.REFRESH_NEEDED, handleModerationEvent);

    // Limpar listeners ao desmontar
    return () => {
      moderationEvents.off(MODERATION_EVENTS.BAN_APPLIED, handleModerationEvent);
      moderationEvents.off(MODERATION_EVENTS.MUTE_APPLIED, handleModerationEvent);
      moderationEvents.off(MODERATION_EVENTS.TIMEOUT_APPLIED, handleModerationEvent);
      moderationEvents.off(MODERATION_EVENTS.BAN_REMOVED, handleModerationEvent);
      moderationEvents.off(MODERATION_EVENTS.MUTE_REMOVED, handleModerationEvent);
      moderationEvents.off(MODERATION_EVENTS.TIMEOUT_REMOVED, handleModerationEvent);
      moderationEvents.off(MODERATION_EVENTS.REFRESH_NEEDED, handleModerationEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, streamerId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      switch (activeTab) {
        case 'bans': {
          const bans = await moderationService.getBannedUsers(streamerId);
          setBannedUsers(bans);
          break;
        }
        case 'mutes': {
          const mutes = await moderationService.getMutedUsers(streamerId);
          setMutedUsers(mutes);
          break;
        }
        case 'timeouts': {
          const timeouts = await moderationService.getTimedOutUsers(streamerId);
          setTimeoutUsers(timeouts);
          break;
        }
        case 'logs': {
          const logData = await moderationService.getModerationLogs(streamerId, 100);
          setLogs(logData);
          break;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados de moderação:', error);
      toast.error('Erro ao carregar dados de moderação');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnban = async (userId: string, userName: string) => {
    if (processingId) return;
    
    setProcessingId(userId);
    try {
      await moderationService.unbanUser(streamerId, userId, streamerId, 'Revogado pelo streamer');
      toast.success(`${userName} foi desbanido`);
      loadData();
    } catch (error) {
      toast.error('Erro ao desbanir usuário');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnmute = async (userId: string, userName: string) => {
    if (processingId) return;
    
    setProcessingId(userId);
    try {
      await moderationService.unmuteUser(streamerId, userId, streamerId, 'Revogado pelo streamer');
      toast.success(`${userName} foi desmutado`);
      loadData();
    } catch (error) {
      toast.error('Erro ao desmutar usuário');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveTimeout = async (userId: string, userName: string) => {
    if (processingId) return;
    
    setProcessingId(userId);
    try {
      await moderationService.removeTimeout(streamerId, userId, streamerId, 'Revogado pelo streamer');
      toast.success(`Timeout de ${userName} foi removido`);
      loadData();
    } catch (error) {
      toast.error('Erro ao remover timeout');
    } finally {
      setProcessingId(null);
    }
  };

  const filterUsers = (users: BannedUser[] | MutedUser[] | TimeoutUser[]) => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    
    if (activeTab === 'bans') {
      return (users as BannedUser[]).filter(user => 
        (user.bannedUserName || '').toLowerCase().includes(term)
      );
    } else if (activeTab === 'mutes') {
      return (users as MutedUser[]).filter(user => 
        (user.mutedUserName || '').toLowerCase().includes(term)
      );
    } else {
      return (users as TimeoutUser[]).filter(user => 
        (user.userName || '').toLowerCase().includes(term)
      );
    }
  };

  const formatRelativeTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'agora mesmo';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
    return `${Math.floor(seconds / 86400)}d atrás`;
  };

  const formatRemainingTime = (expiresAt: Date) => {
    const remaining = Math.floor((expiresAt.getTime() - Date.now()) / 60000);
    if (remaining <= 0) return 'Expirado';
    if (remaining < 60) return `${remaining}min`;
    if (remaining < 1440) return `${Math.floor(remaining / 60)}h ${remaining % 60}min`;
    return `${Math.floor(remaining / 1440)}d`;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ban': return <Ban className="h-3.5 w-3.5 text-red-400" />;
      case 'unban': return <RotateCcw className="h-3.5 w-3.5 text-green-400" />;
      case 'mute': return <MessageSquareOff className="h-3.5 w-3.5 text-orange-400" />;
      case 'unmute': return <RotateCcw className="h-3.5 w-3.5 text-green-400" />;
      case 'timeout': return <Clock className="h-3.5 w-3.5 text-yellow-400" />;
      case 'untimeout': return <RotateCcw className="h-3.5 w-3.5 text-green-400" />;
      case 'delete_message': return <Trash2 className="h-3.5 w-3.5 text-white/40" />;
      default: return <AlertCircle className="h-3.5 w-3.5 text-white/40" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      ban: 'Banimento',
      unban: 'Desbanimento',
      mute: 'Mute',
      unmute: 'Desmute',
      timeout: 'Timeout',
      untimeout: 'Timeout Removido',
      delete_message: 'Mensagem Deletada'
    };
    return labels[action] || action;
  };

  return (
    <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-7 py-6 border-b border-white/[0.05]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <Shield className="h-4 w-4 text-white/60" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[15px] font-medium text-white/95">Painel de Moderação</h3>
              <p className="text-[12px] text-white/50 font-light mt-0.5">
                Gerencie bans, mutes e timeouts
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar usuário..."
              className="pl-9 h-9 w-64 bg-white/[0.03] border-white/[0.08] text-[13px] text-white/90 placeholder:text-white/30 focus:border-white/[0.15]"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.05]">
        <button
          onClick={() => setActiveTab('bans')}
          className={`flex-1 px-6 py-4 text-[13px] font-light transition-all border-b-2 ${
            activeTab === 'bans'
              ? 'text-white/95 border-red-500 bg-red-500/5'
              : 'text-white/50 border-transparent hover:text-white/70 hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Ban className="h-4 w-4" strokeWidth={1.5} />
            <span>Banidos</span>
            {bannedUsers.length > 0 && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-[11px] font-medium">
                {bannedUsers.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('mutes')}
          className={`flex-1 px-6 py-4 text-[13px] font-light transition-all border-b-2 ${
            activeTab === 'mutes'
              ? 'text-white/95 border-orange-500 bg-orange-500/5'
              : 'text-white/50 border-transparent hover:text-white/70 hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <MessageSquareOff className="h-4 w-4" strokeWidth={1.5} />
            <span>Mutados</span>
            {mutedUsers.length > 0 && (
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-[11px] font-medium">
                {mutedUsers.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('timeouts')}
          className={`flex-1 px-6 py-4 text-[13px] font-light transition-all border-b-2 ${
            activeTab === 'timeouts'
              ? 'text-white/95 border-yellow-500 bg-yellow-500/5'
              : 'text-white/50 border-transparent hover:text-white/70 hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-4 w-4" strokeWidth={1.5} />
            <span>Timeouts</span>
            {timeoutUsers.length > 0 && (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-[11px] font-medium">
                {timeoutUsers.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 px-6 py-4 text-[13px] font-light transition-all border-b-2 ${
            activeTab === 'logs'
              ? 'text-white/95 border-blue-500 bg-blue-500/5'
              : 'text-white/50 border-transparent hover:text-white/70 hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" strokeWidth={1.5} />
            <span>Histórico</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto minimal-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white/80" />
          </div>
        ) : (
          <>
            {/* Banidos */}
            {activeTab === 'bans' && (
              <div className="space-y-3">
                {filterUsers(bannedUsers).length === 0 ? (
                  <div className="text-center py-12">
                    <Ban className="h-12 w-12 text-white/20 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-[13px] text-white/40 font-light">Nenhum usuário banido</p>
                  </div>
                ) : (
                  filterUsers(bannedUsers).map((ban) => (
                    <div
                      key={ban.id}
                      className="flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.03] border border-white/[0.05] rounded-xl transition-all"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-red-500/20">
                        <AvatarImage src={ban.bannedUserAvatar} />
                        <AvatarFallback className="bg-red-500/10 text-red-400 text-[12px]">
                          {ban.bannedUserName[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-white/90 font-medium">{ban.bannedUserName}</p>
                        <p className="text-[11px] text-white/40 font-light truncate mt-0.5">
                          {ban.reason}
                        </p>
                        <p className="text-[10px] text-white/30 font-light mt-1">
                          Por {ban.bannedByName} • {formatRelativeTime(ban.createdAt)}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleUnban(ban.bannedUserId, ban.bannedUserName)}
                        disabled={processingId === ban.bannedUserId}
                        size="sm"
                        className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 hover:border-green-500/30 transition-all h-8 px-3 text-[12px]"
                      >
                        {processingId === ban.bannedUserId ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 border border-green-400 border-t-transparent" />
                            Processando...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <RotateCcw className="h-3 w-3" />
                            Desbanir
                          </span>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Mutados */}
            {activeTab === 'mutes' && (
              <div className="space-y-3">
                {filterUsers(mutedUsers).length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquareOff className="h-12 w-12 text-white/20 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-[13px] text-white/40 font-light">Nenhum usuário mutado</p>
                  </div>
                ) : (
                  filterUsers(mutedUsers).map((mute) => (
                    <div
                      key={mute.id}
                      className="flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.03] border border-white/[0.05] rounded-xl transition-all"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-orange-500/20">
                        <AvatarImage src={mute.mutedUserAvatar} />
                        <AvatarFallback className="bg-orange-500/10 text-orange-400 text-[12px]">
                          {mute.mutedUserName[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-white/90 font-medium">{mute.mutedUserName}</p>
                        <p className="text-[11px] text-white/40 font-light truncate mt-0.5">
                          {mute.reason}
                        </p>
                        <p className="text-[10px] text-white/30 font-light mt-1">
                          Por {mute.mutedByName} • {formatRelativeTime(mute.createdAt)}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleUnmute(mute.mutedUserId, mute.mutedUserName)}
                        disabled={processingId === mute.mutedUserId}
                        size="sm"
                        className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 hover:border-green-500/30 transition-all h-8 px-3 text-[12px]"
                      >
                        {processingId === mute.mutedUserId ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 border border-green-400 border-t-transparent" />
                            Processando...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <RotateCcw className="h-3 w-3" />
                            Desmutar
                          </span>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Timeouts */}
            {activeTab === 'timeouts' && (
              <div className="space-y-3">
                {filterUsers(timeoutUsers).length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-white/20 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-[13px] text-white/40 font-light">Nenhum timeout ativo</p>
                  </div>
                ) : (
                  filterUsers(timeoutUsers).map((timeout) => (
                    <div
                      key={timeout.id}
                      className="flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.03] border border-white/[0.05] rounded-xl transition-all"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-yellow-500/20">
                        <AvatarImage src={timeout.userAvatar} />
                        <AvatarFallback className="bg-yellow-500/10 text-yellow-400 text-[12px]">
                          {timeout.userName[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] text-white/90 font-medium">{timeout.userName}</p>
                          <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-md text-[10px] font-medium">
                            {formatRemainingTime(timeout.expiresAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/40 font-light truncate mt-0.5">
                          {timeout.reason}
                        </p>
                        <p className="text-[10px] text-white/30 font-light mt-1">
                          Por {timeout.timeoutByName} • {timeout.durationMinutes}min
                        </p>
                      </div>
                      <Button
                        onClick={() => handleRemoveTimeout(timeout.userId, timeout.userName)}
                        disabled={processingId === timeout.userId}
                        size="sm"
                        className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 hover:border-green-500/30 transition-all h-8 px-3 text-[12px]"
                      >
                        {processingId === timeout.userId ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 border border-green-400 border-t-transparent" />
                            Processando...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <RotateCcw className="h-3 w-3" />
                            Remover
                          </span>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Logs */}
            {activeTab === 'logs' && (
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-white/20 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-[13px] text-white/40 font-light">Nenhuma ação registrada</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.03] border border-white/[0.05] rounded-lg transition-all"
                    >
                      <div className="p-2 bg-white/[0.02] border border-white/[0.05] rounded-lg mt-0.5">
                        {getActionIcon(log.actionType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-white/90 font-medium">
                            {getActionLabel(log.actionType)}
                          </span>
                          <span className="text-[11px] text-white/30 font-light">
                            {formatRelativeTime(log.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/60 font-light mt-1">
                          <span className="text-white/80">{log.moderatorName}</span> {log.actionType === 'delete_message' ? 'deletou mensagem de' : 'aplicou ação em'}{' '}
                          <span className="text-white/80">{log.targetUserName}</span>
                        </p>
                        <p className="text-[10px] text-white/40 font-light mt-1 italic">
                          "{log.reason}"
                        </p>
                        {log.metadata?.durationMinutes && (
                          <p className="text-[10px] text-white/30 font-light mt-1">
                            Duração: {log.metadata.durationMinutes} minutos
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

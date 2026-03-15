import React, { useState, useEffect } from 'react';
import { streamModerationService } from '@/services/streamModerationService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserX, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BlockedUsersManagerProps {
  streamId: string;
}

interface BlockedUser {
  id: string;
  blocked_user_id: string;
  userName?: string;
  avatar?: string;
  reason?: string;
  blocked_at: string;
}

export function BlockedUsersManager({ streamId }: BlockedUsersManagerProps) {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingUser, setUnblockingUser] = useState<string | null>(null);

  // Carregar lista de usuários bloqueados
  useEffect(() => {
    loadBlockedUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, user]);

  const loadBlockedUsers = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const blocked = await streamModerationService.getBlockedUsers(user.id);
      setBlockedUsers(blocked);
    } catch (error) {
      console.error('Erro ao carregar usuários bloqueados:', error);
      toast.error('Erro ao carregar lista de bloqueados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (blockedUserId: string) => {
    if (!user?.id) return;
    
    setUnblockingUser(blockedUserId);
    try {
      const result = await streamModerationService.unblockUser(user.id, blockedUserId);
      
      if (result.success) {
        toast.success('Usuário desbloqueado com sucesso');
        loadBlockedUsers(); // Recarregar lista
      } else {
        toast.error(result.error || 'Erro ao desbloquear usuário');
      }
    } catch (error) {
      console.error('Erro ao desbloquear usuário:', error);
      toast.error('Erro ao desbloquear usuário');
    } finally {
      setUnblockingUser(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="bg-zinc-900/50 rounded-full p-4 mb-3">
          <UserX className="h-8 w-8 text-zinc-600" />
        </div>
        <p className="text-sm text-zinc-500">Nenhum usuário bloqueado</p>
        <p className="text-xs text-zinc-600 mt-1">
          Usuários bloqueados aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="bg-zinc-900/50 text-zinc-400 border-zinc-800">
          {blockedUsers.length} bloqueado{blockedUsers.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <ScrollArea className="h-[200px] rounded-lg border border-zinc-800/50 bg-zinc-950/30">
        <div className="p-3 space-y-2">
          {blockedUsers.map((blockedUser) => (
            <div
              key={blockedUser.id}
              className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/50 rounded-lg hover:bg-zinc-900/60 transition-colors group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-9 w-9 ring-2 ring-zinc-800">
                  <AvatarImage src={blockedUser.avatar} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                    {blockedUser.userName?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {blockedUser.userName || 'Usuário'}
                  </p>
                  {blockedUser.reason && (
                    <p className="text-xs text-zinc-500 truncate">
                      {blockedUser.reason}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    Bloqueado {new Date(blockedUser.blocked_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnblock(blockedUser.blocked_user_id)}
                disabled={unblockingUser === blockedUser.blocked_user_id}
                className="h-8 px-3 text-red-400 hover:text-red-300 hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {unblockingUser === blockedUser.blocked_user_id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Desbloquear
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-start gap-2 p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-lg">
        <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-zinc-400">
            Usuários bloqueados não poderão comentar em nenhuma das suas transmissões.
          </p>
        </div>
      </div>
    </div>
  );
}

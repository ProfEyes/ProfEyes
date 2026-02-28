import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { BlockedUser } from '@/types/liveStream';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';

interface BlockedUsersManagerProps {
  streamId: string;
}

export function BlockedUsersManager({ streamId }: BlockedUsersManagerProps) {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const supabase = getSupabase();

  // Carregar usuários bloqueados
  useEffect(() => {
    loadBlockedUsers();
  }, [streamId]);

  const loadBlockedUsers = async () => {
    try {
      setIsLoading(true);
      
      // Verificar se a tabela existe
      const { error: tableError } = await supabase
        .from('blocked_stream_users')
        .select('id')
        .limit(1);

      // Se a tabela não existe, retorna lista vazia sem erro
      if (tableError && tableError.code === '42P01') {
        setBlockedUsers([]);
        return;
      }

      const { data, error } = await supabase
        .from('blocked_stream_users')
        .select(`
          user_id,
          blocked_at,
          blocked_by,
          users:user_id (
            user_metadata->>full_name as user_name
          )
        `)
        .eq('stream_id', streamId);

      if (error) throw error;

      const formattedUsers: BlockedUser[] = (data || []).map(item => ({
        userId: item.user_id,
        userName: item.users?.user_name || 'Usuário',
        blockedAt: item.blocked_at,
        blockedBy: item.blocked_by
      }));

      setBlockedUsers(formattedUsers);
    } catch (error) {
      console.error('Erro ao carregar usuários bloqueados:', error);
      setBlockedUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblockUser = async (userId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('blocked_stream_users')
        .delete()
        .eq('stream_id', streamId)
        .eq('user_id', userId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(user => user.userId !== userId));
    } catch (error) {
      console.error('Erro ao desbloquear usuário:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-white/70">
        Carregando usuários bloqueados...
      </div>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <div className="p-4 text-center text-white/70">
        Nenhum usuário bloqueado nesta transmissão.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] rounded-md border border-white/10 p-4">
      <div className="space-y-4">
        {blockedUsers.map(blockedUser => (
          <div
            key={blockedUser.userId}
            className="flex items-center justify-between bg-black/20 p-3 rounded-lg"
          >
            <div>
              <p className="font-medium text-white/90">{blockedUser.userName}</p>
              <p className="text-sm text-white/50">
                Bloqueado em: {new Date(blockedUser.blockedAt).toLocaleString()}
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleUnblockUser(blockedUser.userId, blockedUser.userName)}
            >
              Desbloquear
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
} 
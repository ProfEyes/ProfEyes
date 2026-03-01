import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

/**
 * Hook para gerenciar subscriptions em tempo real do Supabase
 * Suporta múltiplas tabelas e eventos com cleanup automático
 */

export type SupabaseTable = keyof Database['public']['Tables'] | 'trading_signals' | 'market_news' | 'live_streams' | 'stream_comments';
export type SupabaseEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimeConfig<T = unknown> {
  table: SupabaseTable;
  event?: SupabaseEvent;
  filter?: string;
  callback: (payload: RealtimePostgresChangesPayload<T>) => void;
  enabled?: boolean;
}

/**
 * Hook principal para subscriptions em tempo real
 */
export function useSupabaseRealtime<T = unknown>(config: RealtimeConfig<T>) {
  const { table, event = '*', filter, callback, enabled = true } = config;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Subscription desabilitada (silenciado)
      return;
    }

    const supabase = getSupabase();
    const channelName = `${table}_${event}_${Date.now()}`;

    // Conectando ao canal (silenciado)
    setStatus('connecting');

    try {
      // Criar o canal
      const channel = supabase.channel(channelName);

      // Configurar a subscription
      const subscriptionConfig: Record<string, unknown> = {
        event,
        schema: 'public',
        table,
      };

      if (filter) {
        subscriptionConfig.filter = filter;
      }

      channel.on(
        'postgres_changes' as never,
        subscriptionConfig as never,
        (payload: RealtimePostgresChangesPayload<T>) => {
          // Evento recebido (silenciado)
          callback(payload);
        }
      );

      // Monitorar status da conexão
      channel.on('system', {}, (payload: Record<string, unknown>) => {
        if (payload.status === 'ok') {
          // Conectado ao canal (silenciado)
          setStatus('connected');
          setError(null);
        } else if (payload.status === 'error') {
          setStatus('disconnected');
          setError(new Error(String(payload.error || 'Erro desconhecido')));
        }
      });

      // Subscribe ao canal
      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // Subscrito com sucesso (silenciado)
          setStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setStatus('disconnected');
          setError(err || new Error('Erro ao se inscrever'));
        } else if (status === 'TIMED_OUT') {
          console.warn(`[Realtime] Timeout ao se inscrever no canal ${channelName}`);
          setStatus('disconnected');
          setError(new Error('Timeout na conexão'));
        }
      });

      channelRef.current = channel;

      // Cleanup
      return () => {
        // Desconectando do canal
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        setStatus('disconnected');
      };
    } catch (err) {
      console.error(`[Realtime] Erro ao criar subscription para ${table}:`, err);
      setError(err as Error);
      setStatus('disconnected');
    }
  }, [table, event, filter, callback, enabled]);

  return { status, error };
}

/**
 * Hook especializado para sinais de trading em tempo real
 */
export function useTradingSignalsRealtime(
  onSignalChange: (signal: unknown) => void,
  enabled: boolean = true
) {
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<unknown>) => {
      // Mudança detectada (silenciado)
      
      switch (payload.eventType) {
        case 'INSERT':
          // Novo sinal (silenciado)
          onSignalChange(payload.new);
          break;
        case 'UPDATE':
          // Sinal atualizado (silenciado)
          onSignalChange(payload.new);
          break;
        case 'DELETE':
          // Sinal removido (silenciado)
          onSignalChange(payload.old);
          break;
      }
    },
    [onSignalChange]
  );

  return useSupabaseRealtime({
    table: 'trading_signals',
    event: '*',
    callback: handleChange,
    enabled,
  });
}

/**
 * Hook especializado para notícias em tempo real
 */
export function useMarketNewsRealtime(
  onNewsChange: (news: unknown) => void,
  enabled: boolean = true
) {
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<unknown>) => {
      // Market News mudança (silenciado)
      
      if (payload.eventType === 'INSERT') {
        // Nova notícia (silenciado)
        onNewsChange(payload.new);
      }
    },
    [onNewsChange]
  );

  return useSupabaseRealtime({
    table: 'market_news',
    event: 'INSERT',
    callback: handleChange,
    enabled,
  });
}

/**
 * Hook para live streams em tempo real
 */
export function useLiveStreamsRealtime(
  onStreamChange: (stream: unknown) => void,
  enabled: boolean = true
) {
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<unknown>) => {
      // Live Streams mudança (silenciado)
      onStreamChange(payload);
    },
    [onStreamChange]
  );

  return useSupabaseRealtime({
    table: 'live_streams',
    event: '*',
    callback: handleChange,
    enabled,
  });
}

/**
 * Hook para comentários de streams em tempo real
 */
export function useStreamCommentsRealtime(
  streamId: string,
  onCommentChange: (comment: unknown) => void,
  enabled: boolean = true
) {
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<unknown>) => {
      // Novo comentário (silenciado)
      if (payload.eventType === 'INSERT') {
        onCommentChange(payload.new);
      }
    },
    [onCommentChange]
  );

  return useSupabaseRealtime({
    table: 'stream_comments',
    event: 'INSERT',
    filter: `stream_id=eq.${streamId}`,
    callback: handleChange,
    enabled: enabled && !!streamId,
  });
}

/**
 * Hook para presença de usuários em tempo real
 */
export function usePresence(roomName: string, userId: string, metadata?: Record<string, unknown>) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, unknown>[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!roomName || !userId) return;

    const supabase = getSupabase();
    const channel = supabase.channel(`presence:${roomName}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Track presença
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        // Usuários online (silenciado)
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Usuário entrou (silenciado)
        setOnlineUsers((current) => [...current, ...newPresences]);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Usuário saiu (silenciado)
        setOnlineUsers((current) =>
          current.filter((user) => !(leftPresences as unknown[]).includes(user))
        );
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presença do usuário atual
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            ...metadata,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomName, userId, metadata]);

  return { onlineUsers, count: onlineUsers.length };
}

/**
 * Hook para broadcast de mensagens em tempo real
 */
export function useBroadcast(channelName: string) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [messages, setMessages] = useState<unknown[]>([]);

  useEffect(() => {
    if (!channelName) return;

    const supabase = getSupabase();
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        // Mensagem recebida (silenciado)
        setMessages((current) => [...current, payload]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelName]);

  const sendMessage = useCallback(
    async (message: unknown) => {
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'message',
          payload: message,
        });
        // Mensagem enviada (silenciado)
      }
    },
    [channelName]
  );

  return { messages, sendMessage };
}

/**
 * Hook combinado para múltiplas subscriptions
 * NOTA: Este hook não segue as regras dos hooks por chamar hooks em loop
 * Use com cautela ou refatore para usar useEffect com array de configs
 */
export function useMultipleRealtimeSubscriptions(configs: RealtimeConfig[]) {
  const statuses = configs.map((config) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { status } = useSupabaseRealtime(config);
    return status;
  });

  const allConnected = statuses.every((status) => status === 'connected');
  const anyConnecting = statuses.some((status) => status === 'connecting');
  const anyDisconnected = statuses.some((status) => status === 'disconnected');

  return {
    allConnected,
    anyConnecting,
    anyDisconnected,
    statuses,
  };
}

import { getSupabase } from '@/lib/supabase';
import { moderationEvents, MODERATION_EVENTS } from './moderationEvents';

export interface ModerationAction {
  id: string;
  streamerId: string;
  targetUserId: string;
  targetUserName?: string;
  moderatorId: string;
  moderatorName?: string;
  actionType: 'ban' | 'unban' | 'mute' | 'unmute' | 'timeout' | 'untimeout' | 'delete_message';
  reason: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface BannedUser {
  id: string;
  streamerId: string;
  bannedUserId: string;
  bannedUserName: string;
  bannedUserAvatar?: string;
  bannedBy: string;
  bannedByName: string;
  reason: string;
  createdAt: Date;
}

export interface MutedUser {
  id: string;
  streamerId: string;
  mutedUserId: string;
  mutedUserName: string;
  mutedUserAvatar?: string;
  mutedBy: string;
  mutedByName: string;
  reason: string;
  createdAt: Date;
}

export interface TimeoutUser {
  id: string;
  streamerId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timeoutBy: string;
  timeoutByName: string;
  reason: string;
  durationMinutes: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface UserModerationStatus {
  isBanned: boolean;
  isMuted: boolean;
  isInTimeout: boolean;
  timeoutExpiresAt?: Date;
  timeoutReason?: string;
}

const supabase = getSupabase();

/**
 * Verifica o status de moderação de um usuário
 */
export async function checkUserModerationStatus(
  userId: string,
  streamerId: string
): Promise<UserModerationStatus> {
  try {
    // Verificar ban
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: banData, error: banError } = await (supabase as any)
      .from('stream_bans')
      .select('id')
      .eq('streamer_id', streamerId)
      .eq('banned_user_id', userId)
      .maybeSingle();

    if (banError) throw banError;

    // Verificar mute
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: muteData, error: muteError } = await (supabase as any)
      .from('stream_mutes')
      .select('id')
      .eq('streamer_id', streamerId)
      .eq('muted_user_id', userId)
      .maybeSingle();

    if (muteError) throw muteError;

    // Verificar timeout ativo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: timeoutData, error: timeoutError } = await (supabase as any)
      .from('stream_timeouts')
      .select('expires_at, reason')
      .eq('streamer_id', streamerId)
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (timeoutError) throw timeoutError;

    return {
      isBanned: !!banData,
      isMuted: !!muteData,
      isInTimeout: !!timeoutData,
      timeoutExpiresAt: timeoutData?.expires_at ? new Date(timeoutData.expires_at) : undefined,
      timeoutReason: timeoutData?.reason
    };
  } catch (error) {
    console.error('Erro ao verificar status de moderação:', error);
    throw error;
  }
}

/**
 * Banir usuário permanentemente
 */
export async function banUser(
  streamerId: string,
  targetUserId: string,
  moderatorId: string,
  reason: string
): Promise<void> {
  try {
    // Validações de valores obrigatórios
    if (!streamerId || !targetUserId || !moderatorId || !reason) {
      throw new Error('Todos os parâmetros são obrigatórios');
    }

    // Validações de segurança
    if (targetUserId === streamerId) {
      throw new Error('Não é possível banir o dono da live');
    }
    
    if (targetUserId === moderatorId) {
      throw new Error('Não é possível se auto-banir');
    }

    // Inserir ban
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: banError } = await (supabase as any)
      .from('stream_bans')
      .insert({
        streamer_id: streamerId,
        banned_user_id: targetUserId,
        banned_by: moderatorId,
        reason
      });

    if (banError) throw banError;

    // Registrar log
    await logModerationAction(
      streamerId,
      targetUserId,
      moderatorId,
      'ban',
      reason
    );

    // Emitir evento para atualização em tempo real
    moderationEvents.emit(MODERATION_EVENTS.BAN_APPLIED, {
      streamerId,
      targetUserId,
      moderatorId
    });

    console.log(`✅ Usuário ${targetUserId} banido com sucesso`);
  } catch (error) {
    console.error('Erro ao banir usuário:', error);
    throw error;
  }
}

/**
 * Desbanir usuário
 */
export async function unbanUser(
  streamerId: string,
  targetUserId: string,
  moderatorId: string,
  reason: string
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('stream_bans')
      .delete()
      .eq('streamer_id', streamerId)
      .eq('banned_user_id', targetUserId);

    if (error) throw error;

    // Registrar log
    await logModerationAction(
      streamerId,
      targetUserId,
      moderatorId,
      'unban',
      reason
    );

    // Emitir evento para atualização em tempo real
    moderationEvents.emit(MODERATION_EVENTS.BAN_REMOVED, {
      streamerId,
      targetUserId,
      moderatorId
    });

    console.log(`✅ Usuário ${targetUserId} desbanido com sucesso`);
  } catch (error) {
    console.error('Erro ao desbanir usuário:', error);
    throw error;
  }
}

/**
 * Mutar usuário permanentemente
 */
export async function muteUser(
  streamerId: string,
  targetUserId: string,
  moderatorId: string,
  reason: string
): Promise<void> {
  try {
    // Validações de valores obrigatórios
    if (!streamerId || !targetUserId || !moderatorId || !reason) {
      throw new Error('Todos os parâmetros são obrigatórios');
    }

    // Validações de segurança
    if (targetUserId === streamerId) {
      throw new Error('Não é possível mutar o dono da live');
    }
    
    if (targetUserId === moderatorId) {
      throw new Error('Não é possível se auto-mutar');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: muteError } = await (supabase as any)
      .from('stream_mutes')
      .insert({
        streamer_id: streamerId,
        muted_user_id: targetUserId,
        muted_by: moderatorId,
        reason
      });

    if (muteError) throw muteError;

    // Registrar log
    await logModerationAction(
      streamerId,
      targetUserId,
      moderatorId,
      'mute',
      reason
    );

    // Emitir evento para atualização em tempo real
    moderationEvents.emit(MODERATION_EVENTS.MUTE_APPLIED, {
      streamerId,
      targetUserId,
      moderatorId
    });

    console.log(`✅ Usuário ${targetUserId} mutado com sucesso`);
  } catch (error) {
    console.error('Erro ao mutar usuário:', error);
    throw error;
  }
}

/**
 * Desmutar usuário
 */
export async function unmuteUser(
  streamerId: string,
  targetUserId: string,
  moderatorId: string,
  reason: string
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('stream_mutes')
      .delete()
      .eq('streamer_id', streamerId)
      .eq('muted_user_id', targetUserId);

    if (error) throw error;

    // Registrar log
    await logModerationAction(
      streamerId,
      targetUserId,
      moderatorId,
      'unmute',
      reason
    );

    // Emitir evento para atualização em tempo real
    moderationEvents.emit(MODERATION_EVENTS.MUTE_REMOVED, {
      streamerId,
      targetUserId,
      moderatorId
    });

    console.log(`✅ Usuário ${targetUserId} desmutado com sucesso`);
  } catch (error) {
    console.error('Erro ao desmutar usuário:', error);
    throw error;
  }
}

/**
 * Aplicar timeout temporário
 */
export async function timeoutUser(
  streamerId: string,
  targetUserId: string,
  moderatorId: string,
  reason: string,
  durationMinutes: number
): Promise<void> {
  try {
    // Validações de valores obrigatórios
    if (!streamerId || !targetUserId || !moderatorId || !reason || !durationMinutes) {
      throw new Error('Todos os parâmetros são obrigatórios');
    }

    // Validações de segurança
    if (targetUserId === streamerId) {
      throw new Error('Não é possível aplicar timeout no dono da live');
    }
    
    if (targetUserId === moderatorId) {
      throw new Error('Não é possível aplicar timeout em si mesmo');
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

    // Deletar timeout existente se houver
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('stream_timeouts')
      .delete()
      .eq('streamer_id', streamerId)
      .eq('user_id', targetUserId);

    // Inserir novo timeout
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: timeoutError } = await (supabase as any)
      .from('stream_timeouts')
      .insert({
        streamer_id: streamerId,
        user_id: targetUserId,
        timeout_by: moderatorId,
        reason,
        duration_minutes: durationMinutes,
        expires_at: expiresAt.toISOString()
      });

    if (timeoutError) throw timeoutError;

    // Registrar log
    await logModerationAction(
      streamerId,
      targetUserId,
      moderatorId,
      'timeout',
      reason,
      { durationMinutes, expiresAt: expiresAt.toISOString() }
    );

    // Emitir evento para atualização em tempo real
    moderationEvents.emit(MODERATION_EVENTS.TIMEOUT_APPLIED, {
      streamerId,
      targetUserId,
      moderatorId,
      durationMinutes
    });

    console.log(`✅ Timeout de ${durationMinutes} minutos aplicado ao usuário ${targetUserId}`);
  } catch (error) {
    console.error('Erro ao aplicar timeout:', error);
    throw error;
  }
}

/**
 * Remover timeout
 */
export async function removeTimeout(
  streamerId: string,
  targetUserId: string,
  moderatorId: string,
  reason: string
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('stream_timeouts')
      .delete()
      .eq('streamer_id', streamerId)
      .eq('user_id', targetUserId);

    if (error) throw error;

    // Registrar log
    await logModerationAction(
      streamerId,
      targetUserId,
      moderatorId,
      'untimeout',
      reason
    );

    // Emitir evento para atualização em tempo real
    moderationEvents.emit(MODERATION_EVENTS.TIMEOUT_REMOVED, {
      streamerId,
      targetUserId,
      moderatorId
    });

    console.log(`✅ Timeout removido do usuário ${targetUserId}`);
  } catch (error) {
    console.error('Erro ao remover timeout:', error);
    throw error;
  }
}

/**
 * Registrar ação de moderação no log
 */
export async function logModerationAction(
  streamerId: string,
  targetUserId: string,
  moderatorId: string,
  actionType: ModerationAction['actionType'],
  reason: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('moderation_logs')
      .insert({
        streamer_id: streamerId,
        target_user_id: targetUserId,
        moderator_id: moderatorId,
        action_type: actionType,
        reason,
        metadata: metadata || {}
      });

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao registrar log de moderação:', error);
    // Não lançar erro para não interromper a ação principal
  }
}

/**
 * Buscar usuários banidos
 */
export async function getBannedUsers(streamerId: string): Promise<BannedUser[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('stream_bans')
      .select(`
        id,
        streamer_id,
        banned_user_id,
        banned_by,
        reason,
        created_at,
        banned_profile:user_profiles!stream_bans_banned_user_profile_fkey(display_name, avatar_url),
        moderator_profile:user_profiles!stream_bans_banned_by_profile_fkey(display_name)
      `)
      .eq('streamer_id', streamerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((ban: any) => ({
      id: ban.id,
      streamerId: ban.streamer_id,
      bannedUserId: ban.banned_user_id,
      bannedUserName: ban.banned_profile?.display_name || 'Usuário',
      bannedUserAvatar: ban.banned_profile?.avatar_url,
      bannedBy: ban.banned_by,
      bannedByName: ban.moderator_profile?.display_name || 'Moderador',
      reason: ban.reason,
      createdAt: new Date(ban.created_at)
    }));
  } catch (error) {
    console.error('Erro ao buscar usuários banidos:', error);
    throw error;
  }
}

/**
 * Buscar usuários mutados
 */
export async function getMutedUsers(streamerId: string): Promise<MutedUser[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('stream_mutes')
      .select(`
        id,
        streamer_id,
        muted_user_id,
        muted_by,
        reason,
        created_at,
        muted_profile:user_profiles!stream_mutes_muted_user_profile_fkey(display_name, avatar_url),
        moderator_profile:user_profiles!stream_mutes_muted_by_profile_fkey(display_name)
      `)
      .eq('streamer_id', streamerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((mute: any) => ({
      id: mute.id,
      streamerId: mute.streamer_id,
      mutedUserId: mute.muted_user_id,
      mutedUserName: mute.muted_profile?.display_name || 'Usuário',
      mutedUserAvatar: mute.muted_profile?.avatar_url,
      mutedBy: mute.muted_by,
      mutedByName: mute.moderator_profile?.display_name || 'Moderador',
      reason: mute.reason,
      createdAt: new Date(mute.created_at)
    }));
  } catch (error) {
    console.error('Erro ao buscar usuários mutados:', error);
    throw error;
  }
}

/**
 * Buscar usuários em timeout
 */
export async function getTimedOutUsers(streamerId: string): Promise<TimeoutUser[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('stream_timeouts')
      .select(`
        id,
        streamer_id,
        user_id,
        timeout_by,
        reason,
        duration_minutes,
        expires_at,
        created_at,
        user_profile:user_profiles!stream_timeouts_user_profile_fkey(display_name, avatar_url),
        moderator_profile:user_profiles!stream_timeouts_timeout_by_profile_fkey(display_name)
      `)
      .eq('streamer_id', streamerId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((timeout: any) => ({
      id: timeout.id,
      streamerId: timeout.streamer_id,
      userId: timeout.user_id,
      userName: timeout.user_profile?.display_name || 'Usuário',
      userAvatar: timeout.user_profile?.avatar_url,
      timeoutBy: timeout.timeout_by,
      timeoutByName: timeout.moderator_profile?.display_name || 'Moderador',
      reason: timeout.reason,
      durationMinutes: timeout.duration_minutes,
      expiresAt: new Date(timeout.expires_at),
      createdAt: new Date(timeout.created_at)
    }));
  } catch (error) {
    console.error('Erro ao buscar usuários em timeout:', error);
    throw error;
  }
}

/**
 * Buscar logs de moderação
 */
export async function getModerationLogs(
  streamerId: string,
  limit: number = 50
): Promise<ModerationAction[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('moderation_logs')
      .select(`
        id,
        streamer_id,
        target_user_id,
        moderator_id,
        action_type,
        reason,
        metadata,
        created_at,
        target_profile:user_profiles!moderation_logs_target_user_profile_fkey(display_name),
        moderator_profile:user_profiles!moderation_logs_moderator_profile_fkey(display_name)
      `)
      .eq('streamer_id', streamerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((log: any) => ({
      id: log.id,
      streamerId: log.streamer_id,
      targetUserId: log.target_user_id,
      targetUserName: log.target_profile?.display_name,
      moderatorId: log.moderator_id,
      moderatorName: log.moderator_profile?.display_name,
      actionType: log.action_type,
      reason: log.reason,
      metadata: log.metadata || {},
      createdAt: new Date(log.created_at)
    }));
  } catch (error) {
    console.error('Erro ao buscar logs de moderação:', error);
    throw error;
  }
}

import { supabase } from '@/lib/supabase';
import type { Notification } from '@/contexts/NotificationContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Serviço para gerenciar notificações dos usuários no banco de dados Supabase
 */
export class UserNotificationDatabaseService {
  /**
   * Salvar uma notificação no banco de dados
   */
  async saveNotification(notification: Notification): Promise<{ success: boolean; error?: Error }> {
    try {
      // Obter usuário atual
      const { data: { user }, error: userError } = await (supabase as SupabaseClient<Database>).auth.getUser();
      
      if (userError || !user) {
        console.warn('Usuário não autenticado, não salvando notificação no banco');
        return { success: false, error: new Error('Usuário não autenticado') };
      }

      // Preparar dados para inserção
      const notificationData = {
        user_id: user.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.read,
        link_to: notification.linkTo || null,
        action_link: notification.actionLink || null,
        image: notification.image || null,
        data: notification.data || {},
        created_at: notification.createdAt || notification.timestamp || new Date(),
      };

      // Inserir no banco de dados
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('user_notifications')
        .insert(notificationData);

      if (error) {
        console.error('Erro ao salvar notificação no banco:', error);
        return { success: false, error: new Error(error.message) };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar notificação:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Erro desconhecido') 
      };
    }
  }

  /**
   * ✅ Salvar uma notificação e retornar o ID gerado pelo banco
   */
  async saveNotificationWithId(notification: Notification): Promise<{ success: boolean; id?: string; error?: Error }> {
    try {
      // Obter usuário atual
      const { data: { user }, error: userError } = await (supabase as SupabaseClient<Database>).auth.getUser();
      
      if (userError || !user) {
        console.warn('Usuário não autenticado, não salvando notificação no banco');
        return { success: false, error: new Error('Usuário não autenticado') };
      }

      // Preparar dados para inserção
      const notificationData = {
        user_id: user.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.read,
        link_to: notification.linkTo || null,
        action_link: notification.actionLink || null,
        image: notification.image || null,
        data: notification.data || {},
        created_at: notification.createdAt || notification.timestamp || new Date(),
      };

      // ✅ Inserir e selecionar o ID retornado
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('user_notifications')
        .insert(notificationData)
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao salvar notificação no banco:', error);
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, id: String(data.id) };
    } catch (error) {
      console.error('Erro ao salvar notificação:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Erro desconhecido') 
      };
    }
  }

  /**
   * Carregar notificações do usuário do banco de dados
   */
  async loadNotifications(
    limit: number = 50,
    offset: number = 0,
    onlyUnread: boolean = false
  ): Promise<{ notifications: Notification[]; error?: Error }> {
    try {
      // Obter usuário atual
      const { data: { user }, error: userError } = await (supabase as SupabaseClient<Database>).auth.getUser();
      
      if (userError || !user) {
        console.warn('Usuário não autenticado, não carregando notificações');
        return { notifications: [], error: new Error('Usuário não autenticado') };
      }

      // Buscar notificações usando a função do banco
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_user_notifications', {
        p_limit: limit,
        p_offset: offset,
        p_only_unread: onlyUnread
      });

      if (error) {
        console.error('Erro ao carregar notificações do banco:', error);
        return { notifications: [], error: new Error(error.message) };
      }

      // Converter para o formato do contexto
      const notifications: Notification[] = (data || []).map((dbNotification: Record<string, unknown>) => ({
        id: String(dbNotification.id),
        type: dbNotification.type as Notification['type'],
        title: String(dbNotification.title),
        message: String(dbNotification.message),
        read: Boolean(dbNotification.read),
        linkTo: dbNotification.link_to ? String(dbNotification.link_to) : undefined,
        actionLink: dbNotification.action_link ? String(dbNotification.action_link) : undefined,
        image: dbNotification.image ? String(dbNotification.image) : undefined,
        data: (dbNotification.data as Record<string, unknown>) || {},
        timestamp: new Date(String(dbNotification.created_at)),
        createdAt: new Date(String(dbNotification.created_at)),
      }));

      return { notifications };
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      return { 
        notifications: [], 
        error: error instanceof Error ? error : new Error('Erro desconhecido') 
      };
    }
  }

  /**
   * Marcar uma notificação como lida
   */
  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: Error }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('mark_notification_as_read', {
        notification_id: notificationId
      });

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        return { success: false, error: new Error(error.message) };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Erro desconhecido') 
      };
    }
  }

  /**
   * Marcar todas as notificações como lidas
   */
  async markAllAsRead(): Promise<{ success: boolean; error?: Error }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('mark_all_notifications_as_read');

      if (error) {
        console.error('Erro ao marcar todas as notificações como lidas:', error);
        return { success: false, error: new Error(error.message) };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Erro desconhecido') 
      };
    }
  }

  /**
   * Deletar uma notificação
   */
  async deleteNotification(notificationId: string): Promise<{ success: boolean; error?: Error }> {
    try {
      // Obter usuário atual
      const { data: { user }, error: userError } = await (supabase as SupabaseClient<Database>).auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: new Error('Usuário não autenticado') };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('user_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao deletar notificação:', error);
        const errorMsg = (error as { message?: string })?.message || String(error);
        return { success: false, error: new Error(errorMsg) };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Erro desconhecido') 
      };
    }
  }

  /**
   * Deletar todas as notificações do usuário
   */
  async deleteAllNotifications(): Promise<{ success: boolean; error?: Error }> {
    try {
      // Obter usuário atual
      const { data: { user }, error: userError } = await (supabase as SupabaseClient<Database>).auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: new Error('Usuário não autenticado') };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('user_notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao deletar todas as notificações:', error);
        return { success: false, error: new Error(error.message) };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar todas as notificações:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Erro desconhecido') 
      };
    }
  }

  /**
   * Obter contagem de notificações não lidas
   */
  async getUnreadCount(): Promise<{ count: number; error?: Error }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_unread_notifications_count');

      if (error) {
        console.error('Erro ao obter contagem de não lidas:', error);
        return { count: 0, error: new Error(error.message) };
      }

      return { count: data || 0 };
    } catch (error) {
      console.error('Erro ao obter contagem de não lidas:', error);
      return { 
        count: 0, 
        error: error instanceof Error ? error : new Error('Erro desconhecido') 
      };
    }
  }

  /**
   * Sincronizar notificações do localStorage com o banco de dados
   * (Útil para migrar notificações antigas)
   */
  async syncLocalStorageToDatabase(): Promise<{ success: boolean; syncedCount: number; error?: Error }> {
    try {
      // Obter usuário atual
      const { data: { user }, error: userError } = await (supabase as SupabaseClient<Database>).auth.getUser();
      
      if (userError || !user) {
        console.warn('Usuário não autenticado, não sincronizando');
        return { success: false, syncedCount: 0, error: new Error('Usuário não autenticado') };
      }

      // Carregar notificações do localStorage
      const savedNotifications = localStorage.getItem('userNotifications');
      if (!savedNotifications) {
        return { success: true, syncedCount: 0 };
      }

      const localNotifications = JSON.parse(savedNotifications) as Array<Omit<Notification, 'timestamp'> & { timestamp: string }>;
      
      if (!Array.isArray(localNotifications) || localNotifications.length === 0) {
        return { success: true, syncedCount: 0 };
      }

      // Inserir notificações no banco
      let syncedCount = 0;
      for (const notification of localNotifications) {
        const result = await this.saveNotification({
          ...notification,
          timestamp: new Date(notification.timestamp),
        } as Notification);
        
        if (result.success) {
          syncedCount++;
        }
      }
      
      // Limpar localStorage após sincronização bem-sucedida
      if (syncedCount === localNotifications.length) {
        localStorage.removeItem('userNotifications');
      }

      return { success: true, syncedCount };
    } catch (error) {
      console.error('Erro ao sincronizar notificações:', error);
      return { 
        success: false, 
        syncedCount: 0,
        error: error instanceof Error ? error : new Error('Erro desconhecido') 
      };
    }
  }
}

// Exportar instância única do serviço
export const userNotificationDB = new UserNotificationDatabaseService();

import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Tipo básico para usuário
export type UserData = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  app_metadata: {
    provider?: string;
  };
  user_metadata: {
    name?: string;
    birthdate?: string;
  };
  email_confirmed_at: string | null;
};

// Tipo para a resposta da paginação
interface Pagination {
  total: number;
  next: number | null;
  previous: number | null;
}

// Funções para o gerenciamento de usuários
// Estas funções devem ser executadas através de um backend seguro em produção
// IMPORTANTE: As funções abaixo são apenas demonstrativas!
// Em um ambiente de produção, estas deveriam ser chamadas via API segura no backend

/**
 * Verifica se o usuário atual tem permissões de administrador
 */
export const checkAdminPermission = async (userId: string): Promise<boolean> => {
  try {
    // Verificar na tabela user_profiles se o usuário tem permissão de admin
    const { data, error } = await (supabase as SupabaseClient<Database>)
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.error('Erro ao verificar permissões de admin:', error);
      return false;
    }

    return !!data.is_admin;
  } catch (err) {
    console.error('Erro ao verificar permissões de admin:', err);
    return false;
  }
};

/**
 * Lista usuários com paginação
 * NOTA: Em produção, esta função deve ser substituída por uma chamada a uma API backend
 */
export const listUsers = async (page: number = 1, perPage: number = 10): Promise<{
  users: UserData[];
  total: number;
  error: string | null;
}> => {
  try {
    // Em produção, esta chamada deveria ser feita para um backend seguro
    // que usa a chave de serviço do Supabase para acessar a API admin
    const response = await (supabase as SupabaseClient<Database>).auth.admin.listUsers({
      page,
      perPage,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    // Obter os dados com um fallback seguro para total
    const users = response.data.users as UserData[];
    const total = (response.data as { total?: number }).total ?? 0;

    return {
      users,
      total,
      error: null
    };
  } catch (err: unknown) {
    console.error('Erro ao listar usuários:', err);
    return {
      users: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Erro ao buscar usuários'
    };
  }
};

/**
 * Cria um novo usuário
 * NOTA: Em produção, esta função deve ser substituída por uma chamada a uma API backend
 */
export const createUser = async (email: string, password: string, userData: {
  name?: string;
  birthdate?: string;
}): Promise<{
  user: UserData | null;
  error: string | null;
}> => {
  try {
    // Em produção, esta chamada deveria ser feita para um backend seguro
    const response = await (supabase as SupabaseClient<Database>).auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userData
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    // Registrar a ação no log
    await logAdminAction('create', response.data.user.id);

    return {
      user: response.data.user as UserData,
      error: null
    };
  } catch (err: unknown) {
    console.error('Erro ao criar usuário:', err);
    return {
      user: null,
      error: err instanceof Error ? err.message : 'Erro ao criar usuário'
    };
  }
};

/**
 * Exclui um usuário
 * NOTA: Em produção, esta função deve ser substituída por uma chamada a uma API backend
 */
export const deleteUser = async (userId: string): Promise<{
  success: boolean;
  error: string | null;
}> => {
  try {
    // Em produção, esta chamada deveria ser feita para um backend seguro
    const { error } = await (supabase as SupabaseClient<Database>).auth.admin.deleteUser(userId);

    if (error) {
      throw new Error(error.message);
    }

    // Registrar a ação no log
    await logAdminAction('delete', userId);

    return {
      success: true,
      error: null
    };
  } catch (err: unknown) {
    console.error('Erro ao excluir usuário:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao excluir usuário'
    };
  }
};

/**
 * Registra ações administrativas em um log
 */
export const logAdminAction = async (
  action: 'create' | 'update' | 'delete' | 'reset_password',
  targetUserId: string | null = null,
  details: Record<string, unknown> | null = null
): Promise<void> => {
  try {
    const { data: userData } = await (supabase as SupabaseClient<Database>).auth.getUser();
    if (!userData?.user) {
      console.error('Não foi possível registrar a ação: usuário não autenticado');
      return;
    }

  } catch (err) {
    console.error('Erro ao registrar ação de administrador:', err);
  }
};

/**
 * Recupera logs de ações administrativas
 * NOTA: Tabela 'user_management_logs' não definida no schema atual - funcionalidade desabilitada
 */
export const getAdminLogs = async (limit: number = 50): Promise<Record<string, unknown>[]> => {
  try {
    // TODO: Criar tabela 'user_management_logs' no Supabase
    console.log('[Admin Logs] Solicitação de logs (limit:', limit, ')');
    return [];
  } catch (err) {
    console.error('Erro ao buscar logs administrativos:', err);
    return [];
  }
}; 
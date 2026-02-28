/**
 * Script para migrar avatares existentes apenas no localStorage para o banco de dados
 * 
 * Este script é executado automaticamente na inicialização da aplicação para garantir
 * que todos os avatares sejam persistidos corretamente no banco de dados.
 */

import { supabase, saveUserAvatar } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Migra o avatar do localStorage para o banco de dados
 * para garantir persistência completa
 */
export const migrateAvatarsToDatabase = async (): Promise<void> => {
  try {
    // Verificar se o usuário está autenticado
    const { data } = await (supabase as SupabaseClient<Database>).auth.getUser();
    
    if (!data?.user?.id) {
      console.log('Usuário não autenticado, migração de avatar ignorada');
      return;
    }
    
    const userId = data.user.id;
    
    // Verificar se existe um avatar no localStorage
    const localAvatar = localStorage.getItem('user-avatar');
    if (!localAvatar) {
      console.log('Nenhum avatar local encontrado para migrar');
      return;
    }
    
    // Verificando migração de avatar
    
    // Verificar se o avatar já existe no banco de dados
    const { data: profileData } = await (supabase as SupabaseClient<Database>)
      .from('user_profiles')
      .select('avatar_url')
      .eq('user_id', userId)
      .single();
    
    // Se já existe um avatar no banco e é o mesmo do localStorage, não precisamos fazer nada
    if (profileData?.avatar_url === localAvatar) {
      // Avatar sincronizado
      return;
    }
    
    // Se chegou aqui, temos um avatar local que precisa ser migrado ou atualizado no banco
    console.log('Migrando avatar para o banco de dados...');
    
    // Salvar no banco de dados
    const { success, error } = await saveUserAvatar(userId, localAvatar);
    
    if (success) {
      console.log('Avatar migrado com sucesso para o banco de dados');
      
      // Registrar que a migração foi concluída
      localStorage.setItem('avatar-migrated-to-db', 'true');
    } else {
      console.error('Falha ao migrar avatar para o banco de dados:', error);
    }
  } catch (error) {
    console.error('Erro durante a migração do avatar:', error);
  }
};

/**
 * Inicializa o processo de migração
 */
export const initAvatarMigration = (): void => {
  // Executar a migração após um pequeno atraso para não afetar o carregamento inicial
  setTimeout(() => {
    migrateAvatarsToDatabase();
  }, 5000); // Atraso de 5 segundos
};

export default initAvatarMigration; 
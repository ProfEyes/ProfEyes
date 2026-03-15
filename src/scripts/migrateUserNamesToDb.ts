/**
 * Script para migrar nomes de usuário existentes apenas no localStorage para o banco de dados
 * 
 * Este script é executado automaticamente na inicialização da aplicação para garantir
 * que todos os nomes de usuário sejam persistidos corretamente no banco de dados.
 */

import { supabase, saveUserDisplayName } from '@/lib/supabase';

/**
 * Migra o nome de usuário do localStorage para o banco de dados
 * para garantir persistência completa
 */
export const migrateUserNamesToDatabase = async (): Promise<void> => {
  try {
    // Verificar se o usuário está autenticado
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).auth.getUser();
    
    if (!data?.user?.id) {
      console.log('Usuário não autenticado, migração de nome ignorada');
      return;
    }
    
    const userId = data.user.id;
    
    // Verificar se existe um nome no localStorage
    const localUserName = localStorage.getItem('user-name');
    if (!localUserName) {
      console.log('Nenhum nome local encontrado para migrar');
      return;
    }
    
    // Verificando migração de nome
    
    // Verificar se o nome já existe no banco de dados
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileData } = await (supabase as any)
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', userId)
      .single();
    
    // Se já existe um nome no banco e é o mesmo do localStorage, não precisamos fazer nada
    if (profileData?.display_name === localUserName) {
      // Nome sincronizado
      return;
    }
    
    // Se chegou aqui, temos um nome local que precisa ser migrado ou atualizado no banco
    console.log('Migrando nome para o banco de dados...');
    
    // Salvar no banco de dados
    const { success, error } = await saveUserDisplayName(userId, localUserName);
    
    if (success) {
      console.log('Nome migrado com sucesso para o banco de dados');
      
      // Registrar que a migração foi concluída
      localStorage.setItem('username-migrated-to-db', 'true');
    } else {
      console.error('Falha ao migrar nome para o banco de dados:', error);
    }
  } catch (error) {
    console.error('Erro durante a migração do nome:', error);
  }
};

/**
 * Inicializa o processo de migração
 */
export const initUserNameMigration = (): void => {
  // Executar a migração após um pequeno atraso para não afetar o carregamento inicial
  setTimeout(() => {
    migrateUserNamesToDatabase();
  }, 5000); // Atraso de 5 segundos
};

export default initUserNameMigration; 
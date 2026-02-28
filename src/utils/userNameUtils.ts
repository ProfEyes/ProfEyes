/**
 * Utilidades para manipulação e persistência do nome de exibição do usuário
 */

import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Constante para o nome da chave utilizada no localStorage
 */
const USERNAME_STORAGE_KEY = "user-name";
const USERNAME_TIMESTAMP_KEY = "user-name-timestamp";

/**
 * Verifica se existe um nome de usuário salvo e retorna seu valor
 * 
 * @returns Nome do usuário ou null se não existir
 */
export const getSavedUserName = (): string | null => {
  return localStorage.getItem(USERNAME_STORAGE_KEY);
};

/**
 * Salva o nome do usuário no localStorage e atualiza o timestamp
 * 
 * @param userName Nome do usuário para salvar
 * @param userId ID do usuário (opcional)
 * @param skipEvent Flag para evitar disparar eventos (opcional)
 */
export const saveUserName = async (userName: string, userId?: string, skipEvent: boolean = false): Promise<void> => {
  // Log para depuração - verificar o valor original
  // saveUserName (silenciado)
  
  // Verificar por caracteres nulos ou inválidos que possam causar truncamento
  if (userName.includes('\0')) {
    console.warn("AVISO: Nome contém caractere nulo que pode causar truncamento!");
    // Remover caracteres nulos para evitar problemas
    userName = userName.replace(/\0/g, '');
  }
  
  // Garantir que o nome não seja truncado em nenhum momento
  // Criar uma cópia explícita da string para evitar modificações inesperadas
  const userNameToSave = `${userName}`;
  
  // Sempre salva no localStorage para acesso rápido
  localStorage.setItem(USERNAME_STORAGE_KEY, userNameToSave);
  localStorage.setItem(USERNAME_TIMESTAMP_KEY, Date.now().toString());
  
  // Depuração: verificar no localStorage após salvar
  const savedName = localStorage.getItem(USERNAME_STORAGE_KEY);
  // Valor salvo (silenciado)
  
  // Verificar se houve perda de caracteres
  if (savedName && savedName.length !== userNameToSave.length) {
    console.error(`ERRO: Perda de caracteres detectada! Original: ${userNameToSave.length}, Salvo: ${savedName.length}`);
    
    // Tentativa de correção: salvar novamente em caso de truncamento
    try {
      console.warn("Tentando salvar novamente para evitar truncamento...");
      
      // Salvar novamente com abordagem alternativa
      window.localStorage.setItem(USERNAME_STORAGE_KEY, userNameToSave);
      
      // Verificar novamente
      const reSavedName = localStorage.getItem(USERNAME_STORAGE_KEY);
      if (reSavedName && reSavedName.length !== userNameToSave.length) {
        console.error("Problema persistente de truncamento no nome de usuário!");
      } else {
        console.log("Correção do truncamento bem-sucedida!");
      }
    } catch (retryError) {
      console.error("Falha na tentativa de corrigir truncamento:", retryError);
    }
  }
  
  // Se não quiser disparar evento, encerrar aqui
  if (skipEvent !== true) {
    // Notificar componentes sobre a alteração de nome
      window.dispatchEvent(new CustomEvent('username-updated', { 
        detail: { userName: userNameToSave, fromSave: true }
      }));
  }
  
  // Se tivermos um ID de usuário, salvar também no banco de dados
  if (userId) {
    try {
      // Salvando nome (silenciado)
      
      // Importar a função específica do Supabase
    const { saveUserDisplayName } = await import('@/lib/supabase');
    
      // Função de retry para garantir que o salvamento funcione mesmo com problemas temporários
      const retryOperation = async (operation: () => Promise<any>, maxRetries = 3, initialDelay = 300) => {
        let retries = 0;
        let delay = initialDelay;
        
        while (retries < maxRetries) {
          try {
            return await operation();
          } catch (error) {
            retries++;
            if (retries >= maxRetries) throw error;
            console.warn(`Tentativa ${retries} falhou, tentando novamente em ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Backoff exponencial
          }
        }
      };
      
      // Tenta salvar o nome no banco de dados
      await retryOperation(async () => {
        const result = await saveUserDisplayName(userId, userNameToSave);
        if (!result.success) {
          console.error("Erro ao salvar nome no banco de dados:", result.error);
          throw result.error;
        }
        return result;
      });
      
      // Nome salvo (silenciado)
  } catch (error) {
      console.error("Erro ao salvar nome no banco de dados:", error);
      
      // Mesmo com falha, ainda vamos manter a versão do localStorage
      // garantindo que pelo menos o acesso local funcione
    }
  }
};

/**
 * Verifica quando o nome foi salvo pela última vez
 * 
 * @returns Timestamp do último salvamento ou null se nunca foi salvo
 */
export const getUserNameTimestamp = (): number | null => {
  const timestamp = localStorage.getItem(USERNAME_TIMESTAMP_KEY);
  return timestamp ? parseInt(timestamp) : null;
};

/**
 * Atualiza o nome de exibição do usuário nos diferentes contextos da aplicação
 * 
 * @param userName Novo nome de exibição
 */
export const updateUserName = async (userName: string): Promise<void> => {
  try {
    // Log para depuração
    console.log('updateUserName: Iniciando atualização para:', userName);
    
    // Salvar no banco de dados e localStorage para garantir persistência
    // Pulamos o disparo de evento já que vamos fazer isso manualmente abaixo
    await saveUserName(userName, undefined, true);
    
    // Disparar evento para atualizar todos os componentes que usam o nome
    // Incluímos flags para evitar loops de salvamento
    window.dispatchEvent(new CustomEvent('username-updated', { 
      detail: { userName, fromUpdate: true, fromSave: true }
    }));
    
    console.log('Nome atualizado com sucesso:', userName);
  } catch (error) {
    console.error('Erro ao atualizar nome:', error);
    throw error;
  }
};

/**
 * Carrega o nome do usuário de forma resiliente, verificando múltiplas fontes
 * 
 * @param userId ID do usuário (opcional, se omitido tentará obter do Supabase)
 * @returns Promise com o nome do usuário ou null se não encontrado
 */
export const loadUserName = async (userId?: string): Promise<string | null> => {
  try {
    // 1. Primeiro verificar no localStorage (acesso rápido)
    const localUserName = getSavedUserName();
    if (localUserName) {
      console.log('Nome carregado do localStorage:', localUserName);
      return localUserName;
    }
    
    // Se não foi fornecido userId, tentar obter do usuário autenticado
    if (!userId) {
      const { data } = await (supabase as SupabaseClient<Database>).auth.getUser();
      if (data?.user?.id) {
        userId = data.user.id;
      } else {
        console.warn('Não foi possível obter o ID do usuário atual');
        return null;
      }
    }
    
    // 2. Verificar na tabela user_profiles (mais confiável para persistência)
    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', userId)
        .single();
        
      if (profileData?.display_name) {
        // Atualizar o localStorage para acessos futuros
        localStorage.setItem(USERNAME_STORAGE_KEY, profileData.display_name);
        console.log('Nome carregado da tabela user_profiles:', profileData.display_name);
        return profileData.display_name;
      }
    } catch (profileError) {
      console.warn('Erro ao buscar nome da tabela user_profiles:', profileError);
      // Continua para verificar os metadados
    }
    
    // 3. Verificar nos metadados do usuário
    const { data: userData } = await (supabase as SupabaseClient<Database>).auth.getUser(userId);
    if (userData?.user) {
      // Priorizar display_name sobre outros campos
      const name = 
        userData.user.user_metadata?.display_name || 
        userData.user.user_metadata?.full_name || 
        userData.user.user_metadata?.name || 
        userData.user.email?.split('@')[0] || 
        null;
        
      if (name) {
        // Atualizar o localStorage para acessos futuros
        localStorage.setItem(USERNAME_STORAGE_KEY, name);
        console.log('Nome carregado dos metadados do usuário:', name);
        return name;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao carregar nome do usuário:', error);
    return null;
  }
}; 
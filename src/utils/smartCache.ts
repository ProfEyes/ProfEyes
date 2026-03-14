/**
 * Smart Cache - Sistema inteligente de cache com validação automática de idade
 * 
 * Este utilitário fornece funções para armazenar e recuperar dados do localStorage
 * com validação automática de idade do cache. Caches expirados são automaticamente
 * removidos e retornam null.
 * 
 * Tempo de validade padrão: 3 minutos
 */

const CACHE_VALIDITY = 30 * 60 * 1000; // 30 minutos

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Recupera dados do cache se ainda forem válidos
 * 
 * @param key - Chave do cache no localStorage
 * @returns Os dados em cache se válidos, ou null se expirados/inexistentes
 */
export function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed: CachedData<T> = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    if (age > CACHE_VALIDITY) {
      // Cache expirado - remover e retornar null
      localStorage.removeItem(key);
      return null;
    }
    
    // Cache válido
    return parsed.data;
  } catch (error) {
    // Cache corrompido - remover e retornar null
    console.warn(`Erro ao ler cache (${key}):`, error);
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Ignorar erro de remoção
    }
    return null;
  }
}

/**
 * Salva dados no cache com timestamp atual
 * 
 * @param key - Chave do cache no localStorage
 * @param data - Dados a serem armazenados
 */
export function setCachedData<T>(key: string, data: T): void {
  try {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    // Erro ao salvar (quota excedida, etc) - apenas avisar
    console.warn(`Erro ao salvar cache (${key}):`, error);
  }
}

/**
 * Remove um item do cache
 * 
 * @param key - Chave do cache no localStorage
 */
export function removeCachedData(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Erro ao remover cache (${key}):`, error);
  }
}

/**
 * Verifica se um cache existe e é válido
 * 
 * @param key - Chave do cache no localStorage
 * @returns true se o cache existe e é válido, false caso contrário
 */
export function isCacheValid(key: string): boolean {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return false;
    
    const parsed: CachedData<unknown> = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    return age <= CACHE_VALIDITY;
  } catch {
    return false;
  }
}

/**
 * Limpa todos os caches expirados do localStorage
 * 
 * @param keyPattern - Padrão opcional para filtrar chaves (ex: 'signals', 'news')
 */
export function cleanExpiredCaches(keyPattern?: string): number {
  let cleanedCount = 0;
  
  try {
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      // Se um padrão foi fornecido, filtrar por ele
      if (keyPattern && !key.includes(keyPattern)) {
        continue;
      }
      
      try {
        const cached = localStorage.getItem(key);
        if (!cached) continue;
        
        const parsed: CachedData<unknown> = JSON.parse(cached);
        
        // Verificar se tem estrutura de cache (timestamp)
        if (typeof parsed === 'object' && parsed !== null && 'timestamp' in parsed) {
          const age = Date.now() - parsed.timestamp;
          
          if (age > CACHE_VALIDITY) {
            localStorage.removeItem(key);
            cleanedCount++;
          }
        }
      } catch {
        // Não é um cache válido, ignorar
      }
    }
  } catch (error) {
    console.warn('Erro ao limpar caches expirados:', error);
  }
  
  return cleanedCount;
}

/**
 * Utilitário para validar caches com timestamp
 * Previne uso de dados antigos/expirados
 */

const CACHE_MAX_AGE = 15 * 60 * 1000; // 15 minutos

export interface CachedData<T> {
  data: T;
  timestamp: number;
  version?: string;
}

/**
 * Valida se um cache é recente o suficiente para ser usado
 * @param timestamp Timestamp do cache em milissegundos
 * @param maxAge Idade máxima permitida em milissegundos (padrão: 15min)
 * @returns true se o cache é válido, false se expirado
 */
export function isCacheValid(timestamp: number, maxAge: number = CACHE_MAX_AGE): boolean {
  const now = Date.now();
  const age = now - timestamp;
  return age < maxAge && timestamp > 0;
}

/**
 * Obtém dados do localStorage com validação de timestamp
 * @param key Chave do localStorage
 * @param maxAge Idade máxima permitida em milissegundos
 * @returns Dados parseados ou null se inválido/expirado
 */
export function getValidCachedData<T>(key: string, maxAge: number = CACHE_MAX_AGE): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached);
    
    // Verificar se tem timestamp
    if (!parsed.timestamp) {
      console.warn(`⚠️ Cache sem timestamp: ${key} - Removendo`);
      localStorage.removeItem(key);
      return null;
    }

    // Verificar se é recente
    if (!isCacheValid(parsed.timestamp, maxAge)) {
      const ageMinutes = Math.floor((Date.now() - parsed.timestamp) / 60000);
      console.warn(`⚠️ Cache expirado: ${key} (${ageMinutes}min) - Removendo`);
      localStorage.removeItem(key);
      return null;
    }

    // Retornar apenas os dados, não o wrapper
    return parsed.data || parsed.signals || parsed;
  } catch (error) {
    console.error(`❌ Erro ao ler cache: ${key}`, error);
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Salva dados no localStorage com timestamp
 * @param key Chave do localStorage
 * @param data Dados a serem salvos
 * @param version Versão opcional dos dados
 */
export function setCachedData<T>(key: string, data: T, version?: string): void {
  try {
    const cacheData: CachedData<T> = {
      data,
      timestamp: Date.now(),
      version
    };
    
    localStorage.setItem(key, JSON.stringify(cacheData));
    console.log(`✅ Cache salvo: ${key}`);
  } catch (error) {
    console.error(`❌ Erro ao salvar cache: ${key}`, error);
  }
}

/**
 * Remove um cache específico
 * @param key Chave do localStorage
 */
export function removeCachedData(key: string): void {
  try {
    localStorage.removeItem(key);
    console.log(`🗑️ Cache removido: ${key}`);
  } catch (error) {
    console.error(`❌ Erro ao remover cache: ${key}`, error);
  }
}

/**
 * Remove todos os caches que correspondem a um padrão
 * @param pattern Padrão de string para buscar nas chaves
 */
export function removeCachesByPattern(pattern: string): void {
  try {
    const keys = Object.keys(localStorage);
    const matchingKeys = keys.filter(key => key.includes(pattern));
    
    matchingKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`🗑️ ${matchingKeys.length} caches removidos com padrão: ${pattern}`);
  } catch (error) {
    console.error(`❌ Erro ao remover caches por padrão: ${pattern}`, error);
  }
}

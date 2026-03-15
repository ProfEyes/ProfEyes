/**
 * Utilitário para garantir que valores passados para toasts sejam strings seguras
 * Este arquivo resolve o erro: "Objects are not valid as a React child"
 */

/**
 * Converte qualquer valor para uma string segura para renderização
 * @param value - Valor a ser convertido para string
 * @returns Uma string segura para renderização
 */
export function toastSafeString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  // Se for um objeto, converter para JSON string
  if (typeof value === 'object') {
    // Se for um objeto com title e description, extrair estas propriedades
    const obj = value as Record<string, unknown>;
    if (obj.title && obj.description) {
      return `${obj.title}: ${obj.description}`;
    }
    
    try {
      return JSON.stringify(value);
    } catch (e) {
      return '[Objeto não serializável]';
    }
  }
  
  return String(value);
}

/**
 * Wrapper seguro para a função toast que garante que todos os valores são strings
 * @param obj - Objeto a ser parseado
 * @returns Objeto com valores seguros
 */
export function safeParse(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Se for um objeto simples, garantir que todas as propriedades são seguras
  if (typeof obj === 'object' && !React.isValidElement(obj)) {
    // Tratar arrays
    if (Array.isArray(obj)) {
      return obj.map(item => safeParse(item));
    }
    
    // Tratar objetos
    const result: Record<string, unknown> = {};
    const objRecord = obj as Record<string, unknown>;
    for (const key in objRecord) {
      if (Object.prototype.hasOwnProperty.call(objRecord, key)) {
        result[key] = safeParse(objRecord[key]);
      }
    }
    return result;
  }
  
  // Se não for um objeto, retornar uma string
  return toastSafeString(obj);
}

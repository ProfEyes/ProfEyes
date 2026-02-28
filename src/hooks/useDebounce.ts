import { useState, useEffect } from 'react';

/**
 * Hook para criar uma versão com debounce de um valor.
 * Útil para atrasar atualizações de estado e evitar múltiplas chamadas desnecessárias.
 * 
 * @param value O valor que você quer aplicar debounce
 * @param delay Tempo de atraso em milissegundos
 * @returns O valor com debounce aplicado
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Configura um timer para atualizar o valor com debounce
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpa o timer se o valor mudar antes do delay acabar
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
} 
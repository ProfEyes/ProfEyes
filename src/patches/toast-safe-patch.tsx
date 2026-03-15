import React from 'react';
import { toast } from 'sonner';
import { toastSafeString } from '../utils/toast-safe';

/**
 * Patch para substituir o toast original pelo nosso toast seguro
 * 
 * Aplicar este patch na aplicação para resolver o erro:
 * "Objects are not valid as a React child"
 */

type ToastMessage = unknown;
type ToastOptions = Record<string, unknown> | undefined;

const originalToast = toast;

// ✅ Flag para prevenir recursão infinita
let isProcessingToast = false;

// Funções de override para garantir que os toasts são seguros
const safeToastOverrides = {
  info: (title: ToastMessage, options?: ToastOptions) => {
    if (isProcessingToast) return originalToast.info(String(title), options);
    isProcessingToast = true;
    try {
      if (typeof title === 'object') console.warn('toast.info called with object title:', title);
      const safeTitle = toastSafeString(title) as string;
      const safeOptions = options ? sanitizeOptions(options) : undefined;
      return originalToast.info(safeTitle, safeOptions as Record<string, unknown> | undefined);
    } finally {
      isProcessingToast = false;
    }
  },

  success: (title: ToastMessage, options?: ToastOptions) => {
    if (isProcessingToast) return originalToast.success(String(title), options);
    isProcessingToast = true;
    try {
      if (typeof title === 'object') console.warn('toast.success called with object title:', title);
      const safeTitle = toastSafeString(title) as string;
      const safeOptions = options ? sanitizeOptions(options) : undefined;
      return originalToast.success(safeTitle, safeOptions as Record<string, unknown> | undefined);
    } finally {
      isProcessingToast = false;
    }
  },

  error: (title: ToastMessage, options?: ToastOptions) => {
    if (isProcessingToast) return originalToast.error(String(title), options);
    isProcessingToast = true;
    try {
      if (typeof title === 'object') console.warn('toast.error called with object title:', title);
      const safeTitle = toastSafeString(title) as string;
      const safeOptions = options ? sanitizeOptions(options) : undefined;
      return originalToast.error(safeTitle, safeOptions as Record<string, unknown> | undefined);
    } finally {
      isProcessingToast = false;
    }
  },

  warning: (title: ToastMessage, options?: ToastOptions) => {
    if (isProcessingToast) return originalToast.warning(String(title), options);
    isProcessingToast = true;
    try {
      if (typeof title === 'object') console.warn('toast.warning called with object title:', title);
      const safeTitle = toastSafeString(title) as string;
      const safeOptions = options ? sanitizeOptions(options) : undefined;
      return originalToast.warning(safeTitle, safeOptions as Record<string, unknown> | undefined);
    } finally {
      isProcessingToast = false;
    }
  },

  message: (title: ToastMessage, options?: ToastOptions) => {
    if (isProcessingToast) return originalToast.message(String(title), options);
    isProcessingToast = true;
    try {
      if (typeof title === 'object') console.warn('toast.message called with object title:', title);
      const safeTitle = toastSafeString(title) as string;
      const safeOptions = options ? sanitizeOptions(options) : undefined;
      return originalToast.message(safeTitle, safeOptions as Record<string, unknown> | undefined);
    } finally {
      isProcessingToast = false;
    }
  },

  loading: (title: ToastMessage, options?: ToastOptions) => {
    if (isProcessingToast) return originalToast.loading(String(title), options);
    isProcessingToast = true;
    try {
      if (typeof title === 'object') console.warn('toast.loading called with object title:', title);
      const safeTitle = toastSafeString(title) as string;
      const safeOptions = options ? sanitizeOptions(options) : undefined;
      return originalToast.loading(safeTitle, safeOptions as Record<string, unknown> | undefined);
    } finally {
      isProcessingToast = false;
    }
  },

  custom: (component: React.ReactNode | ((id: string | number) => React.ReactNode), options?: ToastOptions) => {
    // custom() aceita um componente React ou função, não converte para string
    if (typeof component === 'object' && component !== null && !React.isValidElement(component)) {
      console.warn('toast.custom called with non-React object:', component);
    }
    return originalToast.custom(component as unknown as (id: string | number) => React.ReactElement, options);
  }
};

// Função para substituir temporariamente o toast original
export function applyToastSafePatch() {
  console.log('🛠️ Aplicando patch de segurança para toasts');
  
  // ✅ CORREÇÃO: Aplicar overrides DEPOIS de preservar as funções originais
  // Copiar propriedades do toast original ANTES de modificar
  const toastProperties = { ...originalToast };
  
  // Substitui as funções originais pelas versões seguras
  Object.assign(toast, safeToastOverrides);
  
  // Preserva as outras funções do toast original que não foram substituídas
  Object.keys(toastProperties).forEach(key => {
    if (!(key in safeToastOverrides) && typeof toastProperties[key as keyof typeof toastProperties] === 'function') {
      (toast as unknown as Record<string, unknown>)[key] = toastProperties[key as keyof typeof toastProperties];
    }
  });
  
  return {
    restore: () => {
      console.log('🛠️ Restaurando toast original');
      // Restaura o toast original se necessário
      Object.assign(toast, originalToast);
    }
  };
}

/**
 * Sanitiza as opções do toast para garantir que são seguras para renderização
 */
function sanitizeOptions(options: Record<string, unknown>): Record<string, unknown> {
  if (!options) return {};
  
  const sanitized: Record<string, unknown> = {};
  
  // Copia todas as propriedades, exceto description que precisa de tratamento especial
  Object.keys(options).forEach(key => {
    if (key === 'description') {
      sanitized.description = toastSafeString(options.description) as string;
    } else {
      sanitized[key] = options[key];
    }
  });
  
  return sanitized;
}

// ✅ DESABILITADO: Patch causava recursão infinita
// export const toastSafePatch = applyToastSafePatch();

// ✅ SOLUÇÃO: Não aplicar patch, corrigir chamadas específicas
export const toastSafePatch = {
  restore: () => {
    console.log('🛠️ Toast patch não foi aplicado (desabilitado por recursão)');
  }
};

// Gerenciador central de visibilidade da página
let isInitialized = false;
let isBackgroundEnabled = false;
let lastVisibilityState = 'visible';

// Função para inicializar o gerenciador de visibilidade
export const initVisibilityManager = () => {
  if (isInitialized) return;

  // Prevenir QUALQUER recarregamento quando a página volta do background
  document.addEventListener('visibilitychange', (e) => {
    const currentState = document.visibilityState;
    
    // Se o modo background está ativo
    if (isBackgroundEnabled) {
      e.preventDefault();
      e.stopPropagation();
      
      // Se estamos voltando para a aba
      if (lastVisibilityState === 'hidden' && currentState === 'visible') {
        // Prevenir qualquer recarregamento
        e.preventDefault();
        e.stopPropagation();
        
        // Disparar evento customizado para componentes que precisam saber
        // que a página voltou do background (sem causar recarregamento)
        window.dispatchEvent(new CustomEvent('background-resume'));
      }
    }
    
    lastVisibilityState = currentState;
  }, true); // Usar capture phase para interceptar o evento antes de qualquer outro handler

  // ✅ CORREÇÃO: Não usar beforeunload (causa aviso do navegador ao recarregar)
  // A limpeza será feita automaticamente quando necessário

  // Prevenir que o foco na janela cause recarregamentos
  window.addEventListener('focus', (e) => {
    if (isBackgroundEnabled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Prevenir que a perda de foco cause recarregamentos
  window.addEventListener('blur', (e) => {
    if (isBackgroundEnabled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  isInitialized = true;
};

// Função para habilitar/desabilitar o modo background
export const setBackgroundMode = (enabled: boolean) => {
  isBackgroundEnabled = enabled;
};

// Função para verificar se o modo background está ativo
export const isBackgroundModeEnabled = () => {
  return isBackgroundEnabled;
}; 
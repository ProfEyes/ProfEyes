// Configurações globais para notificações do sistema
export const globalNotificationSettings = {
  // Desativar notificações toast automáticas
  disableAutomaticToasts: true,
  
  // Configuração de notificações por tipo
  notificationTypes: {
    // Configurações para sinais de trading
    signals: {
      // Notificações automáticas para novos sinais
      newSignalToasts: false,
      // Notificações automáticas para sinais substituídos/rotacionados
      replacedSignalToasts: false,
      // Notificações toast para sinais bem-sucedidos
      successSignalToasts: false,
    },
    
    // Configurações para notificações de idioma
    language: {
      // Notificação toast para mudança de idioma
      languageChangeToasts: false,
    }
  }
};

// Função para verificar se um tipo específico de notificação está habilitado
export function isNotificationEnabled(category: string, type: string): boolean {
  const settings = globalNotificationSettings.notificationTypes;
  
  // Se todas as notificações automáticas estiverem desabilitadas, retorna false
  if (globalNotificationSettings.disableAutomaticToasts) {
    return false;
  }
  
  // Verificar configuração específica
  if (settings[category] && typeof settings[category][type] !== 'undefined') {
    return settings[category][type];
  }
  
  // Se não houver configuração específica, permitir por padrão
  return true;
}

// Use esta função para verificar se um toast específico deve ser exibido
export function shouldShowToast(category: string, type: string): boolean {
  return !globalNotificationSettings.disableAutomaticToasts && 
         isNotificationEnabled(category, type);
} 
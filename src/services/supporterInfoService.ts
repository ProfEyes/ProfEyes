// Serviço para gerenciar o código de apoiador ativo
import { validateSupporterCode } from '@/lib/admin-api';
import { userService } from './userService';

export interface ActiveSupporterInfo {
  link: string;
  displayName: string;
}

let cachedSupporterInfo: ActiveSupporterInfo | null = null;

export const supporterInfoService = {
  async getActiveSupporterInfo(): Promise<ActiveSupporterInfo> {
    // Se já temos cache, retornar
    if (cachedSupporterInfo) {
      return cachedSupporterInfo;
    }

    try {
      // Buscar preferências do usuário
      const { data: preferences } = await userService.getTradingPreferences();
      
      if (preferences) {
        const code = String(preferences.supporter_code || '');
        
        if (code && code.trim()) {
          // Validar código
          const result = await validateSupporterCode(code.trim());
          
          if (result.valid && result.link && result.display_name) {
            // Cachear resultado
            cachedSupporterInfo = {
              link: result.link,
              displayName: result.display_name
            };
            return cachedSupporterInfo;
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar informações do apoiador:', error);
    }

    // Retornar padrão (Avalon)
    return {
      link: 'https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree',
      displayName: 'Avalon'
    };
  },

  clearCache() {
    cachedSupporterInfo = null;
  }
};

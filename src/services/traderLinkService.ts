import { userService } from './userService';

// Lista de corretoras disponíveis
export const AVAILABLE_BROKERS = [
  { id: 'avalon', name: 'Avalon' },
  { id: 'xxbroker', name: 'XXBroker' },
  { id: 'iqoption', name: 'IQ Option' },
  { id: 'deriv', name: 'Deriv' },
  { id: 'pocket', name: 'Pocket Option' },
  { id: 'binomo', name: 'Binomo' },
  { id: 'binary', name: 'Binary.com' },
  { id: 'olymptrade', name: 'Olymp Trade' }
];

// Links padrão por corretora
const DEFAULT_BROKER_LINKS = {
  avalon: 'https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree',
  xxbroker: 'https://xxbroker.com/ref/default',
  iqoption: 'https://iqoption.com/ref/default',
  deriv: 'https://deriv.com/ref/default',
  pocket: 'https://pocket.com/ref/default',
  binomo: 'https://binomo.com/ref/default',
  binary: 'https://binary.com/ref/default',
  olymptrade: 'https://olymptrade.com/ref/default'
};

// Serviço para gerenciar links de trader
export const traderLinkService = {
  // Obter link do trader atual (preferido do usuário ou padrão)
  async getCurrentTraderLink(brokerId?: string): Promise<string> {
    try {
      // Obter preferências do usuário - CORRIGIDO: Usando getTradingPreferences (correto)
      const { data: preferences, error } = await userService.getTradingPreferences();
      
            
      if (error || !preferences) {
        return this.getDefaultBrokerLink(brokerId || 'avalon');
      }
      
      // Se o usuário tem um link preferido, usá-lo
      const preferredLink = String(preferences.preferred_trader_link || '');
      if (preferredLink && preferredLink.trim()) {
        return preferredLink.trim();
      }
      
      // Caso contrário, usar o link padrão da corretora preferida ou especificada
      const brokerToUse = brokerId || String(preferences.preferred_broker || 'avalon');
      const defaultLink = this.getDefaultBrokerLink(brokerToUse);
            return defaultLink;
    } catch {
      return this.getDefaultBrokerLink(brokerId || 'avalon');
    }
  },
  
  // Obter link padrão para uma corretora
  getDefaultBrokerLink(brokerId: string): string {
    return DEFAULT_BROKER_LINKS[brokerId as keyof typeof DEFAULT_BROKER_LINKS] || DEFAULT_BROKER_LINKS.avalon;
  },
  
  // Verificar se uma URL é válida
  isValidUrl(url: string): boolean {
    if (!url || !url.trim()) return false;
    
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  },
  
  // Obter a corretora preferida do usuário
  async getPreferredBroker(): Promise<string> {
    try {
      const { data: preferences, error } = await userService.getTradingPreferences();
      
      if (error || !preferences) {
        return 'avalon';
      }
      
      return String(preferences.preferred_broker || 'avalon');
    } catch {
      return 'avalon';
    }
  },
  
  // Obter todas as preferências do usuário relacionadas ao trader
  async getUserPreferences(): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
    return await userService.getTradingPreferences();
  },
  
  // Atualizar preferências do trader
  async updateTraderPreferences(link?: string, broker?: string): Promise<boolean> {
    try {
      const { success } = await userService.updateTraderPreferences({
        preferred_trader_link: link,
        preferred_broker: broker
      });
      return success;
    } catch {
      return false;
    }
  }
}; 
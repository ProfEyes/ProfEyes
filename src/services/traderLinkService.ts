import { userService } from './userService';
import { validateSupporterCode } from '@/lib/admin-api';

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

// Código de apoiador nunca expira
const CODE_EXPIRY_DAYS = 999999;

const DEFAULT_BROKER_LINKS: Record<string, string> = {
  avalon: 'https://trade.avalonbroker.io/register?aff=385853&aff_model=revenue&afftrack=mesnagensfree',
  xxbroker: 'https://xxbroker.com/ref/default',
  iqoption: 'https://iqoption.com/ref/default',
  deriv: 'https://deriv.com/ref/default',
  pocket: 'https://pocket.com/ref/default',
  binomo: 'https://binomo.com/ref/default',
  binary: 'https://binary.com/ref/default',
  olymptrade: 'https://olymptrade.com/ref/default'
};

// Código de apoiador nunca expira
function isCodeExpired(setAt: string | undefined | null): boolean {
  return false;
}

export const traderLinkService = {
  async getCurrentTraderLink(brokerId?: string): Promise<string> {
    try {
      const { data: preferences, error } = await userService.getTradingPreferences();

      if (error || !preferences) {
        return this.getDefaultBrokerLink(brokerId || 'avalon');
      }

      const supporterCode = String(preferences.supporter_code || '');
      const codeSetAt = preferences.supporter_code_set_at as string | undefined;

      if (supporterCode && supporterCode.trim()) {
        // Verificar expiração de 30 dias
        if (isCodeExpired(codeSetAt)) {
          // Código expirado - limpar e voltar ao padrão
          await userService.updateTraderPreferences({ supporter_code: '' });
        } else {
          const result = await validateSupporterCode(supporterCode.trim());
          if (result.valid && result.link) {
            return result.link;
          }
        }
      }

      const preferredLink = String(preferences.preferred_trader_link || '');
      if (preferredLink && preferredLink.trim()) {
        return preferredLink.trim();
      }

      const brokerToUse = brokerId || String(preferences.preferred_broker || 'avalon');
      return this.getDefaultBrokerLink(brokerToUse);
    } catch {
      return this.getDefaultBrokerLink(brokerId || 'avalon');
    }
  },

  getDefaultBrokerLink(brokerId: string): string {
    return DEFAULT_BROKER_LINKS[brokerId] || DEFAULT_BROKER_LINKS.avalon;
  },

  isValidUrl(url: string): boolean {
    if (!url || !url.trim()) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  async getPreferredBroker(): Promise<string> {
    try {
      const { data: preferences, error } = await userService.getTradingPreferences();
      if (error || !preferences) return 'avalon';
      return String(preferences.preferred_broker || 'avalon');
    } catch {
      return 'avalon';
    }
  },

  async getUserPreferences(): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
    return await userService.getTradingPreferences();
  },

  async updateTraderPreferences(link?: string, broker?: string, supporterCode?: string): Promise<boolean> {
    try {
      const { success } = await userService.updateTraderPreferences({
        preferred_trader_link: link,
        preferred_broker: broker,
        supporter_code: supporterCode,
      });
      return success;
    } catch {
      return false;
    }
  },

  async getCodeExpiryInfo(): Promise<{ expired: boolean; daysRemaining: number | null; expiresAt: string | null }> {
    try {
      const { data: preferences } = await userService.getTradingPreferences();
      if (!preferences) return { expired: true, daysRemaining: null, expiresAt: null };

      const code = String(preferences.supporter_code || '');
      if (!code || !code.trim()) return { expired: true, daysRemaining: null, expiresAt: null };

      const setAt = preferences.supporter_code_set_at as string | undefined;
      if (!setAt) return { expired: true, daysRemaining: null, expiresAt: null };

      const setDate = new Date(setAt);
      const expiresAt = new Date(setDate.getTime() + CODE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      return {
        expired: daysRemaining <= 0,
        daysRemaining,
        expiresAt: expiresAt.toISOString(),
      };
    } catch {
      return { expired: true, daysRemaining: null, expiresAt: null };
    }
  }
};

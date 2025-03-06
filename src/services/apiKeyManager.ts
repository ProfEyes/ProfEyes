import { toast } from '@/components/ui/use-toast';

interface ApiKeyConfig {
  key: string;
  dailyLimit: number;
  minuteLimit: number;
  requestCount: number;
  minuteRequestCount: number;
  lastReset: number;
  lastMinuteReset: number;
}

interface ApiProvider {
  name: string;
  keys: ApiKeyConfig[];
  currentKeyIndex: number;
}

class ApiKeyManager {
  private static instance: ApiKeyManager;
  private providers: Map<string, ApiProvider>;

  private constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  private initializeProviders() {
    // Alpha Vantage (500 requisições por dia, 5 por minuto)
    this.addProvider('alphavantage', [
      'demo' // Substitua pela sua chave real da Alpha Vantage
    ], 500, 5);

    // NewsAPI (100 requisições por dia)
    this.addProvider('newsapi', [
      'your_newsapi_key_here'
    ], 100, 10);

    // NewsData (200 requisições por dia)
    this.addProvider('newsdata', [
      'your_newsdata_key_here'
    ], 200, 20);

    // Finnhub (30 chamadas por minuto)
    this.addProvider('finnhub', [
      'your_finnhub_key_here'
    ], 1000, 30);
  }

  private addProvider(name: string, keys: string[], dailyLimit: number, minuteLimit: number) {
    const provider: ApiProvider = {
      name,
      keys: keys.map(key => ({
        key,
        dailyLimit,
        minuteLimit,
        requestCount: 0,
        minuteRequestCount: 0,
        lastReset: Date.now(),
        lastMinuteReset: Date.now()
      })),
      currentKeyIndex: 0
    };
    this.providers.set(name, provider);
  }

  private resetCountersIfNeeded(keyConfig: ApiKeyConfig) {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const oneMinuteMs = 60 * 1000;

    // Reset daily counter if a day has passed
    if (now - keyConfig.lastReset >= oneDayMs) {
      keyConfig.requestCount = 0;
      keyConfig.lastReset = now;
    }

    // Reset minute counter if a minute has passed
    if (now - keyConfig.lastMinuteReset >= oneMinuteMs) {
      keyConfig.minuteRequestCount = 0;
      keyConfig.lastMinuteReset = now;
    }
  }

  private rotateKey(provider: ApiProvider): boolean {
    const initialIndex = provider.currentKeyIndex;
    let rotated = false;

    do {
      provider.currentKeyIndex = (provider.currentKeyIndex + 1) % provider.keys.length;
      const keyConfig = provider.keys[provider.currentKeyIndex];
      this.resetCountersIfNeeded(keyConfig);

      if (keyConfig.requestCount < keyConfig.dailyLimit && 
          keyConfig.minuteRequestCount < keyConfig.minuteLimit) {
        rotated = true;
        break;
      }
    } while (provider.currentKeyIndex !== initialIndex);

    return rotated;
  }

  public async getApiKey(providerName: string): Promise<string> {
    const provider = this.providers.get(providerName.toLowerCase());
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    const keyConfig = provider.keys[provider.currentKeyIndex];
    this.resetCountersIfNeeded(keyConfig);

    // Se a chave atual excedeu os limites, tenta rotacionar
    if (keyConfig.requestCount >= keyConfig.dailyLimit || 
        keyConfig.minuteRequestCount >= keyConfig.minuteLimit) {
      
      const rotated = this.rotateKey(provider);
      if (!rotated) {
        const message = `Limite de requisições atingido para ${provider.name}. Todas as chaves estão no limite.`;
        console.warn(message);
        toast({
          title: "Aviso de Limite de API",
          description: message,
          variant: "destructive"
        });
        throw new Error(message);
      }
    }

    // Incrementa os contadores
    const currentKey = provider.keys[provider.currentKeyIndex];
    currentKey.requestCount++;
    currentKey.minuteRequestCount++;

    // Avisa quando estiver próximo do limite
    const dailyUsagePercent = (currentKey.requestCount / currentKey.dailyLimit) * 100;
    if (dailyUsagePercent >= 80) {
      const message = `${provider.name}: ${Math.round(100 - dailyUsagePercent)}% de requisições restantes para hoje`;
      console.warn(message);
      toast({
        title: "Aviso de Limite de API",
        description: message,
        variant: "warning"
      });
    }

    return currentKey.key;
  }

  public getRemainingRequests(providerName: string): { daily: number, minute: number } {
    const provider = this.providers.get(providerName.toLowerCase());
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    const keyConfig = provider.keys[provider.currentKeyIndex];
    this.resetCountersIfNeeded(keyConfig);

    return {
      daily: keyConfig.dailyLimit - keyConfig.requestCount,
      minute: keyConfig.minuteLimit - keyConfig.minuteRequestCount
    };
  }
}

export const apiKeyManager = ApiKeyManager.getInstance();

// Função específica para obter a chave da Alpha Vantage
export async function getAlphaVantageApiKey(): Promise<string> {
  return apiKeyManager.getApiKey('alphavantage');
} 
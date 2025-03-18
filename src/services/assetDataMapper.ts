import { isBinanceCryptoSymbol } from './binanceApi';
import { isStockAvailableInBrapi } from './brapiService';

/**
 * Interface para representar uma fonte de dados para ativos financeiros
 */
export interface AssetDataSource {
  name: string;         // Nome da fonte de dados (ex: "BrAPI", "Binance")
  baseUrl: string;      // URL base da API
  capabilities: string[]; // Recursos suportados (ex: ["quotes", "historical", "dividends"])
  assetTypes: string[]; // Tipos de ativos suportados (ex: ["stocks", "crypto"])
}

/**
 * Fontes de dados disponíveis na aplicação
 */
export const DATA_SOURCES: Record<string, AssetDataSource> = {
  BRAPI: {
    name: "BrAPI",
    baseUrl: "https://brapi.dev/api",
    capabilities: ["quotes", "historical", "dividends", "list"],
    assetTypes: ["stocks", "funds", "etfs"]
  },
  BINANCE: {
    name: "Binance",
    baseUrl: "https://api.binance.com",
    capabilities: ["quotes", "historical", "orderbook", "trades"],
    assetTypes: ["crypto"]
  },
  COINGECKO: {
    name: "CoinGecko",
    baseUrl: "https://api.coingecko.com/api/v3",
    capabilities: ["quotes", "historical", "markets"],
    assetTypes: ["crypto"]
  }
};

/**
 * Determina a fonte de dados apropriada para um determinado símbolo
 * @param symbol - Símbolo do ativo (ex: "PETR4", "BTC")
 * @returns Nome da fonte de dados a ser usada ou null se não for suportado
 */
export async function determineDataSource(symbol: string): Promise<string | null> {
  // Verificar se é uma criptomoeda na Binance
  if (isBinanceCryptoSymbol(symbol)) {
    return "BINANCE";
  }
  
  // Verificar se é um ativo brasileiro na BrAPI
  try {
    const isAvailableInBrapi = await isStockAvailableInBrapi(symbol);
    if (isAvailableInBrapi) {
      return "BRAPI";
    }
  } catch (error) {
    console.error(`Erro ao verificar disponibilidade de ${symbol} na BrAPI:`, error);
  }
  
  // Verificar se é uma criptomoeda conhecida para o CoinGecko
  const commonCryptos = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'AVAX', 'MATIC', 'LINK', 'DOGE'];
  if (commonCryptos.includes(symbol)) {
    return "COINGECKO";
  }
  
  // Não foi possível determinar uma fonte de dados adequada
  return null;
}

/**
 * Verifica se um símbolo é um ativo brasileiro (ação, FII, ETF)
 * @param symbol - Símbolo do ativo
 * @returns true se for um ativo brasileiro, false caso contrário
 */
export function isBrazilianAsset(symbol: string): boolean {
  // Padrões comuns para ativos brasileiros
  if (/^[A-Z]{4}[0-9]{1,2}$/.test(symbol)) {
    // Ações brasileiras (ex: PETR4, VALE3)
    return true;
  }
  
  if (/^[A-Z]{4}11$/.test(symbol)) {
    // Muitos FIIs (ex: KNRI11, HGLG11)
    return true;
  }
  
  // Alguns ETFs brasileiros conhecidos
  const brazilianETFs = ['BOVA11', 'IVVB11', 'SMAL11', 'SPXI11'];
  if (brazilianETFs.includes(symbol)) {
    return true;
  }
  
  return false;
}

/**
 * Verifica se um símbolo é uma criptomoeda
 * @param symbol - Símbolo do ativo
 * @returns true se for uma criptomoeda, false caso contrário
 */
export function isCryptoAsset(symbol: string): boolean {
  // Lista de criptomoedas comuns
  const commonCryptos = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'AVAX', 'MATIC', 'LINK', 'DOGE', 'SHIB'];
  
  // Se o símbolo for exatamente uma das criptomoedas comuns
  if (commonCryptos.includes(symbol)) {
    return true;
  }
  
  // Pares de criptomoedas comuns (padrões da Binance)
  if (/^[A-Z]{2,10}(USDT|BTC|BUSD|ETH)$/.test(symbol)) {
    return true;
  }
  
  return false;
} 
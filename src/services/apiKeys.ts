/**
 * ⚠️ API KEYS - CONFIGURAÇÃO SEGURA
 * 
 * Este arquivo agora usa variáveis de ambiente (.env) para maior segurança.
 * 
 * ANTES (❌ INSEGURO):
 * - Chaves hardcoded no código
 * - Expostas no repositório Git
 * - Risco de vazamento em commits
 * 
 * DEPOIS (✅ SEGURO):
 * - Chaves em variáveis de ambiente
 * - .env nunca commitado (no .gitignore)
 * - Fácil rotação de chaves
 * 
 * SETUP:
 * 1. Copie .env.example para .env
 * 2. Preencha com suas chaves reais
 * 3. NUNCA commite o arquivo .env
 */

// Helper para validar e obter variável de ambiente
const getEnvVar = (key: string, fallback?: string): string => {
  const value = import.meta.env[key] || fallback;
  
  if (!value) {
    console.warn(`⚠️ Variável de ambiente ${key} não configurada. Usando fallback vazio.`);
    return '';
  }
  
  return value;
};

// API Keys carregadas de variáveis de ambiente
// ⚠️ MANTEMOS APENAS: Binance (dados de preços) + Finnhub (notícias)
export const API_KEYS = {
  BINANCE: {
    API_KEY: getEnvVar('VITE_BINANCE_API_KEY', ''),
    API_SECRET: getEnvVar('VITE_BINANCE_API_SECRET', '')
  },
  FINNHUB: {
    API_KEY: getEnvVar('VITE_FINNHUB_API_KEY', ''),
    WEBHOOK: getEnvVar('VITE_FINNHUB_WEBHOOK', '')
  }
} as const;

// Exportar as chaves individuais para uso pelo Binance API
export const BINANCE_API_KEY = API_KEYS.BINANCE.API_KEY;
export const BINANCE_API_SECRET = API_KEYS.BINANCE.API_SECRET;

// Validação de chaves ao carregar (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  const missingKeys: string[] = [];
  
  if (!API_KEYS.BINANCE.API_KEY) missingKeys.push('VITE_BINANCE_API_KEY');
  if (!API_KEYS.BINANCE.API_SECRET) missingKeys.push('VITE_BINANCE_API_SECRET');
  if (!API_KEYS.FINNHUB.API_KEY) missingKeys.push('VITE_FINNHUB_API_KEY');
  
  if (missingKeys.length > 0) {
    console.warn(
      `\n⚠️ ATENÇÃO: As seguintes chaves de API não estão configuradas:\n` +
      missingKeys.map(key => `   - ${key}`).join('\n') +
      `\n\n📝 Configure estas chaves no arquivo .env\n` +
      `   Copie .env.example para .env e preencha os valores\n`
    );
  } else {
    // Todas as chaves de API configuradas
  }
} 
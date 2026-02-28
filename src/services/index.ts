/**
 * 🎯 SERVICES INDEX - PONTO DE ENTRADA PRINCIPAL
 * 
 * Este arquivo exporta todos os serviços do projeto.
 * 
 * ARQUITETURA:
 * - Sinais são gerados no Supabase (banco de dados)
 * - A aplicação apenas LÊ os sinais via dailySignals.ts
 * - Usamos Binance API para preços em tempo real
 * - Usamos Finnhub API para notícias
 * 
 * ESTRUTURA:
 * 1. Sinais de Trading (leitura do Supabase)
 * 2. Tipos
 * 3. Dados de Mercado (Binance)
 * 4. Notícias (Finnhub)
 */

// =====================================
// 1. SINAIS DE TRADING
// =====================================
export * from './signals';

// =====================================
// 2. TIPOS
// =====================================
export type { 
  MarketData,
  TradingSignal,
  MarketNews,
  SignalStrength,
  SignalType,
  TimeFrame
} from './types';

// =====================================
// 3. DADOS DE MERCADO (BINANCE)
// =====================================
export { 
  fetchMarketData,
  analyzeMarketAsset
} from './marketData';

export { 
  getLatestPrices,
  getCurrentPrice,
  getHistoricalKlines,
  get24hStats,
  get24hPriceChange
} from './binanceApi';

// =====================================
// 4. NOTÍCIAS (FINNHUB)
// =====================================
export { fetchMarketNews } from './news';

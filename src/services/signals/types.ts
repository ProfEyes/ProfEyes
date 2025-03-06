// Tipos e interfaces para o sistema de sinais de trading

export enum SignalType {
  TECHNICAL = 'TECHNICAL',
  FUNDAMENTAL = 'FUNDAMENTAL',
  NEWS = 'NEWS',
  CORRELATION = 'CORRELATION',
  SENTIMENT = 'SENTIMENT',
  VOLUME = 'VOLUME',
  PATTERN = 'PATTERN'
}

export enum SignalStrength {
  WEAK = 'WEAK',
  MODERATE = 'MODERATE',
  STRONG = 'STRONG'
}

export enum TimeFrame {
  MINUTE_1 = '1m',
  MINUTE_5 = '5m',
  MINUTE_15 = '15m',
  MINUTE_30 = '30m',
  HOUR_1 = '1h',
  HOUR_4 = '4h',
  DAY_1 = '1d',
  WEEK_1 = '1w',
  MONTH_1 = '1M'
}

export interface MarketData {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  isCrypto: boolean;
  historicalData?: HistoricalData;
}

export interface HistoricalData {
  timestamps: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
}

export interface TradingSignal {
  id?: string;
  symbol: string;
  type: SignalType;
  signal: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
  strength: SignalStrength;
  timestamp: number;
  price: number;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  success_rate: number;
  timeframe: string;
  expiry: string;
  risk_reward: string;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  related_asset?: string; // Para sinais de correlação
  metadata?: Record<string, any>; // Dados adicionais específicos do tipo de sinal
}

export interface MarketNews {
  id?: string;
  title: string;
  description?: string;
  content?: string;
  summary?: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  relatedSymbols?: string[];
  sentiment?: number;
  relevance?: number;
}

export interface SignalGeneratorConfig {
  enabled: boolean;
  weight: number;
  timeframes: TimeFrame[];
  options?: Record<string, any>;
}

export interface SignalGeneratorResult {
  signals: TradingSignal[];
  metadata?: Record<string, any>;
}

export interface SignalGenerator {
  type: SignalType;
  generateSignals(marketData: MarketData, options?: any): Promise<SignalGeneratorResult>;
}

export interface SignalAggregatorConfig {
  minSignalsRequired: number;
  strengthWeights: Record<SignalStrength, number>;
  typeWeights: Record<SignalType, number>;
  conflictResolution: 'majority' | 'weighted' | 'strongest';
}

export interface CacheConfig {
  enabled: boolean;
  duration: number; // em milissegundos
}

export interface TradingSignalConfig {
  symbols: string[];
  refreshInterval: number; // em milissegundos
  signalGenerators: Record<SignalType, SignalGeneratorConfig>;
  aggregator: SignalAggregatorConfig;
  cache: CacheConfig;
} 
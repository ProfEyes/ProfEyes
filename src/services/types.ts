// Interfaces compartilhadas entre os serviços

export enum SignalType {
  TECHNICAL = 'TECHNICAL',
  NEWS = 'NEWS',
  FUNDAMENTAL = 'FUNDAMENTAL'
}

export enum SignalStrength {
  STRONG = 'STRONG',
  MODERATE = 'MODERATE',
  WEAK = 'WEAK'
}

export enum TimeFrame {
  MIN_1 = '1m',
  MIN_5 = '5m',
  MIN_15 = '15m',
  MIN_30 = '30m',
  HOUR_1 = '1h',
  HOUR_4 = '4h',
  DAY_1 = '1d',
  WEEK_1 = '1w',
  MONTH_1 = '1M'
}

export interface MarketData {
  symbol: string;
  price: number;
  isCrypto: boolean;
  name?: string;
  change?: number;
  changePercent?: number;
}

export type SignalStatus = 'active' | 'completed' | 'cancelled' | 'expired';

export interface TradingSignal {
  symbol: string;
  type: SignalType;
  signal: 'BUY' | 'SELL';
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
  status: 'active' | 'completed' | 'cancelled';
}

export interface MarketNews {
  title: string;
  description?: string;
  summary?: string;
  content?: string;
  url: string;
  source: string;
  published_at: string;
  sentiment?: number;
  relevance?: number;
  symbols?: string[];
  time?: number;
  datetime?: number;
} 
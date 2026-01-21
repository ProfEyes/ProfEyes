export interface MarketData {
  symbol: string;
  price: number;
  volume?: number;
  high?: number;
  low?: number;
  change?: number;
  isCrypto: boolean;
  volume24h?: string;
}

export interface HistoricalData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ProcessedHistoricalData {
  prices: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
  timestamps: string[];
}

export interface TradingSignal {
  id: string;
  symbol: string;
  signal: 'BUY' | 'SELL';
  type: 'TECHNICAL' | string;
  strength: 'STRONG' | string;
  timestamp: number;
  price: number;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  success_rate: number;
  timeframe: string;
  expiry: string;
  risk_reward: string;
  status: 'active' | string;
  entry_time?: string;
} 
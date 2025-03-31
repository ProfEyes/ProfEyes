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
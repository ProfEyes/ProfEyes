import { MarketData, HistoricalData } from './marketData';

// Tipos anteriormente importados de './signals' (arquivo removido)
export type SignalType = 'FOREX' | 'CRYPTO' | 'STOCK' | 'COMMODITY' | 'INDEX';
export type SignalStrength = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export interface TradingSignal {
  id: string;
  symbol: string;
  type: SignalType;
  signal: 'BUY' | 'SELL';
  reason: string;
  strength: SignalStrength;
  timestamp: string;
  price: number;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  success_rate: number;
  timeframe: string;
  expiry: string;
  risk_reward: string;
  status: 'active' | 'completed' | 'cancelled';
  qualityScore: number;
  entry_time?: string;
  expiry_time_str?: string;
  gale1_time?: string;
  gale2_time?: string;
  exchange?: string;
  categoria?: string;
  newsAnalysis?: Record<string, unknown>;
  correlationAnalysis?: Record<string, unknown>;
  onChainMetrics?: Record<string, unknown>;
  orderBookAnalysis?: Record<string, unknown>;
  entryTimestamp?: number;
  processed?: boolean;
  result?: 'success' | 'failure';
  isAnimating?: boolean;
  metadata?: Record<string, any>;
}

export interface AdvancedSignalAnalysis {
  signal: TradingSignal;
  technicalIndicators: {
    rsi: number;
    macd: {
      line: number;
      signal: number;
      histogram: number;
    };
    sma: {
      short: number;
      long: number;
    };
  };
  marketContext: {
    trend: 'UP' | 'DOWN' | 'SIDEWAYS';
    volatility: number;
    volume: number;
  };
  riskAnalysis: {
    riskRewardRatio: number;
    stopLossDistance: number;
    targetDistance: number;
    probabilityOfSuccess: number;
  };
}

export type { MarketData, HistoricalData };

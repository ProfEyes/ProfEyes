import { BaseSignal, SignalType, SignalStrength } from './signals';
import { MarketData, HistoricalData } from './marketData';

export interface TradingSignal extends BaseSignal {
  pair?: string;
  entry?: number;
  target?: number;
  stopLoss?: number;
  riskRewardRatio?: string;
  successRate?: number;
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

export { SignalType, SignalStrength };
export type { MarketData, HistoricalData };

export enum SignalType {
  TECHNICAL = 'TECHNICAL',
  FUNDAMENTAL = 'FUNDAMENTAL',
  NEWS = 'NEWS',
  CORRELATION = 'CORRELATION',
  COMPRA = 'COMPRA',
  VENDA = 'VENDA'
}

export enum SignalStrength {
  STRONG = 'STRONG',
  MODERATE = 'MODERATE',
  WEAK = 'WEAK'
}

export interface BaseSignal {
  id?: string;
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
  status: string;
  related_asset?: string;
  pattern?: string;
  score?: number;
  categoria?: string;
  display_message?: string;
} 
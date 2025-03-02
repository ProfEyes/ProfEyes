// Interfaces corrigidas com codificação UTF-8 adequada

export interface MarketData {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
}

interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

export interface TradingSignal {
  id: number;
  pair: string;
  type: 'COMPRA' | 'VENDA';
  entry: string;
  target: string;
  stopLoss: string;
  timestamp: string;
  status: 'ATIVO' | 'CONCLUÍDO' | 'CANCELADO';
  successRate: number;
  timeframe: 'DAYTRADING' | 'CURTO' | 'MÉDIO' | 'LONGO';
  score: number;
  riskRewardRatio?: number; // Relação risco/recompensa
}

export interface InvestmentProfile {
  timeframe: 'CURTO' | 'MÉDIO' | 'LONGO';
  riskLevel: 'ALTO' | 'MODERADO' | 'BAIXO';
  amount: number;
}

export interface Portfolio {
  id: number;
  name: string;
  riskLevel: 'BAIXO' | 'MÉDIO' | 'ALTO';
  initialAmount: number;
  currentValue: number;
  assets: PortfolioAsset[];
  expectedReturn: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioAsset {
  symbol: string;
  name: string;
  type: 'AÇÃO' | 'CRIPTO';
  price: number;
  quantity: number;
  value: number;
  allocation: number; // Porcentagem
  change: number;
  changePercent: number;
}

export interface MarketNews {
  id: number;
  title: string;
  content: string;
  summary?: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  relatedSymbols: string[];
  sentiment: number;
} 
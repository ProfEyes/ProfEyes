import { useState, useEffect } from 'react';
import { TechnicalIndicators, PriceData, getTechnicalIndicators, getPriceData } from '@/services/technicalAnalysis';
import { CandlestickPattern, detectPatterns } from '@/services/candlestickPatterns';
import { getOrderBook } from '@/services/marketAnalysis';

interface UseMarketDataProps {
  symbol: string;
  timeframe: string;
  updateInterval?: number;
  historyLimit?: number;
}

interface OrderBookData {
  bids: [string, string][];
  asks: [string, string][];
  chartData: {
    price: number;
    bidsTotal: number;
    asksTotal: number;
  }[];
}

interface MarketData {
  indicators: TechnicalIndicators | null;
  priceData: PriceData[];
  patterns: CandlestickPattern[];
  orderbook: OrderBookData | null;
  loading: boolean;
  error: string | null;
}

export function useMarketData({ 
  symbol, 
  timeframe, 
  updateInterval = 5000,
  historyLimit = 200
}: UseMarketDataProps): MarketData {
  const [data, setData] = useState<MarketData>({
    indicators: null,
    priceData: [],
    patterns: [],
    orderbook: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        const [
          prices,
          technicalData,
          orderbook
        ] = await Promise.all([
          getPriceData(symbol, timeframe as any, historyLimit),
          getTechnicalIndicators(symbol, timeframe as any),
          getOrderBook(symbol)
        ]);
        
        const detectedPatterns = detectPatterns(prices);

        if (mounted) {
          setData({
            indicators: technicalData,
            priceData: prices,
            patterns: detectedPatterns,
            orderbook,
            loading: false,
            error: null
          });
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        if (mounted) {
          setData(prev => ({
            ...prev,
            loading: false,
            error: 'Erro ao carregar dados. Por favor, tente novamente.'
          }));
        }
      }
    };

    fetchData();

    if (updateInterval > 0) {
      intervalId = setInterval(fetchData, updateInterval);
    }

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [symbol, timeframe, updateInterval, historyLimit]);

  return data;
} 
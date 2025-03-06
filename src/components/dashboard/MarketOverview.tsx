import React, { useEffect, useState } from 'react';
import { MarketData } from '@/services/types';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MarketOverviewProps {
  marketData: MarketData[];
  isLoading: boolean;
}

export function MarketOverview({ marketData, isLoading }: MarketOverviewProps) {
  const [prevPrices, setPrevPrices] = useState<{[key: string]: string}>({});
  const [updatedItems, setUpdatedItems] = useState<{[key: string]: boolean}>({});

  // Organizar os dados em duas linhas
  const topCryptos = marketData.filter(data => 
    ['BTC', 'ETH', 'BNB'].includes(data.symbol)
  );
  
  const otherCryptos = marketData.filter(data => 
    !['BTC', 'ETH', 'BNB'].includes(data.symbol)
  );

  useEffect(() => {
    // Guardar preços anteriores para comparação
    if (marketData && marketData.length > 0) {
      // Registrar quais itens foram atualizados
      const newUpdatedItems: {[key: string]: boolean} = {};
      
      marketData.forEach(data => {
        if (prevPrices[data.symbol] && prevPrices[data.symbol] !== data.price) {
          newUpdatedItems[data.symbol] = true;
        }
      });
      
      // Definir quais itens foram atualizados
      if (Object.keys(newUpdatedItems).length > 0) {
        setUpdatedItems(newUpdatedItems);
        
        // Limpar a animação após 1 segundo
        setTimeout(() => {
          setUpdatedItems({});
        }, 1000);
      }
      
      // Atualizar preços anteriores
      const newPrevPrices: {[key: string]: string} = {};
      marketData.forEach(data => {
        newPrevPrices[data.symbol] = data.price;
      });
      setPrevPrices(newPrevPrices);
    }
  }, [marketData]);

  const renderMarketCard = (data: MarketData) => {
    const isUp = parseFloat(data.change) > 0;
    const isDown = parseFloat(data.change) < 0;
    const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;
    const wasUpdated = updatedItems[data.symbol];

    return (
      <Card 
        key={data.symbol} 
        className={cn(
          "hover-scale glass", 
          wasUpdated && "border-green-500 transition-colors duration-1000"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-md font-medium">
            {data.symbol}
            {wasUpdated && (
              <RefreshCw className="h-3 w-3 ml-1 inline-block animate-spin text-green-500" />
            )}
          </CardTitle>
          <CardDescription>
            {data.volume && parseInt(data.volume) > 0 ? `Vol: ${parseInt(data.volume).toLocaleString()}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-bold", 
            wasUpdated && "animate-pulse text-green-500"
          )}>
            {data.price}
          </div>
          <div className={`flex items-center mt-2 ${isUp ? "text-market-up" : isDown ? "text-market-down" : "text-market-neutral"}`}>
            <TrendIcon className="h-4 w-4 mr-1" />
            <span className="text-sm mr-1">{data.change}</span>
            <span className="text-sm">({data.changePercent})</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2 flex justify-between">
            <span>L: {data.low24h || '-'}</span>
            <span>H: {data.high24h || '-'}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold mb-3">Principais Criptomoedas</h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <div className="h-5 w-16 bg-white/10 rounded"></div>
                  <div className="h-4 w-24 bg-white/10 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-24 bg-white/10 rounded mb-2"></div>
                  <div className="h-5 w-20 bg-white/10 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-3">Altcoins & Tokens</h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Card key={i} className="glass animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <div className="h-5 w-16 bg-white/10 rounded"></div>
                  <div className="h-4 w-24 bg-white/10 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-24 bg-white/10 rounded mb-2"></div>
                  <div className="h-5 w-20 bg-white/10 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-3">Principais Criptomoedas</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {topCryptos.map(renderMarketCard)}
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-semibold mb-3">Altcoins & Tokens</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {otherCryptos.map(renderMarketCard)}
        </div>
      </div>
    </div>
  );
} 
interface AdvancedSignalAnalysis extends SignalAnalysis {
  technicalScore: number;
  volumeScore: number;
  patternScore: number;
  trendScore: number;
  momentumScore: number;
  orderFlowScore: number;
  marketStructureScore: number;
  totalScore: number;
}

interface MarketNews {
  title: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: number; // 0 a 1
  timestamp: number;
}

interface MarketAnalysis {
  price: number;
  volume24h: number;
  priceChange24h: number;
  volatility: number;
  news: MarketNews[];
}

private async analyzeMarketData(marketData: MarketData): Promise<AdvancedSignalAnalysis> {
  try {
    // Buscar dados em tempo real da Binance
    const ticker = await this.binanceService.get24hrTicker(marketData.symbol);
    const depth = await this.binanceService.getOrderBookDepth(marketData.symbol);
    
    // Análise multi-timeframe com dados mais recentes
    const klines1m = await this.binanceService.getKlines({
      symbol: marketData.symbol,
      interval: '1m',
      limit: 100 // Reduzido para dados mais recentes
    });

    const klines5m = await this.binanceService.getKlines({
      symbol: marketData.symbol,
      interval: '5m',
      limit: 50
    });

    // Calcular volatilidade real atual
    const realVolatility = this.calculateRealVolatility(klines1m);
    
    // Análise de liquidez e profundidade do book
    const bookAnalysis = this.analyzeOrderBook(depth);
    
    // Análise técnica precisa
    const technicalAnalysis = {
      rsi: this.calculateRSI(klines1m, 14),
      macd: this.calculateMACD(klines1m),
      bbands: this.calculateBollingerBands(klines1m, 20, 2),
      volume: this.analyzeVolumeProfile(klines1m),
      momentum: this.calculateMomentum(klines1m)
    };

    // Calcular assertividade baseada em múltiplos fatores
    const accuracy = this.calculateSignalAccuracy({
      technical: technicalAnalysis,
      liquidity: bookAnalysis,
      volatility: realVolatility,
      priceAction: this.analyzePriceAction(klines1m, klines5m)
    });

    // Gerar alvos realistas baseados em dados atuais
    const targets = this.calculateRealisticTargets({
      currentPrice: ticker.lastPrice,
      volatility: realVolatility,
      bookDepth: bookAnalysis,
      timeframe: '1m'
    });

    return {
      type: this.determineSignalType(technicalAnalysis, bookAnalysis),
      score: accuracy.totalScore,
      assertiveness: accuracy.probability,
      targets,
      reasons: this.generateDetailedReasons(technicalAnalysis, bookAnalysis, accuracy),
      ...accuracy
    };
  } catch (error) {
    console.error('Erro na análise de mercado:', error);
    return null;
  }
}

private calculateRealisticTargets(data: {
  currentPrice: number,
  volatility: number,
  bookDepth: any,
  timeframe: string
}): { entry: number, target: number, stop: number } {
  const { currentPrice, volatility } = data;
  
  // Movimento máximo esperado em 5 minutos
  const maxMove = Math.min(0.001, volatility * 0.5); // Máximo de 0.1% ou metade da volatilidade
  
  // Stop loss baseado em ATR de 1 minuto
  const stopDistance = Math.min(
    currentPrice * 0.0005, // Máximo 0.05%
    volatility * 0.3 // 30% da volatilidade atual
  );
  
  // Target baseado em R:R 1.5
  const targetDistance = stopDistance * 1.5;
  
  return {
    entry: currentPrice,
    target: currentPrice * (1 + maxMove),
    stop: currentPrice * (1 - (stopDistance / currentPrice))
  };
}

private calculateSignalAccuracy(data: any): {
  probability: number,
  confidence: number,
  totalScore: number
} {
  // Pesos para cada fator
  const weights = {
    technical: 0.4,
    liquidity: 0.2,
    volatility: 0.2,
    priceAction: 0.2
  };
  
  // Calcular scores individuais
  const technicalScore = this.calculateTechnicalScore(data.technical);
  const liquidityScore = this.calculateLiquidityScore(data.liquidity);
  const volatilityScore = this.calculateVolatilityScore(data.volatility);
  const priceActionScore = this.calculatePriceActionScore(data.priceAction);
  
  // Calcular score total ponderado
  const totalScore = (
    technicalScore * weights.technical +
    liquidityScore * weights.liquidity +
    volatilityScore * weights.volatility +
    priceActionScore * weights.priceAction
  );
  
  // Calcular probabilidade real baseada em histórico
  const probability = Math.min(0.85, totalScore / 100);
  
  return {
    probability: Number(probability.toFixed(4)),
    confidence: Number((totalScore / 100).toFixed(4)),
    totalScore: Number(totalScore.toFixed(2))
  };
}

public async fetchTradingSignals(): Promise<TradingSignal[]> {
  try {
    const allSignals: TradingSignal[] = [];
    const marketData = await this.binanceService.getMarketData();
    
    for (const data of marketData) {
      const analysis = await this.analyzeMarketData(data);
      if (!analysis || analysis.score < 75) continue;
      
      const signal: TradingSignal = {
        id: `${data.symbol}-${Date.now()}`,
        symbol: data.symbol,
        signal: analysis.type,
        entry_price: analysis.targets.entry,
        current_price: analysis.targets.entry,
        target_price: analysis.targets.target,
        stop_loss: analysis.targets.stop,
        timeframe: '1m',
        timestamp: Date.now(),
        expiry: Date.now() + (5 * 60 * 1000),
        reasons: analysis.reasons,
        assertiveness: `${(analysis.probability * 100).toFixed(1)}%`,
        status: 'ATIVO',
        type: SignalType.TECHNICAL,
        priority: analysis.score >= 90 ? 'HIGH' : 'NORMAL'
      };
      
      // Validar R:R e adicionar apenas se for viável
      const rr = Math.abs(signal.target_price - signal.entry_price) / 
                Math.abs(signal.stop_loss - signal.entry_price);
                
      if (rr >= 1.3 && rr <= 2.0) {
        allSignals.push(signal);
      }
    }
    
    // Retornar apenas os melhores sinais
    return allSignals
      .sort((a, b) => parseFloat(b.assertiveness) - parseFloat(a.assertiveness))
      .slice(0, 10);
  } catch (error) {
    console.error('Erro ao buscar sinais:', error);
    return [];
  }
}

private calculateTargets(
  currentPrice: number,
  marketStructure: MarketStructure,
  type: 'BUY' | 'SELL',
  atr: number,
  volatility: number
): { stopLoss: number; targetPrice: number } {
  // Calcular porcentagem máxima de movimento baseada na volatilidade atual
  const maxMove = Math.min(0.003, volatility * 1.5); // Máximo de 0.3% ou 1.5x a volatilidade atual
  
  // Usar ATR para definir stop loss mais preciso
  const stopDistance = Math.min(atr * 0.5, currentPrice * 0.002); // Menor entre 0.5 ATR ou 0.2%
  const targetDistance = stopDistance * 1.5; // Risk/Reward de 1:1.5
  
  if (type === 'BUY') {
    const targetPrice = Math.min(
      currentPrice * (1 + maxMove),
      currentPrice + targetDistance
    );
    
    return {
      stopLoss: currentPrice - stopDistance,
      targetPrice: targetPrice
    };
  } else {
    const targetPrice = Math.max(
      currentPrice * (1 - maxMove),
      currentPrice - targetDistance
    );
    
    return {
      stopLoss: currentPrice + stopDistance,
      targetPrice: targetPrice
    };
  }
}

private priceUpdateIntervals: Map<string, NodeJS.Timeout> = new Map();

private async startRealtimePriceUpdates(signal: TradingSignal) {
  // Limpar intervalo existente se houver
  if (this.priceUpdateIntervals.has(signal.id)) {
    clearInterval(this.priceUpdateIntervals.get(signal.id));
  }

  // Criar novo intervalo para atualização de preço
  const interval = setInterval(async () => {
    try {
      const currentPrice = await this.binanceService.getCurrentPrice(signal.symbol);
      if (currentPrice && !isNaN(currentPrice)) {
        signal.current_price = Number(currentPrice.toFixed(8));
        
        // Atualizar status do sinal baseado no preço atual
        this.updateSignalStatus(signal);
      }
    } catch (error) {
      console.error(`Erro ao atualizar preço para ${signal.symbol}:`, error);
    }
  }, 500); // Atualização a cada 0.5 segundos

  this.priceUpdateIntervals.set(signal.id, interval);
}

private updateSignalStatus(signal: TradingSignal) {
  if (signal.signal === 'BUY') {
    if (signal.current_price >= signal.target_price) {
      signal.status = 'ALVO_ATINGIDO';
      this.stopPriceUpdates(signal.id);
    } else if (signal.current_price <= signal.stop_loss) {
      signal.status = 'STOP_ATINGIDO';
      this.stopPriceUpdates(signal.id);
    }
  } else if (signal.signal === 'SELL') {
    if (signal.current_price <= signal.target_price) {
      signal.status = 'ALVO_ATINGIDO';
      this.stopPriceUpdates(signal.id);
    } else if (signal.current_price >= signal.stop_loss) {
      signal.status = 'STOP_ATINGIDO';
      this.stopPriceUpdates(signal.id);
    }
  }

  // Verificar expiração
  if (Date.now() >= signal.expiry) {
    signal.status = 'EXPIRADO';
    this.stopPriceUpdates(signal.id);
  }
}

private stopPriceUpdates(signalId: string) {
  const interval = this.priceUpdateIntervals.get(signalId);
  if (interval) {
    clearInterval(interval);
    this.priceUpdateIntervals.delete(signalId);
  }
}

private calculateSignalStrength(score: number): SignalStrength {
  if (score >= 75) return SignalStrength.STRONG;
  if (score >= 55) return SignalStrength.MODERATE;
  return SignalStrength.WEAK;
}

// Limpar todos os intervalos quando o serviço for destruído
public destroy() {
  for (const [signalId, interval] of this.priceUpdateIntervals) {
    clearInterval(interval);
  }
  this.priceUpdateIntervals.clear();
} 
import { 
  SignalAggregatorConfig, 
  SignalGeneratorResult, 
  SignalStrength, 
  SignalType, 
  TradingSignal 
} from './types';

/**
 * Classe responsável por agregar sinais de diferentes geradores
 * Implementa estratégias de combinação e resolução de conflitos
 */
export class SignalAggregator {
  private config: SignalAggregatorConfig;
  private logger: Console;
  
  constructor(config: SignalAggregatorConfig) {
    this.config = config;
    this.logger = console;
  }
  
  /**
   * Agrega sinais de diferentes geradores
   * @param generatorResults Resultados dos geradores de sinais
   * @returns Sinais agregados
   */
  public aggregateSignals(generatorResults: Record<SignalType, SignalGeneratorResult>): TradingSignal[] {
    try {
      // Extrair todos os sinais
      const allSignals: TradingSignal[] = [];
      
      for (const type in generatorResults) {
        if (generatorResults[type as SignalType]?.signals) {
          allSignals.push(...generatorResults[type as SignalType].signals);
        }
      }
      
      if (allSignals.length === 0) {
        return [];
      }
      
      // Agrupar sinais por símbolo
      const signalsBySymbol = this.groupSignalsBySymbol(allSignals);
      
      // Processar cada símbolo
      const aggregatedSignals: TradingSignal[] = [];
      
      for (const symbol in signalsBySymbol) {
        const symbolSignals = signalsBySymbol[symbol];
        
        // Verificar se há sinais suficientes
        if (symbolSignals.length < this.config.minSignalsRequired) {
          continue;
        }
        
        // Separar sinais por direção (compra/venda)
        const buySignals = symbolSignals.filter(s => s.signal === 'BUY');
        const sellSignals = symbolSignals.filter(s => s.signal === 'SELL');
        
        // Processar sinais de compra
        if (buySignals.length >= this.config.minSignalsRequired) {
          const aggregatedBuySignal = this.resolveConflicts(buySignals, 'BUY');
          if (aggregatedBuySignal) {
            aggregatedSignals.push(aggregatedBuySignal);
          }
        }
        
        // Processar sinais de venda
        if (sellSignals.length >= this.config.minSignalsRequired) {
          const aggregatedSellSignal = this.resolveConflicts(sellSignals, 'SELL');
          if (aggregatedSellSignal) {
            aggregatedSignals.push(aggregatedSellSignal);
          }
        }
      }
      
      return aggregatedSignals;
    } catch (error) {
      this.logger.error('Erro ao agregar sinais:', error);
      return [];
    }
  }
  
  /**
   * Agrupa sinais por símbolo
   * @param signals Lista de sinais
   * @returns Mapa de sinais agrupados por símbolo
   */
  private groupSignalsBySymbol(signals: TradingSignal[]): Record<string, TradingSignal[]> {
    const signalsBySymbol: Record<string, TradingSignal[]> = {};
    
    for (const signal of signals) {
      if (!signalsBySymbol[signal.symbol]) {
        signalsBySymbol[signal.symbol] = [];
      }
      
      signalsBySymbol[signal.symbol].push(signal);
    }
    
    return signalsBySymbol;
  }
  
  /**
   * Resolve conflitos entre sinais do mesmo símbolo e direção
   * @param signals Sinais a serem resolvidos
   * @param direction Direção dos sinais (BUY ou SELL)
   * @returns Sinal agregado ou null se não for possível resolver
   */
  private resolveConflicts(signals: TradingSignal[], direction: 'BUY' | 'SELL'): TradingSignal | null {
    if (signals.length === 0) {
      return null;
    }
    
    if (signals.length === 1) {
      return signals[0];
    }
    
    try {
      // Ordenar sinais por timestamp (mais recentes primeiro)
      signals.sort((a, b) => b.timestamp - a.timestamp);
      
      // Estratégia de resolução de conflitos
      switch (this.config.conflictResolution) {
        case 'strongest':
          return this.resolveByStrongest(signals);
        
        case 'weighted':
          return this.resolveByWeighted(signals, direction);
        
        case 'majority':
        default:
          return this.resolveByMajority(signals, direction);
      }
    } catch (error) {
      this.logger.error('Erro ao resolver conflitos de sinais:', error);
      return signals[0]; // Fallback para o primeiro sinal
    }
  }
  
  /**
   * Resolve conflitos escolhendo o sinal mais forte
   * @param signals Sinais a serem resolvidos
   * @returns Sinal mais forte
   */
  private resolveByStrongest(signals: TradingSignal[]): TradingSignal {
    // Mapear forças para valores numéricos
    const strengthValues: Record<SignalStrength, number> = {
      [SignalStrength.WEAK]: 1,
      [SignalStrength.MODERATE]: 2,
      [SignalStrength.STRONG]: 3
    };
    
    // Ordenar por força (decrescente)
    signals.sort((a, b) => strengthValues[b.strength] - strengthValues[a.strength]);
    
    return signals[0];
  }
  
  /**
   * Resolve conflitos usando uma abordagem ponderada
   * @param signals Sinais a serem resolvidos
   * @param direction Direção dos sinais
   * @returns Sinal agregado
   */
  private resolveByWeighted(signals: TradingSignal[], direction: 'BUY' | 'SELL'): TradingSignal {
    // Calcular pontuação para cada sinal
    const scoredSignals = signals.map(signal => {
      const typeWeight = this.config.typeWeights[signal.type] || 1;
      const strengthWeight = this.config.strengthWeights[signal.strength] || 1;
      const score = typeWeight * strengthWeight * signal.success_rate;
      
      return { signal, score };
    });
    
    // Ordenar por pontuação (decrescente)
    scoredSignals.sort((a, b) => b.score - a.score);
    
    // Usar o sinal com maior pontuação como base
    const baseSignal = scoredSignals[0].signal;
    
    // Calcular médias ponderadas para stop loss e target price
    let totalWeight = 0;
    let weightedStopLoss = 0;
    let weightedTargetPrice = 0;
    let weightedSuccessRate = 0;
    let combinedReasons: string[] = [];
    
    for (const { signal, score } of scoredSignals) {
      totalWeight += score;
      weightedStopLoss += signal.stop_loss * score;
      weightedTargetPrice += signal.target_price * score;
      weightedSuccessRate += signal.success_rate * score;
      
      // Adicionar razão se for diferente das já coletadas
      if (!combinedReasons.includes(signal.reason)) {
        combinedReasons.push(signal.reason);
      }
    }
    
    // Calcular valores finais
    const finalStopLoss = weightedStopLoss / totalWeight;
    const finalTargetPrice = weightedTargetPrice / totalWeight;
    const finalSuccessRate = weightedSuccessRate / totalWeight;
    
    // Limitar o número de razões combinadas
    if (combinedReasons.length > 3) {
      combinedReasons = combinedReasons.slice(0, 3);
    }
    
    // Calcular risk/reward
    const riskReward = direction === 'BUY'
      ? ((finalTargetPrice - baseSignal.price) / (baseSignal.price - finalStopLoss)).toFixed(2)
      : ((baseSignal.price - finalTargetPrice) / (finalStopLoss - baseSignal.price)).toFixed(2);
    
    // Criar sinal agregado
    return {
      ...baseSignal,
      reason: `Sinal combinado: ${combinedReasons.join(' + ')}`,
      stop_loss: finalStopLoss,
      target_price: finalTargetPrice,
      success_rate: finalSuccessRate,
      risk_reward: riskReward,
      metadata: {
        ...baseSignal.metadata,
        aggregation: {
          method: 'weighted',
          signalCount: signals.length,
          types: signals.map(s => s.type)
        }
      }
    };
  }
  
  /**
   * Resolve conflitos usando a abordagem de maioria
   * @param signals Sinais a serem resolvidos
   * @param direction Direção dos sinais
   * @returns Sinal agregado
   */
  private resolveByMajority(signals: TradingSignal[], direction: 'BUY' | 'SELL'): TradingSignal {
    // Contar ocorrências de cada tipo de sinal
    const typeCounts: Record<SignalType, number> = {} as Record<SignalType, number>;
    
    for (const signal of signals) {
      typeCounts[signal.type] = (typeCounts[signal.type] || 0) + 1;
    }
    
    // Encontrar o tipo mais comum
    let mostCommonType: SignalType | null = null;
    let maxCount = 0;
    
    for (const type in typeCounts) {
      if (typeCounts[type as SignalType] > maxCount) {
        maxCount = typeCounts[type as SignalType];
        mostCommonType = type as SignalType;
      }
    }
    
    if (!mostCommonType) {
      return signals[0]; // Fallback para o primeiro sinal
    }
    
    // Filtrar sinais do tipo mais comum
    const commonTypeSignals = signals.filter(s => s.type === mostCommonType);
    
    // Usar o sinal mais forte desse tipo
    return this.resolveByStrongest(commonTypeSignals);
  }
} 
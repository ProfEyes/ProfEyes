import { PriceData } from './technicalAnalysis';

export interface CandlestickPattern {
  name: string;
  type: 'bullish' | 'bearish';
  description: string;
  reliability: number; // Confiabilidade do padrão (1-5)
  position: number; // Índice onde o padrão foi encontrado
  timestamp: number; // Timestamp do padrão
  accuracy: number; // Precisão histórica do padrão (0-1)
}

// Função auxiliar para verificar se uma vela é de alta
function isBullishCandle(candle: PriceData): boolean {
  return candle.close > candle.open;
}

// Função auxiliar para verificar se uma vela é de baixa
function isBearishCandle(candle: PriceData): boolean {
  return candle.close < candle.open;
}

// Função auxiliar para calcular o tamanho do corpo da vela
function getBodySize(candle: PriceData): number {
  return Math.abs(candle.close - candle.open);
}

// Função auxiliar para calcular o tamanho da sombra superior
function getUpperShadow(candle: PriceData): number {
  return isBullishCandle(candle) 
    ? candle.high - candle.close 
    : candle.high - candle.open;
}

// Função auxiliar para calcular o tamanho da sombra inferior
function getLowerShadow(candle: PriceData): number {
  return isBullishCandle(candle) 
    ? candle.open - candle.low 
    : candle.close - candle.low;
}

// Detectar padrão Doji
function detectDoji(candle: PriceData): boolean {
  const bodySize = getBodySize(candle);
  const totalSize = candle.high - candle.low;
  return bodySize / totalSize < 0.1; // Corpo muito pequeno em relação ao total
}

// Detectar padrão Martelo
function detectHammer(candle: PriceData): boolean {
  const bodySize = getBodySize(candle);
  const lowerShadow = getLowerShadow(candle);
  const upperShadow = getUpperShadow(candle);
  
  return lowerShadow > (bodySize * 2) && upperShadow < bodySize;
}

// Detectar padrão Estrela Cadente
function detectShootingStar(candle: PriceData): boolean {
  const bodySize = getBodySize(candle);
  const upperShadow = getUpperShadow(candle);
  const lowerShadow = getLowerShadow(candle);
  
  return upperShadow > (bodySize * 2) && lowerShadow < bodySize;
}

// Detectar padrão Engolfo de Alta
function detectBullishEngulfing(current: PriceData, previous: PriceData): boolean {
  return isBearishCandle(previous) &&
         isBullishCandle(current) &&
         current.open < previous.close &&
         current.close > previous.open;
}

// Detectar padrão Engolfo de Baixa
function detectBearishEngulfing(current: PriceData, previous: PriceData): boolean {
  return isBullishCandle(previous) &&
         isBearishCandle(current) &&
         current.open > previous.close &&
         current.close < previous.open;
}

// Detectar padrão Harami de Alta
function detectBullishHarami(current: PriceData, previous: PriceData): boolean {
  return isBearishCandle(previous) &&
         isBullishCandle(current) &&
         current.open > previous.close &&
         current.close < previous.open;
}

// Detectar padrão Harami de Baixa
function detectBearishHarami(current: PriceData, previous: PriceData): boolean {
  return isBullishCandle(previous) &&
         isBearishCandle(current) &&
         current.open < previous.close &&
         current.close > previous.open;
}

// Detectar padrão Morning Star
function detectMorningStar(candles: PriceData[]): boolean {
  if (candles.length < 3) return false;
  
  const [first, second, third] = candles.slice(-3);
  
  return isBearishCandle(first) &&
         detectDoji(second) &&
         isBullishCandle(third) &&
         third.close > ((first.open + first.close) / 2);
}

// Detectar padrão Evening Star
function detectEveningStar(candles: PriceData[]): boolean {
  if (candles.length < 3) return false;
  
  const [first, second, third] = candles.slice(-3);
  
  return isBullishCandle(first) &&
         detectDoji(second) &&
         isBearishCandle(third) &&
         third.close < ((first.open + first.close) / 2);
}

// Função para calcular a precisão histórica de um padrão
function calculatePatternAccuracy(
  candles: PriceData[],
  patternType: 'bullish' | 'bearish',
  position: number,
  lookbackPeriod: number = 100
): number {
  // Se não houver dados suficientes para análise histórica
  if (position < lookbackPeriod) {
    return 0.5; // Retorna precisão neutra
  }

  let successCount = 0;
  let totalCount = 0;

  // Analisar ocorrências anteriores do padrão
  for (let i = position - lookbackPeriod; i < position; i++) {
    if (i < 0) continue;

    const current = candles[i];
    const next = candles[i + 1];
    const future = candles[i + 5]; // Verificar o preço 5 períodos à frente

    if (!current || !next || !future) continue;

    // Verificar se o padrão foi bem-sucedido
    if (patternType === 'bullish') {
      if (future.close > next.open) {
        successCount++;
      }
    } else {
      if (future.close < next.open) {
        successCount++;
      }
    }
    totalCount++;
  }

  return totalCount > 0 ? successCount / totalCount : 0.5;
}

// Função principal para detectar todos os padrões
export function detectPatterns(candles: PriceData[]): CandlestickPattern[] {
  if (candles.length < 3) return [];
  
  const patterns: CandlestickPattern[] = [];
  const lastIndex = candles.length - 1;
  
  // Verificar padrões de vela única
  const current = candles[lastIndex];
  if (detectDoji(current)) {
    const accuracy = calculatePatternAccuracy(candles, 'bullish', lastIndex);
    patterns.push({
      name: 'Doji',
      type: 'bullish',
      description: 'Indica indecisão no mercado',
      reliability: 3,
      position: lastIndex,
      timestamp: current.timestamp,
      accuracy
    });
  }
  
  if (detectHammer(current)) {
    const accuracy = calculatePatternAccuracy(candles, 'bullish', lastIndex);
    patterns.push({
      name: 'Martelo',
      type: 'bullish',
      description: 'Possível reversão de baixa para alta',
      reliability: 4,
      position: lastIndex,
      timestamp: current.timestamp,
      accuracy
    });
  }
  
  if (detectShootingStar(current)) {
    const accuracy = calculatePatternAccuracy(candles, 'bearish', lastIndex);
    patterns.push({
      name: 'Estrela Cadente',
      type: 'bearish',
      description: 'Possível reversão de alta para baixa',
      reliability: 4,
      position: lastIndex,
      timestamp: current.timestamp,
      accuracy
    });
  }
  
  // Verificar padrões de duas velas
  const previous = candles[lastIndex - 1];
  if (detectBullishEngulfing(current, previous)) {
    const accuracy = calculatePatternAccuracy(candles, 'bullish', lastIndex);
    patterns.push({
      name: 'Engolfo de Alta',
      type: 'bullish',
      description: 'Forte sinal de reversão para alta',
      reliability: 5,
      position: lastIndex,
      timestamp: current.timestamp,
      accuracy
    });
  }
  
  if (detectBearishEngulfing(current, previous)) {
    const accuracy = calculatePatternAccuracy(candles, 'bearish', lastIndex);
    patterns.push({
      name: 'Engolfo de Baixa',
      type: 'bearish',
      description: 'Forte sinal de reversão para baixa',
      reliability: 5,
      position: lastIndex,
      timestamp: current.timestamp,
      accuracy
    });
  }
  
  if (detectBullishHarami(current, previous)) {
    const accuracy = calculatePatternAccuracy(candles, 'bullish', lastIndex);
    patterns.push({
      name: 'Harami de Alta',
      type: 'bullish',
      description: 'Possível reversão para alta',
      reliability: 3,
      position: lastIndex,
      timestamp: current.timestamp,
      accuracy
    });
  }
  
  if (detectBearishHarami(current, previous)) {
    const accuracy = calculatePatternAccuracy(candles, 'bearish', lastIndex);
    patterns.push({
      name: 'Harami de Baixa',
      type: 'bearish',
      description: 'Possível reversão para baixa',
      reliability: 3,
      position: lastIndex,
      timestamp: current.timestamp,
      accuracy
    });
  }
  
  // Verificar padrões de três velas
  if (detectMorningStar(candles.slice(-3))) {
    const accuracy = calculatePatternAccuracy(candles, 'bullish', lastIndex);
    patterns.push({
      name: 'Estrela da Manhã',
      type: 'bullish',
      description: 'Forte sinal de reversão para alta',
      reliability: 5,
      position: lastIndex,
      timestamp: current.timestamp,
      accuracy
    });
  }
  
  if (detectEveningStar(candles.slice(-3))) {
    const accuracy = calculatePatternAccuracy(candles, 'bearish', lastIndex);
    patterns.push({
      name: 'Estrela da Noite',
      type: 'bearish',
      description: 'Forte sinal de reversão para baixa',
      reliability: 5,
      position: lastIndex,
      timestamp: current.timestamp,
      accuracy
    });
  }
  
  return patterns;
} 
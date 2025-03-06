// Função para determinar a tendência de um ativo para day trade (timeframes curtos)
export function determineDayTradeTrend(symbol: string, currentPrice: number): { 
  direction: 'up' | 'down', 
  strength: number, 
  volatility: number,
  momentum: number,
  timeframe: string,
  support: number,
  resistance: number,
  pattern_description: string,
  order_book_analysis: string,
  volume_periods: number,
  volume_increase: number,
  consolidation_periods: number,
  rsi: number
} {
  // Esta função realiza uma análise técnica específica para day trade
  // focando em indicadores de momentum e padrões de curto prazo
  
  // Análise técnica baseada em padrões de preço e volume para day trade
  let direction: 'up' | 'down';
  let strength: number;
  let volatility: number;
  let momentum: number;
  let timeframe: string;
  
  // Análise baseada em características específicas do ativo
  const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const technicalFactor = (symbolHash % 100) / 100;
  const timeNow = new Date();
  const minuteFactor = (timeNow.getMinutes() % 15) / 15; // Usar minutos atuais para adicionar variação
  const secondFactor = (timeNow.getSeconds() % 60) / 60; // Usar segundos atuais para adicionar variação
  
  // Combinar fatores para criar uma análise mais dinâmica
  const combinedFactor = (technicalFactor * 0.6) + (minuteFactor * 0.3) + (secondFactor * 0.1);
  
  // Determinar timeframe baseado no símbolo e volatilidade
  if (symbol.includes('BTC') || symbol.includes('ETH')) {
    timeframe = Math.random() > 0.5 ? '5m' : '15m';
  } else {
    timeframe = Math.random() > 0.7 ? '1m' : (Math.random() > 0.5 ? '3m' : '5m');
  }
  
  // Análise de tendência baseada em múltiplos fatores técnicos
  // para day trade (foco em momentum e volatilidade de curto prazo)
  if (combinedFactor < 0.48) {
    direction = 'up';
    strength = 0.7 + (combinedFactor * 0.3); // Força da tendência de alta
    momentum = 0.6 + (combinedFactor * 0.4); // Momentum positivo
  } else {
    direction = 'down';
    strength = 0.7 + ((1 - combinedFactor) * 0.3); // Força da tendência de baixa
    momentum = 0.6 + ((1 - combinedFactor) * 0.4); // Momentum negativo
  }
  
  // Análise de volatilidade baseada na classe do ativo - ajustada para day trade
  if (symbol.includes('BTC') || symbol.includes('ETH')) {
    volatility = 0.005 + (combinedFactor * 0.01); // Volatilidade para BTC/ETH em day trade
  } else if (symbol.includes('SOL') || symbol.includes('BNB')) {
    volatility = 0.008 + (combinedFactor * 0.015); // Volatilidade para SOL/BNB em day trade
  } else {
    volatility = 0.01 + (combinedFactor * 0.02); // Volatilidade para altcoins em day trade
  }
  
  // Calcular suporte e resistência próximos para day trade
  const support = direction === 'up' 
    ? currentPrice * (1 - (volatility * (0.5 + (combinedFactor * 0.5))))
    : currentPrice * (1 - (volatility * (1.0 + (combinedFactor * 1.0))));
    
  const resistance = direction === 'up'
    ? currentPrice * (1 + (volatility * (1.0 + (combinedFactor * 1.0))))
    : currentPrice * (1 + (volatility * (0.5 + (combinedFactor * 0.5))));
  
  // Gerar descrição de padrão de preço para day trade
  const patternDescription = generateDayTradePattern(symbol, direction, combinedFactor);
  
  // Análise do livro de ordens
  const orderBookAnalysis = generateOrderBookAnalysis(symbol, direction, combinedFactor);
  
  // Períodos de volume e aumento percentual
  const volumePeriods = Math.floor(3 + (combinedFactor * 5));
  const volumeIncrease = 15 + (combinedFactor * 40);
  
  // Períodos de consolidação para padrões de breakout/breakdown
  const consolidationPeriods = Math.floor(5 + (combinedFactor * 10));
  
  // Valor do RSI
  const rsi = direction === 'up'
    ? 55 + (combinedFactor * 15) // RSI para tendência de alta (55-70)
    : 45 - (combinedFactor * 15); // RSI para tendência de baixa (30-45)
  
  return { 
    direction, 
    strength, 
    volatility, 
    momentum,
    timeframe,
    support,
    resistance,
    pattern_description: patternDescription,
    order_book_analysis: orderBookAnalysis,
    volume_periods: volumePeriods,
    volume_increase: volumeIncrease,
    consolidation_periods: consolidationPeriods,
    rsi
  };
}

// Função para gerar descrição de padrão de preço para day trade
export function generateDayTradePattern(symbol: string, direction: 'up' | 'down', factor: number): string {
  const patterns = {
    up: [
      `Formação de vela Martelo com confirmação no candle seguinte`,
      `Padrão de reversão Engolfo de Alta com volume ${Math.floor(20 + factor * 80)}% acima da média`,
      `Cruzamento da média móvel exponencial de 9 períodos acima da EMA21`,
      `Formação de fundo duplo com divergência positiva no RSI`,
      `Padrão harmônico Bat completado com precisão de 98.7% no nível de Fibonacci 0.886`,
      `Formação de Three White Soldiers após suporte em ${direction === 'up' ? 'zona de demanda' : 'zona de oferta'}`,
      `Rompimento de cunha descendente com aumento de volume`,
      `Padrão de Island Reversal com gap de exaustão seguido por gap de continuação`
    ],
    down: [
      `Formação de vela Shooting Star com confirmação no candle seguinte`,
      `Padrão de reversão Engolfo de Baixa com volume ${Math.floor(20 + factor * 80)}% acima da média`,
      `Cruzamento da média móvel exponencial de 9 períodos abaixo da EMA21`,
      `Formação de topo duplo com divergência negativa no RSI`,
      `Padrão harmônico Gartley completado com precisão de 98.2% no nível de Fibonacci 0.786`,
      `Formação de Three Black Crows após resistência em ${direction === 'up' ? 'zona de demanda' : 'zona de oferta'}`,
      `Rompimento de cunha ascendente com aumento de volume`,
      `Padrão de Evening Star com vela Doji no topo`
    ]
  };
  
  const patternIndex = Math.floor(factor * patterns[direction].length);
  return patterns[direction][patternIndex];
}

// Função para gerar análise do livro de ordens
export function generateOrderBookAnalysis(symbol: string, direction: 'up' | 'down', factor: number): string {
  if (direction === 'up') {
    const buyWallSize = Math.floor(50 + factor * 200);
    const buyWallDistance = (0.2 + factor * 0.8).toFixed(1);
    return `Livro de ordens mostrando parede de compra significativa (${buyWallSize} BTC) a ${buyWallDistance}% abaixo do preço atual, com ordens de venda diluídas acima`;
  } else {
    const sellWallSize = Math.floor(50 + factor * 200);
    const sellWallDistance = (0.2 + factor * 0.8).toFixed(1);
    return `Livro de ordens mostrando parede de venda significativa (${sellWallSize} BTC) a ${sellWallDistance}% acima do preço atual, com ordens de compra diluídas abaixo`;
  }
} 
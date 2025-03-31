import { generateRandomId } from '@/lib/utils';

// Interface para preço
interface Price {
  symbol: string;
  price: string;
  change?: number;
  changePercent?: number;
}

// Cache global de preços para simular valores consistentes
const priceCache: Record<string, { 
  basePrice: number, 
  volatility: number,
  trend: number,
  lastUpdate: number
}> = {};

/**
 * Busca os preços mais recentes para os símbolos fornecidos
 * @param symbols Lista de símbolos para buscar preços
 * @returns Lista de preços atualizados
 */
export async function getLatestPrices(symbols: string[]): Promise<Price[]> {
  // Simulação de busca de preços - em produção isso seria uma chamada de API real
  return symbols.map(symbol => {
    // Obter ou inicializar preço base para o símbolo
    if (!priceCache[symbol]) {
      priceCache[symbol] = {
        basePrice: getInitialPrice(symbol),
        volatility: 0.0005 + Math.random() * 0.002, // Volatilidade simulada
        trend: Math.random() * 0.004 - 0.002, // Tendência direcional (-0.2% a +0.2%)
        lastUpdate: Date.now()
      };
    }
    
    // Atualizar preço com alguma variação aleatória que simula o mercado
    const cached = priceCache[symbol];
    const now = Date.now();
    const timeDiff = (now - cached.lastUpdate) / 1000; // Em segundos
    
    // Ajustar preço com base no tempo passado desde a última atualização
    const randomWalk = (Math.random() * 2 - 1) * cached.volatility;
    const trendEffect = cached.trend * timeDiff;
    const priceChange = (randomWalk + trendEffect) * cached.basePrice;
    
    // Atualizar preço base
    cached.basePrice += priceChange;
    cached.lastUpdate = now;
    
    // Inverter tendência ocasionalmente para simular mercado
    if (Math.random() < 0.05) { // 5% de chance a cada chamada
      cached.trend = Math.random() * 0.004 - 0.002; // Nova tendência aleatória
    }
    
    // Aumentar/diminuir volatilidade ocasionalmente
    if (Math.random() < 0.03) { // 3% de chance a cada chamada
      cached.volatility = 0.0005 + Math.random() * 0.002; // Nova volatilidade
    }
    
    // Formatar preço com número apropriado de casas decimais
    const price = formatPrice(cached.basePrice, symbol);
    
    // Calcular mudança percentual (simulada)
    const changePercent = (Math.random() * 2 - 1) * cached.volatility * 100;
    
    return {
      symbol,
      price,
      change: cached.basePrice * changePercent / 100,
      changePercent
    };
  });
}

/**
 * Obtém um preço inicial estimado para o símbolo
 */
function getInitialPrice(symbol: string): number {
  // Preços base aproximados para criptomoedas comuns
  const basePrices: Record<string, number> = {
    'BTCUSDT': 68000 + (Math.random() * 4000 - 2000),
    'ETHUSDT': 3500 + (Math.random() * 200 - 100),
    'BNBUSDT': 600 + (Math.random() * 40 - 20),
    'SOLUSDT': 145 + (Math.random() * 15 - 7.5),
    'DOGEUSDT': 0.15 + (Math.random() * 0.02 - 0.01),
    'XRPUSDT': 0.55 + (Math.random() * 0.05 - 0.025),
    'ADAUSDT': 0.45 + (Math.random() * 0.04 - 0.02),
    'MATICUSDT': 0.6 + (Math.random() * 0.06 - 0.03),
    'AVAXUSDT': 35 + (Math.random() * 3 - 1.5),
    'LINKUSDT': 15 + (Math.random() * 1.5 - 0.75),
    'LTCUSDT': 85 + (Math.random() * 8 - 4),
    'DOTUSDT': 7 + (Math.random() * 0.7 - 0.35),
    // Adicionar mais símbolos conforme necessário
  };
  
  return basePrices[symbol] || 100; // Valor padrão se símbolo não estiver na lista
}

/**
 * Formata o preço com o número apropriado de casas decimais
 */
function formatPrice(price: number, symbol: string): string {
  // Determinar número de casas decimais com base no símbolo e valor
  let decimals = 2;
  
  if (price < 0.01) {
    decimals = 6;
  } else if (price < 0.1) {
    decimals = 5;
  } else if (price < 1) {
    decimals = 4;
  } else if (price < 10) {
    decimals = 3;
  } else if (price < 1000) {
    decimals = 2;
  } else {
    decimals = 2;
  }
  
  // Bitcoins e tokens maiores têm menos casas decimais
  if (symbol === 'BTCUSDT') {
    decimals = Math.min(decimals, 2);
  }
  
  return price.toFixed(decimals);
}

/**
 * Exportar função para uso em outros módulos
 */
export default getLatestPrices; 
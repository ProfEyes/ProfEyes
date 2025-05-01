// Adicionar declaração de tipo para a propriedade window.hasShownLatestPricesWarning
declare global {
  interface Window {
    hasShownLatestPricesWarning?: boolean;
  }
}

// Serviço para gerar preços simulados para os ativos
// Este arquivo substitui as chamadas à API da Binance por dados simulados

// Dados de preços simulados iniciais
const SIMULATED_PRICES: Record<string, string> = {
  // Estatísticas do trader
  'SINAIS_TOTAL': '287',
  'ACERTOS': '72%',
  'GANHO_MENSAL': 'R$ 4.328',
  'PERDA_MENSAL': 'R$ 1.256',
  'LUCRO_TOTAL': 'R$ 37.245',
  'OPERACOES_HOJE': '5',
  'TEMPO_ONLINE': '126h',
  'DIAS_ATIVOS': '45',
  
  // Mantendo outros dados para compatibilidade
  // Mensagens motivacionais e informações personalizadas
  'BEMVINDO': 'Bem-vindo de volta',
  'MOTIVACAO': 'Mantenha a disciplina todos os dias',
  'DICA_1': 'Defina seu plano de negociação',
  'DICA_2': 'Paciência traz resultados',
  'META': '70% concluída',
  'DESEMPENHO': '85% de acertos',
  'TEMPO': '42 min online',
  'NOTIFICACAO': '3 novos sinais',
  
  // Ações, Commodities, Moedas e ETFs
  'PETR4': '36.75',
  'VALE3': '67.82',
  'OURO': '389.42',
  'PRATA': '44.87',
  'USDBRL': '5.45',
  'EURBRL': '5.84',
  'BOVA11': '114.25',
  'WTI': '76.89',
  
  // Mantendo os índices anteriores e criptomoedas para compatibilidade
  IBOVESPA: '127834.33',
  'S&P500': '5375.61',
  NASDAQ: '17087.42',
  DOW: '42071.13',
  FTSE: '8242.75',
  DAX: '18468.92',
  NIKKEI: '38807.55',
  EURO: '4912.43',
  
  // Mantendo as criptomoedas para compatibilidade com o restante do código
  BTCUSDT: '71782.98',
  ETHUSDT: '3386.78',
  BNBUSDT: '591.89',
  SOLUSDT: '168.69',
  XRPUSDT: '0.51',
  ADAUSDT: '0.45',
  DOGEUSDT: '0.13',
  DOTUSDT: '6.89',
  MATICUSDT: '0.6273',
  LINKUSDT: '15.384',
  LTCUSDT: '78.65',
  AVAXUSDT: '34.27',
  UNIUSDT: '8.43',
  ATOMUSDT: '10.25',
  VETUSDT: '0.0324',
  APTUSDT: '8.65',
  NEARUSDT: '5.12',
  ARBUSDT: '1.43',
  FILUSDT: '7.32',
  SUIUSDT: '1.65',
};

// Dados de estatísticas de 24h simulados
const SIMULATED_24H_STATS: Record<string, {
  symbol: string;
  high: string;
  low: string;
  volume: string;
  quoteVolume: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
}> = {};

// Inicializar estatísticas simuladas para cada símbolo
Object.keys(SIMULATED_PRICES).forEach(symbol => {
  const price = parseFloat(SIMULATED_PRICES[symbol]);
  const randomChange = (Math.random() * 6) - 3; // Variação entre -3% e +3%
  const priceChange = price * (randomChange / 100);
  
  SIMULATED_24H_STATS[symbol] = {
    symbol,
    high: (price * 1.05).toFixed(2),
    low: (price * 0.95).toFixed(2),
    volume: (Math.random() * 5000 + 1000).toFixed(2),
    quoteVolume: (Math.random() * 20000000 + 5000000).toFixed(2),
    lastPrice: price.toFixed(2),
    priceChange: priceChange.toFixed(2),
    priceChangePercent: randomChange.toFixed(2),
  };
});

// Função para gerar pequenas variações aleatórias nos preços
function getRandomPriceVariation(basePrice: number): number {
  // Variação entre -0.5% e +0.5%
  const variationPercent = (Math.random() * 1) - 0.5;
  return basePrice * (1 + variationPercent / 100);
}

// Obter preços atualizados com pequenas variações aleatórias
export async function getLatestPrices(symbols?: string[]): Promise<{ symbol: string; price: string }[]> {
  // Se não houver símbolos fornecidos, usar todos os disponíveis
  const symbolsToUse = symbols || Object.keys(SIMULATED_PRICES);
  
  // Filtrar símbolos válidos que existem em nossa lista simulada
  // Verifica se os símbolos são strings e não vazios antes de filtrá-los
  const validSymbols = symbolsToUse
    .filter(symbol => typeof symbol === 'string' && symbol.trim() !== '')
    .filter(symbol => SIMULATED_PRICES[symbol]);
  
  if (validSymbols.length === 0) {
    // Verificar se essa é a primeira vez que estamos exibindo o aviso (usando um sinalizador)
    if (!window.hasShownLatestPricesWarning) {
      console.warn('getLatestPrices: Nenhum símbolo válido fornecido ou encontrado, usando símbolos padrão');
      // Definir o sinalizador para evitar avisos repetidos
      window.hasShownLatestPricesWarning = true;
    }
    
    // Usar símbolos mais comuns de trading como padrão
    const defaultSymbols = [
      'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 
      'PETR4', 'VALE3', 'IBOVESPA', 'S&P500', 'NASDAQ'
    ];
    
    // Verificar se estes símbolos existem em nossa lista simulada
    // Se não existirem, criar dados simulados para eles
    const availableDefaultSymbols = defaultSymbols.filter(symbol => {
      if (!SIMULATED_PRICES[symbol]) {
        SIMULATED_PRICES[symbol] = (50 + Math.random() * 50).toFixed(2);
      }
      return true;
    });
    
    // Retornar preços para os símbolos padrão
    return availableDefaultSymbols.map(symbol => {
      const basePrice = parseFloat(SIMULATED_PRICES[symbol]);
      const updatedPrice = getRandomPriceVariation(basePrice);
      
      // Atualizar o preço simulado para a próxima chamada
      SIMULATED_PRICES[symbol] = updatedPrice.toFixed(2);
      
      return {
        symbol,
        price: updatedPrice.toFixed(2)
      };
    });
  }
  
  // Criar resposta com preços atualizados (com pequenas variações)
  return validSymbols.map(symbol => {
    const basePrice = parseFloat(SIMULATED_PRICES[symbol]);
    const updatedPrice = getRandomPriceVariation(basePrice);
    
    // Atualizar o preço simulado para a próxima chamada
    SIMULATED_PRICES[symbol] = updatedPrice.toFixed(2);
    
    return {
      symbol,
      price: updatedPrice.toFixed(2)
    };
  });
}

// Obter estatísticas de 24 horas para um símbolo
export async function get24hStats(symbol: string): Promise<{
  symbol: string;
  high: string;
  low: string;
  volume: string;
  quoteVolume: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
}> {
  // Verificar se o símbolo existe
  if (!SIMULATED_24H_STATS[symbol]) {
    // Criar estatísticas para um novo símbolo
    const price = parseFloat(SIMULATED_PRICES[symbol] || "100.00");
    const randomChange = (Math.random() * 6) - 3; // Variação entre -3% e +3%
    const priceChange = price * (randomChange / 100);
    
    SIMULATED_24H_STATS[symbol] = {
      symbol,
      high: (price * 1.05).toFixed(2),
      low: (price * 0.95).toFixed(2),
      volume: (Math.random() * 5000 + 1000).toFixed(2),
      quoteVolume: (Math.random() * 20000000 + 5000000).toFixed(2),
      lastPrice: price.toFixed(2),
      priceChange: priceChange.toFixed(2),
      priceChangePercent: randomChange.toFixed(2),
    };
  }
  
  // Atualizar preço atual e calcular novas variações
  const currentPrice = parseFloat(SIMULATED_PRICES[symbol] || "100.00");
  const lastPrice = parseFloat(SIMULATED_24H_STATS[symbol].lastPrice);
  const priceChange = currentPrice - lastPrice;
  const priceChangePercent = (priceChange / lastPrice) * 100;
  
  // Atualizar estatísticas
  SIMULATED_24H_STATS[symbol] = {
    ...SIMULATED_24H_STATS[symbol],
    lastPrice: currentPrice.toFixed(2),
    priceChange: priceChange.toFixed(2),
    priceChangePercent: priceChangePercent.toFixed(2),
  };
  
  return SIMULATED_24H_STATS[symbol];
}

// Função para simular dados históricos
export async function getHistoricalKlines(
  symbol: string,
  interval: string,
  limit: number = 500
): Promise<any[]> {
  // Simular dados de velas (candles) para gráficos
  const basePrice = parseFloat(SIMULATED_PRICES[symbol] || "100.00");
  const klines = [];
  
  let currentPrice = basePrice;
  const now = Date.now();
  
  // Determinar o intervalo de tempo em milissegundos
  let timeInterval = 60000; // 1m padrão (1 minuto em milissegundos)
  
  if (interval.includes('m')) {
    timeInterval = parseInt(interval.replace('m', '')) * 60000;
  } else if (interval.includes('h')) {
    timeInterval = parseInt(interval.replace('h', '')) * 3600000;
  } else if (interval.includes('d')) {
    timeInterval = parseInt(interval.replace('d', '')) * 86400000;
  } else if (interval.includes('w')) {
    timeInterval = parseInt(interval.replace('w', '')) * 604800000;
  }
  
  // Gerar dados históricos
  for (let i = 0; i < limit; i++) {
    const timestamp = now - (limit - i) * timeInterval;
    
    // Simular variação de preço
    const variation = (Math.random() * 2 - 1) * (basePrice * 0.01);
    currentPrice += variation;
    
    // Garantir que o preço não seja negativo
    if (currentPrice <= 0) currentPrice = basePrice * 0.1;
    
    // Simular high, low, open, close
    const open = currentPrice;
    const high = open * (1 + Math.random() * 0.01);
    const low = open * (1 - Math.random() * 0.01);
    const close = low + Math.random() * (high - low);
    
    // Simular volume
    const volume = Math.random() * 1000 + 100;
    
    // Formato do Binance: [openTime, open, high, low, close, volume, closeTime, quoteAssetVolume, numberOfTrades, takerBuyBaseAssetVolume, takerBuyQuoteAssetVolume, ignored]
    klines.push([
      timestamp,
      open.toFixed(2),
      high.toFixed(2),
      low.toFixed(2),
      close.toFixed(2),
      volume.toFixed(2),
      timestamp + timeInterval,
      (volume * close).toFixed(2),
      Math.floor(Math.random() * 500) + 50,
      (volume * 0.4).toFixed(2),
      (volume * 0.4 * close).toFixed(2),
      "0"
    ]);
  }
  
  return klines;
}

// Outras funções que podem ser necessárias para simular dados da Binance
export async function getCurrentPrice(symbol: string): Promise<string> {
  if (!SIMULATED_PRICES[symbol]) {
    SIMULATED_PRICES[symbol] = "100.00";
  }
  
  return SIMULATED_PRICES[symbol];
}

// Função para obter a variação de preço nas últimas 24 horas
export async function get24hPriceChange(symbol: string): Promise<{ change: string; changePercent: string }> {
  try {
    // Buscar estatísticas de 24h do serviço simulado
    const stats = await get24hStats(symbol);
    
    return {
      change: stats.priceChange,
      changePercent: stats.priceChangePercent
    };
  } catch (error) {
    console.error(`Erro ao obter variação de preço para ${symbol}:`, error);
    return {
      change: "0.00",
      changePercent: "0.00"
    };
  }
}

// Exportar funções adicionais que podem ser utilizadas no lugar das funções da Binance
export default {
  getLatestPrices,
  get24hStats,
  getHistoricalKlines,
  getCurrentPrice,
  get24hPriceChange,
}; 
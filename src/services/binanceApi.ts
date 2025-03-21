import { API_KEYS } from './apiKeys';
// Removendo a importação do crypto que não funciona no navegador
// import * as crypto from 'crypto';

// Chaves de API Binance (autenticação)
const API_KEY = API_KEYS.BINANCE.API_KEY;
const API_SECRET = API_KEYS.BINANCE.API_SECRET;

// URLs de base
const BASE_URL = 'https://api.binance.com';
const BASE_URL_US = 'https://api.binance.us'; // Para usuários dos EUA

// WebSocket connections
let priceWebSocket: WebSocket | null = null;
let symbolSubscriptions: Set<string> = new Set();
let priceUpdateListeners: Map<string, ((price: { symbol: string, price: string }) => void)[]> = new Map();

// Variáveis para controle de reconexão
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectTimeout: number | null = null;

// Função para gerar assinatura HMAC SHA256 usando SubtleCrypto (Web Crypto API)
async function generateHmacSignature(message: string, secret: string): Promise<string> {
  // Converter a mensagem e a chave secreta para ArrayBuffer
  const encoder = new TextEncoder();
  const messageBuffer = encoder.encode(message);
  const secretBuffer = encoder.encode(secret);
  
  // Importar a chave secreta
  const key = await window.crypto.subtle.importKey(
    'raw',
    secretBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Gerar a assinatura
  const signature = await window.crypto.subtle.sign(
    'HMAC',
    key,
    messageBuffer
  );
  
  // Converter o resultado para string hexadecimal
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Função para fazer chamadas autenticadas à API da Binance
async function binanceAuthenticatedCall(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  params: Record<string, string> = {}
): Promise<any> {
  try {
    // Adicionar timestamp (obrigatório para chamadas autenticadas)
    const timestamp = Date.now().toString();
    const queryParams = new URLSearchParams({
      ...params,
      timestamp
    });
    
    // Gerar assinatura HMAC SHA256 usando a função Web Crypto API
    const signature = await generateHmacSignature(queryParams.toString(), API_SECRET);
    
    // Adicionar assinatura aos parâmetros
    queryParams.append('signature', signature);
    
    // Construir URL
    const url = `${BASE_URL}${endpoint}?${queryParams.toString()}`;
    
    // Fazer a requisição com headers de autenticação
    const response = await fetch(url, {
      method,
      headers: {
        'X-MBX-APIKEY': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro Binance: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro na chamada autenticada à Binance API:', error);
    throw error;
  }
}

// Função para fazer chamadas públicas à API da Binance (sem autenticação)
async function binancePublicCall(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
    
    // Tentar fazer a requisição com modo 'cors' primeiro
    try {
      const response = await fetch(url, {
        method: 'GET',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro Binance: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      // Se houver erro CORS, tentar retornar dados de fallback
      if (error.message && (
          error.message.includes('blocked by CORS policy') || 
          error.message.includes('Failed to fetch') ||
          error.name === 'TypeError'
      )) {
        console.warn(`Erro CORS na chamada à Binance API: ${endpoint}. Usando dados de fallback.`);
        
        // Para endpoint de preço, retornar dados de fallback
        if (endpoint === '/api/v3/ticker/price') {
          // Verificar se é uma solicitação para um símbolo específico
          if (params.symbol) {
            return { symbol: params.symbol, price: "0.00" };
          } else {
            // Dados de fallback para múltiplos símbolos
            return [];
          }
        }
        
        // Para klines (dados históricos), retornar array vazio
        if (endpoint === '/api/v3/klines') {
          return [];
        }
        
        // Para profundidade de livro de ordens
        if (endpoint === '/api/v3/depth') {
          return { lastUpdateId: 0, bids: [], asks: [] };
        }
        
        // Para estatísticas de 24h
        if (endpoint === '/api/v3/ticker/24hr') {
          return params.symbol 
            ? { symbol: params.symbol, lastPrice: "0.00", priceChange: "0.00", priceChangePercent: "0.00" }
            : [];
        }
        
        // Para outros endpoints, retornar objeto vazio
        return {};
      }
      
      // Se não for erro CORS, repassar o erro
      throw error;
    }
  } catch (error) {
    console.error('Erro na chamada pública à Binance API:', error);
    throw error;
  }
}

// Função para limpar recursos do WebSocket
function cleanupWebSocket() {
  if (priceWebSocket) {
    // Remover todos os event listeners
    priceWebSocket.onopen = null;
    priceWebSocket.onmessage = null;
    priceWebSocket.onerror = null;
    priceWebSocket.onclose = null;
    
    // Fechar a conexão se ainda não estiver fechada
    if (priceWebSocket.readyState !== WebSocket.CLOSED && priceWebSocket.readyState !== WebSocket.CLOSING) {
      priceWebSocket.close();
    }
    
    priceWebSocket = null;
  }
}

// Inicializar WebSocket para atualizações de preço em tempo real
export function initPriceWebSocket() {
  if (priceWebSocket && priceWebSocket.readyState === WebSocket.OPEN) {
    console.log('WebSocket já está conectado');
    return; // WebSocket já inicializado e conectado
  }
  
  // Limpar qualquer timeout de reconexão existente
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  try {
    // Fechar qualquer conexão existente antes de criar uma nova
    if (priceWebSocket) {
      cleanupWebSocket();
    }
    
    // Usar um try-catch para lidar com possíveis erros na criação do WebSocket
    try {
      priceWebSocket = new WebSocket('wss://stream.binance.com:9443/ws');
    } catch (error) {
      console.error('Erro ao criar WebSocket da Binance:', error);
      // Tentar reconectar após um atraso
      scheduleReconnect();
      return;
    }

    priceWebSocket.onopen = () => {
      console.log('Binance WebSocket connected');
      // Resetar contador de tentativas quando conectar com sucesso
      reconnectAttempts = 0;
      // Inscrever-se em todos os símbolos registrados
      if (symbolSubscriptions.size > 0) {
        subscribeToTickerUpdates(Array.from(symbolSubscriptions));
      }
    };

    priceWebSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Verificar se é uma resposta de ticker
        if (data && data.e === 'bookTicker') {
          const symbol = data.s;
          const price = parseFloat(data.a).toFixed(2); // Usando o preço de ask (venda)

          // Notificar todos os listeners registrados para este símbolo
          if (priceUpdateListeners.has(symbol)) {
            priceUpdateListeners.get(symbol)?.forEach(listener => {
              listener({ symbol, price: price });
            });
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    priceWebSocket.onerror = (error) => {
      console.error('Binance WebSocket error:', error);
      // Não chamar cleanupWebSocket aqui, deixar o onclose lidar com isso
    };

    priceWebSocket.onclose = (event) => {
      console.log(`Binance WebSocket closed: ${event.code} ${event.reason}`);
      cleanupWebSocket();
      
      // Tentar reconectar
      scheduleReconnect();
    };
  } catch (error) {
    console.error('Erro ao inicializar WebSocket da Binance:', error);
    scheduleReconnect();
  }
}

// Função para agendar reconexão com backoff exponencial
function scheduleReconnect() {
  // Tentar reconectar com backoff exponencial, mas apenas se não excedeu o limite
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    const delay = Math.min(5000 * Math.pow(1.5, reconnectAttempts), 30000);
    console.log(`Tentando reconectar em ${delay/1000} segundos (tentativa ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    reconnectAttempts++;
    reconnectTimeout = window.setTimeout(() => {
      initPriceWebSocket();
    }, delay);
  } else {
    console.log('Número máximo de tentativas de reconexão atingido. Desistindo.');
    // Resetar o contador após um período mais longo para permitir novas tentativas no futuro
    window.setTimeout(() => {
      reconnectAttempts = 0;
    }, 60000); // Esperar 1 minuto antes de permitir novas tentativas
  }
}

// Subscrever-se para atualizações de ticker de símbolos
function subscribeToTickerUpdates(symbols: string[]) {
  if (!priceWebSocket || priceWebSocket.readyState !== WebSocket.OPEN) {
    symbolSubscriptions = new Set([...symbolSubscriptions, ...symbols]);
    initPriceWebSocket();
    return;
  }

  const subscribeParams = symbols.map(symbol => `${symbol.toLowerCase()}@bookTicker`);
  
  const subscribeMsg = {
    method: 'SUBSCRIBE',
    params: subscribeParams,
    id: Date.now()
  };

  priceWebSocket.send(JSON.stringify(subscribeMsg));
  symbolSubscriptions = new Set([...symbolSubscriptions, ...symbols]);
}

// Cancelar subscrição de símbolos
export function unsubscribeFromTicker(symbols: string[]) {
  if (!priceWebSocket || priceWebSocket.readyState !== WebSocket.OPEN) {
    return;
  }

  const unsubscribeParams = symbols.map(symbol => `${symbol.toLowerCase()}@bookTicker`);
  
  const unsubscribeMsg = {
    method: 'UNSUBSCRIBE',
    params: unsubscribeParams,
    id: Date.now()
  };

  priceWebSocket.send(JSON.stringify(unsubscribeMsg));
  
  // Remover dos registros
  symbols.forEach(symbol => {
    symbolSubscriptions.delete(symbol);
    priceUpdateListeners.delete(symbol);
  });
}

// Registrar listener para atualizações de preço
export function onPriceUpdate(symbol: string, callback: (price: { symbol: string, price: string }) => void) {
  // Adicionar à lista de listeners
  if (!priceUpdateListeners.has(symbol)) {
    priceUpdateListeners.set(symbol, []);
  }
  priceUpdateListeners.get(symbol)?.push(callback);
  
  // Garantir que está inscrito para este símbolo
  subscribeToTickerUpdates([symbol]);
}

// ===== FUNÇÕES PÚBLICAS (Não requerem autenticação) =====

// Obter preço atual de um ou mais símbolos
export async function getLatestPrices(symbols?: string[]): Promise<{ symbol: string; price: string }[]> {
  try {
    // Validar entrada para evitar envio de [object Object]
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      console.warn('getLatestPrices: Nenhum símbolo válido fornecido');
      return [];
    }

    // Filtrar apenas símbolos válidos (strings)
    const validSymbols = symbols.filter(symbol => typeof symbol === 'string');
    
    if (validSymbols.length === 0) {
      console.warn('getLatestPrices: Nenhum símbolo válido após filtro');
      return [];
    }
    
    if (validSymbols.length === 1) {
      // Obter preço para um único símbolo
      try {
        const response = await binancePublicCall('/api/v3/ticker/price', { symbol: validSymbols[0] });
        return [response];
      } catch (error) {
        console.error(`Erro ao obter preço para ${validSymbols[0]}: ${error.message}`);
        // Retornar um objeto com preço padrão em caso de erro
        return [{ symbol: validSymbols[0], price: "0.00" }];
      }
    } else {
      // Obter preços de todos os símbolos especificados
      try {
        const response = await binancePublicCall('/api/v3/ticker/price');
        
        // Filtrar apenas os símbolos solicitados
        return response.filter((ticker: any) => validSymbols.includes(ticker.symbol));
      } catch (error) {
        console.error(`Erro ao obter múltiplos preços: ${error.message}`);
        // Retornar objetos com preços padrão em caso de erro
        return validSymbols.map(symbol => ({ symbol, price: "0.00" }));
      }
    }
  } catch (error) {
    console.error('Erro geral ao obter preços da Binance:', error);
    return symbols ? symbols.map(symbol => ({ 
      symbol: typeof symbol === 'string' ? symbol : 'desconhecido', 
      price: "0.00" 
    })) : [];
  }
}

// Obter estatísticas de preço 24h
export async function get24hStats(symbol?: string): Promise<any> {
  try {
    const params: Record<string, string> = {};
    if (symbol) {
      params.symbol = symbol;
    }
    
    return await binancePublicCall('/api/v3/ticker/24hr', params);
  } catch (error) {
    console.error('Erro ao obter estatísticas 24h da Binance:', error);
    throw error;
  }
}

// Obter histórico de preços (Klines/Candlesticks)
export async function getHistoricalKlines(
  symbol: string,
  interval: '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M',
  limit: number = 500
): Promise<any[]> {
  try {
    const params: Record<string, string> = {
      symbol,
      interval,
      limit: limit.toString()
    };
    
    return await binancePublicCall('/api/v3/klines', params);
  } catch (error) {
    console.error(`Erro ao obter klines para ${symbol}:`, error);
    throw error;
  }
}

// Obter book de ofertas (order book)
export async function getMarketDepth(symbol: string, limit: number = 100): Promise<{ lastUpdateId: number; bids: string[][]; asks: string[][] }> {
  try {
    const params: Record<string, string> = {
      symbol,
      limit: limit.toString()
    };
    
    return await binancePublicCall('/api/v3/depth', params);
  } catch (error) {
    console.error(`Erro ao obter market depth para ${symbol}:`, error);
    throw error;
  }
}

// Obter trades recentes
export async function getRecentTrades(symbol: string, limit: number = 500): Promise<any[]> {
  try {
    const params: Record<string, string> = {
      symbol,
      limit: limit.toString()
    };
    
    return await binancePublicCall('/api/v3/trades', params);
  } catch (error) {
    console.error(`Erro ao obter trades recentes para ${symbol}:`, error);
    throw error;
  }
}

// ===== FUNÇÕES AUTENTICADAS (Requerem API Key e Secret) =====

// Obter informações da conta
export async function getAccountInfo(): Promise<any> {
  try {
    return await binanceAuthenticatedCall('/api/v3/account');
  } catch (error) {
    console.error('Erro ao obter informações da conta:', error);
    throw error;
  }
}

// Obter histórico de ordens
export async function getOrderHistory(symbol: string): Promise<any[]> {
  try {
    return await binanceAuthenticatedCall('/api/v3/allOrders', 'GET', { symbol });
  } catch (error) {
    console.error(`Erro ao obter histórico de ordens para ${symbol}:`, error);
    throw error;
  }
}

// Criar uma nova ordem
export async function createOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  type: 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT',
  quantity: string,
  price?: string,
  timeInForce?: 'GTC' | 'IOC' | 'FOK'
): Promise<any> {
  try {
    const params: Record<string, string> = {
      symbol,
      side,
      type,
      quantity
    };
    
    if (type !== 'MARKET' && price) {
      params.price = price;
    }
    
    if (['LIMIT', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT_LIMIT'].includes(type) && timeInForce) {
      params.timeInForce = timeInForce || 'GTC';
    }
    
    return await binanceAuthenticatedCall('/api/v3/order', 'POST', params);
  } catch (error) {
    console.error(`Erro ao criar ordem para ${symbol}:`, error);
    throw error;
  }
}

// Verificar se um símbolo é uma criptomoeda válida para a Binance
export function isBinanceCryptoSymbol(symbol: string): boolean {
  // Validar o formato do símbolo
  // A Binance geralmente usa o formato de par de criptomoedas, como BTCUSDT, ETHUSDT, etc.
  if (!symbol) return false;
  
  // Remover o sufixo "USDT" ou "BTC" se existir
  const baseCoin = symbol.replace(/USDT$|BTC$|BUSD$|ETH$/, '');
  
  // Lista de criptomoedas conhecidas suportadas pela Binance
  const knownCryptos = [
    'BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'AVAX', 
    'MATIC', 'LINK', 'DOGE', 'ATOM', 'UNI', 'LTC', 'AAVE', 'NEAR',
    'SHIB', 'TRX', 'ETC', 'FIL', 'XLM', 'ALGO', 'VET', 'MANA', 'SAND'
  ];
  
  // Verificar se a base é uma criptomoeda conhecida
  if (knownCryptos.includes(baseCoin)) return true;
  
  // Se o símbolo é um par de moedas com USDT, BTC, BUSD ou ETH, 
  // é provável que seja um símbolo válido para a Binance
  return /^[A-Z0-9]{2,10}(USDT|BTC|BUSD|ETH)$/.test(symbol);
}

// Obter o preço atual de um símbolo na Binance
export async function getBinancePrice(symbol: string): Promise<{price: string}> {
  try {
    // Verificar se é um símbolo de criptomoeda válido para a Binance
    if (!isBinanceCryptoSymbol(symbol)) {
      console.warn(`${symbol} não parece ser um símbolo válido de criptomoeda para a Binance`);
      return { price: '0' };
    }
    
    // Adicionar USDT se for apenas o ticker da moeda
    const formattedSymbol = symbol.includes('USDT') ? symbol : `${symbol}USDT`;
    
    const response = await fetch(`${BASE_URL}/api/v3/ticker/price?symbol=${formattedSymbol}`);
    const data = await response.json();
    return { price: data.price || '0' };
  } catch (error) {
    console.error(`Erro ao obter preço da Binance para ${symbol}:`, error);
    return { price: '0' };
  }
}

// Declaração de sobrecarga para getBinanceHistoricalData
export async function getBinanceHistoricalData(
  symbol: string, 
  interval: '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M',
  days: number
): Promise<{
  prices: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
  timestamps: number[];
}>;

// Segunda sobrecarga
export async function getBinanceHistoricalData(
  symbol: string, 
  interval: string,
  limit: number
): Promise<{ 
  prices: number[]; 
  highs: number[]; 
  lows: number[]; 
  volumes: number[];
  timestamps: number[];
}>;

// Implementação única que lida com ambos os casos
export async function getBinanceHistoricalData(
  symbol: string, 
  interval: string = '1d',
  daysOrLimit: number = 30
): Promise<{ 
  prices: number[]; 
  highs: number[]; 
  lows: number[]; 
  volumes: number[];
  timestamps: number[];
}> {
  try {
    // Verificar se é um símbolo de criptomoeda válido para a Binance
    if (!isBinanceCryptoSymbol(symbol)) {
      console.warn(`${symbol} não parece ser um símbolo válido de criptomoeda para a Binance`);
      return { prices: [], highs: [], lows: [], volumes: [], timestamps: [] };
    }
    
    // Adicionar USDT se for apenas o ticker da moeda
    const formattedSymbol = symbol.includes('USDT') ? symbol : `${symbol}USDT`;
    
    // Determinar se o parâmetro é um limite ou número de dias
    let params: Record<string, string> = {
      symbol: formattedSymbol,
      interval
    };
    
    if (typeof daysOrLimit === 'number') {
      if (daysOrLimit <= 1000) {
        // Tratar como limite
        params.limit = daysOrLimit.toString();
      } else {
        // Tratar como dias (convertendo para milissegundos)
        const endTime = Date.now();
        const startTime = endTime - (daysOrLimit * 24 * 60 * 60 * 1000);
        
        params.startTime = startTime.toString();
        params.endTime = endTime.toString();
      }
    }
    
    // Fazer a requisição à API da Binance
    const klines = await binancePublicCall('/api/v3/klines', params);
    
    // Processa os dados
    const prices: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const volumes: number[] = [];
    const timestamps: number[] = [];
    
    if (Array.isArray(klines)) {
      klines.forEach(kline => {
        timestamps.push(kline[0]); // Open time
        prices.push(parseFloat(kline[4])); // Close price
        highs.push(parseFloat(kline[2])); // High price
        lows.push(parseFloat(kline[3])); // Low price
        volumes.push(parseFloat(kline[5])); // Volume
      });
    }
    
    return { prices, highs, lows, volumes, timestamps };
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return { prices: [], highs: [], lows: [], volumes: [], timestamps: [] };
  }
}

// Função para obter informações da conta (autenticada)
export async function getBinanceAccountInfo() {
  try {
    return await binanceAuthenticatedCall('/api/v3/account', 'GET');
  } catch (error) {
    console.error('Erro ao buscar informações da conta:', error);
    throw error;
  }
}

// Função para obter histórico de trades (autenticada)
export async function getBinanceMyTrades(symbol: string) {
  try {
    return await binanceAuthenticatedCall('/api/v3/myTrades', 'GET', { symbol });
  } catch (error) {
    console.error(`Erro ao buscar trades para ${symbol}:`, error);
    throw error;
  }
}

// Função para obter ordens abertas (autenticada)
export async function getBinanceOpenOrders() {
  try {
    return await binanceAuthenticatedCall('/api/v3/openOrders', 'GET');
  } catch (error) {
    console.error('Erro ao buscar ordens abertas:', error);
    throw error;
  }
}

// Função para obter dados de ordem livro de ofertas
export async function getBinanceOrderBook(symbol: string, limit: number = 100) {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Erro ao buscar livro de ofertas para ${symbol}:`, error);
    throw error;
  }
}

// Função para obter todas as moedas disponíveis e suas informações
export async function getBinanceAllCoins() {
  try {
    return await binanceAuthenticatedCall('/sapi/v1/capital/config/getall', 'GET');
  } catch (error) {
    console.error('Erro ao buscar todas as moedas:', error);
    throw error;
  }
}

// Função para obter dados de volume de negociação de um símbolo
export async function getBinanceTradeVolume(symbol: string) {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Erro ao buscar volume de negociação para ${symbol}:`, error);
    throw error;
  }
}

// Exportar WebSocket
export { subscribeToTickerUpdates }; 
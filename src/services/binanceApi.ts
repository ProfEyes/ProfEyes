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
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro Binance: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
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
    if (symbols && symbols.length === 1) {
      // Obter preço para um único símbolo
      const response = await binancePublicCall('/api/v3/ticker/price', { symbol: symbols[0] });
      return [response];
    } else {
      // Obter preços de todos os símbolos ou dos símbolos especificados
      const response = await binancePublicCall('/api/v3/ticker/price');
      
      if (symbols && symbols.length > 0) {
        // Filtrar apenas os símbolos solicitados
        return response.filter((ticker: any) => symbols.includes(ticker.symbol));
      }
      
      return response;
    }
  } catch (error) {
    console.error('Erro ao obter preços da Binance:', error);
    throw error;
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

// Função legacy (compatibilidade) para obter o preço atual
export async function getBinancePrice(symbol: string): Promise<{price: string}> {
  try {
    const prices = await getLatestPrices([symbol]);
    if (prices && prices.length > 0) {
      return {price: prices[0].price};
    }
    throw new Error(`Nenhum preço encontrado para ${symbol}`);
  } catch (error) {
    console.error(`Erro ao obter preço para ${symbol}:`, error);
    throw error;
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
    let limit = daysOrLimit;
    const isDaysParameter = typeof arguments[2] === 'number' && arguments.length === 3 && typeof arguments[1] === 'string' && 
      ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'].includes(arguments[1]);
      
    // Se estamos usando a primeira sobrecarga (com days)
    if (isDaysParameter) {
      const days = daysOrLimit;
      // Ajustar limite com base no intervalo
      if (interval === '1m') limit = days * 1440; // 1440 minutos em um dia
      else if (interval === '3m') limit = days * 480;
      else if (interval === '5m') limit = days * 288;
      else if (interval === '15m') limit = days * 96;
      else if (interval === '30m') limit = days * 48;
      else if (interval === '1h') limit = days * 24;
      else if (interval === '2h') limit = days * 12;
      else if (interval === '4h') limit = days * 6;
      
      // Limitar a 1000 registros (limite da API Binance)
      limit = Math.min(limit, 1000);
    }
    
    // Mapear intervalo para formato aceito pela API se for uma string não padrão
    let apiInterval = interval;
    if (!['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'].includes(interval)) {
      // Mapeamento básico de intervalos comuns
      if (interval === 'daily') apiInterval = '1d';
      else if (interval === 'hourly') apiInterval = '1h';
      else if (interval === 'weekly') apiInterval = '1w';
      else apiInterval = '1d'; // Default para diário
    }
    
    // Busca os klines
    const klines = await getHistoricalKlines(symbol, apiInterval as any, limit);
    
    // Processa os dados
    const prices: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const volumes: number[] = [];
    const timestamps: number[] = [];
    
    klines.forEach(kline => {
      timestamps.push(kline[0]); // Open time
      prices.push(parseFloat(kline[4])); // Close price
      highs.push(parseFloat(kline[2])); // High price
      lows.push(parseFloat(kline[3])); // Low price
      volumes.push(parseFloat(kline[5])); // Volume
    });
    
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
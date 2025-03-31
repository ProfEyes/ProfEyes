/**
 * Módulo para integração com a API do Bitstamp
 */

import axios from 'axios';

// URL base da API do Bitstamp
const BITSTAMP_API_BASE_URL = 'https://www.bitstamp.net/api/v2';

// Mapeamento de símbolos da Binance para o formato do Bitstamp
const symbolMapper: Record<string, string> = {
  'BTCUSDT': 'btcusd',
  'ETHUSDT': 'ethusd',
  'XRPUSDT': 'xrpusd',
  'LTCUSDT': 'ltcusd',
  'LINKUSDT': 'linkusd',
  'UNIUSDT': 'uniusd',
  'AAVEUSDT': 'aaveusd',
  'DOGEUSDT': 'dogeusd',
  'SOLUSDT': 'solusd',
  'MATICUSDT': 'maticusd',
};

/**
 * Interface para o objeto de retorno de preço
 */
interface BitstampTickerResponse {
  last: string;
  high: string;
  low: string;
  bid: string;
  ask: string;
  volume: string;
  timestamp: string;
  open: string;
  vwap: string;
  price_change: string;
  percent_change_24: string;
}

/**
 * Converter símbolo da Binance para o formato do Bitstamp
 * @param binanceSymbol - Símbolo no formato da Binance (ex: "BTCUSDT")
 * @returns Símbolo no formato do Bitstamp (ex: "btcusd")
 */
export function convertToBitstampSymbol(binanceSymbol: string): string {
  return symbolMapper[binanceSymbol] || binanceSymbol.toLowerCase().replace('usdt', 'usd');
}

/**
 * Obter preço atual de um par de criptomoedas no Bitstamp
 * @param symbol - Símbolo no formato da Binance (ex: "BTCUSDT")
 * @returns Objeto com dados de preço e variação
 */
export async function getBitstampPrice(symbol: string): Promise<{
  price: string;
  change: string;
  changePercent: string;
  source: 'bitstamp';
}> {
  try {
    // Converter para o formato do Bitstamp
    const bitstampSymbol = convertToBitstampSymbol(symbol);
    
    // Fazer a requisição à API
    const response = await axios.get<BitstampTickerResponse>(
      `${BITSTAMP_API_BASE_URL}/ticker/${bitstampSymbol}/`
    );
    
    // Extrair dados relevantes
    const { last, price_change, percent_change_24 } = response.data;
    
    return {
      price: last,
      change: price_change || '0',
      changePercent: percent_change_24 || '0',
      source: 'bitstamp'
    };
  } catch (error) {
    console.error(`Erro ao buscar preço de ${symbol} no Bitstamp:`, error);
    throw error;
  }
}

/**
 * Obter dados de OHLCV (Open, High, Low, Close, Volume) históricos
 * @param symbol - Símbolo no formato da Binance
 * @param timeframe - Timeframe (1m, 15m, 1h, 1d, etc.)
 * @param limit - Limite de registros a retornar
 * @returns Array com dados OHLCV
 */
export async function getBitstampHistoricalData(
  symbol: string,
  timeframe: '1m' | '15m' | '1h' | '4h' | '1d' = '1d',
  limit: number = 100
): Promise<any[]> {
  try {
    // Converter para o formato do Bitstamp
    const bitstampSymbol = convertToBitstampSymbol(symbol);
    
    // Converter timeframe para o formato do Bitstamp
    const step = timeframeToStep(timeframe);
    
    // Fazer a requisição à API
    const response = await axios.get(
      `${BITSTAMP_API_BASE_URL}/ohlc/${bitstampSymbol}/`,
      {
        params: {
          step,
          limit
        }
      }
    );
    
    // Verificar se temos dados
    if (response.data && response.data.data && response.data.data.ohlc) {
      return response.data.data.ohlc;
    }
    
    return [];
  } catch (error) {
    console.error(`Erro ao buscar dados históricos de ${symbol} no Bitstamp:`, error);
    return [];
  }
}

/**
 * Converter timeframe para o formato aceito pela API do Bitstamp
 * @param timeframe - Timeframe no formato comum (1m, 15m, 1h, 1d)
 * @returns Valor de step para a API do Bitstamp
 */
function timeframeToStep(timeframe: string): number {
  switch (timeframe) {
    case '1m':
      return 60;
    case '3m':
      return 180;
    case '5m':
      return 300;
    case '15m':
      return 900;
    case '30m':
      return 1800;
    case '1h':
      return 3600;
    case '2h':
      return 7200;
    case '4h':
      return 14400;
    case '6h':
      return 21600;
    case '12h':
      return 43200;
    case '1d':
      return 86400;
    case '3d':
      return 259200;
    case '1w':
      return 604800;
    default:
      return 86400; // 1d por padrão
  }
} 
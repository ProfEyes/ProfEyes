/**
 * Módulo para integração com a API do CoinGecko
 */

import axios from 'axios';

// URL base da API CoinGecko
const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3';

// Mapeamento de símbolos Binance para IDs do CoinGecko
const symbolToId: Record<string, string> = {
  'BTCUSDT': 'bitcoin',
  'ETHUSDT': 'ethereum',
  'BNBUSDT': 'binancecoin',
  'SOLUSDT': 'solana',
  'ADAUSDT': 'cardano',
  'XRPUSDT': 'ripple',
  'DOGEUSDT': 'dogecoin',
  'DOTUSDT': 'polkadot',
  'MATICUSDT': 'matic-network',
  'AVAXUSDT': 'avalanche-2',
  'LINKUSDT': 'chainlink',
  'LTCUSDT': 'litecoin',
  'UNIUSDT': 'uniswap',
  'AAVEUSDT': 'aave',
  'ATOMUSDT': 'cosmos',
  'NEARUSDT': 'near'
};

/**
 * Obter capitalização de mercado do Bitcoin
 * @returns Capitalização de mercado formatada ou undefined em caso de erro
 */
export async function getBtcMarketCap(): Promise<string | undefined> {
  try {
    const response = await axios.get(`${COINGECKO_API_BASE_URL}/coins/bitcoin`);
    
    if (response.data && response.data.market_data && response.data.market_data.market_cap) {
      const marketCapUsd = response.data.market_data.market_cap.usd;
      
      // Formatar para exibição (ex: $1.23T ou $123.45B)
      if (marketCapUsd >= 1e12) {
        return `$${(marketCapUsd / 1e12).toFixed(2)}T`;
      } else if (marketCapUsd >= 1e9) {
        return `$${(marketCapUsd / 1e9).toFixed(2)}B`;
      } else if (marketCapUsd >= 1e6) {
        return `$${(marketCapUsd / 1e6).toFixed(2)}M`;
      } else {
        return `$${marketCapUsd.toLocaleString()}`;
      }
    }
    
    return undefined;
  } catch (error) {
    console.error('Erro ao buscar capitalização de mercado do Bitcoin:', error);
    return undefined;
  }
}

/**
 * Obter capitalização de mercado de uma criptomoeda específica
 * @param symbol - Símbolo da criptomoeda no formato Binance (ex: "BTCUSDT")
 * @returns Capitalização de mercado formatada ou undefined em caso de erro
 */
export async function getMarketCap(symbol: string): Promise<string | undefined> {
  try {
    // Converter símbolo Binance para ID do CoinGecko
    const coinId = symbolToId[symbol];
    
    if (!coinId) {
      console.warn(`Símbolo não mapeado: ${symbol}`);
      return undefined;
    }
    
    const response = await axios.get(`${COINGECKO_API_BASE_URL}/coins/${coinId}`);
    
    if (response.data && response.data.market_data && response.data.market_data.market_cap) {
      const marketCapUsd = response.data.market_data.market_cap.usd;
      
      // Formatar para exibição (ex: $1.23T ou $123.45B)
      if (marketCapUsd >= 1e12) {
        return `$${(marketCapUsd / 1e12).toFixed(2)}T`;
      } else if (marketCapUsd >= 1e9) {
        return `$${(marketCapUsd / 1e9).toFixed(2)}B`;
      } else if (marketCapUsd >= 1e6) {
        return `$${(marketCapUsd / 1e6).toFixed(2)}M`;
      } else {
        return `$${marketCapUsd.toLocaleString()}`;
      }
    }
    
    return undefined;
  } catch (error) {
    console.error(`Erro ao buscar capitalização de mercado de ${symbol}:`, error);
    return undefined;
  }
}

/**
 * Obter dados de mercado completos de uma criptomoeda
 * @param symbol - Símbolo da criptomoeda no formato Binance
 * @returns Objeto com dados de mercado ou undefined em caso de erro
 */
export async function getCoinMarketData(symbol: string): Promise<any | undefined> {
  try {
    // Converter símbolo Binance para ID do CoinGecko
    const coinId = symbolToId[symbol];
    
    if (!coinId) {
      console.warn(`Símbolo não mapeado: ${symbol}`);
      return undefined;
    }
    
    const response = await axios.get(
      `${COINGECKO_API_BASE_URL}/coins/${coinId}`,
      {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        }
      }
    );
    
    if (response.data && response.data.market_data) {
      return response.data.market_data;
    }
    
    return undefined;
  } catch (error) {
    console.error(`Erro ao buscar dados de mercado de ${symbol}:`, error);
    return undefined;
  }
} 
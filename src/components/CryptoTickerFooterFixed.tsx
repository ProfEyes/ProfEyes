import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

// Interface para dados do banco de dados
interface CryptoPriceDB {
  id: string;
  coin_id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  market_cap: number | null;
  total_volume: number | null;
  high_24h: number | null;
  low_24h: number | null;
  circulating_supply: number | null;
  last_updated: string;
}

interface CryptoPrice {
  symbol: string;
  price: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  lastUpdate?: number;
  increasing?: boolean;
  ticker?: string;
}

// Mapeamento de símbolos de criptomoedas para caminhos de imagens
const cryptoImageMap: Record<string, string> = {
  'BTC': '/Imagens das Criptomoedas/Bitcoin.svg.png',
  'ETH': '/Imagens das Criptomoedas/ETHEREUM-removebg-preview.png',
  'BNB': '/Imagens das Criptomoedas/65847d5cdc48ee90fbb44d28_620b31921bac94c44de5969d_bnb.webp',
  'SOL': '/Imagens das Criptomoedas/Solana_logo.png',
  'XRP': '/Imagens das Criptomoedas/xrp logo.png',
  'ADA': '/Imagens das Criptomoedas/ADA LOGO.png',
  'DOGE': '/Imagens das Criptomoedas/Dogecoin logo.png',
  'DOT': '/Imagens das Criptomoedas/android-chrome-512x512.png',
  'LINK': '/Imagens das Criptomoedas/Link png logo.png',
  'AVAX': '/Imagens das Criptomoedas/avax png logo.png',
  'MATIC': '/Imagens das Criptomoedas/Matic logo Cripto.png',
  'LTC': '/Imagens das Criptomoedas/Litecoin (LTC).png',
  'UNI': '/Imagens das Criptomoedas/Uni Png Cripto.webp',
  'ATOM': '/Imagens das Criptomoedas/Atom png.png',
  'ICP': '/Imagens das Criptomoedas/Icp png logo Cripto.png',
  'AAVE': '/Imagens das Criptomoedas/AAVE PNG CRIPTO.webp',
  'FIL': '/Imagens das Criptomoedas/dff7764bc47d4467874fce8f3670d206.png',
  'EOS': '/Imagens das Criptomoedas/EOS-Crypto-Logo-PNG-Images.png',
  'AXS': '/Imagens das Criptomoedas/axie-infinity-axs-logo.png',
  'NEAR': '/Imagens das Criptomoedas/NEAR-Protocol-Crypto-Logo.png'
};

const getCryptoImagePath = (symbol: string): string => {
  let ticker = getSymbolName(symbol);
  if (symbol === 'BTCUSDT') ticker = 'BTC';
  if (symbol === 'BNBUSDT') ticker = 'BNB';
  return cryptoImageMap[ticker] || '';
};

// Mapeamento de coin_id do banco para símbolos USDT
const coinIdToSymbolMap: Record<string, string> = {
  bitcoin: 'BTCUSDT',
  ethereum: 'ETHUSDT',
  binancecoin: 'BNBUSDT',
  solana: 'SOLUSDT',
  ripple: 'XRPUSDT',
  cardano: 'ADAUSDT',
  dogecoin: 'DOGEUSDT',
  polkadot: 'DOTUSDT',
  chainlink: 'LINKUSDT',
  'avalanche-2': 'AVAXUSDT',
  litecoin: 'LTCUSDT',
  uniswap: 'UNIUSDT',
  cosmos: 'ATOMUSDT',
  'internet-computer': 'ICPUSDT',
  aave: 'AAVEUSDT',
  filecoin: 'FILUSDT',
  eos: 'EOSUSDT',
  'axie-infinity': 'AXSUSDT',
  near: 'NEARUSDT'
};

const formatPrice = (price: string | number) => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (num > 1000) return `$${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (num > 1) return `$${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  if (num > 0.01) return `$${num.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
  return `$${num.toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`;
};

const formatPercent = (percent: string) => {
  const num = parseFloat(percent || '0');
  const formatted = Math.abs(num).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${num >= 0 ? '+' : '-'}${formatted}%`;
};

const formatVolume = (volume: string) => {
  const num = parseFloat(volume || '0');
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  if (num >= 1_000) return `${(num / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}K`;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getSymbolName = (symbol: string) => {
  if (symbol === 'BTCUSDT') return 'BTC';
  if (symbol === 'BNBUSDT') return 'BNB';
  return symbol.replace(/USDT$|BTC$|BUSD$|USDC$|BNB$/g, '');
};

const CryptoTickerFooterFixed: React.FC = () => {
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tickerRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);

  const fetchCryptoPrices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = getSupabase();
      // Buscando preços (silenciado)

      // Buscar do banco de dados (já atualizado a cada 15min via cron)
      const { data, error: dbError } = await supabase
        .from('crypto_prices')
        .select('*')
        .order('total_volume', { ascending: false });

      if (dbError) {
        throw new Error(`Erro ao buscar do banco: ${dbError.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('Nenhuma criptomoeda encontrada no banco');
      }

      // Criptomoedas recebidas

      // Mapear dados do banco para o formato do componente
      const mapped: CryptoPrice[] = data.map((coin: CryptoPriceDB) => ({
        symbol: coinIdToSymbolMap[coin.coin_id] || coin.symbol + 'USDT',
        ticker: coin.symbol,
        price: coin.current_price.toString(),
        priceChangePercent: (coin.price_change_percentage_24h || 0).toString(),
        highPrice: (coin.high_24h || 0).toString(),
        lowPrice: (coin.low_24h || 0).toString(),
        volume: (coin.total_volume || 0).toString(),
        quoteVolume: (coin.total_volume || 0).toString(),
        lastUpdate: new Date(coin.last_updated).getTime(),
        increasing: (coin.price_change_percentage_24h || 0) >= 0
      }));

      setCryptoPrices(mapped);
      // Preços atualizados
    } catch (err: unknown) {
      console.error('❌ [Footer] Erro ao buscar preços:', err instanceof Error ? err.message : String(err));
      setError('Falha ao carregar dados de criptomoedas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabase();

    // Buscar dados iniciais
    if (mounted) {
      fetchCryptoPrices();
    }

    // Inscrever no Realtime para atualização automática
    // Conectando ao Realtime (silenciado)
    const channel = supabase
      .channel('crypto-prices-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'crypto_prices'
        },
        (payload) => {
          // Preços atualizados via Realtime
          // Recarregar todos os preços quando houver mudança
          if (mounted) {
            fetchCryptoPrices();
          }
        }
      )
      .subscribe();

    // ✅ LISTENER: Forçar atualização quando voltar do background
    const handleForceUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const timeInBackground = customEvent.detail?.timeInBackground || 0;
      // VOLTOU DO BACKGROUND (silenciado)
      if (mounted) {
        fetchCryptoPrices();
      }
    };

    const handleForceRefresh = () => {
      // Force refresh solicitado (silenciado)
      if (mounted) {
        fetchCryptoPrices();
      }
    };

    window.addEventListener('force-update-after-background', handleForceUpdate);
    window.addEventListener('force-refresh-signals', handleForceRefresh);

    return () => {
      mounted = false;
      // Desconectando do Realtime
      supabase.removeChannel(channel);
      window.removeEventListener('force-update-after-background', handleForceUpdate);
      window.removeEventListener('force-refresh-signals', handleForceRefresh);
    };
  }, [fetchCryptoPrices]);

  const renderTickerItem = (crypto: CryptoPrice, key: string) => {
    const ticker = crypto.ticker || getSymbolName(crypto.symbol);
    const imagePath = getCryptoImagePath(crypto.symbol);

    return (
      <div key={key} className="ticker-item inline-flex items-center mx-6">
        <div className={`flex items-center ${'mr-2'} ${'min-w-[80px]'}`}>
          {imagePath && (
            <img
              src={imagePath}
              alt={ticker}
              className="w-6 h-6 mr-2 object-contain flex-shrink-0"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                console.error(`Erro ao carregar imagem para ${ticker}: ${imagePath}`);
              }}
            />
          )}
          <span className="font-medium text-white truncate">{ticker}</span>
        </div>
        <div className="flex items-center">
          <span className={`text-sm font-medium price-element text-right ${crypto.increasing ? 'text-green-400' : 'text-red-400'}`} data-symbol={crypto.symbol} style={{ width: '68px' }}>
            {formatPrice(crypto.price)}
          </span>
          <div className={`flex items-center ${parseFloat(crypto.priceChangePercent || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`} style={{ width: '55px', marginLeft: '9px' }}>
            <span className="arrow-element flex-shrink-0" data-symbol={crypto.symbol}>
              {parseFloat(crypto.priceChangePercent || '0') >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />
              )}
            </span>
            <span className="text-xs font-medium percent-element" data-symbol={crypto.symbol}>{formatPercent(crypto.priceChangePercent)}</span>
          </div>
          <span className="text-white/40 text-xs" style={{ width: '52px', marginLeft: '20px' }}>Vol: {formatVolume(crypto.quoteVolume)}</span>
        </div>
      </div>
    );
  };

  if (isLoading && cryptoPrices.length === 0) {
    return (<div className="fixed bottom-0 left-0 right-0 h-12 bg-black/60 backdrop-blur-md border-t border-white/10 flex items-center justify-center text-white/70 text-sm">Carregando dados de criptomoedas...</div>);
  }

  if (error && cryptoPrices.length === 0) {
    return (<div className="fixed bottom-0 left-0 right-0 h-12 bg-black/60 backdrop-blur-md border-t border-white/10 flex items-center justify-center text-white/70 text-sm"><div className="flex items-center gap-2"><div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>{error}</div></div>);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-black/60 backdrop-blur-md border-t border-white/10 overflow-hidden z-50">
      <div className="flex items-center h-full">
        <div className="overflow-hidden flex-1 relative" ref={tickerRef}>
          <div className="ticker-wrapper" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div className={`ticker-content ${paused ? 'paused' : ''}`}>
              {cryptoPrices.map((crypto, index) => renderTickerItem(crypto, `first-${crypto.symbol}-${index}`))}
              {cryptoPrices.map((crypto, index) => renderTickerItem(crypto, `second-${crypto.symbol}-${index}`))}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .ticker-wrapper { overflow: hidden; white-space: nowrap; width: 100%; height: 100%; position: relative; }
        .ticker-content { display: inline-block; white-space: nowrap; animation: ticker-scroll 120s linear infinite; animation-play-state: running; }
        .ticker-content.paused { animation-play-state: paused; }
        .ticker-wrapper:hover .ticker-content { animation-play-state: paused; }

        /* Espaçamento uniforme entre itens */
        .ticker-item { display: inline-flex; align-items: center; height: 100%; vertical-align: middle; position: relative; padding: 0 18px; transform: translateZ(0); }

        /* Garantir que imagens e textos mantenham distância consistente */
        .ticker-item img { width: 24px; height: 24px; margin-right: 8px; object-fit: contain; }
        .ticker-item .font-medium { margin-right: 6px; }

        @keyframes ticker-scroll { 0% { transform: translate3d(0,0,0); } 100% { transform: translate3d(-50%,0,0); } }
      `}</style>
    </div>
  );
};

export default CryptoTickerFooterFixed;



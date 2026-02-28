-- ============================================================================
-- Migration: Centralized Crypto Prices System
-- Created: 2026-01-22
-- Description: 
--   Sistema centralizado de preços de criptomoedas para economizar API
--   - 1 requisição para TODOS os usuários (ao invés de 1 por usuário)
--   - Atualização automática a cada 15 minutos via pg_cron
--   - Suporte ao Realtime para sincronização instantânea no frontend
-- ============================================================================

-- 1. CRIAR tabela crypto_prices
CREATE TABLE IF NOT EXISTS public.crypto_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_id TEXT NOT NULL UNIQUE, -- bitcoin, ethereum, etc
  symbol TEXT NOT NULL, -- BTC, ETH, etc
  name TEXT NOT NULL, -- Bitcoin, Ethereum, etc
  current_price NUMERIC(20, 8) NOT NULL,
  price_change_24h NUMERIC(20, 8),
  price_change_percentage_24h NUMERIC(10, 4),
  market_cap NUMERIC(30, 2),
  total_volume NUMERIC(30, 2),
  high_24h NUMERIC(20, 8),
  low_24h NUMERIC(20, 8),
  circulating_supply NUMERIC(30, 2),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CRIAR índices para performance
CREATE INDEX IF NOT EXISTS idx_crypto_prices_coin_id ON public.crypto_prices(coin_id);
CREATE INDEX IF NOT EXISTS idx_crypto_prices_symbol ON public.crypto_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_prices_last_updated ON public.crypto_prices(last_updated DESC);

-- 3. HABILITAR RLS
ALTER TABLE public.crypto_prices ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR política de leitura pública (qualquer usuário autenticado pode ler)
CREATE POLICY "Permitir leitura pública de crypto_prices"
  ON public.crypto_prices
  FOR SELECT
  USING (true);

-- 5. CRIAR função para atualizar preços via CoinGecko API
CREATE OR REPLACE FUNCTION public.update_crypto_prices()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_response JSONB;
  v_coin JSONB;
  v_count INTEGER := 0;
  v_api_url TEXT;
BEGIN
  -- API CoinGecko (gratuita, sem chave necessária)
  v_api_url := 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,binancecoin,solana,ripple,cardano,dogecoin,polkadot,chainlink,avalanche-2,litecoin,uniswap,cosmos,internet-computer,aave,filecoin,eos,axie-infinity,near&order=market_cap_desc&per_page=20&page=1&sparkline=false';
  
  BEGIN
    -- Fazer requisição HTTP
    SELECT content::jsonb INTO v_response
    FROM http_get(v_api_url);
    
    -- Verificar se recebemos array
    IF v_response IS NULL OR jsonb_typeof(v_response) != 'array' THEN
      RAISE WARNING 'CoinGecko API retornou resposta inválida';
      RETURN 'ERROR: Resposta inválida da API';
    END IF;
    
    -- Iterar sobre cada criptomoeda
    FOR v_coin IN SELECT * FROM jsonb_array_elements(v_response)
    LOOP
      -- Inserir ou atualizar preço
      INSERT INTO public.crypto_prices (
        coin_id,
        symbol,
        name,
        current_price,
        price_change_24h,
        price_change_percentage_24h,
        market_cap,
        total_volume,
        high_24h,
        low_24h,
        circulating_supply,
        last_updated
      ) VALUES (
        v_coin->>'id',
        UPPER(v_coin->>'symbol'),
        v_coin->>'name',
        (v_coin->>'current_price')::NUMERIC,
        (v_coin->>'price_change_24h')::NUMERIC,
        (v_coin->>'price_change_percentage_24h')::NUMERIC,
        (v_coin->>'market_cap')::NUMERIC,
        (v_coin->>'total_volume')::NUMERIC,
        (v_coin->>'high_24h')::NUMERIC,
        (v_coin->>'low_24h')::NUMERIC,
        (v_coin->>'circulating_supply')::NUMERIC,
        NOW()
      )
      ON CONFLICT (coin_id) DO UPDATE SET
        symbol = EXCLUDED.symbol,
        name = EXCLUDED.name,
        current_price = EXCLUDED.current_price,
        price_change_24h = EXCLUDED.price_change_24h,
        price_change_percentage_24h = EXCLUDED.price_change_percentage_24h,
        market_cap = EXCLUDED.market_cap,
        total_volume = EXCLUDED.total_volume,
        high_24h = EXCLUDED.high_24h,
        low_24h = EXCLUDED.low_24h,
        circulating_supply = EXCLUDED.circulating_supply,
        last_updated = NOW();
      
      v_count := v_count + 1;
    END LOOP;
    
    RETURN FORMAT('SUCCESS: %s criptomoedas atualizadas em %s', 
                  v_count, 
                  NOW()::TEXT);
                  
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro ao atualizar crypto_prices: %', SQLERRM;
    RETURN FORMAT('ERROR: %s', SQLERRM);
  END;
END;
$$;

-- 6. CRIAR extensão http se não existir (para fazer requisições HTTP)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 7. CRIAR cron job para atualizar preços a cada 15 minutos
SELECT cron.schedule(
  'update-crypto-prices-15min',  -- Nome do job
  '*/15 * * * *',                -- A cada 15 minutos
  'SELECT public.update_crypto_prices()'
);

-- 8. EXECUTAR primeira atualização AGORA
SELECT public.update_crypto_prices();

-- 9. COMENTÁRIOS
COMMENT ON TABLE public.crypto_prices IS 
'Preços centralizados de criptomoedas, atualizados a cada 15 minutos via pg_cron.
Economiza requisições à API CoinGecko (1 requisição para TODOS os usuários).';

COMMENT ON FUNCTION public.update_crypto_prices() IS 
'Atualiza preços de criptomoedas via CoinGecko API.
Executado automaticamente a cada 15 minutos via cron job "update-crypto-prices-15min".';

-- 10. HABILITAR Realtime para sincronização instantânea no frontend
ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_prices;

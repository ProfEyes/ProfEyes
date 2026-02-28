-- Script para popular ativos e horários de trading
-- Criado em: 2026-01-10

-- Obter IDs das categorias
DO $$
DECLARE
  cat_acoes UUID;
  cat_forex UUID;
  cat_cripto UUID;
  cat_commodities UUID;
  cat_indices UUID;
BEGIN
  -- Buscar IDs das categorias
  SELECT id INTO cat_acoes FROM public.asset_categories WHERE name = 'Ações';
  SELECT id INTO cat_forex FROM public.asset_categories WHERE name = 'Forex';
  SELECT id INTO cat_cripto FROM public.asset_categories WHERE name = 'Cripto';
  SELECT id INTO cat_commodities FROM public.asset_categories WHERE name = 'Commodities';
  SELECT id INTO cat_indices FROM public.asset_categories WHERE name = 'Índices';

  -- ========== AÇÕES ==========
  -- AIG
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('AIG', 'AIG', cat_acoes, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 5, 0 FROM public.trading_assets WHERE symbol = 'AIG';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 6, 10, 23, 59 FROM public.trading_assets WHERE symbol = 'AIG';

  -- Alibaba Group Holding
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Alibaba Group Holding', 'Alibaba Group Holding', cat_acoes, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 5, 0 FROM public.trading_assets WHERE symbol = 'Alibaba Group Holding';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 6, 10, 23, 59 FROM public.trading_assets WHERE symbol = 'Alibaba Group Holding';

  -- Amazon
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Amazon', 'Amazon', cat_acoes, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 15, 30 FROM public.trading_assets WHERE symbol = 'Amazon';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 16, 0, 23, 59 FROM public.trading_assets WHERE symbol = 'Amazon';

  -- Apple
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Apple', 'Apple', cat_acoes, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 15, 30 FROM public.trading_assets WHERE symbol = 'Apple';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 16, 0, 23, 59 FROM public.trading_assets WHERE symbol = 'Apple';

  -- Tesla
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Tesla', 'Tesla', cat_acoes, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 15, 30 FROM public.trading_assets WHERE symbol = 'Tesla';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 16, 0, 23, 59 FROM public.trading_assets WHERE symbol = 'Tesla';

  -- Meta
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Meta', 'Meta', cat_acoes, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 15, 30 FROM public.trading_assets WHERE symbol = 'Meta';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 16, 35, 23, 59 FROM public.trading_assets WHERE symbol = 'Meta';

  -- Google
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Google', 'Google', cat_acoes, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 15, 30 FROM public.trading_assets WHERE symbol = 'Google';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 16, 35, 23, 59 FROM public.trading_assets WHERE symbol = 'Google';

  -- Microsoft Corporation
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Microsoft Corporation', 'Microsoft Corporation', cat_acoes, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 5, 0 FROM public.trading_assets WHERE symbol = 'Microsoft Corporation';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 5, 30, 23, 59 FROM public.trading_assets WHERE symbol = 'Microsoft Corporation';

  -- ========== CRIPTOMOEDAS ==========
  -- Bitcoin
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Bitcoin', 'Bitcoin', cat_cripto, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 12, 0 FROM public.trading_assets WHERE symbol = 'Bitcoin';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 12, 30, 23, 59 FROM public.trading_assets WHERE symbol = 'Bitcoin';

  -- Ethereum
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Ethereum', 'Ethereum', cat_cripto, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 12, 0 FROM public.trading_assets WHERE symbol = 'Ethereum';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 13, 10, 23, 59 FROM public.trading_assets WHERE symbol = 'Ethereum';

  -- Solana
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Solana', 'Solana', cat_cripto, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 12, 0 FROM public.trading_assets WHERE symbol = 'Solana';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 12, 30, 23, 59 FROM public.trading_assets WHERE symbol = 'Solana';

  -- Cardano
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Cardano', 'Cardano', cat_cripto, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 17, 45 FROM public.trading_assets WHERE symbol = 'Cardano';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 18, 15, 23, 59 FROM public.trading_assets WHERE symbol = 'Cardano';

  -- Polkadot
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Polkadot', 'Polkadot', cat_cripto, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 17, 45 FROM public.trading_assets WHERE symbol = 'Polkadot';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 18, 15, 23, 59 FROM public.trading_assets WHERE symbol = 'Polkadot';

  -- Ripple
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Ripple', 'Ripple', cat_cripto, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 12, 0 FROM public.trading_assets WHERE symbol = 'Ripple';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 12, 30, 23, 59 FROM public.trading_assets WHERE symbol = 'Ripple';

  -- ========== FOREX (OTC - 24/7) ==========
  -- Pares principais
  INSERT INTO public.trading_assets (symbol, display_name, category_id, is_otc, available_24_7)
  VALUES 
    ('EUR/USD (OTC)', 'EUR/USD (OTC)', cat_forex, TRUE, TRUE),
    ('GBP/USD (OTC)', 'GBP/USD (OTC)', cat_forex, TRUE, TRUE),
    ('USD/JPY (OTC)', 'USD/JPY (OTC)', cat_forex, TRUE, TRUE),
    ('AUD/USD (OTC)', 'AUD/USD (OTC)', cat_forex, TRUE, TRUE),
    ('USD/CAD (OTC)', 'USD/CAD (OTC)', cat_forex, TRUE, TRUE),
    ('USD/CHF (OTC)', 'USD/CHF (OTC)', cat_forex, TRUE, TRUE),
    ('AUD/CHF', 'AUD/CHF', cat_forex, FALSE, TRUE),
    ('EUR/GBP', 'EUR/GBP', cat_forex, FALSE, TRUE),
    ('GBP/JPY', 'GBP/JPY', cat_forex, FALSE, TRUE);

  -- ========== COMMODITIES ==========
  -- Gold
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Gold', 'Gold', cat_commodities, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 6, 0 FROM public.trading_assets WHERE symbol = 'Gold';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 7, 5, 23, 59 FROM public.trading_assets WHERE symbol = 'Gold';

  -- Silver
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Silver', 'Silver', cat_commodities, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 6, 0 FROM public.trading_assets WHERE symbol = 'Silver';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 7, 5, 23, 59 FROM public.trading_assets WHERE symbol = 'Silver';

  -- Crude Oil WTI
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('Crude Oil WTI', 'Crude Oil WTI', cat_commodities, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 6, 0 FROM public.trading_assets WHERE symbol = 'Crude Oil WTI';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 7, 5, 23, 59 FROM public.trading_assets WHERE symbol = 'Crude Oil WTI';

  -- ========== ÍNDICES ==========
  -- US 500 (S&P 500)
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('US 500', 'US 500', cat_indices, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 11, 35, 17, 55 FROM public.trading_assets WHERE symbol = 'US 500';

  -- US 30 (Dow Jones)
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('US 30', 'US 30', cat_indices, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 15, 0 FROM public.trading_assets WHERE symbol = 'US 30';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 16, 10, 23, 59 FROM public.trading_assets WHERE symbol = 'US 30';

  -- US 100 (NASDAQ)
  INSERT INTO public.trading_assets (symbol, display_name, category_id, available_24_7)
  VALUES ('US 100', 'US 100', cat_indices, FALSE);
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 0, 0, 15, 0 FROM public.trading_assets WHERE symbol = 'US 100';
  
  INSERT INTO public.asset_trading_hours (asset_id, start_hour, start_minute, end_hour, end_minute)
  SELECT id, 16, 10, 23, 59 FROM public.trading_assets WHERE symbol = 'US 100';

  RAISE NOTICE 'Ativos de exemplo inseridos com sucesso!';
END $$;

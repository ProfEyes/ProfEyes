-- =============================================
-- INSERIR ATIVOS FOREX
-- =============================================

-- 1. Garantir que a categoria Forex existe
INSERT INTO public.asset_categories (id, name, description, icon, is_active)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
  'Forex',
  'Pares de moedas e mercado de câmbio',
  '💱',
  TRUE
)
ON CONFLICT (name) DO NOTHING;

-- 2. Obter ID da categoria Forex
DO $$
DECLARE
  v_forex_category_id UUID;
BEGIN
  SELECT id INTO v_forex_category_id
  FROM public.asset_categories
  WHERE name = 'Forex';

  -- 3. Inserir todos os ativos Forex
  INSERT INTO public.trading_assets (
    symbol,
    display_name,
    category_id,
    is_active,
    available_24_7
  ) VALUES
    -- Yen Index
    ('YEN_INDEX', 'Yen Index', v_forex_category_id, TRUE, TRUE),
    
    -- Pares OTC
    ('GBP/JPY', 'GBP/JPY (OTC)', v_forex_category_id, TRUE, TRUE),
    ('PEN/USD', 'PEN/USD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/BRL', 'USD/BRL (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/COP', 'USD/COP (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/MXN', 'USD/MXN (OTC)', v_forex_category_id, TRUE, TRUE),
    ('AUD/CAD', 'AUD/CAD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('AUD/CHF', 'AUD/CHF (OTC)', v_forex_category_id, TRUE, TRUE),
    ('AUD/JPY', 'AUD/JPY (OTC)', v_forex_category_id, TRUE, TRUE),
    ('AUD/NZD', 'AUD/NZD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('AUD/USD', 'AUD/USD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('CAD/CHF', 'CAD/CHF (OTC)', v_forex_category_id, TRUE, TRUE),
    ('CAD/JPY', 'CAD/JPY (OTC)', v_forex_category_id, TRUE, TRUE),
    ('CHF/JPY', 'CHF/JPY (OTC)', v_forex_category_id, TRUE, TRUE),
    ('CHF/NOK', 'CHF/NOK (OTC)', v_forex_category_id, TRUE, TRUE),
    ('EUR/AUD', 'EUR/AUD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('EUR/CAD', 'EUR/CAD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('EUR/CHF', 'EUR/CHF (OTC)', v_forex_category_id, TRUE, TRUE),
    ('EUR/GBP', 'EUR/GBP (OTC)', v_forex_category_id, TRUE, TRUE),
    ('EUR/JPY', 'EUR/JPY (OTC)', v_forex_category_id, TRUE, TRUE),
    ('EUR/NZD', 'EUR/NZD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('EUR/THB', 'EUR/THB (OTC)', v_forex_category_id, TRUE, TRUE),
    ('EUR/USD', 'EUR/USD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('GBP/AUD', 'GBP/AUD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('GBP/CAD', 'GBP/CAD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('GBP/CHF', 'GBP/CHF (OTC)', v_forex_category_id, TRUE, TRUE),
    ('GBP/NZD', 'GBP/NZD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('GBP/USD', 'GBP/USD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('JPY/THB', 'JPY/THB (OTC)', v_forex_category_id, TRUE, TRUE),
    ('NZD/CAD', 'NZD/CAD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('NZD/JPY', 'NZD/JPY (OTC)', v_forex_category_id, TRUE, TRUE),
    ('NZD/USD', 'NZD/USD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/CAD', 'USD/CAD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/CHF', 'USD/CHF (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/HKD', 'USD/HKD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/INR', 'USD/INR (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/JPY', 'USD/JPY (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/NOK', 'USD/NOK (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/PLN', 'USD/PLN (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/SEK', 'USD/SEK (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/SGD', 'USD/SGD (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/THB', 'USD/THB (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/TRY', 'USD/TRY (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/XOF', 'USD/XOF (OTC)', v_forex_category_id, TRUE, TRUE),
    ('USD/ZAR', 'USD/ZAR (OTC)', v_forex_category_id, TRUE, TRUE)
  ON CONFLICT (symbol) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    category_id = EXCLUDED.category_id,
    is_active = EXCLUDED.is_active,
    available_24_7 = EXCLUDED.available_24_7;

END $$;

-- Verificar quantos foram inseridos
SELECT COUNT(*) as total_forex_assets 
FROM public.trading_assets ta
JOIN public.asset_categories ac ON ta.category_id = ac.id
WHERE ac.name = 'Forex';

-- Listar todos os ativos Forex
SELECT 
  ta.symbol,
  ta.display_name,
  ta.available_24_7,
  ta.is_active
FROM public.trading_assets ta
JOIN public.asset_categories ac ON ta.category_id = ac.id
WHERE ac.name = 'Forex'
ORDER BY ta.display_name;

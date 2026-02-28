-- =============================================
-- FUNÇÕES RPC PARA SISTEMA DE SINAIS DIÁRIOS
-- =============================================
-- Compatível com a estrutura atual do banco:
-- - asset_categories
-- - trading_assets (com category_id, available_24_7)
-- - asset_trading_hours
-- - daily_signals (com position, symbol, exchange)
-- =============================================

-- =============================================
-- FUNÇÃO 1: GERAR SINAIS DIÁRIOS
-- =============================================
-- Gera 72 sinais para o dia inteiro (1 a cada 20 minutos)
-- Padrão: Entrada 00:03, Expiração 5min, Gap 10min entre ciclos

CREATE OR REPLACE FUNCTION public.generate_daily_signals(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  signals_created INTEGER,
  message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  signal_position INTEGER := 1;
  current_entry_time TIME := '00:03:00';
  current_entry_minutes INTEGER := 3; -- Começar em 00:03
  asset_list RECORD;
  asset_count INTEGER;
  asset_index INTEGER := 0;
  signal_type_val TEXT;
  random_seed DOUBLE PRECISION;
  success_rate_val NUMERIC;
BEGIN
  -- Limpar sinais existentes para esta data
  DELETE FROM public.daily_signals WHERE signal_date = target_date;
  
  -- Contar ativos ativos
  SELECT COUNT(*) INTO asset_count
  FROM public.trading_assets
  WHERE is_active = TRUE;
  
  IF asset_count = 0 THEN
    RETURN QUERY SELECT 0, 'Nenhum ativo disponível'::TEXT;
    RETURN;
  END IF;
  
  -- Definir seed para randomização consistente baseado na data
  random_seed := EXTRACT(EPOCH FROM target_date::TIMESTAMP) / 1000000.0;
  random_seed := random_seed - FLOOR(random_seed); -- Normalizar para [0,1]
  PERFORM setseed(random_seed);
  
  -- Loop para gerar 72 sinais (24h * 3 sinais por hora)
  WHILE signal_position <= 72 LOOP
    -- Selecionar ativo aleatório
    WITH random_asset AS (
      SELECT id, symbol, display_name
      FROM public.trading_assets
      WHERE is_active = TRUE
      ORDER BY RANDOM()
      LIMIT 1
    )
    SELECT * INTO asset_list FROM random_asset;
    
    -- Alternar entre BUY e SELL
    signal_type_val := CASE 
      WHEN (signal_position % 2) = 1 THEN 'BUY' 
      ELSE 'SELL' 
    END;
    
    -- Gerar taxa de sucesso entre 75% e 95%
    success_rate_val := 0.75 + (RANDOM() * 0.20);
    
    -- Calcular horário de entrada
    current_entry_time := make_time(
      current_entry_minutes / 60,
      current_entry_minutes % 60,
      0
    );
    
    -- Inserir sinal
    INSERT INTO public.daily_signals (
      signal_date,
      position,
      symbol,
      exchange,
      signal_type,
      strength,
      entry_time,
      expiry_minutes,
      success_rate,
      created_at
    ) VALUES (
      target_date,
      signal_position,
      asset_list.symbol,
      asset_list.display_name,
      signal_type_val,
      CASE 
        WHEN success_rate_val >= 0.90 THEN 'Expectativa alta'
        WHEN success_rate_val >= 0.80 THEN 'Expectativa média'
        ELSE 'Expectativa baixa'
      END,
      current_entry_time,
      5, -- Sempre 5 minutos
      success_rate_val,
      NOW()
    );
    
    signal_position := signal_position + 1;
    
    -- Próximo sinal: 20 minutos depois
    -- Padrão: 00:03, 00:23, 00:43, 01:03, 01:23...
    current_entry_minutes := current_entry_minutes + 20;
    
    -- Resetar se passar de 24h
    IF current_entry_minutes >= 1440 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT 
    (signal_position - 1)::INTEGER,
    format('Gerados %s sinais para %s', signal_position - 1, target_date)::TEXT;
END;
$$;

-- =============================================
-- FUNÇÃO 2: BUSCAR SINAIS DIÁRIOS
-- =============================================
-- Retorna sinais ordenados por posição (position)

CREATE OR REPLACE FUNCTION public.get_daily_signals(
  target_date DATE DEFAULT CURRENT_DATE,
  limit_count INTEGER DEFAULT NULL,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  signal_date DATE,
  signal_position INTEGER,
  symbol TEXT,
  exchange TEXT,
  signal_type TEXT,
  strength TEXT,
  entry_time TIME,
  expiry_time TIME,
  gale1_time TIME,
  gale2_time TIME,
  success_rate NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.signal_date,
    ds.position AS signal_position,
    ds.symbol,
    ds.exchange,
    ds.signal_type,
    ds.strength,
    ds.entry_time,
    (ds.entry_time + (ds.expiry_minutes || ' minutes')::INTERVAL)::TIME AS expiry_time,
    (ds.entry_time + (ds.expiry_minutes || ' minutes')::INTERVAL)::TIME AS gale1_time,
    (ds.entry_time + ((ds.expiry_minutes * 2) || ' minutes')::INTERVAL)::TIME AS gale2_time,
    ds.success_rate,
    ds.created_at
  FROM public.daily_signals ds
  WHERE ds.signal_date = target_date
  ORDER BY ds.position ASC
  LIMIT COALESCE(limit_count, 72)
  OFFSET offset_count;
END;
$$;

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON FUNCTION public.generate_daily_signals IS 
'Gera 72 sinais predefinidos para um dia específico. 
Deve ser executado às 00:00 via cron job.
Padrão: Entrada 00:03, Expiração 5min, Intervalo 20min entre sinais';

COMMENT ON FUNCTION public.get_daily_signals IS 
'Retorna sinais diários ordenados por posição.
Parâmetros: target_date, limit_count, offset_count';

-- =============================================
-- EXECUTAR PARA HOJE (TESTE)
-- =============================================

-- Gerar sinais para hoje
SELECT * FROM public.generate_daily_signals(CURRENT_DATE);

-- Verificar primeiros 7 sinais
SELECT 
  position,
  symbol,
  exchange,
  signal_type,
  entry_time,
  strength
FROM public.get_daily_signals(CURRENT_DATE, 7, 0);

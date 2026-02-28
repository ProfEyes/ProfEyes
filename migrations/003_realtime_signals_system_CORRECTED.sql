-- =============================================
-- SISTEMA DE SINAIS EM TEMPO REAL (VERSÃO CORRIGIDA)
-- =============================================
-- NOVA LÓGICA: Sinais gerados dinamicamente baseados no horário atual
-- Rotação automática a cada 16 minutos
-- Horários fixos: 03, 23, 43 minutos
-- Sincronização via Supabase Realtime
-- =============================================

-- =============================================
-- TABELA: SINAIS ATIVOS (3 posições fixas)
-- =============================================

DROP TABLE IF EXISTS public.active_signals CASCADE;

CREATE TABLE public.active_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Posição do sinal (1, 2 ou 3)
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3) UNIQUE,
  
  -- Informações do ativo
  asset_id UUID NOT NULL REFERENCES public.trading_assets(id),
  symbol TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  
  -- Horários
  entry_time TIME NOT NULL,
  expiry_time TIME NOT NULL,
  gale1_time TIME NOT NULL,
  gale2_time TIME NOT NULL,
  
  -- Tipo e força do sinal
  signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL')),
  strength TEXT NOT NULL,
  success_rate NUMERIC(5,4) CHECK (success_rate >= 0 AND success_rate <= 1),
  
  -- Controle de rotação
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Índices
CREATE INDEX idx_active_signals_position ON public.active_signals(position);
CREATE INDEX idx_active_signals_expires_at ON public.active_signals(expires_at);
CREATE INDEX idx_active_signals_active ON public.active_signals(is_active);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

ALTER TABLE public.active_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de sinais ativos"
  ON public.active_signals FOR SELECT
  USING (true);

CREATE POLICY "Service role pode inserir sinais ativos"
  ON public.active_signals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role pode atualizar sinais ativos"
  ON public.active_signals FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Service role pode deletar sinais ativos"
  ON public.active_signals FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- FUNÇÃO: VERIFICAR DISPONIBILIDADE (CORRIGIDA)
-- =============================================

CREATE OR REPLACE FUNCTION is_asset_available_at(
  p_asset_id UUID,
  p_check_time TIME DEFAULT LOCALTIME,
  p_day_of_week INTEGER DEFAULT EXTRACT(DOW FROM CURRENT_DATE)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_24_7 BOOLEAN;
  v_available BOOLEAN := FALSE;
BEGIN
  -- Verificar se é 24/7
  SELECT available_24_7 INTO v_is_24_7
  FROM public.trading_assets
  WHERE id = p_asset_id AND is_active = TRUE;
  
  IF v_is_24_7 THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar horários específicos para o dia da semana
  SELECT EXISTS(
    SELECT 1
    FROM public.asset_trading_hours ath
    WHERE ath.asset_id = p_asset_id
      AND ath.is_active = TRUE
      AND ath.day_of_week = p_day_of_week
      AND p_check_time >= ath.start_time
      AND p_check_time <= ath.end_time
      AND ath.is_closed = FALSE
  ) INTO v_available;
  
  RETURN v_available;
END;
$$;

-- =============================================
-- FUNÇÃO: CALCULAR PRÓXIMO HORÁRIO VÁLIDO
-- =============================================

CREATE OR REPLACE FUNCTION get_next_valid_entry_time(
  p_current_time TIME DEFAULT LOCALTIME
)
RETURNS TIME
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_hour INTEGER;
  v_minute INTEGER;
BEGIN
  v_hour := EXTRACT(HOUR FROM p_current_time);
  v_minute := EXTRACT(MINUTE FROM p_current_time);
  
  IF v_minute >= 43 THEN
    v_hour := v_hour + 1;
    IF v_hour >= 24 THEN v_hour := 0; END IF;
    RETURN make_time(v_hour, 3, 0);
  ELSIF v_minute >= 23 THEN
    RETURN make_time(v_hour, 43, 0);
  ELSIF v_minute >= 3 THEN
    RETURN make_time(v_hour, 23, 0);
  ELSE
    RETURN make_time(v_hour, 3, 0);
  END IF;
END;
$$;

-- =============================================
-- FUNÇÃO: GERAR NOVO SINAL (CORRIGIDA)
-- =============================================

CREATE OR REPLACE FUNCTION generate_new_signal(
  p_position INTEGER DEFAULT 3,
  p_entry_time TIME DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset RECORD;
  v_entry_time TIME;
  v_signal_type TEXT;
  v_success_rate NUMERIC;
  v_strength TEXT;
  v_new_signal_id UUID;
  v_day_of_week INTEGER;
BEGIN
  v_entry_time := COALESCE(p_entry_time, get_next_valid_entry_time(LOCALTIME));
  v_day_of_week := EXTRACT(DOW FROM CURRENT_DATE);
  
  -- Selecionar ativo aleatório disponível
  SELECT 
    ta.id,
    ta.symbol,
    ta.display_name,
    COALESCE(ac.name, 'Cripto') as category_name
  INTO v_asset
  FROM public.trading_assets ta
  LEFT JOIN public.asset_categories ac ON ta.category_id = ac.id
  WHERE ta.is_active = TRUE
    AND is_asset_available_at(ta.id, v_entry_time, v_day_of_week)
  ORDER BY RANDOM()
  LIMIT 1;
  
  IF v_asset.id IS NULL THEN
    RAISE EXCEPTION 'Nenhum ativo disponível para %', v_entry_time;
  END IF;
  
  -- Alternar BUY/SELL
  SELECT CASE WHEN COUNT(*) % 2 = 0 THEN 'BUY' ELSE 'SELL' END
  INTO v_signal_type
  FROM public.signals_history;
  
  -- Taxa de sucesso (75-95%)
  v_success_rate := 0.75 + (RANDOM() * 0.20);
  v_strength := CASE
    WHEN v_success_rate >= 0.90 THEN 'Expectativa alta'
    WHEN v_success_rate >= 0.80 THEN 'Expectativa média'
    ELSE 'Expectativa baixa'
  END;
  
  -- Inserir sinal
  INSERT INTO public.active_signals (
    position, asset_id, symbol, display_name, category,
    entry_time, expiry_time, gale1_time, gale2_time,
    signal_type, strength, success_rate, expires_at
  ) VALUES (
    p_position, v_asset.id, v_asset.symbol, v_asset.display_name, v_asset.category_name,
    v_entry_time,
    v_entry_time + INTERVAL '5 minutes',
    v_entry_time + INTERVAL '5 minutes',
    v_entry_time + INTERVAL '10 minutes',
    v_signal_type, v_strength, v_success_rate,
    NOW() + INTERVAL '16 minutes'
  )
  RETURNING id INTO v_new_signal_id;
  
  -- Histórico
  INSERT INTO public.signals_history (
    asset_id, symbol, display_name, entry_time, signal_type, strength
  ) VALUES (
    v_asset.id, v_asset.symbol, v_asset.display_name, v_entry_time, v_signal_type, v_strength
  );
  
  RETURN v_new_signal_id;
END;
$$;

-- =============================================
-- FUNÇÃO: ROTACIONAR SINAIS
-- =============================================

CREATE OR REPLACE FUNCTION rotate_signals()
RETURNS TABLE (action TEXT, position INTEGER, signal_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired RECORD;
  v_sig2 RECORD;
  v_sig3 RECORD;
  v_new_id UUID;
BEGIN
  SELECT * INTO v_expired FROM public.active_signals WHERE position = 1 AND expires_at <= NOW();
  
  IF v_expired.id IS NOT NULL THEN
    UPDATE public.signals_history
    SET removed_at = NOW()
    WHERE symbol = v_expired.symbol AND entry_time = v_expired.entry_time AND removed_at IS NULL;
    
    DELETE FROM public.active_signals WHERE position = 1;
    RETURN QUERY SELECT 'REMOVED'::TEXT, 1::INTEGER, v_expired.id;
    
    SELECT * INTO v_sig2 FROM public.active_signals WHERE position = 2;
    SELECT * INTO v_sig3 FROM public.active_signals WHERE position = 3;
    
    IF v_sig2.id IS NOT NULL THEN
      UPDATE public.active_signals SET position = 1 WHERE id = v_sig2.id;
      RETURN QUERY SELECT 'MOVED'::TEXT, 1::INTEGER, v_sig2.id;
    END IF;
    
    IF v_sig3.id IS NOT NULL THEN
      UPDATE public.active_signals SET position = 2 WHERE id = v_sig3.id;
      RETURN QUERY SELECT 'MOVED'::TEXT, 2::INTEGER, v_sig3.id;
    END IF;
    
    v_new_id := generate_new_signal(3);
    RETURN QUERY SELECT 'CREATED'::TEXT, 3::INTEGER, v_new_id;
  ELSE
    RETURN QUERY SELECT 'NO_ROTATION'::TEXT, 0::INTEGER, NULL::UUID;
  END IF;
END;
$$;

-- =============================================
-- FUNÇÃO: INICIALIZAR SISTEMA
-- =============================================

CREATE OR REPLACE FUNCTION initialize_signals()
RETURNS TABLE (position INTEGER, signal_id UUID, symbol TEXT, entry_time TIME)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_time TIME := LOCALTIME;
  v_times TIME[];
  v_id UUID;
  i INTEGER;
BEGIN
  DELETE FROM public.active_signals;
  
  v_times := ARRAY[
    get_next_valid_entry_time(v_time),
    get_next_valid_entry_time(get_next_valid_entry_time(v_time) + INTERVAL '1 minute'),
    get_next_valid_entry_time(get_next_valid_entry_time(v_time) + INTERVAL '21 minutes')
  ];
  
  FOR i IN 1..3 LOOP
    v_id := generate_new_signal(i, v_times[i]);
    RETURN QUERY
    SELECT i, v_id, acs.symbol, acs.entry_time
    FROM public.active_signals acs WHERE acs.id = v_id;
  END LOOP;
END;
$$;

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON TABLE public.active_signals IS 'Sinais ativos em tempo real (3 posições)';
COMMENT ON FUNCTION generate_new_signal IS 'Gera novo sinal respeitando horários permitidos';
COMMENT ON FUNCTION rotate_signals IS 'Rotaciona sinais: remove expirado, move 2→1, 3→2, gera novo em 3';
COMMENT ON FUNCTION initialize_signals IS 'Inicializa sistema com 3 sinais';

-- =============================================
-- INICIALIZAR
-- =============================================

SELECT * FROM initialize_signals();

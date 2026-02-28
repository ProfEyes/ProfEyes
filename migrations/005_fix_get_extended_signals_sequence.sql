-- =============================================
-- CORREÇÃO FINAL: get_extended_signals() 
-- =============================================
-- Data: 2026-01-24
-- Problema: Sinais adicionais pulavam muitos slots (ex: 17:03 -> 19:43)
-- Solução: Simplificado lógica para avançar apenas 1 slot se horário já passou
-- =============================================

CREATE OR REPLACE FUNCTION public.get_extended_signals()
RETURNS json[]
LANGUAGE plpgsql
AS $function$
DECLARE
  v_results json[] := ARRAY[]::json[];
  v_next_hour INTEGER;
  v_next_minute INTEGER;
  v_asset RECORD;
  v_count INTEGER := 0;
  v_used_symbols TEXT[] := ARRAY[]::TEXT[];
  v_date_seed TEXT;
  v_hash_int INTEGER;
  v_signal_type TEXT;
  v_success_base NUMERIC;
  v_last_entry TIME;
  v_current_time TIME;
BEGIN
  v_current_time := LOCALTIME;
  
  -- 1. Adicionar os 3 sinais ativos
  SELECT array_agg(row_to_json(t)) INTO v_results
  FROM (
    SELECT 
      a.id::TEXT,
      a.position,
      a.asset_id::TEXT,
      a.symbol,
      a.display_name,
      a.category,
      a.entry_time::TEXT,
      a.expiry_time::TEXT,
      a.gale1_time::TEXT,
      a.gale2_time::TEXT,
      a.signal_type,
      a.strength,
      a.success_rate,
      a.created_at,
      a.expires_at,
      a.is_active,
      false AS is_additional
    FROM active_signals a
    WHERE a.is_active = true
    ORDER BY a.position ASC
  ) t;
  
  -- 2. Pegar símbolos já usados
  SELECT array_agg(a.symbol) INTO v_used_symbols
  FROM active_signals a
  WHERE a.is_active = true;
  
  -- ✅ CORREÇÃO: Começar do PRÓXIMO horário válido após o último sinal ativo
  SELECT MAX(a.entry_time) INTO v_last_entry
  FROM active_signals a
  WHERE a.is_active = true;
  
  -- Se não há sinais ativos, começar do próximo horário
  IF v_last_entry IS NULL THEN
    v_last_entry := v_current_time;
  END IF;
  
  -- Calcular próximo horário válido (03, 23, 43)
  v_next_hour := EXTRACT(HOUR FROM v_last_entry);
  v_next_minute := EXTRACT(MINUTE FROM v_last_entry);
  
  -- Avançar para o próximo slot (SEMPRE avançar pelo menos 1 slot)
  IF v_next_minute >= 43 THEN
    v_next_hour := (v_next_hour + 1) % 24;
    v_next_minute := 3;
  ELSIF v_next_minute >= 23 THEN
    v_next_minute := 43;
  ELSIF v_next_minute >= 3 THEN
    v_next_minute := 23;
  ELSE
    v_next_minute := 3;
  END IF;
  
  -- ✅ SIMPLIFICADO: Não usar WHILE - apenas avançar 1 slot se já passou
  -- Isso garante que continuamos a sequência sem pular muitos slots
  IF make_time(v_next_hour, v_next_minute, 0) < v_current_time THEN
    -- Avançar apenas 1 slot adicional
    IF v_next_minute = 3 THEN
      v_next_minute := 23;
    ELSIF v_next_minute = 23 THEN
      v_next_minute := 43;
    ELSIF v_next_minute = 43 THEN
      v_next_minute := 3;
      v_next_hour := (v_next_hour + 1) % 24;
    END IF;
  END IF;
  
  -- 3. Seed baseada APENAS na DATA (não muda durante o dia)
  v_date_seed := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  -- 4. Gerar 4 sinais adicionais usando hash determinístico
  FOR v_asset IN 
    SELECT 
      ta.id,
      ta.symbol,
      ta.display_name,
      ac.name AS category
    FROM trading_assets ta
    JOIN asset_categories ac ON ta.category_id = ac.id
    WHERE 
      ta.is_active = true
      AND (v_used_symbols IS NULL OR ta.symbol != ALL(v_used_symbols))
    ORDER BY md5(ta.symbol || v_date_seed)
    LIMIT 4
  LOOP
    v_count := v_count + 1;
    
    -- Hash para valores determinísticos
    v_hash_int := ('x' || substring(md5(v_asset.symbol || v_date_seed), 1, 8))::bit(32)::int;
    v_signal_type := CASE WHEN (v_hash_int % 2) = 0 THEN 'BUY' ELSE 'SELL' END;
    v_success_base := 0.85 + ((ABS(v_hash_int) % 100) / 1000.0);
    
    -- ✅ CORREÇÃO CRÍTICA: expires_at baseado no entry_time, não NOW()
    v_results := v_results || json_build_object(
      'id', gen_random_uuid()::TEXT,
      'position', 3 + v_count,
      'asset_id', v_asset.id::TEXT,
      'symbol', v_asset.symbol,
      'display_name', v_asset.display_name,
      'category', v_asset.category,
      'entry_time', make_time(v_next_hour, v_next_minute, 0)::TEXT,
      'expiry_time', make_time(v_next_hour, (v_next_minute + 5) % 60, 0)::TEXT,
      'gale1_time', make_time(v_next_hour, (v_next_minute + 5) % 60, 0)::TEXT,
      'gale2_time', make_time(v_next_hour, (v_next_minute + 10) % 60, 0)::TEXT,
      'signal_type', v_signal_type,
      'strength', 
        CASE 
          WHEN v_success_base >= 0.92 THEN 'Alta expectativa'
          WHEN v_success_base >= 0.85 THEN 'Expectativa média'
          ELSE 'Expectativa baixa'
        END,
      'success_rate', v_success_base,
      'created_at', NOW(),
      'expires_at', (CURRENT_DATE + make_time(v_next_hour, v_next_minute, 0)) + INTERVAL '15 minutes',
      'is_active', true,
      'is_additional', true
    );
    
    -- Próximo horário (manter padrão 03 -> 23 -> 43 -> 03)
    IF v_next_minute = 3 THEN
      v_next_minute := 23;
    ELSIF v_next_minute = 23 THEN
      v_next_minute := 43;
    ELSIF v_next_minute = 43 THEN
      v_next_minute := 3;
      v_next_hour := (v_next_hour + 1) % 24;
    END IF;
  END LOOP;
  
  RETURN v_results;
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
COMMENT ON FUNCTION public.get_extended_signals IS 'Retorna 7 sinais (3 ativos + 4 adicionais) com sequência correta de horários (20 em 20 minutos)';

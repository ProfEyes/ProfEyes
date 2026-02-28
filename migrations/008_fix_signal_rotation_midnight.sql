-- ============================================================================
-- Migration: Fix Signal Rotation Logic for Midnight Crossover
-- Created: 2026-01-22
-- Description: 
--   Corrige bug crítico na rotação de sinais quando o horário atravessa meia-noite
--   - Antes: Comparava TIME diretamente (00:43 < 23:45 = TRUE, ERRADO!)
--   - Depois: Usa TIMESTAMPTZ completo para comparação correta
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rotate_signals()
RETURNS TABLE(action text, signal_position integer, signal_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_expired RECORD;
  v_sig2 RECORD;
  v_sig3 RECORD;
  v_new_id UUID;
  v_last_entry_time TIME;
  v_new_entry_time TIME;
  v_current_time_br TIMESTAMPTZ;
BEGIN
  -- Obter horário atual no Brasil (com data completa)
  v_current_time_br := NOW() AT TIME ZONE 'America/Sao_Paulo';
  
  -- ✅ CORREÇÃO CRÍTICA: Comparar com expires_at (TIMESTAMPTZ) ao invés de entry_time (TIME)
  -- expires_at já considera a data correta (hoje ou amanhã)
  SELECT * INTO v_expired 
  FROM public.active_signals 
  WHERE position = 1 
    AND is_active = true
    AND expires_at <= v_current_time_br;
  
  IF v_expired.id IS NOT NULL THEN
    -- Marcar sinal como removido no histórico
    UPDATE public.signals_history
    SET removed_at = NOW()
    WHERE symbol = v_expired.symbol 
      AND entry_time = v_expired.entry_time 
      AND removed_at IS NULL;
    
    -- Remover sinal da posição 1
    DELETE FROM public.active_signals WHERE position = 1;
    RETURN QUERY SELECT 'REMOVED'::TEXT, 1::INTEGER, v_expired.id;
    
    -- Obter sinais das posições 2 e 3
    SELECT * INTO v_sig2 FROM public.active_signals WHERE position = 2;
    SELECT * INTO v_sig3 FROM public.active_signals WHERE position = 3;
    
    -- Mover sinal 2 para posição 1
    IF v_sig2.id IS NOT NULL THEN
      UPDATE public.active_signals SET position = 1 WHERE id = v_sig2.id;
      RETURN QUERY SELECT 'MOVED'::TEXT, 1::INTEGER, v_sig2.id;
    END IF;
    
    -- Mover sinal 3 para posição 2
    IF v_sig3.id IS NOT NULL THEN
      UPDATE public.active_signals SET position = 2 WHERE id = v_sig3.id;
      RETURN QUERY SELECT 'MOVED'::TEXT, 2::INTEGER, v_sig3.id;
      
      -- Usar o horário do sinal 3 como base
      v_last_entry_time := v_sig3.entry_time;
    ELSE
      -- Se não houver sinal 3, usar horário atual
      v_last_entry_time := v_current_time_br::TIME;
    END IF;
    
    -- Calcular próximo horário válido (20 minutos depois)
    v_new_entry_time := get_next_valid_entry_time(v_last_entry_time);
    
    -- Gerar novo sinal na posição 3 com horário correto
    v_new_id := generate_new_signal(3, v_new_entry_time);
    RETURN QUERY SELECT 'CREATED'::TEXT, 3::INTEGER, v_new_id;
  ELSE
    RETURN QUERY SELECT 'NO_ROTATION'::TEXT, 0::INTEGER, NULL::UUID;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.rotate_signals() IS 
'Rotaciona sinais quando expires_at <= NOW(). 
Executado via cron job "rotate-signals-correct" a cada minuto.
Corrigido para lidar com virada de meia-noite (23:xx -> 00:xx).';

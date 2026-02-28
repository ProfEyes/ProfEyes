-- ============================================================================
-- Migration: Fix Signal Rotation Timing
-- Created: 2026-01-22
-- Description: 
--   Corrige problema de rotação múltipla e prematura de sinais
--   - Remove cron jobs duplicados (3 jobs executando simultaneamente)
--   - Corrige função rotate_signals() para rotacionar após 20min (não 5min)
--   - Cria único cron job correto com lógica adequada
-- ============================================================================

-- 1. REMOVER cron jobs duplicados/problemáticos
DO $$
BEGIN
  -- Tentar remover jobs antigos se existirem
  BEGIN
    PERFORM cron.unschedule(1);
    PERFORM cron.unschedule(2);
    PERFORM cron.unschedule(3);
  EXCEPTION 
    WHEN OTHERS THEN 
      RAISE NOTICE 'Jobs antigos já foram removidos ou não existem';
  END;
END $$;

-- 2. CORRIGIR função rotate_signals() para usar entry_time + 20min
CREATE OR REPLACE FUNCTION public.rotate_signals()
RETURNS TABLE(action text, signal_position integer, signal_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_expired RECORD;
  v_sig2 RECORD;
  v_sig3 RECORD;
  v_new_id UUID;
  v_last_entry_time TIME;
  v_new_entry_time TIME;
  v_current_time_br TIME;
BEGIN
  -- Obter horário atual no Brasil
  v_current_time_br := (NOW() AT TIME ZONE 'America/Sao_Paulo')::TIME;
  
  -- ✅ CORREÇÃO CRÍTICA: Verificar se passou 20 MINUTOS desde a ENTRADA (não expiração!)
  -- Antes: expires_at <= NOW() (rotacionava após 5 minutos)
  -- Agora: entry_time + 20min <= current_time (rotaciona após 20 minutos)
  SELECT * INTO v_expired 
  FROM public.active_signals 
  WHERE position = 1 
    AND is_active = true
    AND (entry_time + INTERVAL '20 minutes')::TIME <= v_current_time_br;
  
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
      v_last_entry_time := v_current_time_br;
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
$function$;

-- 3. CRIAR único cron job correto
SELECT cron.schedule(
  'rotate-signals-correct',  -- Nome descritivo
  '* * * * *',               -- Executa a cada minuto
  'SELECT rotate_signals()'  -- Mas a função decide se rotaciona (após 20min)
);

-- 4. COMENTÁRIO FINAL
COMMENT ON FUNCTION public.rotate_signals() IS 
'Rotaciona sinais após 20 minutos desde entry_time. 
Executado via cron job "rotate-signals-correct" a cada minuto.
A função verifica se passou o tempo antes de rotacionar.';

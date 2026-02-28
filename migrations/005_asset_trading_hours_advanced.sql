-- =============================================
-- HORÁRIOS DE NEGOCIAÇÃO AVANÇADOS
-- =============================================
-- Suporta múltiplos intervalos por dia da semana
-- Para cada ativo individualmente
-- =============================================

-- Remover tabela antiga se existir
DROP TABLE IF EXISTS public.asset_trading_hours CASCADE;

-- Criar nova tabela de horários
CREATE TABLE public.asset_trading_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ativo relacionado
  asset_id UUID NOT NULL REFERENCES public.trading_assets(id) ON DELETE CASCADE,
  
  -- Dia da semana (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  
  -- Horários do intervalo
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Se o mercado está fechado neste dia
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metadados
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: start_time deve ser menor que end_time
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Índices para otimização
CREATE INDEX idx_asset_trading_hours_asset_id ON public.asset_trading_hours(asset_id);
CREATE INDEX idx_asset_trading_hours_day ON public.asset_trading_hours(day_of_week);
CREATE INDEX idx_asset_trading_hours_active ON public.asset_trading_hours(is_active);

-- Índice composto para busca rápida por ativo + dia
CREATE INDEX idx_asset_trading_hours_asset_day ON public.asset_trading_hours(asset_id, day_of_week);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_asset_trading_hours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_asset_trading_hours_updated_at
  BEFORE UPDATE ON public.asset_trading_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_trading_hours_updated_at();

-- RLS (Row Level Security)
ALTER TABLE public.asset_trading_hours ENABLE ROW LEVEL SECURITY;

-- Políticas: Todos podem ler, apenas autenticados podem escrever
CREATE POLICY "Permitir leitura de horários de negociação"
  ON public.asset_trading_hours FOR SELECT
  USING (true);

CREATE POLICY "Service role pode inserir horários"
  ON public.asset_trading_hours FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role pode atualizar horários"
  ON public.asset_trading_hours FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Service role pode deletar horários"
  ON public.asset_trading_hours FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- FUNÇÃO AUXILIAR: Verificar se ativo está disponível
-- =============================================
-- Versão atualizada que consulta a nova tabela

CREATE OR REPLACE FUNCTION is_asset_available_at(
  p_asset_id UUID,
  p_check_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_24_7 BOOLEAN;
  v_day_of_week INTEGER;
  v_time_of_day TIME;
  v_available BOOLEAN := FALSE;
BEGIN
  -- Verificar se é 24/7
  SELECT available_24_7 INTO v_is_24_7
  FROM public.trading_assets
  WHERE id = p_asset_id AND is_active = TRUE;
  
  IF v_is_24_7 THEN
    RETURN TRUE;
  END IF;
  
  -- Extrair dia da semana e hora
  v_day_of_week := EXTRACT(DOW FROM p_check_time); -- 0 = Domingo
  v_time_of_day := p_check_time::TIME;
  
  -- Verificar se há algum intervalo válido para este dia/hora
  SELECT EXISTS(
    SELECT 1
    FROM public.asset_trading_hours
    WHERE asset_id = p_asset_id
      AND day_of_week = v_day_of_week
      AND is_closed = FALSE
      AND is_active = TRUE
      AND v_time_of_day >= start_time
      AND v_time_of_day <= end_time
  ) INTO v_available;
  
  RETURN v_available;
END;
$$;

-- =============================================
-- FUNÇÃO: Obter horários de um ativo
-- =============================================

CREATE OR REPLACE FUNCTION get_asset_trading_hours(
  p_asset_id UUID
)
RETURNS TABLE (
  day_of_week INTEGER,
  day_name TEXT,
  start_time TIME,
  end_time TIME,
  is_closed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ath.day_of_week,
    CASE ath.day_of_week
      WHEN 0 THEN 'Domingo'
      WHEN 1 THEN 'Segunda-feira'
      WHEN 2 THEN 'Terça-feira'
      WHEN 3 THEN 'Quarta-feira'
      WHEN 4 THEN 'Quinta-feira'
      WHEN 5 THEN 'Sexta-feira'
      WHEN 6 THEN 'Sábado'
    END as day_name,
    ath.start_time,
    ath.end_time,
    ath.is_closed
  FROM public.asset_trading_hours ath
  WHERE ath.asset_id = p_asset_id
    AND ath.is_active = TRUE
  ORDER BY ath.day_of_week, ath.start_time;
END;
$$;

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON TABLE public.asset_trading_hours IS 
'Horários de negociação de cada ativo.
Suporta múltiplos intervalos por dia da semana.
Exemplo: Segunda 00:00-10:00 e 10:30-22:00';

COMMENT ON COLUMN public.asset_trading_hours.day_of_week IS 
'Dia da semana: 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado';

COMMENT ON FUNCTION is_asset_available_at IS 
'Verifica se um ativo está disponível para negociação em um horário específico.
Considera both 24/7 e horários customizados.';

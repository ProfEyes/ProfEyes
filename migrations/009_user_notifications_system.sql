-- =========================================================================
-- SISTEMA DE NOTIFICAÇÕES DE USUÁRIOS
-- =========================================================================
-- Descrição: Cria tabela para armazenar notificações de cada usuário
-- Data: 2026-01-25
-- Autor: Sistema ProfEyes
-- =========================================================================

-- Criar tabela de notificações dos usuários
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados da notificação
  type TEXT NOT NULL CHECK (type IN ('success', 'error', 'warning', 'info', 'system', 'live', 'signals')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Metadata
  read BOOLEAN DEFAULT FALSE,
  link_to TEXT,
  action_link TEXT,
  image TEXT,
  
  -- Dados adicionais (JSON para flexibilidade)
  data JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  
  -- Índices para melhor performance
  CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON user_notifications(user_id, read, created_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver suas próprias notificações
CREATE POLICY "Usuários podem ver suas próprias notificações"
ON user_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Política: Usuários podem inserir suas próprias notificações
CREATE POLICY "Usuários podem criar suas próprias notificações"
ON user_notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar suas próprias notificações
CREATE POLICY "Usuários podem atualizar suas próprias notificações"
ON user_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Política: Usuários podem deletar suas próprias notificações
CREATE POLICY "Usuários podem deletar suas próprias notificações"
ON user_notifications
FOR DELETE
USING (auth.uid() = user_id);

-- =========================================================================
-- FUNÇÕES AUXILIARES
-- =========================================================================

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_notifications
  SET 
    read = TRUE,
    read_at = NOW()
  WHERE 
    id = notification_id 
    AND user_id = auth.uid();
END;
$$;

-- Função para marcar todas as notificações como lidas
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_notifications
  SET 
    read = TRUE,
    read_at = NOW()
  WHERE 
    user_id = auth.uid() 
    AND read = FALSE;
END;
$$;

-- Função para limpar notificações antigas (mais de 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_notifications
  WHERE 
    created_at < NOW() - INTERVAL '30 days'
    AND read = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Função para obter contagem de notificações não lidas
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM user_notifications
  WHERE 
    user_id = COALESCE(p_user_id, auth.uid())
    AND read = FALSE;
  
  RETURN unread_count;
END;
$$;

-- Função para obter notificações do usuário com paginação
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_only_unread BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  read BOOLEAN,
  link_to TEXT,
  action_link TEXT,
  image TEXT,
  data JSONB,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.read,
    n.link_to,
    n.action_link,
    n.image,
    n.data,
    n.created_at,
    n.read_at
  FROM user_notifications n
  WHERE 
    n.user_id = auth.uid()
    AND (NOT p_only_unread OR n.read = FALSE)
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =========================================================================
-- TRIGGERS
-- =========================================================================

-- Trigger para limpar notificações automaticamente
-- (Executado semanalmente via cron job ou manualmente)
COMMENT ON FUNCTION cleanup_old_notifications() IS 
'Limpa notificações lidas com mais de 30 dias. Execute periodicamente.';

-- =========================================================================
-- GRANTS (Permissões)
-- =========================================================================

-- Garantir que usuários autenticados possam usar as funções
GRANT EXECUTE ON FUNCTION mark_notification_as_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notifications_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications(INTEGER, INTEGER, BOOLEAN) TO authenticated;

-- =========================================================================
-- COMENTÁRIOS
-- =========================================================================

COMMENT ON TABLE user_notifications IS 'Armazena notificações de cada usuário do sistema';
COMMENT ON COLUMN user_notifications.type IS 'Tipo da notificação: success, error, warning, info, system, live, signals';
COMMENT ON COLUMN user_notifications.data IS 'Dados adicionais em formato JSON (flexível para extensões futuras)';
COMMENT ON COLUMN user_notifications.read IS 'Indica se a notificação foi lida pelo usuário';
COMMENT ON COLUMN user_notifications.read_at IS 'Timestamp de quando a notificação foi marcada como lida';

-- =========================================================================
-- FIM DA MIGRATION
-- =========================================================================

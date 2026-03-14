-- Script completo para verificar e criar todas as estruturas necessárias para Live Streaming

-- ============================================
-- 1. TABELA: live_streams (PRINCIPAL)
-- ============================================
CREATE TABLE IF NOT EXISTS live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  stream_key TEXT UNIQUE NOT NULL,
  stream_url TEXT,
  status TEXT CHECK (status IN ('scheduled', 'live', 'ended', 'deleted')) DEFAULT 'scheduled',
  scheduled_start TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'pt',
  category TEXT,
  level TEXT,
  webcam_enabled BOOLEAN DEFAULT true,
  screen_share_enabled BOOLEAN DEFAULT false,
  stream_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_streams_user ON live_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_created ON live_streams(created_at DESC);

COMMENT ON TABLE live_streams IS 'Transmissões ao vivo';
COMMENT ON COLUMN live_streams.stream_key IS 'Chave única para autenticação da stream';
COMMENT ON COLUMN live_streams.viewer_count IS 'Contador de visualizadores em tempo real';

-- ============================================
-- 2. TABELA: stream_comments
-- ============================================
CREATE TABLE IF NOT EXISTS stream_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stream_comments_stream ON stream_comments(stream_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_comments_user ON stream_comments(user_id);

COMMENT ON TABLE stream_comments IS 'Comentários das transmissões ao vivo';
COMMENT ON COLUMN stream_comments.is_pinned IS 'Comentário fixado pelo streamer';

-- ============================================
-- 3. TABELA: stream_permissions
-- ============================================
CREATE TABLE IF NOT EXISTS stream_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  can_create BOOLEAN DEFAULT false,
  can_moderate BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stream_permissions_user ON stream_permissions(user_id);

COMMENT ON TABLE stream_permissions IS 'Permissões de usuários para criar e moderar transmissões';
COMMENT ON COLUMN stream_permissions.can_create IS 'Usuário pode criar transmissões';
COMMENT ON COLUMN stream_permissions.can_moderate IS 'Usuário pode moderar qualquer transmissão';

-- ============================================
-- 4. TABELA: stream_viewers
-- ============================================
CREATE TABLE IF NOT EXISTS stream_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(stream_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_stream_viewers_stream ON stream_viewers(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_viewers_active ON stream_viewers(stream_id, is_active) WHERE is_active = true;

COMMENT ON TABLE stream_viewers IS 'Rastreamento de visualizadores das transmissões';
COMMENT ON COLUMN stream_viewers.session_id IS 'ID único da sessão de visualização';

-- ============================================
-- 5. TABELA: blocked_users (JÁ CRIADA)
-- ============================================
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  UNIQUE(streamer_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_streamer ON blocked_users(streamer_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_user ON blocked_users(blocked_user_id);

COMMENT ON TABLE blocked_users IS 'Usuários bloqueados por streamers específicos';

-- ============================================
-- 6. TABELA: stream_moderators (JÁ CRIADA)
-- ============================================
CREATE TABLE IF NOT EXISTS stream_moderators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(stream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stream_moderators_stream ON stream_moderators(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_moderators_user ON stream_moderators(user_id);

COMMENT ON TABLE stream_moderators IS 'Moderadores de transmissões';

-- ============================================
-- 7. TABELA: stream_settings (JÁ CRIADA)
-- ============================================
CREATE TABLE IF NOT EXISTS stream_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL UNIQUE,
  chat_enabled BOOLEAN DEFAULT true,
  chat_delay_seconds INTEGER DEFAULT 0,
  subscribers_only BOOLEAN DEFAULT false,
  slow_mode_seconds INTEGER DEFAULT 0,
  emotes_only BOOLEAN DEFAULT false,
  links_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stream_settings_stream ON stream_settings(stream_id);

COMMENT ON TABLE stream_settings IS 'Configurações avançadas de transmissões';

-- ============================================
-- 8. TABELA: comment_likes (PARA CURTIDAS)
-- ============================================
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES stream_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes(user_id);

COMMENT ON TABLE comment_likes IS 'Curtidas nos comentários das transmissões';

-- ============================================
-- 9. FUNÇÕES RPC PARA CONTADORES
-- ============================================

-- Função para incrementar viewer count
CREATE OR REPLACE FUNCTION increment_viewer_count(stream_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE live_streams 
  SET viewer_count = viewer_count + 1,
      updated_at = NOW()
  WHERE id = stream_id;
END;
$$ LANGUAGE plpgsql;

-- Função para decrementar viewer count
CREATE OR REPLACE FUNCTION decrement_viewer_count(stream_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE live_streams 
  SET viewer_count = GREATEST(0, viewer_count - 1),
      updated_at = NOW()
  WHERE id = stream_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas relevantes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_live_streams_updated_at') THEN
    CREATE TRIGGER update_live_streams_updated_at
      BEFORE UPDATE ON live_streams
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_stream_comments_updated_at') THEN
    CREATE TRIGGER update_stream_comments_updated_at
      BEFORE UPDATE ON stream_comments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_stream_settings_updated_at') THEN
    CREATE TRIGGER update_stream_settings_updated_at
      BEFORE UPDATE ON stream_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- 11. POLÍTICAS RLS (Row Level Security)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Políticas para live_streams
DROP POLICY IF EXISTS "Usuários podem ver transmissões públicas" ON live_streams;
CREATE POLICY "Usuários podem ver transmissões públicas"
  ON live_streams FOR SELECT
  TO authenticated
  USING (status IN ('scheduled', 'live', 'ended'));

DROP POLICY IF EXISTS "Streamers podem criar transmissões" ON live_streams;
CREATE POLICY "Streamers podem criar transmissões"
  ON live_streams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Streamers podem atualizar suas transmissões" ON live_streams;
CREATE POLICY "Streamers podem atualizar suas transmissões"
  ON live_streams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Streamers podem deletar suas transmissões" ON live_streams;
CREATE POLICY "Streamers podem deletar suas transmissões"
  ON live_streams FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para stream_comments
DROP POLICY IF EXISTS "Usuários podem ver comentários" ON stream_comments;
CREATE POLICY "Usuários podem ver comentários"
  ON stream_comments FOR SELECT
  TO authenticated
  USING (is_deleted = false);

DROP POLICY IF EXISTS "Usuários podem criar comentários" ON stream_comments;
CREATE POLICY "Usuários podem criar comentários"
  ON stream_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar seus comentários" ON stream_comments;
CREATE POLICY "Usuários podem deletar seus comentários"
  ON stream_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para blocked_users
DROP POLICY IF EXISTS "Streamers podem ver seus bloqueios" ON blocked_users;
CREATE POLICY "Streamers podem ver seus bloqueios"
  ON blocked_users FOR SELECT
  TO authenticated
  USING (auth.uid() = streamer_id);

DROP POLICY IF EXISTS "Streamers podem bloquear usuários" ON blocked_users;
CREATE POLICY "Streamers podem bloquear usuários"
  ON blocked_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = streamer_id);

DROP POLICY IF EXISTS "Streamers podem desbloquear usuários" ON blocked_users;
CREATE POLICY "Streamers podem desbloquear usuários"
  ON blocked_users FOR DELETE
  TO authenticated
  USING (auth.uid() = streamer_id);

-- Políticas para stream_settings
DROP POLICY IF EXISTS "Streamers podem ver configurações de suas streams" ON stream_settings;
CREATE POLICY "Streamers podem ver configurações de suas streams"
  ON stream_settings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM live_streams 
    WHERE live_streams.id = stream_settings.stream_id 
    AND live_streams.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Streamers podem criar configurações" ON stream_settings;
CREATE POLICY "Streamers podem criar configurações"
  ON stream_settings FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM live_streams 
    WHERE live_streams.id = stream_settings.stream_id 
    AND live_streams.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Streamers podem atualizar configurações" ON stream_settings;
CREATE POLICY "Streamers podem atualizar configurações"
  ON stream_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM live_streams 
    WHERE live_streams.id = stream_settings.stream_id 
    AND live_streams.user_id = auth.uid()
  ));

-- ============================================
-- FIM DO SCRIPT
-- ============================================

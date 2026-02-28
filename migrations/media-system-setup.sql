-- Adicionar campo de verificação na tabela user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Criar índice para consultas de verificação de usuário
CREATE INDEX IF NOT EXISTS idx_user_profiles_verified ON user_profiles(is_verified);

-- Criar tabela de vídeos (incluindo shorts)
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  video_url TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  category TEXT NOT NULL,
  language TEXT DEFAULT 'pt',
  duration INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'processing',
  type TEXT NOT NULL CHECK (type IN ('video', 'short', 'live')),
  aspect_ratio TEXT DEFAULT 'landscape' CHECK (aspect_ratio IN ('landscape', 'vertical', 'square')),
  qualities JSONB DEFAULT '[]'::JSONB
);

-- Criar índices para consultas de vídeos
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_type ON videos(type);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);

-- Criar tabela para transmissões ao vivo específicas
CREATE TABLE IF NOT EXISTS live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  category TEXT NOT NULL,
  language TEXT DEFAULT 'pt',
  duration INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  type TEXT DEFAULT 'live',
  stream_key TEXT NOT NULL UNIQUE,
  stream_url TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  viewers_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0
);

-- Criar índices para consultas de transmissões ao vivo
CREATE INDEX IF NOT EXISTS idx_live_streams_user_id ON live_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_started_at ON live_streams(started_at);

-- Criar tabela para comentários de vídeos
CREATE TABLE IF NOT EXISTS video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  likes INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES video_comments(id) ON DELETE CASCADE
);

-- Criar índices para consultas de comentários
CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_user_id ON video_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_parent_id ON video_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_created_at ON video_comments(created_at);

-- Criar função para incrementar visualizações de vídeos
CREATE OR REPLACE FUNCTION increment_video_views(video_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE videos
  SET views = views + 1
  WHERE id = video_id;
END;
$$ LANGUAGE plpgsql;

-- Criar buckets de armazenamento necessários
-- (Nota: isso deve ser feito via interface do Supabase ou CLI, não por SQL puro)
/*
  Buckets necessários:
  - videos: para armazenar arquivos de vídeo
  - thumbnails: para armazenar thumbnails
*/

-- Configurar políticas de segurança RLS
-- Política para leitura de vídeos públicos
CREATE POLICY "Vídeos públicos são visíveis para todos" ON videos
  FOR SELECT USING (status = 'published');

-- Política para leitura de vídeos pelo próprio criador
CREATE POLICY "Criadores podem ler seus próprios vídeos" ON videos
  FOR SELECT USING (auth.uid() = user_id);

-- Política para criação de vídeos (apenas usuários verificados)
CREATE POLICY "Apenas usuários verificados podem criar vídeos" ON videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND is_verified = true
    )
  );

-- Política para atualização de vídeos
CREATE POLICY "Usuários podem atualizar seus próprios vídeos" ON videos
  FOR UPDATE USING (auth.uid() = user_id);

-- Política para exclusão de vídeos
CREATE POLICY "Usuários podem excluir seus próprios vídeos" ON videos
  FOR DELETE USING (auth.uid() = user_id);

-- Política para leitura de comentários
CREATE POLICY "Comentários são visíveis para todos" ON video_comments
  FOR SELECT USING (true);

-- Política para criação de comentários
CREATE POLICY "Usuários autenticados podem comentar" ON video_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para atualização de comentários
CREATE POLICY "Usuários podem atualizar seus próprios comentários" ON video_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Política para exclusão de comentários
CREATE POLICY "Usuários podem excluir seus próprios comentários" ON video_comments
  FOR DELETE USING (auth.uid() = user_id); 
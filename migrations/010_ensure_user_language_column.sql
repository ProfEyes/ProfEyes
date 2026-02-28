-- Migration: 010_ensure_user_language_column
-- Descrição: Garante que a coluna language existe na tabela user_profiles com valor padrão 'pt'
-- Data: 2026-01-25

-- Adicionar coluna language se não existir
DO $$ 
BEGIN
  -- Verificar se a coluna language existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'language'
  ) THEN
    -- Adicionar coluna language
    ALTER TABLE public.user_profiles 
    ADD COLUMN language TEXT DEFAULT 'pt';
    
    RAISE NOTICE 'Coluna language adicionada à tabela user_profiles';
  ELSE
    RAISE NOTICE 'Coluna language já existe na tabela user_profiles';
  END IF;
END $$;

-- Garantir que valores nulos sejam atualizados para 'pt'
UPDATE public.user_profiles 
SET language = 'pt' 
WHERE language IS NULL;

-- Adicionar constraint para garantir valores válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'user_profiles_language_check'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_language_check 
    CHECK (language IN ('pt', 'en', 'es'));
    
    RAISE NOTICE 'Constraint user_profiles_language_check adicionada';
  ELSE
    RAISE NOTICE 'Constraint user_profiles_language_check já existe';
  END IF;
END $$;

-- Criar índice para melhorar performance de queries por idioma
CREATE INDEX IF NOT EXISTS idx_user_profiles_language 
ON public.user_profiles(language);

COMMENT ON COLUMN public.user_profiles.language IS 'Idioma preferido do usuário (pt, en, es)';

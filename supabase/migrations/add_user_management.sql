-- Adiciona o campo is_admin à tabela user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Adicionar comentário explicativo ao campo
COMMENT ON COLUMN public.user_profiles.is_admin IS 'Indica se o usuário tem privilégios de administrador no sistema';

-- Criação da tabela de logs de gerenciamento de usuários
CREATE TABLE IF NOT EXISTS public.user_management_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'reset_password')),
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    details JSONB
);

-- Adicionar comentários para documentação
COMMENT ON TABLE public.user_management_logs IS 'Registra todas as ações administrativas relacionadas ao gerenciamento de usuários';
COMMENT ON COLUMN public.user_management_logs.admin_id IS 'ID do administrador que executou a ação';
COMMENT ON COLUMN public.user_management_logs.action IS 'Tipo de ação realizada';
COMMENT ON COLUMN public.user_management_logs.target_user_id IS 'ID do usuário que foi alvo da ação';
COMMENT ON COLUMN public.user_management_logs.details IS 'Detalhes adicionais sobre a ação em formato JSON';

-- Configurar políticas de acesso RLS (Row Level Security)
ALTER TABLE public.user_management_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso à tabela de logs
CREATE POLICY "Apenas administradores podem visualizar logs" 
    ON public.user_management_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "Apenas administradores podem inserir logs" 
    ON public.user_management_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    );

-- Configurar ou ajustar políticas RLS para user_profiles
CREATE POLICY IF NOT EXISTS "Administradores podem ver todos os perfis" 
    ON public.user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
        OR user_id = auth.uid()
    );

CREATE POLICY IF NOT EXISTS "Administradores podem atualizar todos os perfis" 
    ON public.user_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
        OR user_id = auth.uid()
    );

-- Criar função para definir o primeiro usuário como admin
CREATE OR REPLACE FUNCTION public.set_first_user_as_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for o primeiro registro na tabela
    IF (SELECT COUNT(*) FROM public.user_profiles) = 1 THEN
        NEW.is_admin = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para executar a função
DROP TRIGGER IF EXISTS set_first_user_as_admin_trigger ON public.user_profiles;
CREATE TRIGGER set_first_user_as_admin_trigger
BEFORE INSERT ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_first_user_as_admin();

-- Índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_user_management_logs_admin_id 
    ON public.user_management_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_management_logs_target_user_id 
    ON public.user_management_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin 
    ON public.user_profiles(is_admin) 
    WHERE is_admin = TRUE; 
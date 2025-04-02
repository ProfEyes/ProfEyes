-- Migrações consolidadas para execução manual no SQL Editor do Supabase
-- Gerado em: 2025-04-02T02:40:40.033Z
-- Total de arquivos: 2


-- =========================================================
-- Início da migração: add_complete_user_management.sql
-- =========================================================

-- Configuração de segurança e extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Configuração de schemas
-- Nota: auth schema é automático no Supabase

-- TABELAS DE USUÁRIOS
-- Perfis de usuário estendidos
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    display_name VARCHAR(255),
    avatar_url TEXT,
    language VARCHAR(10) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    risk_level VARCHAR(20) CHECK (risk_level IN ('conservador', 'moderado', 'agressivo')),
    default_currency VARCHAR(5) DEFAULT 'BRL',
    phone_number VARCHAR(20),
    address JSONB,
    birthdate DATE,
    verified_email BOOLEAN DEFAULT FALSE,
    verified_phone BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
    UNIQUE(user_id)
);

-- Tabela de configurações de notificação
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trading_signals BOOLEAN DEFAULT TRUE,
    important_news BOOLEAN DEFAULT TRUE,
    price_alerts BOOLEAN DEFAULT TRUE,
    volume INTEGER DEFAULT 70 CHECK (volume BETWEEN 0 AND 100),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    browser_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    mobile_enabled BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id)
);

-- Preferências de trading
CREATE TABLE IF NOT EXISTS public.trading_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    default_order_size DECIMAL(20, 8),
    default_stop_loss DECIMAL(10, 2),
    default_take_profit DECIMAL(10, 2),
    enable_advanced_charts BOOLEAN DEFAULT FALSE,
    auto_backup BOOLEAN DEFAULT FALSE,
    data_export BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id)
);

-- Log de gerenciamento de usuários
CREATE TABLE IF NOT EXISTS public.user_management_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'reset_password', 'login', 'logout', 'verify_email')),
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Tabela de tokens de verificação e redefinição
CREATE TABLE IF NOT EXISTS public.auth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    token TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email_verification', 'password_reset', 'invite')),
    used BOOLEAN DEFAULT FALSE
);

-- Histórico de sessões
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info JSONB,
    is_active BOOLEAN DEFAULT TRUE
);

-- FUNÇÕES E TRIGGERS

-- Função para atualizar automaticamente o updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o updated_at em user_profiles
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar o updated_at em notification_settings
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar o updated_at em trading_preferences
CREATE TRIGGER update_trading_preferences_updated_at
BEFORE UPDATE ON public.trading_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil de usuário automaticamente após registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Criar perfil de usuário
    INSERT INTO public.user_profiles (user_id)
    VALUES (NEW.id);
    
    -- Criar configurações de notificação
    INSERT INTO public.notification_settings (user_id)
    VALUES (NEW.id);
    
    -- Criar preferências de trading
    INSERT INTO public.trading_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente após registro
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Função para definir o primeiro usuário como admin
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

-- CONFIGURAÇÕES DE RLS (Row Level Security)

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_management_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Usuários podem ver seu próprio perfil" 
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Administradores podem ver todos os perfis" 
    ON public.user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "Administradores podem atualizar todos os perfis" 
    ON public.user_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    );

-- Políticas para notification_settings
CREATE POLICY "Usuários podem ver suas próprias configurações de notificação" 
    ON public.notification_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias configurações de notificação" 
    ON public.notification_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Administradores podem ver todas as configurações de notificação" 
    ON public.notification_settings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    );

-- Políticas para trading_preferences
CREATE POLICY "Usuários podem ver suas próprias preferências de trading" 
    ON public.trading_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias preferências de trading" 
    ON public.trading_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Administradores podem ver todas as preferências de trading" 
    ON public.trading_preferences FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    );

-- Políticas para user_management_logs
CREATE POLICY "Apenas administradores podem visualizar logs" 
    ON public.user_management_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "Usuários autenticados podem inserir logs" 
    ON public.user_management_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para auth_tokens
CREATE POLICY "Usuários podem visualizar apenas seus próprios tokens" 
    ON public.auth_tokens FOR SELECT
    USING (auth.uid() = user_id);

-- Políticas para user_sessions
CREATE POLICY "Usuários podem ver suas próprias sessões" 
    ON public.user_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Administradores podem ver todas as sessões" 
    ON public.user_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    );

-- ÍNDICES para melhorar performance

-- Índices para user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON public.user_profiles(is_admin) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles(status);

-- Índices para notification_settings
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

-- Índices para trading_preferences
CREATE INDEX IF NOT EXISTS idx_trading_preferences_user_id ON public.trading_preferences(user_id);

-- Índices para user_management_logs
CREATE INDEX IF NOT EXISTS idx_user_management_logs_admin_id ON public.user_management_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_management_logs_target_user_id ON public.user_management_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_management_logs_action ON public.user_management_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_management_logs_created_at ON public.user_management_logs(created_at);

-- Índices para auth_tokens
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON public.auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON public.auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_at ON public.auth_tokens(expires_at);

-- Índices para user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active) WHERE is_active = TRUE; 

-- =========================================================
-- Fim da migração: add_complete_user_management.sql
-- =========================================================


-- =========================================================
-- Início da migração: add_user_management.sql
-- =========================================================

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

-- =========================================================
-- Fim da migração: add_user_management.sql
-- =========================================================


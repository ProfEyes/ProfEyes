-- Criar tabela de sinais de trading
CREATE TABLE IF NOT EXISTS public.trading_signals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    symbol VARCHAR NOT NULL,
    type VARCHAR NOT NULL,
    signal VARCHAR NOT NULL,
    reason TEXT,
    strength VARCHAR NOT NULL,
    timestamp BIGINT NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    entry_price DECIMAL(20,8) NOT NULL,
    stop_loss DECIMAL(20,8) NOT NULL,
    target_price DECIMAL(20,8) NOT NULL,
    success_rate DECIMAL(5,2) NOT NULL,
    timeframe VARCHAR NOT NULL,
    expiry TIMESTAMP WITH TIME ZONE NOT NULL,
    risk_reward VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de notícias do mercado
CREATE TABLE IF NOT EXISTS public.market_news (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR NOT NULL,
    content TEXT,
    summary TEXT,
    source VARCHAR NOT NULL,
    url VARCHAR NOT NULL,
    image_url VARCHAR,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    related_symbols VARCHAR[],
    sentiment DECIMAL(4,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_trading_signals_symbol ON public.trading_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_trading_signals_status ON public.trading_signals(status);
CREATE INDEX IF NOT EXISTS idx_trading_signals_timestamp ON public.trading_signals(timestamp);
CREATE INDEX IF NOT EXISTS idx_market_news_published_at ON public.market_news(published_at);

-- Criar função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers para atualizar o updated_at
CREATE TRIGGER update_trading_signals_updated_at
    BEFORE UPDATE ON public.trading_signals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_news_updated_at
    BEFORE UPDATE ON public.market_news
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Criar políticas de segurança RLS (Row Level Security)
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_news ENABLE ROW LEVEL SECURITY;

-- Criar políticas para permitir leitura pública
CREATE POLICY "Allow public read access to trading_signals"
    ON public.trading_signals FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to market_news"
    ON public.market_news FOR SELECT
    USING (true);

-- Criar políticas para permitir inserção/atualização apenas por usuários autenticados
CREATE POLICY "Allow authenticated insert to trading_signals"
    ON public.trading_signals FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update to trading_signals"
    ON public.trading_signals FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert to market_news"
    ON public.market_news FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update to market_news"
    ON public.market_news FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated'); 
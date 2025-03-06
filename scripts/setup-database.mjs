import fetch from 'node-fetch';

// Configuração do Supabase
const SUPABASE_URL = 'https://gaxlzbcoymdcdhkevzmh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdheGx6YmNveW1kY2Roa2V2em1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk2MjE3MjAsImV4cCI6MjAyNTE5NzcyMH0.qDlZhpAy_xGsuKxXL0SU6iWUVYmJIOPfq-4hodcqAK4';

async function createTables() {
  try {
    console.log('Iniciando criação das tabelas...');

    // SQL para criar a tabela trading_signals
    const trading_signals_sql = `
      CREATE TABLE IF NOT EXISTS trading_signals (
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
    `;

    // SQL para criar a tabela market_news
    const market_news_sql = `
      CREATE TABLE IF NOT EXISTS market_news (
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
    `;

    // Criar as tabelas usando a API REST do Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_table`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        trading_signals_sql,
        market_news_sql
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Tabelas criadas com sucesso:', result);

  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
  }
}

// Executar a criação das tabelas
createTables(); 
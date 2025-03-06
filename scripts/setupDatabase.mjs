import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://syzclaaocrlwqudebrwt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5emNsYWFvY3Jsd3F1ZGVicnd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTA2MjAxNiwiZXhwIjoyMDU2NjM4MDE2fQ.7fqi7P2oWk5_noF3gwUdvVi6N-6XKoKPWaiF9rDelHQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTables() {
  try {
    // Verificar se as tabelas já existem
    const { data: tradingSignalsExists } = await supabase
      .from('trading_signals')
      .select('id')
      .limit(1)
      .single()

    if (!tradingSignalsExists) {
      console.log('Criando tabela trading_signals...')
      await supabase
        .from('trading_signals')
        .insert([
          {
            symbol: 'EXAMPLE',
            type: 'TEST',
            signal: 'TEST',
            reason: 'Test record',
            strength: 0,
            timestamp: new Date().toISOString(),
            price: 0,
            entry_price: 0,
            stop_loss: 0,
            target_price: 0,
            success_rate: 0,
            timeframe: '1h',
            expiry: new Date().toISOString(),
            risk_reward: 0,
            status: 'active',
            score: 0
          }
        ])
      console.log('Tabela trading_signals criada com sucesso!')
    } else {
      console.log('Tabela trading_signals já existe.')
    }

    const { data: marketNewsExists } = await supabase
      .from('market_news')
      .select('id')
      .limit(1)
      .single()

    if (!marketNewsExists) {
      console.log('Criando tabela market_news...')
      await supabase
        .from('market_news')
        .insert([
          {
            title: 'Test News',
            description: 'Test description',
            url: 'https://example.com',
            source: 'TEST',
            published_at: new Date().toISOString(),
            sentiment: 0,
            relevance: 0,
            symbols: ['TEST']
          }
        ])
      console.log('Tabela market_news criada com sucesso!')
    } else {
      console.log('Tabela market_news já existe.')
    }
  } catch (error) {
    console.error('Error:', error.message)
    throw error
  }
}

async function setupDatabase() {
  console.log('Iniciando configuração do banco de dados...')
  
  try {
    await createTables()
    console.log('Configuração do banco de dados concluída!')
  } catch (error) {
    console.error('Erro ao configurar o banco de dados:', error)
    process.exit(1)
  }
}

setupDatabase() 
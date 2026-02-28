#!/usr/bin/env node

/**
 * CRON JOB - ROTAÇÃO AUTOMÁTICA DE SINAIS
 * 
 * Este script verifica se há sinais expirados e faz a rotação automática.
 * Deve ser executado a cada 1 minuto.
 * 
 * Configuração no crontab:
 * * * * * * cd /path/to/project && node scripts/rotate-signals-cron.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://arkrjextwpwqhrvcijyr.supabase.co';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFya3JqZXh0d3B3cWhydmNpanlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODkwMzg5NSwiZXhwIjoyMDg0NDc5ODk1fQ.2acjkcHYdKAT7jDCJP5b9nAl0J81vgZxwaZaJ-opnKk';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function rotateSignals() {
  try {
    console.log('🔄 Verificando sinais expirados...');
    console.log('📅 Horário:', new Date().toISOString());

    // Chamar função de rotação
    const { data, error } = await supabase.rpc('rotate_signals');

    if (error) {
      throw error;
    }

    // Verificar resultado
    if (!data || data.length === 0) {
      console.log('ℹ️  Nenhuma rotação necessária no momento');
      process.exit(0);
      return;
    }

    console.log('✅ Rotação executada com sucesso!');
    console.log('📊 Ações realizadas:');
    
    data.forEach((action, index) => {
      console.log(`   ${index + 1}. ${action.action} - Posição ${action.signal_position || 'N/A'} - ID: ${action.signal_id}`);
    });

    // Verificar sinais atuais
    const { data: currentSignals, error: currentError } = await supabase
      .from('active_signals')
      .select('position, symbol, entry_time')
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (!currentError && currentSignals) {
      console.log('\n📈 Sinais ativos atuais:');
      currentSignals.forEach(signal => {
        console.log(`   Posição ${signal.position}: ${signal.symbol} (${signal.entry_time})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao rotacionar sinais:', error);
    process.exit(1);
  }
}

// Executar
rotateSignals();

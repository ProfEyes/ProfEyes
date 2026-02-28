/**
 * SUPABASE EDGE FUNCTION - ROTAÇÃO AUTOMÁTICA DE SINAIS
 * 
 * Esta função é executada automaticamente a cada 5 minutos
 * via Supabase Cron para rotacionar os sinais de trading.
 * 
 * Endpoint: https://[PROJECT_REF].supabase.co/functions/v1/rotate-signals
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    console.log('🔄 [SUPABASE CRON] Verificando sinais expirados...');
    console.log('📅 Horário:', new Date().toISOString());

    // Criar cliente Supabase com Service Role Key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Chamar função de rotação
    const { data, error } = await supabase.rpc('rotate_signals');

    if (error) {
      console.error('❌ Erro ao executar rotate_signals:', error);
      throw error;
    }

    // Verificar resultado
    if (!data || data.length === 0) {
      console.log('ℹ️  Nenhuma rotação necessária no momento');
      return new Response(
        JSON.stringify({
          success: true,
          action: 'NO_ROTATION',
          message: 'Nenhum sinal expirado',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log('✅ Rotação executada com sucesso!');
    console.log('📊 Ações realizadas:');
    data.forEach((action: Record<string, unknown>, index: number) => {
      console.log(
        `   ${index + 1}. ${action.action} - Posição ${action.signal_position || 'N/A'} - ID: ${action.signal_id}`
      );
    });

    // Buscar sinais atuais
    const { data: currentSignals, error: currentError } = await supabase
      .from('active_signals')
      .select('position, symbol, entry_time')
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (currentError) {
      console.error('⚠️ Erro ao buscar sinais atuais:', currentError);
    } else {
      console.log('📈 Sinais ativos atuais:');
      currentSignals?.forEach((signal: Record<string, unknown>) => {
        console.log(`   Posição ${signal.position}: ${signal.symbol} (${signal.entry_time})`);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: 'ROTATION_SUCCESS',
        rotations: data,
        currentSignals: currentSignals || [],
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Erro crítico:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

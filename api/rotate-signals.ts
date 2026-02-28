/**
 * VERCEL SERVERLESS FUNCTION - ROTAÇÃO DE SINAIS
 * 
 * Esta função é chamada automaticamente pelo Vercel Cron
 * a cada 5 minutos para rotacionar os sinais.
 * 
 * Endpoint: /api/rotate-signals
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Segurança: Verificar se é uma requisição do Vercel Cron
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 [VERCEL CRON] Verificando sinais expirados...');
    console.log('📅 Horário:', new Date().toISOString());

    // Configurar Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Chamar função de rotação
    const { data, error } = await supabase.rpc('rotate_signals');

    if (error) {
      throw error;
    }

    // Verificar resultado
    if (!data || data.length === 0) {
      console.log('ℹ️  Nenhuma rotação necessária no momento');
      return res.status(200).json({
        success: true,
        action: 'NO_ROTATION',
        message: 'Nenhum sinal expirado',
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ Rotação executada com sucesso!');
    console.log('📊 Ações realizadas:', data);

    // Buscar sinais atuais
    const { data: currentSignals, error: currentError } = await supabase
      .from('active_signals')
      .select('position, symbol, entry_time')
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (currentError) {
      console.error('⚠️ Erro ao buscar sinais atuais:', currentError);
    }

    return res.status(200).json({
      success: true,
      action: 'ROTATION_SUCCESS',
      rotations: data,
      currentSignals: currentSignals || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro ao rotacionar sinais:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
}

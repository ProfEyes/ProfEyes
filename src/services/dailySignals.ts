/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVIÇO DE SINAIS DIÁRIOS - FONTE ÚNICA DE VERDADE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Este é o ÚNICO serviço responsável por buscar sinais do banco de dados.
 * 
 * LÓGICA:
 * - Os sinais são gerados UMA VEZ por dia às 00:00 no banco de dados
 * - Todos os usuários veem os MESMOS sinais (sincronização global)
 * - Os sinais seguem padrão fixo: entrada 00:03, expiração 5min, gap 10min
 * 
 * COMPONENTES QUE USAM ESTE SERVIÇO:
 * 1. Dashboard → get3FirstSignalsFromDB() → Mostra 3 sinais
 * 2. Trades/Signals → get7SignalsFromDB() → Mostra 7 sinais
 * 
 * IMPORTANTE: Os 3 primeiros sinais do Dashboard são SEMPRE os mesmos
 * 3 primeiros sinais da aba Trades (garantido pela mesma query no DB)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export interface DailySignalFromDB {
  id: string;
  signal_date: string;
  signal_position: number;
  symbol: string;
  exchange: string;
  signal_type: 'BUY' | 'SELL';
  strength: string;
  entry_time: string;
  expiry_time: string;
  gale1_time: string;
  gale2_time: string;
  success_rate: number;
  created_at: string;
}

export interface DailySignalFormatted {
  id: string;
  symbol: string;
  exchange: string;
  signal: 'BUY' | 'SELL';
  strength: string;
  entry_time: string;
  expiry_time_str: string;
  gale1_time: string;
  gale2_time: string;
  timeframe: string;
  success_rate: number;
  timestamp: number;
  entry_price: number;
  position: number;
}

/**
 * Busca sinais diários do banco de dados
 * @param date Data alvo (padrão: hoje)
 * @param limit Número de sinais para retornar (padrão: null = todos)
 * @param offset Offset para paginação (padrão: 0)
 * @returns Promise com array de sinais formatados
 */
export async function getDailySignalsFromDB(
  date: Date = new Date(),
  limit: number | null = null,
  offset: number = 0
): Promise<DailySignalFormatted[]> {
  try {
    // Formatar data como YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];
    
    console.log(`📡 Buscando sinais do banco de dados para ${dateStr}...`);
    
    // Chamar função RPC do Supabase
    const { data, error } = await (supabase as SupabaseClient<Database>).rpc('get_daily_signals', {
      target_date: dateStr,
      limit_count: limit,
      offset_count: offset
    });
    
    if (error) {
      console.error('❌ Erro ao buscar sinais do banco:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.warn('⚠️ Nenhum sinal retornado do banco de dados');
      return [];
    }
    
    console.log(`✅ ${data.length} sinais recebidos do banco de dados`);
    
    // Converter para formato usado no frontend
    const formattedSignals: DailySignalFormatted[] = data.map((signal: DailySignalFromDB) => ({
      id: signal.id,
      symbol: signal.symbol,
      exchange: signal.exchange,
      signal: signal.signal_type,
      strength: signal.strength,
      entry_time: signal.entry_time,
      expiry_time_str: signal.expiry_time,
      gale1_time: signal.gale1_time,
      gale2_time: signal.gale2_time,
      timeframe: '5m', // Sempre 5 minutos
      success_rate: signal.success_rate,
      timestamp: new Date(`${signal.signal_date}T${signal.entry_time}`).getTime(),
      entry_price: 0, // Preço será obtido de outra fonte se necessário
      position: signal.signal_position
    }));
    
    return formattedSignals;
  } catch (error) {
    console.error('❌ Erro fatal ao buscar sinais diários:', error);
    throw error;
  }
}

/**
 * Busca apenas os 3 primeiros sinais do dia (usado pelo Dashboard)
 * 
 * GARANTIA: Estes 3 sinais são SEMPRE os mesmos 3 primeiros da aba Trades
 * porque ambos buscam da mesma query ordenada por position
 */
export async function get3FirstSignalsFromDB(date: Date = new Date()): Promise<DailySignalFormatted[]> {
  return getDailySignalsFromDB(date, 3, 0);
}

/**
 * Busca os 7 primeiros sinais do dia (usado pela aba Trades/Sinais)
 * 
 * Os primeiros 3 são idênticos aos do Dashboard (sincronização automática)
 */
export async function get7SignalsFromDB(date: Date = new Date()): Promise<DailySignalFormatted[]> {
  return getDailySignalsFromDB(date, 7, 0);
}

/**
 * Busca todos os sinais do dia (72 sinais)
 */
export async function getAllDailySignalsFromDB(date: Date = new Date()): Promise<DailySignalFormatted[]> {
  return getDailySignalsFromDB(date, null, 0);
}

/**
 * Alias para compatibilidade: fetchTradingSignals = get7SignalsFromDB
 * 
 * Esta função é mantida por compatibilidade com componentes existentes
 * que ainda usam o nome fetchTradingSignals
 */
export async function fetchTradingSignals(date: Date = new Date()): Promise<DailySignalFormatted[]> {
  return get7SignalsFromDB(date);
}

/**
 * Força regeneração dos sinais do dia (apenas para admin/debug)
 */
export async function regenerateDailySignals(date: Date = new Date()): Promise<number> {
  try {
    const dateStr = date.toISOString().split('T')[0];
    
    console.log(`🔄 Regenerando sinais para ${dateStr}...`);
    
    const { data, error } = await (supabase as SupabaseClient<Database>).rpc('generate_daily_signals', {
      target_date: dateStr
    });
    
    if (error) {
      console.error('❌ Erro ao regenerar sinais:', error);
      throw error;
    }
    
    console.log(`✅ ${data} sinais regenerados com sucesso`);
    return data as number;
  } catch (error) {
    console.error('❌ Erro fatal ao regenerar sinais:', error);
    throw error;
  }
}

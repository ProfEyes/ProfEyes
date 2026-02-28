/**
 * ⚠️ FUNÇÃO CRÍTICA: Cálculos de tempo para sinais
 * 
 * Esta função centraliza TODA a lógica de cálculo de timestamps de sinais.
 * NUNCA calcule timestamps de sinais diretamente em componentes!
 * 
 * REGRA FUNDAMENTAL:
 * - Se o horário passou há MAIS DE 10 MINUTOS = é amanhã
 * - Se o horário é futuro ou passou há MENOS de 10 minutos = é hoje
 * 
 * CONFIGURAÇÃO ATUAL:
 * - Rotação: 15 MINUTOS após entrada (atualizado em 2026-01-23)
 * 
 * Casos de uso:
 * - Timer de rotação (Dashboard e Trades)
 * - Notificações agendadas
 * - Verificação de expiração de sinais
 */

export interface SignalTimestamp {
  /** Timestamp de entrada do sinal (ms) */
  entryTimestamp: number;
  /** Timestamp de rotação (entrada + 20min) */
  rotationTimestamp: number;
  /** Timestamp de expiração (entrada + 20min) */
  expirationTimestamp: number;
  /** Segundos até rotação */
  secondsToRotation: number;
  /** Minutos desde entrada (pode ser negativo se no futuro) */
  minutesSinceEntry: number;
  /** Data de entrada formatada */
  entryDate: Date;
  /** É hoje ou amanhã? */
  isToday: boolean;
}

/**
 * Calcula todos os timestamps relevantes de um sinal
 * 
 * @param entryTime - Horário de entrada no formato "HH:MM" ou "HH:MM:SS"
 * @param referenceTime - Timestamp de referência (padrão: agora)
 * @returns Objeto com todos os timestamps calculados
 * 
 * @example
 * // Às 00:00, sinal com entrada 00:03
 * const result = calculateSignalTimestamps("00:03");
 * // result.isToday = true (faltam 3 minutos)
 * // result.secondsToRotation = 1080 (18 minutos = 3min até entrada + 15min de rotação)
 * 
 * @example
 * // Às 00:00, sinal com entrada 23:43 (ontem)
 * const result = calculateSignalTimestamps("23:43");
 * // result.isToday = false (passou há 17 minutos)
 * // result.entryDate = amanhã 23:43
 */
export function calculateSignalTimestamps(
  entryTime: string,
  referenceTime: number = Date.now()
): SignalTimestamp {
  // ✅ VALIDAÇÃO: Formato de entrada
  if (!entryTime || typeof entryTime !== 'string') {
    throw new Error(`[TimeCalc] entryTime inválido: ${entryTime}`);
  }

  // ✅ Parse do horário (suporta HH:MM e HH:MM:SS)
  const parts = entryTime.split(':');
  if (parts.length < 2 || parts.length > 3) {
    throw new Error(`[TimeCalc] Formato inválido: ${entryTime}. Use "HH:MM" ou "HH:MM:SS"`);
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  // ✅ VALIDAÇÃO: Valores válidos
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`[TimeCalc] Horário fora do intervalo válido: ${entryTime}`);
  }

  // ✅ Criar data de entrada no dia atual
  const entryDate = new Date(referenceTime);
  entryDate.setHours(hours, minutes, 0, 0);

  // ✅ LÓGICA CRÍTICA: Determinar se é hoje ou amanhã
  const minutesDiff = (entryDate.getTime() - referenceTime) / (60 * 1000);
  const isToday = minutesDiff >= -10; // Se passou há menos de 10min OU é futuro = hoje

  if (!isToday) {
    // Passou há mais de 10 minutos = é amanhã
    entryDate.setDate(entryDate.getDate() + 1);
  }

  const entryTimestamp = entryDate.getTime();

  // ✅ Calcular rotação: 15 minutos APÓS a entrada
  const rotationTimestamp = entryTimestamp + (15 * 60 * 1000);
  const expirationTimestamp = rotationTimestamp; // Mesmo horário

  // ✅ Calcular valores relativos
  const msToRotation = Math.max(0, rotationTimestamp - referenceTime);
  const secondsToRotation = Math.floor(msToRotation / 1000);
  const minutesSinceEntry = Math.floor((referenceTime - entryTimestamp) / (60 * 1000));

  return {
    entryTimestamp,
    rotationTimestamp,
    expirationTimestamp,
    secondsToRotation,
    minutesSinceEntry,
    entryDate,
    isToday,
  };
}

/**
 * Formata segundos em formato legível MM:SS
 */
export function formatSecondsToMMSS(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

/**
 * Formata timestamp em horário local do Brasil
 */
export function formatBrazilTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Testa a função com casos extremos (apenas para debug/testes)
 */
export function testTimeCalculations() {
  console.group('🧪 [TimeCalc] Testes de Edge Cases');

  const testCases = [
    { time: '00:03', desc: 'Meia-noite + 3min' },
    { time: '23:43', desc: 'Quase meia-noite' },
    { time: '00:23', desc: 'Início do dia' },
    { time: '12:03', desc: 'Meio-dia' },
  ];

  const now = new Date();
  console.log(`⏰ Horário atual: ${now.toLocaleTimeString('pt-BR')}`);

  testCases.forEach(({ time, desc }) => {
    try {
      const result = calculateSignalTimestamps(time);
      console.log(`\n✅ ${desc} (${time})`);
      console.log(`   📅 Entry: ${result.entryDate.toLocaleString('pt-BR')}`);
      console.log(`   📍 É hoje? ${result.isToday ? 'SIM' : 'NÃO (amanhã)'}`);
      console.log(`   ⏳ Até rotação: ${formatSecondsToMMSS(result.secondsToRotation)}`);
      console.log(`   📊 Desde entrada: ${result.minutesSinceEntry} minutos`);
    } catch (error) {
      console.error(`❌ ${desc} (${time}):`, error);
    }
  });

  console.groupEnd();
}

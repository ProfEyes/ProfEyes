/**
 * ⚠️ SISTEMA DE VALIDAÇÃO E MONITORAMENTO DE SINAIS
 * 
 * Este arquivo contém validações críticas para prevenir bugs graves:
 * - Timer incorreto
 * - Sinais duplicados
 * - Horários inválidos
 * - Expiração no passado
 */

import type { ActiveSignal } from '@/services/realtimeSignals';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida um sinal completo
 */
export function validateSignal(signal: ActiveSignal): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ✅ 1. Validar entry_time
  if (!signal.entry_time) {
    errors.push('entry_time ausente');
  } else {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
    if (!timeRegex.test(signal.entry_time)) {
      errors.push(`entry_time inválido: ${signal.entry_time}`);
    } else {
      // Verificar se é um horário válido (:03, :23, :43)
      const minutes = parseInt(signal.entry_time.split(':')[1], 10);
      if (![3, 23, 43].includes(minutes)) {
        warnings.push(`entry_time fora do padrão (esperado :03/:23/:43): ${signal.entry_time}`);
      }
    }
  }

  // ✅ 2. Validar symbol
  if (!signal.symbol || signal.symbol.trim().length === 0) {
    errors.push('symbol ausente ou vazio');
  }

  // ✅ 3. Validar position
  if (signal.position === undefined || signal.position < 1 || signal.position > 10) {
    errors.push(`position inválida: ${signal.position}`);
  }

  // ✅ 4. Validar expires_at
  if (signal.expires_at) {
    const expiresAt = new Date(signal.expires_at);
    const now = new Date();
    
    if (expiresAt <= now) {
      errors.push(`expires_at no passado: ${expiresAt.toISOString()}`);
    }
    
    // Verificar se expires_at é aproximadamente 20 minutos após entry_time
    if (signal.entry_time) {
      const [hours, minutes] = signal.entry_time.split(':').map(Number);
      const entryDate = new Date(now);
      entryDate.setHours(hours, minutes, 0, 0);
      
      // Ajustar para hoje/amanhã
      const minutesDiff = (entryDate.getTime() - now.getTime()) / (60 * 1000);
      if (minutesDiff < -10) {
        entryDate.setDate(entryDate.getDate() + 1);
      }
      
      const expectedExpiration = new Date(entryDate.getTime() + 15 * 60 * 1000);
      const expirationDiff = Math.abs(expiresAt.getTime() - expectedExpiration.getTime()) / (60 * 1000);
      
      if (expirationDiff > 2) {
        warnings.push(`expires_at não é ~15min após entrada (diff: ${expirationDiff.toFixed(1)}min)`);
      }
    }
  }

  // ✅ 5. Validar signal_type
  if (signal.signal_type && !['BUY', 'SELL'].includes(signal.signal_type)) {
    errors.push(`signal_type inválido: ${signal.signal_type}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida um conjunto de sinais (detecta duplicatas, ordem incorreta, etc)
 */
export function validateSignalSet(signals: ActiveSignal[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!signals || signals.length === 0) {
    warnings.push('Conjunto de sinais vazio');
    return { isValid: true, errors, warnings };
  }

  // ✅ 1. Verificar duplicatas de symbol
  const symbols = signals.map(s => s.symbol);
  const duplicates = symbols.filter((s, i) => symbols.indexOf(s) !== i);
  if (duplicates.length > 0) {
    errors.push(`Símbolos duplicados: ${duplicates.join(', ')}`);
  }

  // ✅ 2. Verificar duplicatas de position
  const positions = signals.map(s => s.position);
  const duplicatePositions = positions.filter((p, i) => positions.indexOf(p) !== i);
  if (duplicatePositions.length > 0) {
    errors.push(`Posições duplicadas: ${duplicatePositions.join(', ')}`);
  }

  // ✅ 3. Verificar ordem das positions
  const sortedPositions = [...positions].sort((a, b) => (a || 0) - (b || 0));
  const isOrdered = JSON.stringify(positions) === JSON.stringify(sortedPositions);
  if (!isOrdered) {
    warnings.push('Sinais não estão ordenados por position');
  }

  // ✅ 4. Verificar ordem cronológica dos entry_time
  const times = signals.map(s => s.entry_time).filter(Boolean);
  for (let i = 1; i < times.length; i++) {
    const prev = times[i - 1];
    const curr = times[i];
    
    if (prev && curr && prev > curr) {
      // Exceção: pode ser :43 -> :03 (mudança de hora)
      const prevMin = parseInt(prev.split(':')[1], 10);
      const currMin = parseInt(curr.split(':')[1], 10);
      
      if (!(prevMin === 43 && currMin === 3)) {
        warnings.push(`entry_time fora de ordem: ${prev} -> ${curr}`);
      }
    }
  }

  // ✅ 5. Validar cada sinal individualmente
  signals.forEach((signal, index) => {
    const result = validateSignal(signal);
    if (result.errors.length > 0) {
      errors.push(`Sinal #${index + 1} (${signal.symbol}): ${result.errors.join(', ')}`);
    }
    if (result.warnings.length > 0) {
      warnings.push(`Sinal #${index + 1} (${signal.symbol}): ${result.warnings.join(', ')}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Loga resultados de validação no console
 */
export function logValidationResult(context: string, result: ValidationResult): void {
  if (result.isValid && result.warnings.length === 0) {
    // Validação OK
    return;
  }

  if (result.errors.length > 0) {
    console.error(`❌ [${context}] ERROS CRÍTICOS:`, result.errors);
  }

  if (result.warnings.length > 0) {
    // Avisos (silenciado)
  }
}

/**
 * Monitora mudanças nos sinais e registra eventos suspeitos
 */
export class SignalMonitor {
  private previousSignals: Map<string, ActiveSignal> = new Map();
  private rotationCount = 0;
  private lastRotation: Date | null = null;

  /**
   * Registra um novo conjunto de sinais e detecta anomalias
   */
  update(signals: ActiveSignal[], source: string): void {
    const now = new Date();

    // ✅ 1. Validar conjunto
    const validation = validateSignalSet(signals);
    logValidationResult(source, validation);

    // ✅ 2. Detectar rotações
    const currentSymbols = new Set(signals.map(s => s.symbol));
    const previousSymbols = new Set(this.previousSignals.keys());
    
    const hasNewSignals = [...currentSymbols].some(s => !previousSymbols.has(s));
    const hasRemovedSignals = [...previousSymbols].some(s => !currentSymbols.has(s));
    
    if (hasNewSignals || hasRemovedSignals) {
      this.rotationCount++;
      
      const timeSinceLastRotation = this.lastRotation 
        ? (now.getTime() - this.lastRotation.getTime()) / (60 * 1000)
        : null;
      
      console.log(`🔄 [${source}] Rotação #${this.rotationCount} detectada`);
      console.log(`   🆕 Novos: ${[...currentSymbols].filter(s => !previousSymbols.has(s)).join(', ') || 'nenhum'}`);
      console.log(`   ❌ Removidos: ${[...previousSymbols].filter(s => !currentSymbols.has(s)).join(', ') || 'nenhum'}`);
      
      if (timeSinceLastRotation !== null) {
        console.log(`   ⏱️  Tempo desde última rotação: ${timeSinceLastRotation.toFixed(1)}min`);
        
        // ✅ ALERTA: Rotação muito rápida (<10min) ou muito lenta (>20min)
        if (timeSinceLastRotation < 10) {
          console.error(`⚠️ [${source}] ALERTA: Rotação muito rápida! (< 10min)`);
        } else if (timeSinceLastRotation > 20) {
          // Rotação atrasada (silenciado)
        }
      }
      
      this.lastRotation = now;
    }

    // ✅ 3. Detectar mudanças inesperadas (sem rotação)
    signals.forEach(signal => {
      const prev = this.previousSignals.get(signal.symbol);
      if (prev) {
        // Mesmo symbol, mas dados mudaram?
        if (prev.entry_time !== signal.entry_time) {
          console.error(`🚨 [${source}] ANOMALIA: entry_time mudou SEM rotação! ${signal.symbol}: ${prev.entry_time} -> ${signal.entry_time}`);
        }
        if (prev.position !== signal.position) {
          // Position mudou (silenciado)
        }
      }
    });

    // ✅ 4. Atualizar cache
    this.previousSignals.clear();
    signals.forEach(signal => {
      this.previousSignals.set(signal.symbol, { ...signal });
    });
  }

  /**
   * Reseta o monitor (útil para testes)
   */
  reset(): void {
    this.previousSignals.clear();
    this.rotationCount = 0;
    this.lastRotation = null;
  }

  /**
   * Retorna estatísticas do monitor
   */
  getStats() {
    return {
      rotationCount: this.rotationCount,
      lastRotation: this.lastRotation,
      trackedSignals: this.previousSignals.size,
    };
  }
}

/**
 * Monitor global (singleton)
 */
export const globalSignalMonitor = new SignalMonitor();

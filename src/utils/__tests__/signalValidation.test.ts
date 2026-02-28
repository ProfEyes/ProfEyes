/**
 * Testes para sistema de validação de sinais
 */

import { validateSignal, validateSignalSet, SignalMonitor } from '../signalValidation';
import type { ActiveSignal } from '@/services/realtimeSignals';

describe('validateSignal', () => {
  const validSignal: ActiveSignal = {
    id: '123',
    asset_id: 'asset-1',
    symbol: 'BTC/USD',
    display_name: 'Bitcoin',
    category: 'Cripto',
    entry_time: '12:03',
    expiry_time: '12:08',
    gale1_time: '12:08',
    gale2_time: '12:13',
    signal_type: 'BUY',
    strength: 'STRONG',
    success_rate: 0.85,
    position: 1,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    is_active: true,
  };

  it('deve validar sinal válido', () => {
    const result = validateSignal(validSignal);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('deve detectar entry_time inválido', () => {
    const invalid = { ...validSignal, entry_time: '25:00' };
    const result = validateSignal(invalid);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('entry_time inválido: 25:00');
  });

  it('deve alertar sobre minutos fora do padrão', () => {
    const invalid = { ...validSignal, entry_time: '12:05' };
    const result = validateSignal(invalid);
    
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('fora do padrão');
  });

  it('deve detectar expires_at no passado', () => {
    const invalid = { 
      ...validSignal, 
      expires_at: new Date(Date.now() - 1000).toISOString() 
    };
    const result = validateSignal(invalid);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('expires_at no passado'));
  });

  it('deve detectar signal_type inválido', () => {
    const invalid = { ...validSignal, signal_type: 'INVALID' as any };
    const result = validateSignal(invalid);
    
    expect(result.isValid).toBe(false);
  });

  it('deve detectar position inválida', () => {
    const invalid1 = { ...validSignal, position: 0 };
    const invalid2 = { ...validSignal, position: 11 };
    
    expect(validateSignal(invalid1).isValid).toBe(false);
    expect(validateSignal(invalid2).isValid).toBe(false);
  });
});

describe('validateSignalSet', () => {
  const signal1: ActiveSignal = {
    id: '1',
    symbol: 'BTC/USD',
    position: 1,
    entry_time: '12:03',
    signal_type: 'BUY',
  } as ActiveSignal;

  const signal2: ActiveSignal = {
    id: '2',
    symbol: 'ETH/USD',
    position: 2,
    entry_time: '12:23',
    signal_type: 'SELL',
  } as ActiveSignal;

  it('deve validar conjunto válido', () => {
    const result = validateSignalSet([signal1, signal2]);
    expect(result.errors).toHaveLength(0);
  });

  it('deve detectar símbolos duplicados', () => {
    const duplicate = { ...signal2, id: '3' };
    const result = validateSignalSet([signal1, signal2, duplicate]);
    
    // Não deve haver erro pois os IDs são diferentes
    // Mas se mudarmos o symbol para ser igual...
    const duplicateSymbol = { ...signal2, id: '3', symbol: 'BTC/USD' };
    const result2 = validateSignalSet([signal1, duplicateSymbol]);
    
    expect(result2.isValid).toBe(false);
    expect(result2.errors).toContain(expect.stringContaining('duplicados'));
  });

  it('deve detectar posições duplicadas', () => {
    const duplicatePos = { ...signal2, position: 1 };
    const result = validateSignalSet([signal1, duplicatePos]);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('Posições duplicadas'));
  });

  it('deve alertar sobre ordem incorreta', () => {
    const unordered = [signal2, signal1]; // Position 2, depois 1
    const result = validateSignalSet(unordered);
    
    expect(result.warnings).toContain(expect.stringContaining('não estão ordenados'));
  });

  it('deve permitir mudança de hora (:43 -> :03)', () => {
    const sig1 = { ...signal1, entry_time: '23:43' };
    const sig2 = { ...signal2, entry_time: '00:03' };
    
    const result = validateSignalSet([sig1, sig2]);
    
    // Não deve gerar erro para essa exceção válida
    const hasOrderError = result.warnings.some(w => w.includes('fora de ordem'));
    expect(hasOrderError).toBe(false);
  });
});

describe('SignalMonitor', () => {
  let monitor: SignalMonitor;

  beforeEach(() => {
    monitor = new SignalMonitor();
  });

  it('deve detectar rotação', () => {
    const signals1 = [
      { id: '1', symbol: 'BTC', position: 1 } as ActiveSignal,
      { id: '2', symbol: 'ETH', position: 2 } as ActiveSignal,
    ];

    const signals2 = [
      { id: '3', symbol: 'DASH', position: 1 } as ActiveSignal,
      { id: '4', symbol: 'ATOM', position: 2 } as ActiveSignal,
    ];

    monitor.update(signals1, 'Test');
    const statsBefore = monitor.getStats();
    expect(statsBefore.rotationCount).toBe(0);

    monitor.update(signals2, 'Test');
    const statsAfter = monitor.getStats();
    expect(statsAfter.rotationCount).toBe(1);
  });

  it('deve detectar mudança de entry_time sem rotação', () => {
    const signals1 = [
      { id: '1', symbol: 'BTC', entry_time: '12:03', position: 1 } as ActiveSignal,
    ];

    const signals2 = [
      { id: '1', symbol: 'BTC', entry_time: '12:23', position: 1 } as ActiveSignal,
    ];

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    monitor.update(signals1, 'Test');
    monitor.update(signals2, 'Test');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('ANOMALIA'),
      expect.anything()
    );

    consoleSpy.mockRestore();
  });

  it('deve calcular stats corretamente', () => {
    const signals = [
      { id: '1', symbol: 'BTC', position: 1 } as ActiveSignal,
    ];

    monitor.update(signals, 'Test');
    const stats = monitor.getStats();

    expect(stats.trackedSignals).toBe(1);
    expect(stats.lastRotation).toBeNull(); // Primeira atualização não é rotação
  });

  it('deve resetar corretamente', () => {
    const signals = [{ id: '1', symbol: 'BTC', position: 1 } as ActiveSignal];
    
    monitor.update(signals, 'Test');
    monitor.reset();
    
    const stats = monitor.getStats();
    expect(stats.rotationCount).toBe(0);
    expect(stats.trackedSignals).toBe(0);
    expect(stats.lastRotation).toBeNull();
  });
});

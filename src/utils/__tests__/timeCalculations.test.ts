/**
 * Testes para função crítica de cálculo de timestamps
 * 
 * ATENÇÃO: Estes testes garantem que edge cases críticos funcionem corretamente
 */

import { calculateSignalTimestamps, formatSecondsToMMSS } from '../timeCalculations';

describe('calculateSignalTimestamps - Edge Cases', () => {
  describe('Meia-noite (00:00)', () => {
    it('deve calcular corretamente sinal 00:03 quando for 00:00', () => {
      // Simular que são 00:00:00
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      
      const result = calculateSignalTimestamps('00:03', midnight.getTime());
      
      expect(result.isToday).toBe(true); // Daqui a 3 minutos
      expect(result.minutesSinceEntry).toBe(-3); // Negativo = no futuro
      expect(result.secondsToRotation).toBeGreaterThan(1000); // ~18 minutos (3 + 15)
      expect(result.secondsToRotation).toBeLessThan(1100);
    });

    it('deve calcular corretamente sinal 23:43 quando for 00:00', () => {
      // Simular que são 00:00:00
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      
      const result = calculateSignalTimestamps('23:43', midnight.getTime());
      
      expect(result.isToday).toBe(false); // Passou há 17 minutos, é amanhã
      expect(result.entryDate.getHours()).toBe(23);
      expect(result.entryDate.getDate()).toBe(midnight.getDate() + 1); // Amanhã
    });
  });

  describe('Horários próximos (±10 minutos)', () => {
    it('deve considerar HOJE se passou há menos de 10 minutos', () => {
      // Simular que são 00:12 (passou 9 minutos do 00:03)
      const now = new Date();
      now.setHours(0, 12, 0, 0);
      
      const result = calculateSignalTimestamps('00:03', now.getTime());
      
      expect(result.isToday).toBe(true); // Passou há 9 min = ainda é hoje
      expect(result.minutesSinceEntry).toBe(9);
    });

    it('deve considerar AMANHÃ se passou há mais de 10 minutos', () => {
      // Simular que são 00:14 (passou 11 minutos do 00:03)
      const now = new Date();
      now.setHours(0, 14, 0, 0);
      
      const result = calculateSignalTimestamps('00:03', now.getTime());
      
      expect(result.isToday).toBe(false); // Passou há 11 min = é amanhã
      expect(result.entryDate.getDate()).toBe(now.getDate() + 1);
    });
  });

  describe('Horários futuros', () => {
    it('deve calcular corretamente horário futuro próximo', () => {
      // Simular que são 12:00, sinal às 12:23
      const now = new Date();
      now.setHours(12, 0, 0, 0);
      
      const result = calculateSignalTimestamps('12:23', now.getTime());
      
      expect(result.isToday).toBe(true);
      expect(result.minutesSinceEntry).toBe(-23); // Negativo = no futuro
      expect(result.secondsToRotation).toBe((23 + 15) * 60); // 38 minutos
    });
  });

  describe('Validações', () => {
    it('deve lançar erro para formato inválido', () => {
      expect(() => calculateSignalTimestamps('25:00')).toThrow();
      expect(() => calculateSignalTimestamps('12:60')).toThrow();
      expect(() => calculateSignalTimestamps('abc')).toThrow();
      expect(() => calculateSignalTimestamps('')).toThrow();
    });

    it('deve aceitar formato HH:MM:SS', () => {
      const now = Date.now();
      const result = calculateSignalTimestamps('12:23:00', now);
      
      expect(result.entryDate.getHours()).toBe(12);
      expect(result.entryDate.getMinutes()).toBe(23);
      expect(result.entryDate.getSeconds()).toBe(0);
    });
  });

  describe('Rotação (15 minutos)', () => {
    it('deve calcular rotação exatamente 15 minutos após entrada', () => {
      const now = new Date();
      now.setHours(12, 0, 0, 0);
      
      const result = calculateSignalTimestamps('12:03', now);
      
      const rotationTime = new Date(result.rotationTimestamp);
      const entryTime = new Date(result.entryTimestamp);
      
      const diffMinutes = (rotationTime.getTime() - entryTime.getTime()) / (60 * 1000);
      expect(diffMinutes).toBe(15);
    });
  });
});

describe('formatSecondsToMMSS', () => {
  it('deve formatar segundos corretamente', () => {
    expect(formatSecondsToMMSS(0)).toBe('0m 0s');
    expect(formatSecondsToMMSS(30)).toBe('0m 30s');
    expect(formatSecondsToMMSS(60)).toBe('1m 0s');
    expect(formatSecondsToMMSS(90)).toBe('1m 30s');
    expect(formatSecondsToMMSS(1380)).toBe('23m 0s'); // 23 minutos
    expect(formatSecondsToMMSS(900)).toBe('15m 0s'); // 15 minutos
  });
});

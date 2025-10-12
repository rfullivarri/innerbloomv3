import { describe, expect, it } from 'vitest';
import { coerceGameMode, normalizeGameModeValue } from '../gameMode';

describe('normalizeGameModeValue', () => {
  it('normalizes plain names', () => {
    expect(normalizeGameModeValue('Flow')).toBe('Flow');
    expect(normalizeGameModeValue('chill')).toBe('Chill');
    expect(normalizeGameModeValue('LOW')).toBe('Low');
    expect(normalizeGameModeValue('Evolve')).toBe('Evolve');
  });

  it('handles mood aliases', () => {
    expect(normalizeGameModeValue('Flow Mood')).toBe('Flow');
    expect(normalizeGameModeValue('flow_mood')).toBe('Flow');
    expect(normalizeGameModeValue('Chill Mood')).toBe('Chill');
    expect(normalizeGameModeValue('evolve-mood')).toBe('Evolve');
    expect(normalizeGameModeValue('low mood')).toBe('Low');
  });

  it('maps onboarding codes and ids', () => {
    expect(normalizeGameModeValue('standard')).toBe('Flow');
    expect(normalizeGameModeValue('seedling')).toBe('Flow');
    expect(normalizeGameModeValue('evol')).toBe('Evolve');
    expect(normalizeGameModeValue('2')).toBe('Chill');
    expect(normalizeGameModeValue('3')).toBe('Flow');
    expect(normalizeGameModeValue(4)).toBe('Evolve');
  });

  it('returns null for unknown values', () => {
    expect(normalizeGameModeValue(undefined)).toBeNull();
    expect(normalizeGameModeValue(null)).toBeNull();
    expect(normalizeGameModeValue('unknown')).toBeNull();
    expect(normalizeGameModeValue('')).toBeNull();
    expect(normalizeGameModeValue('   ')).toBeNull();
  });
});

describe('coerceGameMode', () => {
  it('falls back to Flow by default', () => {
    expect(coerceGameMode('unknown')).toBe('Flow');
  });

  it('accepts custom fallback', () => {
    expect(coerceGameMode(null, 'Chill')).toBe('Chill');
  });
});

import { describe, expect, it } from 'vitest';
import { buildStreakModeChipVisual } from './StreaksPanel';

describe('buildStreakModeChipVisual', () => {
  it('uses onboarding rhythm accent for FLOW', () => {
    const visual = buildStreakModeChipVisual('Flow');

    expect(visual.accent).toBe('rgb(56, 189, 248)');
    expect(visual.glowPrimary).toBe('rgba(56, 189, 248, 0.32)');
    expect(visual.glowSecondary).toBe('rgba(56, 189, 248, 0.2)');
  });

  it('maps all rhythm modes to onboarding source-of-truth accents', () => {
    expect(buildStreakModeChipVisual('Low').accent).toBe('rgb(248, 113, 113)');
    expect(buildStreakModeChipVisual('Chill').accent).toBe('rgb(74, 222, 128)');
    expect(buildStreakModeChipVisual('Flow').accent).toBe('rgb(56, 189, 248)');
    expect(buildStreakModeChipVisual('Evolve').accent).toBe('rgb(167, 139, 250)');
  });

  it('falls back safely to FLOW rhythm when mode is unavailable', () => {
    const visual = buildStreakModeChipVisual(null);
    expect(visual.accent).toBe('rgb(56, 189, 248)');
  });
});

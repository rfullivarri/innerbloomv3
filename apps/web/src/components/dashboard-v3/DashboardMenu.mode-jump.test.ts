import { describe, expect, it } from 'vitest';
import { isDemandingModeJump } from './DashboardMenu';

describe('isDemandingModeJump', () => {
  it('returns true when target mode jumps more than one step', () => {
    expect(isDemandingModeJump('Low', 'Flow')).toBe(true);
    expect(isDemandingModeJump('Low', 'Evolve')).toBe(true);
    expect(isDemandingModeJump('Chill', 'Evolve')).toBe(true);
  });

  it('returns false when target mode is adjacent or same', () => {
    expect(isDemandingModeJump('Low', 'Chill')).toBe(false);
    expect(isDemandingModeJump('Flow', 'Evolve')).toBe(false);
    expect(isDemandingModeJump('Flow', 'Flow')).toBe(false);
  });

  it('returns false when current or target mode is not defined', () => {
    expect(isDemandingModeJump(null, 'Flow')).toBe(false);
    expect(isDemandingModeJump('Flow', null)).toBe(false);
  });
});

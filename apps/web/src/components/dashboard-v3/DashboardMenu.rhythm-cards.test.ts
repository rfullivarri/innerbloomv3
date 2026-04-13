import { describe, expect, it } from 'vitest';
import { getRhythmCardContent } from './DashboardMenu';

describe('getRhythmCardContent', () => {
  it('builds intensity-led headings for all rhythm levels in English', () => {
    expect(getRhythmCardContent('Low', 'en').heading).toBe('LOW · 1x/week');
    expect(getRhythmCardContent('Chill', 'en').heading).toBe('CHILL · 2x/week');
    expect(getRhythmCardContent('Flow', 'en').heading).toBe('FLOW · 3x/week');
    expect(getRhythmCardContent('Evolve', 'en').heading).toBe('EVOLVE · 4x/week');
  });

  it('keeps rhythm card copy focused on intensity/state/objective (no avatar preview fields)', () => {
    const content = getRhythmCardContent('Flow', 'es') as Record<string, unknown>;

    expect(content.intensity).toBe('3x/semana');
    expect(content.state).toBeTypeOf('string');
    expect(content.objective).toBeTypeOf('string');
    expect(content).not.toHaveProperty('avatarSrc');
    expect(content).not.toHaveProperty('avatarAlt');
    expect(content).not.toHaveProperty('accentColor');
  });
});

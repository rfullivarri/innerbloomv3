import { describe, expect, it } from 'vitest';
import { resolveHabitAchievementSealCandidates } from '../habitAchievementSeals';

describe('resolveHabitAchievementSealCandidates', () => {
  it('maps body energy with Spanish filename candidate', () => {
    const candidates = resolveHabitAchievementSealCandidates({ pillar: 'Body', traitCode: 'ENERGY' });
    expect(candidates).toContain('/sellos/Corazón ENERGIA.png');
  });

  it('maps mind discipline and includes typo fallback for uploaded DICIPLINE', () => {
    const candidates = resolveHabitAchievementSealCandidates({ pillar: 'MIND', traitName: 'Discipline' });
    expect(candidates).toContain('/sellos/Cerebro DICIPLINE.png');
  });

  it('is resilient to spanish pillar and accented trait', () => {
    const candidates = resolveHabitAchievementSealCandidates({ pillar: 'Mente', traitCode: 'Curiosidad' });
    expect(candidates).toContain('/sellos/Cerebro CURIOCIDAD.png');
  });

  it('returns empty candidate list when pillar is missing/unknown', () => {
    const candidates = resolveHabitAchievementSealCandidates({ pillar: 'Unknown', traitCode: 'ENERGY' });
    expect(candidates).toEqual([]);
  });
});

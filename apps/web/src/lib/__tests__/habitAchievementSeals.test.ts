import { describe, expect, it } from 'vitest';
import { resolveHabitAchievementSealCandidates } from '../habitAchievementSeals';

describe('resolveHabitAchievementSealCandidates', () => {
  it('maps body energy with Spanish filename candidate', () => {
    const candidates = resolveHabitAchievementSealCandidates({ pillar: 'Body', traitCode: 'ENERGY' });
    expect(candidates[0]).toBe('/sellos/body/sello_body_energy.png');
    expect(candidates).toContain('/sellos/Corazón ENERGIA.png');
  });

  it('maps Spanish body hydration to the new body seal asset first', () => {
    const candidates = resolveHabitAchievementSealCandidates({ pillar: 'Body', traitCode: 'HIDRATACION' });
    expect(candidates[0]).toBe('/sellos/body/sello_body_hydration.png');
  });

  it('maps legacy resistance to the endurance seal asset', () => {
    const candidates = resolveHabitAchievementSealCandidates({ pillar: 'Body', traitCode: 'RESISTANCE' });
    expect(candidates[0]).toBe('/sellos/body/sello_body_endurance.png');
    expect(candidates).toContain('/sellos/Corazón RESISTENCIA.png');
  });

  it('maps body movement to the movement seal asset', () => {
    const candidates = resolveHabitAchievementSealCandidates({ pillar: 'Body', traitCode: 'MOVEMENT' });
    expect(candidates[0]).toBe('/sellos/body/sello_body_movement.png');
  });

  it('maps mind discipline and includes typo fallback for uploaded DICIPLINE', () => {
    const candidates = resolveHabitAchievementSealCandidates({ pillar: 'MIND', traitName: 'Discipline' });
    expect(candidates).toContain('/sellos/Cerebro DICIPLINE.png');
  });

  it.each([
    ['APRENDIZAJE', '/sellos/mind/sello_mind_learning.png'],
    ['CREATIVIDAD', '/sellos/mind/sello_mind_creativity.png'],
    ['GESTION', '/sellos/mind/sello_mind_management.png'],
    ['AUTOCONTROL', '/sellos/mind/sello_mind_self_control.png'],
    ['PROYECCION', '/sellos/mind/sello_mind_projection.png'],
    ['FINANZAS', '/sellos/mind/sello_mind_finances.png'],
    ['AGILIDAD', '/sellos/mind/sello_mind_agility.png'],
  ])('maps mind %s to the new mind seal asset first', (traitCode, expectedPath) => {
    const candidates = resolveHabitAchievementSealCandidates({ pillar: 'MIND', traitCode });
    expect(candidates[0]).toBe(expectedPath);
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

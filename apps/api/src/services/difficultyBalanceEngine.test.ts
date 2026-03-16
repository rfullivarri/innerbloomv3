import { describe, expect, it } from 'vitest';
import {
  assignBalancedDifficultiesByPillar,
  buildDifficultyBalancePlan,
} from './difficultyBalanceEngine.js';

describe('difficultyBalanceEngine', () => {
  it('builds LOW plan for small inputs', () => {
    const plan = buildDifficultyBalancePlan({ gameMode: 'LOW', nBody: 1, nMind: 1, nSoul: 1 });

    expect(plan.BODY.EASY + plan.BODY.MEDIUM + plan.BODY.HARD).toBe(1);
    expect(plan.MIND.EASY + plan.MIND.MEDIUM + plan.MIND.HARD).toBe(1);
    expect(plan.SOUL.EASY + plan.SOUL.MEDIUM + plan.SOUL.HARD).toBe(1);
  });

  it('allows more HARD in CHILL than LOW for same setup', () => {
    const lowPlan = buildDifficultyBalancePlan({ gameMode: 'LOW', nBody: 4, nMind: 2, nSoul: 3 });
    const chillPlan = buildDifficultyBalancePlan({ gameMode: 'CHILL', nBody: 4, nMind: 2, nSoul: 3 });

    const lowHard = lowPlan.BODY.HARD + lowPlan.MIND.HARD + lowPlan.SOUL.HARD;
    const chillHard = chillPlan.BODY.HARD + chillPlan.MIND.HARD + chillPlan.SOUL.HARD;

    expect(chillHard).toBeGreaterThanOrEqual(lowHard);
  });

  it('enforces FLOW base minimum by pillar when pillar has at least 3 tasks', () => {
    const plan = buildDifficultyBalancePlan({ gameMode: 'FLOW', nBody: 3, nMind: 3, nSoul: 3 });

    expect(plan.BODY).toEqual({ EASY: 1, MEDIUM: 1, HARD: 1 });
    expect(plan.MIND).toEqual({ EASY: 1, MEDIUM: 1, HARD: 1 });
    expect(plan.SOUL).toEqual({ EASY: 1, MEDIUM: 1, HARD: 1 });
  });

  it('favors more HARD in EVOLVE than FLOW on extras', () => {
    const flowPlan = buildDifficultyBalancePlan({ gameMode: 'FLOW', nBody: 4, nMind: 4, nSoul: 4 });
    const evolvePlan = buildDifficultyBalancePlan({ gameMode: 'EVOLVE', nBody: 4, nMind: 4, nSoul: 4 });

    const flowHard = flowPlan.BODY.HARD + flowPlan.MIND.HARD + flowPlan.SOUL.HARD;
    const evolveHard = evolvePlan.BODY.HARD + evolvePlan.MIND.HARD + evolvePlan.SOUL.HARD;

    expect(evolveHard).toBeGreaterThan(flowHard);
  });

  it('handles non-balanced user selections', () => {
    const planA = buildDifficultyBalancePlan({ gameMode: 'CHILL', nBody: 4, nMind: 2, nSoul: 3 });
    const planB = buildDifficultyBalancePlan({ gameMode: 'CHILL', nBody: 2, nMind: 5, nSoul: 1 });

    expect(planA.BODY.EASY + planA.BODY.MEDIUM + planA.BODY.HARD).toBe(4);
    expect(planA.MIND.EASY + planA.MIND.MEDIUM + planA.MIND.HARD).toBe(2);
    expect(planA.SOUL.EASY + planA.SOUL.MEDIUM + planA.SOUL.HARD).toBe(3);

    expect(planB.BODY.EASY + planB.BODY.MEDIUM + planB.BODY.HARD).toBe(2);
    expect(planB.MIND.EASY + planB.MIND.MEDIUM + planB.MIND.HARD).toBe(5);
    expect(planB.SOUL.EASY + planB.SOUL.MEDIUM + planB.SOUL.HARD).toBe(1);
  });

  it('assigns randomized but count-respecting difficulty_code per pillar', () => {
    const tasks = [
      { id: 'b1', pillar_code: 'BODY' },
      { id: 'b2', pillar_code: 'BODY' },
      { id: 'b3', pillar_code: 'BODY' },
      { id: 'm1', pillar_code: 'MIND' },
      { id: 'm2', pillar_code: 'MIND' },
      { id: 'm3', pillar_code: 'MIND' },
      { id: 's1', pillar_code: 'SOUL' },
      { id: 's2', pillar_code: 'SOUL' },
      { id: 's3', pillar_code: 'SOUL' },
    ] as const;

    const assigned = assignBalancedDifficultiesByPillar({ tasks, gameMode: 'FLOW', seed: 'seed-a' });
    const flowPlan = buildDifficultyBalancePlan({ gameMode: 'FLOW', nBody: 3, nMind: 3, nSoul: 3 });

    const byPillar = assigned.reduce<Record<string, Record<string, number>>>((acc, task) => {
      acc[task.pillar_code] ??= { EASY: 0, MEDIUM: 0, HARD: 0 };
      acc[task.pillar_code]![task.difficulty_code] += 1;
      return acc;
    }, {});

    expect(byPillar.BODY).toEqual(flowPlan.BODY);
    expect(byPillar.MIND).toEqual(flowPlan.MIND);
    expect(byPillar.SOUL).toEqual(flowPlan.SOUL);

    const assignedWithOtherSeed = assignBalancedDifficultiesByPillar({ tasks, gameMode: 'FLOW', seed: 'seed-b' });
    expect(assigned.map((task) => `${task.id}:${task.difficulty_code}`)).not.toEqual(
      assignedWithOtherSeed.map((task) => `${task.id}:${task.difficulty_code}`),
    );
  });
});

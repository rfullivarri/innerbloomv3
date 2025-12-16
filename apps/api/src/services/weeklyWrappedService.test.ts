import { describe, expect, it } from 'vitest';
import { computeEffortBalance, getDifficultyBucket, type WeeklyWrappedLog } from './weeklyWrappedService.js';

const baseLog: WeeklyWrappedLog = {
  date: '2024-10-10',
  week: '2024-W41',
  pillar: 'Body',
  trait: 'Energy',
  stat: null,
  taskId: 'task-1',
  taskName: 'Base Task',
  difficulty: 'Easy',
  xp: 20,
  state: 'green',
  timesInRange: 1,
  source: 'form',
  notes: null,
  parsedDate: new Date('2024-10-10T00:00:00Z'),
  dateKey: '2024-10-10',
  quantity: 1,
};

function buildLog(overrides: Partial<WeeklyWrappedLog>): WeeklyWrappedLog {
  const hasDifficultyOverride = Object.prototype.hasOwnProperty.call(overrides, 'difficulty');
  return {
    ...baseLog,
    ...overrides,
    parsedDate: overrides.parsedDate ?? baseLog.parsedDate,
    dateKey: overrides.dateKey ?? baseLog.dateKey,
    quantity: overrides.quantity ?? 1,
    taskId: overrides.taskId ?? overrides.taskName ?? baseLog.taskId,
    taskName: overrides.taskName ?? overrides.taskId ?? baseLog.taskName,
    difficulty: hasDifficultyOverride
      ? (overrides.difficulty as unknown as string | null)
      : baseLog.difficulty,
    state: overrides.state ?? baseLog.state,
  };
}

describe('getDifficultyBucket', () => {
  it('maps different labels to buckets without defaulting to hard', () => {
    expect(getDifficultyBucket('Easy')).toBe('easy');
    expect(getDifficultyBucket('media')).toBe('medium');
    expect(getDifficultyBucket('Difícil')).toBe('hard');
    expect(getDifficultyBucket(undefined)).toBe('unknown');
    expect(getDifficultyBucket('other')).toBe('unknown');
  });
});

describe('computeEffortBalance', () => {
  it('aggregates completions by difficulty and surfaces top tasks', () => {
    const result = computeEffortBalance([
      buildLog({ taskId: 't-easy', taskName: 'Respiración', difficulty: 'Easy', quantity: 2 }),
      buildLog({ taskId: 't-medium', taskName: 'Lectura', difficulty: 'Medium', quantity: 1 }),
      buildLog({ taskId: 't-hard', taskName: 'Fuerza', difficulty: 'Hard', quantity: 3 }),
    ]);

    expect(result.total).toBe(6);
    expect(result.easy).toBe(2);
    expect(result.medium).toBe(1);
    expect(result.hard).toBe(3);
    expect(result.topTask?.title).toBe('Fuerza');
    expect(result.topTask?.difficulty).toBe('hard');
    expect(result.topHardTask?.title).toBe('Fuerza');
    expect(result.warnings).toEqual([]);
  });

  it('ignores unknown difficulties and red states without inflating hard bucket', () => {
    const result = computeEffortBalance([
      buildLog({ taskId: 'unknown-1', difficulty: null, quantity: 2 }),
      buildLog({ taskId: 'unknown-2', difficulty: '', quantity: 1 }),
      buildLog({ taskId: 'ignored', difficulty: 'Hard', quantity: 5, state: 'red' }),
    ]);

    expect(result.total).toBe(0);
    expect(result.unknown).toBe(3);
    expect(result.hard).toBe(0);
    expect(result.warnings).toEqual([]);
  });

  it('emits a warning when hard captures the entire sample with volume', () => {
    const result = computeEffortBalance([
      buildLog({ taskId: 'only-hard', difficulty: 'Hard', quantity: 4 }),
    ]);

    expect(result.total).toBe(4);
    expect(result.hard).toBe(4);
    expect(result.warnings).toContain('hard_bucket_full_share');
  });
});

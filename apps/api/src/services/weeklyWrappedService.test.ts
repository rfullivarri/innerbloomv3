import { describe, expect, it } from 'vitest';
import {
  computeEffortBalance,
  computeEnergyHighlight,
  getDifficultyBucket,
  type WeeklyWrappedLog,
} from './weeklyWrappedService.js';

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

describe('computeEnergyHighlight', () => {
  it('persists daily HP, Mood and Focus series for the weekly story chart', () => {
    const result = computeEnergyHighlight(
      {
        constancyWeekly: { body: 20, mind: 40, soul: 60 },
      } as Awaited<ReturnType<typeof import('../modules/admin/admin.service.js').getUserInsights>>,
      'Mind',
      {
        user_id: 'user-1',
        hp_pct: 66,
        mood_pct: 72,
        focus_pct: 84,
        hp_norm: 0.66,
        mood_norm: 0.72,
        focus_norm: 0.84,
        trend: {
          currentDate: '2024-10-13',
          previousDate: '2024-10-06',
          hasHistory: true,
          pillars: {
            Body: { current: 66, previous: 60, deltaPct: 10 },
            Mind: { current: 84, previous: 70, deltaPct: 21 },
            Soul: { current: 72, previous: 90, deltaPct: -20 },
          },
        },
      },
      [
        { date: '2024-10-07', Body: 60, Mind: 70, Soul: 90 },
        { date: '2024-10-08', Body: 61, Mind: 72, Soul: 86 },
        { date: '2024-10-09', Body: 63, Mind: 75, Soul: 82 },
        { date: '2024-10-10', Body: 64, Mind: 78, Soul: 79 },
        { date: '2024-10-11', Body: 65, Mind: 80, Soul: 76 },
        { date: '2024-10-12', Body: 65, Mind: 82, Soul: 74 },
        { date: '2024-10-13', Body: 66, Mind: 84, Soul: 72 },
      ],
    );

    expect(result?.metric).toBe('FOCUS');
    expect(result?.metrics).toHaveLength(3);
    expect(result?.metrics?.map((metric) => metric.metric)).toEqual(['HP', 'MOOD', 'FOCUS']);
    expect(result?.metrics?.find((metric) => metric.metric === 'FOCUS')?.points).toEqual([70, 72, 75, 78, 80, 82, 84]);
    expect(result?.metrics?.find((metric) => metric.metric === 'MOOD')?.deltaPct).toBe(-20);
  });
});

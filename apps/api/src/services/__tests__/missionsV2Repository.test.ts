import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { newDb } from 'pg-mem';
import type { Pool } from 'pg';
import { FileMissionsRepository, SqlMissionsRepository, createMissionsRepository } from '../missionsV2Repository.js';
import type { MissionsBoardState } from '../missionsV2Types.js';

describe('SqlMissionsRepository', () => {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  const { Pool: PgMemPoolCtor } = db.adapters.createPg();
  const pool = new PgMemPoolCtor();
  const sqlRepo = new SqlMissionsRepository(pool as unknown as Pool);

  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE missions_v2_state (
        user_id uuid PRIMARY KEY,
        state jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE missions_v2_state;');
  });

  afterAll(async () => {
    await pool.end();
  });

  function createState(userId: string): MissionsBoardState {
    return {
      board: {
        userId,
        seasonId: '2025-Q1',
        generatedAt: '2025-01-01T00:00:00.000Z',
        slots: [
          {
            slot: 'main',
            proposals: [],
            selected: {
              mission: {
                id: 'mission-main',
                slot: 'main',
                name: 'Main Mission',
                summary: 'Complete main objective',
                requirements: 'Be awesome',
                objective: 'Ship feature',
                reward: { xp: 300, currency: 25, items: ['Aura'] },
                tasks: [
                  { id: 'task-1', name: 'Do work', tag: 'focus' },
                  { id: 'task-2', name: 'Deliver proof', tag: 'proof' },
                ],
                difficulty: 'medium',
                metadata: { cadence: 'biweekly' },
                durationDays: 14,
              },
              status: 'active',
              selectedAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-02T00:00:00.000Z',
              expiresAt: '2025-01-15T00:00:00.000Z',
              cooldownUntil: null,
              progress: {
                current: 2,
                target: 5,
                unit: 'tasks',
                updatedAt: '2025-01-02T00:00:00.000Z',
              },
              petals: {
                total: 3,
                remaining: 2,
                lastEvaluatedAt: '2025-01-02',
              },
              heartbeatLog: ['2025-01-01T12:00:00.000Z', '2025-01-02T12:00:00.000Z'],
            },
            reroll: { usedAt: null, nextResetAt: null, remaining: 1, total: 1 },
            cooldownUntil: null,
          },
          {
            slot: 'hunt',
            proposals: [],
            selected: null,
            reroll: { usedAt: null, nextResetAt: null, remaining: 1, total: 1 },
            cooldownUntil: null,
          },
          {
            slot: 'skill',
            proposals: [],
            selected: null,
            reroll: { usedAt: null, nextResetAt: null, remaining: 1, total: 1 },
            cooldownUntil: null,
          },
        ],
        boss: {
          phase: 1,
          shield: { current: 6, max: 6, updatedAt: '2025-01-02T00:00:00.000Z' },
          linkedDailyTaskId: null,
          linkedAt: null,
          phase2: { ready: false, proof: null, submittedAt: null },
        },
      },
      booster: { multiplier: 1.5, targetTaskId: null, appliedKeys: [], nextActivationDate: null },
      effects: [],
    };
  }

  it('returns null when no state exists for the user', async () => {
    const loaded = await sqlRepo.load('00000000-0000-0000-0000-000000000001');
    expect(loaded).toBeNull();
  });

  it('persists and retrieves a deep-cloned state', async () => {
    const userId = '00000000-0000-0000-0000-000000000002';
    const state = createState(userId);

    await sqlRepo.save(userId, state);

    const loaded = await sqlRepo.load(userId);
    expect(loaded).toEqual(state);

    if (loaded) {
      loaded.board.slots[0].reroll.remaining = 0;
    }

    const loadedAgain = await sqlRepo.load(userId);
    expect(loadedAgain).toEqual(state);
  });

  it('deletes a stored state', async () => {
    const userId = '00000000-0000-0000-0000-000000000003';
    await sqlRepo.save(userId, createState(userId));

    await sqlRepo.delete(userId);

    const loaded = await sqlRepo.load(userId);
    expect(loaded).toBeNull();
  });

  it('clears all stored states', async () => {
    const firstUser = '00000000-0000-0000-0000-000000000004';
    const secondUser = '00000000-0000-0000-0000-000000000005';

    await sqlRepo.save(firstUser, createState(firstUser));
    await sqlRepo.save(secondUser, createState(secondUser));

    await sqlRepo.clear();

    expect(await sqlRepo.load(firstUser)).toBeNull();
    expect(await sqlRepo.load(secondUser)).toBeNull();
  });

  it('can be selected through createMissionsRepository using SQL', () => {
    const repo = createMissionsRepository('SQL', { pool: pool as unknown as Pool });
    expect(repo).toBeInstanceOf(SqlMissionsRepository);
  });

  it('defaults to the file repository when no env is provided', () => {
    const repo = createMissionsRepository(undefined, { pool: pool as unknown as Pool });
    expect(repo).toBeInstanceOf(FileMissionsRepository);
  });
});

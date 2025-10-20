import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import type { Pool } from 'pg';
import type { MissionsBoardState } from './missionsV2Types.js';

export interface MissionsRepository {
  load(userId: string): Promise<MissionsBoardState | null>;
  save(userId: string, state: MissionsBoardState): Promise<void>;
  delete(userId: string): Promise<void>;
  clear(): Promise<void>;
}

const DATA_DIR_URL = new URL('../../data/', import.meta.url);
const DATA_FILE_URL = new URL('missions_v2_store.json', DATA_DIR_URL);
const DATA_DIR_PATH = fileURLToPath(DATA_DIR_URL);
const DATA_FILE_PATH = fileURLToPath(DATA_FILE_URL);

function cloneState(state: MissionsBoardState): MissionsBoardState {
  return JSON.parse(JSON.stringify(state)) as MissionsBoardState;
}

class FileMissionsRepository implements MissionsRepository {
  private cache: { loaded: boolean; data: Record<string, MissionsBoardState> } = {
    loaded: false,
    data: {},
  };

  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(DATA_DIR_PATH, { recursive: true });
  }

  private async readStore(): Promise<Record<string, MissionsBoardState>> {
    if (this.cache.loaded) {
      return this.cache.data;
    }

    try {
      const raw = await fs.readFile(DATA_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, MissionsBoardState>;
      this.cache = { loaded: true, data: parsed };
      return this.cache.data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.cache = { loaded: true, data: {} };
        return this.cache.data;
      }
      throw error;
    }
  }

  private async writeStore(store: Record<string, MissionsBoardState>): Promise<void> {
    this.cache = { loaded: true, data: store };
    await this.ensureDirectory();
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(store, null, 2), 'utf8');
  }

  async load(userId: string): Promise<MissionsBoardState | null> {
    const store = await this.readStore();
    const state = store[userId];
    return state ? cloneState(state) : null;
  }

  async save(userId: string, state: MissionsBoardState): Promise<void> {
    const store = await this.readStore();
    store[userId] = cloneState(state);
    await this.writeStore(store);
  }

  async delete(userId: string): Promise<void> {
    const store = await this.readStore();
    if (userId in store) {
      delete store[userId];
      await this.writeStore(store);
    }
  }

  async clear(): Promise<void> {
    this.cache = { loaded: true, data: {} };
    await this.ensureDirectory();
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify({}, null, 2), 'utf8');
  }
}

class SqlMissionsRepository implements MissionsRepository {
  private static readonly TABLE_NAME = 'missions_v2_state';
  private readonly poolPromise: Promise<Pool>;

  constructor(pool?: Pool) {
    if (pool) {
      this.poolPromise = Promise.resolve(pool);
    } else {
      this.poolPromise = import('../db.js').then((module) => module.pool);
    }
  }

  private async resolvePool(): Promise<Pool> {
    return this.poolPromise;
  }

  private static normalizeState(value: unknown): MissionsBoardState {
    const raw = typeof value === 'string' ? (JSON.parse(value) as MissionsBoardState) : (value as MissionsBoardState);
    return cloneState(raw);
  }

  async load(userId: string): Promise<MissionsBoardState | null> {
    const pool = await this.resolvePool();
    const result = await pool.query<{ state: unknown }>(
      `SELECT state FROM ${SqlMissionsRepository.TABLE_NAME} WHERE user_id = $1 LIMIT 1;`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return SqlMissionsRepository.normalizeState(row.state);
  }

  async save(userId: string, state: MissionsBoardState): Promise<void> {
    const pool = await this.resolvePool();
    const snapshot = cloneState(state);
    await pool.query(
      `
        INSERT INTO ${SqlMissionsRepository.TABLE_NAME} (user_id, state, updated_at)
        VALUES ($1, $2::jsonb, now())
        ON CONFLICT (user_id)
        DO UPDATE SET state = EXCLUDED.state, updated_at = EXCLUDED.updated_at;
      `,
      [userId, JSON.stringify(snapshot)],
    );
  }

  async delete(userId: string): Promise<void> {
    const pool = await this.resolvePool();
    await pool.query(`DELETE FROM ${SqlMissionsRepository.TABLE_NAME} WHERE user_id = $1;`, [userId]);
  }

  async clear(): Promise<void> {
    const pool = await this.resolvePool();
    await pool.query(`TRUNCATE ${SqlMissionsRepository.TABLE_NAME};`);
  }
}

function createMissionsRepository(kind: string | undefined = process.env.MISSIONS_REPO, options?: { pool?: Pool }): MissionsRepository {
  const repoKind = (kind ?? 'FILE').toUpperCase();
  if (repoKind === 'SQL') {
    return new SqlMissionsRepository(options?.pool);
  }
  return new FileMissionsRepository();
}

const repository = createMissionsRepository();

export async function loadMissionsV2State(userId: string): Promise<MissionsBoardState | null> {
  return repository.load(userId);
}

export async function saveMissionsV2State(userId: string, state: MissionsBoardState): Promise<void> {
  await repository.save(userId, state);
}

export async function deleteMissionsV2State(userId: string): Promise<void> {
  await repository.delete(userId);
}

export async function clearMissionsV2States(): Promise<void> {
  await repository.clear();
}

export function getMissionsV2DataFilePath(): string {
  return DATA_FILE_PATH;
}

export { FileMissionsRepository, SqlMissionsRepository, createMissionsRepository };

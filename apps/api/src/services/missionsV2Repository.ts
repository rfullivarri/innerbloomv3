import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
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
  async load(_userId: string): Promise<MissionsBoardState | null> {
    throw new Error('SqlMissionsRepository.load is not implemented yet');
  }

  async save(_userId: string, _state: MissionsBoardState): Promise<void> {
    throw new Error('SqlMissionsRepository.save is not implemented yet');
  }

  async delete(_userId: string): Promise<void> {
    throw new Error('SqlMissionsRepository.delete is not implemented yet');
  }

  async clear(): Promise<void> {
    throw new Error('SqlMissionsRepository.clear is not implemented yet');
  }
}

function createRepository(): MissionsRepository {
  const repoKind = (process.env.MISSIONS_REPO ?? 'FILE').toUpperCase();
  if (repoKind === 'SQL') {
    return new SqlMissionsRepository();
  }
  return new FileMissionsRepository();
}

const repository = createRepository();

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

export { FileMissionsRepository, SqlMissionsRepository };

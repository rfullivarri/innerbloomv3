import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import type { MissionsBoardState } from './missionsV2Types.js';

const DATA_DIR_URL = new URL('../../data/', import.meta.url);
const DATA_FILE_URL = new URL('missions-v2.json', DATA_DIR_URL);
const DATA_DIR_PATH = fileURLToPath(DATA_DIR_URL);
const DATA_FILE_PATH = fileURLToPath(DATA_FILE_URL);

let cache: {
  loaded: boolean;
  data: Record<string, MissionsBoardState>;
} = {
  loaded: false,
  data: {},
};

async function ensureDirectory(): Promise<void> {
  await fs.mkdir(DATA_DIR_PATH, { recursive: true });
}

function cloneState(state: MissionsBoardState): MissionsBoardState {
  return JSON.parse(JSON.stringify(state)) as MissionsBoardState;
}

async function readStore(): Promise<Record<string, MissionsBoardState>> {
  if (cache.loaded) {
    return cache.data;
  }

  try {
    const raw = await fs.readFile(DATA_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, MissionsBoardState>;
    cache = { loaded: true, data: parsed };
    return cache.data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      cache = { loaded: true, data: {} };
      return cache.data;
    }
    throw error;
  }
}

async function writeStore(store: Record<string, MissionsBoardState>): Promise<void> {
  cache = { loaded: true, data: store };
  await ensureDirectory();
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export async function loadMissionsV2State(userId: string): Promise<MissionsBoardState | null> {
  const store = await readStore();
  const state = store[userId];
  if (!state) {
    return null;
  }
  return cloneState(state);
}

export async function saveMissionsV2State(userId: string, state: MissionsBoardState): Promise<void> {
  const store = await readStore();
  store[userId] = cloneState(state);
  await writeStore(store);
}

export async function deleteMissionsV2State(userId: string): Promise<void> {
  const store = await readStore();
  if (userId in store) {
    delete store[userId];
    await writeStore(store);
  }
}

export async function clearMissionsV2States(): Promise<void> {
  cache = { loaded: true, data: {} };
  await ensureDirectory();
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify({}, null, 2), 'utf8');
}

export function getMissionsV2DataFilePath(): string {
  return DATA_FILE_PATH;
}

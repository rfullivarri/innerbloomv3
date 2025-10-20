import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'apps/api/data');
const DATA_FILE = path.join(DATA_DIR, 'missions-v2.json');

export type PersistedMissionAction = {
  id: string;
  type: string;
  label: string;
  enabled: boolean;
};

export type PersistedMissionTask = {
  id: string;
  name: string;
  tag: string;
};

export type PersistedMission = {
  id: string;
  name: string;
  type: 'main' | 'hunt' | 'skill';
  summary: string;
  requirements: string;
  objective: string;
  reward: {
    xp: number;
    currency?: number;
    items?: string[];
  };
  tasks: PersistedMissionTask[];
};

export type PersistedMissionSlot = {
  id: string;
  slot: 'main' | 'hunt' | 'skill';
  mission: PersistedMission;
  state: 'idle' | 'active' | 'succeeded' | 'failed' | 'cooldown' | 'claimed';
  petals: {
    total: number;
    remaining: number;
  };
  heartbeat_today: boolean;
  progress: {
    current: number;
    target: number;
    percent: number;
  };
  countdown: {
    ends_at: string | null;
    label: string;
  };
  actions: PersistedMissionAction[];
  claim: {
    available: boolean;
    enabled: boolean;
    cooldown_until: string | null;
  };
};

export type PersistedBoss = {
  id: string;
  name: string;
  status: 'locked' | 'available' | 'ready' | 'defeated';
  description: string;
  countdown: {
    ends_at: string | null;
    label: string;
  };
  actions: PersistedMissionAction[];
};

export type PersistedCommunication = {
  id: string;
  type: 'daily' | 'weekly' | 'biweekly' | 'seasonal';
  message: string;
};

export type PersistedBoard = {
  season_id: string;
  generated_at: string;
  slots: PersistedMissionSlot[];
  boss: PersistedBoss;
  gating: {
    claim_url: string;
  };
  communications: PersistedCommunication[];
};

type PersistedStore = {
  version: number;
  boards: Record<string, PersistedBoard>;
};

let cache: PersistedStore | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function ensureDataFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, 'utf8');
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      const initial: PersistedStore = { version: 1, boards: {} };
      await writeFile(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
      cache = initial;
      return;
    }
    throw error;
  }
}

async function loadStore(): Promise<PersistedStore> {
  if (cache) {
    return cache;
  }

  await ensureDataFile();

  const raw = await readFile(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw) as PersistedStore;
  if (!parsed.version) {
    parsed.version = 1;
  }
  if (!parsed.boards) {
    parsed.boards = {};
  }
  cache = parsed;
  return parsed;
}

async function persistStore(store: PersistedStore): Promise<void> {
  cache = store;
  await enqueueWrite(async () => {
    await writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
  });
}

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(task, task);
  return writeQueue.catch(() => undefined);
}

export async function getPersistedBoard(userId: string): Promise<PersistedBoard | null> {
  const store = await loadStore();
  return store.boards[userId] ?? null;
}

export async function savePersistedBoard(userId: string, board: PersistedBoard): Promise<void> {
  const store = await loadStore();
  store.boards[userId] = board;
  await persistStore(store);
}

export async function deletePersistedBoard(userId: string): Promise<void> {
  const store = await loadStore();
  if (userId in store.boards) {
    delete store.boards[userId];
    await persistStore(store);
  }
}

export async function resetPersistedBoards(): Promise<void> {
  const store: PersistedStore = { version: 1, boards: {} };
  await persistStore(store);
}

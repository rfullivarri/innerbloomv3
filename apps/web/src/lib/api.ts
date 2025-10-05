const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export const API_BASE = rawBaseUrl.replace(/\/+$/, '');

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.debug('[api] VITE_API_BASE_URL', API_BASE || '(not set)');
}

function ensureBase(): string {
  if (!API_BASE) {
    const message = 'API base URL is not configured. Set VITE_API_BASE_URL to continue.';
    // eslint-disable-next-line no-console
    console.error(message);
    throw new Error(message);
  }
  return API_BASE;
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const base = ensureBase();
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(normalizedPath, `${base}/`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function getJson<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const response = await fetch(buildUrl(path, params), {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Request failed with ${response.status}: ${text || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export type ProgressSummary = {
  userId: string;
  totalXp: number;
  level: number;
  nextLevelXp?: number;
  xpIntoLevel?: number;
  xpToNextLevel?: number;
  nextLevelLabel?: string;
};

export async function getProgress(userId: string): Promise<ProgressSummary> {
  return getJson<ProgressSummary>(`/users/${encodeURIComponent(userId)}/progress`);
}

export type Task = {
  id: string;
  title: string;
  description?: string;
  xp?: number;
  difficulty?: string;
  pillarId?: string;
  trait?: string;
  dueAt?: string;
  status?: 'pending' | 'completed' | 'skipped' | string;
};

export async function getTasks(userId: string): Promise<Task[]> {
  return getJson<Task[]>(`/users/${encodeURIComponent(userId)}/tasks`);
}

export type TaskLog = {
  id: string;
  taskId: string;
  taskTitle: string;
  completedAt?: string;
  doneAt?: string;
  xpAwarded?: number;
  pillar?: string;
  mode?: string;
};

export async function getTaskLogs(userId: string, params: { limit?: number } = {}): Promise<TaskLog[]> {
  return getJson<TaskLog[]>(`/users/${encodeURIComponent(userId)}/task-logs`, params);
}

export type StreakSummary = {
  userId: string;
  current: number;
  longest: number;
  updatedAt?: string;
};

export async function getStreaks(userId: string): Promise<StreakSummary> {
  return getJson<StreakSummary>(`/users/${encodeURIComponent(userId)}/streaks`);
}

export type EmotionSnapshot = {
  date: string;
  mood?: string;
  intensity?: number;
  score?: number;
  value?: number;
  note?: string;
};

export async function getEmotions(userId: string, params: { days?: number } = {}): Promise<EmotionSnapshot[]> {
  return getJson<EmotionSnapshot[]>(`/users/${encodeURIComponent(userId)}/emotions`, params);
}

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  totalXp: number;
  rank: number;
};

export async function getLeaderboard(params: { limit?: number; offset?: number } = {}): Promise<LeaderboardEntry[]> {
  return getJson<LeaderboardEntry[]>('/leaderboard', params);
}

export type Pillar = {
  id: string;
  name: string;
  description?: string;
  score?: number;
  progress?: number;
  totalXp?: number;
  xp?: number;
  focusAreas?: string[];
};

export async function getPillars(): Promise<Pillar[]> {
  return getJson<Pillar[]>('/pillars');
}

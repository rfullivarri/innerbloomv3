const RAW_API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? '').trim();
export const API_BASE = RAW_API_BASE_URL.replace(/\/+$/, '');

function ensureBase(): string {
  if (!API_BASE) {
    throw new Error('API base URL is not configured. Set VITE_API_BASE_URL (or legacy VITE_API_URL) to continue.');
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

export type UserTask = {
  task_id: string;
  task: string;
  pillar_id: string | null;
  trait_id: string | null;
  difficulty_id: string | null;
  xp_base: number;
  active: boolean;
};

type UserTasksResponse = {
  limit: number;
  offset: number;
  tasks: UserTask[];
};

export async function getTasks(userId: string): Promise<UserTask[]> {
  const response = await getJson<UserTasksResponse>(`/users/${encodeURIComponent(userId)}/tasks`);
  return response.tasks ?? [];
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

type EmotionLogResponse = {
  from: string;
  to: string;
  emotions: Array<{ date: string; emotion_id: string | null }>;
};

const EMOTION_LABELS: Record<string, string> = {
  calm: 'Calma',
  calma: 'Calma',
  happiness: 'Felicidad',
  happy: 'Felicidad',
  felicidad: 'Felicidad',
  motivation: 'Motivación',
  motivacion: 'Motivación',
  motivated: 'Motivación',
  sadness: 'Tristeza',
  triste: 'Tristeza',
  ansiedad: 'Ansiedad',
  anxiety: 'Ansiedad',
  frustration: 'Frustración',
  frustracion: 'Frustración',
  tiredness: 'Cansancio',
  cansancio: 'Cansancio',
};

export async function getEmotions(userId: string, params: { days?: number } = {}): Promise<EmotionSnapshot[]> {
  const response = await getJson<EmotionLogResponse>(`/users/${encodeURIComponent(userId)}/emotions`, params);

  return response.emotions.map((entry) => ({
    date: entry.date,
    mood: EMOTION_LABELS[String(entry.emotion_id ?? '').toLowerCase()] || entry.emotion_id || undefined,
  }));
}

export type UserState = {
  date: string;
  mode: string;
  weekly_target: number;
  grace: {
    applied: boolean;
    unique_days: number;
  };
  pillars: {
    Body: {
      hp?: number;
      xp_today: number;
      xp_obj_day: number;
    };
    Mind: {
      focus?: number;
      xp_today: number;
      xp_obj_day: number;
    };
    Soul: {
      mood?: number;
      xp_today: number;
      xp_obj_day: number;
    };
  };
};

export async function getUserState(userId: string): Promise<UserState> {
  return getJson<UserState>(`/users/${encodeURIComponent(userId)}/state`);
}

export type EnergyTimeseriesPoint = {
  date: string;
  Body: number;
  Mind: number;
  Soul: number;
};

export async function getUserStateTimeseries(
  userId: string,
  params: { from: string; to: string },
): Promise<EnergyTimeseriesPoint[]> {
  return getJson<EnergyTimeseriesPoint[]>(`/users/${encodeURIComponent(userId)}/state/timeseries`, params);
}

export type DailyXpPoint = {
  date: string;
  xp_day: number;
};

export type DailyXpResponse = {
  from: string;
  to: string;
  series: DailyXpPoint[];
};

export async function getUserDailyXp(
  userId: string,
  params: { from?: string; to?: string } = {},
): Promise<DailyXpResponse> {
  return getJson<DailyXpResponse>(`/users/${encodeURIComponent(userId)}/xp/daily`, params);
}

export type UserLevelResponse = {
  user_id: string;
  current_level: number;
  xp_total: number;
  xp_required_current: number;
  xp_required_next: number | null;
  xp_to_next: number | null;
  progress_percent: number;
};

export async function getUserLevel(userId: string): Promise<UserLevelResponse> {
  return getJson<UserLevelResponse>(`/users/${encodeURIComponent(userId)}/level`);
}

export type UserTotalXpResponse = {
  total_xp: number;
};

export async function getUserTotalXp(userId: string): Promise<UserTotalXpResponse> {
  return getJson<UserTotalXpResponse>(`/users/${encodeURIComponent(userId)}/xp/total`);
}

export type UserJourneySummary = {
  first_date_log: string | null;
  days_of_journey: number;
  quantity_daily_logs: number;
};

export async function getUserJourney(userId: string): Promise<UserJourneySummary> {
  return getJson<UserJourneySummary>(`/users/${encodeURIComponent(userId)}/journey`);
}

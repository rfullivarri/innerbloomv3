export type AdminUser = {
  id: string;
  email: string | null;
  name?: string | null;
  gameMode?: string | null;
  createdAt: string;
};

export type AdminInsights = {
  profile: {
    id: string;
    email: string | null;
    name?: string | null;
    gameMode?: string | null;
    createdAt: string;
  };
  level: { level: number; xpCurrent: number; xpToNext: number };
  xp: {
    total: number;
    last30d: number;
    last90d: number;
    byPillar: { body: number; mind: number; soul: number };
  };
  streaks: { dailyCurrent: number; weeklyCurrent: number; longest: number };
  constancyWeekly: { body: number; mind: number; soul: number };
  emotions: { last7: string[]; last30: string[]; top3: string[] };
};

export type AdminLogRow = {
  date: string;
  week: string;
  pillar: string;
  trait: string;
  stat?: string | null;
  taskId: string;
  taskName: string;
  difficulty: string;
  xp: number;
  state: 'red' | 'yellow' | 'green';
  timesInRange: number;
  source: 'form' | 'manual' | 'import';
  notes?: string | null;
};

export type AdminTaskRow = {
  taskId: string;
  taskName: string;
  pillar: string;
  trait: string;
  difficulty: string;
  weeklyTarget: number | null;
  createdAt: string;
  archived: boolean;
};

export type AdminTaskSummaryRow = {
  taskId: string;
  taskName: string;
  pillar: string;
  trait: string;
  difficulty: string;
  totalXp: number;
  totalCompletions: number;
  daysActive: number;
  firstCompletedAt: string | null;
  lastCompletedAt: string | null;
  state: 'red' | 'yellow' | 'green';
};

export type TaskgenJob = {
  id: string;
  userId: string;
  userEmail: string | null;
  mode: string | null;
  status: string;
  tasksInserted: number | null;
  errorCode: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  correlationId: string | null;
  durationMs: number | null;
};

export type TaskgenJobsSummary = {
  total: number;
  successRate: number;
  errorCounts: Record<string, number>;
  averageDurationMs: number | null;
  p95DurationMs: number | null;
};

export type TaskgenJobsResponse = {
  items: TaskgenJob[];
  total: number;
  hasMore: boolean;
  summary: TaskgenJobsSummary;
};

export type TaskgenJobLog = {
  id: string;
  jobId: string;
  createdAt: string;
  level: string;
  event: string;
  data: unknown | null;
};

export type TaskgenUserOverview = {
  userId: string;
  userEmail: string | null;
  totalJobs: number;
  successRate: number;
  lastJobStatus: string | null;
  lastJobCreatedAt: string | null;
  lastTaskInsertedAt: string | null;
  latestJob: TaskgenJob | null;
};

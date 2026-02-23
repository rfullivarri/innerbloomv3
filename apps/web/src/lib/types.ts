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

export type TaskgenEventLevel = 'info' | 'warn' | 'error';
export type TaskgenEventName =
  | 'TRIGGER_RECEIVED'
  | 'RUNNER_STARTED'
  | 'CONTEXT_READY'
  | 'OPENAI_REQUEST'
  | 'OPENAI_RESPONSE'
  | 'VALIDATION_OK'
  | 'VALIDATION_FAILED'
  | 'TASKS_STORED'
  | 'OPENAI_MISCONFIGURED'
  | 'RUNNER_EXCEPTION'
  | 'RUNNER_ENDED';

export type TaskgenTraceEvent = {
  at: string;
  level: TaskgenEventLevel;
  event: TaskgenEventName;
  userId: string;
  correlationId: string;
  mode?: string | null;
  origin?: string | null;
  data?: Record<string, unknown>;
};

export type FeedbackDefinition = {
  id: string;
  notificationKey: string;
  label: string;
  type: string;
  scope: string[];
  trigger: string;
  channel: string;
  frequency: string;
  status: 'active' | 'paused' | 'draft' | 'deprecated';
  priority: number;
  copy: string;
  cta: { label: string; href: string | null } | null;
  previewVariables: Record<string, string>;
  config: Record<string, unknown>;
  metrics: {
    lastFiredAt: string | null;
    fires7d: number;
    fires30d: number;
    ctr30d: number;
  };
};


export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';

export type AdminSubscriptionPlan = {
  planCode: string;
  name: string;
  active: boolean;
};

export type AdminUserSubscription = {
  userSubscriptionId: string;
  planCode: string;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  graceEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  isSuperuser: boolean;
  isBillingExempt: boolean;
  updatedAt: string;
};

export type AdminUserSubscriptionResponse = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
  subscription: AdminUserSubscription | null;
  availablePlans: AdminSubscriptionPlan[];
};

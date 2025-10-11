import { type InsightQuery, type ListUsersQuery, type LogsQuery, type TasksQuery, type UpdateTaskBody } from './admin.schemas.js';

type AdminUserListItem = {
  id: string;
  email: string | null;
  name: string | null;
  gameMode: string | null;
  createdAt: string;
};

type AdminInsights = {
  profile: {
    id: string;
    email: string | null;
    name: string | null;
    gameMode: string | null;
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

type AdminLogRow = {
  date: string;
  week: string;
  pillar: string;
  trait: string;
  stat: string | null;
  taskId: string;
  taskName: string;
  difficulty: string;
  xp: number;
  state: 'red' | 'yellow' | 'green';
  timesInRange: number;
  source: 'form' | 'manual' | 'import';
  notes: string | null;
};

type AdminTask = {
  taskId: string;
  taskName: string;
  pillar: string;
  trait: string;
  difficulty: string;
  weeklyTarget: number | null;
  createdAt: string;
  archived: boolean;
};

type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

const SAMPLE_USER_ID = '00000000-0000-4000-8000-000000000001';

const SAMPLE_USERS: AdminUserListItem[] = [
  {
    id: SAMPLE_USER_ID,
    email: 'sample.user@example.com',
    name: 'Sample Admin User',
    gameMode: 'explorer',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

const SAMPLE_INSIGHTS: AdminInsights = {
  profile: {
    id: SAMPLE_USER_ID,
    email: 'sample.user@example.com',
    name: 'Sample Admin User',
    gameMode: 'explorer',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  level: { level: 7, xpCurrent: 4200, xpToNext: 600 },
  xp: {
    total: 4800,
    last30d: 1250,
    last90d: 3600,
    byPillar: { body: 1600, mind: 2100, soul: 1100 },
  },
  streaks: { dailyCurrent: 6, weeklyCurrent: 4, longest: 12 },
  constancyWeekly: { body: 3, mind: 2, soul: 4 },
  emotions: {
    last7: ['energized', 'focused', 'playful'],
    last30: ['curious', 'grounded', 'joyful'],
    top3: ['joyful', 'focused', 'curious'],
  },
};

const SAMPLE_LOGS: AdminLogRow[] = [
  {
    date: '2024-10-01',
    week: '2024-W40',
    pillar: 'Mind',
    trait: 'Creatividad',
    stat: 'Tiempo',
    taskId: 'task-001',
    taskName: 'Escribir 3 ideas nuevas',
    difficulty: 'Medium',
    xp: 45,
    state: 'green',
    timesInRange: 5,
    source: 'form',
    notes: 'Se completó durante la mañana',
  },
  {
    date: '2024-09-29',
    week: '2024-W39',
    pillar: 'Body',
    trait: 'Energía',
    stat: 'Duración',
    taskId: 'task-002',
    taskName: 'Sesión de yoga',
    difficulty: 'Low',
    xp: 30,
    state: 'yellow',
    timesInRange: 3,
    source: 'manual',
    notes: null,
  },
];

const SAMPLE_TASKS: AdminTask[] = [
  {
    taskId: 'task-001',
    taskName: 'Escribir 3 ideas nuevas',
    pillar: 'Mind',
    trait: 'Creatividad',
    difficulty: 'Medium',
    weeklyTarget: 4,
    createdAt: '2024-01-05T10:00:00.000Z',
    archived: false,
  },
  {
    taskId: 'task-002',
    taskName: 'Sesión de yoga',
    pillar: 'Body',
    trait: 'Energía',
    difficulty: 'Low',
    weeklyTarget: 3,
    createdAt: '2024-02-12T08:30:00.000Z',
    archived: false,
  },
];

function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const total = items.length;
  const offset = (page - 1) * pageSize;
  const paginated = items.slice(offset, offset + pageSize);
  return { items: paginated, page, pageSize, total };
}

export async function listUsers(query: ListUsersQuery): Promise<PaginatedResult<AdminUserListItem>> {
  const { page, pageSize, query: search } = query;

  if (!search) {
    return paginate(SAMPLE_USERS, page, pageSize);
  }

  const needle = search.toLowerCase();
  const filtered = SAMPLE_USERS.filter((user) => {
    return [user.email ?? '', user.name ?? ''].some((value) => value.toLowerCase().includes(needle));
  });

  return paginate(filtered, page, pageSize);
}

export async function getUserInsights(userId: string, query: InsightQuery): Promise<AdminInsights> {
  void query;

  if (userId !== SAMPLE_USER_ID) {
    return {
      ...SAMPLE_INSIGHTS,
      profile: {
        ...SAMPLE_INSIGHTS.profile,
        id: userId,
        email: null,
        name: 'Usuario sin datos',
        gameMode: null,
        createdAt: new Date(0).toISOString(),
      },
      level: { level: 0, xpCurrent: 0, xpToNext: 0 },
      xp: {
        total: 0,
        last30d: 0,
        last90d: 0,
        byPillar: { body: 0, mind: 0, soul: 0 },
      },
      streaks: { dailyCurrent: 0, weeklyCurrent: 0, longest: 0 },
      constancyWeekly: { body: 0, mind: 0, soul: 0 },
      emotions: { last7: [], last30: [], top3: [] },
    } satisfies AdminInsights;
  }

  return SAMPLE_INSIGHTS;
}

export async function getUserLogs(
  userId: string,
  query: LogsQuery,
): Promise<PaginatedResult<AdminLogRow>> {
  if (userId !== SAMPLE_USER_ID) {
    return { items: [], page: query.page, pageSize: query.pageSize, total: 0 };
  }

  const { page, pageSize } = query;
  return paginate(SAMPLE_LOGS, page, pageSize);
}

export async function getUserTasks(
  userId: string,
  query: TasksQuery,
): Promise<PaginatedResult<AdminTask>> {
  if (userId !== SAMPLE_USER_ID) {
    return { items: [], page: 1, pageSize: SAMPLE_TASKS.length || 1, total: 0 };
  }

  const { pillar, trait, q } = query;
  let items = [...SAMPLE_TASKS];

  if (pillar) {
    const needle = pillar.toLowerCase();
    items = items.filter((task) => task.pillar.toLowerCase().includes(needle));
  }

  if (trait) {
    const needle = trait.toLowerCase();
    items = items.filter((task) => task.trait.toLowerCase().includes(needle));
  }

  if (q) {
    const needle = q.toLowerCase();
    items = items.filter((task) => {
      return [task.taskName, task.pillar, task.trait].some((value) => value.toLowerCase().includes(needle));
    });
  }

  return { items, page: 1, pageSize: items.length, total: items.length };
}

export async function updateUserTask(
  userId: string,
  taskId: string,
  body: UpdateTaskBody,
): Promise<{ ok: true }> {
  if (userId === SAMPLE_USER_ID) {
    const match = SAMPLE_TASKS.find((task) => task.taskId === taskId);
    if (match) {
      if (typeof body.weeklyTarget === 'number') {
        match.weeklyTarget = body.weeklyTarget;
      }
      if (typeof body.archived === 'boolean') {
        match.archived = body.archived;
      }
      if (typeof body.notes === 'string') {
        match.taskName = `${match.taskName.split(' (')[0]} (nota actualizada)`;
      }
    }
  }

  return { ok: true };
}

export async function exportUserLogsCsv(userId: string, query: LogsQuery): Promise<string> {
  const result = await getUserLogs(userId, query);

  const header = [
    'date',
    'week',
    'pillar',
    'trait',
    'stat',
    'taskId',
    'taskName',
    'difficulty',
    'xp',
    'state',
    'timesInRange',
    'source',
    'notes',
  ];

  const rows = result.items.map((item) =>
    [
      item.date,
      item.week,
      item.pillar,
      item.trait,
      item.stat ?? '',
      item.taskId,
      item.taskName,
      item.difficulty,
      String(item.xp),
      item.state,
      String(item.timesInRange),
      item.source,
      item.notes ?? '',
    ]
      .map((value) => value.replace(/"/g, '""'))
      .map((value) => (value.includes(',') ? `"${value}"` : value))
      .join(','),
  );

  return [header.join(','), ...rows].join('\n');
}

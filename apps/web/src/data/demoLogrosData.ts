import type {
  HabitAchievementShelfItem,
  MonthlyWrappedRecord,
  RewardsHistorySummary,
  TaskInsightsResponse,
  WeeklyWrappedRecord,
} from '../lib/api';

const DEMO_USER_ID = 'labs-logros-demo';

const createHabit = (input: Partial<HabitAchievementShelfItem> & Pick<HabitAchievementShelfItem, 'id' | 'taskId' | 'taskName' | 'pillar' | 'status'>): HabitAchievementShelfItem => ({
  id: input.id,
  taskId: input.taskId,
  taskName: input.taskName,
  pillar: input.pillar,
  trait: input.trait ?? null,
  seal: input.seal ?? { visible: input.status !== 'not_achieved' },
  status: input.status,
  achievedAt: input.achievedAt ?? null,
  decisionMadeAt: input.decisionMadeAt ?? null,
  gpBeforeAchievement: input.gpBeforeAchievement ?? 120,
  gpSinceMaintain: input.gpSinceMaintain ?? 0,
  maintainEnabled: input.maintainEnabled ?? false,
});

const weeklyWrapups: WeeklyWrappedRecord[] = [
  {
    id: 'weekly-1',
    userId: DEMO_USER_ID,
    weekStart: '2026-03-30',
    weekEnd: '2026-04-05',
    createdAt: '2026-04-06T08:30:00.000Z',
    updatedAt: '2026-04-06T08:30:00.000Z',
    seen: true,
    completionDays: ['2026-03-30', '2026-03-31', '2026-04-01', '2026-04-03', '2026-04-05'],
    payload: {
      summary: { pillarDominant: 'BODY' },
      emotions: { weekly: { color: '#A78BFA' } },
    } as WeeklyWrappedRecord['payload'],
  },
  {
    id: 'weekly-2',
    userId: DEMO_USER_ID,
    weekStart: '2026-03-23',
    weekEnd: '2026-03-29',
    createdAt: '2026-03-30T08:30:00.000Z',
    updatedAt: '2026-03-30T08:30:00.000Z',
    seen: true,
    completionDays: ['2026-03-23', '2026-03-25', '2026-03-26', '2026-03-28'],
    payload: {
      summary: { pillarDominant: 'MIND' },
      emotions: { weekly: { color: '#34D399' } },
    } as WeeklyWrappedRecord['payload'],
  },
];

const monthlyWrapups: MonthlyWrappedRecord[] = [
  {
    id: 'monthly-1',
    userId: DEMO_USER_ID,
    periodKey: '2026-03',
    payload: {},
    summary: {},
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    completionDays: ['2026-03-25', '2026-03-26', '2026-03-27', '2026-03-29', '2026-03-30'],
  },
  {
    id: 'monthly-2',
    userId: DEMO_USER_ID,
    periodKey: '2026-02',
    payload: {},
    summary: {},
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-03-01T08:00:00.000Z',
    completionDays: ['2026-02-20', '2026-02-21', '2026-02-23', '2026-02-25', '2026-02-27'],
  },
];

export const demoLogrosData: RewardsHistorySummary = {
  weeklyWrapups,
  weeklyUnseenCount: 0,
  monthlyWrapups,
  habitAchievements: {
    pendingCount: 0,
    achievedByPillar: [
      {
        pillar: { id: 'body', code: 'BODY', name: 'Body' },
        habits: [
          createHabit({
            id: 'habit-water',
            taskId: 'task-water',
            taskName: '2L de agua',
            pillar: 'BODY',
            trait: { id: 't-hydration', code: 'HYDRATION', name: 'Hidratación' },
            status: 'stored',
            achievedAt: '2026-02-10T00:00:00.000Z',
            gpBeforeAchievement: 168,
          }),
          createHabit({
            id: 'habit-dinner',
            taskId: 'task-dinner-before-22',
            taskName: 'Cenar antes de las 22 horas',
            pillar: 'BODY',
            // Usamos NUTRITION porque tiene sello existente en /sellos y evita crear assets nuevos.
            trait: { id: 't-nutrition', code: 'NUTRITION', name: 'Nutrición' },
            status: 'maintained',
            maintainEnabled: true,
            achievedAt: '2026-03-18T00:00:00.000Z',
            gpBeforeAchievement: 214,
          }),
          createHabit({
            id: 'habit-gym',
            taskId: 'task-gym',
            taskName: 'Gimnasio',
            pillar: 'BODY',
            trait: { id: 't-strength', code: 'STRENGTH', name: 'Fuerza' },
            status: 'not_achieved',
          }),
          createHabit({
            id: 'habit-steps',
            taskId: 'task-steps',
            taskName: '10.000 pasos',
            pillar: 'BODY',
            trait: { id: 't-resistance', code: 'RESISTANCE', name: 'Resistencia' },
            status: 'not_achieved',
          }),
        ],
      },
      {
        pillar: { id: 'mind', code: 'MIND', name: 'Mind' },
        habits: [
          createHabit({
            id: 'habit-english',
            taskId: 'task-english',
            taskName: 'Hablar en inglés',
            pillar: 'MIND',
            trait: { id: 't-focus', code: 'FOCUS', name: 'Enfoque' },
            status: 'stored',
            achievedAt: '2026-01-22T00:00:00.000Z',
            gpBeforeAchievement: 192,
          }),
          createHabit({
            id: 'habit-project',
            taskId: 'task-project-60',
            taskName: '60 min de mi proyecto ongoing',
            pillar: 'MIND',
            trait: { id: 't-discipline', code: 'DISCIPLINE', name: 'Disciplina' },
            status: 'not_achieved',
          }),
        ],
      },
      {
        pillar: { id: 'soul', code: 'SOUL', name: 'Soul' },
        habits: [
          createHabit({
            id: 'habit-family-call',
            taskId: 'task-family-call',
            taskName: 'Videollamada con la flia',
            pillar: 'SOUL',
            trait: { id: 't-connection', code: 'CONNECTION', name: 'Conexión' },
            status: 'stored',
            achievedAt: '2026-02-02T00:00:00.000Z',
            gpBeforeAchievement: 186,
          }),
          createHabit({
            id: 'habit-board-games',
            taskId: 'task-board-games',
            taskName: 'Jugar juegos de mesa',
            pillar: 'SOUL',
            trait: { id: 't-play', code: 'PLAY', name: 'Juego' },
            status: 'not_achieved',
          }),
        ],
      },
    ],
  },
};

export const demoLogrosPreviewByTaskId: Record<string, NonNullable<TaskInsightsResponse['previewAchievement']>> = {
  'task-gym': {
    score: 46,
    status: 'fragile',
    consolidationStrength: 41,
    recentMonths: [
      { periodKey: '2025-12', completionRate: 0.28, state: 'invalid', closed: true },
      { periodKey: '2026-01', completionRate: 0.43, state: 'weak', closed: true },
      { periodKey: '2026-02', completionRate: 0.51, state: 'building', closed: true },
      { periodKey: '2026-03', completionRate: 0.49, state: 'floor_only', closed: true },
      { periodKey: '2026-04', projectedCompletionRate: 0.58, state: 'projected_floor_only', closed: false },
    ],
    windowProximity: {
      slots: ['invalid', 'floor_only', 'projected_floor_only'],
    },
  },
  'task-family-call': {
    score: 74,
    status: 'building',
    consolidationStrength: 69,
    recentMonths: [
      { periodKey: '2025-12', completionRate: 0.38, state: 'weak', closed: true },
      { periodKey: '2026-01', completionRate: 0.61, state: 'building', closed: true },
      { periodKey: '2026-02', completionRate: 0.8, state: 'strong', closed: true },
      { periodKey: '2026-03', completionRate: 0.7, state: 'building', closed: true },
      { periodKey: '2026-04', projectedCompletionRate: 0.77, state: 'projected_valid', closed: false },
    ],
    windowProximity: {
      slots: ['floor_only', 'valid', 'valid'],
    },
  },
  'task-english': {
    score: 82,
    status: 'strong',
    consolidationStrength: 81,
    recentMonths: [
      { periodKey: '2025-12', completionRate: 0.67, state: 'building', closed: true },
      { periodKey: '2026-01', completionRate: 0.84, state: 'strong', closed: true },
      { periodKey: '2026-02', completionRate: 0.85, state: 'strong', closed: true },
      { periodKey: '2026-03', completionRate: 0.88, state: 'strong', closed: true },
    ],
  },
};

import type { EmotionSnapshot, TaskInsightsResponse, UserLevelResponse } from './api';
import type { AdminInsights, AdminLogRow } from './types';
import { fetchAdminInsights, fetchAdminLogs } from './adminApi';
import { getEmotions, getTaskInsights, getUserLevel } from './api';
import { logApiError } from './logger';

type EmotionMessageKey =
  | 'felicidad'
  | 'motivacion'
  | 'calma'
  | 'cansancio'
  | 'ansiedad'
  | 'tristeza'
  | 'frustracion';

type EmotionHighlightEntry = {
  key: EmotionMessageKey;
  label: string;
  tone: string;
  color: string;
  weeklyMessage: string;
  biweeklyContext: string;
};

type EmotionHighlight = {
  weekly: EmotionHighlightEntry | null;
  biweekly: EmotionHighlightEntry | null;
};

export type WeeklyWrappedSection = {
  key: string;
  title: string;
  body: string;
  accent?: string;
  items?: {
    title: string;
    body: string;
    badge?: string;
    pillar?: string | null;
    daysActive?: number;
    weeksActive?: number;
    weeksSample?: number;
    completionRate?: number | null;
  }[];
};

export type WeeklyWrappedPayload = {
  mode: 'preview' | 'final';
  dataSource: 'real' | 'mock';
  variant: 'full' | 'light';
  weekRange: { start: string; end: string };
  summary: {
    pillarDominant: string | null;
    highlight: string | null;
    completions: number;
    xpTotal: number;
    energyHighlight?: { metric: 'HP' | 'FOCUS' | 'MOOD'; value: number };
    effortBalance?: {
      easy: number;
      medium: number;
      hard: number;
      total: number;
      topTask?: { title: string; completions: number; difficulty: string } | null;
      topHardTask?: { title: string; completions: number } | null;
    } | null;
  };
  emotions: EmotionHighlight;
  levelUp: LevelUpHighlight;
  sections: WeeklyWrappedSection[];
};

type BuildOptions = {
  userId: string;
  dataSource: 'real' | 'mock';
  forceLevelUpMock?: boolean;
};

type NormalizedLog = AdminLogRow & {
  parsedDate: Date;
  dateKey: string | null;
  quantity: number;
  state: 'red' | 'yellow' | 'green';
};

type HabitAggregate = {
  title: string;
  taskId?: string | null;
  daysActive: number;
  weeksActive: number;
  weeksSample: number;
  completions: number;
  pillar: string | null;
  badge?: string;
  completionRate?: number | null;
  weeklyGoal?: number | null;
  insightsTimeline?: TaskInsightsResponse['weeks']['timeline'];
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
const MAX_LOG_PAGE_SIZE = 100;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const EMOTION_KEY_BY_LABEL: Record<string, EmotionMessageKey> = {
  Calma: 'calma',
  Felicidad: 'felicidad',
  Motivación: 'motivacion',
  Tristeza: 'tristeza',
  Ansiedad: 'ansiedad',
  Frustración: 'frustracion',
  Cansancio: 'cansancio',
};

const EMOTION_KEY_BY_NORMALIZED_LABEL: Record<string, EmotionMessageKey> = Object.fromEntries(
  Object.entries(EMOTION_KEY_BY_LABEL).map(([label, key]) => [normalizeText(label), key]),
);

const ENERGY_METRIC_BY_PILLAR: Record<string, { label: 'HP' | 'FOCUS' | 'MOOD' }> = {
  Body: { label: 'HP' },
  Mind: { label: 'FOCUS' },
  Soul: { label: 'MOOD' },
};

const EMOTION_COLORS: Record<EmotionMessageKey, string> = {
  calma: '#2ECC71',
  felicidad: '#F1C40F',
  motivacion: '#9B59B6',
  tristeza: '#3498DB',
  ansiedad: '#E74C3C',
  frustracion: '#8D6E63',
  cansancio: '#16A085',
};

function logWeeklyWrappedDebug(message: string, context?: Record<string, unknown>) {
  if (typeof window === 'undefined' || (window as any).__DBG !== false) {
    if (context) {
      console.info(`[weekly-wrapped] ${message}`, context);
    } else {
      console.info(`[weekly-wrapped] ${message}`);
    }
  }
}

const EMOTION_REFLECTIONS: Record<EmotionMessageKey, EmotionHighlightEntry> = {
  felicidad: {
    key: 'felicidad',
    label: 'Felicidad',
    tone: 'positiva',
    color: EMOTION_COLORS.felicidad,
    weeklyMessage: 'La alegría lideró tu semana. Anotá qué la impulsó y repetilo.',
    biweeklyContext: 'En las últimas dos semanas tu energía se mantuvo luminosa. Aprovechá ese envión.',
  },
  motivacion: {
    key: 'motivacion',
    label: 'Motivación',
    tone: 'positiva',
    color: EMOTION_COLORS.motivacion,
    weeklyMessage: 'La motivación estuvo al frente. ¿Qué objetivo te movió? Sostenelo.',
    biweeklyContext: '15 días orientados a avanzar. Elegí la próxima misión y seguí subiendo.',
  },
  calma: {
    key: 'calma',
    label: 'Calma',
    tone: 'neutral',
    color: EMOTION_COLORS.calma,
    weeklyMessage: 'Predominó la calma. Protegé los espacios que la generaron.',
    biweeklyContext: 'Dos semanas con aire liviano. Podés sumar pequeños retos sin perder serenidad.',
  },
  cansancio: {
    key: 'cansancio',
    label: 'Cansancio',
    tone: 'neutral',
    color: EMOTION_COLORS.cansancio,
    weeklyMessage: 'El cansancio marcó el ritmo. Respetá el descanso y elegí micro acciones.',
    biweeklyContext: 'Quincena exigente. Bajá la vara y priorizá recuperación.',
  },
  ansiedad: {
    key: 'ansiedad',
    label: 'Ansiedad',
    tone: 'desafiante',
    color: EMOTION_COLORS.ansiedad,
    weeklyMessage: 'La ansiedad tomó espacio. Anclate con respiraciones cortas y tareas simples.',
    biweeklyContext: 'En 15 días se repitió la tensión. Sumá pausas activas para soltarla.',
  },
  tristeza: {
    key: 'tristeza',
    label: 'Tristeza',
    tone: 'desafiante',
    color: EMOTION_COLORS.tristeza,
    weeklyMessage: 'Apareció tristeza. Elegí una acción amable y compartila con alguien de confianza.',
    biweeklyContext: 'La tendencia quincenal fue baja. Apoyate en Mind/Soul y en pequeños gestos.',
  },
  frustracion: {
    key: 'frustracion',
    label: 'Frustración',
    tone: 'desafiante',
    color: EMOTION_COLORS.frustracion,
    weeklyMessage: 'La frustración dijo presente. Reconocé el avance mínimo y volvé a intentar.',
    biweeklyContext: 'Varias señales de freno estas dos semanas. Ajustá expectativas y buscá apoyo.',
  },
};

type LevelUpHighlight = {
  happened: boolean;
  currentLevel: number | null;
  previousLevel: number | null;
  xpGained: number;
  forced: boolean;
};

type LevelSummary = {
  level: number;
  xpTotal: number;
  xpRequiredCurrent: number;
  xpRequiredNext: number | null;
  xpToNext: number | null;
};

export async function buildWeeklyWrappedPreviewPayload(
  options: BuildOptions,
): Promise<WeeklyWrappedPayload> {
  if (options.dataSource === 'mock') {
    return buildMockWeeklyWrapped(options.forceLevelUpMock);
  }

  const [insights, logs, emotions, levelSummary] = await Promise.all([
    fetchAdminInsights(options.userId),
    fetchLogsForRange(options.userId, {
      from: toDateInput(daysAgo(83)),
      to: toDateInput(new Date()),
    }),
    getEmotions(options.userId, { days: 15 }),
    fetchLevelSummary(options.userId),
  ]);

  return buildWeeklyWrappedFromData(insights, logs, emotions, levelSummary, {
    forceLevelUpMock: options.forceLevelUpMock ?? false,
  });
}

async function fetchLogsForRange(
  userId: string,
  params: { from: string; to: string },
): Promise<AdminLogRow[]> {
  const items: AdminLogRow[] = [];
  let page = 1;
  let total = Infinity;

  while (items.length < total) {
    const response = await fetchAdminLogs(userId, {
      ...params,
      page,
      pageSize: MAX_LOG_PAGE_SIZE,
    });

    items.push(...(response.items ?? []));
    total = response.total;

    if ((response.items?.length ?? 0) < MAX_LOG_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return items;
}

async function fetchLevelSummary(userId: string): Promise<LevelSummary | null> {
  try {
    const response = await getUserLevel(userId);

    return normalizeLevelSummary(response);
  } catch (error) {
    logApiError('[admin][weekly-wrapped] failed to fetch level summary', { error });
    return null;
  }
}

export function normalizeLogs(logs: AdminLogRow[]): NormalizedLog[] {
  return logs
    .map((log) => {
      const parsedDate = parseDateKey(log.date);
      const dateKey = normalizeDateKey(log.date);
      const quantity = Math.max(1, Number(log.timesInRange ?? 1));
      const normalizedState = (log.state ?? '').toLowerCase();
      const state: 'red' | 'yellow' | 'green' =
        normalizedState === 'red'
          ? 'red'
          : normalizedState === 'yellow'
            ? 'yellow'
            : 'green';

      return {
        ...log,
        parsedDate: parsedDate ?? new Date(NaN),
        dateKey,
        quantity,
        state,
      } satisfies NormalizedLog;
    })
    .filter((log) => Number.isFinite(log.parsedDate.getTime()));
}

function getWeekKey(date: Date): string {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7; // Convert Sunday (0) to 7
  copy.setUTCDate(copy.getUTCDate() - day + 1); // Move to Monday

  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((copy.getTime() - yearStart.getTime()) / MS_IN_DAY + 1) / 7);

  return `${copy.getUTCFullYear()}-W${weekNumber}`;
}

export function summarizeWeeklyActivity(logs: NormalizedLog[]): {
  completions: number;
  habitCounts: ReturnType<typeof aggregateHabits>;
} {
  const meaningfulLogs = logs.filter((log) => log.state !== 'red' && log.dateKey);
  const completions = meaningfulLogs.reduce((acc, log) => acc + log.quantity, 0);
  const habitCounts = aggregateHabits(meaningfulLogs);

  return { completions, habitCounts };
}

async function hydrateHabitsWithTaskInsights(habits: HabitAggregate[]): Promise<HabitAggregate[]> {
  return Promise.all(
    habits.map(async (habit) => {
      if (!habit.taskId) {
        return habit;
      }

      try {
        const insights = await getTaskInsights(habit.taskId);
        const timeline = insights.weeks.timeline ?? [];
        const weeksActiveFromInsights = timeline.filter((week) => week.hit).length;
        const weeksSampleFromInsights = (() => {
          const sample = Number(insights.weeks.weeksSample);
          if (Number.isFinite(sample) && sample > 0) {
            return Math.round(sample);
          }
          return timeline.length;
        })();

        return {
          ...habit,
          weeksActive: weeksActiveFromInsights || habit.weeksActive,
          weeksSample: weeksSampleFromInsights || habit.weeksSample,
          completionRate: insights.weeks.completionRate,
          weeklyGoal: insights.weeks.weeklyGoal,
          insightsTimeline: timeline,
        } satisfies HabitAggregate;
      } catch (error) {
        logApiError('[weekly-wrapped] failed to fetch task insights', { error, taskId: habit.taskId });
        return habit;
      }
    }),
  );
}

export async function buildWeeklyWrappedFromData(
  insights: AdminInsights,
  logs: AdminLogRow[],
  emotions: EmotionSnapshot[],
  levelSummary: LevelSummary | null,
  options: { forceLevelUpMock?: boolean } = {},
): Promise<WeeklyWrappedPayload> {
  logWeeklyWrappedDebug('building payload from data', {
    logsCount: logs.length,
    emotionsCount: emotions.length,
    hasLevelSummary: Boolean(levelSummary),
    forceLevelUpMock: options.forceLevelUpMock,
  });
  const normalizedLogs = normalizeLogs(logs);
  logWeeklyWrappedDebug('normalized logs ready', {
    normalizedCount: normalizedLogs.length,
    sample: normalizedLogs.slice(0, 3).map((log) => ({
      task: log.taskName ?? log.taskId,
      difficulty: log.difficulty,
      state: log.state,
      date: log.dateKey,
      quantity: log.quantity,
    })),
  });
  const latestLog = normalizedLogs.reduce<Date | null>((latest, log) => {
    if (!latest || log.parsedDate > latest) {
      return log.parsedDate;
    }
    return latest;
  }, null);

  const endDate = latestLog ?? new Date();
  const startDate = daysAgoFrom(endDate, 6);
  const longTermStartDate = daysAgoFrom(endDate, 83);
  const periodLabel = `${formatDate(startDate)} – ${formatDate(endDate)}`;

  const weeklyLogs = normalizedLogs.filter(
    (log) => log.parsedDate >= startDate && log.parsedDate <= endDate,
  );
  const longTermLogs = normalizedLogs.filter(
    (log) => log.parsedDate >= longTermStartDate && log.parsedDate <= endDate,
  );
  const weeksSample = Math.max(1, Math.ceil((endDate.getTime() - longTermStartDate.getTime() + MS_IN_DAY) / (7 * MS_IN_DAY)));

  const { completions, habitCounts } = summarizeWeeklyActivity(weeklyLogs);
  const effortBalance = computeEffortBalance(weeklyLogs);
  const longTermHabits = aggregateHabits(longTermLogs, weeksSample);
  const longTermHabitMap = new Map(longTermHabits.map((habit) => [habit.title, habit]));

  const xpTotal = weeklyLogs
    .filter((log) => log.state !== 'red')
    .reduce((acc, log) => acc + Math.max(0, Number(log.xp ?? 0)), 0);
  const levelUp = detectLevelUp(levelSummary, xpTotal, options.forceLevelUpMock === true);

  const topHabits = habitCounts.slice(0, 3).map((habit) => {
    const longTerm = longTermHabitMap.get(habit.title);
    return {
      ...habit,
      weeksActive: longTerm?.weeksActive ?? habit.weeksActive ?? 0,
      weeksSample: longTerm?.weeksSample ?? weeksSample,
    };
  });
  const topHabitsWithInsights = await hydrateHabitsWithTaskInsights(topHabits);
  const pillarDominant = dominantPillar(insights) ?? null;
  const variant: WeeklyWrappedPayload['variant'] = completions >= 3 ? 'full' : 'light';
  const highlight = effortBalance.topTask?.title ?? topHabitsWithInsights[0]?.title ?? null;
  const energyHighlight = computeEnergyHighlightFromInsights(insights, pillarDominant);
  const emotionHighlight = buildEmotionHighlight(emotions);
  const weeklyEmotionMessage =
    emotionHighlight.weekly?.weeklyMessage ??
    'Necesitamos más registros recientes en el Emotion Chart para destacar tu ánimo de la semana.';
  const biweeklyEmotionMessage =
    emotionHighlight.biweekly?.biweeklyContext ??
    'En cuanto registremos más emociones, vamos a mostrar la tendencia de las últimas dos semanas.';
  const emotionAccent = emotionHighlight.weekly?.label ?? emotionHighlight.biweekly?.label ?? 'Sin emoción dominante';

  logWeeklyWrappedDebug('weekly wrapped summary computed', {
    periodLabel,
    completions,
    xpTotal,
    pillarDominant,
    highlight,
    variant,
    energyHighlight,
    effortBalance,
  });

  const sections: WeeklyWrappedSection[] = (
    [
      {
        key: 'intro',
        title: 'Weekly Wrapped · Preview',
        body: 'Tu semana, en movimiento.',
        accent: `Semana ${periodLabel}`,
      },
      levelUp.happened
        ? {
            key: 'level-up',
            title: 'Subida de nivel',
            body: `Llegaste al nivel ${levelUp.currentLevel ?? 'nuevo'}. ${
              levelUp.forced ? 'Celebración mockeada para validar la experiencia.' : 'Impulso real para tu semana.'
            }`,
            accent: 'Level Up',
          }
        : null,
      {
        key: 'achievements',
        title: 'Resumen semanal',
        body:
          completions > 0
            ? `Completaste ${completions} tareas y sumaste ${xpTotal.toLocaleString('es-AR')} XP esta semana.`
            : 'Semana tranquila: sin registros fuertes, pero el reset también suma.',
        accent: completions > 0 ? 'Datos reales' : 'Semana liviana',
      },
      {
        key: 'habits',
        title: 'Ritmo que se sostiene',
        body:
          topHabitsWithInsights.length > 0
            ? 'Estos hábitos aparecieron de forma consistente y mantuvieron tu semana en movimiento.'
            : 'Aún no registramos hábitos destacados esta semana, pero estás a un clic de retomarlos.',
        items:
          topHabitsWithInsights.length > 0
            ? topHabitsWithInsights.map((habit) => ({
                title: habit.title,
                body:
                  habit.daysActive > 0
                    ? `${habit.daysActive}/7 días. Sostuviste el compromiso.`
                    : 'Ritmo sólido esta semana. Constancia pura.',
                badge: habit.badge,
                pillar: habit.pillar,
                daysActive: habit.daysActive,
                weeksActive: habit.weeksActive,
                weeksSample: habit.weeksSample,
                completionRate: habit.completionRate,
              }))
            : undefined,
      },
      {
        key: 'improvement',
        title: 'Progreso y foco',
        body:
          highlight
            ? `${highlight} fue el avance más claro: un paso breve que suma momentum.`
            : 'Sin mejoras fuertes: prioricemos el descanso y mañana volvemos a empujar.',
        accent: 'Momentum',
      },
      {
        key: 'pillar',
        title: 'Pilar dominante',
        body:
          pillarDominant
            ? `${getPillarIcon(pillarDominant)} ${pillarDominant} lideró tu energía estos días. Seguí apoyándote en ese foco.`
            : 'Sin un pilar dominante esta semana: espacio abierto para explorar Body, Mind o Soul.',
        accent: pillarDominant ?? 'Balanceado',
      },
      {
        key: 'highlight',
        title: 'Highlight emocional',
        body: weeklyEmotionMessage,
        accent: emotionAccent,
        items: [
          {
            title: 'Emoción 7 días',
            body: weeklyEmotionMessage,
            badge: emotionHighlight.weekly?.tone,
            pillar: emotionHighlight.weekly?.label ?? undefined,
          },
          {
            title: 'Emoción 15 días',
            body: biweeklyEmotionMessage,
            badge: emotionHighlight.biweekly?.tone ?? undefined,
            pillar: emotionHighlight.biweekly?.label ?? undefined,
          },
        ],
      },
        {
          key: 'closing',
          title: 'Cierre',
          body: 'Seguimos. Mañana vuelve el Daily Quest para sumar otro paso.',
          accent: 'Mañana hay más',
        },
    ] as (WeeklyWrappedSection | null)[]
  ).filter((section): section is WeeklyWrappedSection => section !== null);

  return {
    mode: 'preview',
    dataSource: 'real',
    variant,
    weekRange: { start: startDate.toISOString(), end: endDate.toISOString() },
    summary: { pillarDominant, highlight, completions, xpTotal, energyHighlight, effortBalance },
    emotions: emotionHighlight,
    levelUp,
    sections,
  };
}

function aggregateHabits(logs: NormalizedLog[], weeksSampleOverride?: number) {
  const map = new Map<
    string,
    {
      taskId?: string | null;
      title: string;
      days: Set<string>;
      weeks: Set<string>;
      completions: number;
      pillar: string | null;
      badge: string | undefined;
    }
  >();

  const weeksSeen = new Set<string>();

  for (const log of logs) {
    if (!log.dateKey) {
      continue;
    }

    const key = log.taskId || log.taskName;
    if (!key) {
      continue;
    }

    const weekKey = getWeekKey(log.parsedDate);
    const current = map.get(key) ?? {
      taskId: log.taskId ?? null,
      title: log.taskName || 'Hábito sin nombre',
      days: new Set<string>(),
      weeks: new Set<string>(),
      completions: 0,
      pillar: log.pillar ?? null,
      badge: undefined,
    };
    current.days.add(log.dateKey);
    current.weeks.add(weekKey);
    current.completions += log.quantity;
    weeksSeen.add(weekKey);
    if (!current.badge && current.days.size >= 5) {
      current.badge = 'racha activa';
    }
    map.set(key, current);
  }

  const weeksSample = weeksSampleOverride ?? weeksSeen.size;

  return Array.from(map.values())
    .map((entry) => ({
      title: entry.title,
      taskId: entry.taskId ?? undefined,
      daysActive: entry.days.size,
      weeksActive: entry.weeks.size,
      weeksSample,
      pillar: entry.pillar,
      badge: entry.badge,
      completions: entry.completions,
    }))
    .sort((a, b) => b.daysActive - a.daysActive || b.completions - a.completions);
}

function dominantPillar(insights: AdminInsights): string | undefined {
  const entries: { code: string; value: number }[] = [
    { code: 'Body', value: insights.constancyWeekly.body ?? 0 },
    { code: 'Mind', value: insights.constancyWeekly.mind ?? 0 },
    { code: 'Soul', value: insights.constancyWeekly.soul ?? 0 },
  ];
  const top = entries.sort((a, b) => b.value - a.value)[0];
  if (!top || top.value <= 0) {
    return undefined;
  }
  return top.code;
}

function getPillarIcon(pillar: string): string {
  const icons: Record<string, string> = {
    Body: '🫀',
    Mind: '🧠',
    Soul: '🌿',
  };
  return icons[pillar] ?? '';
}

function computeEnergyHighlightFromInsights(
  insights: AdminInsights,
  pillarDominant: string | null,
): WeeklyWrappedPayload['summary']['energyHighlight'] {
  const metric = pillarDominant && ENERGY_METRIC_BY_PILLAR[pillarDominant]
    ? ENERGY_METRIC_BY_PILLAR[pillarDominant]
    : ENERGY_METRIC_BY_PILLAR.Body;

  const constancyValue = pillarDominant
    ? insights.constancyWeekly[pillarDominant.toLowerCase() as 'body' | 'mind' | 'soul'] ?? 0
    : Math.max(
        insights.constancyWeekly.body ?? 0,
        insights.constancyWeekly.mind ?? 0,
        insights.constancyWeekly.soul ?? 0,
      );

  const value = Math.max(0, Math.min(100, Math.round(constancyValue)));

  return { metric: metric.label, value } as WeeklyWrappedPayload['summary']['energyHighlight'];
}

function getDifficultyBucket(difficulty?: string | null): 'easy' | 'medium' | 'hard' {
  const normalized = (difficulty ?? '').trim().toLowerCase();
  if (normalized.includes('hard') || normalized === 'dificil' || normalized === 'difícil') {
    return 'hard';
  }
  if (normalized.includes('easy') || normalized === 'facil' || normalized === 'fácil') {
    return 'easy';
  }
  return 'medium';
}

function computeEffortBalance(logs: NormalizedLog[]): NonNullable<WeeklyWrappedPayload['summary']['effortBalance']> {
  const counts: Record<'easy' | 'medium' | 'hard', number> = { easy: 0, medium: 0, hard: 0 };
  const taskTotals = new Map<string, { completions: number; difficulty: 'easy' | 'medium' | 'hard' }>();

  for (const log of logs) {
    if (log.state === 'red' || !log.dateKey) continue;
    const bucket = getDifficultyBucket(log.difficulty);
    const completions = log.quantity;
    counts[bucket] = counts[bucket] + completions;

    const key = log.taskName || log.taskId;
    if (!key) continue;
    const prev = taskTotals.get(key) ?? { completions: 0, difficulty: bucket };
    taskTotals.set(key, { completions: prev.completions + completions, difficulty: bucket });
  }

  const total = counts.easy + counts.medium + counts.hard;
  const topTask = Array.from(taskTotals.entries())
    .map(([title, info]) => ({ title, ...info }))
    .sort((a, b) => b.completions - a.completions)[0];
  const topHardTask = Array.from(taskTotals.entries())
    .map(([title, info]) => ({ title, ...info }))
    .filter((entry) => entry.difficulty === 'hard')
    .sort((a, b) => b.completions - a.completions)[0];

  logWeeklyWrappedDebug('effort balance computed', {
    total,
    counts,
    sampleTasks: Array.from(taskTotals.entries())
      .slice(0, 3)
      .map(([title, info]) => ({ title, ...info })),
    topTask,
    topHardTask,
  });

  return {
    easy: counts.easy,
    medium: counts.medium,
    hard: counts.hard,
    total,
    topTask: topTask ? { title: topTask.title, completions: topTask.completions, difficulty: topTask.difficulty } : null,
    topHardTask: topHardTask ? { title: topHardTask.title, completions: topHardTask.completions } : null,
  };
}

function buildMockWeeklyWrapped(forceLevelUpMock?: boolean): WeeklyWrappedPayload {
  const start = daysAgo(6);
  const end = new Date();
  const mockEmotions: EmotionHighlight = {
    weekly: buildEmotionEntry('felicidad'),
    biweekly: buildEmotionEntry('motivacion'),
  };
  const mockLevelUp: LevelUpHighlight = {
    happened: forceLevelUpMock ?? true,
    currentLevel: 12,
    previousLevel: 11,
    xpGained: 650,
    forced: Boolean(forceLevelUpMock),
  };

  return {
    mode: 'preview',
    dataSource: 'mock',
    variant: 'full',
    weekRange: { start: start.toISOString(), end: end.toISOString() },
    summary: {
      pillarDominant: 'Mind',
      highlight: 'Meditación al amanecer',
      completions: 3,
      xpTotal: 320,
      energyHighlight: { metric: 'HP', value: 88 },
      effortBalance: {
        easy: 4,
        medium: 3,
        hard: 2,
        total: 9,
        topTask: { title: 'Respiración consciente', completions: 3, difficulty: 'medium' },
        topHardTask: { title: 'Entrenamiento de fuerza', completions: 2 },
      },
    },
    emotions: mockEmotions,
    levelUp: mockLevelUp,
    sections: (
      [
        {
          key: 'intro',
          title: 'Weekly Wrapped · Preview',
          body: 'Tu semana, en movimiento.',
          accent: `Semana ${formatDate(start)} – ${formatDate(end)}`,
        },
        mockLevelUp.happened
          ? {
              key: 'level-up',
              title: 'Subida de nivel',
              body: 'Llegaste al nivel 12. Cada misión empujó este salto.',
              accent: 'Level Up',
            }
          : null,
        {
          key: 'achievements',
          title: 'Resumen semanal',
          body: 'Completaste 3 tareas y sumaste 320 XP esta semana.',
          accent: 'Datos reales',
        },
        {
          key: 'habits',
          title: 'Ritmo que se sostiene',
          body: 'Estos hábitos aparecieron de forma consistente y mantuvieron tu semana en movimiento.',
          items: [
            {
              title: 'Respiración consciente',
              body: '7/7 días. Sostuviste el compromiso.',
              badge: 'racha activa',
              pillar: 'Mind',
            },
            { title: 'Hidratación', body: '5/7 días. Sostuviste el compromiso.', pillar: 'Body' },
            { title: 'Stretch ligero', body: '4/7 días. Sostuviste el compromiso.', pillar: 'Body' },
          ],
        },
        {
          key: 'improvement',
          title: 'Progreso y foco',
          body: '“Cierre digital” fue el avance más claro: un paso breve que suma momentum.',
          accent: 'Momentum',
        },
        {
          key: 'pillar',
          title: 'Pilar dominante',
          body: '🧠 Mind dominó tu semana: más foco, menos ruido.',
          accent: 'Mind',
        },
        {
          key: 'highlight',
          title: 'Highlight emocional',
          body: mockEmotions.weekly?.weeklyMessage ?? 'Estado emocional en construcción.',
          accent: mockEmotions.weekly?.label ?? 'Emoción dominante',
          items:
            mockEmotions.biweekly?.biweeklyContext
              ? [
                  {
                    title: 'Contexto 15 días',
                    body: mockEmotions.biweekly.biweeklyContext,
                    badge: mockEmotions.biweekly.tone,
                  },
                ]
              : undefined,
        },
        {
          key: 'closing',
          title: 'Cierre',
          body: 'Seguimos. Mañana vuelve el Daily Quest para sumar otro paso.',
          accent: 'Mañana hay más',
        },
      ] as (WeeklyWrappedSection | null)[]
    ).filter((section): section is WeeklyWrappedSection => section !== null),
  };
}

function buildEmotionHighlight(entries: EmotionSnapshot[]): EmotionHighlight {
  const map = new Map<string, EmotionMessageKey>();

  for (const entry of entries) {
    const dateKey = normalizeDateKey(entry?.date);
    const emotionKey = normalizeEmotionKey(entry?.mood);
    if (dateKey && emotionKey) {
      map.set(dateKey, emotionKey);
    }
  }

  if (map.size === 0) {
    return { weekly: null, biweekly: null };
  }

  const latestKey = Array.from(map.keys()).sort().pop() ?? toDateKeyUTC(new Date());

  return {
    weekly: computeEmotionDominant(map, latestKey, 7),
    biweekly: computeEmotionDominant(map, latestKey, 15),
  };
}

function computeEmotionDominant(
  map: Map<string, EmotionMessageKey>,
  endKey: string,
  windowDays: number,
): EmotionHighlightEntry | null {
  const endDate = parseDateKey(endKey) ?? new Date();
  const startDate = daysAgoFrom(endDate, windowDays - 1);
  const startKey = toDateKeyUTC(startDate);
  const endRangeKey = toDateKeyUTC(endDate);

  const filtered = Array.from(map.entries())
    .filter(([key]) => key >= startKey && key <= endRangeKey)
    .sort(([a], [b]) => (a < b ? -1 : 1));

  if (filtered.length === 0) {
    return null;
  }

  const counts = new Map<EmotionMessageKey, { count: number; lastKey: string }>();
  for (const [key, emotion] of filtered) {
    const prev = counts.get(emotion);
    counts.set(emotion, { count: (prev?.count ?? 0) + 1, lastKey: key });
  }

  let winner: { key: EmotionMessageKey; count: number; lastKey: string } | null = null;
  for (const [key, info] of counts.entries()) {
    if (!winner || info.count > winner.count || (info.count === winner.count && info.lastKey > winner.lastKey)) {
      winner = { key, count: info.count, lastKey: info.lastKey };
    }
  }

  return winner ? buildEmotionEntry(winner.key) : null;
}

function buildEmotionEntry(key: EmotionMessageKey): EmotionHighlightEntry {
  const message = EMOTION_REFLECTIONS[key];
  return {
    key,
    label: message.label,
    tone: message.tone,
    color: EMOTION_COLORS[key] ?? '#0ea5e9',
    weeklyMessage: message.weeklyMessage,
    biweeklyContext: message.biweeklyContext,
  };
}

function normalizeEmotionKey(label: unknown): EmotionMessageKey | null {
  if (!label || typeof label !== 'string') {
    return null;
  }

  const normalized = normalizeText(label);
  return EMOTION_KEY_BY_NORMALIZED_LABEL[normalized] ?? null;
}

function normalizeDateKey(raw: unknown): string | null {
  if (!raw) {
    return null;
  }

  const asString = String(raw).trim();
  if (!asString) {
    return null;
  }

  const match = asString.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }

  const parsed = new Date(asString);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toDateKeyUTC(parsed);
}

function parseDateKey(key: string): Date | null {
  const normalized = normalizeDateKey(key);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateKeyUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', DATE_FORMAT);
}

function toDateInput(date: Date): string {
  return `${date.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

function daysAgo(days: number): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - days);
  return now;
}

function daysAgoFrom(reference: Date, days: number): Date {
  const copy = new Date(reference);
  copy.setDate(copy.getDate() - days);
  return copy;
}

function normalizeLevelSummary(response: UserLevelResponse): LevelSummary | null {
  const level = Number(response.current_level);
  const xpTotal = Number(response.xp_total);
  const xpRequiredCurrent = Number(response.xp_required_current ?? 0);
  const xpRequiredNext =
    response.xp_required_next === null || response.xp_required_next === undefined
      ? null
      : Number(response.xp_required_next);
  const xpToNext = response.xp_to_next == null ? null : Math.max(0, Number(response.xp_to_next));

  if (!Number.isFinite(level) || !Number.isFinite(xpTotal)) {
    return null;
  }

  return {
    level: Math.max(0, Math.round(level)),
    xpTotal: Math.max(0, xpTotal),
    xpRequiredCurrent: Math.max(0, xpRequiredCurrent),
    xpRequiredNext: xpRequiredNext == null || Number.isNaN(xpRequiredNext) ? null : Math.max(0, xpRequiredNext),
    xpToNext,
  } satisfies LevelSummary;
}

function detectLevelUp(summary: LevelSummary | null, xpGained: number, forced: boolean): LevelUpHighlight {
  if (forced) {
    return {
      happened: true,
      currentLevel: summary?.level ?? null,
      previousLevel: summary ? Math.max(0, summary.level - 1) : null,
      xpGained,
      forced,
    };
  }

  if (!summary) {
    return { happened: false, currentLevel: null, previousLevel: null, xpGained, forced };
  }

  const xpStart = Math.max(0, summary.xpTotal - xpGained);
  const leveledUp = xpStart < summary.xpRequiredCurrent;

  return {
    happened: leveledUp,
    currentLevel: summary.level,
    previousLevel: leveledUp ? Math.max(0, summary.level - 1) : summary.level,
    xpGained,
    forced,
  };
}

export function logWeeklyWrappedError(error: unknown) {
  logApiError('[admin][weekly-wrapped] failed to build preview', { error });
}

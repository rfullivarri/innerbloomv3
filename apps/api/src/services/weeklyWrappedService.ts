import { formatDateInTimezone } from '../controllers/users/user-state-service.js';
import type { InsightQuery, LogsQuery } from '../modules/admin/admin.schemas.js';
import { getUserInsights, getUserLogs } from '../modules/admin/admin.service.js';
import { HttpError } from '../lib/http-error.js';
import {
  findWeeklyWrappedByWeek,
  insertWeeklyWrapped,
  listActiveUsersWithLogs,
  listRecentWeeklyWrapped,
} from '../repositories/weekly-wrapped.repository.js';
import type {
  EmotionHighlight,
  EmotionHighlightEntry,
  EmotionMessageKey,
  LevelUpHighlight,
  WeeklyWrappedEntry,
  WeeklyWrappedPayload,
  WeeklyWrappedSection,
} from '../types/weeklyWrapped.js';
import { loadUserLevelSummary, type UserLevelSummary } from './userLevelSummaryService.js';

type EmotionSnapshot = { date: string; emotions: string[] };

type AdminLogRow = Awaited<ReturnType<typeof getUserLogs>>['items'][number];
type NormalizedLog = AdminLogRow & {
  parsedDate: Date;
  dateKey: string | null;
  quantity: number;
  state: 'red' | 'yellow' | 'green';
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
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

const EMOTION_COLORS: Record<EmotionMessageKey, string> = {
  calma: '#2ECC71',
  felicidad: '#F1C40F',
  motivacion: '#9B59B6',
  tristeza: '#3498DB',
  ansiedad: '#E74C3C',
  frustracion: '#8D6E63',
  cansancio: '#16A085',
};

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
    weeklyMessage: 'La ansiedad dijo presente. Soltá la exigencia y andá a un paso que puedas sostener.',
    biweeklyContext: 'Varias señales de alerta. Sumemos rituales que calmen y pidamos apoyo.',
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

export function resolveWeekRange(referenceDate: string): { start: string; end: string } {
  const parsed = parseDate(referenceDate);
  const sunday = startOfDay(parsed);
  sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay());
  const start = startOfDay(new Date(sunday));
  start.setUTCDate(sunday.getUTCDate() - 6);
  return { start: toDateKey(start), end: toDateKey(sunday) };
}

function parseDate(input: string): Date {
  const parsed = new Date(`${input}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, 'invalid_date', 'Invalid reference date for weekly wrapped');
  }
  return parsed;
}

function startOfDay(date: Date): Date {
  const clone = new Date(date);
  clone.setUTCHours(0, 0, 0, 0);
  return clone;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function maybeGenerateWeeklyWrappedForDate(
  userId: string,
  referenceDate: string,
): Promise<WeeklyWrappedEntry | null> {
  const { start, end } = resolveWeekRange(referenceDate);
  const existing = await findWeeklyWrappedByWeek(userId, end);
  if (existing) {
    return existing;
  }

  const payload = await buildWeeklyWrappedPayload(userId, { start, end });

  return insertWeeklyWrapped({ userId, weekStart: start, weekEnd: end, payload, summary: payload.summary });
}

export async function getRecentWeeklyWrapped(userId: string, limit = 2): Promise<WeeklyWrappedEntry[]> {
  return listRecentWeeklyWrapped(userId, limit) as Promise<WeeklyWrappedEntry[]>;
}

export async function runWeeklyWrappedJob(now: Date): Promise<{
  attempted: number;
  created: number;
  skipped: number;
  errors: { userId: string; reason: string }[];
}> {
  const todayKey = formatDateInTimezone(now, 'UTC');
  const { start, end } = resolveWeekRange(todayKey);
  const candidates = await listActiveUsersWithLogs(start, end);
  const errors: { userId: string; reason: string }[] = [];
  let created = 0;
  let skipped = 0;

  for (const userId of candidates) {
    try {
      const existing = await findWeeklyWrappedByWeek(userId, end);
      if (existing) {
        skipped += 1;
        continue;
      }
      await maybeGenerateWeeklyWrappedForDate(userId, end);
      created += 1;
    } catch (error) {
      errors.push({
        userId,
        reason: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  }

  return { attempted: candidates.length, created, skipped, errors };
}

async function buildWeeklyWrappedPayload(
  userId: string,
  range: { start: string; end: string },
): Promise<WeeklyWrappedPayload> {
  const [insights, logsResult, levelSummary] = await Promise.all([
    getUserInsights(userId, {} as InsightQuery),
    getUserLogs(userId, {
      from: range.start,
      to: range.end,
      page: 1,
      pageSize: 200,
      sort: 'date:asc',
    } as LogsQuery),
    loadUserLevelSummary(userId),
  ]);
  const emotions = buildEmotionSnapshots(insights.emotions?.last30 ?? [], range.end, 15);

  const normalizedLogs = normalizeLogs(logsResult.items ?? []);
  const latestLog = normalizedLogs.reduce<Date | null>((latest, log) => {
    if (!latest || log.parsedDate > latest) {
      return log.parsedDate;
    }
    return latest;
  }, null);

  const endDate = latestLog ?? new Date(`${range.end}T00:00:00Z`);
  const startDate = startOfDay(new Date(`${range.start}T00:00:00Z`));
  const { completions, habitCounts } = summarizeWeeklyActivity(normalizedLogs);
  const xpTotal = normalizedLogs
    .filter((log) => log.state !== 'red')
    .reduce((acc, log) => acc + Math.max(0, Number(log.xp ?? 0)), 0);
  const levelUp = detectLevelUp(levelSummary, xpTotal, false);

  const topHabits = habitCounts.slice(0, 3);
  const pillarDominant = dominantPillar(insights) ?? null;
  const variant: WeeklyWrappedPayload['variant'] = completions >= 3 ? 'full' : 'light';
  const highlight = topHabits[0]?.title ?? null;
  const emotionHighlight = buildEmotionHighlight(emotions);
  const weeklyEmotionMessage =
    emotionHighlight.weekly?.weeklyMessage ??
    'Necesitamos más registros recientes en el Emotion Chart para destacar tu ánimo de la semana.';
  const biweeklyEmotionMessage =
    emotionHighlight.biweekly?.biweeklyContext ??
    'En cuanto registremos más emociones, vamos a mostrar la tendencia de las últimas dos semanas.';
  const emotionAccent = emotionHighlight.weekly?.label ?? emotionHighlight.biweekly?.label ?? 'Sin emoción dominante';

  const sections: WeeklyWrappedSection[] = (
    [
      {
        key: 'intro',
        title: 'Weekly Wrapped',
        body: 'Tu semana, en movimiento.',
        accent: `Semana ${formatDate(startDate)} – ${formatDate(endDate)}`,
      },
      levelUp.happened
        ? {
            key: 'level-up',
            title: 'Subida de nivel',
            body: `Llegaste al nivel ${levelUp.currentLevel ?? 'nuevo'}. Impulso real para tu semana.`,
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
          topHabits.length > 0
            ? 'Estos hábitos aparecieron de forma consistente y mantuvieron tu semana en movimiento.'
            : 'Aún no registramos hábitos destacados esta semana, pero estás a un clic de retomarlos.',
        items:
          topHabits.length > 0
            ? topHabits.map((habit) => ({
                title: habit.title,
                body:
                  habit.daysActive > 0
                    ? `${habit.daysActive}/7 días. Sostuviste el compromiso.`
                    : 'Ritmo sólido esta semana. Constancia pura.',
                badge: habit.badge,
                pillar: habit.pillar,
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
    mode: 'final',
    dataSource: 'real',
    variant,
    weekRange: { start: startDate.toISOString(), end: endDate.toISOString() },
    summary: { pillarDominant, highlight },
    emotions: emotionHighlight,
    levelUp,
    sections,
  };
}

function normalizeLogs(logs: AdminLogRow[]): NormalizedLog[] {
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

function summarizeWeeklyActivity(logs: NormalizedLog[]): {
  completions: number;
  habitCounts: ReturnType<typeof aggregateHabits>;
} {
  const meaningfulLogs = logs.filter((log) => log.state !== 'red' && log.dateKey);
  const completions = meaningfulLogs.reduce((acc, log) => acc + log.quantity, 0);
  const habitCounts = aggregateHabits(meaningfulLogs);

  return { completions, habitCounts };
}

function aggregateHabits(logs: NormalizedLog[]) {
  const map = new Map<
    string,
    { title: string; days: Set<string>; completions: number; pillar: string | null; badge: string | undefined }
  >();

  for (const log of logs) {
    if (!log.dateKey) {
      continue;
    }

    const key = (log as { taskName?: string }).taskName || (log as { taskId?: string }).taskId;
    if (!key) {
      continue;
    }
    const current = map.get(key) ?? {
      title: (log as { taskName?: string }).taskName || 'Hábito sin nombre',
      days: new Set<string>(),
      completions: 0,
      pillar: (log as { pillar?: string }).pillar ?? null,
      badge: undefined,
    };
    current.days.add(log.dateKey);
    current.completions += Math.max(1, Number(log.quantity ?? 1));
    map.set(key, current);
  }

  return Array.from(map.values())
    .map((entry) => ({
      title: entry.title,
      completions: entry.completions,
      daysActive: entry.days.size,
      pillar: entry.pillar,
      badge: entry.completions >= 3 ? 'Racha' : undefined,
    }))
    .sort((a, b) => b.daysActive - a.daysActive || b.completions - a.completions || a.title.localeCompare(b.title));
}

function dominantPillar(insights: Awaited<ReturnType<typeof getUserInsights>>): string | undefined {
  const entries = [
    { code: 'Body', value: insights.constancyWeekly.body ?? 0 },
    { code: 'Mind', value: insights.constancyWeekly.mind ?? 0 },
    { code: 'Soul', value: insights.constancyWeekly.soul ?? 0 },
  ];

  const sorted = entries
    .map((entry) => ({ ...entry, value: Number(entry.value ?? 0) }))
    .filter((entry) => Number.isFinite(entry.value))
    .sort((a, b) => b.value - a.value);

  if (sorted.length === 0 || sorted[0]?.value <= 0) {
    return undefined;
  }

  return sorted[0]?.code;
}

function buildEmotionHighlight(emotions: EmotionSnapshot[]): EmotionHighlight {
  const weekly = dominantEmotion(emotions.slice(0, 7));
  const biweekly = dominantEmotion(emotions.slice(0, 15));

  return { weekly, biweekly };
}

function dominantEmotion(emotions: EmotionSnapshot[]): EmotionHighlightEntry | null {
  const counts = new Map<EmotionMessageKey, number>();

  for (const snapshot of emotions) {
    for (const emotion of snapshot.emotions ?? []) {
      const normalizedKey = EMOTION_KEY_BY_LABEL[emotion] ?? EMOTION_KEY_BY_NORMALIZED_LABEL[normalizeText(emotion)];
      if (!normalizedKey) continue;
      counts.set(normalizedKey, (counts.get(normalizedKey) ?? 0) + 1);
    }
  }

  const sorted = Array.from(counts.entries())
    .map(([key, value]) => ({ key, value, ref: EMOTION_REFLECTIONS[key] }))
    .filter((entry) => entry.ref)
    .sort((a, b) => b.value - a.value);

  return sorted[0]?.ref ?? null;
}

function buildEmotionSnapshots(emotions: string[], endDate: string, days: number): EmotionSnapshot[] {
  const to = parseDate(endDate);
  const maxEntries = Math.max(0, days);
  const snapshots: EmotionSnapshot[] = [];

  for (let index = 0; index < emotions.length && snapshots.length < maxEntries; index += 1) {
    const emotion = emotions[index];
    if (!emotion) continue;
    const date = new Date(to);
    date.setUTCDate(to.getUTCDate() - index);
    snapshots.push({ date: toDateKey(date), emotions: [emotion] });
  }

  return snapshots;
}

function getPillarIcon(pillar?: string | null): string {
  if (!pillar) return '';
  const icons: Record<string, string> = { Body: '🫀', Mind: '🧠', Soul: '🏵️' };
  return icons[pillar] ?? '';
}

function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
}

function parseDateKey(key: string): Date | null {
  const normalized = normalizeDateKey(key);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeDateKey(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const asString = value.toString();

  const match = asString.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }

  const parsed = new Date(asString);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function detectLevelUp(summary: UserLevelSummary | null, xpGained: number, forced: boolean): LevelUpHighlight {
  if (forced) {
    return {
      happened: true,
      currentLevel: summary?.currentLevel ?? null,
      previousLevel: summary ? Math.max(0, summary.currentLevel - 1) : null,
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
    currentLevel: summary.currentLevel,
    previousLevel: leveledUp ? Math.max(0, summary.currentLevel - 1) : summary.currentLevel,
    xpGained,
    forced,
  };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', DATE_FORMAT);
}

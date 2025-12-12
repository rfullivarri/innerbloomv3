import emotionMessages from 'config/emotion_messages.json';

import type { EmotionSnapshot } from './api';
import type { AdminInsights, AdminLogRow } from './types';
import { fetchAdminInsights, fetchAdminLogs } from './adminApi';
import { getEmotions } from './api';
import { logApiError } from './logger';

type EmotionMessageKey = keyof typeof emotionMessages;

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
  items?: { title: string; body: string; badge?: string }[];
};

export type WeeklyWrappedPayload = {
  mode: 'preview';
  dataSource: 'real' | 'mock';
  variant: 'full' | 'light';
  weekRange: { start: string; end: string };
  summary: {
    pillarDominant: string | null;
    highlight: string | null;
  };
  emotions: EmotionHighlight;
  sections: WeeklyWrappedSection[];
};

type BuildOptions = {
  userId: string;
  dataSource: 'real' | 'mock';
};

type NormalizedLog = AdminLogRow & {
  parsedDate: Date;
  dateKey: string | null;
  quantity: number;
  state: 'red' | 'yellow' | 'green';
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
const MAX_LOG_PAGE_SIZE = 100;

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

export async function buildWeeklyWrappedPreviewPayload(
  options: BuildOptions,
): Promise<WeeklyWrappedPayload> {
  if (options.dataSource === 'mock') {
    return buildMockWeeklyWrapped();
  }

  const [insights, logs, emotions] = await Promise.all([
    fetchAdminInsights(options.userId),
    fetchLogsForRange(options.userId, {
      from: toDateInput(daysAgo(6)),
      to: toDateInput(new Date()),
    }),
    getEmotions(options.userId, { days: 15 }),
  ]);

  return buildWeeklyWrappedFromData(insights, logs, emotions);
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

export function summarizeWeeklyActivity(logs: NormalizedLog[]): {
  completions: number;
  habitCounts: ReturnType<typeof aggregateHabits>;
} {
  const meaningfulLogs = logs.filter((log) => log.state !== 'red' && log.dateKey);
  const completions = meaningfulLogs.reduce((acc, log) => acc + log.quantity, 0);
  const habitCounts = aggregateHabits(meaningfulLogs);

  return { completions, habitCounts };
}

export function buildWeeklyWrappedFromData(
  insights: AdminInsights,
  logs: AdminLogRow[],
  emotions: EmotionSnapshot[],
): WeeklyWrappedPayload {
  const normalizedLogs = normalizeLogs(logs);
  const latestLog = normalizedLogs.reduce<Date | null>((latest, log) => {
    if (!latest || log.parsedDate > latest) {
      return log.parsedDate;
    }
    return latest;
  }, null);

  const endDate = latestLog ?? new Date();
  const startDate = daysAgoFrom(endDate, 6);
  const periodLabel = `${formatDate(startDate)} – ${formatDate(endDate)}`;

  const { completions, habitCounts } = summarizeWeeklyActivity(normalizedLogs);
  const xpTotal = normalizedLogs
    .filter((log) => log.state !== 'red')
    .reduce((acc, log) => acc + Math.max(0, Number(log.xp ?? 0)), 0);

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

  const sections: WeeklyWrappedSection[] = [
    {
      key: 'intro',
      title: 'Weekly Wrapped',
      body: `Tu semana (${periodLabel}) está lista. Respirá y recorré tus logros.`,
      accent: 'Celebrá el recorrido',
    },
    {
      key: 'achievements',
      title: 'Logros principales',
      body:
        completions > 0
          ? `Completaste ${completions} misiones y hábitos, sumando ${xpTotal.toLocaleString('es-AR')} XP.`
          : 'Semana tranquila: sin registros fuertes, pero el reset también suma.',
      accent: completions > 0 ? 'Impulso sostenido' : 'Ritmo liviano',
    },
    {
      key: 'habits',
      title: 'Hábitos constantes',
      body:
        topHabits.length > 0
          ? 'Estos hábitos marcaron tu ritmo y mantuvieron la semana en movimiento.'
          : 'Aún no registramos hábitos destacados esta semana, pero estás a un clic de retomarlos.',
      items:
        topHabits.length > 0
          ? topHabits.map((habit) => ({
              title: habit.title,
              body:
                habit.daysActive > 0
                  ? `${habit.daysActive}/7 días en marcha. ${
                      habit.pillar ? `${habit.pillar} te acompañó.` : 'Constancia pura.'
                    }`
                  : `Ritmo sólido esta semana. ${habit.pillar ? `${habit.pillar} te acompañó.` : 'Constancia pura.'}`,
              badge: habit.badge,
            }))
          : undefined,
    },
    {
      key: 'improvement',
      title: 'Movimiento y mejoras',
      body:
        highlight
          ? `${highlight} tuvo su mini salto esta semana. Pequeñas mejoras que sostienen el largo plazo.`
          : 'No vimos mejoras claras, así que priorizamos el descanso y volvemos a empujar mañana.',
      accent: highlight ? 'Nivel up suave' : 'Preparando la próxima racha',
    },
    {
      key: 'pillar',
      title: 'Pilar dominante',
      body:
        pillarDominant
          ? `${pillarDominant} lideró tu energía estos días. Seguí apoyándote en ese foco.`
          : 'Sin un pilar dominante esta semana: espacio abierto para explorar Body, Mind o Soul.',
      accent: pillarDominant ?? 'Balanceado',
    },
    {
      key: 'highlight',
      title: 'Highlight emocional',
      body: weeklyEmotionMessage,
      accent: emotionAccent,
      items:
        biweeklyEmotionMessage
          ? [
              {
                title: 'Contexto 15 días',
                body: biweeklyEmotionMessage,
                badge: emotionHighlight.biweekly?.tone,
              },
            ]
          : undefined,
    },
    {
      key: 'closing',
      title: 'Cierre',
      body: 'Seguimos. Mañana vuelve el Daily Quest para sumar más.',
      accent: 'Mañana hay más',
    },
  ];

  return {
    mode: 'preview',
    dataSource: 'real',
    variant,
    weekRange: { start: startDate.toISOString(), end: endDate.toISOString() },
    summary: { pillarDominant, highlight },
    emotions: emotionHighlight,
    sections,
  };
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

    const key = log.taskName || log.taskId;
    if (!key) {
      continue;
    }
    const current = map.get(key) ?? {
      title: log.taskName || 'Hábito sin nombre',
      days: new Set<string>(),
      completions: 0,
      pillar: log.pillar ?? null,
      badge: undefined,
    };
    current.days.add(log.dateKey);
    current.completions += log.quantity;
    if (!current.badge && current.days.size >= 5) {
      current.badge = 'racha activa';
    }
    map.set(key, current);
  }

  return Array.from(map.values())
    .map((entry) => ({
      title: entry.title,
      daysActive: entry.days.size,
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

function buildMockWeeklyWrapped(): WeeklyWrappedPayload {
  const start = daysAgo(6);
  const end = new Date();
  const mockEmotions: EmotionHighlight = {
    weekly: buildEmotionEntry('felicidad'),
    biweekly: buildEmotionEntry('motivacion'),
  };

  return {
    mode: 'preview',
    dataSource: 'mock',
    variant: 'full',
    weekRange: { start: start.toISOString(), end: end.toISOString() },
    summary: {
      pillarDominant: 'Mind',
      highlight: 'Meditación al amanecer',
    },
    emotions: mockEmotions,
    sections: [
      {
        key: 'intro',
        title: 'Weekly Wrapped',
        body: `Tu semana (${formatDate(start)} – ${formatDate(end)}) está lista. Respirá y recorré tus logros.`,
        accent: 'Vista previa mock',
      },
      {
        key: 'achievements',
        title: 'Logros principales',
        body: '3 misiones completadas y +320 XP. Cerraste la semana con energía.',
        accent: 'Impulso sostenido',
      },
      {
        key: 'habits',
        title: 'Hábitos constantes',
        body: 'Estos hábitos mantuvieron la llama encendida.',
        items: [
          { title: 'Respiración consciente', body: '7/7 días. Ritmo impecable.', badge: 'racha activa' },
          { title: 'Hidratación', body: '5/7 días. Más energía durante el día.' },
          { title: 'Stretch ligero', body: '4/7 días. Tu cuerpo lo agradece.' },
        ],
      },
      {
        key: 'improvement',
        title: 'Movimiento y mejoras',
        body: 'Sumaste una mejora: le diste forma a “Cierre digital” y lo repetiste 3 veces.',
        accent: 'Nivel up suave',
      },
      {
        key: 'pillar',
        title: 'Pilar dominante',
        body: 'Mind dominó tu semana: más foco, menos ruido.',
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
        body: 'Seguimos. Mañana vuelve el Daily Quest para sumar más.',
        accent: 'Mañana hay más',
      },
    ],
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
  const message = emotionMessages[key];
  return {
    key,
    label: message.label,
    tone: message.tone,
    color: EMOTION_COLORS[key] ?? '#0ea5e9',
    weeklyMessage: message.weekly_message,
    biweeklyContext: message.biweekly_context,
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

export function logWeeklyWrappedError(error: unknown) {
  logApiError('[admin][weekly-wrapped] failed to build preview', { error });
}

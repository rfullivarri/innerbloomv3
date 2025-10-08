import { useMemo } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getEmotions, type EmotionSnapshot } from '../../lib/api';
import { asArray } from '../../lib/safe';

interface EmotionTimelineProps {
  userId: string;
}

const HEATMAP_WEEKS = 26;
const DAYS_PER_WEEK = 7;
const EMPTY_COLOR = '#555555';

const EMOTION_ORDER = [
  'Calma',
  'Felicidad',
  'Motivación',
  'Tristeza',
  'Ansiedad',
  'Frustración',
  'Cansancio',
] as const;

type EmotionName = (typeof EMOTION_ORDER)[number];

const EMOTION_COLORS: Record<EmotionName | 'Sin registro', string> = {
  Calma: '#2ECC71',
  Felicidad: '#F1C40F',
  Motivación: '#9B59B6',
  Tristeza: '#3498DB',
  Ansiedad: '#E74C3C',
  Frustración: '#8D6E63',
  Cansancio: '#16A085',
  'Sin registro': EMPTY_COLOR,
};

const LEGEND_ITEMS: Array<EmotionName | 'Sin registro'> = [...EMOTION_ORDER, 'Sin registro'];

type GridCell = {
  key: string;
  color: string;
  label: string;
  emotion: EmotionName | '';
};

type GridComputation = {
  columns: GridCell[][];
  period: { from: Date; to: Date };
  highlight: { emotion: EmotionName; color: string } | null;
};

const EMOTION_NORMALIZATION: Record<string, EmotionName> = {
  calma: 'Calma',
  calm: 'Calma',
  calmness: 'Calma',
  felicidad: 'Felicidad',
  feliz: 'Felicidad',
  happiness: 'Felicidad',
  happy: 'Felicidad',
  motivacion: 'Motivación',
  motivation: 'Motivación',
  motivado: 'Motivación',
  motivada: 'Motivación',
  motivante: 'Motivación',
  motivador: 'Motivación',
  tristeza: 'Tristeza',
  triste: 'Tristeza',
  sadness: 'Tristeza',
  sad: 'Tristeza',
  ansiedad: 'Ansiedad',
  anxiety: 'Ansiedad',
  ansioso: 'Ansiedad',
  ansiosa: 'Ansiedad',
  frustracion: 'Frustración',
  frustration: 'Frustración',
  frustrado: 'Frustración',
  frustrada: 'Frustración',
  cansancio: 'Cansancio',
  cansado: 'Cansancio',
  cansada: 'Cansancio',
  tiredness: 'Cansancio',
  tired: 'Cansancio',
  fatigue: 'Cansancio',
  neutral: 'Cansancio',
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function startOfWeekMonday(date: Date): Date {
  const result = startOfDay(date);
  const day = result.getDay();
  const diff = (day + 6) % 7;
  result.setDate(result.getDate() - diff);
  return result;
}

function ymd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseAnyDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return startOfDay(value);
  }

  const str = String(value).trim();
  if (!str) return null;

  const isoMatch = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(str);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const esMatch = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/.exec(str);
  if (esMatch) {
    const [, d, m, y] = esMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(str);
  if (Number.isNaN(fallback.getTime())) {
    return null;
  }
  return startOfDay(fallback);
}

function normalizeEmotion(value: unknown): EmotionName | '' {
  if (value == null) return '';
  let str = String(value).trim();
  if (!str) return '';

  const dashIndex = str.search(/[–—]/);
  if (dashIndex >= 0) {
    str = str.slice(0, dashIndex);
  }
  str = str.trim();
  if (!str) return '';

  const normalized = str
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

  const direct = EMOTION_NORMALIZATION[normalized];
  if (direct) return direct;

  const cleaned = normalized.replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const cleanedDirect = EMOTION_NORMALIZATION[cleaned];
  if (cleanedDirect) return cleanedDirect;

  const firstWord = cleaned.split(' ')[0];
  return EMOTION_NORMALIZATION[firstWord] ?? '';
}

function computeHighlight(map: Map<string, EmotionName | ''>, endKey: string, limit = 15) {
  const entries = Array.from(map.entries())
    .filter(([key, emotion]) => key <= endKey && !!emotion)
    .sort(([a], [b]) => (a < b ? -1 : 1));

  if (entries.length === 0) {
    return null;
  }

  const recent = entries.slice(-limit);
  const counts = new Map<EmotionName, { count: number; lastKey: string }>();

  for (const [key, emotion] of recent) {
    if (!emotion) continue;
    const prev = counts.get(emotion);
    if (prev) {
      counts.set(emotion, { count: prev.count + 1, lastKey: key });
    } else {
      counts.set(emotion, { count: 1, lastKey: key });
    }
  }

  let winner: { emotion: EmotionName; count: number; lastKey: string } | null = null;
  for (const [emotion, info] of counts.entries()) {
    if (
      !winner ||
      info.count > winner.count ||
      (info.count === winner.count && info.lastKey > winner.lastKey)
    ) {
      winner = { emotion, count: info.count, lastKey: info.lastKey };
    }
  }

  return winner ? { emotion: winner.emotion, color: EMOTION_COLORS[winner.emotion] } : null;
}

function formatPeriod(from: Date, to: Date): string {
  const sameYear = from.getFullYear() === to.getFullYear();
  const fromFormatter = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const toFormatter = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${fromFormatter.format(from)} – ${toFormatter.format(to)}`;
}

function buildGrid(data: unknown): GridComputation {
  const items = asArray<EmotionSnapshot | { fecha?: string; emocion?: string }>(data);
  const map = new Map<string, EmotionName | ''>();
  let latestDate: Date | null = null;

  for (const entry of items) {
    const raw = entry as any;
    const rawDate = raw?.fecha ?? raw?.date ?? raw?.day ?? raw?.created_at ?? raw?.timestamp;
    const rawEmotion = raw?.emocion ?? raw?.mood ?? raw?.emotion ?? raw?.emotion_id;

    const parsedDate = parseAnyDate(rawDate);
    if (!parsedDate) continue;

    const key = ymd(parsedDate);
    const normalizedEmotion = normalizeEmotion(rawEmotion);
    map.set(key, normalizedEmotion);

    if (!latestDate || parsedDate.getTime() > latestDate.getTime()) {
      latestDate = parsedDate;
    }
  }

  const today = startOfDay(new Date());
  const effectiveEndDate = latestDate && latestDate.getTime() > today.getTime() ? latestDate : today;
  const endMonday = startOfWeekMonday(effectiveEndDate);
  const startDate = addDays(endMonday, -DAYS_PER_WEEK * (HEATMAP_WEEKS - 1));
  const endDate = addDays(startDate, HEATMAP_WEEKS * DAYS_PER_WEEK - 1);

  const columns: GridCell[][] = [];

  for (let week = 0; week < HEATMAP_WEEKS; week += 1) {
    const weekCells: GridCell[] = [];
    for (let dayIndex = 0; dayIndex < DAYS_PER_WEEK; dayIndex += 1) {
      const cellDate = addDays(startDate, week * DAYS_PER_WEEK + dayIndex);
      const key = ymd(cellDate);
      const emotion = map.get(key) ?? '';
      const label = emotion || 'Sin registro';
      const color = EMOTION_COLORS[emotion || 'Sin registro'];
      weekCells.push({ key, color, label, emotion });
    }
    columns.push(weekCells);
  }

  const highlight = computeHighlight(map, ymd(effectiveEndDate));

  return {
    columns,
    period: { from: startDate, to: endDate },
    highlight,
  };
}

export function EmotionTimeline({ userId }: EmotionTimelineProps) {
  const { data, status } = useRequest(
    () => getEmotions(userId, { days: HEATMAP_WEEKS * DAYS_PER_WEEK + 30 }),
    [userId],
  );

  const grid = useMemo(() => buildGrid(data), [data]);
  const periodLabel = useMemo(() => formatPeriod(grid.period.from, grid.period.to), [grid.period.from, grid.period.to]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3 text-white">
        <h3 className="text-lg font-semibold">💗 Emotion Chart</h3>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-text-muted">
          Últimas 26 semanas
        </span>
      </header>

      {status === 'loading' && <div className="mt-6 h-48 w-full animate-pulse rounded-2xl bg-white/10" />}

      {status === 'error' && <p className="mt-6 text-sm text-rose-300">Todavía no pudimos cargar tus emociones.</p>}

      {status === 'success' && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-2 text-xs text-text-muted">
            {LEGEND_ITEMS.map((name) => (
              <span
                key={name}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] text-white/80"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: EMOTION_COLORS[name] }} />
                {name}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            <div className="overflow-x-auto pb-2">
              <div id="emotionChart" className="emotion-grid--weekcols mx-auto min-w-max">
                {grid.columns.map((week, weekIndex) => (
                  <div key={weekIndex} className="emotion-col">
                    {week.map((cell) => (
                      <div
                        key={cell.key}
                        className="emotion-cell"
                        style={{ backgroundColor: cell.color }}
                        title={`${cell.key} — ${cell.label}`}
                        aria-label={`${cell.key} — ${cell.label}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-text-muted">Período analizado: {periodLabel}</p>
          </div>

          {grid.highlight && (
            <div
              id="emotion-destacada"
              className="emotion-highlight flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white"
            >
              <div
                className="big-box h-12 w-12 rounded-2xl border border-white/10"
                style={{ backgroundColor: grid.highlight.color }}
              />
              <div>
                <p className="text-base font-semibold">{grid.highlight.emotion}</p>
                <p className="text-xs text-text-muted">Emoción más frecuente en los últimos 15 días</p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

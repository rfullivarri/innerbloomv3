import { useMemo } from 'react';
import { Card } from '../ui/Card';
import { useRequest } from '../../hooks/useRequest';
import { getEmotions, type EmotionSnapshot } from '../../lib/api';
import { asArray, dateStr } from '../../lib/safe';

interface EmotionChartCardProps {
  userId: string;
}

const EMOTION_COLORS: Record<string, string> = {
  Calma: '#2ECC71',
  Felicidad: '#F1C40F',
  Motivación: '#9B59B6',
  Tristeza: '#3498DB',
  Ansiedad: '#E74C3C',
  Frustración: '#8D6E63',
  Cansancio: '#16A085',
};

const LEGEND = [
  { name: 'Calma', color: EMOTION_COLORS.Calma },
  { name: 'Felicidad', color: EMOTION_COLORS.Felicidad },
  { name: 'Motivación', color: EMOTION_COLORS.Motivación },
  { name: 'Tristeza', color: EMOTION_COLORS.Tristeza },
  { name: 'Ansiedad', color: EMOTION_COLORS.Ansiedad },
  { name: 'Frustración', color: EMOTION_COLORS.Frustración },
  { name: 'Cansancio', color: EMOTION_COLORS.Cansancio },
] satisfies Array<{ name: keyof typeof EMOTION_COLORS; color: string }>;

const NUM_WEEKS = 26;
const DAYS_IN_WEEK = 7;
const LOOKBACK_FOR_HIGHLIGHT = 15;

function buildRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (NUM_WEEKS * DAYS_IN_WEEK - 1));
  return { from: dateStr(from), to: dateStr(to) };
}

function normalizeMood(value: string | undefined | null): string {
  const normalized = (value ?? '').trim();
  if (!normalized) {
    return '';
  }
  if (/neutral/i.test(normalized)) {
    return 'Cansancio';
  }
  return normalized;
}

function toUtcStart(dateLike: string): Date {
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }
  parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  return start;
}

type NormalizedEmotion = {
  day: string;
  mood: string;
};

type GridCell = {
  key: string;
  date: Date;
  mood: string | null;
};

type MonthLabel = {
  key: string;
  label: string;
};

function buildGrid(entries: NormalizedEmotion[], range: { from: string; to: string }) {
  const emotionMap = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.day) continue;
    emotionMap.set(entry.day, entry.mood);
  }

  const toDate = toUtcStart(range.to);
  const start = startOfWeek(new Date(toDate));
  start.setUTCDate(start.getUTCDate() - (NUM_WEEKS * DAYS_IN_WEEK - 1));

  const totalCells = NUM_WEEKS * DAYS_IN_WEEK;
  const cells: GridCell[] = [];
  for (let index = 0; index < totalCells; index += 1) {
    const cellDate = new Date(start);
    cellDate.setUTCDate(start.getUTCDate() + index);
    const key = dateStr(cellDate);
    cells.push({
      key: `${key}-${index}`,
      date: cellDate,
      mood: emotionMap.get(key) ?? null,
    });
  }

  const monthFormatter = new Intl.DateTimeFormat('es-AR', { month: 'short' });
  const monthLabels: MonthLabel[] = [];
  let previousMonth = -1;
  for (let column = 0; column < NUM_WEEKS; column += 1) {
    const labelDate = new Date(start);
    labelDate.setUTCDate(start.getUTCDate() + column * DAYS_IN_WEEK);
    const month = labelDate.getUTCMonth();
    const label = month !== previousMonth ? monthFormatter.format(labelDate) : '';
    previousMonth = month;
    monthLabels.push({ key: `${dateStr(labelDate)}-${column}`, label: label.toLowerCase() });
  }

  return { cells, monthLabels };
}

function computeMostFrequent(entries: NormalizedEmotion[]): { name: string; count: number } | null {
  if (entries.length === 0) {
    return null;
  }

  const sorted = [...entries].sort((a, b) => (a.day > b.day ? 1 : -1));
  const recent = sorted.slice(-LOOKBACK_FOR_HIGHLIGHT);

  const counter = new Map<string, number>();
  for (const entry of recent) {
    if (!entry.mood) continue;
    counter.set(entry.mood, (counter.get(entry.mood) ?? 0) + 1);
  }

  let top: { name: string; count: number } | null = null;
  for (const [name, count] of counter.entries()) {
    if (!top || count > top.count) {
      top = { name, count };
    }
  }

  return top;
}

export function EmotionChartCard({ userId }: EmotionChartCardProps) {
  const range = useMemo(buildRange, []);
  const { data, status } = useRequest(
    () => getEmotions(userId, range),
    [userId, range.from, range.to],
  );

  const entries = useMemo(() => {
    return asArray<EmotionSnapshot>(data)
      .map((row) => {
        const rawDate = (row as any)?.day ?? row.date ?? (row as any)?.fecha ?? (row as any)?.created_at ?? (row as any)?.timestamp;
        const day = dateStr(rawDate);
        const normalizedMood = normalizeMood(row.mood ?? (row as any)?.emotion ?? (row as any)?.emocion);
        return {
          day,
          mood: normalizedMood,
        } satisfies NormalizedEmotion;
      })
      .filter((entry) => !!entry.day);
  }, [data]);

  const { cells, monthLabels } = useMemo(() => buildGrid(entries, range), [entries, range]);
  const mostFrequent = useMemo(() => computeMostFrequent(entries), [entries]);
  const tooltipFormatter = useMemo(() => new Intl.DateTimeFormat('es-AR', { month: 'short', day: 'numeric' }), []);

  const rangeLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return '';
    }
    return `${formatter.format(fromDate)} – ${formatter.format(toDate)}`;
  }, [range.from, range.to]);

  return (
    <Card
      title="💗 Emotion Chart"
      subtitle="Últimos 6 meses"
      rightSlot={
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
          Heatmap XP
        </span>
      }
    >
      {status === 'loading' && <div className="h-48 w-full animate-pulse rounded-2xl bg-white/10" />}

      {status === 'error' && (
        <p className="text-sm text-rose-300">Todavía no pudimos cargar tus emociones.</p>
      )}

      {status === 'success' && entries.length === 0 && (
        <p className="text-sm text-slate-400">Registrá tu primera emoción para ver el mapa de calor.</p>
      )}

      {status === 'success' && entries.length > 0 && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            {LEGEND.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded-md border border-white/10"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-slate-100">{item.name}</span>
              </div>
            ))}
          </div>

          {rangeLabel && <p className="text-xs text-slate-400">Período analizado: {rangeLabel}</p>}

          <div className="rounded-2xl border border-white/10 bg-[#1b1f36]/80 p-4">
            <div className="flex flex-col gap-3">
              <div className="grid grid-flow-col auto-cols-[14px] justify-items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
                {monthLabels.map((month) => (
                  <div key={month.key} className="flex h-4 w-[14px] items-center justify-center">
                    {month.label}
                  </div>
                ))}
              </div>
              <div className="grid grid-flow-col auto-cols-[14px] grid-rows-7 justify-items-center gap-1">
                {cells.map((cell) => {
                  const color = cell.mood ? EMOTION_COLORS[cell.mood] ?? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)';
                  const dateLabel = tooltipFormatter.format(cell.date);
                  const moodLabel = cell.mood ?? 'Sin registro';
                  return (
                    <div
                      key={cell.key}
                      className="h-3 w-3 rounded-[3px]"
                      style={{ backgroundColor: color }}
                      title={`${dateLabel} – ${moodLabel}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {mostFrequent && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div
                className="h-10 w-10 rounded-full"
                style={{ backgroundColor: EMOTION_COLORS[mostFrequent.name] ?? 'rgba(255,255,255,0.25)' }}
              />
              <div>
                <p className="font-semibold text-slate-100">{mostFrequent.name}</p>
                <p className="text-xs text-slate-400">
                  Emoción más frecuente en los últimos {LOOKBACK_FOR_HIGHLIGHT} días ({mostFrequent.count} registros)
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export { EmotionChartCard as EmotionChart };

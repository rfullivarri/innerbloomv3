import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { useRequest } from '../../hooks/useRequest';
import { getEmotions, type EmotionSnapshot } from '../../lib/api';
import { asArray } from '../../lib/safe';
import '../../styles/panel-rachas.overrides.css';
import { InfoDotTarget } from '../InfoDot/InfoDotTarget';

interface EmotionChartCardProps {
  userId: string;
}

const GAP = 6;
const MEDIUM_GAP = 4;
const SMALL_GAP = 2;
const MIN_CELL_SIZE = 8;
const CELL_SCALE = 1;
const NUM_WEEKS = 26;
const DAYS_IN_WEEK = 7;
const LOOKBACK_FOR_HIGHLIGHT = 15;
const TOTAL_DAYS = NUM_WEEKS * DAYS_IN_WEEK;
const GRID_SCALE = 1.4;

const MONTH_ABBREVIATIONS = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEPT',
  'OCT',
  'NOV',
  'DIC',
] as const;

const FALLBACK_MONTH_FORMATTER = new Intl.DateTimeFormat('es-ES', { month: 'short' });

const EMOTION_NAMES = [
  'Calma',
  'Felicidad',
  'Motivación',
  'Tristeza',
  'Ansiedad',
  'Frustración',
  'Cansancio',
] as const;

type EmotionName = (typeof EMOTION_NAMES)[number];
type EmotionValue = EmotionName | 'Sin registro';

type NormalizedEmotionEntry = {
  key: string;
  date: Date;
  emotion: EmotionValue;
  rawEmotion: string | null;
  rawDate: string | null;
};

type EmotionColumn = {
  key: string;
  startDate: Date;
  cells: GridCell[];
};

type GridCell = {
  key: string;
  date: Date;
  emotion: EmotionValue;
  color: string;
  origin: 'backend' | 'frontend';
  rawEmotion: string | null;
  rawDate: string | null;
};

type EmotionHighlight = {
  emotion: EmotionName;
  color: string;
  count: number;
};

type MonthSegment = {
  key: string;
  label: string;
  startIndex: number;
  span: number;
};

type EmotionMapResult = {
  map: Map<string, NormalizedEmotionEntry>;
  keys: string[];
  minDate: Date | null;
  maxDate: Date | null;
};

type RawEmotionArray = Array<unknown>;

const EMOTION_COLORS: Record<EmotionValue, string> = {
  Calma: '#2ECC71',
  Felicidad: '#F1C40F',
  Motivación: '#9B59B6',
  Tristeza: '#3498DB',
  Ansiedad: '#E74C3C',
  Frustración: '#8D6E63',
  Cansancio: '#16A085',
  'Sin registro': '#555555',
};

const LEGEND: Array<{ name: EmotionName; color: string }> = EMOTION_NAMES.map((name) => ({
  name,
  color: EMOTION_COLORS[name],
}));

function removeDiacritics(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseAnyDate(value: unknown): Date | null {
  if (!value && value !== 0) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const copy = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const fromTs = new Date(value);
    if (Number.isNaN(fromTs.getTime())) return null;
    const copy = new Date(fromTs.getFullYear(), fromTs.getMonth(), fromTs.getDate());
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map((part) => parseInt(part, 10));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  const isoDateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s]|$)/);
  if (isoDateMatch) {
    const [y, m, d] = isoDateMatch[1].split('-').map((part) => parseInt(part, 10));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split('/').map((part) => parseInt(part, 10));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  const isoCandidate = new Date(raw);
  if (!Number.isNaN(isoCandidate.getTime())) {
    const copy = new Date(isoCandidate.getFullYear(), isoCandidate.getMonth(), isoCandidate.getDate());
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  return null;
}

function ymd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeEmotion(value: unknown): EmotionValue {
  if (!value && value !== 0) return 'Sin registro';

  const raw = removeDiacritics(String(value).trim().toLowerCase());
  if (!raw) return 'Sin registro';
  if (raw === 'neutral') return 'Cansancio';

  const mapping: Record<string, EmotionName> = {
    '1': 'Calma',
    '2': 'Felicidad',
    '3': 'Motivación',
    '4': 'Tristeza',
    '5': 'Ansiedad',
    '6': 'Frustración',
    '7': 'Cansancio',
    calma: 'Calma',
    calm: 'Calma',
    alegria: 'Felicidad',
    felicidad: 'Felicidad',
    feliz: 'Felicidad',
    happiness: 'Felicidad',
    motivacion: 'Motivación',
    motivation: 'Motivación',
    motivado: 'Motivación',
    motivada: 'Motivación',
    motivados: 'Motivación',
    motivadas: 'Motivación',
    tristeza: 'Tristeza',
    triste: 'Tristeza',
    sadness: 'Tristeza',
    ansioso: 'Ansiedad',
    ansiosa: 'Ansiedad',
    ansiedad: 'Ansiedad',
    anxiety: 'Ansiedad',
    frustracion: 'Frustración',
    frustracionado: 'Frustración',
    frustration: 'Frustración',
    frustrado: 'Frustración',
    frustrada: 'Frustración',
    cansancio: 'Cansancio',
    cansado: 'Cansancio',
    cansada: 'Cansancio',
    tiredness: 'Cansancio',
    tired: 'Cansancio',
  };

  const mapped = mapping[raw];
  if (mapped) return mapped;

  return 'Sin registro';
}

function normalizeEntries(entries: RawEmotionArray): NormalizedEmotionEntry[] {
  const normalized: NormalizedEmotionEntry[] = [];

  for (const item of entries) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const rawDate =
      row.fecha ?? row.date ?? row.day ?? row.created_at ?? row.createdAt ?? row.timestamp ?? row.ts ?? null;
    const date = parseAnyDate(rawDate);
    if (!date) continue;

    const key = ymd(date);
    const rawEmotion = row.emocion ?? row.emotion ?? row.mood ?? row.emotion_id ?? row.value ?? row.name ?? null;
    const emotion = normalizeEmotion(rawEmotion);
    const rawEmotionLabel = rawEmotion == null ? null : String(rawEmotion);
    const rawDateLabel = rawDate == null ? null : String(rawDate);

    normalized.push({
      key,
      date,
      emotion,
      rawEmotion: rawEmotionLabel,
      rawDate: rawDateLabel,
    });
  }

  normalized.sort((a, b) => a.date.getTime() - b.date.getTime());

  return normalized;
}

function buildEmotionByDay(entries: NormalizedEmotionEntry[]): EmotionMapResult {
  const map = new Map<string, NormalizedEmotionEntry>();
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const entry of entries) {
    map.set(entry.key, entry);
    if (!minDate || entry.date.getTime() < minDate.getTime()) {
      minDate = entry.date;
    }
    if (!maxDate || entry.date.getTime() > maxDate.getTime()) {
      maxDate = entry.date;
    }
  }

  const keys = Array.from(map.keys()).sort();

  return { map, keys, minDate, maxDate };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function computeTimelineStart(earliest: Date | null): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!earliest || Number.isNaN(earliest.getTime())) {
    return today;
  }

  const start = new Date(earliest);
  start.setHours(0, 0, 0, 0);
  return start;
}

function computeTimelineEnd(start: Date): Date {
  const end = addDays(start, TOTAL_DAYS - 1);
  end.setHours(0, 0, 0, 0);
  return end;
}

function buildColumns(
  map: Map<string, NormalizedEmotionEntry>,
  startMonday: Date,
  endMonday: Date,
  rows: number,
): { columns: EmotionColumn[]; monthSegments: MonthSegment[] } {
  const columns: EmotionColumn[] = [];
  let currentMonday = new Date(startMonday);
  const lastMondayTime = endMonday.getTime();

  while (currentMonday.getTime() <= lastMondayTime) {
    const monday = new Date(currentMonday);

    const cells: GridCell[] = [];
    for (let row = 0; row < rows; row += 1) {
      const cellDate = addDays(monday, row);
      const key = ymd(cellDate);
      const entry = map.get(key) ?? null;
      const emotion = entry?.emotion ?? 'Sin registro';
      const color = EMOTION_COLORS[emotion] ?? EMOTION_COLORS['Sin registro'];

      const origin: GridCell['origin'] = entry ? 'backend' : 'frontend';
      const rawEmotion = entry?.rawEmotion ?? null;
      const rawDate = entry?.rawDate ?? null;

      cells.push({
        key,
        date: cellDate,
        emotion,
        color,
        origin,
        rawEmotion,
        rawDate,
      });
    }

    columns.push({
      key: ymd(monday),
      startDate: monday,
      cells,
    });

    currentMonday = addDays(currentMonday, rows);
  }

  const monthSegments: MonthSegment[] = [];

  if (columns.length > 0) {
    const columnAssignments: string[] = [];
    const firstCell = columns[0].cells[0];
    let activeMonthKey = firstCell ? `${firstCell.date.getFullYear()}-${firstCell.date.getMonth()}` : '';

    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      const column = columns[columnIndex];
      const dayOneCell = column.cells.find((cell) => cell.date.getDate() === 1);
      if (dayOneCell) {
        activeMonthKey = `${dayOneCell.date.getFullYear()}-${dayOneCell.date.getMonth()}`;
      }
      columnAssignments[columnIndex] = activeMonthKey;
    }

    let currentKey = columnAssignments[0] ?? '';
    let segmentStart = 0;

    for (let index = 0; index <= columnAssignments.length; index += 1) {
      const key = columnAssignments[index] ?? '';
      if (index === columnAssignments.length || key !== currentKey) {
        const span = index - segmentStart;
        if (currentKey && span > 0) {
          const [yearPart, monthPart] = currentKey.split('-');
          const monthIndex = Number(monthPart);
          const label =
            MONTH_ABBREVIATIONS[monthIndex] ??
            FALLBACK_MONTH_FORMATTER.format(new Date(Number(yearPart), monthIndex, 1))
              .toUpperCase()
              .replace('.', '');

          monthSegments.push({
            key: `${currentKey}-${segmentStart}`,
            label,
            startIndex: segmentStart,
            span,
          });
        }

        segmentStart = index;
        currentKey = key;
      }
    }
  }

  return { columns, monthSegments };
}

function computeHighlight(
  map: Map<string, NormalizedEmotionEntry>,
  sortedKeys: string[],
  limit = LOOKBACK_FOR_HIGHLIGHT,
): EmotionHighlight | null {
  if (sortedKeys.length === 0) return null;

  const recentKeys = sortedKeys
    .filter((key) => {
      const entry = map.get(key);
      const emotion = entry?.emotion;
      return emotion && emotion !== 'Sin registro';
    })
    .slice(-limit);

  if (recentKeys.length === 0) return null;

  const counts = new Map<EmotionName, { count: number; lastKey: string }>();

  for (const key of recentKeys) {
    const emotion = map.get(key)?.emotion;
    if (!emotion || emotion === 'Sin registro') continue;
    const current = counts.get(emotion) ?? { count: 0, lastKey: '' };
    current.count += 1;
    current.lastKey = key;
    counts.set(emotion, current);
  }

  let winner: { emotion: EmotionName; count: number; lastKey: string } | null = null;

  for (const [emotion, info] of counts.entries()) {
    if (!winner || info.count > winner.count || (info.count === winner.count && info.lastKey > winner.lastKey)) {
      winner = { emotion, count: info.count, lastKey: info.lastKey };
    }
  }

  if (!winner) return null;

  return { emotion: winner.emotion, color: EMOTION_COLORS[winner.emotion], count: winner.count };
}

function formatPeriodLabel(range: { from: Date; to: Date }): string {
  const formatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
  return `${formatter.format(range.from)} – ${formatter.format(range.to)}`;
}

function buildRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = addDays(today, -(TOTAL_DAYS - 1));
  return { from: ymd(start), to: ymd(today) };
}

function toEmotionArray(input: unknown): RawEmotionArray {
  if (Array.isArray(input)) return input;
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    if (Array.isArray(obj.daily_emotion)) return obj.daily_emotion;
    if (obj.data && typeof obj.data === 'object') {
      const data = obj.data as Record<string, unknown>;
      if (Array.isArray(data.daily_emotion)) return data.daily_emotion;
    }
  }
  return [];
}

const drawListeners = new Set<(entries: NormalizedEmotionEntry[]) => void>();

function notifyDrawListeners(entries: NormalizedEmotionEntry[]) {
  drawListeners.forEach((listener) => {
    try {
      listener(entries);
    } catch (error) {
      console.error('EmotionChart listener error', error);
    }
  });
}

function registerDrawListener(listener: (entries: NormalizedEmotionEntry[]) => void) {
  drawListeners.add(listener);
  return () => {
    drawListeners.delete(listener);
  };
}

declare global {
  interface Window {
    GJEmotion?: {
      draw: (data: unknown) => void;
      getMode15d: (data: unknown) => EmotionHighlight | null;
    };
    __GJEmotionListenersMounted__?: boolean;
    data?: { daily_emotion?: unknown };
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const draw = (input: unknown) => {
    const entries = normalizeEntries(toEmotionArray(input));
    notifyDrawListeners(entries);
  };

  const getMode15d = (input: unknown): EmotionHighlight | null => {
    const entries = normalizeEntries(toEmotionArray(input));
    const { map, keys } = buildEmotionByDay(entries);
    return computeHighlight(map, keys, LOOKBACK_FOR_HIGHLIGHT);
  };

  window.GJEmotion = { draw, getMode15d };

  if (!window.__GJEmotionListenersMounted__) {
    window.__GJEmotionListenersMounted__ = true;

    const onDomReady = () => {
      const base = window.data?.daily_emotion;
      if (base) draw(base);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
    } else {
      onDomReady();
    }

    const onDataReady = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      const payload = detail?.data?.daily_emotion ?? detail?.daily_emotion ?? detail;
      if (payload) draw(payload);
    };

    window.addEventListener('gj:data-ready', onDataReady as EventListener);
  }
}

export function EmotionChartCard({ userId }: EmotionChartCardProps) {
  const range = useMemo(buildRange, []);
  const { data, status } = useRequest(
    () => getEmotions(userId, range),
    [userId, range.from, range.to],
  );

  const normalizedFromApi = useMemo(() => {
    return normalizeEntries(asArray<EmotionSnapshot>(data) as unknown[]);
  }, [data]);

  const [overrideEntries, setOverrideEntries] = useState<NormalizedEmotionEntry[] | null>(null);

  useEffect(() => {
    return registerDrawListener((entries) => {
      setOverrideEntries(entries);
    });
  }, []);

  const normalizedEntries = overrideEntries ?? normalizedFromApi;

  const { columns, monthSegments, highlight, period, hasRecordedEmotion } = useMemo(() => {
    const { map, keys, minDate } = buildEmotionByDay(normalizedEntries);
    const timelineStart = computeTimelineStart(minDate);
    const timelineEnd = computeTimelineEnd(timelineStart);
    const startColumnDate = timelineStart;
    const endColumnDate = addDays(startColumnDate, (NUM_WEEKS - 1) * DAYS_IN_WEEK);

    const { columns: builtColumns, monthSegments: builtMonthSegments } = buildColumns(
      map,
      startColumnDate,
      endColumnDate,
      DAYS_IN_WEEK,
    );
    const highlightResult = computeHighlight(map, keys, LOOKBACK_FOR_HIGHLIGHT);
    const rangeDates = {
      from: timelineStart,
      to: timelineEnd,
    };
    const anyRecorded = normalizedEntries.some((entry) => entry.emotion !== 'Sin registro');

    return {
      columns: builtColumns,
      monthSegments: builtMonthSegments,
      highlight: highlightResult,
      period: rangeDates,
      hasRecordedEmotion: anyRecorded,
    };
  }, [normalizedEntries]);

  const gridBoxRef = useRef<HTMLDivElement | null>(null);
  const [cellSize, setCellSize] = useState<number>(12);
  const [cellGap, setCellGap] = useState<number>(GAP);
  const columnCount = Math.max(columns.length, 1);

  useEffect(() => {
    const box = gridBoxRef.current;
    if (!box) return;

    const compute = () => {
      const maxWidth = box.clientWidth;
      if (!maxWidth) return;
      let gap = GAP;

      if (maxWidth <= 480) {
        gap = MEDIUM_GAP;
      }

      if (maxWidth <= 360) {
        gap = SMALL_GAP;
      }

      let rawSize = Math.floor((maxWidth - (columnCount - 1) * gap) / columnCount);

      if (rawSize * CELL_SCALE < MIN_CELL_SIZE && gap > SMALL_GAP) {
        gap = Math.max(SMALL_GAP, gap - 1);
        rawSize = Math.floor((maxWidth - (columnCount - 1) * gap) / columnCount);
      }

      const scaledSize = Math.max(MIN_CELL_SIZE, Math.floor(rawSize * CELL_SCALE));
      setCellGap(gap);
      setCellSize(scaledSize);
    };

    compute();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(compute);
      observer.observe(box);
    }

    window.addEventListener('resize', compute);

    return () => {
      window.removeEventListener('resize', compute);
      if (observer) observer.disconnect();
    };
  }, [columnCount]);

  const tooltipFormatter = useMemo(
    () => new Intl.DateTimeFormat('es-ES', { weekday: 'short', month: 'short', day: 'numeric' }),
    [],
  );

  const rangeLabel = useMemo(() => formatPeriodLabel(period), [period]);

  const showSkeleton = status === 'loading' && overrideEntries === null;
  const showError = status === 'error' && overrideEntries === null;
  const showEmpty =
    status === 'success' && overrideEntries === null && (!hasRecordedEmotion || normalizedEntries.length === 0);

  const gridStyle = useMemo(
    () =>
      ({
        '--cell': `${cellSize}px`,
        '--cell-gap': `${cellGap}px`,
        '--column-count': `${columnCount}`,
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, var(--cell)))`,
        transform: `scale(${GRID_SCALE})`,
        transformOrigin: 'top left',
      }) as CSSProperties,
    [cellGap, cellSize, columnCount],
  );

  return (
    <Card
      title="💗 Emotion Chart"
      subtitle="Últimos 6 meses"
      rightSlot={<InfoDotTarget id="emotion" placement="right" className="flex items-center" />}
    >
      {showSkeleton && <div className="h-48 w-full animate-pulse rounded-2xl bg-white/10" />}

      {showError && <p className="text-sm text-rose-300">Todavía no pudimos cargar tus emociones.</p>}

      {showEmpty && <p className="text-sm text-slate-400">Registrá tu primera emoción para ver el mapa de calor.</p>}

      {(!showSkeleton && !showError && !showEmpty) || hasRecordedEmotion ? (
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

          <div className="rounded-2xl border border-white/10 bg-white/5 p-0">
            <div id="emotionChart">
              <div className="emotion-chart-surface">
                <div ref={gridBoxRef} className="grid-box" style={gridStyle}>
                  <div className="month-row text-[10px] uppercase tracking-wide text-slate-500">
                    {monthSegments.map((segment) => (
                      <span
                        key={segment.key}
                        className="month-chip"
                        style={{ gridColumn: `${segment.startIndex + 1} / span ${segment.span}` }}
                      >
                        {segment.label}
                      </span>
                    ))}
                  </div>
                  <div className="emotion-grid--weekcols">
                    {columns.map((column, columnIndex) => (
                      <div
                        key={column.key}
                        className="emotion-col"
                        style={{ gridColumn: `${columnIndex + 1}` }}
                      >
                        {column.cells.map((cell) => {
                          const tooltipEmotion = cell.rawEmotion ?? cell.emotion;
                          const tooltipDateRaw = cell.rawDate;
                          const tooltipDate =
                            tooltipDateRaw && tooltipDateRaw !== '[object Object]'
                              ? tooltipDateRaw
                              : tooltipFormatter.format(cell.date);
                          const tooltip = `${tooltipDate} – ${tooltipEmotion}`;
                          return (
                            <div
                              key={cell.key}
                              className="emotion-cell"
                              style={{ backgroundColor: cell.color }}
                              title={tooltip}
                              data-tooltip={tooltip}
                              data-origin={cell.origin}
                              data-raw-emotion={cell.rawEmotion ?? undefined}
                              data-raw-date={cell.rawDate ?? undefined}
                              aria-label={tooltip}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {highlight ? (
            <div className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left sm:flex-row sm:items-center sm:gap-4 sm:p-4">
              <div
                className="emotion-highlight-indicator h-10 w-10 shrink-0 rounded-full"
                style={{ backgroundColor: highlight.color }}
              />
              <div className="space-y-1">
                <p className="font-semibold text-slate-100">{highlight.emotion}</p>
                <p className="text-xs text-slate-400">
                  Emoción más frecuente en los últimos {LOOKBACK_FOR_HIGHLIGHT} días ({highlight.count}{' '}
                  {highlight.count === 1 ? 'registro' : 'registros'})
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400 sm:p-4">
              Aún no hay suficiente información reciente para destacar una emoción.
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}

export { EmotionChartCard as EmotionChart };

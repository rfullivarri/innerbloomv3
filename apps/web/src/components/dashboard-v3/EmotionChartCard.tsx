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

const GAP = 4;
const MEDIUM_GAP = 3;
const SMALL_GAP = 2;
const MIN_CELL_SIZE = 9;
const CELL_SCALE = 1;
const NUM_WEEKS = 26;
const DAYS_IN_WEEK = 7;
const LOOKBACK_FOR_HIGHLIGHT = 15;
const TOTAL_DAYS = NUM_WEEKS * DAYS_IN_WEEK;
const MAX_FILLED_RATIO = 0.75;
const MAX_FILLED_DAYS = Math.floor(TOTAL_DAYS * MAX_FILLED_RATIO);

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

function startOfDay(date: Date): Date {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function findFirstEntryDate(entries: NormalizedEmotionEntry[]): Date | null {
  let first: Date | null = null;

  for (const entry of entries) {
    const entryTime = entry.date.getTime();
    if (Number.isNaN(entryTime)) continue;
    if (!first || entryTime < first.getTime()) {
      first = entry.date;
    }
  }

  return first ? startOfDay(first) : null;
}

function computeDefaultTimelineStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return addDays(today, -(TOTAL_DAYS - 1));
}

function computeTimelineStart(entries: NormalizedEmotionEntry[]): Date {
  return findFirstEntryDate(entries) ?? computeDefaultTimelineStart();
}

function computeTimelineEnd(start: Date): Date {
  const end = addDays(start, TOTAL_DAYS - 1);
  end.setHours(0, 0, 0, 0);
  return end;
}

function clampEntriesToRange(
  entries: NormalizedEmotionEntry[],
  start: Date,
  end: Date,
): NormalizedEmotionEntry[] {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return entries.filter((entry) => {
    const time = entry.date.getTime();
    return time >= startTime && time <= endTime;
  });
}

function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function trimExcessMonths(
  entries: NormalizedEmotionEntry[],
  maxFilled: number,
): NormalizedEmotionEntry[] {
  if (entries.length === 0 || maxFilled <= 0) {
    return [];
  }

  const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
  const filledCount = sorted.filter((entry) => entry.emotion !== 'Sin registro').length;

  if (filledCount <= maxFilled) {
    return sorted;
  }

  type MonthBucket = { monthKey: string; entries: NormalizedEmotionEntry[] };
  const buckets: MonthBucket[] = [];

  for (const entry of sorted) {
    if (entry.emotion === 'Sin registro') continue;
    const monthKey = getMonthKey(entry.date);
    const currentBucket = buckets[buckets.length - 1];
    if (!currentBucket || currentBucket.monthKey !== monthKey) {
      buckets.push({ monthKey, entries: [entry] });
    } else {
      currentBucket.entries.push(entry);
    }
  }

  if (buckets.length === 0) {
    return sorted;
  }

  let remaining = filledCount;
  const monthsToDrop = new Set<string>();

  for (const bucket of buckets) {
    if (remaining <= maxFilled) break;
    monthsToDrop.add(bucket.monthKey);
    remaining -= bucket.entries.length;
  }

  if (monthsToDrop.size === 0) {
    return sorted;
  }

  return sorted.filter((entry) => !monthsToDrop.has(getMonthKey(entry.date)));
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
  const today = startOfDay(new Date());
  const todayTime = today.getTime();

  while (currentMonday.getTime() <= lastMondayTime) {
    const monday = new Date(currentMonday);

    const cells: GridCell[] = [];
    for (let row = 0; row < rows; row += 1) {
      const cellDate = addDays(monday, row);
      const key = ymd(cellDate);
      const isFuture = cellDate.getTime() > todayTime;
      const entry = isFuture ? null : map.get(key) ?? null;
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
    let timelineStart = computeTimelineStart(normalizedEntries);
    let timelineEnd = computeTimelineEnd(timelineStart);

    const recalcEntries = (start: Date, end: Date) => {
      const entriesInRange = clampEntriesToRange(normalizedEntries, start, end);
      const limited = trimExcessMonths(entriesInRange, MAX_FILLED_DAYS);
      return { entriesInRange, limited };
    };

    let { limited: limitedEntries } = recalcEntries(timelineStart, timelineEnd);

    if (limitedEntries.length > 0) {
      let adjusted = true;
      while (adjusted) {
        adjusted = false;
        const earliestLimited = findFirstEntryDate(limitedEntries);
        if (earliestLimited && earliestLimited.getTime() > timelineStart.getTime()) {
          timelineStart = earliestLimited;
          timelineEnd = computeTimelineEnd(timelineStart);
          ({ limited: limitedEntries } = recalcEntries(timelineStart, timelineEnd));
          adjusted = limitedEntries.length > 0;
        }
      }
    }

    const { map, keys } = buildEmotionByDay(limitedEntries);

    const { columns: builtColumns, monthSegments: builtMonthSegments } = buildColumns(
      map,
      timelineStart,
      timelineEnd,
      DAYS_IN_WEEK,
    );
    const highlightResult = computeHighlight(map, keys, LOOKBACK_FOR_HIGHLIGHT);
    const rangeDates = {
      from: timelineStart,
      to: timelineEnd,
    };
    const anyRecorded = limitedEntries.some((entry) => entry.emotion !== 'Sin registro');

    return {
      columns: builtColumns,
      monthSegments: builtMonthSegments,
      highlight: highlightResult,
      period: rangeDates,
      hasRecordedEmotion: anyRecorded,
    };
  }, [normalizedEntries]);

  const cardRef = useRef<HTMLElement | null>(null);
  const heatmapRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
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
      }) as CSSProperties,
    [cellGap, cellSize, columnCount],
  );

  useEffect(() => {
    const heatmap = heatmapRef.current;
    const surface = heatmap?.querySelector<HTMLElement>('.emotion-chart-surface');
    const gridBox = gridBoxRef.current;
    if (!heatmap || !surface || !gridBox) return;

    const compute = () => {
      const csSurface = getComputedStyle(surface);
      const pad =
        parseFloat(csSurface.paddingTop) + parseFloat(csSurface.paddingBottom);
      const border =
        parseFloat(csSurface.borderTopWidth || '0') +
        parseFloat(csSurface.borderBottomWidth || '0');

      const csGrid = getComputedStyle(gridBox);
      const cell = parseFloat(csGrid.getPropertyValue('--cell')) || 0;
      const gap = parseFloat(csGrid.getPropertyValue('--cell-gap')) || 0;
      const rowGap = parseFloat(csGrid.rowGap || csGrid.getPropertyValue('row-gap') || '0');

      const monthChip = gridBox.querySelector<HTMLElement>('.month-row > *');
      const monthH = monthChip ? monthChip.getBoundingClientRect().height : 0;

      const sevenRows = 7 * cell + 6 * rowGap;
      const safety = Math.ceil(Math.max(2, window.devicePixelRatio)) + gap;

      const required = Math.ceil(monthH + sevenRows + pad + border + safety);

      heatmap.style.setProperty('--emotion-heatmap-min-h', `${required}px`);
    };

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(compute) : null;
    if (ro) {
      ro.observe(gridBox);
      ro.observe(surface);
    }
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);
    compute();
    return () => {
      if (ro) {
        ro.disconnect();
      }
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cardElement = cardRef.current;
    const summaryElement = summaryRef.current;

    if (!cardElement || !summaryElement) {
      return;
    }

    let frame: number | null = null;

    const applyHeight = () => {
      frame = null;
      const { height } = summaryElement.getBoundingClientRect();
      if (!Number.isFinite(height) || height <= 0) {
        cardElement.style.removeProperty('--emotion-equal-height');
        return;
      }
      cardElement.style.setProperty('--emotion-equal-height', `${height}px`);
    };

    const schedule = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(applyHeight);
    };

    schedule();

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (observer) {
      observer.observe(summaryElement);
    }

    const handleViewportChange = () => schedule();

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
      cardElement.style.removeProperty('--emotion-equal-height');
    };
  }, [status, normalizedEntries, showSkeleton, showError, showEmpty]);

  return (
    <Card
      ref={cardRef}
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

          <div
            className="rounded-2xl border border-white/10 bg-white/5 p-0"
            data-emotion-card="heatmap"
            ref={heatmapRef}
          >
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
          <div ref={summaryRef} data-emotion-card="summary">
            {highlight ? (
              <div className="summary-inner w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left sm:p-4">
                <div
                  className="emotion-highlight-indicator h-10 w-10 shrink-0 rounded-full"
                  style={{ backgroundColor: highlight.color }}
                />
                <div className="summary-content">
                  <span className="summary-title text-slate-100">{highlight.emotion}</span>
                  <span className="summary-description text-sm text-slate-100 opacity-70">
                    Emoción más frecuente en los últimos {LOOKBACK_FOR_HIGHLIGHT} días ({highlight.count}{' '}
                    {highlight.count === 1 ? 'registro' : 'registros'})
                  </span>
                </div>
              </div>
            ) : (
              <div className="summary-inner rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400 sm:p-4">
                <div className="summary-content">
                  <span className="summary-description">
                    Aún no hay suficiente información reciente para destacar una emoción.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export { EmotionChartCard as EmotionChart };

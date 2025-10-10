import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getEmotions, type EmotionSnapshot } from '../../lib/api';
import { asArray } from '../../lib/safe';

interface EmotionTimelineProps {
  userId: string;
}

const MIN_HEATMAP_WEEKS = 22;
const MAX_HEATMAP_WEEKS = 26;
const FUTURE_WEEKS = 14;
const DAYS_PER_WEEK = 7;
const EMPTY_COLOR = '#1b2745';
const GRID_MAX_CELL_SIZE = 16;
const GRID_MIN_CELL_SIZE = 3.5;
const GRID_MAX_GAP = 6;
const GRID_MIN_GAP = 1.5;
// Display the grid about 30% larger than the previous scaled size for improved readability.
const GRID_SCALE_FACTOR = 1.4 * 1.4 * 1.3;
const HEATMAP_LOOKBACK_DAYS = 365;

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

const TOOLTIP_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const DEFAULT_HIGHLIGHT_COLOR = EMOTION_COLORS.Calma;

type HighlightDotStyle = CSSProperties & {
  '--highlight-rgb'?: string;
};

type GridCell = {
  key: string;
  color: string;
  label: string;
  emotion: EmotionName | '';
  tooltip: string;
};

type GridComputation = {
  columns: GridCell[][];
  period: { from: Date; to: Date };
  highlight: { emotion: EmotionName; color: string; count: number } | null;
};

const EMOTION_NORMALIZATION: Record<string, EmotionName> = {
  '1': 'Calma',
  '2': 'Felicidad',
  '3': 'Motivación',
  '4': 'Tristeza',
  '5': 'Ansiedad',
  '6': 'Frustración',
  '7': 'Cansancio',
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

function hexToRgb(color: string): [number, number, number] | null {
  const hex = color.trim().replace(/^#/, '');
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    if ([r, g, b].some((value) => Number.isNaN(value))) {
      return null;
    }
    return [r, g, b];
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some((value) => Number.isNaN(value))) {
      return null;
    }
    return [r, g, b];
  }
  return null;
}

function colorToRgbString(color: string): string {
  const rgb = hexToRgb(color);
  if (rgb) {
    return `${rgb[0]} ${rgb[1]} ${rgb[2]}`;
  }
  const fallback = hexToRgb(DEFAULT_HIGHLIGHT_COLOR);
  return fallback ? `${fallback[0]} ${fallback[1]} ${fallback[2]}` : '46 204 113';
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function addWeeks(date: Date, amount: number): Date {
  return addDays(date, amount * DAYS_PER_WEEK);
}

function addMonths(date: Date, amount: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + amount, date.getDate());
  return startOfDay(result);
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

  const extendedIsoMatch = /^([0-9]{4}-[0-9]{2}-[0-9]{2})(?:[T\s]|$)/.exec(str);
  if (extendedIsoMatch) {
    const [y, m, d] = extendedIsoMatch[1].split('-').map((part) => Number(part));
    const date = new Date(y, m - 1, d);
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

  return winner
    ? { emotion: winner.emotion, color: EMOTION_COLORS[winner.emotion], count: winner.count }
    : null;
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

function clampWeeks(value: number): number {
  return Math.min(MAX_HEATMAP_WEEKS, Math.max(MIN_HEATMAP_WEEKS, value));
}

function buildGrid(data: unknown): GridComputation {
  const items = asArray<EmotionSnapshot | { fecha?: string; emocion?: string }>(data);
  const map = new Map<string, EmotionName | ''>();
  let latestDate: Date | null = null;
  let earliestDate: Date | null = null;

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
    if (!earliestDate || parsedDate.getTime() < earliestDate.getTime()) {
      earliestDate = parsedDate;
    }
  }

  const today = startOfDay(new Date());
  const effectiveEndDate = latestDate && latestDate.getTime() > today.getTime() ? latestDate : today;
  const endMonday = startOfWeekMonday(effectiveEndDate);
  const futureEndMonday = addWeeks(endMonday, FUTURE_WEEKS);
  const weekDurationMs = DAYS_PER_WEEK * 24 * 60 * 60 * 1000;

  let startDate: Date;
  let totalWeeks: number;
  let endDate: Date;

  if (earliestDate) {
    startDate = startOfWeekMonday(earliestDate);
    totalWeeks = clampWeeks(
      Math.ceil((addMonths(startDate, 6).getTime() - startDate.getTime()) / weekDurationMs),
    );
    if (totalWeeks <= 0 || !Number.isFinite(totalWeeks)) {
      totalWeeks = MAX_HEATMAP_WEEKS;
    }
    endDate = addDays(startDate, totalWeeks * DAYS_PER_WEEK - 1);
  } else {
    totalWeeks = MAX_HEATMAP_WEEKS;
    startDate = addWeeks(futureEndMonday, -(totalWeeks - 1));
    endDate = addDays(startDate, totalWeeks * DAYS_PER_WEEK - 1);
  }

  const columns: GridCell[][] = [];

  for (let week = 0; week < totalWeeks; week += 1) {
    const weekCells = new Array<GridCell>(DAYS_PER_WEEK);
    for (let dayIndex = 0; dayIndex < DAYS_PER_WEEK; dayIndex += 1) {
      const cellDate = addDays(startDate, week * DAYS_PER_WEEK + dayIndex);
      const key = ymd(cellDate);
      const emotion = map.get(key) ?? '';
      const label = emotion || 'Sin registro';
      const color = EMOTION_COLORS[emotion || 'Sin registro'];
      const tooltip = `${TOOLTIP_FORMATTER.format(cellDate)} — ${label}`;
      const rowIndex = dayIndex;
      weekCells[rowIndex] = { key, color, label, emotion, tooltip };
    }
    columns.push(weekCells);
  }

  const highlightCutoffDate = endDate.getTime() < effectiveEndDate.getTime() ? endDate : effectiveEndDate;
  const highlight = computeHighlight(map, ymd(highlightCutoffDate));

  return {
    columns,
    period: { from: startDate, to: endDate },
    highlight,
  };
}

export function EmotionTimeline({ userId }: EmotionTimelineProps) {
  const { data, status } = useRequest(() => getEmotions(userId, { days: HEATMAP_LOOKBACK_DAYS }), [userId]);

  const grid = useMemo(() => buildGrid(data), [data]);
  const periodLabel = useMemo(() => formatPeriod(grid.period.from, grid.period.to), [grid.period.from, grid.period.to]);
  const highlightLabel = grid.highlight?.count === 1 ? 'registro' : 'registros';
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [cellSize, setCellSize] = useState<number>(14 * GRID_SCALE_FACTOR);
  const [cellGap, setCellGap] = useState<number>(GRID_MAX_GAP * GRID_SCALE_FACTOR);
  const columnCount = grid.columns.length;

  useEffect(() => {
    const element = gridRef.current;
    if (!element || columnCount === 0) return;

    const computeDimensions = () => {
      const box = gridRef.current;
      if (!box || columnCount === 0) return;

      const styles = window.getComputedStyle(box);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const available = box.clientWidth - paddingLeft - paddingRight;
      if (available <= 0) return;

      const segments = Math.max(0, columnCount - 1);

      let nextCell = Math.min(
        GRID_MAX_CELL_SIZE,
        (available - segments * GRID_MIN_GAP) / columnCount,
      );
      if (!Number.isFinite(nextCell) || nextCell <= 0) {
        nextCell = GRID_MAX_CELL_SIZE;
      }
      if (nextCell < GRID_MIN_CELL_SIZE) {
        nextCell = GRID_MIN_CELL_SIZE;
      }

      let nextGap = segments > 0 ? (available - nextCell * columnCount) / segments : GRID_MIN_GAP;
      if (!Number.isFinite(nextGap)) {
        nextGap = GRID_MIN_GAP;
      }
      nextGap = Math.min(GRID_MAX_GAP, Math.max(GRID_MIN_GAP, nextGap));

      if (segments > 0) {
        const totalWidth = nextCell * columnCount + nextGap * segments;
        if (totalWidth > available) {
          const adjustedCell = (available - nextGap * segments) / columnCount;
          if (Number.isFinite(adjustedCell)) {
            nextCell = Math.max(
              GRID_MIN_CELL_SIZE,
              Math.min(GRID_MAX_CELL_SIZE, adjustedCell),
            );
          }
        }
      }

      const scaledCell = Math.max(
        GRID_MIN_CELL_SIZE * GRID_SCALE_FACTOR,
        Math.min(GRID_MAX_CELL_SIZE * GRID_SCALE_FACTOR, nextCell * GRID_SCALE_FACTOR),
      );
      const scaledGap =
        segments > 0
          ? Math.max(
              GRID_MIN_GAP * GRID_SCALE_FACTOR,
              Math.min(GRID_MAX_GAP * GRID_SCALE_FACTOR, nextGap * GRID_SCALE_FACTOR),
            )
          : 0;

      setCellSize(Number(scaledCell.toFixed(2)));
      setCellGap(Number(scaledGap.toFixed(2)));
    };

    computeDimensions();

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(computeDimensions) : null;
    if (observer) {
      observer.observe(element);
    }

    window.addEventListener('resize', computeDimensions);

    return () => {
      window.removeEventListener('resize', computeDimensions);
      if (observer) observer.disconnect();
    };
  }, [columnCount]);

  const gridStyle = useMemo(() => {
    const gridWidth = columnCount * cellSize + Math.max(0, columnCount - 1) * cellGap;
    return {
      '--cell-size': `${cellSize}px`,
      '--cell-gap': `${cellGap}px`,
      '--grid-width': `${gridWidth}px`,
      '--column-count': `${columnCount}`,
    } as CSSProperties;
  }, [cellGap, cellSize, columnCount]);

  useEffect(() => {
    const dismiss = () => setActiveCellKey(null);
    const touchOptions: AddEventListenerOptions = { passive: true };
    document.addEventListener('click', dismiss);
    document.addEventListener('touchstart', dismiss, touchOptions);
    return () => {
      document.removeEventListener('click', dismiss);
      document.removeEventListener('touchstart', dismiss, touchOptions);
    };
  }, []);

  const activateCell = (key: string) => {
    setActiveCellKey(key);
  };

  const toggleCell = (key: string) => {
    setActiveCellKey((prev) => (prev === key ? null : key));
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#111d3a]/80 via-[#0b1429]/70 to-[#071022]/80 p-8 text-base text-text backdrop-blur md:p-10">
      <header className="flex flex-wrap items-start justify-between gap-4 text-white">
        <div className="space-y-1.5">
          <h3 className="text-2xl font-semibold">💗 Emotion Chart</h3>
          <p className="text-sm text-text-muted">6 meses desde tu primer registro</p>
        </div>
      </header>

      {status === 'loading' && <div className="mt-6 h-48 w-full animate-pulse rounded-2xl bg-white/10" />}

      {status === 'error' && <p className="mt-6 text-sm text-rose-300">Todavía no pudimos cargar tus emociones.</p>}

      {status === 'success' && (
        <div className="mt-8 space-y-8">
          <div className="flex flex-wrap gap-2 text-sm text-text-muted">
            {LEGEND_ITEMS.map((name) => (
              <span
                key={name}
                className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[13px] ${
                  name === 'Sin registro' ? 'text-white/60' : 'text-white/80'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: EMOTION_COLORS[name] }} />
                {name}
              </span>
            ))}
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto pb-2">
              <div className="min-w-full flex justify-center">
                <div id="emotionChart" ref={gridRef} className="emotion-grid--weekcols" style={gridStyle}>
                  {grid.columns.map((week, weekIndex) => (
                    <div key={weekIndex} className="emotion-col">
                      {week.map((cell) => (
                        <button
                          key={cell.key}
                          className="emotion-cell"
                          style={{ backgroundColor: cell.color }}
                          type="button"
                          title={cell.tooltip}
                          aria-label={cell.tooltip}
                          data-tooltip={cell.tooltip}
                          data-active={activeCellKey === cell.key ? 'true' : undefined}
                          onMouseEnter={() => activateCell(cell.key)}
                          onFocus={() => activateCell(cell.key)}
                          onMouseLeave={() => setActiveCellKey(null)}
                          onBlur={() => setActiveCellKey(null)}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleCell(cell.key);
                          }}
                          onTouchStart={(event) => {
                            event.stopPropagation();
                            toggleCell(cell.key);
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-sm text-text-muted">Período analizado: {periodLabel}</p>
          </div>

          {grid.highlight && (
            <div
              id="emotion-destacada"
              className="emotion-highlight flex items-center gap-6 rounded-3xl border border-white/10 bg-gradient-to-r from-white/12 via-white/5 to-transparent p-6 text-white shadow-[0_20px_60px_rgba(8,20,40,0.45)]"
            >
              <div
                className="emotion-highlight-dot flex h-20 w-20 items-center justify-center rounded-3xl border border-white/20 text-2xl font-semibold text-white"
                style={
                  {
                    backgroundColor: grid.highlight.color,
                    '--highlight-rgb': colorToRgbString(grid.highlight.color),
                  } as HighlightDotStyle
                }
              >
                <span className="relative z-10 font-bold drop-shadow-[0_0_6px_rgba(0,0,0,0.35)]">{grid.highlight.count}</span>
              </div>
              <div>
                <p className="text-lg font-semibold">{grid.highlight.emotion}</p>
                <p className="text-sm text-text-muted">
                  Emoción más frecuente en los últimos 15 días ({grid.highlight.count} {highlightLabel})
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

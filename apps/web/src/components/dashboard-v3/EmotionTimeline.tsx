import { useMemo } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getEmotions, type EmotionSnapshot } from '../../lib/api';
import { asArray, dateStr } from '../../lib/safe';

interface EmotionTimelineProps {
  userId: string;
}

const INNERBLOOM_ACCENT = '#7D3CFF';

const EMOTION_COLORS: Record<string, string> = {
  Calma: '#2ECC71',
  Felicidad: '#F1C40F',
  Motivación: INNERBLOOM_ACCENT,
  Tristeza: '#3498DB',
  Ansiedad: INNERBLOOM_ACCENT,
  Frustración: '#8D6E63',
  Cansancio: '#16A085',
};

type EmotionEntry = EmotionSnapshot & { day: string };

function buildRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { from: dateStr(from), to: dateStr(to) };
}

function countEmotions(entries: EmotionEntry[]): { name: string; count: number } | null {
  const map = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.mood) continue;
    const key = entry.mood;
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  let top: { name: string; count: number } | null = null;
  for (const [name, count] of map.entries()) {
    if (!top || count > top.count) {
      top = { name, count };
    }
  }
  return top;
}

export function EmotionTimeline({ userId }: EmotionTimelineProps) {
  const range = useMemo(() => buildRange(15), []);
  const { data, status } = useRequest(
    () => getEmotions(userId, range),
    [userId, range.from, range.to],
  );

  const entries = useMemo(
    () => {
      console.info('[DASH] dataset', { keyNames: Object.keys(data ?? {}), isArray: Array.isArray(data) });
      return asArray<EmotionSnapshot>(data)
        .map((entry) => {
          const rawDate = (entry as any)?.day ?? entry.date ?? (entry as any)?.created_at ?? (entry as any)?.timestamp;
          const day = dateStr(rawDate);
          return {
            ...entry,
            day,
            date: entry.date ?? day,
          } satisfies EmotionEntry;
        })
        .filter((entry) => !!entry.date)
        .sort((a, b) => (a.date > b.date ? 1 : -1));
    },
    [data],
  );

  const mostFrequent = useMemo(() => countEmotions(entries), [entries]);
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
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3 text-white">
        <h3 className="text-lg font-semibold">💗 Emotion Chart</h3>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-text-muted">
          Últimos 15 días
        </span>
      </header>

      {status === 'loading' && <div className="mt-6 h-48 w-full animate-pulse rounded-2xl bg-white/10" />}

      {status === 'error' && (
        <p className="mt-6 text-sm text-rose-300">Todavía no pudimos cargar tus emociones.</p>
      )}

      {status === 'success' && entries.length === 0 && (
        <p className="mt-6 text-sm text-text-muted">Registrá tu primera emoción para ver la línea temporal.</p>
      )}

      {status === 'success' && entries.length > 0 && (
        <div className="mt-6 space-y-4">
          {rangeLabel && <p className="text-xs text-text-muted">Período analizado: {rangeLabel}</p>}
          <div className="grid grid-cols-7 gap-2">
            {entries.map((entry) => {
              const color = EMOTION_COLORS[entry.mood ?? ''] ?? 'rgba(255,255,255,0.2)';
              return (
                <div
                  key={entry.date}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-white/5 p-3 text-center text-[11px]"
                >
                  <div className="h-12 w-12 rounded-full" style={{ backgroundColor: color }} />
                  <div className="space-y-1">
                    <p className="font-semibold text-white">{entry.mood ?? '—'}</p>
                    <p className="text-[10px] text-text-muted">{new Date(entry.date).toLocaleDateString('es-AR')}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {mostFrequent && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div
                className="h-10 w-10 rounded-full"
                style={{ backgroundColor: EMOTION_COLORS[mostFrequent.name] ?? 'rgba(255,255,255,0.25)' }}
              />
              <div>
                <p className="font-semibold text-white">{mostFrequent.name}</p>
                <p className="text-xs text-text-muted">
                  Emoción más frecuente en los últimos 15 días ({mostFrequent.count} registros)
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

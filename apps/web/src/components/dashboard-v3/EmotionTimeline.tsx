import { useMemo } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getEmotions, type EmotionSnapshot } from '../../lib/api';

interface EmotionTimelineProps {
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

function countEmotions(entries: EmotionSnapshot[]): { name: string; count: number } | null {
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
  const { data, status } = useRequest(() => getEmotions(userId, { days: 30 }), [userId]);
  const mostFrequent = useMemo(() => countEmotions(data ?? []), [data]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3 text-white">
        <h3 className="text-lg font-semibold">💗 Emotion Chart</h3>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-text-muted">
          Últimos 30 días
        </span>
      </header>

      {status === 'loading' && <div className="mt-6 h-48 w-full animate-pulse rounded-2xl bg-white/10" />}

      {status === 'error' && (
        <p className="mt-6 text-sm text-rose-300">Todavía no pudimos cargar tus emociones.</p>
      )}

      {status === 'success' && (!data || data.length === 0) && (
        <p className="mt-6 text-sm text-text-muted">Registrá tu primera emoción para ver la línea temporal.</p>
      )}

      {status === 'success' && data && data.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {data.map((entry) => {
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
                  Emoción más frecuente en los últimos 30 días ({mostFrequent.count} registros)
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

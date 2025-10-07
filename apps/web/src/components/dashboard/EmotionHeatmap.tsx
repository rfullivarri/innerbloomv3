import { Card } from '../common/Card';
import { Skeleton } from '../common/Skeleton';
import { useRequest } from '../../hooks/useRequest';
import { getEmotions, type EmotionSnapshot } from '../../lib/api';

interface EmotionHeatmapProps {
  userId: string;
}

function normalizeIntensity(value: number) {
  if (!Number.isFinite(value)) return 0;
  const scale = value > 1 ? 5 : 1;
  const normalized = Math.max(0, Math.min(value / scale, 1));
  return normalized;
}

function tileColor(intensity: number) {
  const hue = 210 - intensity * 80;
  const saturation = 70 + intensity * 20;
  const lightness = 35 + intensity * 20;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export function EmotionHeatmap({ userId }: EmotionHeatmapProps) {
  const { data, status, error, reload } = useRequest(() => getEmotions(userId, { days: 14 }), [userId]);

  return (
    <Card
      title="Emotion Check-ins"
      subtitle="Notice how your mood shifts with the work"
      action={
        <button
          type="button"
          onClick={reload}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text hover:bg-white/10"
        >
          Refresh
        </button>
      }
    >
      {status === 'loading' && (
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3 text-sm text-rose-300">
          <p>Emotion check-ins are taking a short break.</p>
          <button
            type="button"
            onClick={reload}
            className="rounded-md border border-rose-400/40 px-3 py-1 text-xs font-semibold text-rose-200 hover:border-rose-200/70"
          >
            Try again
          </button>
          <p className="text-xs text-text-subtle">{error?.message}</p>
        </div>
      )}

      {status === 'success' && data && data.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {data.map((entry: EmotionSnapshot) => {
              const intensity = normalizeIntensity(entry.intensity ?? entry.score ?? entry.value ?? 0);
              const moodLabelRaw = entry.mood == null ? '' : String(entry.mood);
              const moodDisplay = moodLabelRaw ? moodLabelRaw.slice(0, 6) : '—';
              return (
                <div
                  key={entry.date}
                  className="flex aspect-square flex-col items-center justify-center rounded-lg border border-white/5 text-center text-[10px] text-white/80"
                  style={{ background: `${tileColor(intensity)}` }}
                  title={`${moodLabelRaw || 'Mood'} — ${entry.note || ''}`.trim()}
                >
                  <span className="font-semibold">{moodDisplay}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-text-subtle">Tap into patterns: brighter tiles mean higher reported energy.</p>
        </div>
      )}

      {status === 'success' && (!data || data.length === 0) && (
        <div className="space-y-2 text-sm text-text-subtle">
          <p>TODO: wire emotions endpoint once available.</p>
          <p className="text-xs text-text-muted">Daily reflections will appear here after the first check-in.</p>
        </div>
      )}
    </Card>
  );
}

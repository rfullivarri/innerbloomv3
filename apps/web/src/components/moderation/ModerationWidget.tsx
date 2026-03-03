import { useMemo } from 'react';
import type { ModerationStateResponse, ModerationStatus, ModerationTracker, ModerationTrackerType } from '../../lib/api';

type Props = {
  data: ModerationStateResponse | null;
  onCycle: (type: ModerationTrackerType, next: ModerationStatus) => void;
  loading?: boolean;
  title?: string;
};

const STATUS_LABEL: Record<ModerationStatus, string> = {
  on_track: 'Cumplido',
  off_track: 'Interrumpido',
  not_logged: 'Sin marcar',
};

const TYPE_META: Record<ModerationTrackerType, { label: string; hint?: string; icon: string }> = {
  alcohol: { label: 'Alcohol', icon: 'M7 2h10v3H7z M8 5v15a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5' },
  tobacco: { label: 'Tabaco', icon: 'M3 12h10a3 3 0 0 1 3 3v1M13 9h7M18 9v6' },
  sugar: { label: 'Azúcar', hint: 'azúcar añadido', icon: 'M8 3h8l4 6-8 12L4 9z' },
};

function nextStatus(status: ModerationStatus): ModerationStatus {
  if (status === 'not_logged') return 'on_track';
  if (status === 'on_track') return 'off_track';
  return 'not_logged';
}

function Chip({ tracker, onCycle }: { tracker: ModerationTracker; onCycle: Props['onCycle'] }) {
  const meta = TYPE_META[tracker.type];
  const statusLabel = STATUS_LABEL[tracker.statusToday];

  return (
    <button
      type="button"
      onClick={() => onCycle(tracker.type, nextStatus(tracker.statusToday))}
      className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 text-white">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
            <path d={meta.icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-medium" title={meta.hint}>{meta.label}</span>
        </div>
        <span className="text-2xl font-bold text-amber-200">{tracker.current_streak_days}d</span>
      </div>
      <p className="mt-2 text-xs text-white/70">Ayer: {statusLabel}</p>
    </button>
  );
}

export function ModerationWidget({ data, onCycle, loading = false, title = 'Moderación' }: Props) {
  const enabled = useMemo(() => (data?.trackers ?? []).filter((tracker) => tracker.is_enabled), [data]);
  if (!loading && enabled.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">{title}</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {loading && <div className="h-20 animate-pulse rounded-xl bg-white/10" />}
        {!loading && enabled.map((tracker) => <Chip key={tracker.type} tracker={tracker} onCycle={onCycle} />)}
      </div>
    </section>
  );
}

import { useMemo } from "react";
import type {
  ModerationStateResponse,
  ModerationStatus,
  ModerationTracker,
  ModerationTrackerType,
} from "../../lib/api";
import { moderationTrackerMeta, ModerationTrackerIcon } from "./trackerMeta";

type Props = {
  data: ModerationStateResponse | null;
  onCycle: (type: ModerationTrackerType, next: ModerationStatus) => void;
  loading?: boolean;
  title?: string;
};

function nextStatus(status: ModerationStatus): ModerationStatus {
  if (status === "not_logged") return "on_track";
  if (status === "on_track") return "off_track";
  return "not_logged";
}

function chipStateClass(status: ModerationStatus): string {
  if (status === "on_track") {
    return "border-emerald-300/50 bg-emerald-400/10 shadow-[0_0_0_1px_rgba(52,211,153,0.28)]";
  }

  if (status === "off_track") {
    return "border-amber-200/30 bg-amber-100/5";
  }

  return "border-white/15 bg-white/5";
}

function Chip({
  tracker,
  onCycle,
}: {
  tracker: ModerationTracker;
  onCycle: Props["onCycle"];
}) {
  const meta = moderationTrackerMeta[tracker.type];

  return (
    <button
      type="button"
      onClick={() => onCycle(tracker.type, nextStatus(tracker.statusToday))}
      className={`w-full rounded-[1.7rem] border p-3 text-left transition hover:bg-white/10 sm:p-4 ${chipStateClass(tracker.statusToday)}`}
      title={meta.hint}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-white/90">
          <ModerationTrackerIcon
            type={tracker.type}
            className="h-4 w-4 sm:h-5 sm:w-5"
          />
        </div>
        <span className="text-xl font-bold leading-none text-amber-200 sm:text-2xl">
          {tracker.current_streak_days}d
        </span>
      </div>
      <p className="mt-2 truncate text-[11px] font-medium text-white/70 sm:text-xs">
        {meta.label}
      </p>
      {tracker.statusToday === "on_track" ? (
        <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-200/90">
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-300"
            aria-hidden
          />
          <span>Cumplido</span>
        </div>
      ) : null}
      {tracker.statusToday === "off_track" ? (
        <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-100/80">
          <span
            className="h-1.5 w-1.5 rounded-full bg-amber-200/80"
            aria-hidden
          />
          <span>Interrumpido</span>
        </div>
      ) : null}
    </button>
  );
}

export function ModerationWidget({
  data,
  onCycle,
  loading = false,
  title = "Moderación",
}: Props) {
  const enabled = useMemo(
    () => (data?.trackers ?? []).filter((tracker) => tracker.is_enabled),
    [data],
  );
  if (!loading && enabled.length === 0) return null;

  const activeCount = Math.max(1, Math.min(3, enabled.length || 1));

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-white/85">{title}</h3>
      <div
        className={`mt-3 grid gap-2 sm:gap-3 ${activeCount === 1 ? "grid-cols-1" : ""} ${activeCount === 2 ? "grid-cols-2" : ""} ${activeCount === 3 ? "grid-cols-3 max-[360px]:grid-cols-2" : ""}`}
      >
        {loading && (
          <div className="h-20 animate-pulse rounded-[1.4rem] bg-white/10" />
        )}
        {!loading &&
          enabled.map((tracker) => (
            <Chip key={tracker.type} tracker={tracker} onCycle={onCycle} />
          ))}
      </div>
    </section>
  );
}

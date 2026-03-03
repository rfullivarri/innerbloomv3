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
    return "border-emerald-300/45 bg-emerald-400/[0.08] shadow-[0_8px_22px_rgba(16,185,129,0.12)]";
  }

  if (status === "off_track") {
    return "border-amber-200/30 bg-amber-100/[0.06] shadow-[0_8px_20px_rgba(251,191,36,0.08)]";
  }

  return "border-white/15 bg-white/[0.045]";
}

function statusPillClass(status: ModerationStatus): string {
  if (status === "on_track") {
    return "border border-emerald-300/35 bg-emerald-300/10 text-emerald-100";
  }

  return "border border-amber-200/35 bg-amber-100/10 text-amber-100/90";
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
      className={`w-full rounded-[1.9rem] border px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/10 sm:px-3.5 sm:py-3 ${chipStateClass(tracker.statusToday)}`}
      title={meta.hint}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 items-center gap-2 text-white/85">
            <ModerationTrackerIcon
              type={tracker.type}
              className="h-8 w-8 shrink-0 text-white/90"
            />
            <p
              className="truncate text-[0.72rem] font-medium uppercase tracking-[0.12em] text-white/70"
              title={meta.hint}
            >
              {meta.label}
            </p>
            {tracker.statusToday !== "not_logged" ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] transition-all duration-200 ${statusPillClass(tracker.statusToday)}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${tracker.statusToday === "on_track" ? "bg-emerald-300" : "bg-amber-200/90"}`}
                  aria-hidden
                />
                {tracker.statusToday === "on_track"
                  ? "Cumplido"
                  : "Interrumpido"}
              </span>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 text-3xl font-semibold leading-none text-amber-100 sm:text-[2.1rem]">
          {tracker.current_streak_days}d
        </span>
      </div>
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
    <section>
      <h3 className="mb-2 text-sm font-semibold text-white/85">{title}</h3>
      <div
        className={`grid gap-2.5 sm:gap-3 ${activeCount === 1 ? "grid-cols-1" : ""} ${activeCount === 2 ? "grid-cols-2" : ""} ${activeCount === 3 ? "grid-cols-3 max-[360px]:grid-cols-2" : ""}`}
      >
        {loading && (
          <div className="h-20 animate-pulse rounded-[1.8rem] border border-white/10 bg-white/10" />
        )}
        {!loading &&
          enabled.map((tracker) => (
            <Chip key={tracker.type} tracker={tracker} onCycle={onCycle} />
          ))}
      </div>
    </section>
  );
}

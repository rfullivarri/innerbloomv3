import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ModerationStateResponse,
  ModerationStatus,
  ModerationTracker,
  ModerationTrackerType,
} from "../../lib/api";
import { useLongPress } from "../../hooks/useLongPress";
import { moderationTrackerMeta, ModerationTrackerIcon } from "./trackerMeta";

type Props = {
  data: ModerationStateResponse | null;
  onCycle: (type: ModerationTrackerType, next: ModerationStatus) => void;
  loading?: boolean;
  title?: string;
  onEdit?: () => void;
};

function nextStatus(status: ModerationStatus): ModerationStatus {
  if (status === "not_logged") return "on_track";
  if (status === "on_track") return "off_track";
  return "not_logged";
}

function chipStateClass(status: ModerationStatus): string {
  if (status === "on_track") {
    return "border-emerald-300/45 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.2),_rgba(17,24,39,0.5))] shadow-[0_10px_28px_rgba(16,185,129,0.16)] backdrop-blur-md";
  }

  if (status === "off_track") {
    return "border-amber-200/30 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.18),_rgba(17,24,39,0.48))] shadow-[0_10px_26px_rgba(251,191,36,0.12)] backdrop-blur-md";
  }

  return "border-white/15 bg-[radial-gradient(ellipse_at_top,_rgba(71,85,105,0.3),_rgba(17,24,39,0.42))] backdrop-blur-md";
}

function statusPillClass(status: ModerationStatus): string {
  if (status === "on_track") {
    return "border border-emerald-300/35 bg-emerald-300/10 text-emerald-100";
  }

  return "border border-amber-200/35 bg-amber-100/10 text-amber-100/90";
}

const STATUS_BADGE_HOLD_MS = 1020;
const STATUS_BADGE_EXIT_MS = 320;

function Chip({
  tracker,
  onCycle,
  onEdit,
}: {
  tracker: ModerationTracker;
  onCycle: Props["onCycle"];
  onEdit?: Props["onEdit"];
}) {
  const meta = moderationTrackerMeta[tracker.type];
  const previousStatusRef = useRef<ModerationStatus>(tracker.statusToday);
  const [statusFlash, setStatusFlash] = useState<ModerationStatus | null>(null);
  const [statusFlashPhase, setStatusFlashPhase] = useState<"from" | "visible" | "exit">("from");
  const longPressBind = useLongPress({
    onLongPress: () => onEdit?.(),
    delayMs: 850,
  });

  useEffect(() => {
    const previous = previousStatusRef.current;
    if (tracker.statusToday !== previous) {
      previousStatusRef.current = tracker.statusToday;
      if (tracker.statusToday === "not_logged") {
        setStatusFlash(null);
        return;
      }

      setStatusFlash(tracker.statusToday);
      setStatusFlashPhase("from");

      const enterTimeout = window.setTimeout(() => {
        setStatusFlashPhase("visible");
      }, 16);

      const exitTimeout = window.setTimeout(() => {
        setStatusFlashPhase("exit");
      }, STATUS_BADGE_HOLD_MS);

      const removeTimeout = window.setTimeout(() => {
        setStatusFlash((current) =>
          current === tracker.statusToday ? null : current,
        );
      }, STATUS_BADGE_HOLD_MS + STATUS_BADGE_EXIT_MS);

      return () => {
        window.clearTimeout(enterTimeout);
        window.clearTimeout(exitTimeout);
        window.clearTimeout(removeTimeout);
      };
    }

    return undefined;
  }, [tracker.statusToday]);

  return (
    <button
      type="button"
      onClick={() => onCycle(tracker.type, nextStatus(tracker.statusToday))}
      className={`relative w-full overflow-hidden rounded-[1.9rem] border px-3 pb-6 pt-2.5 text-left transition-all duration-200 hover:bg-white/10 sm:px-3.5 sm:pb-6 sm:pt-3 ${chipStateClass(tracker.statusToday)}`}
      title={meta.hint}
      {...longPressBind}
    >
      {statusFlash ? (
        <span
          className={`pointer-events-none absolute left-1/2 top-1.5 z-20 flex -translate-x-1/2 items-center justify-center rounded-full border px-1.5 py-px text-[0.46rem] font-semibold uppercase tracking-[0.12em] backdrop-blur-sm transition-[transform,opacity] duration-300 ease-out sm:top-2 ${statusPillClass(statusFlash)} ${
            statusFlashPhase === "from"
              ? "translate-y-[6px] opacity-0"
              : statusFlashPhase === "exit"
                ? "-translate-y-[14px] opacity-0"
                : "translate-y-0 opacity-100"
          }`}
          aria-live="polite"
        >
          {statusFlash === "on_track" ? "Cumplido" : "Interrumpido"}
        </span>
      ) : null}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-white/85">
            <ModerationTrackerIcon
              type={tracker.type}
              className="h-8 w-8 shrink-0 text-white/90"
            />
          </div>
        </div>
        <span className="shrink-0 leading-none text-amber-100">
          <span className="text-[2.45rem] font-semibold sm:text-[2.7rem]">
            {tracker.current_streak_days}
          </span>
          <span className="ml-0.5 align-top text-[1.05rem] font-semibold text-amber-100/90 sm:text-[1.2rem]">
            d
          </span>
        </span>
      </div>
      <p
        className="pointer-events-none absolute bottom-2 left-1/2 z-10 w-full -translate-x-1/2 truncate px-2 text-center text-[0.64rem] font-medium uppercase tracking-[0.12em] text-white/70"
        title={meta.hint}
      >
        {meta.label}
      </p>
    </button>
  );
}

export function ModerationWidget({
  data,
  onCycle,
  loading = false,
  title,
  onEdit,
}: Props) {
  const enabled = useMemo(
    () => (data?.trackers ?? []).filter((tracker) => tracker.is_enabled),
    [data],
  );
  if (!loading && enabled.length === 0) return null;

  const activeCount = Math.max(1, Math.min(3, enabled.length || 1));

  return (
    <section>
      {title ? <h3 className="mb-2 text-sm font-semibold text-white/85">{title}</h3> : null}
      <div
        className={`grid gap-2.5 sm:gap-3 ${activeCount === 1 ? "grid-cols-1" : ""} ${activeCount === 2 ? "grid-cols-2" : ""} ${activeCount === 3 ? "grid-cols-3 max-[360px]:grid-cols-2" : ""}`}
      >
        {loading && (
          <div className="h-20 animate-pulse rounded-[1.8rem] border border-white/10 bg-white/10" />
        )}
        {!loading &&
          enabled.map((tracker) => (
            <Chip
              key={tracker.type}
              tracker={tracker}
              onCycle={onCycle}
              onEdit={onEdit}
            />
          ))}
      </div>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ModerationStateResponse,
  ModerationStatus,
  ModerationTracker,
  ModerationTrackerType,
} from "../../lib/api";
import { useLongPress } from "../../hooks/useLongPress";
import { moderationTrackerMeta, ModerationTrackerIcon } from "./trackerMeta";
import { DashboardTitle } from "../dashboard-v3/DashboardTypography";
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';

type Props = {
  data: ModerationStateResponse | null;
  onCycle: (type: ModerationTrackerType, next: ModerationStatus) => void;
  loading?: boolean;
  title?: string;
  onEdit?: () => void;
  demoAnchor?: string;
};

function nextStatus(status: ModerationStatus): ModerationStatus {
  if (status === "not_logged") return "on_track";
  if (status === "on_track") return "off_track";
  return "not_logged";
}

function chipStateClass(status: ModerationStatus): string {
  const baseClass =
    "border-[color:var(--glass-border)] bg-[image:var(--glass-bg)] shadow-[var(--shadow-elev-1)] backdrop-blur-md";

  if (status === "on_track") {
    return `${baseClass} before:absolute before:inset-0 before:rounded-[inherit] before:bg-emerald-300/[0.08] before:opacity-100 before:content-['']`;
  }

  if (status === "off_track") {
    return `${baseClass} before:absolute before:inset-0 before:rounded-[inherit] before:bg-amber-200/[0.06] before:opacity-100 before:content-['']`;
  }

  return baseClass;
}

function statusPillClass(status: ModerationStatus): string {
  if (status === "on_track") {
    return "border border-emerald-100/45 bg-emerald-200/95 text-emerald-950 shadow-[0_4px_14px_rgba(16,185,129,0.35)]";
  }

  return "border border-amber-100/45 bg-amber-100/95 text-amber-950 shadow-[0_4px_14px_rgba(217,119,6,0.24)]";
}

const STATUS_BADGE_HOLD_MS = 1020;
const STATUS_BADGE_EXIT_MS = 320;

function Chip({
  tracker,
  onCycle,
  onEdit,
  language,
}: {
  tracker: ModerationTracker;
  onCycle: Props["onCycle"];
  onEdit?: Props["onEdit"];
  language: 'es' | 'en';
}) {
  const meta = moderationTrackerMeta[tracker.type];
  const label = tracker.type === 'alcohol' ? 'Alcohol' : tracker.type === 'tobacco' ? (language === 'en' ? 'Tobacco' : 'Tabaco') : (language === 'en' ? 'Sugar' : 'Azúcar');
  const hint = tracker.type === 'sugar' ? (language === 'en' ? 'added sugar' : 'azúcar añadido') : meta.hint;
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
      className={`relative w-full overflow-hidden rounded-ib-lg border px-3 pb-6 pt-[0.3125rem] text-left transition-all duration-200 hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--ib-surface-card-hover)] sm:px-3.5 sm:pb-6 sm:pt-1.5 ${chipStateClass(tracker.statusToday)}`}
      title={hint}
      {...longPressBind}
    >
      {statusFlash ? (
        <span
          className={`pointer-events-none absolute left-1/2 top-1 z-20 flex -translate-x-1/2 items-center justify-center rounded-full border px-1.5 py-px text-[0.46rem] font-semibold tracking-[0.08em] transition-[transform,opacity] duration-300 ease-out ${statusPillClass(statusFlash)} ${
            statusFlashPhase === "from"
              ? "translate-y-[6px] opacity-0"
              : statusFlashPhase === "exit"
                ? "-translate-y-[14px] opacity-0"
                : "translate-y-0 opacity-100"
          }`}
          aria-live="polite"
        >
          {statusFlash === "on_track" ? (language === "en" ? "Completed" : "Cumplido") : (language === "en" ? "Interrupted" : "Interrumpido")}
        </span>
      ) : null}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mt-2 flex min-w-0 items-center gap-2 text-[color:var(--color-text-muted)]">
            <ModerationTrackerIcon
              type={tracker.type}
              className="h-8 w-8 shrink-0 text-[color:var(--color-text-muted)]"
            />
          </div>
        </div>
        <span className="mt-2 shrink-0 leading-none text-[color:var(--color-text)]">
          <span className="text-[2.45rem] font-semibold sm:text-[2.7rem]">
            {tracker.current_streak_days}
          </span>
          <span className="ml-0.5 align-top text-[1.05rem] font-semibold text-[color:var(--color-text-subtle)] sm:text-[1.2rem]">
            d
          </span>
        </span>
      </div>
      <p
        className="pointer-events-none absolute bottom-2 left-1/2 z-10 w-full -translate-x-1/2 truncate px-2 text-center text-[0.72rem] font-medium tracking-[0.02em] text-[color:var(--color-text-muted)]"
        title={hint}
      >
        {label}
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
  demoAnchor,
}: Props) {
  const { language } = usePostLoginLanguage();
  const enabled = useMemo(
    () => (data?.trackers ?? []).filter((tracker) => tracker.is_enabled),
    [data],
  );
  if (!loading && enabled.length === 0) return null;

  const activeCount = Math.max(1, Math.min(3, enabled.length || 1));
  const resolvedTitle = title?.trim() || (language === 'en' ? 'Moderation' : 'Moderación');

  return (
    <section className="space-y-2.5 pt-1.5 md:pt-2 lg:pt-2.5" data-demo-anchor={demoAnchor}>
      <header className="flex min-h-[1.625rem] items-center pl-1.5 pt-1.5 md:pl-0 md:pt-0">
        <DashboardTitle level="h1" as="h3">
          {resolvedTitle}
        </DashboardTitle>
      </header>
      <div
        data-demo-anchor={demoAnchor ? `${demoAnchor}-content` : undefined}
        className={`grid gap-2.5 sm:gap-3 ${activeCount === 1 ? "grid-cols-1" : ""} ${activeCount === 2 ? "grid-cols-2" : ""} ${activeCount === 3 ? "grid-cols-3 max-[360px]:grid-cols-2" : ""}`}
      >
        {loading && (
          <div className="h-20 animate-pulse rounded-ib-lg border border-[color:var(--color-border-subtle)] bg-[color:var(--ib-surface-card)]" />
        )}
        {!loading &&
          enabled.map((tracker) => (
            <Chip
              key={tracker.type}
              tracker={tracker}
              onCycle={onCycle}
              onEdit={onEdit}
              language={language}
            />
          ))}
      </div>
    </section>
  );
}

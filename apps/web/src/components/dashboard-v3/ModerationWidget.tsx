import type {
  ModerationTrackerConfig,
  ModerationTrackerType,
} from "../../lib/api";
import { useLongPress } from "../../hooks/useLongPress";
import {
  moderationTrackerMeta,
  ModerationTrackerIcon,
} from "../moderation/trackerMeta";

interface ModerationWidgetProps {
  title?: string;
  configs: Record<ModerationTrackerType, ModerationTrackerConfig>;
  onEdit: () => void;
  compact?: boolean;
  showHeader?: boolean;
}

export function ModerationWidget({
  title = "Moderación",
  configs,
  onEdit,
  compact = false,
  showHeader = true,
}: ModerationWidgetProps) {
  const enabled = (Object.keys(configs) as ModerationTrackerType[]).filter(
    (type) => configs[type].isEnabled,
  );
  const longPressBind = useLongPress({ onLongPress: onEdit, delayMs: 2200 });
  const activeCount = Math.max(1, Math.min(3, enabled.length || 1));

  return (
    <section
      className={`rounded-3xl border border-white/10 bg-white/5 text-white/90 ${compact ? "p-3" : "p-4"}`}
      {...longPressBind}
      aria-label="Widget de moderación"
    >
      {showHeader ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.26em] text-text-muted">
              Widget
            </p>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="text-xs text-text-muted">
              Tip: mantené presionado un widget para editarlo.
            </p>
          </div>
        </div>
      ) : null}
      <div
        className={`grid gap-2 ${activeCount === 1 ? "grid-cols-1" : ""} ${activeCount === 2 ? "grid-cols-2" : ""} ${activeCount === 3 ? "grid-cols-3 max-[360px]:grid-cols-2" : ""}`}
      >
        {enabled.map((type) => (
          <div
            key={type}
            className="rounded-[1.35rem] border border-white/10 bg-black/20 px-3 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <ModerationTrackerIcon
                type={type}
                className="h-4 w-4 text-white/90"
              />
              <span className="text-sm font-semibold text-amber-200">
                {configs[type].notLoggedToleranceDays}d
              </span>
            </div>
            <p
              className="mt-1 text-[11px] text-white/75"
              title={moderationTrackerMeta[type].hint}
            >
              {moderationTrackerMeta[type].label}
            </p>
            <p className="text-[10px] text-text-muted">
              {configs[type].isPaused ? "Vacaciones" : "Activo"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

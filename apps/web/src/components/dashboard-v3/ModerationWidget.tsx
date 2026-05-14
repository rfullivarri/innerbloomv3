import type {
  ModerationTrackerConfig,
  ModerationTrackerType,
} from "../../lib/api";
import { useLongPress } from "../../hooks/useLongPress";
import { usePostLoginLanguage } from "../../i18n/postLoginLanguage";
import { ModerationTrackerIcon } from "../moderation/trackerMeta";

interface ModerationWidgetProps {
  title?: string;
  configs: Record<ModerationTrackerType, ModerationTrackerConfig>;
  onEdit: () => void;
  compact?: boolean;
  showHeader?: boolean;
}

export function ModerationWidget({
  title,
  configs,
  onEdit,
  compact = false,
  showHeader = true,
}: ModerationWidgetProps) {
  const enabled = (Object.keys(configs) as ModerationTrackerType[]).filter(
    (type) => configs[type].isEnabled,
  );
  const { t } = usePostLoginLanguage();
  const resolvedTitle = title ?? t('dashboard.menu.moderation');
  const longPressBind = useLongPress({ onLongPress: onEdit, delayMs: 2200 });
  const activeCount = Math.max(1, Math.min(3, enabled.length || 1));

  const trackerLabelByType: Record<ModerationTrackerType, string> = {
    alcohol: "Alcohol",
    tobacco: t('dashboard.moderation.tobacco'),
    sugar: t('dashboard.moderation.sugar'),
  };

  const trackerHintByType: Partial<Record<ModerationTrackerType, string>> = {
    sugar: t('dashboard.menu.sugarAdded'),
  };

  return (
    <section
      className={`rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--ib-surface-card)] text-[color:var(--color-widget-menu-item-title)] shadow-[var(--shadow-elev-1)] ${compact ? "p-3" : "p-4"}`}
      {...longPressBind}
      aria-label={t('dashboard.menu.moderation')}
    >
      {showHeader ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.26em] text-[color:var(--color-widget-menu-label)]">
              {t('dashboard.menu.widgets')}
            </p>
            <h3 className="text-base font-semibold">{resolvedTitle}</h3>
            <p className="text-xs text-[color:var(--color-widget-menu-label)]">
              {t('dashboard.moderation.tipLongPress')}
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
            className="rounded-[1.35rem] border border-[color:var(--color-border-soft)] bg-[color:var(--ib-surface-card-active)] px-3 py-2 shadow-[var(--shadow-elev-1)]"
          >
            <div className="flex items-start justify-between gap-2">
              <ModerationTrackerIcon
                type={type}
                className="h-4 w-4 text-[color:var(--color-widget-menu-icon)]"
              />
              <span className="text-sm font-semibold text-[color:var(--color-widget-menu-item-title)]">
                {configs[type].notLoggedToleranceDays}d
              </span>
            </div>
            <p
              className="mt-1 text-[11px] text-[color:var(--color-widget-menu-label)]"
              title={trackerHintByType[type]}
            >
              {trackerLabelByType[type]}
            </p>
            <p className="text-[10px] text-[color:var(--color-widget-menu-label)]">
              {configs[type].isPaused ? t('dashboard.moderation.vacation') : t('dashboard.moderation.active')}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

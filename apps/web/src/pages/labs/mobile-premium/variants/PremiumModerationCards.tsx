import { useEffect, useRef, useState } from 'react';

import { ModerationTrackerIcon, moderationTrackerMeta } from '../../../../components/moderation/trackerMeta';
import { useLongPress } from '../../../../hooks/useLongPress';
import { usePostLoginLanguage } from '../../../../i18n/postLoginLanguage';
import type { ModerationStatus, ModerationTracker, ModerationTrackerType } from '../../../../lib/api';

const FLASH_VISIBLE_MS = 960;
const FLASH_EXIT_MS = 280;

function nextPremiumModerationStatus(status: ModerationStatus): ModerationStatus {
  if (status === 'not_logged') return 'on_track';
  if (status === 'on_track') return 'off_track';
  return 'on_track';
}

export function PremiumModerationCards({
  trackers,
  onCycle,
  onManage,
  onOpenDetail,
  pendingType,
  compact = false,
}: {
  trackers: ModerationTracker[];
  onCycle: (type: ModerationTrackerType, status: ModerationStatus) => void;
  onManage?: () => void;
  onOpenDetail?: (tracker: ModerationTracker) => void;
  pendingType?: ModerationTrackerType | null;
  compact?: boolean;
}) {
  const { t } = usePostLoginLanguage();
  const enabled = trackers.filter((tracker) => tracker.is_enabled);
  if (enabled.length === 0) return null;

  return (
    <section className={compact ? 'space-y-4' : 'space-y-3'}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={`${compact ? 'text-lg font-medium' : 'text-[1.28rem] font-semibold'} text-[color:var(--mp-text)]`}>{t('mobilePremium.moderation.title')}</h2>
        {onManage ? (
          <button className="shrink-0 text-xs font-semibold text-[color:var(--mp-violet)]" onClick={onManage} type="button">
            {t('mobilePremium.moderation.edit')}
          </button>
        ) : null}
      </div>
      <div className={`grid ${compact ? 'divide-x divide-[color:var(--mp-border)] border-y border-[color:var(--mp-border)]' : 'gap-2.5'} ${enabled.length === 1 ? 'grid-cols-1' : enabled.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {enabled.map((tracker) => (
          <PremiumModerationCard
            compact={compact}
            isPending={pendingType === tracker.type}
            key={tracker.type}
            onCycle={onCycle}
            onOpenDetail={onOpenDetail}
            tracker={tracker}
          />
        ))}
      </div>
    </section>
  );
}

function PremiumModerationCard({
  tracker,
  onCycle,
  onOpenDetail,
  isPending,
  compact,
}: {
  tracker: ModerationTracker;
  onCycle: (type: ModerationTrackerType, status: ModerationStatus) => void;
  onOpenDetail?: (tracker: ModerationTracker) => void;
  isPending: boolean;
  compact: boolean;
}) {
  const { language, t } = usePostLoginLanguage();
  const meta = moderationTrackerMeta[tracker.type];
  const label = translateModerationTrackerLabel(meta.label, language);
  const previousStatus = useRef(tracker.statusToday);
  const longPressed = useRef(false);
  const longPressResetTimer = useRef<number | null>(null);
  const [flash, setFlash] = useState<Exclude<ModerationStatus, 'not_logged'> | null>(null);
  const [flashExiting, setFlashExiting] = useState(false);
  const longPressBind = useLongPress({
    delayMs: 650,
    onLongPress: () => {
      if (!onOpenDetail) return;
      longPressed.current = true;
      onOpenDetail(tracker);
      longPressResetTimer.current = window.setTimeout(() => {
        longPressed.current = false;
      }, 700);
    },
  });

  useEffect(() => {
    if (tracker.statusToday === previousStatus.current) return undefined;
    previousStatus.current = tracker.statusToday;
    if (tracker.statusToday === 'not_logged') {
      setFlash(null);
      return undefined;
    }

    setFlash(tracker.statusToday);
    setFlashExiting(false);
    const exitTimer = window.setTimeout(() => setFlashExiting(true), FLASH_VISIBLE_MS);
    const clearTimer = window.setTimeout(() => setFlash(null), FLASH_VISIBLE_MS + FLASH_EXIT_MS);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(clearTimer);
    };
  }, [tracker.statusToday]);

  useEffect(() => () => {
    if (longPressResetTimer.current !== null) window.clearTimeout(longPressResetTimer.current);
  }, []);

  return (
    <button
      aria-label={`${label}: ${tracker.current_streak_days} ${t('mobilePremium.moderation.days')} ${t('mobilePremium.moderation.title').toLowerCase()}. ${
        tracker.is_paused ? t('mobilePremium.moderation.pausedA11y') : t('mobilePremium.moderation.actionA11y')
      }`}
      className={`relative overflow-hidden text-left transition ${
        compact
          ? `min-h-[5.7rem] bg-transparent px-3 py-3.5 ${
              flash === 'on_track' ? 'bg-emerald-300/[0.04]' : flash === 'off_track' ? 'bg-amber-300/[0.04]' : ''
            }`
          : `min-h-[6.6rem] rounded-[1.25rem] border bg-[color:var(--mp-surface)] px-3 pb-3 pt-3 ${
              flash === 'on_track'
                ? 'border-emerald-300/28'
                : flash === 'off_track'
                  ? 'border-amber-300/28'
                  : 'border-[color:var(--mp-border)]'
            }`
      } ${isPending ? 'opacity-60' : tracker.is_paused ? 'opacity-55' : ''}`}
      disabled={isPending}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        if (tracker.is_paused) {
          onOpenDetail?.(tracker);
          return;
        }
        onCycle(tracker.type, nextPremiumModerationStatus(tracker.statusToday));
      }}
      type="button"
      {...longPressBind}
    >
      {flash ? (
        <span
          aria-live="polite"
          className={`pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full border px-2 py-1 text-[10px] font-semibold transition duration-300 ${
            flash === 'on_track'
              ? 'border-emerald-300/32 bg-emerald-300/12 text-[color:var(--mp-green)]'
              : 'border-amber-300/32 bg-amber-300/12 text-[color:var(--mp-amber)]'
          } ${flashExiting ? '-translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}
        >
          {flash === 'on_track' ? t('mobilePremium.moderation.onTrack') : t('mobilePremium.moderation.offTrack')}
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <ModerationTrackerIcon className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} text-[color:var(--mp-violet)]`} type={tracker.type} />
        <span className="leading-none text-[color:var(--mp-text)]">
          <span className={`${compact ? 'text-[1.65rem]' : 'text-3xl'} font-light`}>{tracker.current_streak_days}</span>
          <span className="ml-1 align-top text-xs text-[color:var(--mp-text-secondary)]">{t('mobilePremium.moderation.daySuffix')}</span>
        </span>
      </div>
      <p className={`${compact ? 'mt-2 text-xs' : 'mt-3 text-sm'} truncate font-medium text-[color:var(--mp-text)]`}>{label}</p>
      {tracker.is_paused ? <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--mp-violet)]">{t('mobilePremium.moderation.paused')}</p> : null}
    </button>
  );
}

function translateModerationTrackerLabel(label: string, language: 'es' | 'en') {
  if (language === 'es') return label;
  const normalized = label.trim().toLowerCase();
  if (normalized.includes('azúcar') || normalized.includes('azucar')) return 'Sugar';
  if (normalized.includes('alcohol')) return 'Alcohol';
  if (normalized.includes('tabaco') || normalized.includes('tobacco')) return 'Tobacco';
  return label;
}

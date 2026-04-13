import { Sparkles } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  acceptGameModeUpgradeSuggestion,
  dismissGameModeUpgradeSuggestion,
  type GameModeUpgradeSuggestion,
} from '../../lib/api';
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';
import { UpgradeRecommendationModal } from './UpgradeRecommendationModal';

interface ModeUpgradeSuggestionCTAProps {
  suggestion: GameModeUpgradeSuggestion | null;
  isLoading?: boolean;
  onSuggestionChange?: (next: GameModeUpgradeSuggestion) => void;
  onUpgradeAccepted?: () => void;
}

function formatModeLabel(mode: string | null): string {
  if (!mode) return 'RHYTHM';
  return mode.trim().toUpperCase();
}

export function ModeUpgradeSuggestionCTA({
  suggestion,
  isLoading = false,
  onSuggestionChange,
  onUpgradeAccepted,
}: ModeUpgradeSuggestionCTAProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const { t } = usePostLoginLanguage();

  const isVisible = useMemo(() => {
    if (!suggestion) return false;

    return Boolean(
      suggestion.eligible_for_upgrade &&
        suggestion.cta_enabled &&
        suggestion.suggested_mode &&
        !suggestion.accepted_at &&
        !suggestion.dismissed_at,
    );
  }, [suggestion]);

  if (isLoading || !isVisible || !suggestion) {
    return null;
  }

  const handleAccept = async () => {
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const response = await acceptGameModeUpgradeSuggestion();
      onSuggestionChange?.(response.suggestion);
      onUpgradeAccepted?.();
    } catch (error) {
      console.error('Failed to accept mode upgrade suggestion', error);
      throw error;
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const handleDismiss = async () => {
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const response = await dismissGameModeUpgradeSuggestion();
      onSuggestionChange?.(response.suggestion);
    } catch (error) {
      console.error('Failed to dismiss mode upgrade suggestion', error);
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-black/20 bg-gradient-to-r from-[#a770ef] via-[#cf8bf3] to-[#fdb99b] px-4 py-3 text-black shadow-[0_24px_55px_rgba(167,112,239,0.42)] sm:px-5 sm:py-4">
        <div className="pointer-events-none absolute inset-0 progress-fill--typing opacity-45" aria-hidden />
        <button
          type="button"
          onClick={() => {
            void handleDismiss();
          }}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/25 bg-white/30 text-black transition hover:bg-white/45"
          aria-label={t('dashboard.upgradeCta.closeAria')}
        >
          <span aria-hidden="true" className="text-base leading-none">×</span>
        </button>

        <div className="relative pr-10 sm:pr-12">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-black/25 bg-white/28 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-black">
              <Sparkles className="h-3.5 w-3.5" />
              {t('dashboard.menu.upgradeAvailable')}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:mt-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold leading-tight sm:text-lg">{t('dashboard.upgradeCta.bannerTitle')}</p>
              <p className="mt-1 hidden text-sm text-black/85 sm:block">
                {t('dashboard.upgradeCta.bannerBody', {
                  currentMode: formatModeLabel(suggestion.current_mode),
                  nextMode: formatModeLabel(suggestion.suggested_mode),
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex h-10 shrink-0 items-center gap-2 self-center rounded-full border border-white/55 bg-white/88 px-4 text-sm font-semibold text-black shadow-[0_8px_24px_rgba(15,23,42,0.2)] backdrop-blur-sm transition hover:bg-white"
            >
              {t('dashboard.upgradeCta.bannerAction')}
            </button>
          </div>
        </div>
      </div>

      <UpgradeRecommendationModal
        open={isOpen}
        currentMode={suggestion.current_mode}
        nextMode={suggestion.suggested_mode}
        avatarProfile={null}
        isSubmitting={isSubmitting}
        onConfirm={handleAccept}
        onClose={() => setIsOpen(false)}
        onOpenAllModes={() => setIsOpen(false)}
      />
    </>
  );
}

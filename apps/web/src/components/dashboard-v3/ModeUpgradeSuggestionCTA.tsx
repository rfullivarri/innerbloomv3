import { Sparkles, WandSparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  acceptGameModeUpgradeSuggestion,
  dismissGameModeUpgradeSuggestion,
  type GameModeUpgradeSuggestion,
} from '../../lib/api';

interface ModeUpgradeSuggestionCTAProps {
  suggestion: GameModeUpgradeSuggestion | null;
  isLoading?: boolean;
  onSuggestionChange?: (next: GameModeUpgradeSuggestion) => void;
  onUpgradeAccepted?: () => void;
}

function formatModeLabel(mode: string | null): string {
  if (!mode) {
    return 'Unknown';
  }

  const normalized = mode.trim().toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function ModeUpgradeSuggestionCTA({
  suggestion,
  isLoading = false,
  onSuggestionChange,
  onUpgradeAccepted,
}: ModeUpgradeSuggestionCTAProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isVisible = useMemo(() => {
    if (!suggestion) {
      return false;
    }

    return Boolean(
      suggestion.eligible_for_upgrade &&
        suggestion.suggested_mode &&
        !suggestion.accepted_at &&
        !suggestion.dismissed_at,
    );
  }, [suggestion]);

  if (isLoading || !isVisible || !suggestion) {
    return null;
  }

  const passRatePercent = Math.round((suggestion.task_pass_rate ?? 0) * 100);

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      const response = await acceptGameModeUpgradeSuggestion();
      onSuggestionChange?.(response.suggestion);
      onUpgradeAccepted?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to accept mode upgrade suggestion', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    setIsSubmitting(true);
    try {
      const response = await dismissGameModeUpgradeSuggestion();
      onSuggestionChange?.(response.suggestion);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to dismiss mode upgrade suggestion', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-emerald-300/55 bg-gradient-to-r from-emerald-400/28 via-sky-400/24 to-violet-400/24 p-4 shadow-[0_18px_40px_rgba(16,185,129,0.2)]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-300/25 dark:text-emerald-100">
            <Sparkles className="h-3.5 w-3.5" />
            Next mode ready
          </span>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            You unlocked an upgrade from{' '}
            <span className="font-semibold">{formatModeLabel(suggestion.current_mode)}</span> to{' '}
            <span className="font-semibold">{formatModeLabel(suggestion.suggested_mode)}</span>.
          </p>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
          >
            <WandSparkles className="h-4 w-4" />
            Upgrade available
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-3xl border border-emerald-300/35 bg-white p-5 text-slate-900 shadow-[0_30px_90px_rgba(3,9,32,0.4)] dark:bg-slate-900 dark:text-white"
          >
            <div className="mb-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500 dark:text-emerald-300">
                Mode progression
              </p>
              <h2 className="text-xl font-semibold">Your next mode is ready</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Keep momentum by upgrading your mode now, or save it for later.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/85 p-4 dark:border-white/10 dark:bg-slate-800/65">
              <p className="text-sm">
                Current mode: <span className="font-semibold">{formatModeLabel(suggestion.current_mode)}</span>
              </p>
              <p className="text-sm">
                Suggested mode: <span className="font-semibold">{formatModeLabel(suggestion.suggested_mode)}</span>
              </p>
              <div className="pt-1 text-sm text-slate-700 dark:text-slate-200">
                <p>
                  {suggestion.tasks_meeting_goal} / {suggestion.tasks_total_evaluated} tasks met the goal
                </p>
                <p>{passRatePercent}% of tasks met goal</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleDismiss}
                disabled={isSubmitting}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={isSubmitting}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Saving...' : 'Upgrade'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

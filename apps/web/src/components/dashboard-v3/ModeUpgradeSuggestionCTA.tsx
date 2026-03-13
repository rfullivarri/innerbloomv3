import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  acceptGameModeUpgradeSuggestion,
  dismissGameModeUpgradeSuggestion,
  type GameModeUpgradeSuggestion,
} from '../../lib/api';
import { UpgradeRecommendationModal } from './UpgradeRecommendationModal';

interface ModeUpgradeSuggestionCTAProps {
  suggestion: GameModeUpgradeSuggestion | null;
  isLoading?: boolean;
  onSuggestionChange?: (next: GameModeUpgradeSuggestion) => void;
  onUpgradeAccepted?: () => void;
}

function formatModeLabel(mode: string | null): string {
  if (!mode) return 'MODO';
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
    }
  };

  const handleDismiss = async () => {
    setIsSubmitting(true);
    try {
      const response = await dismissGameModeUpgradeSuggestion();
      onSuggestionChange?.(response.suggestion);
    } catch (error) {
      console.error('Failed to dismiss mode upgrade suggestion', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-black/20 bg-gradient-to-r from-[#a770ef] via-[#cf8bf3] to-[#fdb99b] p-4 text-black shadow-[0_24px_55px_rgba(167,112,239,0.42)]">
        <div className="pointer-events-none absolute inset-0 progress-fill--typing opacity-45" aria-hidden />
        <button
          type="button"
          onClick={() => {
            void handleDismiss();
          }}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/25 bg-black/10 text-black transition hover:bg-black/20"
          aria-label="Cerrar upgrade"
        >
          <span aria-hidden="true" className="text-base leading-none">×</span>
        </button>
        <div className="relative flex flex-wrap items-center gap-3 pr-8">
          <span className="inline-flex items-center gap-1 rounded-full border border-black/25 bg-black/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-black">
            <Sparkles className="h-3.5 w-3.5" />
            Upgrade disponible
          </span>
          <div className="min-w-[220px] flex-1">
            <p className="text-sm font-bold">Estás listo para el siguiente nivel</p>
            <p className="text-sm text-black/85">
              Según tu progreso, ya podés dar el salto de {formatModeLabel(suggestion.current_mode)} a {formatModeLabel(suggestion.suggested_mode)}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
          >
            Continuar
          </button>
        </div>
      </div>

      <UpgradeRecommendationModal
        open={isOpen}
        currentMode={suggestion.current_mode}
        nextMode={suggestion.suggested_mode}
        isSubmitting={isSubmitting}
        onConfirm={handleAccept}
        onClose={() => setIsOpen(false)}
        onOpenAllModes={() => setIsOpen(false)}
      />
    </>
  );
}

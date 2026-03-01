import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { OnboardingLanguage } from '../constants';

interface NavButtonsProps {
  language?: OnboardingLanguage;
  onBack?: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  backLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  showBack?: boolean;
}

export function NavButtons({
  language = 'es',
  onBack,
  onConfirm,
  confirmLabel,
  backLabel,
  disabled = false,
  loading = false,
  showBack = true,
}: NavButtonsProps) {
  const resolvedConfirmLabel = confirmLabel ?? (language === 'en' ? 'Continue' : 'Continuar');
  const resolvedBackLabel = backLabel ?? (language === 'en' ? 'Back' : 'Volver');
  const confirmText = useMemo(
    () => (loading ? (language === 'en' ? 'Saving…' : 'Guardando…') : resolvedConfirmLabel),
    [language, loading, resolvedConfirmLabel],
  );

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          ← {resolvedBackLabel}
        </button>
      ) : (
        <span />
      )}
      <motion.button
        type="button"
        onClick={onConfirm}
        disabled={disabled || loading}
        whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#a770ef] via-[#cf8bf3] to-[#fdb99b] px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-[#cf8bf3]/30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cf8bf3]/60 disabled:cursor-not-allowed disabled:opacity-60"
        aria-busy={loading}
      >
        {loading ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent"
          />
        ) : null}
        {confirmText}
      </motion.button>
    </div>
  );
}

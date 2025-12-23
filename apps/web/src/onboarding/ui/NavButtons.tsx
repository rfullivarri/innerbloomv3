import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface NavButtonsProps {
  onBack?: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  backLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  showBack?: boolean;
}

export function NavButtons({
  onBack,
  onConfirm,
  confirmLabel = 'Continuar',
  backLabel = 'Volver',
  disabled = false,
  loading = false,
  showBack = true,
}: NavButtonsProps) {
  const confirmText = useMemo(() => (loading ? 'Guardando…' : confirmLabel), [confirmLabel, loading]);

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          ← {backLabel}
        </button>
      ) : (
        <span />
      )}
      <motion.button
        type="button"
        onClick={onConfirm}
        disabled={disabled || loading}
        whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-400 via-violet-500 to-fuchsia-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-white/30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300 disabled:cursor-not-allowed disabled:opacity-60"
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

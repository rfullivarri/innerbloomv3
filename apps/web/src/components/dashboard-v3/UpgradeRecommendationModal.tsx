import { Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { GAME_MODE_META } from '../../lib/gameModeMeta';
import { normalizeGameModeValue } from '../../lib/gameMode';

interface UpgradeRecommendationModalProps {
  open: boolean;
  currentMode: string | null;
  nextMode: string | null;
  isSubmitting: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  onOpenAllModes: () => void;
}

function formatMode(mode: string | null): string {
  if (!mode) return 'Modo actual';
  return mode.trim().toUpperCase();
}

function resolveModeMeta(mode: string | null) {
  const normalized = normalizeGameModeValue(mode);
  if (!normalized) return null;
  return GAME_MODE_META[normalized];
}

export function UpgradeRecommendationModal({
  open,
  currentMode,
  nextMode,
  isSubmitting,
  onConfirm,
  onClose,
  onOpenAllModes,
}: UpgradeRecommendationModalProps) {
  const [slideValue, setSlideValue] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const currentMeta = useMemo(() => resolveModeMeta(currentMode), [currentMode]);
  const nextMeta = useMemo(() => resolveModeMeta(nextMode), [nextMode]);

  useEffect(() => {
    if (!open) {
      setSlideValue(0);
      setIsSuccess(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    await onConfirm();
    setIsSuccess(true);
  };

  const handleSlideChange = async (value: number) => {
    if (isSubmitting || isSuccess) return;
    setSlideValue(value);
    if (value >= 96) {
      setSlideValue(100);
      await handleConfirm();
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section className="w-full max-w-xl rounded-3xl border border-white/40 bg-white p-5 text-black shadow-[0_30px_90px_rgba(3,9,32,0.55)]">
        {isSuccess ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[#a770ef] via-[#cf8bf3] to-[#fdb99b] text-black shadow-[0_12px_30px_rgba(167,112,239,0.5)]">
              <Sparkles className="h-7 w-7" />
            </div>
            <p className="text-lg font-semibold">Listo. Ya estás en {formatMode(nextMode)}.</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
            >
              Vamos por ello
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/70">UPGRADE DISPONIBLE</p>
            <h2 className="mt-1 text-2xl font-semibold">Pasá de {formatMode(currentMode)} a {formatMode(nextMode)}</h2>
            <p className="mt-2 text-sm text-black/75">
              Tu progreso indica que ya estás listo para este cambio. Al hacer el upgrade, tus tareas van a evaluarse con el nuevo modo de juego.
            </p>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-black/10 bg-gradient-to-r from-[#a770ef] via-[#cf8bf3] to-[#fdb99b] p-4">
              <div className="flex flex-col items-center gap-2">
                {currentMeta ? <img src={currentMeta.avatarSrc} alt={currentMeta.avatarAlt.es} className="h-16 w-16 rounded-xl object-cover" /> : null}
                <p className="text-xs font-semibold">{formatMode(currentMode)}</p>
              </div>
              <span className="text-lg font-bold" aria-hidden="true">→</span>
              <div className="flex flex-col items-center gap-2">
                {nextMeta ? <img src={nextMeta.avatarSrc} alt={nextMeta.avatarAlt.es} className="h-16 w-16 rounded-xl object-cover" /> : null}
                <p className="text-xs font-semibold">{formatMode(nextMode)}</p>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/60">Deslizá para confirmar el upgrade</p>
              <div className="rounded-full border border-black/15 bg-black/5 p-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={slideValue}
                  onChange={(event) => {
                    void handleSlideChange(Number(event.target.value));
                  }}
                  disabled={isSubmitting}
                  className="progress-fill--typing h-10 w-full cursor-pointer accent-black"
                  aria-label="Deslizá para confirmar el upgrade"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenAllModes}
              className="mt-3 text-xs font-medium underline decoration-black/40 underline-offset-4"
            >
              Ver todos los modos
            </button>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium"
              >
                Cerrar
              </button>
              {isSubmitting ? <span className="text-sm font-medium">Actualizando...</span> : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

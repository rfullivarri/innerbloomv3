import { Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';
import type { AvatarProfile } from '../../lib/avatarProfile';
import { normalizeGameModeValue } from '../../lib/gameMode';
import { GAME_MODE_META, type LocalizedLanguage } from '../../lib/gameModeMeta';
import { resolveRhythmTheme } from '../../lib/rhythmTheme';
import { buildGameModeChip, GameModeChip } from '../common/GameModeChip';

interface UpgradeRecommendationModalProps {
  open: boolean;
  currentMode: string | null;
  nextMode: string | null;
  avatarProfile: AvatarProfile | null;
  isSubmitting: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  onOpenAllModes: () => void;
}

const DRAG_COMPLETE_THRESHOLD = 0.9;
const DRAG_HANDLE_SIZE = 56;

function formatMode(mode: string | null): string {
  if (!mode) return 'RHYTHM';
  return mode.trim().toUpperCase();
}

function buildRhythmIntensityLabel(mode: string | null, language: LocalizedLanguage): string {
  const normalized = normalizeGameModeValue(mode);
  if (!normalized) {
    return language === 'es' ? 'Ritmo · —' : 'Rhythm · —';
  }

  const frequency = GAME_MODE_META[normalized].frequency[language];
  return `${normalized} · ${frequency}`;
}

export function UpgradeRecommendationModal({
  open,
  currentMode,
  nextMode,
  avatarProfile,
  isSubmitting,
  onConfirm,
  onClose,
  onOpenAllModes,
}: UpgradeRecommendationModalProps) {
  const { t, language } = usePostLoginLanguage();
  const [dragProgress, setDragProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLButtonElement | null>(null);

  const confirmInFlightRef = useRef(false);

  const currentRhythm = useMemo(() => normalizeGameModeValue(currentMode), [currentMode]);
  const nextRhythm = useMemo(() => normalizeGameModeValue(nextMode), [nextMode]);
  const currentRhythmTheme = useMemo(() => resolveRhythmTheme(currentMode), [currentMode]);
  const nextModeChip = useMemo(
    () => buildGameModeChip(nextMode, { avatarProfile }),
    [avatarProfile, nextMode],
  );
  const currentRhythmLabel = useMemo(() => buildRhythmIntensityLabel(currentMode, language), [currentMode, language]);
  const nextRhythmLabel = useMemo(() => buildRhythmIntensityLabel(nextMode, language), [nextMode, language]);

  useEffect(() => {
    if (!open) {
      setDragProgress(0);
      setIsSuccess(false);
      setIsDragging(false);
      setActivePointerId(null);
      confirmInFlightRef.current = false;
    }
  }, [open]);

  const handleConfirm = useCallback(async () => {
    if (confirmInFlightRef.current || isSubmitting || isSuccess) {
      return;
    }

    confirmInFlightRef.current = true;
    try {
      await onConfirm();
      setIsSuccess(true);
    } finally {
      confirmInFlightRef.current = false;
    }
  }, [isSubmitting, isSuccess, onConfirm]);

  const resolveProgressFromClientX = (clientX: number) => {
    if (!railRef.current) {
      return 0;
    }
    const rect = railRef.current.getBoundingClientRect();
    const maxTravel = Math.max(rect.width - DRAG_HANDLE_SIZE, 1);
    const relativeX = clientX - rect.left - DRAG_HANDLE_SIZE / 2;
    const boundedX = Math.max(0, Math.min(maxTravel, relativeX));
    return boundedX / maxTravel;
  };

  const handlePointerMove = async (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isSubmitting || isSuccess) return;
    if (activePointerId !== null && event.pointerId !== activePointerId) return;

    const nextValue = resolveProgressFromClientX(event.clientX);
    setDragProgress(nextValue);

    if (nextValue >= DRAG_COMPLETE_THRESHOLD) {
      setDragProgress(1);
      setIsDragging(false);
      setActivePointerId(null);
      if (handleRef.current && event.pointerId !== undefined && handleRef.current.hasPointerCapture(event.pointerId)) {
        handleRef.current.releasePointerCapture(event.pointerId);
      }
      await handleConfirm();
    }
  };

  const resetIfIncomplete = () => {
    if (!isSuccess && dragProgress < DRAG_COMPLETE_THRESHOLD) {
      setDragProgress(0);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/72 p-3 backdrop-blur-md sm:items-center sm:p-6">
      <section className="w-full max-w-xl rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface-elevated)] p-5 text-[color:var(--color-text)] shadow-[0_30px_90px_rgba(3,9,32,0.55)] sm:p-6">
        {isSuccess ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[#a770ef] via-[#cf8bf3] to-[#fdb99b] text-black shadow-[0_12px_30px_rgba(167,112,239,0.5)]">
              <Sparkles className="h-7 w-7" />
            </div>
            {nextMode ? (
              <div className="flex justify-center">
                <GameModeChip {...nextModeChip} />
              </div>
            ) : null}
            <p className="text-lg font-semibold">
              {t('dashboard.upgradeCta.success', { nextMode: formatMode(nextMode) })}
            </p>
            <p className="text-sm text-[color:var(--color-text-muted)]">{t('dashboard.upgradeCta.successSubtitle')}</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-[color:var(--color-text)] px-4 py-3 text-sm font-semibold text-[color:var(--color-surface)] transition hover:opacity-90"
            >
              {t('dashboard.upgradeCta.finalAction')}
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-subtle)]">{t('dashboard.upgradeCta.modalEyebrow')}</p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight">
              {t('dashboard.upgradeCta.modalTitle', {
                currentMode: formatMode(currentMode),
                nextMode: formatMode(nextMode),
              })}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">{t('dashboard.upgradeCta.modalBody')}</p>

            <div className="mt-5 rounded-2xl border border-black/10 bg-gradient-to-r from-[#a770ef] via-[#cf8bf3] to-[#fdb99b] p-4 text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
              <div
                ref={railRef}
                className="relative h-24 rounded-xl border border-black/15 bg-white/20 px-2"
                onPointerMove={(event) => {
                  void handlePointerMove(event);
                }}
                onPointerUp={(event) => {
                  if (activePointerId !== null && event.pointerId !== activePointerId) return;
                  setIsDragging(false);
                  setActivePointerId(null);
                  resetIfIncomplete();
                }}
                onPointerCancel={(event) => {
                  if (activePointerId !== null && event.pointerId !== activePointerId) return;
                  setIsDragging(false);
                  setActivePointerId(null);
                  resetIfIncomplete();
                }}
                onPointerLeave={() => {
                  if (!isDragging || isSuccess) return;
                  setIsDragging(false);
                  setActivePointerId(null);
                  resetIfIncomplete();
                }}
              >
                <div className="pointer-events-none absolute inset-y-0 left-[4.5rem] right-[4.5rem] flex items-center justify-center">
                  <span className="text-3xl font-bold text-black/75" aria-hidden="true">→</span>
                </div>

                {nextRhythm ? (
                  <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl border border-black/10 bg-white/75 text-[10px] font-bold uppercase tracking-[0.14em] shadow-[0_10px_22px_rgba(15,23,42,0.28)]"
                      aria-hidden="true"
                    >
                      {t('dashboard.upgradeCta.nextTag')}
                    </div>
                    <p className="text-center text-[11px] font-semibold tracking-[0.02em]">{nextRhythmLabel}</p>
                  </div>
                ) : null}

                {currentRhythm ? (
                  <button
                    ref={handleRef}
                    type="button"
                    disabled={isSubmitting}
                    draggable={false}
                    className="absolute top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-xl p-0.5 touch-none transition enabled:cursor-grab active:cursor-grabbing"
                    style={{ left: `calc(${dragProgress * 100}% - ${(dragProgress * DRAG_HANDLE_SIZE).toFixed(2)}px)` }}
                    onDragStart={(event) => {
                      event.preventDefault();
                    }}
                    onPointerDown={(event) => {
                      if (isSubmitting || isSuccess) return;
                      setIsDragging(true);
                      setActivePointerId(event.pointerId);
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerUp={(event) => {
                      if (activePointerId !== null && event.pointerId !== activePointerId) return;
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }
                      setIsDragging(false);
                      setActivePointerId(null);
                      resetIfIncomplete();
                    }}
                    aria-label={t('dashboard.upgradeCta.dragHint')}
                  >
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl border border-black/10 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_10px_22px_rgba(15,23,42,0.28)]"
                      style={{ backgroundColor: currentRhythmTheme.accent }}
                      aria-hidden="true"
                    >
                      {t('dashboard.upgradeCta.nowTag')}
                    </div>
                    <p className="text-center text-[11px] font-semibold tracking-[0.02em]">{currentRhythmLabel}</p>
                  </button>
                ) : null}
              </div>
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-subtle)]">
              {t('dashboard.upgradeCta.dragHint')}
            </p>

            <button
              type="button"
              onClick={onOpenAllModes}
              className="mt-3 text-sm font-medium text-[color:var(--color-text)] underline decoration-[color:var(--color-text-muted)]/60 underline-offset-4"
            >
              {t('dashboard.upgradeCta.viewAllModes')}
            </button>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[color:var(--color-border-strong)] px-4 py-2 text-sm font-medium text-[color:var(--color-text)]"
              >
                {t('dashboard.upgradeCta.close')}
              </button>
              {isSubmitting ? <span className="text-sm font-medium text-[color:var(--color-text-muted)]">{t('dashboard.upgradeCta.updating')}</span> : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

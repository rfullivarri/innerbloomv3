import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { GameModeUpgradeSuggestion } from '../../../../lib/api';
import { normalizeGameModeValue, type GameMode } from '../../../../lib/gameMode';
import { GAME_MODE_META } from '../../../../lib/gameModeMeta';

const DRAG_HANDLE_SIZE = 72;
const DRAG_COMPLETE_THRESHOLD = 0.88;

export const LAB_FALLBACK_UPGRADE_SUGGESTION: GameModeUpgradeSuggestion = {
  current_mode: 'low',
  suggested_mode: 'evolve',
  period_key: null,
  eligible_for_upgrade: true,
  tasks_total_evaluated: 5,
  tasks_meeting_goal: 4,
  task_pass_rate: 0.8,
  accepted_at: null,
  dismissed_at: null,
  cta_enabled: true,
  cta_active_until: null,
  debug_forced_cta: true,
};

export function hasActivePremiumRhythmSuggestion(suggestion: GameModeUpgradeSuggestion | null): boolean {
  return Boolean(
    suggestion?.eligible_for_upgrade &&
      suggestion.cta_enabled &&
      suggestion.suggested_mode &&
      !suggestion.accepted_at &&
      !suggestion.dismissed_at,
  );
}

export function formatPremiumRhythmLabel(mode: string | null): string {
  return normalizeGameModeValue(mode)?.toUpperCase() ?? 'RHYTHM';
}

function getModeMeta(mode: string | null): { mode: GameMode | null; label: string; cadence: string; state: string } {
  const normalized = normalizeGameModeValue(mode);
  if (!normalized) {
    return { mode: null, label: 'RHYTHM', cadence: '-', state: 'Intensidad semanal' };
  }

  const meta = GAME_MODE_META[normalized];
  return {
    mode: normalized,
    label: normalized.toUpperCase(),
    cadence: meta.frequency.es,
    state: meta.state.es,
  };
}

function formatSuggestionEvidence(suggestion: GameModeUpgradeSuggestion): string {
  if (suggestion.tasks_total_evaluated <= 0) {
    return 'Análisis mensual';
  }

  return `${suggestion.tasks_meeting_goal}/${suggestion.tasks_total_evaluated} tareas en objetivo`;
}

function formatPassRate(suggestion: GameModeUpgradeSuggestion): string {
  return `${Math.round(Math.max(0, Math.min(1, suggestion.task_pass_rate)) * 100)}%`;
}

function formatDaysPerWeek(cadence: string): string {
  const match = cadence.match(/\d+/);
  return match?.[0] ?? cadence;
}

export function PremiumRhythmRecommendationBanner({
  onDismiss,
  onOpen,
  suggestion,
}: {
  onDismiss: () => void;
  onOpen: () => void;
  suggestion: GameModeUpgradeSuggestion;
}) {
  const current = getModeMeta(suggestion.current_mode);
  const next = getModeMeta(suggestion.suggested_mode);
  const evidence = formatSuggestionEvidence(suggestion);
  const passRate = formatPassRate(suggestion);

  return (
    <section className="relative overflow-hidden rounded-[1.55rem] bg-[radial-gradient(circle_at_12%_0%,rgba(167,139,250,0.22),transparent_34%),linear-gradient(180deg,rgba(167,139,250,0.11),rgba(104,211,145,0.055)_58%,rgba(255,252,245,0.028))] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,rgba(167,139,250,0),rgba(167,139,250,0.78),rgba(104,211,145,0.62),rgba(104,211,145,0))]" />
      <button
        aria-label="Cerrar recomendación de ritmo"
        className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/18 text-lg leading-none text-[color:var(--mp-text-muted)]"
        onClick={onDismiss}
        type="button"
      >
        ×
      </button>

      <div className="pr-10">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full border border-violet-200/28 bg-violet-300/12 text-[0.8rem] text-[color:var(--mp-violet)]">✦</span>
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--mp-violet)]">Logro de constancia</span>
        </div>
        <h2 className="mt-4 max-w-[19rem] text-[1.7rem] font-semibold leading-[1.08] text-[color:var(--mp-text)]">
          Desbloqueaste un ritmo más alto
        </h2>
      </div>

      <div className="mt-6 rounded-[1.25rem] bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <RhythmMiniStat label={current.label} value={current.cadence} />
          <span className="text-xl text-[color:var(--mp-violet)]" aria-hidden="true">→</span>
          <RhythmMiniStat align="right" emphasized label={next.label} value={next.cadence} />
        </div>
        <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--mp-text-muted)]">Evidencia</p>
            <p className="mt-1 text-sm font-medium text-[color:var(--mp-text)]">{evidence}</p>
          </div>
          <span className="text-3xl font-semibold leading-none text-[color:var(--mp-green)]">{passRate}</span>
        </div>
        <div className="mt-4">
          <button
            className="min-h-12 w-full rounded-full bg-violet-500 px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(139,92,246,0.24)]"
            onClick={onOpen}
            type="button"
          >
            Revisar recomendación
          </button>
        </div>
      </div>
    </section>
  );
}

export function PremiumRhythmRecommendationSheet({
  isSubmitting,
  onClose,
  onConfirm,
  suggestion,
}: {
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  suggestion: GameModeUpgradeSuggestion;
}) {
  const [dragProgress, setDragProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLButtonElement | null>(null);
  const confirmInFlightRef = useRef(false);

  const current = useMemo(() => getModeMeta(suggestion.current_mode), [suggestion.current_mode]);
  const next = useMemo(() => getModeMeta(suggestion.suggested_mode), [suggestion.suggested_mode]);
  const evidence = useMemo(() => formatSuggestionEvidence(suggestion), [suggestion]);
  const passRate = useMemo(() => formatPassRate(suggestion), [suggestion]);

  const finishConfirm = useCallback(async () => {
    if (confirmInFlightRef.current || isSubmitting || isSuccess) {
      return;
    }

    confirmInFlightRef.current = true;
    try {
      await onConfirm();
      setIsConfirming(false);
      setIsSuccess(true);
    } finally {
      confirmInFlightRef.current = false;
    }
  }, [isSubmitting, isSuccess, onConfirm]);

  const progressFromClientX = (clientX: number) => {
    if (!railRef.current) return 0;
    const rect = railRef.current.getBoundingClientRect();
    const maxTravel = Math.max(rect.width - DRAG_HANDLE_SIZE, 1);
    const relativeX = clientX - rect.left - DRAG_HANDLE_SIZE / 2;
    return Math.max(0, Math.min(maxTravel, relativeX)) / maxTravel;
  };

  const resetIfIncomplete = () => {
    if (!isSuccess && dragProgress < DRAG_COMPLETE_THRESHOLD) {
      setDragProgress(0);
    }
  };

  const handlePointerMove = async (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isSubmitting || isSuccess) return;
    if (activePointerId !== null && event.pointerId !== activePointerId) return;

    const nextProgress = progressFromClientX(event.clientX);
    setDragProgress(nextProgress);
    if (nextProgress >= DRAG_COMPLETE_THRESHOLD) {
      setDragProgress(1);
      setIsDragging(false);
      setActivePointerId(null);
      if (handleRef.current?.hasPointerCapture(event.pointerId)) {
        handleRef.current.releasePointerCapture(event.pointerId);
      }
      setIsConfirming(true);
    }
  };

  return (
    <section className="max-h-[88vh] w-full overflow-y-auto rounded-[1.75rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-bg-elevated)] p-5 text-[color:var(--mp-text)] shadow-[0_24px_72px_rgba(0,0,0,0.48)]">
      {isSuccess ? (
        <div className="py-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-300/12 text-2xl text-[color:var(--mp-green)] shadow-[0_0_42px_rgba(104,211,145,0.16)]">
            ✓
          </div>
          <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--mp-green)]">Felicitaciones</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight">Tu nuevo ritmo es {next.label}</h2>
          <div className="mx-auto mt-6 max-w-[17rem] rounded-[1.25rem] bg-emerald-300/10 px-5 py-5">
            <p className="text-[2.55rem] font-semibold leading-none text-[color:var(--mp-green)]">{formatDaysPerWeek(next.cadence)}</p>
            <p className="mt-2 text-sm font-medium text-[color:var(--mp-text)]">días por semana</p>
          </div>
          <p className="mx-auto mt-5 max-w-[17rem] text-sm leading-6 text-[color:var(--mp-text-secondary)]">
            Desde ahora tu Journey se evalúa con este nuevo ritmo.
          </p>
          <button
            className="mt-6 min-h-12 w-full rounded-full bg-violet-500 px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(139,92,246,0.24)]"
            onClick={onClose}
            type="button"
          >
            Seguir con mi Journey
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--mp-text-muted)]">Ritmo sugerido</p>
              <h2 className="mt-2 text-[1.72rem] font-medium leading-tight text-[color:var(--mp-text)]">
                Subir de {current.label} a {next.label}
              </h2>
            </div>
            <button
              aria-label="Cerrar"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-2xl text-[color:var(--mp-text-secondary)]"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-[color:var(--mp-text-secondary)]">Tu constancia habilita el cambio.</p>

          <div className="mt-6 grid grid-cols-2 divide-x divide-[color:var(--mp-border)] border-y border-[color:var(--mp-border)]">
            <RhythmComparePanel caption="Actual" mode={current} />
            <RhythmComparePanel caption="Sugerido" mode={next} highlighted />
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-3 rounded-[1.15rem] bg-[color:var(--mp-surface)] p-4">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--mp-text-muted)]">Evidencia</p>
              <p className="mt-1 text-sm font-medium text-[color:var(--mp-text)]">{evidence}</p>
            </div>
            <span className="text-2xl font-medium text-[color:var(--mp-green)]">{passRate}</span>
          </div>

          <div className="mt-6 rounded-full bg-[color:var(--mp-surface)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.28)]">
            <div
              className="relative h-[5.45rem] overflow-hidden rounded-full"
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
              onPointerMove={(event) => {
                void handlePointerMove(event);
              }}
              onPointerUp={(event) => {
                if (activePointerId !== null && event.pointerId !== activePointerId) return;
                setIsDragging(false);
                setActivePointerId(null);
                resetIfIncomplete();
              }}
              ref={railRef}
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="h-full rounded-full bg-[color:var(--mp-surface-strong)]" />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,rgba(167,139,250,0.42),rgba(104,211,145,0.28))]"
                  style={{ width: `${Math.max(18, dragProgress * 100)}%` }}
                />
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-[5.5rem] right-[7.1rem] flex items-center justify-center">
                <span className="text-[0.74rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--mp-text-secondary)]">Deslizá</span>
              </div>
              <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-right">
                <p className="text-base font-semibold uppercase tracking-[0.12em] text-[color:var(--mp-green)]">{next.label}</p>
                <p className="mt-1 text-xs font-medium text-[color:var(--mp-text-secondary)]">{next.cadence}</p>
              </div>
              <button
                aria-label="Deslizá para confirmar el cambio de ritmo"
                className="absolute top-1/2 z-10 grid h-[4.55rem] w-[4.9rem] -translate-y-1/2 touch-none place-items-center rounded-full bg-[color:var(--mp-bg-elevated)] text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--mp-text)] shadow-[0_0_0_2px_rgba(167,139,250,0.34),0_12px_30px_rgba(0,0,0,0.38)] transition enabled:cursor-grab active:cursor-grabbing"
                disabled={isSubmitting}
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
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
                ref={handleRef}
                style={{ left: `calc(${dragProgress * 100}% - ${(dragProgress * DRAG_HANDLE_SIZE).toFixed(2)}px)` }}
                type="button"
              >
                {current.label}
              </button>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              className="min-h-11 rounded-full border border-[color:var(--mp-border)] px-5 text-sm font-semibold text-[color:var(--mp-text-secondary)]"
              onClick={onClose}
              type="button"
            >
              Cerrar
            </button>
          </div>
          {isSubmitting ? <p className="mt-3 text-right text-sm font-semibold text-[color:var(--mp-text-secondary)]">Actualizando...</p> : null}
          {isConfirming ? (
            <RhythmChangeConfirmDialog
              isSubmitting={isSubmitting}
              mode={next}
              onCancel={() => {
                setIsConfirming(false);
                setDragProgress(0);
              }}
              onConfirm={() => {
                void finishConfirm();
              }}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function RhythmMiniStat({
  align = 'left',
  emphasized = false,
  label,
  value,
}: {
  align?: 'left' | 'right';
  emphasized?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className={align === 'right' ? 'text-right' : undefined}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--mp-text-muted)]">{label}</p>
      <p className={`mt-1 text-sm font-medium ${emphasized ? 'text-[color:var(--mp-green)]' : 'text-[color:var(--mp-text)]'}`}>{value}</p>
    </div>
  );
}

function RhythmComparePanel({
  caption,
  highlighted = false,
  mode,
}: {
  caption: string;
  highlighted?: boolean;
  mode: ReturnType<typeof getModeMeta>;
}) {
  return (
    <div className={`py-4 ${highlighted ? 'pl-4' : 'pr-4'}`}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--mp-text-muted)]">{caption}</p>
      <p className={`mt-3 text-2xl font-medium leading-none ${highlighted ? 'text-[color:var(--mp-green)]' : 'text-[color:var(--mp-text)]'}`}>{mode.label}</p>
      <p className="mt-2 text-sm font-medium text-[color:var(--mp-text-secondary)]">{mode.cadence}</p>
    </div>
  );
}

function RhythmChangeConfirmDialog({
  isSubmitting,
  mode,
  onCancel,
  onConfirm,
}: {
  isSubmitting: boolean;
  mode: ReturnType<typeof getModeMeta>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] mx-auto flex w-full max-w-[430px] items-end bg-black/62 px-3 pb-[max(14px,env(safe-area-inset-bottom))] backdrop-blur-md">
      <section className="w-full rounded-[1.55rem] bg-[color:var(--mp-bg-elevated)] p-5 text-[color:var(--mp-text)] shadow-[0_24px_72px_rgba(0,0,0,0.5)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--mp-green)]">Ritmo activado</p>
        <h3 className="mt-2 text-2xl font-semibold leading-tight">{mode.label} activado</h3>
        <p className="mt-3 text-sm leading-6 text-[color:var(--mp-text-secondary)]">
          Felicitaciones. Tu constancia ya desbloqueó una nueva intensidad.
        </p>
        <div className="mt-5 rounded-[1.25rem] bg-emerald-300/10 px-5 py-5 text-center">
          <p className="text-[2.35rem] font-semibold leading-none text-[color:var(--mp-green)]">{formatDaysPerWeek(mode.cadence)}</p>
          <p className="mt-2 text-sm font-medium text-[color:var(--mp-text)]">días por semana</p>
        </div>
        <div className="mt-5 grid grid-cols-[0.85fr_1.15fr] gap-3">
          <button
            className="min-h-12 rounded-full bg-[color:var(--mp-surface)] px-4 text-sm font-semibold text-[color:var(--mp-text-secondary)]"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="min-h-12 rounded-full bg-violet-500 px-5 text-sm font-semibold text-white disabled:opacity-55"
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting ? 'Confirmando...' : `Confirmar ${mode.label}`}
          </button>
        </div>
      </section>
    </div>
  );
}

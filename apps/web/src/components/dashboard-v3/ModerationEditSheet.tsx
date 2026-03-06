import { moderationTrackerOrder } from "../../hooks/useModerationWidget";
import type {
  ModerationTrackerConfig,
  ModerationTrackerType,
} from "../../lib/api";

const trackerLabels: Record<ModerationTrackerType, string> = {
  alcohol: "Alcohol",
  tobacco: "Tabaco",
  sugar: "Azúcar",
};

interface ModerationEditSheetProps {
  isOpen: boolean;
  isLoading: boolean;
  enabledTypes: ModerationTrackerType[];
  configs: Record<ModerationTrackerType, ModerationTrackerConfig> | null;
  onClose: () => void;
  onTogglePause: (type: ModerationTrackerType, value: boolean) => Promise<void>;
  onToleranceChange: (
    type: ModerationTrackerType,
    value: number,
  ) => Promise<void>;
}

export function ModerationEditSheet({
  isOpen,
  isLoading,
  enabledTypes,
  configs,
  onClose,
  onTogglePause,
  onToleranceChange,
}: ModerationEditSheetProps) {
  if (!isOpen) {
    return null;
  }

  const visibleTypes =
    enabledTypes.length > 0 ? enabledTypes : moderationTrackerOrder;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit Moderación"
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)]/95 p-4 text-[color:var(--color-text)] shadow-[var(--shadow-elev-2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-elevated)]/90 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
          <h3 className="text-base font-semibold text-[color:var(--color-text-strong)] [text-shadow:0_1px_1px_rgba(2,6,23,0.22)]">
            Edit Moderación
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] px-3 py-1 text-xs font-medium text-[color:var(--color-text-dim)] transition-colors hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-overlay-2)] hover:text-[color:var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-surface-elevated)]"
          >
            Cerrar
          </button>
        </div>

        {isLoading || !configs ? (
          <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-4 text-sm text-[color:var(--color-text-dim)]">
            Cargando configuración…
          </div>
        ) : (
          <div className="space-y-3.5">
            {visibleTypes.map((type) => {
              const isPaused = configs[type].isPaused;
              const isSwitchDisabled = !configs[type].isEnabled;
              const toleranceDays = configs[type].notLoggedToleranceDays;
              const toleranceProgress = (toleranceDays / 7) * 100;

              return (
                <div
                  key={type}
                  className="rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[color:var(--color-text)]">{trackerLabels[type]}</p>
                    {isSwitchDisabled ? (
                      <span className="rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-2)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[color:var(--color-text-faint)]">
                        Desactivado
                      </span>
                    ) : null}
                  </div>
                  <label className="mt-3 flex items-center justify-between text-sm text-[color:var(--color-text-dim)]">
                    <span>Vacaciones</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPaused}
                      aria-disabled={isSwitchDisabled}
                      disabled={isSwitchDisabled}
                      onClick={() => {
                        void onTogglePause(type, !isPaused);
                      }}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-surface-elevated)] ${
                        isSwitchDisabled
                          ? "cursor-not-allowed border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)]/65"
                          : isPaused
                            ? "border-[color:var(--color-accent-primary)]/70 bg-[color:var(--color-accent-primary)]/35"
                            : "border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-muted)]"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full shadow-[var(--shadow-elev-1)] transition ${
                          isSwitchDisabled
                            ? "translate-x-1 bg-[color:var(--color-border-strong)]"
                            : isPaused
                              ? "translate-x-6 bg-[color:var(--color-text-strong)]"
                              : "translate-x-1 bg-[color:var(--color-surface-elevated)]"
                        }`}
                      />
                    </button>
                  </label>
                  <label className="mt-3 block text-sm text-[color:var(--color-text-dim)]">
                    Tolerancia sin marcar: {toleranceDays}
                    <div className="relative mt-2 h-8">
                      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-2 -translate-y-1/2 rounded-full bg-[color:var(--color-surface-muted)]" data-testid="tolerance-rail" />
                      <div
                        className="pointer-events-none absolute left-0 top-1/2 z-10 h-2 -translate-y-1/2 rounded-full bg-[color:var(--color-semantic-success-500)]"
                        data-testid="tolerance-fill"
                        style={{ width: `${toleranceProgress}%` }}
                      />
                      <input
                        className="absolute inset-0 z-20 h-full w-full appearance-none bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-overlay-1)] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[color:var(--color-border-strong)] [&::-moz-range-thumb]:bg-[color:var(--color-surface-elevated)] [&::-moz-range-thumb]:shadow-[var(--shadow-elev-1)] [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20 [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[color:var(--color-border-strong)] [&::-webkit-slider-thumb]:bg-[color:var(--color-surface-elevated)] [&::-webkit-slider-thumb]:shadow-[var(--shadow-elev-1)]"
                        type="range"
                        min={0}
                        max={7}
                        step={1}
                        value={toleranceDays}
                        onChange={(event) => {
                          void onToleranceChange(type, Number(event.target.value));
                        }}
                      />
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

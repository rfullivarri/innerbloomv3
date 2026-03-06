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
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Edit Moderación</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] px-3 py-1 text-xs text-[color:var(--color-text-dim)] transition-colors hover:bg-[color:var(--color-overlay-2)]"
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
            {visibleTypes.map((type) => (
              <div
                key={type}
                className="rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[color:var(--color-text)]">{trackerLabels[type]}</p>
                  {!configs[type].isEnabled ? (
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
                    aria-checked={configs[type].isPaused}
                    onClick={() => {
                      void onTogglePause(type, !configs[type].isPaused);
                    }}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
                      configs[type].isPaused
                        ? "border-emerald-500/45 bg-emerald-500/30"
                        : "border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-2)]"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-[color:var(--color-surface-elevated)] shadow-[var(--shadow-elev-1)] transition ${
                        configs[type].isPaused
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>
                <label className="mt-3 block text-sm text-[color:var(--color-text-dim)]">
                  Tolerancia sin marcar: {configs[type].notLoggedToleranceDays}
                  <input
                    className="mt-2 w-full accent-emerald-500"
                    type="range"
                    min={0}
                    max={7}
                    step={1}
                    value={configs[type].notLoggedToleranceDays}
                    onChange={(event) => {
                      void onToleranceChange(type, Number(event.target.value));
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import type { ModerationTrackerConfig, ModerationTrackerType } from '../../lib/api';

const trackerLabels: Record<ModerationTrackerType, string> = {
  alcohol: 'Alcohol',
  tobacco: 'Tabaco',
  sugar: 'Azúcar',
};

interface ModerationEditSheetProps {
  isOpen: boolean;
  enabledTypes: ModerationTrackerType[];
  configs: Record<ModerationTrackerType, ModerationTrackerConfig>;
  onClose: () => void;
  onTogglePause: (type: ModerationTrackerType, value: boolean) => Promise<void>;
  onToleranceChange: (type: ModerationTrackerType, value: number) => Promise<void>;
}

export function ModerationEditSheet({
  isOpen,
  enabledTypes,
  configs,
  onClose,
  onTogglePause,
  onToleranceChange,
}: ModerationEditSheetProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit Moderación"
        className="w-full max-w-xl rounded-3xl border border-white/20 bg-surface/95 p-4 text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Edit Moderación</h3>
          <button type="button" onClick={onClose} className="rounded-full border border-white/25 px-3 py-1 text-xs text-white/80">
            Cerrar
          </button>
        </div>
        <div className="space-y-3">
          {enabledTypes.map((type) => (
            <div key={type} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-semibold">{trackerLabels[type]}</p>
              <label className="mt-2 flex items-center justify-between text-sm text-white/85">
                <span>Vacaciones</span>
                <input
                  type="checkbox"
                  checked={configs[type].isPaused}
                  onChange={(event) => {
                    void onTogglePause(type, event.target.checked);
                  }}
                />
              </label>
              <label className="mt-3 block text-sm text-white/85">
                Tolerancia sin marcar: {configs[type].notLoggedToleranceDays}
                <input
                  className="mt-2 w-full"
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
      </div>
    </div>
  );
}

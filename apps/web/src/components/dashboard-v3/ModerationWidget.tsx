import type { ModerationTrackerConfig, ModerationTrackerType } from '../../lib/api';
import { useLongPress } from '../../hooks/useLongPress';

const trackerMeta: Record<ModerationTrackerType, { label: string; icon: string; subtitle?: string }> = {
  alcohol: { label: 'Alcohol', icon: '◯' },
  tobacco: { label: 'Tabaco', icon: '◌' },
  sugar: { label: 'Azúcar', icon: '⬡', subtitle: 'azúcar añadido' },
};

interface ModerationWidgetProps {
  title?: string;
  configs: Record<ModerationTrackerType, ModerationTrackerConfig>;
  onEdit: () => void;
}

export function ModerationWidget({ title = 'Moderación', configs, onEdit }: ModerationWidgetProps) {
  const enabled = (Object.keys(configs) as ModerationTrackerType[]).filter((type) => configs[type].isEnabled);
  const longPressBind = useLongPress({ onLongPress: onEdit, delayMs: 2200 });

  return (
    <section
      className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white/90"
      {...longPressBind}
      aria-label="Widget de moderación"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.26em] text-text-muted">Widget</p>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-text-muted">Mantener presionado para editar</p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {enabled.map((type) => (
          <div key={type} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/75" aria-hidden>
                {trackerMeta[type].icon}
              </span>
              <div>
                <p className="text-sm font-medium text-white">{trackerMeta[type].label}</p>
                {trackerMeta[type].subtitle ? <p className="text-[11px] text-text-muted">{trackerMeta[type].subtitle}</p> : null}
              </div>
            </div>
            <span className="text-xs text-white/70">
              {configs[type].isPaused ? 'Vacaciones' : `Tolerancia: ${configs[type].notLoggedToleranceDays}`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

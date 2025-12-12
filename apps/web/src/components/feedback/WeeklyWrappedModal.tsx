import { useEffect, useMemo, useState } from 'react';
import type { WeeklyWrappedPayload, WeeklyWrappedSection } from '../../lib/weeklyWrapped';

const ANIMATION_DELAY = 80;

type WeeklyWrappedModalProps = {
  payload: WeeklyWrappedPayload;
  onClose: () => void;
};

export function WeeklyWrappedModal({ payload, onClose }: WeeklyWrappedModalProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const badges = useMemo(() => {
    const base = [
      payload.dataSource === 'mock' ? 'mock data' : 'datos reales',
      payload.variant === 'light' ? 'semana liviana' : 'semana completa',
    ];
    if (payload.summary.pillarDominant) {
      base.push(payload.summary.pillarDominant);
    }
    return base;
  }, [payload]);

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950/90 backdrop-blur" role="dialog" aria-modal>
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative z-10 mx-auto flex h-full w-full max-w-4xl flex-col gap-4 overflow-y-auto px-4 py-6">
        <header className="flex items-start justify-between gap-4 rounded-3xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 shadow-lg shadow-slate-950/40">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Weekly Wrapped · Preview</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-50">{formatRange(payload.weekRange)}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-300">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full bg-slate-800/70 px-3 py-1 text-[10px] font-semibold text-sky-100"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-sky-400/60 hover:text-sky-100"
          >
            Cerrar
          </button>
        </header>

        <div className="space-y-3 pb-6">
          {payload.sections.map((section, index) => (
            <WrappedSectionCard
              key={section.key}
              section={section}
              index={index}
              entered={entered}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type SectionCardProps = {
  section: WeeklyWrappedSection;
  index: number;
  entered: boolean;
};

function WrappedSectionCard({ section, index, entered }: SectionCardProps) {
  const delay = `${ANIMATION_DELAY * index}ms`;
  return (
    <article
      className={`transform rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-5 shadow-lg shadow-slate-950/50 transition-all duration-500 ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      style={{ transitionDelay: delay }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{section.accent ?? 'Slide'}</p>
          <h3 className="text-xl font-semibold text-slate-50">{section.title}</h3>
        </div>
        {section.key === 'highlight' ? <Burst /> : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-200">{section.body}</p>
      {section.items?.length ? (
        <div className="mt-4 space-y-3">
          {section.items.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 shadow-inner shadow-slate-950/30"
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-50">{item.title}</p>
                {item.badge ? (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-100">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function formatRange(range: WeeklyWrappedPayload['weekRange']): string {
  const start = new Date(range.start);
  const end = new Date(range.end);
  return `${start.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })}`;
}

function Burst() {
  return (
    <div className="relative h-10 w-10">
      <div className="absolute inset-0 animate-ping rounded-full bg-amber-500/20" aria-hidden />
      <div className="absolute inset-1 rounded-full bg-amber-500/30 blur-sm" aria-hidden />
      <div className="relative flex h-full w-full items-center justify-center rounded-full bg-amber-500/80 text-slate-950">
        ✨
      </div>
    </div>
  );
}

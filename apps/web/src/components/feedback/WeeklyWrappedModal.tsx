import { useEffect, useMemo, useState } from 'react';
import type { WeeklyWrappedPayload, WeeklyWrappedSection } from '../../lib/weeklyWrapped';

const ANIMATION_DELAY = 80;

type WeeklyWrappedModalProps = {
  payload: WeeklyWrappedPayload;
  onClose: () => void;
};

const GRADIENT_RING_CLASSES = [
  'from-emerald-400/40 via-cyan-400/10 to-indigo-500/40',
  'from-amber-400/40 via-rose-400/20 to-fuchsia-500/40',
  'from-sky-400/40 via-emerald-400/20 to-violet-500/40',
];

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
    <div className="fixed inset-0 z-50 flex bg-slate-950/95 backdrop-blur" role="dialog" aria-modal>
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 left-6 h-64 w-64 animate-[spin_22s_linear_infinite] bg-[radial-gradient(circle_at_center,_rgba(99,179,237,0.18),_transparent_55%)] blur-2xl" />
        <div className="absolute bottom-12 right-10 h-72 w-72 animate-[spin_26s_linear_reverse_infinite] bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.16),_transparent_55%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_10%,rgba(110,231,183,0.12),transparent),radial-gradient(90%_80%_at_80%_20%,rgba(94,234,212,0.08),transparent),radial-gradient(80%_120%_at_40%_80%,rgba(192,132,252,0.12),transparent)]" />
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-4xl flex-col gap-4 overflow-y-auto px-4 py-6">
        <header className="flex items-start justify-between gap-4 rounded-3xl border border-white/15 bg-slate-900/80 px-4 py-3 shadow-2xl shadow-emerald-500/10 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">Weekly Wrapped · Preview</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-50 drop-shadow-[0_0_18px_rgba(16,185,129,0.35)]">
              {formatRange(payload.weekRange)}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-100">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-emerald-300/30 bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold text-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_10px_30px_rgba(16,185,129,0.25)]"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-50 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:border-emerald-300/60 hover:bg-emerald-400/20 hover:text-slate-950"
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
  const auraClasses = GRADIENT_RING_CLASSES[index % GRADIENT_RING_CLASSES.length];
  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-emerald-500/10 ring-1 ring-white/5 transition-all duration-700 ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      style={{ transitionDelay: delay }}
    >
      <div className={`pointer-events-none absolute inset-0 opacity-60 blur-3xl transition duration-700 group-hover:opacity-100 ${`bg-gradient-to-br ${auraClasses}`}`} aria-hidden />
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 animate-[spin_14s_linear_infinite] rounded-full bg-gradient-to-br from-emerald-400/60 via-cyan-400/40 to-sky-500/40 blur-3xl" aria-hidden />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-100">{section.accent ?? 'Slide'}</p>
          <h3 className="text-xl font-semibold text-slate-50 drop-shadow-[0_0_18px_rgba(16,185,129,0.25)]">{section.title}</h3>
        </div>
        {section.key === 'highlight' ? <Burst /> : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-100 drop-shadow-[0_0_12px_rgba(56,189,248,0.2)]">{section.body}</p>
      {section.items?.length ? (
        <div className="mt-4 space-y-3">
          {section.items.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-500/10 via-slate-900/60 to-indigo-500/10 px-4 py-3 shadow-inner shadow-emerald-500/20 transition duration-500 hover:shadow-[0_8px_40px_rgba(16,185,129,0.25)]"
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-50">{item.title}</p>
                {item.badge ? (
                  <span className="rounded-full border border-emerald-300/40 bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-100 drop-shadow-[0_0_10px_rgba(14,165,233,0.25)]">{item.body}</p>
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
      <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/25" aria-hidden />
      <div className="absolute inset-1 rounded-full bg-gradient-to-br from-amber-400/70 via-orange-500/70 to-rose-500/70 blur-sm" aria-hidden />
      <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-rose-400 text-slate-900 shadow-lg shadow-amber-400/40">
        ✨
      </div>
    </div>
  );
}

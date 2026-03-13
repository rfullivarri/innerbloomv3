import { useMemo, type ReactNode } from 'react';
import type { ModerationTrackerType } from '../../lib/api';

interface ModerationOnboardingSuggestionProps {
  open: boolean;
  language: 'es' | 'en';
  selected: ModerationTrackerType[];
  onToggle: (type: ModerationTrackerType) => void;
  onActivate: () => void;
  onSkip: () => void;
  isSubmitting?: boolean;
}

type TrackerChip = {
  type: ModerationTrackerType;
  title: string;
  subtitle?: string;
};

const trackerIcons: Record<ModerationTrackerType, ReactNode> = {
  alcohol: (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden>
      <path d="M8 3h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 3v4l-2.5 4v7a3 3 0 003 3h3a3 3 0 003-3v-7L14 7V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  tobacco: (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden>
      <path d="M3 14h11a2 2 0 012 2v1H3v-3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 14h3a2 2 0 012 2v1h-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 10c0-1.4 1.1-2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 11c0-2 1.6-3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  sugar: (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden>
      <path d="M6 8l6-4 6 4v8l-6 4-6-4V8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 8l6 4 6-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 12v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

export function ModerationOnboardingSuggestion({
  open,
  language,
  selected,
  onToggle,
  onActivate,
  onSkip,
  isSubmitting = false,
}: ModerationOnboardingSuggestionProps) {
  const chips = useMemo<TrackerChip[]>(
    () => [
      { type: 'alcohol', title: language === 'en' ? 'Alcohol' : 'Alcohol' },
      { type: 'tobacco', title: language === 'en' ? 'Tobacco' : 'Tabaco' },
      {
        type: 'sugar',
        title: language === 'en' ? 'Sugar' : 'Azúcar',
        subtitle: language === 'en' ? 'added sugar' : 'azúcar añadido',
      },
    ],
    [language],
  );

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section className="onboarding-surface-base w-full max-w-4xl rounded-3xl border border-white/15 p-5 text-white shadow-[0_30px_90px_rgba(3,9,32,0.7)] sm:p-7">
        <div className="mb-5 space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{language === 'en' ? 'Add daily trackers' : 'Sumá trackers diarios'}</h2>
          <p className="text-sm text-white/75">
            {language === 'en'
              ? 'One tap per day. You mark it in your Daily Quest.'
              : 'Un toque por día. Lo marcás en tu Daily Quest.'}
          </p>
          <p className="text-xs font-medium tracking-wide text-[color:color-mix(in_srgb,var(--color-accent-secondary)_72%,white)]">
            {language === 'en'
              ? 'All trackers are selected by default. Tap to unselect any of them.'
              : 'Todos los trackers están seleccionados por defecto. Tocá para desmarcar cualquiera.'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {chips.map((chip) => {
            const isSelected = selected.includes(chip.type);
            return (
              <button
                type="button"
                key={chip.type}
                onClick={() => onToggle(chip.type)}
                title={chip.subtitle}
                className={[
                  'group rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--color-accent-secondary)_75%,white)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                  isSelected
                    ? 'border-[color:color-mix(in_srgb,var(--color-accent-secondary)_70%,white)] bg-[color:color-mix(in_srgb,var(--color-accent-secondary)_26%,var(--color-surface)_74%)] text-white shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent-secondary)_34%,transparent),0_16px_30px_color-mix(in_srgb,var(--color-accent-secondary)_35%,transparent)]'
                    : 'border-white/20 bg-[color:rgba(15,23,42,0.22)] text-white/88 hover:border-[color:color-mix(in_srgb,var(--color-accent-secondary)_45%,white)] hover:bg-[color:color-mix(in_srgb,var(--color-accent-secondary)_14%,var(--color-surface)_86%)] active:scale-[0.995] active:border-[color:color-mix(in_srgb,var(--color-accent-secondary)_62%,white)]',
                ].join(' ')}
                aria-pressed={isSelected}
              >
                <div className="mb-4 flex items-start justify-between text-white/90">
                  {trackerIcons[chip.type]}
                  <span
                    className={[
                      'rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide transition-colors',
                      isSelected
                        ? 'border-[color:color-mix(in_srgb,var(--color-accent-secondary)_58%,white)] bg-[color:color-mix(in_srgb,var(--color-accent-secondary)_42%,transparent)] text-white'
                        : 'border-white/20 bg-white/5 text-white/80',
                    ].join(' ')}
                  >
                    {isSelected ? (language === 'en' ? 'active' : 'activo') : language === 'en' ? 'off' : 'pausado'}
                  </span>
                </div>
                <p className="text-lg font-semibold">{chip.title}</p>
                {chip.subtitle ? <p className="text-xs text-white/65">{chip.subtitle}</p> : <div className="h-4" />}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full px-4 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
            disabled={isSubmitting}
          >
            {language === 'en' ? 'Not now' : 'Ahora no'}
          </button>
          <button
            type="button"
            onClick={onActivate}
            disabled={isSubmitting || selected.length === 0}
            className="rounded-full bg-[color:var(--color-accent-secondary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_color-mix(in_srgb,var(--color-accent-secondary)_40%,transparent)] transition hover:bg-[color:color-mix(in_srgb,var(--color-accent-secondary)_82%,white)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--color-accent-secondary)_70%,white)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            {isSubmitting ? (language === 'en' ? 'Activating...' : 'Activando...') : language === 'en' ? 'Activate' : 'Activar'}
          </button>
        </div>
      </section>
    </div>
  );
}

import { useMemo } from 'react';
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

type TrackerOption = {
  type: ModerationTrackerType;
  icon: string;
  title: string;
  description: string;
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
  const options = useMemo<TrackerOption[]>(
    () => [
      {
        type: 'sugar',
        icon: '🍬',
        title: language === 'en' ? 'Sugar' : 'Azúcar',
        description:
          language === 'en'
            ? 'Track cravings and excess moments to improve decisions.'
            : 'Registrar cuándo aparece antojo o exceso para mejorar decisiones.',
      },
      {
        type: 'tobacco',
        icon: '🚭',
        title: language === 'en' ? 'Tobacco' : 'Tabaco',
        description:
          language === 'en'
            ? 'Track usage and context to reduce sustainably.'
            : 'Seguir consumo y contexto para recortar de forma sostenible.',
      },
      {
        type: 'alcohol',
        icon: '🍷',
        title: 'Alcohol',
        description:
          language === 'en'
            ? 'Observe frequency and moments to keep balance.'
            : 'Observar frecuencia y momentos para mantener equilibrio.',
      },
    ],
    [language],
  );

  const copy =
    language === 'en'
      ? {
          title: 'Moderation',
          subtitle: 'Choose what you want to track with more awareness.',
          hint: 'No judgment: only tracking to find your own balance.',
          flex: 'You can also use flexible tolerance settings (for example, weekends).',
          skip: 'Not now',
          confirm: 'Continue',
          submitting: 'Continuing...',
        }
      : {
          title: 'Moderación',
          subtitle: 'Elegí qué querés observar con más consciencia.',
          hint: 'Sin juicios: solo seguimiento para encontrar balance.',
          flex: 'También podés manejar tolerancias flexibles (por ejemplo, fines de semana).',
          skip: 'Ahora no',
          confirm: 'Continuar',
          submitting: 'Continuando...',
        };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section className="onboarding-premium-root quickstart-premium-card onboarding-surface-base w-full max-w-3xl rounded-3xl p-5 sm:p-7">
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">{copy.title}</h2>
        <p className="mt-2 text-sm text-white/70">{copy.subtitle}</p>
        <p className="mt-2 text-xs text-white/55">{copy.hint}</p>

        <div className="mt-5 space-y-3">
          {options.map((option) => {
            const enabled = selected.includes(option.type);
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => onToggle(option.type)}
                className={`quickstart-moderation-option flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${enabled ? 'quickstart-moderation-option--enabled' : ''}`}
                aria-pressed={enabled}
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {option.icon} {option.title}
                  </p>
                  <p className="mt-1 text-xs text-white/65">{option.description}</p>
                </div>
                <span className={`quickstart-moderation-toggle inline-flex h-5 w-10 shrink-0 items-center overflow-hidden rounded-full p-0.5 ${enabled ? 'quickstart-moderation-toggle--enabled' : ''}`}>
                  <span className={`block h-4 w-4 shrink-0 rounded-full bg-white transition-transform ${enabled ? 'translate-x-[1.125rem]' : ''}`} />
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-white/65">{copy.flex}</p>

        <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full px-4 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
            disabled={isSubmitting}
          >
            {copy.skip}
          </button>
          <button
            type="button"
            onClick={onActivate}
            disabled={isSubmitting}
            className="quickstart-primary-cta rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--color-accent-secondary)_70%,white)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            {isSubmitting ? copy.submitting : copy.confirm}
          </button>
        </div>
      </section>
    </div>
  );
}

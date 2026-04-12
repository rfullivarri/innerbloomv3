import type { OnboardingLanguage } from '../constants';
import { NavButtons } from '../ui/NavButtons';
import type { ModerationOption } from '../quickStart';

interface QuickStartModerationStepProps {
  language?: OnboardingLanguage;
  selectedModerations: ModerationOption[];
  onToggle: (value: ModerationOption) => void;
  onBack: () => void;
  onConfirm: () => void;
}

const OPTIONS: Record<ModerationOption, { icon: string; es: { title: string; description: string }; en: { title: string; description: string } }> = {
  sugar: {
    icon: '🍬',
    es: {
      title: 'Azúcar',
      description: 'Registrar cuándo aparece antojo o exceso para mejorar decisiones.',
    },
    en: {
      title: 'Sugar',
      description: 'Track cravings and excess moments to improve decisions.',
    },
  },
  tobacco: {
    icon: '🚭',
    es: {
      title: 'Tabaco',
      description: 'Seguir consumo y contexto para recortar de forma sostenible.',
    },
    en: {
      title: 'Tobacco',
      description: 'Track usage and context to reduce sustainably.',
    },
  },
  alcohol: {
    icon: '🍷',
    es: {
      title: 'Alcohol',
      description: 'Observar frecuencia y momentos para mantener equilibrio.',
    },
    en: {
      title: 'Alcohol',
      description: 'Observe frequency and moments to keep balance.',
    },
  },
};

export function QuickStartModerationStep({ language = 'es', selectedModerations, onToggle, onBack, onConfirm }: QuickStartModerationStepProps) {
  const copy = language === 'en'
    ? {
        title: 'Moderation',
        subtitle: 'Choose what you want to track with more awareness.',
        hint: 'No judgment: only tracking to find your own balance.',
        flex: 'You can also use flexible tolerance settings (for example, weekends).',
        continue: 'Continue',
        back: 'Back',
      }
    : {
        title: 'Moderación',
        subtitle: 'Elegí qué querés observar con más consciencia.',
        hint: 'Sin juicios: solo seguimiento para encontrar balance.',
        flex: 'También podés manejar tolerancias flexibles (por ejemplo, fines de semana).',
        continue: 'Continuar',
        back: 'Volver',
      };

  return (
    <section className="onboarding-surface-base mx-auto w-full max-w-3xl rounded-3xl p-5 sm:p-7">
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">{copy.title}</h1>
      <p className="mt-2 text-sm text-white/70">{copy.subtitle}</p>
      <p className="mt-2 text-xs text-white/55">{copy.hint}</p>
      <div className="mt-5 space-y-3">
        {(Object.keys(OPTIONS) as ModerationOption[]).map((option) => {
          const card = OPTIONS[option][language];
          const enabled = selectedModerations.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${enabled ? 'border-violet-200/45 bg-violet-400/18' : 'border-white/20 bg-white/6'}`}
            >
              <div>
                <p className="text-sm font-semibold text-white">{OPTIONS[option].icon} {card.title}</p>
                <p className="mt-1 text-xs text-white/65">{card.description}</p>
              </div>
              <span className={`inline-flex h-5 w-10 shrink-0 items-center overflow-hidden rounded-full p-0.5 ${enabled ? 'bg-violet-300/70' : 'bg-white/20'}`}>
                <span className={`block h-4 w-4 shrink-0 rounded-full bg-white transition-transform ${enabled ? 'translate-x-[1.125rem]' : ''}`} />
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-white/65">{copy.flex}</p>
      <NavButtons language={language} onBack={onBack} onConfirm={onConfirm} backLabel={copy.back} confirmLabel={copy.continue} />
    </section>
  );
}

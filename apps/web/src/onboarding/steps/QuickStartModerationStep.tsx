import { motion } from 'framer-motion';
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

const OPTIONS: Array<{ id: ModerationOption; icon: string; es: string; en: string }> = [
  { id: 'sugar', icon: '🍬', es: 'Azúcar', en: 'Sugar' },
  { id: 'tobacco', icon: '🚭', es: 'Tabaco', en: 'Tobacco' },
  { id: 'alcohol', icon: '🍷', es: 'Alcohol', en: 'Alcohol' },
];

export function QuickStartModerationStep({ language = 'es', selectedModerations, onToggle, onBack, onConfirm }: QuickStartModerationStepProps) {
  const copy = language === 'en'
    ? {
        title: 'Moderation',
        subtitle: 'Choose what you want to track with more awareness.',
        continue: 'Continue',
        back: 'Back',
      }
    : {
        title: 'Moderación',
        subtitle: 'Elegí qué querés observar con más consciencia.',
        continue: 'Continuar',
        back: 'Volver',
      };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="onboarding-surface-base mx-auto w-full max-w-3xl rounded-3xl p-5 sm:p-7"
    >
      <h2 className="text-2xl font-semibold text-white sm:text-3xl">{copy.title}</h2>
      <p className="mt-2 text-sm text-white/70">{copy.subtitle}</p>

      <div className="mt-5 space-y-3">
        {OPTIONS.map((option) => {
          const enabled = selectedModerations.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${enabled ? 'border-violet-200/45 bg-violet-400/18' : 'border-white/20 bg-white/6'}`}
            >
              <span className="text-sm font-semibold text-white">{option.icon} {language === 'en' ? option.en : option.es}</span>
              <span className={`h-5 w-10 rounded-full p-0.5 ${enabled ? 'bg-violet-300/70' : 'bg-white/20'}`}>
                <span className={`block h-4 w-4 rounded-full bg-white transition ${enabled ? 'translate-x-5' : ''}`} />
              </span>
            </button>
          );
        })}
      </div>

      <NavButtons language={language} onBack={onBack} onConfirm={onConfirm} backLabel={copy.back} confirmLabel={copy.continue} />
    </motion.section>
  );
}

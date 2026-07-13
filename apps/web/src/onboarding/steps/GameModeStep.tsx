import { motion } from 'framer-motion';
import type { GameMode } from '../state';
import type { OnboardingLanguage } from '../constants';
import { GAME_MODE_META } from '../../lib/gameModeMeta';

interface GameModeStepProps {
  language?: OnboardingLanguage;
  selected: GameMode | null;
  onSelect: (mode: GameMode) => void;
  onBack?: () => void;
  variant?: 'default' | 'onboarding2';
}

export const MODE_CARD_CONTENT = {
  FLOW: GAME_MODE_META.Flow,
  LOW: GAME_MODE_META.Low,
  CHILL: GAME_MODE_META.Chill,
  EVOLVE: GAME_MODE_META.Evolve,
};

const MODE_ORDER: GameMode[] = ['LOW', 'CHILL', 'FLOW', 'EVOLVE'];

function RhythmSegments({ intensity }: { intensity: number }) {
  return <span className="onboarding-rhythm-segments" aria-hidden>{[1, 2, 3, 4].map((segment) => <i key={segment} data-active={segment <= intensity} />)}</span>;
}

export function GameModeStep({ language = 'es', selected, onSelect, onBack, variant = 'default' }: GameModeStepProps) {
  const copy = language === 'en'
    ? {
        step: 'Step 1',
        title: 'Start possible, not perfect.',
        subtitle: 'Choose your rhythm.',
        back: 'Back',
        selectedSuffix: ' selected',
      }
    : {
        step: 'Paso 1',
        title: 'Empezá posible, no perfecto.',
        subtitle: 'Elegí tu ritmo.',
        back: 'Volver',
        selectedSuffix: ' seleccionado',
      };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className={`onboarding-flow-panel ${variant === 'onboarding2' ? 'onboarding-rhythm-selector' : ''} mx-auto max-w-4xl p-4 sm:p-6`}>
        <header className="onboarding-rhythm-selector__header">
          <p>{copy.step}</p>
          <h2>{copy.title}</h2>
          <span>{copy.subtitle}</span>
        </header>
        <div className="mt-7 space-y-3 md:space-y-4" role="group" aria-label={copy.title}>
          {MODE_ORDER.map((mode) => {
            const content = MODE_CARD_CONTENT[mode];
            const isActive = selected === mode;
            const intensity = MODE_ORDER.indexOf(mode) + 1;

            return (
              <motion.button
                key={mode}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(mode)}
                aria-pressed={isActive}
                aria-label={`${content.title} · ${content.frequency[language]}${isActive ? copy.selectedSuffix : ''}`}
                data-selected={isActive ? 'true' : 'false'}
                className={[
                  'onboarding-rhythm-card',
                  variant === 'onboarding2' ? 'onboarding-rhythm-card--segments' : 'relative grid min-h-[4.75rem] w-full grid-cols-[4.25rem_minmax(0,1fr)_4.9rem] items-center gap-2 overflow-hidden rounded-[1.45rem] border px-3 py-2 text-left transition-all duration-300 ease-out sm:grid-cols-[5.5rem_minmax(0,1fr)_6.6rem] sm:gap-4 sm:px-5',
                  isActive && variant === 'onboarding2' ? 'onboarding-rhythm-card--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="onboarding-rhythm-card__copy"><h3>
                  {content.title.replace(' MOOD', '').replace(' Mood', '')}
                </h3><small>{variant === 'onboarding2' ? content.state[language] : content.frequency[language]}</small></span>
                {variant === 'onboarding2' ? <><span className="onboarding-rhythm-card__days"><strong>{intensity}</strong><small>{language === 'en' ? 'days/week' : 'días/semana'}</small></span><RhythmSegments intensity={intensity} /></> : null}
              </motion.button>
            );
          })}
        </div>

        {onBack ? (
          <div className="mt-8 flex justify-start">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cf8bf3]/60"
            >
              ← {copy.back}
            </button>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { OnboardingLanguage } from '../constants';
import { EditorGuideWheel } from '../../pages/labs/editor-guide/EditorGuideWheel';
import type { EditorGuideStepId } from '../../pages/labs/editor-guide/guideConfig';

interface OnboardingStructureStepProps {
  language?: OnboardingLanguage;
  onBack: () => void;
  onContinue: () => void;
}

const LOOP_SEGMENTS: Array<{ stepId: EditorGuideStepId; bulletIndex: number; durationMs: number }> = [
  { stepId: 'wheel-core', bulletIndex: 0, durationMs: 1200 },
  { stepId: 'wheel-pillars', bulletIndex: 1, durationMs: 1400 },
  { stepId: 'wheel-traits', bulletIndex: 2, durationMs: 1800 },
  { stepId: 'wheel-traits', bulletIndex: 2, durationMs: 800 },
];

export function OnboardingStructureStep({
  language = 'es',
  onBack,
  onContinue,
}: OnboardingStructureStepProps) {
  const [segmentIndex, setSegmentIndex] = useState(0);
  const segment = LOOP_SEGMENTS[segmentIndex];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSegmentIndex((current) => (current + 1) % LOOP_SEGMENTS.length);
    }, segment.durationMs);

    return () => window.clearTimeout(timeoutId);
  }, [segment.durationMs]);

  const copy = language === 'en'
    ? {
        eyebrow: 'Your system',
        title: 'How Innerbloom is organized',
        subtitle: 'First understand the structure. Then choose your initial base.',
        bullets: [
          'Innerbloom organizes your progress',
          'Three pillars: Body, Mind and Soul',
          'Each pillar has traits to place your tasks with more clarity',
        ],
        back: 'Back',
        continue: 'Continue',
      }
    : {
        eyebrow: 'Tu sistema',
        title: 'Así se organiza Innerbloom',
        subtitle: 'Primero entendés la estructura. Después elegís tu base inicial.',
        bullets: [
          'Innerbloom organiza tu progreso',
          'Tres pilares: Cuerpo, Mente y Alma',
          'Cada pilar tiene rasgos para ubicar mejor tus tareas',
        ],
        back: 'Volver',
        continue: 'Continuar',
      };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="onboarding-structure-card onboarding-flow-panel mx-auto flex w-full max-w-5xl flex-col gap-7 p-4 sm:p-6"
    >
      <div className="onboarding-structure-visual mx-auto flex w-full justify-center">
        <EditorGuideWheel stepId={segment.stepId} locale={language} />
      </div>

      <div className="onboarding-structure-copy">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--ib-onboarding-text-muted)]">{copy.eyebrow}</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold text-[color:var(--ib-onboarding-text)] sm:text-4xl">{copy.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[color:var(--ib-onboarding-text-secondary)]">{copy.subtitle}</p>

        <div className="onboarding-structure-steps mt-7">
          {copy.bullets.map((bullet, index) => {
            const isVisible = index <= segment.bulletIndex;
            return (
              <div
                key={bullet}
                className={`onboarding-structure-step-row grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-3 py-3.5 text-sm transition duration-500 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-35'
                }`}
              >
                <span
                  className={`onboarding-structure-step-index inline-flex h-7 w-7 items-center justify-center rounded-full text-[0.65rem] font-semibold ${
                    isVisible ? 'onboarding-structure-step-index--active' : ''
                  }`}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span className="leading-relaxed text-[color:var(--ib-onboarding-text-secondary)]">{bullet}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cf8bf3]/60"
          >
            ← {copy.back}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="quickstart-primary-cta inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
          >
            {copy.continue}
          </button>
        </div>
      </div>
    </motion.section>
  );
}

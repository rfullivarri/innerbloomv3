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
      className="onboarding-surface-base glass-card mx-auto grid w-full max-w-5xl gap-6 rounded-3xl p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-center"
    >
      <div className="order-2 lg:order-1">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/50">{copy.eyebrow}</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold text-white sm:text-4xl">{copy.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">{copy.subtitle}</p>

        <ul className="mt-6 space-y-3">
          {copy.bullets.map((bullet, index) => {
            const isVisible = index <= segment.bulletIndex;
            return (
              <li
                key={bullet}
                className={`flex items-start gap-3 text-sm transition duration-500 ${
                  isVisible ? 'translate-y-0 opacity-100 text-white/86' : 'translate-y-1 opacity-35 text-white/55'
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full transition ${
                    isVisible ? 'bg-[#cf8bf3] shadow-[0_0_14px_rgba(207,139,243,0.8)]' : 'bg-white/20'
                  }`}
                  aria-hidden
                />
                <span>{bullet}</span>
              </li>
            );
          })}
        </ul>

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

      <div className="order-1 flex justify-center lg:order-2">
        <EditorGuideWheel stepId={segment.stepId} locale={language} />
      </div>
    </motion.section>
  );
}

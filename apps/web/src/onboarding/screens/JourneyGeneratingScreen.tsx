import { useEffect, useMemo, useState } from 'react';
import { getJourneyGenerationStatus } from '../../lib/api';

interface JourneyGeneratingScreenProps {
  gameMode: string;
  language: 'es' | 'en';
  onGoToDashboard: () => void;
  onOpenGuidedDemo: () => void;
}

const BULLET_REVEAL_MS = 1300;

export function JourneyGeneratingScreen({ gameMode, language, onGoToDashboard, onOpenGuidedDemo }: JourneyGeneratingScreenProps) {
  const copy = language === 'en'
    ? {
        title: 'We are calibrating your personal formula',
        subtitle: 'Blending your habits, energy, and goals to design your ideal Journey.',
        bullets: [
          'Analyzing your habits and priorities',
          'Adjusting sustainable rhythms',
          'Designing micro-habits aligned with your energy',
          'Balancing Body, Mind & Soul',
        ],
        modeLabel: 'Activating your rhythm',
        planLabel: 'Activating your plan',
        minutesHint: 'This can take a few minutes.',
        bridgeHint: 'You can explore the guided demo while we finish preparing your tasks.',
        cta: 'View guided demo',
        includedMonths: '2 months included',
      }
    : {
        title: 'Estamos calibrando tu fórmula personal',
        subtitle: 'Mezclando tus hábitos, energía y objetivos para diseñar tu Journey ideal.',
        bullets: [
          'Analizando tus hábitos y prioridades',
          'Ajustando frecuencias sostenibles',
          'Diseñando micro-hábitos alineados a tu energía',
          'Equilibrando Cuerpo, Mente y Alma',
        ],
        modeLabel: 'Activando tu ritmo',
        planLabel: 'Activando tu plan',
        minutesHint: 'Esto puede tardar unos minutos.',
        bridgeHint: 'Puedes explorar la demo guiada mientras terminamos de preparar tus tareas.',
        cta: 'Ver demo guiada',
        includedMonths: '2 meses incluidos',
      };

  const bullets = useMemo(() => [...copy.bullets, `${copy.modeLabel}: ${gameMode}`], [gameMode, language]);
  const [visibleBullets, setVisibleBullets] = useState(1);
  const isSequenceComplete = visibleBullets >= bullets.length + 1;

  useEffect(() => {
    let isMounted = true;

    const syncGenerationState = async () => {
      try {
        const response = await getJourneyGenerationStatus();
        if (!isMounted) {
          return;
        }

        if (response.state?.status === 'completed') {
          onGoToDashboard();
        }
      } catch (error) {
        console.warn('Failed to sync journey generation state on onboarding screen', error);
      }
    };

    void syncGenerationState();
    const timer = window.setInterval(() => {
      void syncGenerationState();
    }, 4000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [onGoToDashboard]);

  useEffect(() => {
    setVisibleBullets(1);
    const timer = window.setInterval(() => {
      setVisibleBullets((current) => {
        if (current >= bullets.length + 1) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, BULLET_REVEAL_MS);

    return () => window.clearInterval(timer);
  }, [bullets.length]);

  return (
    <div className="onboarding-premium-root relative flex min-h-screen min-h-dvh items-center justify-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <svg viewBox="0 0 1200 720" className="h-full w-full" role="presentation" aria-hidden>
          <defs>
            <linearGradient id="journey-line" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(56,189,248,0.2)" />
              <stop offset="45%" stopColor="rgba(129,140,248,0.75)" />
              <stop offset="100%" stopColor="rgba(244,114,182,0.25)" />
            </linearGradient>
          </defs>
          <path
            className="journey-generating-screen__line"
            d="M-100,400 C100,250 220,520 420,370 C580,250 760,470 950,330 C1040,260 1160,350 1320,280"
            fill="none"
            stroke="url(#journey-line)"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-black/55 backdrop-blur-sm" aria-hidden />

      <section className="onboarding-premium-card relative z-10 w-full max-w-3xl rounded-3xl p-6 sm:p-10">
        <div className="mb-6 flex items-center justify-center gap-2 text-center text-xs font-semibold uppercase tracking-[0.42em] text-white/65 sm:text-sm">
          <span>Innerbloom</span>
          <img src="/IB-COLOR-LOGO.png" alt="Innerbloom logo" className="h-[1.9em] w-auto" />
        </div>

        <h1 className="text-balance text-3xl font-semibold text-white sm:text-4xl">{copy.title}</h1>
        <p className="mt-3 text-sm text-slate-300 sm:text-base">
          {copy.subtitle}
        </p>

        <ul className="mt-8 space-y-3">
          {bullets.map((bullet, index) => {
            const isVisible = index < visibleBullets;

            return (
              <li
                key={bullet}
                className={`flex items-start gap-3 text-sm text-slate-100/90 transition-all duration-500 sm:text-base ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                }`}
              >
                <span className="mt-2 h-2.5 w-2.5 rounded-full bg-sky-300" aria-hidden />
                <span>{bullet}</span>
              </li>
            );
          })}

          <li
            className={`flex items-start gap-3 text-sm text-white transition-all duration-500 sm:text-base ${
              isSequenceComplete ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            } drop-shadow-[0_0_10px_rgba(165,180,252,0.5)]`}
          >
            <span className="mt-2 h-2.5 w-2.5 rounded-full bg-sky-300" aria-hidden />
            <span>
              {copy.planLabel}{' '}
              <span className="inline-flex rounded-full border border-emerald-300/35 bg-emerald-400/20 px-2 py-0.5 text-xs font-semibold text-emerald-100 align-middle">
                FREE
              </span>{' '}
              – {copy.includedMonths}
            </span>
          </li>
        </ul>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden>
          <div
            className={`h-full rounded-full bg-gradient-to-r from-violet-300/70 via-indigo-300/80 to-violet-300/70 transition-all duration-700 ${
              isSequenceComplete
                ? 'w-full journey-generating-screen__progress-complete'
                : 'w-1/3 journey-generating-screen__progress-animated'
            }`}
          />
        </div>

        <p className="mt-8 text-sm text-slate-300 sm:text-base">
          {copy.minutesHint}
          <br />
          {copy.bridgeHint}
        </p>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-violet-300/45 bg-violet-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(76,29,149,0.3)] transition duration-200 hover:-translate-y-0.5 hover:bg-violet-400 hover:shadow-[0_14px_28px_rgba(76,29,149,0.4)]"
            onClick={onOpenGuidedDemo}
          >
            {copy.cta}
          </button>
        </div>
      </section>

      <style>{`
        .journey-generating-screen__line {
          stroke-dasharray: 14 22;
          animation: journey-line-draw 2.8s linear infinite;
          filter: drop-shadow(0 0 14px rgba(129, 140, 248, 0.6));
        }

        .journey-generating-screen__progress-animated {
          animation: journey-progress 2.4s ease-in-out infinite;
          transform-origin: left;
        }

        .journey-generating-screen__progress-complete {
          transform: translateX(0);
        }

        @keyframes journey-line-draw {
          to {
            stroke-dashoffset: -72;
          }
        }

        @keyframes journey-progress {
          0% {
            transform: translateX(-115%);
          }

          100% {
            transform: translateX(325%);
          }
        }
      `}</style>
    </div>
  );
}

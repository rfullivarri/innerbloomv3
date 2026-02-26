import { useEffect, useMemo, useState } from 'react';

interface JourneyGeneratingScreenProps {
  gameMode: string;
  onGoToDashboard: () => void;
}

const BULLET_REVEAL_MS = 1300;

export function JourneyGeneratingScreen({ gameMode, onGoToDashboard }: JourneyGeneratingScreenProps) {
  const bullets = useMemo(
    () => [
      'Analizando tus hábitos y prioridades',
      'Ajustando frecuencias sostenibles',
      'Diseñando micro-hábitos alineados a tu energía',
      'Equilibrando Cuerpo, Mente y Alma',
      `Activando tu Game Mode: ${gameMode}`,
      'Activando tu plan Free — 2 meses incluidos',
    ],
    [gameMode],
  );
  const [visibleBullets, setVisibleBullets] = useState(1);

  useEffect(() => {
    setVisibleBullets(1);
    const timer = window.setInterval(() => {
      setVisibleBullets((current) => {
        if (current >= bullets.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, BULLET_REVEAL_MS);

    return () => window.clearInterval(timer);
  }, [bullets.length]);

  return (
    <div className="relative flex min-h-screen min-h-dvh items-center justify-center overflow-hidden bg-[#000c40] px-6 py-10 text-white">
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

      <section className="relative z-10 w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0a133d]/85 p-6 shadow-[0_0_45px_rgba(79,70,229,0.22)] backdrop-blur-xl sm:p-10">
        <h1 className="text-balance text-3xl font-semibold text-white sm:text-4xl">
          Estamos creando tu Journey personalizado
        </h1>

        <ul className="mt-8 space-y-3">
          {bullets.map((bullet, index) => {
            const isVisible = index < visibleBullets;
            const isLast = index === bullets.length - 1;

            return (
              <li
                key={bullet}
                className={`flex items-start gap-3 text-sm text-slate-100/90 transition-all duration-500 sm:text-base ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                } ${isLast ? 'text-white drop-shadow-[0_0_10px_rgba(165,180,252,0.5)]' : ''}`}
              >
                <span className="mt-2 h-2.5 w-2.5 rounded-full bg-sky-300" aria-hidden />
                <span>{bullet}</span>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 text-sm text-slate-300 sm:text-base">
          Esto puede tardar unos minutos.
          <br />
          Puedes entrar al dashboard mientras finalizamos tu plan.
        </p>

        <button
          type="button"
          className="mt-8 inline-flex items-center justify-center rounded-full border border-indigo-200/50 bg-indigo-200/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-indigo-100/80 hover:bg-indigo-200/25"
          onClick={onGoToDashboard}
        >
          Ir a mi Dashboard
        </button>
      </section>

      <style>{`
        .journey-generating-screen__line {
          stroke-dasharray: 14 22;
          animation: journey-line-draw 2.8s linear infinite;
          filter: drop-shadow(0 0 14px rgba(129, 140, 248, 0.6));
        }

        @keyframes journey-line-draw {
          to {
            stroke-dashoffset: -72;
          }
        }
      `}</style>
    </div>
  );
}

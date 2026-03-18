import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePostLoginLanguage } from '../i18n/postLoginLanguage';
import { buildDemoUrl } from '../lib/demoEntry';
import {
  getLabsGameModeLabel,
  LABS_DEMO_MODE_SELECT_COPY,
  LABS_GAME_MODE_ORDER,
  LABS_GAME_MODES,
} from '../config/labsGameModes';

export default function LabsDemoModeSelectPage() {
  const { language } = usePostLoginLanguage();
  const copy = LABS_DEMO_MODE_SELECT_COPY[language];
  const cards = useMemo(
    () => LABS_GAME_MODE_ORDER.map((modeId) => ({
      ...LABS_GAME_MODES[modeId],
      label: getLabsGameModeLabel(modeId, language),
      href: buildDemoUrl({ language, source: 'labs', mode: modeId }),
    })),
    [language],
  );

  return (
    <main className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8 sm:px-6">
        <div className="rounded-[2rem] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-elevated)]/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.16)] backdrop-blur">
          <div className="space-y-3 text-center">
            <span className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-text-muted)]">
              {copy.badge}
            </span>
            <h1 className="text-balance text-2xl font-semibold leading-tight sm:text-[2rem]">{copy.title}</h1>
            <p className="text-sm leading-6 text-[color:var(--color-text-muted)] sm:text-[0.95rem]">{copy.subtitle}</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {cards.map((card) => (
              <Link
                key={card.id}
                to={card.href}
                className="group flex min-w-0 flex-col overflow-hidden rounded-[1.35rem] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:border-[color:var(--color-border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-text)]"
              >
                <div className="aspect-[1.08/1] overflow-hidden bg-[color:var(--color-overlay-1)]">
                  <img
                    src={card.image}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="flex items-center justify-center px-2 py-3 text-center">
                  <span className="line-clamp-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text)] sm:text-xs">
                    {card.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

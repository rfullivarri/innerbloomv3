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
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/14 bg-[linear-gradient(145deg,rgba(255,255,255,0.12),rgba(167,123,245,0.11)_45%,rgba(72,43,126,0.08))] px-5 py-6 shadow-[0_26px_68px_rgba(26,12,52,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-[18px] sm:px-6 sm:py-7">
          <div className="pointer-events-none absolute inset-x-4 -top-6 h-28 rounded-full bg-[radial-gradient(circle,rgba(176,122,255,0.28),rgba(176,122,255,0.08)_55%,transparent_76%)] blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 left-1/2 h-36 w-[85%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(140,102,255,0.18),rgba(140,102,255,0.04)_58%,transparent_74%)] blur-3xl" />
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_14%_20%,rgba(255,255,255,0.1),transparent_55%),radial-gradient(circle_at_84%_80%,rgba(186,161,255,0.08),transparent_52%)]" />

          <div className="relative space-y-4 text-center sm:space-y-5">
            <span className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/8 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md">
              {copy.badge}
            </span>
            <div className="space-y-3">
              <h1 className="mx-auto max-w-[12ch] text-balance text-[2rem] font-semibold leading-[1.04] tracking-[-0.03em] text-white sm:max-w-[13ch] sm:text-[2.2rem]">
                {copy.title}
              </h1>
              <p className="mx-auto max-w-[32ch] text-sm leading-6 text-white/78 sm:text-[0.96rem] sm:leading-7">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-3.5 sm:mt-7 sm:gap-4">
            {cards.map((card) => (
              <Link
                key={card.id}
                to={card.href}
                className="group relative flex min-w-0 flex-col overflow-hidden rounded-[1.55rem] border border-white/14 bg-white/[0.045] shadow-[0_18px_38px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/[0.065] hover:shadow-[0_22px_44px_rgba(26,12,52,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              >
                <div className="absolute inset-x-3 top-0 h-10 rounded-b-[1.2rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_72%)] opacity-80 transition duration-200 group-hover:opacity-100" />
                <div className="aspect-[1.08/1] overflow-hidden bg-white/[0.04]">
                  <img
                    src={card.image}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="relative border-t border-white/10 bg-[linear-gradient(180deg,rgba(19,14,43,0.1),rgba(19,14,43,0.22))] px-2.5 py-3.5 text-center">
                  <span className="line-clamp-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/92 sm:text-xs">
                    {card.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { OFFICIAL_DESIGN_TOKENS } from '../content/officialDesignTokens';
import { usePostLoginLanguage } from '../i18n/postLoginLanguage';
import { buildDemoModeSelectUrl, buildDemoUrl, type DemoEntrySource } from '../lib/demoEntry';
import { resolveAuthLanguage } from '../lib/authLanguage';
import { BrandWordmark } from '../components/layout/BrandWordmark';
import { usePageMeta } from '../lib/seo';
import {
  getLabsGameModeLabel,
  LABS_DEMO_MODE_SELECT_COPY,
  LABS_GAME_MODE_ORDER,
  LABS_GAME_MODES,
} from '../config/labsGameModes';

const DEMO_MODE_SELECT_OG_IMAGE = 'https://innerbloomjourney.org/og/neneOGP.png';

type DemoModeSelectPageProps = {
  legacyLabsPath?: boolean;
};

export default function LabsDemoModeSelectPage({ legacyLabsPath = false }: DemoModeSelectPageProps) {
  const { language, syncLocaleLanguage } = usePostLoginLanguage();
  const location = useLocation();
  const sourceParam = new URLSearchParams(location.search).get('source');
  const source: DemoEntrySource = sourceParam === 'selector' || sourceParam === 'labs' ? sourceParam : 'landing';
  const copy = LABS_DEMO_MODE_SELECT_COPY[language];
  const purpleAfternoon = OFFICIAL_DESIGN_TOKENS.gradients.find((gradient) => gradient.name === 'purple_afternoon');
  const landingBackground = purpleAfternoon
    ? {
        backgroundImage: `linear-gradient(${purpleAfternoon.angle}, ${purpleAfternoon.stops[0]}, ${purpleAfternoon.stops[1]})`,
      }
    : undefined;

  useEffect(() => {
    syncLocaleLanguage(resolveAuthLanguage(location.search));
  }, [location.search, syncLocaleLanguage]);

  usePageMeta({
    title: language === 'es' ? 'Innerbloom Demo · Elige tu Game Mode' : 'Innerbloom Demo · Choose your game mode',
    description:
      language === 'es'
        ? 'Explora la demo oficial de Innerbloom. Elige LOW, CHILL, FLOW o EVOLVE y entra a la experiencia guiada en tu idioma.'
        : 'Explore the official Innerbloom demo. Choose LOW, CHILL, FLOW, or EVOLVE and enter the guided experience in your language.',
    image: DEMO_MODE_SELECT_OG_IMAGE,
    imageAlt: language === 'es' ? 'Preview oficial de la demo de Innerbloom' : 'Official Innerbloom demo preview',
    ogImageSecureUrl: DEMO_MODE_SELECT_OG_IMAGE,
    ogImageType: 'image/png',
    ogImageWidth: '1200',
    ogImageHeight: '630',
    twitterImage: DEMO_MODE_SELECT_OG_IMAGE,
    twitterImageAlt: language === 'es' ? 'Preview oficial de la demo de Innerbloom' : 'Official Innerbloom demo preview',
    url: buildDemoModeSelectUrl({ language, source, legacyLabsPath }),
  });

  const cards = useMemo(
    () => LABS_GAME_MODE_ORDER.map((modeId) => ({
      ...LABS_GAME_MODES[modeId],
      label: getLabsGameModeLabel(modeId, language),
      href: buildDemoUrl({ language, source: legacyLabsPath ? 'labs' : 'selector', mode: modeId }),
    })),
    [language, legacyLabsPath],
  );

  return (
    <main
      className="min-h-screen text-[color:var(--color-text)]"
      style={landingBackground}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-6 sm:px-6 sm:py-7 md:max-w-4xl md:px-8 md:py-9 lg:max-w-6xl lg:px-10 lg:py-10 xl:max-w-[84rem]">
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(140deg,rgba(255,255,255,0.085),rgba(167,123,245,0.075)_48%,rgba(72,43,126,0.05))] px-5 py-[1.375rem] shadow-[0_22px_56px_rgba(26,12,52,0.22),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-[20px] sm:px-6 sm:py-6 md:rounded-[2.35rem] md:px-8 md:py-8 md:shadow-[0_28px_80px_rgba(26,12,52,0.28),inset_0_1px_0_rgba(255,255,255,0.2)] lg:px-10 lg:py-9 xl:px-12 xl:py-10">
          <div className="pointer-events-none absolute inset-x-2 -top-3 h-24 rounded-full bg-[radial-gradient(circle_at_50%_52%,rgba(176,122,255,0.3),rgba(176,122,255,0.08)_54%,transparent_74%)] blur-[18px] md:h-28 md:blur-[22px]" />
          <div className="pointer-events-none absolute inset-y-8 left-1/2 w-[90%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(168,115,255,0.2),rgba(168,115,255,0.06)_44%,transparent_72%)] blur-3xl md:inset-y-10 md:w-[96%] lg:w-[92%]" />
          <div className="pointer-events-none absolute -bottom-10 right-0 h-40 w-[56%] rounded-full bg-[radial-gradient(circle_at_center,rgba(126,95,255,0.16),transparent_64%)] blur-3xl md:h-52 md:w-[46%]" />
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_14%_20%,rgba(255,255,255,0.12),transparent_58%),radial-gradient(circle_at_84%_80%,rgba(186,161,255,0.08),transparent_56%),linear-gradient(140deg,rgba(167,123,245,0.08),rgba(72,43,126,0.05))]" />

          <div className="relative space-y-4 text-center sm:space-y-5 md:space-y-6">
            <BrandWordmark
              className="text-white/84"
              textClassName="text-[0.72rem] font-semibold tracking-[0.34em] text-white/72 sm:text-xs md:text-[0.8rem] lg:text-[0.84rem]"
              iconClassName="h-[1.65em] sm:h-[1.75em]"
            />
            <div className="space-y-2.5 md:space-y-3.5">
              <h1 className="mx-auto max-w-[12ch] text-balance text-[1.95rem] font-semibold leading-[1.04] tracking-[-0.03em] text-white sm:max-w-[13ch] sm:text-[2.15rem] md:max-w-[15ch] md:text-[2.55rem] md:leading-[1.02] lg:max-w-[18ch] lg:text-[2.95rem] xl:text-[3.05rem]">
                {copy.title}
              </h1>
              <p className="mx-auto max-w-[32ch] text-sm leading-6 text-white/78 sm:text-[0.95rem] sm:leading-[1.625rem] md:max-w-[40ch] md:text-[1rem] md:leading-7 lg:max-w-[52ch] lg:text-[1.04rem]">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3.5 md:mt-8 md:gap-4 lg:mt-9 lg:grid-cols-4 lg:gap-4 xl:gap-5">
            {cards.map((card) => (
              <Link
                key={card.id}
                to={card.href}
                className="group relative flex min-w-0 flex-col overflow-hidden rounded-[1.45rem] border border-white/10 bg-white/[0.04] shadow-[0_14px_30px_rgba(26,12,52,0.14),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.055] hover:shadow-[0_18px_36px_rgba(26,12,52,0.18),inset_0_1px_0_rgba(255,255,255,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 md:rounded-[1.7rem] md:shadow-[0_20px_42px_rgba(26,12,52,0.18),inset_0_1px_0_rgba(255,255,255,0.1)]"
              >
                <div className="absolute inset-x-4 top-0 h-9 rounded-b-[1.2rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_72%)] opacity-75 transition duration-200 group-hover:opacity-95" />
                <div className="aspect-[0.9/1] overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] md:aspect-[0.98/1] lg:aspect-[0.82/1] xl:aspect-[0.86/1]">
                  <img
                    src={card.image}
                    alt=""
                    className="h-full w-full object-cover object-top transition duration-300 ease-out group-hover:scale-[1.025]"
                    loading="lazy"
                  />
                </div>
                <div className="relative border-t border-white/8 bg-[linear-gradient(180deg,rgba(19,14,43,0.08),rgba(19,14,43,0.18))] px-2.5 py-2.5 text-center md:px-3.5 md:py-3 lg:px-3 lg:py-3.5">
                  <span className="line-clamp-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/92 sm:text-xs md:text-[0.8rem] md:tracking-[0.24em]">
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

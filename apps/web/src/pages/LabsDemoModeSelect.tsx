import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { OFFICIAL_DESIGN_TOKENS } from '../content/officialDesignTokens';
import { usePostLoginLanguage } from '../i18n/postLoginLanguage';
import { buildDemoModeSelectUrl, buildDemoUrl, type DemoEntrySource } from '../lib/demoEntry';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
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
  const navigate = useNavigate();
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

  const handleClose = () => {
    navigate(buildLocalizedAuthPath('/', language));
  };

  return (
    <main
      className="min-h-screen text-[color:var(--color-text)] md:h-svh md:min-h-svh"
      style={landingBackground}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-4 sm:px-6 sm:py-5 md:h-svh md:min-h-svh md:max-w-5xl md:px-8 md:py-6 lg:max-w-6xl lg:px-10 lg:py-7 xl:max-w-[84rem] xl:px-12">
        <section className="relative isolate flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(140deg,rgba(255,255,255,0.085),rgba(167,123,245,0.075)_48%,rgba(72,43,126,0.05))] px-5 py-4 shadow-[0_22px_56px_rgba(26,12,52,0.22),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-[20px] sm:px-6 sm:py-5 md:rounded-[2.35rem] md:px-7 md:py-5 md:shadow-[0_28px_80px_rgba(26,12,52,0.28),inset_0_1px_0_rgba(255,255,255,0.2)] lg:px-8 lg:py-6 xl:px-10 xl:py-6">
          <div className="pointer-events-none absolute inset-x-2 -top-3 h-24 rounded-full bg-[radial-gradient(circle_at_50%_52%,rgba(176,122,255,0.3),rgba(176,122,255,0.08)_54%,transparent_74%)] blur-[18px] md:h-28 md:blur-[22px]" />
          <div className="pointer-events-none absolute inset-y-8 left-1/2 w-[90%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(168,115,255,0.2),rgba(168,115,255,0.06)_44%,transparent_72%)] blur-3xl md:inset-y-10 md:w-[96%] lg:w-[92%]" />
          <div className="pointer-events-none absolute -bottom-10 right-0 h-40 w-[56%] rounded-full bg-[radial-gradient(circle_at_center,rgba(126,95,255,0.16),transparent_64%)] blur-3xl md:h-52 md:w-[46%]" />
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_14%_20%,rgba(255,255,255,0.12),transparent_58%),radial-gradient(circle_at_84%_80%,rgba(186,161,255,0.08),transparent_56%),linear-gradient(140deg,rgba(167,123,245,0.08),rgba(72,43,126,0.05))]" />

          <button
            type="button"
            onClick={handleClose}
            aria-label={language === 'es' ? 'Cerrar selector y volver al inicio' : 'Close selector and return home'}
            className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-xl leading-none text-white/82 shadow-[0_12px_28px_rgba(26,12,52,0.2),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition duration-200 ease-out hover:border-white/18 hover:bg-white/[0.1] hover:text-white active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 md:right-5 md:top-5"
          >
            <span aria-hidden="true">×</span>
          </button>

          <div className="relative flex flex-col gap-4 text-center sm:gap-[1.125rem] md:gap-5">
            <BrandWordmark
              className="text-white/84"
              textClassName="text-[0.72rem] font-semibold tracking-[0.34em] text-white/72 sm:text-xs md:text-[0.8rem] lg:text-[0.84rem]"
              iconClassName="h-[1.65em] sm:h-[1.75em]"
            />
            <div className="mx-auto flex w-full max-w-[22rem] flex-col gap-2 sm:max-w-[28rem] md:max-w-[42rem] md:gap-2.5 lg:max-w-[58rem]">
              <h1 className="mx-auto max-w-[14ch] text-balance text-[1.8rem] font-semibold leading-[0.98] tracking-[-0.03em] text-white sm:max-w-[15ch] sm:text-[2rem] md:max-w-[20ch] md:text-[2.35rem] lg:max-w-[24ch] lg:text-[2.7rem] xl:max-w-[26ch] xl:text-[2.85rem]">
                {copy.title}
              </h1>
              <p className="mx-auto max-w-[34ch] text-sm leading-[1.45] text-white/78 sm:max-w-[36ch] sm:text-[0.94rem] md:max-w-[46ch] md:text-[0.98rem] md:leading-[1.55] lg:max-w-[56ch]">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-2 items-start gap-2.5 self-center sm:mt-5 sm:gap-3 md:mt-5 md:gap-3.5 lg:mt-6 lg:grid-cols-4 lg:gap-3.5 xl:gap-4">
            {cards.map((card) => (
              <Link
                key={card.id}
                to={card.href}
                className="group relative flex min-w-0 flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.04] shadow-[0_14px_30px_rgba(26,12,52,0.14),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.055] hover:shadow-[0_18px_36px_rgba(26,12,52,0.18),inset_0_1px_0_rgba(255,255,255,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 md:rounded-[1.55rem] md:shadow-[0_20px_42px_rgba(26,12,52,0.18),inset_0_1px_0_rgba(255,255,255,0.1)]"
              >
                <div className="absolute inset-x-4 top-0 h-9 rounded-b-[1.2rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_72%)] opacity-75 transition duration-200 group-hover:opacity-95" />
                <div className="aspect-[0.94/1] overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] md:aspect-[1.02/1] lg:aspect-[0.78/1] xl:aspect-[0.8/1]">
                  <img
                    src={card.image}
                    alt=""
                    className="h-full w-full object-cover object-top transition duration-300 ease-out group-hover:scale-[1.025]"
                    loading="lazy"
                  />
                </div>
                <div className="relative border-t border-white/8 bg-[linear-gradient(180deg,rgba(19,14,43,0.08),rgba(19,14,43,0.18))] px-2.5 py-2 text-center md:px-3 md:py-2.5 lg:px-2.5 lg:py-3">
                  <span className="line-clamp-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/92 sm:text-[11px] md:text-[0.76rem] md:tracking-[0.22em]">
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

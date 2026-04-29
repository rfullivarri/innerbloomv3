import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Target, WandSparkles } from 'lucide-react';
import { usePostLoginLanguage } from '../i18n/postLoginLanguage';
import { buildDemoUrl, getDemoModeSelectPath, type DemoEntrySource } from '../lib/demoEntry';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
import { getLandingThemeBackground, readLandingThemeMode } from '../lib/landingTheme';
import {
  DEMO_MODE_SELECT_OG_IMAGE_HEIGHT,
  DEMO_MODE_SELECT_OG_IMAGE_PATH,
  DEMO_MODE_SELECT_OG_IMAGE_TYPE,
  DEMO_MODE_SELECT_OG_IMAGE_WIDTH,
} from '../lib/demoModeSelectSeo';
import { BrandWordmark } from '../components/layout/BrandWordmark';
import { usePageMeta } from '../lib/seo';

type DemoModeSelectPageProps = {
  legacyLabsPath?: boolean;
};

export default function LabsDemoModeSelectPage({ legacyLabsPath = false }: DemoModeSelectPageProps) {
  const { language, syncLocaleLanguage } = usePostLoginLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const sourceParam = new URLSearchParams(location.search).get('source');
  const source: DemoEntrySource = sourceParam === 'selector' || sourceParam === 'labs' ? sourceParam : 'landing';
  const themeMode = readLandingThemeMode();
  const landingThemeBackground = getLandingThemeBackground(themeMode);

  useEffect(() => {
    syncLocaleLanguage(resolveAuthLanguage(location.search));
  }, [location.search, syncLocaleLanguage]);

  usePageMeta({
    title: language === 'es' ? 'Innerbloom Demo Hub · Explora el producto' : 'Innerbloom Demo Hub · Explore the product',
    description:
      language === 'es'
        ? 'Explora la demo pública de Innerbloom por secciones del producto: Dashboard, Logros y Tareas.'
        : 'Explore the public Innerbloom demo by product section: Dashboard, Achievements, and Tasks.',
    image: DEMO_MODE_SELECT_OG_IMAGE_PATH,
    imageAlt: language === 'es' ? 'Hub público de demos de Innerbloom' : 'Innerbloom public demo hub',
    ogImageSecureUrl: DEMO_MODE_SELECT_OG_IMAGE_PATH,
    ogImageType: DEMO_MODE_SELECT_OG_IMAGE_TYPE,
    ogImageWidth: DEMO_MODE_SELECT_OG_IMAGE_WIDTH,
    ogImageHeight: DEMO_MODE_SELECT_OG_IMAGE_HEIGHT,
    twitterImage: DEMO_MODE_SELECT_OG_IMAGE_PATH,
    twitterImageAlt: language === 'es' ? 'Hub público de demos de Innerbloom' : 'Innerbloom public demo hub',
    url: getDemoModeSelectPath(legacyLabsPath),
  });

  const cards = [
    {
      id: 'dashboard',
      title: language === 'es' ? 'Dashboard' : 'Dashboard',
      description:
        language === 'es'
          ? 'Panorama de progreso, foco y energía diaria.'
          : 'A clear view of progress, focus, and daily energy.',
      href: buildDemoUrl({ language, source: legacyLabsPath ? 'labs' : source }),
      Icon: Target,
    },
    {
      id: 'logros',
      title: language === 'es' ? 'Logros' : 'Achievements',
      description:
        language === 'es'
          ? 'Badges, sellos y recompensas desbloqueables.'
          : 'Badges, seals, and unlockable reward moments.',
      href: `${legacyLabsPath ? '/labs/logros' : '/demo/logros'}?${new URLSearchParams({
        lang: language,
        source: legacyLabsPath ? 'labs' : source,
        returnTo: 'demo-hub',
      }).toString()}`,
      Icon: Sparkles,
    },
    {
      id: 'tareas',
      title: language === 'es' ? 'Tareas' : 'Tasks',
      description:
        language === 'es' ? 'Editor público con datos mock y guía rápida.' : 'Public editor preview with mock data and quick guidance.',
      href: `${legacyLabsPath ? '/labs/tasks-demo' : '/demo/tasks'}?lang=${language}&source=${legacyLabsPath ? 'labs' : source}`,
      Icon: WandSparkles,
    },
  ];

  return (
    <main
      className={`relative min-h-screen text-[color:var(--color-text)] md:h-svh md:min-h-svh ${themeMode === 'light' ? 'text-[#171126]' : 'text-white'}`}
      style={{ background: landingThemeBackground.base }}
      data-theme-mode={themeMode}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ background: landingThemeBackground.gradient }}
      />
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-4 sm:px-6 sm:py-5 md:h-svh md:min-h-svh md:max-w-5xl md:px-8 md:py-6 lg:max-w-6xl lg:px-10 lg:py-7 xl:max-w-[84rem] xl:px-12">
        <section className={`relative isolate z-[1] flex flex-1 flex-col overflow-hidden rounded-[2rem] px-5 py-4 backdrop-blur-[20px] sm:px-6 sm:py-5 md:rounded-[2.35rem] md:px-7 md:py-5 lg:px-8 lg:py-6 xl:px-10 xl:py-6 ${
          themeMode === 'light'
            ? 'border border-[rgba(109,86,170,0.2)] bg-[linear-gradient(140deg,rgba(255,255,255,0.74),rgba(246,240,255,0.62)_48%,rgba(236,247,255,0.52))] shadow-[0_22px_56px_rgba(61,39,110,0.16),inset_0_1px_0_rgba(255,255,255,0.82)] md:shadow-[0_28px_80px_rgba(61,39,110,0.2),inset_0_1px_0_rgba(255,255,255,0.88)]'
            : 'border border-white/12 bg-[linear-gradient(140deg,rgba(255,255,255,0.085),rgba(167,123,245,0.075)_48%,rgba(72,43,126,0.05))] shadow-[0_22px_56px_rgba(26,12,52,0.22),inset_0_1px_0_rgba(255,255,255,0.18)] md:shadow-[0_28px_80px_rgba(26,12,52,0.28),inset_0_1px_0_rgba(255,255,255,0.2)]'
        }`}>
          <div className="pointer-events-none absolute inset-x-2 -top-3 h-24 rounded-full bg-[radial-gradient(circle_at_50%_52%,rgba(176,122,255,0.3),rgba(176,122,255,0.08)_54%,transparent_74%)] blur-[18px] md:h-28 md:blur-[22px]" />
          <button
            type="button"
            onClick={() => navigate(buildLocalizedAuthPath('/', language))}
            aria-label={language === 'es' ? 'Cerrar demo hub y volver al inicio' : 'Close demo hub and return home'}
            className={`absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border text-xl leading-none shadow-[0_12px_28px_rgba(26,12,52,0.2),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition duration-200 ease-out active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              themeMode === 'light'
                ? 'border-[rgba(78,61,130,0.22)] bg-white/68 text-[#221a38] hover:border-[rgba(78,61,130,0.3)] hover:bg-white/82 hover:text-[#171126] focus-visible:outline-[#4e3d82]'
                : 'border-white/12 bg-white/[0.06] text-white/82 hover:border-white/18 hover:bg-white/[0.1] hover:text-white focus-visible:outline-white/70'
            }`}
          >
            <span aria-hidden="true">×</span>
          </button>

          <div className="relative flex flex-col gap-4 text-center sm:gap-[1.125rem] md:gap-5">
            <BrandWordmark
              className={themeMode === 'light' ? 'text-[#241a3d]/80' : 'text-white/84'}
              textClassName={`text-[0.72rem] font-semibold tracking-[0.34em] sm:text-xs ${themeMode === 'light' ? 'text-[#3b305f]/70' : 'text-white/72'}`}
              iconClassName="h-[1.65em] sm:h-[1.75em]"
            />
            <div className="mx-auto flex w-full max-w-[56rem] flex-col gap-2 md:gap-2.5">
              <h1 className={`mx-auto max-w-[24ch] text-balance text-[1.8rem] font-semibold leading-[0.98] tracking-[-0.03em] sm:text-[2rem] md:text-[2.4rem] lg:text-[2.75rem] ${themeMode === 'light' ? 'text-[#120f1f]' : 'text-white'}`}>
                {language === 'es' ? 'Explora Innerbloom por sección de producto' : 'Explore Innerbloom by product section'}
              </h1>
              <p className={`mx-auto max-w-[58ch] text-sm leading-[1.5] sm:text-[0.96rem] md:text-[1.02rem] ${themeMode === 'light' ? 'text-[#3b305f]/80' : 'text-white/78'}`}>
                {language === 'es'
                  ? 'Abre una sección y entra directo a la experiencia.'
                  : 'Pick a section and jump straight into the experience.'}
              </p>
            </div>
          </div>

          <div className={`relative mt-5 flex flex-col overflow-hidden rounded-[1.4rem] border md:mt-8 md:grid md:min-h-[24rem] md:grid-cols-[1.14fr_0.86fr] md:grid-rows-2 md:rounded-[1.9rem] ${
            themeMode === 'light'
              ? 'border-[rgba(109,86,170,0.2)] bg-[linear-gradient(145deg,rgba(255,255,255,0.75),rgba(243,238,255,0.62)_60%,rgba(234,246,255,0.54))] shadow-[0_18px_36px_rgba(61,39,110,0.12),inset_0_1px_0_rgba(255,255,255,0.84)]'
              : 'border-white/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(132,98,204,0.04)_60%,rgba(48,28,86,0.03))] shadow-[0_18px_36px_rgba(26,12,52,0.16),inset_0_1px_0_rgba(255,255,255,0.1)]'
          }`}>
            <div className="pointer-events-none absolute inset-x-8 top-0 h-20 bg-[radial-gradient(circle_at_50%_0%,rgba(198,153,255,0.24),transparent_68%)] blur-xl md:inset-x-10 md:h-24" />
            {cards.map(({ id, title, description, href, Icon }, index) => (
              <Link
                key={id}
                to={href}
                className={`group relative z-[1] flex min-h-[4.75rem] items-center gap-3.5 px-4 py-3 transition duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/70 md:gap-5 md:px-6 md:py-6 ${
                  index === 0
                    ? 'md:row-span-2 md:min-h-full md:flex-col md:items-start md:justify-center md:px-8 md:py-8'
                    : 'md:min-h-0 md:py-5'
                } ${
                  index < cards.length - 1 ? 'border-b border-white/10 md:border-b-0' : ''
                } ${
                  index === 1
                    ? 'md:border-b md:border-l md:border-white/10'
                    : index === 2
                      ? 'md:border-l md:border-white/10'
                      : ''
                } ${themeMode === 'light' ? 'hover:bg-[#ffffff]/58 active:bg-[#ffffff]/72' : 'hover:bg-white/[0.06] active:bg-white/[0.08]'}`}
              >
                <div
                  className={`inline-flex shrink-0 items-center justify-center rounded-[1.2rem] border shadow-[0_14px_28px_rgba(28,14,56,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] transition duration-300 group-hover:scale-[1.02] ${
                    themeMode === 'light'
                      ? 'border-[rgba(109,86,170,0.24)] bg-white/72 text-[#251b40] group-hover:bg-white/90'
                      : 'border-white/20 bg-white/[0.09] text-white group-hover:bg-white/[0.14]'
                  } ${
                    index === 0 ? 'h-[4.15rem] w-[4.15rem] md:h-[6.4rem] md:w-[6.4rem] md:rounded-[1.7rem]' : 'h-[3.5rem] w-[3.5rem] md:h-[4.25rem] md:w-[4.25rem]'
                  }`}
                >
                  <Icon className={index === 0 ? 'h-9 w-9 md:h-14 md:w-14' : 'h-7 w-7 md:h-9 md:w-9'} strokeWidth={2} />
                </div>
                <div className={`min-w-0 flex-1 ${index === 0 ? 'md:mt-7 md:space-y-3' : 'space-y-1.5'}`}>
                  <h2
                    className={`text-balance font-semibold tracking-[-0.02em] ${themeMode === 'light' ? 'text-[#120f1f]' : 'text-white'} ${
                      index === 0 ? 'text-[1.2rem] md:text-[1.82rem] md:leading-[1.05]' : 'text-[1.03rem] md:text-[1.22rem]'
                    }`}
                  >
                    {title}
                  </h2>
                  <p className={`${themeMode === 'light' ? 'text-[#3b305f]/80' : 'text-white/76'} ${index === 0 ? 'text-[0.92rem] leading-[1.55] md:max-w-[28ch] md:text-[1rem]' : 'text-[0.8rem] leading-[1.45] md:text-[0.9rem]'}`}>
                    {description}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] transition md:text-[0.66rem] ${
                    themeMode === 'light' ? 'text-[#2f2552]/78 group-hover:text-[#171126]' : 'text-white/80 group-hover:text-white'
                  } ${
                    index === 0 ? 'md:mt-7' : ''
                  }`}
                >
                  {language === 'es' ? 'Entrar' : 'Enter'}
                  <span aria-hidden className="text-sm leading-none">
                    →
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

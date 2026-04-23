import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Target, WandSparkles } from 'lucide-react';
import { OFFICIAL_DESIGN_TOKENS } from '../content/officialDesignTokens';
import { usePostLoginLanguage } from '../i18n/postLoginLanguage';
import { buildDemoUrl, getDemoModeSelectPath, type DemoEntrySource } from '../lib/demoEntry';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
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
      description: language === 'es' ? 'Vista general de progreso, foco y energía diaria.' : 'A guided overview of progress, focus, and daily energy.',
      href: buildDemoUrl({ language, source: legacyLabsPath ? 'labs' : source }),
      Icon: Target,
    },
    {
      id: 'logros',
      title: language === 'es' ? 'Logros' : 'Achievements',
      description: language === 'es' ? 'Explora badges, sellos y recompensas desbloqueables.' : 'Explore badges, seals, and unlockable reward cards.',
      href: `${legacyLabsPath ? '/labs/logros' : '/demo/logros'}?lang=${language}&source=${legacyLabsPath ? 'labs' : source}`,
      Icon: Sparkles,
    },
    {
      id: 'tareas',
      title: language === 'es' ? 'Tareas' : 'Tasks',
      description: language === 'es' ? 'Editor público con datos mock y guía de uso incluida.' : 'Public editor preview with mock data and built-in guidance.',
      href: `${legacyLabsPath ? '/labs/tasks-demo' : '/demo/tasks'}?lang=${language}&source=${legacyLabsPath ? 'labs' : source}`,
      Icon: WandSparkles,
    },
  ];

  return (
    <main className="min-h-screen text-[color:var(--color-text)] md:h-svh md:min-h-svh" style={landingBackground}>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-4 sm:px-6 sm:py-5 md:h-svh md:min-h-svh md:max-w-5xl md:px-8 md:py-6 lg:max-w-6xl lg:px-10 lg:py-7 xl:max-w-[84rem] xl:px-12">
        <section className="relative isolate flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(140deg,rgba(255,255,255,0.085),rgba(167,123,245,0.075)_48%,rgba(72,43,126,0.05))] px-5 py-4 shadow-[0_22px_56px_rgba(26,12,52,0.22),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-[20px] sm:px-6 sm:py-5 md:rounded-[2.35rem] md:px-7 md:py-5 md:shadow-[0_28px_80px_rgba(26,12,52,0.28),inset_0_1px_0_rgba(255,255,255,0.2)] lg:px-8 lg:py-6 xl:px-10 xl:py-6">
          <div className="pointer-events-none absolute inset-x-2 -top-3 h-24 rounded-full bg-[radial-gradient(circle_at_50%_52%,rgba(176,122,255,0.3),rgba(176,122,255,0.08)_54%,transparent_74%)] blur-[18px] md:h-28 md:blur-[22px]" />
          <button
            type="button"
            onClick={() => navigate(buildLocalizedAuthPath('/', language))}
            aria-label={language === 'es' ? 'Cerrar demo hub y volver al inicio' : 'Close demo hub and return home'}
            className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-xl leading-none text-white/82 shadow-[0_12px_28px_rgba(26,12,52,0.2),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition duration-200 ease-out hover:border-white/18 hover:bg-white/[0.1] hover:text-white active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          >
            <span aria-hidden="true">×</span>
          </button>

          <div className="relative flex flex-col gap-4 text-center sm:gap-[1.125rem] md:gap-5">
            <BrandWordmark className="text-white/84" textClassName="text-[0.72rem] font-semibold tracking-[0.34em] text-white/72 sm:text-xs" iconClassName="h-[1.65em] sm:h-[1.75em]" />
            <div className="mx-auto flex w-full max-w-[56rem] flex-col gap-2 md:gap-2.5">
              <h1 className="mx-auto max-w-[24ch] text-balance text-[1.8rem] font-semibold leading-[0.98] tracking-[-0.03em] text-white sm:text-[2rem] md:text-[2.4rem] lg:text-[2.75rem]">
                {language === 'es' ? 'Explora Innerbloom por sección de producto' : 'Explore Innerbloom by product section'}
              </h1>
              <p className="mx-auto max-w-[58ch] text-sm leading-[1.5] text-white/78 sm:text-[0.96rem] md:text-[1.02rem]">
                {language === 'es'
                  ? 'Elige una demo pública para recorrer Dashboard, Logros o Tareas con una experiencia guiada y visual consistente.'
                  : 'Choose a public demo to explore Dashboard, Achievements, or Tasks with a guided and consistent product experience.'}
              </p>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-1 gap-3 md:mt-8 md:grid-cols-3 md:gap-4">
            {cards.map(({ id, title, description, href, Icon }) => (
              <Link
                key={id}
                to={href}
                className="group relative flex min-h-[15rem] flex-col justify-between rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-5 shadow-[0_14px_30px_rgba(26,12,52,0.14),inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-[0_18px_36px_rgba(26,12,52,0.2),inset_0_1px_0_rgba(255,255,255,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              >
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition group-hover:scale-[1.03]">
                  <Icon className="h-7 w-7" strokeWidth={2.1} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">{title}</h2>
                  <p className="text-sm leading-relaxed text-white/78">{description}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/82 transition group-hover:text-white">
                  {language === 'es' ? 'Abrir demo' : 'Open demo'}
                  <span aria-hidden>→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

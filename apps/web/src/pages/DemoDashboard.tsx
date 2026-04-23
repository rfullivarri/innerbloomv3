import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { usePostLoginLanguage } from '../i18n/postLoginLanguage';
import { useThemePreference } from '../theme/ThemePreferenceProvider';
import { emitDemoEvent } from '../lib/telemetry';
import { setDashboardDemoModeEnabled } from '../lib/demoMode';
import { GuidedDemoOverlay } from '../components/demo/GuidedDemoOverlay';
import { DailyQuestModal, type DailyQuestModalHandle } from '../components/DailyQuestModal';
import { buildGuidedSteps } from '../config/demoGuidedTour';
import { getPublicDemoHubPath, resolveDemoEntryContext } from '../lib/demoEntry';
import { getLabsGameModeConfig } from '../config/labsGameModes';
import { DASHBOARD_PATH } from '../config/auth';
import { usePageMeta } from '../lib/seo';
import { DemoDashboardOverviewScene } from '../components/demo/DemoDashboardOverviewScene';

const DEMO_SHARE_IMAGE = 'https://innerbloomjourney.org/og/neneOGP.png';

const DAILY_QUEST_STEP_IDS = new Set([
  'daily-quest-intro',
  'daily-quest-moderation',
  'daily-quest-tasks',
  'daily-quest-footer',
]);

export default function DemoDashboardPage() {
  const { language, setManualLanguage } = usePostLoginLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const demoContext = resolveDemoEntryContext(location.search);
  const demoHubPath = getPublicDemoHubPath(location.search);
  const { theme, setPreference } = useThemePreference();
  const [showGuidedTour, setShowGuidedTour] = useState(true);
  const hasLoggedGuidedStart = useRef(false);
  const dailyQuestModalRef = useRef<DailyQuestModalHandle | null>(null);

  const guidedSteps = useMemo(() => buildGuidedSteps(demoContext.fromOnboarding), [demoContext.fromOnboarding]);
  const selectedModeConfig = useMemo(() => getLabsGameModeConfig(demoContext.mode), [demoContext.mode]);

  const dashboardPath = useMemo(() => {
    const raw = DASHBOARD_PATH || '/dashboard-v3';
    const normalized = raw.startsWith('/') ? raw : `/${raw}`;
    return normalized.replace(/\/+$/, '') || '/dashboard-v3';
  }, []);

  usePageMeta({
    title: language === 'es' ? 'Innerbloom Demo guiada' : 'Innerbloom Guided Demo',
    description:
      language === 'es'
        ? 'Explora el dashboard demo de Innerbloom y luego empieza tu onboarding real en /intro-journey.'
        : 'Explore the Innerbloom demo dashboard and then start your real onboarding at /intro-journey.',
    image: DEMO_SHARE_IMAGE,
    imageAlt: language === 'es' ? 'Preview de la demo guiada de Innerbloom' : 'Innerbloom guided demo preview',
    ogImageSecureUrl: DEMO_SHARE_IMAGE,
    ogImageType: 'image/png',
    ogImageWidth: '1200',
    ogImageHeight: '630',
    twitterImage: DEMO_SHARE_IMAGE,
    twitterImageAlt: language === 'es' ? 'Preview de la demo guiada de Innerbloom' : 'Innerbloom guided demo preview',
    url: `/demo${location.search}`,
  });

  const handleDemoExit = useCallback(() => {
    emitDemoEvent('demo_exited', { from: '/demo', source: demoContext.source, mode: demoContext.mode });

    if (demoContext.fromOnboarding && userId) {
      navigate(dashboardPath, { state: { scrollToTopOnEnter: true, source: 'demo' } });
      return;
    }

    navigate(demoHubPath);
  }, [dashboardPath, demoContext.fromOnboarding, demoContext.mode, demoHubPath, navigate, userId]);

  useEffect(() => {
    if (language !== demoContext.language) {
      setManualLanguage(demoContext.language);
    }
  }, [demoContext.language, language, setManualLanguage]);

  useEffect(() => {
    setDashboardDemoModeEnabled(true);
    emitDemoEvent('demo_opened', { language, theme, source: demoContext.source, mode: demoContext.mode });

    if (!hasLoggedGuidedStart.current) {
      emitDemoEvent('demo_guided_started', { language, totalSteps: guidedSteps.length, source: demoContext.source, mode: demoContext.mode });
      hasLoggedGuidedStart.current = true;
    }

    return () => {
      setDashboardDemoModeEnabled(false);
    };
  }, [demoContext.mode, demoContext.source, guidedSteps.length, language, theme]);

  const handleStepChange = useCallback((stepId: string) => {
    if (DAILY_QUEST_STEP_IDS.has(stepId)) {
      dailyQuestModalRef.current?.open();
      return;
    }

    dailyQuestModalRef.current?.close();
  }, []);

  const handleGuidedCompleted = useCallback(() => {
    emitDemoEvent('demo_guided_completed', { totalSteps: guidedSteps.length, source: demoContext.source, mode: demoContext.mode });

    if (demoContext.fromOnboarding && userId) {
      dailyQuestModalRef.current?.close();
      navigate(dashboardPath, { state: { scrollToTopOnEnter: true, source: 'demo' } });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [dashboardPath, demoContext.fromOnboarding, demoContext.mode, demoContext.source, guidedSteps.length, navigate, userId]);

  return (
    <div className="min-h-screen bg-transparent" data-light-scope="dashboard-v3">
      <Navbar
        title="Dashboard"
        menuSlot={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-1">
              <button
                type="button"
                onClick={() => setManualLanguage('es')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
                  language === 'es' ? 'bg-[color:var(--color-overlay-4)] text-[color:var(--color-text)]' : 'text-[color:var(--color-text-muted)]'
                }`}
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => setManualLanguage('en')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
                  language === 'en' ? 'bg-[color:var(--color-overlay-4)] text-[color:var(--color-text)]' : 'text-[color:var(--color-text-muted)]'
                }`}
              >
                EN
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPreference(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-text)]"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              type="button"
              onClick={() => dailyQuestModalRef.current?.open()}
              className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-text)]"
            >
              Daily Quest
            </button>
            <Link
              to={demoContext.fromOnboarding
                ? dashboardPath
                : demoHubPath}
              onClick={(event) => {
                event.preventDefault();
                handleDemoExit();
              }}
              aria-label={language === 'es' ? 'Cerrar demo del Dashboard y volver al hub público' : 'Close Dashboard demo and return to the public hub'}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] text-lg font-semibold leading-none text-[color:var(--color-text)] transition-colors hover:bg-[color:var(--color-overlay-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)]"
            >
              <span aria-hidden>×</span>
            </Link>
          </div>
        }
      />

      {showGuidedTour ? (
        <GuidedDemoOverlay
          language={language}
          steps={guidedSteps}
          finalActionLabel={demoContext.fromOnboarding ? { es: 'Ir al dashboard', en: 'Go to dashboard' } : undefined}
          finalPrimaryActionLabel={!demoContext.fromOnboarding ? { es: 'Empezar onboarding', en: 'Start onboarding' } : undefined}
          finalSecondaryActionLabel={!demoContext.fromOnboarding ? { es: 'Seguir explorando', en: 'Keep exploring' } : undefined}
          onFinish={() => {
            if (demoContext.fromOnboarding) {
              handleDemoExit();
              return;
            }
            setShowGuidedTour(false);
            dailyQuestModalRef.current?.close();
          }}
          onSkip={(stepId, stepIndex) => emitDemoEvent('demo_guided_skipped', { stepId, stepIndex })}
          onStepViewed={(stepId, stepIndex) => emitDemoEvent('demo_step_viewed', { stepId, stepIndex })}
          onStepChange={handleStepChange}
          onCompleted={handleGuidedCompleted}
          onFinalPrimaryAction={!demoContext.fromOnboarding ? () => {
            handleGuidedCompleted();
            navigate('/intro-journey');
          } : undefined}
          onFinalSecondaryAction={!demoContext.fromOnboarding ? () => {
            setShowGuidedTour(false);
            dailyQuestModalRef.current?.close();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } : undefined}
        />
      ) : null}

      <DailyQuestModal
        ref={dailyQuestModalRef}
        enabled
        canAutoOpen={false}
      />

      <main
        className="mx-auto w-full max-w-7xl px-3 py-4 md:px-5 md:py-6 lg:px-6 lg:py-8"
        data-demo-source={demoContext.source}
        data-demo-mode={demoContext.mode}
        style={{ '--demo-mode-accent': selectedModeConfig.accentColor } as CSSProperties}
      >
        <DemoDashboardOverviewScene
          gameMode={demoContext.gameMode}
          onOpenDailyQuest={() => dailyQuestModalRef.current?.open()}
        />
      </main>
    </div>
  );
}

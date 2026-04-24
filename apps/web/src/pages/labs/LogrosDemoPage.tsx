import { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GuidedDemoOverlay } from '../../components/demo/GuidedDemoOverlay';
import { RewardsSection, type RewardsSectionDemoControls } from '../../components/dashboard-v3/RewardsSection';
import { DASHBOARD_PATH } from '../../config/auth';
import { LABS_LOGROS_GUIDED_STEPS } from '../../config/labsLogrosGuidedTour';
import { getDemoLogrosData, getDemoLogrosPreviewByTaskId } from '../../data/demoLogrosData';
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';
import { getPublicDemoHubPath, resolveDemoEntryContext } from '../../lib/demoEntry';

const DEMO_ANCHORS = {
  shelves: 'logros-shelves',
  carouselStructure: 'logros-carousel-structure',
  pillarSelector: 'logros-pillar-selector',
  carouselTrack: 'logros-carousel-track',
  achievedCard: 'logros-achieved-card',
  achievedCardTaskId: 'task-dinner-before-22',
  achievedCardFront: 'logros-achieved-card-front',
  achievedCardBack: 'logros-achieved-card-back',
  blockedCard: 'logros-blocked-card',
  blockedCardTaskId: 'task-gym',
  blockedCardFront: 'logros-blocked-card-front',
  blockedCardBack: 'logros-blocked-card-back',
  sealPath: 'logros-seal-path',
  achievementFront: 'logros-achievement-front',
  achievementBack: 'logros-achievement-back',
  achievementCard: 'logros-achievement-card',
  weekly: 'logros-weekly',
  monthly: 'logros-monthly',
} as const;

export default function LabsLogrosDemoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { language } = usePostLoginLanguage();
  const demoContext = resolveDemoEntryContext(location.search);
  const demoHubPath = getPublicDemoHubPath(location.search);
  const dashboardPath = useMemo(() => {
    const raw = DASHBOARD_PATH || '/dashboard-v3';
    const normalized = raw.startsWith('/') ? raw : `/${raw}`;
    return normalized.replace(/\/+$/, '') || '/dashboard-v3';
  }, []);
  const [showGuidedTour, setShowGuidedTour] = useState(true);
  const [activeStepId, setActiveStepId] = useState<string | null>(LABS_LOGROS_GUIDED_STEPS[0]?.id ?? null);
  const demoControlsRef = useRef<RewardsSectionDemoControls | null>(null);
  const rememberDemoControls = useCallback((controls: RewardsSectionDemoControls) => {
    demoControlsRef.current = controls;
  }, []);
  const demoConfig = useMemo(
    () => ({
      disableRemote: true,
      forceAchievementsViewMode: 'carousel' as const,
      mockPreviewAchievementByTaskId: getDemoLogrosPreviewByTaskId(language),
      anchors: DEMO_ANCHORS,
      controls: {
        onReady: rememberDemoControls,
      },
    }),
    [language, rememberDemoControls],
  );

  const handleStepChange = useCallback((stepId: string) => {
    setActiveStepId(stepId);
    const controls = demoControlsRef.current;

    if (stepId === 'logros-shelves') {
      controls?.selectPillar('BODY');
      controls?.focusCarouselCard(DEMO_ANCHORS.achievedCardTaskId);
      return;
    }

    if (stepId === 'logros-achievement-front') {
      controls?.closeAllOverlays();
      controls?.openAchievedCard();
      return;
    }

    if (stepId === 'logros-achievement-back') {
      controls?.ensureAchievementBackFace();
      return;
    }

    if (stepId === 'logros-seal-path' || stepId === 'logros-seal-concept') {
      controls?.closeAllOverlays();
      controls?.openBlockedCard();
      return;
    }

    if (stepId === 'logros-blocked-card') {
      controls?.closeAllOverlays();
      controls?.focusBlockedCarouselCard();
      return;
    }

    if (stepId.startsWith('logros-seal-')) {
      controls?.openBlockedCard();
      return;
    }

    if (stepId === 'logros-weekly' || stepId === 'logros-monthly' || stepId === 'logros-end') {
      controls?.closeAllOverlays();
    }
  }, []);

  const handleDemoExit = useCallback(() => {
    const shouldReturnToDashboard = Boolean(userId) && (demoContext.fromOnboarding || demoContext.source === 'internal');
    if (shouldReturnToDashboard) {
      navigate(dashboardPath, { state: { scrollToTopOnEnter: true, source: 'demo', focusSection: 'logros' } });
      return;
    }
    navigate(demoHubPath);
  }, [dashboardPath, demoContext.fromOnboarding, demoContext.source, demoHubPath, navigate, userId]);

  return (
    <div className="min-h-screen bg-transparent" data-light-scope="dashboard-v3" data-labs-logros-step={activeStepId ?? undefined}>
      <header className="sticky top-0 z-40 border-b border-[color:var(--glass-border)] bg-[image:var(--glass-bg)] px-3 py-3 backdrop-blur-xl md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.22em] text-[color:var(--color-text-subtle)] md:text-xs">INNERBLOOM</p>
            <h1 className="font-display text-[1.05rem] font-semibold text-[color:var(--color-text)] md:text-xl">{language === 'es' ? 'Logros' : 'Achievements'}</h1>
          </div>
          <Link
            to={demoContext.fromOnboarding || demoContext.source === 'internal' ? dashboardPath : demoHubPath}
            onClick={(event) => {
              event.preventDefault();
              handleDemoExit();
            }}
            aria-label={language === 'es'
              ? 'Cerrar demo de Logros'
              : 'Close Achievements demo'}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--glass-border)] bg-[color:var(--color-surface-soft)] text-lg font-semibold leading-none text-[color:var(--color-text)] transition-colors hover:bg-[color:var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)]"
          >
            <span aria-hidden>×</span>
          </Link>
        </div>
      </header>

      {showGuidedTour ? (
        <GuidedDemoOverlay
          language={language}
          steps={LABS_LOGROS_GUIDED_STEPS}
          onFinish={() => setShowGuidedTour(false)}
          onSkip={() => setShowGuidedTour(false)}
          onStepViewed={() => undefined}
          onStepChange={handleStepChange}
          onCompleted={() => undefined}
          finalSecondaryActionLabel={{ es: 'Seguir explorando', en: 'Keep exploring' }}
          onFinalSecondaryAction={() => setShowGuidedTour(false)}
        />
      ) : null}

      <main className="mx-auto w-full max-w-4xl px-3 py-4 md:px-5 md:py-6" data-demo-anchor="logros-intro">
        <RewardsSection
          userId=""
          initialData={getDemoLogrosData(language)}
          demoConfig={demoConfig}
          demoStepId={activeStepId}
        />
      </main>
    </div>
  );
}

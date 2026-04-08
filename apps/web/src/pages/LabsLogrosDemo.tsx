import { useCallback, useMemo, useRef, useState } from 'react';
import { GuidedDemoOverlay } from '../components/demo/GuidedDemoOverlay';
import { RewardsSection, type RewardsSectionDemoControls } from '../components/dashboard-v3/RewardsSection';
import { LABS_LOGROS_GUIDED_STEPS } from '../config/labsLogrosGuidedTour';
import { demoLogrosData, demoLogrosPreviewByTaskId } from '../data/demoLogrosData';

const DEMO_ANCHORS = {
  shelves: 'logros-shelves',
  achievedCard: 'logros-achieved-card',
  achievedCardTaskId: 'task-dinner-before-22',
  blockedCard: 'logros-blocked-card',
  blockedCardTaskId: 'task-gym',
  sealPath: 'logros-seal-path',
  achievementFront: 'logros-achievement-front',
  achievementBack: 'logros-achievement-back',
  weekly: 'logros-weekly',
  monthly: 'logros-monthly',
} as const;

export default function LabsLogrosDemoPage() {
  const [showGuidedTour, setShowGuidedTour] = useState(true);
  const demoControlsRef = useRef<RewardsSectionDemoControls | null>(null);
  const rememberDemoControls = useCallback((controls: RewardsSectionDemoControls) => {
    demoControlsRef.current = controls;
  }, []);
  const demoConfig = useMemo(
    () => ({
      disableRemote: true,
      mockPreviewAchievementByTaskId: demoLogrosPreviewByTaskId,
      anchors: DEMO_ANCHORS,
      controls: {
        onReady: rememberDemoControls,
      },
    }),
    [rememberDemoControls],
  );

  const handleStepChange = useCallback((stepId: string) => {
    const controls = demoControlsRef.current;

    if (stepId === 'logros-achievement-front') {
      controls?.closeAllOverlays();
      controls?.openAchievedCard();
      return;
    }

    if (stepId === 'logros-achievement-back') {
      controls?.flipAchievementCard();
      return;
    }

    if (stepId === 'logros-seal-path' || stepId === 'logros-seal-concept') {
      controls?.closeAllOverlays();
      controls?.openBlockedCard();
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

  return (
    <div className="min-h-screen bg-transparent" data-light-scope="dashboard-v3">
      <header className="sticky top-0 z-40 border-b border-[color:var(--glass-border)] bg-[image:var(--glass-bg)] px-3 py-3 backdrop-blur-xl md:px-6">
        <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[color:var(--color-text-subtle)] md:text-xs">LABS</p>
        <h1 className="font-display text-[1.05rem] font-semibold text-[color:var(--color-text)] md:text-xl">Logros</h1>
      </header>

      {showGuidedTour ? (
        <GuidedDemoOverlay
          language="es"
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
          initialData={demoLogrosData}
          demoConfig={demoConfig}
        />
      </main>
    </div>
  );
}

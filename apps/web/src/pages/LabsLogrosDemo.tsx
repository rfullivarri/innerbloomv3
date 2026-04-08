import { useCallback, useState } from 'react';
import { GuidedDemoOverlay } from '../components/demo/GuidedDemoOverlay';
import { RewardsSection } from '../components/dashboard-v3/RewardsSection';
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

function clickAnchor(anchor: string) {
  const target = document.querySelector(`[data-demo-anchor="${anchor}"]`) as HTMLElement | null;
  target?.click();
}

function closeOverlays() {
  const closeButtons = Array.from(document.querySelectorAll('button[aria-label*="Cerrar"], button[aria-label*="Close"]')) as HTMLElement[];
  closeButtons.forEach((button) => button.click());
}

export default function LabsLogrosDemoPage() {
  const [showGuidedTour, setShowGuidedTour] = useState(true);

  const handleStepChange = useCallback((stepId: string) => {
    if (stepId === 'logros-achievement-front') {
      closeOverlays();
      clickAnchor(DEMO_ANCHORS.achievedCard);
      return;
    }

    if (stepId === 'logros-achievement-back') {
      const front = document.querySelector('[data-demo-anchor="logros-achievement-front"]') as HTMLElement | null;
      if (front) {
        front.click();
      } else {
        clickAnchor(DEMO_ANCHORS.achievedCard);
        window.setTimeout(() => {
          const frontNext = document.querySelector('[data-demo-anchor="logros-achievement-front"]') as HTMLElement | null;
          frontNext?.click();
        }, 120);
      }
      return;
    }

    if (stepId === 'logros-seal-path' || stepId === 'logros-seal-concept') {
      closeOverlays();
      clickAnchor(DEMO_ANCHORS.blockedCard);
      return;
    }

    if (stepId.startsWith('logros-seal-')) {
      const openSealPath = document.querySelector('[data-demo-anchor="logros-seal-path"]');
      if (!openSealPath) {
        closeOverlays();
        clickAnchor(DEMO_ANCHORS.blockedCard);
      }
      return;
    }

    if (stepId === 'logros-weekly' || stepId === 'logros-monthly' || stepId === 'logros-end') {
      closeOverlays();
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
          disableRemote
          mockPreviewAchievementByTaskId={demoLogrosPreviewByTaskId}
          demoAnchors={DEMO_ANCHORS}
        />
      </main>
    </div>
  );
}

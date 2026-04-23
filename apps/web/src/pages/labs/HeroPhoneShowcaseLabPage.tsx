import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { DashboardOverview } from '../DashboardV3';
import { getDashboardSectionConfig } from '../dashboardSections';
import TaskEditorPage from '../editor';
import { RewardsSection, type RewardsSectionDemoControls } from '../../components/dashboard-v3/RewardsSection';
import { getDemoLogrosData, getDemoLogrosPreviewByTaskId } from '../../data/demoLogrosData';
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';
import { setDashboardDemoModeEnabled } from '../../lib/demoMode';
import styles from './HeroPhoneShowcaseLabPage.module.css';

type SceneKey =
  | 'dashboardStill'
  | 'dashboardDrift'
  | 'toAchievements'
  | 'achievementsShowcase'
  | 'toTaskEditor'
  | 'taskEditorStory'
  | 'backToDashboard';

type SceneDefinition = {
  key: SceneKey;
  durationMs: number;
};

const DEMO_DAILY_QUEST_READINESS = {
  hasTasks: true,
  firstTasksConfirmed: true,
  completedFirstDailyQuest: true,
  canOpenDailyQuest: true,
  canShowDailyQuestPopup: true,
  canAutoOpenDailyQuestPopup: false,
  showOnboardingGuidance: false,
  showJourneyPreparing: false,
  tasksStatus: 'success' as const,
  journeyStatus: 'success' as const,
  journey: {
    first_date_log: null,
    days_of_journey: 0,
    quantity_daily_logs: 0,
    first_programmed: true,
    first_tasks_confirmed: true,
    completed_first_daily_quest: true,
  },
  reload: () => undefined,
};

const SCENE_TIMELINE: SceneDefinition[] = [
  { key: 'dashboardStill', durationMs: 600 },
  { key: 'dashboardDrift', durationMs: 1800 },
  { key: 'toAchievements', durationMs: 550 },
  { key: 'achievementsShowcase', durationMs: 1800 },
  { key: 'toTaskEditor', durationMs: 550 },
  { key: 'taskEditorStory', durationMs: 2200 },
  { key: 'backToDashboard', durationMs: 500 },
];

const LOOP_MS = SCENE_TIMELINE.reduce((total, scene) => total + scene.durationMs, 0);

function useLoopTimeline(isReady: boolean) {
  const prefersReducedMotion = useReducedMotion();
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion || !isReady) {
      setElapsedMs(0);
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      setElapsedMs((now - start) % LOOP_MS);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isReady, prefersReducedMotion]);

  if (prefersReducedMotion || !isReady) {
    return {
      scene: 'dashboardStill' as SceneKey,
      sceneProgress: 0,
      panelTranslatePercent: 0,
    };
  }

  let cursor = 0;
  let current = SCENE_TIMELINE[0];
  for (const scene of SCENE_TIMELINE) {
    if (elapsedMs < cursor + scene.durationMs) {
      current = scene;
      break;
    }
    cursor += scene.durationMs;
  }

  const sceneProgress = Math.min(1, Math.max(0, (elapsedMs - cursor) / current.durationMs));
  const easeInOut = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);

  const panelTranslatePercent = (() => {
    if (current.key === 'toAchievements') return -100 * easeInOut;
    if (current.key === 'achievementsShowcase') return -100;
    if (current.key === 'toTaskEditor') return -100 - 100 * easeInOut;
    if (current.key === 'taskEditorStory') return -200;
    if (current.key === 'backToDashboard') return -200 + 200 * easeInOut;
    return 0;
  })();

  return {
    scene: current.key,
    sceneProgress,
    panelTranslatePercent,
  };
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.phoneFrame}>
      <div className={styles.phoneNotch} />
      <div className={styles.phoneScreen}>{children}</div>
    </div>
  );
}

function RealDashboardScene({
  scene,
  sceneProgress,
  onReady,
}: {
  scene: SceneKey;
  sceneProgress: number;
  onReady: () => void;
}) {
  const { language } = usePostLoginLanguage();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const readyReportedRef = useRef(false);
  const section = useMemo(
    () => getDashboardSectionConfig('dashboard', '/dashboard', language),
    [language],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const dashboardScrollCap = 0.08;
    const driftProgress =
      scene === 'dashboardDrift'
        ? Math.max(0, Math.min(1, (sceneProgress - 0.2) / 0.8))
        : scene === 'toAchievements' || scene === 'achievementsShowcase' || scene === 'toTaskEditor'
          ? 1
          : scene === 'backToDashboard'
            ? 1 - sceneProgress
            : 0;

    viewport.scrollTop = maxScroll * dashboardScrollCap * driftProgress;
  }, [scene, sceneProgress]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || readyReportedRef.current) return;

    const hasCriticalBlocks = () => {
      const hasAvatar = viewport.querySelector('[data-demo-anchor="overall-progress"]');
      const hasEmotionChart = viewport.querySelector('[data-demo-anchor="emotion-chart"]');
      const hasStreaks = viewport.querySelector('[data-demo-anchor="streaks"]');
      return Boolean(hasAvatar && hasEmotionChart && hasStreaks);
    };

    const markReadyIfStable = () => {
      if (!hasCriticalBlocks() || readyReportedRef.current) {
        return false;
      }

      window.setTimeout(() => {
        if (readyReportedRef.current || !hasCriticalBlocks()) return;
        readyReportedRef.current = true;
        onReady();
      }, 120);
      return true;
    };

    if (markReadyIfStable()) return;

    const intervalId = window.setInterval(() => {
      if (markReadyIfStable()) {
        window.clearInterval(intervalId);
      }
    }, 80);

    return () => window.clearInterval(intervalId);
  }, [onReady]);

  return (
    <section className={`${styles.scenePanel} ${styles.sceneDashboard}`} data-light-scope="dashboard-v3">
      <div ref={viewportRef} className={styles.realViewport}>
        <div className={`${styles.realSceneScale} ${styles.dashboardSceneScale}`}>
          <DashboardOverview
            userId="demo-public-user"
            gameMode="flow"
            avatarProfile={null}
            weeklyTarget={3}
            isJourneyGenerating={false}
            dailyQuestReadiness={DEMO_DAILY_QUEST_READINESS}
            showOnboardingGuidance={false}
            section={section}
            onOpenReminderScheduler={() => undefined}
            onOpenModerationEdit={() => undefined}
            shouldShowFirstDailyQuestCta={false}
            onOpenDailyQuest={() => undefined}
            showOnboardingCompletionBanner={false}
            onUpgradeAccepted={() => undefined}
          />
        </div>
      </div>
    </section>
  );
}

function RealAchievementsScene({
  scene,
  sceneProgress,
  controlsRef,
  onReady,
}: {
  scene: SceneKey;
  sceneProgress: number;
  controlsRef: MutableRefObject<RewardsSectionDemoControls | null>;
  onReady: () => void;
}) {
  const { language } = usePostLoginLanguage();

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (scene === 'achievementsShowcase') {
      controls.closeAllOverlays();
      if (sceneProgress < 0.68) {
        controls.focusCarouselCard('task-dinner-before-22');
      } else {
        controls.focusCarouselCard('task-gym');
      }
    }

    if (scene === 'toTaskEditor') {
      controls.closeAllOverlays();
    }
  }, [controlsRef, scene, sceneProgress]);

  const demoConfig = useMemo(
    () => ({
      disableRemote: true,
      forceAchievementsViewMode: 'carousel' as const,
      mockPreviewAchievementByTaskId: getDemoLogrosPreviewByTaskId(language),
      controls: {
        onReady: (controls: RewardsSectionDemoControls) => {
          controlsRef.current = controls;
          window.setTimeout(() => {
            onReady();
          }, 140);
        },
      },
    }),
    [controlsRef, language, onReady],
  );

  return (
    <section className={`${styles.scenePanel} ${styles.sceneAchievements}`} data-light-scope="dashboard-v3">
      <div className={`${styles.realViewport} ${styles.achievementsViewport}`}>
        <div className={`${styles.realSceneScale} ${styles.achievementsSceneScale}`}>
          <RewardsSection
            userId=""
            initialData={getDemoLogrosData(language)}
            demoConfig={demoConfig}
          />
        </div>
      </div>
    </section>
  );
}

function RealEditorScene({
  scene,
  sceneProgress,
  onReady,
}: {
  scene: SceneKey;
  sceneProgress: number;
  onReady: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const readyReportedRef = useRef(false);
  const storyStepsRef = useRef({
    triggerPressed: false,
    aiRequested: false,
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root || readyReportedRef.current) return;

    const notifyReadyIfMounted = () => {
      const cta = root.querySelector('[data-editor-guide-target="new-task-trigger"]');
      if (!cta || readyReportedRef.current) return false;
      readyReportedRef.current = true;
      onReady();
      return true;
    };

    if (notifyReadyIfMounted()) return;

    const intervalId = window.setInterval(() => {
      if (notifyReadyIfMounted()) {
        window.clearInterval(intervalId);
      }
    }, 80);

    return () => window.clearInterval(intervalId);
  }, [onReady]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (scene !== 'taskEditorStory') {
      if (scene === 'backToDashboard') {
        const closeButton = root.querySelector<HTMLButtonElement>('.create-task-ai-modal__close');
        closeButton?.click();
      }
      storyStepsRef.current = {
        triggerPressed: false,
        aiRequested: false,
      };
      return;
    }

    if (sceneProgress >= 0.32 && !storyStepsRef.current.triggerPressed) {
      const createTrigger = root.querySelector<HTMLButtonElement>('[data-editor-guide-target="new-task-trigger"]');
      if (createTrigger) {
        createTrigger.click();
        storyStepsRef.current.triggerPressed = true;
      }
    }

    if (sceneProgress >= 0.64 && !storyStepsRef.current.aiRequested) {
      const aiButton = root.querySelector<HTMLButtonElement>('[data-editor-guide-target="new-task-modal-ai-action"]');
      if (aiButton) {
        aiButton.click();
        storyStepsRef.current.aiRequested = true;
      }
    }
  }, [scene, sceneProgress]);

  return (
    <section className={`${styles.scenePanel} ${styles.sceneEditor}`} data-light-scope="dashboard-v3">
      <div className={`${styles.realViewport} ${styles.editorViewport}`}>
        <div ref={rootRef} className={`${styles.realSceneScale} ${styles.editorSceneScale}`}>
          <TaskEditorPage publicDemo />
        </div>
      </div>
    </section>
  );
}

function HeroPhoneShowcase() {
  const [sceneReadyMap, setSceneReadyMap] = useState({
    dashboard: false,
    achievements: false,
    editor: false,
  });
  const [loopCanStart, setLoopCanStart] = useState(false);
  const timeline = useLoopTimeline(loopCanStart);
  const achievementsControlsRef = useRef<RewardsSectionDemoControls | null>(null);
  const allScenesReady = sceneReadyMap.dashboard && sceneReadyMap.achievements && sceneReadyMap.editor;

  useEffect(() => {
    setDashboardDemoModeEnabled(true);
    return () => {
      setDashboardDemoModeEnabled(false);
    };
  }, []);

  useEffect(() => {
    if (!allScenesReady) {
      setLoopCanStart(false);
      return;
    }

    const settleId = window.setTimeout(() => {
      setLoopCanStart(true);
    }, 320);

    return () => window.clearTimeout(settleId);
  }, [allScenesReady]);

  const markReady = (scene: 'dashboard' | 'achievements' | 'editor') => {
    setSceneReadyMap((prev) => (prev[scene] ? prev : { ...prev, [scene]: true }));
  };

  return (
    <PhoneFrame>
      <div className={styles.phoneViewportTrack} style={{ transform: `translateX(${timeline.panelTranslatePercent}%)` }}>
        <RealDashboardScene
          scene={timeline.scene}
          sceneProgress={timeline.sceneProgress}
          onReady={() => markReady('dashboard')}
        />
        <RealAchievementsScene
          scene={timeline.scene}
          sceneProgress={timeline.sceneProgress}
          controlsRef={achievementsControlsRef}
          onReady={() => markReady('achievements')}
        />
        <RealEditorScene
          scene={timeline.scene}
          sceneProgress={timeline.sceneProgress}
          onReady={() => markReady('editor')}
        />
      </div>
    </PhoneFrame>
  );
}

export default function HeroPhoneShowcaseLabPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.copyCol}>
          <p className={styles.kicker}>Labs · Hero experiment</p>
          <h1>
            Tu progreso, <span>en tiempo real.</span>
          </h1>
          <p>
            Showcase dentro de móvil usando vistas reales de Innerbloom: dashboard real, logros reales y editor real
            con flujo de creación asistida.
          </p>
          <div className={styles.ctaRow}>
            <Link className={styles.primaryCta} to="/onboarding">Comenzar ahora</Link>
            <a className={styles.secondaryCta} href="/landing-v2#highlights">Ver dashboard</a>
          </div>
        </div>

        <div className={styles.visualCol}>
          <HeroPhoneShowcase />
        </div>
      </section>
    </main>
  );
}

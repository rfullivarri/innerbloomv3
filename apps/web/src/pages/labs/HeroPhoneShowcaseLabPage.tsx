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
import styles from './HeroPhoneShowcaseLabPage.module.css';

type SceneKey =
  | 'dashboardIdle'
  | 'dashboardScroll'
  | 'toAchievements'
  | 'achievementsIdle'
  | 'toTaskEditor'
  | 'taskModalOpen'
  | 'taskAiCreate'
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
  { key: 'dashboardIdle', durationMs: 1700 },
  { key: 'dashboardScroll', durationMs: 2400 },
  { key: 'toAchievements', durationMs: 1300 },
  { key: 'achievementsIdle', durationMs: 2400 },
  { key: 'toTaskEditor', durationMs: 1300 },
  { key: 'taskModalOpen', durationMs: 1400 },
  { key: 'taskAiCreate', durationMs: 2600 },
  { key: 'backToDashboard', durationMs: 1700 },
];

const LOOP_MS = SCENE_TIMELINE.reduce((total, scene) => total + scene.durationMs, 0);

function useLoopTimeline() {
  const prefersReducedMotion = useReducedMotion();
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) {
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
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    return {
      scene: 'dashboardIdle' as SceneKey,
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
    if (current.key === 'achievementsIdle') return -100;
    if (current.key === 'toTaskEditor') return -100 - 100 * easeInOut;
    if (current.key === 'taskModalOpen' || current.key === 'taskAiCreate') return -200;
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
}: {
  scene: SceneKey;
  sceneProgress: number;
}) {
  const { language } = usePostLoginLanguage();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const section = useMemo(
    () => getDashboardSectionConfig('dashboard', '/dashboard', language),
    [language],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const progressByScene =
      scene === 'dashboardScroll'
        ? sceneProgress
        : scene === 'toAchievements' || scene === 'achievementsIdle' || scene === 'toTaskEditor'
          ? 1
          : scene === 'backToDashboard'
            ? 1 - sceneProgress
            : 0;

    viewport.scrollTop = maxScroll * progressByScene;
  }, [scene, sceneProgress]);

  return (
    <section className={styles.scenePanel} data-light-scope="dashboard-v3">
      <div ref={viewportRef} className={styles.realViewport}>
        <div className={styles.realSceneScale}>
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
}: {
  scene: SceneKey;
  sceneProgress: number;
  controlsRef: MutableRefObject<RewardsSectionDemoControls | null>;
}) {
  const { language } = usePostLoginLanguage();

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (scene === 'achievementsIdle') {
      if (sceneProgress < 0.45) {
        controls.closeAllOverlays();
        controls.focusCarouselCard('task-dinner-before-22');
      } else {
        controls.openAchievedCard();
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
        },
      },
    }),
    [controlsRef, language],
  );

  return (
    <section className={styles.scenePanel} data-light-scope="dashboard-v3">
      <div className={styles.realViewport}>
        <div className={styles.realSceneScale}>
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

function RealEditorScene({ scene }: { scene: SceneKey }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const aiRequestedRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (scene === 'taskModalOpen' || scene === 'taskAiCreate') {
      const createTrigger = root.querySelector<HTMLButtonElement>('[data-editor-guide-target="new-task-trigger"]');
      if (createTrigger) {
        createTrigger.click();
      }
    }

    if (scene === 'taskAiCreate' && !aiRequestedRef.current) {
      const aiButton = root.querySelector<HTMLButtonElement>('[data-editor-guide-target="new-task-modal-ai-action"]');
      if (aiButton) {
        aiButton.click();
        aiRequestedRef.current = true;
      }
    }

    if (scene === 'backToDashboard') {
      const closeButton = root.querySelector<HTMLButtonElement>('.create-task-ai-modal__close');
      closeButton?.click();
      aiRequestedRef.current = false;
    }
  }, [scene]);

  return (
    <section className={styles.scenePanel} data-light-scope="dashboard-v3">
      <div className={styles.realViewport}>
        <div ref={rootRef} className={styles.realSceneScale}>
          <TaskEditorPage publicDemo />
        </div>
      </div>
    </section>
  );
}

function HeroPhoneShowcase() {
  const timeline = useLoopTimeline();
  const achievementsControlsRef = useRef<RewardsSectionDemoControls | null>(null);

  return (
    <PhoneFrame>
      <div className={styles.phoneViewportTrack} style={{ transform: `translateX(${timeline.panelTranslatePercent}%)` }}>
        <RealDashboardScene scene={timeline.scene} sceneProgress={timeline.sceneProgress} />
        <RealAchievementsScene
          scene={timeline.scene}
          sceneProgress={timeline.sceneProgress}
          controlsRef={achievementsControlsRef}
        />
        <RealEditorScene scene={timeline.scene} />
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

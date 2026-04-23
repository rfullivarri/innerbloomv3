import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { DashboardOverview } from '../DashboardV3';
import { getDashboardSectionConfig } from '../dashboardSections';
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';
import { setDashboardDemoModeEnabled } from '../../lib/demoMode';
import styles from './HeroPhoneShowcaseLabPage.module.css';

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

const INITIAL_PAUSE_MS = 400;
const SCROLL_DURATION_MS = 3000;

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.phoneFrame}>
      <div className={styles.phoneNotch} />
      <div className={styles.phoneScreen}>{children}</div>
    </div>
  );
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function DashboardOnlyScene() {
  const { language } = usePostLoginLanguage();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const section = useMemo(
    () => getDashboardSectionConfig('dashboard', '/dashboard', language),
    [language],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let intervalId = 0;
    const hasAnchors = () => {
      const hasAvatar = viewport.querySelector('[data-demo-anchor="overall-progress"]');
      const hasEmotionChart = viewport.querySelector('[data-demo-anchor="emotion-chart"]');
      const hasStreaks = viewport.querySelector('[data-demo-anchor="streaks"]');
      return Boolean(hasAvatar && hasEmotionChart && hasStreaks);
    };

    const markIfReady = () => {
      if (!hasAnchors()) return false;
      window.setTimeout(() => setIsReady(true), 120);
      return true;
    };

    if (!markIfReady()) {
      intervalId = window.setInterval(() => {
        if (markIfReady()) {
          window.clearInterval(intervalId);
        }
      }, 80);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !isReady || prefersReducedMotion) {
      if (viewport) viewport.scrollTop = 0;
      return;
    }

    const avatarNode = viewport.querySelector('[data-demo-anchor="overall-progress"]') as HTMLElement | null;
    const emotionNode = viewport.querySelector('[data-demo-anchor="emotion-chart"]') as HTMLElement | null;
    const streaksNode = viewport.querySelector('[data-demo-anchor="streaks"]') as HTMLElement | null;

    if (!avatarNode || !emotionNode || !streaksNode) {
      viewport.scrollTop = 0;
      return;
    }

    const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const avatarTop = avatarNode.offsetTop;
    const emotionTop = emotionNode.offsetTop;
    const streaksTop = streaksNode.offsetTop;

    const startScroll = Math.max(0, avatarTop - 32);
    const emotionFocusScroll = Math.max(startScroll + 60, emotionTop - viewport.clientHeight * 0.28);
    const finalScroll = Math.min(
      maxScroll,
      Math.max(emotionFocusScroll + 80, streaksTop - viewport.clientHeight * 0.5),
    );

    let rafId = 0;
    const animationStart = performance.now();

    const tick = (now: number) => {
      const elapsed = now - animationStart;

      if (elapsed <= INITIAL_PAUSE_MS) {
        viewport.scrollTop = startScroll;
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min(1, (elapsed - INITIAL_PAUSE_MS) / SCROLL_DURATION_MS);
      const eased = easeInOutCubic(progress);

      // Coreografía en dos tramos para mantener avatar/progreso al inicio,
      // luego enfocar Emotion Chart y terminar mostrando streaks.
      if (eased <= 0.58) {
        const t = eased / 0.58;
        viewport.scrollTop = startScroll + (emotionFocusScroll - startScroll) * t;
      } else {
        const t = (eased - 0.58) / 0.42;
        viewport.scrollTop = emotionFocusScroll + (finalScroll - emotionFocusScroll) * t;
      }

      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isReady, prefersReducedMotion]);

  return (
    <section
      className={`${styles.scenePanel} ${styles.scenePanelSingle} ${styles.sceneDashboard}`}
      data-light-scope="dashboard-v3"
    >
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

function HeroPhoneShowcase() {
  useEffect(() => {
    setDashboardDemoModeEnabled(true);
    return () => {
      setDashboardDemoModeEnabled(false);
    };
  }, []);

  return (
    <PhoneFrame>
      <DashboardOnlyScene />
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
          <p>Demo móvil del dashboard con estado mock limpio y recorrido visual enfocado.</p>
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

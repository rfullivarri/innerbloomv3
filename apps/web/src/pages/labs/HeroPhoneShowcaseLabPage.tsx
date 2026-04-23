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

function easeInOut(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function useDashboardScrollProgress(isReady: boolean) {
  const prefersReducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion || !isReady) {
      setProgress(0);
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const movementElapsed = Math.max(0, elapsed - INITIAL_PAUSE_MS);
      const nextProgress = Math.min(1, movementElapsed / SCROLL_DURATION_MS);
      setProgress(nextProgress);

      if (nextProgress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isReady, prefersReducedMotion]);

  return prefersReducedMotion || !isReady ? 0 : easeInOut(progress);
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
  scrollProgress,
  onReady,
}: {
  scrollProgress: number;
  onReady: () => void;
}) {
  const { language } = usePostLoginLanguage();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const readyReportedRef = useRef(false);
  const scrollRangeRef = useRef({ start: 0, end: 0 });
  const section = useMemo(
    () => getDashboardSectionConfig('dashboard', '/dashboard', language),
    [language],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const { start, end } = scrollRangeRef.current;
    viewport.scrollTop = start + (end - start) * scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || readyReportedRef.current) return;

    const hasCriticalBlocks = () => {
      const avatar = viewport.querySelector<HTMLElement>('[data-demo-anchor="overall-progress"]');
      const emotionChart = viewport.querySelector<HTMLElement>('[data-demo-anchor="emotion-chart"]');
      const streaks = viewport.querySelector<HTMLElement>('[data-demo-anchor="streaks"]');
      if (!avatar || !emotionChart || !streaks) {
        return false;
      }

      const viewportRect = viewport.getBoundingClientRect();
      const resolveTop = (element: HTMLElement) =>
        element.getBoundingClientRect().top - viewportRect.top + viewport.scrollTop;
      const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      const avatarTop = resolveTop(avatar);
      const emotionTop = resolveTop(emotionChart);
      const streakTop = resolveTop(streaks);
      const start = Math.max(0, Math.min(maxScroll, avatarTop - 18));
      const endTarget = Math.max(
        emotionTop - viewport.clientHeight * 0.42,
        streakTop - viewport.clientHeight * 0.28,
      );
      const end = Math.max(start, Math.min(maxScroll, endTarget));
      scrollRangeRef.current = { start, end };
      viewport.scrollTop = start;

      return true;
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
  const [dashboardReady, setDashboardReady] = useState(false);
  const scrollProgress = useDashboardScrollProgress(dashboardReady);

  useEffect(() => {
    setDashboardDemoModeEnabled(true);
    return () => {
      setDashboardDemoModeEnabled(false);
    };
  }, []);

  return (
    <PhoneFrame>
      <RealDashboardScene scrollProgress={scrollProgress} onReady={() => setDashboardReady(true)} />
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
            Iteración del experimento móvil enfocada solo en el dashboard demo, con encuadre deliberado y scroll
            suave para mostrar señales clave de progreso.
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

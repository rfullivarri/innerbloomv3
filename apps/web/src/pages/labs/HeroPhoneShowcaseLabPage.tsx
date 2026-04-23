import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { setDashboardDemoModeEnabled } from '../../lib/demoMode';
import { DemoDashboardOverviewScene } from '../../components/demo/DemoDashboardOverviewScene';
import styles from './HeroPhoneShowcaseLabPage.module.css';

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
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const readyReportedRef = useRef(false);
  const scrollRangeRef = useRef({ start: 0, end: 0 });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const { start, end } = scrollRangeRef.current;
    viewport.scrollTop = start + (end - start) * scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || readyReportedRef.current) return;

    let intervalId = 0;

    const resolveIfReady = () => {
      const overallProgress = viewport.querySelector<HTMLElement>('[data-demo-anchor="overall-progress"]');
      const emotionChart = viewport.querySelector<HTMLElement>('[data-demo-anchor="emotion-chart"]');
      const streaks = viewport.querySelector<HTMLElement>('[data-demo-anchor="streaks"]');
      if (!overallProgress || !emotionChart || !streaks) return false;

      const viewportRect = viewport.getBoundingClientRect();
      const resolveTop = (element: HTMLElement) =>
        element.getBoundingClientRect().top - viewportRect.top + viewport.scrollTop;

      const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      const overallTop = resolveTop(overallProgress);
      const emotionTop = resolveTop(emotionChart);
      const streakTop = resolveTop(streaks);
      const start = Math.max(0, Math.min(maxScroll, overallTop - 18));
      const endTarget = Math.max(
        emotionTop - viewport.clientHeight * 0.42,
        streakTop - viewport.clientHeight * 0.28,
      );
      const end = Math.max(start, Math.min(maxScroll, endTarget));

      scrollRangeRef.current = { start, end };
      viewport.scrollTop = start;

      readyReportedRef.current = true;
      onReady();
      return true;
    };

    if (!resolveIfReady()) {
      intervalId = window.setInterval(() => {
        if (resolveIfReady()) {
          window.clearInterval(intervalId);
        }
      }, 80);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [onReady]);

  return (
    <section
      className={`${styles.scenePanel} ${styles.scenePanelSingle} ${styles.sceneDashboard}`}
      data-light-scope="dashboard-v3"
    >
      <div ref={viewportRef} className={styles.realViewport}>
        <div className={`${styles.realSceneScale} ${styles.dashboardSceneScale}`}>
          <DemoDashboardOverviewScene gameMode="flow" />
        </div>
      </div>
    </section>
  );
}

function HeroPhoneShowcase() {
  const [dashboardReady, setDashboardReady] = useState(false);
  const [demoDataReady, setDemoDataReady] = useState(false);
  const scrollProgress = useDashboardScrollProgress(dashboardReady);

  useEffect(() => {
    setDashboardDemoModeEnabled(true);
    setDemoDataReady(true);
    return () => {
      setDemoDataReady(false);
      setDashboardDemoModeEnabled(false);
    };
  }, []);

  return (
    <PhoneFrame>
      {demoDataReady ? (
        <RealDashboardScene scrollProgress={scrollProgress} onReady={() => setDashboardReady(true)} />
      ) : (
        <section
          className={`${styles.scenePanel} ${styles.scenePanelSingle} ${styles.sceneDashboard}`}
          data-light-scope="dashboard-v3"
          aria-hidden
        />
      )}
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

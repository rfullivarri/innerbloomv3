import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { setDashboardDemoModeEnabled } from "../../lib/demoMode";
import { OFFICIAL_DESIGN_TOKENS } from "../../content/officialDesignTokens";
import { DemoDashboardOverviewScene } from "../demo/DemoDashboardOverviewScene";
import styles from "./HeroPhoneShowcase.module.css";

const INITIAL_TOP_PAUSE_MS = 500;
const SCROLL_DOWN_DURATION_MS = 4500;
const LOOP_BOTTOM_PAUSE_MS = 1600;
const LOOP_SPLASH_DURATION_MS = 1300;
const RESET_TO_TOP_DURATION_MS = 300;
const LOOP_TOP_PAUSE_MS = 350;
const DASHBOARD_LOOP_DURATION_MS =
  INITIAL_TOP_PAUSE_MS +
  SCROLL_DOWN_DURATION_MS +
  LOOP_BOTTOM_PAUSE_MS +
  LOOP_SPLASH_DURATION_MS +
  RESET_TO_TOP_DURATION_MS +
  LOOP_TOP_PAUSE_MS;

function smoothProgress(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

function resolveDashboardProgress(elapsedInLoop: number) {
  if (elapsedInLoop < INITIAL_TOP_PAUSE_MS) {
    return 0;
  }
  if (elapsedInLoop < INITIAL_TOP_PAUSE_MS + SCROLL_DOWN_DURATION_MS) {
    const downElapsed = elapsedInLoop - INITIAL_TOP_PAUSE_MS;
    return smoothProgress(downElapsed / SCROLL_DOWN_DURATION_MS);
  }
  if (
    elapsedInLoop <
    INITIAL_TOP_PAUSE_MS + SCROLL_DOWN_DURATION_MS + LOOP_BOTTOM_PAUSE_MS
  ) {
    return 1;
  }
  if (
    elapsedInLoop <
    INITIAL_TOP_PAUSE_MS +
      SCROLL_DOWN_DURATION_MS +
      LOOP_BOTTOM_PAUSE_MS +
      LOOP_SPLASH_DURATION_MS
  ) {
    return 0;
  }
  if (
    elapsedInLoop <
    INITIAL_TOP_PAUSE_MS +
      SCROLL_DOWN_DURATION_MS +
      LOOP_BOTTOM_PAUSE_MS +
      LOOP_SPLASH_DURATION_MS +
      RESET_TO_TOP_DURATION_MS
  ) {
    const resetElapsed =
      elapsedInLoop -
      INITIAL_TOP_PAUSE_MS -
      SCROLL_DOWN_DURATION_MS -
      LOOP_BOTTOM_PAUSE_MS -
      LOOP_SPLASH_DURATION_MS;
    return 1 - resetElapsed / RESET_TO_TOP_DURATION_MS;
  }
  return 0;
}

type HeroShowcasePhase = "dashboard" | "splash";

function useHeroShowcaseTimeline({
  dashboardReady,
  isActive,
  reducedMotion,
}: {
  dashboardReady: boolean;
  isActive: boolean;
  reducedMotion: boolean;
}) {
  const [dashboardProgress, setDashboardProgress] = useState(0);
  const [phase, setPhase] = useState<HeroShowcasePhase>("dashboard");
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!dashboardReady || reducedMotion) {
      setDashboardProgress(0);
      setPhase("dashboard");
      startedAtRef.current = null;
      pausedAtRef.current = null;
      return;
    }

    const now = performance.now();
    if (startedAtRef.current == null) {
      startedAtRef.current = now;
    }

    if (isActive) {
      if (pausedAtRef.current != null && startedAtRef.current != null) {
        startedAtRef.current += now - pausedAtRef.current;
      }
      pausedAtRef.current = null;
    } else {
      if (pausedAtRef.current == null) {
        pausedAtRef.current = now;
      }
      return;
    }

    let rafId = 0;
    const tick = (currentNow: number) => {
      const startedAt = startedAtRef.current ?? currentNow;
      const elapsed = Math.max(0, currentNow - startedAt);
      const elapsedInLoop = elapsed % DASHBOARD_LOOP_DURATION_MS;
      const splashStart =
        INITIAL_TOP_PAUSE_MS + SCROLL_DOWN_DURATION_MS + LOOP_BOTTOM_PAUSE_MS;
      const splashEnd = splashStart + LOOP_SPLASH_DURATION_MS;
      const nextPhase: HeroShowcasePhase =
        elapsedInLoop >= splashStart && elapsedInLoop < splashEnd
          ? "splash"
          : "dashboard";
      setPhase(nextPhase);
      setDashboardProgress(resolveDashboardProgress(elapsedInLoop));
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [dashboardReady, isActive, reducedMotion]);

  return {
    dashboardProgress: !dashboardReady || reducedMotion ? 0 : dashboardProgress,
    phase: !dashboardReady || reducedMotion ? "dashboard" : phase,
  };
}

function PhoneFrame({
  children,
  frameRef,
}: {
  children: ReactNode;
  frameRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={frameRef} className={styles.phoneFrame}>
      <div className={styles.phoneIsland} aria-hidden>
        <span className={styles.phoneIslandLens} />
      </div>
      <div className={styles.phoneScreen}>{children}</div>
    </div>
  );
}

function PhoneTopBar({ sectionTitle }: { sectionTitle: string }) {
  return (
    <header className={styles.phoneTopBar}>
      <div className={styles.phoneTopBarCopy}>
        <p className={styles.phoneTopBarBrand}>INNERBLOOM</p>
        <h2 className={styles.phoneTopBarTitle}>{sectionTitle}</h2>
      </div>
      <button
        type="button"
        className={styles.phoneTopBarMenu}
        aria-label={`${sectionTitle} menu`}
        tabIndex={-1}
      >
        <span aria-hidden />
        <span aria-hidden />
        <span aria-hidden />
      </button>
    </header>
  );
}

const purpleAfternoon =
  OFFICIAL_DESIGN_TOKENS.gradients.find(
    (gradient) => gradient.name === "purple_afternoon",
  ) ?? OFFICIAL_DESIGN_TOKENS.gradients[0];
const purpleAfternoonSolid =
  purpleAfternoon.stops[0]?.trim().split(" ")[0] ?? "#000c40";

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
    let attempts = 0;
    const maxAttempts = 45;

    const reportReady = () => {
      if (readyReportedRef.current) return;
      readyReportedRef.current = true;
      onReady();
    };

    const resolveIfReady = () => {
      attempts += 1;
      const overallProgress = viewport.querySelector<HTMLElement>(
        '[data-demo-anchor="overall-progress"]',
      );
      const emotionChart = viewport.querySelector<HTMLElement>(
        '[data-demo-anchor="emotion-chart"]',
      );
      const streaks = viewport.querySelector<HTMLElement>(
        '[data-demo-anchor="streaks"]',
      );
      if (!overallProgress || !emotionChart || !streaks) return false;

      const viewportRect = viewport.getBoundingClientRect();
      const resolveTop = (element: HTMLElement) =>
        element.getBoundingClientRect().top -
        viewportRect.top +
        viewport.scrollTop;

      const maxScroll = Math.max(
        0,
        viewport.scrollHeight - viewport.clientHeight,
      );
      if (maxScroll > 0) {
        const overallTop = resolveTop(overallProgress);
        const streakTop = resolveTop(streaks);
        const minTravel = Math.max(
          Math.min(viewport.clientHeight * 0.58, maxScroll),
          Math.min(160, maxScroll),
        );

        let start = Math.max(0, Math.min(maxScroll, overallTop - 18));
        const endTarget = streakTop - viewport.clientHeight * 0.14;
        let end = Math.max(start, Math.min(maxScroll, endTarget));

        if (end - start < minTravel)
          end = Math.min(maxScroll, start + minTravel);
        if (end - start < minTravel) start = Math.max(0, end - minTravel);
        if (end <= start) {
          start = 0;
          end = maxScroll;
        }

        scrollRangeRef.current = { start, end };
        viewport.scrollTop = start;
        reportReady();
        return true;
      }

      if (attempts >= maxAttempts && maxScroll > 0) {
        scrollRangeRef.current = { start: 0, end: maxScroll };
        viewport.scrollTop = 0;
        reportReady();
        return true;
      }

      return false;
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
      className={`${styles.scenePanel} ${styles.sceneDashboard}`}
      data-light-scope="dashboard-v3"
    >
      <PhoneTopBar sectionTitle="Dashboard" />
      <div ref={viewportRef} className={styles.realViewport}>
        <div
          className={`${styles.mobileDashboardRoot} ${styles.heroFocusViewport}`}
        >
          <div className={styles.heroFocusContent}>
            <DemoDashboardOverviewScene gameMode="flow" />
          </div>
        </div>
      </div>
    </section>
  );
}

function LoopSplashScene() {
  const brandCharacters = "INNERBLOOM".split("");

  return (
    <section className={styles.loopSplashScene} aria-hidden>
      <div className={styles.loopSplashDepthGlow} />
      <div className={styles.loopSplashLockup}>
        <img
          src="/IB-COLOR-LOGO.png"
          alt=""
          className={styles.loopSplashFlower}
          loading="eager"
          decoding="async"
        />
        <p className={styles.loopSplashWordmark}>
          {brandCharacters.map((character, index) => (
            <span
              key={`${character}-${index}`}
              className={styles.loopSplashWordmarkLetter}
              style={{ "--letter-delay": `${index * 28}ms` } as CSSProperties}
            >
              {character}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

export function HeroPhoneShowcase() {
  const [dashboardReady, setDashboardReady] = useState(false);
  const [demoDataReady, setDemoDataReady] = useState(false);
  const [isHeroActive, setIsHeroActive] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const phoneFrameRef = useRef<HTMLDivElement | null>(null);
  const { dashboardProgress, phase } = useHeroShowcaseTimeline({
    dashboardReady,
    isActive: isHeroActive,
    reducedMotion: prefersReducedMotion,
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function")
      return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setDashboardDemoModeEnabled(true);
    setDemoDataReady(true);
    return () => {
      setDemoDataReady(false);
      setDashboardDemoModeEnabled(false);
    };
  }, []);

  useEffect(() => {
    const target = phoneFrameRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeroActive(entry.isIntersecting && entry.intersectionRatio > 0.35);
      },
      { threshold: [0, 0.35, 1] },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <PhoneFrame frameRef={phoneFrameRef}>
      <div
        className={styles.phoneScreenBackground}
        style={{ "--hero-purple-afternoon": purpleAfternoonSolid } as CSSProperties}
      />
      {demoDataReady ? (
        <RealDashboardScene
          scrollProgress={dashboardProgress}
          onReady={() => setDashboardReady(true)}
        />
      ) : (
        <section
          className={`${styles.scenePanel} ${styles.sceneDashboard}`}
          data-light-scope="dashboard-v3"
          aria-hidden
        />
      )}
      {phase === "splash" ? <LoopSplashScene /> : null}
    </PhoneFrame>
  );
}

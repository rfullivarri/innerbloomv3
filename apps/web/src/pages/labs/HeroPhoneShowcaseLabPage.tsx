import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { setDashboardDemoModeEnabled } from "../../lib/demoMode";
import { DemoDashboardOverviewScene } from "../../components/demo/DemoDashboardOverviewScene";
import {
  RewardsSection,
  type RewardsSectionDemoControls,
} from "../../components/dashboard-v3/RewardsSection";
import {
  getDemoLogrosData,
  getDemoLogrosPreviewByTaskId,
} from "../../data/demoLogrosData";
import { usePostLoginLanguage } from "../../i18n/postLoginLanguage";
import styles from "./HeroPhoneShowcaseLabPage.module.css";

const INITIAL_TOP_PAUSE_MS = 500;
const SCROLL_DOWN_DURATION_MS = 4500;
const LOOP_BOTTOM_PAUSE_MS = 950;
const RESET_TO_TOP_DURATION_MS = 300;
const LOOP_TOP_PAUSE_MS = 350;
const DASHBOARD_LOOP_DURATION_MS =
  INITIAL_TOP_PAUSE_MS +
  SCROLL_DOWN_DURATION_MS +
  LOOP_BOTTOM_PAUSE_MS +
  RESET_TO_TOP_DURATION_MS +
  LOOP_TOP_PAUSE_MS;

const DASHBOARD_TO_LOGROS_DURATION_MS = 820;
const LOGROS_CAROUSEL_DURATION_MS = 5800;
const LOGROS_TO_DASHBOARD_DURATION_MS = 820;
const HERO_LOOP_DURATION_MS =
  DASHBOARD_LOOP_DURATION_MS +
  DASHBOARD_TO_LOGROS_DURATION_MS +
  LOGROS_CAROUSEL_DURATION_MS +
  LOGROS_TO_DASHBOARD_DURATION_MS;

const HERO_TASK_SEQUENCE = [
  "task-water",
  "task-dinner-before-22",
  "task-gym",
] as const;
const HERO_BODY_CARD_UNLOCKED_1 = HERO_TASK_SEQUENCE[0];
const HERO_BODY_CARD_UNLOCKED_2 = HERO_TASK_SEQUENCE[1];
const HERO_BODY_CARD_BLOCKED_1 = HERO_TASK_SEQUENCE[2];

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
      RESET_TO_TOP_DURATION_MS
  ) {
    const resetElapsed =
      elapsedInLoop -
      INITIAL_TOP_PAUSE_MS -
      SCROLL_DOWN_DURATION_MS -
      LOOP_BOTTOM_PAUSE_MS;
    return 1 - resetElapsed / RESET_TO_TOP_DURATION_MS;
  }
  return 0;
}

type HeroPhase = "dashboard" | "to-logros" | "logros" | "to-dashboard";

function useHeroShowcaseTimeline(isReady: boolean) {
  const prefersReducedMotion = useReducedMotion();
  const [timeline, setTimeline] = useState<{
    phase: HeroPhase;
    dashboardProgress: number;
    trackProgress: number;
  }>({
    phase: "dashboard",
    dashboardProgress: 0,
    trackProgress: 0,
  });

  useEffect(() => {
    if (prefersReducedMotion || !isReady) {
      setTimeline({
        phase: "dashboard",
        dashboardProgress: 0,
        trackProgress: 0,
      });
      return;
    }

    let rafId = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const elapsedInLoop = (now - startedAt) % HERO_LOOP_DURATION_MS;

      if (elapsedInLoop < DASHBOARD_LOOP_DURATION_MS) {
        setTimeline({
          phase: "dashboard",
          dashboardProgress: resolveDashboardProgress(elapsedInLoop),
          trackProgress: 0,
        });
      } else if (
        elapsedInLoop <
        DASHBOARD_LOOP_DURATION_MS + DASHBOARD_TO_LOGROS_DURATION_MS
      ) {
        const transitionElapsed = elapsedInLoop - DASHBOARD_LOOP_DURATION_MS;
        setTimeline({
          phase: "to-logros",
          dashboardProgress: 0,
          trackProgress: smoothProgress(
            transitionElapsed / DASHBOARD_TO_LOGROS_DURATION_MS,
          ),
        });
      } else if (
        elapsedInLoop <
        DASHBOARD_LOOP_DURATION_MS +
          DASHBOARD_TO_LOGROS_DURATION_MS +
          LOGROS_CAROUSEL_DURATION_MS
      ) {
        setTimeline({
          phase: "logros",
          dashboardProgress: 0,
          trackProgress: 1,
        });
      } else {
        const transitionElapsed =
          elapsedInLoop -
          DASHBOARD_LOOP_DURATION_MS -
          DASHBOARD_TO_LOGROS_DURATION_MS -
          LOGROS_CAROUSEL_DURATION_MS;
        setTimeline({
          phase: "to-dashboard",
          dashboardProgress: 0,
          trackProgress:
            1 -
            smoothProgress(transitionElapsed / LOGROS_TO_DASHBOARD_DURATION_MS),
        });
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isReady, prefersReducedMotion]);

  return prefersReducedMotion || !isReady
    ? { phase: "dashboard" as const, dashboardProgress: 0, trackProgress: 0 }
    : timeline;
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.phoneFrame}>
      <div className={styles.phoneIsland} aria-hidden>
        <span className={styles.phoneIslandLens} />
      </div>
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
      if (maxScroll <= 0) {
        return false;
      }
      const overallTop = resolveTop(overallProgress);
      const emotionTop = resolveTop(emotionChart);
      const streakTop = resolveTop(streaks);
      const minTravel = Math.max(
        Math.min(viewport.clientHeight * 0.58, maxScroll),
        Math.min(160, maxScroll),
      );
      let start = Math.max(0, Math.min(maxScroll, overallTop - 18));
      const endTarget = Math.max(
        emotionTop - viewport.clientHeight * 0.38,
        streakTop - viewport.clientHeight * 0.14,
      );
      let end = Math.max(start, Math.min(maxScroll, endTarget));
      if (end - start < minTravel) {
        end = Math.min(maxScroll, start + minTravel);
      }
      if (end - start < minTravel) {
        start = Math.max(0, end - minTravel);
      }
      if (end <= start) {
        start = 0;
        end = maxScroll;
      }

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
      className={`${styles.scenePanel} ${styles.sceneDashboard}`}
      data-light-scope="dashboard-v3"
    >
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

function HeroLogrosScene({
  isActive,
  cycleKey,
  onReady,
}: {
  isActive: boolean;
  cycleKey: number;
  onReady: () => void;
}) {
  const { language } = usePostLoginLanguage();
  const sceneRef = useRef<HTMLElement | null>(null);
  const controlsRef = useRef<RewardsSectionDemoControls | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [controlsReady, setControlsReady] = useState(false);
  const readyReportedRef = useRef(false);
  const readinessResolvedRef = useRef(false);

  const demoConfig = useMemo(
    () => ({
      disableRemote: true,
      forceAchievementsViewMode: "carousel" as const,
      mockPreviewAchievementByTaskId: getDemoLogrosPreviewByTaskId(language),
      anchors: {
        shelves: "logros-shelves",
        carouselTrack: "logros-carousel-track",
        carouselStructure: "logros-carousel-structure",
        pillarSelector: "logros-pillar-selector",
        achievedCard: "logros-achieved-card",
        achievedCardTaskId: HERO_BODY_CARD_UNLOCKED_1,
        blockedCardTaskId: HERO_BODY_CARD_BLOCKED_1,
      },
      controls: {
        onReady: (controls: RewardsSectionDemoControls) => {
          controlsRef.current = controls;
          setControlsReady(true);
        },
      },
    }),
    [language],
  );

  useEffect(() => {
    let intervalId = 0;

    const resolveTrackReady = () => {
      const sceneRoot = sceneRef.current;
      const controls = controlsRef.current;
      const track = sceneRoot?.querySelector<HTMLElement>(
        '[data-demo-anchor="logros-carousel-track"]',
      );
      const pillarSelector = sceneRoot?.querySelector<HTMLElement>(
        '[data-demo-anchor="logros-pillar-selector"]',
      );
      const cards = track?.querySelectorAll<HTMLElement>(
        "[data-achievement-carousel-index]",
      );
      const firstCard = sceneRoot?.querySelector<HTMLElement>(
        '[data-demo-anchor="logros-achieved-card"]',
      );
      const blockedCard = sceneRoot?.querySelector<HTMLElement>(
        '[data-demo-anchor="logros-blocked-card"]',
      );
      const isBodySelected = Boolean(
        pillarSelector?.querySelector<HTMLElement>(
          '[role="tab"][aria-selected="true"]',
        )?.textContent?.toLowerCase().includes("body") ||
          pillarSelector?.querySelector<HTMLElement>(
            '[role="tab"][aria-selected="true"]',
          )?.textContent
            ?.toLowerCase()
            .includes("cuerpo"),
      );

      if (!sceneRoot || !controlsReady || !controls || !track || !cards) {
        return false;
      }

      if (cards.length < 3 || !firstCard || !blockedCard) {
        return false;
      }

      const trackRect = track.getBoundingClientRect();
      const firstRect = firstCard.getBoundingClientRect();
      const hasLayout =
        trackRect.width > 0 && firstRect.width > 0 && firstRect.height > 0;
      if (!hasLayout) {
        return false;
      }

      if (!readinessResolvedRef.current) {
        controls.closeAllOverlays();
        controls.selectPillar("BODY");
        controls.focusCarouselCard(HERO_BODY_CARD_UNLOCKED_1);
        readinessResolvedRef.current = true;
        return false;
      }

      const horizontallyVisible =
        firstRect.right > trackRect.left + 8 &&
        firstRect.left < trackRect.right - 8;
      const hasFocusableFirstCard =
        firstCard.matches("button") &&
        !firstCard.hasAttribute("disabled") &&
        firstCard.tabIndex >= 0;
      if (!isBodySelected || !horizontallyVisible || !hasFocusableFirstCard) {
        return false;
      }

      setSceneReady(true);
      if (!readyReportedRef.current) {
        readyReportedRef.current = true;
        onReady();
      }
      return true;
    };

    if (!resolveTrackReady()) {
      intervalId = window.setInterval(() => {
        if (resolveTrackReady()) {
          window.clearInterval(intervalId);
        }
      }, 80);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [controlsReady, onReady]);

  useEffect(() => {
    if (!isActive || !sceneReady) {
      return;
    }

    const controls = controlsRef.current;
    if (!controls) {
      return;
    }

    controls.closeAllOverlays();
    controls.focusCarouselCard(HERO_BODY_CARD_UNLOCKED_1);

    const segment = LOGROS_CAROUSEL_DURATION_MS / 3;
    const t1 = window.setTimeout(
      () => controls.focusCarouselCard(HERO_BODY_CARD_UNLOCKED_2),
      segment * 0.9,
    );
    const t2 = window.setTimeout(
      () => controls.focusCarouselCard(HERO_BODY_CARD_BLOCKED_1),
      segment * 1.95,
    );

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [cycleKey, isActive, sceneReady]);

  return (
    <section
      ref={sceneRef}
      className={`${styles.scenePanel} ${styles.sceneLogros}`}
      data-light-scope="dashboard-v3"
    >
      <div className={styles.logrosViewport}>
        <div className={styles.logrosHeroOnly}>
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

function HeroPhoneShowcase() {
  const [dashboardReady, setDashboardReady] = useState(false);
  const [logrosReady, setLogrosReady] = useState(false);
  const [demoDataReady, setDemoDataReady] = useState(false);
  const [logrosCycleKey, setLogrosCycleKey] = useState(0);
  const { phase, dashboardProgress, trackProgress } =
    useHeroShowcaseTimeline(dashboardReady && logrosReady);
  const previousPhaseRef = useRef<HeroPhase>("dashboard");

  useEffect(() => {
    setDashboardDemoModeEnabled(true);
    setDemoDataReady(true);
    return () => {
      setDemoDataReady(false);
      setDashboardDemoModeEnabled(false);
    };
  }, []);

  useEffect(() => {
    if (previousPhaseRef.current !== "logros" && phase === "logros") {
      setLogrosCycleKey((value) => value + 1);
    }
    previousPhaseRef.current = phase;
  }, [phase]);

  return (
    <PhoneFrame>
      {demoDataReady ? (
        <div
          className={styles.sceneTrack}
          style={{ transform: `translate3d(${-50 * trackProgress}%, 0, 0)` }}
        >
          <RealDashboardScene
            scrollProgress={dashboardProgress}
            onReady={() => setDashboardReady(true)}
          />
          <HeroLogrosScene
            isActive={phase === "logros"}
            cycleKey={logrosCycleKey}
            onReady={() => setLogrosReady(true)}
          />
        </div>
      ) : (
        <section
          className={`${styles.scenePanel} ${styles.sceneDashboard}`}
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
            Iteración del experimento móvil enfocada en dashboard + logros,
            manteniendo el recorrido actual y sumando una escena de carrusel
            BODY en loop horizontal premium.
          </p>
          <div className={styles.ctaRow}>
            <Link className={styles.primaryCta} to="/onboarding">
              Comenzar ahora
            </Link>
            <a className={styles.secondaryCta} href="/landing-v2#highlights">
              Ver dashboard
            </a>
          </div>
        </div>

        <div className={styles.visualCol}>
          <HeroPhoneShowcase />
        </div>
      </section>
    </main>
  );
}

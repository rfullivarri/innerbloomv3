import { useEffect, useId, useMemo, useRef, useState } from "react";

import styles from "./AdaptiveJourneyGraphic.module.css";

type Phase = "idle" | "initial" | "energyDrop" | "intervention" | "recovery" | "outcome";
type GraphicLanguage = "es" | "en";

const graphCopy = {
  es: {
    title: "Comparación entre una rutina rígida y el sistema adaptativo de Innerbloom",
    description:
      "Comparación entre una rutina rígida y el sistema adaptativo de Innerbloom. Ambas comienzan con la misma energía y atraviesan la misma caída. La rutina rígida mantiene la exigencia hasta romperse. Innerbloom analiza el momento, recalibra, sostiene la continuidad e impulsa la recuperación.",
    samePerson: ["MISMA PERSONA", "MISMA ENERGÍA", "MISMO MOMENTO"],
    rigidTitle: "RUTINA RÍGIDA",
    adaptiveTitle: "SISTEMA ADAPTATIVO",
    energyDrop: "BAJA TU ENERGÍA",
    demandsSame: ["TE EXIGE", "LO MISMO"],
    triesAgain: ["VUELVES", "A INTENTAR"],
    breaks: "SE ROMPE",
    analyzes: "ANALIZA",
    recalibrates: "RECALIBRA",
    supports: "TE DA SOPORTE",
    returnsWithSupport: ["VUELVES", "A INTENTAR"],
    propels: "TE IMPULSA",
  },
  en: {
    title: "Comparison between a rigid routine and Innerbloom's adaptive system",
    description:
      "Comparison between a rigid routine and Innerbloom's adaptive system. Both start with the same energy and go through the same drop. The rigid routine keeps demanding the same until it breaks. Innerbloom analyzes the moment, recalibrates, supports continuity, and propels recovery.",
    samePerson: ["SAME PERSON", "SAME ENERGY", "SAME MOMENT"],
    rigidTitle: "RIGID ROUTINE",
    adaptiveTitle: "ADAPTIVE SYSTEM",
    energyDrop: "ENERGY DROPS",
    demandsSame: ["DEMANDS", "THE SAME"],
    triesAgain: ["YOU TRY", "AGAIN"],
    breaks: "BREAKS",
    analyzes: "ANALYZES",
    recalibrates: "RECALIBRATES",
    supports: "SUPPORTS YOU",
    returnsWithSupport: ["YOU TRY", "AGAIN"],
    propels: "PROPELS",
  },
} as const;

const phaseTimeline: Array<{ phase: Exclude<Phase, "idle">; duration: number }> = [
  { phase: "initial", duration: 1200 },
  { phase: "energyDrop", duration: 1200 },
  { phase: "intervention", duration: 1300 },
  { phase: "recovery", duration: 1250 },
  { phase: "outcome", duration: 1150 },
];

const points = {
  start: { x: 90 },
  energyDropStart: { x: 260 },
  lowEnergy: { x: 405 },
  systemResponse: { x: 480 },
  recovery: { x: 650 },
  outcome: { x: 800 },
} as const;

const rigidY = {
  initial: 120,
  low: 210,
  retry: 176,
  broken: 260,
} as const;

const adaptiveY = {
  initial: 350,
  low: 440,
  recalibrated: 410,
  retry: 378,
  sustained: 360,
  outcome: 302,
} as const;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

export function AdaptiveJourneyGraphic({ language = "es" }: { language?: GraphicLanguage }) {
  const id = useId().replace(/:/g, "");
  const copy = graphCopy[language];
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hasPlayedRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>(prefersReducedMotion ? "outcome" : "idle");

  useEffect(() => {
    if (prefersReducedMotion) {
      setPhase("outcome");
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || hasPlayedRef.current) {
      return undefined;
    }

    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    let timers: Array<number> = [];

    const startTimeline = () => {
      if (hasPlayedRef.current) {
        return;
      }

      hasPlayedRef.current = true;
      let elapsed = 0;
      timers = phaseTimeline.map(({ phase: nextPhase, duration }) => {
        const timer = window.setTimeout(() => setPhase(nextPhase), elapsed);
        elapsed += duration;
        return timer;
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          startTimeline();
          observer.disconnect();
        }
      },
      { threshold: 0.36 },
    );

    observer.observe(root);

    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [prefersReducedMotion]);

  const ids = useMemo(
    () => ({
      title: `adaptive-journey-title-${id}`,
      description: `adaptive-journey-description-${id}`,
      rigidGradient: `rigid-gradient-${id}`,
      adaptiveGradient: `adaptive-gradient-${id}`,
      adaptiveLineGradient: `adaptive-line-gradient-${id}`,
      rigidGlow: `rigid-glow-${id}`,
      adaptiveGlow: `adaptive-glow-${id}`,
      flowerGlow: `flower-glow-${id}`,
      dropArrow: `drop-arrow-${id}`,
      adaptiveDropArrow: `adaptive-drop-arrow-${id}`,
    }),
    [id],
  );

  return (
    <div
      ref={rootRef}
      className={styles.graphic}
      data-phase={phase}
      data-reduced-motion={prefersReducedMotion ? "true" : undefined}
    >
      <svg
        viewBox="0 0 900 520"
        role="img"
        aria-labelledby={`${ids.title} ${ids.description}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <title id={ids.title}>{copy.title}</title>
        <desc id={ids.description}>{copy.description}</desc>

        <defs>
          <linearGradient id={ids.rigidGradient} x1="90" x2="800" y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff8a7a" />
            <stop offset="54%" stopColor="#ff5e6f" />
            <stop offset="100%" stopColor="#ff3f55" stopOpacity="0.46" />
          </linearGradient>
          <linearGradient id={ids.adaptiveGradient} x1="90" x2="800" y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#b178ff" />
            <stop offset="48%" stopColor="#5fa7ff" />
            <stop offset="76%" stopColor="#21d8e8" />
            <stop offset="100%" stopColor="#40f1a3" />
          </linearGradient>
          <linearGradient id={ids.adaptiveLineGradient} x1="90" x2="800" y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#b178ff" />
            <stop offset="44%" stopColor="#8c72ff" />
            <stop offset="64%" stopColor="#32b4ff" />
            <stop offset="100%" stopColor="#38f0a5" />
          </linearGradient>
          <filter id={ids.rigidGlow} x="-10%" y="-110%" width="120%" height="320%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur"
              result="glow"
              type="matrix"
              values="1 0 0 0 0.95 0 0.28 0 0 0.12 0 0 0.22 0 0.18 0 0 0 0.55 0"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={ids.adaptiveGlow} x="-10%" y="-110%" width="120%" height="320%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur"
              result="glow"
              type="matrix"
              values="0.44 0 0 0 0.2 0 0.76 0 0 0.42 0 0 1 0 0.86 0 0 0 0.52 0"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={ids.flowerGlow} x="-90%" y="-90%" width="280%" height="280%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              result="glow"
              type="matrix"
              values="0.64 0 0 0 0.28 0 0.38 0 0 0.1 0 0 1 0 0.82 0 0 0 0.56 0"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id={ids.dropArrow} viewBox="0 0 12 12" refX="9" refY="6" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M2 2 L10 6 L2 10 Z" fill="#ff6571" />
          </marker>
          <marker id={ids.adaptiveDropArrow} viewBox="0 0 12 12" refX="9" refY="6" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M2 2 L10 6 L2 10 Z" fill="#d3a2ff" />
          </marker>
        </defs>

        <rect className={styles.panel} x="18" y="18" width="864" height="484" rx="28" />
        <path className={styles.panelGlow} d="M56 260 H844" />
        <path className={styles.divider} d="M54 260 H846" />

        <g className={styles.samePerson} transform="translate(74 174)" aria-hidden="true">
          <circle cx="26" cy="13" r="10" />
          <circle cx="10" cy="22" r="8" />
          <circle cx="42" cy="22" r="8" />
          <path d="M6 44 C8 33 17 28 26 28 C35 28 44 33 46 44" />
          <path d="M0 44 C1 36 7 32 14 32" />
          <path d="M52 44 C51 36 45 32 38 32" />
          <text x="0" y="72">{copy.samePerson[0]}</text>
          <text x="0" y="94">{copy.samePerson[1]}</text>
          <text x="0" y="116">{copy.samePerson[2]}</text>
        </g>

        <g className={styles.trackTitle} transform="translate(52 66)">
          <text>{copy.rigidTitle}</text>
        </g>
        <g className={`${styles.trackTitle} ${styles.trackTitleAdaptive}`} transform="translate(52 326)">
          <text>{copy.adaptiveTitle}</text>
        </g>

        <g className={styles.dropCue} style={{ color: "#ff6571" }} transform="translate(0 0)">
          <text x="304" y="84">{copy.energyDrop}</text>
          <path d="M294 96 C328 114 356 164 397 194" markerEnd={`url(#${ids.dropArrow})`} />
        </g>
        <g className={`${styles.dropCue} ${styles.dropCueAdaptive}`} style={{ color: "#d3a2ff" }} transform="translate(0 230)">
          <text x="304" y="84">{copy.energyDrop}</text>
          <path d="M294 96 C328 114 356 164 397 194" markerEnd={`url(#${ids.adaptiveDropArrow})`} />
        </g>

        <g className={styles.rigidTrack}>
          <path
            className={styles.guidePath}
            d={`M${points.start.x} ${rigidY.initial} H${points.energyDropStart.x} C315 122 350 205 ${points.lowEnergy.x} ${rigidY.low} H520 C575 ${rigidY.low} 580 ${rigidY.retry} ${points.recovery.x} ${rigidY.retry} C710 178 742 230 ${points.outcome.x} ${rigidY.broken}`}
          />
          <path
            className={`${styles.fullTrace} ${styles.rigidFullTrace}`}
            d={`M${points.start.x} ${rigidY.initial} H${points.energyDropStart.x} C315 122 350 205 ${points.lowEnergy.x} ${rigidY.low} H520 C575 ${rigidY.low} 580 ${rigidY.retry} ${points.recovery.x} ${rigidY.retry} C710 178 742 230 ${points.outcome.x} ${rigidY.broken}`}
            stroke={`url(#${ids.rigidGradient})`}
            filter={`url(#${ids.rigidGlow})`}
            pathLength="1"
          />
          <path
            className={styles.initialSegment}
            d={`M${points.start.x} ${rigidY.initial} H${points.energyDropStart.x}`}
            stroke={`url(#${ids.rigidGradient})`}
            filter={`url(#${ids.rigidGlow})`}
            pathLength="1"
          />
          <path
            className={styles.dropSegment}
            d={`M${points.energyDropStart.x} ${rigidY.initial} C315 122 350 205 ${points.lowEnergy.x} ${rigidY.low}`}
            stroke={`url(#${ids.rigidGradient})`}
            filter={`url(#${ids.rigidGlow})`}
            pathLength="1"
          />
          <path
            className={styles.responseSegment}
            d={`M${points.lowEnergy.x} ${rigidY.low} H520`}
            stroke={`url(#${ids.rigidGradient})`}
            filter={`url(#${ids.rigidGlow})`}
            pathLength="1"
          />
          <path
            className={styles.recoverySegment}
            d={`M520 ${rigidY.low} C575 ${rigidY.low} 580 ${rigidY.retry} ${points.recovery.x} ${rigidY.retry}`}
            stroke={`url(#${ids.rigidGradient})`}
            filter={`url(#${ids.rigidGlow})`}
            pathLength="1"
          />
          <path
            className={styles.outcomeSegment}
            d={`M${points.recovery.x} ${rigidY.retry} C710 178 742 230 ${points.outcome.x} ${rigidY.broken}`}
            stroke={`url(#${ids.rigidGradient})`}
            filter={`url(#${ids.rigidGlow})`}
            pathLength="1"
          />
          <g className={styles.startNode} transform={`translate(${points.start.x} ${rigidY.initial})`}>
            <circle r="11" />
            <circle r="5" />
          </g>
          <g className={styles.rigidLabel} transform="translate(462 166)">
            <path d="M-42 18 V4 H42 V18" />
            <text textAnchor="middle">{copy.demandsSame[0]}</text>
            <text y="18" textAnchor="middle">{copy.demandsSame[1]}</text>
          </g>
          <g className={styles.rigidLabel} transform="translate(662 126)">
            <path d="M0 74 V34" />
            <text textAnchor="middle">{copy.triesAgain[0]}</text>
            <text y="18" textAnchor="middle">{copy.triesAgain[1]}</text>
          </g>
          <g className={styles.breakLabel} transform="translate(756 164)">
            <path d="M0 18 V58" />
            <text textAnchor="middle">{copy.breaks}</text>
          </g>
          <g className={styles.breakEnd} transform={`translate(${points.outcome.x} ${rigidY.broken})`} aria-hidden="true">
            <circle r="4.5" />
            <path d="M-16 -6 L-4 0" />
            <path d="M-12 7 L0 15" />
            <path d="M8 -2 L17 4" />
          </g>
          <g className={styles.retryNode} transform={`translate(${points.recovery.x} ${rigidY.retry})`}>
            <circle r="8" />
            <circle r="3.5" />
          </g>
          <g className={styles.fragments} transform="translate(802 255)" aria-hidden="true">
            <path d="M12 2 L20 8" />
            <path d="M26 16 L34 22" />
            <circle cx="30" cy="-4" r="2.4" />
            <circle cx="43" cy="12" r="2" />
          </g>
        </g>

        <g className={styles.adaptiveTrack}>
          <path
            className={styles.guidePath}
            d={`M${points.start.x} ${adaptiveY.initial} H${points.energyDropStart.x} C315 352 350 435 ${points.lowEnergy.x} ${adaptiveY.low} C430 438 456 436 ${points.systemResponse.x} 432 C520 426 548 416 575 ${adaptiveY.recalibrated} C610 392 628 382 ${points.recovery.x} ${adaptiveY.retry} C675 374 690 366 710 ${adaptiveY.sustained} C742 350 772 328 ${points.outcome.x} ${adaptiveY.outcome}`}
          />
          <path
            className={`${styles.fullTrace} ${styles.adaptiveFullTrace}`}
            d={`M${points.start.x} ${adaptiveY.initial} H${points.energyDropStart.x} C315 352 350 435 ${points.lowEnergy.x} ${adaptiveY.low} C430 438 456 436 ${points.systemResponse.x} 432 C520 426 548 416 575 ${adaptiveY.recalibrated} C610 392 628 382 ${points.recovery.x} ${adaptiveY.retry} C675 374 690 366 710 ${adaptiveY.sustained} C742 350 772 328 ${points.outcome.x} ${adaptiveY.outcome}`}
            stroke={`url(#${ids.adaptiveGradient})`}
            filter={`url(#${ids.adaptiveGlow})`}
            pathLength="1"
          />
          <path
            className={styles.initialSegment}
            d={`M${points.start.x} ${adaptiveY.initial} H${points.energyDropStart.x}`}
            stroke={`url(#${ids.adaptiveLineGradient})`}
            filter={`url(#${ids.adaptiveGlow})`}
            pathLength="1"
          />
          <path
            className={styles.dropSegment}
            d={`M${points.energyDropStart.x} ${adaptiveY.initial} C315 352 350 435 ${points.lowEnergy.x} ${adaptiveY.low}`}
            stroke={`url(#${ids.adaptiveLineGradient})`}
            filter={`url(#${ids.adaptiveGlow})`}
            pathLength="1"
          />
          <path
            className={styles.responseSegment}
            d={`M${points.lowEnergy.x} ${adaptiveY.low} C430 438 456 436 ${points.systemResponse.x} 432`}
            stroke={`url(#${ids.adaptiveLineGradient})`}
            filter={`url(#${ids.adaptiveGlow})`}
            pathLength="1"
          />
          <path
            className={styles.recoverySegment}
            d={`M${points.systemResponse.x} 432 C520 426 548 416 575 ${adaptiveY.recalibrated} C610 392 628 382 ${points.recovery.x} ${adaptiveY.retry}`}
            stroke={`url(#${ids.adaptiveLineGradient})`}
            filter={`url(#${ids.adaptiveGlow})`}
            pathLength="1"
          />
          <path
            className={styles.outcomeSegment}
            d={`M${points.recovery.x} ${adaptiveY.retry} C675 374 690 366 710 ${adaptiveY.sustained} C742 350 772 328 ${points.outcome.x} ${adaptiveY.outcome}`}
            stroke={`url(#${ids.adaptiveGradient})`}
            filter={`url(#${ids.adaptiveGlow})`}
            pathLength="1"
          />
          <g className={styles.startNode} transform={`translate(${points.start.x} ${adaptiveY.initial})`}>
            <circle r="11" />
            <circle r="5" />
          </g>
          <g className={styles.bloomIntervention} transform={`translate(${points.lowEnergy.x} ${adaptiveY.low})`}>
            <circle className={styles.bloomWave} r="28" />
            <circle className={styles.bloomRing} r="27" />
            <image
              className={styles.bloomLogo}
              href="/innerbloom-flower-logo.png"
              x="-25"
              y="-25"
              width="50"
              height="50"
              preserveAspectRatio="xMidYMid meet"
              filter={`url(#${ids.flowerGlow})`}
            />
          </g>

          <g className={`${styles.interventionCallout} ${styles.brandCallout} ${styles.analyzeCallout}`} transform="translate(356 474)">
            <path d="M0 -14 V-58" markerEnd={`url(#${ids.adaptiveDropArrow})`} />
            <image href="/innerbloom-flower-logo.png" x="-11" y="-1" width="22" height="22" preserveAspectRatio="xMidYMid meet" />
            <text y="34" textAnchor="middle">{copy.analyzes}</text>
          </g>

          <g className={`${styles.interventionCallout} ${styles.brandCallout} ${styles.recalibrateCallout}`} transform="translate(514 470)">
            <path d="M0 -14 V-54" markerEnd={`url(#${ids.adaptiveDropArrow})`} />
            <image href="/innerbloom-flower-logo.png" x="-10" y="-1" width="20" height="20" preserveAspectRatio="xMidYMid meet" />
            <text y="32" textAnchor="middle">{copy.recalibrates}</text>
          </g>

          <g className={styles.supportRetryLabel} transform="translate(654 342)">
            <path d="M0 42 V18" />
            <text textAnchor="middle">{copy.returnsWithSupport[0]}</text>
            <text y="18" textAnchor="middle">{copy.returnsWithSupport[1]}</text>
          </g>
          <g className={`${styles.retryNode} ${styles.adaptiveRetryNode}`} transform={`translate(${points.recovery.x} ${adaptiveY.retry})`}>
            <circle r="7" />
            <circle r="3" />
          </g>

          <g className={`${styles.interventionCallout} ${styles.brandCallout} ${styles.supportCallout}`} transform="translate(690 452)">
            <path d="M0 -14 V-70" markerEnd={`url(#${ids.adaptiveDropArrow})`} />
            <image href="/innerbloom-flower-logo.png" x="-10" y="-1" width="20" height="20" preserveAspectRatio="xMidYMid meet" />
            <text y="32" textAnchor="middle">{copy.supports}</text>
          </g>

          <g className={styles.impulseLabel} transform="translate(802 294)">
            <text y="0" textAnchor="middle">{copy.propels}</text>
            <path d="M-8 12 C-2 4 5 -3 14 -10" />
            <circle cx="-28" cy="38" r="7" />
          </g>
          <g className={styles.adaptiveEnd} transform={`translate(${points.outcome.x} ${adaptiveY.outcome})`} aria-hidden="true">
            <circle r="5" />
            <path d="M-16 10 C-8 5 -2 -2 4 -10" />
          </g>
        </g>
      </svg>
    </div>
  );
}

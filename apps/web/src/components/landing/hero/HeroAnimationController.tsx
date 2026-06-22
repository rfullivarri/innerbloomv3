import { useEffect, useMemo, useState, type ReactNode } from "react";

export type HeroLoopPhase = "dashboard" | "expand" | "active" | "retract" | "splash";

type TimelineStep = {
  phase: HeroLoopPhase;
  duration: number;
};

const HERO_LOOP_TIMELINE: TimelineStep[] = [
  { phase: "dashboard", duration: 1360 },
  { phase: "expand", duration: 1200 },
  { phase: "active", duration: 2200 },
  { phase: "retract", duration: 1100 },
  { phase: "splash", duration: 1500 },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function HeroAnimationController({
  children,
}: {
  children: (state: { phase: HeroLoopPhase; cycle: number; reducedMotion: boolean }) => ReactNode;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const step = useMemo(() => HERO_LOOP_TIMELINE[stepIndex], [stepIndex]);

  useEffect(() => {
    if (reducedMotion) {
      setStepIndex(2);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setStepIndex((current) => {
        const next = (current + 1) % HERO_LOOP_TIMELINE.length;
        if (next === 0) {
          setCycle((value) => value + 1);
        }
        return next;
      });
    }, step.duration);

    return () => window.clearTimeout(timer);
  }, [reducedMotion, step.duration]);

  return children({
    phase: reducedMotion ? "active" : step.phase,
    cycle,
    reducedMotion,
  });
}

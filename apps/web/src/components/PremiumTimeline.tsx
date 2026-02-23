import { motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export type TimelineStep = {
  title: string;
  description: string;
  badge?: string;
};

type PremiumTimelineProps = {
  steps: TimelineStep[];
  className?: string;
  axisX?: number;
  lineOffsetX?: number;
  cardWidth?: number | string;
  compact?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function PremiumTimeline({
  steps,
  className,
  axisX,
  lineOffsetX = 56,
  cardWidth = 860,
  compact = false,
}: PremiumTimelineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);

  const [pathData, setPathData] = useState('');
  const [pathLength, setPathLength] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [progress, setProgress] = useState(0);
  const [visibleCards, setVisibleCards] = useState<boolean[]>(() => steps.map(() => false));
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setVisibleCards((prev) => {
      if (prev.length === steps.length) {
        return prev;
      }

      return steps.map((_, index) => prev[index] ?? false);
    });
  }, [steps]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setProgress(1);
      setVisibleCards(steps.map(() => true));
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleCards((prev) => {
          const next = [...prev];
          let changed = false;

          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }

            const index = Number((entry.target as HTMLElement).dataset.timelineIndex);
            if (!Number.isNaN(index) && !next[index]) {
              next[index] = true;
              changed = true;
            }
          }

          return changed ? next : prev;
        });
      },
      { root: null, threshold: 0.4, rootMargin: '0px 0px -8% 0px' },
    );

    cardRefs.current.forEach((node, index) => {
      if (!node) {
        return;
      }

      node.dataset.timelineIndex = String(index);
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, [reducedMotion, steps]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const resolvedAxisX = axisX ?? lineOffsetX;

    const recomputePath = () => {
      const rootRect = container.getBoundingClientRect();
      const points = cardRefs.current
        .map((node) => {
          if (!node) {
            return null;
          }

          const rect = node.getBoundingClientRect();
          return {
            x: resolvedAxisX,
            y: rect.top - rootRect.top + rect.height / 2,
          };
        })
        .filter((point): point is { x: number; y: number } => point !== null);

      const height = container.scrollHeight;
      setContainerHeight(height);

      if (points.length === 0) {
        setPathData(`M ${resolvedAxisX} 0 L ${resolvedAxisX} ${Math.max(height, 1)}`);
        return;
      }

      if (points.length === 1) {
        const startY = Math.max(points[0].y - 40, 0);
        const endY = Math.min(height, points[0].y + 40);
        setPathData(`M ${points[0].x} ${startY} L ${points[0].x} ${endY}`);
        return;
      }

      const wave = compact ? 12 : 18;
      let d = `M ${points[0].x} ${Math.max(points[0].y - 40, 0)}`;

      for (let index = 0; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        const direction = index % 2 === 0 ? 1 : -1;
        const dy = next.y - current.y;

        d += ` C ${current.x + direction * wave} ${current.y + dy * 0.34}, ${next.x - direction * wave} ${
          current.y + dy * 0.66
        }, ${next.x} ${next.y}`;
      }

      d += ` L ${points[points.length - 1].x} ${Math.min(height, points[points.length - 1].y + 40)}`;
      setPathData(d);
    };

    recomputePath();

    const resizeObserver = new ResizeObserver(() => recomputePath());
    resizeObserver.observe(container);
    cardRefs.current.forEach((node) => node && resizeObserver.observe(node));

    window.addEventListener('resize', recomputePath);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', recomputePath);
    };
  }, [axisX, compact, lineOffsetX, steps]);

  useLayoutEffect(() => {
    if (!pathRef.current || !pathData) {
      return;
    }

    setPathLength(pathRef.current.getTotalLength());
  }, [pathData]);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    let rafId = 0;

    const updateProgress = () => {
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const rawProgress = (viewportHeight - rect.top) / (rect.height + viewportHeight);
      setProgress(clamp(rawProgress, 0, 1));
    };

    const requestTick = () => {
      if (rafId) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateProgress();
      });
    };

    updateProgress();
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick);

    return () => {
      window.removeEventListener('scroll', requestTick);
      window.removeEventListener('resize', requestTick);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [reducedMotion]);

  const dashOffset = useMemo(() => {
    if (!pathLength || reducedMotion) {
      return 0;
    }

    return pathLength * (1 - progress);
  }, [pathLength, progress, reducedMotion]);

  const cardMaxWidth = typeof cardWidth === 'number' ? `${cardWidth}px` : cardWidth;
  const fallbackAxisX = axisX ?? lineOffsetX;

  return (
    <section
      className={[
        'relative mx-auto w-full max-w-6xl px-4 py-10 text-white sm:px-6',
        compact ? 'py-6' : 'py-10 sm:py-14',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Timeline premium"
    >
      <div ref={containerRef} className="relative">
        <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <filter id="timeline-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.6" floodColor="rgba(255,255,255,0.34)" />
            </filter>
          </defs>
          <path
            ref={pathRef}
            d={pathData || `M ${fallbackAxisX} 0 L ${fallbackAxisX} ${Math.max(containerHeight, 1)}`}
            fill="none"
            stroke="rgba(255,255,255,0.78)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#timeline-glow)"
            style={{
              strokeDasharray: pathLength || undefined,
              strokeDashoffset: dashOffset,
              transition: reducedMotion ? 'none' : 'stroke-dashoffset 0.16s linear',
            }}
          />
        </svg>

        <ol className="relative z-10 space-y-5 sm:space-y-7" role="list">
          {steps.map((step, index) => {
            const visible = reducedMotion || visibleCards[index];
            return (
              <li key={`${step.title}-${index}`} className="grid grid-cols-[72px_minmax(0,1fr)] items-start gap-4 sm:gap-6">
                <div className="relative flex h-full w-[72px] items-start justify-center pt-2">
                  <div
                    className="relative z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-slate-900/80 text-sm font-semibold text-white shadow-[0_0_0_4px_rgba(255,255,255,0.06)]"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </div>
                </div>

                <motion.article
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  initial={false}
                  animate={
                    visible
                      ? { opacity: 1, y: 0, filter: 'blur(0px)' }
                      : { opacity: 0, y: 10, filter: 'blur(2px)' }
                  }
                  transition={
                    reducedMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: index * 0.04 }
                  }
                  className="relative z-10 w-full rounded-3xl border border-white/15 bg-white/[0.06] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.28)] backdrop-blur-[10px] sm:p-7"
                  style={{ maxWidth: cardMaxWidth }}
                >
                  {step.badge ? (
                    <span className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/85">
                      {step.badge}
                    </span>
                  ) : null}
                  <h3 className="text-xl font-semibold leading-tight text-white sm:text-2xl">{step.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-slate-200/90 sm:text-lg">{step.description}</p>
                </motion.article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { DEMO_GUIDED_STEPS, type DemoLanguage } from '../../config/demoGuidedTour';

type Props = {
  language: DemoLanguage;
  onFinish: () => void;
  onSkip: (stepId: string, stepIndex: number) => void;
  onStepViewed: (stepId: string, stepIndex: number) => void;
  onCompleted: () => void;
};

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 10;
const VIEWPORT_PADDING = 12;
const TOOLTIP_HEIGHT_DESKTOP = 252;
const TOOLTIP_HEIGHT_MOBILE = 238;

type Placement = 'top' | 'right' | 'bottom' | 'left';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function intersects(a: Rect, b: Rect) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

export function GuidedDemoOverlay({ language, onFinish, onSkip, onStepViewed, onCompleted }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const step = DEMO_GUIDED_STEPS[stepIndex];

  useEffect(() => {
    if (!step?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const selector = step.targetSelector;
      if (!selector) {
        setTargetRect(null);
        return;
      }
      const target = document.querySelector(selector) as HTMLElement | null;
      if (!target) {
        setTargetRect(null);
        return;
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      const rect = target.getBoundingClientRect();
      setTargetRect({
        top: Math.max(8, rect.top - PADDING),
        left: Math.max(8, rect.left - PADDING),
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      });
    };

    updateRect();
    const timeout = window.setTimeout(updateRect, 180);
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      updateRect();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [step?.targetSelector]);

  useEffect(() => {
    if (!step) return;
    onStepViewed(step.id, stepIndex);
  }, [onStepViewed, step, stepIndex]);

  const tooltipStyle = useMemo(() => {
    const width = Math.min(viewport.width - 24, 360);
    const isMobile = viewport.width < 768;
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width,
      };
    }

    if (isMobile) {
      const mobileTop = clamp(viewport.height - TOOLTIP_HEIGHT_MOBILE - VIEWPORT_PADDING, VIEWPORT_PADDING, viewport.height - TOOLTIP_HEIGHT_MOBILE - VIEWPORT_PADDING);
      return {
        left: VIEWPORT_PADDING,
        top: mobileTop,
        width: Math.max(260, width),
      };
    }

    const gap = 18;
    const candidates: Placement[] = ['right', 'left', 'bottom', 'top'];
    const preferredOrder = step.tooltipPlacement && step.tooltipPlacement !== 'auto'
      ? [step.tooltipPlacement as Placement, ...candidates.filter((placement) => placement !== step.tooltipPlacement)]
      : candidates;

    const centerLeft = targetRect.left + targetRect.width / 2 - width / 2;
    const centerTop = targetRect.top + targetRect.height / 2 - TOOLTIP_HEIGHT_DESKTOP / 2;
    const byPlacement: Record<Placement, { top: number; left: number }> = {
      top: { top: targetRect.top - TOOLTIP_HEIGHT_DESKTOP - gap, left: centerLeft },
      bottom: { top: targetRect.top + targetRect.height + gap, left: centerLeft },
      left: { top: centerTop, left: targetRect.left - width - gap },
      right: { top: centerTop, left: targetRect.left + targetRect.width + gap },
    };

    const targetSafeRect: Rect = {
      top: targetRect.top - 6,
      left: targetRect.left - 6,
      width: targetRect.width + 12,
      height: targetRect.height + 12,
    };

    let best: { top: number; left: number; score: number } | null = null;
    for (const placement of preferredOrder) {
      const raw = byPlacement[placement];
      const left = clamp(raw.left, VIEWPORT_PADDING, viewport.width - width - VIEWPORT_PADDING);
      const top = clamp(raw.top, VIEWPORT_PADDING, viewport.height - TOOLTIP_HEIGHT_DESKTOP - VIEWPORT_PADDING);
      const tooltipRect: Rect = { top, left, width, height: TOOLTIP_HEIGHT_DESKTOP };
      const overlap = intersects(tooltipRect, targetSafeRect);

      const freeHorizontal = placement === 'left' ? targetRect.left : viewport.width - (targetRect.left + targetRect.width);
      const freeVertical = placement === 'top' ? targetRect.top : viewport.height - (targetRect.top + targetRect.height);
      const primarySpace = placement === 'left' || placement === 'right' ? freeHorizontal : freeVertical;
      const score = (overlap ? -2000 : 500) + primarySpace;

      if (!best || score > best.score) {
        best = { top, left, score };
      }
    }

    return {
      top: best?.top ?? VIEWPORT_PADDING,
      left: best?.left ?? VIEWPORT_PADDING,
      width,
    };
  }, [step.tooltipPlacement, targetRect, viewport.height, viewport.width]);

  const isLast = stepIndex === DEMO_GUIDED_STEPS.length - 1;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]">
      {targetRect ? (
        <>
          <div className="absolute left-0 right-0 top-0 bg-slate-950/72 backdrop-blur-[3px]" style={{ height: targetRect.top }} />
          <div
            className="absolute left-0 bg-slate-950/72 backdrop-blur-[3px]"
            style={{ top: targetRect.top, width: targetRect.left, height: targetRect.height }}
          />
          <div
            className="absolute right-0 bg-slate-950/72 backdrop-blur-[3px]"
            style={{
              top: targetRect.top,
              width: Math.max(0, viewport.width - (targetRect.left + targetRect.width)),
              height: targetRect.height,
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-slate-950/72 backdrop-blur-[3px]"
            style={{ top: targetRect.top + targetRect.height }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-slate-950/72 backdrop-blur-[3px]" />
      )}

      {targetRect ? (
        <div
          className="absolute rounded-2xl border border-cyan-200/90 bg-white/[0.025] shadow-[0_0_0_2px_rgba(34,211,238,0.55),0_0_34px_rgba(34,211,238,0.22),0_20px_45px_rgba(0,0,0,0.45)] transition-all"
          style={{ top: targetRect.top, left: targetRect.left, width: targetRect.width, height: targetRect.height }}
        />
      ) : null}

      <aside
        className="pointer-events-auto absolute rounded-2xl border border-white/15 bg-slate-900/95 p-4 text-slate-100 shadow-2xl"
        style={tooltipStyle}
      >
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-300">
          <span>{stepIndex + 1}/{DEMO_GUIDED_STEPS.length}</span>
          <button type="button" className="rounded-md px-2 py-1 hover:bg-white/10" onClick={onFinish}>
            {language === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
        <h3 className="text-lg font-semibold">{step.title[language]}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-200">{step.body[language]}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0}
            className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-40"
          >
            {language === 'es' ? 'Anterior' : 'Back'}
          </button>
          {!isLast ? (
            <button
              type="button"
              onClick={() => setStepIndex((current) => Math.min(DEMO_GUIDED_STEPS.length - 1, current + 1))}
              className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-950"
            >
              {language === 'es' ? 'Siguiente' : 'Next'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  onCompleted();
                  onFinish();
                }}
                className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-950"
              >
                {language === 'es' ? 'Finalizar' : 'Finish'}
              </button>
            </>
          )}
          {!isLast ? (
            <button
              type="button"
              onClick={() => {
                onSkip(step.id, stepIndex);
                onFinish();
              }}
              className="ml-auto rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300 hover:bg-white/10"
            >
              {language === 'es' ? 'Saltar' : 'Skip'}
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

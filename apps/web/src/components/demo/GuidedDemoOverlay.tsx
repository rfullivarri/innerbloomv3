import { useEffect, useMemo, useState } from 'react';
import { DEMO_GUIDED_STEPS, type DemoLanguage, type GuidedStep } from '../../config/demoGuidedTour';

type Props = {
  language: DemoLanguage;
  steps?: GuidedStep[];
  finalActionLabel?: Record<DemoLanguage, string>;
  onFinish: () => void;
  onSkip: (stepId: string, stepIndex: number) => void;
  onStepViewed: (stepId: string, stepIndex: number) => void;
  onStepChange?: (stepId: string, stepIndex: number) => void;
  onCompleted: () => void;
};

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 10;
const VIEWPORT_PADDING = 12;
const MOBILE_TOOLTIP_BOTTOM_GAP = 6;
const MOBILE_TOOLTIP_BOTTOM_GAP_LOWER = 2;
const TOOLTIP_HEIGHT_DESKTOP = 252;
const TOOLTIP_HEIGHT_MOBILE = 238;
const TOOLTIP_HEIGHT_MOBILE_COMPACT = 210;
const MOBILE_DASHBOARD_FOCUS_DEFAULT_OFFSET = 8;
const MOBILE_MODAL_FOCUS_DEFAULT_OFFSET = 6;
const DAILY_QUEST_INTRO_STEP_ID = 'daily-quest-intro';
const DAILY_QUEST_FOOTER_STEP_ID = 'daily-quest-footer';

const MOBILE_DASHBOARD_STEP_FOCUS_OFFSET: Record<string, number> = {
  'overall-progress': 12,
  'streaks-top': 4,
  'streaks-bottom': 4,
  balance: 6,
  'emotion-chart': 6,
  'daily-energy': 18,
  'info-dot': 18,
};

const MOBILE_DAILY_QUEST_STEP_FOCUS_OFFSET: Record<string, number> = {
  'daily-quest-intro': 6,
  'daily-quest-moderation': 10,
  'daily-quest-tasks': 6,
  'daily-quest-footer': 10,
};

const STEP_FRAME_PADDING: Record<string, number> = {
  'overall-progress': 12,
  'daily-quest-moderation': 12,
};

const DAILY_QUEST_STEP_IDS = new Set([
  'daily-quest-intro',
  'daily-quest-moderation',
  'daily-quest-tasks',
  'daily-quest-footer',
]);

type Placement = 'top' | 'right' | 'bottom' | 'left';
type WalkthroughMode = 'dashboard' | 'daily-quest-modal';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function intersects(a: Rect, b: Rect) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

function getWalkthroughMode(stepId: string): WalkthroughMode {
  return DAILY_QUEST_STEP_IDS.has(stepId) ? 'daily-quest-modal' : 'dashboard';
}

function getScrollableAncestor(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement ?? null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
      && current.scrollHeight > current.clientHeight;
    if (isScrollable) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function raf(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

export function GuidedDemoOverlay({
  language,
  steps = DEMO_GUIDED_STEPS,
  finalActionLabel,
  onFinish,
  onSkip,
  onStepViewed,
  onStepChange,
  onCompleted,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const step = steps[stepIndex];
  const walkthroughMode = getWalkthroughMode(step.id);
  const isDailyQuestStep = walkthroughMode === 'daily-quest-modal';
  const isCompactMobile = viewport.width <= 390 || viewport.height <= 740;

  useEffect(() => {
    if (isDailyQuestStep) {
      setTargetRect(null);
    }

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
      const targetRect = target.getBoundingClientRect();
      const emotionBlock = step.id === DAILY_QUEST_INTRO_STEP_ID
        ? (document.querySelector('[data-demo-anchor="daily-quest-emotion-block"]') as HTMLElement | null)
        : null;
      const emotionRect = emotionBlock?.getBoundingClientRect();

      const rect = emotionRect
        ? {
          top: Math.min(targetRect.top, emotionRect.top),
          left: Math.min(targetRect.left, emotionRect.left),
          right: Math.max(targetRect.right, emotionRect.right),
          bottom: Math.max(targetRect.bottom, emotionRect.bottom),
          width: Math.max(targetRect.right, emotionRect.right) - Math.min(targetRect.left, emotionRect.left),
          height: Math.max(targetRect.bottom, emotionRect.bottom) - Math.min(targetRect.top, emotionRect.top),
        }
        : targetRect;

      const framePadding = STEP_FRAME_PADDING[step.id] ?? PADDING;
      const maxRectWidth = Math.max(0, viewport.width - VIEWPORT_PADDING * 2);
      const width = Math.min(rect.width + framePadding * 2, maxRectWidth);
      const left = clamp(rect.left - framePadding, VIEWPORT_PADDING, viewport.width - width - VIEWPORT_PADDING);
      const topInset = window.visualViewport?.offsetTop ?? 0;
      setTargetRect({
        top: Math.max(VIEWPORT_PADDING, rect.top - framePadding - topInset),
        left,
        width,
        height: rect.height + framePadding * 2,
      });
    };

    const alignDashboardStepMobile = async (target: HTMLElement) => {
      const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      const topInset = window.visualViewport?.offsetTop ?? 0;
      const focusOffset = MOBILE_DASHBOARD_STEP_FOCUS_OFFSET[step.id] ?? MOBILE_DASHBOARD_FOCUS_DEFAULT_OFFSET;
      const desiredTop = Math.max(VIEWPORT_PADDING, headerHeight + topInset + focusOffset);
      const firstRect = target.getBoundingClientRect();
      const initialDelta = firstRect.top - desiredTop;
      if (Math.abs(initialDelta) > 2) {
        window.scrollBy({ top: initialDelta, behavior: 'auto' });
      }

      await raf();
      await raf();

      const finalRect = target.getBoundingClientRect();
      const settleDelta = finalRect.top - desiredTop;
      if (Math.abs(settleDelta) > 2) {
        window.scrollBy({ top: settleDelta, behavior: 'auto' });
        await raf();
      }
    };

    const alignDailyQuestStep = async (target: HTMLElement) => {
      const scroller = getScrollableAncestor(target);
      if (!scroller) {
        return;
      }
      const focusOffset = MOBILE_DAILY_QUEST_STEP_FOCUS_OFFSET[step.id] ?? MOBILE_MODAL_FOCUS_DEFAULT_OFFSET;
      const scrollerRect = scroller.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const desiredTop = scrollerRect.top + focusOffset;
      const delta = targetRect.top - desiredTop;
      if (Math.abs(delta) > 2) {
        scroller.scrollBy({ top: delta, behavior: 'auto' });
        await raf();
      }
    };

    const alignForStep = async () => {
      const selector = step.targetSelector;
      if (!selector) return;

      const target = document.querySelector(selector) as HTMLElement | null;
      if (!target) return;

      const isMobile = window.innerWidth < 768;
      if (walkthroughMode === 'daily-quest-modal') {
        if (isMobile) {
          await alignDailyQuestStep(target);
        } else {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
        return;
      }

      if (!isMobile) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        return;
      }

      await alignDashboardStepMobile(target);
    };

    void alignForStep().then(() => {
      updateRect();
    });

    const timeout = window.setTimeout(() => {
      updateRect();
    }, 280);
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      void alignForStep().then(() => {
        updateRect();
      });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isDailyQuestStep, step?.id, step?.targetSelector, walkthroughMode, viewport.width]);

  useEffect(() => {
    if (!step) return;
    onStepViewed(step.id, stepIndex);
    onStepChange?.(step.id, stepIndex);
  }, [onStepChange, onStepViewed, step, stepIndex]);

  const tooltipStyle = useMemo(() => {
    const width = Math.min(viewport.width - 24, 360);
    const isMobile = viewport.width < 768;
    const mobileTooltipHeight = isCompactMobile ? TOOLTIP_HEIGHT_MOBILE_COMPACT : TOOLTIP_HEIGHT_MOBILE;
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width,
      };
    }

    if (isMobile) {
      const defaultMobileTop = viewport.height - mobileTooltipHeight - MOBILE_TOOLTIP_BOTTOM_GAP;
      const lowerMobileTop = viewport.height - mobileTooltipHeight - MOBILE_TOOLTIP_BOTTOM_GAP_LOWER;
      const mobileTop = step.id === DAILY_QUEST_FOOTER_STEP_ID
        ? clamp(Math.max(VIEWPORT_PADDING + 24, targetRect.top - mobileTooltipHeight - 24), VIEWPORT_PADDING, defaultMobileTop)
        : clamp(lowerMobileTop, VIEWPORT_PADDING, lowerMobileTop);
      return {
        left: VIEWPORT_PADDING,
        top: mobileTop,
        width: Math.max(isCompactMobile ? 248 : 260, width),
      };
    }

    const gap = 18;
    const candidates: Placement[] = ['right', 'left', 'bottom', 'top'];
    const preferredOrder = step.id === DAILY_QUEST_FOOTER_STEP_ID
      ? (['top', ...candidates.filter((placement) => placement !== 'top')] as Placement[])
      : step.tooltipPlacement && step.tooltipPlacement !== 'auto'
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
  }, [isCompactMobile, step.id, step.tooltipPlacement, targetRect, viewport.height, viewport.width]);

  const isLast = stepIndex === steps.length - 1;

  return (
    <div className={`pointer-events-none fixed inset-0 ${isDailyQuestStep ? 'z-[10020]' : 'z-[120]'}`}>
      {targetRect ? (
        <>
          <div className="absolute left-0 right-0 top-0 bg-slate-950/86 backdrop-blur-[6px]" style={{ height: targetRect.top }} />
          <div
            className="absolute left-0 bg-slate-950/86 backdrop-blur-[6px]"
            style={{ top: targetRect.top, width: targetRect.left, height: targetRect.height }}
          />
          <div
            className="absolute right-0 bg-slate-950/86 backdrop-blur-[6px]"
            style={{
              top: targetRect.top,
              width: Math.max(0, viewport.width - (targetRect.left + targetRect.width)),
              height: targetRect.height,
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-slate-950/86 backdrop-blur-[6px]"
            style={{ top: targetRect.top + targetRect.height }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-slate-950/86 backdrop-blur-[6px]" />
      )}

      {targetRect ? (
        <div
          className="absolute rounded-2xl border border-cyan-200/90 bg-white/[0.025] shadow-[0_0_0_2px_rgba(34,211,238,0.55),0_0_34px_rgba(34,211,238,0.22),0_20px_45px_rgba(0,0,0,0.45)] transition-all"
          style={{ top: targetRect.top, left: targetRect.left, width: targetRect.width, height: targetRect.height }}
        />
      ) : null}

      <aside
        className={`pointer-events-auto absolute rounded-2xl border border-white/15 bg-slate-900/95 text-slate-100 shadow-2xl ${isCompactMobile ? 'p-3' : 'p-4'}`}
        style={tooltipStyle}
      >
        {isCompactMobile ? (
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-tight">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">
                {stepIndex + 1}/{steps.length} ·
              </span>
              {step.title[language]}
            </h3>
            <button
              type="button"
              className="rounded-md p-1.5 text-base leading-none text-slate-300 hover:bg-white/10 hover:text-slate-100"
              onClick={onFinish}
              aria-label={language === 'es' ? 'Cerrar recorrido' : 'Close walkthrough'}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-300">
            <span>{stepIndex + 1}/{steps.length}</span>
            <button
              type="button"
              className="rounded-md p-1.5 text-base leading-none text-slate-300 hover:bg-white/10 hover:text-slate-100"
              onClick={onFinish}
              aria-label={language === 'es' ? 'Cerrar recorrido' : 'Close walkthrough'}
            >
              ×
            </button>
          </div>
        )}
        {!isCompactMobile ? <h3 className="text-lg font-semibold">{step.title[language]}</h3> : null}
        <p className={`${isCompactMobile ? 'mt-1.5 text-[13px] leading-snug' : 'mt-2 text-sm leading-relaxed'} text-slate-200`}>
          {step.body[language]}
        </p>

        <div className={`flex flex-wrap items-center ${isCompactMobile ? 'mt-3 gap-1.5' : 'mt-4 gap-2'}`}>
          <button
            type="button"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0}
            className={`rounded-lg border border-white/20 font-semibold uppercase tracking-[0.12em] disabled:opacity-40 ${isCompactMobile ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'}`}
          >
            {language === 'es' ? 'Anterior' : 'Back'}
          </button>
          {!isLast ? (
            <button
              type="button"
              onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}
              className={`rounded-lg bg-cyan-300 font-semibold uppercase tracking-[0.12em] text-slate-950 ${isCompactMobile ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'}`}
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
                className={`rounded-lg bg-cyan-300 font-semibold uppercase tracking-[0.12em] text-slate-950 ${isCompactMobile ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'}`}
              >
                {finalActionLabel?.[language] ?? (language === 'es' ? 'Finalizar' : 'Finish')}
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
              className={`ml-auto rounded-lg font-semibold uppercase tracking-[0.12em] text-slate-300 hover:bg-white/10 ${isCompactMobile ? 'px-2 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'}`}
            >
              {language === 'es' ? 'Saltar' : 'Skip'}
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

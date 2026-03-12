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

    const viewportPadding = 12;
    if (isMobile) {
      return {
        left: 12,
        top: Math.max(12, viewport.height - 232),
        width: Math.max(260, width),
      };
    }

    const topChoice = targetRect.top - 18;
    const bottomChoice = targetRect.top + targetRect.height + 18;
    const leftChoice = targetRect.left - width - 18;
    const rightChoice = targetRect.left + targetRect.width + 18;

    const place = step.tooltipPlacement ?? 'auto';
    let top = bottomChoice;
    let left = targetRect.left;

    if (place === 'top' || (place === 'auto' && topChoice > 180)) {
      top = topChoice;
    }
    if (place === 'left' && leftChoice > viewportPadding) {
      left = leftChoice;
    } else if (place === 'right' && rightChoice + width < viewport.width - viewportPadding) {
      left = rightChoice;
    }

    left = Math.max(viewportPadding, Math.min(left, viewport.width - width - viewportPadding));
    top = Math.max(viewportPadding, Math.min(top, viewport.height - 220));

    return { top, left, width };
  }, [step.tooltipPlacement, targetRect, viewport.height, viewport.width]);

  const isLast = stepIndex === DEMO_GUIDED_STEPS.length - 1;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-slate-950/72 backdrop-blur-[3px]" />
      {targetRect ? (
        <div
          className="absolute rounded-2xl border border-cyan-200/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.72),0_0_0_2px_rgba(34,211,238,0.55),0_20px_45px_rgba(0,0,0,0.45)] transition-all"
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

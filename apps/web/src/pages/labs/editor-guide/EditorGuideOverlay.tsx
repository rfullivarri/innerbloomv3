import { useEffect, useMemo, useState } from "react";
import { EditorGuideWheel } from "./EditorGuideWheel";
import { EditorGuideStep } from "./EditorGuideStep";
import {
  EDITOR_GUIDE_FIRST_TIME_STORAGE_KEY,
  EDITOR_GUIDE_STEPS,
} from "./guideConfig";

type Rect = { top: number; left: number; width: number; height: number };

function findVisibleTarget(selector: string): Rect | null {
  const candidates = Array.from(
    document.querySelectorAll(selector),
  ) as HTMLElement[];
  for (const element of candidates) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 2 && rect.height > 2) {
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    }
  }
  return null;
}

export function EditorGuideOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const step = EDITOR_GUIDE_STEPS[stepIndex];
  const isWheelStep = step.id.startsWith("wheel");
  const panelPlacement = step.panelPlacement ?? (isWheelStep ? "center" : "bottom");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setTargetRect(null);
      return;
    }

    if (!step.targetSelector) {
      setTargetRect(null);
      return;
    }

    const update = () => {
      const nextRect = findVisibleTarget(step.targetSelector!);
      setTargetRect(nextRect);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen, step]);

  const canGoBack = stepIndex > 0;
  const isLast = stepIndex === EDITOR_GUIDE_STEPS.length - 1;

  const nextLabel = isLast ? "Finalizar" : "Siguiente";

  const frame = useMemo(() => {
    if (!targetRect) {
      return null;
    }
    const padding = 10;
    return {
      top: Math.max(8, targetRect.top - padding),
      left: Math.max(8, targetRect.left - padding),
      width: targetRect.width + padding * 2,
      height: targetRect.height + padding * 2,
    };
  }, [targetRect]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="editor-guide-overlay fixed inset-0 z-[90]"
      role="dialog"
      aria-modal="true"
      aria-label="Guía del editor"
    >
      {frame && !isWheelStep ? (
        <>
          <div
            className="absolute left-0 right-0 top-0 bg-slate-950/82 backdrop-blur-[5px] transition-all duration-500"
            style={{ height: frame.top }}
          />
          <div
            className="absolute left-0 bg-slate-950/82 backdrop-blur-[5px] transition-all duration-500"
            style={{ top: frame.top, width: frame.left, height: frame.height }}
          />
          <div
            className="absolute right-0 bg-slate-950/82 backdrop-blur-[5px] transition-all duration-500"
            style={{
              top: frame.top,
              left: frame.left + frame.width,
              height: frame.height,
            }}
          />
          <div
            className="absolute left-0 right-0 bg-slate-950/82 backdrop-blur-[5px] transition-all duration-500"
            style={{ top: frame.top + frame.height, bottom: 0 }}
          />
          <div
            className="pointer-events-none absolute rounded-2xl border border-violet-200/65 shadow-[0_0_0_1px_rgba(255,255,255,0.26),0_0_0_9999px_rgba(2,6,23,0.18),0_0_46px_rgba(139,92,246,0.38)] transition-all duration-500"
            style={{
              top: frame.top,
              left: frame.left,
              width: frame.width,
              height: frame.height,
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-slate-950/82 backdrop-blur-[5px]" />
      )}

      <section
        className={`editor-guide-panel absolute inset-x-3 mx-auto flex w-full max-w-xl flex-col rounded-3xl border border-white/15 bg-[color:var(--color-slate-900-95)] px-5 py-4 text-white shadow-[0_20px_55px_rgba(15,23,42,0.6)] md:inset-x-0 ${
          panelPlacement === "top"
            ? "top-3 md:top-6"
            : panelPlacement === "center"
              ? "top-1/2 -translate-y-1/2"
              : "bottom-4 md:bottom-6"
        }`}
      >
        {isWheelStep && (
          <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.02] px-2 py-3">
            <EditorGuideWheel stepId={step.id} />
          </div>
        )}
        <EditorGuideStep step={step} />

        <div className="mt-4 flex items-center gap-2">
          {canGoBack && (
            <button
              type="button"
              onClick={() =>
                setStepIndex((current) => Math.max(0, current - 1))
              }
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-slate-100)]"
            >
              Anterior
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-slate-300)]"
          >
            Saltar
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLast) {
                onClose();
                return;
              }
              setStepIndex((current) =>
                Math.min(EDITOR_GUIDE_STEPS.length - 1, current + 1),
              );
            }}
            className="ml-auto inline-flex rounded-full bg-violet-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white"
          >
            {nextLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function markEditorGuideAsSeen() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(EDITOR_GUIDE_FIRST_TIME_STORAGE_KEY, "1");
}

export function shouldAutoOpenEditorGuide() {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.localStorage.getItem(EDITOR_GUIDE_FIRST_TIME_STORAGE_KEY) !== "1"
  );
}

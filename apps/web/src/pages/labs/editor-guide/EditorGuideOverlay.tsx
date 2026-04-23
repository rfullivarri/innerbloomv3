import { useEffect, useMemo, useState } from "react";
import { EditorGuideWheel } from "./EditorGuideWheel";
import { EditorGuideStep } from "./EditorGuideStep";
import {
  EDITOR_GUIDE_FIRST_TIME_STORAGE_KEY,
  type EditorGuideStepId,
  getEditorGuideSteps,
} from "./guideConfig";

type Rect = { top: number; left: number; width: number; height: number };
type ModalCoreFocusPhase = "overview" | "detail";

const MODAL_CORE_OVERVIEW_SELECTOR =
  '[data-editor-guide-target="new-task-modal-dialog"]';
const INTERACTIVE_ELEMENT_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "label",
  "[role='button']",
  "[role='link']",
  "[contenteditable='true']",
  ".editor-guide-panel",
].join(",");

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
  locale,
  onStepChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  locale: "es" | "en";
  onStepChange?: (stepId: EditorGuideStepId) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [modalCoreFocusPhase, setModalCoreFocusPhase] =
    useState<ModalCoreFocusPhase>("detail");

  const guideSteps = getEditorGuideSteps(locale);
  const step = guideSteps[stepIndex];
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
      setModalCoreFocusPhase("detail");
      return;
    }

    if (step.id !== "modal-core") {
      setModalCoreFocusPhase("detail");
      return;
    }

    setModalCoreFocusPhase("overview");
    const timeoutId = window.setTimeout(() => {
      setModalCoreFocusPhase("detail");
    }, 320);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, step.id]);

  const activeTargetSelector = useMemo(() => {
    if (step.id === "modal-core" && modalCoreFocusPhase === "overview") {
      return MODAL_CORE_OVERVIEW_SELECTOR;
    }
    return step.targetSelector;
  }, [modalCoreFocusPhase, step.id, step.targetSelector]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!activeTargetSelector) {
      setTargetRect(null);
      return;
    }

    const update = () => {
      const nextRect = findVisibleTarget(activeTargetSelector);
      setTargetRect(nextRect);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer.disconnect();
    };
  }, [activeTargetSelector, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    onStepChange?.(step.id);
  }, [isOpen, onStepChange, step.id]);

  const canGoBack = stepIndex > 0;
  const isLast = stepIndex === guideSteps.length - 1;

  const goToPreviousStep = () => {
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const goToNextStep = () => {
    if (isLast) {
      onClose();
      return;
    }
    setStepIndex((current) => Math.min(guideSteps.length - 1, current + 1));
  };

  const handleBackgroundTouchNavigation = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") {
      return;
    }

    if ((event.target as Element).closest(INTERACTIVE_ELEMENT_SELECTOR)) {
      return;
    }

    const midpoint = window.innerWidth / 2;
    const tappedLeftSide = event.clientX < midpoint;

    if (tappedLeftSide) {
      if (canGoBack) {
        goToPreviousStep();
      }
      return;
    }

    goToNextStep();
  };

  const copy = locale === "es"
    ? { aria: "Guía", back: "Anterior", skip: "Saltar", finish: "Finalizar", next: "Siguiente", label: "Guía" }
    : { aria: "Guide", back: "Previous", skip: "Skip", finish: "Finish", next: "Next", label: "Guide" };

  const nextLabel = isLast ? copy.finish : copy.next;
  const maskedOverlayClass =
    "bg-slate-950/88 backdrop-blur-[6px] backdrop-saturate-[0.82]";

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
      aria-label={copy.aria}
      onPointerUp={handleBackgroundTouchNavigation}
    >
      {frame && !isWheelStep ? (
        <>
          <div
            className={`absolute left-0 right-0 top-0 ${maskedOverlayClass} transition-all duration-500`}
            style={{ height: frame.top }}
          />
          <div
            className={`absolute left-0 ${maskedOverlayClass} transition-all duration-500`}
            style={{ top: frame.top, width: frame.left, height: frame.height }}
          />
          <div
            className={`absolute right-0 ${maskedOverlayClass} transition-all duration-500`}
            style={{
              top: frame.top,
              left: frame.left + frame.width,
              height: frame.height,
            }}
          />
          <div
            className={`absolute left-0 right-0 ${maskedOverlayClass} transition-all duration-500`}
            style={{ top: frame.top + frame.height, bottom: 0 }}
          />
          <div
            className="pointer-events-none absolute rounded-2xl border border-violet-200/70 shadow-[0_0_0_1px_rgba(255,255,255,0.3),0_0_0_9999px_rgba(2,6,23,0.28),0_0_52px_rgba(139,92,246,0.42)] transition-all duration-500"
            style={{
              top: frame.top,
              left: frame.left,
              width: frame.width,
              height: frame.height,
            }}
          />
        </>
      ) : (
        <div className={`absolute inset-0 ${maskedOverlayClass}`} />
      )}

      <section
        className={`editor-guide-panel absolute left-1/2 flex w-[min(calc(100vw-1.5rem),42rem)] -translate-x-1/2 flex-col rounded-3xl border border-white/10 bg-[color:var(--color-surface-elevated)] px-5 py-4 text-[color:var(--color-slate-100)] shadow-[0_24px_65px_rgba(2,6,23,0.72)] ${
          panelPlacement === "top"
            ? "top-3 md:top-6"
            : panelPlacement === "center"
              ? "top-1/2 -translate-y-1/2"
              : "bottom-4 md:bottom-6"
        }`}
      >
        {isWheelStep && (
          <div className="mb-2 px-1 py-1">
            <EditorGuideWheel stepId={step.id} locale={locale} />
          </div>
        )}
        <EditorGuideStep step={step} label={copy.label} />

        <div className="mt-4 flex items-center gap-2">
          {canGoBack && (
            <button
              type="button"
              onClick={goToPreviousStep}
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-slate-100)]"
            >
              {copy.back}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-slate-300)]"
          >
            {copy.skip}
          </button>
          <button
            type="button"
            onClick={goToNextStep}
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

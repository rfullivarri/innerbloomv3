import type { EditorGuideStep as EditorGuideStepConfig } from "./guideConfig";

export function EditorGuideStep({ step }: { step: EditorGuideStepConfig }) {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200/90">
        Guía del editor
      </p>
      <h3 className="mt-1 text-base font-semibold md:text-lg">{step.title}</h3>
      <p className="mt-1 text-sm text-[color:var(--color-slate-300)]">
        {step.copy}
      </p>
    </>
  );
}

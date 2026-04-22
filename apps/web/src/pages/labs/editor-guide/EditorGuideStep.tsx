import type { EditorGuideStep as EditorGuideStepConfig } from "./guideConfig";

export function EditorGuideStep({
  step,
  label,
}: {
  step: EditorGuideStepConfig;
  label: string;
}) {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200/90">
        {label}
      </p>
      <h3 className="mt-1 text-base font-semibold text-[color:var(--color-slate-100)] md:text-lg">
        {step.title}
      </h3>
      <p className="mt-1 text-sm text-[color:var(--color-slate-300)]">{step.copy}</p>
    </>
  );
}

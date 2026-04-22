import type { EditorGuideStepId } from "./guideConfig";

const PILLARS = ["Body", "Mind", "Soul"] as const;

const TRAITS_BY_PILLAR = {
  Body: [
    "Energía",
    "Nutrición",
    "Sueño",
    "Recuperación",
    "Hidratación",
    "Higiene",
    "Vitalidad",
    "Postura",
    "Movilidad",
    "Moderación",
  ],
  Mind: [
    "Enfoque",
    "Aprendizaje",
    "Creatividad",
    "Gestión",
    "Autocontrol",
    "Resiliencia",
    "Orden",
    "Proyección",
    "Finanzas",
    "Agilidad",
  ],
  Soul: [
    "Conexión",
    "Espiritualidad",
    "Propósito",
    "Valores",
    "Altruismo",
    "Insight",
    "Gratitud",
    "Naturaleza",
    "Gozo",
    "Autoestima",
  ],
} as const;

const TRAIT_SEGMENTS = PILLARS.flatMap((pillar) =>
  TRAITS_BY_PILLAR[pillar].map((trait, index) => ({
    pillar,
    trait,
    index: PILLARS.indexOf(pillar) * 10 + index,
  })),
);

function levelFromStep(stepId: EditorGuideStepId): 1 | 2 | 3 {
  if (stepId === "wheel-core") {
    return 1;
  }
  if (stepId === "wheel-pillars") {
    return 2;
  }
  return 3;
}

export function EditorGuideWheel({ stepId }: { stepId: EditorGuideStepId }) {
  const level = levelFromStep(stepId);

  return (
    <div className="relative mx-auto h-[21.5rem] w-[21.5rem] max-w-full">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.16),_transparent_72%)]" />

      <div
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-violet-400/25 shadow-[0_0_30px_rgba(139,92,246,0.35)] transition-all duration-700"
        style={{
          transform: `translate(-50%, -50%) scale(${level >= 1 ? 1 : 0.75})`,
          opacity: level >= 1 ? 1 : 0,
        }}
      >
        <div className="flex h-full items-center justify-center text-sm font-semibold tracking-[0.08em] text-white">
          Innerbloom
        </div>
      </div>

      <div
        className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 transition-all duration-700"
        style={{
          background:
            "conic-gradient(from -90deg, rgba(34,197,94,0.35) 0deg 120deg, rgba(59,130,246,0.35) 120deg 240deg, rgba(244,114,182,0.35) 240deg 360deg)",
          mask: "radial-gradient(circle, transparent 33%, black 34%, black 74%, transparent 75%)",
          opacity: level >= 2 ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${level >= 2 ? 1 : 0.82})`,
        }}
      />

      {PILLARS.map((pillar, index) => {
        const angle = -90 + index * 120 + 60;
        const radius = 90;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;

        return (
          <div
            key={pillar}
            className="pointer-events-none absolute left-1/2 top-1/2 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 transition-all duration-700"
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${level >= 2 ? 1 : 0.75})`,
              opacity: level >= 2 ? 1 : 0,
            }}
          >
            {pillar}
          </div>
        );
      })}

      <div
        className="absolute left-1/2 top-1/2 h-[18.2rem] w-[18.2rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 transition-all duration-700"
        style={{
          background:
            "repeating-conic-gradient(from -90deg, rgba(255,255,255,0.24) 0deg 2deg, rgba(255,255,255,0.08) 2deg 12deg)",
          mask: "radial-gradient(circle, transparent 69%, black 70%, black 90%, transparent 91%)",
          opacity: level >= 3 ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${level >= 3 ? 1 : 0.86})`,
        }}
      />

      {TRAIT_SEGMENTS.map(({ trait, index, pillar }) => {
        const angle = -90 + index * 12 + 6;
        const radius = 162;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        const color =
          pillar === "Body"
            ? "text-emerald-100/85"
            : pillar === "Mind"
              ? "text-sky-100/85"
              : "text-pink-100/85";

        return (
          <div
            key={`${pillar}-${trait}`}
            className={`pointer-events-none absolute left-1/2 top-1/2 text-[9px] font-medium leading-none transition-all duration-700 ${color}`}
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${angle + 90}deg)`,
              opacity: level >= 3 ? 1 : 0,
            }}
          >
            {trait}
          </div>
        );
      })}
    </div>
  );
}

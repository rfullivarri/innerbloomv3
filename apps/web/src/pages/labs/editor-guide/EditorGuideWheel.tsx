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

const PILLAR_ACCENTS: Record<
  (typeof PILLARS)[number],
  {
    soft: string;
    label: string;
    chip: string;
    icon: string;
  }
> = {
  Body: {
    soft: "rgba(126,145,255,0.44)",
    label: "text-[color:var(--color-slate-100)]",
    chip: "from-[#8FA2FF]/35 to-[#7DD6F3]/35",
    icon: "✦",
  },
  Mind: {
    soft: "rgba(180,116,255,0.43)",
    label: "text-[color:var(--color-slate-100)]",
    chip: "from-[#D580FF]/35 to-[#A58CFF]/35",
    icon: "◈",
  },
  Soul: {
    soft: "rgba(74,160,185,0.44)",
    label: "text-[color:var(--color-slate-100)]",
    chip: "from-[#63B9C4]/35 to-[#6C80CC]/35",
    icon: "✧",
  },
};

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
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.2),_transparent_70%)]" />

      <div
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-100/35 bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.34),rgba(180,142,255,0.2)_42%,rgba(58,32,96,0.75)_100%)] shadow-[inset_0_1px_10px_rgba(255,255,255,0.2),inset_0_-10px_20px_rgba(15,23,42,0.42),0_0_0_1px_rgba(255,255,255,0.2),0_0_34px_rgba(139,92,246,0.45)] transition-all duration-700"
        style={{
          transform: `translate(-50%, -50%) scale(${level >= 1 ? 1 : 0.75})`,
          opacity: level >= 1 ? 1 : 0,
        }}
      >
        <div className="flex h-full items-center justify-center">
          <img
            src="/IB-COLOR-LOGO.png"
            alt="Innerbloom logo"
            className="h-9 w-9 object-contain drop-shadow-[0_0_14px_rgba(196,181,253,0.45)]"
          />
        </div>
      </div>

      <div
        className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 transition-all duration-700"
        style={{
          background:
            "conic-gradient(from -90deg, rgba(125,152,255,0.5) 0deg 120deg, rgba(192,122,255,0.5) 120deg 240deg, rgba(88,182,192,0.48) 240deg 360deg)",
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
            className="pointer-events-none absolute left-1/2 top-1/2 transition-all duration-700"
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${level >= 2 ? 1 : 0.75})`,
              opacity: level >= 2 ? 1 : 0,
            }}
          >
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-gradient-to-r px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] shadow-[0_6px_18px_rgba(15,23,42,0.3)] ${PILLAR_ACCENTS[pillar].label} ${PILLAR_ACCENTS[pillar].chip}`}
            >
              <span className="text-[11px]">{PILLAR_ACCENTS[pillar].icon}</span>
              {pillar}
            </div>
          </div>
        );
      })}

      <div
        className="absolute left-1/2 top-1/2 h-[18.2rem] w-[18.2rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 transition-all duration-700"
        style={{
          background:
            "repeating-conic-gradient(from -90deg, rgba(248,250,252,0.3) 0deg 0.85deg, rgba(148,163,184,0.06) 0.85deg 12deg)",
          mask: "radial-gradient(circle, transparent 69%, black 70%, black 90%, transparent 91%)",
          opacity: level >= 3 ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${level >= 3 ? 1 : 0.86})`,
        }}
      />

      {TRAIT_SEGMENTS.map(({ trait, index, pillar }) => {
        const angle = -90 + index * 12 + 6;
        const radius = 156;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        const textAnchor = angle > 90 && angle < 270 ? "end" : "start";
        const rotate = textAnchor === "end" ? angle + 180 : angle;

        return (
          <svg
            key={`${pillar}-${trait}`}
            className="pointer-events-none absolute left-1/2 top-1/2 overflow-visible transition-all duration-700"
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              opacity: level >= 3 ? 1 : 0,
            }}
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke={PILLAR_ACCENTS[pillar].soft}
              strokeWidth="1.1"
              transform={`rotate(${angle + 90})`}
            />
            <text
              x="0"
              y="-1"
              fill={PILLAR_ACCENTS[pillar].soft}
              fontSize="8.2"
              letterSpacing="0.08em"
              textAnchor={textAnchor}
              transform={`rotate(${rotate}) translate(0, -8)`}
            >
              {trait}
            </text>
          </svg>
        );
      })}
    </div>
  );
}

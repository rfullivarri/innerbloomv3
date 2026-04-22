import type { EditorGuideStepId } from "./guideConfig";

type Locale = "es" | "en";
type PillarKey = "Body" | "Mind" | "Soul";

const PILLARS: PillarKey[] = ["Body", "Mind", "Soul"];

const TRAITS_BY_PILLAR: Record<Locale, Record<PillarKey, string[]>> = {
  es: {
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
  },
  en: {
    Body: [
      "Energy",
      "Nutrition",
      "Sleep",
      "Recovery",
      "Hydration",
      "Hygiene",
      "Vitality",
      "Posture",
      "Mobility",
      "Moderation",
    ],
    Mind: [
      "Focus",
      "Learning",
      "Creativity",
      "Management",
      "Self-control",
      "Resilience",
      "Order",
      "Vision",
      "Finances",
      "Agility",
    ],
    Soul: [
      "Connection",
      "Spirituality",
      "Purpose",
      "Values",
      "Altruism",
      "Insight",
      "Gratitude",
      "Nature",
      "Joy",
      "Self-esteem",
    ],
  },
};

const PILLAR_META: Record<
  PillarKey,
  {
    icon: string;
    label: Record<Locale, string>;
    glow: string;
    segment: string;
    text: string;
    line: string;
  }
> = {
  Soul: {
    icon: "🏵️",
    label: { es: "Alma", en: "Soul" },
    glow: "rgba(250, 205, 95, 0.45)",
    segment: "rgba(250, 205, 95, 0.55)",
    text: "rgba(255, 242, 204, 0.96)",
    line: "rgba(250, 205, 95, 0.74)",
  },
  Body: {
    icon: "🫀",
    label: { es: "Cuerpo", en: "Body" },
    glow: "rgba(98, 225, 232, 0.43)",
    segment: "rgba(98, 225, 232, 0.52)",
    text: "rgba(224, 252, 255, 0.95)",
    line: "rgba(98, 225, 232, 0.7)",
  },
  Mind: {
    icon: "🧠",
    label: { es: "Mente", en: "Mind" },
    glow: "rgba(184, 141, 255, 0.45)",
    segment: "rgba(184, 141, 255, 0.54)",
    text: "rgba(240, 231, 255, 0.96)",
    line: "rgba(184, 141, 255, 0.76)",
  },
};

function levelFromStep(stepId: EditorGuideStepId): 1 | 2 | 3 {
  if (stepId === "wheel-core") return 1;
  if (stepId === "wheel-pillars") return 2;
  return 3;
}

function compactTraitLabel(label: string): string {
  return label.length > 11 ? `${label.slice(0, 10)}…` : label;
}

export function EditorGuideWheel({
  stepId,
  locale,
}: {
  stepId: EditorGuideStepId;
  locale: Locale;
}) {
  const level = levelFromStep(stepId);

  const traitSegments = PILLARS.flatMap((pillar) =>
    TRAITS_BY_PILLAR[locale][pillar].map((trait, index) => ({
      pillar,
      trait: compactTraitLabel(trait),
      index: PILLARS.indexOf(pillar) * 10 + index,
    })),
  );

  return (
    <div className="relative mx-auto h-[21.5rem] w-[21.5rem] max-w-full">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.19),transparent_72%)]" />

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
            className="h-12 w-12 object-contain drop-shadow-[0_0_18px_rgba(196,181,253,0.5)]"
          />
        </div>
      </div>

      <div
        className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 transition-all duration-700"
        style={{
          background: `conic-gradient(from -90deg, ${PILLAR_META.Body.segment} 0deg 120deg, ${PILLAR_META.Mind.segment} 120deg 240deg, ${PILLAR_META.Soul.segment} 240deg 360deg)`,
          mask: "radial-gradient(circle, transparent 33%, black 34%, black 74%, transparent 75%)",
          opacity: level >= 2 ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${level >= 2 ? 1 : 0.82})`,
        }}
      />

      {PILLARS.map((pillar, index) => {
        const angle = -90 + index * 120 + 60;
        const radius = 76;
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
              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: PILLAR_META[pillar].text, textShadow: `0 0 14px ${PILLAR_META[pillar].glow}` }}
            >
              <span className="text-[13px] leading-none">{PILLAR_META[pillar].icon}</span>
              <span>{PILLAR_META[pillar].label[locale]}</span>
            </div>
          </div>
        );
      })}

      <div
        className="absolute left-1/2 top-1/2 h-[17rem] w-[17rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 transition-all duration-700"
        style={{
          background:
            "repeating-conic-gradient(from -90deg, rgba(248,250,252,0.36) 0deg 0.9deg, rgba(148,163,184,0.06) 0.9deg 12deg)",
          mask: "radial-gradient(circle, transparent 65%, black 66%, black 89%, transparent 90%)",
          opacity: level >= 3 ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${level >= 3 ? 1 : 0.86})`,
        }}
      />

      {traitSegments.map(({ trait, index, pillar }) => {
        const angle = -90 + index * 12 + 6;
        const radius = 131;
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
              y2="7"
              stroke={PILLAR_META[pillar].line}
              strokeWidth="1"
              transform={`rotate(${angle + 90})`}
            />
            <text
              x="0"
              y="-1"
              fill={PILLAR_META[pillar].text}
              fontSize="9.4"
              fontWeight="500"
              letterSpacing="0.02em"
              textAnchor={textAnchor}
              transform={`rotate(${rotate}) translate(0, -7)`}
            >
              {trait}
            </text>
          </svg>
        );
      })}
    </div>
  );
}

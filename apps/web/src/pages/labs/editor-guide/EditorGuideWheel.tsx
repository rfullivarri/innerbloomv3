import type { EditorGuideStepId } from "./guideConfig";

type Locale = "es" | "en";
type PillarKey = "Body" | "Mind" | "Soul";

const PILLARS: PillarKey[] = ["Soul", "Mind", "Body"];
const PILLAR_LAYOUT: Record<
  PillarKey,
  {
    startAngle: number;
    sweepAngle: number;
  }
> = {
  Mind: {
    startAngle: -60,
    sweepAngle: 120,
  },
  Body: {
    startAngle: 60,
    sweepAngle: 120,
  },
  Soul: {
    startAngle: 180,
    sweepAngle: 120,
  },
};

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
    label: Record<Locale, string>;
    glow: string;
    segment: string;
    text: string;
    line: string;
  }
> = {
  Soul: {
    label: { es: "Alma", en: "Soul" },
    glow: "rgba(245, 198, 79, 0.5)",
    segment: "rgba(245, 198, 79, 0.56)",
    text: "rgba(255, 236, 170, 0.98)",
    line: "rgba(245, 198, 79, 0.78)",
  },
  Body: {
    label: { es: "Cuerpo", en: "Body" },
    glow: "rgba(88, 219, 255, 0.45)",
    segment: "rgba(88, 219, 255, 0.55)",
    text: "rgba(224, 252, 255, 0.95)",
    line: "rgba(88, 219, 255, 0.74)",
  },
  Mind: {
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

function polarToCartesian(angleDeg: number, radius: number) {
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

export function EditorGuideWheel({
  stepId,
  locale,
}: {
  stepId: EditorGuideStepId;
  locale: Locale;
}) {
  const level = levelFromStep(stepId);

  const traitSegments = PILLARS.flatMap((pillar) => {
    const { startAngle, sweepAngle } = PILLAR_LAYOUT[pillar];
    const traits = TRAITS_BY_PILLAR[locale][pillar];
    const traitSlotAngle = sweepAngle / traits.length;

    return traits.map((trait, index) => ({
      pillar,
      trait,
      angle: startAngle + traitSlotAngle * (index + 0.5),
    }));
  });

  const size = 356;
  const center = size / 2;
  const ringSize = 204;
  const traitRingSize = 276;
  const pillarLabelRadius = 66;
  const traitTickRadius = 126;
  const traitLabelRadius = 141;

  return (
    <div className="relative mx-auto h-[23rem] w-full max-w-[24.5rem] overflow-visible">
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
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 transition-all duration-700"
        style={{
          width: `${ringSize}px`,
          height: `${ringSize}px`,
          background: `conic-gradient(from 30deg, ${PILLAR_META.Mind.segment} 0deg 120deg, ${PILLAR_META.Body.segment} 120deg 240deg, ${PILLAR_META.Soul.segment} 240deg 360deg)`,
          mask: "radial-gradient(circle, transparent 33%, black 34%, black 74%, transparent 75%)",
          opacity: level >= 2 ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${level >= 2 ? 1 : 0.82})`,
        }}
      />

      {PILLARS.map((pillar) => {
        const { startAngle, sweepAngle } = PILLAR_LAYOUT[pillar];
        const angle = startAngle + sweepAngle / 2;
        const position = polarToCartesian(angle, pillarLabelRadius);

        return (
          <div
            key={pillar}
            className="pointer-events-none absolute left-1/2 top-1/2 w-[68px] -translate-x-1/2 -translate-y-1/2 text-center transition-all duration-700"
            style={{
              transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${level >= 2 ? 1 : 0.75})`,
              opacity: level >= 2 ? 1 : 0,
            }}
          >
            <span
              className="block text-[10px] font-semibold uppercase tracking-[0.06em]"
              style={{
                color: PILLAR_META[pillar].text,
                textShadow: `0 0 12px ${PILLAR_META[pillar].glow}`,
              }}
            >
              {PILLAR_META[pillar].label[locale]}
            </span>
          </div>
        );
      })}

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-700"
        style={{
          width: `${traitRingSize}px`,
          height: `${traitRingSize}px`,
          background:
            "radial-gradient(circle, transparent 62%, rgba(255,255,255,0.1) 63%, rgba(255,255,255,0.08) 64%, transparent 65%)",
          opacity: level >= 3 ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${level >= 3 ? 1 : 0.86})`,
        }}
      />

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible transition-all duration-700"
        style={{ opacity: level >= 3 ? 1 : 0 }}
      >
        {traitSegments.map(({ trait, angle, pillar }) => {
          const tickStart = polarToCartesian(angle, traitTickRadius);
          const tickEnd = polarToCartesian(angle, traitTickRadius + 8);
          const labelPoint = polarToCartesian(angle, traitLabelRadius);
          const textAnchor = angle > 90 && angle < 270 ? "end" : "start";
          const rotate = textAnchor === "end" ? angle + 180 : angle;

          return (
            <g key={`${pillar}-${trait}`}>
              <line
                x1={center + tickStart.x}
                y1={center + tickStart.y}
                x2={center + tickEnd.x}
                y2={center + tickEnd.y}
                stroke={PILLAR_META[pillar].line}
                strokeWidth="1"
              />
              <text
                x={center + labelPoint.x}
                y={center + labelPoint.y}
                fill={PILLAR_META[pillar].text}
                fontSize="8"
                fontWeight="500"
                letterSpacing="0.01em"
                textAnchor={textAnchor}
                dominantBaseline="central"
                transform={`rotate(${rotate} ${center + labelPoint.x} ${center + labelPoint.y})`}
              >
                {trait}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

import type { CSSProperties } from "react";

import type { Language } from "../../../../content/officialLandingContent";
import { TraitIcon } from "../../../../pages/labs/mobile-premium/MobilePremiumPrimitives";
import styles from "../HeroProductScene.module.css";

const COPY = {
  es: {
    aria: "Detalle de tarea con score",
    title: "Detalle de tarea",
    edit: "Editar",
    taskName: "No dulces",
    meta: "Nutrición · Difícil",
    trait: "Nutrición",
    habitDevelopment: "DESARROLLO DEL HÁBITO",
    status: "Hábito en construcción",
    progress: "Estás avanzando de forma constante.",
    fragile: "Frágil <50",
    strong: "Fuerte ≥80",
    activeWindow: "Ventana activa",
    projected: "proyectado",
    months: ["mar", "abr", "may", "jun"],
  },
  en: {
    aria: "Task detail with score",
    title: "Task detail",
    edit: "Edit",
    taskName: "No sweets",
    meta: "Nutrition · Hard",
    trait: "Nutrition",
    habitDevelopment: "HABIT DEVELOPMENT",
    status: "Building habit",
    progress: "You are making steady progress.",
    fragile: "Fragile <50",
    strong: "Strong ≥80",
    activeWindow: "Active window",
    projected: "projected",
    months: ["Mar", "Apr", "May", "Jun"],
  },
} satisfies Record<Language, {
  aria: string;
  title: string;
  edit: string;
  taskName: string;
  meta: string;
  trait: string;
  habitDevelopment: string;
  status: string;
  progress: string;
  fragile: string;
  strong: string;
  activeWindow: string;
  projected: string;
  months: string[];
}>;

const MONTH_VALUES = [
  { value: 53, state: "building" },
  { value: 72, state: "building" },
  { value: 38, state: "fragile" },
  { value: 91, state: "strong", projected: true },
];

function MarketingScoreRing({ score }: { score: number }) {
  return (
    <div
      className={styles.marketingScoreRing}
      style={{
        "--score-angle": `${score * 3.6}deg`,
        "--score-angle-target": `${score * 3.6}deg`,
      } as CSSProperties}
    >
      <div>
        <strong>{score}</strong>
        <span>Score</span>
      </div>
    </div>
  );
}

export function TaskDetailPreview({ language = "es" }: { language?: Language }) {
  const copy = COPY[language];

  return (
    <article className={`${styles.floatingCard} ${styles.taskDetailCard}`} aria-label={copy.aria}>
      <div className={styles.cardHeader}>
        <span className={styles.backGlyph}>‹</span>
        <p className={styles.cardTitle}>{copy.title}</p>
        <span>{copy.edit}</span>
      </div>
      <div className={styles.taskIdentity}>
        <div className={styles.traitBubble}>
          <TraitIcon size={18} trait={copy.trait} />
        </div>
        <div>
          <strong>{copy.taskName}</strong>
          <span>{copy.meta}</span>
        </div>
      </div>
      <p className={styles.habitDevelopmentLabel}>{copy.habitDevelopment}</p>
      <div className={styles.scoreGrid} data-language={language}>
        <MarketingScoreRing score={52} />
        <div>
          <span className={styles.marketingStatusChip} data-language={language}>{copy.status}</span>
          <p>{copy.progress}</p>
        </div>
      </div>
      <div className={styles.scoreLegend}>
        <span data-tone="fragile">{copy.fragile}</span>
        <span data-tone="building">50-79</span>
        <span data-tone="strong">{copy.strong}</span>
      </div>
      <div className={styles.activeWindow}>
        <p>{copy.activeWindow}</p>
        <div>
          {MONTH_VALUES.map((month, monthIndex) => (
            <span className={styles.monthDot} data-state={month.state} key={copy.months[monthIndex]} style={{ "--month-index": monthIndex } as CSSProperties}>
              <strong>{month.value}%</strong>
              <small>{copy.months[monthIndex]}{month.projected ? <em>{copy.projected}</em> : null}</small>
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

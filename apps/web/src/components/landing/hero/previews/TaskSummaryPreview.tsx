import type { CSSProperties } from "react";

import type { Language } from "../../../../content/officialLandingContent";
import { TraitIcon } from "../../../../pages/labs/mobile-premium/MobilePremiumPrimitives";
import styles from "../HeroProductScene.module.css";

const COPY = {
  es: {
    aria: "Vista compacta de lista de tareas",
    title: "Lista de tareas",
    cadence: "Flow · 3/semana",
    period: "Semana",
    columns: ["Tarea", "Semanas", "Progreso"],
    weeks: "S1 S2 S3 S4 S5",
    tasks: [
      { name: "20 min sin pantallas...", meta: "Recuperación · Difícil", progress: "0/3", trait: "Recovery", tone: "violet", weeks: [false, false, false, false, false] },
      { name: "2L de agua", meta: "Hidratación · Hábito fácil", progress: "3/3", trait: "Hydration", tone: "body", weeks: [true, true, true, false, false] },
      { name: "Ayuno hasta las 14hs", meta: "Nutrición · Hábito fácil", progress: "3/3", trait: "Nutrition", tone: "green", weeks: [true, false, true, false, false] },
    ],
  },
  en: {
    aria: "Compact task list preview",
    title: "Task list",
    cadence: "Flow · 3/week",
    period: "Week",
    columns: ["Task", "Weeks", "Progress"],
    weeks: "W1 W2 W3 W4 W5",
    tasks: [
      { name: "No screens 20 min...", meta: "Recovery · Hard", progress: "0/3", trait: "Recovery", tone: "violet", weeks: [false, false, false, false, false] },
      { name: "2L of water", meta: "Hydration · Easy habit", progress: "3/3", trait: "Hydration", tone: "body", weeks: [true, true, true, false, false] },
      { name: "Fast until 2 PM", meta: "Nutrition · Easy habit", progress: "3/3", trait: "Nutrition", tone: "green", weeks: [true, false, true, false, false] },
    ],
  },
} satisfies Record<Language, {
  aria: string;
  title: string;
  cadence: string;
  period: string;
  columns: string[];
  weeks: string;
  tasks: Array<{ name: string; meta: string; progress: string; trait: string; tone: string; weeks: boolean[] }>;
}>;

export function TaskSummaryPreview({ language = "es" }: { language?: Language }) {
  const copy = COPY[language];

  return (
    <article className={`${styles.floatingCard} ${styles.summaryCard}`} aria-label={copy.aria}>
      <div className={`${styles.cardHeader} ${styles.summaryCardHeader}`}>
        <p className={styles.summaryModeMeta}>{copy.cadence}</p>
        <p className={styles.cardTitle}>{copy.title}</p>
        <span>{copy.period}</span>
      </div>
      <div className={styles.summaryColumns} aria-hidden="true">
        {copy.columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <div className={styles.summaryRows}>
        {copy.tasks.map((task, taskIndex) => (
          <div className={styles.summaryRow} key={task.name} style={{ "--task-index": taskIndex } as CSSProperties}>
            <span className={styles.summaryTaskIcon} data-tone={task.tone}>
              <TraitIcon size={17} trait={task.trait} />
            </span>
            <div className={styles.summaryTaskText}>
              <strong>{task.name}</strong>
              <span>{task.meta}</span>
            </div>
            <div className={styles.summaryWeeks} aria-hidden="true">
              {task.weeks.map((isActive, weekIndex) => (
                <i key={weekIndex} data-active={isActive ? "true" : undefined} style={{ "--week-index": weekIndex } as CSSProperties} />
              ))}
              <span>{copy.weeks}</span>
            </div>
            <span className={styles.summaryProgress} data-complete={task.progress === "3/3" ? "true" : undefined}>
              <svg viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="15" />
                <circle cx="18" cy="18" r="15" pathLength={1} />
              </svg>
              <small>{task.progress}</small>
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

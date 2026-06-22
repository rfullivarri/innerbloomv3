import { useId, type CSSProperties } from "react";

import type { Language } from "../../../../content/officialLandingContent";
import styles from "../HeroProductScene.module.css";

type RhythmMode = "Low" | "Chill" | "Flow" | "Evolve";

const RHYTHMS: Array<{
  mode: RhythmMode;
  cadence: string;
  oscillations: number;
  amplitude: number;
  activeRatio: number;
}> = [
  { mode: "Low", cadence: "1x/semana", oscillations: 2, amplitude: 14, activeRatio: 0.26 },
  { mode: "Chill", cadence: "2x/semana", oscillations: 2.25, amplitude: 15, activeRatio: 0.38 },
  { mode: "Flow", cadence: "3x/semana", oscillations: 2.75, amplitude: 16, activeRatio: 0.54 },
  { mode: "Evolve", cadence: "4x/semana", oscillations: 3.25, amplitude: 17, activeRatio: 0.64 },
];

const EMOTION_DOTS = [
  "amber", "amber", "muted", "green", "green", "green", "amber", "amber", "muted", "muted", "muted", "muted",
  "violet", "green", "violet", "violet", "green", "violet", "body", "violet", "muted", "muted", "muted", "muted",
  "body", "violet", "body", "body", "amber", "green", "body", "amber", "muted", "muted", "muted", "muted",
  "green", "violet", "violet", "body", "muted", "violet", "violet", "violet", "muted", "muted", "muted", "muted",
  "coral", "green", "violet", "body", "amber", "muted", "green", "muted", "muted", "muted", "muted", "muted",
  "muted", "green", "muted", "muted", "muted", "amber", "muted", "muted", "muted", "muted", "muted", "muted",
  "muted", "green", "amber", "green", "amber", "muted", "amber", "muted", "muted", "muted", "muted", "muted",
];

const COPY = {
  es: {
    rhythmAria: "Ritmos adaptativos de Innerbloom",
    rhythms: "Ritmos",
    intensity: "Elegí tu intensidad",
    viewAll: "Ver todos",
    cadenceSuffix: "semana",
    emotionAria: "Emotion Chart de Innerbloom",
    emotionPanelAria: "Vista compacta de emociones",
    period: "Período analizado: 4 feb – 4 ago",
    months: ["MAY", "JUN", "JUL", "AGO"],
    emotion: "Motivación",
    emotionSummary: "emoción más frecuente",
  },
  en: {
    rhythmAria: "Innerbloom adaptive rhythms",
    rhythms: "Rhythms",
    intensity: "Choose your intensity",
    viewAll: "View all",
    cadenceSuffix: "week",
    emotionAria: "Innerbloom Emotion Chart",
    emotionPanelAria: "Compact emotion preview",
    period: "Analyzed period: Feb 4 – Aug 4",
    months: ["MAY", "JUN", "JUL", "AUG"],
    emotion: "Motivation",
    emotionSummary: "most frequent emotion",
  },
} satisfies Record<Language, {
  rhythmAria: string;
  rhythms: string;
  intensity: string;
  viewAll: string;
  cadenceSuffix: string;
  emotionAria: string;
  emotionPanelAria: string;
  period: string;
  months: string[];
  emotion: string;
  emotionSummary: string;
}>;

function buildRhythmPath(oscillations: number, amplitude: number, phase = -0.34) {
  const points = Array.from({ length: 88 }, (_, index) => {
    const progress = index / 87;
    const x = 8 + 124 * progress;
    const y = 22 + Math.sin(progress * oscillations * Math.PI * 2 + phase) * amplitude;
    return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  });

  return points.join(" ");
}

function RhythmWave({
  rhythm,
  active,
}: {
  rhythm: (typeof RHYTHMS)[number];
  active: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const gradientId = `landing-rhythm-${id}`;
  const clipId = `landing-rhythm-clip-${id}`;
  const path = buildRhythmPath(rhythm.oscillations, rhythm.amplitude);
  const activeWidth = 8 + 124 * rhythm.activeRatio;

  return (
    <svg className={styles.rhythmWave} viewBox="0 0 140 44" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="54%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#f0abfc" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={activeWidth} height="44" />
        </clipPath>
      </defs>
      <path className={styles.rhythmWaveTrack} d={path} pathLength={1} />
      <path className={styles.rhythmWaveGlow} d={path} pathLength={1} clipPath={`url(#${clipId})`} stroke={`url(#${gradientId})`} />
      <path className={active ? styles.rhythmWaveActive : styles.rhythmWaveLine} d={path} pathLength={1} clipPath={`url(#${clipId})`} stroke={`url(#${gradientId})`} />
    </svg>
  );
}

export function RhythmPreviewCard({ language = "es" }: { language?: Language }) {
  const copy = COPY[language];

  return (
    <article className={`${styles.floatingCard} ${styles.rhythmCard}`} aria-label={copy.rhythmAria}>
      <div className={styles.rhythmCycle}>
        <div className={styles.rhythmPanel}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.cardTitle}>{copy.rhythms}</p>
              <p className={styles.cardMeta}>{copy.intensity}</p>
            </div>
            <span>{copy.viewAll}</span>
          </div>
          <div className={styles.rhythmRows}>
            {RHYTHMS.map((rhythm) => (
              <div className={styles.rhythmRow} data-active={rhythm.mode === "Flow" ? "true" : undefined} key={rhythm.mode}>
                <span>{rhythm.mode}</span>
                <RhythmWave rhythm={rhythm} active={rhythm.mode === "Flow"} />
                <small>{rhythm.cadence.replace("semana", copy.cadenceSuffix)}</small>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.emotionPanel} aria-label={copy.emotionPanelAria}>
          <div className={styles.emotionPanelHeader}>
            <span />
            <p>{copy.period}</p>
          </div>
          <div className={styles.emotionMonthRow}>
            {copy.months.map((month) => (
              <span key={month}>{month}</span>
            ))}
          </div>
          <div className={styles.emotionMatrix} aria-hidden="true">
            {EMOTION_DOTS.map((tone, index) => (
              <i key={`${tone}-${index}`} data-tone={tone} style={{ "--dot-index": index } as CSSProperties} />
            ))}
          </div>
          <div className={styles.emotionSummary}>
            <i />
            <div>
              <strong>{copy.emotion}</strong>
              <span>{copy.emotionSummary}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function EmotionChartPreviewCard({ language = "es" }: { language?: Language }) {
  const copy = COPY[language];

  return (
    <article className={`${styles.floatingCard} ${styles.rhythmCard} ${styles.emotionChartCard}`} aria-label={copy.emotionAria}>
      <div className={styles.emotionPanel} aria-label={copy.emotionPanelAria}>
        <div className={styles.emotionPanelHeader}>
          <span />
          <p>{copy.period}</p>
        </div>
        <div className={styles.emotionMonthRow}>
          {copy.months.map((month) => (
            <span key={month}>{month}</span>
          ))}
        </div>
        <div className={styles.emotionMatrix} aria-hidden="true">
          {EMOTION_DOTS.map((tone, index) => (
            <i key={`${tone}-${index}`} data-tone={tone} style={{ "--dot-index": index } as CSSProperties} />
          ))}
        </div>
        <div className={styles.emotionSummary}>
          <i />
          <div>
            <strong>{copy.emotion}</strong>
            <span>{copy.emotionSummary}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

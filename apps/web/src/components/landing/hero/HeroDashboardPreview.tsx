import type { CSSProperties } from "react";

import type { Language } from "../../../content/officialLandingContent";
import { TraitIcon } from "../../../pages/labs/mobile-premium/MobilePremiumPrimitives";
import styles from "./HeroProductScene.module.css";

const energyLines = [
  { label: "HP", value: 86, color: "var(--mp-body)", path: "M8 98 C28 90 38 106 58 94 S94 87 116 83 S150 80 168 64 S202 58 226 46" },
  { label: "Mood", value: 67, color: "var(--mp-amber)", path: "M8 104 C30 100 42 108 60 99 S96 92 118 91 S162 88 226 82" },
  { label: "Focus", value: 41, color: "var(--mp-violet)", path: "M8 112 C32 108 48 121 70 118 S110 120 132 112 S170 118 226 122" },
];

const COPY = {
  es: {
    dailyEnergy: "Energía diaria",
    days7: "7 DÍAS",
    energyAria: "Energía diaria HP 86, Mood 67, Focus 41",
    dominantEmotion: "Emoción predominante",
    last15Days: "últimos 15 días",
    happiness: "Felicidad",
    balance: "Equilibrio",
    soulDominant: "PREDOMINIO ALMA",
    ofGp: "de GP",
    remaining: "246 GP restantes",
    moderation: "Moderación",
    edit: "Editar",
    sugar: "Azúcar",
    navTasks: "Tareas",
    navAchievements: "Logros",
    navAria: "Vista previa de navegación del producto",
  },
  en: {
    dailyEnergy: "Daily Energy",
    days7: "7 DAYS",
    energyAria: "Daily Energy HP 86, Mood 67, Focus 41",
    dominantEmotion: "Dominant emotion",
    last15Days: "last 15 days",
    happiness: "Happiness",
    balance: "Balance",
    soulDominant: "SOUL DOMINANT",
    ofGp: "of GP",
    remaining: "246 GP remaining",
    moderation: "Moderation",
    edit: "Edit",
    sugar: "Sugar",
    navTasks: "Tasks",
    navAchievements: "Achievements",
    navAria: "Product navigation preview",
  },
} satisfies Record<Language, {
  dailyEnergy: string;
  days7: string;
  energyAria: string;
  dominantEmotion: string;
  last15Days: string;
  happiness: string;
  balance: string;
  soulDominant: string;
  ofGp: string;
  remaining: string;
  moderation: string;
  edit: string;
  sugar: string;
  navTasks: string;
  navAchievements: string;
  navAria: string;
}>;

const navItems = (copy: (typeof COPY)[Language]) => [
  { label: "DQuest", icon: "leaf" },
  { label: "Dashboard", icon: "grid", active: true },
  { label: copy.navTasks, icon: "tasks" },
  { label: copy.navAchievements, icon: "cup" },
];

function EnergyChart({ copy }: { copy: (typeof COPY)[Language] }) {
  return (
    <div className={styles.energyBlock}>
      <div className={styles.phoneSectionHeader}>
        <p>{copy.dailyEnergy}</p>
        <span>{copy.days7}</span>
      </div>
      <svg className={styles.energyChart} viewBox="0 0 292 150" role="img" aria-label={copy.energyAria}>
        <defs>
          <linearGradient id="landing-energy-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[44, 78, 112].map((y) => (
          <line key={y} x1="8" x2="226" y1={y} y2={y} stroke="var(--mp-chart-grid)" strokeDasharray="2 8" />
        ))}
        <path d="M8 112 C32 108 48 121 70 118 S110 120 132 112 S170 118 226 122 L226 146 L8 146 Z" fill="url(#landing-energy-fill)" />
        {energyLines.map((line, index) => (
          <g key={line.label} style={{ "--line-index": index } as CSSProperties}>
            <path className={styles.energyLine} d={line.path} fill="none" pathLength={1} stroke={line.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={line.label === "HP" ? 2.8 : 2.2} />
            <circle className={styles.energyPoint} cx="226" cy={line.label === "HP" ? 46 : line.label === "Mood" ? 82 : 122} r="4.5" fill={line.color} />
            <text x="244" y={(line.label === "HP" ? 46 : line.label === "Mood" ? 82 : 122) + 4} fill={line.color} fontSize="12">
              {line.label}
              <tspan dx="5" fill="var(--mp-data-value)" fontWeight="700">{line.value}%</tspan>
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function BalanceMiniCard({ copy }: { copy: (typeof COPY)[Language] }) {
  return (
    <div className={styles.balanceGrid}>
      <div className={styles.emotionCard}>
        <p>{copy.dominantEmotion}</p>
        <span>{copy.last15Days}</span>
        <div className={styles.emotionRow}>
          <i />
          <strong>{copy.happiness}</strong>
        </div>
        <div className={styles.emotionDots} aria-hidden="true">
          {Array.from({ length: 11 }, (_, index) => (
            <span key={index} data-tone={index % 4} />
          ))}
        </div>
      </div>
      <div className={styles.balanceCard}>
        <p>{copy.balance}</p>
        <span>{copy.soulDominant}</span>
        <strong>47% <small>{copy.ofGp}</small></strong>
        <div className={styles.balanceTrack} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}

function BottomNav({ copy }: { copy: (typeof COPY)[Language] }) {
  return (
    <nav className={styles.phoneBottomNav} aria-label={copy.navAria}>
      {navItems(copy).map((item) => (
        <span data-active={item.active ? "true" : undefined} key={item.label}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {item.icon === "leaf" ? <path d="M5 15c4-8 10-9 14-9-1 8-5 13-12 13-1.5 0-2.5-.5-2.5-.5S6 16 10 12" /> : null}
            {item.icon === "grid" ? <path d="M7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7zM14 14h3v3h-3z" /> : null}
            {item.icon === "tasks" ? <path d="M8 6h11M8 12h11M8 18h11M4 6h.01M4 12h.01M4 18h.01" /> : null}
            {item.icon === "cup" ? <path d="M8 4h8v4a4 4 0 0 1-8 0V4ZM6 6H4v1a3 3 0 0 0 3 3M18 6h2v1a3 3 0 0 1-3 3M12 12v5M9 20h6" /> : null}
          </svg>
          <small>{item.label}</small>
        </span>
      ))}
    </nav>
  );
}

export function HeroDashboardPreview({ language = "es" }: { language?: Language }) {
  const copy = COPY[language];

  return (
    <div className={styles.dashboardPreview}>
      <header className={styles.phoneHeader}>
        <div>
          <p className={styles.phoneBrand}>
            <img src="/innerbloom-flower-logo.png" alt="" aria-hidden="true" />
            <span>INNERBLOOM</span>
          </p>
          <h2 style={{ color: "#fff8ec" }}>Dashboard</h2>
        </div>
        <button type="button" aria-label="Menu" tabIndex={-1}>
          <span />
          <span />
        </button>
      </header>

      <section className={styles.levelPanel}>
        <div>
          <span>Level 29 · 8.077 GP</span>
          <span>{copy.remaining}</span>
        </div>
        <i aria-hidden="true"><b /></i>
      </section>

      <section className={styles.moderationPreview}>
        <div className={styles.phoneSectionHeader}>
          <p>{copy.moderation}</p>
          <span>{copy.edit}</span>
        </div>
        <div className={styles.moderationRow}>
          <TraitIcon size={18} trait="Nutrición" />
          <strong>{copy.sugar}</strong>
          <span>4<small>d</small></span>
        </div>
      </section>

      <EnergyChart copy={copy} />
      <BalanceMiniCard copy={copy} />
      <BottomNav copy={copy} />
    </div>
  );
}

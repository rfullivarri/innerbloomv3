import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import styles from './HeroPhoneShowcaseLabPage.module.css';

type SceneKey =
  | 'dashboardIdle'
  | 'dashboardScroll'
  | 'toAchievements'
  | 'achievementsIdle'
  | 'toTaskEditor'
  | 'taskModalOpen'
  | 'taskAiCreate'
  | 'backToDashboard';

type SceneDefinition = {
  key: SceneKey;
  durationMs: number;
};

const SCENE_TIMELINE: SceneDefinition[] = [
  { key: 'dashboardIdle', durationMs: 2500 },
  { key: 'dashboardScroll', durationMs: 1700 },
  { key: 'toAchievements', durationMs: 1400 },
  { key: 'achievementsIdle', durationMs: 2200 },
  { key: 'toTaskEditor', durationMs: 1400 },
  { key: 'taskModalOpen', durationMs: 1400 },
  { key: 'taskAiCreate', durationMs: 2200 },
  { key: 'backToDashboard', durationMs: 1600 },
];

const LOOP_MS = SCENE_TIMELINE.reduce((total, scene) => total + scene.durationMs, 0);

function useLoopTimeline() {
  const prefersReducedMotion = useReducedMotion();
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setElapsedMs(0);
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      setElapsedMs((now - start) % LOOP_MS);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    return {
      panelTranslatePercent: 0,
      dashboardScrollOffset: 0,
      sealsActive: false,
      modalVisible: false,
      aiProgress: 0,
    };
  }

  let cursor = 0;
  let current = SCENE_TIMELINE[0];
  for (const scene of SCENE_TIMELINE) {
    if (elapsedMs < cursor + scene.durationMs) {
      current = scene;
      break;
    }
    cursor += scene.durationMs;
  }

  const sceneProgress = Math.min(1, Math.max(0, (elapsedMs - cursor) / current.durationMs));

  const panelTranslatePercent = (() => {
    if (current.key === 'toAchievements') return -100 * sceneProgress;
    if (current.key === 'achievementsIdle') return -100;
    if (current.key === 'toTaskEditor') return -100 - 100 * sceneProgress;
    if (current.key === 'taskModalOpen' || current.key === 'taskAiCreate') return -200;
    if (current.key === 'backToDashboard') return -200 + 200 * sceneProgress;
    return 0;
  })();

  const dashboardScrollOffset =
    current.key === 'dashboardScroll'
      ? -20 * sceneProgress
      : current.key === 'toAchievements'
        ? -20
        : 0;

  const modalVisible = current.key === 'taskModalOpen' || current.key === 'taskAiCreate';
  const aiProgress = current.key === 'taskAiCreate' ? sceneProgress : current.key === 'backToDashboard' ? 1 : 0;

  return {
    panelTranslatePercent,
    dashboardScrollOffset,
    sealsActive: current.key === 'achievementsIdle',
    modalVisible,
    aiProgress,
  };
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.phoneFrame}>
      <div className={styles.phoneNotch} />
      <div className={styles.phoneScreen}>{children}</div>
    </div>
  );
}

function DashboardScene({ scrollOffset }: { scrollOffset: number }) {
  return (
    <section className={styles.scenePanel}>
      <div className={styles.sceneHeader}>
        <span>Dashboard</span>
        <span className={styles.badge}>Dark mode</span>
      </div>
      <div className={styles.dashboardViewport} style={{ transform: `translateY(${scrollOffset}px)` }}>
        <article className={styles.heroCard}>
          <img src="/Evolve-Mood.jpg" alt="Violet owl avatar" />
          <div>
            <strong>Violet Owl · Evolve</strong>
            <p>GP 1,280 · Lvl 9 · 12-day streak</p>
          </div>
        </article>
        <article className={styles.metricCard}>
          <p>Daily Quest</p>
          <strong>3/4 completed</strong>
          <div className={styles.progressTrack}><span style={{ width: '75%' }} /></div>
        </article>
        <article className={styles.metricCard}>
          <p>Energy Rhythm</p>
          <strong>FLOW</strong>
          <div className={styles.miniBars}>
            <i /><i /><i /><i className={styles.activeBar} />
          </div>
        </article>
      </div>
    </section>
  );
}

function AchievementsScene({ active }: { active: boolean }) {
  return (
    <section className={styles.scenePanel}>
      <div className={styles.sceneHeader}><span>Achievements</span><span className={styles.badge}>Seals</span></div>
      <div className={styles.sealGrid}>
        {['7 Day Streak', 'Body Balance', 'Focus Master', 'Quest Combo'].map((seal, index) => (
          <article
            key={seal}
            className={`${styles.sealCard} ${active ? styles.sealCardActive : ''}`}
            style={{ animationDelay: `${index * 0.2}s` }}
          >
            <span>◉</span>
            <strong>{seal}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function TaskEditorScene({ modalVisible, aiProgress }: { modalVisible: boolean; aiProgress: number }) {
  return (
    <section className={styles.scenePanel}>
      <div className={styles.sceneHeader}><span>Task editor</span><span className={styles.badge}>AI assist</span></div>
      <article className={styles.editorCard}>
        <p>Mission draft</p>
        <strong>Morning Focus Ritual</strong>
        <small>Category: Mind · Frequency: Daily</small>
      </article>
      <article className={`${styles.modalCard} ${modalVisible ? styles.modalCardVisible : ''}`}>
        <p>Create task with AI</p>
        <div className={styles.inputRow}>“Build a 15-min focus reset after lunch”</div>
        <div className={styles.aiProgressTrack}><span style={{ width: `${Math.max(8, aiProgress * 100)}%` }} /></div>
        <small>{aiProgress >= 0.96 ? 'Task ready ✓' : 'Generating adaptive steps...'}</small>
      </article>
    </section>
  );
}

function HeroPhoneShowcase() {
  const timeline = useLoopTimeline();

  return (
    <PhoneFrame>
      <div className={styles.phoneViewportTrack} style={{ transform: `translateX(${timeline.panelTranslatePercent}%)` }}>
        <DashboardScene scrollOffset={timeline.dashboardScrollOffset} />
        <AchievementsScene active={timeline.sealsActive} />
        <TaskEditorScene modalVisible={timeline.modalVisible} aiProgress={timeline.aiProgress} />
      </div>
    </PhoneFrame>
  );
}

export default function HeroPhoneShowcaseLabPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.copyCol}>
          <p className={styles.kicker}>Labs · Hero experiment</p>
          <h1>
            Tu progreso, <span>en tiempo real.</span>
          </h1>
          <p>
            Variante experimental del primer fold: texto y CTAs originales + un showcase móvil de Innerbloom en loop
            continuo para comunicar producto real desde el primer vistazo.
          </p>
          <div className={styles.ctaRow}>
            <Link className={styles.primaryCta} to="/onboarding">Comenzar ahora</Link>
            <a className={styles.secondaryCta} href="/landing-v2#highlights">Ver dashboard</a>
          </div>
        </div>

        <div className={styles.visualCol}>
          <HeroPhoneShowcase />
        </div>
      </section>
    </main>
  );
}

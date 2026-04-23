import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import styles from './HeroPhoneShowcaseLabPage.module.css';

const INITIAL_PAUSE_MS = 400;
const SCROLL_DURATION_MS = 3000;

const MOCK_PROFILE = {
  name: 'Sofía M.',
  gpTotal: 1280,
  level: 9,
  progress: 72,
};

const MOCK_ENERGY = [
  { label: 'Body', value: 78, color: '#8fe6d5' },
  { label: 'Mind', value: 64, color: '#9a97ff' },
  { label: 'Soul', value: 81, color: '#f7bc8a' },
] as const;

const MOCK_BALANCE = [
  { label: 'Body', value: 35, color: '#8fe6d5' },
  { label: 'Mind', value: 30, color: '#9a97ff' },
  { label: 'Soul', value: 35, color: '#f7bc8a' },
] as const;

const MOCK_EMOTION_POINTS = [58, 62, 57, 70, 66, 74, 69, 78] as const;

const MOCK_STREAKS = {
  cadence: 'FLOW · 3x / WEEK',
  streak: '12-day streak',
  week: 'week 3/3',
  month: 'month 11/12',
  quarter: '3m 29/36',
};

function easeInOut(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function useDashboardScrollProgress(isReady: boolean) {
  const prefersReducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion || !isReady) {
      setProgress(0);
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const movementElapsed = Math.max(0, elapsed - INITIAL_PAUSE_MS);
      const nextProgress = Math.min(1, movementElapsed / SCROLL_DURATION_MS);
      setProgress(nextProgress);

      if (nextProgress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isReady, prefersReducedMotion]);

  return prefersReducedMotion || !isReady ? 0 : easeInOut(progress);
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.phoneFrame}>
      <div className={styles.phoneNotch} />
      <div className={styles.phoneScreen}>{children}</div>
    </div>
  );
}

function MockOverallProgressCard() {
  return (
    <article style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          aria-hidden
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #b991ff, #6f83ff)',
            boxShadow: '0 0 0 2px rgba(255,255,255,0.16)',
          }}
        />
        <div>
          <p style={eyebrowStyle}>Overall Progress</p>
          <p style={headlineStyle}>{MOCK_PROFILE.name}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        <div style={metricBoxStyle}>
          <p style={metricLabelStyle}>GP total</p>
          <p style={metricValueStyle}>{MOCK_PROFILE.gpTotal}</p>
        </div>
        <div style={metricBoxStyle}>
          <p style={metricLabelStyle}>Level</p>
          <p style={metricValueStyle}>{MOCK_PROFILE.level}</p>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={metricLabelStyle}>Progress</p>
          <p style={metricLabelStyle}>{MOCK_PROFILE.progress}%</p>
        </div>
        <div style={progressTrackStyle}>
          <div style={{ ...progressFillStyle, width: `${MOCK_PROFILE.progress}%` }} />
        </div>
      </div>
    </article>
  );
}

function MockEnergyCard() {
  return (
    <article style={cardStyle}>
      <p style={eyebrowStyle}>Daily Energy</p>
      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
        {MOCK_ENERGY.map((item) => (
          <div key={item.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <p style={metricLabelStyle}>{item.label}</p>
              <p style={metricValueSmallStyle}>{item.value}</p>
            </div>
            <div style={progressTrackStyle}>
              <div style={{ ...progressFillStyle, width: `${item.value}%`, background: item.color }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function MockBalanceCard() {
  return (
    <article style={cardStyle}>
      <p style={eyebrowStyle}>Balance</p>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        {MOCK_BALANCE.map((item) => (
          <div key={item.label} style={{ flex: 1 }}>
            <p style={{ ...metricLabelStyle, marginBottom: 6 }}>{item.label}</p>
            <div style={{ ...progressTrackStyle, height: 52, position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  insetInline: 0,
                  bottom: 0,
                  height: `${item.value}%`,
                  borderRadius: 12,
                  background: `linear-gradient(180deg, ${item.color}, rgba(255,255,255,0.08))`,
                }}
              />
            </div>
            <p style={{ ...metricValueSmallStyle, marginTop: 6 }}>{item.value}%</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function MockEmotionChartCard({ anchorRef }: { anchorRef: React.RefObject<HTMLElement | null> }) {
  const points = useMemo(
    () =>
      MOCK_EMOTION_POINTS
        .map((value, index) => {
          const x = 18 + index * 34;
          const y = 96 - value;
          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' '),
    [],
  );

  return (
    <article ref={anchorRef} style={cardStyle}>
      <p style={eyebrowStyle}>Emotion Chart</p>
      <div style={{ marginTop: 12, background: 'rgba(8, 10, 24, 0.88)', borderRadius: 14, padding: 10 }}>
        <svg viewBox="0 0 280 110" width="100%" height="110" role="img" aria-label="Mock emotion chart">
          <defs>
            <linearGradient id="emotionStroke" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#8fe6d5" />
              <stop offset="100%" stopColor="#b292ff" />
            </linearGradient>
          </defs>
          <path d="M 18 96 L 256 96" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
          <path d={points} fill="none" stroke="url(#emotionStroke)" strokeWidth="3" strokeLinecap="round" />
          {MOCK_EMOTION_POINTS.map((value, index) => {
            const x = 18 + index * 34;
            const y = 96 - value;
            return <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" fill="#f4f0ff" />;
          })}
        </svg>
      </div>
    </article>
  );
}

function MockStreaksCard({ anchorRef }: { anchorRef: React.RefObject<HTMLElement | null> }) {
  return (
    <article ref={anchorRef} style={{ ...cardStyle, marginBottom: 28 }}>
      <p style={eyebrowStyle}>Streaks</p>
      <p style={{ ...headlineStyle, marginTop: 8 }}>{MOCK_STREAKS.cadence}</p>
      <p style={{ ...metricValueStyle, marginTop: 6 }}>{MOCK_STREAKS.streak}</p>
      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        {[MOCK_STREAKS.week, MOCK_STREAKS.month, MOCK_STREAKS.quarter].map((item) => (
          <div key={item} style={metricBoxStyle}>
            <p style={{ ...metricValueSmallStyle, fontWeight: 600 }}>{item}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function MockDashboardScene({ scrollProgress, onReady }: { scrollProgress: number; onReady: () => void }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const emotionRef = useRef<HTMLElement | null>(null);
  const streaksRef = useRef<HTMLElement | null>(null);
  const readyRef = useRef(false);
  const scrollRangeRef = useRef({ start: 0, end: 0 });

  useEffect(() => {
    const viewport = viewportRef.current;
    const emotion = emotionRef.current;
    const streaks = streaksRef.current;
    if (!viewport || !emotion || !streaks || readyRef.current) return;

    const timer = window.setTimeout(() => {
      const viewportRect = viewport.getBoundingClientRect();
      const resolveTop = (element: HTMLElement) =>
        element.getBoundingClientRect().top - viewportRect.top + viewport.scrollTop;
      const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      const emotionTop = resolveTop(emotion);
      const streakTop = resolveTop(streaks);
      const start = 0;
      const endTarget = Math.max(emotionTop - viewport.clientHeight * 0.2, streakTop - viewport.clientHeight * 0.55);
      const end = Math.max(start, Math.min(maxScroll, endTarget));

      scrollRangeRef.current = { start, end };
      viewport.scrollTop = start;
      readyRef.current = true;
      onReady();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [onReady]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const { start, end } = scrollRangeRef.current;
    viewport.scrollTop = start + (end - start) * scrollProgress;
  }, [scrollProgress]);

  return (
    <section className={`${styles.scenePanel} ${styles.scenePanelSingle}`}>
      <div ref={viewportRef} className={styles.realViewport}>
        <div style={sceneInnerStyle}>
          <MockOverallProgressCard />
          <MockEnergyCard />
          <MockBalanceCard />
          <MockEmotionChartCard anchorRef={emotionRef} />
          <MockStreaksCard anchorRef={streaksRef} />
        </div>
      </div>
    </section>
  );
}

function HeroPhoneShowcase() {
  const [dashboardReady, setDashboardReady] = useState(false);
  const scrollProgress = useDashboardScrollProgress(dashboardReady);

  return (
    <PhoneFrame>
      <MockDashboardScene scrollProgress={scrollProgress} onReady={() => setDashboardReady(true)} />
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
            Iteración del experimento móvil enfocada solo en el dashboard demo, con encuadre deliberado y scroll
            suave para mostrar señales clave de progreso.
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

const sceneInnerStyle: CSSProperties = {
  padding: '14px 14px 0',
  minHeight: '100%',
  display: 'grid',
  gap: 10,
  background: 'linear-gradient(180deg, #070a19 0%, #050816 60%, #060712 100%)',
};

const cardStyle: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(20,24,44,0.9), rgba(9,12,27,0.92))',
  border: '1px solid rgba(186, 174, 235, 0.26)',
  borderRadius: 16,
  padding: 14,
  boxShadow: '0 10px 24px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255,255,255,0.08)',
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'rgba(224, 220, 250, 0.78)',
};

const headlineStyle: CSSProperties = {
  margin: 0,
  marginTop: 2,
  fontSize: 16,
  lineHeight: 1.15,
  fontWeight: 700,
  color: '#f4f0ff',
};

const metricBoxStyle: CSSProperties = {
  borderRadius: 12,
  border: '1px solid rgba(171, 163, 218, 0.26)',
  background: 'rgba(10, 13, 32, 0.75)',
  padding: '8px 10px',
};

const metricLabelStyle: CSSProperties = {
  margin: 0,
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'rgba(219, 214, 244, 0.75)',
};

const metricValueStyle: CSSProperties = {
  margin: 0,
  marginTop: 4,
  fontSize: 22,
  fontWeight: 700,
  color: '#fbf8ff',
};

const metricValueSmallStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  color: '#f5f1ff',
};

const progressTrackStyle: CSSProperties = {
  height: 8,
  borderRadius: 999,
  background: 'rgba(234, 229, 255, 0.12)',
  overflow: 'hidden',
};

const progressFillStyle: CSSProperties = {
  height: '100%',
  borderRadius: 999,
  background: 'linear-gradient(90deg, #8fe6d5, #9a97ff)',
};

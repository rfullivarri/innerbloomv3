import styles from './VisibleProgressMock.module.css';

type Language = 'en' | 'es';

type EmotionName = 'Calm' | 'Happy' | 'Motivated' | 'Sad' | 'Anxious' | 'Frustrated' | 'Tired';

const EMOTION_COLORS: Record<EmotionName, string> = {
  Calm: '#60a5fa',
  Happy: '#fbbf24',
  Motivated: '#34d399',
  Sad: '#a78bfa',
  Anxious: '#fb7185',
  Frustrated: '#f97316',
  Tired: '#64748b'
};

const EMOTION_GRID: EmotionName[][] = [
  ['Happy', 'Calm', 'Motivated', 'Tired', 'Happy', 'Calm', 'Motivated'],
  ['Calm', 'Motivated', 'Happy', 'Anxious', 'Calm', 'Motivated', 'Happy'],
  ['Motivated', 'Happy', 'Calm', 'Frustrated', 'Motivated', 'Happy', 'Calm'],
  ['Happy', 'Calm', 'Motivated', 'Sad', 'Happy', 'Calm', 'Motivated'],
  ['Calm', 'Motivated', 'Happy', 'Anxious', 'Calm', 'Motivated', 'Happy'],
  ['Motivated', 'Happy', 'Calm', 'Tired', 'Motivated', 'Happy', 'Calm']
];

const STREAKS = [
  { title: 'Morning Walk', tag: 'Body', days: 12, progress: 0.88 },
  { title: 'Deep Work', tag: 'Mind', days: 9, progress: 0.72 },
  { title: 'Night Journal', tag: 'Soul', days: 7, progress: 0.62 }
];

function BalanceSlice() {
  return (
    <section className={styles.slice} aria-label="Balance preview">
      <header className={styles.sliceHeader}>
        <p>Balance</p>
        <span>Body · Mind · Soul</span>
      </header>
      <div className={styles.radarWrap}>
        <svg viewBox="0 0 220 220" role="img" aria-label="Balance radar chart">
          <defs>
            <linearGradient id="vp-radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.58" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.48" />
            </linearGradient>
          </defs>
          {[28, 52, 76, 96].map((radius) => (
            <circle key={radius} cx="110" cy="110" r={radius} className={styles.radarRing} />
          ))}
          {Array.from({ length: 8 }).map((_, index) => {
            const angle = (Math.PI * 2 * index) / 8 - Math.PI / 2;
            return (
              <line
                key={index}
                x1="110"
                y1="110"
                x2={110 + Math.cos(angle) * 96}
                y2={110 + Math.sin(angle) * 96}
                className={styles.radarAxis}
              />
            );
          })}
          <polygon
            points="110,30 152,56 176,110 150,156 110,174 72,150 42,110 68,62"
            fill="url(#vp-radar-fill)"
            stroke="#93c5fd"
            strokeWidth="2"
          />
        </svg>
      </div>
    </section>
  );
}

function EmotionSlice({ language }: { language: Language }) {
  return (
    <section className={styles.slice} aria-label="Emotion chart preview">
      <header className={styles.sliceHeader}>
        <p>{language === 'es' ? 'Emotion Chart' : 'Emotion Chart'}</p>
        <span>{language === 'es' ? 'Últimos 6 meses' : 'Last 6 months'}</span>
      </header>
      <div className={styles.legend}>
        {(Object.keys(EMOTION_COLORS) as EmotionName[]).map((emotion) => (
          <span key={emotion}>
            <i style={{ backgroundColor: EMOTION_COLORS[emotion] }} />
            {emotion}
          </span>
        ))}
      </div>
      <div className={styles.emotionGrid}>
        {EMOTION_GRID.map((column, colIndex) => (
          <div key={colIndex} className={styles.emotionColumn}>
            {column.map((cell, rowIndex) => (
              <span key={`${colIndex}-${rowIndex}`} style={{ backgroundColor: EMOTION_COLORS[cell] }} aria-label={cell} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function StreaksSlice({ language }: { language: Language }) {
  return (
    <section className={styles.slice} aria-label="Streaks preview">
      <header className={styles.sliceHeader}>
        <p>🔥 Streaks</p>
        <span>{language === 'es' ? 'FLOW · 3×/SEMANA' : 'FLOW · 3×/WEEK'}</span>
      </header>
      <div className={styles.tabs}>
        <span className={styles.active}>Body</span>
        <span>Mind</span>
        <span>Soul</span>
      </div>
      <div className={styles.streakList}>
        {STREAKS.map((streak) => (
          <article key={streak.title} className={styles.streakItem}>
            <div className={styles.streakHead}>
              <strong>{streak.title}</strong>
              <em>{streak.days}d</em>
            </div>
            <small>{streak.tag}</small>
            <div className={styles.progressTrack}>
              <span style={{ width: `${streak.progress * 100}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function VisibleProgressMock({ language }: { language: Language }) {
  return (
    <div className={styles.masterViewport} aria-label="Visible progress mock">
      <div className={styles.composition}>
        <div className={styles.leftColumn}>
          <BalanceSlice />
          <EmotionSlice language={language} />
        </div>
        <div className={styles.rightColumn}>
          <StreaksSlice language={language} />
        </div>
      </div>
    </div>
  );
}

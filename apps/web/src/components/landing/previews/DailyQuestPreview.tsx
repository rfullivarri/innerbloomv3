import type { CSSProperties } from 'react';

type Language = 'es' | 'en';

const QUESTS: Record<Language, { label: string; pillar: 'focus' | 'health' | 'mind' | 'soul'; status: 'done' | 'pending' }[]> = {
  es: [
    { label: 'Bloque de foco', pillar: 'focus', status: 'done' },
    { label: 'Movimiento 20m', pillar: 'health', status: 'pending' },
    { label: 'Journal 5 minutos', pillar: 'mind', status: 'done' },
    { label: 'Check-in emocional', pillar: 'soul', status: 'pending' }
  ],
  en: [
    { label: 'Focus block', pillar: 'focus', status: 'done' },
    { label: 'Movement 20m', pillar: 'health', status: 'pending' },
    { label: '5-minute journal', pillar: 'mind', status: 'done' },
    { label: 'Emotion check-in', pillar: 'soul', status: 'pending' }
  ]
};

const PROGRESS = 0.72;
const CIRCUMFERENCE = 150.8;

export function DailyQuestPreview({ language = 'es' }: { language?: Language }) {
  const statusLabel = language === 'es' ? { done: 'Hecha', pending: 'Pendiente' } : { done: 'Done', pending: 'Pending' };
  const progressLabel = language === 'es' ? 'completado' : 'complete';
  const ariaLabel =
    language === 'es' ? 'Vista previa de tus quests diarias' : 'Preview of your daily quests';

  return (
    <div className="feature-mini-panel daily-quest-preview">
      <div className="quest-progress">
        <svg
          className="quest-ring"
          width="96"
          height="96"
          viewBox="0 0 64 64"
          aria-hidden
          style={{ '--progress': PROGRESS, '--circumference': CIRCUMFERENCE } as CSSProperties}
        >
          <defs>
            <linearGradient id="questGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-2)" />
            </linearGradient>
          </defs>
          <circle className="track" cx="32" cy="32" r="24" />
          <circle className="progress" cx="32" cy="32" r="24" />
        </svg>
        <div className="quest-progress__label">
          <strong>{Math.round(PROGRESS * 100)}%</strong>
          <span>{progressLabel}</span>
        </div>
      </div>

      <div className="quest-list" aria-label={ariaLabel}>
        {QUESTS[language].map((quest) => (
          <div key={quest.label} className={`quest-item ${quest.status}`}>
            <div className="quest-name">
              <span className="status-dot" />
              <span>{quest.label}</span>
            </div>
            <div className="feature-grid-two">
              <span className={`pill ${quest.pillar}`}>
                {quest.pillar === 'focus' && 'Focus'}
                {quest.pillar === 'health' && 'Health'}
                {quest.pillar === 'mind' && 'Mind'}
                {quest.pillar === 'soul' && 'Soul'}
              </span>
              <span className="quest-status">{statusLabel[quest.status]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import type { CSSProperties } from 'react';

const QUESTS = [
  { label: 'Bloque de foco', pillar: 'focus', status: 'done' as const },
  { label: 'Movimiento 20m', pillar: 'health', status: 'pending' as const },
  { label: 'Journal 5 minutos', pillar: 'mind', status: 'done' as const },
  { label: 'Check-in emocional', pillar: 'soul', status: 'pending' as const }
];

const PROGRESS = 0.72;
const CIRCUMFERENCE = 150.8;

export function DailyQuestPreview() {
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
          <span>completado</span>
        </div>
      </div>

      <div className="quest-list" aria-label="Vista previa de tus quests diarias">
        {QUESTS.map((quest) => (
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
              <span className="quest-status">{quest.status === 'done' ? 'Hecha' : 'Pendiente'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

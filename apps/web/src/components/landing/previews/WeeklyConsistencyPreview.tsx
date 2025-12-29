import type { CSSProperties } from 'react';

type Language = 'es' | 'en';

const STREAK = [2, 3, 4, 4, 5, 3, 4, 6];
const ACTIVE_FROM = 4; // últimas 4 semanas en racha

export function WeeklyConsistencyPreview({ language = 'es' }: { language?: Language }) {
  const ariaLabel =
    language === 'es' ? 'Mini gráfica de constancia semanal' : 'Mini weekly consistency chart';
  const streakLabel = language === 'es' ? 'Racha actual: 4 semanas' : 'Current streak: 4 weeks';
  const goalLabel = language === 'es' ? 'Objetivo: 8 semanas' : 'Goal: 8 weeks';

  return (
    <div className="feature-mini-panel streak-preview">
      <div className="streak-grid" aria-label={ariaLabel}>
        {STREAK.map((value, index) => (
          <div
            key={index}
            className={`streak-bar ${index >= STREAK.length - ACTIVE_FROM ? 'active' : ''}`}
          >
            <div className="inner" style={{ '--value': `${value * 12}%` } as CSSProperties} />
          </div>
        ))}
      </div>
      <div className="streak-legend">
        <span>{streakLabel}</span>
        <span className="muted-12">{goalLabel}</span>
      </div>
    </div>
  );
}

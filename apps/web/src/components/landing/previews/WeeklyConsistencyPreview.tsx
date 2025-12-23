import type { CSSProperties } from 'react';

const STREAK = [2, 3, 4, 4, 5, 3, 4, 6];
const ACTIVE_FROM = 4; // últimas 4 semanas en racha

export function WeeklyConsistencyPreview() {
  return (
    <div className="feature-mini-panel streak-preview">
      <div className="streak-grid" aria-label="Mini gráfica de constancia semanal">
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
        <span>Racha actual: 4 semanas</span>
        <span className="muted-12">Objetivo: 8 semanas</span>
      </div>
    </div>
  );
}

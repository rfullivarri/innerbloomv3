import type { CSSProperties } from 'react';

const XP_PROGRESS = 0.64;

export function XpLevelPreview() {
  return (
    <div className="feature-mini-panel xp-preview">
      <div className="xp-header">
        <div>
          <p className="muted-12">Progreso de nivel</p>
          <strong>Nivel 7</strong>
        </div>
        <span className="xp-pill">+45 XP esta semana</span>
      </div>

      <div className="xp-progress" aria-label="Barra de XP">
        <div className="fill" style={{ '--progress': XP_PROGRESS } as CSSProperties} />
      </div>

      <div className="xp-meta">
        <span>320 XP</span>
        <span>Objetivo 500 XP</span>
      </div>
    </div>
  );
}

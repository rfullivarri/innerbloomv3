import type { CSSProperties } from 'react';

type Language = 'es' | 'en';

const XP_PROGRESS = 0.64;

export function XpLevelPreview({ language = 'es' }: { language?: Language }) {
  const levelLabel = language === 'es' ? 'Nivel 7' : 'Level 7';
  const progressLabel = language === 'es' ? 'Progreso de nivel' : 'Level progress';
  const weeklyXp = language === 'es' ? '+45 GP esta semana' : '+45 GP this week';
  const goalLabel = language === 'es' ? 'Objetivo 500 GP' : 'Goal 500 GP';
  const ariaLabel = language === 'es' ? 'Barra de GP' : 'GP bar';

  return (
    <div className="feature-mini-panel xp-preview">
      <div className="xp-header">
        <div>
          <p className="muted-12">{progressLabel}</p>
          <strong>{levelLabel}</strong>
        </div>
        <span className="xp-pill">{weeklyXp}</span>
      </div>

      <div className="xp-progress" aria-label={ariaLabel}>
        <div className="fill" style={{ '--progress': XP_PROGRESS } as CSSProperties} />
      </div>

      <div className="xp-meta">
        <span>320 GP</span>
        <span>{goalLabel}</span>
      </div>
    </div>
  );
}

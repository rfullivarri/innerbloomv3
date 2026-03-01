import type { CSSProperties } from 'react';

type Language = 'es' | 'en';

const MISSION_PROGRESS = 0.4;

export function MissionsRewardsPreview({ language = 'es' }: { language?: Language }) {
  const activeLabel = language === 'es' ? 'Misión activa' : 'Active mission';
  const missionTitle = language === 'es' ? 'Reforzar hábito matinal' : 'Strengthen morning habit';
  const streakBonus = language === 'es' ? '🔥 Racha +2' : '🔥 Streak +2';
  const xpBonus = language === 'es' ? '🎁 120 GP Bonus' : '🎁 120 GP Bonus';
  const progressLabel = language === 'es' ? 'Progreso de misión' : 'Mission progress';

  return (
    <div className="feature-mini-panel missions-preview">
      <div className="mission-head">
        <div>
          <p className="muted-12">{activeLabel}</p>
          <strong>{missionTitle}</strong>
        </div>
        <span className="pill mind">Mind</span>
      </div>

      <div className="mission-progress" aria-label={progressLabel}>
        <div className="fill" style={{ '--progress': MISSION_PROGRESS } as CSSProperties} />
      </div>

      <div className="mission-badges">
        <span className="badge">
          <span>{streakBonus}</span>
        </span>
        <span className="badge reward">
          <span>{xpBonus}</span>
        </span>
      </div>
    </div>
  );
}

import type { CSSProperties } from 'react';

const MISSION_PROGRESS = 0.4;

export function MissionsRewardsPreview() {
  return (
    <div className="feature-mini-panel missions-preview">
      <div className="mission-head">
        <div>
          <p className="muted-12">Misión activa</p>
          <strong>Reforzar hábito matinal</strong>
        </div>
        <span className="pill mind">Mind</span>
      </div>

      <div className="mission-progress" aria-label="Progreso de misión">
        <div className="fill" style={{ '--progress': MISSION_PROGRESS } as CSSProperties} />
      </div>

      <div className="mission-badges">
        <span className="badge">
          <span>🔥 Racha +2</span>
        </span>
        <span className="badge reward">
          <span>🎁 120 XP Bonus</span>
        </span>
      </div>
    </div>
  );
}

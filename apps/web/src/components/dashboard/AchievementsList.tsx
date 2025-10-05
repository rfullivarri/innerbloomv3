import { Card } from '../common/Card';

export function AchievementsList() {
  return (
    <Card title="Achievements" subtitle="Celebrate milestones as you unlock them">
      <div className="space-y-3 text-sm text-text-subtle">
        <p>TODO: connect achievements endpoint once available.</p>
        <p className="text-xs text-text-muted">
          You’ll see your badges, streak freezes, and weekly trophies here as soon as the API ships these stats.
        </p>
      </div>
    </Card>
  );
}

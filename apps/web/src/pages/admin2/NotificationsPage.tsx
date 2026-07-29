import { useEffect, useState } from 'react';
import { FeedbackManagerPage } from '../admin/FeedbackManagerPage';
import {
  fetchAdminProductNotificationPreferenceSummary,
  type AdminProductNotificationPreferenceSummary,
} from '../../lib/adminApi';

export function NotificationsPage() {
  const [summary, setSummary] = useState<AdminProductNotificationPreferenceSummary | null>(null);

  useEffect(() => {
    void fetchAdminProductNotificationPreferenceSummary()
      .then((response) => setSummary(response.summary))
      .catch((error) => console.error('[admin] product notification preference summary failed', error));
  }, []);

  const metrics = [
    { label: 'Weekly Wrapped', value: summary?.weeklyWrappedEnabled ?? '—' },
    { label: 'Growth Calibration', value: summary?.growthCalibrationEnabled ?? '—' },
    { label: 'Monthly Wrapped', value: summary?.monthlyWrappedEnabled ?? '—' },
    { label: 'Habit achievements', value: summary?.habitAchievementEnabled ?? '—' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Notifications</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Feedback & Notifications</h2>
        <p className="mt-2 text-sm text-[color:var(--admin-muted)]">Administra feedback y envíos con contexto de usuario en una sola vista.</p>
      </header>
      <section className="border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Inner Bloom 2.0</p>
            <h3 className="mt-1 text-lg font-semibold">Native product notifications</h3>
            <p className="mt-1 text-sm text-[color:var(--admin-muted)]">Opt-in preferences stored per user. Delivery is scheduled locally on each device.</p>
          </div>
          <p className="text-sm text-[color:var(--admin-muted)]">Configured users: <span className="font-semibold text-[color:var(--admin-text)]">{summary?.configuredUsers ?? '—'}</span></p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div className="border border-[color:var(--admin-border)] p-4" key={metric.label}>
              <p className="text-xs text-[color:var(--admin-muted)]">{metric.label}</p>
              <p className="mt-1 text-2xl font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>
      </section>
      <FeedbackManagerPage compactUserPicker />
    </div>
  );
}

import { FeedbackManagerPage } from '../admin/FeedbackManagerPage';

export function NotificationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Notifications</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Feedback & Notifications</h2>
        <p className="mt-2 text-sm text-[color:var(--admin-muted)]">Reutiliza la lógica existente envuelta dentro del nuevo shell de admin2.</p>
      </header>
      <FeedbackManagerPage compactUserPicker />
    </div>
  );
}

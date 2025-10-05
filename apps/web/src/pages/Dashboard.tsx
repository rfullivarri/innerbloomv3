import { AchievementsList } from '../components/dashboard/AchievementsList';
import { EmotionHeatmap } from '../components/dashboard/EmotionHeatmap';
import { LevelCard } from '../components/dashboard/LevelCard';
import { PillarsSection } from '../components/dashboard/PillarsSection';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { StreakCard } from '../components/dashboard/StreakCard';
import { Navbar } from '../components/layout/Navbar';
import { useUser } from '../state/UserContext';

export default function DashboardPage() {
  const { userId } = useUser();

  if (!userId) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 px-4 pb-16 pt-6 md:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <section className="glass-card rounded-3xl border border-white/10 px-6 py-8 text-text shadow-glow">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-text-subtle">Game Mode</p>
                <h2 className="font-display text-3xl font-semibold text-white">Chill mode engaged</h2>
                <p className="text-sm text-text-subtle">
                  Keep stacking wins across Body · Mind · Soul. Your next mission summary lands every Sunday evening.
                </p>
              </div>
              <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-text-subtle">
                <div className="flex items-center justify-between gap-6">
                  <span>Daily quests</span>
                  <strong className="text-xl text-white">3</strong>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span>XP today</span>
                  <strong className="text-xl text-white">—</strong>
                </div>
                <p className="text-xs text-text-muted">TODO: Replace with live mission payload when available.</p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <LevelCard userId={userId} />
            <StreakCard userId={userId} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <PillarsSection />
            <EmotionHeatmap userId={userId} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <RecentActivity userId={userId} />
            <AchievementsList />
          </section>
        </div>
      </main>
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { DEMO_DASHBOARD_DATA } from '../demo-mode/data';
import { DEMO_COPY } from '../demo-mode/copy';
import { resolveDemoLanguage, DEMO_GUIDE_STEPS } from '../demo-mode/config';
import type { DemoLanguage } from '../demo-mode/types';
import { useThemePreference } from '../theme/ThemePreferenceProvider';

function Meter({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-[color:var(--color-overlay-2)]">
      <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-500" style={{ width: `${value}%` }} />
    </div>
  );
}

export default function DemoDashboardPage() {
  const location = useLocation();
  const initialLanguage = useMemo<DemoLanguage>(() => resolveDemoLanguage(location.search), [location.search]);
  const [language, setLanguage] = useState<DemoLanguage>(initialLanguage);
  const { preference, setPreference } = useThemePreference();
  const copy = DEMO_COPY[language];
  const data = DEMO_DASHBOARD_DATA;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-3 py-4 sm:px-4 md:px-6">
      <header className="sticky top-2 z-20 mb-4 rounded-ib-lg border border-[color:var(--color-border-subtle)] bg-[image:var(--glass-bg)] p-3 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--color-text-muted)]">Innerbloom</p>
            <h1 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.title}</h1>
            <p className="text-sm text-[color:var(--color-text-muted)]">{copy.subtitle}</p>
          </div>
          <Link to="/" className="inline-flex rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-text)] hover:bg-[color:var(--color-overlay-2)]">
            ✕ {copy.exit}
          </Link>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="text-xs text-[color:var(--color-text-muted)]">{copy.lang}</span>
          <button type="button" onClick={() => setLanguage('es')} className={`rounded-full px-2 py-1 text-xs ${language === 'es' ? 'bg-[color:var(--color-overlay-2)] text-[color:var(--color-text)]' : 'text-[color:var(--color-text-muted)]'}`}>ES</button>
          <button type="button" onClick={() => setLanguage('en')} className={`rounded-full px-2 py-1 text-xs ${language === 'en' ? 'bg-[color:var(--color-overlay-2)] text-[color:var(--color-text)]' : 'text-[color:var(--color-text-muted)]'}`}>EN</button>
          <button type="button" onClick={() => setPreference(preference === 'dark' ? 'light' : 'dark')} className="rounded-full border border-[color:var(--color-border-soft)] px-2 py-1 text-xs text-[color:var(--color-text)]">
            {preference === 'dark' ? '☀︎' : '☾'}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <Card title={`✨ ${copy.overall}`} data-demo-target="overall-progress">
            <p className="text-3xl font-semibold text-[color:var(--color-text)]">Lvl {data.overallProgress.level}</p>
            <p>{data.overallProgress.xp.toLocaleString()} GP · {data.overallProgress.xpToNext.toLocaleString()} GP to next</p>
            <Meter value={data.overallProgress.completion} />
          </Card>
          <Card title={`🔥 ${copy.streaks}`} data-demo-target="streaks">
            <p>{data.streaks.current} day streak · best {data.streaks.best}</p>
            <Meter value={(data.streaks.current / data.streaks.weeklyTarget) * 100} />
          </Card>
          <Card title={`💠 ${copy.energy}`} data-demo-target="daily-energy">
            <p>HP {data.dailyEnergy.hp}% · Mood {data.dailyEnergy.mood}% · Focus {data.dailyEnergy.focus}%</p>
            <Meter value={Math.round((data.dailyEnergy.hp + data.dailyEnergy.mood + data.dailyEnergy.focus) / 3)} />
          </Card>
          <Card title={`🪴 ${copy.cultivation}`} data-demo-target="daily-cultivation">
            <p>+{data.dailyCultivation.todayXp} GP today</p>
            <p>{data.dailyCultivation.weekXp} GP this week</p>
            <Meter value={data.dailyCultivation.consistency} />
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card title={`⚖️ ${copy.balance}`} data-demo-target="balance">
            <p>Body {data.balance.body}% · Mind {data.balance.mind}% · Soul {data.balance.soul}%</p>
            <Meter value={Math.round((data.balance.body + data.balance.mind + data.balance.soul) / 3)} />
          </Card>
          <Card title={`💗 ${copy.emotion}`} data-demo-target="emotion-chart">
            <div className="flex items-end gap-2">
              {data.emotions.map((day) => (
                <div key={day.day} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-sm bg-gradient-to-t from-cyan-400/80 to-fuchsia-400/80" style={{ height: `${Math.max(16, day.value)}px` }} />
                  <span className="text-[10px] text-[color:var(--color-text-muted)]">{day.day}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title={`🎯 ${copy.quest}`} data-demo-target="daily-quest">
            <p className="font-semibold text-[color:var(--color-text)]">{data.dailyQuest.title}</p>
            <p>+{data.dailyQuest.reward} GP</p>
          </Card>
          <Card title={`🛡️ ${copy.moderation}`} data-demo-target="moderation">
            {data.moderation.map((item) => (
              <p key={item.key} className="capitalize">{item.key}: {item.status === 'ok' ? 'OK' : 'Watch'}</p>
            ))}
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card title={`🧩 ${copy.taskDetail}`} data-demo-target="task-detail">
            {data.tasks.map((task) => (
              <article key={task.id} className="rounded-ib-md border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3">
                <p className="font-semibold text-[color:var(--color-text)]">{task.title}</p>
                <p className="text-xs text-[color:var(--color-text-muted)]">{task.pillar}</p>
                <Meter value={task.progress} />
              </article>
            ))}
          </Card>
          <Card title="Guided walkthrough (ready)">
            <p className="text-xs text-[color:var(--color-text-muted)]">steps configured: {DEMO_GUIDE_STEPS.length}</p>
            <p className="text-xs text-[color:var(--color-text-muted)]">Targets are tagged with <code>data-demo-target</code> for the next phase.</p>
          </Card>
        </div>
      </section>
    </main>
  );
}

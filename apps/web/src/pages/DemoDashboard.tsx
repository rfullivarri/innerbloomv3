import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GuidedDemoOverlay } from '../components/demo/GuidedDemoOverlay';
import type { DemoLanguage } from '../config/demoGuidedTour';

function DemoCard({
  title,
  children,
  anchor,
  info,
}: {
  title: string;
  children: React.ReactNode;
  anchor: string;
  info: string;
}) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <article
      data-demo-anchor={anchor}
      className="relative rounded-3xl border border-slate-300/25 bg-white/80 p-4 shadow-xl shadow-slate-900/10 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70"
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-700 dark:text-slate-200">{title}</h2>
        <button
          type="button"
          className="h-6 w-6 rounded-full border border-slate-300 text-xs text-slate-700 dark:border-slate-600 dark:text-slate-200"
          onClick={() => setShowInfo((value) => !value)}
        >
          i
        </button>
      </header>
      {showInfo ? <p className="mb-3 rounded-xl bg-cyan-100/70 p-2 text-xs text-slate-800 dark:bg-cyan-900/35 dark:text-cyan-100">{info}</p> : null}
      {children}
    </article>
  );
}

export default function DemoDashboardPage() {
  const [language, setLanguage] = useState<DemoLanguage>('es');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showGuide, setShowGuide] = useState(true);

  return (
    <main className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-[#060b18] dark:text-slate-100">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <button type="button" onClick={() => setLanguage('es')} className="rounded-full border px-3 py-1 text-xs">ES</button>
              <button type="button" onClick={() => setLanguage('en')} className="rounded-full border px-3 py-1 text-xs">EN</button>
              <button type="button" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} className="rounded-full border px-3 py-1 text-xs">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>
            <Link to="/" className="rounded-full border border-rose-400/60 px-3 py-1 text-xs font-semibold text-rose-500">✕</Link>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DemoCard
              anchor="overall-progress"
              title="Overall Progress"
              info={language === 'es' ? 'Total GP, nivel y avance al próximo hito.' : 'Total GP, level, and next milestone progress.'}
            >
              <p className="text-3xl font-bold">3,177 GP · Lv 16</p>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-300/70 dark:bg-slate-800">
                <div className="h-full w-[57%] rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-300" />
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">57% to next level</p>
            </DemoCard>

            <DemoCard
              anchor="balance"
              title="Balance"
              info={language === 'es' ? 'Distribución de GP por pilares con predominio actual.' : 'GP distribution by pillars with current dominance.'}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="rounded-full bg-cyan-200/70 px-2 py-1 dark:bg-cyan-900/50">Body dominant</span>
                <span>Interactive radar</span>
              </div>
              <div className="mt-3 h-28 rounded-2xl border border-dashed border-cyan-400/50 bg-gradient-to-br from-cyan-200/50 to-violet-300/20 dark:from-cyan-900/30 dark:to-violet-900/30" />
            </DemoCard>

            <DemoCard
              anchor="daily-energy"
              title="Daily Energy"
              info={language === 'es' ? 'HP, Mood y Focus: energía que sube con acciones y cae con el tiempo.' : 'HP, Mood, and Focus: energy rises with actions and drains over time.'}
            >
              {['HP 74%', 'Mood 68%', 'Focus 59%'].map((item) => (
                <div key={item} className="mb-2">
                  <p className="text-xs uppercase tracking-[0.14em]">{item}</p>
                  <div className="mt-1 h-2 rounded-full bg-slate-300/70 dark:bg-slate-800">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-emerald-300 to-sky-400" />
                  </div>
                </div>
              ))}
            </DemoCard>

            <DemoCard
              anchor="emotion-chart"
              title="Emotion Chart"
              info={language === 'es' ? 'Histórico emocional con leyenda por color y emoción predominante.' : 'Emotional history with color legend and most frequent mood.'}
            >
              <div className="grid grid-cols-8 gap-1">
                {Array.from({ length: 40 }).map((_, index) => (
                  <span key={index} className="h-3 w-3 rounded-sm bg-fuchsia-300/80 odd:bg-cyan-300/80" />
                ))}
              </div>
              <p className="mt-2 text-xs">Most frequent: Calm</p>
            </DemoCard>

            <DemoCard
              anchor="streaks"
              title="Streaks"
              info={language === 'es' ? 'Rachas por pilar y periodo, con progreso por tarea.' : 'Streaks by pillar and range, with per-task progress.'}
            >
              <div className="mb-2 flex gap-2 text-xs"><span className="rounded-full bg-slate-800 px-2 py-1 text-white">Body</span><span>Mind</span><span>Soul</span></div>
              <div className="mb-2 flex gap-2 text-xs"><span>Week</span><span className="rounded-full bg-cyan-200 px-2 py-1 text-slate-900">Month</span><span>3M</span></div>
              <p className="text-sm">Top streaks + all tasks (tap to open Task Detail)</p>
            </DemoCard>

            <DemoCard
              anchor="daily-quest"
              title="Daily Quest"
              info={language === 'es' ? 'Retrospección diaria para emoción, tareas y confirmación del día.' : 'Daily retrospective for emotion, tasks, and day confirmation.'}
            >
              <ul className="space-y-1 text-sm">
                <li>• Select dominant emotion</li>
                <li>• Mark completed tasks</li>
                <li>• Earn GP + keep streaks</li>
                <li>• Confirm day</li>
              </ul>
            </DemoCard>

            <DemoCard anchor="daily-cultivation" title="Daily Cultivation" info="Visible in free demo.">
              <p className="text-sm">Micro-actions to sustain your growth rhythm.</p>
            </DemoCard>

            <DemoCard anchor="moderation" title="Moderation" info="Visible in free demo.">
              <p className="text-sm">Track moderation signals without judgment.</p>
            </DemoCard>
          </section>
        </div>
      </div>

      {showGuide ? <GuidedDemoOverlay language={language} onFinish={() => setShowGuide(false)} /> : null}
    </main>
  );
}

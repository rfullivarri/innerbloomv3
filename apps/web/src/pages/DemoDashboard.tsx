import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GuidedDemoOverlay } from '../components/demo/GuidedDemoOverlay';
import { DEMO_COPY, DEMO_LANGUAGE_STORAGE_KEY, resolveDemoLanguage } from '../config/demoContent';
import { DEMO_PILLAR_LABELS, DEMO_TASKS, type DemoTask } from '../config/demoData';
import type { DemoLanguage } from '../config/demoGuidedTour';
import { emitDemoEvent } from '../lib/telemetry';

function DemoCard({
  title,
  children,
  anchor,
  info,
}: {
  title: string;
  children: ReactNode;
  anchor: string;
  info: string;
}) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <article
      data-demo-anchor={anchor}
      className="relative rounded-3xl border border-slate-300/55 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur dark:border-slate-700/75 dark:bg-slate-900/75"
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-700 dark:text-slate-200">{title}</h2>
        <button
          type="button"
          aria-label="Info"
          className="h-6 w-6 rounded-full border border-slate-300 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
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

function TaskDetailModal({
  language,
  task,
  onClose,
}: {
  language: DemoLanguage;
  task: DemoTask;
  onClose: () => void;
}) {
  const copy = DEMO_COPY[language];
  const difficultyLabel = '●'.repeat(task.difficulty) + '○'.repeat(3 - task.difficulty);
  const statusLabel = copy.habitStates[task.status];

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/65 p-3 backdrop-blur-[2px] sm:items-center sm:p-6">
      <article className="w-full max-w-lg rounded-3xl border border-white/20 bg-slate-900/95 p-5 text-slate-100 shadow-[0_30px_70px_rgba(0,0,0,0.45)]">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">{copy.taskDetailTitle}</p>
            <h3 className="mt-1 text-xl font-semibold">{task.name}</h3>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-300">{DEMO_PILLAR_LABELS[language][task.pillar]}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
          >
            {copy.closeTaskDetail}
          </button>
        </header>

        <div className="space-y-4 text-sm">
          <section>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-300">{copy.taskDetailSections.weeklyProgress}</p>
            <div className="mt-2 h-2.5 rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300" style={{ width: `${task.weeklyProgress}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-300">{task.weeklyProgress}%</p>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">{copy.taskDetailSections.status}</p>
              <p className="mt-1 font-semibold text-cyan-200">{statusLabel}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">{copy.taskDetailSections.difficulty}</p>
              <p className="mt-1 font-semibold text-amber-200">{difficultyLabel}</p>
            </div>
          </section>

          <section>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-300">{copy.taskDetailSections.activity}</p>
            <div className="mt-2 flex gap-1">
              {task.activity.map((value, index) => (
                <span
                  key={`${task.id}-activity-${index}`}
                  className={`h-8 flex-1 rounded-md ${value === 1 ? 'bg-cyan-300/80' : 'bg-slate-700'}`}
                />
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">{copy.taskDetailSections.currentStreak}</p>
              <p className="mt-1 text-lg font-semibold">{task.streakCurrent}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">{copy.taskDetailSections.bestStreak}</p>
              <p className="mt-1 text-lg font-semibold">{task.streakBest}</p>
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}

export default function DemoDashboardPage() {
  const [language, setLanguage] = useState<DemoLanguage>(() => resolveDemoLanguage());
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showGuide, setShowGuide] = useState(true);
  const [selectedTask, setSelectedTask] = useState<DemoTask | null>(null);
  const copy = DEMO_COPY[language];

  useEffect(() => {
    emitDemoEvent('demo_opened', { language, theme });
    emitDemoEvent('demo_guided_started', { language });
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DEMO_LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const streakTasks = useMemo(() => DEMO_TASKS, []);

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
            <Link
              to="/"
              onClick={() => emitDemoEvent('demo_exited', { from: '/demo' })}
              className="rounded-full border border-rose-400/60 px-3 py-1 text-xs font-semibold text-rose-500"
            >
              ✕ {copy.exitLabel}
            </Link>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DemoCard anchor="overall-progress" title={copy.cards.overallProgress.title} info={copy.cards.overallProgress.info}>
              <p className="text-3xl font-bold">3,177 GP · Lv 16</p>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-300/70 dark:bg-slate-800">
                <div className="h-full w-[57%] rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-300" />
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{language === 'es' ? '57% al próximo nivel' : '57% to next level'}</p>
            </DemoCard>

            <DemoCard anchor="balance" title={copy.cards.balance.title} info={copy.cards.balance.info}>
              <div className="flex items-center justify-between text-sm">
                <span className="rounded-full bg-cyan-200/70 px-2 py-1 dark:bg-cyan-900/50">{language === 'es' ? 'Predominio Body' : 'Body dominant'}</span>
                <span>{language === 'es' ? 'Radar interactivo' : 'Interactive radar'}</span>
              </div>
              <div className="mt-3 h-28 rounded-2xl border border-dashed border-cyan-400/50 bg-gradient-to-br from-cyan-200/50 to-violet-300/20 dark:from-cyan-900/30 dark:to-violet-900/30" />
            </DemoCard>

            <DemoCard anchor="daily-energy" title={copy.cards.dailyEnergy.title} info={copy.cards.dailyEnergy.info}>
              {['HP 74%', 'Mood 68%', 'Focus 59%'].map((item) => (
                <div key={item} className="mb-2">
                  <p className="text-xs uppercase tracking-[0.14em]">{item}</p>
                  <div className="mt-1 h-2 rounded-full bg-slate-300/70 dark:bg-slate-800">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-emerald-300 to-sky-400" />
                  </div>
                </div>
              ))}
            </DemoCard>

            <DemoCard anchor="emotion-chart" title={copy.cards.emotionChart.title} info={copy.cards.emotionChart.info}>
              <div className="grid grid-cols-8 gap-1">
                {Array.from({ length: 40 }).map((_, index) => (
                  <span key={index} className="h-3 w-3 rounded-sm bg-fuchsia-300/80 odd:bg-cyan-300/80" />
                ))}
              </div>
              <p className="mt-2 text-xs">{language === 'es' ? 'Más frecuente: Calm' : 'Most frequent: Calm'}</p>
            </DemoCard>

            <DemoCard anchor="streaks" title={copy.cards.streaks.title} info={copy.cards.streaks.info}>
              <div className="mb-2 flex gap-2 text-xs"><span className="rounded-full bg-slate-800 px-2 py-1 text-white">Body</span><span>Mind</span><span>Soul</span></div>
              <div className="mb-3 flex gap-2 text-xs"><span>{language === 'es' ? 'Semana' : 'Week'}</span><span className="rounded-full bg-cyan-200 px-2 py-1 text-slate-900">{language === 'es' ? 'Mes' : 'Month'}</span><span>3M</span></div>
              <ul className="space-y-2">
                {streakTasks.map((task) => (
                  <li key={task.id} className="rounded-xl border border-slate-300/45 bg-white/70 p-2 dark:border-slate-700 dark:bg-slate-950/35">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{task.name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{task.weeklyProgress}% • {copy.taskDetailSections.currentStreak}: {task.streakCurrent}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTask(task)}
                        className="rounded-full border border-cyan-400/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-700 dark:text-cyan-200"
                      >
                        {copy.openTaskDetail}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </DemoCard>

            <DemoCard anchor="daily-quest" title={copy.cards.dailyQuest.title} info={copy.cards.dailyQuest.info}>
              <ul className="space-y-1 text-sm">
                <li>• {language === 'es' ? 'Elegir emoción predominante' : 'Select dominant emotion'}</li>
                <li>• {language === 'es' ? 'Marcar tareas completadas' : 'Mark completed tasks'}</li>
                <li>• {language === 'es' ? 'Ganar GP + mantener rachas' : 'Earn GP + keep streaks'}</li>
                <li>• {language === 'es' ? 'Confirmar día' : 'Confirm day'}</li>
              </ul>
            </DemoCard>

            <DemoCard anchor="daily-cultivation" title={copy.cards.dailyCultivation.title} info={copy.cards.dailyCultivation.info}>
              <p className="text-sm">{language === 'es' ? 'Micro-acciones para sostener tu ritmo de crecimiento.' : 'Micro-actions to sustain your growth rhythm.'}</p>
            </DemoCard>

            <DemoCard anchor="moderation" title={copy.cards.moderation.title} info={copy.cards.moderation.info}>
              <p className="text-sm">{language === 'es' ? 'Monitorea señales de moderación sin juicio.' : 'Track moderation signals without judgment.'}</p>
            </DemoCard>
          </section>
        </div>
      </div>

      {showGuide ? (
        <GuidedDemoOverlay
          language={language}
          onFinish={() => setShowGuide(false)}
          onSkip={(stepId, stepIndex) => emitDemoEvent('demo_guided_skipped', { stepId, stepIndex, language })}
          onStepViewed={(stepId, stepIndex) => emitDemoEvent('demo_step_viewed', { stepId, stepIndex, language })}
          onCompleted={() => emitDemoEvent('demo_guided_completed', { language })}
          onCtaClick={() => emitDemoEvent('demo_cta_clicked', { source: 'guided_overlay_final' })}
        />
      ) : null}

      {selectedTask ? <TaskDetailModal language={language} task={selectedTask} onClose={() => setSelectedTask(null)} /> : null}
    </main>
  );
}

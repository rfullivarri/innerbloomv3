import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Target, Sparkles, WandSparkles } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { MobileBottomNav } from '../../components/layout/MobileBottomNav';
import { Navbar } from '../../components/layout/Navbar';
import { ToastBanner } from '../../components/common/ToastBanner';
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';
import { resolveAuthLanguage } from '../../lib/authLanguage';
import { type UserTask } from '../../lib/api';
import { TaskList } from '../editor';

const MOCK_TASKS: UserTask[] = [
  {
    id: 'demo-task-focus',
    title: 'Bloque de foco de 25 minutos sin interrupciones',
    pillarId: 'mind',
    traitId: 'focus',
    statId: 'consistency',
    difficultyId: 'easy',
    isActive: true,
    xp: 20,
    createdAt: '2026-01-03T09:00:00Z',
    updatedAt: '2026-01-07T10:00:00Z',
    completedAt: null,
    archivedAt: null,
  },
  {
    id: 'demo-task-walk',
    title: 'Caminar 20 minutos después del almuerzo',
    pillarId: 'body',
    traitId: 'movement',
    statId: 'energy',
    difficultyId: 'medium',
    isActive: true,
    xp: 25,
    createdAt: '2026-01-04T12:00:00Z',
    updatedAt: '2026-01-08T08:00:00Z',
    completedAt: null,
    archivedAt: null,
  },
  {
    id: 'demo-task-journal',
    title: 'Escribir 3 líneas de cierre del día',
    pillarId: 'soul',
    traitId: 'presence',
    statId: 'clarity',
    difficultyId: 'easy',
    isActive: true,
    xp: 15,
    createdAt: '2026-01-02T21:00:00Z',
    updatedAt: '2026-01-08T21:30:00Z',
    completedAt: null,
    archivedAt: null,
  },
];

export default function PublicTasksDemoPage() {
  const location = useLocation();
  const { language, syncLocaleLanguage } = usePostLoginLanguage();
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    syncLocaleLanguage(resolveAuthLanguage(location.search));
  }, [location.search, syncLocaleLanguage]);

  const sections = useMemo(
    () => [
      { key: 'dashboard', label: language === 'es' ? 'Dashboard' : 'Dashboard', to: '/demo', icon: <Target /> },
      { key: 'rewards', label: language === 'es' ? 'Logros' : 'Achievements', to: '/labs/logros', icon: <Sparkles /> },
      { key: 'editor', label: language === 'es' ? 'Tareas' : 'Tasks', to: '/labs/tasks-demo', icon: <WandSparkles />, end: true },
    ],
    [language],
  );

  const pillarNames = new Map([
    ['mind', 'Mind'],
    ['body', 'Body'],
    ['soul', 'Soul'],
  ]);
  const traitNames = new Map([
    ['focus', language === 'es' ? 'Enfoque' : 'Focus'],
    ['movement', language === 'es' ? 'Movimiento' : 'Movement'],
    ['presence', language === 'es' ? 'Presencia' : 'Presence'],
  ]);
  const statNames = new Map([
    ['consistency', language === 'es' ? 'Consistencia' : 'Consistency'],
    ['energy', language === 'es' ? 'Energía' : 'Energy'],
    ['clarity', language === 'es' ? 'Claridad' : 'Clarity'],
  ]);
  const difficultyNames = new Map([
    ['easy', language === 'es' ? 'Baja' : 'Low'],
    ['medium', language === 'es' ? 'Media' : 'Medium'],
  ]);

  return (
    <div className="min-h-screen bg-transparent" data-light-scope="dashboard-v3">
      <Navbar title={language === 'es' ? 'Demo de Tareas' : 'Tasks Demo'} sections={sections} />
      <main className="mx-auto w-full max-w-5xl px-3 py-4 md:px-5 md:py-6">
        <Card className="border border-[color:var(--glass-border)] bg-[image:var(--glass-bg)] p-4 md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-subtle)]">Innerbloom Labs</p>
              <h1 className="font-display text-2xl font-semibold text-[color:var(--color-text)]">
                {language === 'es' ? 'Editor de tareas (demo pública)' : 'Task editor (public demo)'}
              </h1>
              <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
                {language === 'es'
                  ? 'Esta versión funciona sin login, usa datos mock y mantiene la estructura visual del editor.'
                  : 'This version runs without login, uses mock data, and preserves the editor visual structure.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowToast(true)}
                className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text)] hover:border-[color:var(--color-border-strong)]"
              >
                {language === 'es' ? 'Ver guía' : 'Open guide'}
              </button>
              <Link
                to="/demo-mode-select"
                className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text)] hover:border-[color:var(--color-border-strong)]"
              >
                {language === 'es' ? 'Volver al hub' : 'Back to hub'}
              </Link>
            </div>
          </div>

          <TaskList
            tasks={MOCK_TASKS}
            pillarNamesById={pillarNames}
            traitNamesById={traitNames}
            statNamesById={statNames}
            difficultyNamesById={difficultyNames}
            onEditTask={() => setShowToast(true)}
            onDeleteTask={() => setShowToast(true)}
            onDuplicateTask={() => setShowToast(true)}
            onImproveTask={() => setShowToast(true)}
            duplicatingTaskId={null}
          />
        </Card>
      </main>
      <MobileBottomNav items={sections} />
      {showToast ? (
        <div className="fixed bottom-20 right-4 z-50 max-w-sm">
          <ToastBanner
            tone="info"
            message={language === 'es' ? 'Guía demo: explora la lista, abre acciones y prueba la navegación pública.' : 'Demo guide: explore the task list, open actions, and test public navigation.'}
          />
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="mt-2 text-xs text-[color:var(--color-text-subtle)] underline"
          >
            {language === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

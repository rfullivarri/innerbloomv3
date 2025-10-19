import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DevErrorBoundary } from '../../components/DevErrorBoundary';
import { Navbar } from '../../components/layout/Navbar';
import { MobileBottomNav } from '../../components/layout/MobileBottomNav';
import { Card } from '../../components/common/Card';
import { useBackendUser } from '../../hooks/useBackendUser';
import { useUserTasks } from '../../hooks/useUserTasks';
import { usePillars } from '../../hooks/useCatalogs';
import { type UserTask } from '../../lib/api';
import {
  DASHBOARD_SECTIONS,
  getActiveSection,
  taskEditorSection,
  type DashboardSectionConfig,
} from '../dashboardSections';

export default function TaskEditorPage() {
  const location = useLocation();
  const activeSection = getActiveSection(location.pathname);
  const { backendUserId, status: backendStatus, error: backendError, reload: reloadProfile } =
    useBackendUser();
  const { tasks, status: tasksStatus, error: tasksError, reload: reloadTasks } =
    useUserTasks(backendUserId);
  const {
    data: pillars,
    isLoading: isLoadingPillars,
    error: pillarsError,
    reload: reloadPillars,
  } = usePillars();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPillar, setSelectedPillar] = useState('');
  const [showCreatePlaceholder, setShowCreatePlaceholder] = useState(false);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const isBackendReady = backendStatus === 'success' && Boolean(backendUserId);
  const isLoadingTasks =
    !isBackendReady || tasksStatus === 'loading' || (isBackendReady && tasksStatus === 'idle');
  const combinedError = backendError ?? tasksError;

  const pillarOptions = useMemo(() => {
    return [
      { value: '', label: 'Todos los pilares' },
      ...pillars.map((pillar) => ({ value: pillar.id, label: pillar.name })),
    ];
  }, [pillars]);

  const pillarNamesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const pillar of pillars) {
      map.set(pillar.id, pillar.name);
    }
    return map;
  }, [pillars]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        normalizedSearch.length === 0 || task.title.toLowerCase().includes(normalizedSearch);
      const matchesPillar =
        selectedPillar.length === 0 || (task.pillarId ?? '').toLowerCase() === selectedPillar.toLowerCase();
      return matchesSearch && matchesPillar;
    });
  }, [normalizedSearch, selectedPillar, tasks]);

  const hasActiveFilters = normalizedSearch.length > 0 || selectedPillar.length > 0;

  const isTaskListEmpty = !isLoadingTasks && !combinedError && tasks.length === 0;
  const isFilteredEmpty = !isLoadingTasks && !combinedError && tasks.length > 0 && filteredTasks.length === 0;

  const handleRetry = () => {
    reloadProfile();
    reloadTasks();
  };

  const handleCreateClick = () => {
    setShowCreatePlaceholder(true);
  };

  return (
    <DevErrorBoundary>
      <div className="flex min-h-screen flex-col">
        <Navbar title={activeSection.pageTitle} sections={DASHBOARD_SECTIONS} />
        <main className="flex-1 pb-24 md:pb-0">
          <div className="mx-auto w-full max-w-7xl px-3 py-4 md:px-5 md:py-6 lg:px-6 lg:py-8">
            <SectionHeader section={taskEditorSection} />
            <Card>
              <div className="flex flex-col gap-5">
                <TaskFilters
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  selectedPillar={selectedPillar}
                  onPillarChange={setSelectedPillar}
                  pillars={pillarOptions}
                  isLoadingPillars={isLoadingPillars}
                  pillarsError={pillarsError}
                  onRetryPillars={reloadPillars}
                />

                {isLoadingTasks && <TaskListSkeleton />}

                {combinedError && !isLoadingTasks && (
                  <TaskListError message={combinedError.message} onRetry={handleRetry} />
                )}

                {isTaskListEmpty && (
                  <TaskListEmpty message="Todavía no tienes tareas. Usa el botón para comenzar cuando esté listo." />
                )}

                {isFilteredEmpty && (
                  <TaskListEmpty
                    message={
                      hasActiveFilters
                        ? 'No encontramos tareas con los filtros actuales. Ajusta la búsqueda para ver más resultados.'
                        : 'No encontramos tareas para mostrar.'
                    }
                  />
                )}

                {!isLoadingTasks && !combinedError && filteredTasks.length > 0 && (
                  <TaskList tasks={filteredTasks} pillarNamesById={pillarNamesById} />
                )}
              </div>
            </Card>
          </div>
        </main>
        <MobileBottomNav
          items={DASHBOARD_SECTIONS.map((section) => {
            const Icon = section.icon;

            return {
              key: section.key,
              label: section.label,
              to: section.to,
              icon: <Icon className="h-5 w-5" />,
              end: section.end,
            };
          })}
        />
        <button
          type="button"
          onClick={handleCreateClick}
          className="fixed bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(79,70,229,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:bottom-10 md:right-8"
        >
          <span aria-hidden className="text-lg leading-none">＋</span>
          Nueva tarea
        </button>
        <CreateTaskPlaceholder open={showCreatePlaceholder} onClose={() => setShowCreatePlaceholder(false)} />
      </div>
    </DevErrorBoundary>
  );
}

function SectionHeader({ section }: { section: DashboardSectionConfig }) {
  const normalizedTitle = section.contentTitle.trim();
  const normalizedDescription = section.description?.trim() ?? '';
  const shouldShowDescription = normalizedDescription.length > 0;

  return (
    <header className="mb-6 space-y-2 md:mb-8">
      <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
        {normalizedTitle}
      </h1>
      {shouldShowDescription && <p className="text-sm text-slate-400">{normalizedDescription}</p>}
    </header>
  );
}

interface TaskFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedPillar: string;
  onPillarChange: (value: string) => void;
  pillars: Array<{ value: string; label: string }>;
  isLoadingPillars: boolean;
  pillarsError: Error | null;
  onRetryPillars: () => void;
}

function TaskFilters({
  searchTerm,
  onSearchChange,
  selectedPillar,
  onPillarChange,
  pillars,
  isLoadingPillars,
  pillarsError,
  onRetryPillars,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <label className="flex w-full flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Búsqueda
        </span>
        <div className="relative flex items-center">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por título"
            className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
      </label>
      <label className="flex w-full flex-col gap-2 md:max-w-xs">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Pilar
        </span>
        <select
          value={selectedPillar}
          onChange={(event) => onPillarChange(event.target.value)}
          className="w-full appearance-none rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          {pillars.map((pillar) => (
            <option key={pillar.value || 'all'} value={pillar.value} className="bg-slate-900 text-slate-100">
              {pillar.label}
            </option>
          ))}
        </select>
        {isLoadingPillars && (
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cargando pilares…</span>
        )}
        {pillarsError && !isLoadingPillars && (
          <button
            type="button"
            onClick={onRetryPillars}
            className="self-start text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-300"
          >
            Reintentar cargar pilares
          </button>
        )}
      </label>
    </div>
  );
}

function TaskList({
  tasks,
  pillarNamesById,
}: {
  tasks: UserTask[];
  pillarNamesById: Map<string, string>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} pillarName={pillarNamesById.get(task.pillarId ?? '') ?? null} />
      ))}
    </div>
  );
}

function TaskCard({ task, pillarName }: { task: UserTask; pillarName: string | null }) {
  const hasNotes = Boolean(task.notes && task.notes.trim().length > 0);

  return (
    <article className="group relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.35)] transition hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-100">{task.title}</h3>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
            task.isActive
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-slate-500/20 text-slate-300'
          }`}
        >
          {task.isActive ? 'Activa' : 'Inactiva'}
        </span>
      </div>
      <dl className="grid gap-1 text-xs text-slate-400">
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-slate-300">Pilar</dt>
          <dd className="truncate text-right text-slate-200">{pillarName ?? task.pillarId ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-slate-300">Rasgo</dt>
          <dd className="truncate text-right">{task.traitId ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-slate-300">Stat</dt>
          <dd className="truncate text-right">{task.statId ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-slate-300">Dificultad</dt>
          <dd className="truncate text-right">{task.difficultyId ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-slate-300">XP base</dt>
          <dd className="truncate text-right">{task.xp != null ? task.xp : '—'}</dd>
        </div>
      </dl>
      {hasNotes && (
        <p className="mt-1 rounded-xl bg-slate-900/40 p-3 text-sm leading-relaxed text-slate-200">
          {task.notes}
        </p>
      )}
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        Actualizada: {formatDateLabel(task.updatedAt)}
      </p>
    </article>
  );
}

function TaskListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
      ))}
    </div>
  );
}

function TaskListEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5/40 px-6 py-12 text-center text-sm text-slate-300">
      <span className="text-2xl" aria-hidden>
        🌱
      </span>
      <p className="max-w-xs leading-relaxed">{message}</p>
    </div>
  );
}

function TaskListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-8 text-center text-sm text-rose-100">
      <p className="font-semibold">No pudimos cargar tus tareas.</p>
      <p className="max-w-sm text-rose-200/80">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/40"
      >
        Reintentar
      </button>
    </div>
  );
}

function formatDateLabel(value: string | null): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString();
}

function CreateTaskPlaceholder({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm md:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 h-full w-full"
      />
      <div className="relative z-10 w-full max-w-md p-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-6 text-center text-slate-100 shadow-[0_18px_40px_rgba(15,23,42,0.65)]">
          <h2 className="text-lg font-semibold text-white">Crear nueva tarea</h2>
          <p className="mt-3 text-sm text-slate-300">
            Estamos afinando el flujo de creación. Muy pronto podrás diseñar misiones personalizadas desde aquí.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/20"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

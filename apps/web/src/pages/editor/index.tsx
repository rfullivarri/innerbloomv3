import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { DevErrorBoundary } from '../../components/DevErrorBoundary';
import { Navbar } from '../../components/layout/Navbar';
import { MobileBottomNav } from '../../components/layout/MobileBottomNav';
import { Card } from '../../components/common/Card';
import { ToastBanner } from '../../components/common/ToastBanner';
import { useBackendUser } from '../../hooks/useBackendUser';
import { useCreateTask, useDeleteTask, useUpdateTask, useUserTasks } from '../../hooks/useUserTasks';
import { useDifficulties, usePillars, useStats, useTraits } from '../../hooks/useCatalogs';
import { type UserTask } from '../../lib/api';
import { type Pillar } from '../../lib/api/catalogs';
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<UserTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<UserTask | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  const { deleteTask, status: deleteStatus } = useDeleteTask();

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const isBackendReady = backendStatus === 'success' && Boolean(backendUserId);
  const isLoadingTasks =
    !isBackendReady || tasksStatus === 'loading' || (isBackendReady && tasksStatus === 'idle');
  const combinedError = backendError ?? tasksError;

  useEffect(() => {
    if (!taskToDelete) {
      setDeleteErrorMessage(null);
    }
  }, [taskToDelete]);

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
  const isDeletingTask = deleteStatus === 'loading';

  const isTaskListEmpty = !isLoadingTasks && !combinedError && tasks.length === 0;
  const isFilteredEmpty = !isLoadingTasks && !combinedError && tasks.length > 0 && filteredTasks.length === 0;

  const handleRetry = () => {
    reloadProfile();
    reloadTasks();
  };

  const handleCreateClick = () => {
    setShowCreateModal(true);
  };

  const handleDeleteModalClose = useCallback(() => {
    if (isDeletingTask) {
      return;
    }
    setTaskToDelete(null);
  }, [isDeletingTask]);

  const handleConfirmDelete = useCallback(async () => {
    if (!taskToDelete) {
      setDeleteErrorMessage('No se encontró la tarea que deseas eliminar.');
      return;
    }

    if (!backendUserId) {
      setDeleteErrorMessage('No se pudo identificar tu usuario. Intenta más tarde.');
      return;
    }

    setDeleteErrorMessage(null);

    try {
      await deleteTask(backendUserId, taskToDelete.id);
      setTaskToDelete(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la tarea.';
      setDeleteErrorMessage(message);
    }
  }, [backendUserId, deleteTask, taskToDelete]);

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
                  <TaskList
                    tasks={filteredTasks}
                    pillarNamesById={pillarNamesById}
                    onEditTask={(task) => setTaskToEdit(task)}
                    onDeleteTask={(task) => setTaskToDelete(task)}
                  />
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
              label: section.key === 'editor' ? 'Editor' : section.label,
              to: section.to,
              icon: <Icon className="h-4 w-4" />,
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
        <CreateTaskModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          userId={backendUserId ?? null}
          pillars={pillars}
          isLoadingPillars={isLoadingPillars}
          pillarsError={pillarsError}
          onRetryPillars={reloadPillars}
        />
        <EditTaskModal
          open={taskToEdit != null}
          onClose={() => setTaskToEdit(null)}
          userId={backendUserId ?? null}
          task={taskToEdit}
          pillars={pillars}
        />
        <DeleteTaskModal
          open={taskToDelete != null}
          onClose={handleDeleteModalClose}
          task={taskToDelete}
          isDeleting={isDeletingTask}
          errorMessage={deleteErrorMessage}
          onConfirm={handleConfirmDelete}
        />
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
  onEditTask,
  onDeleteTask,
}: {
  tasks: UserTask[];
  pillarNamesById: Map<string, string>;
  onEditTask: (task: UserTask) => void;
  onDeleteTask: (task: UserTask) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          pillarName={pillarNamesById.get(task.pillarId ?? '') ?? null}
          onEdit={() => onEditTask(task)}
          onDelete={() => onDeleteTask(task)}
        />
      ))}
    </div>
  );
}

function TaskCard({
  task,
  pillarName,
  onEdit,
  onDelete,
}: {
  task: UserTask;
  pillarName: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasNotes = Boolean(task.notes && task.notes.trim().length > 0);

  return (
    <article className="group relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.35)] transition hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-100">{task.title}</h3>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
              task.isActive
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-slate-500/20 text-slate-300'
            }`}
          >
            {task.isActive ? 'Activa' : 'Inactiva'}
          </span>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/30 hover:text-white"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-rose-500/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-200 transition hover:border-rose-400 hover:text-rose-100"
          >
            Eliminar
          </button>
        </div>
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

interface DeleteTaskModalProps {
  open: boolean;
  onClose: () => void;
  task: UserTask | null;
  isDeleting: boolean;
  errorMessage: string | null;
  onConfirm: () => Promise<void>;
}

function DeleteTaskModal({ open, onClose, task, isDeleting, errorMessage, onConfirm }: DeleteTaskModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, isDeleting, onClose]);

  if (!open) {
    return null;
  }

  const handleConfirmClick = async () => {
    if (isDeleting) {
      return;
    }
    await onConfirm();
  };

  const normalizedTitle = task?.title?.trim() ?? '';
  const displayTitle = normalizedTitle.length > 0 ? `“${normalizedTitle}”` : 'esta tarea';

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm md:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => {
          if (!isDeleting) {
            onClose();
          }
        }}
        className="absolute inset-0 h-full w-full"
      />
      <div className="relative z-10 w-full max-w-md p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="space-y-5 rounded-2xl border border-white/10 bg-slate-900/95 p-6 text-slate-100 shadow-[0_18px_40px_rgba(15,23,42,0.65)]"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Confirmar eliminación</p>
            <h2 className="text-xl font-semibold text-white">Eliminar tarea</h2>
          </header>
          <p className="text-sm text-slate-300">
            ¿Seguro que quieres eliminar {displayTitle}? Esta acción quitará la tarea de tu lista inmediatamente.
          </p>
          {errorMessage && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {errorMessage}
            </div>
          )}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                if (!isDeleting) {
                  onClose();
                }
              }}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-full bg-rose-600/90 px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_30px_rgba(225,29,72,0.3)] transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
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

type ToastMessage = { type: 'success' | 'error'; text: string };

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  pillars: Pillar[];
  isLoadingPillars: boolean;
  pillarsError: Error | null;
  onRetryPillars: () => void;
}

function CreateTaskModal({
  open,
  onClose,
  userId,
  pillars,
  isLoadingPillars,
  pillarsError,
  onRetryPillars,
}: CreateTaskModalProps) {
  const [selectedPillarId, setSelectedPillarId] = useState('');
  const [selectedTraitId, setSelectedTraitId] = useState('');
  const [selectedStatId, setSelectedStatId] = useState('');
  const [title, setTitle] = useState('');
  const [difficultyId, setDifficultyId] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const { createTask, status: createStatus } = useCreateTask();
  const {
    data: traits,
    isLoading: isLoadingTraits,
    error: traitsError,
    reload: reloadTraits,
  } = useTraits(open ? selectedPillarId : null);
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
    reload: reloadStats,
  } = useStats(open ? selectedTraitId : null);
  const {
    data: difficulties,
    isLoading: isLoadingDifficulties,
    error: difficultiesError,
    reload: reloadDifficulties,
  } = useDifficulties();

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setSelectedPillarId('');
      setSelectedTraitId('');
      setSelectedStatId('');
      setTitle('');
      setDifficultyId('');
      setNotes('');
      setErrors({});
      setToast(null);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }

    return undefined;
  }, [open, handleClose]);

  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [toast]);

  useEffect(() => {
    setSelectedTraitId('');
    setSelectedStatId('');
    clearError('trait');
    clearError('stat');
  }, [selectedPillarId, clearError]);

  useEffect(() => {
    setSelectedStatId('');
    clearError('stat');
  }, [selectedTraitId, clearError]);

  const sortedPillars = useMemo(() => {
    return [...pillars].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [pillars]);

  const filteredTraits = useMemo(() => {
    return traits.filter((trait) => trait.pillarId === selectedPillarId);
  }, [traits, selectedPillarId]);

  const filteredStats = useMemo(() => {
    return stats.filter((stat) => stat.traitId === selectedTraitId);
  }, [stats, selectedTraitId]);

  const sortedDifficulties = useMemo(() => {
    return [...difficulties].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [difficulties]);

  const isSubmitting = createStatus === 'loading';
  const isSubmitDisabled =
    isSubmitting || !selectedPillarId || !selectedTraitId || title.trim().length === 0 || !userId;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors: Record<string, string> = {};
    if (!selectedPillarId) {
      validationErrors.pillar = 'Selecciona un pilar para continuar.';
    }
    if (!selectedTraitId) {
      validationErrors.trait = 'Selecciona un rasgo para continuar.';
    }
    if (title.trim().length === 0) {
      validationErrors.title = 'El título es obligatorio.';
    }
    if (!userId) {
      validationErrors.user = 'No se pudo identificar tu usuario. Intenta más tarde.';
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      await createTask(userId!, {
        title: title.trim(),
        pillarId: selectedPillarId,
        traitId: selectedTraitId,
        statId: selectedStatId || null,
        difficultyId: difficultyId || null,
        notes: notes.trim() || null,
      });
      setToast({ type: 'success', text: 'Tarea creada correctamente.' });
      setTitle('');
      setNotes('');
      setDifficultyId('');
      setSelectedStatId('');
      setErrors({});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la tarea.';
      setToast({ type: 'error', text: message });
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm md:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={handleClose}
        className="absolute inset-0 h-full w-full"
      />
      <div className="relative z-10 w-full max-w-2xl p-4">
        <form
          onSubmit={handleSubmit}
          className="max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-6 text-slate-100 shadow-[0_18px_40px_rgba(15,23,42,0.65)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="space-y-6">
            <header className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Nueva tarea</p>
              <h2 className="text-xl font-semibold text-white">Crear tarea personalizada</h2>
              <p className="text-sm text-slate-300">
                Define el pilar, rasgo y stat para desbloquear campos específicos de tu misión.
              </p>
            </header>

            <section className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Paso 1 · Pilar</p>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Selecciona un pilar</span>
                  <select
                    value={selectedPillarId}
                    onChange={(event) => {
                      setSelectedPillarId(event.target.value);
                      clearError('pillar');
                    }}
                    className="w-full appearance-none rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed"
                    disabled={isLoadingPillars || pillarsError != null}
                  >
                    <option value="" className="bg-slate-900 text-slate-100">
                      Selecciona un pilar…
                    </option>
                    {sortedPillars.map((pillar) => (
                      <option key={pillar.id} value={pillar.id} className="bg-slate-900 text-slate-100">
                        {pillar.name}
                      </option>
                    ))}
                  </select>
                </label>
                {isLoadingPillars && (
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cargando pilares…</p>
                )}
                {pillarsError && (
                  <div className="space-y-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                    <p>No se pudieron cargar los pilares.</p>
                    <button
                      type="button"
                      onClick={onRetryPillars}
                      className="font-semibold text-rose-200 underline decoration-dotted"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
                {errors.pillar && <p className="text-xs text-rose-300">{errors.pillar}</p>}
                {!isLoadingPillars && !pillarsError && sortedPillars.length === 0 && (
                  <p className="text-xs text-slate-400">No encontramos pilares disponibles por ahora.</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Paso 2 · Rasgo</p>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Selecciona un rasgo</span>
                  <select
                    value={selectedTraitId}
                    onChange={(event) => {
                      setSelectedTraitId(event.target.value);
                      clearError('trait');
                    }}
                    className="w-full appearance-none rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed"
                    disabled={!selectedPillarId || isLoadingTraits}
                  >
                    <option value="" className="bg-slate-900 text-slate-100">
                      {selectedPillarId ? 'Selecciona un rasgo…' : 'Selecciona primero un pilar'}
                    </option>
                    {filteredTraits.map((trait) => (
                      <option key={trait.id} value={trait.id} className="bg-slate-900 text-slate-100">
                        {trait.name}
                      </option>
                    ))}
                  </select>
                </label>
                {isLoadingTraits && (
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cargando rasgos…</p>
                )}
                {traitsError && (
                  <div className="space-y-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                    <p>No se pudieron cargar los rasgos.</p>
                    <button
                      type="button"
                      onClick={reloadTraits}
                      className="font-semibold text-rose-200 underline decoration-dotted"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
                {errors.trait && <p className="text-xs text-rose-300">{errors.trait}</p>}
                {selectedPillarId && !isLoadingTraits && filteredTraits.length === 0 && !traitsError && (
                  <p className="text-xs text-slate-400">Este pilar aún no tiene rasgos disponibles.</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Paso 3 · Stat</p>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Selecciona un stat (opcional)</span>
                  <select
                    value={selectedStatId}
                    onChange={(event) => setSelectedStatId(event.target.value)}
                    className="w-full appearance-none rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed"
                    disabled={!selectedTraitId || isLoadingStats}
                  >
                    <option value="" className="bg-slate-900 text-slate-100">
                      {selectedTraitId ? 'Selecciona un stat…' : 'Selecciona primero un rasgo'}
                    </option>
                    {filteredStats.map((stat) => (
                      <option key={stat.id} value={stat.id} className="bg-slate-900 text-slate-100">
                        {stat.name}
                      </option>
                    ))}
                  </select>
                </label>
                {isLoadingStats && (
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cargando stats…</p>
                )}
                {statsError && (
                  <div className="space-y-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                    <p>No se pudieron cargar los stats.</p>
                    <button
                      type="button"
                      onClick={reloadStats}
                      className="font-semibold text-rose-200 underline decoration-dotted"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
                {selectedTraitId && !isLoadingStats && filteredStats.length === 0 && !statsError && (
                  <p className="text-xs text-slate-400">Este rasgo aún no tiene stats asociados.</p>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div className="space-y-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Título de la tarea</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      clearError('title');
                    }}
                    placeholder="Ej. Entrenar 30 minutos"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </label>
                {errors.title && <p className="text-xs text-rose-300">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Dificultad</span>
                  <select
                    value={difficultyId}
                    onChange={(event) => setDifficultyId(event.target.value)}
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed"
                    disabled={isLoadingDifficulties}
                  >
                    <option value="" className="bg-slate-900 text-slate-100">
                      Selecciona una dificultad…
                    </option>
                    {sortedDifficulties.map((difficulty) => (
                      <option key={difficulty.id} value={difficulty.id} className="bg-slate-900 text-slate-100">
                        {difficulty.name}
                      </option>
                    ))}
                  </select>
                </label>
                {isLoadingDifficulties && (
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cargando dificultades…</p>
                )}
                {difficultiesError && (
                  <div className="space-y-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                    <p>No se pudieron cargar las dificultades.</p>
                    <button
                      type="button"
                      onClick={reloadDifficulties}
                      className="font-semibold text-rose-200 underline decoration-dotted"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Notas (opcional)</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    placeholder="Agrega detalles, condiciones o recordatorios."
                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </label>
              </div>
            </section>

            {errors.user && <p className="text-xs text-rose-300">{errors.user}</p>}

            {toast && <ToastBanner tone={toast.type} message={toast.text} className="px-3" />}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_30px_rgba(79,70,229,0.35)] transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Creando…' : 'Crear tarea'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditTaskModalProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  task: UserTask | null;
  pillars: Pillar[];
}

function EditTaskModal({ open, onClose, userId, task, pillars }: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [difficultyId, setDifficultyId] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const { updateTask, status: updateStatus } = useUpdateTask();
  const { data: difficulties, isLoading: isLoadingDifficulties, error: difficultiesError, reload: reloadDifficulties } =
    useDifficulties();

  const currentPillarId = open && task?.pillarId ? task.pillarId : null;
  const currentTraitId = open && task?.traitId ? task.traitId : null;
  const { data: traits } = useTraits(currentPillarId);
  const { data: stats } = useStats(currentTraitId);

  const sortedDifficulties = useMemo(() => {
    return [...difficulties].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [difficulties]);

  const pillarName = useMemo(() => {
    if (!task?.pillarId) {
      return '—';
    }
    return pillars.find((pillar) => pillar.id === task.pillarId)?.name ?? task.pillarId;
  }, [pillars, task?.pillarId]);

  const traitName = useMemo(() => {
    if (!task?.traitId) {
      return '—';
    }
    return traits.find((trait) => trait.id === task.traitId)?.name ?? task.traitId;
  }, [traits, task?.traitId]);

  const statName = useMemo(() => {
    if (!task?.statId) {
      return '—';
    }
    return stats.find((stat) => stat.id === task.statId)?.name ?? task.statId;
  }, [stats, task?.statId]);

  const isSubmitting = updateStatus === 'loading';

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDifficultyId('');
      setNotes('');
      setIsActive(true);
      setErrors({});
      setToast(null);
      return;
    }

    if (task) {
      setTitle(task.title ?? '');
      setDifficultyId(task.difficultyId ?? '');
      setNotes(task.notes ?? '');
      setIsActive(Boolean(task.isActive));
      setErrors({});
      setToast(null);
    }
  }, [open, task]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }

    return undefined;
  }, [open, handleClose]);

  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [toast]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors: Record<string, string> = {};

    if (!title.trim()) {
      validationErrors.title = 'El título es obligatorio.';
    }

    if (!userId) {
      validationErrors.user = 'No se pudo identificar tu usuario. Intenta más tarde.';
    }

    if (!task) {
      validationErrors.task = 'No se encontró la tarea que deseas editar.';
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0 || !task || !userId) {
      return;
    }

    try {
      await updateTask(userId, task.id, {
        title: title.trim(),
        difficultyId: difficultyId || null,
        notes: notes.trim() || null,
        isActive,
      });
      setToast({ type: 'success', text: 'Tarea actualizada correctamente.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar la tarea.';
      setToast({ type: 'error', text: message });
    }
  };

  if (!open || !task) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm md:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={handleClose}
        className="absolute inset-0 h-full w-full"
      />
      <div className="relative z-10 w-full max-w-2xl p-4">
        <form
          onSubmit={handleSubmit}
          className="max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-6 text-slate-100 shadow-[0_18px_40px_rgba(15,23,42,0.65)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="space-y-6">
            <header className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Editar tarea</p>
              <h2 className="text-xl font-semibold text-white">Actualiza los detalles de tu tarea</h2>
              <p className="text-sm text-slate-300">
                Ajusta el título, dificultad, notas y estado. Los campos de pilar, rasgo y stat permanecen bloqueados.
              </p>
            </header>

            <section className="space-y-4">
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Contexto
                </span>
                <div className="grid gap-3 md:grid-cols-3">
                  <ReadOnlyField label="Pilar" value={pillarName} />
                  <ReadOnlyField label="Rasgo" value={traitName} />
                  <ReadOnlyField label="Stat" value={statName} />
                </div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Estos campos no se pueden editar.</p>
              </div>
            </section>

            <section className="space-y-4">
              <div className="space-y-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Título de la tarea</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      clearError('title');
                    }}
                    placeholder="Ej. Entrenar 30 minutos"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </label>
                {errors.title && <p className="text-xs text-rose-300">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Dificultad</span>
                  <select
                    value={difficultyId}
                    onChange={(event) => setDifficultyId(event.target.value)}
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed"
                    disabled={isLoadingDifficulties}
                  >
                    <option value="" className="bg-slate-900 text-slate-100">
                      Sin dificultad asignada
                    </option>
                    {sortedDifficulties.map((difficulty) => (
                      <option key={difficulty.id} value={difficulty.id} className="bg-slate-900 text-slate-100">
                        {difficulty.name}
                      </option>
                    ))}
                  </select>
                </label>
                {isLoadingDifficulties && (
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cargando dificultades…</p>
                )}
                {difficultiesError && (
                  <div className="space-y-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                    <p>No se pudieron cargar las dificultades.</p>
                    <button
                      type="button"
                      onClick={reloadDifficulties}
                      className="font-semibold text-rose-200 underline decoration-dotted"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Notas (opcional)</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    placeholder="Agrega detalles, condiciones o recordatorios."
                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Estado</span>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                    className="h-4 w-4 rounded border-white/30 bg-white/10 text-indigo-500 focus:ring-indigo-400"
                  />
                  <span className="text-sm text-slate-200">{isActive ? 'Activa' : 'Inactiva'}</span>
                </label>
              </div>
            </section>

            {errors.user && <p className="text-xs text-rose-300">{errors.user}</p>}
            {errors.task && <p className="text-xs text-rose-300">{errors.task}</p>}

            {toast && <ToastBanner tone={toast.type} message={toast.text} className="px-3" />}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_30px_rgba(79,70,229,0.35)] transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</span>
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">{value}</div>
    </div>
  );
}

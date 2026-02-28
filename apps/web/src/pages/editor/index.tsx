import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
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
import { fetchCatalogStats, fetchCatalogTraits, type Pillar } from '../../lib/api/catalogs';
import { useAppMode } from '../../hooks/useAppMode';
import {
  getActiveSection,
  getDashboardSectionConfig,
  getDashboardSections,
  type DashboardSectionConfig,
} from '../dashboardSections';

export const FEATURE_TASK_EDITOR_MOBILE_LIST_V1 = true;

export default function TaskEditorPage() {
  const location = useLocation();
  const sections = getDashboardSections(location.pathname);
  const activeSection = getActiveSection(location.pathname, sections);
  const taskEditorSection = getDashboardSectionConfig('editor', location.pathname);
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
  const { data: difficulties } = useDifficulties();
  const isAppMode = useAppMode();

  const [traitNamesById, setTraitNamesById] = useState<Record<string, string>>({});
  const [statNamesById, setStatNamesById] = useState<Record<string, string>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPillar, setSelectedPillar] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<UserTask | null>(null);
  const [editVariant, setEditVariant] = useState<'modal' | 'panel'>('modal');
  const [editGroupKey, setEditGroupKey] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<UserTask | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [pageToast, setPageToast] = useState<ToastMessage | null>(null);
  const [duplicatingTaskId, setDuplicatingTaskId] = useState<string | null>(null);

  const { deleteTask, status: deleteStatus } = useDeleteTask();
  const { createTask: duplicateTask } = useCreateTask();

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

  useEffect(() => {
    const missingTraitsByPillar = new Map<string, Set<string>>();

    for (const task of tasks) {
      const pillarId = task.pillarId?.trim();
      const traitId = task.traitId?.trim();
      if (!pillarId || !traitId || traitNamesById[traitId]) {
        continue;
      }

      if (!missingTraitsByPillar.has(pillarId)) {
        missingTraitsByPillar.set(pillarId, new Set());
      }
      missingTraitsByPillar.get(pillarId)!.add(traitId);
    }

    if (missingTraitsByPillar.size === 0) {
      return;
    }

    let isCancelled = false;

    const loadTraits = async () => {
      const updates: Record<string, string> = {};

      for (const [pillarId] of missingTraitsByPillar) {
        try {
          const traits = await fetchCatalogTraits(pillarId);
          for (const trait of traits) {
            updates[trait.id] = trait.name;
          }
        } catch (error) {
          console.error('Failed to load traits for pillar', pillarId, error);
        }
      }

      if (!isCancelled && Object.keys(updates).length > 0) {
        setTraitNamesById((previous) => ({ ...previous, ...updates }));
      }
    };

    void loadTraits();

    return () => {
      isCancelled = true;
    };
  }, [tasks, traitNamesById]);

  useEffect(() => {
    const missingStatsByTrait = new Map<string, Set<string>>();

    for (const task of tasks) {
      const traitId = task.traitId?.trim();
      const statId = task.statId?.trim();
      if (!traitId || !statId || statNamesById[statId]) {
        continue;
      }

      if (!missingStatsByTrait.has(traitId)) {
        missingStatsByTrait.set(traitId, new Set());
      }
      missingStatsByTrait.get(traitId)!.add(statId);
    }

    if (missingStatsByTrait.size === 0) {
      return;
    }

    let isCancelled = false;

    const loadStats = async () => {
      const updates: Record<string, string> = {};

      for (const [traitId] of missingStatsByTrait) {
        try {
          const stats = await fetchCatalogStats(traitId);
          for (const stat of stats) {
            updates[stat.id] = stat.name;
          }
        } catch (error) {
          console.error('Failed to load stats for trait', traitId, error);
        }
      }

      if (!isCancelled && Object.keys(updates).length > 0) {
        setStatNamesById((previous) => ({ ...previous, ...updates }));
      }
    };

    void loadStats();

    return () => {
      isCancelled = true;
    };
  }, [tasks, statNamesById]);

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

  const traitNamesMap = useMemo(() => new Map(Object.entries(traitNamesById)), [traitNamesById]);
  const statNamesMap = useMemo(() => new Map(Object.entries(statNamesById)), [statNamesById]);
  const difficultyNamesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const difficulty of difficulties) {
      map.set(difficulty.id, difficulty.name);
    }
    return map;
  }, [difficulties]);

  const pillarGrouping = useMemo(() => {
    const canonicalOrder = new Map<string, number>();
    const normalizedToCanonical = new Map<string, string>();
    const metaByCanonical = new Map<string, { name: string; code: string }>();

    pillars.forEach((pillar, index) => {
      const canonicalId = pillar.id;
      const normalizedId = canonicalId.trim().toLowerCase();
      const code = (pillar.code ?? pillar.id).trim();
      const normalizedCode = code.toLowerCase();

      canonicalOrder.set(canonicalId, index);
      metaByCanonical.set(canonicalId, { name: pillar.name, code });

      if (normalizedId.length > 0) {
        normalizedToCanonical.set(normalizedId, canonicalId);
      }

      if (normalizedCode.length > 0) {
        normalizedToCanonical.set(normalizedCode, canonicalId);
      }
    });

    return { canonicalOrder, normalizedToCanonical, metaByCanonical };
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

  const sortedTasks = useMemo(() => {
    if (!FEATURE_TASK_EDITOR_MOBILE_LIST_V1) {
      return filteredTasks;
    }

    const entries = filteredTasks.map((task) => ({
      task,
      pillarName: pillarNamesById.get(task.pillarId ?? '') ?? '',
    }));

    entries.sort((a, b) => {
      if (a.pillarName === b.pillarName) {
        return a.task.title.localeCompare(b.task.title, 'es', { sensitivity: 'base' });
      }

      if (!a.pillarName) {
        return 1;
      }

      if (!b.pillarName) {
        return -1;
      }

      return a.pillarName.localeCompare(b.pillarName, 'es', { sensitivity: 'base' });
    });

    return entries.map((entry) => entry.task);
  }, [filteredTasks, pillarNamesById]);

  const hasActiveFilters = normalizedSearch.length > 0 || selectedPillar.length > 0;
  const isDeletingTask = deleteStatus === 'loading';

  const isTaskListEmpty = !isLoadingTasks && !combinedError && tasks.length === 0;
  const visibleTasks = FEATURE_TASK_EDITOR_MOBILE_LIST_V1 ? sortedTasks : filteredTasks;
  const isFilteredEmpty =
    !isLoadingTasks && !combinedError && tasks.length > 0 && visibleTasks.length === 0;

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
      setPageToast({ type: 'error', text: message });
    }
  }, [backendUserId, deleteTask, taskToDelete]);

  useEffect(() => {
    if (!pageToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setPageToast(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [pageToast]);

  const handleDuplicateTask = useCallback(
    async (task: UserTask) => {
      if (!backendUserId) {
        setPageToast({
          type: 'error',
          text: 'No se pudo identificar tu usuario. Intenta más tarde.',
        });
        return;
      }

      setDuplicatingTaskId(task.id);

      try {
        const normalizedTitle = task.title?.trim() ?? '';
        const title = normalizedTitle.length > 0 ? `${normalizedTitle} (copia)` : 'Tarea duplicada';
        await duplicateTask(backendUserId, {
          title,
          pillarId: task.pillarId ?? null,
          traitId: task.traitId ?? null,
          statId: task.statId ?? null,
          difficultyId: task.difficultyId ?? null,
          isActive: task.isActive ?? true,
        });
        setPageToast({ type: 'success', text: 'Tarea duplicada correctamente.' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo duplicar la tarea.';
        setPageToast({ type: 'error', text: message });
      } finally {
        setDuplicatingTaskId(null);
      }
    },
    [backendUserId, duplicateTask],
  );

  const handleImproveTask = useCallback(
    (task: UserTask) => {
      if (!task) {
        return;
      }

      // TODO: conectar con el flujo de mejora por IA cuando esté disponible en el editor.
      setPageToast({
        type: 'info',
        text: 'Pronto podrás mejorar tareas con IA desde aquí.',
      });
    },
    [],
  );

  const navigationTasks = useMemo(() => {
    if (editVariant !== 'panel') {
      return [] as UserTask[];
    }

    return visibleTasks;
  }, [editVariant, visibleTasks]);

  const handleCloseEdit = useCallback(() => {
    setTaskToEdit(null);
    setEditVariant('modal');
    setEditGroupKey(null);
  }, []);

  const handleEditSuccess = useCallback(
    (message: string) => {
      setPageToast({ type: 'success', text: message });
      handleCloseEdit();
    },
    [handleCloseEdit],
  );

  const handleNavigatePanelTask = useCallback(
    (taskId: string) => {
      if (editVariant !== 'panel') {
        return;
      }

      const targetTask = navigationTasks.find((entry) => entry.id === taskId);
      if (targetTask) {
        setTaskToEdit(targetTask);
      }
    },
    [editVariant, navigationTasks],
  );

  return (
    <DevErrorBoundary>
      <div className="flex min-h-screen flex-col">
        <Navbar title={activeSection.pageTitle} sections={sections} />
        <main className="flex-1 pb-24 md:pb-0">
          <div className="mx-auto w-full max-w-7xl px-3 py-4 md:px-5 md:py-6 lg:px-6 lg:py-8">
            <SectionHeader section={taskEditorSection} />
            <Card>
              <div className="flex flex-col gap-5">
                {pageToast && (
                  <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+6.75rem)] z-40 md:inset-x-auto md:bottom-28 md:right-8 md:w-[24rem]">
                    <ToastBanner
                      tone={pageToast.type}
                      message={pageToast.text}
                      className="border-emerald-300/70 bg-emerald-500 text-white shadow-[0_14px_36px_rgba(16,185,129,0.45)]"
                    />
                  </div>
                )}
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

                {!isLoadingTasks && !combinedError && visibleTasks.length > 0 && (
                  <TaskList
                    tasks={visibleTasks}
                    pillarNamesById={pillarNamesById}
                    traitNamesById={traitNamesMap}
                    statNamesById={statNamesMap}
                    difficultyNamesById={difficultyNamesById}
                    onEditTask={(task) => setTaskToEdit(task)}
                    onDeleteTask={(task) => setTaskToDelete(task)}
                    onDuplicateTask={FEATURE_TASK_EDITOR_MOBILE_LIST_V1 ? handleDuplicateTask : undefined}
                    onImproveTask={FEATURE_TASK_EDITOR_MOBILE_LIST_V1 ? handleImproveTask : undefined}
                    duplicatingTaskId={FEATURE_TASK_EDITOR_MOBILE_LIST_V1 ? duplicatingTaskId : null}
                  />
                )}
              </div>
            </Card>
          </div>
        </main>
        {!isAppMode && (
          <MobileBottomNav
            items={sections.map((section) => {
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
        )}
        <button
          type="button"
          onClick={handleCreateClick}
          className="fixed bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(139,92,246,0.45)] transition hover:bg-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:bottom-10 md:right-8"
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
          onClose={handleCloseEdit}
          onTaskUpdated={handleEditSuccess}
          userId={backendUserId ?? null}
          task={taskToEdit}
          pillars={pillars}
          variant={editVariant}
          navigationTasks={navigationTasks}
          onNavigateTask={handleNavigatePanelTask}
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
  const shouldShowTitle = normalizedTitle.length > 0;
  const shouldShowDescription = normalizedDescription.length > 0;

  if (!shouldShowTitle && !shouldShowDescription) {
    return null;
  }

  return (
    <header className="mb-6 space-y-2 md:mb-8">
      {shouldShowTitle && (
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
          {normalizedTitle}
        </h1>
      )}
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
  if (!FEATURE_TASK_EDITOR_MOBILE_LIST_V1) {
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

  return (
    <div className="flex flex-col gap-4">
      <div className="md:hidden">
        <div className="sticky -mx-6 -mt-6 px-6 pt-6 pb-3 top-[4.5rem] z-30 space-y-3 rounded-t-2xl bg-surface/95 backdrop-blur">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Buscar tareas
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por título"
              className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </label>
          <div className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Pilares
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
              {pillars.map((pillar) => {
                const isActive = pillar.value === selectedPillar;
                return (
                  <button
                    key={pillar.value || 'all'}
                    type="button"
                    onClick={() => onPillarChange(pillar.value)}
                    className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
                      isActive
                        ? 'border-indigo-400/70 bg-indigo-400/15 text-indigo-100'
                        : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10'
                    }`}
                    aria-pressed={isActive}
                  >
                    {pillar.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {isLoadingPillars && (
          <p className="px-1 text-[10px] uppercase tracking-[0.28em] text-slate-500">Cargando pilares…</p>
        )}
        {pillarsError && !isLoadingPillars && (
          <button
            type="button"
            onClick={onRetryPillars}
            className="px-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-300"
          >
            Reintentar cargar pilares
          </button>
        )}
      </div>
      <div className="hidden flex-col gap-3 md:flex md:flex-row md:items-end">
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
    </div>
  );
}

function TaskList({
  tasks,
  pillarNamesById,
  traitNamesById,
  statNamesById,
  difficultyNamesById,
  onEditTask,
  onDeleteTask,
  onDuplicateTask,
  onImproveTask,
  duplicatingTaskId = null,
}: {
  tasks: UserTask[];
  pillarNamesById: Map<string, string>;
  traitNamesById: Map<string, string>;
  statNamesById: Map<string, string>;
  difficultyNamesById: Map<string, string>;
  onEditTask: (task: UserTask) => void;
  onDeleteTask: (task: UserTask) => void;
  onDuplicateTask?: (task: UserTask) => void;
  onImproveTask?: (task: UserTask) => void;
  duplicatingTaskId?: string | null;
}) {
  if (!FEATURE_TASK_EDITOR_MOBILE_LIST_V1) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            pillarName={pillarNamesById.get(task.pillarId ?? '') ?? null}
            traitName={task.traitId ? traitNamesById.get(task.traitId) ?? null : null}
            statName={task.statId ? statNamesById.get(task.statId) ?? null : null}
            difficultyName={task.difficultyId ? difficultyNamesById.get(task.difficultyId) ?? null : null}
            onEdit={() => onEditTask(task)}
            onDelete={() => onDeleteTask(task)}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <TaskListMobile
          tasks={tasks}
          pillarNamesById={pillarNamesById}
          difficultyNamesById={difficultyNamesById}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onDuplicateTask={onDuplicateTask}
          onImproveTask={onImproveTask}
          duplicatingTaskId={duplicatingTaskId}
        />
      </div>
      <div className="hidden grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:grid">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            pillarName={pillarNamesById.get(task.pillarId ?? '') ?? null}
            traitName={task.traitId ? traitNamesById.get(task.traitId) ?? null : null}
            statName={task.statId ? statNamesById.get(task.statId) ?? null : null}
            difficultyName={task.difficultyId ? difficultyNamesById.get(task.difficultyId) ?? null : null}
            onEdit={() => onEditTask(task)}
            onDelete={() => onDeleteTask(task)}
          />
        ))}
      </div>
    </>
  );
}

function TaskListMobile({
  tasks,
  pillarNamesById,
  difficultyNamesById,
  onEditTask,
  onDeleteTask,
  onDuplicateTask,
  onImproveTask,
  duplicatingTaskId,
}: {
  tasks: UserTask[];
  pillarNamesById: Map<string, string>;
  difficultyNamesById: Map<string, string>;
  onEditTask: (task: UserTask) => void;
  onDeleteTask: (task: UserTask) => void;
  onDuplicateTask?: (task: UserTask) => void;
  onImproveTask?: (task: UserTask) => void;
  duplicatingTaskId: string | null;
}) {
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenuTaskId) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const container = menuContainerRef.current;
      if (!container) {
        return;
      }
      if (container.contains(event.target as Node)) {
        return;
      }
      setOpenMenuTaskId(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuTaskId(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuTaskId]);

  useEffect(() => {
    if (!openMenuTaskId) {
      menuContainerRef.current = null;
    }
  }, [openMenuTaskId]);

  const resolveDifficulty = useCallback(
    (task: UserTask) => {
      const difficultyId = task.difficultyId ?? '';
      const name = difficultyId ? difficultyNamesById.get(difficultyId) ?? difficultyId : 'Sin dificultad';
      const reference = (difficultyId || name).toLowerCase();
      let tone = 'bg-slate-400';
      if (reference.includes('easy') || reference.includes('baja') || reference.includes('low')) {
        tone = 'bg-emerald-400';
      } else if (reference.includes('medium') || reference.includes('media')) {
        tone = 'bg-amber-400';
      } else if (reference.includes('hard') || reference.includes('alta') || reference.includes('high')) {
        tone = 'bg-rose-400';
      }

      return { label: name || 'Sin dificultad', tone };
    },
    [difficultyNamesById],
  );

  // TODO: incorporar gestos de swipe cuando exista infraestructura compartida en el proyecto.
  return (
    <ul className="divide-y divide-white/5 overflow-visible rounded-2xl border border-white/10 bg-white/5">
      {tasks.map((task) => {
        const { label: difficultyLabel, tone } = resolveDifficulty(task);
        const isMenuOpen = openMenuTaskId === task.id;
        const isDuplicating = duplicatingTaskId === task.id;

        return (
          <li key={task.id} className="relative">
            <button
              type="button"
              onClick={() => onEditTask(task)}
              className="flex w-full flex-col gap-2 px-4 py-2.5 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-1 pr-8 text-sm font-semibold text-white">{task.title}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 font-semibold uppercase tracking-[0.18em] text-slate-100">
                  <span className={`h-1.5 w-1.5 rounded-full ${tone}`} aria-hidden />
                  <span>{difficultyLabel}</span>
                </span>
              </div>
            </button>
            <div
              className="pointer-events-auto absolute right-2 bottom-2"
              ref={(node) => {
                if (isMenuOpen) {
                  menuContainerRef.current = node;
                }
              }}
            >
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenuTaskId((current) => (current === task.id ? null : task.id));
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base text-slate-200 transition hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
              >
                <span aria-hidden>⋯</span>
                <span className="sr-only">Más acciones</span>
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-10 z-40 w-44 rounded-xl border border-white/10 bg-slate-900/95 p-1 shadow-[0_10px_30px_rgba(15,23,42,0.6)]">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuTaskId(null);
                      onEditTask(task);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={!onDuplicateTask || isDuplicating}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuTaskId(null);
                      if (onDuplicateTask) {
                        void onDuplicateTask(task);
                      }
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      !onDuplicateTask
                        ? 'cursor-not-allowed text-slate-500'
                        : 'text-slate-100 hover:bg-white/10'
                    } ${isDuplicating ? 'opacity-70' : ''}`.trim()}
                  >
                    {isDuplicating ? 'Duplicando…' : 'Duplicar'}
                  </button>
                  <button
                    type="button"
                    disabled={!onImproveTask}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuTaskId(null);
                      if (onImproveTask) {
                        onImproveTask(task);
                      }
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      onImproveTask
                        ? 'text-slate-100 hover:bg-white/10'
                        : 'cursor-not-allowed text-slate-500'
                    }`}
                  >
                    Mejorar con IA
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuTaskId(null);
                      onDeleteTask(task);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-200 transition hover:bg-rose-500/10"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TaskCard({
  task,
  pillarName,
  traitName,
  statName,
  difficultyName,
  onEdit,
  onDelete,
}: {
  task: UserTask;
  pillarName: string | null;
  traitName: string | null;
  statName: string | null;
  difficultyName: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="group relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.35)] transition hover:border-white/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="font-semibold text-slate-100">{task.title}</h3>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
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
          <dd className="truncate text-right">{traitName ?? task.traitId ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-slate-300">Stat</dt>
          <dd className="truncate text-right">{statName ?? task.statId ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-slate-300">Dificultad</dt>
          <dd className="truncate text-right">{difficultyName ?? task.difficultyId ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-slate-300">XP base</dt>
          <dd className="truncate text-right">{task.xp != null ? task.xp : '—'}</dd>
        </div>
      </dl>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        Actualizada: {formatDateLabel(task.updatedAt)}
      </p>
    </article>
  );
}

interface TaskBoardGroup {
  key: string;
  code: string;
  name: string;
  tasks: UserTask[];
}

interface TaskBoardProps {
  groups: TaskBoardGroup[];
  difficultyNamesById: Map<string, string>;
  pillarNamesById: Map<string, string>;
  activeTaskId: string | null;
  onSelectTask: (task: UserTask, groupKey: string) => void;
  onDeleteTask: (task: UserTask) => void;
}

const PILLAR_STYLE_MAP: Record<string, { headerText: string; badgeBg: string; badgeText: string; bullet: string; ring: string }>
 = {
  BODY: {
    headerText: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/15 border border-emerald-400/40',
    badgeText: 'text-emerald-100',
    bullet: 'text-emerald-300',
    ring: 'ring-emerald-400/40',
  },
  MIND: {
    headerText: 'text-sky-300',
    badgeBg: 'bg-sky-500/15 border border-sky-400/40',
    badgeText: 'text-sky-100',
    bullet: 'text-sky-300',
    ring: 'ring-sky-400/40',
  },
  SOUL: {
    headerText: 'text-violet-300',
    badgeBg: 'bg-violet-500/15 border border-violet-400/40',
    badgeText: 'text-violet-100',
    bullet: 'text-violet-300',
    ring: 'ring-violet-400/40',
  },
};

const DEFAULT_PILLAR_STYLE = {
  headerText: 'text-indigo-300',
  badgeBg: 'bg-indigo-500/15 border border-indigo-400/40',
  badgeText: 'text-indigo-100',
  bullet: 'text-indigo-300',
  ring: 'ring-indigo-400/40',
};

function resolvePillarStyle(code: string | undefined) {
  if (!code) {
    return DEFAULT_PILLAR_STYLE;
  }
  return PILLAR_STYLE_MAP[code.toUpperCase()] ?? DEFAULT_PILLAR_STYLE;
}

function TaskBoard({
  groups,
  difficultyNamesById,
  pillarNamesById,
  activeTaskId,
  onSelectTask,
  onDeleteTask,
}: TaskBoardProps) {
  if (groups.length === 0) {
    return <div className="hidden lg:block" />;
  }

  return (
    <div className="hidden gap-4 lg:grid lg:grid-cols-3">
      {groups.map((group) => {
        const style = resolvePillarStyle(group.code);
        const displayCode = group.code === 'UNKNOWN' ? 'Sin pilar' : group.code;

        return (
          <section
            key={group.key}
            className="flex min-h-[260px] flex-col rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <header className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${style.headerText}`}>
                  {group.name}
                </p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{displayCode}</p>
              </div>
              <span
                className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${style.badgeBg} ${style.badgeText}`}
              >
                {group.tasks.length}
              </span>
            </header>
            <div className="mt-3 flex-1 space-y-2">
              {group.tasks.length === 0 ? (
                <p className="rounded-xl border border-white/5 bg-white/5 px-3 py-6 text-center text-xs text-slate-500">
                  Sin tareas en este pilar.
                </p>
              ) : (
                group.tasks.map((task: UserTask) => (
                  <TaskBoardItem
                    key={task.id}
                    task={task}
                    groupKey={group.key}
                    pillarName=
                      {group.key === '__unknown__'
                        ? pillarNamesById.get(task.pillarId ?? '') ?? 'Sin pilar'
                        : group.name}
                    difficultyName={task.difficultyId ? difficultyNamesById.get(task.difficultyId) ?? null : null}
                    isActiveTask={activeTaskId === task.id}
                    onSelectTask={onSelectTask}
                    onDeleteTask={onDeleteTask}
                    bulletClass={style.bullet}
                    ringClass={style.ring}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

interface TaskBoardItemProps {
  task: UserTask;
  groupKey: string;
  pillarName: string;
  difficultyName: string | null;
  isActiveTask: boolean;
  onSelectTask: (task: UserTask, groupKey: string) => void;
  onDeleteTask: (task: UserTask) => void;
  bulletClass: string;
  ringClass: string;
}

function TaskBoardItem({
  task,
  groupKey,
  pillarName,
  difficultyName,
  isActiveTask,
  onSelectTask,
  onDeleteTask,
  bulletClass,
  ringClass,
}: TaskBoardItemProps) {
  const handleClick = () => {
    onSelectTask(task, groupKey);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectTask(task, groupKey);
    }
  };

  const containerClasses = [
    'group relative cursor-pointer rounded-xl border border-white/10 bg-slate-900/60 p-3 transition hover:border-white/25 hover:bg-slate-900/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
    isActiveTask ? `border-white/30 bg-slate-900/80 ring-2 ${ringClass}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role="button"
      tabIndex={0}
      className={containerClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-pressed={isActiveTask}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-100">{task.title}</p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                task.isActive ? 'bg-emerald-500/10 text-emerald-200' : 'bg-slate-700/20 text-slate-300'
              }`}
            >
              {task.isActive ? 'Activa' : 'Inactiva'}
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className={`text-base leading-none ${bulletClass}`}>•</span>
              {difficultyName ?? 'Sin dificultad'}
            </span>
            <span className="text-slate-500">{pillarName}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDeleteTask(task);
          }}
          className="rounded-full border border-rose-500/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200 transition hover:border-rose-400 hover:text-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
        >
          Eliminar
        </button>
      </div>
    </div>
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm md:items-center">
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

type ToastMessage = { type: 'success' | 'error' | 'info'; text: string };

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
      });
      setToast({ type: 'success', text: 'Tarea creada correctamente.' });
      setTitle('');
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm md:items-center">
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
  onTaskUpdated?: (message: string) => void;
  userId: string | null;
  task: UserTask | null;
  pillars: Pillar[];
  variant?: 'modal' | 'panel';
  navigationTasks?: UserTask[];
  onNavigateTask?: (taskId: string) => void;
}

function EditTaskModal({
  open,
  onClose,
  onTaskUpdated,
  userId,
  task,
  pillars,
  variant = 'modal',
  navigationTasks = [],
  onNavigateTask,
}: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [difficultyId, setDifficultyId] = useState('');
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
      setIsActive(true);
      setErrors({});
      setToast(null);
      return;
    }

    if (task) {
      setTitle(task.title ?? '');
      setDifficultyId(task.difficultyId ?? '');
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
        isActive,
      });

      if (onTaskUpdated) {
        onTaskUpdated('Tarea actualizada correctamente.');
        handleClose();
        return;
      }

      setToast({ type: 'success', text: 'Tarea actualizada correctamente.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar la tarea.';
      setToast({ type: 'error', text: message });
    }
  };

  const handleNavigate = useCallback(
    (target: UserTask | null) => {
      if (target && onNavigateTask) {
        onNavigateTask(target.id);
      }
    },
    [onNavigateTask],
  );

  if (!open || !task) {
    return null;
  }

  const showNavigation = variant === 'panel' && navigationTasks.length > 0 && task != null;
  const activeIndex = showNavigation ? navigationTasks.findIndex((entry) => entry.id === task.id) : -1;
  const previousTask = showNavigation && activeIndex > 0 ? navigationTasks[activeIndex - 1] : null;
  const nextTask =
    showNavigation && activeIndex >= 0 && activeIndex < navigationTasks.length - 1
      ? navigationTasks[activeIndex + 1]
      : null;
  const navigationLabel = showNavigation
    ? `${activeIndex + 1}/${navigationTasks.length}`
    : navigationTasks.length > 0
      ? `—/${navigationTasks.length}`
      : '—';

  const formBody = (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Editar tarea</p>
        <h2 className="text-xl font-semibold text-white">Actualiza los detalles de tu tarea</h2>
        <p className="text-sm text-slate-300">
          Ajusta el título, dificultad y estado. Los campos de pilar, rasgo y stat permanecen bloqueados.
        </p>
      </header>

      <section className="space-y-4">
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Contexto</span>
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
  );

  if (variant === 'panel') {
    return (
      <div className="fixed inset-0 z-[60] flex">
        <button
          type="button"
          aria-label="Cerrar"
          onClick={handleClose}
          className="flex-1 bg-slate-950/60 backdrop-blur-sm"
        />
        <aside className="flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-slate-950/95 text-slate-100 shadow-[0_18px_40px_rgba(15,23,42,0.65)]">
          <form onSubmit={handleSubmit} className="flex h-full flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
              {showNavigation ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleNavigate(previousTask)}
                    disabled={!previousTask}
                    className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {navigationLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNavigate(nextTask)}
                    disabled={!nextTask}
                    className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              ) : (
                <p className="text-sm font-semibold text-slate-200">Editar tarea</p>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/30 hover:text-white"
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">{formBody}</div>
          </form>
        </aside>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm md:items-center">
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
          {formBody}
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

export { TaskList, DeleteTaskModal, CreateTaskModal, EditTaskModal };

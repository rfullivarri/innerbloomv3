import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { DevErrorBoundary } from "../../components/DevErrorBoundary";
import { Navbar } from "../../components/layout/Navbar";
import { MobileBottomNav } from "../../components/layout/MobileBottomNav";
import { Card } from "../../components/common/Card";
import { ToastBanner } from "../../components/common/ToastBanner";
import { useBackendUser } from "../../hooks/useBackendUser";
import {
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
  useUserTasks,
} from "../../hooks/useUserTasks";
import {
  useDifficulties,
  usePillars,
  useStats,
  useTraits,
} from "../../hooks/useCatalogs";
import { type UserTask } from "../../lib/api";
import {
  fetchCatalogStats,
  fetchCatalogTraits,
  type Pillar,
  type Trait,
} from "../../lib/api/catalogs";
import { useAppMode } from "../../hooks/useAppMode";
import { useDailyQuestReadiness } from "../../hooks/useDailyQuestReadiness";
import { useOnboardingEditorNudge } from "../../hooks/useOnboardingEditorNudge";
import { usePostLoginLanguage } from "../../i18n/postLoginLanguage";
import {
  localizeDifficultyLabel,
  localizePillarLabel,
  localizeTraitLabel,
} from "../editor/labelLocalization";
import { EDITOR_LAB_QUICK_START_SEED } from "./editorLabSeed";
import {
  EditorGuideOverlay,
  markEditorGuideAsSeen,
  shouldAutoOpenEditorGuide,
} from "./editor-guide/EditorGuideOverlay";
import type { EditorGuideStepId } from "./editor-guide/guideConfig";
import {
  getActiveSection,
  getDashboardSectionConfig,
  getDashboardSections,
  type DashboardSectionConfig,
} from "../dashboardSections";

export const FEATURE_TASK_EDITOR_MOBILE_LIST_V1 = true;
const ENABLE_EDITOR_GUIDE_AUTO_OPEN = true;

export default function EditorLabPage() {
  const location = useLocation();
  const { language, t } = usePostLoginLanguage();
  const activeLocale = language === "es" ? "es" : "en";
  const sections = getDashboardSections(location.pathname, language);
  const activeSection = getActiveSection(location.pathname, sections, language);
  const taskEditorSection = getDashboardSectionConfig(
    "editor",
    location.pathname,
    language,
  );
  const {
    backendUserId,
    status: backendStatus,
    error: backendError,
    reload: reloadProfile,
  } = useBackendUser();
  const {
    tasks,
    status: tasksStatus,
    error: tasksError,
    reload: reloadTasks,
  } = useUserTasks(backendUserId);
  const {
    data: pillars,
    isLoading: isLoadingPillars,
    error: pillarsError,
    reload: reloadPillars,
  } = usePillars();
  const { data: difficulties } = useDifficulties();
  const isAppMode = useAppMode();

  const [traitCatalogById, setTraitCatalogById] = useState<
    Record<string, { name: string; code: string }>
  >({});
  const [statNamesById, setStatNamesById] = useState<Record<string, string>>(
    {},
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPillar, setSelectedPillar] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<UserTask | null>(null);
  const [editVariant, setEditVariant] = useState<"modal" | "panel">("modal");
  const [editGroupKey, setEditGroupKey] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<UserTask | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
    null,
  );
  const [pageToast, setPageToast] = useState<ToastMessage | null>(null);
  const [duplicatingTaskId, setDuplicatingTaskId] = useState<string | null>(
    null,
  );
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeGuideStepId, setActiveGuideStepId] =
    useState<EditorGuideStepId>("wheel-core");
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [isApplyingSuggestions, setIsApplyingSuggestions] = useState(false);

  const editorTopRef = useRef<HTMLDivElement | null>(null);
  const dailyQuestReadiness = useDailyQuestReadiness(backendUserId ?? "", {
    enabled: Boolean(backendUserId),
  });
  const onboardingEditorNudge = useOnboardingEditorNudge({
    completedFirstDailyQuest: dailyQuestReadiness.completedFirstDailyQuest,
  });
  const {
    firstEditDone,
    shouldShowInlineNotice,
    shouldShowDashboardDot,
    markFirstEditDone,
  } = onboardingEditorNudge;

  const { deleteTask, status: deleteStatus } = useDeleteTask();
  const { createTask } = useCreateTask();

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const isBackendReady = backendStatus === "success" && Boolean(backendUserId);
  const isLoadingTasks =
    !isBackendReady ||
    tasksStatus === "loading" ||
    (isBackendReady && tasksStatus === "idle");
  const combinedError = backendError ?? tasksError;

  useEffect(() => {
    if (!taskToDelete) {
      setDeleteErrorMessage(null);
    }
  }, [taskToDelete]);

  useEffect(() => {
    if (!ENABLE_EDITOR_GUIDE_AUTO_OPEN) {
      return;
    }
    if (shouldAutoOpenEditorGuide()) {
      setShowGuideModal(true);
    }
  }, []);

  useEffect(() => {
    const missingTraitsByPillar = new Map<string, Set<string>>();

    for (const task of tasks) {
      const pillarId = task.pillarId?.trim();
      const traitId = task.traitId?.trim();
      if (!pillarId || !traitId || traitCatalogById[traitId]) {
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
      const updates: Record<string, { name: string; code: string }> = {};

      for (const [pillarId] of missingTraitsByPillar) {
        try {
          const traits = await fetchCatalogTraits(pillarId);
          for (const trait of traits) {
            updates[trait.id] = { name: trait.name, code: trait.code };
          }
        } catch (error) {
          console.error("Failed to load traits for pillar", pillarId, error);
        }
      }

      if (!isCancelled && Object.keys(updates).length > 0) {
        setTraitCatalogById((previous) => ({ ...previous, ...updates }));
      }
    };

    void loadTraits();

    return () => {
      isCancelled = true;
    };
  }, [tasks, traitCatalogById]);

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
          console.error("Failed to load stats for trait", traitId, error);
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
      { value: "", label: t("editor.filters.pillars.all") },
      ...pillars.map((pillar) => ({
        value: pillar.id,
        label: localizePillarLabel(pillar.name, language),
      })),
    ];
  }, [language, pillars, t]);

  const pillarNamesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const pillar of pillars) {
      map.set(pillar.id, localizePillarLabel(pillar.name, language));
    }
    return map;
  }, [language, pillars]);

  const traitNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [traitId, trait] of Object.entries(traitCatalogById)) {
      map.set(
        traitId,
        localizeTraitLabel(
          { name: trait.name, code: trait.code, fallback: traitId },
          language,
        ),
      );
    }
    return map;
  }, [language, traitCatalogById]);
  const statNamesMap = useMemo(
    () => new Map(Object.entries(statNamesById)),
    [statNamesById],
  );
  const difficultyNamesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const difficulty of difficulties) {
      map.set(
        difficulty.id,
        localizeDifficultyLabel(difficulty.name, language),
      );
    }
    return map;
  }, [difficulties, language]);

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
        normalizedSearch.length === 0 ||
        task.title.toLowerCase().includes(normalizedSearch);
      const matchesPillar =
        selectedPillar.length === 0 ||
        (task.pillarId ?? "").toLowerCase() === selectedPillar.toLowerCase();
      return matchesSearch && matchesPillar;
    });
  }, [normalizedSearch, selectedPillar, tasks]);

  const sortedTasks = useMemo(() => {
    if (!FEATURE_TASK_EDITOR_MOBILE_LIST_V1) {
      return filteredTasks;
    }

    const entries = filteredTasks.map((task) => ({
      task,
      pillarName: pillarNamesById.get(task.pillarId ?? "") ?? "",
    }));

    entries.sort((a, b) => {
      if (a.pillarName === b.pillarName) {
        return a.task.title.localeCompare(b.task.title, activeLocale, {
          sensitivity: "base",
        });
      }

      if (!a.pillarName) {
        return 1;
      }

      if (!b.pillarName) {
        return -1;
      }

      return a.pillarName.localeCompare(b.pillarName, activeLocale, {
        sensitivity: "base",
      });
    });

    return entries.map((entry) => entry.task);
  }, [activeLocale, filteredTasks, pillarNamesById]);

  const hasActiveFilters =
    normalizedSearch.length > 0 || selectedPillar.length > 0;
  const isDeletingTask = deleteStatus === "loading";

  const isTaskListEmpty =
    !isLoadingTasks && !combinedError && tasks.length === 0;
  const visibleTasks = FEATURE_TASK_EDITOR_MOBILE_LIST_V1
    ? sortedTasks
    : filteredTasks;
  const isFilteredEmpty =
    !isLoadingTasks &&
    !combinedError &&
    tasks.length > 0 &&
    visibleTasks.length === 0;

  const handleRetry = () => {
    reloadProfile();
    reloadTasks();
  };

  const handleCreateClick = () => {
    setShowCreateModal(true);
  };

  const handleGuideStepChange = useCallback((stepId: EditorGuideStepId) => {
    setActiveGuideStepId(stepId);
    setTaskToEdit(null);
    setShowSuggestionsModal(false);

    switch (stepId) {
      case "modal-core":
      case "modal-ai-thinking":
        setShowCreateModal(true);
        break;
      case "modal-entry":
      case "filters":
      case "task-list":
      case "suggestions":
      case "wheel-core":
      case "wheel-pillars":
      case "wheel-traits":
      default:
        setShowCreateModal(false);
        break;
    }
  }, []);

  const handleDeleteModalClose = useCallback(() => {
    if (isDeletingTask) {
      return;
    }
    setTaskToDelete(null);
  }, [isDeletingTask]);

  const handleConfirmDelete = useCallback(async () => {
    if (!taskToDelete) {
      setDeleteErrorMessage(t("editor.validation.taskNotFound"));
      return;
    }

    if (!backendUserId) {
      setDeleteErrorMessage(t("editor.validation.userNotFound"));
      return;
    }

    setDeleteErrorMessage(null);

    try {
      await deleteTask(backendUserId, taskToDelete.id);
      setTaskToDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("editor.toast.delete.error");
      setDeleteErrorMessage(message);
      setPageToast({ type: "error", text: message });
    }
  }, [backendUserId, deleteTask, t, taskToDelete]);

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
          type: "error",
          text: t("editor.validation.userNotFound"),
        });
        return;
      }

      setDuplicatingTaskId(task.id);

      try {
        const normalizedTitle = task.title?.trim() ?? "";
        const title =
          normalizedTitle.length > 0
            ? `${normalizedTitle} ${t("editor.duplicate.copySuffix")}`
            : t("editor.duplicate.fallbackTitle");
        await createTask(backendUserId, {
          title,
          pillarId: task.pillarId ?? null,
          traitId: task.traitId ?? null,
          statId: task.statId ?? null,
          difficultyId: task.difficultyId ?? null,
          isActive: task.isActive ?? true,
        });
        setPageToast({
          type: "success",
          text: t("editor.toast.duplicate.success"),
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t("editor.toast.duplicate.error");
        setPageToast({ type: "error", text: message });
      } finally {
        setDuplicatingTaskId(null);
      }
    },
    [backendUserId, createTask, t],
  );

  const handleApplySuggestions = useCallback(
    async (selectedTaskIds: string[]) => {
      if (!backendUserId) {
        setPageToast({
          type: "error",
          text: t("editor.validation.userNotFound"),
        });
        return;
      }
      if (selectedTaskIds.length === 0) {
        return;
      }

      setIsApplyingSuggestions(true);
      const selectedTasks = EDITOR_LAB_QUICK_START_SEED.filter((task) =>
        selectedTaskIds.includes(task.id),
      );

      try {
        const normalizeValue = (value: string) => value.trim().toLowerCase();
        const pillarIdBySeedPillar = new Map<string, string>();
        for (const pillar of pillars) {
          const name = normalizeValue(pillar.name);
          const code = normalizeValue(pillar.code ?? "");
          if (
            name.includes("body") ||
            name.includes("cuerpo") ||
            code.includes("body")
          ) {
            pillarIdBySeedPillar.set("Body", pillar.id);
          }
          if (
            name.includes("mind") ||
            name.includes("mente") ||
            code.includes("mind")
          ) {
            pillarIdBySeedPillar.set("Mind", pillar.id);
          }
          if (
            name.includes("soul") ||
            name.includes("alma") ||
            code.includes("soul")
          ) {
            pillarIdBySeedPillar.set("Soul", pillar.id);
          }
        }

        const traitLookup = new Map<string, string>();
        for (const [seedPillar, pillarId] of pillarIdBySeedPillar.entries()) {
          const traits = await fetchCatalogTraits(pillarId);
          for (const trait of traits) {
            const key = `${seedPillar}:${normalizeValue(trait.code ?? trait.name)}`;
            traitLookup.set(key, trait.id);
          }
        }

        let createdCount = 0;
        for (const task of selectedTasks) {
          const pillarId = pillarIdBySeedPillar.get(task.pillar) ?? null;
          const traitId =
            traitLookup.get(`${task.pillar}:${normalizeValue(task.trait)}`) ??
            null;
          await createTask(backendUserId, {
            title: task.title,
            pillarId,
            traitId,
            statId: null,
            difficultyId: null,
            isActive: true,
          });
          createdCount += 1;
        }

        await reloadTasks();
        setShowSuggestionsModal(false);
        setPageToast({
          type: "success",
          text:
            language === "es"
              ? `Se agregaron ${createdCount} sugerencia(s) a tu sistema.`
              : `Added ${createdCount} suggestion(s) to your system.`,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not apply suggestions.";
        setPageToast({ type: "error", text: message });
      } finally {
        setIsApplyingSuggestions(false);
      }
    },
    [backendUserId, createTask, language, pillars, reloadTasks, t],
  );

  const navigationTasks = useMemo(() => {
    if (editVariant !== "panel") {
      return [] as UserTask[];
    }

    return visibleTasks;
  }, [editVariant, visibleTasks]);

  const handleCloseEdit = useCallback(() => {
    setTaskToEdit(null);
    setEditVariant("modal");
    setEditGroupKey(null);
  }, []);

  const scrollToEditorTop = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const anchor = editorTopRef.current;
    if (!anchor) {
      return;
    }

    const headerOffset = 92;
    const target =
      anchor.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(target, 0), behavior: "smooth" });
  }, []);

  const handleEditSuccess = useCallback(() => {
    // Keep the existing trigger timing so the shared nudge can hydrate from the current journey overlay immediately.
    const isFirstOnboardingEdit =
      !dailyQuestReadiness.completedFirstDailyQuest && !firstEditDone;

    if (isFirstOnboardingEdit) {
      void markFirstEditDone();
    }

    if (!isFirstOnboardingEdit) {
      setPageToast({
        type: "success",
        text: t("editor.toast.edit.saved"),
      });
    }

    handleCloseEdit();
    window.setTimeout(() => {
      scrollToEditorTop();
    }, 20);
  }, [
    dailyQuestReadiness.completedFirstDailyQuest,
    handleCloseEdit,
    firstEditDone,
    markFirstEditDone,
    scrollToEditorTop,
    t,
  ]);

  const handleNavigatePanelTask = useCallback(
    (taskId: string) => {
      if (editVariant !== "panel") {
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
        <Navbar
          title={activeSection.pageTitle}
          sections={sections.map((section) => ({
            ...section,
            showPulseDot: section.key === "dashboard" && shouldShowDashboardDot,
          }))}
        />
        <main
          className="flex-1 pb-[calc(env(safe-area-inset-bottom,0px)+10.25rem)] md:pb-0"
          data-light-scope="editor"
        >
          <div ref={editorTopRef} className="scroll-mt-24" />
          <div className="mx-auto w-full max-w-7xl px-2 py-4 md:px-5 md:py-6 lg:px-6 lg:py-8">
            <SectionHeader section={taskEditorSection} />
            <Card className="px-4 py-5 md:p-6">
              <div className="flex flex-col gap-5">
                {pageToast && (
                  <div className="fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-[70] md:inset-x-auto md:right-8 md:top-24 md:w-[24rem]">
                    <ToastBanner
                      tone={pageToast.type}
                      message={pageToast.text}
                      className="border-emerald-300/70 bg-emerald-500 text-white shadow-[0_14px_36px_rgba(16,185,129,0.45)]"
                    />
                  </div>
                )}
                {shouldShowInlineNotice && (
                  <div className="ib-onboarding-alert ib-onboarding-alert--progress mb-2 rounded-2xl px-3 py-2.5 md:mb-3 md:px-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="ib-onboarding-alert__body text-xs leading-snug md:text-sm">
                        {t("editor.onboarding.banner.message")}
                      </p>
                      <Link
                        to={
                          getDashboardSectionConfig(
                            "dashboard",
                            location.pathname,
                            language,
                          ).to
                        }
                        className="ib-onboarding-alert__cta inline-flex shrink-0 items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition focus-visible:outline-none focus-visible:ring-2"
                      >
                        {t("editor.onboarding.banner.cta")}{" "}
                        <span className="ml-1.5" aria-hidden>
                          →
                        </span>
                      </Link>
                    </div>
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
                  onOpenGuide={() => setShowGuideModal(true)}
                  onOpenSuggestions={() => setShowSuggestionsModal(true)}
                />

                {isLoadingTasks && <TaskListSkeleton />}

                {combinedError && !isLoadingTasks && (
                  <TaskListError
                    message={combinedError.message}
                    onRetry={handleRetry}
                  />
                )}

                {isTaskListEmpty && (
                  <TaskListEmpty message={t("editor.empty.noTasks")} />
                )}

                {isFilteredEmpty && (
                  <TaskListEmpty
                    message={
                      hasActiveFilters
                        ? t("editor.empty.noMatches")
                        : t("editor.empty.noVisibleTasks")
                    }
                  />
                )}

                {!isLoadingTasks &&
                  !combinedError &&
                  visibleTasks.length > 0 && (
                    <div data-editor-guide-target="task-list">
                      <TaskList
                        tasks={visibleTasks}
                        pillarNamesById={pillarNamesById}
                        traitNamesById={traitNamesMap}
                        statNamesById={statNamesMap}
                        difficultyNamesById={difficultyNamesById}
                        onEditTask={(task) => setTaskToEdit(task)}
                        onDeleteTask={(task) => setTaskToDelete(task)}
                        onDuplicateTask={
                          FEATURE_TASK_EDITOR_MOBILE_LIST_V1
                            ? handleDuplicateTask
                            : undefined
                        }
                        duplicatingTaskId={
                          FEATURE_TASK_EDITOR_MOBILE_LIST_V1
                            ? duplicatingTaskId
                            : null
                        }
                      />
                    </div>
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
                label:
                  section.key === "editor"
                    ? t("editor.navigation.label")
                    : section.label,
                to: section.to,
                icon: <Icon className="h-4 w-4" />,
                end: section.end,
                showPulseDot:
                  section.key === "dashboard" && shouldShowDashboardDot,
              };
            })}
          />
        )}
        {!showCreateModal && taskToEdit == null && (
          <button
            type="button"
            onClick={handleCreateClick}
            data-editor-guide-target="new-task-trigger"
            className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+7.25rem)] right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-violet-500 px-3.5 py-2 text-[0.72rem] font-semibold text-white shadow-[0_10px_26px_rgba(139,92,246,0.42)] transition hover:bg-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:bottom-10 md:right-8 md:gap-2 md:px-5 md:py-3 md:text-sm"
          >
            <span aria-hidden className="text-sm leading-none md:text-lg">
              ＋
            </span>
            {t("editor.button.newTask")}
          </button>
        )}
        <CreateTaskModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          userId={backendUserId ?? null}
          pillars={pillars}
          isLoadingPillars={isLoadingPillars}
          pillarsError={pillarsError}
          onRetryPillars={reloadPillars}
          guideStepId={showGuideModal ? activeGuideStepId : null}
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
        <EditorGuideOverlay
          isOpen={showGuideModal}
          locale={language === "es" ? "es" : "en"}
          onStepChange={handleGuideStepChange}
          onClose={() => {
            markEditorGuideAsSeen();
            setShowGuideModal(false);
            setShowCreateModal(false);
          }}
        />
        <SuggestionsLabModal
          isOpen={showSuggestionsModal}
          isApplying={isApplyingSuggestions}
          onClose={() => setShowSuggestionsModal(false)}
          onApply={handleApplySuggestions}
        />
      </div>
    </DevErrorBoundary>
  );
}

function SectionHeader({ section }: { section: DashboardSectionConfig }) {
  const normalizedTitle = section.contentTitle.trim();
  const normalizedDescription = section.description?.trim() ?? "";
  const shouldShowTitle = normalizedTitle.length > 0;
  const shouldShowDescription = normalizedDescription.length > 0;

  if (!shouldShowTitle && !shouldShowDescription) {
    return null;
  }

  return (
    <header className="mb-6 space-y-3 md:mb-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/85">
        Editor Lab
      </p>
      {shouldShowTitle && (
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[color:var(--color-text)] sm:text-3xl">
          {normalizedTitle}
        </h1>
      )}
      {shouldShowDescription && (
        <p className="max-w-3xl text-sm leading-relaxed text-[color:var(--color-slate-400)]">
          {normalizedDescription}
        </p>
      )}
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
  onOpenGuide: () => void;
  onOpenSuggestions: () => void;
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
  onOpenGuide,
  onOpenSuggestions,
}: TaskFiltersProps) {
  const { t, language } = usePostLoginLanguage();
  if (!FEATURE_TASK_EDITOR_MOBILE_LIST_V1) {
    return (
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex w-full flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-slate-400)]">
            {t("editor.filters.search.label")}
          </span>
          <div className="relative flex items-center">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("editor.filters.search.placeholder")}
              className="w-full rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-4 py-2.5 text-sm ios-touch-input text-[color:var(--color-slate-100)] placeholder:text-[color:var(--color-slate-400)] focus:border-[color:var(--color-border-soft)] focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
        </label>
        <label className="flex w-full flex-col gap-2 md:max-w-xs">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-slate-400)]">
            {t("editor.filters.pillar.label")}
          </span>
          <select
            value={selectedPillar}
            onChange={(event) => onPillarChange(event.target.value)}
            className="w-full appearance-none rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-4 py-2.5 text-sm ios-touch-input text-[color:var(--color-slate-100)] focus:border-[color:var(--color-border-soft)] focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            {pillars.map((pillar) => (
              <option
                key={pillar.value || "all"}
                value={pillar.value}
                className="bg-slate-900 text-[color:var(--color-slate-100)]"
              >
                {pillar.label}
              </option>
            ))}
          </select>
          {isLoadingPillars && (
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              {t("editor.filters.pillar.loading")}
            </span>
          )}
          {pillarsError && !isLoadingPillars && (
            <button
              type="button"
              onClick={onRetryPillars}
              className="self-start text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-300"
            >
              {t("editor.filters.pillar.retry")}
            </button>
          )}
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden items-center justify-end gap-2 md:flex">
        <button
          type="button"
          onClick={onOpenGuide}
          aria-label={language === "es" ? "Abrir guía" : "Open guide"}
          title={language === "es" ? "Ver guía" : "View guide"}
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/55 bg-violet-100/95 px-2.5 py-1 text-xs font-semibold text-violet-700 shadow-[0_4px_12px_rgba(124,58,237,0.16)] transition hover:border-violet-500/60 hover:bg-violet-200/90 hover:text-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed disabled:opacity-45 dark:border-violet-300/55 dark:bg-violet-500/35 dark:text-violet-50 dark:shadow-[0_6px_18px_rgba(124,58,237,0.35)] dark:hover:border-violet-200/80 dark:hover:bg-violet-500/45 dark:hover:text-white dark:focus-visible:outline-violet-200"
        >
          <GuideCompassIcon className="h-3.5 w-3.5" />
          <span>{language === "es" ? "Ver guía" : "View guide"}</span>
        </button>
        <button
          type="button"
          onClick={onOpenSuggestions}
          aria-label={language === "es" ? "Abrir sugerencias" : "Open suggestions"}
          data-editor-guide-target="suggestions"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-violet-300/40 bg-[linear-gradient(170deg,rgba(167,139,250,0.26),rgba(129,140,248,0.08))] text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_18px_rgba(76,29,149,0.3)] transition hover:border-violet-200/70 hover:bg-violet-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200/65"
        >
          <SuggestionsMagicIcon className="h-[18px] w-[18px]" />
        </button>
      </div>
      <div className="md:hidden">
        <div className="editor-filters-mobile-panel sticky -mx-4 -mt-5 top-[4.5rem] z-30 space-y-3 rounded-t-2xl px-4 pt-5 pb-3 bg-[color:var(--color-slate-900-95)]">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onOpenGuide}
              aria-label={language === "es" ? "Abrir guía" : "Open guide"}
              title={language === "es" ? "Ver guía" : "View guide"}
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/55 bg-violet-100/95 px-2.5 py-1 text-xs font-semibold text-violet-700 shadow-[0_4px_12px_rgba(124,58,237,0.16)] transition hover:border-violet-500/60 hover:bg-violet-200/90 hover:text-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed disabled:opacity-45 dark:border-violet-300/55 dark:bg-violet-500/35 dark:text-violet-50 dark:shadow-[0_6px_18px_rgba(124,58,237,0.35)] dark:hover:border-violet-200/80 dark:hover:bg-violet-500/45 dark:hover:text-white dark:focus-visible:outline-violet-200"
            >
              <GuideCompassIcon className="h-3.5 w-3.5" />
              <span>{language === "es" ? "Ver guía" : "View guide"}</span>
            </button>
            <button
              type="button"
              onClick={onOpenSuggestions}
              aria-label={language === "es" ? "Abrir sugerencias" : "Open suggestions"}
              data-editor-guide-target="suggestions"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-violet-300/40 bg-[linear-gradient(170deg,rgba(167,139,250,0.26),rgba(129,140,248,0.08))] text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_18px_rgba(76,29,149,0.3)] transition hover:border-violet-200/70 hover:bg-violet-500/20"
            >
              <SuggestionsMagicIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
          <div
            data-editor-guide-target="search-pillar-zone"
            className="space-y-2 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.48),rgba(30,41,59,0.28))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <label className="flex flex-col gap-1">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={t("editor.filters.search.placeholder")}
                className="w-full rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-4 py-2 text-sm ios-touch-input text-[color:var(--color-slate-100)] placeholder:text-[color:var(--color-slate-400)] focus:border-[color:var(--color-border-soft)] focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
              {pillars.map((pillar) => {
                const isActive = pillar.value === selectedPillar;
                return (
                  <button
                    key={pillar.value || "all"}
                    type="button"
                    onClick={() => onPillarChange(pillar.value)}
                    className="editor-pillar-chip inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                    data-active={isActive}
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
          <p className="px-1 text-[10px] uppercase tracking-[0.28em] text-slate-500">
            {t("editor.filters.pillar.loading")}
          </p>
        )}
        {pillarsError && !isLoadingPillars && (
          <button
            type="button"
            onClick={onRetryPillars}
            className="px-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-300"
          >
            {t("editor.filters.pillar.retry")}
          </button>
        )}
      </div>
      <div
        data-editor-guide-target="search-pillar-zone"
        className="hidden flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 md:flex md:flex-row md:items-end"
      >
        <label className="flex w-full flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-slate-400)]">
            {t("editor.filters.search.label")}
          </span>
          <div className="relative flex items-center">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("editor.filters.search.placeholder")}
              className="w-full rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-4 py-2.5 text-sm ios-touch-input text-[color:var(--color-slate-100)] placeholder:text-[color:var(--color-slate-400)] focus:border-[color:var(--color-border-soft)] focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
        </label>
        <label className="flex w-full flex-col gap-2 md:max-w-xs">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-slate-400)]">
            {t("editor.filters.pillar.label")}
          </span>
          <select
            value={selectedPillar}
            onChange={(event) => onPillarChange(event.target.value)}
            className="w-full appearance-none rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-4 py-2.5 text-sm ios-touch-input text-[color:var(--color-slate-100)] focus:border-[color:var(--color-border-soft)] focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            {pillars.map((pillar) => (
              <option
                key={pillar.value || "all"}
                value={pillar.value}
                className="bg-slate-900 text-[color:var(--color-slate-100)]"
              >
                {pillar.label}
              </option>
            ))}
          </select>
          {isLoadingPillars && (
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              {t("editor.filters.pillar.loading")}
            </span>
          )}
          {pillarsError && !isLoadingPillars && (
            <button
              type="button"
              onClick={onRetryPillars}
              className="self-start text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-300"
            >
              {t("editor.filters.pillar.retry")}
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
  duplicatingTaskId?: string | null;
}) {
  if (!FEATURE_TASK_EDITOR_MOBILE_LIST_V1) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            pillarName={pillarNamesById.get(task.pillarId ?? "") ?? null}
            traitName={
              task.traitId ? (traitNamesById.get(task.traitId) ?? null) : null
            }
            statName={
              task.statId ? (statNamesById.get(task.statId) ?? null) : null
            }
            difficultyName={
              task.difficultyId
                ? (difficultyNamesById.get(task.difficultyId) ?? null)
                : null
            }
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
          duplicatingTaskId={duplicatingTaskId}
        />
      </div>
      <div className="hidden grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:grid">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            pillarName={pillarNamesById.get(task.pillarId ?? "") ?? null}
            traitName={
              task.traitId ? (traitNamesById.get(task.traitId) ?? null) : null
            }
            statName={
              task.statId ? (statNamesById.get(task.statId) ?? null) : null
            }
            difficultyName={
              task.difficultyId
                ? (difficultyNamesById.get(task.difficultyId) ?? null)
                : null
            }
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
  duplicatingTaskId,
}: {
  tasks: UserTask[];
  pillarNamesById: Map<string, string>;
  difficultyNamesById: Map<string, string>;
  onEditTask: (task: UserTask) => void;
  onDeleteTask: (task: UserTask) => void;
  onDuplicateTask?: (task: UserTask) => void;
  duplicatingTaskId: string | null;
}) {
  const { t } = usePostLoginLanguage();
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
      if (event.key === "Escape") {
        setOpenMenuTaskId(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuTaskId]);

  useEffect(() => {
    if (!openMenuTaskId) {
      menuContainerRef.current = null;
    }
  }, [openMenuTaskId]);

  const resolveDifficulty = useCallback(
    (task: UserTask) => {
      const difficultyId = task.difficultyId ?? "";
      const name = difficultyId
        ? (difficultyNamesById.get(difficultyId) ?? difficultyId)
        : t("editor.field.noDifficulty");
      const reference = (difficultyId || name).toLowerCase();
      let tone = "bg-slate-400";
      if (
        reference.includes("easy") ||
        reference.includes("baja") ||
        reference.includes("low")
      ) {
        tone = "bg-emerald-400";
      } else if (reference.includes("medium") || reference.includes("media")) {
        tone = "bg-amber-400";
      } else if (
        reference.includes("hard") ||
        reference.includes("alta") ||
        reference.includes("high")
      ) {
        tone = "bg-rose-400";
      }

      return { label: name || t("editor.field.noDifficulty"), tone };
    },
    [difficultyNamesById],
  );

  // TODO: incorporar gestos de swipe cuando exista infraestructura compartida en el proyecto.
  return (
    <ul className="divide-y divide-white/5 overflow-visible rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)]">
      {tasks.map((task) => {
        const { label: difficultyLabel, tone } = resolveDifficulty(task);
        const isMenuOpen = openMenuTaskId === task.id;
        const isDuplicating = duplicatingTaskId === task.id;

        return (
          <li key={task.id} className="relative">
            <button
              type="button"
              onClick={() => onEditTask(task)}
              className="flex w-full flex-col gap-2 px-3 py-2.5 text-left transition hover:bg-[color:var(--color-overlay-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-1 pr-8 text-sm font-semibold text-white">
                  {task.title}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--color-slate-400)]">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1.5 py-px text-[9px] font-medium uppercase tracking-[0.1em] text-[color:var(--color-slate-400)]">
                  <span
                    className={`h-1 w-1 rounded-full ${tone}`}
                    aria-hidden
                  />
                  <span>{difficultyLabel}</span>
                </span>
              </div>
            </button>
            <div
              className="pointer-events-auto absolute right-1.5 bottom-2"
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
                  setOpenMenuTaskId((current) =>
                    current === task.id ? null : task.id,
                  );
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] text-base text-[color:var(--color-slate-200)] transition hover:border-white/30 hover:bg-[color:var(--color-overlay-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
              >
                <span aria-hidden>⋯</span>
                <span className="sr-only">{t("editor.task.actions.more")}</span>
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-10 z-40 w-44 rounded-xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-slate-900-95)] p-1 shadow-[0_10px_30px_rgba(15,23,42,0.6)]">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuTaskId(null);
                      onEditTask(task);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-slate-100)] transition hover:bg-[color:var(--color-overlay-2)]"
                  >
                    {t("editor.button.edit")}
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
                        ? "cursor-not-allowed text-slate-500"
                        : "text-[color:var(--color-slate-100)] hover:bg-[color:var(--color-overlay-2)]"
                    } ${isDuplicating ? "opacity-70" : ""}`.trim()}
                  >
                    {isDuplicating
                      ? t("editor.button.duplicating")
                      : t("editor.button.duplicate")}
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
                    {t("editor.modal.delete.confirm")}
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
  const { language, t } = usePostLoginLanguage();

  return (
    <article className="group relative flex flex-col gap-3 rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.35)] transition hover:border-[color:var(--color-border-soft)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="font-semibold text-[color:var(--color-slate-100)]">
          {task.title}
        </h3>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
              task.isActive
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-slate-500/20 text-[color:var(--color-slate-300)]"
            }`}
          >
            {task.isActive
              ? t("editor.task.status.active")
              : t("editor.task.status.inactive")}
          </span>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-slate-200)] transition hover:border-white/30 hover:text-white"
          >
            {t("editor.button.edit")}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-rose-500/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-200 transition hover:border-rose-400 hover:text-rose-100"
          >
            {t("editor.modal.delete.confirm")}
          </button>
        </div>
      </div>
      <dl className="grid gap-1 text-xs text-[color:var(--color-slate-400)]">
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-[color:var(--color-slate-300)]">
            {t("editor.field.pillar")}
          </dt>
          <dd className="truncate text-right text-[color:var(--color-slate-200)]">
            {pillarName ?? task.pillarId ?? "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-[color:var(--color-slate-300)]">
            {t("editor.field.trait")}
          </dt>
          <dd className="truncate text-right">
            {traitName ?? task.traitId ?? "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-[color:var(--color-slate-300)]">
            {t("editor.field.stat")}
          </dt>
          <dd className="truncate text-right">
            {statName ?? task.statId ?? "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-[color:var(--color-slate-300)]">
            {t("editor.field.difficulty")}
          </dt>
          <dd className="truncate text-right">
            {difficultyName ?? task.difficultyId ?? "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-[color:var(--color-slate-300)]">
            {t("editor.field.baseGp")}
          </dt>
          <dd className="truncate text-right">
            {task.xp != null ? task.xp : "—"}
          </dd>
        </div>
      </dl>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {t("editor.field.updatedAt")}:{" "}
        {formatDateLabel(task.updatedAt, language)}
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

const PILLAR_STYLE_MAP: Record<
  string,
  {
    headerText: string;
    badgeBg: string;
    badgeText: string;
    bullet: string;
    ring: string;
  }
> = {
  BODY: {
    headerText: "text-emerald-300",
    badgeBg: "bg-emerald-500/15 border border-emerald-400/40",
    badgeText: "text-emerald-100",
    bullet: "text-emerald-300",
    ring: "ring-emerald-400/40",
  },
  MIND: {
    headerText: "text-sky-300",
    badgeBg: "bg-sky-500/15 border border-sky-400/40",
    badgeText: "text-sky-100",
    bullet: "text-sky-300",
    ring: "ring-sky-400/40",
  },
  SOUL: {
    headerText: "text-violet-300",
    badgeBg: "bg-violet-500/15 border border-violet-400/40",
    badgeText: "text-violet-100",
    bullet: "text-violet-300",
    ring: "ring-violet-400/40",
  },
};

const DEFAULT_PILLAR_STYLE = {
  headerText: "text-indigo-300",
  badgeBg: "bg-indigo-500/15 border border-indigo-400/40",
  badgeText: "text-indigo-100",
  bullet: "text-indigo-300",
  ring: "ring-indigo-400/40",
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
  const { t } = usePostLoginLanguage();

  if (groups.length === 0) {
    return <div className="hidden lg:block" />;
  }

  return (
    <div className="hidden gap-4 lg:grid lg:grid-cols-3">
      {groups.map((group) => {
        const style = resolvePillarStyle(group.code);
        const displayCode =
          group.code === "UNKNOWN" ? t("editor.field.noPillar") : group.code;

        return (
          <section
            key={group.key}
            className="flex min-h-[260px] flex-col rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-4"
          >
            <header className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="space-y-1">
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.24em] ${style.headerText}`}
                >
                  {group.name}
                </p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  {displayCode}
                </p>
              </div>
              <span
                className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${style.badgeBg} ${style.badgeText}`}
              >
                {group.tasks.length}
              </span>
            </header>
            <div className="mt-3 flex-1 space-y-2">
              {group.tasks.length === 0 ? (
                <p className="rounded-xl border border-white/5 bg-[color:var(--color-overlay-1)] px-3 py-6 text-center text-xs text-slate-500">
                  {t("editor.board.emptyPillar")}
                </p>
              ) : (
                group.tasks.map((task: UserTask) => (
                  <TaskBoardItem
                    key={task.id}
                    task={task}
                    groupKey={group.key}
                    pillarName={
                      group.key === "__unknown__"
                        ? (pillarNamesById.get(task.pillarId ?? "") ??
                          t("editor.field.noPillar"))
                        : group.name
                    }
                    difficultyName={
                      task.difficultyId
                        ? (difficultyNamesById.get(task.difficultyId) ?? null)
                        : null
                    }
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
  const { t } = usePostLoginLanguage();

  const handleClick = () => {
    onSelectTask(task, groupKey);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectTask(task, groupKey);
    }
  };

  const containerClasses = [
    "group relative cursor-pointer rounded-xl border border-[color:var(--color-border-subtle)] bg-slate-900/60 p-3 transition hover:border-white/25 hover:bg-slate-900/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
    isActiveTask ? `border-white/30 bg-slate-900/80 ring-2 ${ringClass}` : "",
  ]
    .filter(Boolean)
    .join(" ");

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
          <p className="text-sm font-semibold text-[color:var(--color-slate-100)]">
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-slate-400)]">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                task.isActive
                  ? "bg-emerald-500/10 text-emerald-200"
                  : "bg-slate-700/20 text-[color:var(--color-slate-300)]"
              }`}
            >
              {task.isActive
                ? t("editor.task.status.active")
                : t("editor.task.status.inactive")}
            </span>
            <span className="flex items-center gap-1 text-[color:var(--color-slate-400)]">
              <span className={`text-base leading-none ${bulletClass}`}>•</span>
              {difficultyName ?? t("editor.field.noDifficulty")}
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
          {t("editor.modal.delete.confirm")}
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

function DeleteTaskModal({
  open,
  onClose,
  task,
  isDeleting,
  errorMessage,
  onConfirm,
}: DeleteTaskModalProps) {
  const { t } = usePostLoginLanguage();
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting) {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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

  const normalizedTitle = task?.title?.trim() ?? "";
  const displayTitle =
    normalizedTitle.length > 0
      ? `“${normalizedTitle}”`
      : t("editor.modal.delete.thisTask");

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm md:items-center">
      <button
        type="button"
        aria-label={t("editor.button.close")}
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
          className="space-y-5 rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-slate-900-95)] p-6 text-[color:var(--color-slate-100)] shadow-[0_18px_40px_rgba(15,23,42,0.65)]"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-slate-400)]">
              {t("editor.modal.delete.heading")}
            </p>
            <h2 className="text-xl font-semibold text-white">
              {t("editor.modal.delete.title")}
            </h2>
          </header>
          <p className="text-sm text-[color:var(--color-slate-300)]">
            {t("editor.modal.delete.message", { title: displayTitle })}
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
              className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-slate-200)] transition hover:border-[color:var(--color-border-soft)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("editor.button.cancel")}
            </button>
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-full bg-rose-600/90 px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_30px_rgba(225,29,72,0.3)] transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting
                ? t("editor.modal.delete.loading")
                : t("editor.modal.delete.confirm")}
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
        <div
          key={index}
          className="h-40 animate-pulse rounded-2xl border border-white/5 bg-[color:var(--color-overlay-1)]"
        />
      ))}
    </div>
  );
}

function TaskListEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)]/40 px-6 py-12 text-center text-sm text-[color:var(--color-slate-300)]">
      <span className="text-2xl" aria-hidden>
        🌱
      </span>
      <p className="max-w-xs leading-relaxed">{message}</p>
    </div>
  );
}

function TaskListError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = usePostLoginLanguage();

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-8 text-center text-sm text-rose-100">
      <p className="font-semibold">{t("editor.error.loadTasks.title")}</p>
      <p className="max-w-sm text-rose-200/80">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-2)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-[color:var(--color-border-strong)]"
      >
        {t("editor.button.retry")}
      </button>
    </div>
  );
}

function formatDateLabel(
  value: string | null,
  locale: "es" | "en" = "es",
): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString(locale);
}

type ToastMessage = { type: "success" | "error" | "info"; text: string };

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  pillars: Pillar[];
  isLoadingPillars: boolean;
  pillarsError: Error | null;
  onRetryPillars: () => void;
  guideStepId: EditorGuideStepId | null;
}

type SuggestedPillarGroup = "body" | "mind" | "soul";

type TaskCategorySuggestion = {
  pillarId: string;
  pillarLabel: string;
  traitId: string;
  traitLabel: string;
  rationale: string;
};

const CATEGORY_KEYWORDS: Record<SuggestedPillarGroup, string[]> = {
  body: [
    "caminar",
    "walk",
    "run",
    "correr",
    "train",
    "entren",
    "gym",
    "agua",
    "water",
    "hidr",
    "sleep",
    "dorm",
    "stretch",
    "mov",
    "exercise",
    "comer",
    "eat",
  ],
  mind: [
    "leer",
    "read",
    "study",
    "estudi",
    "focus",
    "foco",
    "trabajo",
    "work",
    "plan",
    "organ",
    "deep work",
    "learn",
    "aprender",
  ],
  soul: [
    "hablar",
    "talk",
    "call",
    "llamar",
    "agradec",
    "gratitude",
    "medit",
    "rez",
    "pray",
    "connect",
    "conectar",
    "friend",
    "famil",
    "journal",
    "respirar",
    "breathe",
  ],
};

function normalizeForMatching(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function detectSuggestedPillarGroup(taskTitle: string): SuggestedPillarGroup {
  const normalizedTitle = normalizeForMatching(taskTitle);
  const scores = (Object.keys(CATEGORY_KEYWORDS) as SuggestedPillarGroup[]).map(
    (group) => ({
      group,
      score: CATEGORY_KEYWORDS[group].reduce(
        (total, keyword) =>
          normalizedTitle.includes(normalizeForMatching(keyword))
            ? total + 1
            : total,
        0,
      ),
    }),
  );

  const topScore = scores.reduce(
    (best, current) => (current.score > best.score ? current : best),
    { group: "mind" as SuggestedPillarGroup, score: 0 },
  );

  if (topScore.score === 0) {
    return "mind";
  }

  return topScore.group;
}

function resolvePillarFromCatalog(
  pillars: Pillar[],
  group: SuggestedPillarGroup,
): Pillar | null {
  const byCode = pillars.find((pillar) =>
    normalizeForMatching(pillar.code).includes(group),
  );
  if (byCode) {
    return byCode;
  }

  const labelHints: Record<SuggestedPillarGroup, string[]> = {
    body: ["body", "cuerpo", "salud", "fisico", "physical"],
    mind: ["mind", "mente", "focus", "foco", "mental"],
    soul: ["soul", "alma", "conexion", "connection", "spirit"],
  };

  const byName = pillars.find((pillar) =>
    labelHints[group].some((hint) =>
      normalizeForMatching(pillar.name).includes(hint),
    ),
  );

  return byName ?? pillars[0] ?? null;
}

function resolveSuggestedTrait(traits: Trait[], group: SuggestedPillarGroup): Trait | null {
  const traitHints: Record<SuggestedPillarGroup, string[]> = {
    body: ["hydr", "sleep", "movement", "fitness", "energia", "energy", "health"],
    mind: ["focus", "clarity", "learn", "discipline", "product", "study"],
    soul: ["connection", "gratitude", "mindful", "calm", "compassion", "bond"],
  };

  const hinted = traits.find((trait) => {
    const searchable = `${trait.name} ${trait.code}`;
    return traitHints[group].some((hint) =>
      normalizeForMatching(searchable).includes(hint),
    );
  });

  return hinted ?? traits[0] ?? null;
}

function buildSuggestionRationale(
  language: "es" | "en",
  taskTitle: string,
  pillarLabel: string,
  traitLabel: string,
): string {
  if (language === "es") {
    return `“${taskTitle}” se alinea con ${pillarLabel} > ${traitLabel}.`;
  }
  return `“${taskTitle}” aligns with ${pillarLabel} > ${traitLabel}.`;
}

function CreateTaskModal({
  open,
  onClose,
  userId,
  pillars,
  isLoadingPillars,
  pillarsError,
  onRetryPillars,
  guideStepId,
}: CreateTaskModalProps) {
  const { language, t } = usePostLoginLanguage();
  const activeLocale = language === "es" ? "es" : "en";
  const [title, setTitle] = useState("");
  const [difficultyId, setDifficultyId] = useState("");
  const [suggestionStatus, setSuggestionStatus] = useState<
    "idle" | "analyzing" | "ready"
  >("idle");
  const [suggestion, setSuggestion] = useState<TaskCategorySuggestion | null>(
    null,
  );
  const [manualCategoryEnabled, setManualCategoryEnabled] = useState(false);
  const [manualPillarId, setManualPillarId] = useState("");
  const [manualTraitId, setManualTraitId] = useState("");
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
      setTitle("");
      setDifficultyId("");
      setSuggestionStatus("idle");
      setSuggestion(null);
      setManualCategoryEnabled(false);
      setManualPillarId("");
      setManualTraitId("");
      setErrors({});
      setToast(null);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
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

  const sortedPillars = useMemo(() => {
    return [...pillars].sort((a, b) =>
      a.name.localeCompare(b.name, activeLocale, { sensitivity: "base" }),
    );
  }, [activeLocale, pillars]);

  const sortedDifficulties = useMemo(() => {
    return [...difficulties].sort((a, b) =>
      a.name.localeCompare(b.name, activeLocale, { sensitivity: "base" }),
    );
  }, [activeLocale, difficulties]);

  const selectedManualPillar = useMemo(
    () => sortedPillars.find((pillar) => pillar.id === manualPillarId) ?? null,
    [manualPillarId, sortedPillars],
  );

  const [manualTraits, setManualTraits] = useState<Trait[]>([]);
  const [isLoadingManualTraits, setIsLoadingManualTraits] = useState(false);
  const [manualTraitsError, setManualTraitsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!manualCategoryEnabled || !manualPillarId) {
      setManualTraits([]);
      setManualTraitsError(null);
      setManualTraitId("");
      return;
    }

    let cancelled = false;
    setIsLoadingManualTraits(true);
    setManualTraitsError(null);
    void fetchCatalogTraits(manualPillarId)
      .then((traits) => {
        if (cancelled) {
          return;
        }
        setManualTraits(traits);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        console.error("Failed to load traits for manual selection", error);
        setManualTraitsError(t("editor.error.traits.load"));
        setManualTraits([]);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingManualTraits(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [manualCategoryEnabled, manualPillarId, t]);

  const isSubmitting = createStatus === "loading";
  const isAnalyzing = suggestionStatus === "analyzing";
  const isGuideAIThinkingStep = guideStepId === "modal-ai-thinking";
  const [guideSimulationPhase, setGuideSimulationPhase] = useState<
    "idle" | "analyzing" | "pillar" | "trait"
  >("idle");

  useEffect(() => {
    if (!isGuideAIThinkingStep) {
      setGuideSimulationPhase("idle");
      return;
    }

    setGuideSimulationPhase("analyzing");
    const toPillar = window.setTimeout(
      () => setGuideSimulationPhase("pillar"),
      720,
    );
    const toTrait = window.setTimeout(
      () => setGuideSimulationPhase("trait"),
      1320,
    );

    return () => {
      window.clearTimeout(toPillar);
      window.clearTimeout(toTrait);
    };
  }, [isGuideAIThinkingStep]);

  const guideSuggestion = isGuideAIThinkingStep
    ? {
        pillarId: "guide-soul",
        pillarLabel: language === "es" ? "Alma" : "Soul",
        traitId: "guide-trait-gratitude",
        traitLabel: language === "es" ? "Gratitud" : "Gratitude",
        rationale:
          language === "es"
            ? "La simulación muestra una clasificación coherente: Alma + Gratitud."
            : "The simulation shows a coherent classification: Soul + Gratitude.",
      }
    : null;
  const visibleSuggestion = suggestion ?? guideSuggestion;
  const shouldShowGuidePillar =
    isGuideAIThinkingStep && guideSimulationPhase !== "analyzing";
  const shouldShowGuideTrait =
    isGuideAIThinkingStep && guideSimulationPhase === "trait";
  const showAnalyzingCard = isAnalyzing || isGuideAIThinkingStep;
  const hasManualCategorySelection = Boolean(manualPillarId && manualTraitId);
  const shouldUseManualCategory =
    manualCategoryEnabled && hasManualCategorySelection;
  const isSubmitDisabled =
    isSubmitting ||
    (!suggestion && !hasManualCategorySelection) ||
    title.trim().length === 0 ||
    !userId;
  const isSuggestDisabled =
    (isAnalyzing && !isGuideAIThinkingStep) ||
    title.trim().length === 0 ||
    isLoadingPillars ||
    Boolean(pillarsError);

  const handleSuggestCategory = useCallback(async () => {
    const validationErrors: Record<string, string> = {};
    if (title.trim().length === 0) {
      validationErrors.title = t("editor.validation.titleRequired");
    }
    if (sortedPillars.length === 0) {
      validationErrors.suggestion = t("editor.modal.aiCreate.catalogFallback");
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const pillarGroup = detectSuggestedPillarGroup(title);
    const selectedPillar = resolvePillarFromCatalog(sortedPillars, pillarGroup);
    if (!selectedPillar) {
      setErrors((previous) => ({
        ...previous,
        suggestion: t("editor.modal.aiCreate.catalogFallback"),
      }));
      return;
    }

    setSuggestionStatus("analyzing");
    setSuggestion(null);
    clearError("suggestion");
    await new Promise((resolve) => window.setTimeout(resolve, 1200));

    try {
      const pillarTraits = await fetchCatalogTraits(selectedPillar.id);
      const selectedTrait = resolveSuggestedTrait(pillarTraits, pillarGroup);
      if (!selectedTrait) {
        setSuggestionStatus("idle");
        setErrors((previous) => ({
          ...previous,
          suggestion: t("editor.modal.aiCreate.noTraits"),
        }));
        return;
      }

      const localizedPillar = localizePillarLabel(selectedPillar.name, language);
      const localizedTrait = localizeTraitLabel(
        {
          name: selectedTrait.name,
          code: selectedTrait.code,
          fallback: selectedTrait.id,
        },
        language,
      );

      setSuggestion({
        pillarId: selectedPillar.id,
        pillarLabel: localizedPillar,
        traitId: selectedTrait.id,
        traitLabel: localizedTrait,
        rationale: buildSuggestionRationale(
          activeLocale,
          title.trim(),
          localizedPillar,
          localizedTrait,
        ),
      });
      setSuggestionStatus("ready");
    } catch (error) {
      console.error("Failed to resolve AI suggestion for lab editor", error);
      setSuggestionStatus("idle");
      setErrors((previous) => ({
        ...previous,
        suggestion: t("editor.modal.aiCreate.suggestionError"),
      }));
    }
  }, [
    activeLocale,
    clearError,
    language,
    sortedPillars,
    t,
    title,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors: Record<string, string> = {};
    if (title.trim().length === 0) {
      validationErrors.title = t("editor.validation.titleRequired");
    }
    if (!suggestion) {
      if (!hasManualCategorySelection) {
        validationErrors.suggestion = t(
          "editor.modal.aiCreate.confirmationRequired",
        );
      }
    }
    if (!userId) {
      validationErrors.user = t("editor.validation.userNotFound");
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      const resolvedPillarId = shouldUseManualCategory
        ? manualPillarId
        : suggestion?.pillarId ?? manualPillarId;
      const resolvedTraitId = shouldUseManualCategory
        ? manualTraitId
        : suggestion?.traitId ?? manualTraitId;
      await createTask(userId!, {
        title: title.trim(),
        pillarId: resolvedPillarId,
        traitId: resolvedTraitId,
        statId: null,
        difficultyId: difficultyId || null,
      });
      setToast({ type: "success", text: t("editor.toast.create.success") });
      setTitle("");
      setDifficultyId("");
      setSuggestionStatus("idle");
      setSuggestion(null);
      setManualCategoryEnabled(false);
      setManualPillarId("");
      setManualTraitId("");
      setErrors({});
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("editor.toast.create.error");
      setToast({ type: "error", text: message });
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="create-task-modal__overlay fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm md:items-center"
      data-light-scope="editor"
    >
      <button
        type="button"
        aria-label={t("editor.button.close")}
        onClick={handleClose}
        className="absolute inset-0 h-full w-full"
      />
      <div className="relative z-10 w-full max-w-2xl p-4">
        <form
          onSubmit={handleSubmit}
          data-editor-guide-target="new-task-modal-dialog"
          className="create-task-modal__dialog max-h-[90vh] overflow-y-auto rounded-2xl border p-6"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="create-task-modal space-y-6">
            <header className="space-y-1">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="create-task-ai-modal__badge text-[11px] font-semibold uppercase tracking-[0.24em]">
                    {t("editor.modal.aiCreate.badge")}
                  </p>
                  <h2 className="create-task-ai-modal__title text-xl font-semibold">
                    {t("editor.modal.aiCreate.title")}
                  </h2>
                  <p className="create-task-ai-modal__description text-sm">
                    {t("editor.modal.aiCreate.description")}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t("editor.button.close")}
                  className="create-task-ai-modal__close inline-flex h-9 w-9 items-center justify-center rounded-full border text-lg transition"
                  onClick={handleClose}
                >
                  ×
                </button>
              </div>
            </header>

            <section
              className="space-y-4"
              data-editor-guide-target="new-task-modal-core"
            >
              <div className="space-y-2">
                <label className="flex flex-col gap-2">
                  <span className="create-task-ai-modal__field-label text-xs font-semibold uppercase tracking-[0.18em]">
                    {t("editor.modal.aiCreate.taskTitleLabel")}
                  </span>
                  <textarea
                    data-editor-guide-target="new-task-modal-input"
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      clearError("title");
                      clearError("suggestion");
                      setSuggestionStatus("idle");
                      setSuggestion(null);
                    }}
                    placeholder={t("editor.modal.aiCreate.taskTitlePlaceholder")}
                    className="create-task-ai-modal__control w-full rounded-2xl border px-4 py-3 text-sm ios-touch-input focus:outline-none"
                    rows={3}
                  />
                </label>
                {errors.title && (
                  <p className="text-xs text-rose-300">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex flex-col gap-2">
                  <span className="create-task-ai-modal__field-label text-xs font-semibold uppercase tracking-[0.18em]">
                    {t("editor.field.difficulty")}
                  </span>
                  <select
                    data-editor-guide-target="new-task-modal-difficulty"
                    value={difficultyId}
                    onChange={(event) => setDifficultyId(event.target.value)}
                    className="create-task-ai-modal__control w-full appearance-none rounded-2xl border px-4 py-3 text-sm ios-touch-input focus:outline-none disabled:cursor-not-allowed"
                    disabled={isLoadingDifficulties}
                  >
                    <option value="" className="create-task-ai-modal__option">
                      {t("editor.modal.create.selectDifficultyPlaceholder")}
                    </option>
                    {sortedDifficulties.map((difficulty) => (
                      <option
                        key={difficulty.id}
                        value={difficulty.id}
                        className="create-task-ai-modal__option"
                      >
                        {localizeDifficultyLabel(difficulty.name, language)}
                      </option>
                    ))}
                  </select>
                </label>
                {isLoadingDifficulties && (
                  <p className="create-task-modal__hint text-[11px] uppercase tracking-[0.2em]">
                    {t("editor.loading.difficulties")}
                  </p>
                )}
                {difficultiesError && (
                  <div className="space-y-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                    <p>{t("editor.error.difficulties.load")}</p>
                    <button
                      type="button"
                      onClick={reloadDifficulties}
                      className="font-semibold text-rose-200 underline decoration-dotted"
                    >
                      {t("editor.button.retry")}
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section
              className="space-y-3"
              data-editor-guide-target="new-task-modal-ai-zone"
            >
              <button
                type="button"
                data-editor-guide-target="new-task-modal-ai-action"
                className="create-task-ai-modal__suggest-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                onClick={() => void handleSuggestCategory()}
                disabled={isSuggestDisabled}
              >
                <span aria-hidden>✨</span>
                {isAnalyzing
                  ? t("editor.modal.aiCreate.analyzing")
                  : t("editor.modal.aiCreate.suggestButton")}
              </button>
              {isLoadingPillars && (
                <p className="create-task-ai-modal__hint text-[11px] uppercase tracking-[0.2em]">
                  {t("editor.loading.pillars")}
                </p>
              )}
              {pillarsError && (
                <div className="space-y-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                  <p>{t("editor.error.pillars.load")}</p>
                  <button
                    type="button"
                    onClick={onRetryPillars}
                    className="font-semibold text-rose-200 underline decoration-dotted"
                  >
                    {t("editor.button.retry")}
                  </button>
                </div>
              )}
              {showAnalyzingCard && (
                <section className="create-task-ai-modal__analysis-card space-y-2 rounded-xl border p-3">
                  <div className="create-task-ai-modal__pulse h-2 w-24 rounded-full" />
                  <p className="text-sm font-semibold">
                    {t("editor.modal.aiCreate.analyzing")}
                  </p>
                  <p className="create-task-ai-modal__hint text-xs">
                    {t("editor.modal.aiCreate.analyzingHint")}
                  </p>
                </section>
              )}

              {visibleSuggestion &&
                (suggestionStatus === "ready" || isGuideAIThinkingStep) && (
                  <section
                    className="create-task-ai-modal__suggestion-strip space-y-3.5 py-2"
                    data-editor-guide-target="new-task-modal-ai-result"
                  >
                    <p className="create-task-ai-modal__field-label text-center text-[11px] font-semibold uppercase tracking-[0.24em]">
                      {t("editor.modal.aiCreate.suggestedCategory")}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-base">
                      {shouldShowGuidePillar ? (
                        <span className="create-task-ai-modal__result-pill rounded-full border px-4 py-1.5 font-semibold">
                          {visibleSuggestion.pillarLabel}
                        </span>
                      ) : (
                        <span className="create-task-ai-modal__hint text-xs">
                          {language === "es"
                            ? "Detectando pilar…"
                            : "Detecting pillar…"}
                        </span>
                      )}
                      <span className="create-task-ai-modal__hint">/</span>
                      {shouldShowGuideTrait ? (
                        <span className="create-task-ai-modal__result-pill rounded-full border px-4 py-1.5 font-semibold">
                          {visibleSuggestion.traitLabel}
                        </span>
                      ) : (
                        <span className="create-task-ai-modal__hint text-xs">
                          {language === "es"
                            ? "Detectando rasgo…"
                            : "Detecting trait…"}
                        </span>
                      )}
                    </div>
                    <p className="create-task-ai-modal__hint text-center text-sm">
                      {visibleSuggestion.rationale}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
                      <button
                        type="button"
                        className="create-task-ai-modal__retry text-xs font-semibold underline decoration-dotted underline-offset-4"
                        onClick={() => void handleSuggestCategory()}
                      >
                        {t("editor.modal.aiCreate.retrySuggestion")}
                      </button>
                      <button
                        type="button"
                        className="create-task-ai-modal__retry text-xs font-semibold underline decoration-dotted underline-offset-4"
                        onClick={() => {
                          setManualCategoryEnabled((previous) => {
                            if (previous) {
                              setManualPillarId("");
                              setManualTraitId("");
                            }
                            return !previous;
                          });
                          clearError("suggestion");
                        }}
                      >
                        {manualCategoryEnabled
                          ? t("editor.modal.aiCreate.useAiSuggestion")
                          : t("editor.modal.aiCreate.manualCategory")}
                      </button>
                    </div>
                  </section>
                )}

              {manualCategoryEnabled && (
                <section
                  className="create-task-ai-modal__manual-grid grid gap-3 rounded-xl border p-3"
                  data-editor-guide-target="new-task-modal-ai-result"
                >
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="create-task-ai-modal__retry text-xs font-semibold underline decoration-dotted underline-offset-4"
                      onClick={() => {
                        setManualCategoryEnabled(false);
                        setManualPillarId("");
                        setManualTraitId("");
                        clearError("suggestion");
                      }}
                    >
                      {t("editor.modal.aiCreate.useAiSuggestion")}
                    </button>
                  </div>
                  <label className="flex flex-col gap-2">
                    <span className="create-task-ai-modal__field-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                      {t("editor.field.pillar")}
                    </span>
                    <select
                      value={manualPillarId}
                      onChange={(event) => {
                        setManualPillarId(event.target.value);
                        setManualTraitId("");
                        clearError("suggestion");
                      }}
                      className="create-task-ai-modal__control w-full appearance-none rounded-xl border px-3 py-2 text-sm ios-touch-input focus:outline-none"
                    >
                      <option value="">
                        {t("editor.modal.create.selectPillarPlaceholder")}
                      </option>
                      {sortedPillars.map((pillar) => (
                        <option key={pillar.id} value={pillar.id}>
                          {localizePillarLabel(pillar.name, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="create-task-ai-modal__field-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                      {t("editor.field.trait")}
                    </span>
                    <select
                      value={manualTraitId}
                      onChange={(event) => {
                        setManualTraitId(event.target.value);
                        clearError("suggestion");
                      }}
                      className="create-task-ai-modal__control w-full appearance-none rounded-xl border px-3 py-2 text-sm ios-touch-input focus:outline-none"
                      disabled={!selectedManualPillar || isLoadingManualTraits}
                    >
                      <option value="">
                        {selectedManualPillar
                          ? t("editor.modal.create.selectTraitPlaceholder")
                          : t("editor.modal.create.selectPillarFirst")}
                      </option>
                      {manualTraits.map((trait) => (
                        <option key={trait.id} value={trait.id}>
                          {localizeTraitLabel(
                            { name: trait.name, code: trait.code, fallback: trait.id },
                            language,
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                  {manualTraitsError && (
                    <p className="text-xs text-rose-300">{manualTraitsError}</p>
                  )}
                </section>
              )}
            </section>

            {errors.suggestion && (
              <p className="text-xs text-rose-300">{errors.suggestion}</p>
            )}
            {errors.user && (
              <p className="text-xs text-rose-300">{errors.user}</p>
            )}

            {toast && (
              <ToastBanner
                tone={toast.type}
                message={toast.text}
                className="px-3"
              />
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="create-task-modal__button-secondary inline-flex items-center justify-center rounded-full border px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] transition"
              >
                {t("editor.button.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#121212] transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: "var(--gradient-innerbloom)",
                  boxShadow: "var(--shadow-innerbloom-cta)",
                }}
              >
                {isSubmitting
                  ? t("editor.button.creating")
                  : t("editor.modal.aiCreate.confirmButton")}
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
  onTaskUpdated?: () => void;
  userId: string | null;
  task: UserTask | null;
  pillars: Pillar[];
  variant?: "modal" | "panel";
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
  variant = "modal",
  navigationTasks = [],
  onNavigateTask,
}: EditTaskModalProps) {
  const { language, t } = usePostLoginLanguage();
  const activeLocale = language === "es" ? "es" : "en";
  const [title, setTitle] = useState("");
  const [difficultyId, setDifficultyId] = useState("");
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
  const {
    data: difficulties,
    isLoading: isLoadingDifficulties,
    error: difficultiesError,
    reload: reloadDifficulties,
  } = useDifficulties();

  const currentPillarId = open && task?.pillarId ? task.pillarId : null;
  const { data: traits } = useTraits(currentPillarId);

  const sortedDifficulties = useMemo(() => {
    return [...difficulties].sort((a, b) =>
      a.name.localeCompare(b.name, activeLocale, { sensitivity: "base" }),
    );
  }, [activeLocale, difficulties]);

  const pillarName = useMemo(() => {
    if (!task?.pillarId) {
      return t("editor.symbol.empty");
    }
    const sourceLabel =
      pillars.find((pillar) => pillar.id === task.pillarId)?.name ??
      task.pillarId;
    return localizePillarLabel(sourceLabel, language);
  }, [language, pillars, task?.pillarId, t]);

  const traitName = useMemo(() => {
    if (!task?.traitId) {
      return t("editor.symbol.empty");
    }
    const trait = traits.find((entry) => entry.id === task.traitId);
    return localizeTraitLabel(
      { name: trait?.name, code: trait?.code, fallback: task.traitId },
      language,
    );
  }, [language, t, task?.traitId, traits]);

  const isSubmitting = updateStatus === "loading";

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDifficultyId("");
      setIsActive(true);
      setErrors({});
      setToast(null);
      return;
    }

    if (task) {
      setTitle(task.title ?? "");
      setDifficultyId(task.difficultyId ?? "");
      setIsActive(Boolean(task.isActive));
      setErrors({});
      setToast(null);
    }
  }, [open, task]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
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
      validationErrors.title = t("editor.validation.titleRequired");
    }

    if (!userId) {
      validationErrors.user = t("editor.validation.userNotFound");
    }

    if (!task) {
      validationErrors.task = t("editor.validation.taskNotFoundEdit");
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
        onTaskUpdated();
        return;
      }

      setToast({ type: "success", text: t("editor.toast.update.success") });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("editor.toast.update.error");
      setToast({ type: "error", text: message });
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

  const showNavigation =
    variant === "panel" && navigationTasks.length > 0 && task != null;
  const activeIndex = showNavigation
    ? navigationTasks.findIndex((entry) => entry.id === task.id)
    : -1;
  const previousTask =
    showNavigation && activeIndex > 0 ? navigationTasks[activeIndex - 1] : null;
  const nextTask =
    showNavigation &&
    activeIndex >= 0 &&
    activeIndex < navigationTasks.length - 1
      ? navigationTasks[activeIndex + 1]
      : null;
  const navigationLabel = showNavigation
    ? `${activeIndex + 1}/${navigationTasks.length}`
    : navigationTasks.length > 0
      ? `—/${navigationTasks.length}`
      : "—";

  const formBody = (
    <div className="edit-task-modal space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-slate-400)]">
          {t("editor.modal.edit.badge")}
        </p>
        <h2 className="edit-task-modal__title text-xl font-semibold">
          {t("editor.modal.edit.title")}
        </h2>
        <p className="edit-task-modal__description text-sm">
          {t("editor.modal.edit.description")}
        </p>
      </header>

      <section className="space-y-4">
        <div className="space-y-2">
          <span className="edit-task-modal__locked-section-label text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            {t("editor.modal.edit.context")}
          </span>
          <div className="grid gap-3 md:grid-cols-2">
            <ReadOnlyField
              label={t("editor.field.pillar")}
              value={pillarName}
            />
            <ReadOnlyField label={t("editor.field.trait")} value={traitName} />
          </div>
          <p className="edit-task-modal__locked-section-label text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {t("editor.modal.edit.lockedHint")}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <p className="edit-task-modal__editable-section-label text-[11px] font-semibold uppercase tracking-[0.2em]">
          {t("editor.modal.edit.editableFields")}
        </p>
        <div className="space-y-2">
          <label className="flex flex-col gap-2">
            <span className="edit-task-modal__editable-field-label text-xs font-semibold uppercase tracking-[0.18em]">
              {t("editor.modal.create.taskTitleLabel")}
            </span>
            <input
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                clearError("title");
              }}
              placeholder={t("editor.modal.taskTitle.placeholder")}
              className="edit-task-modal__editable-control w-full rounded-2xl border px-4 py-3 text-sm ios-touch-input transition focus:outline-none"
            />
          </label>
          {errors.title && (
            <p className="text-xs text-rose-300">{errors.title}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex flex-col gap-2">
            <span className="edit-task-modal__editable-field-label text-xs font-semibold uppercase tracking-[0.18em]">
              {t("editor.field.difficulty")}
            </span>
            <select
              value={difficultyId}
              onChange={(event) => setDifficultyId(event.target.value)}
              className="edit-task-modal__editable-control w-full appearance-none rounded-2xl border px-4 py-3 text-sm ios-touch-input transition focus:outline-none disabled:cursor-not-allowed"
              disabled={isLoadingDifficulties}
            >
              <option
                value=""
                className="bg-slate-900 text-[color:var(--color-slate-100)]"
              >
                {t("editor.modal.edit.noDifficultyAssigned")}
              </option>
              {sortedDifficulties.map((difficulty) => (
                <option
                  key={difficulty.id}
                  value={difficulty.id}
                  className="bg-slate-900 text-[color:var(--color-slate-100)]"
                >
                  {localizeDifficultyLabel(difficulty.name, language)}
                </option>
              ))}
            </select>
          </label>
          {isLoadingDifficulties && (
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              {t("editor.loading.difficulties")}
            </p>
          )}
          {difficultiesError && (
            <div className="space-y-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              <p>{t("editor.error.difficulties.load")}</p>
              <button
                type="button"
                onClick={reloadDifficulties}
                className="font-semibold text-rose-200 underline decoration-dotted"
              >
                {t("editor.button.retry")}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <span className="edit-task-modal__editable-field-label text-xs font-semibold uppercase tracking-[0.18em]">
            {t("editor.field.status")}
          </span>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="edit-task-modal__status-checkbox h-4 w-4 rounded"
            />
            <span className="edit-task-modal__status-label text-sm">
              {isActive
                ? t("editor.task.status.active")
                : t("editor.task.status.inactive")}
            </span>
          </label>
        </div>
      </section>

      {errors.user && <p className="text-xs text-rose-300">{errors.user}</p>}
      {errors.task && <p className="text-xs text-rose-300">{errors.task}</p>}

      {toast && (
        <ToastBanner tone={toast.type} message={toast.text} className="px-3" />
      )}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleClose}
          className="edit-task-modal__button-secondary inline-flex items-center justify-center rounded-full border px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] transition"
        >
          {t("editor.button.cancel")}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="edit-task-modal__button-primary inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? t("editor.button.saving")
            : t("editor.button.saveChanges")}
        </button>
      </div>
    </div>
  );

  if (variant === "panel") {
    return (
      <div className="fixed inset-0 z-[60] flex">
        <button
          type="button"
          aria-label={t("editor.button.close")}
          onClick={handleClose}
          className="flex-1 bg-slate-950/60 backdrop-blur-sm"
        />
        <aside className="flex h-full w-full max-w-xl flex-col border-l border-[color:var(--color-border-subtle)] bg-slate-950/95 text-[color:var(--color-slate-100)] shadow-[0_18px_40px_rgba(15,23,42,0.65)]">
          <form
            onSubmit={handleSubmit}
            className="flex h-full flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border-subtle)] px-6 py-4">
              {showNavigation ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleNavigate(previousTask)}
                    disabled={!previousTask}
                    className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-slate-200)] transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("editor.button.previous")}
                  </button>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-slate-400)]">
                    {navigationLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNavigate(nextTask)}
                    disabled={!nextTask}
                    className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-slate-200)] transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("editor.button.next")}
                  </button>
                </div>
              ) : (
                <p className="text-sm font-semibold text-[color:var(--color-slate-200)]">
                  {t("editor.modal.edit.panelTitle")}
                </p>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-slate-200)] transition hover:border-white/30 hover:text-white"
              >
                {t("editor.button.close")}
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
        aria-label={t("editor.button.close")}
        onClick={handleClose}
        className="absolute inset-0 h-full w-full"
      />
      <div className="relative z-10 w-full max-w-2xl p-4">
        <form
          onSubmit={handleSubmit}
          className="edit-task-modal__dialog max-h-[90vh] overflow-y-auto rounded-2xl border p-6"
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
    <div className="edit-task-modal__locked-field space-y-1">
      <span className="edit-task-modal__locked-field-label text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-slate-400)]">
        {label}
        <LockBadgeIcon className="edit-task-modal__lock-icon h-3.5 w-3.5 shrink-0" />
      </span>
      <div className="edit-task-modal__locked-field-value rounded-2xl px-4 py-3 text-sm">
        {value}
      </div>
    </div>
  );
}

function SuggestionsLabModal({
  isOpen,
  isApplying,
  onClose,
  onApply,
}: {
  isOpen: boolean;
  isApplying: boolean;
  onClose: () => void;
  onApply: (taskIds: string[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const grouped = useMemo(() => {
    return {
      Body: EDITOR_LAB_QUICK_START_SEED.filter(
        (task) => task.pillar === "Body",
      ),
      Mind: EDITOR_LAB_QUICK_START_SEED.filter(
        (task) => task.pillar === "Mind",
      ),
      Soul: EDITOR_LAB_QUICK_START_SEED.filter(
        (task) => task.pillar === "Soul",
      ),
    };
  }, []);
  const totalAvailableSuggestions = EDITOR_LAB_QUICK_START_SEED.length;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;
  const hasSelectedSuggestions = selectedCount > 0;
  const isEverythingSelected = selectedCount === totalAvailableSuggestions;

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds([]);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="editor-suggestions-overlay fixed inset-0 z-[75] flex items-end justify-center bg-slate-950/80 backdrop-blur-md md:items-center">
      <button
        type="button"
        aria-label="Cerrar sugerencias"
        onClick={onClose}
        className="absolute inset-0 h-full w-full"
      />
      <section className="editor-suggestions-modal relative z-10 w-full max-w-3xl rounded-t-3xl border border-[color:var(--color-border-subtle)] bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(15,23,42,0.92))] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.5)] md:rounded-3xl md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-200/85">
              Sugerencias
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white md:text-xl">
              Activá tareas recomendadas
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[color:var(--color-slate-300)]">
              Seleccioná varias sugerencias por pilar y agregalas en lote a tu sistema.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar sugerencias"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[color:var(--color-slate-200)] transition hover:border-white/35 hover:text-white"
          >
            <CloseTinyIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <p className="text-xs text-[color:var(--color-slate-300)]">
            {selectedCount} de {totalAvailableSuggestions} seleccionadas
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setSelectedIds(
                  isEverythingSelected
                    ? []
                    : EDITOR_LAB_QUICK_START_SEED.map((task) => task.id),
                )
              }
              className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-slate-200)] transition hover:border-white/30 hover:text-white"
            >
              {isEverythingSelected ? "Limpiar" : "Seleccionar todo"}
            </button>
          </div>
        </div>
        <div className="mt-4 max-h-[58vh] space-y-5 overflow-y-auto pr-1 pb-24 md:pb-20">
          {(
            Object.entries(grouped) as Array<
              [keyof typeof grouped, typeof EDITOR_LAB_QUICK_START_SEED]
            >
          ).map(([pillar, tasks]) => (
            <div key={pillar} className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-slate-400)]">
                  {pillar}
                </h3>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-slate-500)]">
                  {
                    tasks.filter((task) => selectedSet.has(task.id)).length
                  }{" "}
                  / {tasks.length}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {tasks.map((task) => {
                  const checked = selectedSet.has(task.id);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() =>
                        setSelectedIds((current) =>
                          current.includes(task.id)
                            ? current.filter((id) => id !== task.id)
                            : [...current, task.id],
                        )
                      }
                      aria-pressed={checked}
                      className={`group flex items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${checked ? "border-violet-300/60 bg-[linear-gradient(155deg,rgba(167,139,250,0.25),rgba(129,140,248,0.12))] shadow-[0_10px_24px_rgba(139,92,246,0.24)]" : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] hover:border-white/25"}`}
                    >
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] transition ${checked ? "border-violet-100 bg-violet-200/90 text-violet-700" : "border-white/25 text-transparent group-hover:border-white/40"}`}
                      >
                        ✓
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-[color:var(--color-slate-100)]">
                          {task.title}
                        </span>
                        <span className="mt-1 inline-flex rounded-full border border-violet-200/20 bg-violet-400/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-violet-100/85">
                          {task.trait}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.05),rgba(15,23,42,0.96)_24%)] px-4 py-4 backdrop-blur-md md:px-6">
          <p className="text-xs text-[color:var(--color-slate-400)]">
            {hasSelectedSuggestions
              ? `Listo para sumar ${selectedCount} tarea(s) a tu sistema.`
              : "Seleccioná tareas para empezar a construir tu sistema."}
          </p>
          <button
            type="button"
            disabled={!hasSelectedSuggestions || isApplying}
            onClick={() => onApply(selectedIds)}
            className="inline-flex rounded-full bg-violet-500 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(139,92,246,0.35)] transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApplying
              ? "Sumando tareas…"
              : hasSelectedSuggestions
                ? `Sumar ${selectedCount} a mi sistema`
                : "Sumar a mi sistema"}
          </button>
        </div>
      </section>
    </div>
  );
}

function GuideCompassIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" opacity="0.75" />
      <path
        d="M9.2 14.8 10.8 9.2 14.8 10.8 13.2 14.8 9.2 14.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10.8 9.2 14.8 10.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SuggestionsMagicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 4.5a5.5 5.5 0 0 0-3.3 9.9c.5.37.8.94.8 1.56V17h5v-1.04c0-.62.3-1.19.8-1.56A5.5 5.5 0 0 0 12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.7 17h4.6v1.45a1.15 1.15 0 0 1-1.15 1.15h-2.3a1.15 1.15 0 0 1-1.15-1.15V17Z" fill="currentColor" />
      <path d="M10.1 21h3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CloseTinyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LockBadgeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

export { TaskList, DeleteTaskModal, CreateTaskModal, EditTaskModal };

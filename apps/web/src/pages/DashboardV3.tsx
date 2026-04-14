/**
 * Endpoints utilizados en esta vista:
 * - GET /users/:id/xp/total → GP total para la tarjeta principal.
 * - GET /users/:id/level → Nivel actual; el GP restante se estima client-side con una curva cuadrática.
 * - GET /users/:id/state → Game mode y barras de Daily Energy.
 * - GET /users/:id/xp/daily → Serie diaria de GP (Daily Cultivation + GP semanal del panel de rachas).
 * - GET /users/:id/xp/by-trait → Radar Chart (GP real por rasgo/pilar principal).
 * - GET /users/:id/emotions → Línea temporal de emociones (mapa emotion_id → etiqueta legible).
 * - GET /users/:id/tasks → Tareas activas reutilizadas para panel de rachas y misiones.
 * - GET /users/:id/journey → Avisos iniciales (confirmación de base / scheduler).
 * Derivaciones client-side: xp faltante y barra de nivel se calculan con una curva estimada; panel de rachas muestra métricas de GP mientras esperamos daily_log_raw.
 */

import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePostLoginLanguage } from '../i18n/postLoginLanguage';
import { apiAuthorizedFetch } from "../lib/api";
import { Navbar } from "../components/layout/Navbar";
import { MobileBottomNav } from "../components/layout/MobileBottomNav";
import { Alerts } from "../components/dashboard-v3/Alerts";
import { OnboardingCompletionBanner } from "../components/dashboard-v3/OnboardingCompletionBanner";
import { EnergyCard } from "../components/dashboard-v3/EnergyCard";
import { DailyCultivationSection } from "../components/dashboard-v3/DailyCultivationSection";
import { MissionsSection } from "../components/dashboard-v3/MissionsSection";
import { ProfileCard } from "../components/dashboard-v3/ProfileCard";
import { MetricHeader } from "../components/dashboard-v3/MetricHeader";
import { RadarChartCard } from "../components/dashboard-v3/RadarChartCard";
import { EmotionChartCard } from "../components/dashboard-v3/EmotionChartCard";
import {
  FEATURE_STREAKS_PANEL_V1,
  LegacyStreaksPanel,
  StreaksPanel,
} from "../components/dashboard-v3/StreaksPanel";
import { useBackendUser } from "../hooks/useBackendUser";
import type { AvatarProfile } from "../lib/avatarProfile";
import { useRequest } from "../hooks/useRequest";
import { DevErrorBoundary } from "../components/DevErrorBoundary";
import {
  getCurrentUserSubscription,
  getGameModeUpgradeSuggestion,
  getJourneyGenerationStatus,
  getModerationState,
  getRewardsHistory,
  getUserState,
  getUserTasks,
  markJourneyReadyModalSeen,
  updateModerationStatus,
  type ModerationStatus,
  type CurrentUserProfile,
  type UserJourneySummary,
} from "../lib/api";
import {
  DailyQuestModal,
  type DailyQuestModalHandle,
} from "../components/DailyQuestModal";
import { normalizeGameModeValue, type GameMode } from "../lib/gameMode";
import { RewardsSection } from "../components/dashboard-v3/RewardsSection";
import { MissionsV2Board } from "../components/dashboard-v3/MissionsV2Board";
import { MissionsV3Board } from "../components/dashboard-v3/MissionsV3Board";
import { Card as LegacyCard } from "../components/common/Card";
import {
  getActiveSection,
  getDashboardSectionConfig,
  getDashboardSections,
  type DashboardSectionConfig,
} from "./dashboardSections";
import { FEATURE_MISSIONS_V2 } from "../lib/featureFlags";
import { DashboardMenu } from "../components/dashboard-v3/DashboardMenu";
import { PlanChip } from "../components/dashboard-v3/PlanChip";
import { JourneyReadyModal } from "../components/dashboard-v3/JourneyReadyModal";
import {
  ReminderSchedulerDialog,
  type ReminderSchedulerDialogHandle,
} from "../components/dashboard-v3/ReminderSchedulerDialog";
import { NotificationPopup } from "../components/feedback/NotificationPopup";
import { useFeedbackNotifications } from "../hooks/useFeedbackNotifications";
import {
  useDailyQuestReadiness,
  type DailyQuestReadiness,
} from "../hooks/useDailyQuestReadiness";
import { useWeeklyWrapped } from "../hooks/useWeeklyWrapped";
import { WeeklyWrappedModal } from "../components/feedback/WeeklyWrappedModal";
import { useAppMode } from "../hooks/useAppMode";
import { sendGaEvent } from "../lib/ga4";
import { SHOW_BILLING_UI } from "../config/releaseFlags";
import {
  isJourneyGenerationPending,
  syncJourneyGenerationFromServer,
} from "../lib/journeyGeneration";
import { StandaloneSplash } from "../components/pwa/StandaloneSplash";
import { useOnboardingEditorNudge } from "../hooks/useOnboardingEditorNudge";
import { useOnboardingProgress } from '../hooks/useOnboardingProgress';
import { useModerationWidget } from "../hooks/useModerationWidget";
import type { ModerationTrackerType } from "../lib/api";
import { ModerationWidget as ModerationStatusWidget } from "../components/moderation/ModerationWidget";
import { ModerationEditSheet } from "../components/dashboard-v3/ModerationEditSheet";
import { ModerationOnboardingSuggestion } from "../components/dashboard-v3/ModerationOnboardingSuggestion";
import { ModeUpgradeSuggestionCTA } from "../components/dashboard-v3/ModeUpgradeSuggestionCTA";
import { ToastBanner } from "../components/common/ToastBanner";
import {
  readModerationOnboardingIntentFlag,
  writeModerationOnboardingIntentFlag,
} from "../lib/moderationOnboarding";
import {
  clearOnboardingOverlayScopeIfChanged,
  readOnboardingOverlayFlag,
  resetActiveOnboardingOverlayScope,
  writeOnboardingOverlayFlag,
} from "../lib/onboardingOverlayStorage";
import { buildOnboardingOverlayScope } from "../lib/onboardingOverlayScope";

function hasModerationBodyFocus(
  profile: CurrentUserProfile | null | undefined,
  journey: UserJourneySummary | null,
): boolean {
  const candidates: unknown[] = [];
  const profileRecord = profile as Record<string, unknown> | null | undefined;
  const journeyRecord = journey as Record<string, unknown> | null;

  if (profileRecord) {
    candidates.push(
      profileRecord.bodyFocus,
      profileRecord.body_focus,
      profileRecord.onboardingBodyFocus,
      profileRecord.onboarding_body_focus,
    );
    const onboarding = profileRecord.onboarding as
      | Record<string, unknown>
      | undefined;
    if (onboarding) {
      candidates.push(onboarding.bodyFocus, onboarding.body_focus);
    }
  }

  if (journeyRecord) {
    candidates.push(
      journeyRecord.bodyFocus,
      journeyRecord.body_focus,
      journeyRecord.onboardingBodyFocus,
      journeyRecord.onboarding_body_focus,
    );
    const onboarding = journeyRecord.onboarding as
      | Record<string, unknown>
      | undefined;
    if (onboarding) {
      candidates.push(onboarding.bodyFocus, onboarding.body_focus);
    }
  }

  return candidates.some((value) => {
    if (typeof value !== "string") {
      return false;
    }
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "moderation" ||
      normalized === "moderación" ||
      normalized === "moderacion"
    );
  });
}

export default function DashboardV3Page() {
  const navigate = useNavigate();
  const { backendUserId, status, error, reload, clerkUserId, profile, avatarProfile } =
    useBackendUser();
  const location = useLocation();
  const { language, t } = usePostLoginLanguage();
  const [upgradeWelcomeBanner, setUpgradeWelcomeBanner] = useState<string | null>(null);
  const upgradeWelcomeTimeoutRef = useRef<number | null>(null);
  const sections = getDashboardSections(location.pathname, language);
  const activeSection = getActiveSection(location.pathname, sections, language);
  const overviewSection = getDashboardSectionConfig(
    "dashboard",
    location.pathname,
    language,
  );
  const missionsSection = getDashboardSectionConfig(
    "missions",
    location.pathname,
    language,
  );
  const dquestSection = getDashboardSectionConfig("dquest", location.pathname, language);
  const rewardsSection = getDashboardSectionConfig(
    "rewards",
    location.pathname,
    language,
  );
  const profileGameMode = deriveGameModeFromProfile(profile?.game_mode);
  const shouldFetchUserState = Boolean(backendUserId && !profileGameMode);
  const { data: userState } = useRequest(
    () => getUserState(backendUserId!),
    [backendUserId],
    { enabled: shouldFetchUserState },
  );

  const rawGameMode =
    userState?.mode_name ?? userState?.mode ?? profileGameMode ?? null;
  const normalizedGameMode = normalizeGameModeValue(rawGameMode);
  const gameMode =
    normalizedGameMode ??
    (typeof rawGameMode === "string" ? rawGameMode : null);
  const weeklyWrapped = useWeeklyWrapped(backendUserId);
  const isAppMode = useAppMode();
  const [isJourneyGenerating, setIsJourneyGenerating] = useState(false);

  const handleUpgradeAccepted = useCallback((nextMode: string | null) => {
    const modeLabel = (nextMode ?? "RHYTHM").trim().toUpperCase();
    setUpgradeWelcomeBanner(t("dashboard.upgradeCta.welcomeToast", { nextMode: modeLabel }));
    void reload();
  }, [reload, t]);

  useEffect(() => {
    if (!upgradeWelcomeBanner) {
      return;
    }

    if (upgradeWelcomeTimeoutRef.current) {
      window.clearTimeout(upgradeWelcomeTimeoutRef.current);
    }

    upgradeWelcomeTimeoutRef.current = window.setTimeout(() => {
      setUpgradeWelcomeBanner(null);
      upgradeWelcomeTimeoutRef.current = null;
    }, 8000);

    return () => {
      if (upgradeWelcomeTimeoutRef.current) {
        window.clearTimeout(upgradeWelcomeTimeoutRef.current);
        upgradeWelcomeTimeoutRef.current = null;
      }
    };
  }, [upgradeWelcomeBanner]);

  useEffect(() => {
    console.info('[dashboard-v3] mounted', {
      at: Date.now(),
      pathname: location.pathname,
    });

    return () => {
      console.info('[dashboard-v3] unmounted', {
        at: Date.now(),
        pathname: location.pathname,
      });
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!location.state || typeof location.state !== "object") {
      return;
    }

    const navigationState = location.state as {
      scrollToTopOnEnter?: boolean;
      source?: string;
    };

    if (!navigationState.scrollToTopOnEnter || navigationState.source !== "demo") {
      return;
    }

    window.scrollTo({ top: 0, behavior: "auto" });
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);
  const moderation = useModerationWidget();
  const [isModerationEditOpen, setIsModerationEditOpen] = useState(false);
  const [moderationSuggestionResolved, setModerationSuggestionResolved] =
    useState(false);
  const [isModerationSuggestionOpen, setIsModerationSuggestionOpen] =
    useState(false);
  const [hasModerationOnboardingIntent, setHasModerationOnboardingIntent] =
    useState(false);
  const [selectedModerationSuggestions, setSelectedModerationSuggestions] =
    useState<ModerationTrackerType[]>(["alcohol", "tobacco", "sugar"]);
  const [
    isSubmittingModerationSuggestion,
    setIsSubmittingModerationSuggestion,
  ] = useState(false);

  useEffect(() => {
    if (!clerkUserId || typeof window === "undefined") {
      return;
    }

    const syncState = () => {
      setIsJourneyGenerating(isJourneyGenerationPending(clerkUserId));
    };

    syncState();
    window.addEventListener("journey-generation-change", syncState);
    return () =>
      window.removeEventListener("journey-generation-change", syncState);
  }, [clerkUserId]);

  useEffect(() => {
    if (!clerkUserId) {
      return;
    }

    let isMounted = true;
    let timer: number | null = null;

    const clearPollingTimer = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const syncFromBackend = async (): Promise<boolean> => {
      try {
        const payload = await getJourneyGenerationStatus();
        if (!isMounted) {
          return false;
        }

        syncJourneyGenerationFromServer({
          clerkUserId,
          state: payload.state,
        });

        return (
          payload.state?.status === "pending" ||
          payload.state?.status === "running"
        );
      } catch (error) {
        console.warn("Failed to sync journey generation state", error);
        return true;
      }
    };

    void (async () => {
      const shouldContinuePolling = await syncFromBackend();

      if (!isMounted || !shouldContinuePolling) {
        return;
      }

      timer = window.setInterval(() => {
        void syncFromBackend().then((shouldKeepPolling) => {
          if (!shouldKeepPolling) {
            clearPollingTimer();
          }
        });
      }, 7000);
    })();

    return () => {
      isMounted = false;
      clearPollingTimer();
    };
  }, [clerkUserId]);

  useEffect(() => {
    if (!clerkUserId || typeof window === "undefined") {
      return;
    }

    let hasTimezoneBeenSet = false;

    try {
      hasTimezoneBeenSet = window.localStorage.getItem("tzSet") === "true";
    } catch (error) {
      console.warn("Failed to access timezone flag in localStorage", error);
    }

    if (hasTimezoneBeenSet) {
      return;
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    const updateTimezone = async () => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        await apiAuthorizedFetch("/me/timezone", {
          method: "PUT",
          headers,
          body: JSON.stringify({ timezone }),
        });
      } catch (error) {
        console.warn("Failed to update user timezone", error);
      } finally {
        try {
          window.localStorage.setItem("tzSet", "true");
        } catch (storageError) {
          console.warn(
            "Failed to persist timezone flag in localStorage",
            storageError,
          );
        }
      }
    };

    void updateTimezone();
  }, [clerkUserId]);

  if (!clerkUserId) {
    return null;
  }

  const isLoadingProfile = status === "idle" || status === "loading";
  const failedToLoadProfile = status === "error" || !backendUserId;

  const dailyButtonRef = useRef<HTMLButtonElement | null>(null);
  const dailyQuestModalRef = useRef<DailyQuestModalHandle | null>(null);
  const reminderSchedulerDialogRef =
    useRef<ReminderSchedulerDialogHandle | null>(null);
  const hasAutoOpenedDailyQuestRef = useRef(false);
  const feedbackNotifications = useFeedbackNotifications({
    userId: backendUserId,
    enabled: Boolean(backendUserId),
  });
  const dailyQuestReadiness = useDailyQuestReadiness(backendUserId ?? "", {
    enabled: Boolean(backendUserId),
    isJourneyGenerating,
  });
  const { data: subscription } = useRequest(
    () => getCurrentUserSubscription(),
    [backendUserId],
    { enabled: SHOW_BILLING_UI && Boolean(backendUserId) },
  );
  const { data: generatedTasks } = useRequest(
    () => getUserTasks(backendUserId!),
    [backendUserId, isJourneyGenerating],
    { enabled: Boolean(backendUserId) },
  );
  const [journeyReadyOpen, setJourneyReadyOpen] = useState(false);
  const [pendingHabitDecisionCount, setPendingHabitDecisionCount] = useState(0);
  const rewardsHistoryRequest = useRequest(
    () => getRewardsHistory(backendUserId ?? ""),
    [backendUserId],
    { enabled: Boolean(backendUserId) },
  );
  const [showOnboardingCompletionBanner, setShowOnboardingCompletionBanner] = useState(false);
  const generationKeyRef = useRef<string | null>(null);
  const firstDailyQuestPromptInFlightRef = useRef(false);
  const firstDailyQuestPromptMarkedRef = useRef(false);

  const onboardingProgress = useOnboardingProgress();
  const { markStep } = onboardingProgress;
  const overlayScope = buildOnboardingOverlayScope(onboardingProgress.progress);
  const onboardingEditorNudge = useOnboardingEditorNudge({
    completedFirstDailyQuest: dailyQuestReadiness.completedFirstDailyQuest,
  });
  const {
    firstEditDone,
    hasReturnedToDashboardAfterEdit,
    shouldShowDashboardDot,
    markReturnedToDashboard,
  } = onboardingEditorNudge;

  useEffect(() => {
    clearOnboardingOverlayScopeIfChanged(overlayScope);
  }, [overlayScope]);

  useEffect(() => {
    const backendHasModerationIntent = Boolean(
      onboardingProgress.progress?.moderation_selected_at,
    );
    const fallbackFromProfile = hasModerationBodyFocus(
      profile,
      dailyQuestReadiness.journey,
    );
    const overlayHasModerationIntent =
      readModerationOnboardingIntentFlag(overlayScope);

    setHasModerationOnboardingIntent(
      backendHasModerationIntent ||
        fallbackFromProfile ||
        overlayHasModerationIntent,
    );
  }, [
    dailyQuestReadiness.journey,
    onboardingProgress.progress?.moderation_selected_at,
    overlayScope,
    profile,
  ]);

  useEffect(() => {
    const backendResolved = Boolean(
      onboardingProgress.progress?.moderation_modal_resolved_at,
    );
    const overlayResolved = readOnboardingOverlayFlag(
      overlayScope,
      "moderationSuggestionResolved",
    );

    setModerationSuggestionResolved(backendResolved || overlayResolved);
  }, [
    onboardingProgress.progress?.moderation_modal_resolved_at,
    overlayScope,
  ]);

  useEffect(() => {
    if (!onboardingProgress.progress?.daily_quest_scheduled_at) {
      return;
    }

    resetActiveOnboardingOverlayScope(overlayScope);
    setHasModerationOnboardingIntent(false);
    setModerationSuggestionResolved(false);
    setIsModerationSuggestionOpen(false);
  }, [
    onboardingProgress.progress?.daily_quest_scheduled_at,
    overlayScope,
  ]);

  const shouldShowFirstDailyQuestCta =
    dailyQuestReadiness.firstTasksConfirmed &&
    !dailyQuestReadiness.completedFirstDailyQuest &&
    hasReturnedToDashboardAfterEdit &&
    (!hasModerationOnboardingIntent || moderationSuggestionResolved);
  const firstDailyQuestPromptedAt =
    onboardingProgress.progress?.first_daily_quest_prompted_at ?? null;


  useEffect(() => {
    // Preserve the existing return-to-dashboard behavior, now scoped to the current onboarding journey overlay.
    if (activeSection.key !== 'dashboard') {
      return;
    }

    if (!firstEditDone || hasReturnedToDashboardAfterEdit) {
      return;
    }

    void markReturnedToDashboard();
  }, [
    activeSection.key,
    firstEditDone,
    hasReturnedToDashboardAfterEdit,
    markReturnedToDashboard,
  ]);

  useEffect(() => {
    const shouldShowModerationSuggestion =
      dailyQuestReadiness.firstTasksConfirmed &&
      !dailyQuestReadiness.completedFirstDailyQuest &&
      hasModerationOnboardingIntent &&
      !moderationSuggestionResolved &&
      !moderation.isLoading;

    if (shouldShowModerationSuggestion) {
      if (moderation.enabledTypes.length > 0) {
        writeOnboardingOverlayFlag(
          overlayScope,
          "moderationSuggestionResolved",
          true,
        );
        writeModerationOnboardingIntentFlag(false, overlayScope);
        setHasModerationOnboardingIntent(false);
        setModerationSuggestionResolved(true);
        return;
      }

      if (!onboardingProgress.progress?.moderation_modal_shown_at) {
        void onboardingProgress.markStep("moderation_modal_shown", {
          trigger: "dashboard_moderation_modal_open",
        });
      }
      setIsModerationSuggestionOpen(true);
      return;
    }

    if (isModerationSuggestionOpen) {
      return;
    }
  }, [
    dailyQuestReadiness.completedFirstDailyQuest,
    dailyQuestReadiness.firstTasksConfirmed,
    hasModerationOnboardingIntent,
    isModerationSuggestionOpen,
    moderation.enabledTypes.length,
    moderation.isLoading,
    moderationSuggestionResolved,
    onboardingProgress,
    overlayScope,
  ]);

  const resolveModerationSuggestion = useCallback(() => {
    writeOnboardingOverlayFlag(overlayScope, "moderationSuggestionResolved", true);
    writeModerationOnboardingIntentFlag(false, overlayScope);
    setHasModerationOnboardingIntent(false);
    setModerationSuggestionResolved(true);
    setIsModerationSuggestionOpen(false);
    if (!onboardingProgress.progress?.moderation_modal_resolved_at) {
      void onboardingProgress.markStep("moderation_modal_resolved", {
        trigger: "dashboard_moderation_modal_resolved",
      });
    }
  }, [onboardingProgress, overlayScope]);

  const handleToggleModerationSuggestion = useCallback(
    (type: ModerationTrackerType) => {
      setSelectedModerationSuggestions((current) => {
        if (current.includes(type)) {
          return current.filter((item) => item !== type);
        }

        if (current.length >= 3) {
          return current;
        }

        return [...current, type];
      });
    },
    [],
  );

  const handleActivateModerationSuggestion = useCallback(async () => {
    if (selectedModerationSuggestions.length === 0) {
      return;
    }

    setIsSubmittingModerationSuggestion(true);
    try {
      await Promise.all(
        selectedModerationSuggestions.map(async (type) => {
          const currentConfig = moderation.configs?.[type];
          await moderation.updateTracker(type, {
            isEnabled: true,
            isPaused: false,
            ...(currentConfig?.notLoggedToleranceDays == null
              ? { notLoggedToleranceDays: 2 }
              : {}),
          });
        }),
      );
      resolveModerationSuggestion();
    } catch (error) {
      console.error(
        "Failed to activate moderation onboarding suggestion",
        error,
      );
    } finally {
      setIsSubmittingModerationSuggestion(false);
    }
  }, [moderation, resolveModerationSuggestion, selectedModerationSuggestions]);

  const handleOpenDaily = useCallback(() => {
    if (!dailyQuestReadiness.canOpenDailyQuest) {
      return;
    }

    dailyQuestModalRef.current?.open();
  }, [
    dailyQuestReadiness.canOpenDailyQuest,
  ]);

  const handleOpenReminderScheduler = useCallback(() => {
    sendGaEvent("app_section_view", {
      section_name: "scheduler",
      previous_section: activeSection.key,
      page_path: location.pathname,
      entry_point: "dashboard",
      is_authenticated: true,
    });
    reminderSchedulerDialogRef.current?.open();
  }, [activeSection.key, location.pathname]);

  const handleMainMenuNavigation = useCallback(
    ({
      destinationSection,
      destinationPath,
      menuLocation,
    }: {
      destinationSection: string;
      destinationPath: string;
      menuLocation: "desktop" | "mobile";
    }) => {
      sendGaEvent("app_menu_navigation", {
        source_section: activeSection.key,
        destination_section: destinationSection,
        destination_path: destinationPath,
        menu_location: menuLocation,
        page_path: location.pathname,
        is_authenticated: true,
      });
    },
    [activeSection.key, location.pathname],
  );

  const handleReminderScheduled = useCallback(async ({
    wasFirstScheduleCompletion,
  }: {
    wasFirstScheduleCompletion: boolean;
  }) => {
    if (wasFirstScheduleCompletion) {
      setShowOnboardingCompletionBanner(true);
    }
    await Promise.all([
      onboardingProgress.reload(),
      dailyQuestReadiness.reload(),
      reload(),
    ]);
  }, [dailyQuestReadiness, onboardingProgress, reload]);

  useEffect(() => {
    if (!showOnboardingCompletionBanner) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowOnboardingCompletionBanner(false);
    }, 7600);

    return () => window.clearTimeout(timeoutId);
  }, [showOnboardingCompletionBanner]);

  const handleDailyQuestComplete = useCallback(
    (
      response: Parameters<
        typeof feedbackNotifications.handleDailyQuestResult
      >[0],
    ) => {
      feedbackNotifications.handleDailyQuestResult(response);
      dailyQuestReadiness.reload();
      reload();
    },
    [dailyQuestReadiness, feedbackNotifications, reload],
  );

  const handleFeedbackPopupCta = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  const handleWeeklyWrappedViewRewards = useCallback(async () => {
    await weeklyWrapped.completeModal();
    handleMainMenuNavigation({
      destinationSection: "rewards",
      destinationPath: rewardsSection.to,
      menuLocation: "desktop",
    });
    navigate(rewardsSection.to);
  }, [handleMainMenuNavigation, navigate, rewardsSection.to, weeklyWrapped.completeModal]);

  useEffect(() => {
    if (firstDailyQuestPromptedAt) {
      firstDailyQuestPromptMarkedRef.current = true;
    }
  }, [firstDailyQuestPromptedAt]);

  useEffect(() => {
    if (
      !backendUserId ||
      !shouldShowFirstDailyQuestCta ||
      firstDailyQuestPromptedAt ||
      firstDailyQuestPromptInFlightRef.current ||
      firstDailyQuestPromptMarkedRef.current
    ) {
      return;
    }

    firstDailyQuestPromptInFlightRef.current = true;
    void markStep('first_daily_quest_prompted', {
      trigger: 'dashboard_daily_quest_cta_shown',
    })
      .then(() => {
        firstDailyQuestPromptMarkedRef.current = true;
      })
      .catch((error) => {
        console.error('Failed to mark first_daily_quest_prompted step', error);
      })
      .finally(() => {
        firstDailyQuestPromptInFlightRef.current = false;
      });
  }, [
    backendUserId,
    firstDailyQuestPromptedAt,
    markStep,
    shouldShowFirstDailyQuestCta,
  ]);

  useEffect(() => {
    if (!backendUserId || hasAutoOpenedDailyQuestRef.current) {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const queryParamName = searchParams.has("daily-quest")
      ? "daily-quest"
      : searchParams.has("dailyQuest")
        ? "dailyQuest"
        : null;
    const rawValue = queryParamName ? searchParams.get(queryParamName) : null;
    const normalizedValue = rawValue?.trim().toLowerCase();
    const allowedValues = new Set(["1", "true", "open", "yes"]);
    const hasEmptyValue =
      queryParamName != null && (!rawValue || rawValue.trim() === "");
    const shouldOpenFromQuery = Boolean(
      queryParamName &&
      (hasEmptyValue ||
        (normalizedValue && allowedValues.has(normalizedValue))),
    );
    const normalizedHash = location.hash?.toLowerCase() ?? "";
    const shouldOpenFromHash = normalizedHash === "#daily-quest";

    if (!shouldOpenFromQuery && !shouldOpenFromHash) {
      return;
    }

    if (!dailyQuestReadiness.canOpenDailyQuest) {
      return;
    }

    hasAutoOpenedDailyQuestRef.current = true;
    dailyQuestModalRef.current?.open();
  }, [
    backendUserId,
    dailyQuestReadiness.canOpenDailyQuest,
    location.hash,
    location.search,
  ]);

  useEffect(() => {
    if (!backendUserId || !generatedTasks || generatedTasks.length === 0) {
      return;
    }

    const check = async () => {
      try {
        const payload = await getJourneyGenerationStatus();
        const state = payload.state;
        if (!state) {
          return;
        }

        const generationKey = state.correlation_id ?? state.updated_at;
        generationKeyRef.current = generationKey;
        const seenInBackend = Boolean(payload.journey_ready_modal_seen_at);
        const seenInSession =
          window.sessionStorage.getItem(`jr_seen_session_${generationKey}`) ===
          "1";
        const isReady = state.status === "completed";

        if (
          isReady &&
          !seenInBackend &&
          !seenInSession &&
          generatedTasks.length > 0
        ) {
          setJourneyReadyOpen(true);
          window.sessionStorage.setItem(
            `jr_seen_session_${generationKey}`,
            "1",
          );
        }
      } catch (error) {
        console.warn("Failed to resolve journey ready modal status", error);
      }
    };

    void check();
  }, [backendUserId, generatedTasks]);

  const persistJourneyReadySeen = useCallback(async () => {
    const generationKey = generationKeyRef.current;
    if (!generationKey) {
      return;
    }

    try {
      await markJourneyReadyModalSeen(generationKey);
    } catch (error) {
      console.warn("Failed to persist journey ready modal seen state", error);
    }
  }, []);

  const handleCloseJourneyReady = useCallback(() => {
    setJourneyReadyOpen(false);
    void persistJourneyReadySeen();
  }, [persistJourneyReadySeen]);

  return (
    <DevErrorBoundary>
      <StandaloneSplash />
      <div className="flex min-h-screen flex-col">
        {!isAppMode && (
          <Navbar
            onDailyClick={
              backendUserId && dailyQuestReadiness.canShowDailyQuestPopup
                ? handleOpenDaily
                : undefined
            }
            dailyButtonRef={dailyButtonRef}
            title={activeSection.pageTitle}
            sections={sections.map((section) => ({
              ...section,
              showPulseDot:
                (section.key === "dashboard" && shouldShowDashboardDot) ||
                (section.key === "rewards" && pendingHabitDecisionCount > 0),
            }))}
            onSectionClick={(section) => {
              handleMainMenuNavigation({
                destinationSection: section.key,
                destinationPath: section.to,
                menuLocation: "desktop",
              });
            }}
            menuSlot={
              <DashboardMenu
                currentGameMode={gameMode}
                currentAvatarProfile={avatarProfile}
                onGameModeChanged={reload}
                onUpgradeAccepted={handleUpgradeAccepted}
                onOpenScheduler={handleOpenReminderScheduler}
                moderation={{
                  configs: moderation.configs,
                  enabledTypes: moderation.enabledTypes,
                  isRefreshingWidgets: moderation.isRefreshingWidgets,
                  updateTrackerEnabled: async (type, enabled) => {
                    await moderation.updateTracker(type, {
                      isEnabled: enabled,
                    });
                  },
                  onOpenEdit: () => setIsModerationEditOpen(true),
                }}
              />
            }
            planSlot={SHOW_BILLING_UI ? <PlanChip subscription={subscription ?? null} /> : null}
          />
        )}
        <DailyQuestModal
          ref={dailyQuestModalRef}
          enabled={Boolean(backendUserId)}
          canAutoOpen={dailyQuestReadiness.canAutoOpenDailyQuestPopup}
          returnFocusRef={dailyButtonRef}
          onComplete={handleDailyQuestComplete}
        />
        <ReminderSchedulerDialog
          ref={reminderSchedulerDialogRef}
          enabled={Boolean(backendUserId)}
          onScheduled={handleReminderScheduled}
        />
        {feedbackNotifications.activePopup ? (
          <NotificationPopup
            open
            title={feedbackNotifications.activePopup.title}
            message={feedbackNotifications.activePopup.message}
            emoji={feedbackNotifications.activePopup.emoji}
            emojiAnimation={feedbackNotifications.activePopup.emojiAnimation}
            cta={feedbackNotifications.activePopup.cta}
            tasks={feedbackNotifications.activePopup.tasks}
            autoDismissMs={feedbackNotifications.activePopup.autoDismissMs}
            onCtaClick={handleFeedbackPopupCta}
            onClose={feedbackNotifications.dismissActivePopup}
          />
        ) : null}
        {weeklyWrapped.isModalOpen && weeklyWrapped.activeRecord ? (
          <WeeklyWrappedModal
            payload={weeklyWrapped.activeRecord.payload}
            onDismiss={weeklyWrapped.closeModal}
            onComplete={weeklyWrapped.completeModal}
            onViewRewards={handleWeeklyWrappedViewRewards}
          />
        ) : null}
        <JourneyReadyModal
          open={journeyReadyOpen}
          tasks={generatedTasks ?? []}
          onClose={handleCloseJourneyReady}
          onEditor={() => {
            handleCloseJourneyReady();
            navigate("/editor");
          }}
        />
        <main className="flex-1 pb-24 md:pb-0" data-light-scope="dashboard-v3">
          <div className="mx-auto w-full max-w-7xl px-3 py-4 md:px-5 md:py-6 lg:px-6 lg:py-8">
            {upgradeWelcomeBanner ? (
              <ToastBanner
                tone="success"
                message={upgradeWelcomeBanner}
                className="mb-4 border-black/15 bg-gradient-to-r from-[#a770ef] via-[#cf8bf3] to-[#fdb99b] text-black shadow-[0_14px_30px_rgba(167,112,239,0.35)]"
              />
            ) : null}
            {isLoadingProfile && <ProfileSkeleton />}

            {failedToLoadProfile && !isLoadingProfile && (
              <>
                <ProfileErrorState onRetry={reload} error={error} />
                <DashboardFallback />
              </>
            )}

            {!failedToLoadProfile && !isLoadingProfile && backendUserId && (
              <Routes>
                <Route
                  index
                  element={
                    <DashboardOverview
                      userId={backendUserId}
                      gameMode={gameMode}
                      avatarProfile={avatarProfile}
                      weeklyTarget={profile?.weekly_target ?? null}
                      isJourneyGenerating={isJourneyGenerating}
                      dailyQuestReadiness={dailyQuestReadiness}
                      showOnboardingGuidance={
                        dailyQuestReadiness.showOnboardingGuidance
                      }
                      section={overviewSection}
                      onOpenReminderScheduler={handleOpenReminderScheduler}
                      journeyReadyOpen={journeyReadyOpen}
                      onOpenModerationEdit={() => setIsModerationEditOpen(true)}
                      shouldShowFirstDailyQuestCta={shouldShowFirstDailyQuestCta}
                      onOpenDailyQuest={handleOpenDaily}
                      showOnboardingCompletionBanner={showOnboardingCompletionBanner}
                      onUpgradeAccepted={handleUpgradeAccepted}
                    />
                  }
                />
                <Route
                  path="missions"
                  element={
                    <MissionsView
                      userId={backendUserId}
                      section={missionsSection}
                    />
                  }
                />
                <Route
                  path="dquest"
                  element={
                    <DailyQuestView
                      section={dquestSection}
                      onOpenDailyQuest={handleOpenDaily}
                    />
                  }
                />
                <Route
                  path="missions-v2"
                  element={
                    <MissionsV2Route
                      userId={backendUserId}
                      gameMode={gameMode}
                      avatarProfile={avatarProfile}
                    />
                  }
                />
                <Route
                  path="misiones"
                  element={
                    <MissionsV2Route
                      userId={backendUserId}
                      gameMode={gameMode}
                      avatarProfile={avatarProfile}
                    />
                  }
                />
                <Route
                  path="missions-v3"
                  element={
                    <MissionsV3Route
                      userId={backendUserId}
                      gameMode={gameMode}
                      avatarProfile={avatarProfile}
                    />
                  }
                />
                <Route
                  path="rewards"
                  element={
                    <RewardsView
                      userId={backendUserId}
                      section={rewardsSection}
                      weeklyWrapped={weeklyWrapped}
                      rewardsHistoryData={rewardsHistoryRequest.data ?? undefined}
                      onPendingHabitDecisionCountChange={setPendingHabitDecisionCount}
                    />
                  }
                />
                <Route path="*" element={<Navigate to="." replace />} />
              </Routes>
            )}
          </div>
        </main>

        <ModerationEditSheet
          isOpen={isModerationEditOpen}
          isLoading={moderation.isLoading}
          enabledTypes={moderation.enabledTypes}
          configs={moderation.configs}
          onClose={() => setIsModerationEditOpen(false)}
          onTogglePause={async (type, value) => {
            await moderation.updateTracker(type, { isPaused: value });
          }}
          onToleranceChange={async (type, value) => {
            await moderation.updateTracker(type, {
              notLoggedToleranceDays: value,
            });
          }}
        />
        <ModerationOnboardingSuggestion
          open={isModerationSuggestionOpen}
          language={language}
          selected={selectedModerationSuggestions}
          onToggle={handleToggleModerationSuggestion}
          onActivate={() => {
            void handleActivateModerationSuggestion();
          }}
          onSkip={resolveModerationSuggestion}
          isSubmitting={isSubmittingModerationSuggestion}
        />
        {!isAppMode && (
          <MobileBottomNav
            items={sections.map((section) => {
              const Icon = section.icon;

              return {
                key: section.key,
                label: section.key === "editor" ? "Editor" : section.label,
                to: section.to,
                icon: <Icon className="h-4 w-4" />,
                end: section.end,
                onClick: () => {
                  handleMainMenuNavigation({
                    destinationSection: section.key,
                    destinationPath: section.to,
                    menuLocation: "mobile",
                  });

                  if (section.key === "dquest") {
                    handleOpenDaily();
                  }
                },
                showPulseDot:
                  (section.key === "dashboard" && shouldShowDashboardDot) ||
                  (section.key === "rewards" && pendingHabitDecisionCount > 0),
              };
            })}
          />
        )}
      </div>
    </DevErrorBoundary>
  );
}

interface DashboardOverviewProps {
  userId: string;
  gameMode: GameMode | string | null;
  avatarProfile: AvatarProfile | null;
  weeklyTarget: number | null;
  isJourneyGenerating: boolean;
  dailyQuestReadiness: DailyQuestReadiness;
  showOnboardingGuidance: boolean;
  section: DashboardSectionConfig;
  onOpenReminderScheduler: () => void;
  journeyReadyOpen?: boolean;
  onOpenModerationEdit: () => void;
  shouldShowFirstDailyQuestCta: boolean;
  onOpenDailyQuest: () => void;
  showOnboardingCompletionBanner: boolean;
  onUpgradeAccepted: (nextMode: string | null) => void;
}

export function DashboardOverview({
  userId,
  gameMode,
  avatarProfile,
  weeklyTarget,
  isJourneyGenerating,
  dailyQuestReadiness,
  showOnboardingGuidance,
  section,
  onOpenReminderScheduler,
  journeyReadyOpen = false,
  onOpenModerationEdit,
  shouldShowFirstDailyQuestCta,
  onOpenDailyQuest,
  showOnboardingCompletionBanner,
  onUpgradeAccepted,
}: DashboardOverviewProps) {
  const trackedPanelInteractionsRef = useRef<Set<"balance" | "streaks">>(
    new Set(),
  );
  const handleScheduleClick = useCallback(() => {
    onOpenReminderScheduler();
  }, [onOpenReminderScheduler]);
  const trackPanelInteraction = useCallback((panelName: "balance" | "streaks") => {
    if (trackedPanelInteractionsRef.current.has(panelName)) {
      return;
    }

    trackedPanelInteractionsRef.current.add(panelName);
    sendGaEvent("app_panel_interaction", {
      panel_name: panelName,
      interaction_type: "click",
      page_section: "dashboard_home",
      is_authenticated: true,
    });
  }, []);

  const moderationRequest = useRequest(() => getModerationState(), [userId], {
    enabled: Boolean(userId),
  });
  const [moderationState, setModerationState] = useState(
    moderationRequest.data,
  );
  const modeUpgradeSuggestionRequest = useRequest(
    () => getGameModeUpgradeSuggestion(),
    [userId],
    { enabled: Boolean(userId) },
  );
  const [modeUpgradeSuggestion, setModeUpgradeSuggestion] = useState(
    modeUpgradeSuggestionRequest.data,
  );

  useEffect(() => {
    setModerationState(moderationRequest.data);
  }, [moderationRequest.data]);

  useEffect(() => {
    setModeUpgradeSuggestion(modeUpgradeSuggestionRequest.data);
  }, [modeUpgradeSuggestionRequest.data]);

  const handleCycleModeration = useCallback(
    async (type: ModerationTrackerType, status: ModerationStatus) => {
      const dayKey = moderationState?.dayKey;
      if (!dayKey) {
        return;
      }
      try {
        const updated = await updateModerationStatus(type, { dayKey, status });
        setModerationState(updated);
      } catch (error) {
        console.error("Failed to update moderation from dashboard", error);
      }
    },
    [moderationState?.dayKey],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={section.eyebrow}
        title={section.contentTitle}
        description={section.description}
        pageTitle={section.pageTitle}
      />
      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="order-1 space-y-4 lg:col-span-12">
          <OnboardingCompletionBanner visible={showOnboardingCompletionBanner} />
          <ModeUpgradeSuggestionCTA
            suggestion={modeUpgradeSuggestion}
            isLoading={modeUpgradeSuggestionRequest.status === "loading"}
            onSuggestionChange={setModeUpgradeSuggestion}
            onUpgradeAccepted={onUpgradeAccepted}
          />
          <Alerts
            hasTasks={dailyQuestReadiness.hasTasks}
            firstTasksConfirmed={dailyQuestReadiness.firstTasksConfirmed}
            completedFirstDailyQuest={dailyQuestReadiness.completedFirstDailyQuest}
            showJourneyPreparing={dailyQuestReadiness.showJourneyPreparing}
            tasksStatus={dailyQuestReadiness.tasksStatus}
            journeyStatus={dailyQuestReadiness.journeyStatus}
            journey={dailyQuestReadiness.journey}
            showOnboardingGuidance={showOnboardingGuidance}
            onScheduleClick={handleScheduleClick}
            suppressJourneyPreparing={journeyReadyOpen}
            showFirstDailyQuestCta={shouldShowFirstDailyQuestCta}
            onOpenFirstDailyQuest={onOpenDailyQuest}
          />
        </div>

        <div className="order-2 space-y-4 md:space-y-5 lg:order-2 lg:col-span-4">
          <div data-demo-anchor="overall-progress">
            <MetricHeader userId={userId} gameMode={gameMode} avatarProfile={avatarProfile} />
          </div>
          <ProfileCard gameMode={gameMode} avatarProfile={avatarProfile} />
          <div data-demo-anchor="daily-energy">
            <EnergyCard userId={userId} gameMode={gameMode} />
          </div>
          <div data-demo-anchor="daily-cultivation">
            <DailyCultivationSection userId={userId} />
          </div>
        </div>

        <div className="order-3 space-y-4 md:space-y-5 lg:order-3 lg:col-span-4">
          <div data-demo-anchor="moderation">
            <ModerationStatusWidget
              data={moderationState ?? null}
              loading={moderationRequest.status === "loading"}
              onCycle={handleCycleModeration}
              onEdit={onOpenModerationEdit}
            />
          </div>
          <div
            data-demo-anchor="balance"
            onClickCapture={() => {
              trackPanelInteraction("balance");
            }}
          >
            <RadarChartCard userId={userId} />
          </div>
          <div data-demo-anchor="emotion-chart">
            <EmotionChartCard userId={userId} />
          </div>

        </div>

        <div className="order-4 space-y-4 md:space-y-5 lg:order-4 lg:col-span-4">
          {FEATURE_STREAKS_PANEL_V1 && <LegacyStreaksPanel userId={userId} />}
          <div
            data-demo-anchor="streaks"
            onClickCapture={() => {
              trackPanelInteraction("streaks");
            }}
          >
            <StreaksPanel
              userId={userId}
              gameMode={gameMode}
              weeklyTarget={weeklyTarget}
              avatarProfile={avatarProfile}
              forceLoadingTasks={isJourneyGenerating}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MissionsView({
  userId,
  section,
}: {
  userId: string;
  section: DashboardSectionConfig;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={section.eyebrow}
        title={section.contentTitle}
        description={section.description}
        pageTitle={section.pageTitle}
      />
      <MissionsSection userId={userId} />
    </div>
  );
}

function DailyQuestView({
  section,
  onOpenDailyQuest,
}: {
  section: DashboardSectionConfig;
  onOpenDailyQuest: () => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={section.eyebrow}
        title={section.contentTitle}
        description={section.description}
        pageTitle={section.pageTitle}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-12 lg:gap-6">
        <LegacyCard
          className="lg:col-span-7"
          title="Activá tu DQuest"
          subtitle="Ritual de foco en menos de 5 minutos"
          action={
            <button
              type="button"
              onClick={onOpenDailyQuest}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[0_12px_28px_rgba(99,102,241,0.28)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Abrir Daily Quest
            </button>
          }
        >
          <div className="space-y-3 text-sm text-[color:var(--color-text-muted)]">
            <p>
              Generamos una misión corta y accionable para que mantengas la
              racha. Abrila, confirma tu plan y marcala cuando la completes.
            </p>
            <ul className="space-y-2">
              {[
                "1 foco principal con claridad de impacto.",
                "Recordatorios opcionales para no olvidarla.",
                "Registro rápido del resultado y energía invertida.",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-[color:var(--color-text-muted)]">
                  <span
                    className="mt-1 inline-block h-2 w-2 rounded-full bg-gradient-to-br from-sky-300 via-indigo-300 to-fuchsia-300 shadow-[0_0_12px_rgba(99,102,241,0.45)]"
                    aria-hidden
                  />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </LegacyCard>
        <LegacyCard
          className="lg:col-span-5"
          title="Consejos rápidos"
          subtitle="Mantén el hábito vivo"
        >
          <div className="space-y-3 text-sm text-[color:var(--color-text-muted)]">
            <p className="font-semibold text-[color:var(--color-text)]">
              DQuest es tu base diaria:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span
                  className="mt-1 h-2 w-2 rounded-full bg-[color:var(--color-text-subtle)]"
                  aria-hidden
                />
                <span>
                  Define hora y lugar en el modal para reducir fricción.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span
                  className="mt-1 h-2 w-2 rounded-full bg-[color:var(--color-text-subtle)]"
                  aria-hidden
                />
                <span>
                  Si cambia tu día, reabre el modal y replanifica en segundos.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span
                  className="mt-1 h-2 w-2 rounded-full bg-[color:var(--color-text-subtle)]"
                  aria-hidden
                />
                <span>
                  Marca el cierre: sumarás GP extra y mantendrás la racha
                  activa.
                </span>
              </li>
            </ul>
          </div>
        </LegacyCard>
      </div>
    </div>
  );
}

function MissionsV2Route({
  userId,
  gameMode,
  avatarProfile,
}: {
  userId: string;
  gameMode: GameMode | string | null;
  avatarProfile: AvatarProfile | null;
}) {
  if (!FEATURE_MISSIONS_V2) {
    return <Navigate to=".." replace />;
  }

  return <MissionsV2View userId={userId} gameMode={gameMode} avatarProfile={avatarProfile} />;
}

function MissionsV2View({
  userId,
  gameMode,
  avatarProfile,
}: {
  userId: string;
  gameMode: GameMode | string | null;
  avatarProfile: AvatarProfile | null;
}) {
  const [showWip, setShowWip] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="relative space-y-6">
      <h1 className="sr-only">Misiones</h1>
      <MissionsV2Board userId={userId} gameMode={gameMode} avatarProfile={avatarProfile} />
      {showWip ? (
        <div className="fixed inset-0 z-20 bg-slate-950/90 px-4 py-6 sm:px-8 sm:py-10">
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
            <p className="text-6xl">🚧</p>
            <p className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
              work in progress
            </p>
            <p className="mt-3 max-w-xl text-sm text-[color:var(--color-slate-300)] sm:text-base">
              Estamos afinando la experiencia de misiones en web. Mientras
              tanto, puedes volver al dashboard o seguir explorando bajo tu
              propio riesgo.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-800"
                onClick={() => setShowWip(false)}
              >
                let see
              </button>
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-full bg-accent-purple px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-purple/90"
                onClick={() => navigate("/dashboard-v3")}
              >
                let them cook
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MissionsV3Route({
  userId,
  gameMode,
  avatarProfile,
}: {
  userId: string;
  gameMode: GameMode | string | null;
  avatarProfile: AvatarProfile | null;
}) {
  if (!FEATURE_MISSIONS_V2) {
    return <Navigate to=".." replace />;
  }

  return <MissionsV3View userId={userId} gameMode={gameMode} avatarProfile={avatarProfile} />;
}

function MissionsV3View({
  userId,
  gameMode,
  avatarProfile,
}: {
  userId: string;
  gameMode: GameMode | string | null;
  avatarProfile: AvatarProfile | null;
}) {
  return (
    <div className="space-y-6">
      <h1 className="sr-only">Misiones v3</h1>
      <MissionsV3Board userId={userId} gameMode={gameMode} avatarProfile={avatarProfile} />
    </div>
  );
}

function RewardsView({
  userId,
  section,
  weeklyWrapped,
  rewardsHistoryData,
  onPendingHabitDecisionCountChange,
}: {
  userId: string;
  section: DashboardSectionConfig;
  weeklyWrapped: ReturnType<typeof useWeeklyWrapped>;
  rewardsHistoryData?: Awaited<ReturnType<typeof getRewardsHistory>>;
  onPendingHabitDecisionCountChange?: (count: number) => void;
}) {
  return (
    <div className="space-y-6">
      <h1 className="sr-only">{section.pageTitle}</h1>
      <RewardsSection
        userId={userId}
        initialData={rewardsHistoryData}
        onOpenWeeklyWrapped={weeklyWrapped.openModal}
        onPendingCountChange={onPendingHabitDecisionCountChange}
      />
    </div>
  );
}

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  pageTitle: string;
}

function SectionHeader({
  eyebrow,
  title,
  description,
  pageTitle,
}: SectionHeaderProps) {
  const normalizedTitle = title.trim();
  const normalizedPageTitle = pageTitle.trim();
  const shouldShowTitle =
    normalizedTitle.length > 0 &&
    normalizedTitle.toLowerCase() !== normalizedPageTitle.toLowerCase();
  const normalizedEyebrow = eyebrow?.trim() ?? "";
  const shouldShowEyebrow = normalizedEyebrow.length > 0;
  const normalizedDescription = description?.trim() ?? "";
  const shouldShowDescription = normalizedDescription.length > 0;

  return (
    <header className="space-y-2">
      <h1 className="sr-only">{pageTitle}</h1>
      {shouldShowEyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {normalizedEyebrow}
        </p>
      )}
      {shouldShowTitle && (
        <h2 className="font-display text-2xl font-semibold text-[color:var(--color-text-strong)] sm:text-3xl">
          {title}
        </h2>
      )}
      {shouldShowDescription && (
        <p className="text-sm text-[color:var(--color-slate-400)]">{normalizedDescription}</p>
      )}
    </header>
  );
}

function deriveGameModeFromProfile(mode?: string | null): GameMode | null {
  return normalizeGameModeValue(mode);
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-48 animate-pulse rounded bg-[color:var(--color-overlay-2)]" />
      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-12">
          <div className="h-32 w-full animate-pulse rounded-2xl bg-[color:var(--color-overlay-2)]" />
        </div>
        <div className="space-y-4 md:space-y-5 lg:col-span-4">
          <div className="h-36 w-full animate-pulse rounded-2xl bg-[color:var(--color-overlay-2)]" />
          <div className="h-64 w-full animate-pulse rounded-2xl bg-[color:var(--color-overlay-2)]" />
          <div className="h-56 w-full animate-pulse rounded-2xl bg-[color:var(--color-overlay-2)]" />
          <div className="h-48 w-full animate-pulse rounded-2xl bg-[color:var(--color-overlay-2)]" />
        </div>
        <div className="space-y-4 md:space-y-5 lg:col-span-4">
          <div className="h-64 w-full animate-pulse rounded-2xl bg-[color:var(--color-overlay-2)]" />
          <div className="h-64 w-full animate-pulse rounded-2xl bg-[color:var(--color-overlay-2)]" />
        </div>
        <div className="space-y-4 md:space-y-5 lg:col-span-4">
          <div className="h-72 w-full animate-pulse rounded-2xl bg-[color:var(--color-overlay-2)]" />
          <div className="h-72 w-full animate-pulse rounded-2xl bg-[color:var(--color-overlay-2)]" />
          <div className="h-48 w-full animate-pulse rounded-2xl bg-[color:var(--color-overlay-2)]" />
        </div>
      </div>
    </div>
  );
}

interface ProfileErrorStateProps {
  onRetry: () => void;
  error: Error | null;
}

function ProfileErrorState({ onRetry, error }: ProfileErrorStateProps) {
  return (
    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md md:p-6">
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--color-text-strong)]">
            No pudimos conectar con tu perfil
          </h2>
          <p className="mt-1 text-sm text-rose-100/80">
            Verificá tu conexión e intentá cargar nuevamente la información de
            tu Daily Quest.
          </p>
        </div>
        {error?.message && (
          <p className="text-xs text-rose-100/70">{error.message}</p>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center rounded-full border border-rose-200/50 bg-rose-200/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-rose-100/70 hover:bg-rose-100/20"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

function DashboardFallback() {
  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-6 text-[color:var(--color-slate-200)] shadow-glow">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--color-slate-400)]">
          Vista previa sin conexión
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-[color:var(--color-text-strong)]">
          Estamos preparando tu Dashboard
        </h2>
        <p className="mt-2 text-sm text-[color:var(--color-slate-300)]">
          Conservá esta ventana abierta: los datos de GP, emociones y misiones
          aparecerán automáticamente cuando recuperemos la conexión con el
          servidor.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-4 md:space-y-5 lg:col-span-4">
          <LegacyCard
            title="GP diario"
            subtitle="Se actualizará al reconectar"
            className="min-h-[180px]"
          >
            <div className="space-y-3 text-sm text-[color:var(--color-slate-200)]">
              <FallbackMetric label="Quests completadas" value="0 / —" />
              <FallbackMetric label="GP hoy" value="—" />
              <p className="text-xs text-[color:var(--color-slate-400)]">
                Tu progreso diario aparece acá cuando la API responde.
              </p>
            </div>
          </LegacyCard>

          <LegacyCard
            title="Perfil"
            subtitle="Foto y ritmo"
            className="min-h-[180px]"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-2)]" />
              <div className="space-y-2 text-xs text-[color:var(--color-slate-300)]">
                <div className="h-3 w-24 rounded bg-[color:var(--color-overlay-2)]" />
                <div className="h-3 w-16 rounded bg-[color:var(--color-overlay-2)]" />
              </div>
            </div>
            <p className="mt-4 text-xs text-[color:var(--color-slate-400)]">
              Mostramos tus datos personales en cuanto podamos sincronizar tu
              perfil.
            </p>
          </LegacyCard>
        </div>

        <div className="space-y-4 md:space-y-5 lg:col-span-4">
          <LegacyCard
            title="Emociones"
            subtitle="Últimos 7 días"
            className="min-h-[180px]"
          >
            <div className="h-24 rounded-2xl border border-[color:var(--color-border-subtle)] bg-gradient-to-r from-slate-800/60 via-slate-900/40 to-slate-800/60" />
            <p className="text-xs text-[color:var(--color-slate-400)]">
              El mapa emocional vuelve automáticamente una vez que la API
              responda.
            </p>
          </LegacyCard>
        </div>

        <div className="space-y-4 md:space-y-5 lg:col-span-4">
          <LegacyCard
            title="Rachas"
            subtitle="Seguimiento semanal"
            className="min-h-[180px]"
          >
            <div className="space-y-3 text-xs text-[color:var(--color-slate-300)]">
              <FallbackMetric label="Daily Quest" value="En espera" />
              <FallbackMetric label="Weekly GP" value="Sin datos" />
              <p className="text-xs text-[color:var(--color-slate-400)]">
                Apenas detectemos actividad, tus rachas se renderizan acá.
              </p>
            </div>
          </LegacyCard>

          <LegacyCard
            title="Rewards"
            subtitle="Logros desbloqueados"
            className="min-h-[180px]"
          >
            <div className="space-y-2 text-xs text-[color:var(--color-slate-200)]">
              <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-slate-400)]">
                  Siguiente badge
                </p>
                <p className="mt-2 text-sm text-white">
                  Disponible al reconectar
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-slate-400)]">
                  Último logro
                </p>
                <p className="mt-2 text-sm text-white">Sincronizando…</p>
              </div>
            </div>
          </LegacyCard>
        </div>
      </div>
    </div>
  );
}

function FallbackMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--color-slate-400)]">
        {label}
      </span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

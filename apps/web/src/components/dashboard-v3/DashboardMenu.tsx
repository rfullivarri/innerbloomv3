import { useAuth, useClerk, useUser } from "../../auth/runtimeAuth";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ToastBanner } from "../common/ToastBanner";
import { GameModeChip, buildGameModeChip } from "../common/GameModeChip";
import { ModerationWidget as ModerationPreviewWidget } from "./ModerationWidget";
import { UpgradeRecommendationModal } from "./UpgradeRecommendationModal";
import { ModerationTrackerIcon } from "../moderation/trackerMeta";
import { useQuickAccessInstall } from "../../hooks/useQuickAccessInstall";
import { usePostLoginLanguage } from "../../i18n/postLoginLanguage";
import { useLongPress } from "../../hooks/useLongPress";
import { useRequest } from "../../hooks/useRequest";
import { useThemePreference } from "../../theme/ThemePreferenceProvider";
import { isNativeCapacitorPlatform } from "../../mobile/capacitor";
import {
  buildNativeMobileAuthUrl,
  clearMobileAuthSession,
  setForceNativeWelcome,
} from "../../mobile/mobileAuthSession";
import { openUrlInCapacitorBrowser } from "../../mobile/capacitor";
import { cancelNativeDailyReminderNotification } from "../../mobile/localNotifications";
import { SHOW_BILLING_UI } from "../../config/releaseFlags";
import {
  acceptGameModeUpgradeSuggestion,
  ApiError,
  changeCurrentUserGameMode,
  deleteCurrentAccount,
  getGameModeUpgradeSuggestion,
  setApiAuthTokenProvider,
  type ModerationTrackerConfig,
  type ModerationTrackerType,
} from "../../lib/api";
import { normalizeGameModeValue, type GameMode } from "../../lib/gameMode";
import { GAME_MODE_META, GAME_MODE_ORDER } from "../../lib/gameModeMeta";
import type { ResolvedTheme } from "../../theme/themePreference";
import {
  forwardRef,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type MenuPanel = "main" | "widgets";

interface DashboardMenuProps {
  currentGameMode: GameMode | string | null;
  onGameModeChanged: () => Promise<void> | void;
  onOpenScheduler?: () => void;
  moderation: {
    configs: Record<ModerationTrackerType, ModerationTrackerConfig> | null;
    enabledTypes: ModerationTrackerType[];
    isRefreshingWidgets: boolean;
    updateTrackerEnabled: (
      type: ModerationTrackerType,
      enabled: boolean,
    ) => Promise<void>;
    onOpenEdit: () => void;
  };
}



export function isDemandingModeJump(currentMode: GameMode | null, selectedMode: GameMode | null): boolean {
  if (!currentMode || !selectedMode) {
    return false;
  }

  const modeOrder: GameMode[] = ['Low', 'Chill', 'Flow', 'Evolve'];
  const currentIndex = modeOrder.indexOf(currentMode);
  const selectedIndex = modeOrder.indexOf(selectedMode);

  if (currentIndex < 0 || selectedIndex < 0) {
    return false;
  }

  return Math.abs(selectedIndex - currentIndex) > 1;
}


function toMetaModeKey(mode: GameMode): keyof typeof GAME_MODE_META {
  if (mode === "Low") return "Low";
  if (mode === "Chill") return "Chill";
  if (mode === "Flow") return "Flow";
  return "Evolve";
}

function getModeBannerObjectPosition(mode: GameMode): string {
  const positions: Record<GameMode, string> = {
    Low: '65% 45%',
    Chill: '60% 45%',
    Flow: '70% 45%',
    Evolve: '65% 50%',
  };
  return positions[mode];
}
export function getWidgetsRefreshingOverlayClass(theme: ResolvedTheme): string {
  return theme === "light"
    ? "bg-[color:var(--color-overlay-3)]"
    : "bg-[color:var(--color-slate-950-80)]";
}

function MenuIcon({
  children,
  className = "h-5 w-5 text-[color:var(--color-text-dim)]",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const DashboardMenuTrigger = forwardRef<
  HTMLButtonElement,
  { onClick: () => void; ariaLabel: string }
>(function DashboardMenuTrigger({ onClick, ariaLabel }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-2 text-[color:var(--color-text)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-overlay-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]/40"
      aria-label={ariaLabel}
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M4 7h16M4 12h16M4 17h12" />
      </svg>
    </button>
  );
});

function buildModerationSaveErrorMessage(error: unknown, fallback: string): string {

  if (error instanceof ApiError) {
    const apiMessage =
      typeof error.body?.message === "string" &&
      error.body.message.trim().length > 0
        ? error.body.message.trim()
        : null;
    const apiCode =
      typeof error.body?.code === "string" && error.body.code.trim().length > 0
        ? error.body.code.trim()
        : null;
    const requestId =
      typeof error.requestId === "string" && error.requestId.trim().length > 0
        ? error.requestId.trim()
        : null;

    const detailParts = [
      `HTTP ${error.status}`,
      apiCode ? `code: ${apiCode}` : null,
      requestId ? `requestId: ${requestId}` : null,
    ].filter(Boolean);

    if (apiMessage) {
      return `${fallback} ${apiMessage}${detailParts.length ? ` (${detailParts.join(" · ")})` : ""}`;
    }

    if (detailParts.length) {
      return `${fallback} ${detailParts.join(" · ")}.`;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return `${fallback} ${error.message.trim()}`;
  }

  return fallback;
}

export function DashboardMenu({
  currentGameMode,
  onGameModeChanged,
  onOpenScheduler,
  moderation,
}: DashboardMenuProps) {
  const { preference, setPreference, theme } = useThemePreference();
  const { language, setManualLanguage, t } = usePostLoginLanguage();
  const navigate = useNavigate();
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const { signOut } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const [isModerationOpen, setIsModerationOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<MenuPanel>("main");
  const [isGameModeOpen, setIsGameModeOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [isSavingMode, setIsSavingMode] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgradeSubmitting, setIsUpgradeSubmitting] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const modeUpgradeSuggestionRequest = useRequest(() => getGameModeUpgradeSuggestion(), [], {
    enabled: true,
  });
  const [gameModeError, setGameModeError] = useState<string | null>(null);
  const [pendingConfirmMode, setPendingConfirmMode] = useState<GameMode | null>(null);
  const [trackerOverrides, setTrackerOverrides] = useState<
    Partial<Record<ModerationTrackerType, boolean>>
  >({});

  const {
    isMobile,
    isIOS,
    isStandalone,
    toast,
    setToast,
    onQuickAccessClick,
    iosInstructionsOpen,
    closeIosInstructions,
  } = useQuickAccessInstall();
  const isNativeApp = isNativeCapacitorPlatform();

  useEffect(() => {
    setPortalNode(document.body);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);


  useEffect(() => {
    if (!toast) {
      return;
    }
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 2500);
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [toast, setToast]);

  const handleQuickAccessClick = useCallback(async () => {
    await onQuickAccessClick();
  }, [onQuickAccessClick]);

  const handleTriggerClick = useCallback(() => {
    void modeUpgradeSuggestionRequest.reload();
    setIsOpen(true);
  }, [modeUpgradeSuggestionRequest]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsPlansOpen(false);
    setIsModerationOpen(true);
    setActivePanel("main");
    setPendingConfirmMode(null);
    setIsGameModeOpen(false);
    setIsDeleteAccountOpen(false);
    setDeleteAccountConfirmation("");
    setDeleteAccountError(null);
    requestAnimationFrame(() => {
      triggerRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    if (!moderation.configs) {
      return;
    }

    setTrackerOverrides((current) => {
      let didChange = false;
      const next: Partial<Record<ModerationTrackerType, boolean>> = {
        ...current,
      };

      (Object.keys(current) as ModerationTrackerType[]).forEach((type) => {
        const localOverride = current[type];
        if (typeof localOverride !== "boolean") {
          return;
        }

        if (moderation.configs?.[type]?.isEnabled === localOverride) {
          delete next[type];
          didChange = true;
        }
      });

      return didChange ? next : current;
    });
  }, [moderation.configs]);

  const normalizedCurrentMode = useMemo(() => normalizeGameModeValue(currentGameMode), [currentGameMode]);
  const modeUpgradeSuggestion = modeUpgradeSuggestionRequest.data ?? null;
  const hasActiveUpgradeCta = Boolean(
    modeUpgradeSuggestion?.eligible_for_upgrade &&
      modeUpgradeSuggestion?.cta_enabled &&
      modeUpgradeSuggestion?.suggested_mode &&
      !modeUpgradeSuggestion?.accepted_at &&
      !modeUpgradeSuggestion?.dismissed_at,
  );
  const selectedOrCurrentMode = selectedMode ?? normalizedCurrentMode;
  const modeJumpIsDemanding = useMemo(
    () => isDemandingModeJump(normalizedCurrentMode, selectedOrCurrentMode),
    [normalizedCurrentMode, selectedOrCurrentMode],
  );

  const menuRowClassName =
    "flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[color:var(--color-text-dim)] transition hover:bg-[color:var(--color-overlay-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]/40";
  const menuCardClassName =
    "ib-card-contour-shadow relative z-10 rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-2)]";

  const handleOpenProfile = useCallback(() => {
    if (typeof openUserProfile === "function") {
      openUserProfile();
    }
    handleClose();
  }, [openUserProfile, handleClose]);

  const handleOpenScheduler = useCallback(() => {
    handleClose();
    onOpenScheduler?.();
  }, [handleClose, onOpenScheduler]);

  const handleOpenGameMode = useCallback(() => {
    if (hasActiveUpgradeCta) {
      setIsUpgradeModalOpen(true);
      return;
    }

    setSelectedMode(normalizedCurrentMode);
    setGameModeError(null);
    setPendingConfirmMode(null);
    setIsGameModeOpen(true);
  }, [hasActiveUpgradeCta, normalizedCurrentMode]);

  const handleCloseGameMode = useCallback(() => {
    if (isSavingMode) {
      return;
    }
    setIsGameModeOpen(false);
    setSelectedMode(null);
    setPendingConfirmMode(null);
    setGameModeError(null);
  }, [isSavingMode]);

  const handleConfirmGameMode = useCallback(async () => {
    if (!pendingConfirmMode || isSavingMode) {
      return;
    }

    const normalized = pendingConfirmMode.toUpperCase() as 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE';
    setIsSavingMode(true);
    setGameModeError(null);

    try {
      await changeCurrentUserGameMode(normalized);
      await onGameModeChanged();
      setIsGameModeOpen(false);
      setSelectedMode(null);
      setToast({
        tone: 'success',
        message: t('dashboard.menu.gameModeUpdated'),
      });
      handleClose();
    } catch (error) {
      console.error('[dashboard-menu] failed to change game mode', error);
      setGameModeError(buildModerationSaveErrorMessage(error, t('dashboard.menu.gameModeSaveError')));
    } finally {
      setIsSavingMode(false);
    }
  }, [handleClose, isSavingMode, onGameModeChanged, pendingConfirmMode, setToast, t]);


  const handleSelectGameMode = useCallback((mode: GameMode) => {
    setSelectedMode(mode);
    setPendingConfirmMode(mode);
  }, []);

  const handleCloseGameModeConfirm = useCallback(() => {
    if (isSavingMode) {
      return;
    }
    setPendingConfirmMode(null);
  }, [isSavingMode]);
  const handleAcceptUpgrade = useCallback(async () => {
    if (isUpgradeSubmitting) {
      return;
    }

    setIsUpgradeSubmitting(true);
    try {
      await acceptGameModeUpgradeSuggestion();
      await onGameModeChanged();
      await modeUpgradeSuggestionRequest.reload();
    } catch (error) {
      console.error('[dashboard-menu] failed to accept game mode upgrade', error);
      throw error;
    } finally {
      setIsUpgradeSubmitting(false);
    }
  }, [isUpgradeSubmitting, modeUpgradeSuggestionRequest, onGameModeChanged]);

  const handleSignOut = useCallback(async () => {
    handleClose();
    if (isNativeCapacitorPlatform()) {
      await openUrlInCapacitorBrowser(buildNativeMobileAuthUrl('logout'));
      return;
    }

    await signOut({ redirectUrl: "/" });
  }, [signOut, handleClose]);

  const deleteAccountKeyword = language === "en" ? "DELETE" : "ELIMINAR";
  const canConfirmAccountDeletion =
    deleteAccountConfirmation.trim().toUpperCase() === deleteAccountKeyword;

  const handleOpenDeleteAccount = useCallback(() => {
    setDeleteAccountConfirmation("");
    setDeleteAccountError(null);
    setIsDeleteAccountOpen(true);
  }, []);

  const handleCloseDeleteAccount = useCallback(() => {
    if (isDeletingAccount) {
      return;
    }

    setIsDeleteAccountOpen(false);
    setDeleteAccountConfirmation("");
    setDeleteAccountError(null);
  }, [isDeletingAccount]);

  const handleConfirmDeleteAccount = useCallback(async () => {
    if (!canConfirmAccountDeletion || isDeletingAccount) {
      return;
    }

    setIsDeletingAccount(true);
    setDeleteAccountError(null);

    try {
      await deleteCurrentAccount();

      if (isNativeCapacitorPlatform()) {
        await cancelNativeDailyReminderNotification();
        clearMobileAuthSession("account-deleted");
        setForceNativeWelcome(true);
        setApiAuthTokenProvider(null);
        handleClose();
        navigate("/", { replace: true });
        return;
      }

      try {
        await signOut({ redirectUrl: "/" });
      } catch (error) {
        console.warn("[dashboard-menu] Clerk signOut failed after account deletion", error);
        window.location.assign("/");
      }
    } catch (error) {
      console.error("[dashboard-menu] failed to delete account", error);
      setDeleteAccountError(buildModerationSaveErrorMessage(error, t("dashboard.menu.deleteAccountError")));
    } finally {
      setIsDeletingAccount(false);
    }
  }, [
    canConfirmAccountDeletion,
    handleClose,
    isDeletingAccount,
    navigate,
    signOut,
    t,
  ]);

  const handleGoToSubscription = useCallback(() => {
    handleClose();
    navigate("/subscription");
  }, [handleClose, navigate]);

  const handleGoToPricing = useCallback(() => {
    handleClose();
    navigate("/pricing");
  }, [handleClose, navigate]);

  const handleOverlayClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  const initials = useMemo(() => {
    if (!user) {
      return "";
    }
    if (user.firstName || user.lastName) {
      return `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase();
    }
    if (user.primaryEmailAddress?.emailAddress) {
      return user.primaryEmailAddress.emailAddress.slice(0, 2).toUpperCase();
    }
    return "";
  }, [user]);


  const trackerLabels: Record<ModerationTrackerType, string> = useMemo(() => ({
    alcohol: "Alcohol",
    tobacco: t('dashboard.moderation.tobacco'),
    sugar: t('dashboard.moderation.sugar'),
  }), [t]);

  const moderationLongPressBind = useLongPress({
    delayMs: 2200,
    onLongPress: moderation.onOpenEdit,
  });

  const isTrackerEnabled = useCallback(
    (type: ModerationTrackerType) => {
      const localOverride = trackerOverrides[type];
      if (typeof localOverride === "boolean") {
        return localOverride;
      }
      return Boolean(moderation.configs?.[type]?.isEnabled);
    },
    [moderation.configs, trackerOverrides],
  );

  const enabledTrackers = useMemo(
    () =>
      (["alcohol", "tobacco", "sugar"] as ModerationTrackerType[]).filter(
        (type) => isTrackerEnabled(type),
      ),
    [isTrackerEnabled],
  );

  const widgetsRefreshingOverlayClassName = useMemo(
    () => getWidgetsRefreshingOverlayClass(theme),
    [theme],
  );

  const handleThemeCycle = useCallback(() => {
    const nextPreference =
      preference === "auto"
        ? "light"
        : preference === "light"
          ? "dark"
          : "auto";
    setPreference(nextPreference);
  }, [preference, setPreference]);

  const themeToggleLabel =
    preference === "auto"
      ? `${t('dashboard.theme.auto')} (${theme === "dark" ? t('dashboard.theme.dark') : t('dashboard.theme.light')})`
      : theme === "dark"
        ? t('dashboard.theme.dark')
        : t('dashboard.theme.light');

  const handleTrackerToggle = useCallback(
    (type: ModerationTrackerType) => {
      if (moderation.isRefreshingWidgets) {
        return;
      }
      const nextValue = !isTrackerEnabled(type);
      setTrackerOverrides((current) => ({ ...current, [type]: nextValue }));
      void moderation.updateTrackerEnabled(type, nextValue).catch((error) => {
        console.error("[moderation-menu] failed to persist tracker toggle", {
          type,
          nextValue,
          error,
        });
        setTrackerOverrides((current) => ({ ...current, [type]: !nextValue }));
        setToast({
          tone: "error",
          message: buildModerationSaveErrorMessage(error, t('dashboard.menu.moderationSaveError')),
        });
      });
    },
    [isTrackerEnabled, moderation],
  );

  if (!isMounted || !portalNode) {
    return (
      <DashboardMenuTrigger ref={triggerRef} onClick={handleTriggerClick} ariaLabel={t('dashboard.nav.openMenu')} />
    );
  }

  return (
    <>
      <DashboardMenuTrigger ref={triggerRef} onClick={handleTriggerClick} ariaLabel={t('dashboard.nav.openMenu')} />
      {createPortal(
        <AnimatePresence>
          {isOpen ? (
            <motion.div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-1.5 backdrop-blur-md md:items-start md:justify-end md:p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleOverlayClick}
            >
              <motion.div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={t('dashboard.nav.mainMenu')}
                className="flex max-h-[92vh] w-full max-w-[420px] flex-col rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-slate-900-95)] p-5 text-[color:var(--color-text)] shadow-2xl transition"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-900/80 dark:text-text-muted">
                      {t('dashboard.nav.menu')}
                    </p>
                    <h2 className="font-display text-xl font-semibold">
                      {t('dashboard.nav.personalSpace')}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] p-2 text-sm text-[color:var(--color-text-dim)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-overlay-2)]"
                    aria-label={t('dashboard.nav.closeMenu')}
                  >
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    >
                      <path d="M6 6l12 12M18 6l-12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-4 px-1 pb-1">
                    <section className="flex items-center justify-between gap-3">
                      <div
                        role="radiogroup"
                        aria-label={t('dashboard.language.title')}
                        className="inline-flex items-center rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-slate-900-15)] p-1"
                      >
                        {([
                          { value: "es", label: "ES" },
                          { value: "en", label: "EN" },
                        ] as const).map((option) => {
                          const isActive = language === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="radio"
                              aria-checked={isActive}
                              aria-label={option.label}
                              onClick={() => setManualLanguage(option.value)}
                              className={`min-w-[3rem] rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.18em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]/40 ${
                                isActive
                                  ? "border border-white/35 bg-[color:var(--color-surface)] text-[color:var(--color-text-strong)]"
                                  : "border border-transparent text-[color:var(--color-text-faint)] hover:text-[color:var(--color-text)]"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={handleThemeCycle}
                        aria-label={`${t('dashboard.theme.appearance')}: ${themeToggleLabel}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-slate-900-15)] text-[color:var(--color-text-dim)] transition hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]/40"
                      >
                        {theme === "dark" ? (
                          <svg
                            aria-hidden="true"
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z" />
                          </svg>
                        ) : (
                          <svg
                            aria-hidden="true"
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <circle cx="12" cy="12" r="4" />
                            <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
                          </svg>
                        )}
                      </button>
                    </section>

                    <section className={`${menuCardClassName} px-2 py-1`}>
                      <button
                        type="button"
                        onClick={handleOpenProfile}
                        className={`${menuRowClassName} h-14`}
                      >
                      {user?.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt={t('dashboard.menu.avatarAlt')}
                          className="h-9 w-9 rounded-xl border border-[color:var(--color-border-soft)] object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] text-xs font-semibold uppercase text-[color:var(--color-text-dim)]">
                          {initials || "UX"}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[color:var(--color-text)]">
                          {user?.fullName || user?.username || t('dashboard.menu.profileFallback')}
                        </p>
                        {user?.primaryEmailAddress?.emailAddress ? (
                          <p className="truncate text-xs text-text-muted">
                            {user.primaryEmailAddress.emailAddress}
                          </p>
                        ) : null}
                      </div>
                      <MenuIcon className="h-4 w-4 text-[color:var(--color-text-faint)]">
                        <path d="M20 21a8 8 0 0 0-16 0" />
                        <circle cx="12" cy="8" r="4" />
                      </MenuIcon>
                      </button>
                    </section>

                    <section>
                      <div className={`${menuCardClassName} px-2 py-1`}>
                    <button
                      type="button"
                      onClick={handleOpenGameMode}
                      className={`${menuRowClassName} ${hasActiveUpgradeCta ? "border border-black/15 bg-gradient-to-r from-[#a770ef] via-[#cf8bf3] to-[#fdb99b] text-black shadow-[0_12px_26px_rgba(167,112,239,0.32)] dark:border-white/15 dark:text-black" : ""}`}
                    >
                      <MenuIcon>
                        <circle cx="12" cy="12" r="8" />
                        <path d="m12 7 3 3-3 3-3-3 3-3Z" />
                      </MenuIcon>
                      <div className="flex flex-1 items-center gap-2">
                        <span>{hasActiveUpgradeCta ? t('dashboard.menu.upgradeAvailable') : t('dashboard.menu.changeGameMode')}</span>
                        {hasActiveUpgradeCta ? <span className="rounded-full border border-black/20 bg-white/35 px-2 py-0.5 text-[10px] font-bold uppercase text-black shadow-[0_8px_20px_rgba(167,112,239,0.35)] backdrop-blur-sm">7d</span> : null}
                      </div>
                      <GameModeChip {...buildGameModeChip(normalizedCurrentMode ?? 'Flow')} />
                    </button>
                    <div className="mx-3 h-px bg-[color:var(--color-border-subtle)]/80" aria-hidden />
                    <button
                      type="button"
                      onClick={handleOpenScheduler}
                      className={menuRowClassName}
                    >
                      <MenuIcon>
                        <path d="M6 9a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10 20a2 2 0 0 0 4 0" />
                      </MenuIcon>
                      <span className="flex-1">{t('dashboard.menu.reminder')}</span>
                    </button>
                    {SHOW_BILLING_UI ? (
                      <>
                        <div className="mx-3 h-px bg-[color:var(--color-border-subtle)]/80" aria-hidden />
                        <button
                          type="button"
                          onClick={() => setIsPlansOpen((current) => !current)}
                          className={menuRowClassName}
                          aria-expanded={isPlansOpen}
                          aria-controls="menu-planes"
                        >
                          <MenuIcon>
                            <rect x="3" y="5" width="18" height="14" rx="2" />
                            <path d="M3 10h18" />
                          </MenuIcon>
                          <span className="flex-1">{t('dashboard.menu.plans')}</span>
                          <MenuIcon
                            className={`h-4 w-4 text-[color:var(--color-text-faint)] transition ${isPlansOpen ? "rotate-180" : ""}`}
                          >
                            <path d="m6 9 6 6 6-6" />
                          </MenuIcon>
                        </button>
                        {isPlansOpen ? (
                          <div
                            id="menu-planes"
                            className="-mt-1 mb-1 space-y-1 px-3 pb-2 pl-11"
                          >
                            <button
                              type="button"
                              onClick={handleGoToSubscription}
                              className="flex h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-[color:var(--color-text-dim)] transition hover:bg-[color:var(--color-overlay-2)]"
                            >
                              <MenuIcon className="h-4 w-4 text-[color:var(--color-text-faint)]">
                                <path d="M12 3a4 4 0 0 0-4 4v2" />
                                <path d="M8 12v-1a4 4 0 1 1 8 0v1" />
                                <rect x="5" y="12" width="14" height="9" rx="2" />
                              </MenuIcon>
                              {t('dashboard.menu.subscription')}
                            </button>
                            <button
                              type="button"
                              onClick={handleGoToPricing}
                              className="flex h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-[color:var(--color-text-dim)] transition hover:bg-[color:var(--color-overlay-2)]"
                            >
                              <MenuIcon className="h-4 w-4 text-[color:var(--color-text-faint)]">
                                <path d="M6 19V9" />
                                <path d="M12 19V5" />
                                <path d="M18 19v-7" />
                                <path d="M4 19h16" />
                              </MenuIcon>
                              Pricing
                            </button>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    <div className="mx-3 h-px bg-[color:var(--color-border-subtle)]/80" aria-hidden />
                      <button
                        type="button"
                        onClick={() => setActivePanel("widgets")}
                        className={menuRowClassName}
                      >
                        <MenuIcon>
                          <rect x="4" y="4" width="7" height="7" rx="1.5" />
                          <rect x="13" y="4" width="7" height="7" rx="1.5" />
                          <rect x="4" y="13" width="7" height="7" rx="1.5" />
                          <rect x="13" y="13" width="7" height="7" rx="1.5" />
                        </MenuIcon>
                        <span className="flex-1">{t('dashboard.menu.widgets')}</span>
                        <MenuIcon className="h-4 w-4 text-[color:var(--color-text-faint)]">
                          <path d="m9 6 6 6-6 6" />
                        </MenuIcon>
                      </button>
                    {activePanel === "widgets" ? (
                      <div
                        id="menu-widgets"
                        className="-mt-1 mb-1 space-y-3 px-3 pb-2 pl-3"
                      >
                        <div className="flex items-center gap-2 pb-1">
                          <button
                            type="button"
                            onClick={() => setActivePanel("main")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] text-[color:var(--color-widget-menu-heading)] transition hover:bg-[color:var(--color-overlay-2)]"
                            aria-label={t('dashboard.menu.backToMenu')}
                          >
                            <MenuIcon className="h-4 w-4 text-[color:var(--color-widget-menu-heading)]">
                              <path d="m15 6-6 6 6 6" />
                            </MenuIcon>
                          </button>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-widget-menu-heading)]">
                            {t('dashboard.menu.widgets')}
                          </p>
                        </div>

                        <div className="relative">
                          <p className="mb-1 text-xs text-[color:var(--color-widget-menu-label)]">
                            {t('dashboard.menu.activeWidgets')}
                          </p>
                          {enabledTrackers.length > 0 && moderation.configs ? (
                            <button
                              type="button"
                              className="w-full text-left"
                              onClick={moderation.onOpenEdit}
                              {...moderationLongPressBind}
                            >
                              <ModerationPreviewWidget
                                title={t('dashboard.menu.moderation')}
                                configs={moderation.configs}
                                onEdit={moderation.onOpenEdit}
                                compact
                                showHeader={false}
                              />
                            </button>
                          ) : (
                            <p className="rounded-xl border border-dashed border-[color:var(--color-border-soft)] px-3 py-2 text-xs text-[color:var(--color-widget-menu-label)]">
                              {t('dashboard.menu.noActiveWidgets')}
                            </p>
                          )}
                          {moderation.isRefreshingWidgets ? (
                            <div
                              className={`pointer-events-none absolute inset-x-0 bottom-0 top-5 animate-pulse rounded-xl border border-[color:var(--color-border-subtle)] ${widgetsRefreshingOverlayClassName}`}
                            />
                          ) : null}
                        </div>

                        <div className="relative">
                          <p className="mb-1 text-xs text-[color:var(--color-widget-menu-label)]">
                            {t('dashboard.menu.availableWidgets')}
                          </p>
                          <div className="rounded-xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)]">
                            <div className="flex items-start gap-2 px-3 py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setIsModerationOpen((current) => !current)
                                }
                                className="flex min-w-0 flex-1 items-start gap-2 text-left"
                                aria-expanded={isModerationOpen}
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm text-[color:var(--color-widget-menu-item-title)]">
                                    {t('dashboard.menu.moderation')}
                                  </span>
                                  <span className="block text-xs text-[color:var(--color-widget-menu-label)]">
                                    {t('dashboard.menu.moderationSubtitle')}
                                  </span>
                                  {enabledTrackers.length > 0 ? (
                                    <span className="mt-1 inline-block rounded-full border border-[color:var(--color-widget-chip-active-border)] bg-[color:var(--color-widget-chip-active-bg)] px-2 py-0.5 text-[10px] text-[color:var(--color-widget-chip-active-text)]">
                                      {t('dashboard.menu.configured')}
                                    </span>
                                  ) : null}
                                </span>
                                <MenuIcon
                                  className={`mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-widget-menu-icon)] transition ${isModerationOpen ? "rotate-180" : ""}`}
                                >
                                  <path d="m6 9 6 6 6-6" />
                                </MenuIcon>
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  moderation.onOpenEdit();
                                }}
                                className="rounded-md border border-[color:var(--color-widget-edit-border)] bg-[color:var(--color-widget-edit-bg)] px-2 py-1 text-xs text-[color:var(--color-widget-edit-text)] transition hover:bg-[color:var(--color-widget-edit-hover-bg)]"
                                aria-label={t('a11y.action.editModeration')}
                              >
                                {t('dashboard.action.edit')}
                              </button>
                            </div>

                            {isModerationOpen ? (
                              <div className="space-y-2 border-t border-[color:var(--color-border-subtle)] px-3 py-3">
                                <div className="flex flex-wrap gap-2">
                                  {(
                                    [
                                      "alcohol",
                                      "tobacco",
                                      "sugar",
                                    ] as ModerationTrackerType[]
                                  ).map((type) => {
                                    const isSelected = isTrackerEnabled(type);
                                    return (
                                      <button
                                        key={type}
                                        type="button"
                                        title={
                                          type === "sugar"
                                            ? t('dashboard.menu.sugarAdded')
                                            : undefined
                                        }
                                        onClick={() =>
                                          handleTrackerToggle(type)
                                        }
                                        disabled={
                                          moderation.isRefreshingWidgets
                                        }
                                        className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                                          isSelected
                                            ? "border-[color:var(--color-widget-chip-active-border)] bg-[color:var(--color-widget-chip-active-bg)] text-[color:var(--color-widget-chip-active-text)] shadow-[0_0_0_1px_var(--color-widget-chip-active-outline)]"
                                            : "border-[color:var(--color-widget-chip-border)] bg-[color:var(--color-widget-chip-bg)] text-[color:var(--color-widget-chip-text)] hover:bg-[color:var(--color-widget-chip-hover-bg)]"
                                        } disabled:cursor-wait disabled:opacity-80`}
                                      >
                                        <ModerationTrackerIcon
                                          type={type}
                                          className={`h-3.5 w-3.5 ${
                                            isSelected
                                              ? "text-[color:var(--color-widget-chip-active-icon)]"
                                              : "text-[color:var(--color-widget-chip-icon)]"
                                          }`}
                                        />
                                        {isSelected ? (
                                          <span className="text-[11px] font-bold text-[color:var(--color-widget-chip-active-icon)]">
                                            ✓
                                          </span>
                                        ) : null}
                                        <span>{trackerLabels[type]}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                <p className="text-[11px] text-[color:var(--color-widget-menu-label)]">
                                  {t('dashboard.moderation.sugarHint')}
                                </p>
                              </div>
                            ) : null}
                          </div>
                          {moderation.isRefreshingWidgets ? (
                            <div
                              className={`pointer-events-none absolute inset-x-0 bottom-0 top-5 animate-pulse rounded-xl border border-[color:var(--color-border-subtle)] ${widgetsRefreshingOverlayClassName}`}
                            />
                          ) : null}
                        </div>

                        <p className="text-[11px] text-[color:var(--color-widget-menu-label)]">
                          {t('dashboard.moderation.tipLongPress')}
                        </p>
                      </div>
                    ) : null}
                      </div>
                    </section>

                  {isMobile && !isNativeApp ? (
                    <section className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-quickaccess-bg)] p-4">
                      <div className="mb-3 flex items-center gap-2 text-[color:var(--color-quickaccess-text)]">
                        <MenuIcon className="h-4 w-4 text-[color:var(--color-quickaccess-text)]">
                          <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
                        </MenuIcon>
                        <p className="text-[0.65rem] uppercase tracking-[0.3em] text-[color:var(--color-quickaccess-label)]">
                          {t('dashboard.menu.quickAccess')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleQuickAccessClick}
                        disabled={isStandalone}
                        className="flex h-12 w-full items-center justify-between rounded-xl border border-[color:var(--color-quickaccess-cta-border)] bg-[color:var(--color-quickaccess-cta-bg)] px-4 text-left text-sm font-semibold text-[color:var(--color-quickaccess-cta-text)] transition hover:border-[color:var(--color-quickaccess-cta-hover-border)] hover:bg-[color:var(--color-quickaccess-cta-hover-bg)] disabled:cursor-not-allowed disabled:border-[color:var(--color-quickaccess-cta-disabled-border)] disabled:bg-[color:var(--color-quickaccess-cta-disabled-bg)] disabled:text-[color:var(--color-quickaccess-cta-disabled-text)]"
                      >
                        <span>
                          {isStandalone
                            ? t('dashboard.menu.quickAccessActive')
                            : t('dashboard.menu.quickAccessAdd')}
                        </span>
                        {isStandalone ? (
                          <MenuIcon className="h-4 w-4 text-[color:var(--color-quickaccess-cta-text)]">
                            <path d="m5 12 4 4 10-10" />
                          </MenuIcon>
                        ) : null}
                      </button>
                      {toast ? (
                        <ToastBanner
                          tone={toast.tone}
                          message={toast.message}
                          className="mt-3"
                        />
                      ) : null}
                    </section>
                  ) : null}
                  </div>
                </div>

                {isGameModeOpen ? (
                  <div className="absolute inset-0 z-20 flex items-end bg-black/40 p-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] md:items-center">
                    <div
                      className="flex w-full min-h-0 max-h-[92vh] flex-col overflow-hidden rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-slate-900-95)] p-4 shadow-2xl"
                      style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 1rem)' }}
                    >
                      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-faint)]">{t('dashboard.menu.gameMode')}</p>
                          <h3 className="text-base font-semibold text-[color:var(--color-text)]">{t('dashboard.menu.chooseGameMode')}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={handleCloseGameMode}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] text-[color:var(--color-text-dim)]"
                          aria-label={t('dashboard.nav.closeMenu')}
                        >
                          <MenuIcon className="h-4 w-4 text-[color:var(--color-text-dim)]">
                            <path d="M6 6l12 12M18 6 6 18" />
                          </MenuIcon>
                        </button>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                            {GAME_MODE_ORDER.map((mode) => {
                              const isSelected = (selectedOrCurrentMode ?? 'Flow') === mode;
                              const isCurrent = (normalizedCurrentMode ?? 'Flow') === mode;
                              const content = GAME_MODE_META[toMetaModeKey(mode)];
                              return (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => handleSelectGameMode(mode)}
                                  className={`relative overflow-hidden rounded-2xl border px-3 py-3 text-left transition ${isSelected ? 'border-[color:var(--color-accent-primary)] bg-[color:var(--color-overlay-3)] shadow-[0_0_0_1px_rgba(125,211,252,0.65),0_0_20px_rgba(56,189,248,0.2)]' : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] hover:bg-[color:var(--color-overlay-2)]'}`}
                                >
                                  <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: content.accentColor }} aria-hidden />
                                  <div className="ml-2 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-semibold text-[color:var(--color-text)]">{mode}</p>
                                      <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-dim)]">
                                        {content.frequency[language]}
                                      </span>
                                    </div>
                                    <img
                                      src={content.avatarSrc}
                                      alt={content.avatarAlt[language]}
                                      className="h-20 w-full rounded-xl border border-white/10 object-cover"
                                      style={{ objectPosition: getModeBannerObjectPosition(mode) }}
                                      loading="lazy"
                                    />
                                    <p className="line-clamp-2 text-[11px] text-[color:var(--color-text-dim)]">{content.objective[language]}</p>
                                    {isCurrent ? (
                                      <span className="inline-flex rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                                        {t('dashboard.menu.currentGameMode')}
                                      </span>
                                    ) : null}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {modeJumpIsDemanding ? (
                            <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                              {t('dashboard.menu.gameModeDemandingWarning')}
                            </p>
                          ) : null}

                          {gameModeError ? (
                            <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                              {gameModeError}
                            </p>
                          ) : null}

                          {pendingConfirmMode ? (
                            <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-2)] p-3">
                              <p className="text-sm text-[color:var(--color-text)]">
                                {t('dashboard.menu.gameModeConfirmPrompt', { mode: pendingConfirmMode })}
                              </p>
                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleCloseGameModeConfirm}
                                  className="flex-1 rounded-xl border border-[color:var(--color-border-subtle)] px-3 py-2 text-sm text-[color:var(--color-text-dim)]"
                                  disabled={isSavingMode}
                                >
                                  {t('dashboard.menu.cancel')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleConfirmGameMode()}
                                  className="flex-1 rounded-xl border border-[color:var(--color-accent-primary)] bg-[color:var(--color-accent-primary)]/20 px-3 py-2 text-sm font-semibold text-[color:var(--color-text)] disabled:opacity-60"
                                  disabled={isSavingMode}
                                >
                                  {isSavingMode ? t('dashboard.menu.gameModeSaving') : t('dashboard.menu.confirmChange')}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}


                {isDeleteAccountOpen ? (
                  <div className="absolute inset-0 z-30 flex items-end bg-black/55 p-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] backdrop-blur-sm md:items-center">
                    <div
                      role="alertdialog"
                      aria-modal="true"
                      aria-label={t("dashboard.menu.deleteAccountTitle")}
                      className="w-full rounded-3xl border border-rose-300/30 bg-[color:var(--color-slate-900-95)] p-4 shadow-2xl"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-300">
                            {t("dashboard.menu.deleteAccountEyebrow")}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-[color:var(--color-text)]">
                            {t("dashboard.menu.deleteAccountTitle")}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={handleCloseDeleteAccount}
                          disabled={isDeletingAccount}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] text-[color:var(--color-text-dim)] disabled:opacity-50"
                          aria-label={t("dashboard.menu.cancel")}
                        >
                          <MenuIcon className="h-4 w-4 text-[color:var(--color-text-dim)]">
                            <path d="M6 6l12 12M18 6 6 18" />
                          </MenuIcon>
                        </button>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-[color:var(--color-text-dim)]">
                        {t("dashboard.menu.deleteAccountBody")}
                      </p>

                      <label className="mt-4 block text-left">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-faint)]">
                          {t("dashboard.menu.deleteAccountConfirmLabel", { keyword: deleteAccountKeyword })}
                        </span>
                        <input
                          value={deleteAccountConfirmation}
                          onChange={(event) => setDeleteAccountConfirmation(event.target.value)}
                          disabled={isDeletingAccount}
                          autoCapitalize="characters"
                          autoComplete="off"
                          spellCheck={false}
                          className="mt-2 h-12 w-full rounded-2xl border border-rose-300/25 bg-rose-950/20 px-4 text-sm font-semibold uppercase tracking-[0.12em] text-white outline-none transition placeholder:text-white/25 focus:border-rose-200/60 focus:ring-2 focus:ring-rose-400/20 disabled:opacity-60"
                          placeholder={deleteAccountKeyword}
                        />
                      </label>

                      {deleteAccountError ? (
                        <p className="mt-3 rounded-2xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-100">
                          {deleteAccountError}
                        </p>
                      ) : null}

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={handleCloseDeleteAccount}
                          disabled={isDeletingAccount}
                          className="flex-1 rounded-2xl border border-[color:var(--color-border-subtle)] px-3 py-3 text-sm font-semibold text-[color:var(--color-text-dim)] transition hover:bg-[color:var(--color-overlay-2)] disabled:opacity-60"
                        >
                          {t("dashboard.menu.cancel")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleConfirmDeleteAccount()}
                          disabled={!canConfirmAccountDeletion || isDeletingAccount}
                          className="flex-1 rounded-2xl border border-rose-300/30 bg-rose-500/20 px-3 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {isDeletingAccount
                            ? t("dashboard.menu.deleteAccountDeleting")
                            : t("dashboard.menu.deleteAccountConfirm")}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-4 flex h-12 w-full items-center gap-3 rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-2)] px-4 text-sm font-semibold text-[color:var(--color-text-dim)] transition hover:bg-[color:var(--color-overlay-3)]"
                >
                  <MenuIcon className="h-5 w-5 text-[color:var(--color-text-dim)]">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </MenuIcon>
                  <span>{t('dashboard.menu.signOut')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenDeleteAccount}
                  className="mt-2 flex h-10 w-full items-center gap-3 rounded-2xl px-4 text-sm font-normal text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40"
                >
                  <MenuIcon className="h-5 w-5 text-rose-300">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5M14 11v5" />
                  </MenuIcon>
                  <span>{t("dashboard.menu.deleteAccount")}</span>
                </button>
                {iosInstructionsOpen && isIOS && !isNativeApp ? (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('dashboard.quickAccess.iosDialogAria')}
                    className="absolute inset-x-4 bottom-4 rounded-3xl border border-[color:var(--color-ios-quick-access-modal-border)] bg-[color:var(--color-ios-quick-access-modal-surface)] p-5 shadow-[var(--shadow-elev-2)]"
                  >
                    <p className="text-sm font-semibold text-[color:var(--color-ios-quick-access-modal-text)]">
                      {t('dashboard.quickAccess.title')}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-ios-quick-access-modal-text-muted)]">
                      {t('dashboard.quickAccess.subtitle')}
                    </p>
                    <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-[color:var(--color-ios-quick-access-modal-text-muted)]">
                      <li className="flex flex-wrap items-center gap-2">
                        <span>{t('dashboard.quickAccess.tap')}</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-ios-quick-access-modal-chip-border)] bg-[color:var(--color-ios-quick-access-modal-chip-bg)] px-2 py-0.5 text-xs font-medium text-[color:var(--color-ios-quick-access-modal-chip-text)]">
                          <svg
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none" />
                            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                            <circle cx="18" cy="12" r="1.5" fill="currentColor" stroke="none" />
                          </svg>
                        </span>
                      </li>
                      <li className="flex flex-wrap items-center gap-2">
                        <span>{t('dashboard.quickAccess.tap')}</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-ios-quick-access-modal-chip-border)] bg-[color:var(--color-ios-quick-access-modal-chip-bg)] px-2 py-0.5 text-xs font-medium text-[color:var(--color-ios-quick-access-modal-chip-text)]">
                          <svg
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="7" y="7" width="10" height="14" rx="2" />
                            <path d="M12 3v10" />
                            <path d="m9 6 3-3 3 3" />
                          </svg>
                        </span>
                      </li>
                      <li className="flex flex-wrap items-center gap-2">
                        <span>{t('dashboard.quickAccess.scrollUp')}</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-ios-quick-access-modal-chip-border)] bg-[color:var(--color-ios-quick-access-modal-chip-bg)] px-2 py-0.5 text-xs font-medium text-[color:var(--color-ios-quick-access-modal-chip-text)]">
                          <svg
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 19V5" />
                            <path d="m7 10 5-5 5 5" />
                          </svg>
                        </span>
                      </li>
                      <li className="flex flex-wrap items-center gap-2">
                        <span>{t('dashboard.quickAccess.select')}</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-ios-quick-access-modal-chip-border)] bg-[color:var(--color-ios-quick-access-modal-chip-bg)] px-2 py-0.5 text-xs font-medium text-[color:var(--color-ios-quick-access-modal-chip-text)]">
                          <svg
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="4" y="4" width="16" height="16" rx="3" />
                            <path d="M12 8v8" />
                            <path d="M8 12h8" />
                          </svg>
                        </span>
                      </li>
                      <li>{t('dashboard.quickAccess.stepAdd')}</li>
                    </ol>
                    {/* iOS Safari y navegadores iOS no permiten abrir Share Sheet ni instalar de forma programática. */}
                    <button
                      type="button"
                      onClick={closeIosInstructions}
                      className="mt-4 w-full rounded-full border border-[color:var(--color-ios-quick-access-modal-button-border)] bg-[color:var(--color-ios-quick-access-modal-button-bg)] px-3 py-2 text-sm text-[color:var(--color-ios-quick-access-modal-button-text)] transition hover:bg-[color:var(--color-ios-quick-access-modal-button-hover-bg)]"
                    >
                      {t('dashboard.quickAccess.gotIt')}
                    </button>
                  </div>
                ) : null}
                <UpgradeRecommendationModal
                  open={isUpgradeModalOpen && hasActiveUpgradeCta}
                  currentMode={modeUpgradeSuggestion?.current_mode ?? null}
                  nextMode={modeUpgradeSuggestion?.suggested_mode ?? null}
                  isSubmitting={isUpgradeSubmitting}
                  onConfirm={handleAcceptUpgrade}
                  onClose={() => setIsUpgradeModalOpen(false)}
                  onOpenAllModes={() => {
                    setIsUpgradeModalOpen(false);
                    setSelectedMode(normalizedCurrentMode);
                    setGameModeError(null);
                    setPendingConfirmMode(null);
                    setIsGameModeOpen(true);
                  }}
                />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        portalNode,
      )}
    </>
  );
}

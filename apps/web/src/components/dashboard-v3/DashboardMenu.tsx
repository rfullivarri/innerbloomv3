import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ToastBanner } from "../common/ToastBanner";
import { ModerationWidget as ModerationPreviewWidget } from "./ModerationWidget";
import { ModerationTrackerIcon } from "../moderation/trackerMeta";
import { useQuickAccessInstall } from "../../hooks/useQuickAccessInstall";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useLongPress } from "../../hooks/useLongPress";
import { useThemePreference } from "../../theme/ThemePreferenceProvider";
import {
  ApiError,
  type ModerationTrackerConfig,
  type ModerationTrackerType,
} from "../../lib/api";
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
  { onClick: () => void }
>(function DashboardMenuTrigger({ onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-2 text-[color:var(--color-text)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-overlay-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]/40"
      aria-label="Abrir menú"
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

function buildModerationSaveErrorMessage(error: unknown): string {
  const fallback =
    "No se pudo guardar Moderación. Revisa tu conexión e inténtalo otra vez.";

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
  onOpenScheduler,
  moderation,
}: DashboardMenuProps) {
  const { theme } = useThemePreference();
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
  const [isSpanishSystem, setIsSpanishSystem] = useState(true);
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const [isModerationOpen, setIsModerationOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<MenuPanel>("main");
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

  useEffect(() => {
    setPortalNode(document.body);
    setIsMounted(true);

    const browserLanguages = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
    const prefersSpanish = browserLanguages.some((lang) =>
      lang?.toLowerCase().startsWith("es"),
    );
    setIsSpanishSystem(prefersSpanish);
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
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsPlansOpen(false);
    setIsModerationOpen(true);
    setActivePanel("main");
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

  const menuRowClassName =
    "flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[color:var(--color-text-dim)] transition hover:bg-[color:var(--color-overlay-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]/40";

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

  const handleSignOut = useCallback(async () => {
    handleClose();
    await signOut({ redirectUrl: "/" });
  }, [signOut, handleClose]);

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

  const quickAccessLabels = useMemo(
    () =>
      isSpanishSystem
        ? {
            title: "Para añadir acceso rápido",
            tap: "Toca",
            scrollUp: "Scrollear para arriba",
            stepShare: "Compartir",
            stepAddToHome: "Añadir a pantalla de inicio",
            stepAdd: "Añadir",
            gotIt: "Entendido",
          }
        : {
            title: "To add quick access",
            tap: "Tap",
            scrollUp: "Scroll up",
            stepShare: "Share",
            stepAddToHome: "Add to Home Screen",
            stepAdd: "Add",
            gotIt: "Got it",
          },
    [isSpanishSystem],
  );

  const trackerLabels: Record<ModerationTrackerType, string> = {
    alcohol: "Alcohol",
    tobacco: "Tabaco",
    sugar: "Azúcar",
  };

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
          message: buildModerationSaveErrorMessage(error),
        });
      });
    },
    [isTrackerEnabled, moderation],
  );

  if (!isMounted || !portalNode) {
    return (
      <DashboardMenuTrigger ref={triggerRef} onClick={handleTriggerClick} />
    );
  }

  return (
    <>
      <DashboardMenuTrigger ref={triggerRef} onClick={handleTriggerClick} />
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
                aria-label="Menú principal"
                className="flex max-h-[92vh] w-full max-w-[420px] flex-col rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-slate-900-95)] p-5 text-[color:var(--color-text)] shadow-2xl transition"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-900/80 dark:text-text-muted">
                      Menú
                    </p>
                    <h2 className="font-display text-xl font-semibold">
                      Tu espacio personal
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] p-2 text-sm text-[color:var(--color-text-dim)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-overlay-2)]"
                    aria-label="Cerrar menú"
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
                <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                  <ThemeSwitcher />

                  <section className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-2 py-1">
                    <button
                      type="button"
                      onClick={handleOpenProfile}
                      className={`${menuRowClassName} h-14`}
                    >
                      {user?.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt="Avatar"
                          className="h-9 w-9 rounded-xl border border-[color:var(--color-border-soft)] object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] text-xs font-semibold uppercase text-[color:var(--color-text-dim)]">
                          {initials || "UX"}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[color:var(--color-text)]">
                          {user?.fullName || user?.username || "Tu perfil"}
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

                  <section className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-2 py-1">
                    <button
                      type="button"
                      onClick={handleOpenScheduler}
                      className={menuRowClassName}
                    >
                      <MenuIcon>
                        <path d="M6 9a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10 20a2 2 0 0 0 4 0" />
                      </MenuIcon>
                      <span className="flex-1">Recordatorio</span>
                    </button>
                    <div className="mx-3 h-px bg-[color:var(--color-border-subtle)]" />
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
                      <span className="flex-1">Planes</span>
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
                          Suscripción
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
                    <div className="mx-3 h-px bg-[color:var(--color-border-subtle)]" />
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
                      <span className="flex-1">Widgets</span>
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
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] text-[color:var(--color-text-dim)] transition hover:bg-[color:var(--color-overlay-2)] dark:text-white"
                            aria-label="Volver al menú"
                          >
                            <MenuIcon className="h-4 w-4 text-[color:var(--color-text-dim)] dark:text-white">
                              <path d="m15 6-6 6 6 6" />
                            </MenuIcon>
                          </button>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 dark:text-white">
                            Widgets
                          </p>
                        </div>

                        <div className="relative">
                          <p className="mb-1 text-xs text-slate-600 dark:text-white">
                            Widgets activos
                          </p>
                          {enabledTrackers.length > 0 && moderation.configs ? (
                            <button
                              type="button"
                              className="w-full text-left"
                              onClick={moderation.onOpenEdit}
                              {...moderationLongPressBind}
                            >
                              <ModerationPreviewWidget
                                title="Moderación"
                                configs={moderation.configs}
                                onEdit={moderation.onOpenEdit}
                                compact
                                showHeader={false}
                              />
                            </button>
                          ) : (
                            <p className="rounded-xl border border-dashed border-[color:var(--color-border-soft)] px-3 py-2 text-xs text-slate-600 dark:text-white">
                              Sin widgets activos.
                            </p>
                          )}
                          {moderation.isRefreshingWidgets ? (
                            <div
                              className={`pointer-events-none absolute inset-x-0 bottom-0 top-5 animate-pulse rounded-xl border border-[color:var(--color-border-subtle)] ${widgetsRefreshingOverlayClassName}`}
                            />
                          ) : null}
                        </div>

                        <div className="relative">
                          <p className="mb-1 text-xs text-slate-600 dark:text-white">
                            Widgets disponibles
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
                                  <span className="block text-sm text-slate-900 dark:text-white">
                                    Moderación
                                  </span>
                                  <span className="block text-xs text-slate-600 dark:text-white">
                                    Alcohol, tabaco y azúcar
                                  </span>
                                  {enabledTrackers.length > 0 ? (
                                    <span className="mt-1 inline-block rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800 dark:border-emerald-300/40 dark:bg-emerald-400/20 dark:text-emerald-100">
                                      Configurado
                                    </span>
                                  ) : null}
                                </span>
                                <MenuIcon
                                  className={`mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition dark:text-white ${isModerationOpen ? "rotate-180" : ""}`}
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
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-white/55 dark:text-white dark:hover:bg-white/10"
                                aria-label="Editar configuración de Moderación"
                              >
                                Editar
                              </button>
                            </div>

                            {isModerationOpen ? (
                              <div className="space-y-2 border-t border-[color:var(--color-border-subtle)] px-3 py-3 dark:border-white/10">
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
                                            ? "Azúcar añadido"
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
                                            ? "border-emerald-400 bg-emerald-100 text-emerald-900 shadow-[0_0_0_1px_rgba(52,211,153,0.2)] dark:border-emerald-300 dark:bg-emerald-400/10 dark:text-white dark:shadow-[0_0_0_1px_rgba(52,211,153,0.5)]"
                                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/55 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
                                        } disabled:cursor-wait disabled:opacity-80`}
                                      >
                                        <ModerationTrackerIcon
                                          type={type}
                                          className={`h-3.5 w-3.5 ${
                                            isSelected
                                              ? "text-emerald-700 dark:text-white"
                                              : "text-slate-500 dark:text-white"
                                          }`}
                                        />
                                        {isSelected ? (
                                          <span className="text-[11px] font-bold text-emerald-700 dark:text-white">
                                            ✓
                                          </span>
                                        ) : null}
                                        <span>{trackerLabels[type]}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-white">
                                  Azúcar: seguimiento de azúcar añadido.
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

                        <p className="text-[11px] text-slate-600 dark:text-white">
                          Tip: mantené presionado un widget para editarlo.
                        </p>
                      </div>
                    ) : null}
                  </section>

                  {isMobile ? (
                    <section className="rounded-2xl border border-violet-200/85 bg-violet-50/70 p-4 dark:border-violet-300/28 dark:bg-violet-500/14">
                      <div className="mb-3 flex items-center gap-2 text-violet-700 dark:text-violet-200/80">
                        <MenuIcon className="h-4 w-4 text-violet-700 dark:text-violet-200/80">
                          <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
                        </MenuIcon>
                        <p className="text-[0.65rem] uppercase tracking-[0.3em] text-violet-500 dark:text-violet-300/75">
                          Acceso rápido
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleQuickAccessClick}
                        disabled={isStandalone}
                        className="flex h-12 w-full items-center justify-between rounded-xl border border-violet-300/70 bg-violet-100/45 px-4 text-left text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100/65 disabled:cursor-not-allowed disabled:opacity-80 dark:border-violet-300/35 dark:bg-violet-400/16 dark:text-violet-200/88 dark:hover:border-violet-200/45 dark:hover:bg-violet-400/22"
                      >
                        <span>
                          {isStandalone
                            ? "Acceso rápido activo"
                            : "Añadir acceso rápido"}
                        </span>
                        {isStandalone ? (
                          <MenuIcon className="h-4 w-4 text-violet-700 dark:text-violet-200/88">
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
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-4 flex h-12 w-full items-center gap-3 rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-4 text-sm font-semibold text-[color:var(--color-text-dim)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-overlay-2)]"
                >
                  <MenuIcon className="h-5 w-5 text-[color:var(--color-text-dim)]">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </MenuIcon>
                  <span>Cerrar sesión</span>
                </button>
                {iosInstructionsOpen && isIOS ? (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Cómo añadir acceso rápido en iOS"
                    className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/20 bg-[#000c40] p-4 shadow-2xl"
                  >
                    <p className="text-sm font-semibold text-white">
                      {quickAccessLabels.title}
                    </p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-white/85">
                      <li className="flex flex-wrap items-center gap-2">
                        <span>{quickAccessLabels.tap}</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
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
                        <span>{quickAccessLabels.tap}</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
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
                          {quickAccessLabels.stepShare}
                        </span>
                      </li>
                      <li className="flex flex-wrap items-center gap-2">
                        <span>{quickAccessLabels.scrollUp}</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
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
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
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
                          {quickAccessLabels.stepAddToHome}
                        </span>
                      </li>
                      <li>{quickAccessLabels.stepAdd}</li>
                    </ol>
                    {/* iOS Safari y navegadores iOS no permiten abrir Share Sheet ni instalar de forma programática. */}
                    <button
                      type="button"
                      onClick={closeIosInstructions}
                      className="mt-3 w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm text-white"
                    >
                      {quickAccessLabels.gotIt}
                    </button>
                  </div>
                ) : null}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        portalNode,
      )}
    </>
  );
}

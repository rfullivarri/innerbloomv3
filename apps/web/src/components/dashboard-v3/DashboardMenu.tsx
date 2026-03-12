import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { usePostLoginLanguage } from "../../i18n/postLoginLanguage";
import { useThemePreference } from "../../theme/ThemePreferenceProvider";
import type { ResolvedTheme } from "../../theme/themePreference";
import type { ModerationTrackerConfig, ModerationTrackerType } from "../../lib/api";
import {
  forwardRef,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface DashboardMenuProps {
  onOpenScheduler?: () => void;
  moderation: {
    configs: Record<ModerationTrackerType, ModerationTrackerConfig> | null;
    enabledTypes: ModerationTrackerType[];
    isRefreshingWidgets: boolean;
    updateTrackerEnabled: (type: ModerationTrackerType, enabled: boolean) => Promise<void>;
    onOpenEdit: () => void;
  };
}

export function getWidgetsRefreshingOverlayClass(theme: ResolvedTheme): string {
  return theme === "light"
    ? "bg-[color:var(--color-overlay-3)]"
    : "bg-[color:var(--color-slate-950-80)]";
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

export function DashboardMenu({ moderation: _moderation }: DashboardMenuProps) {
  const { theme, setPreference } = useThemePreference();
  const { language, setManualLanguage, t } = usePostLoginLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalNode(document.body);
    setIsMounted(true);
  }, []);

  const handleTriggerClick = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    requestAnimationFrame(() => {
      triggerRef.current?.focus({ preventScroll: true });
    });
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
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose, isOpen]);

  const handleOverlayClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  if (!isMounted || !portalNode) {
    return (
      <DashboardMenuTrigger
        ref={triggerRef}
        onClick={handleTriggerClick}
        ariaLabel={t("dashboard.nav.openMenu")}
      />
    );
  }

  return (
    <>
      <DashboardMenuTrigger
        ref={triggerRef}
        onClick={handleTriggerClick}
        ariaLabel={t("dashboard.nav.openMenu")}
      />
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
                aria-label={t("dashboard.nav.mainMenu")}
                className="flex max-h-[92vh] w-full max-w-[420px] flex-col rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-slate-900-95)] p-5 text-[color:var(--color-text)] shadow-2xl"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-900/80 dark:text-text-muted">
                      {t("dashboard.nav.menu")}
                    </p>
                    <h2 className="font-display text-xl font-semibold">
                      {t("dashboard.nav.personalSpace")}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] p-2 text-sm text-[color:var(--color-text-dim)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-overlay-2)]"
                    aria-label={t("dashboard.nav.closeMenu")}
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

                <div className="flex-1 overflow-y-auto px-1 pb-1">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex flex-1 items-center rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] p-1">
                      {([
                        { value: "es", label: "ES" },
                        { value: "en", label: "EN" },
                      ] as const).map((option) => {
                        const isActive = language === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setManualLanguage(option.value)}
                            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] transition ${
                              isActive
                                ? "bg-[color:var(--color-overlay-4)] text-[color:var(--color-text)]"
                                : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
                            }`}
                            aria-pressed={isActive}
                            aria-label={
                              option.value === "es"
                                ? t("dashboard.language.spanish")
                                : t("dashboard.language.english")
                            }
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreference(theme === "dark" ? "light" : "dark")}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] text-lg"
                      aria-label={theme === "dark" ? t("dashboard.theme.light") : t("dashboard.theme.dark")}
                    >
                      {theme === "dark" ? "☀️" : "🌙"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        portalNode,
      )}
    </>
  );
}

import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ToastBanner } from '../common/ToastBanner';
import { useQuickAccessInstall } from '../../hooks/useQuickAccessInstall';
import {
  forwardRef,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

interface DashboardMenuProps {
  onOpenScheduler?: () => void;
}

function MenuIcon({ children, className = 'h-5 w-5 text-white/75' }: { children: ReactNode; className?: string }) {
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

const DashboardMenuTrigger = forwardRef<HTMLButtonElement, { onClick: () => void }>(
  function DashboardMenuTrigger({ onClick }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 p-2 text-white/80 transition hover:border-white/40 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
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
  },
);

export function DashboardMenu({ onOpenScheduler }: DashboardMenuProps) {
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

    const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
    const prefersSpanish = browserLanguages.some((lang) => lang?.toLowerCase().startsWith('es'));
    setIsSpanishSystem(prefersSpanish);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
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
    requestAnimationFrame(() => {
      triggerRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const menuRowClassName =
    'flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-white/90 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

  const handleOpenProfile = useCallback(() => {
    if (typeof openUserProfile === 'function') {
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
    await signOut({ redirectUrl: '/' });
  }, [signOut, handleClose]);

  const handleGoToSubscription = useCallback(() => {
    handleClose();
    navigate('/subscription');
  }, [handleClose, navigate]);

  const handleGoToPricing = useCallback(() => {
    handleClose();
    navigate('/pricing');
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
      return '';
    }
    if (user.firstName || user.lastName) {
      return `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`.toUpperCase();
    }
    if (user.primaryEmailAddress?.emailAddress) {
      return user.primaryEmailAddress.emailAddress.slice(0, 2).toUpperCase();
    }
    return '';
  }, [user]);

  const quickAccessLabels = useMemo(
    () =>
      isSpanishSystem
        ? {
            title: 'Añadir acceso rápido',
            stepShare: 'Compartir',
            stepAddToHome: 'Añadir a pantalla de inicio',
            stepAdd: 'Añadir',
            gotIt: 'Entendido',
          }
        : {
            title: 'Add quick access',
            stepShare: 'Share',
            stepAddToHome: 'Add to Home Screen',
            stepAdd: 'Add',
            gotIt: 'Got it',
          },
    [isSpanishSystem],
  );

  if (!isMounted || !portalNode) {
    return <DashboardMenuTrigger ref={triggerRef} onClick={handleTriggerClick} />;
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
                className="flex max-h-[92vh] w-full max-w-[420px] flex-col rounded-3xl border border-white/15 bg-surface/95 p-5 text-white shadow-2xl transition"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[0.6rem] uppercase tracking-[0.35em] text-text-muted">Menú</p>
                    <h2 className="font-display text-xl font-semibold">Tu espacio personal</h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full border border-white/20 bg-white/10 p-2 text-sm text-white/80 transition hover:border-white/40 hover:bg-white/20"
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
                  <section className="rounded-2xl border border-white/10 bg-white/5 px-2 py-1">
                    <button type="button" onClick={handleOpenProfile} className={`${menuRowClassName} h-14`}>
                      {user?.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt="Avatar"
                          className="h-9 w-9 rounded-xl border border-white/20 object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-xs font-semibold uppercase text-white/80">
                          {initials || 'UX'}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{user?.fullName || user?.username || 'Tu perfil'}</p>
                        {user?.primaryEmailAddress?.emailAddress ? (
                          <p className="truncate text-xs text-text-muted">{user.primaryEmailAddress.emailAddress}</p>
                        ) : null}
                      </div>
                      <MenuIcon className="h-4 w-4 text-white/70">
                        <path d="M20 21a8 8 0 0 0-16 0" />
                        <circle cx="12" cy="8" r="4" />
                      </MenuIcon>
                    </button>
                  </section>

                  <section className="rounded-2xl border border-white/10 bg-white/5 px-2 py-1">
                    <button type="button" onClick={handleOpenScheduler} className={menuRowClassName}>
                      <MenuIcon>
                        <path d="M6 9a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10 20a2 2 0 0 0 4 0" />
                      </MenuIcon>
                      <span className="flex-1">Recordatorio</span>
                    </button>
                    <div className="mx-3 h-px bg-white/10" />
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
                      <MenuIcon className={`h-4 w-4 text-white/60 transition ${isPlansOpen ? 'rotate-180' : ''}`}>
                        <path d="m6 9 6 6 6-6" />
                      </MenuIcon>
                    </button>
                    {isPlansOpen ? (
                      <div id="menu-planes" className="-mt-1 mb-1 space-y-1 px-3 pb-2 pl-11">
                        <button
                          type="button"
                          onClick={handleGoToSubscription}
                          className="flex h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-white/85 transition hover:bg-white/10"
                        >
                          <MenuIcon className="h-4 w-4 text-white/65">
                            <path d="M12 3a4 4 0 0 0-4 4v2" />
                            <path d="M8 12v-1a4 4 0 1 1 8 0v1" />
                            <rect x="5" y="12" width="14" height="9" rx="2" />
                          </MenuIcon>
                          Suscripción
                        </button>
                        <button
                          type="button"
                          onClick={handleGoToPricing}
                          className="flex h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-white/85 transition hover:bg-white/10"
                        >
                          <MenuIcon className="h-4 w-4 text-white/65">
                            <path d="M6 19V9" />
                            <path d="M12 19V5" />
                            <path d="M18 19v-7" />
                            <path d="M4 19h16" />
                          </MenuIcon>
                          Pricing
                        </button>
                      </div>
                    ) : null}
                  </section>

                  {isMobile ? (
                    <section className="rounded-2xl border border-accent-purple/35 bg-accent-purple/15 p-4">
                      <div className="mb-3 flex items-center gap-2 text-accent-purple">
                        <MenuIcon className="h-4 w-4 text-violet-200">
                          <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
                        </MenuIcon>
                        <p className="text-[0.65rem] uppercase tracking-[0.3em] text-violet-200">Acceso rápido</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleQuickAccessClick}
                        disabled={isStandalone}
                        className="flex h-12 w-full items-center justify-between rounded-xl border border-violet-300/35 bg-violet-300/10 px-4 text-left text-sm font-semibold text-violet-50 transition hover:border-violet-200/45 hover:bg-violet-300/20 disabled:cursor-not-allowed disabled:opacity-80"
                      >
                        <span>{isStandalone ? 'Acceso rápido activo' : 'Añadir acceso rápido'}</span>
                        {isStandalone ? (
                          <MenuIcon className="h-4 w-4 text-violet-50">
                            <path d="m5 12 4 4 10-10" />
                          </MenuIcon>
                        ) : null}
                      </button>
                      {toast ? <ToastBanner tone={toast.tone} message={toast.message} className="mt-3" /> : null}
                    </section>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-4 flex h-12 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10"
                >
                  <MenuIcon className="h-5 w-5 text-white/80">
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
                    <p className="text-sm font-semibold text-white">{quickAccessLabels.title}</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-white/85">
                      <li className="flex flex-wrap items-center gap-2">
                        <span>{isSpanishSystem ? 'Toca' : 'Tap'}</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
                          <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="7" y="7" width="10" height="14" rx="2" />
                            <path d="M12 3v10" />
                            <path d="m9 6 3-3 3 3" />
                          </svg>
                          {quickAccessLabels.stepShare}
                        </span>
                      </li>
                      <li className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
                          <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

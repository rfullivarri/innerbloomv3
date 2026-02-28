import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ToastBanner } from '../common/ToastBanner';
import { useQuickAccessInstall } from '../../hooks/useQuickAccessInstall';
import {
  forwardRef,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

interface DashboardMenuProps {
  onOpenScheduler?: () => void;
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
    requestAnimationFrame(() => {
      triggerRef.current?.focus({ preventScroll: true });
    });
  }, []);

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
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md"
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
                className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-3xl border border-white/15 bg-surface/95 p-5 text-white shadow-2xl transition md:inset-auto md:right-6 md:top-6 md:max-h-[85vh] md:w-[420px] md:rounded-3xl"
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
                  <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-text-muted">Perfil</p>
                    <div className="mt-3 flex items-center gap-3">
                      {user?.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt="Avatar"
                          className="h-12 w-12 rounded-2xl border border-white/20 object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-sm font-semibold uppercase text-white/80">
                          {initials || 'UX'}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-white">{user?.fullName || user?.username || 'Tu perfil'}</p>
                        {user?.primaryEmailAddress?.emailAddress ? (
                          <p className="truncate text-sm text-text-muted">{user.primaryEmailAddress.emailAddress}</p>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenProfile}
                      className="mt-4 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/15"
                    >
                      Gestionar perfil
                    </button>
                  </section>
                  <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-emerald-200">Scheduler</p>
                    <p className="mt-1 text-sm text-emerald-50/80">
                      Activá, pausá o cambiá la hora del recordatorio diario.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenScheduler}
                      className="mt-4 w-full rounded-2xl bg-emerald-400/90 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
                    >
                      Abrir recordatorio diario
                    </button>
                  </section>
                  <section className="rounded-3xl border border-sky-400/20 bg-sky-400/5 p-4">
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-sky-200">Planes</p>
                    <p className="mt-1 text-sm text-sky-50/80">
                      Revisá tu suscripción actual y compará opciones disponibles.
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleGoToSubscription}
                        className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/20"
                      >
                        Suscripción
                      </button>
                      <button
                        type="button"
                        onClick={handleGoToPricing}
                        className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/20"
                      >
                        Pricing
                      </button>
                    </div>
                  </section>
                  {isMobile ? (
                    <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[0.65rem] uppercase tracking-[0.3em] text-text-muted">Acceso rápido</p>
                      <button
                        type="button"
                        onClick={handleQuickAccessClick}
                        disabled={isStandalone}
                        className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-80"
                      >
                        <span>{isStandalone ? 'Acceso rápido activo' : 'Añadir acceso rápido'}</span>
                        {isStandalone ? <span aria-hidden="true">✓</span> : null}
                      </button>
                      {toast ? <ToastBanner tone={toast.tone} message={toast.message} className="mt-3" /> : null}
                    </section>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10"
                >
                  Cerrar sesión
                </button>
                {iosInstructionsOpen && isIOS ? (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Cómo añadir acceso rápido en iOS"
                    className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/20 bg-[#000c40] p-4 shadow-2xl"
                  >
                    <p className="text-sm font-semibold text-white">Añadir acceso rápido</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-white/85">
                      <li>Toca Compartir ⎋</li>
                      <li>Añadir a pantalla de inicio ✚</li>
                      <li>Añadir</li>
                    </ol>
                    {/* iOS Safari y navegadores iOS no permiten abrir Share Sheet ni instalar de forma programática. */}
                    <button
                      type="button"
                      onClick={closeIosInstructions}
                      className="mt-3 w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm text-white"
                    >
                      Entendido
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

import { useEffect, useMemo, useRef } from 'react';
import type { OnboardingLanguage } from '../constants';

interface GpExplainerOverlayProps {
  language?: OnboardingLanguage;
  onClose: () => void;
}

export function GpExplainerOverlay({ language = 'es', onClose }: GpExplainerOverlayProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const copy = useMemo(
    () =>
      language === 'en'
        ? {
            title: 'How GP works',
            body: [
              'Every answer and action earns GP (Growth Points).',
              'GP reflects your consistency.',
              'More GP → higher Level.',
            ],
            cta: 'Got it',
            closeLabel: 'Close GP explainer',
          }
        : {
            title: 'Cómo funcionan los GP',
            body: [
              'Cada respuesta y acción suma GP (Puntos de Crecimiento).',
              'Los GP reflejan tu constancia.',
              'Más GP → mayor nivel.',
            ],
            cta: 'Entendido',
            closeLabel: 'Cerrar explicación de GP',
          },
    [language],
  );

  useEffect(() => {
    const root = dialogRef.current;
    if (!root) return;

    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );

    const first = focusables[0] ?? root;
    first.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const currentFocusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (currentFocusable.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }

      const firstFocusable = currentFocusable[0];
      const lastFocusable = currentFocusable[currentFocusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && active === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden={false}>
      <div className="pointer-events-auto absolute inset-0 bg-slate-950/45 backdrop-blur-[3px]" onClick={onClose} />

      <div className="pointer-events-auto absolute inset-x-0 top-[7.15rem] px-3 sm:top-[7.8rem] sm:px-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={copy.title}
          tabIndex={-1}
          className="relative mx-auto w-full max-w-sm rounded-2xl border border-white/20 bg-slate-950/88 p-4 text-white shadow-[0_18px_40px_rgba(3,8,22,0.55)]"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.closeLabel}
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm text-white/75 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            ✕
          </button>

          <h2 className="pr-8 text-sm font-semibold tracking-wide text-white">{copy.title}</h2>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-white/80">
            {copy.body.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onClose}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-400 to-violet-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            {copy.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

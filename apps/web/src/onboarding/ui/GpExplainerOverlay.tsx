import { useEffect, useMemo, useRef } from 'react';
import { ArrowRight, ArrowUp, CircleDot } from '../../components/icons';
import { GpProgressBar } from './GpProgressBar';
import type { OnboardingLanguage } from '../constants';

interface GpExplainerOverlayProps {
  language?: OnboardingLanguage;
  onClose: () => void;
}

type ExplainerItem = {
  id: string;
  text: string;
  icon: 'dot' | 'arrow-right' | 'arrow-up';
};

export function GpExplainerOverlay({ language = 'es', onClose }: GpExplainerOverlayProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const copy = useMemo(
    () =>
      language === 'en'
        ? {
            title: 'How Growth Points work',
            chip: '+ GP',
            items: [
              { id: 'earn', text: 'Every answer and action earns Growth Points.', icon: 'dot' },
              { id: 'consistency', text: 'Growth Points reflect your consistency.', icon: 'arrow-right' },
              { id: 'level', text: 'More Growth Points → higher level.', icon: 'arrow-up' },
            ] as ExplainerItem[],
            cta: 'Got it',
            closeLabel: 'Close Growth Points explainer',
          }
        : {
            title: 'Cómo funcionan los Growth Points',
            chip: '+ GP',
            items: [
              { id: 'earn', text: 'Cada respuesta y acción suma Growth Points.', icon: 'dot' },
              { id: 'consistency', text: 'Los Growth Points reflejan tu constancia.', icon: 'arrow-right' },
              { id: 'level', text: 'Más Growth Points → mayor nivel.', icon: 'arrow-up' },
            ] as ExplainerItem[],
            cta: 'Entendido',
            closeLabel: 'Cerrar explicación de Growth Points',
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
      <div className="pointer-events-auto absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />

      <div className="pointer-events-auto absolute inset-x-0 top-[7.15rem] px-3 sm:top-[7.8rem] sm:px-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={copy.title}
          tabIndex={-1}
          className="relative mx-auto w-full max-w-sm rounded-3xl border border-white/20 bg-surface p-4 text-white shadow-[0_18px_40px_rgba(3,8,22,0.55)]"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.closeLabel}
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm text-white/75 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            ✕
          </button>

          <div className="pr-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-white">{copy.title}</h2>
              <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/75">
                {copy.chip}
              </span>
            </div>

            <div className="mt-3">
              <GpProgressBar progress={40} totalGp={0} />
            </div>
          </div>

          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/80">
            {copy.items.map((item) => {
              const iconClassName = 'h-3.5 w-3.5 shrink-0 text-violet-200';

              return (
                <li key={item.id} className="flex items-start gap-2">
                  {item.icon === 'dot' ? (
                    <CircleDot className={iconClassName} />
                  ) : item.icon === 'arrow-right' ? (
                    <ArrowRight className={iconClassName} />
                  ) : (
                    <ArrowUp className={iconClassName} />
                  )}
                  <span>{item.text}</span>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-violet-300/45 bg-violet-500 px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(76,29,149,0.3)] transition duration-200 hover:-translate-y-0.5 hover:bg-violet-400 hover:shadow-[0_14px_28px_rgba(76,29,149,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            {copy.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

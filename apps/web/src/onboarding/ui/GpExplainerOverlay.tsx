import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import { ArrowRight, ArrowUp, CircleDot } from '../../components/icons';
import { GpProgressBar } from './GpProgressBar';
import type { OnboardingLanguage } from '../constants';
import { useThemePreference } from '../../theme/ThemePreferenceProvider';

interface GpExplainerOverlayProps {
  language?: OnboardingLanguage;
  onClose: () => void;
}

type ExplainerItem = {
  id: string;
  segments: Array<{
    text: string;
    emphasis?: 'semibold';
    noWrap?: boolean;
  }>;
  icon: 'dot' | 'arrow-right' | 'arrow-up';
};

export function GpExplainerOverlay({ language = 'es', onClose }: GpExplainerOverlayProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useThemePreference();
  const prefersReducedMotion = useReducedMotion();

  const copy = useMemo(
    () =>
      language === 'en'
        ? {
            title: 'How Growth Points work',
            chip: '+ GP',
            items: [
              {
                id: 'earn',
                icon: 'dot',
                segments: [
                  { text: 'Every answer and action earns ' },
                  { text: 'Growth Points', emphasis: 'semibold' },
                  { text: '.' },
                ],
              },
              {
                id: 'consistency',
                icon: 'arrow-right',
                segments: [
                  { text: 'Growth Points', emphasis: 'semibold' },
                  { text: ' reflect your consistency.' },
                ],
              },
              {
                id: 'level',
                icon: 'arrow-up',
                segments: [
                  { text: 'More ' },
                  { text: 'Growth Points', emphasis: 'semibold' },
                  { text: ' = higher level.' },
                ],
              },
            ] as ExplainerItem[],
            cta: 'Got it',
            closeLabel: 'Close Growth Points explainer',
          }
        : {
            title: 'Cómo funcionan los GP',
            chip: '+ GP',
            items: [
              {
                id: 'earn',
                icon: 'dot',
                segments: [
                  { text: 'Cada respuesta y acción suma ' },
                  { text: 'GP', emphasis: 'semibold' },
                  { text: ' (Growth Points / Puntos de Crecimiento).' },
                ],
              },
              {
                id: 'consistency',
                icon: 'arrow-right',
                segments: [
                  { text: 'Los ' },
                  { text: 'GP', emphasis: 'semibold' },
                  { text: ' reflejan tu ' },
                  { text: 'constancia diaria', emphasis: 'semibold', noWrap: true },
                  { text: '.' },
                ],
              },
              {
                id: 'level',
                icon: 'arrow-up',
                segments: [
                  { text: 'Más ' },
                  { text: 'GP', emphasis: 'semibold' },
                  { text: ' = mayor nivel.' },
                ],
              },
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
      <div className="pointer-events-auto absolute inset-0 bg-[color:var(--color-overlay-2)] backdrop-blur-sm" onClick={onClose} />

      <div className="pointer-events-auto absolute inset-x-0 top-[7.15rem] px-3 sm:top-[7.8rem] sm:px-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={copy.title}
          tabIndex={-1}
          className="relative mx-auto w-full max-w-sm rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface-elevated)] p-4 text-[color:var(--color-text)] shadow-[var(--shadow-elev-2)]"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.closeLabel}
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] text-sm text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]"
          >
            ✕
          </button>

          <div className="pr-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-[color:var(--color-text)]">{copy.title}</h2>
              <span className="shrink-0 rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
                {copy.chip}
              </span>
            </div>

            <div className="mt-3">
              <div className="relative">
                <GpProgressBar progress={40} totalGp={0} />
                <div className="pointer-events-none absolute -top-2 right-2">
                  {prefersReducedMotion ? (
                    <span className="inline-flex rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[0.56rem] font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
                      + GP
                    </span>
                  ) : (
                    <div className="relative h-9 w-16">
                      {[0, 1, 2].map((pill) => (
                        <motion.span
                          key={pill}
                          className="absolute right-0 inline-flex rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[0.56rem] font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300"
                          initial={{ opacity: 0, y: 8, scale: 0.92 }}
                          animate={{ opacity: [0, 1, 1, 0], y: [8, 2, -8, -18], scale: [0.92, 1.04, 1, 0.98] }}
                          transition={{ duration: 1.7, repeat: Infinity, ease: 'easeOut', delay: pill * 0.38 }}
                        >
                          + GP
                        </motion.span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[color:var(--color-text-muted)]">
            {copy.items.map((item) => {
              const iconClassName = 'h-3.5 w-3.5 shrink-0 text-[color:var(--color-accent-primary)]';

              return (
                <li key={item.id} className="flex items-start gap-2">
                  {item.icon === 'dot' ? (
                    <CircleDot className={iconClassName} />
                  ) : item.icon === 'arrow-right' ? (
                    <ArrowRight className={iconClassName} />
                  ) : (
                    <ArrowUp className={iconClassName} />
                  )}
                  <span>
                    {item.segments.map((segment) => (
                      <span
                        key={`${item.id}-${segment.text}`}
                        className={[
                          segment.emphasis === 'semibold' ? 'font-semibold text-[color:var(--color-text)]' : '',
                          segment.noWrap ? 'whitespace-nowrap' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {segment.text}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={onClose}
            className="ib-primary-button mt-4 inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold !text-white transition duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]"
            style={{ color: '#fff' }}
          >
            {copy.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

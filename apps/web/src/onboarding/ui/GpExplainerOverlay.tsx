import { motion, useReducedMotion } from 'framer-motion';
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
  segments: Array<{
    text: string;
    emphasis?: 'semibold';
    noWrap?: boolean;
  }>;
  icon: 'dot' | 'arrow-right' | 'arrow-up';
};

export function GpExplainerOverlay({ language = 'es', onClose }: GpExplainerOverlayProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const copy = useMemo(
    () =>
      language === 'en'
        ? {
            title: 'How Growth Points work',
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
      <div className="pointer-events-auto absolute inset-0 bg-black/54 backdrop-blur-md" onClick={onClose} />

      <div className="pointer-events-auto absolute inset-x-0 top-[7.15rem] px-3 sm:top-[7.8rem] sm:px-4">
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={copy.title}
          tabIndex={-1}
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="onboarding-gp-modal relative mx-auto w-full max-w-sm rounded-[1.65rem] border p-4 text-[color:var(--ib-onboarding-text)]"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.closeLabel}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center text-lg font-light text-[color:var(--ib-onboarding-text-muted)] transition hover:text-[color:var(--ib-onboarding-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ib-onboarding-violet)]"
          >
            ✕
          </button>

          <div className="pr-8">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-[color:var(--ib-onboarding-text)]">{copy.title}</h2>
            </div>

            <div className="mt-5">
              <div className="relative">
                <GpProgressBar progress={40} totalGp={0} hideTotal />
                <div className="pointer-events-none absolute -top-3 right-1 h-10 w-16">
                  {prefersReducedMotion ? (
                    <span className="onboarding-gp-plus-pill absolute right-0 top-1 inline-flex rounded-full px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.16em]">
                      + GP
                    </span>
                  ) : (
                    [0, 1, 2].map((pill) => (
                      <motion.span
                        key={pill}
                        className="onboarding-gp-plus-pill absolute right-0 inline-flex rounded-full px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.16em]"
                        initial={{ opacity: 0, y: 9, scale: 0.92 }}
                        animate={{ opacity: [0, 1, 1, 0], y: [9, 2, -9, -20], scale: [0.92, 1.04, 1, 0.98] }}
                        transition={{ duration: 1.7, repeat: Infinity, ease: 'easeOut', delay: pill * 0.38 }}
                      >
                        + GP
                      </motion.span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-[color:var(--ib-onboarding-text-secondary)]">
            {copy.items.map((item) => {
              const iconClassName = 'mt-0.5 h-4 w-4 shrink-0 text-[color:var(--ib-onboarding-violet)]';

              return (
                <li key={item.id} className="onboarding-gp-modal__item flex items-start gap-3">
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
                          segment.emphasis === 'semibold' ? 'font-semibold text-[color:var(--ib-onboarding-text)]' : '',
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
            className="quickstart-primary-cta mt-5 inline-flex w-full items-center justify-center rounded-full border px-4 py-3 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
            style={{ color: '#fff', textShadow: '0 1px 2px rgba(15, 23, 42, 0.22)' }}
          >
            <span className="relative z-10 text-white" style={{ color: '#fff' }}>
              {copy.cta}
            </span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}

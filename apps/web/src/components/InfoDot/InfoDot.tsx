import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { infoTips, type InfoKey } from '../../content/infoTips';
import './InfoDot.css';

export type InfoDotPlacement = 'top' | 'right' | 'bottom' | 'left';

interface InfoDotProps {
  id: InfoKey;
  placement?: InfoDotPlacement;
  className?: string;
}

interface PositionState {
  top: number;
  left: number;
  placement: InfoDotPlacement;
  arrowX?: number;
  arrowY?: number;
}

const VIEWPORT_PADDING = 12;
const POPOVER_GAP = 18;
const MIN_ARROW_OFFSET = 12;

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function renderInline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((segment, index) => {
      if (segment.startsWith('**') && segment.endsWith('**')) {
        return (
          <Fragment key={index}>
            <strong>{segment.slice(2, -2)}</strong>
          </Fragment>
        );
      }
      return <Fragment key={index}>{segment}</Fragment>;
    });
}

function combine(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function getPlacementOrder(desired: InfoDotPlacement): InfoDotPlacement[] {
  const base: InfoDotPlacement[] = ['top', 'bottom', 'right', 'left'];
  return [desired, ...base.filter((placement) => placement !== desired)];
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  return Array.from(root.querySelectorAll<HTMLElement>(selectors.join(','))).filter(
    (element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'),
  );
}

export function InfoDot({ id, placement = 'top', className }: InfoDotProps) {
  const tip = infoTips[id];
  if (!tip) {
    throw new Error(`InfoDot: no tip found for id "${id}"`);
  }

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const shouldRestoreFocusRef = useRef(false);
  const pointerDownRef = useRef(false);
  const suppressFocusOpenRef = useRef(false);

  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PositionState>({
    top: 0,
    left: 0,
    placement,
  });


  const baseId = useId();
  const popoverId = `${baseId}-dialog`;
  const titleId = `${baseId}-title`;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const button = buttonRef.current;
    const popover = popoverRef.current;
    if (!button || !popover) {
      return;
    }

    const buttonRect = button.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const width = Math.max(popRect.width || popover.offsetWidth || 1, 1);
    const height = Math.max(popRect.height || popover.offsetHeight || 1, 1);

    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const buttonCenterY = buttonRect.top + buttonRect.height / 2;

    const candidates = getPlacementOrder(placement);
    let chosen: PositionState | null = null;
    let fallback: PositionState | null = null;

    for (const candidate of candidates) {
      let top = 0;
      let left = 0;
      let arrowX: number | undefined;
      let arrowY: number | undefined;
      let fits = true;

      switch (candidate) {
        case 'top': {
          top = buttonRect.top - height - POPOVER_GAP;
          left = buttonCenterX - width / 2;
          if (top < VIEWPORT_PADDING) {
            fits = false;
          }
          break;
        }
        case 'bottom': {
          top = buttonRect.bottom + POPOVER_GAP;
          left = buttonCenterX - width / 2;
          if (top + height > viewportHeight - VIEWPORT_PADDING) {
            fits = false;
          }
          break;
        }
        case 'left': {
          left = buttonRect.left - width - POPOVER_GAP;
          top = buttonCenterY - height / 2;
          if (left < VIEWPORT_PADDING) {
            fits = false;
          }
          break;
        }
        case 'right':
        default: {
          left = buttonRect.right + POPOVER_GAP;
          top = buttonCenterY - height / 2;
          if (left + width > viewportWidth - VIEWPORT_PADDING) {
            fits = false;
          }
          break;
        }
      }

      const clampedLeft = clamp(left, VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING);
      const clampedTop = clamp(top, VIEWPORT_PADDING, viewportHeight - height - VIEWPORT_PADDING);

      if (candidate === 'top' || candidate === 'bottom') {
        arrowX = clamp(buttonCenterX - clampedLeft, MIN_ARROW_OFFSET, width - MIN_ARROW_OFFSET);
      } else {
        arrowY = clamp(buttonCenterY - clampedTop, MIN_ARROW_OFFSET, height - MIN_ARROW_OFFSET);
      }

      const nextPosition: PositionState = {
        top: clampedTop,
        left: clampedLeft,
        placement: candidate,
        arrowX,
        arrowY,
      };

      if (fits) {
        chosen = nextPosition;
        break;
      }

      if (!fallback) {
        fallback = nextPosition;
      }
    }

    if (!chosen) {
      chosen = fallback ?? {
        top: buttonRect.bottom + POPOVER_GAP,
        left: clamp(buttonCenterX - width / 2, VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING),
        placement: placement,
        arrowX: clamp(width / 2, MIN_ARROW_OFFSET, width - MIN_ARROW_OFFSET),
        arrowY: clamp(height / 2, MIN_ARROW_OFFSET, height - MIN_ARROW_OFFSET),
      };
    }

    setPosition(chosen);
  }, [placement]);

  const closePopover = useCallback(
    (restoreFocus: boolean) => {
      shouldRestoreFocusRef.current = restoreFocus;
      if (restoreFocus) {
        suppressFocusOpenRef.current = true;
      }
      setIsOpen(false);
    },
    [],
  );

  const openPopover = useCallback(() => {
    shouldRestoreFocusRef.current = false;
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const button = buttonRef.current;
      const popover = popoverRef.current;
      if (!target) return;
      if (button && button.contains(target)) return;
      if (popover && popover.contains(target)) return;
      closePopover(false);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, closePopover]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const popover = popoverRef.current;
    if (!popover) {
      return;
    }

    const focusInitial = () => {
      const focusable = getFocusableElements(popover);
      if (focusable.length > 0) {
        focusable[0].focus({ preventScroll: true });
      } else {
        popover.focus({ preventScroll: true });
      }
    };

    focusInitial();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePopover(true);
        return;
      }

      if (event.key === 'Tab') {
        const focusable = getFocusableElements(popover);
        if (focusable.length === 0) {
          event.preventDefault();
          popover.focus({ preventScroll: true });
          return;
        }

        const active = document.activeElement as HTMLElement | null;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (!active || active === first) {
            event.preventDefault();
            last.focus({ preventScroll: true });
          }
        } else if (!active || active === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closePopover]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let frame = 0;
    const handle = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        updatePosition();
      });
    };

    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [isOpen, updatePosition]);

  useIsomorphicLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition, tip.title, tip.bullets]);

  useEffect(() => {
    if (!isOpen) {
      if (shouldRestoreFocusRef.current) {
        shouldRestoreFocusRef.current = false;
        buttonRef.current?.focus({ preventScroll: true });
      }
    }
  }, [isOpen]);

  const handlePointerEnter = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse') {
        openPopover();
      }
    },
    [openPopover],
  );

  const handleFocus = useCallback(() => {
    if (suppressFocusOpenRef.current) {
      suppressFocusOpenRef.current = false;
      return;
    }
    if (!pointerDownRef.current) {
      openPopover();
    }
  }, [openPopover]);

  const handleClick = useCallback(() => {
    shouldRestoreFocusRef.current = false;
    setIsOpen(true);
  }, []);

  const handlePointerDown = useCallback(() => {
    pointerDownRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    pointerDownRef.current = false;
  }, []);

  const popoverStyle = useMemo(() => {
    const style: CSSProperties & { '--arrow-x'?: string; '--arrow-y'?: string } = {
      top: `${position.top}px`,
      left: `${position.left}px`,
    };
    if (typeof position.arrowX === 'number') {
      style['--arrow-x'] = `${position.arrowX}px`;
    }
    if (typeof position.arrowY === 'number') {
      style['--arrow-y'] = `${position.arrowY}px`;
    }
    return style;
  }, [position]);

  return (
    <span className={combine('info-dot', className)}>
      <button
        ref={buttonRef}
        type="button"
        className="info-dot__button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        aria-label="Más información"
        title="Más información"
        data-state={isOpen ? 'open' : 'closed'}
        onClick={handleClick}
        onFocus={handleFocus}
        onPointerEnter={handlePointerEnter}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <span aria-hidden>i</span>
      </button>
      {isMounted && isOpen
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              id={popoverId}
              aria-modal="false"
              aria-labelledby={titleId}
              tabIndex={-1}
              className="info-dot__popover"
              data-placement={position.placement}
              style={popoverStyle}
            >
              <h4 id={titleId} className="info-dot__title">
                {tip.title}
              </h4>
              <ul className="info-dot__list">
                {tip.bullets.map((bullet, index) => (
                  <li key={index}>{renderInline(bullet)}</li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

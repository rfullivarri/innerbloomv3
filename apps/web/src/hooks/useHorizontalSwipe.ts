import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

type HorizontalSwipeOptions<T extends HTMLElement> = {
  disabled?: boolean;
  onSwipeLeft?: (event: ReactPointerEvent<T>) => void;
  onSwipeRight?: (event: ReactPointerEvent<T>) => void;
  onTap?: (event: ReactPointerEvent<T>) => void;
};

type HorizontalSwipeHandlers<T extends HTMLElement> = {
  onPointerDown: (event: ReactPointerEvent<T>) => void;
  onPointerMove: (event: ReactPointerEvent<T>) => void;
  onPointerUp: (event: ReactPointerEvent<T>) => void;
  onPointerCancel: (event: ReactPointerEvent<T>) => void;
  onClickCapture: (event: ReactMouseEvent<T>) => void;
};

type SwipeAxis = 'x' | 'y' | null;

type SwipeState = {
  pointerId: number | null;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startTime: number;
  axis: SwipeAxis;
  isActive: boolean;
  ignore: boolean;
  preventClick: boolean;
};

const AXIS_LOCK_THRESHOLD = 6;
const TAP_THRESHOLD = 10;
const SWIPE_DISTANCE_THRESHOLD = 40;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [role="button"], [role="link"], [data-horizontal-swipe-ignore="true"], [contenteditable=""], [contenteditable="true"]';

function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return Boolean(target.closest(INTERACTIVE_SELECTOR));
}

function createInitialState(): SwipeState {
  return {
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    startTime: 0,
    axis: null,
    isActive: false,
    ignore: false,
    preventClick: false,
  };
}

export function useHorizontalSwipe<T extends HTMLElement>(
  options: HorizontalSwipeOptions<T>,
): HorizontalSwipeHandlers<T> {
  const optionsRef = useRef(options);
  const stateRef = useRef<SwipeState>(createInitialState());

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const resetState = useCallback(() => {
    stateRef.current = createInitialState();
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<T>) => {
    const { disabled } = optionsRef.current;
    if (disabled) {
      return;
    }

    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    const shouldIgnore = isInteractiveElement(event.target);
    stateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      startTime: event.timeStamp,
      axis: null,
      isActive: true,
      ignore: shouldIgnore,
      preventClick: false,
    };

    if (!shouldIgnore) {
      event.stopPropagation();
    }
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<T>) => {
    const state = stateRef.current;
    const { disabled } = optionsRef.current;

    if (!state.isActive || disabled || state.ignore || state.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;

    if (!state.axis) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (absX >= AXIS_LOCK_THRESHOLD || absY >= AXIS_LOCK_THRESHOLD) {
        state.axis = absX > absY ? 'x' : 'y';
      }
    }

    if (state.axis === 'x') {
      event.stopPropagation();
    }

    state.lastX = event.clientX;
    state.lastY = event.clientY;
  }, []);

  const handlePointerEnd = useCallback(
    (event: ReactPointerEvent<T>) => {
      const state = stateRef.current;
      const { disabled, onSwipeLeft, onSwipeRight, onTap } = optionsRef.current;

      if (!state.isActive || state.pointerId !== event.pointerId) {
        resetState();
        return;
      }

      let handled = false;

      if (!disabled && !state.ignore && state.axis !== 'y') {
        const totalDeltaX = event.clientX - state.startX;
        const totalDeltaY = event.clientY - state.startY;
        const durationMs = Math.max(event.timeStamp - state.startTime, 1);
        const velocityX = totalDeltaX / durationMs;
        const absDeltaX = Math.abs(totalDeltaX);
        const absDeltaY = Math.abs(totalDeltaY);

        if (
          state.axis === 'x' &&
          (absDeltaX >= SWIPE_DISTANCE_THRESHOLD || Math.abs(velocityX) >= SWIPE_VELOCITY_THRESHOLD)
        ) {
          handled = true;
          state.preventClick = true;
          if (totalDeltaX < 0) {
            onSwipeLeft?.(event);
          } else {
            onSwipeRight?.(event);
          }
        } else if (absDeltaX < TAP_THRESHOLD && absDeltaY < TAP_THRESHOLD && onTap) {
          handled = true;
          state.preventClick = true;
          onTap(event);
        }
      }

      if (handled) {
        event.stopPropagation();
        event.preventDefault();
      }

      resetState();
    },
    [resetState],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<T>) => {
      const state = stateRef.current;
      if (state.pointerId === event.pointerId) {
        resetState();
      }
    },
    [resetState],
  );

  const handleClickCapture = useCallback((event: ReactMouseEvent<T>) => {
    const state = stateRef.current;
    if (state.preventClick) {
      state.preventClick = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerCancel,
    onClickCapture: handleClickCapture,
  };
}

export type { HorizontalSwipeOptions, HorizontalSwipeHandlers };

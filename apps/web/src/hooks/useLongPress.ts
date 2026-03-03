import { useCallback, useMemo, useRef, type MouseEvent } from 'react';

interface UseLongPressOptions {
  delayMs?: number;
  onLongPress: () => void;
}

export function useLongPress({ onLongPress, delayMs = 2200 }: UseLongPressOptions) {
  const timerRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimer();
    triggeredRef.current = false;
    timerRef.current = window.setTimeout(() => {
      triggeredRef.current = true;
      onLongPress();
    }, delayMs);
  }, [clearTimer, delayMs, onLongPress]);

  const cancel = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  return useMemo(
    () => ({
      onPointerDown: start,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (event: MouseEvent<HTMLElement>) => {
        if (triggeredRef.current) {
          event.preventDefault();
        }
      },
    }),
    [cancel, start],
  );
}

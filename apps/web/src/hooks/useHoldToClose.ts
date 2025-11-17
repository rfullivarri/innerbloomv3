import { useCallback, useEffect, useRef, useState } from 'react';

type AnimationFrameHandle = number | ReturnType<typeof setTimeout>;

type HoldStartOptions = {
  durationMs: number;
  onComplete: () => void;
};

const getNow = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

const requestFrame = (callback: FrameRequestCallback): AnimationFrameHandle => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }

  return setTimeout(() => callback(getNow()), 16);
};

const cancelFrame = (handle: AnimationFrameHandle) => {
  if (
    typeof window !== 'undefined' &&
    typeof window.cancelAnimationFrame === 'function' &&
    typeof handle === 'number'
  ) {
    window.cancelAnimationFrame(handle);
    return;
  }

  clearTimeout(handle as ReturnType<typeof setTimeout>);
};

export function useHoldToClose() {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const animationRef = useRef<AnimationFrameHandle | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationRef = useRef(0);
  const onCompleteRef = useRef<(() => void) | null>(null);

  const resetHold = useCallback(() => {
    if (animationRef.current != null) {
      cancelFrame(animationRef.current);
      animationRef.current = null;
    }

    startTimeRef.current = null;
    durationRef.current = 0;
    onCompleteRef.current = null;
    setProgress(0);
    setIsHolding(false);
  }, []);

  const finishHold = useCallback(() => {
    if (animationRef.current != null) {
      cancelFrame(animationRef.current);
      animationRef.current = null;
    }

    startTimeRef.current = null;
    durationRef.current = 0;
    const callback = onCompleteRef.current;
    onCompleteRef.current = null;

    if (!callback) {
      return;
    }

    setProgress(1);
    setIsHolding(false);
    callback();
  }, []);

  const startHold = useCallback(
    ({ durationMs, onComplete }: HoldStartOptions) => {
      if (animationRef.current != null) {
        return;
      }

      if (durationMs <= 0 || typeof window === 'undefined') {
        setProgress(1);
        setIsHolding(false);
        onComplete();
        return;
      }

      setProgress(0);
      setIsHolding(true);
      durationRef.current = durationMs;
      onCompleteRef.current = onComplete;
      startTimeRef.current = getNow();

      const tick = (now: number) => {
        if (!startTimeRef.current || durationRef.current <= 0) {
          return;
        }

        const elapsed = now - startTimeRef.current;
        const nextProgress = Math.min(elapsed / durationRef.current, 1);
        setProgress(nextProgress);

        if (nextProgress >= 1) {
          animationRef.current = null;
          finishHold();
          return;
        }

        animationRef.current = requestFrame(tick);
      };

      animationRef.current = requestFrame(tick);
    },
    [finishHold],
  );

  const cancelHold = useCallback(() => {
    resetHold();
  }, [resetHold]);

  useEffect(() => {
    return () => {
      if (animationRef.current != null) {
        cancelFrame(animationRef.current);
      }
    };
  }, []);

  return {
    progress,
    isHolding,
    startHold,
    cancelHold,
    resetHold,
  };
}

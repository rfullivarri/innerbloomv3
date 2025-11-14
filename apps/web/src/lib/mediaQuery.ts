export type MediaQueryChangeCallback = () => void;

export function subscribeToMediaQuery(mediaQuery: MediaQueryList, callback: MediaQueryChangeCallback): () => void {
  const handleChange = () => callback();

  if (typeof mediaQuery.addEventListener === 'function' && typeof mediaQuery.removeEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }

  const legacyMediaQuery = mediaQuery as unknown as {
    addListener?: (listener: () => void) => void;
    removeListener?: (listener: () => void) => void;
  };

  if (typeof legacyMediaQuery.addListener === 'function' && typeof legacyMediaQuery.removeListener === 'function') {
    const legacyHandler = () => callback();
    legacyMediaQuery.addListener(legacyHandler);
    return () => {
      legacyMediaQuery.removeListener?.(legacyHandler);
    };
  }

  return () => {};
}

const metaName = 'clerk-publishable-key';

function readMetaTag(): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const meta = document.querySelector(`meta[name="${metaName}"]`);
  const value = meta?.getAttribute('content')?.trim();

  return value ? value : undefined;
}

function readGlobalFallback(): string | undefined {
  if (typeof __NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY__ === 'string' && __NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY__.trim() !== '') {
    return __NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY__;
  }

  if (typeof window !== 'undefined') {
    const maybeWindow = window as typeof window & {
      CLERK_PUBLISHABLE_KEY?: string;
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
    };

    const candidates = [maybeWindow.CLERK_PUBLISHABLE_KEY, maybeWindow.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim() !== '') {
        return candidate;
      }
    }
  }

  return undefined;
}

export function getClerkPublishableKey(): string | undefined {
  const candidates = [
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    readGlobalFallback(),
    readMetaTag(),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate;
    }
  }

  return undefined;
}

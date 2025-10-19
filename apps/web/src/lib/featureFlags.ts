const RAW_FLAG_STRING = String(import.meta.env.VITE_FEATURE_FLAGS ?? '').trim();
const RAW_FLAG_LIST = RAW_FLAG_STRING.length > 0 ? RAW_FLAG_STRING.split(',') : [];
const NORMALIZED_FLAGS = new Set(
  RAW_FLAG_LIST.map((flag) => flag.trim().toLowerCase()).filter((flag) => flag.length > 0),
);

function resolveRuntimeFlags(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set(NORMALIZED_FLAGS);
  }

  try {
    const runtime = (window as typeof window & { __IB_FEATURE_FLAGS__?: string | string[] }).__IB_FEATURE_FLAGS__;
    if (!runtime) {
      return new Set(NORMALIZED_FLAGS);
    }

    const entries = Array.isArray(runtime) ? runtime : String(runtime ?? '').split(',');
    const merged = new Set(NORMALIZED_FLAGS);
    for (const entry of entries) {
      const normalized = String(entry ?? '').trim().toLowerCase();
      if (normalized.length > 0) {
        merged.add(normalized);
      }
    }
    return merged;
  } catch (error) {
    console.warn('[featureFlags] Failed to resolve runtime flags', error);
    return new Set(NORMALIZED_FLAGS);
  }
}

function resolveFeatureFlag(flag: string): boolean {
  const normalized = String(flag ?? '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const flags = resolveRuntimeFlags();
  if (flags.has(normalized)) {
    return true;
  }

  const envValue = (import.meta.env as unknown as Record<string, unknown>)[
    `VITE_FEATURE_${normalized.toUpperCase()}`
  ];
  const envSpecific = String(envValue ?? '').trim();
  if (envSpecific.length === 0) {
    return false;
  }

  return envSpecific.toLowerCase() === 'true' || envSpecific === '1';
}

export function isFeatureEnabled(flag: string): boolean {
  return resolveFeatureFlag(flag);
}

export const FEATURE_MISSIONS_V2 = isFeatureEnabled('missionsV2');

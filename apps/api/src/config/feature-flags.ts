const RAW_FLAGS = String(process.env.FEATURE_FLAGS ?? '')
  .split(',')
  .map((entry) => entry.trim())
  .filter((entry) => entry.length > 0);

const parsedFlags = new Set(RAW_FLAGS.map((entry) => entry.toLowerCase()));

function readEnvToggle(key: string): boolean {
  const value = process.env[key];
  if (typeof value === 'undefined') {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'enabled';
}

export function isFeatureEnabled(flag: string): boolean {
  const normalized = flag.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (parsedFlags.has(normalized)) {
    return true;
  }

  const envKey = `FEATURE_${normalized.toUpperCase()}`;
  if (readEnvToggle(envKey)) {
    return true;
  }

  const viteKey = `VITE_FEATURE_${normalized.toUpperCase()}`;
  if (readEnvToggle(viteKey)) {
    return true;
  }

  return false;
}

export const FEATURE_MISSIONS_V2 = isFeatureEnabled('missionsV2');

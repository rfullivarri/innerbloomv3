export type LandingVariantId = 'root_v3' | 'v2' | 'v3_legacy' | 'unknown';

export type MarketingAttribution = {
  captured_at: string;
  entry_path: string;
  landing_variant: LandingVariantId;
  referrer: string;
  referrer_domain: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  ib_campaign?: string;
  ib_post?: string;
};

const STORAGE_KEY = 'ib:marketing-attribution:v1';
const UTM_PARAM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ib_campaign',
  'ib_post',
] as const;

type AttributionParamKey = typeof UTM_PARAM_KEYS[number];

function normalizeParamValue(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 160) : undefined;
}

function getReferrerDomain(referrer: string): string {
  if (!referrer) {
    return '';
  }

  try {
    return new URL(referrer).hostname;
  } catch {
    return '';
  }
}

function getExternalReferrer(referrer: string, origin: string): string {
  if (!referrer) {
    return '';
  }

  try {
    const url = new URL(referrer);
    return url.origin === origin ? '' : referrer.slice(0, 500);
  } catch {
    return referrer.slice(0, 500);
  }
}

export function resolveLandingVariant(pathname: string): LandingVariantId {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';

  if (normalizedPathname === '/') {
    return 'root_v3';
  }

  if (normalizedPathname === '/v2') {
    return 'v2';
  }

  if (normalizedPathname === '/v3') {
    return 'v3_legacy';
  }

  return 'unknown';
}

export function buildMarketingAttribution({
  pathname,
  search,
  referrer = '',
  origin = '',
  now = new Date(),
}: {
  pathname: string;
  search: string;
  referrer?: string;
  origin?: string;
  now?: Date;
}): MarketingAttribution | null {
  const params = new URLSearchParams(search);
  const attributionParams = UTM_PARAM_KEYS.reduce<Partial<Record<AttributionParamKey, string>>>((acc, key) => {
    const value = normalizeParamValue(params.get(key));
    if (value) {
      acc[key] = value;
    }
    return acc;
  }, {});
  const externalReferrer = getExternalReferrer(referrer, origin);
  const hasAttribution = Object.keys(attributionParams).length > 0 || Boolean(externalReferrer);

  if (!hasAttribution) {
    return null;
  }

  return {
    captured_at: now.toISOString(),
    entry_path: `${pathname}${search}`,
    landing_variant: resolveLandingVariant(pathname),
    referrer: externalReferrer,
    referrer_domain: getReferrerDomain(externalReferrer),
    ...attributionParams,
  };
}

export function readMarketingAttribution(): MarketingAttribution | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<MarketingAttribution>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.captured_at !== 'string') {
      return null;
    }

    return {
      captured_at: parsed.captured_at,
      entry_path: typeof parsed.entry_path === 'string' ? parsed.entry_path : '',
      landing_variant: parsed.landing_variant ?? 'unknown',
      referrer: typeof parsed.referrer === 'string' ? parsed.referrer : '',
      referrer_domain: typeof parsed.referrer_domain === 'string' ? parsed.referrer_domain : '',
      ...(typeof parsed.utm_source === 'string' ? { utm_source: parsed.utm_source } : {}),
      ...(typeof parsed.utm_medium === 'string' ? { utm_medium: parsed.utm_medium } : {}),
      ...(typeof parsed.utm_campaign === 'string' ? { utm_campaign: parsed.utm_campaign } : {}),
      ...(typeof parsed.utm_content === 'string' ? { utm_content: parsed.utm_content } : {}),
      ...(typeof parsed.utm_term === 'string' ? { utm_term: parsed.utm_term } : {}),
      ...(typeof parsed.ib_campaign === 'string' ? { ib_campaign: parsed.ib_campaign } : {}),
      ...(typeof parsed.ib_post === 'string' ? { ib_post: parsed.ib_post } : {}),
    };
  } catch {
    return null;
  }
}

export function persistMarketingAttribution(attribution: MarketingAttribution): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Attribution is helpful for analytics, but it must never block the app.
  }
}

export function getMarketingEventParams({
  pathname,
  search,
  allowStoredAttribution,
}: {
  pathname: string;
  search: string;
  allowStoredAttribution: boolean;
}): Record<string, string> {
  const liveAttribution = buildMarketingAttribution({
    pathname,
    search,
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    origin: typeof window !== 'undefined' ? window.location.origin : '',
  });
  const attribution = liveAttribution ?? (allowStoredAttribution ? readMarketingAttribution() : null);
  const variant = attribution?.landing_variant ?? resolveLandingVariant(pathname);

  return {
    landing_variant: variant,
    ...(attribution?.entry_path ? { attribution_entry_path: attribution.entry_path } : {}),
    ...(attribution?.referrer ? { referrer: attribution.referrer } : {}),
    ...(attribution?.referrer_domain ? { referrer_domain: attribution.referrer_domain } : {}),
    ...(attribution?.utm_source ? { utm_source: attribution.utm_source } : {}),
    ...(attribution?.utm_medium ? { utm_medium: attribution.utm_medium } : {}),
    ...(attribution?.utm_campaign ? { utm_campaign: attribution.utm_campaign } : {}),
    ...(attribution?.utm_content ? { utm_content: attribution.utm_content } : {}),
    ...(attribution?.utm_term ? { utm_term: attribution.utm_term } : {}),
    ...(attribution?.ib_campaign ? { ib_campaign: attribution.ib_campaign } : {}),
    ...(attribution?.ib_post ? { ib_post: attribution.ib_post } : {}),
  };
}


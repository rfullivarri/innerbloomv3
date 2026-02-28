export type TimezoneOption = {
  value: string;
  label: string;
  aliases: string[];
};

const FALLBACK_TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'America/Mexico_City',
  'America/Bogota',
  'America/Argentina/Buenos_Aires',
  'Europe/Madrid',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
];

const ENRICHED_METADATA: Record<string, { label: string; aliases: string[] }> = {
  UTC: {
    label: 'UTC (GMT+0)',
    aliases: ['utc', 'coordinated universal time', 'gmt'],
  },
  'America/Los_Angeles': {
    label: 'Los Angeles (GMT-8/-7)',
    aliases: ['los angeles', 'california', 'pacific', 'eeuu', 'usa', 'estados unidos'],
  },
  'America/New_York': {
    label: 'New York (GMT-5/-4)',
    aliases: ['new york', 'nueva york', 'east coast', 'eeuu', 'usa', 'estados unidos'],
  },
  'America/Mexico_City': {
    label: 'Ciudad de México (GMT-6)',
    aliases: ['mexico', 'ciudad de mexico', 'cdmx', 'méxico'],
  },
  'America/Bogota': {
    label: 'Bogotá (GMT-5)',
    aliases: ['colombia', 'bogota', 'bogotá'],
  },
  'America/Argentina/Buenos_Aires': {
    label: 'Buenos Aires (GMT-3)',
    aliases: ['argentina', 'buenos aires'],
  },
  'Europe/Madrid': {
    label: 'Madrid (GMT+1/+2)',
    aliases: ['espana', 'españa', 'madrid'],
  },
  'Europe/London': {
    label: 'London (GMT+0/+1)',
    aliases: ['london', 'uk', 'reino unido', 'inglaterra'],
  },
  'Europe/Berlin': {
    label: 'Berlin (GMT+1/+2)',
    aliases: ['berlin', 'alemania', 'germany'],
  },
  'Asia/Tokyo': {
    label: 'Tokyo (GMT+9)',
    aliases: ['tokyo', 'japon', 'japón', 'japan'],
  },
  'Asia/Singapore': {
    label: 'Singapore (GMT+8)',
    aliases: ['singapore'],
  },
};

export function normalizeSearchText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function getSupportedTimezones(): string[] {
  if (typeof Intl !== 'undefined' && typeof (Intl as any).supportedValuesOf === 'function') {
    try {
      const values = (Intl as any).supportedValuesOf('timeZone');
      if (Array.isArray(values) && values.length > 0) {
        const normalized = [...values];
        if (!normalized.includes('UTC')) {
          normalized.push('UTC');
        }
        return normalized as string[];
      }
    } catch {
      // ignore
    }
  }
  return FALLBACK_TIMEZONES;
}

function getTimezoneOffsetLabel(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    const offset = parts.find((part) => part.type === 'timeZoneName')?.value;
    return offset ?? 'GMT';
  } catch {
    return 'GMT';
  }
}

function getReadableLocation(timezone: string): string {
  const segments = timezone.split('/');
  const city = segments[segments.length - 1] ?? timezone;
  return city.replaceAll('_', ' ');
}

function buildOption(timezone: string): TimezoneOption {
  const enriched = ENRICHED_METADATA[timezone];
  if (enriched) {
    return {
      value: timezone,
      label: enriched.label,
      aliases: Array.from(new Set([timezone, ...enriched.aliases])),
    };
  }

  const location = getReadableLocation(timezone);
  const offset = getTimezoneOffsetLabel(timezone);
  return {
    value: timezone,
    label: `${location} (${offset})`,
    aliases: [timezone, location],
  };
}

export function getTimezoneCatalog(): TimezoneOption[] {
  const values = Array.from(new Set(getSupportedTimezones()));
  return values.map(buildOption).sort((a, b) => a.label.localeCompare(b.label));
}

function getRelevance(option: TimezoneOption, query: string): number {
  const terms = [option.label, option.value, ...option.aliases].map(normalizeSearchText);
  if (terms.some((term) => term === query)) {
    return 0;
  }
  if (terms.some((term) => term.startsWith(query))) {
    return 1;
  }
  if (terms.some((term) => term.includes(query))) {
    return 2;
  }
  return 3;
}

export function filterTimezoneOptions(
  options: TimezoneOption[],
  query: string,
  selectedTimezone?: string,
): TimezoneOption[] {
  const normalizedQuery = normalizeSearchText(query);
  const catalog = options.some((option) => option.value === selectedTimezone)
    ? options
    : selectedTimezone
      ? [...options, buildOption(selectedTimezone)]
      : options;

  if (!normalizedQuery) {
    return [...catalog].sort((a, b) => a.label.localeCompare(b.label));
  }

  return catalog
    .filter((option) => getRelevance(option, normalizedQuery) < 3)
    .sort((a, b) => {
      const relevanceDiff = getRelevance(a, normalizedQuery) - getRelevance(b, normalizedQuery);
      if (relevanceDiff !== 0) {
        return relevanceDiff;
      }
      return a.label.localeCompare(b.label);
    });
}

export function resolveDefaultTimezone(): string {
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (typeof tz === 'string' && tz.trim()) {
        return tz;
      }
    } catch {
      // ignore
    }
  }
  return 'UTC';
}

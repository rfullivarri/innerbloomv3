import type { Answers, XP } from './state';

const CLIENT_ID_KEY = 'gj_client_id';

function generateClientId() {
  if (typeof window === 'undefined') {
    return `cid-${Date.now()}`;
  }

  try {
    const { crypto } = window;
    if (crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (error) {
    console.warn('[onboarding] randomUUID failed, falling back to timestamp id', error);
  }

  return `cid-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function resolveClientId() {
  if (typeof window === 'undefined') {
    return generateClientId();
  }

  try {
    const stored = window.localStorage.getItem(CLIENT_ID_KEY);
    if (stored && stored.length > 0) {
      return stored;
    }

    const created = generateClientId();
    window.localStorage.setItem(CLIENT_ID_KEY, created);
    return created;
  } catch (error) {
    console.warn('[onboarding] Unable to access localStorage', error);
    return generateClientId();
  }
}

function normalizeEmail(value: string) {
  return (value || '').trim().toLowerCase();
}

function resolveMeta(userId: string) {
  const meta = {
    tz: '',
    lang: '',
    device: 'desktop',
    version: 'forms-intro-react',
    user_id: userId || '',
  } as const;

  if (typeof window === 'undefined') {
    return meta;
  }

  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch (error) {
    console.warn('[onboarding] Unable to resolve timezone', error);
  }

  const navigatorLang = window.navigator?.language || '';
  const ua = (window.navigator?.userAgent || '').toLowerCase();
  const device = /mobi|android/.test(ua) ? 'mobile' : 'desktop';

  return {
    tz,
    lang: navigatorLang.toLowerCase(),
    device,
    version: 'forms-intro-react',
    user_id: userId || '',
  };
}

interface JourneyPayloadData {
  low: Answers['low'];
  chill: Answers['chill'];
  flow: Answers['flow'];
  evolve: Answers['evolve'];
  foundations: Answers['foundations'];
}

export interface JourneyPayload {
  ts: string;
  client_id: string;
  email: string;
  mode: string;
  data: JourneyPayloadData;
  xp: XP;
  meta: ReturnType<typeof resolveMeta>;
}

export function buildPayload(answers: Answers, xp: XP): JourneyPayload {
  const clientId = resolveClientId();
  const email = normalizeEmail(answers.email);
  const meta = resolveMeta(answers.user_id);
  const roundedBodyXp = Math.round(Number(xp.Body || 0));
  const roundedMindXp = Math.round(Number(xp.Mind || 0));
  const roundedSoulXp = Math.round(Number(xp.Soul || 0));
  const roundedTotalXp = Math.round(Number(xp.total || 0));
  const totalXp =
    roundedBodyXp + roundedMindXp + roundedSoulXp !== roundedTotalXp
      ? roundedBodyXp + roundedMindXp + roundedSoulXp
      : roundedTotalXp;

  return {
    ts: new Date().toISOString(),
    client_id: clientId,
    email,
    mode: String(answers.mode || '').toUpperCase(),
    data: {
      low: {
        body: [...answers.low.body],
        soul: [...answers.low.soul],
        mind: [...answers.low.mind],
        note: answers.low.note || '',
      },
      chill: {
        oneThing: answers.chill.oneThing || '',
        motiv: [...answers.chill.motiv],
      },
      flow: {
        goal: answers.flow.goal || '',
        imped: [...answers.flow.imped],
      },
      evolve: {
        goal: answers.evolve.goal || '',
        trade: [...answers.evolve.trade],
        att: answers.evolve.att || '',
      },
      foundations: {
        body: [...answers.foundations.body],
        soul: [...answers.foundations.soul],
        mind: [...answers.foundations.mind],
        bodyOpen: answers.foundations.bodyOpen || '',
        soulOpen: answers.foundations.soulOpen || '',
        mindOpen: answers.foundations.mindOpen || '',
      },
    },
    xp: {
      total: totalXp,
      Body: roundedBodyXp,
      Mind: roundedMindXp,
      Soul: roundedSoulXp,
    },
    meta,
  };
}

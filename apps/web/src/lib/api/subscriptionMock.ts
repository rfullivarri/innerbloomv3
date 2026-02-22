export type PlanCode = 'FREE' | 'MONTH' | 'SIX_MONTHS' | 'YEAR';

export type SubscriptionStatus = 'trialing' | 'active' | 'inactive';

export interface SubscriptionData {
  plan: PlanCode;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  nextRenewalAt: string | null;
}

interface SubscriptionError {
  code: 'subscription_inactive';
  message: string;
}

interface ApiSuccess<T> {
  ok: true;
  data: T;
}

interface ApiFailure {
  ok: false;
  error: SubscriptionError;
}

type ApiResult<T> = ApiSuccess<T> | ApiFailure;

const STORAGE_KEY = 'mock.subscription.v1';

const DAY_MS = 24 * 60 * 60 * 1000;

const defaultSubscription = (): SubscriptionData => ({
  plan: 'FREE',
  status: 'trialing',
  trialEndsAt: new Date(Date.now() + 14 * DAY_MS).toISOString(),
  nextRenewalAt: null,
});

function readState(): SubscriptionData {
  if (typeof window === 'undefined') {
    return defaultSubscription();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = defaultSubscription();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as SubscriptionData;
    if (!parsed.plan || !parsed.status) {
      throw new Error('Invalid subscription data');
    }
    return parsed;
  } catch {
    const fallback = defaultSubscription();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

function writeState(next: SubscriptionData): SubscriptionData {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

async function mockEndpoint(path: '/subscribe' | '/change-plan', plan: PlanCode): Promise<ApiResult<SubscriptionData>> {
  const state = readState();
  if (state.status === 'inactive') {
    return {
      ok: false,
      error: {
        code: 'subscription_inactive',
        message: 'La suscripción está inactiva.',
      },
    };
  }

  const now = new Date();
  const nextRenewalAt = new Date(now.getTime() + 30 * DAY_MS).toISOString();
  const nextState: SubscriptionData = {
    plan,
    status: 'active',
    trialEndsAt: null,
    nextRenewalAt,
  };

  if (path === '/subscribe' || path === '/change-plan') {
    return {
      ok: true,
      data: writeState(nextState),
    };
  }

  return {
    ok: true,
    data: writeState(nextState),
  };
}

export async function getSubscription(): Promise<ApiResult<SubscriptionData>> {
  const state = readState();
  return { ok: true, data: state };
}

export async function subscribe(plan: PlanCode): Promise<ApiResult<SubscriptionData>> {
  return mockEndpoint('/subscribe', plan);
}

export async function changePlan(plan: PlanCode): Promise<ApiResult<SubscriptionData>> {
  return mockEndpoint('/change-plan', plan);
}

export async function cancelSubscription(): Promise<ApiResult<SubscriptionData>> {
  const state = readState();
  const nextState: SubscriptionData = {
    ...state,
    status: 'inactive',
    nextRenewalAt: null,
    trialEndsAt: null,
  };
  return { ok: true, data: writeState(nextState) };
}

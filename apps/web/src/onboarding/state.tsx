import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CHECKLIST_LIMITS, CHECKLIST_PILLARS, MODE_ROUTES, OPEN_TEXT_XP, STEP_XP } from './constants';

export type GameMode = 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE';
export type Pillar = 'Body' | 'Mind' | 'Soul';
export type StepId =
  | 'clerk-gate'
  | 'mode-select'
  | 'low-body'
  | 'low-soul'
  | 'low-mind'
  | 'low-note'
  | 'chill-open'
  | 'chill-motiv'
  | 'flow-goal'
  | 'flow-imped'
  | 'evolve-goal'
  | 'evolve-trade'
  | 'evolve-att'
  | 'foundations-body'
  | 'foundations-soul'
  | 'foundations-mind'
  | 'summary';

export interface XP {
  Body: number;
  Mind: number;
  Soul: number;
  total: number;
}

export interface Answers {
  user_id: string;
  email: string;
  mode: GameMode | null;
  low: {
    body: string[];
    soul: string[];
    mind: string[];
    note: string;
  };
  chill: {
    oneThing: string;
    motiv: string[];
  };
  flow: {
    goal: string;
    imped: string[];
  };
  evolve: {
    goal: string;
    trade: string[];
    att: string;
  };
  foundations: {
    body: string[];
    soul: string[];
    mind: string[];
    bodyOpen: string;
    soulOpen: string;
    mindOpen: string;
  };
}

export type TokenProvider = (() => Promise<string | null>) | null;

export interface OnboardingState {
  route: StepId[];
  currentStepIndex: number;
  answers: Answers;
  xp: XP;
  awardedChecklists: Record<StepId, boolean>;
  awardedOpen: Record<StepId, boolean>;
  tokenProvider: TokenProvider;
}

const BASE_ROUTE: StepId[] = ['clerk-gate', 'mode-select'];

export const initialXP: XP = { Body: 0, Mind: 0, Soul: 0, total: 0 };

export const initialAnswers: Answers = {
  user_id: '',
  email: '',
  mode: null,
  low: {
    body: [],
    soul: [],
    mind: [],
    note: '',
  },
  chill: {
    oneThing: '',
    motiv: [],
  },
  flow: {
    goal: '',
    imped: [],
  },
  evolve: {
    goal: '',
    trade: [],
    att: '',
  },
  foundations: {
    body: [],
    soul: [],
    mind: [],
    bodyOpen: '',
    soulOpen: '',
    mindOpen: '',
  },
};

const initialState: OnboardingState = {
  route: [...BASE_ROUTE],
  currentStepIndex: 0,
  answers: cloneAnswers(initialAnswers),
  xp: { ...initialXP },
  awardedChecklists: {},
  awardedOpen: {},
  tokenProvider: null,
};

export function computeRouteForMode(mode: GameMode | null): StepId[] {
  if (!mode) {
    return BASE_ROUTE;
  }

  const modeRoute = MODE_ROUTES[mode];
  return [...BASE_ROUTE, ...modeRoute];
}

export function applyChecklistSelection(
  current: readonly string[],
  value: string,
  limit?: number,
): string[] {
  const exists = current.includes(value);
  if (exists) {
    return current.filter((item) => item !== value);
  }

  if (typeof limit === 'number' && limit > 0 && current.length >= limit) {
    return [...current];
  }

  return [...current, value];
}

export function distributeXp(base: XP, amount: number, pillar: Pillar | 'ALL'): XP {
  if (!amount || amount <= 0) {
    return { ...base };
  }

  const rounded = (n: number) => Math.round(n * 100) / 100;

  if (pillar === 'ALL') {
    const share = amount / 3;
    const updated: XP = {
      Body: rounded(base.Body + share),
      Mind: rounded(base.Mind + share),
      Soul: rounded(base.Soul + share),
      total: 0,
    };
    updated.total = rounded(updated.Body + updated.Mind + updated.Soul);
    return updated;
  }

  const updated: XP = {
    Body: pillar === 'Body' ? rounded(base.Body + amount) : base.Body,
    Mind: pillar === 'Mind' ? rounded(base.Mind + amount) : base.Mind,
    Soul: pillar === 'Soul' ? rounded(base.Soul + amount) : base.Soul,
    total: 0,
  };
  updated.total = rounded(updated.Body + updated.Mind + updated.Soul);
  return updated;
}

interface OnboardingContextValue {
  state: OnboardingState;
  setMode: (mode: GameMode) => void;
  goNext: () => void;
  goPrevious: () => void;
  goToStep: (step: StepId) => void;
  toggleChecklist: (step: StepId, value: string) => void;
  setChecklist: (step: StepId, values: string[]) => void;
  setTextValue: (key: string, value: string) => void;
  setEvolveAtt: (value: string) => void;
  awardChecklist: (step: StepId) => void;
  awardOpen: (step: StepId) => void;
  syncClerkSession: (email: string, userId: string, provider: TokenProvider) => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

function cloneAnswers(value: Answers): Answers {
  return {
    user_id: value.user_id,
    email: value.email,
    mode: value.mode,
    low: {
      body: [...value.low.body],
      soul: [...value.low.soul],
      mind: [...value.low.mind],
      note: value.low.note,
    },
    chill: {
      oneThing: value.chill.oneThing,
      motiv: [...value.chill.motiv],
    },
    flow: {
      goal: value.flow.goal,
      imped: [...value.flow.imped],
    },
    evolve: {
      goal: value.evolve.goal,
      trade: [...value.evolve.trade],
      att: value.evolve.att,
    },
    foundations: {
      body: [...value.foundations.body],
      soul: [...value.foundations.soul],
      mind: [...value.foundations.mind],
      bodyOpen: value.foundations.bodyOpen,
      soulOpen: value.foundations.soulOpen,
      mindOpen: value.foundations.mindOpen,
    },
  };
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initialState);

  const setMode = useCallback((mode: GameMode) => {
    setState((prev) => {
      if (prev.answers.mode === mode && prev.route.length > BASE_ROUTE.length) {
        return prev;
      }

      const nextAnswers = cloneAnswers(prev.answers);
      nextAnswers.mode = mode;
      const nextRoute = computeRouteForMode(mode);

      return {
        ...prev,
        answers: nextAnswers,
        route: nextRoute,
      };
    });
  }, []);

  const goNext = useCallback(() => {
    setState((prev) => {
      const nextIndex = Math.min(prev.route.length - 1, prev.currentStepIndex + 1);
      if (nextIndex === prev.currentStepIndex) {
        return prev;
      }
      return {
        ...prev,
        currentStepIndex: nextIndex,
      };
    });
  }, []);

  const goPrevious = useCallback(() => {
    setState((prev) => {
      const nextIndex = Math.max(0, prev.currentStepIndex - 1);
      if (nextIndex === prev.currentStepIndex) {
        return prev;
      }
      return {
        ...prev,
        currentStepIndex: nextIndex,
      };
    });
  }, []);

  const goToStep = useCallback((step: StepId) => {
    setState((prev) => {
      const index = prev.route.indexOf(step);
      if (index === -1 || index === prev.currentStepIndex) {
        return prev;
      }
      return {
        ...prev,
        currentStepIndex: index,
      };
    });
  }, []);

  const toggleChecklist = useCallback((step: StepId, value: string) => {
    setState((prev) => {
      const limit = CHECKLIST_LIMITS[step];
      const nextAnswers = cloneAnswers(prev.answers);

      const assign = (list: string[]): string[] => applyChecklistSelection(list, value, limit);

      switch (step) {
        case 'low-body':
          nextAnswers.low.body = assign(prev.answers.low.body);
          break;
        case 'low-soul':
          nextAnswers.low.soul = assign(prev.answers.low.soul);
          break;
        case 'low-mind':
          nextAnswers.low.mind = assign(prev.answers.low.mind);
          break;
        case 'chill-motiv':
          nextAnswers.chill.motiv = assign(prev.answers.chill.motiv);
          break;
        case 'flow-imped':
          nextAnswers.flow.imped = assign(prev.answers.flow.imped);
          break;
        case 'evolve-trade':
          nextAnswers.evolve.trade = assign(prev.answers.evolve.trade);
          break;
        case 'foundations-body':
          nextAnswers.foundations.body = assign(prev.answers.foundations.body);
          break;
        case 'foundations-soul':
          nextAnswers.foundations.soul = assign(prev.answers.foundations.soul);
          break;
        case 'foundations-mind':
          nextAnswers.foundations.mind = assign(prev.answers.foundations.mind);
          break;
        default:
          return prev;
      }

      return {
        ...prev,
        answers: nextAnswers,
      };
    });
  }, []);

  const setChecklist = useCallback((step: StepId, values: string[]) => {
    setState((prev) => {
      const limit = CHECKLIST_LIMITS[step];
      const trimmed = limit ? values.slice(0, limit) : values.slice();
      const nextAnswers = cloneAnswers(prev.answers);

      switch (step) {
        case 'low-body':
          nextAnswers.low.body = trimmed;
          break;
        case 'low-soul':
          nextAnswers.low.soul = trimmed;
          break;
        case 'low-mind':
          nextAnswers.low.mind = trimmed;
          break;
        case 'chill-motiv':
          nextAnswers.chill.motiv = trimmed;
          break;
        case 'flow-imped':
          nextAnswers.flow.imped = trimmed;
          break;
        case 'evolve-trade':
          nextAnswers.evolve.trade = trimmed;
          break;
        case 'foundations-body':
          nextAnswers.foundations.body = trimmed;
          break;
        case 'foundations-soul':
          nextAnswers.foundations.soul = trimmed;
          break;
        case 'foundations-mind':
          nextAnswers.foundations.mind = trimmed;
          break;
        default:
          return prev;
      }

      return {
        ...prev,
        answers: nextAnswers,
      };
    });
  }, []);

  const setTextValue = useCallback((key: string, value: string) => {
    setState((prev) => {
      if (prev.answers.low.note === value && key === 'low.note') {
        return prev;
      }

      const nextAnswers = cloneAnswers(prev.answers);

      switch (key) {
        case 'low.note':
          nextAnswers.low.note = value;
          break;
        case 'chill.oneThing':
          nextAnswers.chill.oneThing = value;
          break;
        case 'flow.goal':
          nextAnswers.flow.goal = value;
          break;
        case 'evolve.goal':
          nextAnswers.evolve.goal = value;
          break;
        case 'foundations.bodyOpen':
          nextAnswers.foundations.bodyOpen = value;
          break;
        case 'foundations.soulOpen':
          nextAnswers.foundations.soulOpen = value;
          break;
        case 'foundations.mindOpen':
          nextAnswers.foundations.mindOpen = value;
          break;
        default:
          return prev;
      }

      return {
        ...prev,
        answers: nextAnswers,
      };
    });
  }, []);

  const setEvolveAtt = useCallback((value: string) => {
    setState((prev) => {
      if (prev.answers.evolve.att === value) {
        return prev;
      }
      const nextAnswers = cloneAnswers(prev.answers);
      nextAnswers.evolve.att = value;
      return {
        ...prev,
        answers: nextAnswers,
      };
    });
  }, []);

  const awardChecklist = useCallback((step: StepId) => {
    setState((prev) => {
      if (prev.awardedChecklists[step]) {
        return prev;
      }
      const amount = OPEN_TEXT_XP[step] ?? STEP_XP[step];
      const pillar = CHECKLIST_PILLARS[step];
      if (!amount || !pillar) {
        return prev;
      }
      const nextXp = distributeXp(prev.xp, amount, pillar);
      return {
        ...prev,
        xp: nextXp,
        awardedChecklists: {
          ...prev.awardedChecklists,
          [step]: true,
        },
      };
    });
  }, []);

  const awardOpen = useCallback((step: StepId) => {
    setState((prev) => {
      if (prev.awardedOpen[step]) {
        return prev;
      }
      const amount = STEP_XP[step];
      if (!amount) {
        return prev;
      }
      const nextXp = distributeXp(prev.xp, amount, 'ALL');
      return {
        ...prev,
        xp: nextXp,
        awardedOpen: {
          ...prev.awardedOpen,
          [step]: true,
        },
      };
    });
  }, []);

  const syncClerkSession = useCallback((email: string, userId: string, provider: TokenProvider) => {
    setState((prev) => {
      if (prev.answers.email === email && prev.answers.user_id === userId && prev.tokenProvider === provider) {
        return prev;
      }
      const nextAnswers = cloneAnswers(prev.answers);
      nextAnswers.email = email;
      nextAnswers.user_id = userId;
      return {
        ...prev,
        answers: nextAnswers,
        tokenProvider: provider,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      route: [...BASE_ROUTE],
      currentStepIndex: 0,
      answers: cloneAnswers(initialAnswers),
      xp: { ...initialXP },
      awardedChecklists: {},
      awardedOpen: {},
      tokenProvider: null,
    });
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      setMode,
      goNext,
      goPrevious,
      goToStep,
      toggleChecklist,
      setChecklist,
      setTextValue,
      setEvolveAtt,
      awardChecklist,
      awardOpen,
      syncClerkSession,
      reset,
    }),
    [
      state,
      setMode,
      goNext,
      goPrevious,
      goToStep,
      toggleChecklist,
      setChecklist,
      setTextValue,
      setEvolveAtt,
      awardChecklist,
      awardOpen,
      syncClerkSession,
      reset,
    ],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return ctx;
}

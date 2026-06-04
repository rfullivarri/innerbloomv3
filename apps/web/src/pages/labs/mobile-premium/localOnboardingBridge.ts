import type { JourneyPayload } from '../../../onboarding/payload';
import { QUICK_START_TASKS } from '../../../onboarding/quickStart';
import type { OnboardingProgress } from '../../../lib/api';
import type { TraitXpEntry } from '../../../lib/api';
import type { PremiumTaskRow } from './variants/PremiumTasksScreen';

type LabPillar = 'Body' | 'Mind' | 'Soul';

export type LocalOnboardingTask = {
  id: string;
  name: string;
  pillar: LabPillar;
  trait: string;
  inputValue?: string;
  difficultyLabel: PremiumTaskRow['difficultyLabel'];
  completionDates: string[];
  xpEarned: number;
};

export type LocalDailyQuestRecord = {
  date: string;
  emotionColor: string;
  emotionName: string;
  gpEarned: number;
  completedTaskIds: string[];
};

export type LocalOnboardingSnapshot = {
  createdAt: string;
  gameMode: string;
  language: 'es' | 'en';
  progress: OnboardingProgress;
  tasks: LocalOnboardingTask[];
  dquestHistory: LocalDailyQuestRecord[];
  xp: {
    Body: number;
    Mind: number;
    Soul: number;
    total: number;
  };
};

const STORAGE_KEY = 'innerbloom.mobilePremiumLab.onboardingSnapshot';

const PILLARS: LabPillar[] = ['Body', 'Mind', 'Soul'];

export function writeLocalOnboardingSnapshotFromPayload(payload: JourneyPayload): LocalOnboardingSnapshot | null {
  if (payload.meta.onboarding_path !== 'quick_start') {
    return null;
  }

  const language = payload.meta.lang.startsWith('en') ? 'en' : 'es';
  const now = new Date().toISOString();
  const tasks = buildLocalTasks(payload, language);
  const snapshot: LocalOnboardingSnapshot = {
    createdAt: now,
    gameMode: payload.mode,
    language,
    progress: {
      user_id: payload.meta.user_id || 'labs-dev-user',
      onboarding_session_id: payload.client_id,
      version: 1,
      state: 'in_progress',
      onboarding_started_at: now,
      game_mode_selected_at: now,
      avatar_selected_at: now,
      moderation_selected_at: payload.data.quick_start?.selected_moderations.length ? now : null,
      tasks_generated_at: now,
      first_task_edited_at: null,
      returned_to_dashboard_after_first_edit_at: null,
      moderation_modal_shown_at: null,
      moderation_modal_resolved_at: payload.data.quick_start?.selected_moderations.length ? now : null,
      first_daily_quest_prompted_at: null,
      first_daily_quest_completed_at: null,
      daily_quest_scheduled_at: null,
      onboarding_completed_at: null,
      source: {
        trigger: 'labs_dev_quick_start',
        onboarding_path: 'quick_start',
      },
      created_at: now,
      updated_at: now,
    },
    tasks,
    dquestHistory: [],
    xp: {
      Body: Math.round(payload.xp.Body || 0),
      Mind: Math.round(payload.xp.Mind || 0),
      Soul: Math.round(payload.xp.Soul || 0),
      total: Math.round(payload.xp.total || 0),
    },
  };

  writeLocalOnboardingSnapshot(snapshot);
  return snapshot;
}

export function readLocalOnboardingSnapshot(): LocalOnboardingSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalOnboardingSnapshot;
    if (!parsed || !Array.isArray(parsed.tasks) || !parsed.progress) {
      return null;
    }
    return reconcileLocalPillarXp({
      ...parsed,
      dquestHistory: Array.isArray(parsed.dquestHistory) ? parsed.dquestHistory : [],
      tasks: parsed.tasks.map((task) => ({
        ...task,
        difficultyLabel: task.difficultyLabel ?? difficultyForMode(parsed.gameMode),
        completionDates: Array.isArray(task.completionDates) ? task.completionDates : [],
        xpEarned: Number(task.xpEarned ?? 0),
      })),
    });
  } catch (error) {
    console.warn('[mobile-premium-lab] failed to read local onboarding snapshot', error);
    return null;
  }
}

export function writeLocalOnboardingSnapshot(snapshot: LocalOnboardingSnapshot) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...snapshot, progress: { ...snapshot.progress, updated_at: new Date().toISOString() } }));
}

export function clearLocalOnboardingSnapshot() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem('innerbloom.mobilePremiumLab.onboardingPreview');
}

export function updateLocalOnboardingTask(taskId: string, updates: Partial<Pick<LocalOnboardingTask, 'name' | 'pillar' | 'trait' | 'difficultyLabel'>>) {
  const snapshot = readLocalOnboardingSnapshot();
  if (!snapshot) return null;

  const normalizedId = taskId.replace(/^onboarding-(body|mind|soul)-/i, '');
  const next = {
    ...snapshot,
    tasks: snapshot.tasks.map((task) => (
      task.id.toLowerCase() === normalizedId.toLowerCase() ? { ...task, ...updates } : task
    )),
  };
  writeLocalOnboardingSnapshot(next);
  window.dispatchEvent(new CustomEvent('innerbloom:mobile-premium-onboarding-updated'));
  return next;
}

export function recordLocalDailyQuest(input: Omit<LocalDailyQuestRecord, 'date'> & { date?: string }) {
  const snapshot = readLocalOnboardingSnapshot();
  if (!snapshot) return null;

  const date = input.date ?? formatDateKey(new Date());
  const completedIds = new Set(input.completedTaskIds.map(normalizeTaskId));
  const existingRecord = snapshot.dquestHistory.find((record) => record.date === date);
  const previousGp = existingRecord?.gpEarned ?? 0;
  const previousPillarXp = calculateRecordPillarXp(snapshot, existingRecord?.completedTaskIds ?? []);
  const nextPillarXp = calculateRecordPillarXp(snapshot, Array.from(completedIds));
  const nextRecord: LocalDailyQuestRecord = {
    date,
    emotionColor: input.emotionColor,
    emotionName: input.emotionName,
    gpEarned: input.gpEarned,
    completedTaskIds: Array.from(completedIds),
  };
  const next: LocalOnboardingSnapshot = {
    ...snapshot,
    dquestHistory: [...snapshot.dquestHistory.filter((record) => record.date !== date), nextRecord].sort((a, b) => a.date.localeCompare(b.date)),
    tasks: snapshot.tasks.map((task) => {
      if (!completedIds.has(normalizeTaskId(task.id))) return task;
      const completionDates = Array.from(new Set([...task.completionDates, date])).sort();
      return {
        ...task,
        completionDates,
        xpEarned: completionDates.length * xpForDifficulty(task.difficultyLabel),
      };
    }),
    xp: {
      Body: Math.max(0, snapshot.xp.Body - previousPillarXp.Body + nextPillarXp.Body),
      Mind: Math.max(0, snapshot.xp.Mind - previousPillarXp.Mind + nextPillarXp.Mind),
      Soul: Math.max(0, snapshot.xp.Soul - previousPillarXp.Soul + nextPillarXp.Soul),
      total: Math.max(0, snapshot.xp.total - previousGp + input.gpEarned),
    },
  };
  writeLocalOnboardingSnapshot(next);
  window.dispatchEvent(new CustomEvent('innerbloom:mobile-premium-onboarding-updated'));
  return next;
}

export function markLocalOnboardingStep(step: 'first_task_edited' | 'returned_to_dashboard_after_first_edit' | 'first_daily_quest_prompted' | 'first_daily_quest_completed' | 'daily_quest_scheduled') {
  const snapshot = readLocalOnboardingSnapshot();
  if (!snapshot) return null;

  const now = new Date().toISOString();
  const key = `${step}_at` as keyof OnboardingProgress;
  const next: LocalOnboardingSnapshot = {
    ...snapshot,
    progress: {
      ...snapshot.progress,
      [key]: snapshot.progress[key] ?? now,
      onboarding_completed_at: step === 'daily_quest_scheduled' ? snapshot.progress.onboarding_completed_at ?? now : snapshot.progress.onboarding_completed_at,
      state: step === 'daily_quest_scheduled' ? 'completed' : snapshot.progress.state,
      updated_at: now,
    },
  };
  writeLocalOnboardingSnapshot(next);
  window.dispatchEvent(new CustomEvent('innerbloom:mobile-premium-onboarding-updated'));
  return next;
}

export function buildPremiumRowsFromLocalOnboarding(snapshot: LocalOnboardingSnapshot | null, weeklyGoal: number): PremiumTaskRow[] {
  if (!snapshot) return [];
  const today = new Date();
  return snapshot.tasks.map((task) => ({
    id: `onboarding-${task.pillar.toLowerCase()}-${task.id.toLowerCase()}`,
    name: task.name,
    stat: task.trait,
    pillar: task.pillar,
    difficultyLabel: task.difficultyLabel,
    weeklyDone: task.completionDates.filter((date) => isInCurrentWeek(date, today)).length,
    weeklyGoal,
    streakDays: calculateStreak(task.completionDates, today),
    monthWeeks: buildMonthWeeks(task.completionDates, today),
    monthlyCount: task.completionDates.filter((date) => isInCurrentMonth(date, today)).length,
    lifecycleStatus: 'onboarding',
  }));
}

export function buildTraitXpFromLocalOnboarding(snapshot: LocalOnboardingSnapshot | null): TraitXpEntry[] {
  if (!snapshot) return [];

  return PILLARS.flatMap((pillar) => {
    const tasks = snapshot.tasks.filter((task) => task.pillar === pillar);
    if (!tasks.length) return [];
    const pillarXp = snapshot.xp[pillar];
    const baseXp = Math.floor(pillarXp / tasks.length);
    const remainder = pillarXp % tasks.length;

    return tasks.map((task, index) => ({
      trait: task.trait,
      name: task.trait,
      pillar,
      xp: baseXp + (index < remainder ? 1 : 0),
      sortOrder: index,
    }));
  });
}

function buildLocalTasks(payload: JourneyPayload, language: 'es' | 'en'): LocalOnboardingTask[] {
  const candidates = payload.data.quick_start?.manual_task_candidates ?? [];
  const candidateByKey = new Map(candidates.map((candidate) => [`${titleCasePillar(candidate.pillar_code)}-${candidate.trait_code}`, candidate]));

  return PILLARS.flatMap((pillar) => {
    const selected = payload.data.quick_start?.selected_tasks_by_pillar[pillar.toLowerCase() as 'body' | 'mind' | 'soul'] ?? [];
    const definitions = new Map(QUICK_START_TASKS[language][pillar].map((task) => [task.id, task]));
    return selected.flatMap((taskId) => {
      const definition = definitions.get(taskId);
      if (!definition) return [];
      const candidate = candidateByKey.get(`${pillar}-${definition.trait.toUpperCase()}`) ?? candidateByKey.get(`${pillar}-${taskId}`);
      const inputValue = candidate?.input_value?.trim();
      return [{
        id: taskId,
        name: formatTaskName(definition, inputValue),
        pillar,
        trait: definition.trait,
        inputValue: inputValue || undefined,
        difficultyLabel: difficultyForMode(payload.mode),
        completionDates: [],
        xpEarned: 0,
      }];
    });
  });
}

function formatTaskName(task: { text: string; inputBefore?: string; inputAfter?: string }, inputValue?: string) {
  const parts = [
    task.inputBefore,
    task.text,
    inputValue,
    task.inputAfter,
  ].filter((part): part is string => Boolean(part && part.trim()));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function titleCasePillar(value: string): LabPillar {
  const normalized = value.toUpperCase();
  if (normalized === 'MIND') return 'Mind';
  if (normalized === 'SOUL') return 'Soul';
  return 'Body';
}

function difficultyForMode(mode: string): PremiumTaskRow['difficultyLabel'] {
  const normalized = mode.toUpperCase();
  if (normalized === 'LOW') return 'Fácil';
  if (normalized === 'EVOLVE') return 'Difícil';
  return 'Media';
}

function normalizeTaskId(taskId: string) {
  return taskId.replace(/^onboarding-(body|mind|soul)-/i, '').toLowerCase();
}

function calculateRecordPillarXp(snapshot: LocalOnboardingSnapshot, taskIds: string[]) {
  const completed = new Set(taskIds.map(normalizeTaskId));
  return snapshot.tasks.reduce(
    (totals, task) => {
      if (!completed.has(normalizeTaskId(task.id))) return totals;
      return { ...totals, [task.pillar]: totals[task.pillar] + xpForDifficulty(task.difficultyLabel) };
    },
    { Body: 0, Mind: 0, Soul: 0 },
  );
}

function reconcileLocalPillarXp(snapshot: LocalOnboardingSnapshot): LocalOnboardingSnapshot {
  const pillarTotal = PILLARS.reduce((sum, pillar) => sum + snapshot.xp[pillar], 0);
  let missingXp = Math.max(0, snapshot.xp.total - pillarTotal);
  if (!missingXp || !snapshot.dquestHistory.length) return snapshot;

  const recorded = snapshot.dquestHistory.reduce(
    (totals, record) => {
      const recordXp = calculateRecordPillarXp(snapshot, record.completedTaskIds);
      return {
        Body: totals.Body + recordXp.Body,
        Mind: totals.Mind + recordXp.Mind,
        Soul: totals.Soul + recordXp.Soul,
      };
    },
    { Body: 0, Mind: 0, Soul: 0 },
  );
  const nextXp = { ...snapshot.xp };
  PILLARS.forEach((pillar) => {
    const addition = Math.min(recorded[pillar], missingXp);
    nextXp[pillar] += addition;
    missingXp -= addition;
  });
  return { ...snapshot, xp: nextXp };
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

function isInCurrentMonth(value: string, today: Date) {
  const date = parseDateKey(value);
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isInCurrentWeek(value: string, today: Date) {
  const date = parseDateKey(value);
  const start = startOfWeek(today);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return date >= start && date < end;
}

function buildMonthWeeks(values: string[], today: Date) {
  const weeks = [0, 0, 0, 0, 0];
  values.filter((value) => isInCurrentMonth(value, today)).forEach((value) => {
    const date = parseDateKey(value);
    const index = Math.min(4, Math.floor((date.getDate() - 1) / 7));
    weeks[index] += 1;
  });
  return weeks;
}

function calculateStreak(values: string[], today: Date) {
  const dates = new Set(values);
  let streak = 0;
  const cursor = new Date(today);
  while (dates.has(formatDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak >= 2 ? streak : 0;
}

function xpForDifficulty(difficulty: PremiumTaskRow['difficultyLabel']) {
  if (difficulty === 'Fácil') return 1;
  if (difficulty === 'Difícil') return 7;
  return 3;
}

import { randomUUID, createHash } from 'node:crypto';
import {
  MISSION_SLOT_KEYS,
  type BossState,
  type MissionProposal,
  type MissionSelectionState,
  type MissionSlotKey,
  type MissionSlotState,
  type MissionsBoard,
} from './missionsV2Types.js';
import { recordMissionsV2Event } from './missionsV2Telemetry.js';
import { getUserProfile } from '../controllers/users/user-state-service.js';

const REROLL_LIMIT = 1;
const REROLL_COOLDOWN_DAYS = 7;
const HUNT_SHIELD_MAX = 6;
const HUNT_BOOSTER_MULTIPLIER = 1.5;

const MODE_TO_HUNT_TARGET: Record<string, number> = {
  LOW: 1,
  CHILL: 2,
  FLOW: 3,
  EVOLVE: 4,
};

const slotTemplates: Record<
  MissionSlotKey,
  Array<Omit<MissionProposal, 'id'> & { templateId: string }>
> = {
  main: [
    {
      templateId: 'main-weekly-act',
      slot: 'main',
      title: 'Acto de bienestar semanal',
      summary: 'Planificá un acto significativo que mejore tu semana.',
      difficulty: 'medium',
      reward: { xp: 250, currency: 15 },
      objectives: [
        {
          id: 'plan_and_execute',
          label: 'Planificar y ejecutar el acto',
          target: 1,
          unit: 'tasks',
        },
      ],
      tags: { pillar: 'Soul', mode: 'FLOW' },
      metadata: { cadence: 'weekly' },
    },
    {
      templateId: 'main-wellbeing-epic',
      slot: 'main',
      title: 'Micro épica de bienestar',
      summary: 'Diseñá tres momentos de cuidado personal para la quincena.',
      difficulty: 'high',
      reward: { xp: 320, currency: 20 },
      objectives: [
        {
          id: 'wellbeing_checkpoints',
          label: 'Registrar checkpoints completados',
          target: 3,
          unit: 'tasks',
        },
      ],
      tags: { pillar: 'Body', mode: 'EVOLVE' },
      metadata: { cadence: 'biweekly' },
    },
    {
      templateId: 'main-flow-push',
      slot: 'main',
      title: 'Acto central de Flow',
      summary: 'Convertí una intención en un acto completo dentro de la semana.',
      difficulty: 'medium',
      reward: { xp: 275, currency: 18 },
      objectives: [
        {
          id: 'flow_action',
          label: 'Completar el acto propuesto',
          target: 1,
          unit: 'tasks',
        },
      ],
      tags: { pillar: 'Mind', mode: 'FLOW' },
      metadata: { cadence: 'weekly' },
    },
  ],
  hunt: [
    {
      templateId: 'hunt-ritual-upgrade',
      slot: 'hunt',
      title: 'Ritual clave con boost',
      summary: 'Maximizá el impacto de tu ritual más desafiante con boost XP.',
      difficulty: 'high',
      reward: { xp: 180, currency: 10 },
      objectives: [
        {
          id: 'ritual_sessions',
          label: 'Sesiones completadas con boost',
          target: 3,
          unit: 'tasks',
        },
      ],
      tags: { pillar: 'Mind' },
      metadata: { boosterMultiplier: HUNT_BOOSTER_MULTIPLIER },
    },
    {
      templateId: 'hunt-focus-chain',
      slot: 'hunt',
      title: 'Cadena de enfoque',
      summary: 'Sumá sesiones consecutivas del hábito con menor adherencia.',
      difficulty: 'high',
      reward: { xp: 200, currency: 12 },
      objectives: [
        {
          id: 'focus_sessions',
          label: 'Sesiones consecutivas',
          target: 4,
          unit: 'tasks',
        },
      ],
      tags: { pillar: 'Mind' },
      metadata: { boosterMultiplier: HUNT_BOOSTER_MULTIPLIER },
    },
    {
      templateId: 'hunt-rare-ritual',
      slot: 'hunt',
      title: 'Recuperá el ritual olvidado',
      summary: 'Atacá el ritual con menor adherencia en el último mes.',
      difficulty: 'medium',
      reward: { xp: 170, currency: 9 },
      objectives: [
        {
          id: 'revive_sessions',
          label: 'Sesiones recuperadas',
          target: 2,
          unit: 'tasks',
        },
      ],
      tags: { pillar: 'Soul' },
      metadata: { boosterMultiplier: HUNT_BOOSTER_MULTIPLIER },
    },
  ],
  skill: [
    {
      templateId: 'skill-grounding',
      slot: 'skill',
      title: 'Grounding express',
      summary: 'Reforzá el stat más bajo con checkpoints diarios.',
      difficulty: 'low',
      reward: { xp: 120, currency: 6 },
      objectives: [
        {
          id: 'grounding_checkpoints',
          label: 'Checkpoints completados',
          target: 4,
          unit: 'tasks',
        },
      ],
      tags: { trait: 'Grounding' },
      metadata: { cadence: 'weekly' },
    },
    {
      templateId: 'skill-creative-bursts',
      slot: 'skill',
      title: 'Micro nodos creativos',
      summary: 'Activá nodos creativos 5 veces en 14 días.',
      difficulty: 'medium',
      reward: { xp: 140, currency: 7 },
      objectives: [
        {
          id: 'creative_nodes',
          label: 'Micro nodos completados',
          target: 5,
          unit: 'tasks',
        },
      ],
      tags: { trait: 'Creativity' },
      metadata: { cadence: 'biweekly' },
    },
    {
      templateId: 'skill-breathing',
      slot: 'skill',
      title: 'Respiración consciente',
      summary: 'Dedicá sesiones breves de respiración consciente.',
      difficulty: 'low',
      reward: { xp: 110, currency: 5 },
      objectives: [
        {
          id: 'breathing_sessions',
          label: 'Sesiones registradas',
          target: 3,
          unit: 'tasks',
        },
      ],
      tags: { trait: 'Calm' },
      metadata: { cadence: 'weekly' },
    },
  ],
};

type BoosterState = {
  multiplier: number;
  targetTaskId: string | null;
  appliedKeys: Set<string>;
};

type MissionsBoardState = {
  board: MissionsBoard;
  booster: BoosterState;
};

const boardStore = new Map<string, MissionsBoardState>();

function nowIso(): string {
  return new Date().toISOString();
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function computeSeasonId(reference = new Date()): string {
  const year = reference.getUTCFullYear();
  const quarter = Math.floor(reference.getUTCMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

function createBossState(): BossState {
  const now = nowIso();
  return {
    phase: 1,
    shield: { current: HUNT_SHIELD_MAX, max: HUNT_SHIELD_MAX, updatedAt: now },
    linkedDailyTaskId: null,
    linkedAt: null,
    phase2: { ready: false, proof: null, submittedAt: null },
  };
}

function generateMissionId(templateId: string, userId: string): string {
  const hash = createHash('sha1');
  hash.update(templateId);
  hash.update(userId);
  hash.update(randomUUID());
  return `mst_${hash.digest('hex').slice(0, 16)}`;
}

function cloneProposal(base: Omit<MissionProposal, 'id'> & { templateId: string }, userId: string): MissionProposal {
  return {
    ...base,
    id: generateMissionId(base.templateId, userId),
  };
}

function createSlotState(slot: MissionSlotKey, proposals: MissionProposal[]): MissionSlotState {
  return {
    slot,
    proposals,
    selected: null,
    reroll: {
      usedAt: null,
      nextResetAt: null,
      remaining: REROLL_LIMIT,
      total: REROLL_LIMIT,
    },
  };
}

function deepCloneBoard(board: MissionsBoard): MissionsBoard {
  return JSON.parse(JSON.stringify(board)) as MissionsBoard;
}

function ensureBoardState(userId: string): MissionsBoardState {
  const existing = boardStore.get(userId);
  if (existing) {
    refreshRerolls(existing.board);
    return existing;
  }

  const proposalsBySlot = Object.fromEntries(
    MISSION_SLOT_KEYS.map((slot) => [slot, slotTemplates[slot].map((template) => cloneProposal(template, userId))]),
  ) as Record<MissionSlotKey, MissionProposal[]>;

  const board: MissionsBoard = {
    userId,
    seasonId: computeSeasonId(),
    generatedAt: nowIso(),
    slots: MISSION_SLOT_KEYS.map((slot) => createSlotState(slot, proposalsBySlot[slot])),
    boss: createBossState(),
  };

  for (const slot of MISSION_SLOT_KEYS) {
    recordMissionsV2Event('missions_v2_proposals_created', {
      userId,
      data: { slot, proposals: proposalsBySlot[slot].map((proposal) => proposal.id), reason: 'initial_seed' },
    });
  }

  const state: MissionsBoardState = {
    board,
    booster: {
      multiplier: HUNT_BOOSTER_MULTIPLIER,
      targetTaskId: null,
      appliedKeys: new Set(),
    },
  };

  boardStore.set(userId, state);
  return state;
}

function refreshRerolls(board: MissionsBoard): void {
  const now = Date.now();

  for (const slot of board.slots) {
    const { reroll } = slot;
    if (reroll.remaining > 0) {
      continue;
    }

    const resetAtIso = reroll.nextResetAt ?? (reroll.usedAt ? addDays(new Date(reroll.usedAt), REROLL_COOLDOWN_DAYS).toISOString() : null);

    if (!resetAtIso) {
      reroll.remaining = reroll.total;
      reroll.usedAt = null;
      reroll.nextResetAt = null;
      continue;
    }

    const resetAt = new Date(resetAtIso).getTime();

    if (Number.isNaN(resetAt) || now >= resetAt) {
      reroll.remaining = reroll.total;
      reroll.usedAt = null;
      reroll.nextResetAt = null;
    }
  }
}

function findSlot(state: MissionsBoardState, slotKey: MissionSlotKey): MissionSlotState {
  const slot = state.board.slots.find((entry) => entry.slot === slotKey);
  if (!slot) {
    throw new Error(`Missing slot state for ${slotKey}`);
  }
  return slot;
}

function resolveProposal(slot: MissionSlotState, missionId: string): MissionProposal | undefined {
  return slot.proposals.find((proposal) => proposal.id === missionId);
}

function assignSelection(
  state: MissionsBoardState,
  slotKey: MissionSlotKey,
  mission: MissionProposal,
  options?: { reason?: string; auto?: boolean; targetOverride?: number | null },
): MissionSelectionState {
  const slot = findSlot(state, slotKey);
  const now = nowIso();
  const expiresAt = addDays(new Date(), slotKey === 'skill' ? 14 : 7).toISOString();

  const target = options?.targetOverride ?? mission.objectives[0]?.target ?? 1;

  const selection: MissionSelectionState = {
    mission,
    status: 'active',
    selectedAt: now,
    updatedAt: now,
    expiresAt,
    progress: {
      current: 0,
      target: Math.max(target, 1),
      unit: mission.objectives[0]?.unit ?? 'tasks',
      updatedAt: now,
    },
  };

  slot.selected = selection;

  if (slotKey === 'hunt') {
    state.booster.targetTaskId = null;
    state.booster.appliedKeys.clear();
    if (mission.metadata?.boosterMultiplier && typeof mission.metadata.boosterMultiplier === 'number') {
      state.booster.multiplier = mission.metadata.boosterMultiplier;
    } else {
      state.booster.multiplier = HUNT_BOOSTER_MULTIPLIER;
    }
  }

  recordMissionsV2Event('missions_v2_selected', {
    userId: state.board.userId,
    data: {
      slot: slotKey,
      missionId: mission.id,
      auto: options?.auto ?? false,
      reason: options?.reason ?? null,
      expiresAt,
      target: selection.progress.target,
    },
  });

  state.board.generatedAt = now;

  return selection;
}

function ensureProposals(state: MissionsBoardState, slotKey: MissionSlotKey, reason: string): MissionProposal[] {
  const slot = findSlot(state, slotKey);

  if (slot.proposals.length > 0) {
    return slot.proposals;
  }

  const proposals = slotTemplates[slotKey].map((template) => cloneProposal(template, state.board.userId));
  slot.proposals = proposals;

  recordMissionsV2Event('missions_v2_proposals_created', {
    userId: state.board.userId,
    data: { slot: slotKey, reason, proposals: proposals.map((proposal) => proposal.id) },
  });

  return proposals;
}

export async function getMissionBoard(userId: string): Promise<MissionsBoard> {
  const state = ensureBoardState(userId);
  refreshRerolls(state.board);
  return deepCloneBoard(state.board);
}

export async function selectMission(
  userId: string,
  slotKey: MissionSlotKey,
  missionId: string,
): Promise<MissionSelectionState> {
  const state = ensureBoardState(userId);
  const slot = findSlot(state, slotKey);

  const mission = resolveProposal(slot, missionId);

  if (!mission) {
    throw new Error(`Mission ${missionId} not found for slot ${slotKey}`);
  }

  return assignSelection(state, slotKey, mission, { reason: 'manual_select', auto: false });
}

export async function rerollMissionSlot(userId: string, slotKey: MissionSlotKey): Promise<MissionSlotState> {
  const state = ensureBoardState(userId);
  const slot = findSlot(state, slotKey);

  refreshRerolls(state.board);

  if (slot.reroll.remaining <= 0) {
    throw new Error(`Reroll limit reached for slot ${slotKey}`);
  }

  const proposals = slotTemplates[slotKey].map((template) => cloneProposal(template, userId));
  slot.proposals = proposals;
  slot.reroll.remaining = 0;
  slot.reroll.usedAt = nowIso();
  slot.reroll.nextResetAt = addDays(new Date(slot.reroll.usedAt), REROLL_COOLDOWN_DAYS).toISOString();

  recordMissionsV2Event('missions_v2_reroll', {
    userId,
    data: {
      slot: slotKey,
      nextResetAt: slot.reroll.nextResetAt,
    },
  });

  recordMissionsV2Event('missions_v2_proposals_created', {
    userId,
    data: { slot: slotKey, reason: 'reroll', proposals: proposals.map((proposal) => proposal.id) },
  });

  state.board.generatedAt = nowIso();

  return deepCloneBoard(state.board).slots.find((entry) => entry.slot === slotKey)!;
}

export async function regenerateMissionProposals(
  userId: string,
  slotKey: MissionSlotKey,
  reason: string,
): Promise<MissionSlotState> {
  const state = ensureBoardState(userId);
  const proposals = slotTemplates[slotKey].map((template) => cloneProposal(template, userId));
  const slot = findSlot(state, slotKey);
  slot.proposals = proposals;
  slot.reroll.remaining = REROLL_LIMIT;
  slot.reroll.usedAt = null;
  slot.reroll.nextResetAt = null;

  recordMissionsV2Event('missions_v2_proposals_created', {
    userId,
    data: { slot: slotKey, reason, proposals: proposals.map((proposal) => proposal.id) },
  });

  state.board.generatedAt = nowIso();

  return deepCloneBoard(state.board).slots.find((entry) => entry.slot === slotKey)!;
}

export async function linkDailyToHuntMission(
  userId: string,
  missionId: string,
  dailyTaskId: string,
): Promise<{ missionId: string; taskId: string; linkedAt: string }> {
  const state = ensureBoardState(userId);
  const huntSlot = findSlot(state, 'hunt');

  if (!huntSlot.selected || huntSlot.selected.mission.id !== missionId) {
    throw new Error('Hunt mission not selected or mismatch');
  }

  const linkedAt = nowIso();
  state.booster.targetTaskId = dailyTaskId;
  state.booster.appliedKeys.clear();
  state.board.boss.linkedDailyTaskId = dailyTaskId;
  state.board.boss.linkedAt = linkedAt;
  state.board.boss.phase = 1;
  state.board.boss.phase2.ready = false;
  state.board.generatedAt = linkedAt;

  recordMissionsV2Event('missions_v2_progress_tick', {
    userId,
    data: {
      slot: 'hunt',
      missionId,
      action: 'link_daily',
      taskId: dailyTaskId,
    },
  });

  return { missionId, taskId: dailyTaskId, linkedAt };
}

export async function registerBossPhase2(
  userId: string,
  payload: { missionId: string; proof: string },
): Promise<BossState> {
  const state = ensureBoardState(userId);
  const huntSlot = findSlot(state, 'hunt');

  if (!huntSlot.selected || huntSlot.selected.mission.id !== payload.missionId) {
    throw new Error('Mission is not the active Hunt for this user');
  }

  if (!state.board.boss.phase2.ready) {
    throw new Error('Boss is not ready for phase 2');
  }

  if (state.board.boss.phase2.proof) {
    return deepCloneBoard(state.board).boss;
  }

  state.board.boss.phase = 2;
  state.board.boss.phase2.proof = payload.proof;
  state.board.boss.phase2.submittedAt = nowIso();
  state.board.generatedAt = state.board.boss.phase2.submittedAt;

  recordMissionsV2Event('missions_v2_boss_phase2_finish', {
    userId,
    data: {
      missionId: payload.missionId,
      proofLength: payload.proof.length,
    },
  });

  return deepCloneBoard(state.board).boss;
}

export async function claimMissionReward(
  userId: string,
  missionId: string,
): Promise<MissionSelectionState> {
  const state = ensureBoardState(userId);

  const slot = state.board.slots.find((entry) => entry.selected?.mission.id === missionId);

  if (!slot || !slot.selected) {
    throw new Error('Mission is not active for this user');
  }

  const selection = slot.selected;

  if (selection.status !== 'completed' && selection.status !== 'claimed') {
    throw new Error('Mission is not ready to be claimed');
  }

  if (selection.status === 'claimed') {
    return deepCloneBoard(state.board).slots.find((entry) => entry.selected?.mission.id === missionId)!.selected!;
  }

  const claimedAt = nowIso();
  selection.status = 'claimed';
  selection.updatedAt = claimedAt;
  selection.claim = {
    claimedAt,
    reward: selection.mission.reward,
  };

  recordMissionsV2Event('missions_v2_reward_claimed', {
    userId,
    data: {
      missionId,
      slot: slot.slot,
      reward: selection.mission.reward,
    },
  });

  state.board.generatedAt = claimedAt;

  return deepCloneBoard(state.board).slots.find((entry) => entry.selected?.mission.id === missionId)!.selected!;
}

type HuntBoosterInput = {
  userId: string;
  date: string;
  completedTaskIds: string[];
  baseXpDelta: number;
  xpTotalToday: number;
};

type HuntBoosterResult = {
  xp_delta: number;
  xp_total_today: number;
  boosterApplied: boolean;
  multiplier: number;
};

export async function applyHuntXpBoost({
  userId,
  date,
  completedTaskIds,
  baseXpDelta,
  xpTotalToday,
}: HuntBoosterInput): Promise<HuntBoosterResult> {
  const state = ensureBoardState(userId);
  const huntSlot = findSlot(state, 'hunt');

  if (!huntSlot.selected || !state.booster.targetTaskId) {
    return {
      xp_delta: baseXpDelta,
      xp_total_today: xpTotalToday,
      boosterApplied: false,
      multiplier: state.booster.multiplier,
    };
  }

  const targetTaskId = state.booster.targetTaskId;

  if (!completedTaskIds.includes(targetTaskId)) {
    return {
      xp_delta: baseXpDelta,
      xp_total_today: xpTotalToday,
      boosterApplied: false,
      multiplier: state.booster.multiplier,
    };
  }

  const submissionKey = `${date}:${targetTaskId}`;

  if (state.booster.appliedKeys.has(submissionKey)) {
    return {
      xp_delta: baseXpDelta,
      xp_total_today: xpTotalToday,
      boosterApplied: false,
      multiplier: state.booster.multiplier,
    };
  }

  state.booster.appliedKeys.add(submissionKey);

  const multiplier = state.booster.multiplier;
  const bonus = Math.round(baseXpDelta * (multiplier - 1));
  const appliedBonus = Number.isFinite(bonus) && bonus > 0 ? bonus : Math.max(Math.round(huntSlot.selected.mission.reward.xp * 0.1), 10);

  const newXpDelta = baseXpDelta + appliedBonus;
  const newXpTotal = xpTotalToday + appliedBonus;

  const progress = huntSlot.selected.progress;
  progress.current = Math.min(progress.target, progress.current + 1);
  progress.updatedAt = nowIso();
  huntSlot.selected.updatedAt = progress.updatedAt;

  recordMissionsV2Event('missions_v2_progress_tick', {
    userId,
    data: {
      missionId: huntSlot.selected.mission.id,
      slot: 'hunt',
      progress: progress.current,
      target: progress.target,
      boostApplied: true,
      multiplier,
      baseXpDelta,
      bonusXp: appliedBonus,
    },
  });

  if (state.board.boss.shield.current > 0) {
    state.board.boss.shield.current = Math.max(0, state.board.boss.shield.current - 1);
    state.board.boss.shield.updatedAt = progress.updatedAt;

    recordMissionsV2Event('missions_v2_boss_phase1_tick', {
      userId,
      data: {
        missionId: huntSlot.selected.mission.id,
        shieldRemaining: state.board.boss.shield.current,
      },
    });

    if (state.board.boss.shield.current === 0) {
      state.board.boss.phase = 2;
      state.board.boss.phase2.ready = true;
    }
  }

  if (progress.current >= progress.target) {
    huntSlot.selected.status = 'completed';
  }

  state.board.generatedAt = progress.updatedAt;

  return {
    xp_delta: newXpDelta,
    xp_total_today: newXpTotal,
    boosterApplied: true,
    multiplier,
  };
}

export async function runWeeklyAutoSelection(userId: string): Promise<MissionsBoard> {
  const state = ensureBoardState(userId);
  const profile = await getUserProfile(userId).catch(() => null);
  const modeCode = profile?.modeCode ?? null;

  for (const slotKey of MISSION_SLOT_KEYS) {
    ensureProposals(state, slotKey, 'weekly_autofill');
    const slot = findSlot(state, slotKey);

    if (slot.selected) {
      continue;
    }

    const proposals = slot.proposals;
    if (proposals.length === 0) {
      continue;
    }

    let candidate = proposals[0];
    let targetOverride: number | null = null;

    if (slotKey === 'hunt' && modeCode) {
      const normalized = modeCode.toUpperCase();
      targetOverride = MODE_TO_HUNT_TARGET[normalized] ?? null;
      candidate = proposals[Math.min(proposals.length - 1, Math.max((targetOverride ?? 3) - 1, 0))];
    }

    if (slotKey === 'main' && modeCode && modeCode.toUpperCase() === 'EVOLVE') {
      candidate = proposals.find((item) => item.difficulty === 'high') ?? candidate;
    }

    assignSelection(state, slotKey, candidate, {
      reason: 'weekly_auto_select',
      auto: true,
      targetOverride: targetOverride ?? undefined,
    });
  }

  state.board.generatedAt = nowIso();
  return deepCloneBoard(state.board);
}

export async function runFortnightlyBossMaintenance(userId: string): Promise<MissionsBoard> {
  const state = ensureBoardState(userId);

  if (state.board.boss.shield.current === 0 && state.board.boss.phase2.proof) {
    state.board.boss.shield.current = HUNT_SHIELD_MAX;
    state.board.boss.shield.updatedAt = nowIso();
    state.board.boss.phase = 1;
    state.board.boss.phase2 = { ready: false, proof: null, submittedAt: null };
    state.board.boss.linkedDailyTaskId = null;
    state.board.boss.linkedAt = null;

    recordMissionsV2Event('missions_v2_proposals_created', {
      userId,
      data: { slot: 'hunt', reason: 'boss_cycle_reset', proposals: findSlot(state, 'hunt').proposals.map((p) => p.id) },
    });
  }

  state.board.generatedAt = nowIso();
  return deepCloneBoard(state.board);
}

export function resetMissionsState(): void {
  boardStore.clear();
}

import { createHash, randomUUID } from 'node:crypto';
import {
  MISSION_SLOT_KEYS,
  type BossPhase2Response,
  type BossState,
  type BossStateResponse,
  type MissionAction,
  type MissionClaimResponse,
  type MissionClaimState,
  type MissionDailyLinkResponse,
  type MissionHeartbeatResponse,
  type MissionPetals,
  type MissionProposal,
  type MissionSelectionState,
  type MissionSlotKey,
  type MissionSlotState,
  type MissionsBoard,
  type MissionsBoardCommunication,
  type MissionsBoardGating,
  type MissionsBoardResponse,
  type MissionsBoardRewardSummary,
  type MissionsBoardRewards,
  type MissionsBoardSlotResponse,
  type MissionsBoardState,
  type MissionClaimStatus,
} from './missionsV2Types.js';
import { recordMissionsV2Event } from './missionsV2Telemetry.js';
import {
  clearMissionsV2States,
  loadMissionsV2State,
  saveMissionsV2State,
} from './missionsV2Repository.js';
import { getUserProfile } from '../controllers/users/user-state-service.js';

const REROLL_LIMIT = 1;
const REROLL_COOLDOWN_DAYS = 7;
const HUNT_SHIELD_MAX = 6;
const HUNT_BOOSTER_MULTIPLIER = 1.5;
const DEFAULT_PETALS = 3;
const CLAIM_VIEW_PATH = '/dashboard-v3/missions-v2';

const MODE_TO_HUNT_TARGET: Record<string, number> = {
  LOW: 1,
  CHILL: 2,
  FLOW: 3,
  EVOLVE: 4,
};

const boardStore = new Map<string, MissionsBoardState>();

const slotTemplates: Record<
  MissionSlotKey,
  (Omit<MissionProposal, 'id'> & { templateId: string })[]
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

function nowIso(): string {
  return new Date().toISOString();
}

function todayKey(reference = new Date()): string {
  return reference.toISOString().slice(0, 10);
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
    cooldownUntil: null,
  };
}

async function persistState(userId: string, state: MissionsBoardState): Promise<void> {
  await saveMissionsV2State(userId, JSON.parse(JSON.stringify(state)) as MissionsBoardState);
}

function hydrateState(raw: MissionsBoardState): MissionsBoardState {
  return {
    board: raw.board,
    booster: {
      multiplier: raw.booster.multiplier,
      targetTaskId: raw.booster.targetTaskId,
      appliedKeys: Array.from(new Set(raw.booster.appliedKeys ?? [])),
    },
  };
}

async function ensureBoardState(userId: string): Promise<MissionsBoardState> {
  const existing = boardStore.get(userId);
  if (existing) {
    refreshRerolls(existing.board);
    return existing;
  }

  const stored = await loadMissionsV2State(userId);
  if (stored) {
    const hydrated = hydrateState(stored);
    refreshRerolls(hydrated.board);
    boardStore.set(userId, hydrated);
    return hydrated;
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
      appliedKeys: [],
    },
  };

  boardStore.set(userId, state);
  await persistState(userId, state);
  return state;
}

async function ensureBoard(userId: string): Promise<MissionsBoard> {
  const cached = boardCache.get(userId);
  if (cached) {
    return cached;
  }

  const persisted = await getPersistedBoard(userId);
  if (persisted) {
    boardCache.set(userId, persisted);
    return persisted;
  }

  const created = createDefaultBoard();
  boardCache.set(userId, created);
  await savePersistedBoard(userId, created);
  return created;
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

function createPetalState(): MissionPetals {
  return { total: DEFAULT_PETALS, remaining: DEFAULT_PETALS };
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
    petals: createPetalState(),
    heartbeatLog: [],
  };

  slot.selected = selection;
  slot.cooldownUntil = null;

  if (slotKey === 'hunt') {
    state.booster.targetTaskId = null;
    state.booster.appliedKeys = [];
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

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((numerator / denominator) * 100));
}

function deriveSlotState(selection: MissionSelectionState | null): 'idle' | 'active' | 'succeeded' | 'failed' | 'claimed' {
  if (!selection) {
    return 'idle';
  }

  if (selection.status === 'completed') {
    return 'succeeded';
  }

  return selection.status;
}

function computeClaimState(
  selection: MissionSelectionState | null,
  options: { claimAllowed: boolean },
): MissionClaimState {
  if (!selection) {
    return {
      enabled: false,
      status: 'locked',
      cooldown_until: null,
      claimed_at: null,
    };
  }

  const claimedAt = selection.claim?.claimedAt ?? null;
  const baseReward = selection.claim?.reward ?? selection.mission.reward;
  let status: MissionClaimStatus = 'locked';

  if (selection.status === 'claimed') {
    status = 'claimed';
  } else if (selection.status === 'completed') {
    status = 'ready';
  }

  const enabled = options.claimAllowed && status === 'ready';

  return {
    enabled,
    status,
    cooldown_until: selection.status === 'failed' ? selection.expiresAt : null,
    claimed_at: claimedAt,
    reward: status === 'claimed' || status === 'ready' ? baseReward : undefined,
  };
}

function buildSlotActions(
  slot: MissionSlotState,
  selection: MissionSelectionState | null,
  boss: BossState,
): MissionAction[] {
  const actions: MissionAction[] = [];

  actions.push({
    type: 'select',
    available: selection === null,
    proposals: slot.proposals,
  });

  actions.push({
    type: 'reroll',
    available: slot.reroll.remaining > 0,
    remaining: slot.reroll.remaining,
    next_reset_at: slot.reroll.nextResetAt,
  });

  if (selection) {
    actions.push({
      type: 'heartbeat',
      available: selection.status === 'active' || selection.status === 'completed',
      last_marked_at: selection.heartbeatLog.at(-1) ?? null,
    });
  }

  if (slot.slot === 'hunt') {
    actions.push({
      type: 'link_daily',
      available: selection !== null,
      linked_task_id: boss.linkedDailyTaskId,
    });

    actions.push({
      type: 'special_strike',
      available: selection?.status === 'completed',
      ready: boss.phase2.ready,
    });
  }

  return actions;
}

function buildBossResponse(boss: BossState): BossStateResponse {
  return {
    phase: boss.phase,
    shield: boss.shield,
    linked_daily_task_id: boss.linkedDailyTaskId,
    linked_at: boss.linkedAt,
    phase2: {
      ready: boss.phase2.ready,
      proof_submitted_at: boss.phase2.submittedAt,
    },
  };
}

function buildBoardResponse(
  state: MissionsBoardState,
  options?: { claimAccess?: 'allowed' | 'blocked' },
): MissionsBoardResponse {
  const claimAllowed = (options?.claimAccess ?? 'allowed') !== 'blocked';
  const board = state.board;
  const today = todayKey();

  const rewards: MissionsBoardRewards = {
    pending: [],
    claimed: [],
  };

  const slots: MissionsBoardSlotResponse[] = board.slots.map((slot) => {
    const selection = slot.selected;
    const mission = selection?.mission ?? null;
    const petals: MissionPetals = selection?.petals ?? createPetalState();
    const heartbeatLog = selection?.heartbeatLog ?? [];
    const heartbeatToday = heartbeatLog.some((stamp) => stamp.startsWith(today));
    const countdown = {
      ends_at: selection?.expiresAt ?? null,
      cooldown_until: slot.cooldownUntil,
    };
    const progress = selection
      ? {
          current: selection.progress.current,
          target: selection.progress.target,
          percent: toPercent(selection.progress.current, selection.progress.target),
        }
      : { current: 0, target: 0, percent: 0 };

    const claim = computeClaimState(selection, { claimAllowed });

    if (selection && mission) {
      const summary: MissionsBoardRewardSummary = {
        mission_id: mission.id,
        slot: slot.slot,
        reward: selection.claim?.reward ?? mission.reward,
        status: claim.status === 'claimed' ? 'claimed' : 'pending',
        updated_at: selection.updatedAt,
      };

      if (claim.status === 'claimed') {
        rewards.claimed.push(summary);
      } else if (claim.status === 'ready') {
        rewards.pending.push(summary);
      }
    }

    return {
      id: `${board.userId}:${slot.slot}`,
      slot: slot.slot,
      mission,
      state: deriveSlotState(selection),
      petals,
      heartbeat_today: heartbeatToday,
      heartbeat_log: heartbeatLog,
      progress,
      countdown,
      actions: buildSlotActions(slot, selection, board.boss),
      claim,
      proposals: slot.proposals,
    };
  });

  const communications: MissionsBoardCommunication[] = [];

  const gating: MissionsBoardGating = {
    claim: {
      enabled: claimAllowed,
      url: CLAIM_VIEW_PATH,
    },
  };

  return {
    season_id: board.seasonId,
    generated_at: board.generatedAt,
    slots,
    boss: buildBossResponse(board.boss),
    rewards,
    gating,
    communications,
  };
}

export async function getMissionBoard(
  userId: string,
  options?: { claimAccess?: 'allowed' | 'blocked' },
): Promise<MissionsBoardResponse> {
  const state = await ensureBoardState(userId);
  refreshRerolls(state.board);
  await persistState(userId, state);
  return buildBoardResponse(state, options);
}

export async function registerMissionHeartbeat(
  userId: string,
  missionId: string,
): Promise<MissionHeartbeatResponse> {
  const state = await ensureBoardState(userId);
  const slot = state.board.slots.find((entry) => entry.selected?.mission.id === missionId);

  if (!slot || !slot.selected) {
    throw new Error('Mission is not active for this user');
  }

  if (slot.selected.status !== 'active' && slot.selected.status !== 'completed') {
    throw new Error('Mission is not eligible for heartbeat');
  }

  const now = nowIso();
  const key = todayKey(new Date(now));
  const alreadyMarked = slot.selected.heartbeatLog.some((stamp) => stamp.startsWith(key));

  if (!alreadyMarked) {
    slot.selected.heartbeatLog.push(now);
    slot.selected.updatedAt = now;
    state.board.generatedAt = now;
  }

  recordMissionsV2Event('missions_v2_heartbeat', {
    userId,
    data: { missionId, slot: slot.slot, heartbeatCount: slot.selected.heartbeatLog.length },
  });

  await persistState(userId, state);

  return {
    mission_id: missionId,
    petals_remaining: slot.selected.petals.remaining,
    heartbeat_timestamps: [...slot.selected.heartbeatLog],
    updated_at: slot.selected.updatedAt,
  };
}

export async function selectMission(
  userId: string,
  slotKey: MissionSlotKey,
  missionId: string,
): Promise<MissionsBoardResponse> {
  const state = await ensureBoardState(userId);
  const slot = findSlot(state, slotKey);

  const mission = resolveProposal(slot, missionId);

  if (!mission) {
    throw new Error(`Mission ${missionId} not found for slot ${slotKey}`);
  }

  assignSelection(state, slotKey, mission, { reason: 'manual_select', auto: false });
  await persistState(userId, state);
  return buildBoardResponse(state);
}

export async function rerollMissionSlot(userId: string, slotKey: MissionSlotKey): Promise<MissionsBoardResponse> {
  const state = await ensureBoardState(userId);
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
  await persistState(userId, state);
  return buildBoardResponse(state);
}

export async function regenerateMissionProposals(
  userId: string,
  slotKey: MissionSlotKey,
  reason: string,
): Promise<MissionsBoardResponse> {
  const state = await ensureBoardState(userId);
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
  await persistState(userId, state);
  return buildBoardResponse(state);
}

export async function linkDailyToHuntMission(
  userId: string,
  missionId: string,
  dailyTaskId: string,
): Promise<MissionDailyLinkResponse> {
  const state = await ensureBoardState(userId);
  const huntSlot = findSlot(state, 'hunt');

  if (!huntSlot.selected || huntSlot.selected.mission.id !== missionId) {
    throw new Error('Hunt mission not selected or mismatch');
  }

  const linkedAt = nowIso();
  state.booster.targetTaskId = dailyTaskId;
  state.booster.appliedKeys = [];
  state.board.boss.linkedDailyTaskId = dailyTaskId;
  state.board.boss.linkedAt = linkedAt;
  state.board.boss.phase = 1;
  state.board.boss.phase2.ready = false;
  state.board.generatedAt = linkedAt;

  recordMissionsV2Event('missions_v2_progress_tick', {
    userId,
    data: { slot: 'hunt', missionId, action: 'link_daily', taskId },
  });

  await persistState(userId, state);

  return {
    mission_id: missionId,
    task_id: dailyTaskId,
    linked_at: linkedAt,
    board: buildBoardResponse(state),
  };
}

export async function registerBossPhase2(
  userId: string,
  payload: { missionId: string; proof: string },
): Promise<BossPhase2Response> {
  const state = await ensureBoardState(userId);
  const huntSlot = findSlot(state, 'hunt');

  if (!huntSlot.selected || huntSlot.selected.mission.id !== payload.missionId) {
    throw new Error('Mission is not the active Hunt for this user');
  }

  board.boss.status = 'ready';
  const action = board.boss.actions.find((item) => item.type === 'special_strike');
  if (action) {
    action.enabled = true;
  }

  if (state.board.boss.phase2.proof) {
    return {
      boss_state: buildBossResponse(state.board.boss),
      rewards_preview: {
        xp: huntSlot.selected.mission.reward.xp,
        currency: huntSlot.selected.mission.reward.currency ?? 0,
        items: huntSlot.selected.mission.reward.items ?? [],
      },
    };
  }

  state.board.boss.phase = 2;
  state.board.boss.phase2.proof = payload.proof;
  state.board.boss.phase2.submittedAt = nowIso();
  state.board.generatedAt = state.board.boss.phase2.submittedAt;

  recordMissionsV2Event('missions_v2_boss_phase2_finish', {
    userId,
    data: { missionId: payload.missionId, proofLength: payload.proof.length },
  });

  await persistState(userId, state);

  return {
    boss_state: buildBossResponse(state.board.boss),
    rewards_preview: {
      xp: huntSlot.selected.mission.reward.xp,
      currency: huntSlot.selected.mission.reward.currency ?? 0,
      items: huntSlot.selected.mission.reward.items ?? [],
    },
  };
}

export async function claimMissionReward(
  userId: string,
  missionId: string,
): Promise<MissionClaimResponse> {
  const state = await ensureBoardState(userId);

  const slot = state.board.slots.find((entry) => entry.selected?.mission.id === missionId);

  if (!slot || !slot.selected) {
    throw new Error('Mission is not active for this user');
  }
  if (!slot.claim.available || !slot.claim.enabled) {
    throw new Error('Mission is not ready to be claimed');
  }

  if (selection.status !== 'claimed') {
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
  }

  await persistState(userId, state);
  const board = buildBoardResponse(state);
  const slotResponse = board.slots.find((entry) => entry.mission?.id === missionId);

  return {
    mission_id: missionId,
    claim: slotResponse?.claim ?? {
      enabled: false,
      status: 'locked',
      cooldown_until: null,
      claimed_at: selection.claim?.claimedAt ?? null,
      reward: selection.claim?.reward,
    },
    board,
  };
}

export type HuntBoosterInput = {
  userId: string;
  date: string;
  completedTaskIds: string[];
  baseXpDelta: number;
  xpTotalToday: number;
};

export type HuntBoosterResult = {
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
  const state = await ensureBoardState(userId);
  const huntSlot = findSlot(state, 'hunt');

    if (slot.progress.current >= slot.progress.target) {
      slot.state = 'succeeded';
      slot.claim.available = true;
      slot.claim.enabled = true;
    }

    board.generated_at = nowIso();
    await persistBoard(userId, board);

    recordMissionsV2Event('missions_v2_heartbeat', {
      userId,
      data: {
        missionId,
        slot: slot.slot,
        progress: slot.progress.current,
        target: slot.progress.target,
      },
    });
  }

  return {
    status: 'ok',
    petals_remaining: slot.petals.remaining,
    heartbeat_date: board.generated_at,
  };
}

  if (state.booster.appliedKeys.includes(submissionKey)) {
    return {
      xp_delta: baseXpDelta,
      xp_total_today: xpTotalToday,
      boosterApplied: false,
      multiplier: 1,
    };
  }

  state.booster.appliedKeys.push(submissionKey);

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

  if (bonusReady) {
    recordMissionsV2Event('missions_v2_progress_tick', {
      userId,
      data: {
        slot: 'hunt',
        missionId: huntSlot.mission.id,
        boostApplied: true,
        multiplier,
        baseXpDelta,
        bonusXp: 0,
      },
    });
  }

  state.board.generatedAt = progress.updatedAt;
  await persistState(userId, state);

  return {
    xp_delta: baseXpDelta,
    xp_total_today: xpTotalToday,
    boosterApplied: bonusReady,
    multiplier,
  };
}

export async function runWeeklyAutoSelection(userId: string): Promise<MissionsBoardResponse> {
  const state = await ensureBoardState(userId);
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
  await persistState(userId, state);
  return buildBoardResponse(state);
}

export async function runFortnightlyBossMaintenance(userId: string): Promise<MissionsBoardResponse> {
  const state = await ensureBoardState(userId);

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
  await persistState(userId, state);
  return buildBoardResponse(state);
}

export async function resetMissionsState(): Promise<void> {
  boardStore.clear();
  await clearMissionsV2States();
}

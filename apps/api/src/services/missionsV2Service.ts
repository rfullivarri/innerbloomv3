import { createHash, randomUUID } from 'node:crypto';
import {
  MISSION_SLOT_KEYS,
  type BossPhase2Response,
  type BossState,
  type BossStateResponse,
  type MissionAction,
  type MissionClaimResponse,
  type MissionClaimState,
  type MissionDefinition,
  type MissionDailyLinkResponse,
  type MissionEffect,
  type MissionHeartbeatResponse,
  type MissionPetals,
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
  type MissionSummary,
  type BoosterState,
} from './missionsV2Types.js';
import { recordMissionsV2Event } from './missionsV2Telemetry.js';
import {
  clearMissionsV2States,
  loadMissionsV2State,
  saveMissionsV2State,
} from './missionsV2Repository.js';
import { getUserProfile } from '../controllers/users/user-state-service.js';

type MissionTemplate = Omit<MissionDefinition, 'id'> & { templateId: string };

type MissionTemplateMap = Record<MissionSlotKey, MissionTemplate[]>;

type MissionBoardUpdate = {
  dirty: boolean;
};

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

const CLAIM_VIEW_PATH = '/dashboard-v3/missions-v2';
const DEFAULT_PETALS = 3;
const COOLDOWN_DAYS = 15;
const REROLL_COOLDOWN_DAYS = 7;
const HUNT_BOOSTER_MULTIPLIER = 1.5;
const BOSS_SHIELD_MAX = 6;
const DURATION_BY_SLOT: Record<MissionSlotKey, number> = {
  main: 14,
  hunt: 7,
  skill: 7,
};

const TASK_IDS = {
  MAIN_REFLECTION: '11111111-1111-4111-8111-111111111111',
  MAIN_PROOF: '11111111-1111-4111-8111-111111111112',
  HUNT_SESSION: '22222222-2222-4222-8222-222222222221',
  HUNT_LINKED: '22222222-2222-4222-8222-222222222222',
  SKILL_NODE: '33333333-3333-4333-8333-333333333331',
  SKILL_PROOF: '33333333-3333-4333-8333-333333333332',
} as const;

const missionTemplates: MissionTemplateMap = {
  main: [
    {
      templateId: 'main-act-2-heartbeat',
      slot: 'main',
      name: 'Acto 2: Mensaje y Primer Envío',
      summary: 'Convertí tu intención en un acto público dentro de la quincena.',
      requirements: 'Necesitás haber completado el Acto 1 y sostener Heartbeat por 7 días.',
      objective: 'Entregar la evidencia del acto central y registrar el aprendizaje clave.',
      reward: { xp: 320, currency: 20, items: ['Medalla de Acto'] },
      tasks: [
        { id: TASK_IDS.MAIN_REFLECTION, name: 'Reflexión diaria del Acto', tag: 'reflection' },
        { id: TASK_IDS.MAIN_PROOF, name: 'Subir evidencia del Acto', tag: 'proof' },
      ],
      difficulty: 'medium',
      metadata: { cadence: 'biweekly', narrative: 'acto_central' },
      durationDays: 14,
    },
  ],
  hunt: [
    {
      templateId: 'hunt-friction-chain',
      slot: 'hunt',
      name: 'Cadena de Fricción',
      summary: 'Atacá la tarea con mayor fricción y mantené la cadena activa.',
      requirements: 'Vinculá la tarea desde el Daily y activá el booster con Heartbeat.',
      objective: 'Lograr 3 sesiones consecutivas con booster activo.',
      reward: { xp: 200, currency: 12, items: ['Cofre de Cacería'] },
      tasks: [
        { id: TASK_IDS.HUNT_SESSION, name: 'Sesión de Hunt con booster', tag: 'session' },
        { id: TASK_IDS.HUNT_LINKED, name: 'Vincular Daily a la Hunt', tag: 'link' },
      ],
      difficulty: 'high',
      metadata: { boosterMultiplier: HUNT_BOOSTER_MULTIPLIER },
      durationDays: 7,
    },
  ],
  skill: [
    {
      templateId: 'skill-route-focus',
      slot: 'skill',
      name: 'Skill Route · Focus',
      summary: 'Entrená tu Focus completando micro-nodos guiados.',
      requirements: 'Elegí un horario y sostené Heartbeat diario.',
      objective: 'Completar 4 micro-nodos de Focus y compartir síntesis.',
      reward: { xp: 140, currency: 7, items: [] },
      tasks: [
        { id: TASK_IDS.SKILL_NODE, name: 'Micro-nodo de Focus', tag: 'skill_node' },
        { id: TASK_IDS.SKILL_PROOF, name: 'Compartir síntesis de avance', tag: 'proof' },
      ],
      difficulty: 'medium',
      metadata: { stat: 'Focus', cadence: 'weekly' },
      durationDays: 7,
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
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function differenceInDays(from: Date, to: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toPercent(current: number, target: number): number {
  if (target <= 0) {
    return 0;
  }
  return clamp(Math.round((current / target) * 100), 0, 100);
}

function generateMissionId(templateId: string, userId: string): string {
  const hash = createHash('sha1');
  hash.update(templateId);
  hash.update(userId);
  hash.update(randomUUID());
  return `mst_${hash.digest('hex').slice(0, 16)}`;
}

function cloneMission(template: MissionTemplate, userId: string): MissionDefinition {
  return {
    ...template,
    id: generateMissionId(template.templateId, userId),
    tasks: template.tasks.map((task) => ({ ...task })),
    reward: { ...template.reward, items: [...(template.reward.items ?? [])] },
  };
}

function createPetalState(base = DEFAULT_PETALS): MissionPetals {
  return { total: base, remaining: base, lastEvaluatedAt: todayKey() };
}

function createSlotState(slot: MissionSlotKey, userId: string): MissionSlotState {
  const proposals = missionTemplates[slot].map((template) => cloneMission(template, userId));
  return {
    slot,
    proposals,
    selected: null,
    reroll: {
      usedAt: null,
      nextResetAt: null,
      remaining: 1,
      total: 1,
    },
    cooldownUntil: null,
  };
}

async function persistState(
  userId: string,
  state: MissionsBoardState,
  update?: MissionBoardUpdate,
): Promise<void> {
  if (update && !update.dirty) {
    return;
  }

  const snapshot = JSON.parse(JSON.stringify(state)) as MissionsBoardState;
  await saveMissionsV2State(userId, snapshot);
}

function refreshRerolls(board: MissionsBoard, reference: Date = new Date()): void {
  for (const slot of board.slots) {
    if (!slot.reroll.usedAt) {
      continue;
    }

    const usedAt = new Date(slot.reroll.usedAt);
    const resetAt = addDays(usedAt, REROLL_COOLDOWN_DAYS);

    if (resetAt <= reference) {
      slot.reroll.remaining = slot.reroll.total;
      slot.reroll.usedAt = null;
      slot.reroll.nextResetAt = null;
    } else {
      slot.reroll.nextResetAt = resetAt.toISOString();
    }
  }
}

function findSlot(state: MissionsBoardState, slotKey: MissionSlotKey): MissionSlotState {
  const slot = state.board.slots.find((entry) => entry.slot === slotKey);

  if (!slot) {
    throw new Error(`Slot ${slotKey} not found`);
  }

  return slot;
}

function hydrateMissionDefinition(definition: MissionDefinition): MissionDefinition {
  const mission: MissionDefinition = {
    ...definition,
    reward: {
      xp: definition.reward.xp,
      currency: definition.reward.currency ?? 0,
      items: definition.reward.items ? [...definition.reward.items] : [],
    },
    tasks: definition.tasks.map((task) => ({ ...task })),
  };
  return mission;
}

function hydrateSelection(selection: MissionSelectionState | null): MissionSelectionState | null {
  if (!selection) {
    return null;
  }

  return {
    ...selection,
    mission: hydrateMissionDefinition(selection.mission),
    progress: { ...selection.progress },
    petals: { ...selection.petals },
    heartbeatLog: [...selection.heartbeatLog],
    claim: selection.claim
      ? {
          claimedAt: selection.claim.claimedAt,
          reward: {
            xp: selection.claim.reward.xp,
            currency: selection.claim.reward.currency ?? 0,
            items: selection.claim.reward.items ? [...selection.claim.reward.items] : [],
          },
        }
      : undefined,
  };
}

function hydrateState(raw: MissionsBoardState): MissionsBoardState {
  const reference = new Date();
  const board: MissionsBoard = {
    ...raw.board,
    slots: raw.board.slots.map((slot) => ({
      ...slot,
      proposals: slot.proposals.map(hydrateMissionDefinition),
      selected: hydrateSelection(slot.selected),
      reroll: { ...slot.reroll },
    })),
    boss: {
      ...raw.board.boss,
      shield: { ...raw.board.boss.shield },
      phase2: { ...raw.board.boss.phase2 },
    },
  };

  refreshRerolls(board, reference);

  const booster: BoosterState = {
    multiplier: raw.booster.multiplier ?? HUNT_BOOSTER_MULTIPLIER,
    targetTaskId: raw.booster.targetTaskId ?? null,
    appliedKeys: [...(raw.booster.appliedKeys ?? [])],
    nextActivationDate: raw.booster.nextActivationDate ?? null,
  };

  const effects = raw.effects.map((effect) => ({
    ...effect,
    payload: { ...(effect.payload ?? {}) },
  }));

  return { board, booster, effects };
}

function computeSeasonId(reference = new Date()): string {
  const year = reference.getUTCFullYear();
  const quarter = Math.floor(reference.getUTCMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

function createBoard(userId: string): MissionsBoard {
  return {
    userId,
    seasonId: computeSeasonId(),
    generatedAt: nowIso(),
    slots: MISSION_SLOT_KEYS.map((slot) => createSlotState(slot, userId)),
    boss: createBossState(),
  };
}

function createBossState(): BossState {
  return {
    phase: 1,
    shield: { current: BOSS_SHIELD_MAX, max: BOSS_SHIELD_MAX, updatedAt: nowIso() },
    linkedDailyTaskId: null,
    linkedAt: null,
    phase2: { ready: false, proof: null, submittedAt: null },
  };
}

function createInitialState(userId: string): MissionsBoardState {
  const board = createBoard(userId);
  for (const slot of board.slots) {
    recordMissionsV2Event('missions_v2_proposals_created', {
      userId,
      data: { slot: slot.slot, proposals: slot.proposals.map((proposal) => proposal.id), reason: 'initial_seed' },
    });
  }

  return {
    board,
    booster: { multiplier: HUNT_BOOSTER_MULTIPLIER, targetTaskId: null, appliedKeys: [], nextActivationDate: null },
    effects: [],
  };
}

async function ensureBoardState(userId: string): Promise<MissionsBoardState> {
  const existing = await loadMissionsV2State(userId);
  if (existing) {
    return hydrateState(existing);
  }

  const state = createInitialState(userId);
  await saveMissionsV2State(userId, state);
  return state;
}

function pruneExpiredEffects(state: MissionsBoardState, reference: Date): void {
  state.effects = state.effects.filter((effect) => {
    if (effect.consumedAt) {
      return differenceInDays(new Date(effect.consumedAt), reference) <= 0;
    }
    if (!effect.expiresAt) {
      return true;
    }
    return new Date(effect.expiresAt) >= reference;
  });
}

function applyDailyPetalDecay(state: MissionsBoardState, reference: Date): MissionBoardUpdate {
  let dirty = false;
  pruneExpiredEffects(state, reference);

  for (const slot of state.board.slots) {
    const selection = slot.selected;
    if (!selection || selection.status !== 'active') {
      continue;
    }

    const lastEvaluated = selection.petals.lastEvaluatedAt ? new Date(`${selection.petals.lastEvaluatedAt}T00:00:00Z`) : null;
    const today = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));

    if (!lastEvaluated || differenceInDays(lastEvaluated, today) <= 0) {
      selection.petals.lastEvaluatedAt = todayKey(reference);
      continue;
    }

    let petalsLost = 0;
    for (
      let cursor = addDays(lastEvaluated, 1);
      differenceInDays(cursor, today) > 0;
      cursor = addDays(cursor, 1)
    ) {
      const key = todayKey(cursor);
      const heartbeatForDay = selection.heartbeatLog.some((stamp) => stamp.startsWith(key));
      if (!heartbeatForDay) {
        petalsLost += 1;
        if (petalsLost >= selection.petals.remaining) {
          break;
        }
      }
    }

    if (petalsLost > 0) {
      selection.petals.remaining = Math.max(0, selection.petals.remaining - petalsLost);
      selection.updatedAt = nowIso();
      dirty = true;

      if (selection.petals.remaining <= 0) {
        selection.status = 'failed';
        selection.failureAt = selection.updatedAt;
        const cooldownDate = computeCooldownDate(reference, state.effects);
        selection.cooldownUntil = cooldownDate.toISOString();
        slot.cooldownUntil = selection.cooldownUntil;
      }
    }

    selection.petals.lastEvaluatedAt = todayKey(reference);
    dirty = true;
  }

  return { dirty };
}

function isCooldownActive(slot: MissionSlotState, reference: Date): boolean {
  if (!slot.cooldownUntil) {
    return false;
  }
  return new Date(slot.cooldownUntil) > reference;
}

function computeCooldownDate(reference: Date, effects: MissionEffect[]): Date {
  let base = addDays(reference, COOLDOWN_DAYS);
  const thaw = effects.find((effect) => effect.payload?.kind === 'cooldown_thaw' && !effect.consumedAt);

  if (thaw) {
    const reduction = typeof thaw.payload?.days === 'number' ? thaw.payload.days : COOLDOWN_DAYS;
    const adjusted = addDays(reference, Math.max(0, COOLDOWN_DAYS - reduction));
    thaw.consumedAt = reference.toISOString();
    base = adjusted;
  }

  return base;
}

function applyPetalEffects(
  state: MissionsBoardState,
  selection: MissionSelectionState,
  reference: Date,
): void {
  const bonus = state.effects.find((effect) => effect.payload?.kind === 'petal_shield' && !effect.consumedAt);
  const bonusPetals = typeof bonus?.payload?.bonus === 'number' ? Math.max(0, bonus.payload.bonus) : 0;
  const total = DEFAULT_PETALS + bonusPetals;

  selection.petals = {
    total,
    remaining: Math.min(total, selection.petals.remaining + bonusPetals),
    lastEvaluatedAt: todayKey(reference),
  };

  if (bonus) {
    bonus.consumedAt = reference.toISOString();
  }
}

function createSelection(mission: MissionDefinition, reference: Date): MissionSelectionState {
  const now = reference.toISOString();
  ensureMissionReward(mission);
  return {
    mission,
    status: 'active',
    selectedAt: now,
    updatedAt: now,
    expiresAt: addDays(reference, DURATION_BY_SLOT[mission.slot]).toISOString(),
    cooldownUntil: null,
    progress: {
      current: 0,
      target: Math.max(1, mission.tasks.length),
      unit: 'tasks',
      updatedAt: now,
    },
    petals: createPetalState(),
    heartbeatLog: [],
  };
}

function ensureMissionReward(mission: MissionDefinition): void {
  mission.reward = {
    xp: mission.reward.xp,
    currency: mission.reward.currency ?? 0,
    items: mission.reward.items ? [...mission.reward.items] : [],
  };
}

function buildMissionSummary(selection: MissionSelectionState | null): MissionSummary | null {
  if (!selection) {
    return null;
  }

  const mission = selection.mission;
  return {
    id: mission.id,
    name: mission.name,
    type: mission.slot,
    summary: mission.summary,
    requirements: mission.requirements,
    objective: mission.objective,
    reward: mission.reward,
    tasks: mission.tasks,
  };
}

function buildCountdown(selection: MissionSelectionState | null, slot: MissionSlotState, reference: Date): {
  ends_at: string | null;
  cooldown_until: string | null;
  label: string;
} {
  if (selection?.status === 'failed' && slot.cooldownUntil) {
    const cooldownDate = new Date(slot.cooldownUntil);
    const days = clamp(differenceInDays(reference, cooldownDate) * -1, 0, COOLDOWN_DAYS);
    return {
      ends_at: null,
      cooldown_until: slot.cooldownUntil,
      label: days > 0 ? `Cooldown ${days}d` : 'Cooldown listo',
    };
  }

  if (selection?.expiresAt) {
    const expires = new Date(selection.expiresAt);
    const days = clamp(differenceInDays(reference, expires), 0, DURATION_BY_SLOT[selection.mission.slot]);
    return {
      ends_at: selection.expiresAt,
      cooldown_until: null,
      label: days > 0 ? `Termina en ${days}d` : 'Último día',
    };
  }

  return { ends_at: null, cooldown_until: null, label: 'Sin límite' };
}

function buildClaimState(selection: MissionSelectionState | null, claimAllowed: boolean): MissionClaimState {
  if (!selection) {
    return { available: false, enabled: false, cooldown_until: null, claimed_at: null };
  }

  if (selection.status === 'claimed') {
    return {
      available: false,
      enabled: false,
      cooldown_until: selection.cooldownUntil ?? null,
      claimed_at: selection.claim?.claimedAt ?? selection.updatedAt,
      reward: selection.claim?.reward ?? selection.mission.reward,
    };
  }

  const available = selection.status === 'succeeded';
  return {
    available,
    enabled: available && claimAllowed,
    cooldown_until: selection.cooldownUntil ?? null,
    claimed_at: selection.claim?.claimedAt ?? null,
    reward: available ? selection.mission.reward : undefined,
  };
}

function deriveSlotState(selection: MissionSelectionState | null, slot: MissionSlotState, reference: Date):
  | 'idle'
  | 'active'
  | 'succeeded'
  | 'failed'
  | 'cooldown'
  | 'claimed' {
  if (!selection) {
    return isCooldownActive(slot, reference) ? 'cooldown' : 'idle';
  }

  if (selection.status === 'failed') {
    return 'failed';
  }

  if (selection.status === 'claimed') {
    return 'claimed';
  }

  if (selection.status === 'succeeded') {
    return 'succeeded';
  }

  return 'active';
}

function buildActions(
  slot: MissionSlotState,
  selection: MissionSelectionState | null,
  reference: Date,
  boss: BossState,
): MissionAction[] {
  const actions: MissionAction[] = [];

  if (selection) {
    const heartbeatToday = selection.heartbeatLog.some((stamp) => stamp.startsWith(todayKey(reference)));
    actions.push({
      id: `${selection.mission.id}:heartbeat`,
      type: 'heartbeat',
      label: heartbeatToday ? 'Heartbeat registrado' : 'Marcar Heartbeat',
      enabled: !heartbeatToday && selection.status === 'active',
    });

    if (slot.slot === 'hunt') {
      actions.push({
        id: `${selection.mission.id}:link_daily`,
        type: 'link_daily',
        label: 'Vincular Daily',
        enabled: true,
      });
    }

    if (slot.slot === 'hunt') {
      actions.push({
        id: `${selection.mission.id}:special_strike`,
        type: 'special_strike',
        label: 'Golpe Especial',
        enabled: boss.phase2.ready,
      });
    }

    actions.push({
      id: `${selection.mission.id}:submit_evidence`,
      type: 'submit_evidence',
      label: 'Entregar evidencia',
      enabled: selection.status === 'succeeded' && !selection.claim,
    });

    actions.push({
      id: `${selection.mission.id}:claim`,
      type: 'claim',
      label: 'Reclamar botín',
      enabled: selection.status === 'succeeded',
    });
  }

  actions.push({
    id: `${slot.slot}:abandon`,
    type: 'abandon',
    label: 'Abandono honroso',
    enabled: false,
  });

  return actions;
}

function buildBossResponse(board: MissionsBoard, reference: Date): BossStateResponse {
  const mainSlot = board.slots.find((slot) => slot.slot === 'main');
  const mainSelection = mainSlot?.selected ?? null;
  const hasActTwo = mainSelection ? differenceInDays(new Date(mainSelection.selectedAt), reference) <= -7 : false;
  const defeated = Boolean(board.boss.phase2.proof);
  let status: BossStateResponse['status'] = 'locked';

  if (defeated) {
    status = 'defeated';
  } else if (board.boss.phase2.ready) {
    status = 'ready';
  } else if (hasActTwo && mainSelection?.status === 'active') {
    status = 'available';
  }

  const countdownLabel = board.boss.phase2.ready
    ? 'Golpe especial disponible'
    : board.boss.shield.current > 0
    ? `Escudo ${board.boss.shield.current}/${board.boss.shield.max}`
    : 'Escudo roto';

  return {
    id: 'missions-boss',
    name: 'Boss Quincenal',
    status,
    description: 'Derribá el escudo con tus dailies vinculadas y rematá con el golpe especial.',
    countdown: {
      ends_at: mainSelection?.expiresAt ?? null,
      label: countdownLabel,
    },
    actions: [
      {
        id: 'boss:special_strike',
        type: 'special_strike',
        label: 'Golpe Especial',
        enabled: board.boss.phase2.ready,
      },
    ],
  };
}

function buildBoardResponse(
  state: MissionsBoardState,
  options?: { claimAccess?: 'allowed' | 'blocked' },
  reference: Date = new Date(),
): MissionsBoardResponse {
  const claimAllowed = (options?.claimAccess ?? 'allowed') === 'allowed';
  const board = state.board;
  const rewards: MissionsBoardRewards = { pending: [], claimed: [] };

  const slots: MissionsBoardSlotResponse[] = board.slots.map((slot) => {
    const selection = slot.selected;
    const mission = buildMissionSummary(selection);
    const heartbeatToday = selection ? selection.heartbeatLog.some((stamp) => stamp.startsWith(todayKey(reference))) : false;
    const claim = buildClaimState(selection, claimAllowed);
    const countdown = buildCountdown(selection, slot, reference);
    const progress = selection
      ? {
          current: selection.progress.current,
          target: selection.progress.target,
          percent: toPercent(selection.progress.current, selection.progress.target),
        }
      : { current: 0, target: 0, percent: 0 };

    if (selection && mission) {
      const summary: MissionsBoardRewardSummary = {
        mission_id: mission.id,
        slot: slot.slot,
        reward: claim.reward ?? mission.reward,
        status: selection.status === 'claimed' ? 'claimed' : claim.available ? 'pending' : 'pending',
        updated_at: selection.updatedAt,
      };
      if (selection.status === 'claimed') {
        rewards.claimed.push(summary);
      } else if (claim.available) {
        rewards.pending.push(summary);
      }
    }

    return {
      id: `${board.userId}:${slot.slot}`,
      slot: slot.slot,
      mission,
      state: deriveSlotState(selection, slot, reference),
      petals: selection ? selection.petals : createPetalState(),
      heartbeat_today: heartbeatToday,
      heartbeat_log: selection ? [...selection.heartbeatLog] : [],
      progress,
      countdown,
      actions: buildActions(slot, selection, reference, board.boss),
      claim,
    };
  });

  const communications: MissionsBoardCommunication[] = [];

  const gating: MissionsBoardGating = {
    claim_url: CLAIM_VIEW_PATH,
  };

  return {
    season_id: board.seasonId,
    generated_at: board.generatedAt,
    slots,
    boss: buildBossResponse(board, reference),
    rewards,
    gating,
    communications,
  };
}

function ensureProposals(state: MissionsBoardState, slotKey: MissionSlotKey, userId: string): void {
  const slot = state.board.slots.find((entry) => entry.slot === slotKey);
  if (!slot) {
    return;
  }
  if (slot.proposals.length === 0) {
    slot.proposals = missionTemplates[slotKey].map((template) => cloneMission(template, userId));
    recordMissionsV2Event('missions_v2_proposals_created', {
      userId,
      data: { slot: slotKey, reason: 'auto_regenerate', proposals: slot.proposals.map((proposal) => proposal.id) },
    });
  }
}

function resolveMissionProposal(slot: MissionSlotState, missionId: string): MissionDefinition | null {
  if (!missionId) {
    return null;
  }

  const index = slot.proposals.findIndex((proposal) => proposal.id === missionId);
  if (index === -1) {
    return null;
  }

  const [proposal] = slot.proposals.splice(index, 1);
  return proposal ?? null;
}

export async function getMissionBoard(
  userId: string,
  options?: { claimAccess?: 'allowed' | 'blocked' },
): Promise<MissionsBoardResponse> {
  const state = await ensureBoardState(userId);
  const reference = new Date();
  const update = applyDailyPetalDecay(state, reference);
  await persistState(userId, state, update.dirty ? { dirty: true } : undefined);
  return buildBoardResponse(state, options, reference);
}

export async function selectMission(
  userId: string,
  slotKey: MissionSlotKey,
  missionId: string,
): Promise<MissionsBoardResponse> {
  const state = await ensureBoardState(userId);
  const reference = new Date();
  applyDailyPetalDecay(state, reference);

  const slot = state.board.slots.find((entry) => entry.slot === slotKey);
  if (!slot) {
    throw new Error(`Slot ${slotKey} not found`);
  }
  if (slot.selected && slot.selected.status === 'active') {
    throw new Error('Slot already has an active mission');
  }
  if (isCooldownActive(slot, reference)) {
    throw new Error('Slot is in cooldown');
  }

  ensureProposals(state, slotKey, userId);
  const proposal = resolveMissionProposal(slot, missionId);
  if (!proposal) {
    throw new Error('Mission proposal not available');
  }

  const selection = createSelection(proposal, reference);
  applyPetalEffects(state, selection, reference);
  slot.selected = selection;
  slot.cooldownUntil = null;

  recordMissionsV2Event('missions_v2_selected', {
    userId,
    data: { slot: slotKey, missionId: proposal.id, expiresAt: selection.expiresAt, auto: false },
  });

  await persistState(userId, state, { dirty: true });
  return buildBoardResponse(state, undefined, reference);
}

export async function rerollMissionSlot(userId: string, slotKey: MissionSlotKey): Promise<MissionsBoardResponse> {
  const state = await ensureBoardState(userId);
  const reference = new Date();
  const slot = state.board.slots.find((entry) => entry.slot === slotKey);
  if (!slot) {
    throw new Error(`Slot ${slotKey} not found`);
  }

  if (slot.reroll.remaining <= 0) {
    throw new Error('No rerolls remaining');
  }

  slot.proposals = missionTemplates[slotKey].map((template) => cloneMission(template, userId));
  slot.reroll.remaining -= 1;
  slot.reroll.usedAt = reference.toISOString();
  slot.reroll.nextResetAt = addDays(reference, 7).toISOString();

  recordMissionsV2Event('missions_v2_reroll', {
    userId,
    data: { slot: slotKey, nextResetAt: slot.reroll.nextResetAt },
  });

  recordMissionsV2Event('missions_v2_proposals_created', {
    userId,
    data: { slot: slotKey, reason: 'reroll', proposals: slot.proposals.map((proposal) => proposal.id) },
  });

  await persistState(userId, state, { dirty: true });
  return buildBoardResponse(state, undefined, reference);
}

export async function regenerateMissionProposals(
  userId: string,
  slotKey: MissionSlotKey,
  reason: string,
): Promise<MissionsBoardResponse> {
  const state = await ensureBoardState(userId);
  const reference = new Date();
  const slot = state.board.slots.find((entry) => entry.slot === slotKey);
  if (!slot) {
    throw new Error(`Slot ${slotKey} not found`);
  }

  slot.proposals = missionTemplates[slotKey].map((template) => cloneMission(template, userId));
  slot.reroll.remaining = slot.reroll.total;
  slot.reroll.usedAt = null;
  slot.reroll.nextResetAt = null;

  recordMissionsV2Event('missions_v2_proposals_created', {
    userId,
    data: { slot: slotKey, reason, proposals: slot.proposals.map((proposal) => proposal.id) },
  });

  await persistState(userId, state, { dirty: true });
  return buildBoardResponse(state, undefined, reference);
}

export async function registerMissionHeartbeat(
  userId: string,
  missionId: string,
): Promise<MissionHeartbeatResponse> {
  const state = await ensureBoardState(userId);
  const reference = new Date();
  const update = applyDailyPetalDecay(state, reference);

  const slot = state.board.slots.find((entry) => entry.selected?.mission.id === missionId);
  if (!slot || !slot.selected) {
    throw new Error('Mission is not active for this user');
  }

  if (slot.selected.status !== 'active' && slot.selected.status !== 'succeeded') {
    throw new Error('Mission is not eligible for heartbeat');
  }

  const key = todayKey(reference);
  const alreadyMarked = slot.selected.heartbeatLog.some((stamp) => stamp.startsWith(key));
  if (!alreadyMarked) {
    const stamp = reference.toISOString();
    slot.selected.heartbeatLog.push(stamp);
    slot.selected.petals.lastEvaluatedAt = key;
    slot.selected.updatedAt = stamp;
    slot.selected.heartbeatLog.splice(0, Math.max(0, slot.selected.heartbeatLog.length - 30));

    if (slot.slot === 'hunt') {
      state.booster.nextActivationDate = todayKey(addDays(reference, 1));
      state.booster.appliedKeys = state.booster.appliedKeys.filter((value) => !value.startsWith(key));
    }

    if (slot.slot === 'main' && state.board.boss.shield.current > 0) {
      state.board.boss.shield.current = Math.max(0, state.board.boss.shield.current - 1);
      state.board.boss.shield.updatedAt = stamp;
      if (state.board.boss.shield.current === 0) {
        state.board.boss.phase = 2;
        state.board.boss.phase2.ready = true;
      }
      recordMissionsV2Event('missions_v2_boss_phase1_tick', {
        userId,
        data: { missionId, shield: state.board.boss.shield.current },
      });
    }
  }

  recordMissionsV2Event('missions_v2_heartbeat', {
    userId,
    data: { missionId, slot: slot.slot, heartbeatCount: slot.selected.heartbeatLog.length },
  });

  await persistState(userId, state, { dirty: update.dirty || !alreadyMarked });

  return {
    status: 'ok',
    mission_id: missionId,
    petals_remaining: slot.selected.petals.remaining,
    heartbeat_date: key,
  };
}

export async function linkDailyToHuntMission(
  userId: string,
  missionId: string,
  dailyTaskId: string,
): Promise<MissionDailyLinkResponse> {
  const state = await ensureBoardState(userId);
  const reference = new Date();
  const huntSlot = state.board.slots.find((entry) => entry.slot === 'hunt');

  if (!huntSlot?.selected || huntSlot.selected.mission.id !== missionId) {
    throw new Error('Hunt mission not active');
  }

  state.booster.targetTaskId = dailyTaskId;
  state.booster.appliedKeys = [];
  state.board.boss.linkedDailyTaskId = dailyTaskId;
  state.board.boss.linkedAt = reference.toISOString();

  recordMissionsV2Event('missions_v2_progress_tick', {
    userId,
    data: { slot: 'hunt', missionId, action: 'link_daily', taskId: dailyTaskId },
  });

  await persistState(userId, state, { dirty: true });
  return {
    missionId,
    taskId: dailyTaskId,
    linkedAt: reference.toISOString(),
    board: buildBoardResponse(state, undefined, reference),
  };
}

export async function registerBossPhase2(
  userId: string,
  payload: { missionId: string; proof: string },
): Promise<BossPhase2Response> {
  const state = await ensureBoardState(userId);
  const reference = new Date();
  const huntSlot = state.board.slots.find((entry) => entry.slot === 'hunt');

  if (!huntSlot?.selected || huntSlot.selected.mission.id !== payload.missionId) {
    throw new Error('Mission is not the active Hunt for this user');
  }

  if (state.board.boss.phase2.proof) {
    return {
      boss_state: buildBossResponse(state.board, reference),
      rewards_preview: {
        xp: huntSlot.selected.mission.reward.xp,
        currency: huntSlot.selected.mission.reward.currency ?? 0,
        items: huntSlot.selected.mission.reward.items ?? [],
      },
    };
  }

  state.board.boss.phase = 2;
  state.board.boss.phase2.ready = false;
  state.board.boss.phase2.proof = payload.proof;
  state.board.boss.phase2.submittedAt = reference.toISOString();

  const auraEffect: MissionEffect = {
    id: randomUUID(),
    type: 'aura',
    name: 'Aura de Focus',
    description: 'Bonus x1.5 XP en tareas de Hunt durante 7 días.',
    appliedAt: reference.toISOString(),
    expiresAt: addDays(reference, 7).toISOString(),
    payload: { kind: 'hunt_boost', multiplier: 1.5 },
  };
  state.effects.push(auraEffect);

  recordMissionsV2Event('missions_v2_boss_phase2_finish', {
    userId,
    data: { missionId: payload.missionId, proofLength: payload.proof.length },
  });

  await persistState(userId, state, { dirty: true });

  return {
    boss_state: buildBossResponse(state.board, reference),
    rewards_preview: {
      xp: huntSlot.selected.mission.reward.xp,
      currency: huntSlot.selected.mission.reward.currency ?? 0,
      items: [...(huntSlot.selected.mission.reward.items ?? []), 'Aura de Focus (7d)', 'Cofre Misterioso'],
    },
  };
}

export async function claimMissionReward(userId: string, missionId: string): Promise<MissionClaimResponse> {
  const state = await ensureBoardState(userId);
  const reference = new Date();
  applyDailyPetalDecay(state, reference);
  const slot = state.board.slots.find((entry) => entry.selected?.mission.id === missionId);

  if (!slot || !slot.selected) {
    throw new Error('Mission not active for this user');
  }

  const selection = slot.selected;

  if (selection.status !== 'succeeded' && selection.status !== 'claimed') {
    throw new Error('Mission is not ready to be claimed');
  }

  const claimAt = reference.toISOString();
  selection.status = 'claimed';
  selection.updatedAt = claimAt;
  selection.claim = { claimedAt: claimAt, reward: selection.mission.reward };

  recordMissionsV2Event('missions_v2_reward_claimed', {
    userId,
    data: { missionId, slot: slot.slot, reward: selection.mission.reward },
  });

  await persistState(userId, state, { dirty: true });

  return {
    board: buildBoardResponse(state, undefined, reference),
    rewards: {
      xp: selection.mission.reward.xp,
      currency: selection.mission.reward.currency ?? 0,
      items: selection.mission.reward.items ?? [],
    },
  };
}

export async function applyHuntXpBoost({
  userId,
  date,
  completedTaskIds,
  baseXpDelta,
  xpTotalToday,
}: HuntBoosterInput): Promise<HuntBoosterResult> {
  const state = await ensureBoardState(userId);
  const huntSlot = findSlot(state, 'hunt');

  const multiplier = state.booster.multiplier;

  if (!huntSlot.selected) {
    return {
      xp_delta: baseXpDelta,
      xp_total_today: xpTotalToday,
      boosterApplied: false,
      multiplier,
    };
  }

  if (!state.booster.targetTaskId) {
    return {
      xp_delta: baseXpDelta,
      xp_total_today: xpTotalToday,
      boosterApplied: false,
      multiplier,
    };
  }

  const submissionKey = `${date}:${[...completedTaskIds].sort().join(',')}`;
  const bonusReady = completedTaskIds.includes(state.booster.targetTaskId);

  if (!bonusReady || state.booster.appliedKeys.includes(submissionKey)) {
    return {
      xp_delta: baseXpDelta,
      xp_total_today: xpTotalToday,
      boosterApplied: false,
      multiplier,
    };
  }

  const activationDate = state.booster.nextActivationDate;
  const boosterReady = !activationDate || activationDate <= date;

  if (!boosterReady) {
    return { xp_delta: baseXpDelta, xp_total_today: xpTotalToday, boosterApplied: false, multiplier };
  }

  const bonus = Math.round(baseXpDelta * (multiplier - 1));
  const appliedBonus =
    Number.isFinite(bonus) && bonus > 0
      ? bonus
      : Math.max(Math.round(huntSlot.selected.mission.reward.xp * 0.1), 10);

  const progress = huntSlot.selected.progress;
  progress.current = Math.min(progress.target, progress.current + 1);
  progress.updatedAt = new Date().toISOString();

  if (progress.current >= progress.target && huntSlot.selected.status === 'active') {
    huntSlot.selected.status = 'succeeded';
    huntSlot.selected.completionAt = progress.updatedAt;
  }

  const shield = state.board.boss.shield;
  if (shield.current > 0 && state.board.boss.linkedDailyTaskId) {
    shield.current = Math.max(0, shield.current - 1);
    shield.updatedAt = progress.updatedAt;
    if (shield.current === 0) {
      state.board.boss.phase = 2;
      state.board.boss.phase2.ready = true;
    }
  }

  state.booster.appliedKeys.push(submissionKey);
  state.booster.nextActivationDate = null;

  recordMissionsV2Event('missions_v2_progress_tick', {
    userId,
    data: {
      slot: 'hunt',
      missionId: huntSlot.selected.mission.id,
      progress: progress.current,
      target: progress.target,
      boostApplied: true,
      multiplier,
      baseXpDelta,
      bonusXp: appliedBonus,
    },
  });

  recordMissionsV2Event('missions_v2_boss_phase1_tick', {
    userId,
    data: {
      missionId: huntSlot.selected.mission.id,
      shield: shield.current,
      linkedTaskId: state.board.boss.linkedDailyTaskId,
    },
  });

  const newXpDelta = baseXpDelta + appliedBonus;
  const newXpTotal = xpTotalToday + appliedBonus;

  state.board.generatedAt = progress.updatedAt;
  await persistState(userId, state, { dirty: true });

  return {
    xp_delta: newXpDelta,
    xp_total_today: newXpTotal,
    boosterApplied: true,
    multiplier,
  };
}

export async function runWeeklyAutoSelection(userId: string): Promise<MissionsBoardResponse> {
  const state = await ensureBoardState(userId);
  const reference = new Date();
  const profile = await getUserProfile(userId).catch(() => null);
  const mode = profile?.modeCode?.toUpperCase() ?? null;

  for (const slotKey of MISSION_SLOT_KEYS) {
    const slot = state.board.slots.find((entry) => entry.slot === slotKey);
    if (!slot || slot.selected || isCooldownActive(slot, reference)) {
      continue;
    }

    ensureProposals(state, slotKey, userId);
    const proposal = slot.proposals[0];
    if (!proposal) {
      continue;
    }

    if (slotKey === 'hunt' && mode && mode in { LOW: true, CHILL: true, FLOW: true, EVOLVE: true }) {
      slot.proposals.sort((a, b) => a.reward.xp - b.reward.xp);
    }

    slot.selected = createSelection(proposal, reference);
    applyPetalEffects(state, slot.selected, reference);

    recordMissionsV2Event('missions_v2_selected', {
      userId,
      data: { slot: slotKey, missionId: proposal.id, expiresAt: slot.selected.expiresAt, auto: true },
    });
  }

  await persistState(userId, state, { dirty: true });
  return buildBoardResponse(state, undefined, reference);
}

export async function runFortnightlyBossMaintenance(userId: string): Promise<MissionsBoardResponse> {
  const state = await ensureBoardState(userId);
  const reference = new Date();

  if (state.board.boss.phase2.proof) {
    state.board.boss.phase = 1;
    state.board.boss.phase2 = { ready: false, proof: null, submittedAt: null };
    state.board.boss.shield.current = BOSS_SHIELD_MAX;
    state.board.boss.shield.updatedAt = reference.toISOString();
    state.board.boss.linkedDailyTaskId = null;
    state.board.boss.linkedAt = null;
  }

  await persistState(userId, state, { dirty: true });
  return buildBoardResponse(state, undefined, reference);
}

export async function resetMissionsState(): Promise<void> {
  await clearMissionsV2States();
}


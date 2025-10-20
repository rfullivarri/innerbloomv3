import { randomUUID } from 'node:crypto';
import {
  deletePersistedBoard,
  getPersistedBoard,
  resetPersistedBoards,
  savePersistedBoard,
  type PersistedBoard,
  type PersistedMissionAction,
  type PersistedMissionSlot,
  type PersistedMission,
} from './missionsV2Repository.js';
import { recordMissionsV2Event } from './missionsV2Telemetry.js';

export type MissionSlotKey = 'main' | 'hunt' | 'skill';
export type MissionState = 'idle' | 'active' | 'succeeded' | 'failed' | 'cooldown' | 'claimed';
export type MissionActionType =
  | 'heartbeat'
  | 'link_daily'
  | 'special_strike'
  | 'submit_evidence'
  | 'abandon'
  | 'claim';

export const MISSION_SLOT_KEYS: MissionSlotKey[] = ['main', 'hunt', 'skill'];

export type MissionsBoard = PersistedBoard;

export type MissionHeartbeatResult = {
  status: 'ok';
  petals_remaining: number;
  heartbeat_date: string;
};

export type MissionClaimResult = {
  board: MissionsBoard;
  rewards: {
    xp: number;
    currency: number;
    items: string[];
  };
};

type MissionTask = PersistedMission['tasks'][number];

type BoosterResult = {
  xp_delta: number;
  xp_total_today: number;
  boosterApplied: boolean;
  multiplier: number;
};

const boardCache = new Map<string, MissionsBoard>();

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

function cloneBoard(board: MissionsBoard): MissionsBoard {
  return JSON.parse(JSON.stringify(board)) as MissionsBoard;
}

async function persistBoard(userId: string, board: MissionsBoard): Promise<void> {
  boardCache.set(userId, board);
  await savePersistedBoard(userId, board);
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

function createDefaultBoard(): MissionsBoard {
  const seasonId = computeSeasonId();
  const generatedAt = nowIso();
  return {
    season_id: seasonId,
    generated_at: generatedAt,
    gating: {
      claim_url: '/dashboard-v3/missions-v2',
    },
    communications: [
      {
        id: `comm-${randomUUID()}`,
        type: 'daily',
        message: 'Marcá el Heartbeat para sellar tus progresos de hoy.',
      },
    ],
    slots: [
      createSlot({
        slot: 'main',
        name: 'Main Quest · Acto 2',
        summary: 'Entrega final del capítulo actual con reflexión corta.',
        requirements: 'Acto 2 desbloqueado · Mantener Heartbeat diario',
        objective: 'Entregar evidencia antes de que finalice el ciclo.',
        reward: { xp: 320, currency: 40, items: ['Medalla de Acto'] },
        target: 7,
        countdownDays: 7,
        tasks: [
          { id: `task-${randomUUID()}`, name: 'Escribir Acto en el journal', tag: 'Main' },
          { id: `task-${randomUUID()}`, name: 'Subir evidencia al dashboard', tag: 'Main' },
        ],
        actions: [
          { id: 'heartbeat', type: 'heartbeat', label: 'Heartbeat', enabled: true },
          { id: 'evidence', type: 'submit_evidence', label: 'Entregar evidencia', enabled: true },
          { id: 'abandon', type: 'abandon', label: 'Abandono Honroso', enabled: true },
        ],
      }),
      createSlot({
        slot: 'hunt',
        name: 'Hunt · Booster activo',
        summary: 'Sesiones mínimas con boost de XP para ritual desafiante.',
        requirements: 'Vinculá la Daily para bajar el escudo del Boss.',
        objective: 'Completar 3 sesiones etiquetadas esta semana.',
        reward: { xp: 180, currency: 18, items: ['Cofre de ritual'] },
        target: 3,
        countdownDays: 6,
        tasks: [
          { id: `task-${randomUUID()}`, name: 'Sesión de enfoque 25m', tag: 'Hunt' },
          { id: `task-${randomUUID()}`, name: 'Revisión semanal del ritual', tag: 'Hunt' },
        ],
        actions: [
          { id: 'heartbeat', type: 'heartbeat', label: 'Heartbeat', enabled: true },
          { id: 'link', type: 'link_daily', label: 'Vincular Daily', enabled: true },
          { id: 'strike', type: 'special_strike', label: 'Golpe Especial', enabled: false },
          { id: 'abandon', type: 'abandon', label: 'Abandono Honroso', enabled: true },
        ],
      }),
      createSlot({
        slot: 'skill',
        name: 'Skill Route · Grounding',
        summary: 'Micro nodos diarios para subir tu stat de calma.',
        requirements: 'Activá Heartbeat para desbloquear nodos del día.',
        objective: 'Completar 5 micro nodos en los próximos 7 días.',
        reward: { xp: 140, currency: 12, items: ['Aura Calmante'] },
        target: 5,
        countdownDays: 7,
        tasks: [
          { id: `task-${randomUUID()}`, name: 'Respiración cuadrada 5 min', tag: 'Skill' },
          { id: `task-${randomUUID()}`, name: 'Registro de sensaciones', tag: 'Skill' },
        ],
        actions: [
          { id: 'heartbeat', type: 'heartbeat', label: 'Heartbeat', enabled: true },
          { id: 'evidence', type: 'submit_evidence', label: 'Entregar evidencia', enabled: true },
          { id: 'abandon', type: 'abandon', label: 'Abandono Honroso', enabled: true },
        ],
      }),
    ],
    boss: {
      id: `boss-${randomUUID()}`,
      name: 'Boss quincenal',
      status: 'available',
      description: 'Bajá el escudo con Heartbeats y prepara el golpe especial.',
      countdown: {
        ends_at: addDays(new Date(), 12).toISOString(),
        label: 'Quedan 12 días',
      },
      actions: [
        { id: 'boss-phase', type: 'special_strike', label: 'Planear Golpe Especial', enabled: false },
      ],
    },
  };
}

function createSlot(config: {
  slot: MissionSlotKey;
  name: string;
  summary: string;
  requirements: string;
  objective: string;
  reward: PersistedMission['reward'];
  target: number;
  countdownDays: number;
  tasks: MissionTask[];
  actions: Array<{ id: string; type: MissionActionType; label: string; enabled: boolean }>;
}): PersistedMissionSlot {
  const endsAt = addDays(new Date(), config.countdownDays);
  const mission: PersistedMission = {
    id: `mission-${config.slot}-${randomUUID().slice(0, 8)}`,
    name: config.name,
    type: config.slot,
    summary: config.summary,
    requirements: config.requirements,
    objective: config.objective,
    reward: config.reward,
    tasks: config.tasks,
  };

  return {
    id: `slot-${config.slot}-${randomUUID().slice(0, 6)}`,
    slot: config.slot,
    mission,
    state: 'active',
    petals: { total: 3, remaining: 3 },
    heartbeat_today: false,
    progress: { current: 0, target: config.target, percent: 0 },
    countdown: { ends_at: endsAt.toISOString(), label: `Faltan ${config.countdownDays} días` },
    actions: config.actions.map<PersistedMissionAction>((action) => ({ ...action })),
    claim: { available: false, enabled: true, cooldown_until: null },
  };
}

function findSlotByMissionId(board: MissionsBoard, missionId: string): PersistedMissionSlot | undefined {
  return board.slots.find((slot) => slot.mission.id === missionId);
}

function recalculateProgress(slot: PersistedMissionSlot): void {
  const { current, target } = slot.progress;
  const percent = target <= 0 ? 0 : Math.min(100, Math.round((current / target) * 100));
  slot.progress.percent = percent;
}

export async function getMissionBoard(userId: string): Promise<MissionsBoard> {
  const board = await ensureBoard(userId);
  return cloneBoard(board);
}

export async function selectMission(
  userId: string,
  _slotKey: MissionSlotKey,
  _missionId: string,
): Promise<MissionsBoard> {
  const board = await ensureBoard(userId);
  recordMissionsV2Event('missions_v2_select_open', { userId, data: { slot: _slotKey } });
  return cloneBoard(board);
}

export async function rerollMissionSlot(userId: string, _slotKey: MissionSlotKey): Promise<MissionsBoard> {
  const board = await ensureBoard(userId);
  recordMissionsV2Event('missions_v2_reroll', { userId, data: { slot: _slotKey } });
  return cloneBoard(board);
}

export async function regenerateMissionProposals(
  userId: string,
  slotKey: MissionSlotKey,
  reason: string,
): Promise<MissionsBoard> {
  const board = await ensureBoard(userId);
  recordMissionsV2Event('missions_v2_proposals_created', { userId, data: { slot: slotKey, reason } });
  return cloneBoard(board);
}

export async function linkDailyToHuntMission(
  userId: string,
  missionId: string,
  taskId: string,
): Promise<{ board: MissionsBoard; missionId: string; taskId: string }> {
  const board = await ensureBoard(userId);
  const slot = findSlotByMissionId(board, missionId);
  if (!slot || slot.slot !== 'hunt') {
    throw new Error('Hunt mission not found');
  }
  const action = slot.actions.find((item) => item.type === 'link_daily');
  if (action) {
    action.enabled = false;
  }
  board.generated_at = nowIso();
  await persistBoard(userId, board);

  recordMissionsV2Event('missions_v2_progress_tick', {
    userId,
    data: { slot: 'hunt', missionId, action: 'link_daily', taskId },
  });

  return { board: cloneBoard(board), missionId, taskId };
}

export async function registerBossPhase2(
  userId: string,
  payload: { missionId: string; proof: string },
): Promise<MissionsBoard['boss']> {
  const board = await ensureBoard(userId);
  const slot = findSlotByMissionId(board, payload.missionId);
  if (!slot || slot.slot !== 'main') {
    throw new Error('Main mission not found');
  }

  board.boss.status = 'ready';
  const action = board.boss.actions.find((item) => item.type === 'special_strike');
  if (action) {
    action.enabled = true;
  }
  board.generated_at = nowIso();
  await persistBoard(userId, board);

  recordMissionsV2Event('missions_v2_boss_phase2_finish', {
    userId,
    data: { missionId: payload.missionId, proofLength: payload.proof.length },
  });

  return cloneBoard(board).boss;
}

export async function claimMissionReward(userId: string, missionId: string): Promise<MissionClaimResult> {
  const board = await ensureBoard(userId);
  const slot = findSlotByMissionId(board, missionId);
  if (!slot) {
    throw new Error('Mission not found');
  }
  if (!slot.claim.available || !slot.claim.enabled) {
    throw new Error('Mission is not ready to be claimed');
  }

  slot.claim.available = false;
  slot.claim.enabled = false;
  slot.state = 'claimed';
  slot.actions.forEach((action) => {
    if (action.type !== 'abandon') {
      action.enabled = false;
    }
  });
  board.generated_at = nowIso();
  await persistBoard(userId, board);

  recordMissionsV2Event('missions_v2_reward_claimed', {
    userId,
    data: { missionId, slot: slot.slot, reward: slot.mission.reward },
  });

  return {
    board: cloneBoard(board),
    rewards: {
      xp: slot.mission.reward.xp,
      currency: slot.mission.reward.currency ?? 0,
      items: slot.mission.reward.items ?? [],
    },
  };
}

export async function registerMissionHeartbeat(userId: string, missionId: string): Promise<MissionHeartbeatResult> {
  const board = await ensureBoard(userId);
  const slot = findSlotByMissionId(board, missionId);
  if (!slot) {
    throw new Error('Mission not found');
  }

  if (!slot.heartbeat_today) {
    slot.heartbeat_today = true;
    slot.progress.current = Math.min(slot.progress.target, slot.progress.current + 1);
    recalculateProgress(slot);
    const heartbeatAction = slot.actions.find((action) => action.type === 'heartbeat');
    if (heartbeatAction) {
      heartbeatAction.enabled = false;
    }

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

export async function applyHuntXpBoost({
  userId,
  baseXpDelta,
  xpTotalToday,
}: {
  userId: string;
  date: string;
  completedTaskIds: string[];
  baseXpDelta: number;
  xpTotalToday: number;
}): Promise<BoosterResult> {
  const board = await ensureBoard(userId);
  const huntSlot = board.slots.find((slot) => slot.slot === 'hunt');
  if (!huntSlot) {
    return {
      xp_delta: baseXpDelta,
      xp_total_today: xpTotalToday,
      boosterApplied: false,
      multiplier: 1,
    };
  }

  const bonusReady = huntSlot.actions.some((action) => action.type === 'heartbeat' && action.enabled);
  const multiplier = bonusReady ? 1.5 : 1;

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

  return {
    xp_delta: baseXpDelta,
    xp_total_today: xpTotalToday,
    boosterApplied: bonusReady,
    multiplier,
  };
}

export async function runWeeklyAutoSelection(userId: string): Promise<MissionsBoard> {
  const board = await ensureBoard(userId);
  return cloneBoard(board);
}

export async function runFortnightlyBossMaintenance(userId: string): Promise<MissionsBoard> {
  const board = await ensureBoard(userId);
  return cloneBoard(board);
}

export async function resetMissionsState(): Promise<void> {
  boardCache.clear();
  await resetPersistedBoards();
}

export async function deleteBoardForUser(userId: string): Promise<void> {
  boardCache.delete(userId);
  await deletePersistedBoard(userId);
}

import { HttpError } from '../../lib/http-error.js';

type MissionSlotKey = 'main' | 'hunt' | 'skill';
type MissionDifficulty = 'normal' | 'hard';
type MissionProgressKind = 'bar' | 'icons';

type MissionTemplate = {
  id: string;
  slot: MissionSlotKey;
  title: string;
  summary: string;
  meta: string;
  xpReward: number;
  difficulty: MissionDifficulty;
  frictionId?: string | null;
  progress: {
    target: number;
    kind: MissionProgressKind;
  };
};

type MissionInstance = MissionTemplate & {
  progressCurrent: number;
  linkedDaily: boolean;
  actionsUsed: Set<string>;
};

type SlotStatus = 'empty' | 'active' | 'claimable' | 'cooldown';

type SlotState = {
  slot: MissionSlotKey;
  status: SlotStatus;
  mission: MissionInstance | null;
  claimCooldownUntil: Date | null;
  lastClaimedAt: Date | null;
};

type WeeklySelectionState = {
  status: 'pending' | 'completed' | 'locked';
  proposals: Record<MissionSlotKey, MissionTemplate[]>;
  rerollsRemaining: Record<MissionSlotKey, number>;
  expiresAt: Date | null;
};

type BossState = {
  label: string;
  description: string;
  state: 'upcoming' | 'active' | 'phase_two_ready' | 'defeated';
  shieldCurrent: number;
  shieldMax: number;
  phaseTwoAvailableAt: Date | null;
  phaseTwoActivatedAt: Date | null;
  defeatedAt: Date | null;
};

type CampfireState = {
  activeUntil: Date | null;
  message: string;
  emotes: string[];
};

type FutureNoteState = {
  note: string | null;
  updatedAt: Date;
};

type BoardState = {
  userId: string;
  seasonId: string;
  refreshAt: Date | null;
  slots: Record<MissionSlotKey, SlotState>;
  weeklySelection: WeeklySelectionState;
  boss: BossState;
  campfire: CampfireState | null;
  dailyBonusReady: boolean;
  futureNotes: Map<string, FutureNoteState>;
  seasonalAnnouncementShown: boolean;
};

type SerializedMission = {
  id: string;
  title: string;
  summary: string;
  meta: string;
  xp_reward: number;
  difficulty: MissionDifficulty;
  type: MissionSlotKey;
  friction_id: string | null;
};

type SerializedSlot = {
  slot: MissionSlotKey;
  title: string;
  meta: string;
  status: SlotStatus;
  mission: SerializedMission | null;
  progress: {
    type: MissionProgressKind;
    current: number;
    target: number;
    percent: number;
  } | null;
  actions: {
    id: string;
    type: 'link_daily' | 'special_strike' | 'submit_evidence';
    label: string;
    enabled: boolean;
  }[];
  claim: {
    available: boolean;
    enabled: boolean;
    label: string;
    gating_url: string;
    rewards_preview: {
      xp: number;
      loot: string[];
    };
    blocked_reason: string | null;
  };
  future_note: {
    friction_id: string;
    label: string;
    saved_note: string | null;
    prompt: string;
  } | null;
};

type SerializedProposal = {
  id: string;
  title: string;
  summary: string;
  meta: string;
  xp_reward: number;
  difficulty: MissionDifficulty;
  friction_id: string | null;
};

type SerializedBoard = {
  season_id: string;
  refresh_at: string | null;
  slots: SerializedSlot[];
  boss: {
    label: string;
    description: string;
    state: BossState['state'];
    shield: {
      current: number;
      max: number;
    };
    phase_two: {
      available: boolean;
      enabled: boolean;
      label: string;
    };
  };
  campfire: {
    active: boolean;
    expires_at: string | null;
    message: string;
    emotes: string[];
  } | null;
  weekly_selection: {
    status: WeeklySelectionState['status'];
    expires_at: string | null;
    slots: {
      slot: MissionSlotKey;
      proposals: SerializedProposal[];
      rerolls_remaining: number;
    }[];
  } | null;
  communications: {
    id: string;
    type: 'daily' | 'weekly' | 'biweekly' | 'seasonal';
    message: string;
  }[];
  gating: {
    claim_url: string;
  };
};

type ClaimResult = {
  board: SerializedBoard;
  rewards: {
    xp: number;
    loot: string[];
    message: string;
  };
  future_note_prompt?: {
    friction_id: string;
    label: string;
    prompt: string;
    saved_note: string | null;
  };
};

type FutureNoteUpdate = {
  friction_id: string;
  note: string | null;
  updated_at: string;
};

const SLOT_TITLES: Record<MissionSlotKey, string> = {
  main: 'Main',
  hunt: 'Hunt',
  skill: 'Skill',
};

const SLOT_META: Record<MissionSlotKey, string> = {
  main: 'Tu objetivo narrativo central',
  hunt: 'Rastrea y cierra la fricción elegida',
  skill: 'Refiná tu mecánica clave',
};

const CONTEXT_ACTIONS: Record<MissionSlotKey, { id: string; type: SerializedSlot['actions'][number]['type']; label: string }> = {
  main: { id: 'link-daily', type: 'link_daily', label: 'Vincular Daily' },
  hunt: { id: 'special-strike', type: 'special_strike', label: 'Golpe Especial' },
  skill: { id: 'submit-evidence', type: 'submit_evidence', label: 'Entregar Evidencia' },
};

const missionCatalog: MissionTemplate[] = [
  {
    id: 'mst-main-ritual',
    slot: 'main',
    title: 'Completar Ritual Matutino',
    summary: 'Arrancá con respiración, planificación y energía enfocada.',
    meta: 'Meta de hoy: completá el ritual sin interrupciones.',
    xpReward: 240,
    difficulty: 'normal',
    progress: { target: 3, kind: 'bar' },
  },
  {
    id: 'mst-main-plan',
    slot: 'main',
    title: 'Plan Maestro Diario',
    summary: 'Define tu foco clave y priorizá 3 micro-misiones.',
    meta: 'Meta de hoy: definir 3 micro victorias.',
    xpReward: 210,
    difficulty: 'normal',
    progress: { target: 4, kind: 'bar' },
  },
  {
    id: 'mst-hunt-focus',
    slot: 'hunt',
    title: 'Cazar Distracción Principal',
    summary: 'Identificá la fricción crítica y diseñá un ancla de foco.',
    meta: 'Meta de hoy: bloquear 2 desvíos clave.',
    xpReward: 160,
    difficulty: 'hard',
    frictionId: 'friction-focus',
    progress: { target: 4, kind: 'icons' },
  },
  {
    id: 'mst-hunt-energy',
    slot: 'hunt',
    title: 'Domar la Pérdida de Energía',
    summary: 'Mapeá momentos de caída y aplicá micro-recargas.',
    meta: 'Meta de hoy: ejecutar 3 recargas.',
    xpReward: 140,
    difficulty: 'normal',
    frictionId: 'friction-energy',
    progress: { target: 3, kind: 'icons' },
  },
  {
    id: 'mst-skill-presentation',
    slot: 'skill',
    title: 'Pulir Pitch de 90 segundos',
    summary: 'Iterá tu pitch grabándote y obteniendo feedback.',
    meta: 'Meta de hoy: 1 iteración grabada + feedback.',
    xpReward: 120,
    difficulty: 'normal',
    progress: { target: 1, kind: 'bar' },
  },
  {
    id: 'mst-skill-closing',
    slot: 'skill',
    title: 'Practicar cierre con objeciones',
    summary: 'Simulá 3 objeciones y respondé con seguridad.',
    meta: 'Meta de hoy: ensayar 3 objeciones.',
    xpReward: 150,
    difficulty: 'hard',
    progress: { target: 3, kind: 'icons' },
  },
];

const missionsStore = new Map<string, BoardState>();

function cloneTemplate(template: MissionTemplate): MissionInstance {
  return {
    ...template,
    frictionId: template.frictionId ?? null,
    progressCurrent: 0,
    linkedDaily: false,
    actionsUsed: new Set<string>(),
  };
}

function pickRandomTemplates(slot: MissionSlotKey, count: number): MissionTemplate[] {
  const pool = missionCatalog.filter((mission) => mission.slot === slot);
  if (pool.length <= count) {
    return pool.slice();
  }

  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function createDefaultBoard(userId: string): BoardState {
  const initialSlots: Record<MissionSlotKey, SlotState> = {
    main: {
      slot: 'main',
      status: 'empty',
      mission: null,
      claimCooldownUntil: null,
      lastClaimedAt: null,
    },
    hunt: {
      slot: 'hunt',
      status: 'empty',
      mission: null,
      claimCooldownUntil: null,
      lastClaimedAt: null,
    },
    skill: {
      slot: 'skill',
      status: 'empty',
      mission: null,
      claimCooldownUntil: null,
      lastClaimedAt: null,
    },
  };

  const weeklySelection: WeeklySelectionState = {
    status: 'pending',
    proposals: {
      main: pickRandomTemplates('main', 3),
      hunt: pickRandomTemplates('hunt', 3),
      skill: pickRandomTemplates('skill', 3),
    },
    rerollsRemaining: {
      main: 1,
      hunt: 1,
      skill: 1,
    },
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12),
  };

  const boss: BossState = {
    label: 'Boss de la Quincena',
    description: 'Sincronizá a tu squad y cargá el golpe especial cuando se habilite la fase 2.',
    state: 'active',
    shieldCurrent: 85,
    shieldMax: 120,
    phaseTwoAvailableAt: new Date(Date.now() + 1000 * 60 * 60 * 8),
    phaseTwoActivatedAt: null,
    defeatedAt: null,
  };

  return {
    userId,
    seasonId: '2025-preseason-alpha',
    refreshAt: null,
    slots: initialSlots,
    weeklySelection,
    boss,
    campfire: null,
    dailyBonusReady: false,
    futureNotes: new Map<string, FutureNoteState>(),
    seasonalAnnouncementShown: false,
  };
}

function getOrCreateBoard(userId: string): BoardState {
  const existing = missionsStore.get(userId);
  if (existing) {
    return existing;
  }

  const board = createDefaultBoard(userId);
  missionsStore.set(userId, board);
  return board;
}

function ensureMissionInstance(slot: SlotState): MissionInstance {
  if (!slot.mission) {
    throw new HttpError(400, 'mission_not_selected', 'El slot no tiene una misión activa');
  }
  return slot.mission;
}

function computeProgressPercent(current: number, target: number): number {
  if (target <= 0) {
    return 0;
  }
  const pct = Math.round((current / target) * 100);
  return Math.min(100, Math.max(0, pct));
}

function buildSlotPayload(board: BoardState, slot: SlotState): SerializedSlot {
  const mission = slot.mission;
  const progress = mission
    ? {
        type: mission.progress.kind,
        current: mission.progressCurrent,
        target: mission.progress.target,
        percent: computeProgressPercent(mission.progressCurrent, mission.progress.target),
      }
    : null;

  const baseClaimAvailable = slot.status === 'claimable';
  const claimEnabled = baseClaimAvailable;
  const blockedReason = baseClaimAvailable ? null : 'Completá la meta para habilitar el claim.';

  const futureNote = mission?.frictionId
    ? (() => {
        const entry = board.futureNotes.get(mission.frictionId!);
        return {
          friction_id: mission.frictionId!,
          label: 'Yo del futuro',
          saved_note: entry?.note ?? null,
          prompt: 'Guardá una nota breve para tu próxima cacería.',
        };
      })()
    : null;

  const actionConfig = CONTEXT_ACTIONS[slot.slot];
  const actionEnabled = slot.status === 'active' || slot.status === 'claimable';

  return {
    slot: slot.slot,
    title: SLOT_TITLES[slot.slot],
    meta: SLOT_META[slot.slot],
    status: slot.status,
    mission: mission
      ? {
          id: mission.id,
          title: mission.title,
          summary: mission.summary,
          meta: mission.meta,
          xp_reward: mission.xpReward,
          difficulty: mission.difficulty,
          type: mission.slot,
          friction_id: mission.frictionId ?? null,
        }
      : null,
    progress,
    actions: [
      {
        id: actionConfig.id,
        type: actionConfig.type,
        label: actionConfig.label,
        enabled: actionEnabled,
      },
    ],
    claim: {
      available: baseClaimAvailable,
      enabled: claimEnabled,
      label: 'Claim',
      gating_url: '/dashboard-v3/missions-v2',
      rewards_preview: {
        xp: mission?.xpReward ?? 0,
        loot: mission ? [`Medalla ${mission.slot.toUpperCase()}`] : [],
      },
      blocked_reason: blockedReason,
    },
    future_note: futureNote,
  };
}

function computeCommunications(board: BoardState): SerializedBoard['communications'] {
  const now = new Date();
  const messages: SerializedBoard['communications'] = [];

  if (board.dailyBonusReady) {
    messages.push({ id: 'daily-bonus', type: 'daily', message: 'Bonus listo para reclamar.' });
  }

  if (board.weeklySelection.status === 'pending') {
    messages.push({ id: 'weekly-select', type: 'weekly', message: 'Elegí tus 3 misiones. Tenés 1 reroll.' });
  }

  const isSunday = now.getUTCDay() === 0;
  const hour = now.getUTCHours();
  if (board.boss.state !== 'defeated' && isSunday && hour >= 18) {
    messages.push({ id: 'boss-warning', type: 'biweekly', message: 'El Boss aparece esta noche. Prepará tu Golpe Especial.' });
  }

  if (!board.seasonalAnnouncementShown) {
    messages.push({ id: 'seasonal-start', type: 'seasonal', message: 'Nuevas medallas y bendiciones por tiempo limitado.' });
    board.seasonalAnnouncementShown = true;
  }

  return messages;
}

function serializeBoard(board: BoardState): SerializedBoard {
  const slots = (['main', 'hunt', 'skill'] as MissionSlotKey[]).map((slotKey) =>
    buildSlotPayload(board, board.slots[slotKey]),
  );

  const boss = board.boss;
  const now = new Date();
  const phaseTwoAvailable =
    boss.state !== 'defeated' && boss.phaseTwoActivatedAt == null && boss.phaseTwoAvailableAt != null
      ? now >= boss.phaseTwoAvailableAt
      : false;

  const campfireActive =
    board.campfire && board.campfire.activeUntil ? now <= board.campfire.activeUntil : false;

  return {
    season_id: board.seasonId,
    refresh_at: board.refreshAt ? board.refreshAt.toISOString() : null,
    slots,
    boss: {
      label: boss.label,
      description: boss.description,
      state: boss.state,
      shield: {
        current: boss.shieldCurrent,
        max: boss.shieldMax,
      },
      phase_two: {
        available: phaseTwoAvailable,
        enabled: phaseTwoAvailable,
        label: phaseTwoAvailable ? 'Abrir Fase 2' : 'Fase 2 bloqueada',
      },
    },
    campfire: campfireActive
      ? {
          active: true,
          expires_at: board.campfire?.activeUntil?.toISOString() ?? null,
          message: board.campfire?.message ?? 'Descansá y compartí insights con tu squad.',
          emotes: board.campfire?.emotes ?? ['🔥', '🪵', '🧠'],
        }
      : null,
    weekly_selection:
      board.weeklySelection.status === 'pending'
        ? {
            status: board.weeklySelection.status,
            expires_at: board.weeklySelection.expiresAt?.toISOString() ?? null,
            slots: (['main', 'hunt', 'skill'] as MissionSlotKey[]).map((slotKey) => ({
              slot: slotKey,
              proposals: board.weeklySelection.proposals[slotKey].map((proposal) => ({
                id: proposal.id,
                title: proposal.title,
                summary: proposal.summary,
                meta: proposal.meta,
                xp_reward: proposal.xpReward,
                difficulty: proposal.difficulty,
                friction_id: proposal.frictionId ?? null,
              })),
              rerolls_remaining: board.weeklySelection.rerollsRemaining[slotKey],
            })),
          }
        : board.weeklySelection.status === 'completed'
        ? {
            status: 'completed',
            expires_at: board.weeklySelection.expiresAt?.toISOString() ?? null,
            slots: [],
          }
        : {
            status: board.weeklySelection.status,
            expires_at: board.weeklySelection.expiresAt?.toISOString() ?? null,
            slots: [],
          },
    communications: computeCommunications(board),
    gating: {
      claim_url: '/dashboard-v3/missions-v2',
    },
  };
}

function ensureWeeklySelection(board: BoardState) {
  if (board.weeklySelection.status !== 'pending') {
    return;
  }

  for (const slotKey of ['main', 'hunt', 'skill'] as MissionSlotKey[]) {
    if (!Array.isArray(board.weeklySelection.proposals[slotKey]) || board.weeklySelection.proposals[slotKey].length === 0) {
      board.weeklySelection.proposals[slotKey] = pickRandomTemplates(slotKey, 3);
    }
  }
}

export function getBoard(userId: string): SerializedBoard {
  const board = getOrCreateBoard(userId);
  ensureWeeklySelection(board);
  return serializeBoard(board);
}

function assignMission(board: BoardState, slotKey: MissionSlotKey, template: MissionTemplate) {
  const slot = board.slots[slotKey];
  slot.mission = cloneTemplate(template);
  slot.status = 'active';
  slot.claimCooldownUntil = null;
}

export function selectMission(userId: string, slotKey: MissionSlotKey, missionId: string): SerializedBoard {
  const board = getOrCreateBoard(userId);
  ensureWeeklySelection(board);

  if (board.weeklySelection.status !== 'pending') {
    throw new HttpError(400, 'weekly_selection_closed', 'La selección semanal ya está cerrada');
  }

  const proposals = board.weeklySelection.proposals[slotKey];
  const mission = proposals.find((proposal) => proposal.id === missionId);
  if (!mission) {
    throw new HttpError(404, 'mission_not_found', 'La misión no está disponible para este slot');
  }

  assignMission(board, slotKey, mission);

  const remainingSlots = (['main', 'hunt', 'skill'] as MissionSlotKey[]).filter(
    (key) => board.slots[key].mission === null,
  );

  if (remainingSlots.length === 0) {
    board.weeklySelection.status = 'completed';
  }

  return serializeBoard(board);
}

export function rerollSlot(userId: string, slotKey: MissionSlotKey): SerializedBoard {
  const board = getOrCreateBoard(userId);
  ensureWeeklySelection(board);

  if (board.weeklySelection.status !== 'pending') {
    throw new HttpError(400, 'weekly_selection_closed', 'La selección semanal ya está cerrada');
  }

  const remaining = board.weeklySelection.rerollsRemaining[slotKey] ?? 0;
  if (remaining <= 0) {
    throw new HttpError(400, 'no_rerolls', 'Ya utilizaste el reroll de este slot');
  }

  board.weeklySelection.rerollsRemaining[slotKey] = remaining - 1;
  board.weeklySelection.proposals[slotKey] = pickRandomTemplates(slotKey, 3);

  return serializeBoard(board);
}

function incrementProgress(slot: SlotState, amount: number) {
  const mission = ensureMissionInstance(slot);
  const next = Math.min(mission.progress.target, mission.progressCurrent + amount);
  mission.progressCurrent = next;
  if (next >= mission.progress.target) {
    slot.status = 'claimable';
  }
}

export function linkDaily(userId: string, slotKey: MissionSlotKey): SerializedBoard {
  const board = getOrCreateBoard(userId);
  const slot = board.slots[slotKey];
  const mission = ensureMissionInstance(slot);

  mission.linkedDaily = true;
  incrementProgress(slot, 1);

  return serializeBoard(board);
}

export function triggerSpecialStrike(userId: string, slotKey: MissionSlotKey): SerializedBoard {
  const board = getOrCreateBoard(userId);
  const slot = board.slots[slotKey];
  incrementProgress(slot, 2);
  return serializeBoard(board);
}

export function submitEvidence(userId: string, slotKey: MissionSlotKey): SerializedBoard {
  const board = getOrCreateBoard(userId);
  const slot = board.slots[slotKey];
  incrementProgress(slot, 1);
  return serializeBoard(board);
}

function activatePhaseTwoInternal(board: BoardState) {
  const boss = board.boss;
  boss.state = 'defeated';
  boss.phaseTwoActivatedAt = new Date();
  boss.defeatedAt = new Date();
  boss.shieldCurrent = 0;
  board.campfire = {
    activeUntil: new Date(Date.now() + 1000 * 60 * 60 * 24),
    message: 'Boss derrotado. Recuperá energía en la fogata y registrá insights.',
    emotes: ['🔥', '🧭', '📓'],
  };
}

export function activatePhaseTwo(userId: string): SerializedBoard {
  const board = getOrCreateBoard(userId);
  const boss = board.boss;
  const now = new Date();
  if (boss.state === 'defeated') {
    return serializeBoard(board);
  }

  if (!boss.phaseTwoAvailableAt || now < boss.phaseTwoAvailableAt) {
    throw new HttpError(400, 'phase_two_locked', 'La fase 2 todavía no está disponible');
  }

  activatePhaseTwoInternal(board);
  return serializeBoard(board);
}

export function claimMission(userId: string, slotKey: MissionSlotKey): ClaimResult {
  const board = getOrCreateBoard(userId);
  const slot = board.slots[slotKey];
  const mission = ensureMissionInstance(slot);

  if (slot.status !== 'claimable') {
    throw new HttpError(400, 'claim_unavailable', 'Todavía no podés reclamar esta misión');
  }

  slot.status = 'cooldown';
  slot.lastClaimedAt = new Date();
  mission.progressCurrent = mission.progress.target;

  if (slotKey === 'hunt' && mission.difficulty === 'hard' && mission.frictionId) {
    if (!board.futureNotes.has(mission.frictionId)) {
      board.futureNotes.set(mission.frictionId, { note: null, updatedAt: new Date() });
    }
  }

  if (slotKey === 'main') {
    board.boss.shieldCurrent = Math.max(0, board.boss.shieldCurrent - 20);
    if (board.boss.shieldCurrent <= 0) {
      activatePhaseTwoInternal(board);
    }
  }

  if (slotKey === 'skill') {
    board.dailyBonusReady = false;
  }

  const boardPayload = serializeBoard(board);

  const rewards = {
    xp: mission.xpReward,
    loot: [`Botín ${mission.slot.toUpperCase()}`],
    message: 'Recompensa disponible en Misiones v2.',
  };

  let futureNotePrompt: ClaimResult['future_note_prompt'];
  if (slotKey === 'hunt' && mission.difficulty === 'hard' && mission.frictionId) {
    const entry = board.futureNotes.get(mission.frictionId) ?? { note: null, updatedAt: new Date() };
    futureNotePrompt = {
      friction_id: mission.frictionId,
      label: mission.title,
      prompt: '¿Qué te funcionó para superar esta fricción? Guardá una nota breve.',
      saved_note: entry.note,
    };
  }

  return { board: boardPayload, rewards, future_note_prompt: futureNotePrompt };
}

export function saveFutureNote(userId: string, frictionId: string, note: string | null): FutureNoteUpdate {
  const board = getOrCreateBoard(userId);
  const raw = note ?? null;
  const trimmed = raw?.trim() ?? '';
  const normalized = trimmed.length > 0 ? trimmed : null;
  const entry = { note: normalized, updatedAt: new Date() };
  board.futureNotes.set(frictionId, entry);
  return {
    friction_id: frictionId,
    note: normalized,
    updated_at: entry.updatedAt.toISOString(),
  };
}

export function markDailyCompletion(userId: string): boolean {
  const board = getOrCreateBoard(userId);
  if (board.dailyBonusReady) {
    return false;
  }

  board.dailyBonusReady = true;
  const skillSlot = board.slots.skill;
  if (skillSlot.mission) {
    skillSlot.status = 'claimable';
    skillSlot.mission.progressCurrent = skillSlot.mission.progress.target;
  }

  return true;
}

export type { SerializedBoard, ClaimResult, FutureNoteUpdate, MissionSlotKey };

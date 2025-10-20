export const MISSION_SLOT_KEYS = ['main', 'hunt', 'skill'] as const;

export type MissionSlotKey = (typeof MISSION_SLOT_KEYS)[number];

export type MissionsV2EventName =
  | 'missions_v2_proposals_created'
  | 'missions_v2_selected'
  | 'missions_v2_reroll'
  | 'missions_v2_heartbeat'
  | 'missions_v2_progress_tick'
  | 'missions_v2_boss_phase1_tick'
  | 'missions_v2_boss_phase2_finish'
  | 'missions_v2_reward_claimed';

export type MissionReward = {
  xp: number;
  currency?: number;
  items?: string[];
};

export type MissionTask = {
  id: string;
  name: string;
  tag: string;
};

export type MissionDefinition = {
  id: string;
  slot: MissionSlotKey;
  name: string;
  summary: string;
  requirements: string;
  objective: string;
  reward: MissionReward;
  tasks: MissionTask[];
  difficulty: 'low' | 'medium' | 'high' | 'epic';
  metadata?: Record<string, unknown>;
  durationDays: number;
};

export type MissionProgress = {
  current: number;
  target: number;
  unit: 'tasks' | 'sessions' | 'minutes' | 'points';
  updatedAt: string;
};

export type MissionPetals = {
  total: number;
  remaining: number;
  lastEvaluatedAt?: string | null;
};

export type MissionSelectionState = {
  mission: MissionDefinition;
  status: 'active' | 'succeeded' | 'failed' | 'claimed';
  selectedAt: string;
  updatedAt: string;
  expiresAt: string | null;
  cooldownUntil: string | null;
  progress: MissionProgress;
  petals: MissionPetals;
  heartbeatLog: string[];
  claim?: {
    claimedAt: string;
    reward: MissionReward;
  };
  completionAt?: string | null;
  failureAt?: string | null;
};

export type MissionSlotState = {
  slot: MissionSlotKey;
  proposals: MissionDefinition[];
  selected: MissionSelectionState | null;
  reroll: {
    usedAt: string | null;
    nextResetAt: string | null;
    remaining: number;
    total: number;
  };
  cooldownUntil: string | null;
};

export type MissionEffect = {
  id: string;
  type: 'amulet' | 'aura';
  name: string;
  description: string;
  appliedAt: string;
  expiresAt: string | null;
  payload: Record<string, unknown>;
  consumedAt?: string | null;
};

export type BossState = {
  phase: 1 | 2;
  shield: {
    current: number;
    max: number;
    updatedAt: string;
  };
  linkedDailyTaskId: string | null;
  linkedAt: string | null;
  phase2: {
    ready: boolean;
    proof: string | null;
    submittedAt: string | null;
  };
};

export type MissionsBoard = {
  userId: string;
  seasonId: string;
  generatedAt: string;
  slots: MissionSlotState[];
  boss: BossState;
};

export type BoosterState = {
  multiplier: number;
  targetTaskId: string | null;
  appliedKeys: string[];
  nextActivationDate?: string | null;
};

export type MissionsBoardState = {
  board: MissionsBoard;
  booster: BoosterState;
  effects: MissionEffect[];
};

export type MissionAction = {
  id: string;
  type: 'heartbeat' | 'link_daily' | 'special_strike' | 'submit_evidence' | 'abandon' | 'claim';
  label: string;
  enabled: boolean;
};

export type MissionClaimState = {
  available: boolean;
  enabled: boolean;
  cooldown_until: string | null;
  claimed_at: string | null;
  reward?: MissionReward;
};

export type MissionSummary = {
  id: string;
  name: string;
  type: MissionSlotKey;
  summary: string;
  requirements: string;
  objective: string;
  reward: MissionReward;
  tasks: MissionTask[];
};

export type MissionsBoardSlotResponse = {
  id: string;
  slot: MissionSlotKey;
  mission: MissionSummary | null;
  state: 'idle' | 'active' | 'succeeded' | 'failed' | 'cooldown' | 'claimed';
  petals: MissionPetals;
  heartbeat_today: boolean;
  heartbeat_log: string[];
  progress: {
    current: number;
    target: number;
    percent: number;
  };
  countdown: {
    ends_at: string | null;
    cooldown_until: string | null;
    label: string;
  };
  actions: MissionAction[];
  claim: MissionClaimState;
};

export type MissionsBoardRewardSummary = {
  mission_id: string;
  slot: MissionSlotKey;
  reward: MissionReward;
  status: 'pending' | 'claimed';
  updated_at: string;
};

export type MissionsBoardRewards = {
  pending: MissionsBoardRewardSummary[];
  claimed: MissionsBoardRewardSummary[];
};

export type MissionsBoardCommunication = {
  id: string;
  type: 'daily' | 'weekly' | 'system';
  message: string;
};

export type MissionsBoardGating = {
  claim_url: string;
};

export type BossStateResponse = {
  id: string;
  name: string;
  status: 'locked' | 'available' | 'ready' | 'defeated';
  description: string;
  countdown: {
    ends_at: string | null;
    label: string;
  };
  actions: MissionAction[];
};

export type MissionsBoardResponse = {
  season_id: string;
  generated_at: string;
  slots: MissionsBoardSlotResponse[];
  boss: BossStateResponse;
  rewards: MissionsBoardRewards;
  gating: MissionsBoardGating;
  communications: MissionsBoardCommunication[];
};

export type MissionHeartbeatResponse = {
  status: 'ok';
  mission_id: string;
  petals_remaining: number;
  heartbeat_date: string;
};

export type MissionDailyLinkResponse = {
  missionId: string;
  taskId: string;
  linkedAt: string;
  board: MissionsBoardResponse;
};

export type BossPhase2Response = {
  boss_state: BossStateResponse;
  rewards_preview: {
    xp: number;
    currency: number;
    items: string[];
  };
};

export type MissionClaimResponse = {
  board: MissionsBoardResponse;
  rewards: {
    xp: number;
    currency: number;
    items: string[];
  };
};

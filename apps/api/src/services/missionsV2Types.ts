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

export type MissionObjective = {
  id: string;
  label: string;
  target: number;
  unit: 'tasks' | 'sessions' | 'minutes' | 'points';
};

export type MissionProposal = {
  id: string;
  slot: MissionSlotKey;
  title: string;
  summary: string;
  difficulty: 'low' | 'medium' | 'high' | 'epic';
  reward: MissionReward;
  objectives: MissionObjective[];
  tags?: {
    pillar?: string;
    trait?: string;
    mode?: string;
  };
  metadata?: Record<string, unknown>;
};

export type MissionProgress = {
  current: number;
  target: number;
  unit: MissionObjective['unit'];
  updatedAt: string;
};

export type MissionSelectionState = {
  mission: MissionProposal;
  status: 'active' | 'completed' | 'claimed' | 'failed';
  selectedAt: string;
  updatedAt: string;
  expiresAt: string | null;
  progress: MissionProgress;
  petals: MissionPetals;
  heartbeatLog: string[];
  claim?: {
    claimedAt: string;
    reward: MissionReward;
  };
};

export type MissionSlotState = {
  slot: MissionSlotKey;
  proposals: MissionProposal[];
  selected: MissionSelectionState | null;
  reroll: {
    usedAt: string | null;
    nextResetAt: string | null;
    remaining: number;
    total: number;
  };
  cooldownUntil: string | null;
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

export type MissionPetals = {
  total: number;
  remaining: number;
};

export type BoosterState = {
  multiplier: number;
  targetTaskId: string | null;
  appliedKeys: string[];
};

export type MissionsBoardState = {
  board: MissionsBoard;
  booster: BoosterState;
};

export type MissionActionHeartbeat = {
  type: 'heartbeat';
  available: boolean;
  last_marked_at: string | null;
};

export type MissionActionSelect = {
  type: 'select';
  available: boolean;
  proposals: MissionProposal[];
};

export type MissionActionReroll = {
  type: 'reroll';
  available: boolean;
  remaining: number;
  next_reset_at: string | null;
};

export type MissionActionLinkDaily = {
  type: 'link_daily';
  available: boolean;
  linked_task_id: string | null;
};

export type MissionActionSpecialStrike = {
  type: 'special_strike';
  available: boolean;
  ready: boolean;
};

export type MissionAction =
  | MissionActionHeartbeat
  | MissionActionSelect
  | MissionActionReroll
  | MissionActionLinkDaily
  | MissionActionSpecialStrike;

export type MissionClaimStatus = 'locked' | 'ready' | 'claimed';

export type MissionClaimState = {
  enabled: boolean;
  status: MissionClaimStatus;
  cooldown_until: string | null;
  claimed_at: string | null;
  reward?: MissionReward;
};

export type MissionsBoardSlotResponse = {
  id: string;
  slot: MissionSlotKey;
  mission: MissionProposal | null;
  state: 'idle' | 'active' | 'succeeded' | 'failed' | 'claimed';
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
  };
  actions: MissionAction[];
  claim: MissionClaimState;
  proposals: MissionProposal[];
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
  claim: {
    enabled: boolean;
    url: string;
  };
};

export type BossStateResponse = {
  phase: BossState['phase'];
  shield: BossState['shield'];
  linked_daily_task_id: string | null;
  linked_at: string | null;
  phase2: {
    ready: boolean;
    proof_submitted_at: string | null;
  };
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
  mission_id: string;
  petals_remaining: number;
  heartbeat_timestamps: string[];
  updated_at: string;
};

export type MissionDailyLinkResponse = {
  mission_id: string;
  task_id: string;
  linked_at: string;
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
  mission_id: string;
  claim: MissionClaimState;
  board: MissionsBoardResponse;
};

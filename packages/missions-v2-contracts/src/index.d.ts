export type MissionsV2CommunicationType = 'daily' | 'weekly' | 'biweekly' | 'seasonal';

export type MissionsV2SlotKey = 'main' | 'hunt' | 'skill';

export type MissionsV2MissionTask = {
  id: string;
  name: string;
  tag: string;
};

export type MissionsV2Mission = {
  id: string;
  name: string;
  type: MissionsV2SlotKey;
  summary: string;
  requirements: string;
  objective: string;
  objectives?: string[];
  reward: {
    xp: number;
    currency?: number;
    items?: string[];
  };
  tasks: MissionsV2MissionTask[];
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type MissionsV2ActionType =
  | 'heartbeat'
  | 'link_daily'
  | 'special_strike'
  | 'submit_evidence'
  | 'abandon'
  | 'claim';

export type MissionsV2Action = {
  id: string;
  type: MissionsV2ActionType;
  label: string;
  enabled: boolean;
};

export type MissionsV2SlotState = 'idle' | 'active' | 'succeeded' | 'failed' | 'cooldown' | 'claimed';

export type MissionsV2Slot = {
  id: string;
  slot: MissionsV2SlotKey;
  mission: MissionsV2Mission | null;
  state: MissionsV2SlotState;
  petals: { total: number; remaining: number };
  heartbeat_today: boolean;
  progress: {
    current: number;
    target: number;
    /** Derived: percentage of completion based on `current/target`. */
    percent: number;
  };
  countdown: {
    ends_at: string | null;
    /** Derived: human-readable label computed from `ends_at` or cooldowns. */
    label: string;
  };
  actions: MissionsV2Action[];
  claim: { available: boolean; enabled: boolean; cooldown_until: string | null };
};

export type MissionsV2BossStatus = 'locked' | 'available' | 'ready' | 'defeated';

export type MissionsV2Boss = {
  id: string;
  name: string;
  status: MissionsV2BossStatus;
  description: string;
  countdown: {
    ends_at: string | null;
    /** Derived: label describing remaining time or state. */
    label: string;
  };
  actions: MissionsV2Action[];
};

export type MissionsV2Communication = {
  id: string;
  type: MissionsV2CommunicationType;
  message: string;
};

export type MissionsV2MarketProposalDifficulty = 'low' | 'medium' | 'high' | 'epic';

export type MissionsV2MarketProposal = {
  id: string;
  slot: MissionsV2SlotKey;
  name: string;
  summary: string;
  requirements: string;
  objective: string;
  objectives: string[];
  reward: { xp: number; currency: number; items: string[] };
  difficulty: MissionsV2MarketProposalDifficulty;
  tags: string[];
  metadata: Record<string, unknown>;
  duration_days: number;
  /** Derived: true when proposal cannot be activated because slot already runs it. */
  locked: boolean;
  /** Derived: true when proposal matches the mission currently active for the slot. */
  isActive: boolean;
  /** Derived: timestamp when locked proposal becomes available again, if applicable. */
  available_at: string | null;
};

export type MissionsV2MarketSlot = {
  slot: MissionsV2SlotKey;
  proposals: MissionsV2MarketProposal[];
};

export type MissionsV2BoardResponse = {
  season_id: string;
  /** Derived: timestamp when payload was generated. */
  generated_at: string;
  slots: MissionsV2Slot[];
  boss: MissionsV2Boss;
  gating: { claim_url: string };
  communications: MissionsV2Communication[];
  market: MissionsV2MarketSlot[];
};

export type MissionsV2MarketResponse = {
  market: MissionsV2MarketSlot[];
};

export type MissionsV2ClaimResponse = {
  board: MissionsV2BoardResponse;
  rewards: {
    xp: number;
    currency: number;
    items: string[];
  };
};

export type MissionsV2HeartbeatResponse = {
  status: 'ok';
  petals_remaining: number;
  heartbeat_date: string;
};

export type MissionsV2LinkDailyResponse = {
  board: MissionsV2BoardResponse;
  missionId: string;
  taskId: string;
};

export type MissionsV2HeartbeatPayload = {
  missionId: string;
};

export type MissionsV2ActivatePayload = {
  slot: MissionsV2SlotKey;
  proposal_id: string;
};

export type MissionsV2AbandonPayload = {
  slot: MissionsV2SlotKey;
  mission_id: string;
};

export type MissionsV2ClaimPayload = {
  mission_id: string;
};


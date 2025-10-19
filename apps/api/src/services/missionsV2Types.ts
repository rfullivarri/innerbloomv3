export const MISSION_SLOT_KEYS = ['main', 'hunt', 'skill'] as const;

export type MissionSlotKey = (typeof MISSION_SLOT_KEYS)[number];

export type MissionsV2EventName =
  | 'missions_v2_proposals_created'
  | 'missions_v2_selected'
  | 'missions_v2_reroll'
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
  status: 'active' | 'completed' | 'claimed';
  selectedAt: string;
  updatedAt: string;
  expiresAt: string | null;
  progress: MissionProgress;
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

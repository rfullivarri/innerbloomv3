/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_WEB_BASE_URL?: string;
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@innerbloom/missions-v2-contracts' {
  export type {
    MissionsV2AbandonPayload,
    MissionsV2Action,
    MissionsV2ActionType,
    MissionsV2ActivatePayload,
    MissionsV2BoardResponse,
    MissionsV2Boss,
    MissionsV2BossStatus,
    MissionsV2ClaimPayload,
    MissionsV2ClaimResponse,
    MissionsV2Communication,
    MissionsV2CommunicationType,
    MissionsV2HeartbeatPayload,
    MissionsV2HeartbeatResponse,
    MissionsV2LinkDailyResponse,
    MissionsV2MarketProposal,
    MissionsV2MarketProposalDifficulty,
    MissionsV2MarketResponse,
    MissionsV2MarketSlot,
    MissionsV2Mission,
    MissionsV2MissionTask,
    MissionsV2Slot,
    MissionsV2SlotKey,
    MissionsV2SlotState,
  } from '../../../packages/missions-v2-contracts/src/index';
}

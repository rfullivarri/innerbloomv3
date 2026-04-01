export type TaskLifecycleStatus =
  | 'active'
  | 'achievement_pending'
  | 'achievement_maintained'
  | 'achievement_stored';

export type AchievementRecordStatus = 'pending_decision' | 'maintained' | 'stored' | 'expired_pending';

export type TaskLifecycleFlags = {
  active: boolean;
  lifecycleStatus: TaskLifecycleStatus;
  pendingExpiresAt: Date | null;
  excludedFromGrowthCalibration: boolean;
  excludedFromModeUpgrade: boolean;
  excludedFromHabitAchievement: boolean;
  difficultyLocked: boolean;
  achievementSealVisible: boolean;
};

export function resolveLifecycleFlags(status: TaskLifecycleStatus, pendingExpiresAt: Date | null = null): TaskLifecycleFlags {
  if (status === 'achievement_pending') {
    return {
      active: false,
      lifecycleStatus: status,
      pendingExpiresAt,
      excludedFromGrowthCalibration: true,
      excludedFromModeUpgrade: true,
      excludedFromHabitAchievement: true,
      difficultyLocked: false,
      achievementSealVisible: false,
    };
  }

  if (status === 'achievement_maintained') {
    return {
      active: true,
      lifecycleStatus: status,
      pendingExpiresAt: null,
      excludedFromGrowthCalibration: true,
      excludedFromModeUpgrade: true,
      excludedFromHabitAchievement: true,
      difficultyLocked: true,
      achievementSealVisible: true,
    };
  }

  if (status === 'achievement_stored') {
    return {
      active: false,
      lifecycleStatus: status,
      pendingExpiresAt: null,
      excludedFromGrowthCalibration: true,
      excludedFromModeUpgrade: true,
      excludedFromHabitAchievement: true,
      difficultyLocked: true,
      achievementSealVisible: true,
    };
  }

  return {
    active: true,
    lifecycleStatus: 'active',
    pendingExpiresAt: null,
    excludedFromGrowthCalibration: false,
    excludedFromModeUpgrade: false,
    excludedFromHabitAchievement: false,
    difficultyLocked: false,
    achievementSealVisible: false,
  };
}

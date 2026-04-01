export const ACTIVE_SURFACE_LIFECYCLE_STATUSES = ['active', 'achievement_maintained'] as const;

export function buildActiveSurfaceTaskFilter(alias: string): string {
  return `${alias}.active = TRUE AND ${alias}.lifecycle_status = ANY('{active,achievement_maintained}'::text[])`;
}

export function buildGrowthCalibrationFilter(alias: string): string {
  return `${alias}.active = TRUE AND ${alias}.excluded_from_growth_calibration = FALSE`;
}

export function buildModeUpgradeFilter(alias: string): string {
  return `${alias}.active = TRUE AND ${alias}.excluded_from_mode_upgrade = FALSE`;
}

export function buildHabitAchievementFilter(alias: string): string {
  return `${alias}.active = TRUE AND ${alias}.excluded_from_habit_achievement = FALSE`;
}

export function buildTopStreaksFilter(alias: string): string {
  return `${alias}.active = TRUE AND ${alias}.lifecycle_status = 'active'`;
}

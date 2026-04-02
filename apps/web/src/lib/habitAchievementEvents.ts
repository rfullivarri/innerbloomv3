export const HABIT_ACHIEVEMENT_UPDATED_EVENT = 'habit-achievement-updated';

export function emitHabitAchievementUpdated(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(HABIT_ACHIEVEMENT_UPDATED_EVENT));
}

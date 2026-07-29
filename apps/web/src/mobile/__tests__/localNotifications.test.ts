import { describe, expect, it } from 'vitest';
import {
  DAILY_REMINDER_NOTIFICATION_ID,
  buildDailyReminderSchedule,
  buildProductNotificationSchedule,
} from '../localNotifications';

describe('buildDailyReminderSchedule', () => {
  it('schedules a near-future local time today', () => {
    const now = new Date(2026, 6, 28, 9, 0, 0);
    const schedule = buildDailyReminderSchedule('09:10:00', now, 2);

    expect(schedule).toHaveLength(2);
    expect(schedule[0]?.id).toBe(DAILY_REMINDER_NOTIFICATION_ID);
    expect(schedule[0]?.at.getTime()).toBe(new Date(2026, 6, 28, 9, 10, 0).getTime());
    expect(schedule[1]?.at.getTime()).toBe(new Date(2026, 6, 29, 9, 10, 0).getTime());
  });

  it('moves an elapsed time to the next day without retaining the previous schedule', () => {
    const now = new Date(2026, 6, 28, 9, 10, 1);
    const schedule = buildDailyReminderSchedule('09:10:00', now, 1);

    expect(schedule[0]?.at.getTime()).toBe(new Date(2026, 6, 29, 9, 10, 0).getTime());
  });
});

describe('buildProductNotificationSchedule', () => {
  const rewards = {
    growthCalibration: { countdownDays: 3 },
    habitAchievements: { pendingCount: 1 },
  } as const;

  it('uses the next Monday and the actual calibration countdown', () => {
    const now = new Date(2026, 6, 29, 10, 0, 0); // Wednesday
    const schedule = buildProductNotificationSchedule({
      weeklyWrappedEnabled: true,
      growthCalibrationEnabled: true,
      monthlyWrappedEnabled: true,
      habitAchievementEnabled: true,
    }, rewards, now);

    expect(schedule.filter((item) => item.kind === 'weekly-wrapped')).toHaveLength(5);
    expect(schedule[0]?.at.getTime()).toBe(new Date(2026, 7, 3, 9, 0, 0).getTime());
    expect(schedule[5]?.at.getTime()).toBe(new Date(2026, 7, 1, 9, 0, 0).getTime());
    expect(schedule[6]?.at.getTime()).toBe(new Date(2026, 7, 1, 9, 0, 0).getTime());
    expect(schedule[7]?.at.getTime()).toBe(new Date(2026, 6, 29, 18, 0, 0).getTime());
  });

  it('does not schedule a habit notification unless there is something to review', () => {
    const schedule = buildProductNotificationSchedule({
      weeklyWrappedEnabled: false,
      growthCalibrationEnabled: false,
      monthlyWrappedEnabled: false,
      habitAchievementEnabled: true,
    }, {
      growthCalibration: { countdownDays: 0 },
      habitAchievements: { pendingCount: 0 },
    }, new Date(2026, 6, 29, 10, 0, 0));

    expect(schedule).toEqual([]);
  });
});

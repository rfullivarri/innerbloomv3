import { describe, expect, it } from 'vitest';

import { computeWeeklyHabitHealth } from '../../../lib/habitHealth';
import { resolveHabitHealth, type HabitItem } from '../WeeklyWrappedModal';

type TimelineWeek = NonNullable<HabitItem['insightsTimeline']>[number];

function buildTimeline(hits: boolean[]): TimelineWeek[] {
  const start = new Date('2024-03-18T00:00:00Z');

  return hits.map((hit, index) => {
    const weekStart = new Date(start);
    weekStart.setUTCDate(start.getUTCDate() + index * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

    return {
      weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10),
      count: hit ? 1 : 0,
      hit,
    } satisfies TimelineWeek;
  });
}

const referenceDate = new Date('2024-04-18T12:00:00Z');

function expectSlideMatchesPopup(item: HabitItem, completionRate: number) {
  const summaryFromPopup = computeWeeklyHabitHealth({
    timeline: item.insightsTimeline ?? [],
    completionRate,
    weeksSample: item.weeksSample as number,
    referenceDate,
  });

  const slideSummary = resolveHabitHealth(item, referenceDate);

  expect(slideSummary.label).toEqual(summaryFromPopup.habitHealth.label);
  expect(slideSummary.completionRatePct).toEqual(summaryFromPopup.completionPercent);
  expect(slideSummary.weeksActive).toEqual(summaryFromPopup.completedWeeks);
  expect(slideSummary.weeksSample).toEqual(summaryFromPopup.totalWeeks);
}

describe('Constancia slide matches popup habit health', () => {
  it('aligns for a strong habit', () => {
    const insightsTimeline = buildTimeline([true, true, true, true]);
    const habit: HabitItem = {
      title: 'Ayuno hasta las 14hs',
      body: '',
      insightsTimeline,
      weeksSample: insightsTimeline.length,
      completionRate: 100,
    };

    expectSlideMatchesPopup(habit, 100);
  });

  it('aligns for a medium habit', () => {
    const insightsTimeline = buildTimeline([true, false, true, false]);
    const habit: HabitItem = {
      title: 'Cena antes de las 22hs',
      body: '',
      insightsTimeline,
      weeksSample: insightsTimeline.length,
      completionRate: 60,
    };

    expectSlideMatchesPopup(habit, 60);
  });

  it('aligns for a weak habit', () => {
    const insightsTimeline = buildTimeline([false, false, true, false]);
    const habit: HabitItem = {
      title: 'Dormir 8hs',
      body: '',
      insightsTimeline,
      weeksSample: insightsTimeline.length,
      completionRate: 25,
    };

    expectSlideMatchesPopup(habit, 25);
  });
});

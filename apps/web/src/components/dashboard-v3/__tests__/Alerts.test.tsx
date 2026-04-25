import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Alerts } from '../Alerts';
import type { UserJourneySummary } from '../../../lib/api';

const journeyNeedingScheduler: UserJourneySummary = {
  first_date_log: '2026-04-01',
  days_of_journey: 24,
  quantity_daily_logs: 1,
  first_programmed: false,
  first_tasks_confirmed: true,
  completed_first_daily_quest: true,
};

function renderAlerts(overrides: Partial<Parameters<typeof Alerts>[0]> = {}) {
  return render(
    <MemoryRouter>
      <Alerts
        hasTasks
        firstTasksConfirmed
        completedFirstDailyQuest
        showJourneyPreparing={false}
        tasksStatus="success"
        journeyStatus="success"
        journey={journeyNeedingScheduler}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('Alerts', () => {
  it('shows the scheduler banner when no reminder has been scheduled', () => {
    renderAlerts();

    expect(screen.getByText('Último paso! Programa tu Daily Quest')).toBeInTheDocument();
  });

  it('hides the scheduler banner when onboarding progress already has a scheduled reminder', () => {
    renderAlerts({ dailyQuestScheduled: true });

    expect(screen.queryByText('Último paso! Programa tu Daily Quest')).not.toBeInTheDocument();
  });
});

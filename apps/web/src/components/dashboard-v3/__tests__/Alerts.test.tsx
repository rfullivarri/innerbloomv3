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
  it('shows spinner banner when task generation is in progress and there are no tasks', () => {
    renderAlerts({ hasTasks: false, taskgenInProgress: true, showJourneyPreparing: false });

    expect(screen.getByText('Tu Journey se está preparando')).toBeInTheDocument();
  });

  it('shows success/scheduler state when tasks are already present', () => {
    renderAlerts();

    expect(screen.getByText('Último paso! Programa tu Daily Quest')).toBeInTheDocument();
  });

  it('shows recovery CTA when task generation timed out with recoverable error', () => {
    renderAlerts({
      hasTasks: false,
      taskgenTimedOutWithError: true,
      showJourneyPreparing: false,
      showOnboardingGuidance: false,
    });

    expect(screen.getByText('Tardamos más de lo esperado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reintentar' })).toHaveAttribute('href', '/intro-journey');
  });
});

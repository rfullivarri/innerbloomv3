import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DailyReminderSettings } from './DailyReminderSettings';
import { getDailyReminderSettings, updateDailyReminderSettings } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  getDailyReminderSettings: vi.fn(),
  updateDailyReminderSettings: vi.fn(),
}));

describe('DailyReminderSettings', () => {
  const mockedGet = vi.mocked(getDailyReminderSettings);
  const mockedUpdate = vi.mocked(updateDailyReminderSettings);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the reminder settings and allows updating them', async () => {
    const user = userEvent.setup();
    mockedGet.mockResolvedValue({
      local_time: '08:30',
      timezone: 'America/Bogota',
      status: 'active',
    });
    mockedUpdate.mockResolvedValue({
      local_time: '10:00',
      timezone: 'UTC',
      status: 'paused',
    });

    render(<DailyReminderSettings />);

    const switchControl = await screen.findByRole('switch', { name: /recordatorio diario/i });
    await waitFor(() => expect(switchControl).toHaveAttribute('aria-checked', 'true'));

    const timeSelect = screen.getByLabelText(/hora local/i);
    await user.selectOptions(timeSelect, '10:00');
    await user.click(switchControl);
    const timezoneSelect = screen.getByLabelText(/zona horaria/i);
    await user.selectOptions(timezoneSelect, 'UTC');

    const submitButton = screen.getByRole('button', { name: /guardar cambios/i });
    expect(submitButton).not.toBeDisabled();
    await user.click(submitButton);

    expect(mockedUpdate).toHaveBeenCalledWith({
      status: 'paused',
      local_time: '10:00',
      timezone: 'UTC',
    });

    await screen.findByText(/guardamos tus recordatorios/i);
  });

  it('shows the load error state and retries when requested', async () => {
    const user = userEvent.setup();
    mockedGet
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ local_time: '09:00', timezone: 'UTC', status: 'paused' });

    render(<DailyReminderSettings />);

    const errorMessage = await screen.findByText(/no pudimos cargar tus recordatorios/i);
    expect(errorMessage).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /reintentar/i });
    await user.click(retryButton);

    await screen.findByRole('switch', { name: /recordatorio diario/i });
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });
});

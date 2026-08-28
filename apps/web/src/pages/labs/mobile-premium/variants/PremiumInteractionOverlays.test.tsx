import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostLoginLanguageProvider } from '../../../../i18n/postLoginLanguage';
import { getDailyReminderSettings, updateDailyReminderSettings } from '../../../../lib/api';
import { PremiumInteractionOverlays } from './PremiumInteractionOverlays';

vi.mock('../../../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/api')>();
  return {
    ...actual,
    getDailyReminderSettings: vi.fn(),
    updateDailyReminderSettings: vi.fn(),
  };
});

vi.mock('../../../../mobile/capacitor', () => ({
  isNativeCapacitorPlatform: () => false,
}));

vi.mock('../../../../mobile/localNotifications', () => ({
  ensureNativeDailyReminderNotificationPermissions: vi.fn(),
  syncNativeDailyReminderNotification: vi.fn(),
  syncNativeProductNotifications: vi.fn(),
}));

describe('Premium reminder settings', () => {
  const mockedGet = vi.mocked(getDailyReminderSettings);
  const mockedUpdate = vi.mocked(updateDailyReminderSettings);

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem('innerbloom.postlogin.language', 'en');
    mockedGet.mockImplementation(async (channel) => ({
      channel,
      enabled: channel === 'email',
      status: channel === 'email' ? 'active' : 'paused',
      local_time: '10:00:00',
      timezone: 'Europe/Madrid',
    }));
    mockedUpdate.mockImplementation(async (payload, channel) => ({
      channel,
      enabled: payload.status === 'active',
      ...payload,
    }));
  });

  it('loads both channels and allows saving with both disabled', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <PostLoginLanguageProvider>
        <PremiumInteractionOverlays
          activeOverlay="reminders"
          backendUserId="user-1"
          gameMode={null}
          onClose={onClose}
          onOpen={vi.fn()}
          onThemeToggle={vi.fn()}
          theme="dark"
          userEmail={null}
          userName="Ramiro"
        />
      </PostLoginLanguageProvider>,
    );

    const emailButton = screen.getByRole('button', { name: 'Email' });
    const notificationButton = screen.getByRole('button', { name: 'Notification' });

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('email');
      expect(mockedGet).toHaveBeenCalledWith('notification');
      expect(emailButton).toHaveAttribute('aria-pressed', 'true');
      expect(notificationButton).toHaveAttribute('aria-pressed', 'false');
    });

    await user.click(emailButton);

    expect(await screen.findByText('No email or notification reminders will be sent.')).toBeInTheDocument();
    const disableButton = screen.getByRole('button', { name: 'Turn off reminders' });
    expect(disableButton).toBeEnabled();

    await user.click(disableButton);

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith({
        local_time: '10:00',
        status: 'paused',
        timezone: 'Europe/Madrid',
      }, 'email');
      expect(mockedUpdate).toHaveBeenCalledWith({
        local_time: '10:00',
        status: 'paused',
        timezone: 'Europe/Madrid',
      }, 'notification');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

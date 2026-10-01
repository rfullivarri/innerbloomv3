import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDailyQuestStatus } from '../../../../lib/api';
import { PremiumDashboard } from './PremiumDashboard';

vi.mock('../../../../lib/api', () => ({
  getDailyQuestStatus: vi.fn(),
  getEmotions: vi.fn().mockResolvedValue([]),
  getUserDailyEnergy: vi.fn().mockResolvedValue(null),
  getUserLevel: vi.fn().mockResolvedValue(null),
  getUserStateTimeseries: vi.fn().mockResolvedValue([]),
  getUserStreakPanel: vi.fn().mockResolvedValue({ tasks: [] }),
  getUserXpByTrait: vi.fn().mockResolvedValue({ traits: [] }),
}));
vi.mock('../../../../i18n/postLoginLanguage', () => ({
  usePostLoginLanguage: () => ({ language: 'es', t: (key: string) => key }),
}));

const prompt = 'mobilePremium.dashboard.dquestTitle';
const levelLabel = 'mobilePremium.dashboard.level';

function renderDashboard() {
  return render(
    <MemoryRouter>
      <PremiumDashboard
        backendUserId="user-1"
        gameMode="FLOW"
        moderationTrackers={[]}
        onCycleModeration={vi.fn()}
        weeklyTarget={3}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(getDailyQuestStatus).mockReset();
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
  });
});

describe('dashboard retrospective reminder', () => {
  it('shows the reminder only after the API confirms it is pending', async () => {
    vi.mocked(getDailyQuestStatus).mockResolvedValue({ date: '2026-10-01', submitted: false, submitted_at: null });
    renderDashboard();
    expect(screen.queryByText(prompt)).not.toBeInTheDocument();
    expect(await screen.findByText(prompt)).toBeInTheDocument();
  });

  it('removes the entire reminder and its spacing when already completed, keeping level progress', async () => {
    vi.mocked(getDailyQuestStatus).mockResolvedValue({ date: '2026-10-01', submitted: true, submitted_at: '2026-10-01T08:00:00Z' });
    renderDashboard();
    await waitFor(() => expect(getDailyQuestStatus).toHaveBeenCalledOnce());
    expect(screen.queryByText(prompt)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /mobilePremium.dashboard.start/ })).not.toBeInTheDocument();
    const levelContainer = screen.getByText(levelLabel).closest('section')!.firstElementChild;
    expect(levelContainer).toHaveAttribute('class', '');
  });

  it('refreshes on returning to the app, hides a newly completed quest, and shows the next pending day', async () => {
    vi.mocked(getDailyQuestStatus)
      .mockResolvedValueOnce({ date: '2026-10-01', submitted: false, submitted_at: null })
      .mockResolvedValueOnce({ date: '2026-10-01', submitted: true, submitted_at: '2026-10-01T08:00:00Z' })
      .mockResolvedValueOnce({ date: '2026-10-02', submitted: false, submitted_at: null });
    renderDashboard();
    expect(await screen.findByText(prompt)).toBeInTheDocument();
    fireEvent.focus(window);
    await waitFor(() => expect(screen.queryByText(prompt)).not.toBeInTheDocument());
    fireEvent.focus(window);
    expect(await screen.findByText(prompt)).toBeInTheDocument();
  });

  it('does not assume the quest is pending if the status request fails', async () => {
    vi.mocked(getDailyQuestStatus).mockRejectedValue(new Error('offline'));
    renderDashboard();
    await waitFor(() => expect(getDailyQuestStatus).toHaveBeenCalledOnce());
    expect(screen.queryByText(prompt)).not.toBeInTheDocument();
    expect(screen.getByText(levelLabel)).toBeInTheDocument();
  });
});

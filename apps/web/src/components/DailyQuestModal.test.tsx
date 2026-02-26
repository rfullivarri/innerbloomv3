import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { DailyQuestModal, type DailyQuestModalHandle } from './DailyQuestModal';

const { mockGetStatus, mockGetDefinition, mockSubmit } = vi.hoisted(() => ({
  mockGetStatus: vi.fn(),
  mockGetDefinition: vi.fn(),
  mockSubmit: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  getDailyQuestStatus: (...args: unknown[]) => mockGetStatus(...args),
  getDailyQuestDefinition: (...args: unknown[]) => mockGetDefinition(...args),
  submitDailyQuest: (...args: unknown[]) => mockSubmit(...args),
}));

describe('DailyQuestModal', () => {
  const baseDefinition = {
    date: '2024-03-10',
    submitted: false,
    submitted_at: null,
    emotionOptions: [
      { emotion_id: 1, code: 'CALMA', name: 'Calma' },
      { emotion_id: 2, code: 'FOCUS', name: 'Enfoque' },
    ],
    pillars: [
      {
        pillar_code: 'BODY',
        tasks: [
          {
            task_id: 'task-1',
            name: 'Estiramientos',
            trait_id: 1,
            difficulty: 'EASY',
            difficulty_id: 1,
            xp: 10,
          },
        ],
      },
      {
        pillar_code: 'MIND',
        tasks: [
          {
            task_id: 'task-2',
            name: 'Meditación',
            trait_id: 2,
            difficulty: 'MED',
            difficulty_id: 2,
            xp: 20,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    mockGetStatus.mockReset();
    mockGetDefinition.mockReset();
    mockSubmit.mockReset();
  });

  it('does not render the modal when the quest is already submitted', async () => {
    mockGetStatus.mockResolvedValue({ date: '2024-03-10', submitted: true, submitted_at: '2024-03-10T12:00:00Z' });
    mockGetDefinition.mockResolvedValue(baseDefinition);

    render(<DailyQuestModal enabled />);

    await waitFor(() => {
      expect(mockGetStatus).toHaveBeenCalled();
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not auto-open when canAutoOpen is false', async () => {
    mockGetStatus.mockResolvedValue({ date: '2024-03-10', submitted: false, submitted_at: null });
    mockGetDefinition.mockResolvedValue(baseDefinition);

    render(<DailyQuestModal enabled canAutoOpen={false} />);

    await waitFor(() => {
      expect(mockGetStatus).toHaveBeenCalled();
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('auto-opens when canAutoOpen is true and quest is not submitted', async () => {
    mockGetStatus.mockResolvedValue({ date: '2024-03-10', submitted: false, submitted_at: null });
    mockGetDefinition.mockResolvedValue(baseDefinition);

    render(<DailyQuestModal enabled canAutoOpen />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('allows selecting only one emotion at a time', async () => {
    mockGetStatus.mockResolvedValue({ date: '2024-03-10', submitted: false, submitted_at: null });
    mockGetDefinition.mockResolvedValue(baseDefinition);

    render(<DailyQuestModal enabled />);

    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    const emotionButtons = await screen.findAllByRole('button', { name: /calma|enfoque/i });
    await user.click(emotionButtons[0]);
    expect(emotionButtons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(emotionButtons[1]).toHaveAttribute('aria-pressed', 'false');

    await user.click(emotionButtons[1]);
    expect(emotionButtons[0]).toHaveAttribute('aria-pressed', 'false');
    expect(emotionButtons[1]).toHaveAttribute('aria-pressed', 'true');
  });

  it('updates the XP counter when tasks are toggled', async () => {
    mockGetStatus.mockResolvedValue({ date: '2024-03-10', submitted: false, submitted_at: null });
    mockGetDefinition.mockResolvedValue(baseDefinition);

    render(<DailyQuestModal enabled />);

    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    const taskLabel = screen.getByText('Estiramientos');
    await user.click(taskLabel);

    await waitFor(() => {
      expect(screen.getByTestId('xp-counter')).toHaveTextContent('10');
    });

    await user.click(taskLabel);

    await waitFor(() => {
      expect(screen.getByTestId('xp-counter')).toHaveTextContent('0');
    });
  });

  it('keeps the celebration visible after submitting so it only closes via the CTA', async () => {
    mockGetStatus
      .mockResolvedValueOnce({ date: '2024-03-10', submitted: false, submitted_at: null })
      .mockResolvedValue({ date: '2024-03-10', submitted: true, submitted_at: '2024-03-10T12:00:00Z' });
    mockGetDefinition.mockResolvedValue(baseDefinition);
    mockSubmit.mockResolvedValue({
      ok: true,
      saved: {
        emotion: { emotion_id: 1, date: '2024-03-10', notes: null },
        tasks: { date: '2024-03-10', completed: ['task-1'] },
      },
      xp_delta: 10,
      xp_total_today: 20,
      streaks: { daily: 1, weekly: 1 },
    });

    render(<DailyQuestModal enabled />);

    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /calma/i }));
    await user.click(screen.getByText('Estiramientos'));
    await user.click(screen.getByRole('button', { name: /registrar daily quest/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        date: '2024-03-10',
        emotion_id: 1,
        tasks_done: ['task-1'],
        notes: null,
      });
    });

    await screen.findByRole('button', { name: /mantené presionado/i }, { timeout: 4000 });

    expect(screen.getByText('Mantené presionado 2 segundos para cerrar')).toBeInTheDocument();
    expect(screen.getByText('+10 XP')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mantené presionado/i })).toBeInTheDocument();
  }, 15000);

  it('locks body scroll while the modal is open and restores it on close', async () => {
    mockGetStatus.mockResolvedValue({ date: '2024-03-10', submitted: false, submitted_at: null });
    mockGetDefinition.mockResolvedValue(baseDefinition);

    const user = userEvent.setup();
    render(<DailyQuestModal enabled />);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    expect(document.body.style.overflow).toBe('hidden');

    await user.click(screen.getByRole('button', { name: /más tarde/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(document.body.style.overflow).not.toBe('hidden'));
  });

  it('closes when pressing Escape', async () => {
    mockGetStatus.mockResolvedValue({ date: '2024-03-10', submitted: false, submitted_at: null });
    mockGetDefinition.mockResolvedValue(baseDefinition);

    const user = userEvent.setup();
    render(<DailyQuestModal enabled />);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(document.body.style.overflow).not.toBe('hidden'));
  });

  it('restores focus to the trigger element after closing', async () => {
    mockGetStatus.mockResolvedValue({ date: '2024-03-10', submitted: false, submitted_at: null });
    mockGetDefinition.mockResolvedValue(baseDefinition);

    const triggerRef = createRef<HTMLButtonElement>();
    const user = userEvent.setup();

    render(
      <>
        <button ref={triggerRef}>Daily</button>
        <DailyQuestModal enabled returnFocusRef={triggerRef} />
      </>,
    );

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    await user.click(screen.getByLabelText(/cerrar daily quest/i));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(triggerRef.current);
  });

  it('allows reopening through the exposed ref after snoozing', async () => {
    mockGetStatus.mockResolvedValue({ date: '2024-03-10', submitted: false, submitted_at: null });
    mockGetDefinition.mockResolvedValue(baseDefinition);

    const modalRef = createRef<DailyQuestModalHandle>();
    const user = userEvent.setup();

    render(<DailyQuestModal ref={modalRef} enabled />);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /más tarde/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    modalRef.current?.open();

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });
});

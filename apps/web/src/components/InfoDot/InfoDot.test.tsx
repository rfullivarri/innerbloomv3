import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { InfoDot } from './InfoDot';

describe('InfoDot', () => {
  it('renders and opens on click', async () => {
    const user = userEvent.setup();
    render(<InfoDot id="xpLevel" />);

    const button = screen.getByRole('button', { name: /más información/i });
    await act(async () => {
      await user.click(button);
    });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('closes on outside click', async () => {
    const user = userEvent.setup();
    render(<InfoDot id="xpLevel" />);

    const button = screen.getByRole('button', { name: /más información/i });
    await act(async () => {
      await user.click(button);
    });
    await screen.findByRole('dialog');

    await act(async () => {
      await user.click(document.body);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes on escape and restores focus', async () => {
    const user = userEvent.setup();
    render(<InfoDot id="xpLevel" />);

    const button = screen.getByRole('button', { name: /más información/i });
    await act(async () => {
      await user.click(button);
    });
    await screen.findByRole('dialog');

    await act(async () => {
    await act(async () => {
      await user.keyboard('{Escape}');
    });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(button);
  });

  it('matches the xpLevel snapshot', async () => {
    const user = userEvent.setup();
    render(<InfoDot id="xpLevel" />);
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /más información/i }));
    });

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toMatchSnapshot();
  });
});

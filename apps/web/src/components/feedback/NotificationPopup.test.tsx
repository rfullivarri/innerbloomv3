import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PostLoginLanguageProvider } from '../../i18n/postLoginLanguage';
import { NotificationPopup } from './NotificationPopup';

describe('NotificationPopup', () => {
  it('calls onCtaClick when CTA is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCtaClick = vi.fn();

    render(
      <PostLoginLanguageProvider>
        <NotificationPopup
          open
          title="Título"
          message="Mensaje"
          emoji="🚀"
          cta={{ label: 'Abrir', href: null }}
          onClose={onClose}
          onCtaClick={onCtaClick}
        />
      </PostLoginLanguageProvider>,
    );

    await user.click(screen.getByRole('link', { name: /abrir/i }));

    expect(onCtaClick).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});

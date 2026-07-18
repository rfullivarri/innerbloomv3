import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirectCallbackProps = vi.fn();
const readOAuthRedirectIntent = vi.fn();

vi.mock('@clerk/clerk-react', () => ({
  AuthenticateWithRedirectCallback: (props: Record<string, unknown>) => {
    redirectCallbackProps(props);
    return null;
  },
}));

vi.mock('../../components/auth/GoogleOAuthButton', () => ({
  readOAuthRedirectIntent: () => readOAuthRedirectIntent(),
}));

import SsoCallbackPage from '../SsoCallback';

describe('SsoCallbackPage', () => {
  beforeEach(() => {
    redirectCallbackProps.mockReset();
    readOAuthRedirectIntent.mockReset();
  });

  it('keeps the Clerk CAPTCHA mount visible for interactive smart challenges', () => {
    readOAuthRedirectIntent.mockReturnValue({
      mode: 'sign-up',
      redirectUrlComplete: '/mobile-auth?mode=sign-up&handoff=1',
      createdAt: Date.now(),
    });

    const { container } = render(<SsoCallbackPage />);
    const captcha = container.querySelector('#clerk-captcha');

    expect(captcha).not.toBeNull();
    expect(captcha).not.toHaveClass('sr-only');
    expect(captcha).toHaveAttribute('data-cl-theme', 'dark');
    expect(captcha).toHaveAttribute('data-cl-size', 'flexible');
    expect(screen.getByRole('status')).toHaveTextContent('Completing secure sign-in');
  });

  it('preserves the native sign-up fallback while Clerk completes the callback', () => {
    readOAuthRedirectIntent.mockReturnValue({
      mode: 'sign-up',
      redirectUrlComplete: '/mobile-auth?mode=sign-up&handoff=1',
      createdAt: Date.now(),
    });

    render(<SsoCallbackPage />);

    expect(redirectCallbackProps).toHaveBeenCalledWith(expect.objectContaining({
      signInFallbackRedirectUrl: undefined,
      signUpFallbackRedirectUrl: '/mobile-auth?mode=sign-up&handoff=1',
    }));
  });
});

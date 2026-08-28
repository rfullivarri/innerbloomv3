import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PostLoginLanguageProvider } from '../../../../i18n/postLoginLanguage';
import {
  ONBOARDING_BANNERS,
  ONBOARDING_WELCOME_VISIBLE_MS,
  PremiumOnboardingBannersLab,
} from './PremiumOnboardingBannersLab';

function renderWelcome(storageKey: string) {
  return render(
    <MemoryRouter>
      <PostLoginLanguageProvider>
        <PremiumOnboardingBannersLab
          banners={[ONBOARDING_BANNERS[5]]}
          compact
          welcomeStorageKey={storageKey}
        />
      </PostLoginLanguageProvider>
    </MemoryRouter>,
  );
}

describe('Premium onboarding welcome banner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T10:00:00.000Z'));
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the original eight-second window across a remount instead of restarting it', () => {
    const storageKey = 'welcome:user-1';
    const firstRender = renderWelcome(storageKey);

    expect(screen.getByText('Bienvenido a Innerbloom')).toBeInTheDocument();
    expect(window.localStorage.getItem(storageKey)).toBe(String(Date.now()));

    act(() => vi.advanceTimersByTime(3000));
    firstRender.unmount();
    act(() => vi.advanceTimersByTime(1000));

    renderWelcome(storageKey);
    expect(screen.getByText('Bienvenido a Innerbloom')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(ONBOARDING_WELCOME_VISIBLE_MS - 4000));
    expect(screen.queryByText('Bienvenido a Innerbloom')).not.toBeInTheDocument();
  });

  it('does not show a welcome banner already recorded by the previous storage format', () => {
    const storageKey = 'welcome:user-1';
    window.localStorage.setItem(storageKey, '1');

    renderWelcome(storageKey);

    expect(screen.queryByText('Bienvenido a Innerbloom')).not.toBeInTheDocument();
  });
});

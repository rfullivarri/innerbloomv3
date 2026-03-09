import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  PostLoginLanguageProvider,
  POSTLOGIN_LANGUAGE_STORAGE_KEY,
  usePostLoginLanguage,
} from './postLoginLanguage';

const ONBOARDING_LANGUAGE_STORAGE_KEY = 'innerbloom.onboarding.language';
const POSTLOGIN_LANGUAGE_SOURCE_STORAGE_KEY = 'innerbloom.postlogin.language.source';

function Probe() {
  const { language, setManualLanguage } = usePostLoginLanguage();

  return (
    <div>
      <output data-testid="language">{language}</output>
      <button type="button" onClick={() => setManualLanguage('en')}>
        switch-en
      </button>
      <button type="button" onClick={() => setManualLanguage('es')}>
        switch-es
      </button>
    </div>
  );
}

describe('post-login language flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('boots dashboard in EN when onboarding selected EN', () => {
    window.localStorage.setItem(ONBOARDING_LANGUAGE_STORAGE_KEY, 'en');

    render(
      <PostLoginLanguageProvider>
        <Probe />
      </PostLoginLanguageProvider>,
    );

    expect(screen.getByTestId('language').textContent).toBe('en');
  });

  it('boots dashboard in ES when onboarding selected ES', () => {
    window.localStorage.setItem(ONBOARDING_LANGUAGE_STORAGE_KEY, 'es');

    render(
      <PostLoginLanguageProvider>
        <Probe />
      </PostLoginLanguageProvider>,
    );

    expect(screen.getByTestId('language').textContent).toBe('es');
  });

  it('persists manual menu switch and keeps it after reload', () => {
    const view = render(
      <PostLoginLanguageProvider>
        <Probe />
      </PostLoginLanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'switch-en' }));

    expect(window.localStorage.getItem(POSTLOGIN_LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(window.localStorage.getItem(POSTLOGIN_LANGUAGE_SOURCE_STORAGE_KEY)).toBe('manual');

    view.unmount();

    render(
      <PostLoginLanguageProvider>
        <Probe />
      </PostLoginLanguageProvider>,
    );

    expect(screen.getByTestId('language').textContent).toBe('en');
  });
});

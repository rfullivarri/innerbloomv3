import { afterEach, describe, expect, it } from 'vitest';
import { AUTH_LANGUAGE_STORAGE_KEY, resolveAuthLanguage } from './authLanguage';

function setNavigatorLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });
}

describe('resolveAuthLanguage', () => {
  afterEach(() => {
    window.localStorage.clear();
    setNavigatorLanguages(['en-US']);
  });

  it('prefers the explicit query language', () => {
    setNavigatorLanguages(['en-US']);

    expect(resolveAuthLanguage('?lang=es')).toBe('es');
    expect(window.localStorage.getItem(AUTH_LANGUAGE_STORAGE_KEY)).toBe('es');
  });

  it('uses the stored language before the device language', () => {
    window.localStorage.setItem(AUTH_LANGUAGE_STORAGE_KEY, 'es');
    setNavigatorLanguages(['en-US']);

    expect(resolveAuthLanguage('')).toBe('es');
  });

  it('uses the device language when no explicit preference exists', () => {
    setNavigatorLanguages(['en-US']);
    expect(resolveAuthLanguage('')).toBe('en');

    setNavigatorLanguages(['es-AR']);
    expect(resolveAuthLanguage('')).toBe('es');
  });
});

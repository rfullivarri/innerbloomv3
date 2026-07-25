import { describe, expect, it } from 'vitest';
import { shouldRefreshNativeSession } from '../NativeReliabilityBridge';

describe('shouldRefreshNativeSession', () => {
  const now = Date.UTC(2026, 6, 25, 12, 0, 0);

  it('refreshes an expired native token', () => {
    expect(shouldRefreshNativeSession(now - 1, now)).toBe(true);
  });

  it('refreshes before the token enters the expiry race window', () => {
    expect(shouldRefreshNativeSession(now + 10 * 60 * 1000, now)).toBe(true);
  });

  it('keeps a healthy token without opening the auth surface', () => {
    expect(shouldRefreshNativeSession(now + 30 * 60 * 1000, now)).toBe(false);
  });

  it('does not force refresh when the token has no expiry metadata', () => {
    expect(shouldRefreshNativeSession(null, now)).toBe(false);
  });
});

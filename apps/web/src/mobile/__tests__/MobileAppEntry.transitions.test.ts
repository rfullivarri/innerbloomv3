import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const entryStyles = readFileSync(new URL('../MobileAppEntry.css', import.meta.url), 'utf8');

describe('native welcome outer transitions', () => {
  it('uses the same right-to-left transition for copy and visual scenes', () => {
    expect(entryStyles).toContain('.native-welcome-copy,');
    expect(entryStyles).toContain('.native-welcome-visual-shell');
    expect(entryStyles).toContain('animation: native-welcome-step-cycle 5200ms');
    expect(entryStyles).toContain('transform: translate3d(28px, 0, 0)');
    expect(entryStyles).toContain('transform: translate3d(-28px, 0, 0)');
  });

  it('removes independent pulse animation from the step badge and title', () => {
    expect(entryStyles).toContain('.native-welcome-copy > span,');
    expect(entryStyles).toContain('.native-welcome-copy > h1');
    expect(entryStyles).toContain('animation: none !important');
    expect(entryStyles).toContain('transform: none !important');
  });

  it('keeps the step stationary between entry and exit', () => {
    expect(entryStyles).toContain('4.25%');
    expect(entryStyles).toContain('96.9%');
  });

  it('keeps Step 2 rows visible after their one-shot native entrance', () => {
    expect(entryStyles).toContain(
      '.native-welcome-visual-shell--step-2.landing.landing--v3-conversion',
    );
    expect(entryStyles).toContain('.ib20-task-row');
    expect(entryStyles).toContain('native-welcome-step-2-row-enter');
    expect(entryStyles).toContain('animation-iteration-count: 1 !important');
    expect(entryStyles).toContain('opacity: 1');
  });

  it('provides a reduced-motion fade without horizontal movement', () => {
    expect(entryStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(entryStyles).toContain('native-welcome-step-cycle-reduced');
  });
});

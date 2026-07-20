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

  it('keeps the native eyebrow and headline internally still', () => {
    expect(entryStyles).toContain('.native-welcome-copy > span,');
    expect(entryStyles).toContain('.native-welcome-copy > h1');
    expect(entryStyles).toContain('animation: none !important');
    expect(entryStyles).toContain('transform: none !important');
  });

  it('keeps the step stationary between entry and exit', () => {
    expect(entryStyles).toContain('4.25%');
    expect(entryStyles).toContain('96.9%');
  });

  it('keeps Step 2 rows visible after their one-shot entrance', () => {
    expect(entryStyles).toContain('native-step-2-panel-enter');
    expect(entryStyles).toContain('native-step-2-row-enter');
    expect(entryStyles).toContain('animation-delay: calc(90ms + var(--delay)) !important');
    expect(entryStyles).toContain('animation: native-step-2-row-enter 520ms');
  });

  it('provides a reduced-motion fade without horizontal movement', () => {
    expect(entryStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(entryStyles).toContain('native-welcome-step-cycle-reduced');
  });
});
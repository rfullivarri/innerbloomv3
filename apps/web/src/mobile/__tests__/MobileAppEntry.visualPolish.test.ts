import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const entryStyles = readFileSync(new URL('../MobileAppEntry.css', import.meta.url), 'utf8');

describe('native welcome visual polish', () => {
  it('removes the tiny Step 1 quick-start label without hiding task cards', () => {
    expect(entryStyles).toContain(
      '.native-welcome-visual-shell--step-1',
    );
    expect(entryStyles).toContain(
      '.quickstart-premium-card',
    );
    expect(entryStyles).toContain('> p:first-child');
    expect(entryStyles).not.toContain(
      '.native-welcome-visual-shell--step-1 .quickstart-task-row',
    );
  });

  it('removes only the duplicate Step 2 product topline with sufficient specificity', () => {
    expect(entryStyles).toContain(
      '.native-welcome-visual-shell--step-2.landing.landing--v3-conversion',
    );
    expect(entryStyles).toContain('.ib20-showcase-topline');
    expect(entryStyles).toContain('display: none !important');
    expect(entryStyles).not.toContain(
      '.native-welcome-visual-shell--step-2.landing.landing--v3-conversion\n  .ib20-task-head',
    );
  });

  it('keeps Step 3 stable while the difficulty chip expands', () => {
    expect(entryStyles).toContain(
      '.native-welcome-visual-shell--step-3.landing.landing--v3-conversion',
    );
    expect(entryStyles).toContain('.ib20-habit-body');
    expect(entryStyles).toContain('box-sizing: border-box');
    expect(entryStyles).toContain('.ib20-detail-copy h4');
    expect(entryStyles).toContain('font-size: clamp(0.82rem, 3.7vw, 1rem) !important');
    expect(entryStyles).toContain('white-space: nowrap');
    expect(entryStyles).toContain('.ib20-detail-chip--trait');
    expect(entryStyles).toContain('grid-template-columns: auto minmax(0, 11.5rem)');
  });

  it('keeps the validated Step 4 spacing unchanged', () => {
    expect(entryStyles).toContain(
      '.native-welcome-visual-shell--step-4 .v3-method-logros__scene',
    );
    expect(entryStyles).toContain('top: 12px');
    expect(entryStyles).toContain('top: 8px');
  });
});

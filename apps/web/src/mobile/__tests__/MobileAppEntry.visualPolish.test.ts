import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const entryStyles = readFileSync(new URL('../MobileAppEntry.css', import.meta.url), 'utf8');

describe('native welcome visual polish', () => {
  it('removes only the duplicate Step 2 product topline', () => {
    expect(entryStyles).toContain(
      '.native-welcome-visual-shell--step-2 .ib20-showcase-topline',
    );
    expect(entryStyles).toContain('display: none');
    expect(entryStyles).not.toContain('.native-welcome-visual-shell--step-2 .ib20-task-head');
  });

  it('keeps Step 3 stable while the difficulty chip expands', () => {
    expect(entryStyles).toContain(
      '.native-welcome-visual-shell--step-3 .ib20-showcase--detail',
    );
    expect(entryStyles).toContain(
      '.native-welcome-visual-shell--step-3 .ib20-habit-body',
    );
    expect(entryStyles).toContain('box-sizing: border-box');
    expect(entryStyles).toContain(
      '.native-welcome-visual-shell--step-3 .ib20-detail-copy h4',
    );
    expect(entryStyles).toContain('white-space: nowrap');
  });

  it('separates the Step 4 shelf label from the native heading', () => {
    expect(entryStyles).toContain(
      '.native-welcome-visual-shell--step-4 .v3-method-logros__scene',
    );
    expect(entryStyles).toContain('top: 12px');
    expect(entryStyles).toContain('top: 8px');
  });
});

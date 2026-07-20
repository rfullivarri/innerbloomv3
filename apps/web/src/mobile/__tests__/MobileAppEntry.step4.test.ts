import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const entrySource = readFileSync(new URL('../MobileAppEntry.tsx', import.meta.url), 'utf8');
const entryStyles = readFileSync(new URL('../MobileAppEntry.css', import.meta.url), 'utf8');

describe('native welcome Step 4 architecture', () => {
  it('renders every native welcome step through the shared landing visual', () => {
    expect(entrySource).toContain('<LandingV3MethodVisual');
    expect(entrySource).toContain('index={activeIndex}');
    expect(entrySource).toContain('nativePreview');
    expect(entrySource).not.toContain('function NativeWelcomeLogrosVisual');
    expect(entrySource).not.toContain('NATIVE_LOGROS');
    expect(entrySource).not.toContain("activeIndex === 3 ? (");
  });

  it('keeps the landing achievement animation cadence explicit for Step 4', () => {
    expect(entrySource).toContain('const NATIVE_LOGROS_SLIDE_MS = 2100');
    expect(entrySource).toContain('logrosCycleMs={activeIndex === 3 ? NATIVE_LOGROS_SLIDE_MS : undefined}');
  });

  it('centers and scales the shared shelf without depending on transform cascade order', () => {
    expect(entryStyles).toContain('.native-welcome-visual-shell--step-4 .v3-method-logros__scene');
    expect(entryStyles).toContain('position: absolute');
    expect(entryStyles).toContain('inset-inline: 0');
    expect(entryStyles).toContain('margin-inline: auto');
    expect(entryStyles).toContain('scale(var(--native-welcome-visual-scale))');
    expect(entryStyles).not.toContain('left: 50%');
    expect(entryStyles).not.toContain('translate3d(-50%');
    expect(entryStyles).not.toContain('.native-welcome-logros__card');
  });
});

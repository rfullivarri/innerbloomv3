import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifestPath = path.resolve(__dirname, '../public/manifest.webmanifest');

describe('PWA manifest scope', () => {
  it('uses root scope and start_url so editor stays in standalone context', () => {
    const manifestRaw = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestRaw) as { scope?: string; start_url?: string };

    expect(manifest.scope).toBe('/');
    expect(manifest.start_url).toBe('/');
  });
});

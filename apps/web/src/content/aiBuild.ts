import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAiHtml, buildAiJson } from './aiDossier';

function resolveVersion() {
  const envVersion = process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.BUILD_ID;
  if (envVersion) {
    return envVersion.slice(0, 12);
  }

  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
}

export function buildVersioning() {
  return {
    version: resolveVersion(),
    lastUpdated: new Date().toISOString()
  };
}

export function generateAiArtifacts() {
  const versioning = buildVersioning();
  const aiJson = buildAiJson(versioning);
  const aiHtml = buildAiHtml(versioning);

  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
  const aiDir = resolve(root, 'public/ai');
  mkdirSync(aiDir, { recursive: true });

  writeFileSync(resolve(root, 'public/ai.json'), `${JSON.stringify(aiJson, null, 2)}\n`, 'utf8');
  writeFileSync(resolve(aiDir, 'index.html'), aiHtml, 'utf8');
}

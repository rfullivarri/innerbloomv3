import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const taskgenSource = path.resolve(scriptDir, 'generateTasks.ts');
const promptsSource = path.resolve(scriptDir, '../prompts');
const distDir = path.resolve(scriptDir, '../dist/taskgen');
const distScript = path.resolve(distDir, 'generateTasks.ts');
const distPrompts = path.resolve(distDir, 'prompts');
const snapshotSampleSource = path.resolve(scriptDir, '../db-snapshot.sample.json'); // #REMOVE_ME_DEBUG_BYPASS
const snapshotSampleDest = path.resolve(distDir, 'db-snapshot.sample.json'); // #REMOVE_ME_DEBUG_BYPASS
const fixturesSource = path.resolve(scriptDir, '../fixtures'); // #REMOVE_ME_DEBUG_BYPASS
const fixturesDest = path.resolve(distDir, 'fixtures'); // #REMOVE_ME_DEBUG_BYPASS

if (!existsSync(taskgenSource)) {
  throw new Error(`Task generation CLI not found at ${taskgenSource}`);
}

if (!existsSync(promptsSource)) {
  throw new Error(`Task generation prompts not found at ${promptsSource}`);
}

mkdirSync(distDir, { recursive: true });
cpSync(taskgenSource, distScript);
rmSync(distPrompts, { recursive: true, force: true });
cpSync(promptsSource, distPrompts, { recursive: true });
if (existsSync(snapshotSampleSource)) {
  cpSync(snapshotSampleSource, snapshotSampleDest); // #REMOVE_ME_DEBUG_BYPASS
}
if (existsSync(fixturesSource)) {
  rmSync(fixturesDest, { recursive: true, force: true }); // #REMOVE_ME_DEBUG_BYPASS
  cpSync(fixturesSource, fixturesDest, { recursive: true }); // #REMOVE_ME_DEBUG_BYPASS
}

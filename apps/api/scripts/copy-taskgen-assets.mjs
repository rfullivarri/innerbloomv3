import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const taskgenSource = path.resolve(scriptDir, 'generateTasks.ts');
const promptsSource = path.resolve(scriptDir, '../prompts');
const distDir = path.resolve(scriptDir, '../dist/taskgen');
const distScript = path.resolve(distDir, 'generateTasks.ts');
const distPrompts = path.resolve(distDir, 'prompts');

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

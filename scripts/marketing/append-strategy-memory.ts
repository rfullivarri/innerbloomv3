import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  appendStrategyMemoryEntry,
  type StrategyMemoryInput,
} from '../../apps/web/src/lib/marketingStrategyMemory';

const [, , inputPathArg, memoryPathArg] = process.argv;

if (!inputPathArg) {
  console.error('Usage: pnpm exec tsx scripts/marketing/append-strategy-memory.ts <entry.json> [memory.md]');
  process.exit(1);
}

const inputPath = resolve(process.cwd(), inputPathArg);
const memoryPath = resolve(process.cwd(), memoryPathArg ?? 'Docs/marketing/STRATEGY_MEMORY.md');

const input = JSON.parse(readFileSync(inputPath, 'utf8')) as StrategyMemoryInput;
const currentMarkdown = readFileSync(memoryPath, 'utf8');
const nextMarkdown = appendStrategyMemoryEntry(currentMarkdown, input);

if (nextMarkdown === currentMarkdown) {
  console.log('No changes: identical strategy memory entry already exists.');
  process.exit(0);
}

writeFileSync(memoryPath, nextMarkdown);
console.log(`Appended strategy memory entry for ${input.date} | ${input.period}`);

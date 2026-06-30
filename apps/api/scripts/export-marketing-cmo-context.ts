import process from 'node:process';
import { buildMarketingCmoContext } from '../src/services/marketingCmoContextService.js';
import { endPool } from '../src/db.js';

function readArgs(argv: string[]): { periodKey: string; force: boolean } {
  const periodArg = argv.find((arg) => arg.startsWith('--period='));
  const force = argv.includes('--force');
  const periodKey = periodArg?.slice('--period='.length);

  if (!periodKey) {
    throw new Error('Usage: tsx apps/api/scripts/export-marketing-cmo-context.ts --period=YYYY-MM [--force]');
  }

  return { periodKey, force };
}

async function main(): Promise<void> {
  const args = readArgs(process.argv.slice(2));
  const result = await buildMarketingCmoContext({
    periodKey: args.periodKey,
    force: args.force,
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error: unknown) => {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error('Unknown export error');
    }
    process.exitCode = 1;
  })
  .finally(() => {
    void endPool();
  });

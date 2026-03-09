import { endPool } from '../src/db.js';
import { runTaskDifficultyCalibrationBackfill } from '../src/services/taskDifficultyCalibrationService.js';

async function main() {
  const result = await runTaskDifficultyCalibrationBackfill(new Date());
  console.info('[task-difficulty-backfill] done', result);
}

main()
  .catch((error) => {
    console.error('[task-difficulty-backfill] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await endPool();
  });

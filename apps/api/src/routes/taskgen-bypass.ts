import { Router } from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const router = Router();

const ALLOWED_MODES = new Set(['low', 'chill', 'flow', 'evolve']);

function extractModeFromOutput(output: string, userId: string): string | undefined {
  const escapedUserId = userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escapedUserId}\\.(low|chill|flow|evolve)`, 'i');
  const match = output.match(regex);
  return match?.[1]?.toLowerCase();
}

type GenerateTasksCliResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  spawnError?: string;
};

async function runGenerateTasksCli(userId: string, mode?: string): Promise<GenerateTasksCliResult> {
  const args = ['ts-node', 'scripts/generateTasks.ts', '--user', userId];
  if (mode) {
    args.push('--mode', mode);
  }

  return await new Promise<GenerateTasksCliResult>((resolve) => {
    const child = spawn('pnpm', args, {
      cwd: path.resolve('.'),
      env: { ...process.env },
      stdio: 'pipe',
    });

    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    let settled = false;

    child.stdout?.on('data', (chunk) => {
      stdoutChunks.push(chunk.toString());
    });

    child.stderr?.on('data', (chunk) => {
      stderrChunks.push(chunk.toString());
    });

    child.on('error', (error) => {
      const sanitisedMessage =
        typeof error === 'object' && error && 'message' in error
          ? String(error.message).trim()
          : 'Unknown error';

      if (settled) {
        return;
      }
      settled = true;

      resolve({
        code: null,
        stdout: stdoutChunks.join(''),
        stderr: stderrChunks.join(''),
        spawnError: `Failed to launch task generation CLI: ${sanitisedMessage}`,
      });
    });

    child.on('close', (code) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve({ code, stdout: stdoutChunks.join(''), stderr: stderrChunks.join('') });
    });
  });
}

router.get('/taskgen/dry-run/:user_id', async (req, res, next) => {
  try {
    const adminHeader = req.header('x-admin-token');
    const expectedToken = process.env.ADMIN_TRIGGER_TOKEN;

    if (!adminHeader || !expectedToken || adminHeader !== expectedToken) {
      return res.status(401).json({ status: 'unauthorized' });
    }

    const userId = req.params.user_id;
    const modeQuery = req.query.mode;

    let requestedMode: string | undefined;
    if (typeof modeQuery === 'string' && modeQuery.length > 0) {
      const normalised = modeQuery.toLowerCase();
      if (!ALLOWED_MODES.has(normalised)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid mode. Expected one of: ${Array.from(ALLOWED_MODES).join(', ')}`,
        });
      }
      requestedMode = normalised;
    } else if (typeof modeQuery !== 'undefined' && modeQuery !== null) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid mode parameter',
      });
    }

    const { code, stdout, stderr, spawnError } = await runGenerateTasksCli(userId, requestedMode);

    if (spawnError) {
      return res.status(500).json({
        status: 'error',
        user_id: userId,
        mode: requestedMode ?? null,
        message: spawnError,
        error_log: '/exports/errors.log',
      });
    }

    if (code !== 0) {
      const message = stderr.trim() || stdout.trim() || 'Task generation failed';
      return res.status(500).json({
        status: 'error',
        user_id: userId,
        mode: requestedMode ?? extractModeFromOutput(stdout, userId) ?? null,
        message,
        error_log: '/exports/errors.log',
      });
    }

    const resolvedMode = requestedMode ?? extractModeFromOutput(stdout, userId);

    if (!resolvedMode) {
      return res.status(500).json({
        status: 'error',
        user_id: userId,
        mode: null,
        message: 'Unable to determine mode from CLI output',
        error_log: '/exports/errors.log',
      });
    }

    const basePath = `/exports/${userId}.${resolvedMode}`;
    return res.json({
      status: 'ok',
      user_id: userId,
      mode: resolvedMode,
      files: [`${basePath}.json`, `${basePath}.jsonl`, `${basePath}.csv`],
    });
  } catch (error) {
    next(error);
  }
});

export default router;

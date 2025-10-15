import { Router } from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const router = Router();

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(currentDir, '../../../..');
const SCRIPT_PATH = path.resolve(REPO_ROOT, 'scripts/generateTasks.ts');

const ALLOWED_MODES = new Set(['low', 'chill', 'flow', 'evolve']);

type ErrorWithCode = {
  code?: string | number;
};

function hasErrorCode(value: unknown): value is ErrorWithCode {
  return typeof value === 'object' && value !== null && 'code' in value;
}

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
  spawnErrorCode?: string;
};

function runCliCommand(command: string, args: string[]): Promise<GenerateTasksCliResult> {
  return new Promise<GenerateTasksCliResult>((resolve) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
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
      const errorCode =
        hasErrorCode(error) && error.code !== undefined ? String(error.code) : undefined;

      if (settled) {
        return;
      }
      settled = true;

      resolve({
        code: null,
        stdout: stdoutChunks.join(''),
        stderr: stderrChunks.join(''),
        spawnError: `Failed to launch task generation CLI: ${sanitisedMessage}`,
        spawnErrorCode: errorCode,
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

function normaliseSpawnError(message?: string): string | undefined {
  if (!message) {
    return undefined;
  }
  return message.replace(/^Failed to launch task generation CLI:\s*/u, '').trim();
}

function createScriptArgs(userId: string, mode?: string): string[] {
  const args = [SCRIPT_PATH, '--user', userId];
  if (mode) {
    args.push('--mode', mode);
  }
  return args;
}

function getNpmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

async function runGenerateTasksCli(userId: string, mode?: string): Promise<GenerateTasksCliResult> {
  const scriptArgs = createScriptArgs(userId, mode);
  const pnpmResult = await runCliCommand('pnpm', ['ts-node', ...scriptArgs]);

  if (pnpmResult.spawnError && pnpmResult.spawnErrorCode === 'ENOENT') {
    const npmResult = await runCliCommand(getNpmCommand(), ['exec', '--', 'ts-node', ...scriptArgs]);

    if (npmResult.spawnError) {
      const combinedMessage = [
        normaliseSpawnError(pnpmResult.spawnError),
        normaliseSpawnError(npmResult.spawnError),
      ]
        .filter(Boolean)
        .join('; ');

      return {
        ...npmResult,
        spawnError: combinedMessage
          ? `Failed to launch task generation CLI: ${combinedMessage}`
          : npmResult.spawnError,
      };
    }

    return npmResult;
  }

  return pnpmResult;
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

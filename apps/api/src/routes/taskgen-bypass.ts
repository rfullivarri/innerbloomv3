import { Router } from 'express';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const router = Router();

const currentDir = path.dirname(fileURLToPath(import.meta.url));

type CliContext = {
  repoRoot: string;
  scriptPath: string;
};

const SCRIPT_RELATIVE_PATHS = ['scripts/generateTasks.ts', 'apps/api/scripts/generateTasks.ts'];

function findCliContext(startDir: string, visited: Set<string>): CliContext | undefined {
  let cursor = path.resolve(startDir);

  while (!visited.has(cursor)) {
    visited.add(cursor);

    for (const relative of SCRIPT_RELATIVE_PATHS) {
      const candidate = path.resolve(cursor, relative);
      if (existsSync(candidate)) {
        return { repoRoot: cursor, scriptPath: candidate };
      }
    }

    const parent = path.dirname(cursor);
    if (parent === cursor) {
      break;
    }
    cursor = parent;
  }

  return undefined;
}

function resolveCliContext(): CliContext {
  const visited = new Set<string>();
  const searchStarts = [currentDir, process.cwd()];

  for (const start of searchStarts) {
    const context = findCliContext(start, visited);
    if (context) {
      return context;
    }
  }

  throw new Error(
    'Task generation CLI script not found. Ensure scripts/generateTasks.ts is available in the deployed bundle.',
  );
}

let cachedCliContext: CliContext | undefined;

function getCliContext(): CliContext {
  if (!cachedCliContext) {
    cachedCliContext = resolveCliContext();
  }
  return cachedCliContext;
}

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

function runCliCommand(command: string, args: string[], repoRoot: string): Promise<GenerateTasksCliResult> {
  return new Promise<GenerateTasksCliResult>((resolve) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
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

function createScriptArgs(scriptPath: string, userId: string, mode?: string): string[] {
  const args = [scriptPath, '--user', userId];
  if (mode) {
    args.push('--mode', mode);
  }
  return args;
}

function getNpmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

async function runGenerateTasksCli(
  context: CliContext,
  userId: string,
  mode?: string,
): Promise<GenerateTasksCliResult> {
  const scriptArgs = createScriptArgs(context.scriptPath, userId, mode);
  const pnpmResult = await runCliCommand('pnpm', ['ts-node', ...scriptArgs], context.repoRoot);

  if (pnpmResult.spawnError && pnpmResult.spawnErrorCode === 'ENOENT') {
    const npmResult = await runCliCommand(
      getNpmCommand(),
      ['exec', '--', 'ts-node', ...scriptArgs],
      context.repoRoot,
    );

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

    let cliContext: CliContext;
    try {
      cliContext = getCliContext();
    } catch (contextError) {
      const errorMessage =
        contextError instanceof Error ? contextError.message : 'Task generation CLI unavailable';
      return res.status(500).json({
        status: 'error',
        user_id: userId,
        mode: requestedMode ?? null,
        message: errorMessage,
        error_log: '/exports/errors.log',
      });
    }

    const { code, stdout, stderr, spawnError } = await runGenerateTasksCli(
      cliContext,
      userId,
      requestedMode,
    );

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

export const __test = {
  getCliContext,
  resetCliContextCache: () => {
    cachedCliContext = undefined;
  },
};

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const DEFAULT_PORT = '4173';
const DEFAULT_HOST = '0.0.0.0';

const port = process.env.PORT && process.env.PORT.trim() !== '' ? process.env.PORT : DEFAULT_PORT;
const host = process.env.HOST && process.env.HOST.trim() !== '' ? process.env.HOST : DEFAULT_HOST;

const filename = fileURLToPath(import.meta.url);
const scriptDir = dirname(filename);
const packageDir = join(scriptDir, '..');
const workspaceRoot = join(packageDir, '..', '..');

const require = createRequire(import.meta.url);

const resolveViteBinary = () => {
  const candidatePaths = [
    // Workspace local install (e.g. pnpm filtered install)
    join(packageDir, 'node_modules', 'vite', 'bin', 'vite.js'),
    // Root workspace install (most common in monorepos)
    join(workspaceRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
  ];

  for (const path of candidatePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  try {
    return require.resolve('vite/bin/vite.js');
  } catch {
    console.error('Unable to locate the Vite binary. Did you install dependencies?');
    process.exit(1);
  }
};

const viteBin = resolveViteBinary();

const preview = spawn(process.execPath, [viteBin, 'preview', '--host', host, '--port', port], {
  stdio: 'inherit',
  env: process.env,
});

preview.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

preview.on('error', (error) => {
  console.error('Failed to start Vite preview server', error);
  process.exit(1);
});

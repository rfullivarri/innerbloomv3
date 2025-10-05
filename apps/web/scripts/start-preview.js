import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DEFAULT_PORT = '4173';
const DEFAULT_HOST = '0.0.0.0';

const port = process.env.PORT && process.env.PORT.trim() !== '' ? process.env.PORT : DEFAULT_PORT;
const host = process.env.HOST && process.env.HOST.trim() !== '' ? process.env.HOST : DEFAULT_HOST;

const filename = fileURLToPath(import.meta.url);
const viteBin = join(dirname(filename), '..', 'node_modules', 'vite', 'bin', 'vite.js');

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

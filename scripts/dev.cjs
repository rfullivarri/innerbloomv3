const { spawn } = require('node:child_process');

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('Unable to determine npm executable path.');
  process.exit(1);
}

const workspaces = ['apps/api', 'apps/web'];
const children = [];
let exiting = false;

function shutdown(code = 0) {
  if (exiting) return;
  exiting = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  process.exitCode = code;
}

for (const workspace of workspaces) {
  const child = spawn(process.execPath, [npmCli, '--workspace', workspace, 'run', 'dev'], {
    stdio: 'inherit'
  });

  child.on('exit', (code, signal) => {
    if (!exiting) {
      const exitCode = code ?? (signal ? 1 : 0);
      shutdown(exitCode);
    }
  });

  child.on('error', (error) => {
    console.error(`Failed to start dev server for ${workspace}:`, error);
    shutdown(1);
  });

  children.push(child);
}

const handleSignal = () => shutdown(process.exitCode ?? 0);
process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);

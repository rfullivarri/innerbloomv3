import 'dotenv/config';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';
import { dbReady } from './db/client.js';

export const app = createApp();

const preferredPorts = [process.env.PORT, '3000', '8080'];
const port = Number(
  preferredPorts.find((value) => {
    if (!value) {
      return false;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0;
  }) ?? 3000,
);

async function start() {
  try {
    await dbReady;
    app.listen(port, () => {
      console.log(`API listening on port ${port}`);
    });
  } catch (error) {
    console.error('Unable to start server because the database is sad', error);
    process.exit(1);
  }
}

const executedDirectly = (() => {
  if (!process.argv[1]) {
    return false;
  }

  return import.meta.url === pathToFileURL(process.argv[1]).href;
})();

if (executedDirectly) {
  void start();
}

export { start };

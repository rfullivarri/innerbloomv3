import 'dotenv/config';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import Fastify from 'fastify';
import fastifyExpress from '@fastify/express';
import fastifyRawBody from 'fastify-raw-body';
import app from './app.js';
import { dbReady, pool } from './db.js';
import clerkWebhookRoutes from './routes/webhooks/clerk.js';
import usersMeRoutes from './routes/users.me.js';

const fastify = Fastify({
  logger: true,
});

const configureServer = (async () => {
  await fastify.register(fastifyRawBody, {
    field: 'rawBody',
    global: true,
    encoding: 'utf8',
    runFirst: true,
  });

  await fastify.register(fastifyExpress);
  fastify.use(app);

  fastify.get('/healthz', async () => ({ ok: true }));

  await fastify.register(clerkWebhookRoutes);
  await fastify.register(usersMeRoutes);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
})();

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = '0.0.0.0';

async function start(): Promise<void> {
  try {
    await configureServer;
    await dbReady;
    await fastify.listen({ port, host });
    fastify.log.info(`API listening on http://${host}:${port}`);
  } catch (error) {
    fastify.log.error({ err: error }, 'Unable to start server');
    process.exit(1);
  }
}

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  fastify.log.info({ signal }, 'Received shutdown signal');

  try {
    await fastify.close();
    fastify.log.info('Server closed gracefully');
  } catch (error) {
    fastify.log.error({ err: error }, 'Error during server shutdown');
    process.exitCode = 1;
  }
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

const executedDirectly = (() => {
  if (!process.argv[1]) {
    return false;
  }

  return import.meta.url === pathToFileURL(process.argv[1]).href;
})();

if (executedDirectly) {
  void start();
}

export { start, fastify, app };

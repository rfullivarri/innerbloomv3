import 'dotenv/config';
import process from 'node:process';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import apiRouter from './routes/api.js';
import clerkWebhookRouter from './routes/webhooks/clerk.js';
import { pool } from './db/pool.js';
import { HttpError, isHttpError } from './lib/http-error.js';

const app = express();

app.use(cors());

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/webhooks', clerkWebhookRouter);

app.use(express.json());

app.use('/api', apiRouter);

app.use((_req, _res, next) => {
  next(new HttpError(404, 'Not found'));
});

function isPostgresError(error: unknown): error is { code?: string; detail?: string } {
  return Boolean(error && typeof error === 'object' && 'code' in error);
}

app.use(
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  async (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (isHttpError(error)) {
      res.status(error.status).json({
        error: {
          message: error.message,
          details: error.details ?? null,
        },
      });
      return;
    }

    if (isPostgresError(error)) {
      if (error.code === '23505') {
        res.status(409).json({
          error: {
            message: 'Duplicate record',
            details: error.detail ?? null,
          },
        });
        return;
      }

      if (error.code === '23503') {
        res.status(400).json({
          error: {
            message: 'Related record not found',
            details: error.detail ?? null,
          },
        });
        return;
      }

      if (error.code === '22P02') {
        res.status(400).json({
          error: {
            message: 'Invalid input syntax',
            details: error.detail ?? null,
          },
        });
        return;
      }
    }

    console.error('Unexpected error', error);

    res.status(500).json({
      error: {
        message: 'Something went wrong',
      },
    });
  },
);

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = '0.0.0.0';

const server = app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  console.log(`Received ${signal}, closing server...`);
  server.close(() => {
    void pool.end();
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;

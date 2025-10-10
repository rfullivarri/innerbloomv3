import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import cors, { type CorsOptions } from 'cors';
import express, { type NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import routes from './routes/index.js';
import createDebugAuthRouter from './routes/debug-auth.js';
import { HttpError, isHttpError } from './lib/http-error.js';
import clerkWebhookRouter from './webhooks/clerk.js';

const defaultAllowedOrigins = [
  'https://web-dev-dfa2.up.railway.app',
  'https://web-production-734a.up.railway.app',
  'http://localhost:5173',
];

const envAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envAllowedOrigins]));

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    callback(null, allowedOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

const app = express();

const snapshotFilePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../db-snapshot.json'
);

if (process.env.DEBUG_AUTH === 'true') {
  app.use(createDebugAuthRouter());
}

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(clerkWebhookRouter);
app.use(express.json());

app.get('/_debug/db', (_req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  readFile(snapshotFilePath, 'utf-8')
    .then((fileContents) => {
      res.setHeader('Cache-Control', 'no-store');
      res.json(JSON.parse(fileContents));
    })
    .catch((error: unknown) => {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError?.code === 'ENOENT') {
        res.status(404).json({ message: 'Snapshot not found' });
        return;
      }

      next(error);
    });
});

const apiRouter = express.Router();

apiRouter.use(routes);

apiRouter.use((_req, _res, next) => {
  next(new HttpError(404, 'not_found', 'Route not found'));
});

app.use('/api', apiRouter);
app.use(apiRouter);

app.use((_req, _res, next) => {
  next(new HttpError(404, 'not_found', 'Route not found'));
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  void _next;
  if (isHttpError(error)) {
    if (error.details) {
      console.error('Request failed', { code: error.code, details: error.details });
    }

    const payload: Record<string, unknown> = {
      code: error.code,
      message: error.message,
    };

    if (typeof error.details !== 'undefined') {
      payload.details = error.details;
    }

    return res.status(error.status).json(payload);
  }

  if (error instanceof z.ZodError) {
    const details = error.flatten();
    const [firstIssue] = error.issues;
    const message = firstIssue?.message ?? 'Invalid request parameters';
    const httpError = new HttpError(400, 'invalid_request', message, details);

    console.error('Request failed', { code: httpError.code, details });

    return res.status(httpError.status).json({
      code: httpError.code,
      message: httpError.message,
      details: httpError.details,
    });
  }

  console.error('Unexpected error', error);

  return res.status(500).json({
    code: 'internal_error',
    message: 'Something went wrong',
  });
});

export default app;

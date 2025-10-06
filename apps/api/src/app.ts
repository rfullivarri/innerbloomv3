import process from 'node:process';
import cors, { type CorsOptions } from 'cors';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import routes from './routes/index.js';
import { HttpError, isHttpError } from './lib/http-error.js';

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

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(routes);

app.use((_req, _res, next) => {
  next(new HttpError(404, 'not_found', 'Route not found'));
});

app.use((error: unknown, _req: Request, res: Response) => {
  if (isHttpError(error)) {
    if (error.details) {
      console.error('Request failed', { code: error.code, details: error.details });
    }

    return res.status(error.status).json({
      code: error.code,
      message: error.message,
    });
  }

  if (error instanceof z.ZodError) {
    const [firstIssue] = error.issues;
    const message = firstIssue?.message ?? 'Invalid request parameters';

    return res.status(400).json({
      code: 'validation_error',
      message,
    });
  }

  console.error('Unexpected error', error);

  return res.status(500).json({
    code: 'internal_error',
    message: 'Something went wrong',
  });
});

export default app;

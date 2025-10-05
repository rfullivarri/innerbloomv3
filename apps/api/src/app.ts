import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import routes from './routes/index.js';
import { HttpError, isHttpError } from './lib/http-error.js';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.use(routes);

app.use((_req, _res, next) => {
  next(new HttpError(404, 'Route not found'));
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (isHttpError(error)) {
    return res.status(error.status).json({
      error: {
        message: error.message,
        details: error.details,
      },
    });
  }

  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: error.flatten(),
      },
    });
  }

  console.error('Unexpected error', error);

  return res.status(500).json({
    error: {
      message: 'Something went wrong',
    },
  });
});

export default app;

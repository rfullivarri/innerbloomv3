import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';
import { uuidSchema } from '../lib/validation.js';

export function ownUserGuard(req: Request, _res: Response, next: NextFunction): void {
  const user = req.user;

  if (!user) {
    next(new HttpError(401, 'unauthorized', 'Authentication required'));
    return;
  }

  const parsedId = uuidSchema.safeParse(req.params.id);

  if (!parsedId.success) {
    next();
    return;
  }

  if (parsedId.data !== user.id) {
    next(new HttpError(403, 'forbidden', 'You do not have access to this resource'));
    return;
  }

  next();
}

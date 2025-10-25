import type { VerifiedUser } from '../../services/auth-service';

declare global {
  namespace Express {
    interface Request {
      user?: VerifiedUser;
    }
  }
}

export {};

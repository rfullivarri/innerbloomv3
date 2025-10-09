import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyOptions } from 'jose';
import { pool } from '../db.js';
import { HttpError } from '../lib/http-error.js';

type JwtVerifyFunction = (
  token: string,
  key: ReturnType<typeof createRemoteJWKSet>,
  options: JWTVerifyOptions,
) => Promise<{ payload: JWTPayload }>;

export interface AuthServiceConfig {
  issuer: string;
  audience: string;
  jwksUrl: string;
}

type UserRow = {
  user_id: string;
  clerk_user_id: string;
  email_primary: string | null;
};

export interface AuthRepository {
  findByClerkId(clerkId: string): Promise<UserRow | null>;
  create(clerkId: string, email: string | null): Promise<UserRow | null>;
}

export interface VerifiedUser {
  id: string;
  clerkId: string;
  email: string | null;
  isNew: boolean;
}

export interface AuthService {
  verifyToken(authHeader?: string | null): Promise<VerifiedUser>;
}

export interface AuthServiceDeps {
  repository: AuthRepository;
  jwks: ReturnType<typeof createRemoteJWKSet>;
  jwtVerifyFn: JwtVerifyFunction;
}

const SELECT_USER_SQL =
  'SELECT user_id, clerk_user_id, email_primary FROM users WHERE clerk_user_id = $1 LIMIT 1';

const INSERT_USER_SQL =
  'INSERT INTO users (clerk_user_id, email_primary) VALUES ($1, $2) ON CONFLICT (clerk_user_id) DO NOTHING RETURNING user_id, clerk_user_id, email_primary';

export function createAuthRepository(): AuthRepository {
  return {
    async findByClerkId(clerkId) {
      const result = await pool.query<UserRow>(SELECT_USER_SQL, [clerkId]);
      return result.rows[0] ?? null;
    },
    async create(clerkId, email) {
      const result = await pool.query<UserRow>(INSERT_USER_SQL, [clerkId, email]);
      return result.rows[0] ?? null;
    },
  };
}

type NormalizedToken = {
  header: string;
  token: string;
};

function normalizeToken(input?: string | null): NormalizedToken | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const bearerMatch = trimmed.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) {
    const token = bearerMatch[1]?.trim();
    if (!token) {
      return null;
    }
    return { header: `Bearer ${token}`, token };
  }

  if (/\s/.test(trimmed)) {
    return null;
  }

  return { header: `Bearer ${trimmed}`, token: trimmed };
}

function resolveEmail(payload: JWTPayload): string | null {
  if (typeof payload.email === 'string' && payload.email.length > 0) {
    return payload.email;
  }

  if (typeof payload.clerkEmail === 'string' && payload.clerkEmail.length > 0) {
    return payload.clerkEmail;
  }

  return null;
}

export function createAuthService(
  config: AuthServiceConfig,
  deps?: Partial<AuthServiceDeps>,
): AuthService {
  const repository = deps?.repository ?? createAuthRepository();
  const jwtVerifyFn: JwtVerifyFunction = deps?.jwtVerifyFn ?? jwtVerify;

  const jwks = deps?.jwks ?? createRemoteJWKSet(new URL(config.jwksUrl));

  return {
    async verifyToken(authHeader) {
      const normalized = normalizeToken(authHeader);
      if (!normalized) {
        throw new HttpError(401, 'unauthorized', 'Authentication required');
      }

      let payload: JWTPayload;

      try {
        const result = await jwtVerifyFn(normalized.token, jwks, {
          issuer: config.issuer,
          audience: config.audience,
        });
        payload = result.payload;
      } catch (error) {
        console.warn('[auth] verify failed', {
          hasToken: Boolean(authHeader),
          beginsWithBearer: authHeader?.startsWith('Bearer ') ?? null,
          issuer: process.env.CLERK_JWT_ISSUER,
          audience: process.env.CLERK_JWT_AUDIENCE,
        });
        throw new HttpError(401, 'unauthorized', 'Invalid authentication token', {
          cause: error,
        });
      }

      const clerkId = typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
      if (!clerkId) {
        throw new HttpError(401, 'unauthorized', 'Token is missing the subject claim');
      }

      const email = resolveEmail(payload);

      let user = await repository.findByClerkId(clerkId);
      let isNew = false;

      if (!user) {
        const created = await repository.create(clerkId, email);
        if (created) {
          user = created;
          isNew = true;
        } else {
          user = await repository.findByClerkId(clerkId);
        }
      }

      if (!user) {
        throw new HttpError(500, 'user_resolution_failed', 'Failed to resolve user from token');
      }

      const resolvedEmail = user.email_primary ?? email;

      return {
        id: user.user_id,
        clerkId,
        email: resolvedEmail,
        isNew,
      };
    },
  };
}

let cachedService: AuthService | null = null;

function requireConfigValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAuthService(): AuthService {
  if (cachedService) {
    return cachedService;
  }

  const issuer = requireConfigValue('CLERK_JWT_ISSUER');
  const audience = requireConfigValue('CLERK_JWT_AUDIENCE');
  const jwksUrl = process.env.CLERK_JWKS_URL ?? `${issuer.replace(/\/$/, '')}/.well-known/jwks.json`;

  cachedService = createAuthService({ issuer, audience, jwksUrl });
  return cachedService;
}

export function resetAuthServiceCache(): void {
  cachedService = null;
}

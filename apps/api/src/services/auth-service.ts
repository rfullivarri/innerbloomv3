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
  audience?: string | string[] | null;
  jwksUrl: string;
  allowedAzp?: string | null;
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

  const normalizedAudience = normalizeAudience(config.audience);
  const allowedAzp = typeof config.allowedAzp === 'string' && config.allowedAzp.trim().length > 0
    ? config.allowedAzp.trim()
    : undefined;

  return {
    async verifyToken(authHeader) {
      const normalized = normalizeToken(authHeader);
      if (!normalized) {
        throw new HttpError(401, 'unauthorized', 'Authentication required');
      }

      let payload: JWTPayload;

      try {
        const verifyOptions: JWTVerifyOptions = {
          issuer: config.issuer,
        };

        if (normalizedAudience) {
          verifyOptions.audience = normalizedAudience;
        }

        const result = await jwtVerifyFn(normalized.token, jwks, verifyOptions);
        payload = result.payload;
      } catch (error) {
        console.warn('[auth] verify failed', {
          hasToken: Boolean(authHeader),
          beginsWithBearer: authHeader?.startsWith('Bearer ') ?? null,
          issuer: process.env.CLERK_JWT_ISSUER,
          audience: process.env.CLERK_JWT_AUDIENCE,
          allowedAzp: process.env.CLERK_ALLOWED_AZP,
        });
        throw new HttpError(401, 'unauthorized', 'Invalid authentication token', {
          cause: error,
        });
      }

      validateAuthorizedParty(payload, {
        audience: normalizedAudience,
        allowedAzp,
      });

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

type NormalizeAudienceInput = string | string[] | null | undefined;

function normalizeAudience(input: NormalizeAudienceInput): string | string[] | undefined {
  if (Array.isArray(input)) {
    return input.length > 0 ? input : undefined;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
}

interface AuthorizedPartyValidationOptions {
  audience?: string | string[];
  allowedAzp?: string;
}

function hasAudienceClaim(aud: JWTPayload['aud']): boolean {
  if (typeof aud === 'string') {
    return aud.trim().length > 0;
  }

  if (Array.isArray(aud)) {
    return aud.length > 0;
  }

  return false;
}

function validateAuthorizedParty(
  payload: JWTPayload,
  options: AuthorizedPartyValidationOptions,
): void {
  if (options.audience) {
    // Audience validation handled by jose when provided.
    return;
  }

  const allowedAzp = options.allowedAzp;
  if (!allowedAzp) {
    return;
  }

  if (hasAudienceClaim(payload.aud)) {
    return;
  }

  const azpClaim = payload.azp;
  if (typeof azpClaim !== 'string' || azpClaim.trim().length === 0 || azpClaim !== allowedAzp) {
    throw new HttpError(401, 'unauthorized', 'Invalid authentication token');
  }
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
  const rawAudience = process.env.CLERK_JWT_AUDIENCE;
  const audience = typeof rawAudience === 'string' && rawAudience.trim().length > 0 ? rawAudience : undefined;
  const jwksUrl = process.env.CLERK_JWKS_URL ?? `${issuer.replace(/\/$/, '')}/.well-known/jwks.json`;
  const allowedAzp = typeof process.env.CLERK_ALLOWED_AZP === 'string' && process.env.CLERK_ALLOWED_AZP.trim().length > 0
    ? process.env.CLERK_ALLOWED_AZP
    : undefined;

  cachedService = createAuthService({ issuer, audience, jwksUrl, allowedAzp });
  return cachedService;
}

export function resetAuthServiceCache(): void {
  cachedService = null;
}

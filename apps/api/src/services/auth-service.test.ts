import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAuthRepository,
  createAuthService,
  getAuthService,
  type AuthRepository,
  type AuthService,
  resetAuthServiceCache,
} from './auth-service.js';

const { mockPoolQuery } = vi.hoisted(() => ({
  mockPoolQuery: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: {
    query: mockPoolQuery,
  },
}));

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://test:test@localhost:5432/test';

describe('createAuthService', () => {
  const baseConfig = {
    issuer: 'https://clerk.example.com',
    audience: 'api.example.com',
    jwksUrl: 'https://clerk.example.com/.well-known/jwks.json',
  };

  const jwksStub = {} as never;

  let repository: AuthRepository;
  let jwtVerifyFn: vi.Mock;
  let service: AuthService;

  beforeEach(() => {
    mockPoolQuery.mockReset();
    repository = {
      findByClerkId: vi.fn(),
      create: vi.fn(),
    };

    jwtVerifyFn = vi.fn();
    service = createAuthService(baseConfig, {
      repository,
      jwtVerifyFn: jwtVerifyFn as never,
      jwks: jwksStub,
    });
  });

  it('returns existing users without creating duplicates when the JWT is valid', async () => {
    (repository.findByClerkId as vi.Mock).mockResolvedValue({
      user_id: 'user-123',
      clerk_user_id: 'clerk-abc',
      email_primary: 'user@example.com',
    });

    jwtVerifyFn.mockResolvedValue({
      payload: {
        sub: 'clerk-abc',
        email: 'user@example.com',
      },
    });

    const result = await service.verifyToken('Bearer valid.jwt.token');

    expect(jwtVerifyFn).toHaveBeenCalledWith('valid.jwt.token', jwksStub, {
      issuer: baseConfig.issuer,
      audience: baseConfig.audience,
    });
    expect(repository.findByClerkId).toHaveBeenCalledWith('clerk-abc');
    expect(repository.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'user-123',
      clerkId: 'clerk-abc',
      email: 'user@example.com',
      isNew: false,
    });
  });

  it('creates the user on first login and flags the record as new', async () => {
    (repository.findByClerkId as vi.Mock).mockResolvedValueOnce(null);

    (repository.create as vi.Mock).mockResolvedValue({
      user_id: 'user-234',
      clerk_user_id: 'clerk-xyz',
      email_primary: 'fallback@example.com',
    });

    jwtVerifyFn.mockResolvedValue({
      payload: {
        sub: 'clerk-xyz',
        clerkEmail: 'fallback@example.com',
      },
    });

    const result = await service.verifyToken('Bearer another.jwt');

    expect(repository.findByClerkId).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith('clerk-xyz', 'fallback@example.com');
    expect(result).toEqual({
      id: 'user-234',
      clerkId: 'clerk-xyz',
      email: 'fallback@example.com',
      isNew: true,
    });
  });

  it('accepts raw JWT tokens and normalizes them internally', async () => {
    (repository.findByClerkId as vi.Mock).mockResolvedValue({
      user_id: 'user-345',
      clerk_user_id: 'clerk-raw',
      email_primary: 'raw@example.com',
    });

    jwtVerifyFn.mockResolvedValue({
      payload: {
        sub: 'clerk-raw',
        email: 'raw@example.com',
      },
    });

    const result = await service.verifyToken('raw.jwt.token');

    expect(jwtVerifyFn).toHaveBeenCalledWith('raw.jwt.token', jwksStub, {
      issuer: baseConfig.issuer,
      audience: baseConfig.audience,
    });
    expect(result).toEqual({
      id: 'user-345',
      clerkId: 'clerk-raw',
      email: 'raw@example.com',
      isNew: false,
    });
  });

  it('falls back to reloading the user if creation returns null', async () => {
    (repository.findByClerkId as vi.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        user_id: 'user-999',
        clerk_user_id: 'clerk-999',
        email_primary: 'db@example.com',
      });

    (repository.create as vi.Mock).mockResolvedValue(null);

    jwtVerifyFn.mockResolvedValue({
      payload: {
        sub: 'clerk-999',
        email: null,
      },
    });

    const result = await service.verifyToken('Bearer fallback.jwt');

    expect(repository.create).toHaveBeenCalled();
    expect(repository.findByClerkId).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      id: 'user-999',
      clerkId: 'clerk-999',
      email: 'db@example.com',
      isNew: false,
    });
  });

  it('throws when the Authorization header is missing or malformed', async () => {
    await expect(service.verifyToken(undefined)).rejects.toMatchObject({
      status: 401,
      code: 'unauthorized',
      message: 'Authentication required',
    });

    await expect(service.verifyToken('Basic something')).rejects.toMatchObject({
      status: 401,
      code: 'unauthorized',
      message: 'Authentication required',
    });

    expect(repository.findByClerkId).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('throws when the token is missing the subject claim', async () => {
    jwtVerifyFn.mockResolvedValue({ payload: { sub: '' } });

    await expect(service.verifyToken('Bearer token.without.sub')).rejects.toMatchObject({
      status: 401,
      code: 'unauthorized',
      message: 'Token is missing the subject claim',
    });
  });

  it.each([
    ['issuer', new Error('JWT issuer invalid')],
    ['audience', new Error('JWT audience invalid')],
    ['expiration', new Error('JWT expired')],
  ])('wraps %s validation errors coming from jose', async (_label, underlyingError) => {
    jwtVerifyFn.mockRejectedValue(underlyingError);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(service.verifyToken('Bearer bad.jwt.token')).rejects.toMatchObject({
      status: 401,
      code: 'unauthorized',
      message: 'Invalid authentication token',
      details: { cause: underlyingError },
    });

    expect(warnSpy).toHaveBeenCalledWith('[auth] verify failed', {
      hasToken: true,
      beginsWithBearer: true,
      issuer: process.env.CLERK_JWT_ISSUER,
      audience: process.env.CLERK_JWT_AUDIENCE,
    });
    expect(repository.findByClerkId).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

describe('resetAuthServiceCache', () => {
  it('clears the cached singleton so a new instance is created', () => {
    resetAuthServiceCache();
    expect(() => resetAuthServiceCache()).not.toThrow();
  });
});

describe('createAuthRepository', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
  });

  it('reads users by clerk id and normalizes results', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        { user_id: 'user-10', clerk_user_id: 'clerk-10', email_primary: 'user@example.com' },
      ],
    });

    const repository = createAuthRepository();
    const result = await repository.findByClerkId('clerk-10');

    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM users WHERE clerk_user_id = $1'),
      ['clerk-10'],
    );
    expect(result).toEqual({
      user_id: 'user-10',
      clerk_user_id: 'clerk-10',
      email_primary: 'user@example.com',
    });
  });

  it('creates users when missing', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        { user_id: 'user-99', clerk_user_id: 'clerk-99', email_primary: null },
      ],
    });

    const repository = createAuthRepository();
    const created = await repository.create('clerk-99', null);

    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      ['clerk-99', null],
    );
    expect(created).toEqual({
      user_id: 'user-99',
      clerk_user_id: 'clerk-99',
      email_primary: null,
    });
  });
});

describe('getAuthService', () => {
  it('builds the singleton from environment variables and caches it', () => {
    resetAuthServiceCache();
    process.env.CLERK_JWT_ISSUER = 'https://issuer.test';
    process.env.CLERK_JWT_AUDIENCE = 'api-test';
    delete process.env.CLERK_JWKS_URL;

    const first = getAuthService();
    const second = getAuthService();

    expect(first).toBe(second);
  });
});

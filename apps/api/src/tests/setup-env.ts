import { vi } from 'vitest';

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://test:test@localhost:5432/test';
process.env.CLERK_JWT_ISSUER = process.env.CLERK_JWT_ISSUER ?? 'https://example.com';
process.env.CLERK_JWT_AUDIENCE = process.env.CLERK_JWT_AUDIENCE ?? 'api.example.com';

vi.mock('pg', () => {
  class MockPool {
    constructor(..._args: unknown[]) {}
    query = vi.fn(async () => ({ rows: [] }));
    connect = vi.fn(async () => ({ query: this.query, release: vi.fn() }));
    end = vi.fn(async () => {});
    on = vi.fn();
  }

  return { Pool: MockPool };
});

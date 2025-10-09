# Innerbloom API

## Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string used by the API and scripts. SSL is automatically enabled when `sslmode=require` is present. |
| `CLERK_WEBHOOK_SECRET` | ✅ | Svix signing secret provided by Clerk for the `user.*` webhook. |
| `CLERK_JWT_ISSUER` | ✅ | Base URL for Clerk-issued JWTs (e.g. `https://clerk.example.com`). Used to validate the `iss` claim. |
| `CLERK_JWT_AUDIENCE` | ✅ | Expected audience value for Clerk session tokens. |
| `CLERK_JWKS_URL` | ➖ | Optional override for the JWKS endpoint. Defaults to `<CLERK_JWT_ISSUER>/.well-known/jwks.json`. |
| `CLERK_API_KEY` | ➖ | Clerk Backend API key. Required only for the backfill script. |
| `PORT` | ➖ | Port for the Fastify server (defaults to `3000`). |
| `CORS_ALLOWED_ORIGINS` | ➖ | Comma-separated list of additional origins allowed to call the API. |

## Database migrations

Run the idempotent SQL bundle locally (requires `DATABASE_URL`):

```bash
npm run db:apply
```

## Development server

Start the API locally:

```bash
npm run dev
```

The server exposes `GET /healthz` for health checks and mounts the existing Express routes alongside the new Fastify handlers.

## Clerk integration

### Authentication

The API verifies Clerk session tokens on protected routes using a reusable `authMiddleware`. Configuration is read from the environment variables listed above. At minimum you must provide:

1. `CLERK_JWT_ISSUER` – the exact issuer URL configured in Clerk.
2. `CLERK_JWT_AUDIENCE` – the audience value embedded in Clerk's JWTs.

You can optionally set `CLERK_JWKS_URL` when Clerk hosts JWKS on a custom domain; otherwise the middleware infers `/.well-known/jwks.json` from the issuer.

When a request includes a valid `Authorization: Bearer <token>` header the middleware:

* Validates the signature, issuer, audience, and expiration (`exp`) using Clerk's JWKS.
* Resolves the `sub` claim to the internal `users.user_id` via `clerk_user_id`, creating the row when needed.
* Injects `req.user = { id, clerkId, email, isNew }` for downstream handlers.

Common error responses:

* `401 unauthorized` – missing `Authorization` header, malformed bearer token, invalid signature, wrong issuer/audience, or expired token.
* `500 user_resolution_failed` – the token was valid but the internal user record could not be created or fetched.

Example usage inside an Express route module:

```ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { ownUserGuard } from '../middlewares/own-user-guard.js';

const router = Router();

router.get('/users/me', authMiddleware, (req, res) => {
  const currentUser = req.user; // { id, clerkId, email, isNew }
  res.json({ userId: currentUser?.id });
});

router.get('/users/:id/xp/total', authMiddleware, ownUserGuard, (req, res) => {
  // This handler will only run when the authenticated user owns :id.
  res.json({ userId: req.params.id });
});

export default router;
```

#### Per-user authorization guard

Sensitive analytics routes under `/users/:id/...` require both a valid Clerk
token and ownership of the requested ID. Mount `ownUserGuard` after the
authentication middleware to compare `req.params.id` against the verified
`req.user.id`.

Guarded endpoints:

* `GET /users/:id/tasks`
* `GET /users/:id/xp/daily`
* `GET /users/:id/xp/total`
* `GET /users/:id/xp/by-trait`
* `GET /users/:id/pillars`
* `GET /users/:id/streaks/panel`
* `GET /users/:id/level`
* `GET /users/:id/achievements`
* `GET /users/:id/daily-energy`
* `GET /users/:id/journey`
* `GET /users/:id/emotions`
* `GET /users/:id/state`
* `GET /users/:id/state/timeseries`
* `GET /users/:id/summary/today`

### Webhook

* Endpoint: `POST /api/webhooks/clerk`
* Headers: `svix-id`, `svix-timestamp`, `svix-signature`
* Signature verification: performed with the official Svix verifier using `CLERK_WEBHOOK_SECRET`
* Supported events: `user.created`, `user.updated`, `user.deleted`

A valid request upserts the mirrored user record in Postgres (or soft-deletes on `user.deleted`). The handler responds with HTTP `204` on success and `400/422` for invalid requests.

### Backfill

Populate or refresh the mirrored users using the Clerk Backend API:

```bash
npm run backfill:users
```

This script paginates Clerk users, performs upserts, and logs totals for inserted vs. updated rows.

# Innerbloom API

## Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string used by the API and scripts. SSL is automatically enabled when `sslmode=require` is present. |
| `ADMIN_USER_ID` | ➖ | Comma separated list of user identifiers (internal `user_id`, Clerk id or email) that should be treated as admins without touching the database. Useful for local bootstrapping. |
| `CLERK_WEBHOOK_SECRET` | ✅ | Svix signing secret provided by Clerk for the `user.*` webhook. |
| `CLERK_JWT_ISSUER` | ✅ | Base URL for Clerk-issued JWTs (e.g. `https://clerk.example.com`). Used to validate the `iss` claim. |
| `CLERK_JWT_AUDIENCE` | ✅ | Expected audience value for Clerk session tokens. |
| `CLERK_JWKS_URL` | ➖ | Optional override for the JWKS endpoint. Defaults to `<CLERK_JWT_ISSUER>/.well-known/jwks.json`. |
| `CLERK_API_KEY` | ➖ | Clerk Backend API key. Required only for the backfill script. |
| `PORT` | ➖ | Port for the Fastify server (defaults to `3000`). |
| `CORS_ALLOWED_ORIGINS` | ➖ | Comma-separated list of additional origins allowed to call the API. |
| `ALLOW_X_USER_ID_DEV` | ➖ | Enables the deprecated `X-User-Id` header for `/users/me` when running locally (defaults to `false`). The flag has no effect in production and will be removed on 2024-09-30. |
| `API_LOGGING` | ➖ | Set to `true` to enable verbose console logs for the Clerk webhook and boot sequence. |

## Database migrations

Run the idempotent SQL bundle locally (requires `DATABASE_URL`):

```bash
npm run db:apply
```

## Granting admin access

Mark a user as admin directly in the database using the bundled helper script:

```bash
# match by the internal UUID
pnpm --filter @innerbloom/api admin:grant --user-id 00000000-0000-4000-8000-000000000001

# match by Clerk id
pnpm --filter @innerbloom/api admin:grant --clerk-id user_2YqExample

# match by email (case insensitive)
pnpm --filter @innerbloom/api admin:grant --email admin@example.com
```

Add `--revoke` to remove admin rights. The command requires `DATABASE_URL` to point at the target database. For quick local testing you can also bypass the database lookup by setting `ADMIN_USER_ID` with any combination of internal ids, Clerk ids, or emails (comma separated). The middleware will treat those identifiers as admins during runtime, even if the database flag is still `false`.

## Development server

Start the API locally:

```bash
npm run dev
```

The server exposes `GET /healthz` for health checks and mounts the existing Express routes alongside the new Fastify handlers.

Print the registered Express routes without starting the Fastify server:

```bash
npm run routes:print
```

## Testing

Run the unit and integration test suite locally from the repository root:

```bash
npm run test
```

This delegates to `npm --workspace apps/api run test`, which executes `vitest run` inside the API workspace. The same command is used in CI once dependencies are installed (`npm ci && npm test`).

### Test environment setup

Vitest automatically loads `src/tests/setup-env.ts` before each suite. The helper provides safe defaults for `DATABASE_URL` and `NODE_ENV` so middleware and service tests can run without connecting to a real database. Override these variables in your shell when exercising alternative configurations locally.

### Test utilities

Use the helpers in `apps/api/src/tests/test-utils.ts` when mocking Express primitives inside Vitest suites. The module exports typed factories:

* `mockReq(overrides?: Partial<Request>)` – creates a request object with configurable headers, params, and custom fields (such as `user`).
* `mockRes()` – returns a response mock where `status`, `json`, and `end` are chainable spies.
* `mockNext()` – provides a `NextFunction` mock compatible with Express middleware.

These utilities keep test code free of `any` casts while matching the runtime behaviour expected by our middlewares.

## Tests & Lint

We keep Vitest suites aligned with our ESLint rules using a few simple conventions:

* Prefer the shorthand `T[]` syntax for array types in tests instead of `Array<T>` to satisfy the `@typescript-eslint/array-type` rule.
* Remove unused Express `NextFunction` parameters; rely on `vi.fn()` mocks when a `next` callback is required.
* Replace empty arrow functions with `vi.fn()` or explicit return values so `no-empty-function` stays green.
* The bootstrap in `src/tests/setup-env.ts` mocks `pg.Pool` with `vi.fn()` spies, preventing real database connections and avoiding lint warnings about empty methods.

> **Nota:** Evita funciones flecha vacías en las suites. Usa `vi.fn()` o retorna explícitamente `undefined` cuando necesites un callback sin lógica.

```ts
// ❌ Antes
const next = () => {};

// ✅ Después
const next = vi.fn();

// ✅ Alternativa cuando se necesita un callback síncrono
const onDone = () => undefined;
```
### User state fixtures

The suites for `get-user-state` and `get-user-state-timeseries` mock the date helpers and XP series so the propagated ranges are
deterministic. This ensures the expectations stay aligned with the grace/backfill logic used in production while keeping the
tests hermetic.

### Game mode resolution

Los endpoints que reportan el estado del usuario (por ejemplo `/users/:id/state` y `/users/:id/state/timeseries`) siempre
resuelven el modo de juego a partir de `users.game_mode_id`. La metadata (`code`, `name`, `weekly_target`) proviene de
`cat_game_mode`. Si `weekly_target` en la tabla de catálogo es `NULL`, el controlador aplica el objetivo semanal por defecto
definido en la lógica de negocio (actualmente 700 XP).

```sql
SELECT u.user_id,
       gm.code,
       gm.name,
       gm.weekly_target,
       u.timezone
  FROM users u
  LEFT JOIN cat_game_mode gm ON gm.game_mode_id = u.game_mode_id
 WHERE u.user_id = $1;
```

El frontend usa el `code` para calcular medias vidas y factores de ganancia, mientras que `name` se muestra cuando está presente
en la tabla de catálogo. La zona horaria proviene directamente de `users.timezone` y puede ser `NULL`; al formatear fechas se
normaliza a `UTC` cuando no hay valor válido.

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

#### Legacy `X-User-Id` header (temporary)

The legacy `X-User-Id` header is only available as a transition aid for local development. Set `ALLOW_X_USER_ID_DEV=true` when running the API with `NODE_ENV=development` (or the default `test` value used by Vitest) to accept the header on `GET /users/me`. Every accepted request logs a deprecation warning and still performs a database lookup to hydrate `req.user`.

The header is ignored in production—requests must include a valid bearer token regardless of the flag state. This compatibility path will be removed on **2024-09-30**, so start migrating callers to Clerk-issued JWTs as soon as possible.

### Perfil del usuario autenticado

`GET /users/me` usa el middleware anterior y siempre responde con la forma `{ user: { ... } }` para mantener compatibilidad con el frontend actual. El objeto `user` incluye:

```json
{
  "user_id": "uuid-interno",
  "clerk_user_id": "clerk_123",
  "email_primary": "user@example.com",
  "full_name": "Nombre Apellido",
  "image_url": "https://...",
  "game_mode": "standard",
  "weekly_target": 1200,
  "timezone": "America/Mexico_City",
  "locale": "es-MX",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-15T00:00:00.000Z",
  "deleted_at": null
}
```

Ejemplo `curl` usando un token Clerk de sesión:

```bash
curl \
  -H "Authorization: Bearer sk_test_yourClerkJwt" \
  https://localhost:3000/api/users/me
```

### Webhook

* Endpoint: `POST /api/webhooks/clerk`
* Health check: `GET /api/webhooks/clerk/health`
* Headers: `svix-id`, `svix-timestamp`, `svix-signature`
* Signature verification: performed with the official Svix verifier using `CLERK_WEBHOOK_SECRET`
* Supported events: `user.created`, `user.updated`, `user.deleted`

#### Quick verification

1. Hit the health check locally or in Railway:

   ```bash
   curl https://<web-service>/api/webhooks/clerk/health
   # → { "ok": true }
   ```

2. In Clerk go to **Webhooks → Endpoints** and send a **Test event** (`user.created`). Confirm the webhook returns `2xx`.
3. Inspect the replicated user in Neon:

   ```sql
   SELECT user_id, clerk_user_id, email, first_name, last_name, image_url,
          email_primary, avatar_url, full_name, created_at, updated_at
     FROM users
    ORDER BY created_at DESC
    LIMIT 5;
   ```

4. *(Optional)* Review the audit trail:

   ```sql
   SELECT svix_id, event_type, received_at
     FROM clerk_webhook_events
    ORDER BY id DESC
    LIMIT 10;
   ```

A valid request upserts the mirrored user record in Postgres (or soft-deletes on `user.deleted`). The handler responds with HTTP `200` on success, `400` for invalid payloads/signatures and `503` when the secret is not configured.

#### End-to-end verification

1. Deploy the service to Railway and confirm the webhook routes are registered:
   ```bash
   npm run routes:print
   ```
   The output must include `POST   /api/webhooks/clerk` exactly once.
2. <!-- #REMOVE_ME_DEBUG_BYPASS -->If `ENABLE_TASKGEN_TRIGGER=true`, double-check the `/exports` directory is not publicly exposed by any CDN or static file mount.
3. Hit the health probe from your browser or `curl`:
   ```bash
   curl https://<api-host>/api/webhooks/clerk/health
   ```
   Expect `{ "ok": true }`.
4. In Clerk → **Webhooks → Endpoints**, open the configured endpoint and send the test events (`user.created`, `user.updated`, `user.deleted`).
5. Check Railway logs for entries similar to:
   ```
   [clerk-webhook] user.created user_123
   ```
6. Inspect Neon using `pg_stat_statements` to validate the `INSERT ... ON CONFLICT` statements ran after the test event (see SQL helpers below).

   ```sql
   -- Reset counters before issuing a test event
   SELECT pg_stat_statements_reset();

   -- Inspect INSERT/UPDATE activity executed by the webhook handler
   SELECT total_time,
          calls,
          mean_time,
          rows,
          query
     FROM pg_stat_statements
    WHERE query ILIKE '%INSERT INTO users%'
       OR query ILIKE '%UPDATE users%'
 ORDER BY total_time DESC
    LIMIT 20;
   ```

### Backfill

Populate or refresh the mirrored users using the Clerk Backend API:

```bash
npm run backfill:users
```

This script paginates Clerk users, performs upserts, and logs totals for inserted vs. updated rows.

<!-- #REMOVE_ME_DEBUG_BYPASS -->
## Debug task generation trigger

<!-- #REMOVE_ME_DEBUG_BYPASS -->
Temporal endpoint to experiment with the task generation pipeline without relying on the CLI snapshot:

<!-- #REMOVE_ME_DEBUG_BYPASS -->
* `ENABLE_TASKGEN_TRIGGER=true` mounts both the legacy CLI bridge and the new `GET /_debug/taskgen` route when `NODE_ENV !== 'production'`.
<!-- #REMOVE_ME_DEBUG_BYPASS -->
* `ADMIN_TRIGGER_TOKEN` **must** be set; callers have to include it via the `x-admin-token` header.
<!-- #REMOVE_ME_DEBUG_BYPASS -->
* `TASKGEN_BYPASS` (optional) forces the source used by the debug endpoint. Accepted values: `mock` or `static`.
<!-- #REMOVE_ME_DEBUG_BYPASS -->
* `DB_SNAPSHOT_PATH` remains optional; when omitted the handler falls back to the bundled `db-snapshot.sample.json` or an in-memory mock.
<!-- #REMOVE_ME_DEBUG_BYPASS -->
* `/exports/errors.log` captures validation/runtime issues. Ensure the `/exports` directory stays internal when deploying (never expose it via static hosting).

<!-- #REMOVE_ME_DEBUG_BYPASS -->
Dry run example (no OpenAI traffic):

<!-- #REMOVE_ME_DEBUG_BYPASS -->
```bash
curl -H "x-admin-token: $ADMIN_TRIGGER_TOKEN" \
  "https://<API_HOST>/_debug/taskgen?user_id=<UUID>&mode=evolve&source=mock&dry_run=true"
```

## Rutas protegidas por ownership

Las siguientes rutas requieren un token Clerk válido **y** que el `:id` coincida con el usuario autenticado. Todas responden con `401 unauthorized` si falta o es inválido el token y con `403 forbidden` cuando el token pertenece a otro usuario.

* `GET /api/users/:id/tasks`
* `GET /api/users/:id/xp/daily`
* `GET /api/users/:id/xp/total`
* `GET /api/users/:id/xp/by-trait`
* `GET /api/users/:id/pillars`
* `GET /api/users/:id/streaks/panel`
* `GET /api/users/:id/level`
* `GET /api/users/:id/achievements`
* `GET /api/users/:id/daily-energy`
* `GET /api/users/:id/journey`
* `GET /api/users/:id/emotions`
* `GET /api/users/:id/state`
* `GET /api/users/:id/state/timeseries`
* `GET /api/users/:id/summary/today`

### `GET /users/:id/xp/by-trait`

Devuelve el total de XP acumulado por rasgo (`trait`) utilizando los registros de `daily_log` junto con los catálogos de rasgos,
pilares y dificultades. La respuesta es un arreglo ordenado por `trait_id` con objetos que incluyen los códigos esperados por el
Radar Chart del frontend:

```json
[
  {
    "trait_id": 1,
    "trait_code": "core",
    "trait_name": "Core",
    "pillar_code": "body",
    "xp": 420
  }
]
```

SQL base utilizada por el handler:

```sql
SELECT dl.user_id,
       ct.trait_id,
       ct.code  AS trait_code,
       ct.name  AS trait_name,
       cp.code  AS pillar_code,
       SUM(cd.xp_base * GREATEST(dl.quantity, 1)) AS xp
  FROM daily_log dl
  JOIN tasks t          ON t.task_id = dl.task_id
  JOIN cat_trait ct     ON ct.trait_id = t.trait_id
  JOIN cat_pillar cp    ON cp.pillar_id = t.pillar_id
  JOIN cat_difficulty cd ON cd.difficulty_id = t.difficulty_id
 WHERE dl.user_id = $1
 GROUP BY dl.user_id, ct.trait_id, ct.code, ct.name, cp.code
 ORDER BY ct.trait_id;
```

Acepta parámetros opcionales `from` y `to` (`YYYY-MM-DD`) para limitar el rango de fechas considerado.

### Ejemplos `curl`

```bash
# 200 OK - token válido para el mismo usuario
USER_ID="11111111-2222-3333-4444-555555555555"
VALID_TOKEN="sk_test_valid_clerk_jwt"
curl -i \
  -H "Authorization: Bearer ${VALID_TOKEN}" \
  "http://localhost:3000/api/users/${USER_ID}/achievements"

# 401 Unauthorized - falta token
curl -i "http://localhost:3000/api/users/${USER_ID}/achievements"
# HTTP/1.1 401 Unauthorized
# {"code":"unauthorized","message":"Authentication required"}

# 403 Forbidden - token válido de otro usuario
OTHER_TOKEN="sk_test_other_user_jwt"
curl -i \
  -H "Authorization: Bearer ${OTHER_TOKEN}" \
  "http://localhost:3000/api/users/${USER_ID}/achievements"
# HTTP/1.1 403 Forbidden
# {"code":"forbidden","message":"You do not have access to this resource"}
```

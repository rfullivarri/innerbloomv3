# Innerbloom API

## Environment variables

| Name | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. |
| `PORT` | Port for the HTTP server (defaults to 3000). |
| `CLERK_WEBHOOK_SECRET` | Signing secret used to verify Clerk webhooks. |
| `CLERK_API_KEY` | Clerk Backend API key (required for the backfill script). |

## Database setup

Run the idempotent SQL to create the base schema:

```bash
psql "$DATABASE_URL" -f apps/api/sql/001_users.sql
```

## Development

```bash
npm install
npm run dev
```

The server exposes:

- `GET /healthz` – basic liveness check
- `POST /api/webhooks/clerk` – Clerk webhook endpoint

## Backfill

Mirror existing Clerk users into Postgres:

```bash
CLERK_API_KEY=sk_test_... npm run backfill:users
```

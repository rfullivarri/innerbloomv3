# Innerbloom API

## Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string used by the API and scripts. SSL is automatically enabled when `sslmode=require` is present. |
| `CLERK_WEBHOOK_SECRET` | ✅ | Svix signing secret provided by Clerk for the `user.*` webhook. |
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

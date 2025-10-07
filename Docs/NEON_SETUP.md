# Neon Setup Guide

This project uses a shared PostgreSQL database hosted on [Neon](https://neon.tech). Follow the steps below to connect both locally and on Railway.

## 1. Grab the database URL

1. Log in to the Neon dashboard and open the project for Innerbloom.
2. Create a pooled connection string if you have not already. Choose the **pooler** connection and copy the `postgresql://` URL.
3. Make sure the URL ends with `?sslmode=require`. This keeps TLS on, which Neon needs.

## 2. Configure the URL locally

1. Inside the monorepo root, create an `.env` file in `apps/api` (this file is already git-ignored).
2. Add the connection string:

   ```bash
   # apps/api/.env
   DATABASE_URL="postgresql://user:password@ep-example-1234.pooler.neon.tech/neondb?sslmode=require"
   ```

3. Install dependencies and run the database workflow:

   ```bash
   npm install
   npm --workspace apps/api run db:all
   ```

   The `db:all` script will:

   1. Generate Drizzle migrations from the schema.
   2. Apply pending migrations.
   3. Execute the raw SQL files in `apps/api/sql`.
   4. Seed the starter data.

## 3. Configure Railway

1. In the Railway project, open the `apps/api` service.
2. Add an environment variable named `DATABASE_URL` with the same Neon pooled connection string (including `?sslmode=require`).
3. Railway automatically injects environment variables, so no extra configuration is needed.

## 4. Verifying the connection

After running `npm --workspace apps/api run db:all`, start the API locally:

```bash
npm --workspace apps/api run dev
```

Then hit the health endpoint in another terminal:

```bash
curl http://localhost:3000/health/db
```

You should see:

```json
{"ok":true}
```

If you run this on Railway (or any other deployment), use the deployed URL instead of `localhost`.

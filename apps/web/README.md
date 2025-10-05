# Innerbloom Web

Rebuilt dashboard and login for the Innerbloom MVP using Vite, React, TypeScript, and Tailwind CSS.

## Prerequisites
- Node.js 18+
- npm (project uses npm for dependency management)

## Getting started
```bash
npm install
npm run dev
```
The dev server runs on <http://localhost:5173> by default.

## Environment
Set the API origin before starting the dev server or building:

```bash
export VITE_API_URL="https://your-api.example.com"
```

The URL is read at runtime via `import.meta.env.VITE_API_URL`. Do not include trailing slashes.

## Database utilities

To apply the service-local SQL bundle, provide `DATABASE_URL` and run:

```bash
export DATABASE_URL="postgres://..."
npm run db:all
```

Railway pre-deploy runs the same command, so successful execution locally mirrors the deploy step. Use `npm run dbg:env` to verify SQL path resolution when debugging.

## Routes
- `/login` – Paste a user ID or continue with the shared demo account.
- `/dashboard` – Authenticated dashboard with XP, streaks, pillars, activity, and insights.

Visiting `/` redirects to `/dashboard` when a user ID is present in `localStorage`, otherwise it falls back to `/login`.

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

## Allowed preview hosts
Vite preview only accepts requests from `innerbloomjourney.org`, `www.innerbloomjourney.org`, `dev.innerbloomjourney.org`, `localhost`, and `*.up.railway.app` to avoid the blocked-host warning. This keeps the preview server reachable on the production and Railway domains while still rejecting unknown hosts.

## Environment
Set the API origin before starting the dev server or building:

```bash
export VITE_API_URL="https://your-api.example.com"
```

The value can be provided in multiple formats:

```bash
# Full URL with protocol
export VITE_API_URL="https://api.example.com"

# Local development shortcuts
export VITE_API_URL="localhost:3000"   # defaults to http://
export VITE_API_URL="/api"             # relative to the current origin
```

The URL is read at runtime via `import.meta.env.VITE_API_URL`. Do not include trailing slashes.

## Routes
- `/login` – Paste a user ID or continue with the shared demo account.
- `/dashboard` – Authenticated dashboard with XP, streaks, pillars, activity, and insights.

Visiting `/` redirects to `/dashboard` when a user ID is present in `localStorage`, otherwise it falls back to `/login`.

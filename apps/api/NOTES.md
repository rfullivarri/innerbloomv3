# Routing conventions

- The Fastify instance mounts the Express application once at the `/api` prefix. Express sub-routers **must not** include the `/api` segment in their own paths.
- Each feature router is expected to export paths that start at its domain root (for example, `users` exposes `/users/...`). The top-level Express app is responsible for attaching the `/api` prefix.
- When adding new routes, rely on the development route logger (enabled whenever `NODE_ENV !== 'production'`) to verify the final method and path that were registered.
- The `/api/_health` endpoint is the canonical health check for both local development and Railway deployments.

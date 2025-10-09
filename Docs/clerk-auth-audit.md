# Auditoría de uso de Clerk en endpoints backend

## Resumen ejecutivo
- Ningún endpoint del backend Express aplica verificación de JWT de Clerk ni monta un middleware de autenticación; toda la API está expuesta públicamente salvo por la validación manual de `X-User-Id` en `GET /users/me`.【F:apps/api/src/app.ts†L32-L81】【F:apps/api/src/controllers/users/get-user-me.ts†L34-L60】
- `GET /users/me` continúa dependiendo del header propietario `X-User-Id` y hace consultas directas por `clerk_user_id` en la base de datos, incumpliendo el acuerdo de usar JWT Bearer y mapear a `users.id`.【F:apps/api/src/controllers/users/get-user-me.ts†L34-L60】
- El resto de rutas `/users/:id/...` valida que `:id` sea un UUID interno y consulta por `users.user_id`, pero no aplican autenticación ni verificación del portador, por lo que cualquier cliente puede consultar datos ajenos si conoce el UUID.【F:apps/api/src/routes/users.ts†L22-L36】【F:apps/api/src/controllers/users/shared.ts†L4-L12】
- El frontend (apps/web) y la documentación interna siguen instruyendo a consumir `/users/me` con `X-User-Id`, perpetuando el patrón no deseado.【F:apps/web/src/lib/api.ts†L938-L947】【F:Docs/dashboard-endpoints.md†L132-L145】

## Inventario de endpoints

| Endpoint | Auth | ID en path | Origen identidad | Archivos | Cumple |
| --- | --- | --- | --- | --- | --- |
| GET /_health | Público | Ninguno | N/A | `apps/api/src/routes/health.ts` | ✅ |
| GET /health/db | Público | Ninguno | N/A | `apps/api/src/routes/health.ts` | ✅ |
| GET /pillars | Público | Ninguno | N/A | `apps/api/src/routes/pillars.ts` | ✅ |
| GET /tasks | Público | Query `userId` UUID | Ninguna validación de portador | `apps/api/src/routes/legacy.ts` | ❌ |
| GET /task-logs | Público | Query `userId` UUID | Ninguna validación de portador | `apps/api/src/routes/legacy.ts` | ❌ |
| POST /task-logs | Público | Body `userId` UUID | Ninguna validación de portador | `apps/api/src/routes/legacy.ts` | ❌ |
| POST /tasks/complete | Público | Body `userId` UUID | Ninguna validación de portador | `apps/api/src/routes/tasks.ts` | ❌ |
| GET /leaderboard | Público | Ninguno | N/A | `apps/api/src/routes/leaderboard.ts` | ✅ |
| GET /users/me | Header `X-User-Id` | Ninguno | Header plano (Clerk ID) | `apps/api/src/controllers/users/get-user-me.ts` | ❌ |
| GET /users/:id/tasks | Sin auth | `:id` UUID interno | Path param | `apps/api/src/routes/users.ts`; `controllers/tasks/get-user-tasks.ts` | ❌ |
| GET /users/:id/xp/daily | Sin auth | `:id` UUID interno | Path param | `apps/api/src/routes/users.ts`; `controllers/logs/get-user-daily-xp.ts` | ❌ |
| GET /users/:id/xp/total | Sin auth | `:id` UUID interno | Path param | `apps/api/src/routes/users.ts`; `controllers/users/get-user-total-xp.ts` | ❌ |
| GET /users/:id/xp/by-trait | Sin auth | `:id` UUID interno | Path param | `apps/api/src/routes/users.ts`; `routes/users/xp-by-trait.ts` | ❌ |
| GET /users/:id/pillars | Sin auth | `:id` UUID interno | Path param | `apps/api/src/routes/users.ts`; `routes/users/pillars.ts` | ❌ |
| GET /users/:id/streaks/panel | Sin auth | `:id` UUID interno | Path param | `apps/api/src/routes/users.ts`; `routes/users/streak-panel.ts` | ❌ |
| GET /users/:id/level | Sin auth | `:id` UUID interno | Path param | `apps/api/src/routes/users.ts`; `controllers/users/get-user-level.ts` | ❌ |
| GET /users/:id/achievements | Sin auth | `:id` UUID interno | Path param | `apps/api/src/routes/users.ts`; `controllers/users/get-user-achievements.ts` | ❌ |
| GET /users/:id/daily-energy | Sin auth | `:id` UUID interno | Path param | `apps/api/src/routes/users.ts`; `routes/users/daily-energy.ts` | ❌ |
| GET /users/:id/journey | Sin auth | `:id` UUID interno | Path param | `apps/api/src/routes/users.ts`; `controllers/logs/get-user-journey.ts` | ❌ |
| GET /users/:id/emotions | Sin auth | `:id` UUID interno | Path param | `apps/api/src/routes/users.ts`; `controllers/emotions/get-user-emotions.ts` | ❌ |
| GET /users/:id/state | Sin auth | `:id` UUID interno | Path param | `apps/api/src/routes/users.ts`; `controllers/users/get-user-state.ts` | ❌ |
| GET /users/:id/state/timeseries | Sin auth | `:id` UUID interno | Path param | `apps/api/src/routes/users.ts`; `controllers/users/get-user-state-timeseries.ts` | ❌ |
| GET /users/:id/summary/today | Sin auth | `:id` UUID interno | Path param | `apps/api/src/routes/users.ts`; `routes/users/summary-today.ts` | ❌ |

> Nota: el webhook `/api/webhooks/clerk` está implementado en Fastify con verificación Svix y queda fuera del enrutador Express inspeccionado, pero solo inserta usuarios y no expone lecturas.【F:apps/api/src/routes/webhooks/clerk.ts†L5-L68】

## Evidencias destacadas
- Router Express sin middleware de auth global: `app.use` monta `routes` y errores, sin verificación de Authorization.【F:apps/api/src/app.ts†L32-L81】
- `GET /users/me` lee `X-User-Id` directamente y consulta por `clerk_user_id`, sin JWT.【F:apps/api/src/controllers/users/get-user-me.ts†L34-L60】
- Documentación y frontend siguen exigiendo/enviando `X-User-Id`.【F:Docs/dashboard-endpoints.md†L132-L145】【F:apps/web/src/lib/api.ts†L938-L947】
- Todas las rutas `/users/:id/...` validan `id` como UUID y llaman a `ensureUserExists` (consulta por `users.user_id`).【F:apps/api/src/routes/users.ts†L22-L36】【F:apps/api/src/lib/validation.ts†L4-L11】【F:apps/api/src/controllers/users/shared.ts†L4-L12】
- Controladores concretos (`get-user-tasks`, `get-user-daily-xp`, etc.) usan el UUID interno en queries, pero carecen de auth previa.【F:apps/api/src/controllers/tasks/get-user-tasks.ts†L26-L61】【F:apps/api/src/controllers/logs/get-user-daily-xp.ts†L21-L47】【F:apps/api/src/controllers/users/get-user-level.ts†L21-L61】
- `GET /users/:id/daily-energy` marca explícitamente un TODO para agregar autenticación de Clerk, confirmando la ausencia de protección actual.【F:apps/api/src/routes/users/daily-energy.ts†L46-L85】

## Pruebas cURL sugeridas
1. **Estado actual (no conforme) – /users/me con header heredado:**
   ```bash
   curl -i \
     -H 'X-User-Id: user_test_123' \
     http://localhost:3000/api/users/me
   ```
   - Esperado: 200/201 según existencia del usuario; demuestra dependencia de `X-User-Id`.

2. **Prueba recomendada (una vez que exista middleware JWT) – /users/me con Bearer:**
   ```bash
   curl -i \
     -H 'Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...' \
     http://localhost:3000/api/users/me
   ```
   - Requiere implementar middleware que valide el token de Clerk, extraiga `sub` y lo mapee a `users.id`.

3. **Endpoint de UUID interno – /users/:id/xp/total:**
   ```bash
   curl -i \
     -H 'Authorization: Bearer <jwt-clerk>' \
     http://localhost:3000/api/users/11111111-2222-3333-4444-555555555555/xp/total
   ```
   - Tras la corrección, debe aceptar solo UUID y verificar que el `sub` del JWT corresponda al mismo usuario interno.

4. **Prueba negativa (actual) demostrando falta de auth:**
   ```bash
   curl -i \
     http://localhost:3000/api/users/11111111-2222-3333-4444-555555555555/xp/daily
   ```
   - Hoy responde 200 sin headers, evidenciando acceso público.

## Conclusión y acciones correctivas

### Endpoints conformes
- Solo los endpoints puramente públicos (`/_health`, `/health/db`, `/pillars`, `/leaderboard`) cumplen por no requerir identidad.

### Endpoints no conformes y acciones
1. **GET /users/me** – Cambiar lectura de `X-User-Id` por verificación de JWT Clerk:
   - Agregar middleware `verifyClerkJwt` que valide firma (`iss`, `aud`) y extraiga `sub`/`userId`.
   - Resolver `sub` → `users.clerk_user_id` → `users.user_id`, guardando en `req.user`.
   - El handler debe usar ese `user_id` y dejar de aceptar headers planos.
   - Actualizar frontend (`apps/web/src/lib/api.ts`) para enviar `Authorization: Bearer` usando `getToken()` de Clerk.
   - Actualizar documentación (`Docs/dashboard-endpoints.md`) eliminando referencia a `X-User-Id`.

2. **Todas las rutas `/users/:id/...`** – Añadir protección consistente:
   - Reutilizar el middleware JWT para obtener `user_id` interno.
   - Validar que el `:id` del path coincida con el `user_id` resuelto o, alternativamente, eliminar `:id` y usar el `user_id` autenticado.
   - Mantener la validación UUID para inputs externos.

3. **Endpoints legacy (`/tasks`, `/task-logs`, `/tasks/complete`)** – Definir estrategia:
   - Si siguen vigentes, aplicar el mismo middleware y prohibir `userId` arbitrario en query/body; inferir desde auth o validar ownership en base de datos.
   - Si son obsoletos, documentar y/o cerrar acceso.

4. **Documentación y tooling** – Revisar `Docs/dashboard-endpoints.md` para sustituir la instrucción “`X-User-Id` obligatorio” por “Enviar `Authorization: Bearer <jwt>`” y describir la resolución a UUID interno.

5. **Seguimiento** – Aprovechar el TODO en `/users/:id/daily-energy` para introducir el middleware común y propagarlo al resto de rutas privadas.

Implementar estas correcciones asegurará que la identidad provenga del JWT de Clerk, se traduzca correctamente al UUID interno y se elimine el header `X-User-Id` en producción.

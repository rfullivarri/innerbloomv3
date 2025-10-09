# Auditoría de autenticación Clerk

## 1. Inventario de endpoints
| Método | Ruta | Handler principal | Protección actual | Identidad esperada | Evidencia |
| --- | --- | --- | --- | --- | --- |
| GET | /_health | inline (health) | Público (sin middleware) | N/A | `health.ts`【F:apps/api/src/routes/health.ts†L7-L26】 |
| GET | /health/db | inline (health) | Público (sin middleware) | N/A | `health.ts`【F:apps/api/src/routes/health.ts†L15-L26】 |
| GET | /pillars | inline (pillars) | Público (sin middleware) | N/A | `pillars.ts`【F:apps/api/src/routes/pillars.ts†L7-L13】 |
| GET | /tasks | inline (legacy) | Público; valida `userId` UUID en query | Clerk ID en query (UUID) | `legacy.ts`【F:apps/api/src/routes/legacy.ts†L22-L45】 |
| GET | /task-logs | inline (legacy) | Público; valida `userId` UUID en query | Clerk ID en query (UUID) | `legacy.ts`【F:apps/api/src/routes/legacy.ts†L35-L45】 |
| POST | /task-logs | inline (legacy) | Público; valida `userId` y `taskId` UUID en body | Clerk ID y task UUID en body | `legacy.ts`【F:apps/api/src/routes/legacy.ts†L48-L62】 |
| POST | /tasks/complete | inline (tasks) | Público; valida `userId` y `taskId` UUID en body | UUID internos | `tasks.ts`【F:apps/api/src/routes/tasks.ts†L14-L28】 |
| GET | /leaderboard | inline (leaderboard) | Público (sin auth) | N/A | `leaderboard.ts`【F:apps/api/src/routes/leaderboard.ts†L13-L30】 |
| GET | /users/me | `getCurrentUser` | Protegido con `authMiddleware` (Bearer JWT) | UUID interno derivado del token | `users.ts`, `get-user-me.ts`【F:apps/api/src/routes/users.ts†L37-L37】【F:apps/api/src/controllers/users/get-user-me.ts†L5-L41】 |
| GET | /users/:id/tasks | `getUserTasks` | Público; solo valida UUID | UUID interno en path | `users.ts`, `get-user-tasks.ts`【F:apps/api/src/routes/users.ts†L22-L23】【F:apps/api/src/controllers/tasks/get-user-tasks.ts†L23-L61】 |
| GET | /users/:id/xp/daily | `getUserDailyXp` | Público; valida UUID | UUID interno en path | `users.ts`, `get-user-daily-xp.ts`【F:apps/api/src/routes/users.ts†L22-L24】【F:apps/api/src/controllers/logs/get-user-daily-xp.ts†L17-L49】 |
| GET | /users/:id/xp/total | `getUserTotalXp` | Público; valida UUID | UUID interno en path | `users.ts`, `get-user-total-xp.ts`【F:apps/api/src/routes/users.ts†L23-L24】【F:apps/api/src/controllers/users/get-user-total-xp.ts†L17-L52】 |
| GET | /users/:id/xp/by-trait | `getUserXpByTrait` | Público; valida UUID | UUID interno en path | `users.ts`, `xp-by-trait.ts`【F:apps/api/src/routes/users.ts†L24-L25】【F:apps/api/src/routes/users/xp-by-trait.ts†L16-L63】 |
| GET | /users/:id/pillars | `getUserPillars` | Público; valida UUID | UUID interno en path | `users.ts`, `pillars.ts`【F:apps/api/src/routes/users.ts†L25-L26】【F:apps/api/src/routes/users/pillars.ts†L16-L73】 |
| GET | /users/:id/streaks/panel | `getUserStreakPanel` | Público; valida UUID | UUID interno en path | `users.ts`, `streak-panel.ts`【F:apps/api/src/routes/users.ts†L26-L27】【F:apps/api/src/routes/users/streak-panel.ts†L21-L86】 |
| GET | /users/:id/level | `getUserLevel` | Público; valida UUID | UUID interno en path | `users.ts`, `get-user-level.ts`【F:apps/api/src/routes/users.ts†L27-L29】【F:apps/api/src/controllers/users/get-user-level.ts†L18-L61】 |
| GET | /users/:id/achievements | `getUserAchievements` | Público; valida UUID | UUID interno en path | `users.ts`, `get-user-achievements.ts`【F:apps/api/src/routes/users.ts†L28-L29】【F:apps/api/src/controllers/users/get-user-achievements.ts†L20-L64】 |
| GET | /users/:id/daily-energy | `getUserDailyEnergy` | Público; valida UUID, tiene TODO de auth | UUID interno en path | `users.ts`, `daily-energy.ts`【F:apps/api/src/routes/users.ts†L29-L31】【F:apps/api/src/routes/users/daily-energy.ts†L46-L85】 |
| GET | /users/:id/journey | `getUserJourney` | Público; valida UUID | UUID interno en path | `users.ts`, `get-user-journey.ts`【F:apps/api/src/routes/users.ts†L31-L32】【F:apps/api/src/controllers/logs/get-user-journey.ts†L19-L74】 |
| GET | /users/:id/emotions | `getUserEmotions` | Público; valida UUID | UUID interno en path | `users.ts`, `get-user-emotions.ts`【F:apps/api/src/routes/users.ts†L32-L33】【F:apps/api/src/controllers/emotions/get-user-emotions.ts†L17-L52】 |
| GET | /users/:id/state | `getUserState` | Público; valida UUID | UUID interno en path | `users.ts`, `get-user-state.ts`【F:apps/api/src/routes/users.ts†L33-L34】【F:apps/api/src/controllers/users/get-user-state.ts†L18-L59】 |
| GET | /users/:id/state/timeseries | `getUserStateTimeseries` | Público; valida UUID | UUID interno en path | `users.ts`, `get-user-state-timeseries.ts`【F:apps/api/src/routes/users.ts†L33-L34】【F:apps/api/src/controllers/users/get-user-state-timeseries.ts†L17-L60】 |
| GET | /users/:id/summary/today | `getUserSummaryToday` | Público; valida UUID | UUID interno en path | `users.ts`, `summary-today.ts`【F:apps/api/src/routes/users.ts†L34-L35】【F:apps/api/src/routes/users/summary-today.ts†L23-L91】 |
| POST | /api/webhooks/clerk | inline (Fastify) | Verifica firma Svix | Clerk ID en payload | `webhooks/clerk.ts`【F:apps/api/src/routes/webhooks/clerk.ts†L5-L68】 |

> El router Express se monta sin middleware de autenticación global, por lo que todas las rutas anteriores están expuestas tanto en `/api/*` como en la raíz del servidor.【F:apps/api/src/app.ts†L32-L48】

## 2. Uso de identidad
- **Backend (`GET /users/me`)**: usa `authMiddleware` para validar `Authorization: Bearer` y rellenar `req.user` con `{ id, clerkId }`. El handler consulta `users.user_id = req.user.id` y responde `{ user }` con `user_id`, `game_mode`, `weekly_target`, etc.【F:apps/api/src/routes/users.ts†L37-L37】【F:apps/api/src/controllers/users/get-user-me.ts†L5-L41】
- **Rutas `/users/:id/...`**: solo verifican que `:id` sea UUID mediante esquemas Zod y consultan `users.user_id`; no comparan contra una identidad autenticada ni exigen token.【F:apps/api/src/controllers/tasks/get-user-tasks.ts†L23-L61】【F:apps/api/src/controllers/users/shared.ts†L4-L12】
- **Frontend web**: `App` instala un `ApiAuthBridge` que obtiene `getToken()` de Clerk (opcionalmente usando `VITE_CLERK_TOKEN_TEMPLATE` para fijar el template de JWT) y lo registra en el cliente REST. `useBackendUser` y los helpers de `api.ts` resuelven el token en cada request y envían `Authorization: Bearer <jwt>` hacia `/users/me` y `/users/:id/...`, eliminando `X-User-Id`.【F:apps/web/src/App.tsx†L1-L94】【F:apps/web/src/hooks/useBackendUser.ts†L1-L46】【F:apps/web/src/lib/api.ts†L1-L115】

## 3. Tabla de cumplimiento vs política (JWT + UUID interno)
| Componente | Identidad actual | Cumple política | Evidencia |
| --- | --- | --- | --- |
| `GET /users/me` | `Authorization: Bearer <jwt>` validado → UUID interno | ✅ | 【F:apps/api/src/routes/users.ts†L37-L37】【F:apps/api/src/controllers/users/get-user-me.ts†L5-L41】 |
| Rutas `/users/:id/...` | UUID en path, pero sin autenticación | ❌ | 【F:apps/api/src/routes/users.ts†L22-L35】【F:apps/api/src/controllers/users/shared.ts†L4-L12】 |
| Endpoints legacy `/tasks*` | UUID en query/body, sin autenticación | ❌ | 【F:apps/api/src/routes/legacy.ts†L22-L62】 |
| Endpoints públicos (health, leaderboard, pillars) | No requieren identidad | ✅ (públicos) | 【F:apps/api/src/routes/health.ts†L7-L26】【F:apps/api/src/routes/leaderboard.ts†L13-L30】 |
| Webhook Clerk | Valida Svix y Clerk ID, no expone datos | ✅ | 【F:apps/api/src/routes/webhooks/clerk.ts†L5-L68】 |

## 4. Riesgos
- **Suplantación de usuarios mediante header**: mitigada en `/users/me` tras exigir `Authorization: Bearer` y resolver el `user_id` internamente. Persiste el riesgo en rutas `/users/:id/...` sin middleware.【F:apps/api/src/routes/users.ts†L22-L35】
- **Exposición de datos sensibles**: las rutas `/users/:id/...` permiten consultar métricas, energía y estados de cualquier UUID válido sin comprobar si pertenece al solicitante.【F:apps/api/src/routes/users.ts†L22-L35】【F:apps/api/src/controllers/users/shared.ts†L4-L12】
- **Documentación y frontend refuerzan el patrón inseguro**: mitigado en el cliente web tras adoptar Bearer; persiste la deuda en manuales antiguos y consumidores externos que sigan copiando `X-User-Id` desde material previo.【F:Docs/clerk-auth-audit.md†L81-L89】
- **TODO sin atender**: el handler de `daily-energy` reconoce la falta de middleware Clerk, evidenciando deuda técnica generalizada.【F:apps/api/src/routes/users/daily-energy.ts†L46-L53】

## 5. Acciones sugeridas
1. **Implementar middleware Clerk JWT** que verifique firma (`svix`, `iss`, `aud`) y cargue `req.user` con `clerk_user_id` y `user_id`. ✅ `/users/me` ya lo utiliza; resta propagarlo a rutas `/users/:id/...` para cerrar accesos públicos.【F:apps/api/src/routes/users.ts†L22-L35】
2. **Aplicar el middleware a todas las rutas privadas** (`/users/me` y `/users/:id/...`), validando que el `:id` solicitado coincida con el `user_id` autenticado o derivándolo internamente para evitar exposición masiva.【F:apps/api/src/routes/users.ts†L22-L35】
3. **Actualizar el frontend** para consumir `getToken()` de Clerk y enviar `Authorization: Bearer <jwt>` en `apiGet`, eliminando dependencias de `X-User-Id`. ✅ Implementado con `ApiAuthBridge`, `getAuthorizedJson` y la renovación de `useBackendUser`.【F:apps/web/src/App.tsx†L1-L75】【F:apps/web/src/lib/api.ts†L1-L209】【F:apps/web/src/hooks/useBackendUser.ts†L1-L46】
   - **Nuevo**: existe una bandera temporal `ALLOW_X_USER_ID_DEV` (default `false`) que, solo en entornos locales (`NODE_ENV=development/test`), admite `Authorization: Bearer dev_<token>` para facilitar QA sin firmar JWT. Cada acceso emite un warning y el soporte se retirará el **30 de septiembre de 2024**.
4. **Revisar documentación interna** (`Docs/dashboard-endpoints.md`, tutoriales) para que reflejen el flujo JWT + UUID, evitando que nuevos clientes repliquen el esquema heredado.【F:Docs/dashboard-endpoints.md†L132-L145】
5. **Evaluar endpoints legacy (`/tasks`, `/task-logs`, `/tasks/complete`)**: si continúan activos, forzar autenticación y calcular `userId` desde el token; si son obsoletos, retirarlos o aislarlos tras un gateway autenticado.【F:apps/api/src/routes/legacy.ts†L22-L62】

### Normalización de errores y contratos de /users/state(/timeseries)

Las rutas `/users/:id/state` y `/users/:id/state/timeseries` ahora delegan la validación de `params` y `query` al adaptador `parseWithValidation`, el cual convierte los `ZodError` en respuestas homogéneas `{ code: 'invalid_request', message, details }`. Esto alinea su contrato con el manejador global de errores y con rutas públicas como `/leaderboard`, que reutiliza el mismo adaptador para limitar `limit ≤ 50` sin duplicar lógica.【F:apps/api/src/lib/validation.ts†L9-L36】【F:apps/api/src/controllers/users/get-user-state.ts†L17-L108】【F:apps/api/src/controllers/users/get-user-state-timeseries.ts†L17-L110】【F:apps/api/src/routes/leaderboard.ts†L3-L26】

**Ejemplo** – `GET /users/4a6f8b1e-12f0-4a22-8e8a-7cbf8250a49d/state/timeseries?from=2024-02-10&to=2024-02-01`

```json
{
  "code": "invalid_request",
  "message": "from must be before or equal to to",
  "details": {
    "fieldErrors": {},
    "formErrors": []
  }
}
```

---
**Estado actual:** `/users/me` ya aplica la política "JWT + UUID interno" vía `authMiddleware`. Aún falta migrar el resto de rutas `/users/:id/...` y endpoints legacy para cerrar el acceso sin token.

## 6. Rutas frontend con Bearer y cómo depurarlas

- **Rutas migradas**: el cliente web ahora envía `Authorization: Bearer` a `/users/me` y a todos los recursos derivados de `/users/:id/…`, incluyendo `achievements`, `tasks`, `summary/today`, `state`, `state/timeseries`, `daily-energy`, `xp/daily`, `xp/total`, `xp/by-trait`, `emotions`, `journey` y `streaks/panel`. La envoltura `getAuthorizedJson` agrega el encabezado tras resolver el token y conserva el manejo de errores (401/403) existente.【F:apps/web/src/lib/api.ts†L1-L209】
- **Cómo verificar el header**:
  1. Abrí la vista `DashboardV3` en el navegador y desplegá las DevTools (⌥⌘I en macOS, Ctrl+Shift+I en Windows/Linux).
  2. En la pestaña **Network**, filtrá por `users` y refrescá la página; inspeccioná cualquier request (`/users/me`, `/users/<id>/xp/total`, etc.).
  3. En el panel **Headers**, confirmá que `Authorization` aparece con el esquema `Bearer` y, en **Request Payload**, validá que ya no figure `X-User-Id`.
  4. Si necesitás depurar desde consola, ejecutá `window.fetch = new Proxy(window.fetch, { apply(target, thisArg, args) { console.debug('[fetch]', args[0], args[1]?.headers); return Reflect.apply(target, thisArg, args); } });` antes de recargar para registrar los headers enviados.
- **Fallbacks**: si `getToken()` falla o devuelve `null`, el cliente lanza `Missing Clerk session token for API request`, facilitando detectar sesiones expiradas antes de propagarlas al backend.【F:apps/web/src/lib/api.ts†L64-L115】

## Cobertura y alcance
- **Cobertura actual (Vitest + V8)**: Statements 97.56%, Branches 84.71%, Functions 98.91%, Lines 97.56%.【335cb1†L57-L64】
- **Foco de cobertura**: limitamos la métrica a middlewares, servicios de auth, controladores y rutas para vigilar regresiones de seguridad; se excluyen `src/index.ts`, `src/db.ts`, esquemas y scripts porque no se ejecutan durante las pruebas y no impactan la superficie de autenticación.【F:apps/api/vitest.config.ts†L13-L33】
- **Nuevas pruebas relevantes**: se añadieron suites para `getUserState`, `streak-panel`, `pillars` y `xp-by-trait` que cubren flujos de gracia, modos y normalización de entradas que afectan controles de acceso y cálculos de exposición.【F:apps/api/src/controllers/users/get-user-state.test.ts†L133-L212】【F:apps/api/src/routes/users/streak-panel.test.ts†L97-L232】【F:apps/api/src/routes/users/pillars.test.ts†L129-L198】【F:apps/api/src/routes/users/xp-by-trait.test.ts†L57-L94】

## Checklist de verificación manual

1. Confirmar que cualquier petición manual a `/users/me` y `/users/:id/...` responde `401` cuando se omite `Authorization: Bearer <jwt>`.
2. Ejecutar `curl` con `Authorization: Bearer dev_<token>` y `ALLOW_X_USER_ID_DEV=true` en un entorno local para validar el flujo de QA sin firma.
3. Revisar los logs del backend (`pnpm --filter api dev`) y asegurarse de que los avisos relacionados con tokens dev se registran y que no se aceptan encabezados heredados.
4. Verificar en DevTools → Network que no se envían encabezados `X-User-Id` y que `Authorization` aparece en todas las solicitudes protegidas.
5. Simular un acceso cruzado (`/users/:id/...` con JWT ajeno) y documentar la respuesta (`403` esperada una vez aplicado el middleware compartido).

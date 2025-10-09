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
- **Frontend web**: usa Clerk React `useAuth()` para obtener `userId` de Clerk y llama a `getCurrentUserProfile`, que reenvía el header `X-User-Id` a `/users/me`, perpetuando el esquema sin JWT.【F:apps/web/src/hooks/useBackendUser.ts†L16-L46】【F:apps/web/src/lib/api.ts†L938-L947】

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
- **Documentación y frontend refuerzan el patrón inseguro**: la librería cliente sigue enviando `X-User-Id`, lo que dificulta la adopción de JWT y facilita errores en integraciones futuras.【F:apps/web/src/hooks/useBackendUser.ts†L16-L46】【F:apps/web/src/lib/api.ts†L938-L947】
- **TODO sin atender**: el handler de `daily-energy` reconoce la falta de middleware Clerk, evidenciando deuda técnica generalizada.【F:apps/api/src/routes/users/daily-energy.ts†L46-L53】

## 5. Acciones sugeridas
1. **Implementar middleware Clerk JWT** que verifique firma (`svix`, `iss`, `aud`) y cargue `req.user` con `clerk_user_id` y `user_id`. ✅ `/users/me` ya lo utiliza; resta propagarlo a rutas `/users/:id/...` para cerrar accesos públicos.【F:apps/api/src/routes/users.ts†L22-L35】
2. **Aplicar el middleware a todas las rutas privadas** (`/users/me` y `/users/:id/...`), validando que el `:id` solicitado coincida con el `user_id` autenticado o derivándolo internamente para evitar exposición masiva.【F:apps/api/src/routes/users.ts†L22-L35】
3. **Actualizar el frontend** para consumir `getToken()` de Clerk y enviar `Authorization: Bearer <jwt>` en `apiGet`, eliminando dependencias de `X-User-Id`. Ajustar `useBackendUser` y helpers relacionados.【F:apps/web/src/hooks/useBackendUser.ts†L16-L46】【F:apps/web/src/lib/api.ts†L938-L947】
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

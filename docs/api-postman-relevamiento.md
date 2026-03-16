# Innerbloom API Relevamiento (código real + Postman)

## 1) Resumen ejecutivo corto

- La **API real para probar en Postman** es `apps/api` (Express) y se monta con prefijo doble: sin prefijo (`/`) y con prefijo `/api` (recomendado usar `/api`).
- No se encontró OpenAPI/Swagger ni colección Postman versionada. Hay documentación parcial en Markdown (útil pero no suficiente para importación directa).
- El backend tiene endpoints de: auth/usuario, onboarding, tasks, missions, daily quest, game mode, moderation, billing/Stripe, webhooks y admin.
- Hay endpoints internos (cron y webhooks) que requieren secretos/firmas y deben probarse con cuidado.

---

## 2) Documentación existente encontrada

| Artefacto | Ruta | Cobertura | ¿Sirve para Postman directo? |
|---|---|---|---|
| README backend API | `apps/api/README.md` | Setup, variables, scripts; incluye notas de cron. | Parcial (no colección/import). |
| Dashboard endpoints (legacy+V3) | `Docs/dashboard-endpoints.md` | Varios endpoints de dashboard con ejemplos de respuesta. | Parcial (manual, no machine-readable). |
| Missions v2 contrato | `docs/missions-v2-api-contract.md` | Contrato funcional de missions v2. | Parcial (debe validarse contra código actual). |
| Daily reminders doc | `docs/daily-reminders.md` | Flujo job + cron interno. | Parcial. |
| Root README | `README.md` | Panorama monorepo, deploy/env y operación. | Parcial. |

### Conclusión de documentación existente
- **No hay** `openapi.yaml/json`, `swagger.json`, `postman_collection.json` ni `postman_environment.json` en repo.
- Existe documentación útil, pero **incompleta para importar “one-click” en Postman**.

---

## 3) Mapa general del sistema/API

## Servicios/apps detectados
- `apps/api`: backend HTTP (Express) con rutas REST + webhooks + cron internos.
- `apps/web`: frontend web (consume API).
- `apps/mobile`: app móvil (sin exposición de endpoints propios en este repo).
- `packages/*`: librerías/contratos internos (no API HTTP pública).

## Qué expone endpoints HTTP
- **Sí expone**: `apps/api`.
- **No API pública propia**: `apps/web`, `apps/mobile`, `packages/*`.

## API “real” para Postman
- Base recomendada: `{{baseUrl}}/api`.
- Existen alias sin `/api` por montaje duplicado, pero para evitar ambigüedad conviene usar `/api`.

---

## 4) Endpoints activos organizados por dominio

> Fuente primaria: `pnpm --filter @innerbloom/api routes:print` + validación en archivos de rutas.

## 4.1 Health / utilitarios públicos

| Método | Ruta | Auth | Body/Query | Respuestas clave |
|---|---|---|---|---|
| GET | `/api/_health` | No | - | `200 {ok:true}` / `503 database_unavailable` |
| GET | `/api/health/db` | No | - | `200 {ok:true}` / `500 database_unavailable` |
| GET | `/api/pillars` | No | - | `200 []` (stub) |
| GET | `/api/leaderboard` | No | Query opcional: `limit<=50`, `offset>=0` | `200 {limit,offset,users:[]}` |

## 4.2 Auth / perfil usuario

| Método | Ruta | Auth | Body/Query | Respuestas clave |
|---|---|---|---|---|
| GET | `/api/users/me` | Bearer (Clerk JWT verificado) | - | `200 {user...}` |
| GET | `/api/users/me/subscription` | Bearer | - | `200 {subscription...}` |
| GET | `/api/me/daily-reminder` | Bearer | - | `200 settings` |
| PUT | `/api/me/daily-reminder` | Bearer | body settings reminder | `200 updated` |
| PUT | `/api/me/timezone` | Bearer | `{ timezone }` | `200 updated` |

## 4.3 User-scoped dashboard (`/users/:id/*`)

Estas rutas se montan con `authMiddleware + ownUserGuard + requireActiveSubscription`.

- GET `/api/users/:id/tasks`
- POST `/api/users/:id/tasks`
- PATCH `/api/users/:id/tasks/:taskId`
- DELETE `/api/users/:id/tasks/:taskId`
- GET `/api/users/:id/xp/daily`
- GET `/api/users/:id/xp/total`
- GET `/api/users/:id/xp/by-trait`
- GET `/api/users/:id/pillars`
- GET `/api/users/:id/streaks/panel`
- GET `/api/users/:id/level`
- GET `/api/users/:id/achievements`
- GET `/api/users/:id/daily-energy`
- GET `/api/users/:id/journey`
- GET `/api/users/:id/emotions`
- GET `/api/users/:id/state`
- GET `/api/users/:id/state/timeseries`
- GET `/api/users/:id/summary/today`
- GET `/api/users/:id/weekly-wrapped/latest`
- GET `/api/users/:id/weekly-wrapped/previous`
- GET `/api/users/:id/rewards/history`

### Missions v2 in-memory router bajo user scope
- GET `/api/users/:id/missions/v2`
- POST `/api/users/:id/missions/v2/select`
- POST `/api/users/:id/missions/v2/reroll`
- POST `/api/users/:id/missions/v2/link-daily`
- POST `/api/users/:id/missions/v2/special-strike`
- POST `/api/users/:id/missions/v2/submit-evidence`
- POST `/api/users/:id/missions/v2/phase2`
- POST `/api/users/:id/missions/v2/claim`
- POST `/api/users/:id/missions/v2/future-note`

**Body esperado (resumen):**
- `select`: `{ slot: main|hunt|skill, mission_id }`
- `reroll`: `{ slot }`
- `link-daily/special-strike/submit-evidence`: `{ slot }`
- `phase2`: `{ confirm?: boolean }`
- `claim`: `{ slot }`
- `future-note`: `{ friction_id, note }`

## 4.4 Tasks legacy/root

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/api/tasks` | No (legacy) | requiere query `userId` UUID |
| POST | `/api/tasks/complete` | No (legacy) | body `{userId,taskId,doneAt?}`; responde `501 not_implemented` |
| GET | `/api/task-logs` | No (legacy) | query `userId` UUID |
| POST | `/api/task-logs` | No (legacy) | body `{userId,taskId,doneAt}`; `501` |

## 4.5 Task insights / recalibration (privadas)

| Método | Ruta | Auth | Body/Query | Respuestas |
|---|---|---|---|---|
| GET | `/api/tasks/:taskId/insights` | Bearer + suscripción activa | query `mode?`, `weeklyGoal?` | `200` payload analítico; `404` task not found |
| GET | `/api/tasks/:taskId/recalibrations/latest` | Bearer + suscripción activa | - | `200 {recalibration}` |
| GET | `/api/tasks/:taskId/recalibrations` | Bearer + suscripción activa | query `limit` (1..24, default 3) | `200 {recalibrations:[]}` |

## 4.6 Daily Quest

| Método | Ruta | Auth | Body/Query | Respuestas |
|---|---|---|---|---|
| GET | `/api/daily-quest/status` | Bearer + suscripción activa | query `date?` (YYYY-MM-DD) | `200 status` |
| GET | `/api/daily-quest/definition` | Bearer + suscripción activa | query `date?` | `200 definition` |
| POST | `/api/daily-quest/submit` | Bearer + suscripción activa | `{date?,emotion_id,tasks_done:[{task_id}],notes?}` | `200 result`; errores de validación/negocio |

## 4.7 Missions

| Método | Ruta | Auth | Body/Query | Respuestas |
|---|---|---|---|---|
| GET | `/api/missions/board` | Bearer + suscripción activa | - | board |
| GET | `/api/missions/market` | Bearer + suscripción activa | - | market / `404` si v2 desactivada |
| POST | `/api/missions/select` | Bearer + suscripción activa | `{slot, missionId}` | board |
| POST | `/api/missions/reroll` | Bearer + suscripción activa | `{slot}` | board |
| POST | `/api/missions/link-daily` | Bearer + suscripción activa | `{mission_id, task_id(UUID)}` | result |
| POST | `/api/boss/phase2` | Bearer + suscripción activa | `{mission_id, proof(min 8)}` | boss/result |
| POST | `/api/missions/heartbeat` | Bearer + suscripción activa | `{missionId}` o `{mission_id}` | heartbeat |
| POST | `/api/missions/:id/claim` | Bearer + suscripción activa | header `x-missions-claim-source` o `referer` esperado | rewards/board |
| POST | `/api/missions/activate` | Bearer + suscripción activa | `{slot, proposal_id}` | board/stub |
| POST | `/api/missions/abandon` | Bearer + suscripción activa | `{slot, mission_id}` | board/stub |
| POST | `/api/missions/auto/weekly` | Bearer + suscripción activa | - | board |
| POST | `/api/missions/auto/boss` | Bearer + suscripción activa | - | board |

## 4.8 Onboarding

| Método | Ruta | Auth | Body/Query | Respuestas |
|---|---|---|---|---|
| POST | `/api/onboarding/intro` | Bearer | schema `onboardingIntroSchema` (incluye `meta.user_id`) | `{ok,session_id,awarded,...}` |
| GET | `/api/onboarding/progress` | Bearer | - | `{ok,progress}` |
| POST | `/api/onboarding/progress/mark` | Bearer | `{step,onboarding_session_id?,source?}` | `{ok,progress}` |
| POST | `/api/onboarding/progress/reconcile-client` | Bearer | `{flags:{step:boolean}}` | `{ok,progress}` |
| GET | `/api/onboarding/generation-status` | Bearer | - | `{ok,state,...}` |
| POST | `/api/onboarding/journey-ready-modal/seen` | Bearer | `{generation_key}` | `{ok,seen_at}` |
| GET | `/api/debug/onboarding/last` | Bearer | - | debug (bloqueado en prod) |

## 4.9 Game mode

| Método | Ruta | Auth | Body | Respuestas |
|---|---|---|---|---|
| GET | `/api/game-mode/upgrade-suggestion` | Bearer | - | suggestion |
| POST | `/api/game-mode/upgrade-suggestion/accept` | Bearer + suscripción activa | - | `{ok,suggestion,...}` |
| POST | `/api/game-mode/upgrade-suggestion/dismiss` | Bearer | - | `{ok,suggestion}` |
| POST | `/api/game-mode/change` | Bearer | `{mode}` | `{ok,user}` |

## 4.10 Moderation

| Método | Ruta | Auth | Body | Respuestas |
|---|---|---|---|---|
| GET | `/api/moderation` | Bearer | - | moderation state |
| PUT | `/api/moderation/:type/status` | Bearer | `{dayKey,status}` | updated state |
| PUT | `/api/moderation/:type/config` | Bearer | `{isEnabled?,isPaused?,notLoggedToleranceDays?}` | updated state |

## 4.11 Feedback in-app

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/api/feedback/in-app` | Bearer | devuelve configuración/estado de feedback in-app |

## 4.12 Catalogs

| Método | Ruta | Auth | Query |
|---|---|---|---|
| GET | `/api/catalog/pillars` | Bearer | - |
| GET | `/api/catalog/traits` | Bearer | `pillar_id?` |
| GET | `/api/catalog/stats` | Bearer | `trait_id?` |
| GET | `/api/catalog/difficulty` | Bearer | `game_mode_id?` |

## 4.13 Billing

Todas con `authMiddleware`.

- GET `/api/billing/plans`
- GET `/api/billing/subscription`
- POST `/api/billing/subscribe`
- POST `/api/billing/change-plan`
- POST `/api/billing/cancel`
- POST `/api/billing/reactivate`
- POST `/api/billing/checkout-session`
- POST `/api/billing/portal-session`

**Auth adicional:** depende de proveedor (`mock`/`stripe`) y configuración env.

## 4.14 Admin (interno/privilegiado)

Prefijo `/api/admin/*`, con `authMiddleware + requireAdmin`.

- GET `/api/admin/me`
- GET `/api/admin/users`
- GET `/api/admin/users/:userId/insights`
- GET `/api/admin/users/:userId/logs`
- GET `/api/admin/users/:userId/logs.csv`
- GET `/api/admin/users/:userId/tasks`
- PATCH `/api/admin/users/:userId/tasks/:taskId`
- GET `/api/admin/users/:userId/task-stats`
- GET `/api/admin/users/:userId/taskgen/latest`
- POST `/api/admin/users/:userId/daily-reminder/send`
- POST `/api/admin/users/:userId/tasks-ready/send`
- GET `/api/admin/users/:userId/subscription`
- PUT `/api/admin/users/:userId/subscription`
- POST `/api/admin/subscription-notifications/run`
- GET `/api/admin/taskgen/jobs`
- GET `/api/admin/taskgen/jobs/:jobId/logs`
- POST `/api/admin/taskgen/jobs/:jobId/retry`
- GET `/api/admin/taskgen/trace`
- GET `/api/admin/taskgen/trace/by-correlation/:id`
- GET `/api/admin/taskgen/trace/global`
- POST `/api/admin/taskgen/force-run`
- POST `/api/admin/task-difficulty-calibration/run`
- POST `/api/admin/mode-upgrade-aggregation/run`
- POST `/api/admin/user/:userId/run-monthly-review`
- GET `/api/admin/user/:userId/mode-upgrade-analysis`
- POST `/api/admin/user/:userId/mode-upgrade-analysis/run`
- GET `/api/admin/user/:userId/mode-upgrade-cta-override`
- PUT `/api/admin/user/:userId/mode-upgrade-cta-override`
- DELETE `/api/admin/user/:userId/mode-upgrade-cta-override`
- POST `/api/admin/user/:userId/game-mode`
- GET `/api/admin/feedback/definitions`
- PATCH `/api/admin/feedback/definitions/:id`
- GET `/api/admin/feedback/users/:userId/state`
- PATCH `/api/admin/feedback/users/:userId/state`
- GET `/api/admin/feedback/users/:userId/history`

## 4.15 Internos (cron)

Todos requieren header `x-cron-secret` == `CRON_SECRET`.

- POST `/api/internal/cron/daily-reminders`
- POST `/api/internal/cron/subscription-notifications`
- POST `/api/internal/cron/weekly-wrapped`
- POST `/api/internal/cron/monthly-task-difficulty` (query opcional `backfill=1`)

## 4.16 Webhooks

| Método | Ruta | Auth/seguridad | Notas |
|---|---|---|---|
| GET | `/api/webhooks/clerk/health` | No | health de webhook |
| POST | `/api/webhooks/clerk` | Svix headers + firma con `CLERK_WEBHOOK_SECRET`; rate limit | procesa `user.created/updated/deleted` |
| POST | `/api/webhooks/stripe` | `stripe-signature` + validación provider | eventos billing |

---

## 5) Qué necesito para Postman

## Base URLs sugeridas
- Local API: `http://localhost:8080/api` (o puerto definido por `PORT`).
- Railway API (según repo): `https://innerbloom-api.up.railway.app/api`.

## Variables de entorno Postman sugeridas
- `baseUrl`
- `bearerToken`
- `userId`
- `taskId`
- `missionId`
- `cronSecret`
- `adminUserId`
- `stripeSignature` (si simulás webhook)
- `svixId`, `svixTimestamp`, `svixSignature` (webhook Clerk)

## Headers comunes
- `Authorization: Bearer {{bearerToken}}` (la mayoría de rutas privadas)
- `Content-Type: application/json`
- `x-cron-secret: {{cronSecret}}` (cron internos)
- `x-missions-claim-source: /dashboard-v3/missions-v2` (claim mission)

## Endpoints complejos para Postman
- Webhooks (`/webhooks/clerk`, `/webhooks/stripe`): requieren firma real.
- Algunos flujos dependen de estado previo (suscripción activa, datos existentes de task/mission, onboarding generado).
- `ownUserGuard`: para `/users/:id/*`, el `:id` debe coincidir con el usuario del token.

## Orden sugerido de prueba
1. `GET /api/_health`
2. `GET /api/users/me`
3. `GET /api/users/me/subscription`
4. `GET /api/catalog/*`
5. `GET /api/onboarding/progress`
6. `GET /api/daily-quest/definition` → `POST /api/daily-quest/submit`
7. `GET /api/missions/board` + acciones mission
8. `GET /api/tasks/:taskId/insights`
9. `GET /api/moderation`
10. Billing/admin/internal según permisos

---

## 6) Gaps o dudas encontradas

- No existe contrato OpenAPI oficial.
- Varios endpoints devuelven payloads complejos desde servicios/handlers; para algunos campos detallados se requiere ejecutar entorno con DB semilla.
- Endpoints legacy (`/tasks`, `/task-logs`, `/tasks/complete`) existen pero algunos responden `501`.
- Hay alias de rutas sin `/api`; **no confirmado** si todos clientes externos deberían usarlos.
- En missions hay comportamiento condicionado por feature flag `FEATURE_MISSIONS_V2`.

---

## 7) Siguiente paso recomendado

1. Mantener este relevamiento como snapshot técnico.
2. Convertir gradualmente a OpenAPI (aunque sea parcial por dominios).
3. Añadir tests contractuales por endpoint crítico (auth, onboarding, daily quest, missions, billing, webhooks).
4. Versionar una colección Postman “living” ligada al código.

---

## Propuesta de estructura de colección Postman

- 00 Health
- 01 Auth & Me
- 02 User Dashboard (`/users/:id/*`)
- 03 Onboarding
- 04 Daily Quest
- 05 Missions
- 06 Tasks Insights
- 07 Moderation
- 08 Catalog
- 09 Billing
- 10 Admin
- 11 Internal Cron
- 12 Webhooks

## Top 10 endpoints para empezar a entender Innerbloom

1. `GET /api/users/me`
2. `GET /api/users/:id/summary/today`
3. `GET /api/users/:id/tasks`
4. `GET /api/daily-quest/definition`
5. `POST /api/daily-quest/submit`
6. `GET /api/missions/board`
7. `POST /api/missions/select`
8. `GET /api/onboarding/progress`
9. `GET /api/tasks/:taskId/insights`
10. `GET /api/game-mode/upgrade-suggestion`


# Informe de Cumplimiento: JWT + UUID interno

## Alcance
Este informe cubre todos los endpoints privados expuestos bajo `apps/api/src/routes/users.ts`, incluyendo `/users/me` y cada ruta anidada bajo `/users/:id/**`.

## Tabla de control de accesos
| Método | Path | authMiddleware | ownUserGuard | Riesgo | Evidencias |
| --- | --- | --- | --- | --- | --- |
| GET | `/users/me` | Sí | N/A | ✅ | `apps/api/src/routes/users.ts:L40` |
| GET | `/users/:id/tasks` | Sí | Sí | ✅ | `apps/api/src/routes/users.ts:L25-L26` + `apps/api/src/routes/users.ts:L41` + `apps/api/src/middlewares/own-user-guard.ts:L5-L25` |
| GET | `/users/:id/xp/daily` | Sí | Sí | ✅ | `apps/api/src/routes/users.ts:L26-L27` + `apps/api/src/routes/users.ts:L41` + `apps/api/src/middlewares/own-user-guard.ts:L5-L25` |
| GET | `/users/:id/xp/total` | Sí | Sí | ✅ | `apps/api/src/routes/users.ts:L27-L28` + `apps/api/src/routes/users.ts:L41` + `apps/api/src/middlewares/own-user-guard.ts:L5-L25` |
| GET | `/users/:id/xp/by-trait` | Sí | Sí | ✅ | `apps/api/src/routes/users.ts:L28-L29` + `apps/api/src/routes/users.ts:L41` + `apps/api/src/middlewares/own-user-guard.ts:L5-L25` |
| GET | `/users/:id/pillars` | Sí | Sí | ✅ | `apps/api/src/routes/users.ts:L29-L30` + `apps/api/src/routes/users.ts:L41` + `apps/api/src/middlewares/own-user-guard.ts:L5-L25` |
| GET | `/users/:id/streaks/panel` | Sí | Sí | ✅ | `apps/api/src/routes/users.ts:L30-L31` + `apps/api/src/routes/users.ts:L41` + `apps/api/src/middlewares/own-user-guard.ts:L5-L25` |
| GET | `/users/:id/level` | Sí | Sí | ✅ | `apps/api/src/routes/users.ts:L31-L32` + `apps/api/src/routes/users.ts:L41` + `apps/api/src/middlewares/own-user-guard.ts:L5-L25` |
| GET | `/users/:id/achievements` | Sí | Sí | ✅ | `apps/api/src/routes/users.ts:L32-L33` + `apps/api/src/routes/users.ts:L41` + `apps/api/src/middlewares/own-user-guard.ts:L5-L25` |
| GET | `/users/:id/daily-energy` | Sí | Sí | ✅ | `apps/api/src/routes/users.ts:L33-L34` + `apps/api/src/routes/users.ts:L41` + `apps/api/src/middlewares/own-user-guard.ts:L5-L25` |
| GET | `/users/:id/journey` | Sí | Sí | ✅ | `apps/api/src/routes/users.ts:L34-L35` + `apps/api/src/routes/users.ts:L41` + `apps/api/src/middlewares/own-user-guard.ts:L5-L25` |
| GET | `/users/:id/emotions` | Sí | Sí | ✅ | `apps/api/src/routes/users.ts:L35-L36` + `apps/api/src/routes/users.ts:L41` + `apps/api/src/middlewares/own-user-guard.ts:L5-L25` |
| GET | `/users/:id/state` | Sí | Sí | ✅ | `apps/api/src/routes/users.ts:L36-L37` + `apps/api/src/routes/users.ts:L41` + `apps/api/src/middlewares/own-user-guard.ts:L5-L25` |
| GET | `/users/:id/state/timeseries` | Sí | Sí | ✅ | `apps/api/src/routes/users.ts:L37-L38` + `apps/api/src/routes/users.ts:L41` + `apps/api/src/middlewares/own-user-guard.ts:L5-L25` |
| GET | `/users/:id/summary/today` | Sí | Sí | ✅ | `apps/api/src/routes/users.ts:L38-L39` + `apps/api/src/routes/users.ts:L41` + `apps/api/src/middlewares/own-user-guard.ts:L5-L25` |

## Observaciones clave
- **Autenticación JWT obligatoria**: Todas las rutas dependen de `authMiddleware`, que verifica el portador y sólo admite el header legado `X-User-Id` en entornos locales y cuando se habilita explícitamente la bandera de desarrollo (`ALLOW_X_USER_ID_DEV`). En producción, la ruta devuelve `401` si sólo se envía el header legado. `apps/api/src/middlewares/auth-middleware.ts:L16-L78` `apps/api/src/middlewares/auth-middleware.ts:L45-L78` `apps/api/src/__tests__/users.me.spec.ts:L92-L174`
- **Control de acceso por UUID**: `ownUserGuard` valida que `req.params.id` sea un UUID y que coincida con `req.user.id`, lanzando `403` en caso contrario. `apps/api/src/middlewares/own-user-guard.ts:L5-L25`

## Verificación de pruebas
Se ejecutaron las suites existentes de Vitest para `apps/api`, las cuales cubren:
- `GET /users/me` devuelve `401` sin token y rechaza `X-User-Id` en producción. `apps/api/src/__tests__/users.me.spec.ts:L92-L174`
- Todas las rutas `/users/:id/**` responden `401` cuando falta el Bearer y `403` cuando el `id` no coincide con `req.user.id`. `apps/api/src/__tests__/users.private-routes.spec.ts:L138-L225`

## Parches
No se requieren cambios adicionales: todas las rutas `/users/:id/**` ya montan `authMiddleware` y `ownUserGuard` en bloque. `apps/api/src/routes/users.ts:L22-L41`


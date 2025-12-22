# API del dashboard

Este documento resume los endpoints HTTP disponibles en el backend del dashboard (vistas legacy y V3), indicando método, parámetros relevantes y la estructura de respuesta que espera el frontend.

## Tabla de mapeo funcional

| Elemento en el dashboard | Endpoint | Ejemplo de JSON devuelto |
| --- | --- | --- |
| Header de usuario (nombre y avatar) | `GET /users/me` | <pre><code>{
  "user": {
    "user_id": "45f3c8f5-4cf6-4a54-8d1e-41f2812ac012",
    "full_name": "Alex Green",
    "image_url": "https://images.clerk.dev/user.png",
    "game_mode": "seedling",
    "weekly_target": 4
  }
}</code></pre> |
| Hero "XP today" y quests completadas | `GET /users/:id/summary/today` | <pre><code>{
  "date": "2024-05-27",
  "xp_today": 320,
  "quests": { "total": 6, "completed": 4 }
}</code></pre> |
| Tarjeta "Progreso general" | `GET /users/:id/xp/total` | <pre><code>{
  "total_xp": 18420
}</code></pre> |
| Tarjetas de nivel (nivel actual y XP restante) | `GET /users/:id/level` | <pre><code>{
  "user_id": "45f3c8f5-4cf6-4a54-8d1e-41f2812ac012",
  "current_level": 7,
  "xp_total": 18420,
  "xp_required_current": 15000,
  "xp_required_next": 21000,
  "xp_to_next": 2580,
  "progress_percent": 63
}</code></pre> |
| Gráfica "Daily Cultivation" y cálculo de rachas | `GET /users/:id/xp/daily` | <pre><code>{
  "from": "2024-04-28",
  "to": "2024-05-27",
  "series": [
    { "date": "2024-05-26", "xp_day": 180 },
    { "date": "2024-05-27", "xp_day": 320 }
  ]
}</code></pre> |
| Radar de XP por rasgo | `GET /users/:id/xp/by-trait` | <pre><code>{
  "traits": [
    { "trait": "Body", "xp": 6200 },
    { "trait": "Mind", "xp": 5400 },
    { "trait": "Soul", "xp": 4820 }
  ]
}</code></pre> |
| Tarjeta "Achievements" | `GET /users/:id/achievements` | <pre><code>{
  "user_id": "45f3c8f5-4cf6-4a54-8d1e-41f2812ac012",
  "achievements": [
    {
      "id": "streak_7",
      "name": "Weekly Habit",
      "earned_at": "2024-05-12T09:30:00Z",
      "progress": { "current": 5, "target": 7, "pct": 71 }
    }
  ]
}</code></pre> |
| Tarjeta "Daily Energy" | `GET /users/:id/daily-energy` | <pre><code>{
  "user_id": "45f3c8f5-4cf6-4a54-8d1e-41f2812ac012",
  "hp_pct": 68,
  "mood_pct": 74,
  "focus_pct": 61,
  "hp_norm": 0.68,
  "mood_norm": 0.74,
  "focus_norm": 0.61
}</code></pre> |
| Panel "Missions" (lista de tareas activas) | `GET /users/:id/tasks` | <pre><code>{
  "limit": 20,
  "offset": 0,
  "tasks": [
    {
      "task_id": "b55b0e12-7d2d-4d92-8fb8-2e8a83741234",
      "task": "Morning stretch",
      "pillar_id": "Body",
      "trait_id": "mobility",
      "difficulty_id": "easy",
      "xp_base": 80,
      "active": true
    }
  ]
}</code></pre> |
| Panel de rachas (V3) | `GET /users/:id/streaks/panel` | <pre><code>{
  "topStreaks": [
    { "id": "body", "name": "Body rituals", "stat": "12 días", "weekDone": true, "streakDays": 12 }
  ],
  "tasks": [
    {
      "id": "b55b0e12-7d2d-4d92-8fb8-2e8a83741234",
      "name": "Morning stretch",
      "stat": "4 días",
      "weekDone": true,
      "streakDays": 4,
      "metrics": {
        "week": { "count": 3, "xp": 240 },
        "month": { "count": 11, "xp": 880, "weeks": 4 },
        "qtr": { "count": 30, "xp": 2400, "weeks": 12 }
      }
    }
  ]
}</code></pre> |
| Tarjeta "Emotion Timeline" | `GET /users/:id/emotions` | <pre><code>{
  "user_id": "45f3c8f5-4cf6-4a54-8d1e-41f2812ac012",
  "range": { "from": "2024-04-28", "to": "2024-05-27" },
  "days": [
    { "date": "2024-05-26", "emotion_id": 3, "emotion": "Calma" },
    { "date": "2024-05-27", "emotion_id": 5, "emotion": "Energía" }
  ]
}</code></pre> |
| Banner de journey y recordatorios | `GET /users/:id/journey` | <pre><code>{
  "first_date_log": "2023-11-02",
  "days_of_journey": 180,
  "quantity_daily_logs": 142,
  "first_programmed": "2023-11-05"
}</code></pre> |

## Salud y utilitarios

### `GET /_health`
* **Uso:** chequeo rápido que valida conectividad con Postgres (ejecuta `SELECT 1`).
* **Timeout:** configurable vía `DB_HEALTH_TIMEOUT_MS` (default `2000` ms).
* **Respuesta:** `{ ok: true }` cuando el servicio está operativo y la base responde. Devuelve `503` con código `database_unavailable` si el ping expira o falla.

### `GET /health/db`
* **Uso:** monitoreo de conectividad con Postgres (ejecuta `SELECT 1`).
* **Timeout:** configurable vía `DB_HEALTH_TIMEOUT_MS` (default `2000` ms).
* **Respuesta:** `{ ok: true }` si la consulta se ejecuta correctamente. Devuelve `500` con código `database_unavailable` cuando no puede acceder a la base o el ping expira.

## Catálogos para el editor de tareas

Los catálogos alimentan los selects del editor React (`apps/web/src/lib/api/catalogs.ts`) y están protegidos con el mismo middleware de autenticación JWT que el resto de rutas privadas.

### `GET /catalog/pillars`
* **Uso en frontend:** `fetchCatalogPillars()` obtiene la lista base de pilares antes de renderizar columnas.
* **Autenticación:** `Authorization: Bearer <jwt>` obligatorio.
* **Respuesta:** arreglo de objetos `{ id, pillar_id, code, name, description }` ordenados por `pillar_id`.

### `GET /catalog/traits`
* **Uso en frontend:** `fetchCatalogTraits(pillarId)` carga los rasgos asociados al pilar seleccionado.
* **Parámetros:** `pillar_id` (string) acepta el ID numérico (`"1"`) o el código (`"BODY"`).
* **Autenticación:** `Authorization: Bearer <jwt>` obligatorio.
* **Respuesta:** arreglo de objetos `{ id, trait_id, pillar_id, code, name, description }` filtrados por pilar.

### `GET /catalog/stats`
* **Uso en frontend:** `fetchCatalogStats(traitId)` muestra las métricas disponibles para el rasgo activo.
* **Parámetros:** `trait_id` (string) acepta el ID numérico o el código del rasgo.
* **Autenticación:** `Authorization: Bearer <jwt>` obligatorio.
* **Respuesta:** arreglo de objetos `{ id, stat_id, trait_id, pillar_id, code, name, description, unit }` derivados del catálogo de rasgos.

### `GET /catalog/difficulty`
* **Uso en frontend:** `fetchCatalogDifficulties()` nutre el select de dificultad del editor.
* **Autenticación:** `Authorization: Bearer <jwt>` obligatorio.
* **Respuesta:** arreglo de objetos `{ id, difficulty_id, code, name, description, xp_base }` ordenados por dificultad.

## Autenticación y perfil

### `GET /users/me`
* **Uso en frontend:** el hook `useBackendUser` obtiene el perfil asociado al usuario de Clerk para conocer `user_id`, `game_mode`, `weekly_target` e imagen.
* **Headers:** `Authorization: Bearer <jwt>` obligatorio (token de sesión Clerk). Solo en desarrollo local puede habilitarse temporalmente `ALLOW_X_USER_ID_DEV=true` para aceptar `Authorization: Bearer dev_<token>` con un JWT sin firma.
* **Respuesta:** `{ user: { user_id, clerk_user_id, email_primary, full_name, image_url, game_mode, weekly_target, timezone, locale, created_at, updated_at, deleted_at } }`.

#### Ejemplos `curl`
```bash
# 200 OK: token válido y sesión activa
curl -X GET \
  https://api.innerbloom.dev/users/me \
  -H "Accept: application/json" \
  -H "Authorization: Bearer sk_test_valid_session_jwt"

# 401 Unauthorized: token faltante
curl -X GET \
  https://api.innerbloom.dev/users/me \
  -H "Accept: application/json"

# 403 Forbidden: token válido para usuario sin acceso al dashboard
curl -X GET \
  https://api.innerbloom.dev/users/me \
  -H "Accept: application/json" \
  -H "Authorization: Bearer sk_test_revoked_jwt"
```

## Progreso y XP

### `GET /users/:id/summary/today`
* **Uso:** hero del dashboard legacy (`DashboardPage`) muestra XP del día y quests completadas.
* **Respuesta:** `{ date, xp_today, quests: { total, completed } }`.

#### Ejemplos `curl`
```bash
# 200 OK: UUID propio y token con permisos
curl -X GET \
  "https://api.innerbloom.dev/users/45f3c8f5-4cf6-4a54-8d1e-41f2812ac012/summary/today" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer sk_test_valid_session_jwt"

# 401 Unauthorized: falta el JWT
curl -X GET \
  "https://api.innerbloom.dev/users/45f3c8f5-4cf6-4a54-8d1e-41f2812ac012/summary/today" \
  -H "Accept: application/json"

# 403 Forbidden: el JWT pertenece a otro usuario (no coincide el UUID)
curl -X GET \
  "https://api.innerbloom.dev/users/99999999-9999-4999-8999-999999999999/summary/today" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer sk_test_valid_session_jwt"
```

### `GET /users/:id/xp/total`
* **Uso:** tarjeta "Progreso general" (Dashboard V3) y lógica legacy; muestra el acumulado histórico de XP.
* **Respuesta:** `{ total_xp: number }`.

### `GET /users/:id/level`
* **Uso:** tarjetas de progreso (`MetricHeader`, `LevelCard`). Complementa `/xp/total` para calcular nivel actual y XP faltante.
* **Respuesta:** `{ user_id, current_level, xp_total, xp_required_current, xp_required_next, xp_to_next, progress_percent }`.

### `GET /users/:id/xp/daily`
* **Uso:**
  * Sección "Daily Cultivation" (tendencia mensual de XP).
  * Panel de rachas (Legacy y V3) y cálculo de rachas (`StreakCard`).
* **Parámetros:** `from`, `to` (YYYY-MM-DD). Si no se envían se usa un rango por defecto.
* **Respuesta:** `{ from, to, series: Array<{ date, xp_day }> }`.

### `GET /users/:id/xp/by-trait`
* **Uso:** tarjeta "Radar Chart" distribuye el XP acumulado por rasgo/pilar.
* **Parámetros:** opcionales `from`, `to` para acotar el periodo.
* **Respuesta:** `{ traits: Array<{ trait, xp }> }` (los rasgos sin datos regresan `0`).

### `GET /users/:id/achievements`
* **Uso:** tarjeta legacy "Achievements" muestra hitos desbloqueados y progreso.
* **Respuesta:** `{ user_id, achievements: Array<{ id, name, earned_at, progress: { current, target, pct } }> }`. El backend calcula el progreso con el streak y el nivel actual.

## Energía y estado

### `GET /users/:id/daily-energy`
* **Uso:** tarjeta "Daily Energy" (Dashboard V3) muestra promedios de HP, Mood y Focus.
* **Respuesta:** `{ user_id, hp_pct, mood_pct, focus_pct, hp_norm, mood_norm, focus_norm }`. Si no hay datos devuelve `404`.

### `GET /users/:id/state`
* **Uso previsto:** base para game mode y barras de energía. Se consulta desde utilidades aunque la tarjeta actual usa `/daily-energy`.
* **Respuesta:** `{ date, mode, mode_name?, weekly_target, grace: { applied, unique_days }, pillars: { Body: { hp, xp_today, d, k, H, xp_obj_day }, Mind: { ... }, Soul: { ... } } }`. El campo `mode` refleja el `name` definido en catálogo y el backend expone `mode_name` únicamente cuando proviene de `cat_game_mode` (si falta en catálogo se usa el código heredado).
* **Origen de datos:**
  * `users` aporta `game_mode_id`, `game_mode`, `weekly_target` y `timezone`.
  * `cat_game_mode` se une por `game_mode_id` **o** por `code` para resolver el modo actual, su `name` y el `weekly_target` por defecto.
  * `tasks` (filtradas por `active = TRUE` y `tasks_group_id` del usuario) suministra el `xp_base` agrupado por `pillar_id`.
  * `daily_log` entrega la actividad diaria (`quantity`) que, combinada con `tasks`, se transforma en XP por pilar y día.
* **Implementación:** la ruta vive en [`apps/api/src/routes/users.ts`](../apps/api/src/routes/users.ts) y delega en [`getUserState`](../apps/api/src/controllers/users/get-user-state.ts), que a su vez usa los helpers de [`user-state-service.ts`](../apps/api/src/controllers/users/user-state-service.ts) para ejecutar las consultas SQL y propagar la energía.

### `GET /users/:id/state/timeseries`
* **Uso previsto:** radar histórico de energía (aún no montado en UI V3). Devuelve la energía propagada por día.
* **Parámetros:** `from`, `to` (YYYY-MM-DD) obligatorios.
* **Respuesta:** `Array<{ date, Body, Mind, Soul }>` (lista plana con valores diarios).

## Hábitos, tareas y rachas

### `GET /users/:id/tasks`
* **Uso:**
  * Sección "Missions" (V3) reutiliza las tareas activas.
  * Panel de rachas (legacy y nuevo) utiliza la lista para mostrar métricas por misión.
* **Parámetros:** `limit`, `offset` opcionales (paginación).
* **Respuesta:** `{ limit, offset, tasks: Array<{ task_id, task, pillar_id, trait_id, difficulty_id, xp_base, active }> }`.

### `GET /users/:id/streaks/panel`
* **Uso:** panel de rachas V3 (cuando `VITE_SHOW_STREAKS_PANEL` lo habilita) obtiene `topStreaks` y `tasks` con métricas por rango.
* **Parámetros:** `pillar` (`Body|Mind|Soul`), `range` (`week|month|qtr`), `mode` (tier actual) y `query` opcional.
* **Respuesta:** `{ topStreaks: Array<{ id, name, stat, weekDone, streakDays }>, tasks: Array<{ id, name, stat, weekDone, streakDays, metrics: { week: { count, xp }, month: { count, xp, weeks }, qtr: { count, xp, weeks } } }> }`.

### `GET /users/:id/streaks`
* **Uso:** no existe endpoint dedicado; la tarjeta legacy calcula `current` y `longest` procesando los datos de `/xp/daily` en el cliente.

### `GET /task-logs`
* **Parámetros:** `userId` (UUID) obligatorio, `limit` opcional.
* **Respuesta:** actualmente devuelve `[]`; el backend valida parámetros pero la restauración de logs aún no está implementada.

### `POST /task-logs`
* **Uso:** endpoint legacy pensado para registrar completados.
* **Respuesta:** `501` con `{ code: 'not_implemented' }` (no disponible en la base reseteada).

### `POST /tasks/complete`
* **Uso:** endpoint planificado para cerrar tareas individuales.
* **Respuesta:** `501` con `{ code: 'not_implemented' }` hasta que se conecte la lógica de escritura.

## Pilares y catálogos

### `GET /users/:id/pillars`
* **Uso:** sección legacy "Pillars" muestra métricas dinámicas (`xp`, `xp_week`, `progress_pct`) para el usuario.
* **Respuesta:** `{ user_id, pillars: Array<{ code, xp, xp_week, progress_pct }> }`.

### `GET /pillars`
* **Uso:** complementa la vista legacy con descripciones estáticas globales.
* **Respuesta:** devuelve un arreglo de pilares `{ id, name, description, focusAreas }`. En la versión actual responde `[]`.

## Emociones y journey

### `GET /users/:id/emotions`
* **Uso:** tarjeta "Emotion Timeline" (V3) y heatmap legacy.
* **Parámetros:** `from`, `to` (YYYY-MM-DD) o `days` para derivar el rango.
* **Respuesta:** `{ user_id, range: { from, to }, days: Array<{ date, emotion_id, emotion }> }`. El frontend mapea IDs y códigos a etiquetas (`Calma`, `Felicidad`, etc.).

### `GET /users/:id/journey`
* **Uso:** banner de alertas (V3) decide si mostrar recordatorios de base o scheduler.
* **Respuesta:** `{ first_date_log, days_of_journey, quantity_daily_logs, first_programmed }` (cuando no hay logs los contadores son `0`).

## Social y leaderboard

### `GET /leaderboard`
* **Uso previsto:** rankings sociales (aún no visibles en UI).
* **Respuesta:** `{ limit, offset, users: [] }`. La implementación actual responde una lista vacía.

## Endpoints legacy adicionales

### `GET /tasks`
* **Uso:** endpoints de compatibilidad para herramientas antiguas que consultan tareas pasando `userId` como query string.
* **Respuesta:** `[]` tras validar que el UUID sea correcto.

### `GET /task-logs` (legacy)
* **Uso:** versión MVP previa del módulo de actividad; recibe `userId` como query string.
* **Respuesta:** `[]` una vez validado el parámetro. El historial completo no está habilitado en la base reseteada.

## Tabla de cumplimiento de endpoints finales

| Endpoint | Autenticación requerida | ID esperado | Cumplimiento actual |
| --- | --- | --- | --- |
| `GET /users/me` | `Authorization: Bearer <jwt>` obligatorio | Derivado del JWT → `user_id` interno | ✅ Cumple (auth middleware + validación de sesión) |
| `GET /users/:id/summary/today` | `Authorization: Bearer <jwt>` obligatorio | `:id` debe coincidir con `user_id` del token | ⚠️ Parcial (requiere enforcement de coincidencia) |
| `GET /users/:id/xp/*` (total, daily, by-trait) | `Authorization: Bearer <jwt>` obligatorio | `:id` del propietario autenticado | ⚠️ Parcial (falta middleware global) |
| `GET /users/:id/*` (achievements, level, pillars, daily-energy, emotions, journey, state, streaks/panel) | `Authorization: Bearer <jwt>` obligatorio | `:id` del propietario autenticado | ⚠️ Parcial (validan UUID pero no identidad) |
| Endpoints legacy `/tasks`, `/task-logs`, `/tasks/complete` | Ninguna (solo validan UUID en query/body) | UUID suministrado por el cliente | ❌ No cumplen (sin JWT ni derivación de identidad) |
| Públicos (`/_health`, `/health/db`, `/pillars`, `/leaderboard`) | Ninguna | N/A | ✅ Públicos por diseño |

## Checklist de verificación manual

1. Abrir el dashboard autenticado y confirmar en DevTools → Network que todas las peticiones `GET /users/*` envían `Authorization: Bearer <jwt>`.
2. Repetir `curl` de `/users/me` sin header `Authorization` y validar respuesta `401`.
3. Repetir `curl` de `/users/:id/summary/today` con `:id` ajeno y JWT propio; la API debe responder `403` una vez que se implemente la verificación de identidad.
4. Revisar los logs del backend para comprobar que no se registra el uso de `X-User-Id` ni advertencias de compatibilidad.
5. Ejecutar `ALLOW_X_USER_ID_DEV=true pnpm --filter api dev` en local y asegurar que solo se acepta `Authorization: Bearer dev_<token>` durante pruebas controladas.

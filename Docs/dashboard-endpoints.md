# API del dashboard

Este documento resume los endpoints HTTP disponibles en el backend del dashboard (vistas legacy y V3), indicando método, parámetros relevantes y la estructura de respuesta que espera el frontend.

## Salud y utilitarios

### `GET /_health`
* **Uso:** chequeo rápido para confirmar que la API responde.
* **Respuesta:** `{ ok: true }` cuando el servicio está operativo.

### `GET /health/db`
* **Uso:** monitoreo de conectividad con Postgres (ejecuta `SELECT 1`).
* **Respuesta:** `{ ok: true }` si la consulta se ejecuta correctamente. Devuelve `500` con código `database_unavailable` cuando no puede acceder a la base.

## Autenticación y perfil

### `GET /users/me`
* **Uso en frontend:** el hook `useBackendUser` obtiene el perfil asociado al usuario de Clerk para conocer `user_id`, `game_mode`, `weekly_target` e imagen.
* **Headers:** `X-User-Id` obligatorio con el identificador de Clerk.
* **Respuesta:** `{ user: { user_id, clerk_user_id, email_primary, full_name, image_url, game_mode, weekly_target, timezone, locale, created_at, updated_at } }`.

## Progreso y XP

### `GET /users/:id/summary/today`
* **Uso:** hero del dashboard legacy (`DashboardPage`) muestra XP del día y quests completadas.
* **Respuesta:** `{ date, xp_today, quests: { total, completed } }`.

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
* **Respuesta:** `{ topStreaks: Array<{ id, name, stat, weekDone, streakWeeks }>, tasks: Array<{ id, name, stat, weekDone, streakWeeks, metrics: { week: { count, xp }, month: { count, xp, weeks }, qtr: { count, xp, weeks } } }> }`.

### `GET /users/:id/streaks`
* **Uso:** no existe endpoint dedicado; la tarjeta legacy calcula `current` y `longest` procesando los datos de `/xp/daily` en el cliente.

### `GET /task-logs`
* **Uso:** módulo "Recent Activity" lista las últimas quests completadas.
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

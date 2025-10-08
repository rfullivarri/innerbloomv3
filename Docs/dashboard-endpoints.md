# API del dashboard

Este documento resume los endpoints HTTP que consume el dashboard web (versiones legacy y V3), con el método, los parámetros relevantes y un resumen del payload que espera cada vista.

## Autenticación y perfil

### `GET /users/me`
* **Uso en frontend:** `useBackendUser` solicita el perfil asociado al usuario de Clerk para obtener el `user_id` interno, modo de juego y target semanal.
* **Headers:** `X-User-Id` con el identificador de Clerk.
* **Respuesta principal:** objeto `user` con campos como `user_id`, `game_mode`, `weekly_target`, `full_name`, `image_url` y metadatos (`created_at`, `updated_at`).

## Progreso y XP

### `GET /users/:id/xp/total`
* **Uso:** Tarjeta "Progreso general" (Dashboard V3) y lógica de nivel legacy, para mostrar el acumulado histórico de XP.
* **Respuesta:** `{ total_xp: number }`.

### `GET /users/:id/level`
* **Uso:** Tarjetas de progreso (Metric Header y Level Card). Se combina con `/xp/total` para renderizar nivel actual, porcentaje al siguiente nivel y XP faltante.
* **Respuesta:** `{ current_level, xp_total, xp_required_current, xp_required_next, xp_to_next, progress_percent }`.

### `GET /users/:id/xp/daily`
* **Uso:**
  * Sección "Daily Cultivation" (tendencia mensual de XP).
  * Panel de rachas (cálculo de XP semanal y métricas por tarea).
  * Cálculo de rachas legacy (`getStreaks`) y determinación de rango de fechas.
* **Parámetros:** `from`, `to` (YYYY-MM-DD).
* **Respuesta:** `{ from, to, series: Array<{ date, xp_day }> }`.

### `GET /users/:id/xp/by-trait`
* **Uso:** Tarjeta "Radar Chart" para distribuir XP acumulado por rasgo/pilar.
* **Parámetros:** opcional `from`, `to` para acotar el periodo (no utilizados actualmente).
* **Respuesta:** `{ traits: Array<{ trait, xp }> }`.

## Energía y estado

### `GET /users/:id/daily-energy`
* **Uso:** Tarjeta "Daily Energy" muestra el promedio de HP, Mood y Focus.
* **Respuesta:** `{ hp_pct, mood_pct, focus_pct, hp_norm, mood_norm, focus_norm }`. El frontend usa los porcentajes.
* **Notas:** Si la API responde 404 se interpreta como "sin datos".

### `GET /users/:id/state`
* **Uso previsto:** Estructura base para game mode y barras de energía (se consulta desde utilidades, aunque la tarjeta actual usa `/daily-energy`).
* **Respuesta:** Snapshot con modo (`mode`), objetivo semanal (`weekly_target`), flags de gracia y métricas por pilar (`xp_today`, `xp_obj_day`).

### `GET /users/:id/state/timeseries`
* **Uso previsto:** Radar histórico de energía (aún no montado en UI V3). Devuelve series diarias por pilar.
* **Respuesta:** `{ series: Array<{ date, Body, Mind, Soul }> }`.

## Hábitos, tareas y rachas

### `GET /users/:id/tasks`
* **Uso:**
  * "Missions" (V3) reutiliza las tareas activas.
  * Panel de rachas (legacy y nuevo) toma la lista para presentar métricas por misión.
* **Respuesta:** lista de tareas `{ task_id, task, pillar_id, xp_base, active, ... }`.

### `GET /users/:id/streaks/panel`
* **Uso:** Panel de rachas V3 (cuando la feature flag está activa) obtiene `topStreaks` y `tasks` con métricas por rango.
* **Parámetros:** `pillar` (`Body|Mind|Soul`), `range` (`week|month|qtr`), `mode` (tier actual) y `query` opcional.
* **Respuesta:** `{ topStreaks: Array<{ id, name, stat, weekDone, streakWeeks }>, tasks: Array<{ id, name, metrics: { week, month, qtr } }> }`.

### `GET /users/:id/streaks`
* **Uso:** Tarjeta legacy "Streak" calcula las rachas a partir de los XP diarios (la API todavía no expone un resumen directo).
* **Respuesta derivada:** El frontend procesa el `series` devuelto por `/xp/daily` para computar `current` y `longest`.

### `GET /task-logs`
* **Uso:** Módulo "Recent Activity" lista los últimos completados.
* **Parámetros:** `userId` obligatorio, `limit` opcional.
* **Respuesta:** lista de logs con `id`, `taskId`, `taskTitle`, `completedAt/doneAt`, `xpAwarded`.

## Emociones y journey

### `GET /users/:id/emotions`
* **Uso:**
  * Tarjeta "Emotion Timeline" (V3) y heatmap legacy.
  * Se mapea `emotion_id` → etiqueta legible (`Calma`, `Felicidad`, etc.).
* **Parámetros:** `from`, `to` o `days` (el cliente deriva un rango si solo se pasa `days`).
* **Respuesta:** `{ emotions: Array<{ date, emotion_id }> }`.

### `GET /users/:id/journey`
* **Uso:** Banner de alertas (V3) determina si pedir confirmación de base o activar scheduler.
* **Respuesta:** `{ first_date_log, days_of_journey, quantity_daily_logs }`.

## Catálogos y leaderboard

### `GET /pillars`
* **Uso:** Sección legacy "Pillars" muestra descripción y foco de cada pilar.
* **Respuesta:** `{ pillars: Array<{ id, name, description, score, focusAreas }> }`.

### `GET /leaderboard`
* **Uso previsto:** Rankings sociales (aún no montados en el dashboard actual).
* **Respuesta:** Lista de usuarios con `userId`, `displayName`, `totalXp`, `rank`.


# Inventario de microservicios y endpoints

Este inventario se actualizó usando la configuración de despliegue (`railway.toml`) y los routers registrados en `apps/api`.

## 1) Microservicio `api`

- **Servicio/deploy:** `service.api`.
- **Descripción funcional breve:** backend principal de Innerbloom. Expone endpoints de autenticación vía Clerk, gestión de usuario/tareas, misiones (v1 y v2), billing, onboarding, jobs internos (cron) y webhooks de proveedores.
- **Base URL típica:** `https://<tu-api>`.
- **Prefijo principal:** la mayoría de rutas viven bajo `/api/...` (también se montan sin prefijo por compatibilidad en `app.use(apiRouter)`).

### Endpoints

> Nota: en la tabla se listan con prefijo `/api` para representar el consumo normal desde clientes.

| Feature | Método | Endpoint | Qué hace |
|---|---|---|---|
| Observability / Health | GET | `/api/_health` | Healthcheck general + conectividad DB con timeout. |
| Observability / Health | GET | `/api/health/db` | Healthcheck específico de base de datos. |
| Catalog / Legacy | GET | `/api/pillars` | Endpoint legacy/stub de pilares (retorna arreglo vacío). |
| Tasks Legacy | GET | `/api/tasks` | Endpoint legacy para tareas por query (`userId`). |
| Tasks Legacy | GET | `/api/task-logs` | Endpoint legacy para logs por query (`userId`). |
| Tasks Legacy | POST | `/api/task-logs` | Endpoint legacy para crear log; no implementado (501). |
| Catalog / Taxonomy | GET | `/api/catalog/pillars` | Catálogo de pilares. |
| Catalog / Taxonomy | GET | `/api/catalog/traits` | Catálogo de traits (filtrable por `pillar_id`). |
| Catalog / Taxonomy | GET | `/api/catalog/stats` | Catálogo de stats (filtrable por `trait_id`). |
| Catalog / Taxonomy | GET | `/api/catalog/difficulty` | Catálogo de dificultades. |
| Daily Reminders (Self-Service) | GET | `/api/me/daily-reminder` | Lee configuración de recordatorio diario del usuario actual. |
| Daily Reminders (Self-Service) | PUT | `/api/me/daily-reminder` | Actualiza configuración de recordatorio diario del usuario actual. |
| User Profile / Timezone | PUT | `/api/me/timezone` | Actualiza zona horaria del usuario actual. |
| Daily Cultivation / Task Completion | POST | `/api/tasks/complete` | Registra completado de tareas. |
| Insights / Emotion Chart | GET | `/api/tasks/:taskId/insights` | Devuelve insights/histórico de una tarea. |
| Daily Cultivation / Daily Quest | GET | `/api/daily-quest/definition` | Devuelve definición/config de Daily Quest. |
| Daily Cultivation / Daily Quest | GET | `/api/daily-quest/status` | Devuelve estado actual de Daily Quest del usuario. |
| Daily Cultivation / Daily Quest | POST | `/api/daily-quest/submit` | Envía progreso/resultado de Daily Quest. |
| Missions v1 | GET | `/api/missions/board` | Obtiene tablero de misiones. |
| Missions v1 | GET | `/api/missions/market` | Obtiene estado del mercado de misiones. |
| Missions v1 | POST | `/api/missions/select` | Selecciona misión/propuesta. |
| Missions v1 | POST | `/api/missions/reroll` | Re-roll de propuestas de misión. |
| Missions v1 | POST | `/api/missions/heartbeat` | Marca heartbeat/progreso de misión. |
| Missions v1 | POST | `/api/missions/activate` | Activa una misión. |
| Missions v1 | POST | `/api/missions/abandon` | Abandona misión activa. |
| Missions v1 | POST | `/api/missions/:id/claim` | Reclama recompensa de misión. |
| Missions v1 | POST | `/api/missions/link-daily` | Vincula misión con flujo Daily Quest. |
| Missions v1 | POST | `/api/missions/auto/weekly` | Ejecuta automatización semanal de misiones. |
| Missions v1 | POST | `/api/missions/auto/boss` | Ejecuta automatización de boss. |
| Missions v1 | POST | `/api/boss/phase2` | Resuelve/procesa fase 2 de boss. |
| User Profile | GET | `/api/users/me` | Perfil del usuario autenticado actual. |
| User Progress / Gamification | GET | `/api/users/:id/tasks` | Lista tareas del usuario. |
| User Progress / Gamification | POST | `/api/users/:id/tasks` | Crea tarea del usuario. |
| User Progress / Gamification | PATCH | `/api/users/:id/tasks/:taskId` | Actualiza tarea del usuario. |
| User Progress / Gamification | DELETE | `/api/users/:id/tasks/:taskId` | Elimina/desactiva tarea del usuario. |
| User Progress / Gamification | GET | `/api/users/:id/xp/daily` | XP diaria del usuario. |
| User Progress / Gamification | GET | `/api/users/:id/xp/total` | XP total del usuario. |
| Radar Chart / XP by Trait | GET | `/api/users/:id/xp/by-trait` | XP por trait. |
| User Progress / Gamification | GET | `/api/users/:id/pillars` | Resumen por pilares del usuario. |
| Panel de Streaks | GET | `/api/users/:id/streaks/panel` | Panel de rachas. |
| User Progress / Gamification | GET | `/api/users/:id/level` | Nivel actual de usuario. |
| User Progress / Gamification | GET | `/api/users/:id/achievements` | Logros del usuario. |
| Daily Cultivation / Energy | GET | `/api/users/:id/daily-energy` | Estado de energía diaria. |
| Journey / Progress | GET | `/api/users/:id/journey` | Trayectoria/journey del usuario. |
| Emotion Chart / Mood | GET | `/api/users/:id/emotions` | Métricas/estado emocional del usuario. |
| Radar Chart / User State | GET | `/api/users/:id/state` | Estado agregado de usuario. |
| Radar Chart / State Timeseries | GET | `/api/users/:id/state/timeseries` | Serie temporal del estado del usuario. |
| Daily Cultivation / Summary | GET | `/api/users/:id/summary/today` | Resumen diario (hoy). |
| Weekly Wrapped | GET | `/api/users/:id/weekly-wrapped/latest` | Weekly Wrapped más reciente. |
| Weekly Wrapped | GET | `/api/users/:id/weekly-wrapped/previous` | Weekly Wrapped anterior. |
| Missions v2 / Board | GET | `/api/users/:id/missions/v2/` | Board de misiones v2 para el usuario. |
| Missions v2 / Board | POST | `/api/users/:id/missions/v2/select` | Selecciona misión v2. |
| Missions v2 / Board | POST | `/api/users/:id/missions/v2/reroll` | Re-roll de misión v2. |
| Missions v2 / Board | POST | `/api/users/:id/missions/v2/link-daily` | Vinculación Daily en v2. |
| Missions v2 / Board | POST | `/api/users/:id/missions/v2/submit-evidence` | Envía evidencia/progreso de misión v2. |
| Missions v2 / Board | POST | `/api/users/:id/missions/v2/special-strike` | Acción especial de combate v2. |
| Missions v2 / Board | POST | `/api/users/:id/missions/v2/phase2` | Ejecuta fase 2 en boss v2. |
| Missions v2 / Board | POST | `/api/users/:id/missions/v2/claim` | Reclama recompensa en v2. |
| Missions v2 / Board | POST | `/api/users/:id/missions/v2/future-note` | Registra nota/acción futura en v2. |
| Leaderboard | GET | `/api/leaderboard` | Ranking global/segmentado. |
| Onboarding | POST | `/api/onboarding/intro` | Guarda intro/onboarding y dispara task generation. |
| Debug / Diagnostics | GET | `/api/debug/onboarding/last` | Inspección de último onboarding (debug). |
| Daily Reminders (Cron) | POST | `/api/internal/cron/daily-reminders` | Job interno: envío de recordatorios diarios. |
| Billing Notifications (Cron) | POST | `/api/internal/cron/subscription-notifications` | Job interno: notificaciones de suscripción. |
| Weekly Wrapped (Cron) | POST | `/api/internal/cron/weekly-wrapped` | Job interno: generación/envío weekly wrapped. |
| In-App Feedback | GET | `/api/feedback/in-app` | Define/entrega feedback in-app para el usuario. |
| Billing / Subscription | GET | `/api/billing/plans` | Planes de facturación disponibles. |
| Billing / Subscription | GET | `/api/billing/subscription` | Estado de suscripción actual. |
| Billing / Subscription | POST | `/api/billing/subscribe` | Alta de suscripción. |
| Billing / Subscription | POST | `/api/billing/change-plan` | Cambio de plan activo. |
| Billing / Subscription | POST | `/api/billing/cancel` | Cancelación de suscripción. |
| Billing / Subscription | POST | `/api/billing/reactivate` | Reactivación de suscripción. |
| Billing / Subscription | POST | `/api/billing/checkout-session` | Crea sesión de checkout (Stripe). |
| Billing / Subscription | POST | `/api/billing/portal-session` | Crea sesión de portal de cliente (Stripe). |
| Admin / User Ops | GET | `/api/admin/me` | Perfil admin autenticado. |
| Admin / User Ops | GET | `/api/admin/users` | Listado de usuarios (admin). |
| Admin / User Ops | GET | `/api/admin/users/:userId/insights` | Insights de un usuario. |
| Admin / User Ops | GET | `/api/admin/users/:userId/logs` | Logs de usuario. |
| Admin / User Ops | GET | `/api/admin/users/:userId/logs.csv` | Export CSV de logs de usuario. |
| Admin / User Ops | GET | `/api/admin/users/:userId/tasks` | Tareas de usuario (admin). |
| Admin / User Ops | GET | `/api/admin/users/:userId/task-stats` | Estadísticas de tareas del usuario. |
| Admin / User Ops | PATCH | `/api/admin/users/:userId/tasks/:taskId` | Modifica tarea de usuario (admin). |
| Admin / Daily Reminders | POST | `/api/admin/users/:userId/daily-reminder/send` | Dispara envío manual de reminder. |
| Admin / Tasks Ready Email | POST | `/api/admin/users/:userId/tasks-ready/send` | Dispara email de tasks-ready manual. |
| Admin / Taskgen | GET | `/api/admin/users/:userId/taskgen/latest` | Último resultado de task generation por usuario. |
| Admin / Taskgen | GET | `/api/admin/taskgen/jobs` | Lista jobs de task generation. |
| Admin / Taskgen | GET | `/api/admin/taskgen/jobs/:jobId/logs` | Logs de un job de task generation. |
| Admin / Taskgen | POST | `/api/admin/taskgen/jobs/:jobId/retry` | Reintenta un job de task generation. |
| Admin / Taskgen | GET | `/api/admin/taskgen/trace` | Traza de taskgen por usuario/filtros. |
| Admin / Taskgen | GET | `/api/admin/taskgen/trace/by-correlation/:id` | Traza por correlation id. |
| Admin / Taskgen | GET | `/api/admin/taskgen/trace/global` | Vista global de trazas taskgen. |
| Admin / Taskgen | POST | `/api/admin/taskgen/force-run` | Fuerza ejecución taskgen. |
| Admin / Feedback | GET | `/api/admin/feedback/definitions` | Configuración de definiciones de feedback. |
| Admin / Feedback | PATCH | `/api/admin/feedback/definitions/:id` | Actualiza definición de feedback. |
| Admin / Feedback | GET | `/api/admin/feedback/users/:userId/state` | Estado de feedback por usuario. |
| Admin / Feedback | PATCH | `/api/admin/feedback/users/:userId/state` | Actualiza estado de feedback de usuario. |
| Admin / Feedback | GET | `/api/admin/feedback/users/:userId/history` | Historial de feedback de usuario. |
| Auth / Webhooks (Clerk) | GET | `/api/webhooks/clerk/health` | Health del receptor de webhooks Clerk. |
| Auth / Webhooks (Clerk) | POST | `/api/webhooks/clerk` | Ingesta eventos de Clerk. |
| Billing / Webhooks (Stripe) | POST | `/api/webhooks/stripe` | Ingesta eventos de Stripe. |

---

## 2) Microservicio `web`

- **Servicio/deploy:** `service.web`.
- **Descripción funcional breve:** frontend web (SPA/app cliente) que consume el microservicio `api` vía `VITE_API_BASE_URL`.
- **Endpoints propios:** no expone endpoints REST de negocio en este repositorio; sirve la aplicación web al navegador.


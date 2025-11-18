# Persistencia de la configuración del scheduler diario

Este apunte responde a la duda de dónde se persisten los horarios configurados en el modal de "Scheduler diario" y cómo leerlos/escribirlos desde la API.

## Qué trae hoy la tabla `users`

El `db-snapshot.json` del API sólo refleja tablas que existían al momento de generarlo, por lo que *sí* expone los campos "mínimos" relacionados al scheduler dentro de `users`. Estos son los relevantes:

| Columna | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `scheduler_enabled` | `boolean` | `false` | Flag legacy para encender/apagar el scheduler centralizado. |
| `channel_scheduler` | `text` | `'email'` | Canal que usaba el cron viejo. |
| `hour_scheduler` | `timestamptz` | `NULL` | Timestamp en UTC con la última hora seleccionada. |
| `status_scheduler` | `text` | `'PAUSED'` | Estado textual (PAUSED/ACTIVE). |
| `last_sent_local_date_scheduler` | `date` | `NULL` | Fecha local de la última ejecución enviada. |
| `first_programmed` | `boolean` | `false` | Bandera para onboarding del scheduler. |
| `first_tasks_confirmed` | `boolean` | `false` | Bandera para confirmar tareas iniciales. |

El snapshot también muestra los campos generales (`user_id`, `clerk_user_id`, `timezone`, `email`, etc.) que siguen existiendo para resolver la zona horaria por defecto cuando no hay configuración explícita.【F:apps/api/db-snapshot.json†L1006-L1197】

> Actualizado: desde la sincronización más reciente, cada edición realizada en `/api/me/daily-reminder` replica los valores elegidos en las columnas `scheduler_enabled`, `channel_scheduler`, `hour_scheduler` y `status_scheduler` de `users` para que las lecturas legacy sigan funcionando.【F:apps/api/src/controllers/daily-reminders/current-user-daily-reminder.ts†L16-L113】

## Tabla real que recibe la configuración (`user_daily_reminders`)

La aplicación ya no guarda los nuevos horarios dentro de `users`, sino en la tabla `user_daily_reminders`. Esa tabla se auto-crea en runtime (por eso no figura en el snapshot) y contiene una fila por `user_id` + `channel` con los datos frescos del scheduler.【F:apps/api/src/repositories/user-daily-reminders.repository.ts†L3-L167】

Campos principales:

- `user_daily_reminder_id` (PK)
- `user_id` (FK a `users`)
- `channel` (`email` por ahora)
- `status` (`active`/`paused`)
- `timezone` (TZ efectiva, default `UTC`)
- `local_time` (hora local en formato `HH:mm:ss`)
- `last_sent_at`, `created_at`, `updated_at`

El repositorio expone `createUserDailyReminder`, `updateUserDailyReminder`, `findUserDailyReminderByUserAndChannel` y helpers para que los controladores lean/escriban este registro sin tocar `users`.

## Cómo grabar la info que viene del scheduler (POST/PUT)

El endpoint público para que el frontend persista la configuración es `PUT /api/me/daily-reminder`. Está protegido con `authMiddleware` y usa el controlador `updateCurrentUserDailyReminderSettings`, que valida el payload, normaliza la hora, verifica el huso horario y luego hace `UPSERT` en `user_daily_reminders`.【F:apps/api/src/controllers/daily-reminders/current-user-daily-reminder.ts†L46-L191】

Ejemplo de request:

```bash
curl -X PUT https://<api>/api/me/daily-reminder \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
        "status": "active",
        "local_time": "09:00",
        "timezone": "America/Bogota"
      }'
```

La respuesta siempre retorna la forma serializada del recordatorio, con `enabled`, `local_time`, `timezone`, `last_sent_at` y `delivery_strategy`, por lo que se puede reusar para pintar el modal inmediatamente.

Si necesitás insertar datos manualmente (por ejemplo, desde una migración), hacé un `INSERT`/`UPSERT` en `user_daily_reminders` respetando el índice único `(user_id, channel)` o reutilizá los helpers del repositorio dentro de un script Node.js.

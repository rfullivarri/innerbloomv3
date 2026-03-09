# Monthly Task Difficulty Auto-Calibration

## Cron job mensual

Endpoint interno:

- `POST /internal/cron/monthly-task-difficulty`
- Header requerido: `x-cron-secret: <CRON_SECRET>`

Respuesta incluye:

- `evaluated`
- `adjusted`
- `skipped`
- `ignored`
- `actionBreakdown`
- `errors`

## Admin run manual (on-demand)

Endpoint admin:

- `POST /admin/task-difficulty-calibration/run`

Body:

```json
{
  "userId": "uuid-opcional",
  "window_days": 90,
  "mode": "baseline"
}
```

Notas:

- `userId` es opcional. Si se envía, corre para un solo usuario (modo recomendado para pruebas).
- Si `userId` no se envía, corre para todos los usuarios.
- `window_days` es configurable, default `90`.
- Solo está habilitado `mode = baseline` (1 período).
- Reutiliza exactamente el motor mensual; no hay lógica duplicada.
- Las trazas quedan con `source = admin_run` en `task_difficulty_recalibrations`.
- Deduplicación básica: no vuelve a insertar registros `admin_run` para la misma task en el mismo día.
- Este mecanismo **no marca períodos mensuales como procesados** ni modifica flags del cron mensual.

Respuesta estructurada:

- `scope` (`single_user` | `all_users`)
- `userId`
- `window_days`
- `mode`
- `evaluated`
- `adjusted`
- `skipped`
- `ignored`
- `actionBreakdown` (`up` / `keep` / `down`)
- `errors`

## Backfill retroactivo (one-shot)

Opciones:

1. Cron interno con query flag:
   - `POST /internal/cron/monthly-task-difficulty?backfill=1`
2. Script manual:
   - `npm -w @innerbloom/api run backfill:task-difficulty`

Ambas opciones reutilizan exactamente el mismo motor de recalibración.

## Endpoints para UI futura

- `GET /tasks/:taskId/recalibrations/latest`
- `GET /tasks/:taskId/recalibrations?limit=3`

Ambos endpoints requieren auth y suscripción activa, y solo devuelven datos del dueño de la task.

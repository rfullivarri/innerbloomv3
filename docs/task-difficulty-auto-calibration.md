# Monthly Task Difficulty Auto-Calibration

## Cron job mensual

Endpoint interno:

- `POST /internal/cron/monthly-task-difficulty`
- Header requerido: `x-cron-secret: <CRON_SECRET>`

Respuesta incluye:

- `evaluated`
- `adjusted`
- `skipped`
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

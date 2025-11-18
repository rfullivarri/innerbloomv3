# Daily reminder emails

Este documento resume cómo funcionan los recordatorios diarios por correo, qué dependencias tienen y cómo orquestar el cron en producción.

## Arquitectura

1. **Scheduler externo**: un job (p. ej. Railway Cron) invoca `POST /internal/cron/daily-reminders` y envía la cabecera `X-CRON-SECRET`.
2. **`internal` route** (`apps/api/src/routes/internal.ts`): valida `CRON_SECRET` y ejecuta `runDailyReminderJob(now)`.
3. **Servicio** (`apps/api/src/services/dailyReminderJob.ts`):
   - Lee los recordatorios pendientes con `findPendingEmailReminders(now)`.
   - Construye el contenido del mail usando `Intl.DateTimeFormat` para convertir `now` al huso horario efectivo de cada usuario, mostrar la fecha local y aplicar el layout oscuro de Innerbloom.
   - Envía el mensaje con el proveedor configurado y actualiza `last_sent_at` vía `markRemindersAsSent` sólo para los IDs enviados con éxito.
4. **Repositorio** (`apps/api/src/repositories/user-daily-reminders.repository.ts`): la query `findPendingEmailReminders` convierte `now` a la zona horaria efectiva (`timezone(COALESCE(...), $1)`) y filtra:
   - `timezone(..., now)::time >= local_time` asegura que sólo se retorne el horario ya alcanzado en la franja local.
   - `last_sent_at` debe ser `NULL` o pertenecer a un día anterior en esa misma zona horaria para evitar reenvíos múltiples el mismo día.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `CRON_SECRET` | Secreta compartida entre el scheduler y `POST /internal/cron/daily-reminders`. La ruta responde `401` si el header `X-CRON-SECRET` no coincide. |
| `EMAIL_PROVIDER_NAME` | `console` (default) imprime payloads en logs. `resend` habilita envíos reales. |
| `EMAIL_PROVIDER_API_KEY` | Requerida cuando `EMAIL_PROVIDER_NAME=resend`. API key de Resend. |
| `EMAIL_FROM` | Dirección usada como remitente cuando `EMAIL_PROVIDER_NAME=resend`. Debe usar un dominio verificado en Resend o el sandbox `onboarding@resend.dev` (las direcciones de Gmail/Outlook se rechazan). Ej: `Innerbloom <daily-quest@example.com>`. |
| `DAILY_REMINDER_CTA_URL` | URL personalizada para el botón "Abrir Innerbloom" dentro del mail (default `https://web-dev-dfa2.up.railway.app/dashboard-v3?daily-quest=open`). |

> [!TIP]
> Añade `EMAIL_PROVIDER_NAME=console` en desarrollo para ver el HTML en la terminal y evitar llamadas externas.

## Cron y ventanas horarias

- **Frecuencia recomendada**: ejecuta el cron cada 5 minutos (`*/5 * * * *`). El job es idempotente: aunque se ejecute varias veces por hora, sólo procesará usuarios cuyo horario local ya pasó y cuya fecha local aún no fue marcada en `last_sent_at`.
- **Ventana local vs UTC**: `local_time` se almacena como `TIME` normalizado en UTC. La conversión `timezone(effective_timezone, now)` dentro de la query hace el corrimiento para comparar contra esa hora y determina cuándo liberar cada recordatorio.
- **Reintentos**: si el proveedor de correo falla, el ID queda fuera de la lista enviada y su `last_sent_at` no se actualiza, por lo que volverá a ser considerado en la siguiente corrida.

### Ejemplo Railway Cron

1. En el servicio `apps/api` (o worker equivalente) define `CRON_SECRET` junto a las credenciales del proveedor de correo.
2. Crea un job HTTP con la expresión `*/5 * * * *`, método `POST` y URL `https://<tu-api>.up.railway.app/internal/cron/daily-reminders`.
3. Agrega la cabecera `X-CRON-SECRET: <valor-de-CRON_SECRET>`.
4. Monitorea los logs: la ruta responde JSON con `attempted`, `sent`, `skipped` y `errors` para depurar la corrida.

## Operación y validaciones

- Ejecuta `npm run lint && npm run test` antes de desplegar para cubrir los paths ejercitados por `runDailyReminderJob`.
- En caso de incidencias, revisa `user_daily_reminders.last_sent_at`: si el valor no avanza, revisa las credenciales del proveedor o el estado del cron; si avanza pero el usuario no recibe correos, revisa `email_primary/email` en la tabla de usuarios.
- El endpoint `POST /internal/cron/daily-reminders` puede ejecutarse manualmente con `curl` para reprocesar una ventana puntual:

```bash
curl -X POST \
  -H "X-CRON-SECRET: $CRON_SECRET" \
  https://<tu-api>/internal/cron/daily-reminders
```

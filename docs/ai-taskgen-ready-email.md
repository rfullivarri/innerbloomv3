# Detección de "AI tasks DONE" y envío de email

## 1) Auditoría del pipeline actual
- **Disparo de la generación**: se llama a `triggerTaskGenerationForUser` desde el submit del onboarding (`POST /onboarding/intro`) y desde rutas/admin cuando se reintenta el taskgen. El trigger es async (usa `setImmediate`) y genera un `correlationId` para trazar el run.【F:apps/api/src/routes/onboarding.ts†L16-L38】【F:apps/api/src/services/taskgenTriggerService.ts†L286-L363】
- **Runner + OpenAI**: `runTaskGeneration` arma el contexto, llama al prompt y valida. La implementación real vive en `debugTaskgenService`/`taskgenTriggerService` y emite eventos en memoria (`TRIGGER_RECEIVED`, `RUNNER_STARTED`, `OPENAI_*`, `TASKS_STORED`, `RUNNER_ENDED`).【F:apps/api/src/services/taskgenTriggerService.ts†L207-L352】【F:apps/api/src/services/taskgenTraceService.ts†L1-L93】
- **Persistencia final**: `storeTasksWithIdempotency` inserta en `tasks` dentro de una transacción. Si ya hay tareas activas para el `tasks_group_id` del usuario, aborta y devuelve `reason: 'existing_active_tasks'`; si el payload viene vacío retorna `reason: 'no_tasks'` sin error. Solo cuando inserta >0 tareas hace `COMMIT` y ahora dispara el email de tareas listas.【F:apps/api/src/services/taskgenTriggerService.ts†L100-L196】【F:apps/api/src/services/taskgenTriggerService.ts†L130-L180】
- **Señales existentes para inferir DONE**:
  - **DB**: filas activas en `tasks` asociadas al `tasks_group_id` del usuario (set con default en `users`). No hay columnas de status ni timestamps específicos para generación.【F:apps/api/src/db/schema/users.ts†L5-L33】【F:Docs/database_schema.md†L33-L70】
  - **Eventos en memoria**: `TASKS_STORED` y `RUNNER_ENDED` en `taskgenTraceService` (no persisten al reiniciar el proceso).【F:apps/api/src/services/taskgenTraceService.ts†L1-L93】
  - **Onboarding**: guarda `onboarding_session` y respuestas; no había flag específico de "tareas listas" más allá de `first_tasks_confirmed` (pensado para UI).【F:apps/api/src/services/onboardingIntroService.ts†L150-L230】【F:docs/daily-reminder-persistence.md†L9-L40】

## 2) Estrategias para detectar DONE (pros/cons)
- **Opción A: consulta a `tasks`**
  - Hook: después de onboarding, consultar `COUNT(*) FROM tasks WHERE tasks_group_id = user.tasks_group_id AND active`. Si >0 → DONE.
  - Pros: usa datos existentes; evita cambiar schema.
  - Contras: no distingue runs concurrentes; sin flag idempotente podríamos reenviar mails en reintentos o si se regeneran tareas; depende de que `tasks_group_id` no cambie.
- **Opción B: flag idempotente persistido (implementada)**
  - Hook: al `COMMIT` de la inserción, crear/chequear un registro en `tasks_ready_notifications (user_id, tasks_group_id, sent_at)` y enviar el email solo si se pudo reclamar la fila.
  - Pros: idempotencia fuerte (índice único), tolera reintentos y procesos paralelos; se engancha justo después del commit real; usa el mismo proveedor Resend ya configurado.
  - Contras: agrega una tabla auxiliar (auto-bootstrap) y un paso async más en el flow; si el claim se inserta pero el envío falla, se libera la fila para reintentar.
- **Opción C: listener en eventos de trace**
  - Hook: consumir `RUNNER_ENDED`/`TASKS_STORED` desde algún job o admin endpoint y, al ver `persisted: true`, mandar mail.
  - Pros: no toca DB ni runner.
  - Contras: eventos son in-memory y se pierden al reiniciar; alta probabilidad de perder señales o duplicar si se re-ejecuta el job.

## 3) Recomendación
La más robusta con el stack actual es **Opción B**: se engancha en el commit que ya verifica idempotencia de inserción, agrega un guardado idempotente para el mail y reutiliza Resend. Evita duplicados en reintentos o carreras y no depende de logs efímeros. El claim se borra si el envío falla, así que un retry vuelve a intentar.

## 4) Implementación realizada
- Nuevo repositorio `tasks_ready_notifications` con índice único `(user_id, tasks_group_id)` para reclamar el envío y liberar en caso de error (evita duplicados).【F:apps/api/src/repositories/tasks-ready-notifications.repository.ts†L1-L73】
- Servicio `notifyTasksReadyEmail` que arma el email "Tus tareas ya están listas" usando el proveedor Resend/Console existente; ignora env `test`, valida destinatario y solo envía si el claim es nuevo.【F:apps/api/src/services/tasksReadyEmailService.ts†L1-L96】【F:apps/api/src/services/tasksReadyEmailService.ts†L98-L156】
- Hook en `storeTasksWithIdempotency`: tras insertar tareas, dispara el email en background con contexto (userId, tasksGroupId, correlationId) y loguea errores sin romper el flow principal.【F:apps/api/src/services/taskgenTriggerService.ts†L100-L196】
- El contexto de usuario ahora carga `email`, `first_name`/`last_name` para tener datos de destinatario/alias al construir el mail.【F:apps/api/src/services/debugTaskgenService.ts†L627-L637】

## 5) Cómo testear
- **Caso exitoso**: simular onboarding que genera tareas. Ver en logs `tasks_ready_email` con `status: 'sent'` y que el mail llegue (usar provider `console` en dev para inspeccionar). La tabla `tasks_ready_notifications` debe tener una fila nueva.
- **Retry/Re-ejecución**: re-disparar `triggerTaskGenerationForUser` para el mismo usuario/grupo. Debe registrar `reason: 'already_sent'` y no enviar otro mail.
- **Usuario sin tareas**: si el runner devuelve `reason: 'no_tasks'` o detecta `existing_active_tasks`, no se ejecuta el hook de envío.

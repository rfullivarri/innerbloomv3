# Clerk webhook

- **Ruta pública**: `POST {API_BASE}/api/webhooks/clerk`
- **Variables requeridas**: `CLERK_WEBHOOK_SECRET` (formato `whsec_...`), además de las ya configuradas (`CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `DATABASE_URL`).
- **Cómo probar**:
  1. En el [Dashboard de Clerk](https://dashboard.clerk.com/) ve a **Webhooks** y selecciona el endpoint configurado para la API.
  2. Usa la opción **Send test event → user.created** (y opcionalmente `user.updated` / `user.deleted`).
  3. Verifica en los logs del servidor mensajes similares a `"[clerk] user.created <clerk_user_id>"` y que la respuesta sea `200`.
  4. Confirma en la tabla `users` que la fila correspondiente se insertó/actualizó con el `clerk_user_id` y correo electrónico.
- **Respuestas esperadas**:
  - `200` cuando el evento se procesa correctamente (o cuando falta información no crítica).
  - `400` si la firma Svix es inválida o faltan los headers `svix-id`, `svix-timestamp`, `svix-signature`.
  - `500` para errores inesperados de persistencia o verificación.

Consulta los logs prefijados con `[clerk]` para depurar incidencias.

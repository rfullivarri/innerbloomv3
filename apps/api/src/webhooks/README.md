# Clerk webhook

## Variables requeridas

- `CLERK_WEBHOOK_SECRET` (formato `whsec_...`).
- `DATABASE_URL` con acceso de escritura a Postgres.

> No se utilizan `CLERK_JWT_*` ni el JWKS en este flujo.

## Orden de middlewares

En `src/app.ts` se monta el router con el body **raw** antes del `express.json()` global:

```ts
app.use('/api', clerkWebhookRouter); // usa express.raw({ type: 'application/json' }) en la ruta del webhook
app.use(express.json());
```

Si `express.json()` se ejecuta antes, Svix no podrá verificar la firma.

## Cómo probar desde Clerk

1. En el dashboard de Clerk ve a **Webhooks → Endpoints** y selecciona `https://<web-service>/api/webhooks/clerk`.
2. Confirma que `GET /api/webhooks/clerk/health` responde `{ ok: true }`.
3. Usa **Send test event** con `user.created`, `user.updated` y `user.deleted`.
4. Verifica que Clerk muestre `Succeeded` y que los logs del backend tengan entradas como:
   ```
   [clerk-webhook] user.created user_123
   ```
4. Si necesitas depurar, en Railway ejecuta `railway logs --service web-service` y busca el prefijo `[clerk-webhook]`.

## Respuestas esperadas

- `200` cuando el evento se procesa (aunque no haya cambios, el handler es idempotente).
- `400` con `{ code: 'invalid_payload' }` o `{ code: 'invalid_signature' }` si falla la verificación Svix o el cuerpo es inválido.
- `500` únicamente para errores inesperados al persistir o verificar el evento.

La sincronización escribe/actualiza la fila en `users` usando `clerk_user_id` y marca `deleted_at` al recibir `user.deleted`.

# Daily Quest v1

Esta iteración agrega la experiencia de Daily Quest end-to-end. Incluye nuevas migraciones, endpoints protegidos por Clerk y un modal en el dashboard web con animaciones y control de estado optimista.

## Cómo probarlo en local

1. **Instalá dependencias y aplicá las migraciones**
   ```bash
   pnpm install
   pnpm --filter @innerbloom/api exec drizzle-kit migrate
   ```
   > Las migraciones son idempotentes: crean los índices/foreign keys solo cuando faltan.

2. **Levantá los servicios**
   ```bash
   npm run dev:api
   npm --workspace apps/web run dev
   ```
   Asegurate de configurar `DATABASE_URL`, `CLERK_*` y `VITE_API_BASE_URL` apuntando al backend local.

3. **Autenticación**
   Iniciá sesión con una cuenta Clerk. El modal se abre automáticamente cuando `GET /api/daily-quest/status` devuelve `submitted: false`.

4. **Flujo completo**
   - Completar emociones/tareas en el modal y enviar.
   - Verificar respuesta positiva en el toast y la actualización de XP/streaks.
   - Consultar los endpoints manualmente si querés validar el payload:
     ```bash
     curl -H "Authorization: Bearer <token>" \
       'http://localhost:3000/api/daily-quest/definition?date=2024-03-10'
     ```

5. **Tests automáticos**
   ```bash
   npm --workspace apps/api run test
   npm --workspace apps/web run test
   ```

## Endpoints

- `GET /api/daily-quest/status?date=YYYY-MM-DD`
- `GET /api/daily-quest/definition?date=YYYY-MM-DD`
- `POST /api/daily-quest/submit`

Todos exigen token Clerk y toman la fecha en la zona horaria del usuario si no se envía `date`.

## Notas

- Los logs (`daily_log`, `emotions_logs`) usan upsert para mantener idempotencia.
- El modal está optimizado para mobile (≤390px), con CTA sticky y accesibilidad básica (`aria-modal`, roles y keyboard shortcuts).
- El contador de XP y el “+XP” flotante usan Framer Motion para micro-interacciones.

# Innerbloom AI Pack (oficial)

## Rutas
- `/ai` (HTML público AI-friendly): generado en `apps/web/public/ai/index.html`
- `/ai.json` (JSON estructurado canónico): generado en `apps/web/public/ai.json`
- `/llms.txt` (discovery para LLMs): `apps/web/public/llms.txt`
- `/sitemap.xml` (incluye `/ai` y `/ai.json`): `apps/web/public/sitemap.xml`

## Single Source of Truth (landing OFICIAL)
La fuente única de contenido/copy oficial es:
- `apps/web/src/content/officialLandingContent.ts`

La fuente única de Design Dossier/tokens es:
- `apps/web/src/content/officialDesignTokens.ts`

Desde esas dos fuentes consumen:
1. Landing oficial (`/`): `apps/web/src/pages/Landing.tsx`
2. AI Dossier (`/ai` y `/ai.json`): generado por `apps/web/src/content/aiBuild.ts` usando `apps/web/src/content/aiDossier.ts`

> `/landing-v2` queda explícitamente fuera del flujo de datos del dossier.

## Cómo actualizar (1 solo lugar)
1. Editar copy oficial en `apps/web/src/content/officialLandingContent.ts`.
2. Si cambian tokens visuales reales, editar `apps/web/src/content/officialDesignTokens.ts`.
3. Ejecutar build de web (`pnpm --filter @innerbloom/web build`) o levantar dev (`pnpm --filter @innerbloom/web dev`).

En ambos casos se regeneran automáticamente:
- `apps/web/public/ai/index.html`
- `apps/web/public/ai.json`

## Versioning en `/ai.json`
`/ai.json` incluye:
- `versioning.version`: commit hash corto (o `BUILD_ID` si existe)
- `versioning.lastUpdated`: timestamp ISO de build

Fuente: `apps/web/src/content/aiBuild.ts`.

## Checks rápidos (local)
- `curl -i http://localhost:4173/ai/`
- `curl -i http://localhost:4173/ai.json`
- `curl -i http://localhost:4173/llms.txt`
- `curl -s http://localhost:4173/sitemap.xml`

## Política legal/clean (sin cloaking)
- `/ai` y `/ai.json` son canales públicos oficiales y se sirven como archivos estáticos accesibles sin JavaScript y sin autenticación.
- No hay lógica por `User-Agent` para cambiar el contenido de `/` (home) ni del AI Pack.
- El contenido del AI Pack deriva de la misma fuente oficial que la landing (`officialLandingContent.ts`), por lo que no se está mostrando un mensaje distinto para bots.

## Hardening implementado
- `robots.txt` ahora permite explícitamente: `/ai`, `/ai.json`, `/llms.txt`.
- Se configuraron headers de cache y descubrimiento para AI Pack vía `serve.json`:
  - `Cache-Control` para `/ai`, `/ai.json`, `/llms.txt`.
  - `Content-Type: application/json; charset=utf-8` para `/ai.json`.
  - `X-Robots-Tag: all` para `/ai` y `/ai.json`.
- Se agregaron rate limits razonables en endpoints sensibles de API:
  - `/webhooks/clerk`: 120 req/min por IP.
  - `/internal/cron/*`: 10 req/min por IP.

## Recomendaciones WAF/CDN (infra)
Estas reglas deben aplicarse en CDN/WAF (Cloudflare/Railway edge o equivalente):
1. **Bypass/allowlist AI Pack**: no aplicar challenge JS ni bloqueo por reputación a `GET /ai`, `GET /ai.json`, `GET /llms.txt`.
2. **Rate limits por zona**:
   - Público HTML/estáticos: umbrales altos (ej. 120-300 req/min/IP).
   - Endpoints sensibles (`/api`, `/webhooks`, `/internal`): umbrales bajos + burst control.
3. **Sin UA-based content switching**: prohibir reglas que reescriban `/` según `User-Agent`.
4. **SEO-safe bot handling**: permitir bots legítimos en AI Pack y mantener 200 estable para esos endpoints.

## Checklist de verificación
- [ ] `GET /robots.txt` incluye `Allow: /ai`, `Allow: /ai.json`, `Allow: /llms.txt`.
- [ ] `GET /ai` responde `200` y es legible sin ejecutar JS.
- [ ] `GET /ai.json` responde `200` con `Content-Type: application/json`.
- [ ] `GET /ai` y `GET /ai.json` incluyen `Cache-Control`.
- [ ] `GET /` no cambia contenido por `User-Agent` (comparar dos UAs distintos).
- [ ] Endpoint sensible devuelve `429` al superar límite (prueba controlada).
- [ ] `sitemap.xml` y `llms.txt` apuntan al AI Pack público.

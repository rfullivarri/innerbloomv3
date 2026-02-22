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

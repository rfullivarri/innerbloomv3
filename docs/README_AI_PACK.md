# Innerbloom AI Pack (oficial)

## Rutas creadas
- `/ai` (HTML público AI-friendly): `apps/web/public/ai/index.html`
- `/ai.json` (JSON estructurado canónico): `apps/web/public/ai.json`
- `/llms.txt` (discovery para LLMs): `apps/web/public/llms.txt`
- `/sitemap.xml` (incluye `/ai` y `/ai.json`): `apps/web/public/sitemap.xml`

## Cómo actualizar contenido
1. Editar `apps/web/public/ai.json` (fuente estructurada).
2. Reflejar el mismo cambio textual en `apps/web/public/ai/index.html`.
3. Si cambian rutas, actualizar `apps/web/public/llms.txt` y `apps/web/public/sitemap.xml`.
4. Si hay nuevos tokens visuales en la landing oficial (`/`), actualizar la sección Design Dossier en ambos archivos.

## Cómo validar
### Checks rápidos (local)
- `curl -i http://localhost:4173/ai/`
- `curl -i http://localhost:4173/ai.json`
- `curl -i http://localhost:4173/llms.txt`
- `curl -s http://localhost:4173/sitemap.xml`

### Checklist manual
- `/ai` carga sin depender de JS de React (HTML estático servido desde `public`).
- `/ai` contiene FAQ, features, onboarding, diferenciadores, CTAs y Design Dossier.
- `/ai` contiene JSON-LD válido (`WebSite`, `Organization`, `SoftwareApplication`).
- `/ai.json` incluye versionado y tokens de diseño.
- No hay contenido derivado de `/landing-v2`.

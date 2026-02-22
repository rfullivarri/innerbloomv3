# Plan de entrega — AI Dossier oficial y público (solo landing OFICIAL)

## 1) Alcance

Este plan define cómo entregar un **canal oficial AI/LLM-friendly** para Innerbloom, alineado al 100% con la landing oficial de `https://innerbloomjourney.org` (ruta `/`), **sin alterar la experiencia principal para usuarios humanos**.

Incluye:
- Una página HTML pública orientada a IA (propuesta: `/ai`) con narrativa marketinera basada en contenido real.
- Un endpoint JSON público (propuesta: `/ai.json`) con la misma información en formato estructurado.
- Un **Design Dossier** detallado (paleta, tipografías, estilos UI, gradientes, fondo y tokens existentes).
- Soporte técnico de AI SEO (`llms.txt`, `sitemap`, metadata estructurada con schema.org/JSON-LD).
- Un enfoque de **single source of truth (SSOT)** para evitar doble mantenimiento entre landing y dossier.

## 2) No alcance

- **Fuera de alcance total:** la landing experimental `/landing-v2` y cualquier copy/estructura derivada de ella.
- No se rediseña ni se remaqueta la landing oficial para humanos.
- No se inventan features ni claims no presentes en código/assets/contenido oficial.
- No se define una estrategia de indexación para secciones privadas (dashboard), excepto lo necesario para no mezclarlo con el dossier público.

## 3) Enfoque SSOT (single source of truth)

### Principio
La fuente única debe ser un módulo de contenido estructurado derivado de la landing oficial (`/`) y de los tokens/estilos reales del repo.

### Propuesta
1. **Extraer/centralizar** el contenido canónico de landing en un módulo versionado (ej: `apps/web/src/content/officialLandingDossier.ts`).
2. Hacer que:
   - `Landing.tsx` consuma ese contenido (o una vista del mismo).
   - `/ai` renderice copy AI-friendly **desde la misma fuente**.
   - `/ai.json` serialice la **misma estructura**.
3. Definir un contrato de tipos (`TypeScript`) para validar paridad entre HTML y JSON.
4. Añadir chequeo automático (test/snapshot) que falle si `/ai` o `/ai.json` divergen del contenido oficial.

### Regla editorial
Si falta información:
- inferir solo desde contenido ya existente en landing oficial, assets y docs técnicas actuales;
- cualquier hueco se marca explícitamente como `TODO/placeholder` (no factual) para revisión humana.

## 4) Diseño de entregables

### 4.1 `/ai` (HTML AI-readable)
Debe incluir secciones claras para ingestión por LLM:
- Product summary
- Value proposition
- Audience + problem framing
- Core loop (cómo funciona)
- Features actuales (solo las existentes)
- Modo Body/Mind/Soul + game modes
- FAQs
- Change log / last updated
- Bloque de “source references” interno (origen de datos en repo)

### 4.2 `/ai.json` (estructura canónica)
Estructura sugerida:
- `product`
- `positioning`
- `journey`
- `features`
- `designSystem` (Design Dossier)
- `seo`
- `governance` (fuentes, versión, fecha)

Recomendado: exponer `version`, `lastUpdated`, `sourceCommit` para trazabilidad.

### 4.3 Design Dossier
Debe documentar explícitamente:
- Paleta (hex + rol semántico)
- Tipografías (heading/body + fallback)
- Radius, sombras, spacing base
- Estilos por componente clave (hero, cards, CTA, FAQ, testimonials)
- Gradientes/fondos atmosféricos
- Tokens CSS existentes y mapeo a uso visual

## 5) Archivos a crear/modificar (propuesta)

> Lista objetivo para implementación posterior; puede ajustarse mínimamente según constraints del router/build.

### Web app
- **Crear** `apps/web/src/content/officialLandingDossier.ts` (SSOT de contenido + estructura AI dossier).
- **Modificar** `apps/web/src/pages/Landing.tsx` (leer contenido desde SSOT, manteniendo UI actual).
- **Crear** `apps/web/src/pages/AIDossier.tsx` (ruta `/ai`).
- **Crear** `apps/web/src/pages/AIDossierJson.ts` o handler equivalente (si se resuelve estático, usar `public/ai.json` generado).
- **Modificar** `apps/web/src/App.tsx` (alta de rutas `/ai` y `/ai.json`).
- **Crear** `apps/web/src/lib/aiSeo.ts` (helpers JSON-LD/metadata si aplica).

### SEO / estáticos
- **Crear** `apps/web/public/llms.txt`.
- **Crear o modificar** `apps/web/public/sitemap.xml` para incluir `/ai` y `/ai.json` (sin mezclar `/landing-v2` como fuente del dossier).
- **Crear o modificar** metadata estructurada (JSON-LD) inyectada en `/ai` y opcionalmente en `/` si corresponde.

### Calidad
- **Crear** tests de paridad contenido (ej: `apps/web/src/pages/__tests__/ai-dossier-parity.test.tsx`).
- **Crear** validación de esquema JSON (runtime o test).

## 6) Riesgos y mitigaciones

1. **Riesgo SEO/Cloaking**: que buscadores interpreten `/ai` como contenido distinto para bots.
   - Mitigación: mantener consistencia semántica total con `/` y declarar `/ai` como documento complementario oficial, no sustituto.

2. **Doble mantenimiento**: landing y dossier divergen con el tiempo.
   - Mitigación: SSOT único + tests de paridad + checklist en PR.

3. **Deriva de contenido (“feature drift”)**.
   - Mitigación: prohibición explícita de claims no presentes en fuente canónica; placeholders etiquetados.

4. **Riesgo de rutas/hosting** para servir `/ai.json` en SPA.
   - Mitigación: decidir temprano si se publica como asset estático generado o ruta servida por app.

5. **Internacionalización parcial** (ES/EN) inconsistente entre outputs.
   - Mitigación: definir contrato bilingüe desde el SSOT y testear completitud de ambos idiomas.

## 7) Criterios de aceptación testables

1. **Alineación de contenido oficial**
   - Verificación: checklist de mapeo 1:1 entre bloques de `Landing.tsx` oficial y secciones de `/ai` + `/ai.json`.
   - Resultado esperado: 0 features inventadas; todo claim rastreable a fuente.

2. **Paridad HTML/JSON**
   - Verificación: test automático que compare keys y texto base entre `/ai` y `/ai.json`.
   - Resultado esperado: mismo contenido semántico en ambos outputs.

3. **Exclusión de landing-v2**
   - Verificación: búsqueda en código/tests para asegurar que `/landing-v2` no sea source del dossier.
   - Resultado esperado: sin dependencias ni imports desde `LandingV2` para dossier.

4. **Design Dossier completo**
   - Verificación: checklist con campos obligatorios (paleta, tipografías, radius, sombras, spacing, gradientes, fondo, tokens).
   - Resultado esperado: 100% campos completos o placeholder explícito.

5. **AI SEO operativo**
   - Verificación:
     - `GET /llms.txt` responde 200.
     - `GET /sitemap.xml` incluye `/ai` y `/ai.json`.
     - `/ai` contiene JSON-LD válido.
   - Resultado esperado: artefactos accesibles y parseables.

6. **No impacto UX humana**
   - Verificación: smoke test visual/funcional de `/` antes y después.
   - Resultado esperado: sin cambios perceptibles en la landing principal.

## 8) Secuencia de implementación recomendada (futura)

1. Consolidar SSOT de contenido oficial.
2. Conectar landing oficial al SSOT sin cambios de UI.
3. Publicar `/ai` con copy AI-friendly.
4. Publicar `/ai.json` desde misma fuente.
5. Agregar Design Dossier al JSON y HTML.
6. Integrar `llms.txt`, sitemap y JSON-LD.
7. Añadir tests de paridad + validaciones SEO.
8. Ejecutar checklist final de aceptación.

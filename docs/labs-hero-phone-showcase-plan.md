# Innerbloom Labs · Hero Phone Showcase (Audit + Implementation Plan)

Fecha: 2026-04-23

## Diagnóstico breve

- El hero actual de la landing principal usa una ilustración estática (`/nene.png`) dentro de `hero-media`, con animación de flotación suave. Esto hoy comunica mood, pero no producto real.  
- Ya existen rutas demo públicas que muestran producto real sin login:
  - Dashboard: `/demo`
  - Logros: `/demo/logros`
  - Tasks editor: `/demo/tasks`
- En Labs ya existe infraestructura para experimentos aislados (`/labs`, `/labs/landing-rhythm-section`, `/labs/logros`, `/labs/tasks-demo`).
- Hay componentes reales reutilizables para Logros (`RewardsSection`) y Task Editor (`TaskEditorPage publicDemo`), además de assets reales de sellos (`/public/sellos`).

## Arquitectura propuesta (en /labs)

### Ruta de experimento

- Crear una nueva ruta: `/labs/landing-hero-phone-showcase`.
- Crear una página de experimento con dos columnas (copy + visual) para comparar narrativa del hero actual vs. visual “producto en móvil”.

### Composición del Phone Showcase

Recomendación: **mezcla de compositing + snapshots controlados**.

1) **Marco de teléfono + motion shell (React + CSS/Framer Motion)**
- Componente `PhoneShowcaseFrame` con:
  - bezel/notch premium sobrio,
  - viewport con overflow oculto,
  - timing loop controlado,
  - fallback `prefers-reduced-motion`.

2) **Escenas con fuentes reales del producto (snapshot-like, controladas)**
- En vez de montar todo el árbol runtime del dashboard/editor dentro del hero (costoso y frágil), usar mini-escenas derivadas de estructura y estilos reales:
  - Dashboard dark (cards y layout fieles).
  - Carrusel/strip de logros con sellos reales.
  - Task editor panel + modal crear tarea + bloque AI generating/suggestion.
- Estas escenas deben reusar:
  - tokens/estética oficial,
  - textos y patrones visuales existentes,
  - assets reales (sellos, avatar si aplica).

3) **Timeline de animación del loop (8 etapas)**
- Etapa A: Dashboard visible.
- Etapa B: scroll vertical corto del dashboard.
- Etapa C: transición horizontal a Logros.
- Etapa D: micro-movimiento de 2–3 seals.
- Etapa E: transición horizontal a Task Editor.
- Etapa F: apertura modal crear tarea.
- Etapa G: simulación AI task creation (thinking → suggestion/listo).
- Etapa H: transición suave de vuelta a Dashboard.

### Estrategia de rendering

- Contenedor principal animado por `transform: translate3d(...)` y `opacity` (evitar propiedades caras).
- Duraciones suaves (sin easing agresivo): 450–900ms por transición + pausas cortas.
- Un único loop de estado (state machine simple) para mantenibilidad.
- Mobile-first:
  - Escala del teléfono por `clamp()`.
  - Desactivar microdetalles en viewport pequeño.

## Fuentes reales identificadas para reuso

- Hero actual landing: `apps/web/src/pages/Landing.tsx`, `apps/web/src/pages/Landing.css`.
- Labs index + patrón de experimento: `apps/web/src/pages/labs/LabsIndexPage.tsx`.
- Demo dashboard real: `apps/web/src/pages/DemoDashboard.tsx`.
- Logros real/demo: `apps/web/src/pages/labs/LogrosDemoPage.tsx` + `apps/web/src/components/dashboard-v3/RewardsSection.tsx`.
- Task editor demo (incluye modal y flujo AI guiado): `apps/web/src/pages/editor/index.tsx` + wrapper `apps/web/src/pages/labs/PublicTasksDemoPage.tsx`.
- Assets sellos reales: `apps/web/public/sellos/*`.

## Archivos exactos recomendados para implementar

### Nuevos
- `apps/web/src/pages/labs/LandingHeroPhoneShowcaseLabPage.tsx`
- `apps/web/src/components/labs/heroPhoneShowcase/PhoneShowcaseFrame.tsx`
- `apps/web/src/components/labs/heroPhoneShowcase/PhoneShowcaseScenes.tsx`
- `apps/web/src/components/labs/heroPhoneShowcase/phoneShowcaseTimeline.ts`
- `apps/web/src/components/labs/heroPhoneShowcase/PhoneShowcase.css`

### Cambios mínimos en existentes
- `apps/web/src/App.tsx` (registrar nueva ruta `/labs/landing-hero-phone-showcase`)
- `apps/web/src/pages/labs/LabsIndexPage.tsx` (agregar tarjeta del experimento)

## Riesgos y mitigaciones

1) **Riesgo de sobrecargar el hero** (renderizar componentes completos del dashboard/editor).  
Mitigación: snapshots controlados + subcomponentes livianos.

2) **Fragilidad visual entre breakpoints**.  
Mitigación: reglas responsive específicas para viewport del teléfono + test manual en 3 rangos.

3) **Animación ruidosa/no premium**.  
Mitigación: limitar amplitud y velocidad; transiciones opacas y desplazamientos cortos.

4) **Desalineación de marca** (parecer template genérico).  
Mitigación: usar paleta violeta/azul-violeta oficial + dark mode + assets reales Innerbloom.

## Recomendación final

- Implementar el experimento en **/labs** con una **arquitectura híbrida**:
  - shell animado y orquestación propia,
  - escenas construidas con datos/estilos/assets reales del producto,
  - sin iframes persistentes ni grabaciones.
- Esta vía maximiza credibilidad de producto, controla performance y evita acoplar el hero a lógica pesada del runtime real.

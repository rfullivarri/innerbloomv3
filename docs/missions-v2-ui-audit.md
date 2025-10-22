# Árbol de componentes y rutas

- **Ruta**: `/dashboard-v3/missions-v2` dentro de `<DashboardV3 />`, renderizada vía `<MissionsV2Route />` en el router interno del dashboard (layout con `<Navbar />`, `<MobileBottomNav />` y padding inferior fijo `pb-24`).【F:apps/web/src/pages/DashboardV3.tsx†L134-L203】
- **Contenedor raíz**: `<MissionsV2Board />` envuelve fondo, pétalos decorativos, toasts y dos paneles (`Misiones activas` y `Market`).【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L2950-L3145】【F:apps/web/src/index.css†L287-L338】
- **Toggle de vistas**: `<div class="missions-view-toggle">` con chips/tabs que conmutan `viewMode` y actualizan hash/query.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L2977-L3010】
- **Carrusel de slots activos** (`viewMode==='active'`):
  - Track `<div class="missions-active-carousel__track">` absolutamente posicionado, calcula offsets/traducciones/escala manuales.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3054-L3119】【F:apps/web/src/index.css†L1253-L1276】
  - Item envuelve `<Card>` estilizado (`missions-card missions-active-card`). La carta real se rinde via `renderSlotCard(slot)`.
  - Slots `<Card>` incluyen `MissionProgress`, `MissionPetals`, `MissionPetalsMini`, `MissionHeartbeatStatus` y rail de acciones/CTA principal.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L786-L960】
  - Para slot `main` se agrega `<div class="missions-slot-stack">` que apila panel Boss con controles ↑/↓.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L2860-L2905】
- **Carrusel de market** (`viewMode==='market'`):
  - Track `<div class="missions-market-carousel__track">` y cada `<article class="missions-market-card">` con frente/cara posterior tipo flip; stack interno para propuestas por slot.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3188-L3399】【F:apps/web/src/index.css†L1052-L1184】
  - Controla estados de flip, drag, y scroll vertical de propuestas.
- **Otros componentes clave**: `PetalField` (decorativo), `ToastBanner` (avisos), `ClaimModal`, botones de navegación (`missions-active-carousel__button`, `missions-market-carousel__button`).【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L2954-L3010】【F:apps/web/src/index.css†L1052-L1200】

# Hallazgos por categoría (priorizados)

## Layout / Snap (P0)
- Carruseles dependen de `translate/scale/rotate` para centrar cartas; en 390 px se muestran simultáneamente la carta activa y partes de adyacentes, sin `scroll-snap`, rompiendo foco visual y dificultando lector de pantalla (rotaciones negativas).【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3054-L3119】【F:apps/web/src/index.css†L1253-L1307】
- Las pistas tienen `min-height` ≥ 576 px (activos) y ≥ 648 px (market); sumado a paddings globales provoca doble scroll vertical y tarjetas flotando sin ancla sobre el fold móvil.【F:apps/web/src/index.css†L1086-L1286】
- `missions-active-carousel__card` sólo habilita `pointer-events` en el item activo; al rotar quedan huecos inaccesibles y el stacking boss (↑/↓) queda desplazado respecto del viewport, generando “bleed” lateral constante.【F:apps/web/src/index.css†L1313-L1319】【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L2860-L2905】

## Overflow / Espacio (P0)
- `max-w-xs` (≈320 px) en cartas deja ~35 px por lado en viewport 390 px; al aplicar `translateX(±34%)` la carta activa “sangra” fuera del contenedor y la sombra radial queda recortada.【F:apps/web/src/index.css†L1102-L1112】【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3079-L3098】
- `min-height` con factores `1.8 * 100dvh` causa overflow vertical incluso sin contenido expandido; CTA queda fuera de la zona segura y requiere scroll adicional antes de interactuar.【F:apps/web/src/index.css†L1086-L1263】
- `missions-market-card` define `min-height clamp(360px, calc(100dvh - 140px), 540px)` + `aspect-ratio`; en pantallas bajas corta la cara posterior (stack de propuestas) generando scroll interno vertical y clipping del CTA “Activar”.【F:apps/web/src/index.css†L2034-L2058】【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3337-L3399】

## Jerarquía interna (P1)
- Orden actual: header resumen (hero + chips), progreso, pétalos, detalles, meta, heartbeat, CTA; cuando está colapsado sólo muestra countdown. Falta un bloque resumen intermedio (objetivo + stats) antes de progresos para mobile, rompiendo la secuencia solicitada (header → summary → stats → tags → pétalos → progreso → heartbeat → CTA).【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L806-L960】
- Las chips de requisitos sólo aparecen en modo expandido; al colapsar se pierde contexto de reglas y heartbeat/pétalos quedan sin introducción textual.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L817-L827】

## CTA / Interacción (P0)
- CTA principal es un botón estándar dentro del flujo; no existe contenedor sticky ni barra inferior que respete el `pb-24` del layout. En scroll prolongado el CTA queda oculto detrás de la bottom-nav, especialmente cuando el board crece por overflow vertical.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L931-L949】【F:apps/web/src/pages/DashboardV3.tsx†L134-L203】
- Tap-targets de navegación (`←`, `→`) quedan pegados al borde del carrusel transformado; sin safe-area interior ni indicadores de foco accesibles en mobile (sólo `box-shadow` ligero).【F:apps/web/src/index.css†L1203-L1249】

## Estados / Señales (P1)
- Estados `failed` y `cooldown` sólo cambian chip/overlay; no hay cambio en layout ni copy prominente para mobile (overlay fija `position: absolute` sobre carta, pero sin instrucción/CTA alternativa).【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L2824-L2834】【F:apps/web/src/index.css†L1434-L1449】
- Heartbeat pendiente depende de highlight con animación; sin sticky CTA ni recordatorio textual se percibe como icono decorativo (mini dots en footer) en vista colapsada.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L868-L927】【F:apps/web/src/index.css†L2008-L2046】

## Antipatrones (P0)
- Uso intensivo de `transform: scale()` + `rotate` para dar profundidad tanto en slots como en market (escala base 0.72–0.96) provoca pixelación, texto borroso y dispara reflows al abrir teclado (no usa composición via 3D container).【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3079-L3098】【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3224-L3289】
- Drag manual con `pointercapture` bloquea scroll nativo (`touch-action: pan-x` en track) y requiere gestos largos para avanzar, en conflicto con expectativas de carrusel mobile (debería usar scroll-snap).【F:apps/web/src/index.css†L1052-L1094】【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L2100-L2187】

# Medidas y tokens relevantes

- **Ancho carta activa**: `max-w-xs` ≈ 320 px (`md:max-w-sm` en ≥768 px).【F:apps/web/src/index.css†L1102-L1268】
- **Altura mínima carrusel activo**: `clamp(576px, (100dvh−160px)*1.8, 864px)`; en ≤480 px baja a `clamp(540px, (100dvh−140px)*1.8, 756px)`.【F:apps/web/src/index.css†L1253-L1285】
- **Altura mínima carrusel market**: `clamp(648px, (100dvh−140px)*1.8, 1008px)` con padding vertical 4–6 rems.【F:apps/web/src/index.css†L1086-L1090】
- **Cartas market**: `aspect-ratio 3/4`, `min-height clamp(360px, 100dvh−140px, 540px)`, border-radius 1.1 rem.【F:apps/web/src/index.css†L2034-L2054】
- **Padding interno cartas**: `missions-card__body` usa 1 rem + gaps 0.65–1.25 rem en mobile.【F:apps/web/src/index.css†L461-L494】
- **Safe area global**: layout general entrega `pb-24` (~96 px) para bottom-nav; no hay padding adicional dentro del carrusel o CTA final.【F:apps/web/src/pages/DashboardV3.tsx†L134-L203】
- **z-index destacados**: overlays de stack usan `z-index:5` para fades; cartas en carrusel calculan `zIndex` dinámico (hasta ~120) y halo radial se dibuja con pseudo-elemento `::after`.【F:apps/web/src/index.css†L883-L919】【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3079-L3098】

# Checklist para corrección

- **Reemplazar carruseles por scroll-snap horizontal** — Evita transformaciones y garantiza que sólo una carta esté centrada. Ajustar `missions-active-carousel__track` y `missions-market-carousel__track` en `apps/web/src/index.css` y handlers de `MissionsV2Board.tsx` para usar scroll nativo.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3054-L3336】【F:apps/web/src/index.css†L1086-L1307】
- **Reducir alturas mínimas y adaptar al viewport real** — Sustituir clamps 1.8×dvh por valores relativos al contenido para prevenir overflow vertical. Revisar constantes en `apps/web/src/index.css` (secciones 1086–1286).【F:apps/web/src/index.css†L1086-L1286】
- **Reordenar contenido de la card** — Mover objetivo/resumen y stats (reward, requirements) inmediatamente bajo el header, dejando progreso/pétalos debajo, en `ActiveMissionCard` dentro de `MissionsV2Board.tsx`.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L806-L960】
- **Crear contenedor sticky para CTA principal** — Añadir barra interna con safe-area-bottom y sombra ligera dentro de la card o del carrusel para que el botón no quede bajo la bottom-nav. Cambios en `ActiveMissionCard` + estilos `missions-active-card__cta`.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L931-L949】【F:apps/web/src/index.css†L461-L520】
- **Visibilizar estados críticos** — Incorporar copys y badges visibles para `failed/cooldown/heartbeat pendiente`, posiblemente con banners o chips persistentes en la vista colapsada (`MissionsV2Board.tsx`, `MissionHeartbeatStatus`, `missions-card--frozen`).【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L868-L927】【F:apps/web/src/index.css†L1434-L1449】
- **Normalizar controles Boss stack** — Fijar altura/scroll y ubicar controles dentro del viewport activo sin depender de wheel events (actualizar `missions-slot-stack` en CSS y handlers de `handleSlotStackStep`).【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L2860-L2905】【F:apps/web/src/index.css†L873-L912】

# Riesgos/Dependencias

- Ajustar carruseles afecta telemetría y navegación actual (eventos `missions_v2_market_nav_*` dependen de índice activo); habrá que revisar impactos en `emitMissionsV2Event` y analíticas downstream.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L2100-L2358】
- Scroll-snap y reducción de heights pueden requerir limpiar lógica de `ResizeObserver` y `activeSlotCardHeight`, hoy usada para calcular `--missions-active-carousel-height`.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L2500-L2598】
- Sticky CTAs y safe-areas deben coordinarse con `MobileBottomNav` (pad global `pb-24`) para evitar duplicar espacios en desktop responsive.【F:apps/web/src/pages/DashboardV3.tsx†L134-L203】
- Cualquier cambio visual debe contemplar preferencias `prefersReducedMotion`; hoy existen ramas condicionales que desactivan transformaciones y habilitan scroll-snap sólo en ese modo.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3054-L3336】【F:apps/web/src/index.css†L1114-L1307】

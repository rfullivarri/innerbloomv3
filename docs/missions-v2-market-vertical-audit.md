# Auditoría UX/UI – Carrusel vertical del Market de Misiones (móvil primero)

## Contexto y alcance
- Alcance limitado al carrusel **vertical** de propuestas dentro del Market de Misiones v2. El análisis cubre la cara trasera de cada carta (`missions-market-card__back`) y su stack de propuestas (`missions-market-card__stack`) en vista móvil.
- Se excluyen el carrusel horizontal de slots activos, paneles de recompensas, Daily u otros componentes fuera del Market vertical.

## Árbol de componentes y rutas de archivos involucrados
- `apps/web/src/pages/DashboardV3.tsx`
  - Renderiza `<MissionsV2Board>` dentro del layout del dashboard y aplica `pb-24` al `<main>` para compensar la bottom-nav móvil.
- `apps/web/src/components/dashboard-v3/MissionsV2Board.tsx`
  - Contenedor `div.missions-market-view` con header (`missions-market-view__intro`).
  - `div.missions-market-carousel`
    - `div.missions-market-carousel__controls` con botones prev/next.
    - `div.missions-market-carousel__track` (role `listbox`), donde se montan las cartas.
      - Cada `div.missions-market-carousel__item` aplica transformaciones 3D calculadas inline (`itemStyle`).
        - `<article class="missions-market-card">`
          - Cara frontal `div.missions-market-card__front` (arte del slot).
          - Cara trasera `div.missions-market-card__back` (solo visible al invertir).
            - Encabezado `header.missions-market-card__back-header` con label/emoji/contador.
            - Stack vertical `div.missions-market-card__stack` (`role="group"`).
              - N artículos `<article class="mission-proposal-card">` por propuesta activa/mocked.
                - `header.mpc-header` → índice + título + badges.
                - `p.mpc-summary`.
                - `div.mpc-stats` → reward/difficulty.
                - `div.mpc-tags` (chips opcionales).
                - `ul.mpc-req` (objetivos/requirements).
                - `ul.mpc-meta` (metadata).
                - `button.mpc-cta` CTA principal.
      - `div.missions-market-carousel__status` muestra slot actual fuera del stack.
- Estilos globales: `apps/web/src/index.css` concentra todas las clases `missions-market-*` y `mission-proposal-*`.

## Inventario CSS y layout por componente clave
- `.missions-market-carousel` (`index.css` 1052-1055)
  - Flex columna, `gap: 1.25rem`, `touch-action: pan-x` (afecta gestos verticales en browsers con soporte parcial).
- `.missions-market-carousel__track` (1086-1091, 2057-2060)
  - Flex centrado, `overflow-hidden`, `min-height: clamp(648px, calc((100dvh - 140px) * 1.8), 1008px)` (>=1008px en pantallas 360×800), cursor `grab`, `touch-action: pan-x`.
  - En ≤640px el `min-height` se reduce a `clamp(380px, calc(100dvh - 120px), 640px)` pero sigue dependiendo de `100dvh` sin `env(safe-area-inset-*)`.
  - Cuando `data-dragging="true"` habilita `overflow: visible`; modo `prefers-reduced-motion` fuerza `overflow-x` + `scroll-snap` horizontal.
- `.missions-market-carousel__item` (1102-1112)
  - Posicionamiento absoluto (`left/top 50%`) y transición; ancho `w-full` con `max-w-xs` (≈20rem) en móvil.
  - Transformaciones finales provienen de `itemStyle` inline (`translate/scale/rotate`, `zIndex`) calculadas en TS (3231-3263).
- `.missions-market-card` (2037-2067)
  - Grid, `aspect-ratio: var(--market-card-aspect, 3/4)`, `min-height: clamp(360px, calc(100dvh - 140px), 540px)` y `max-height` móvil `clamp(380px, calc(100dvh - 140px), 620px)`.
  - `transform-style: preserve-3d`, `perspective: 1200px`, `overflow: hidden` → crea stacking context que afecta hijos con overflow (como el stack vertical).
- `.missions-market-card__back` (2148-2155)
  - Flex columna, `justify-content: space-between`, `min-height: 0`, padding clamp 1–1.35rem.
- `.missions-market-card__stack` (2202-2221)
  - Flex columna `flex: 1 1 auto`, `margin-top` clamp, padding adicional abajo.
  - `overflow-y: auto`, `overscroll-behavior: contain`, `touch-action: pan-y`, `scroll-snap-type: y mandatory`, `scroll-padding-top/bottom` para compensar padding.
  - Filtros visuales con `::before/::after` como fades controlados por `data-has-prev/next`.
- `.mission-proposal-card` (2306-2338)
  - Grid, border/shadow, `scroll-snap-align: start`, `scroll-snap-stop: always`.
  - Altura mínima `clamp(200px, 46vh, 240px)` en móvil (`clamp(220px, 34vh, 300px)` ≥768px), dejando cada card muy por debajo del alto útil del stack.
  - Estados `data-active` ajustan `transform: scale` y opacidad.
- Sub-secciones (`mpc-*`, 2345-2551)
  - Paddings y gaps para header, badges, stats, tags, lists y CTA (`.mpc-cta` con padding 0.5–0.7rem × 1–1.3rem, border `rgba(56,189,248,0.4)`).
- Variables/tokens relevantes: `--missions-market-flip-duration`, `var(--motion-duration-*)`, múltiples `clamp()` dependientes de viewport y `100dvh`.

## Handlers y lógica JS que afectan el carrusel vertical
- `handleMarketStackScroll` (1329-1392, TSX)
  - Escucha `onScroll` de `missions-market-card__stack`, actualiza fades (`data-has-prev/next`), calcula proposal activa en función del centro del contenedor y emite analytics.
- `updateMarketStackFade` (1309-1324)
  - Sincroniza `atTop/atBottom` para mostrar overlays.
- `handleMarketProposalStep` (1267-1299) y `handleMarketCardKeyDown` (2378-2416)
  - Permiten navegar propuestas con teclado; cambian `activeMarketProposalBySlot` y animación `data-transition`.
- `handleMarketCardToggle` / `handleMarketCardClick` (2136-2204)
  - Gestionan flip de cartas y aseguran que solo una carta permanezca abierta. Reinician la proposal activa a índice 0 cuando se vuelve a abrir.
- `useEffect` de sincronización (1440-1478)
  - Tras cambiar `activeMarketProposalBySlot`, hace scroll programático del stack (`scrollTo` o `scrollTop`).
- Carousel horizontal (`handleCarouselPointerDown/Move/Up/Leave/Cancel`, 2239-2376)
  - Capturan gestos horizontales en `missions-market-carousel__track`. Se evita capturar si el pointer inicia dentro del stack, pero `touch-action: pan-x` sigue configurado a nivel del track.
- Otros: `stepMarketCarousel` (2020-2052) cierra cartas abiertas al cambiar de slot, `handleMarketCoverLoad` (2420-2435) ajusta aspect ratio dinámico.

## Hallazgos en móvil
### Viewport 360×800
- **Cards visibles:** Altura del stack ≈ carta (≤620px) menos header/paddings ⇒ ~420px útiles. Con `mission-proposal-card` limitado a ≤240px + gap, quedan ~1.7 tarjetas simultáneas visibles y la segunda queda cortada, incumpliendo “1 sola card”.
- **Snap/Centrado:** `scroll-snap-align: start` + `scroll-padding` asimétrico produce anclaje al borde superior, no centrado vertical. El overflow restante deja bleed inferior permanente.
- **Scroll interno vs página:** El track mantiene `touch-action: pan-x`; en iOS Safari (soporte parcial de `pan-y`) y al tocar fuera del stack, el gesto se fuga al scroll de página antes de engancharse al contenedor interno, generando sensación de scroll roto.
- **CTA:** El botón `mpc-cta` viaja dentro de cada artículo; no es sticky ni hay offset adicional, por lo que al llegar al final del stack queda cerca del borde inferior del viewport y puede competir con la bottom-nav fija.
- **Overflow texto:** No hay truncamiento específico para summary/req/meta; cuando hay múltiples chips/listas la card excede los 240px mínimos y fuerza scroll antes de llegar al CTA.
- **Safe areas / 100dvh:** Dependencia de `100dvh` en `min-height` del track y carta sin considerar `env(safe-area-inset-bottom)` → en Safari la barra inferior dinámica provoca saltos en el cálculo de altura y deja espacios muertos.

### Viewport 390×844
- **Cards visibles:** Misma altura máxima (≤620px) → stack útil ~430px. Las propuestas siguen top-aligned, dejando una y media visibles; la animación `translateY` de inactivos deja bordes visibles.
- **Scroll:** El snap obligatorio (`scroll-snap-type: y mandatory`) combinado con `scroll-snap-stop: always` hace que pequeños scrolls reboten al inicio de cada artículo en lugar de permitir micro desplazamientos, agravando la sensación de scroll trabado.
- **CTA y bottom-nav:** El CTA queda a ~24px del borde inferior cuando el artículo es corto; sin safe-area, cualquier incremento de UI (teclado, barra Safari) lo superpone.
- **Jerarquía:** Orden real = Header → Summary → Stats → Tags → Requirements → Metadata → CTA. No hay bloque de pétalos, progreso ni indicador de heartbeat para proposals reales, rompiendo la progresión esperada.

### Viewport 414×896
- **Cards visibles:** Mayor alto disponible pero misma `max-height` → stack ~440px; siguen viéndose dos tarjetas parcialmente. La combinación de `min-height` fijo y `scroll-padding-bottom` deja un gap pronunciado bajo la card activa.
- **Scroll chaining:** Al llegar al final, pese a `overscroll-behavior: contain`, el padding inferior de la carta (≈1.6rem) obliga a tocar el container padre (sin `overflow-y`), traspasando el scroll a la página.
- **CTA:** Los artículos largos requieren múltiples scrolls; al saltar entre propuestas la CTA reaparece desplazada por la animación `scale`, complicando la orientación.
- **Safe area:** Sin ajuste dinámico, el uso de `100dvh` causa cortes cuando Safari colapsa la barra de URL (la carta crece/encoge y el snap recalcula posiciones).

## Problemas priorizados
- **P0 — Stack muestra ≥2 propuestas simultáneas** (`mission-proposal-card`, `.missions-market-card__stack` en `index.css`). Altura mínima de 200–240px y snap al inicio impiden que una sola propuesta ocupe el viewport.
- **P0 — Scroll vertical inconsistente en iOS** (`missions-market-carousel__track` en `index.css`, gestos en `handleCarouselPointer*` de `MissionsV2Board.tsx`). `touch-action: pan-x` + pointer capture y falta de soporte `pan-y` bloquean el desplazamiento interno.
- **P1 — Dependencia rígida de `100dvh`/`calc(* - 140px)`** (`missions-market-carousel__track`, `.missions-market-card`). Genera alturas > viewport y saltos con barras móviles, provocando bleed y necesidad de scroll de página.
- **P1 — CTA no persistente** (`mission-proposal-card` en `MissionsV2Board.tsx` + estilos `.mpc-cta`). No es sticky ni hay contención contra bottom-nav, comprometiendo visibilidad de la acción principal.
- **P2 — Jerarquía de contenido incompleta** (`mission-proposal-card` render en `MissionsV2Board.tsx`). Faltan secciones de pétalos/progreso/heartbeat, desalineando expectativas y marcadores de estado.

## Checklist para corrección (Market vertical)
- [x] Garantizar que solo una `mission-proposal-card` sea visible y centrada en el stack ajustando alturas/snap (`apps/web/src/index.css`, `apps/web/src/components/dashboard-v3/MissionsV2Board.tsx`).
  - Se recalibraron `min-height`, `scroll-snap-align` y paddings del stack/card para forzar una tarjeta por viewport con centrado vertical.
- [x] Revisar gestos para que el scroll vertical no se bloquee permitiendo `pan-y` efectivo y limitando pointer capture (`apps/web/src/index.css`, `MissionsV2Board.tsx`).
  - Se habilitó `touch-action: pan-y pan-x` y se captura el puntero solo al confirmar desplazamiento horizontal.
- [x] Revisar alturas basadas en `100dvh` para adaptar track/carta al viewport y safe-areas móviles (`apps/web/src/index.css`).
  - Nuevos clamps usan offsets reducidos y `env(safe-area-inset-bottom)` en el stack.
- [x] Asegurar visibilidad constante de la CTA sticky dentro del artículo (`apps/web/src/index.css`, `MissionsV2Board.tsx`).
  - El footer interno ahora es `position: sticky` con safe-area y CTA secundaria alineada.
- [x] Reintegrar orden de contenido (pétalos, progreso, heartbeat) dentro de `mission-proposal-card` (`MissionsV2Board.tsx`).
  - Se añadieron pétalos compactos, barra de progreso y estado de heartbeat siguiendo la jerarquía solicitada.


## Hallazgos nuevos en implementación (Market vertical)
- El dataset actual del market no expone una acción secundaria para cada propuesta. Se dejó un botón "Ver detalles" deshabilitado dentro de `mission-proposal-card` como placeholder visual para mantener la jerarquía solicitada hasta que exista la acción real.

## Riesgos y dependencias
- El efecto 3D (`transform: translate/scale/rotate`) en `.missions-market-carousel__item` crea nuevos stacking contexts; cambios a overflow/sticky deben validar que no se rompa la animación.
- `-webkit-overflow-scrolling: touch` puede degradarse si se envuelve el stack en nuevos contenedores; probar específicamente en iOS Safari.
- Listeners globales de carousel (`handleCarouselPointer*`) comparten estado mutable; cualquier ajuste debe resetear `carouselDragStateRef` para evitar swipes fantasmas.
- Rendimiento: animaciones `scale` + sombras (`box-shadow`) sobre múltiples cards pueden impactar FPS en móviles; cualquier aumento de filtros debe perfilarse.

## Criterios de aceptación propuestos
- Una única propuesta visible en el stack vertical, centrada sin bleed arriba/abajo en los viewports 360×800, 390×844 y 414×896.
- Gestos verticales siempre desplazan el contenido interno; la CTA principal permanece visible (o sticky) y no queda oculta por la bottom-nav.
- Al cambiar de propuesta o carta, estados expandido/collapsible se reinician para evitar propuestas parcialmente abiertas.
- Sin overflow horizontal ni cortes de texto; tap targets ≥44px; mantener animaciones a 60 fps en dispositivos móviles de referencia.

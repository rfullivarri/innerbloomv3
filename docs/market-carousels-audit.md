1. Contexto y alcance
Auditoría enfocada exclusivamente en el Market de misiones dentro de `MissionsV2Board` (`apps/web/src/components/dashboard-v3/MissionsV2Board.tsx`). Incluye el carrusel horizontal (H) de cartas con arte que hace flip y, dentro de cada carta, el sub-carrusel vertical (V) de proposals. No se consideran otros carruseles ni vistas.

2. Árbol de componentes y rutas (paths exactos en apps/web)
Carrusel horizontal (H)
- `div.missions-market-view` – contenedor del panel Market. Path: `apps/web/src/components/dashboard-v3/MissionsV2Board.tsx` (render principal).
- `header.missions-market-view__intro` – título/subtítulo del Market.
- `div.missions-market-carousel` – contenedor general del carrusel.
  - `div.missions-market-carousel__controls` – hint + flechas.
  - `div.missions-market-carousel__track` – carrusel horizontal, gestiona drag/snap manual.
    - `div.missions-market-carousel__item` (uno por slot) – wrapper con transformaciones.
      - `article.missions-market-card` – carta con flip.
        - `div.missions-market-card__front` – arte frontal (img `missions-market-card__cover` + chip `missions-market-card__slot-chip`).
        - `div.missions-market-card__back` – cara trasera.
          - `header.missions-market-card__back-header` – título, contador (`missions-market-card__stack-counter`), hint scroll (`missions-market-card__scroll-hint`), icono.
          - `div.missions-market-card__stack` – sub-carrusel vertical (rol group) + overlays `::before/::after`.
            - `article.mission-proposal-card` (uno por proposal) – items del carrusel V.
        - Indicadores externos: `div.missions-market-carousel__status` con slot activo y contador total.
        - Padding/safe areas se controlan vía clases `missions-market-card`/`missions-market-card__stack`.

Sub-carrusel vertical (V)
- `div.missions-market-card__stack` – columna scrollable. Path: `apps/web/src/components/dashboard-v3/MissionsV2Board.tsx`.
  - `article.mission-proposal-card` – tarjeta de proposal.
    - `div.mission-proposal-card__content`
      - `div.mission-proposal-card__body` – bloque scrollable interno.
        - `header.mpc-header` (índice `mpc-index`, bloque `mpc-heading`).
        - `p.mpc-summary` – subtítulo/resumen.
        - `div.mpc-stats` – grid para RECOMPENSA (`mpc-stat--reward`) y DIFICULTAD (`mpc-stat--difficulty`).
        - `ul.mpc-req` / `ul.mpc-meta` – requisitos/metadatos.
        - `div.mpc-tags` – chips.
        - `div.mpc-petals` – pétalos y contador.
        - `div.mpc-meter` + `div.mpc-progress` – progreso.
        - `div.mpc-heartbeat` – indicador heartbeat cuando aplica.
      - `div.mission-proposal-card__footer` – CTAs (`button.mpc-cta`, `button.mpc-cta-secondary`).
  - Controles verticales secundarios (`missions-market-card__stack-controls` + botones) se renderizan condicionalmente para desktop.

Overlay/topbar/bottom-nav relacionados
- `missions-board__panel` (mismo archivo) envuelve el panel Market y aplica spacing vertical general.
- No hay overlay/topbar/bottom-nav específicos dentro del scope; la safe-area inferior se maneja en `missions-market-card__stack` via `--market-stack-safe-area`.

3. Inventario de layout/CSS por componente (valores actuales)
Carrusel horizontal (H)
- `.missions-market-view` (`apps/web/src/index.css`): `display:flex`, `flex-direction:column`, `gap:1.25rem`.
- `.missions-market-carousel`: `flex` column, `touch-action: pan-y pan-x`.
- `.missions-market-carousel__track`: `relative flex`, `w-full`, `items-center`, `justify-center`, `overflow:hidden`, `py:0.75rem (py-3)`, `min-height: clamp(520px, calc(100dvh - 5.5rem), 760px)`, `touch-action: pan-y pan-x`, `cursor: grab`. Con `data-dragging=true` habilita `overflow:visible`. Fallback reduce motion: `overflow-x:auto`, `gap:1.25rem`, `px:1rem`, `scroll-snap-type:x mandatory`, scrollbar personalizado.
- `.missions-market-carousel__item`: `absolute left-1/2 top-1/2`, `flex`, `w-full`, `max-w-xs` (≈320px), `justify-center`, `transition 500ms`. Estado activo ajusta `opacity` y saturación.
- `.missions-market-card`: `display:grid`, `width:100%`, `aspect-ratio: var(--market-card-aspect, 3/4)`, `min-height: clamp(400px, calc(100dvh - 6rem), 640px)`, `border-radius:1.1rem`, `border:1px solid rgba(59,130,246,0.28)`, `transform-style:preserve-3d`, `perspective:1200px`, `overflow:hidden`, `cursor:pointer`.
- `.missions-market-card__front/back`: `padding: clamp(0.85rem,3vw,1.15rem)` (front sobrescribe a 0), `backface-visibility:hidden`, transición `opacity/transform` 520ms.
- Flip: estado `[data-flipped=true]` rota 180° la cara activa; `__back` arranca con `opacity:0`, `transform: rotateY(180deg)`.
- `__slot-chip`: `position:absolute`, `top/left:1rem`, `padding:0.3rem 0.75rem`, `font-size:0.65rem`, `z-index:2`.
- `__stack`: ver sección V (compartido) pero relevante: `overflow-y:auto`, `scroll-snap-type:y mandatory`, `scroll-padding-top:50%`, `scroll-padding-bottom:calc(50% + safe-area)`, `touch-action:pan-y`, `overscroll-behavior:contain`, `-webkit-overflow-scrolling:touch`, `padding-inline` clamp(0.35rem…0.6rem), `padding-block` clamp(0.55rem…0.85rem) + safe-area inferior.
- Indicadores `__status`: `display:flex`, `justify-between`, `padding:0.6rem 0.85rem`, `border-radius:0.9rem`, `background:rgba(15,23,42,0.55)`.

Sub-carrusel vertical (V)
- `.mission-proposal-card`: `display:flex column`, `gap:clamp(0.55rem,2vw,0.75rem)`, `padding:clamp(0.75rem,2.4vw,1rem)`, `border-radius:0.9rem`, `border:1px solid rgba(148,163,184,0.2)`, `background:rgba(15,23,42,0.78)`, `scroll-snap-align:center`, `scroll-snap-stop:always`, `min-height:clamp(360px, calc(100% - 1.5rem), 100%)`, `max-height:calc(100% - 0.25rem)`. Estado inactivo reduce `opacity` y escala a 0.985.
- `.mission-proposal-card__content`: `flex:1`, `display:flex column`, `gap:clamp(0.5rem,1.8vw,0.75rem)`.
- `.mission-proposal-card__body`: `flex:1`, `display:flex column`, `gap:clamp(0.45rem,1.6vw,0.7rem)`, `overflow-y:auto`, `padding-right:0.15rem`, scrollbar fino.
- `header.mpc-header`: `display:flex`, `align-items:flex-start`, `gap` clamp.
- `.mpc-index`: chip cuadrado `~1.5rem`, `font-size` ~0.7rem.
- `.mpc-heading h5`: `font-size clamp(0.8rem,2.4vw,0.9rem)`.
- `.mpc-summary`: `font-size clamp(0.72rem,2.1vw,0.82rem)`, `line-height:1.45`.
- `.mpc-stats`: `display:grid`, `grid-template-columns:repeat(2,1fr)`, `gap` clamp.
  - `.mpc-stat--reward`: fondo gradiente dorado, `box-shadow: 0 18px 32px rgba(251,191,36,0.25)`, pseudo-elemento radial animado.
  - `.mpc-stat--difficulty`: variante neutra con `mpc-stat-label/value` (fuentes ~0.68rem/0.96rem).
- `.mpc-tags`: `flex-wrap`, `gap:0.35rem`, `max-height:~3.2rem`, `overflow:hidden`.
- `.mpc-petals`, `.mpc-meter`, `.mpc-heartbeat`: flex column/row, fuentes 0.62–0.7rem.
- `.mission-proposal-card__footer`: `position:sticky`, `bottom:-safe-area`, `padding-top` clamp(0.6rem…), `padding-bottom` `safe-area + 0.4rem`, `background` gradiente, `gap:0.45rem`.
- `.mpc-cta`: botón principal `padding ≈0.6rem × 1rem`, `border-radius:9999px`, `letter-spacing` amplia (`0.18em–0.22em`).

4. Handlers JS que afectan scroll/flip/expansiones (MissionsV2Board)
- `handleCarouselPointerDown/Move/Up/Leave/Cancel` (líneas ~2242–2381): gestionan drag horizontal manual, determinan umbrales (`MARKET_CAROUSEL_STEP_THRESHOLD_TOUCH/MOUSE`) y previenen scroll nativo; usan pointer capture y flag `hasSwiped`.
- `stepMarketCarousel` (líneas ~2022–2058): ajusta índice activo circularmente, cierra flips abiertos, emite eventos de tracking y ejecuta `scrollCarouselToIndex` en modo reduce motion.
- `handleCarouselStep` (líneas ~2059–2068): wrappers para botones next/prev.
- `handleMarketCardToggle` (líneas ~2138–2186): controla flip; si se toca otra carta, cambia índice y cierra anteriores; resetea proposal activa a 0.
- `handleMarketCardClick` (líneas ~2196–2206): ignora clicks tras drag y delega en toggle.
- `handleMarketCardKeyDown` (líneas ~2392–2426): navegación con teclado (H y V), abre flip con Enter/Espacio, ArrowUp/Down llama a `handleMarketProposalStep`.
- `handleMarketProposalStep` (líneas ~1269–1309): incrementa/decrementa proposal activa para slot; define dirección de transición y tracking.
- `handleMarketStackScroll` (líneas ~1331–1400): en scroll vertical calcula proposal más cercana al centro (usa `scrollTop + clientHeight/2`), actualiza fade y estado activo, dispara tracking.
- `updateMarketStackFade` (líneas ~1311–1329): ajusta flags `data-has-prev/next` para overlays.
- `useEffect` (líneas ~1449–1485): sincroniza scroll del stack con proposal activa (usa `element.scrollTo({top: targetTop})`).
- `handleMarketCoverLoad` (líneas ~2434–2444): fija `--market-card-aspect` según imagen cargada.
- `mission-proposal-card__footer` CTA `onClick` (líneas ~3452–3476): detiene propagación para no cerrar flip y llama `handleActivateProposal` cuando habilitado.

5. Hallazgos MOBILE priorizados (P0, P1, P2)
- P0 – H-01 (cartas cortadas en bordes): el track horizontal usa `overflow:hidden` sin padding lateral ni consideración de safe-area, mientras las cartas aplican sombras y traducciones `translateX` (hasta ±34% en `MissionsV2Board.tsx`). Resultado: bordes/ sombras se recortan y en notch izquierdo/derecho el contenido queda pegado. Solución: agregar `padding-inline` responsive + `scroll-padding-inline`/safe-area y permitir `overflow:visible` mínimo en estado inactivo.
- P0 – H-02 (snap horizontal impreciso): se mezclan dos comportamientos. En modo normal no existe `scroll-snap`; el drag usa umbrales fijos y no reposiciona al liberar (si el usuario suelta antes del threshold se queda medio corrido). En modo reduce motion (`prefersReducedMotion`) sí hay `scroll-snap` pero sin `scroll-padding-inline`, por lo que el último ítem no centra y deja espacio muerto. Debe unificarse con scroll-snap real, `scroll-padding-inline` y fallback consistente.
- P0 – H-03 (flip interrumpe scroll H): durante el flip el contenedor mantiene `overflow:hidden` y eleva `z-index` del ítem activo; si se abre la cara trasera y se intenta arrastrar, `handleCarouselPointerDown` ignora eventos que provienen del stack, pero `missions-market-card` sigue bloqueando `overflow` del track, generando saltos y cortes. Necesario aislar transforms 3D sin interferir con traducción horizontal (usar contenedor separado para rotación o desactivar pointer-events de la cara trasera sobre los bordes).
- P1 – V-01 (scroll interno por densidad): `mission-proposal-card__body` impone `overflow-y:auto` dentro de cada propuesta, activando un scroll secundario incluso cuando toda la tarjeta cabe. Esto aparece desde ~5 bloques (recompensa, dificultad, requisitos, meta, tags) y dispara la barra interna (foto 5). Recomendar retirar overflow interno y delegar al stack principal.
- P1 – V-02 (RECOMPENSA extensa): `mpc-stat--reward` ocupa media fila del grid y añade `box-shadow` + pseudo animado que incrementa altura y genera scroll. Proponer versión compacta 1 fila completa con layout horizontal (label + valor + icono) sin sombra.
- P1 – V-03 (DIFICULTAD chip compacto): actualmente en la misma grilla que recompensa, ocupando 50% del ancho con padding alto. Ubicarla como chip al lado del subtítulo (`mpc-heading`) libera espacio vertical y evita grid extra.
- P1 – V-04 (CTA tapada por bottom-nav): footer sticky suma `padding-bottom: safe-area + 0.4rem`, pero cuando la carta se extiende más de la altura mínima, la CTA queda por debajo y obliga a scroll interno. Necesario compactar contenidos previos (V-02/03) y revisar alturas mínimas para que CTA quede visible sin desplazamiento adicional.
- P1 – V-05 (snap vertical incorrecto): `missions-market-card__stack` usa `scroll-snap-type:y mandatory` combinado con `scroll-padding-top:50%` y los ítems están en `scroll-snap-align:center`. Esto impide que la primera/última proposal llegue al borde superior, dejando espacio muerto. Ajustar a `scroll-padding-top: var(--padding-top)` pequeño y `scroll-snap-align:start`.
- P2 – Otros ajustes: revisar `--market-card-aspect` limites (0.56–0.75) para artes altas, y reducir `min-height` de cartas en viewports < 640px para evitar clipping en pantallas cortas.

6. Reglas de diseño a respetar (mobile-first)
- No usar `transform: scale()`. Ajustar dimensiones reales (width/height, paddings) y reducir contenido interno antes de escalar.
- 1 carta visible por pantalla en el carrusel horizontal; vecinos pueden asomar sin cortar contenido.
- 1 proposal visible por pantalla en el carrusel vertical, sin requerir scroll interno dentro de `mission-proposal-card` salvo emergencia.
- Todo el contenido debe vivir en la cara trasera; evitar overlays externos.
- Priorizar uso de `env(safe-area-inset-*)` para padding y snap.

7. Checklist accionable
Checklist-H (carrusel horizontal)
- Definir padding lateral + safe-area en `.missions-market-carousel__track` y ajustar `scroll-padding-inline`. Cambiar `overflow:hidden` por estrategia que preserve sombras (ej. `overflow:visible` + máscara). Archivos: `apps/web/src/index.css`, `apps/web/src/components/dashboard-v3/MissionsV2Board.tsx` (estilos inline/snap fallback).
- Unificar interacción en scroll-snap nativo (`scroll-snap-type`, `scroll-padding`) con fallback accesible; simplificar handlers `handleCarouselPointer*` para usar desplazamiento real. Archivo: `MissionsV2Board.tsx` (handlers, lógica de umbrales) + estilos en `index.css`.
- Aislar flip 3D dentro de la carta sin bloquear gestos horizontales (crear contenedor rotatorio o suspender pointer capture mientras `data-flipped`). Archivo: `MissionsV2Board.tsx` (toggle) + `index.css` (estructura de capas, `pointer-events`).

Checklist-V (sub-carrusel vertical + card)
- Eliminar `overflow-y:auto` de `.mission-proposal-card__body` y redistribuir contenido para que el stack principal controle el scroll. Archivo: `apps/web/src/index.css`.
- Rediseñar RECOMPENSA como bloque horizontal compacto sin glow; ajustar layout en `mpc-stats`. Archivo: `index.css` (clases `.mpc-stats`, `.mpc-stat--reward`).
- Convertir DIFICULTAD en chip cercano al subtítulo (`mpc-heading`), retirándolo del grid. Archivo: `MissionsV2Board.tsx` (markup) + `index.css` (chip).
- Garantizar CTA siempre visible: revisar `min-height` de `mission-proposal-card`, margen inferior del stack y distribución de bloques para evitar scroll extra. Archivo: `index.css`.
- Ajustar snap vertical a `scroll-snap-align:start` y recalibrar `scroll-padding-top/bottom` para que la primera/última propuesta alineen al tope. Archivo: `index.css` + lógica de `handleMarketStackScroll` (calcular elemento con top más cercano en vez de centro) en `MissionsV2Board.tsx`.

8. Criterios de aceptación propuestos
Carrusel H
- En viewport móvil (≤414px) la carta activa queda centrada con margen lateral ≥16px respetando `safe-area`, sin sombras cortadas al arrastrar o hacer flip.
- Gestos horizontales (drag, flick) mueven exactamente 1 carta por gesto; al soltar, la carta activa queda alineada sin medias cartas ni espacio muerto al final.
- Abrir/cerrar flip no altera la posición del carrusel ni bloquea nuevos gestos; el flip respeta layering sin recortes.

Carrusel V
- Cada scroll vertical se ancla al inicio de una proposal; la primera y última se alinean con el borde superior del stack sin espacio vacío inferior.
- Ninguna proposal requiere scroll interno adicional para ver CTA + bloques esenciales (resumen, recompensa, dificultad, progreso) en viewport móvil estándar (iPhone 12 mini ~780px alto).
- RECOMPENSA y DIFICULTAD ocupan una única fila compacta (sin box-shadow expansivo) y permiten que CTA quede visible sin desplazamiento extra.
- CTA principal queda por encima del bottom-nav/safe-area en todo momento y responde al tap sin cerrar la carta involuntariamente.

9. Hallazgos nuevos en implementación (V)
- Se implementó un colapso automático de expansiones al cambiar de proposal. Los elementos desplegables dentro de `mission-proposal-card` deben marcarse con `data-proposal-collapsible` (o usar `<details>` nativo) para cerrar su estado cuando se navega a otra propuesta.

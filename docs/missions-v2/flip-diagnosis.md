Causa: (C) Desfase de “activa” — el activeMarketIndex se queda en la carta previa cuando el carrusel usa scroll-snap peeking.
Evidencia breve: Los logs [missions-market][flip-diag] en la carta centrada reportan isActive=false y el borde DEV aparece en la carta desplazada.
Archivo clave: apps/web/src/components/dashboard-v3/MissionsV2Board.tsx.
Selector/propiedad involucrada: data-carousel-index + state activeMarketIndex calculado en updateActive() del track.
Plan de fix: Sincronizar activeMarketIndex con la slide centrada en modo scroll-snap (e.g. ajustar updateActive/observer para snap real).
Fixed by: apps/web/src/index.css — `.missions-market-card::before/::after` y `.missions-market-carousel__item[data-active] .missions-market-card` (pointer-events ajustados para dejar pasar el tap a la carta activa).

Actualización 2025-10-31:
- Causa: La clase de flip se aplicaba al `<article class="missions-market-card">`, pero el efecto 3D dependía de `transform-style` en un wrapper interno inexistente; solo la carta principal cumplía el selector `data-flipped`.
- Nodo correcto: nuevo `<div class="missions-market-card__inner">` con `transform-style: preserve-3d` y `transition: transform`.
- Selectores: `.missions-market-card__inner.is-flipped` controla la rotación/visibilidad, sin depender de `data-slot` ni contenedores como `.main-quest`.

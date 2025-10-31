Causa: (C) Desfase de “activa” — el activeMarketIndex se queda en la carta previa cuando el carrusel usa scroll-snap peeking.
Evidencia breve: Los logs [missions-market][flip-diag] en la carta centrada reportan isActive=false y el borde DEV aparece en la carta desplazada.
Archivo clave: apps/web/src/components/dashboard-v3/MissionsV2Board.tsx.
Selector/propiedad involucrada: data-carousel-index + state activeMarketIndex calculado en updateActive() del track.
Plan de fix: Sincronizar activeMarketIndex con la slide centrada en modo scroll-snap (e.g. ajustar updateActive/observer para snap real).
Fixed by: apps/web/src/index.css — `.missions-market-card::before/::after` y `.missions-market-carousel__item[data-active] .missions-market-card` (pointer-events ajustados para dejar pasar el tap a la carta activa).

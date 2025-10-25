# Misiones v2 — Auditoría inicial

## Contexto
- Fecha: 2025-10-25
- Scope: apps/web Misiones v2 (`/dashboard-v3/missions-v2` + componentes asociados)
- Baseline: iOS Safari (UI/UX aprobada)
- Entorno auditado: build dev (`MOCK_CLERK=true`, `VITE_FEATURE_FLAGS=missionsV2`, `VITE_ENABLE_DEV_USER_SWITCH=true`) servido en `/_dev/missions-v2`.

## Hallazgos principales

### 1. Carrusel horizontal (Market) sin snap nativo en Web/Android
- **Síntoma:** En Chrome Android el carrusel del Market sólo avanza por pasos discretos (JS), sin inercia ni ajuste automático al ítem visible. El ítem activo puede quedar ligeramente desalineado al final de la animación.
- **Evidencia:** `.missions-market-carousel__track` no define `scroll-snap-type` fuera de la rama `prefers-reduced-motion` y mantiene `overflow: visible` + `touch-action: pan-y`, bloqueando el scroll horizontal nativo.【F:apps/web/src/index.css†L1053-L1117】
- **Root cause:** La pista se posiciona con `overflow: visible` y transforma los ítems vía JS en vez de usar `scroll-snap` nativo; sólo el modo `prefers-reduced-motion` activa `scroll-snap-type: x mandatory`. Resultado: no hay momentum ni alineación automática fuera de iOS nativo.

### 2. Carrusel horizontal (Slots activos) replica el problema
- **Síntoma:** El carrusel de slots activos tampoco expone `scroll-snap` ni `overflow` desplazable en Web/Android; la experiencia depende del manejador `pointermove` manual y pierde paridad con Safari iOS.
- **Evidencia:** `.missions-active-carousel__track` usa `overflow: hidden` sin `scroll-snap-type` salvo en la rama `data-reduced-motion`, por lo que la versión estándar no hereda snap ni momentum nativo.【F:apps/web/src/index.css†L1276-L1349】
- **Root cause:** Misma aproximación transform-based que el Market; la rama accesible para usuarios estándar (sin `prefers-reduced-motion`) no habilita `scroll-snap`, momentum ni `-webkit-overflow-scrolling`, generando divergencia notoria contra la referencia iOS.

### 3. `touch-action: pan-y` bloquea gestos horizontales fluidos
- **Síntoma:** En Android los deslizamientos horizontales sobre la tarjeta (frontal/back) del Market no activan scroll nativo; sólo el detector JS responde tras superar un umbral, dejando “zonas muertas” sin arrastre suave.
- **Evidencia:** Tanto `.missions-market-carousel` como la pista interna fijan `touch-action: pan-y`, impidiendo al navegador iniciar gestos horizontales o momentum.【F:apps/web/src/index.css†L1053-L1117】
- **Root cause:** El `touch-action` heredado fue pensado para prevenir scroll vertical, pero al aplicarse al carrusel horizontal cancela la interacción natural en Chrome/Android. iOS Safari conserva momentum por implementación nativa; en Web queda bloqueado.

### 4. Uso mixto de propiedades físicas en la UI del stack
- **Síntoma:** Componentes como `.mpc-inline-meta` combinan `padding-left`/`left` con `scroll-snap` lógico, generando offsets incorrectos en layouts RTL y dificultando la normalización de safe areas.
- **Evidencia:** `.mpc-inline-meta > li` usa `padding-left` + pseudo-elemento posicionado con `left: 0` mientras el resto del stack usa variables lógicas (`--market-stack-padding-inline`).【F:apps/web/src/index.css†L2624-L2663】
- **Root cause:** Quedaron reglas heredadas del layout v1 que dependen de propiedades físicas. En iOS el layout coincide por ser LTR, pero en Web/Android rompe la meta de “unificar logical vs physical properties” y complica futuros ajustes responsivos.

## Próximos pasos sugeridos
1. Reintroducir `scroll-snap-type: x mandatory` + `overflow-x: auto` (con `scroll-padding` y `scroll-snap-align`) en ambos carruseles cuando `prefers-reduced-motion` es `false`, manteniendo las animaciones 3D como capa opcional pero apoyándose en snap nativo para el alineamiento.
2. Ajustar `touch-action` a `pan-x`/`auto` en carruseles horizontales y añadir `overscroll-behavior`/`-webkit-overflow-scrolling: touch` para replicar momentum iOS sin rebotes extra en Chrome.
3. Normalizar las reglas físicas (`padding-left`, `left`) por equivalentes lógicos (`padding-inline-start`, `inset-inline-start`) dentro del stack del Market.
4. Una vez aplicados los cambios, validar en dispositivos iPhone 14 Pro (Safari) y Pixel 7 (Chrome) y agregar pruebas Playwright con viewports móviles para asegurar que el ítem activo nunca queda cortado.


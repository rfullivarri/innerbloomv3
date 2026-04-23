# Evaluación honesta · Labs Hero Phone Showcase

Fecha: 2026-04-23
Alcance evaluado: experimento `/labs/hero-phone-showcase` frente al hero actual de `Landing`.

## Veredicto

**No está listo para producción todavía** como reemplazo directo del hero principal.

Estado sugerido: **beta interna sólida**, pero no **shipping-ready** para la landing pública principal.

## Scorecard (0–10)

- Impacto visual en primer segundo: **8.5/10**
- Claridad de producto: **7/10**
- Credibilidad: **6.5/10**
- Alineación con marca: **7.5/10**
- Foco en CTA: **6.5/10**
- Performance: **6/10**
- Responsive: **6.5/10**
- Riesgo de distracción: **alto-medio (6/10)**
- Riesgo de mantenimiento: **alto (5/10)**

## Análisis por criterio

### 1) Impacto visual en primer segundo
**Fuerte.** El frame 3D del teléfono y el loop generan atención inmediata y comunican modernidad.

### 2) Claridad de producto
**Mejor que la imagen estática actual**, porque muestra dashboard, logros y editor en un solo vistazo. Sin embargo, parte del contenido es “snapshot simulado” y no deja claro si es UI real o mock.

### 3) Credibilidad
Sube respecto al `/nene.png`, pero aún no llega a nivel “producto real demostrado” porque:
- hay contenido hardcodeado y no conectado a estado real,
- los sellos son bullets genéricos (`◉`) en vez de assets reales,
- el idioma de escenas/labels está en inglés mientras el héroe está en español.

### 4) Alineación con marca
Buena en paleta oscura violeta/azul y tono premium, pero falta consistencia con el sistema de copy/i18n y con componentes reales de producto.

### 5) Foco en CTA
Aquí está uno de los puntos débiles: el movimiento continuo del teléfono compite con la lectura del encabezado y con los CTAs.

### 6) Performance
Riesgo importante para producción:
- el loop usa `requestAnimationFrame` + `setState` en cada frame,
- eso fuerza rerender continuo del árbol React del showcase,
- no hay pausa del loop cuando el hero sale de viewport.

No implica que “se rompa”, pero sí aumenta riesgo de consumo innecesario en móviles de gama media/baja.

### 7) Responsive
Tiene breakpoints y fallback básico de motion, pero:
- el diseño mantiene alta densidad de microdetalles en pantallas chicas,
- el visual puede dominar demasiado el fold en ciertos altos de viewport,
- no hay variantes específicas de contenido por breakpoint.

### 8) Riesgo de distracción
Medio-alto: al ser un loop permanente, puede robar protagonismo al CTA principal en usuarios que escanean rápido.

### 9) Riesgo de mantenimiento
Alto por acoplamiento manual:
- escena, copy y métricas hardcodeadas,
- estilos dedicados extensos para un solo experimento,
- sin capa de configuración reusable para activar/desactivar escenas o textos.

## Por qué no está listo (exactamente)

1. **No cumple aún la barra de performance para hero principal** (animación con estado React por frame + sin pausa por visibilidad).
2. **Credibilidad incompleta** (UI “inspirada” en producto, no suficientemente “producto real” en assets y contenido).
3. **Inconsistencia de idioma y narrativa** en el fold (ES en titular, EN en microcopy interna del teléfono).
4. **Foco de conversión no blindado**: el loop compite con CTA y puede bajar claridad de acción primaria.
5. **Mantenibilidad insuficiente**: faltan parámetros/feature flags/fallback claro para operar el reemplazo de forma segura.

## Mínimo set de cambios para llevarlo a producción

### A. Performance/animación (obligatorio)
1. Reemplazar actualización por frame con:
   - CSS keyframes para translaciones simples, o
   - timeline por “escena activa” con cambios discretos (no 60 re-renders/seg).
2. Pausar animación cuando el hero no esté visible (IntersectionObserver).
3. Mantener `prefers-reduced-motion` con versión realmente estática (sin loop ni microanimaciones).

### B. Credibilidad de producto (obligatorio)
4. Usar assets reales de logros/sellos en vez de bullets genéricos.
5. Homogeneizar idioma según `language` de landing (ES/EN).
6. Reusar texto/etiquetas desde una config compartida (no hardcoded dentro del componente).

### C. Conversión (obligatorio)
7. Reducir intensidad del loop en primer fold (más pausas, menos movimiento simultáneo).
8. Mantener CTA primario visualmente dominante (contraste, posición, jerarquía de lectura).
9. Agregar tracking comparativo A/B del hero (ctr CTA principal, demo click, scroll depth, bounce).

### D. Operación segura (obligatorio)
10. Activar por feature flag (por ejemplo `VITE_LANDING_HERO_VARIANT=image|phone_showcase`).
11. Conservar fallback explícito a imagen estática si falla carga o si reduced motion.
12. Documentar contrato de props/config y checklist QA por breakpoint antes de habilitar al 100%.

## Cómo migrarlo a landing principal cuando cumpla el mínimo

### Archivos a tocar
1. `apps/web/src/pages/Landing.tsx`
   - reemplazar `hero-media` estático por render condicional `HeroMedia` según flag.
2. `apps/web/src/pages/Landing.css`
   - ajustar layout del hero para variante “phone_showcase” y preservar variante “image”.
3. Nuevo componente recomendado:
   - `apps/web/src/components/landing/HeroPhoneShowcase.tsx`
   - `apps/web/src/components/landing/HeroPhoneShowcase.module.css`
4. Configuración:
   - `apps/web/src/config/landingHero.ts` (flag, timings, intensidad, idioma, fallback).

### Qué dejar parametrizado
- Variante activa (`image` | `phone_showcase`).
- Velocidad/intensidad del loop.
- Habilitación por idioma/mercado.
- Umbral de viewport para pausa/reanudación.
- Modo reduced motion y fallback automático.

### Cómo mantener versión fallback
- Fallback primario: hero actual con `/nene.png`.
- Fallback automático cuando:
  - `prefers-reduced-motion = true`,
  - viewport muy pequeño,
  - error de render/carga en el showcase.
- Fallback operativo: kill-switch por env var para rollback sin deploy de diseño adicional.

## Recomendación final

No lo descartaría: **vale la pena**, porque supera claramente al asset estático en percepción de producto.

Pero hoy, como está, lo llevaría a producción **solo detrás de feature flag + rollout gradual**, después de resolver los 12 puntos mínimos de arriba.

# Auditoría de traducción post-login (ES/EN)

## Resumen ejecutivo
No, hoy **no está todo traducido** en el flujo post-login. Hay pantallas con i18n parcial y otras que siguen con copy fijo en español o en inglés.

## Criterio usado
- Se tomó como “post-login” todo lo protegido por `RequireUser` (dashboard, pricing, editor, subscription y admin).
- Se revisó si el copy depende de `usePostLoginLanguage()` o si quedó hardcodeado.

## Hallazgos

### 1) Base de idioma post-login: ✅
- Existe provider global para ES/EN (`PostLoginLanguageProvider`) con persistencia en localStorage y detección de idioma del dispositivo.

### 2) Dashboard / navegación: ⚠️ parcial
- Sí usa idioma post-login vía `usePostLoginLanguage()`.
- Pero hay labels no traducidos o iguales en ambos idiomas (ej. `Dashboard`, `Daily Quest`, `Rewards`, `Editor`).
- Hay strings de accesibilidad en español fijo (ej. navegación principal desktop/mobile).

### 3) Pricing: ⚠️ parcial
- Usa `usePostLoginLanguage()` y parte del contenido cambia por idioma.
- Aun así, hay textos fijos en español (ej. “Plan activo”, “Superusuario”, “Actualizando...”, “Volver / Back”).

### 4) Subscription: ❌ sin i18n post-login
- La pantalla no usa `usePostLoginLanguage()`.
- El contenido está en español fijo (`Cargando suscripción...`, `Tu suscripción está inactiva`, `Cambiar plan`, etc.).

### 5) Editor: ❌ sin i18n estructurado
- Aunque recibe `language` para secciones, buena parte del contenido interno sigue con labels en español fijo (ej. “Todos los pilares”).

### 6) Estados globales en app: ⚠️
- Hay loaders con “Cargando…” en español en wrappers de rutas autenticadas/no autenticadas.

## Conclusión
El post-login está **implementado a nivel de infraestructura de idioma**, pero **no está completamente traducido** de punta a punta. La cobertura actual es mixta: algunas secciones con ES/EN y otras con copy hardcodeado.

## Próximos pasos recomendados
1. Unificar copy por dominio (`dashboard`, `pricing`, `subscription`, `editor`) en objetos `es/en`.
2. Eliminar textos “mixtos” (ej. `Volver / Back`) y resolver por idioma activo.
3. Traducir también `aria-label`, loaders, estados vacíos y mensajes de error.
4. Agregar checklist de QA i18n para cada pantalla protegida.

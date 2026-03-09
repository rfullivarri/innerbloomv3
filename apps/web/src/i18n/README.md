# Post-login i18n (ES/EN)

## Convención
- Usar `usePostLoginLanguage()` para obtener `language` (`es`|`en`) y `t(key, params?)` en UI post-login.
- Todo texto visible al usuario **y todo texto accesible** (`aria-label`, `title`, textos de botones, helper text, etc.) debe resolverse con claves i18n.
- Prohibido agregar nuevos inline ternarios como `language === 'es' ? ... : ...` en pantallas post-login.
- Definir textos por dominio en `src/i18n/post-login/`:
  - `dashboard.ts`
  - `missions.ts`
  - `editor.ts`
  - `pricing.ts`
  - `subscription.ts`
  - `feedback.ts`
  - `a11y.ts`

## Claves estables
- Las claves deben ser estables y semánticas (evitar acoplarlas a nombres de componentes).
- Ejemplos:
  - `dashboard.nav.home`
  - `weeklyWrapped.slide.emotion.title`
  - `editor.modal.delete.confirm`

## Resolución de idioma
- Prioridad 1: preferencia manual persistida en `localStorage` (`innerbloom.postlogin.language`).
- Prioridad 2: idioma inicial de onboarding/perfil (`innerbloom.onboarding.language` o persistencia automática de onboarding en `innerbloom.postlogin.language`).
- Prioridad 3: detección de dispositivo/navegador.
- Detección: cualquier locale que empiece por `es` => ES, todo lo demás => EN.

## Punto único
- Lógica global en `src/i18n/postLoginLanguage.tsx`.
- Diccionario consolidado y resolución en `src/i18n/post-login/index.ts`.
- El provider está montado en `src/main.tsx` para toda la app.

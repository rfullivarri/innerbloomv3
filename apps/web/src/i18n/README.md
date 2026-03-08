# Post-login i18n (ES/EN)

## Convención
- Usar `usePostLoginLanguage()` para obtener `language` (`es`|`en`) en UI post-login.
- Para textos nuevos, evitar hardcodes y definir copy por sección/dominio con estructura:

```ts
const copy = {
  es: { title: '...' },
  en: { title: '...' },
} as const;

const { language } = usePostLoginLanguage();
const t = copy[language];
```

## Resolución de idioma
- Prioridad 1: preferencia manual persistida en `localStorage` (`innerbloom.postlogin.language`).
- Prioridad 2: detección de dispositivo/navegador.
- Detección: cualquier locale que empiece por `es` => ES, todo lo demás => EN.

## Punto único
- Lógica global en `src/i18n/postLoginLanguage.tsx`.
- El provider está montado en `src/main.tsx` para toda la app.

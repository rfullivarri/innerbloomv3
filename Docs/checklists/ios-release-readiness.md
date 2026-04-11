# iOS Release Readiness

Estado revisado sobre el repo local el 2026-04-08.

## Lo que ya quedó preparado en el repo

- `UIScene` adoptado en iOS para evitar el warning de lifecycle futuro.
- Target iOS restringido a `iPhone only`.
- Orientación restringida a `portrait only`.
- Deep links nativos `innerbloom://...` ya configurados en `Info.plist`.
- Launch screen nativo configurado con asset `Splash`.
- App icon 1024x1024 presente en `Assets.xcassets/AppIcon.appiconset`.
- Recordatorios locales iOS funcionando vía `@capacitor/local-notifications`.
- Backend de producción corregido para iOS apuntando a `https://apiv2.innerbloomjourney.org`.
- Correo de privacidad definido: `privacy@innerbloomjourney.org`.
- Receiving email del dominio `innerbloomjourney.org` verificado en Resend.
- Remitente de emails automáticos definido: `notifications@innerbloomjourney.org`.

## Riesgos o huecos que siguen abiertos

### Bloqueadores probables de App Review

- No encontré un flujo visible de **eliminación de cuenta** en la app ni en el código web/mobile.
  - Si la app permite crear cuenta, Apple suele exigir que también permita solicitar o ejecutar la eliminación de cuenta dentro de la app.
- No hay todavía una **Privacy Policy pública publicada** lista para enlazar en App Store Connect.
- No hay todavía una **Support URL pública** lista para App Store Connect.
- Queda pendiente confirmar si `support@innerbloomjourney.org` será el correo público de soporte.

### Riesgos de producto/UX antes de publicar

- La sesión mobile sigue dependiendo de un token de callback muy efímero.
  - El síntoma visible es el refresh/reautenticación al navegar entre secciones si el token ya expiró.
  - Esto no bloquea una build técnica, pero sí es un riesgo fuerte de UX antes de App Store.
- El botón de prueba de notificación fue útil para QA.
  - Antes de release conviene ocultarlo detrás de un flag de debug o retirarlo del build de producción.

## Qué revisar en App Store Connect

- Nombre público de la app.
- Subtítulo.
- Categoría principal y secundaria.
- Age rating.
- Privacy nutrition labels.
- Support URL.
- Privacy Policy URL.
- Marketing URL opcional.
- Screenshots obligatorios para iPhone.
- Descripción corta y larga.
- Keywords.
- Información de suscripción si se venden planes pagos dentro de iOS.

## Qué revisar en producto/backend antes de submission

- Verificar si iOS usará Stripe web checkout o In-App Purchase.
  - Si se vende contenido/funcionalidad digital consumida dentro de la app, Apple puede exigir IAP.
- Confirmar que login, logout, deep links y notificaciones funcionan sin rebotes visuales severos.
- Confirmar que Daily Quest abre en el destino correcto al tocar una notificación.
- Confirmar que el reminder real diario funciona con la app cerrada y bloqueada.

## Tareas manuales para el owner

1. Definir la versión inicial de release (`MARKETING_VERSION`) y build number (`CURRENT_PROJECT_VERSION`) antes de archivar.
2. Crear o confirmar el registro de la app en App Store Connect.
3. Subir:
   - Privacy Policy URL
   - Support URL
   - screenshots
   - descripción
   - keywords
4. Decidir si la monetización iOS va por:
   - Stripe web
   - In-App Purchase
5. Confirmar si la cuenta puede eliminarse dentro de la app.
6. Confirmar el `bundle id` final y el `Team` de firma.

## Contactos sugeridos para App Store Connect

- Privacy contact: `privacy@innerbloomjourney.org`
- Support contact recomendado: `support@innerbloomjourney.org`
- Transactional/reminder sender: `notifications@innerbloomjourney.org`

## Comandos útiles

```bash
pnpm --filter web build
pnpm --filter mobile exec cap sync ios
open apps/mobile/ios/App/App.xcworkspace
```

En Xcode:

1. `Shift + Cmd + K`
2. `Cmd + R` para probar
3. `Product > Archive` para generar el archive de release

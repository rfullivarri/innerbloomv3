# iOS Release Readiness

Estado revisado sobre `main` el 2026-04-12.

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
- Flujo de eliminación de cuenta implementado dentro de la app, en el menú del Dashboard, debajo de cerrar sesión.
- Página pública de instrucciones de eliminación de cuenta: `https://innerbloomjourney.org/account-deletion`.
- API de eliminación de cuenta implementada: `DELETE /api/account`, con borrado de datos en Neon y eliminación del usuario en Clerk.
- Eliminación de cuenta probada por el owner con usuarios reales de prueba.
- Pricing/suscripción ocultos por flags para la primera release.
- Botón de prueba de notificación oculto en producción.

## Riesgos o huecos que siguen abiertos

### Bloqueadores probables de App Review

- Subir screenshots obligatorios para iPhone.
- Completar Privacy Nutrition Labels con los datos reales usados por la app.
- Si GA4 se activa dentro de iOS, implementar antes consentimiento in-app opcional y declararlo en App Privacy.

### Riesgos de producto/UX antes de publicar

- GA4 web ya respeta consentimiento de cookies; la app nativa todavía no tiene consentimiento propio de analytics.
- Si se quiere medir analytics mobile en V1, agregar un prompt/toggle de consentimiento antes de cargar GA4.

## Qué revisar en App Store Connect

- Nombre público de la app.
- Subtítulo.
- Categoría principal y secundaria.
- Age rating.
- Privacy nutrition labels.
- Support URL.
- Privacy Policy URL.
- Account deletion URL: `https://innerbloomjourney.org/account-deletion`.
- Marketing URL opcional.
- Screenshots obligatorios para iPhone.
- Descripción corta y larga.
- Keywords.
- Información de suscripción solo si se reactivan planes pagos dentro de iOS.

## Qué revisar en producto/backend antes de submission

- Verificar monetización más adelante.
  - Para V1, pricing/suscripción queda oculto y todos los usuarios entran como FREE salvo cambios manuales de admin.
- Confirmar que login, logout, deep links y notificaciones funcionan sin rebotes visuales severos.
- Confirmar que Daily Quest abre en el destino correcto al tocar una notificación.
- Confirmar que el reminder real diario funciona con la app cerrada y bloqueada.

## Tareas manuales para el owner

1. Definir la versión inicial de release (`MARKETING_VERSION`) y build number (`CURRENT_PROJECT_VERSION`) antes de archivar.
2. Crear o confirmar el registro de la app en App Store Connect.
3. Subir:
   - Privacy Policy URL
   - Account deletion URL
   - Support URL
   - screenshots
   - descripción
   - keywords
4. Confirmar el `bundle id` final y el `Team` de firma.
5. Decidir GA4 mobile: desactivado por ahora o activado con consentimiento in-app.

## Contactos sugeridos para App Store Connect

- Privacy contact: `privacy@innerbloomjourney.org`
- Support contact: `support@innerbloomjourney.org`
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

# Innerbloom Android Release Checklist

Estado de este checklist: auditoría operativa sobre `main` revisada el 2026-04-16.

## 1. Lo que ya quedó resuelto en el proyecto

- App ID Android: `org.innerbloom.app`
- Nombre de app Android: `Innerbloom`
- URL scheme nativo: `innerbloom`
- Correo de privacidad: `privacy@innerbloomjourney.org`
- Receiving email del dominio: activo y verificado en Resend para `innerbloomjourney.org`
- Remitente operativo de emails automáticos: `notifications@innerbloomjourney.org`
- Login nativo con Clerk: funcionando
- Deep link de callback móvil: funcionando
- API Android por transporte nativo: funcionando
- Icono Android: actualizado para parecerse al de iOS
- `compileSdk` / `targetSdk`: 36
- Flujo autenticado de eliminación de cuenta: implementado en el menú del Dashboard, debajo de cerrar sesión, con acción destructiva en rojo
- API de eliminación de cuenta: `DELETE /api/account`
- URL pública de instrucciones de eliminación de cuenta: `https://innerbloomjourney.org/account-deletion`
- Eliminación de cuenta probada por el owner con usuarios reales de prueba
- Pricing/suscripción ocultos por flags para la primera release
- Build web nativa y `cap sync android`: verificados el 2026-04-16
- `bundleRelease`: compila correctamente el 2026-04-16
- Sourcemaps desactivados para build nativo para no empaquetar `.js.map` en el AAB

Archivos clave:

- `/Users/ramirofernandezdeullivarri/Documents/GitHub/innerbloomv3/apps/mobile/android/app/build.gradle`
- `/Users/ramirofernandezdeullivarri/Documents/GitHub/innerbloomv3/apps/mobile/android/app/src/main/AndroidManifest.xml`
- `/Users/ramirofernandezdeullivarri/Documents/GitHub/innerbloomv3/apps/mobile/android/app/src/main/res/values/strings.xml`
- `/Users/ramirofernandezdeullivarri/Documents/GitHub/innerbloomv3/apps/mobile/capacitor.config.ts`
- `/Users/ramirofernandezdeullivarri/Documents/GitHub/innerbloomv3/apps/api/src/routes/account.ts`
- `/Users/ramirofernandezdeullivarri/Documents/GitHub/innerbloomv3/apps/web/src/pages/AccountDeletion.tsx`
- `/Users/ramirofernandezdeullivarri/Documents/GitHub/innerbloomv3/apps/web/src/components/dashboard-v3/DashboardMenu.tsx`

## 2. Lo que todavía falta cerrar antes de publicar

### Código / build

- Configurar firma de release (`keystore`) para Android
- Generar `AAB` firmado de release con upload key real
- El AAB actual se puede generar pero está **unsigned** porque no existe `keystore.properties` local
- Definir estrategia de versionado:
  - `versionCode` debe subir en cada release
  - `versionName` puede seguir formato semántico simple como `1.0.0`, `1.0.1`, etc.
  - estado actual: `versionCode 1`, `versionName "1.0"`
- Confirmar que no haya texto provisional en onboarding, pricing o pantallas internas
- Revisar si la app necesita pantalla/flujo especial para usuarios sin datos iniciales
- `CLERK_SECRET_KEY` en producción: confirmado por pruebas reales de eliminación
- Si se decide activar GA4 dentro de Android, implementar primero consentimiento in-app opcional
- Revisar tamaño del AAB: el bundle actual queda cerca de 129 MB por assets multimedia incluidos en `public/`

### Contenido de Play Console

- Nombre público de la app
- Descripción corta
- Descripción completa
- Categoría de app
- Correo de soporte / privacidad
- URL de privacy policy publicada
- URL de eliminación de datos/cuenta: `https://innerbloomjourney.org/account-deletion`
- Capturas de pantalla Android
- Icono 512x512 final para Play Console
- Feature graphic 1024x500 requerido por Play Console

### Cumplimiento / formularios

- App access
  - Si el reviewer necesita login, hay que dar una cuenta de prueba o instrucciones de acceso
- Data safety
  - Declarar qué datos se recopilan y para qué
- Ads
  - Confirmar que la app no muestra anuncios
- Content rating
- Target audience
- News / health / financial / children
  - Confirmar que no cae en categorías reguladas especiales

## 3. Lo que depende solo de vos

- Abrir la cuenta de Google Play Console
- Elegir si la cuenta será `personal` o `organization`
- Usar `support@innerbloomjourney.org` como soporte público
- Usar las URLs públicas ya publicadas para privacy, terms, support y account deletion
- Crear o aprobar credenciales de review para Google si las piden
- Confirmar si habrá:
  - GA4 también dentro de la app nativa, o solo web por ahora
  - emails transaccionales por Resend (`notifications@innerbloomjourney.org`)
  - reminders push o solo local notifications
  - compras o suscripciones nativas Android más adelante

## 4. Lo que conviene hacer primero

1. Cerrar firma de release Android
2. Generar primer `.aab` firmado
3. Preparar screenshots y feature graphic
4. Completar store listing con URLs legales ya publicadas
5. Subir a `Internal testing`
6. Recién después pasar a `Closed testing` o `Production`

Si la cuenta Google Play es personal nueva, seguir el plan de testers en:

- `/Users/ramirofernandezdeullivarri/Documents/GitHub/innerbloomv3/Docs/play-store-closed-testing-plan.md`

## 5. Comandos que te van a hacer falta para release

Generar build web nativa y sincronizar:

```bash
cd /Users/ramirofernandezdeullivarri/Documents/GitHub/innerbloomv3
pnpm --dir apps/mobile run build:web
pnpm --filter @innerbloom/mobile exec cap sync android
```

Build release cuando exista firma configurada:

```bash
cd /Users/ramirofernandezdeullivarri/Documents/GitHub/innerbloomv3/apps/mobile/android
./gradlew bundleRelease
```

Salida esperada:

```text
app/build/outputs/bundle/release/app-release.aab
```

Verificar si el AAB está firmado:

```bash
cd /Users/ramirofernandezdeullivarri/Documents/GitHub/innerbloomv3
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
jarsigner -verify -verbose -certs apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

Si devuelve `jar is unsigned`, todavía no sirve para subir a Play.

## 6. Riesgos que no conviene ignorar

- La primera publicación no debería salir desde `debug`; tiene que ser `release` firmado
- Un AAB que compila pero está unsigned no alcanza para Play; falta upload key / Play App Signing
- Si la cuenta de Play es personal y es nueva, Google puede exigir closed testing antes de producción
- El package name `org.innerbloom.app` conviene tratarlo como definitivo
- El texto legal que preparé en este repo es un borrador operativo, no asesoría legal
- `privacy@innerbloomjourney.org` ya puede usarse como contacto de privacidad porque Resend Receiving está verificado para el dominio
- `support@innerbloomjourney.org` queda confirmado como contacto público de soporte
- La eliminación de cuenta es irreversible en V1: borra datos propios en Neon y elimina el usuario de Clerk; si compras/suscripciones nativas se activan en el futuro, habrá que actualizar el flujo y la documentación
- GA4 mobile no debe activarse silenciosamente: si se habilita dentro de la app, agregar consentimiento in-app antes de completar Data Safety

## 7. Referencias oficiales

- Android App Bundles:
  - <https://developer.android.com/guide/app-bundle>
- Firmar la app / Play App Signing:
  - <https://developer.android.com/studio/publish/app-signing>
- Subir bundle a Google Play:
  - <https://developer.android.com/studio/publish/upload-bundle>
- Preview assets de Play Console:
  - <https://support.google.com/googleplay/android-developer/answer/9866151>
- Data Safety:
  - <https://support.google.com/googleplay/android-developer/answer/10787469>
- Requisitos de testing para cuentas personales nuevas:
  - <https://support.google.com/googleplay/android-developer/answer/14151465?hl=en>

# Innerbloom Android Release Checklist

Estado de este checklist: borrador operativo para preparar la primera subida a Google Play.

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
- Generar `AAB` firmado de release
- Definir estrategia de versionado:
  - `versionCode` debe subir en cada release
  - `versionName` puede seguir formato semántico simple como `1.0.0`, `1.0.1`, etc.
- Confirmar que no haya texto provisional en onboarding, pricing o pantallas internas
- Revisar si la app necesita pantalla/flujo especial para usuarios sin datos iniciales
- Confirmar que `CLERK_SECRET_KEY` esté configurada en producción para que `DELETE /api/account` pueda borrar también el usuario en Clerk

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
- Feature graphic opcional pero recomendable

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
- Confirmar si `support@innerbloomjourney.org` se usará como soporte público
- Proveer URL pública definitiva para privacy policy
- Decidir si querés publicar una página de Terms of Service también
- Crear o aprobar credenciales de review para Google si las piden
- Confirmar si `support@innerbloomjourney.org` se crea como alias/inbox real o si soporte usará `privacy@innerbloomjourney.org` temporalmente
- Confirmar si habrá:
  - analytics en producción
  - emails transaccionales por Resend (`notifications@innerbloomjourney.org`)
  - reminders push o solo local notifications
  - compras o suscripciones nativas Android

## 4. Lo que conviene hacer primero

1. Cerrar firma de release Android
2. Generar primer `.aab`
3. Publicar privacy policy en una URL real
4. Completar store listing
5. Subir a `Internal testing`
6. Recién después pasar a `Closed testing` o `Production`

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

## 6. Riesgos que no conviene ignorar

- La primera publicación no debería salir desde `debug`; tiene que ser `release` firmado
- Si la cuenta de Play es personal y es nueva, Google puede exigir closed testing antes de producción
- El package name `org.innerbloom.app` conviene tratarlo como definitivo
- El texto legal que preparé en este repo es un borrador operativo, no asesoría legal
- `privacy@innerbloomjourney.org` ya puede usarse como contacto de privacidad porque Resend Receiving está verificado para el dominio
- La eliminación de cuenta es irreversible en V1: borra datos propios en Neon y elimina el usuario de Clerk; si compras/suscripciones nativas se activan en el futuro, habrá que actualizar el flujo y la documentación

## 7. Referencias oficiales

- Android App Bundles:
  - <https://developer.android.com/guide/app-bundle>
- Firmar la app / Play App Signing:
  - <https://developer.android.com/studio/publish/app-signing>
- Subir bundle a Google Play:
  - <https://developer.android.com/studio/publish/upload-bundle>
- Requisitos de testing para cuentas personales nuevas:
  - <https://support.google.com/googleplay/android-developer/answer/14151465?hl=en>

# Innerbloom Play Store Readiness Audit

Estado revisado sobre `main` el 2026-04-16.

## Veredicto corto

Innerbloom está cerca de estar listo para una primera subida a Google Play, pero todavía no está listo para publicar.

La app ya compila como Android release bundle y las piezas funcionales principales están resueltas. Lo que falta no es una re-arquitectura: falta cerrar firma real, assets de Play Console, QA de release, formularios de Play y cuenta/testing.

## Ya está listo

- Package name: `org.innerbloom.app`.
- App name: `Innerbloom`.
- `minSdkVersion`: 24.
- `compileSdkVersion`: 36.
- `targetSdkVersion`: 36.
- Android launcher icon configurado.
- Deep links nativos `innerbloom://...` configurados.
- Login móvil con Clerk probado y funcionando.
- API mobile contra `https://apiv2.innerbloomjourney.org`.
- Eliminación de cuenta implementada y probada por el owner.
- Página pública de eliminación: `https://innerbloomjourney.org/account-deletion`.
- Privacy policy pública: `https://innerbloomjourney.org/privacy`.
- Terms públicos: `https://innerbloomjourney.org/terms`.
- Support público: `https://innerbloomjourney.org/support`.
- Pricing/suscripción ocultos para V1.
- Botón de prueba de notificación oculto en producción.
- GA4 nativo no tratado como activo hasta implementar consentimiento in-app.
- `pnpm --filter @innerbloom/web run build`: OK.
- `pnpm --filter @innerbloom/api run typecheck`: OK.
- `pnpm --dir apps/mobile run build:web`: OK.
- `pnpm --filter @innerbloom/mobile exec cap sync android`: OK.
- `./gradlew :app:bundleRelease`: OK.
- Source maps desactivados para build nativo.
- Upload keystore local creada.
- `keystore.properties` local creado.
- AAB release firmado generado y verificado.

## Hallazgos técnicos de la auditoría

### AAB release

- Salida generada: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`.
- Tamaño observado: cerca de 113 MB.
- El AAB generado actualmente está firmado con la upload key local.
- Resultado de verificación: `jar verified`.
- Conclusión: el build compila y el AAB actual ya sirve como primer candidato técnico para subir a Play Console.

### Permisos efectivos en manifest mergeado

- `INTERNET`.
- `RECEIVE_BOOT_COMPLETED`.
- `WAKE_LOCK`.
- `POST_NOTIFICATIONS`.
- Permiso interno de receiver dinámico generado por AndroidX.

Estos permisos son coherentes con una app web/native shell con recordatorios locales. En Play Console hay que reflejar notificaciones y datos de app, pero no aparecen permisos sensibles como location, contacts, camera, microphone o photos.

### Tamaño del bundle

El AAB es grande principalmente por assets multimedia empaquetados desde `apps/web/public`. No bloquea automáticamente, pero conviene considerarlo una optimización posterior si Play o la experiencia de descarga lo marcan.

## Pendiente para poder subir a Google Play

### Bloqueadores

1. Guardar backup seguro de `apps/mobile/android/keys/innerbloom-release.jks`.
2. Guardar backup seguro de `apps/mobile/android/keystore.properties`.
3. Terminar verificación de cuenta Google Play Console.
4. Crear app en Play Console con package `org.innerbloom.app`.
5. Completar App access con cuenta de prueba o instrucciones.
6. Completar Data Safety.
7. Completar Content Rating.
8. Completar Target audience / Families.
9. Subir screenshots Android.
10. Subir Play icon 512x512.
11. Subir feature graphic 1024x500.
12. Subir AAB firmado a Internal testing.

### Decisiones pendientes

- Categoría: recomendación actual `Health & Fitness`; alternativa `Productivity`.
- GA4 mobile: recomendación para V1, dejarlo apagado hasta consentimiento in-app.
- Emails de reminder: confirmar si se activan en producción o solo quedan disponibles técnicamente.
- Cuenta Play personal vs organización.
- Si la cuenta Play es personal nueva, asumir closed testing con 12 testers durante 14 días antes de producción.

## Dificultad estimada

- Firma/AAB real: completado localmente. Riesgo restante: guardar backup seguro del keystore porque perderlo complica futuras actualizaciones.
- Store listing: baja/media. Ya hay textos, faltan carga y ajustes finales.
- Screenshots/feature graphic: media. No es complejo, pero requiere screenshots buenos y consistentes.
- Data Safety: media/alta. No es código, pero hay que ser preciso porque Google responsabiliza al developer por declaraciones incorrectas.
- Content rating/app access: baja/media.
- Testing track si cuenta personal nueva: alta en calendario, no en dificultad técnica. Puede exigir 12 testers por 14 días.

## Próximos pasos recomendados

1. Guardar backup seguro del keystore y `keystore.properties`.
2. Preparar carpeta de assets de Play Store con screenshots, icono 512 y feature graphic.
3. Hacer QA sobre build release firmado.
4. Terminar verificación de cuenta Play Console.
5. Cargar app, metadata y AAB en Internal testing.
6. Completar Data Safety usando `Docs/data-safety-draft.md`.
7. Completar Content Rating y App Access.
8. Si corresponde, lanzar closed testing con 12 testers durante 14 días.

## Referencias oficiales

- App signing / Play App Signing: <https://developer.android.com/studio/publish/app-signing>
- Preview assets / screenshots / feature graphic: <https://support.google.com/googleplay/android-developer/answer/9866151>
- Data Safety: <https://support.google.com/googleplay/android-developer/answer/10787469>
- Testing para cuentas personales nuevas: <https://support.google.com/googleplay/android-developer/answer/14151465>

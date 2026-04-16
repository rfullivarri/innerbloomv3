# Innerbloom Play Store Assets

Carpeta para preparar los assets de Google Play antes de cargarlos en Play Console.

## Estado

- Creada el 2026-04-16.
- Usar esta carpeta para guardar candidatos finales o casi finales.
- No guardar screenshots con datos sensibles reales.
- No guardar screenshots con errores visibles, loaders, warnings, estado debug o barras de notificaciones sucias.

## Requisitos principales

### App icon

- Ruta: `icon/`
- Archivo sugerido: `play-icon-512.png`
- Formato: PNG 32-bit con alpha.
- Tamaño: 512 x 512 px.
- Peso máximo: 1024 KB.

### Feature graphic

- Ruta: `feature-graphic/`
- Archivo sugerido: `feature-graphic-1024x500.png`
- Formato: PNG 24-bit sin alpha o JPEG.
- Tamaño: 1024 x 500 px.
- Debe comunicar el valor de Innerbloom sin saturar texto.
- Evitar texto tipo `free`, `best`, `download now`, `#1`, claims de ranking o promociones.

### Phone screenshots

- Ruta: `phone-screenshots/`
- Mínimo Google Play: 2 screenshots.
- Recomendado para Innerbloom V1: 6 screenshots.
- Máximo Google Play: 8 screenshots por tipo de dispositivo.
- Formato: PNG o JPEG.
- Recomendado: 1080 x 1920 px, vertical.
- No incluir marco de dispositivo, manos, fondos externos ni textos promocionales grandes.

## Set recomendado para V1

1. `01-welcome-login.jpg`
   - Pantalla de bienvenida/login.
   - Objetivo: mostrar marca y acceso simple.
   - Alt text: `Innerbloom welcome screen with sign in and create account options.`

2. `02-onboarding-personalization.jpg`
   - Onboarding o paso de personalización inicial.
   - Objetivo: mostrar que la experiencia se adapta al usuario.
   - Alt text: `Innerbloom onboarding screen for personalizing the user's journey.`

3. `03-dashboard.jpg`
   - Dashboard principal.
   - Objetivo: mostrar progreso diario y navegación central.
   - Alt text: `Innerbloom dashboard showing daily progress and journey overview.`

4. `04-daily-quest.jpg`
   - Daily Quest o misión diaria.
   - Objetivo: mostrar la acción diaria concreta.
   - Alt text: `Innerbloom daily quest screen showing a focused daily action.`

5. `05-editor-pillars.jpg`
   - Editor, tasks o pilares.
   - Objetivo: mostrar control del journey y organización.
   - Alt text: `Innerbloom editor screen for managing tasks and personal growth pillars.`

6. `06-achievements.jpg`
   - Achievements, progreso o recompensas.
   - Objetivo: mostrar gamificación y avance.
   - Alt text: `Innerbloom achievements screen showing progress and rewards.`

## Si solo subimos 4 screenshots

Usar:

1. `01-welcome-login.jpg`
2. `03-dashboard.jpg`
3. `04-daily-quest.jpg`
4. `06-achievements.jpg`

## Estado actual de assets

- [x] `icon/play-icon-512.png`: listo como candidato para Play Store.
- [x] `feature-graphic/feature-graphic-1024x500.png`: listo como candidato inicial.
- [x] `phone-screenshots/01-welcome-login.jpg`: cargado.
- [ ] `phone-screenshots/02-onboarding-personalization.jpg`: pendiente.
- [x] `phone-screenshots/03-dashboard.jpg`: cargado.
- [x] `phone-screenshots/03-dashboard-secondary.jpg`: cargado como alternativa/extra.
- [x] `phone-screenshots/04-daily-quest.jpg`: cargado.
- [x] `phone-screenshots/05-editor-pillars.jpg`: cargado.
- [x] `phone-screenshots/06-achievements.jpg`: cargado.

Nota: Google Play no cambia el icono del store listing por dark/light mode. El icono de Play Store es un único asset 512 x 512. El modo adaptativo/themed aplica al launcher Android, no al listing de Google Play.

## Checklist antes de subir a Play Console

- [ ] Capturas sin errores ni loaders.
- [ ] Capturas con datos demo o datos no sensibles.
- [ ] Misma resolución y orientación entre screenshots.
- [ ] Sin notificaciones visibles en status bar.
- [ ] Sin claims promocionales prohibidos.
- [ ] Sin pricing/suscripción para V1.
- [ ] Sin pantallas de test/debug.
- [ ] Icono 512 x 512 listo.
- [ ] Feature graphic 1024 x 500 listo.
- [ ] Alt text preparado para cada asset.

## Referencia oficial

- Google Play preview assets: <https://support.google.com/googleplay/android-developer/answer/9866151>

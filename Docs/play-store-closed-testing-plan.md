# Innerbloom Play Store Closed Testing Plan

Estado: plan operativo para cuenta Google Play personal nueva, revisado el 2026-04-16.

## Regla que asumimos

Si la cuenta Google Play es personal y fue creada después del 2023-11-13, Google pide closed testing con al menos 12 testers opt-in durante 14 días continuos antes de pedir acceso a producción.

## A quién pedirle test

Prioridad recomendada:

1. Amigos/familia con Android propio y Play Store activo.
2. Colegas o conocidos que acepten instalar una app beta durante 14 días.
3. Usuarios potenciales reales: gente interesada en hábitos, journaling, bienestar, productividad personal o self-improvement.
4. Comunidad chica de confianza si falta completar cupo.

No conviene depender justo de 12 personas. Objetivo operativo: reclutar 18 a 20 para que, si algunos no instalan o se salen, igual queden 12 opt-in continuos.

## Qué tienen que hacer los testers

- Aceptar la invitación del closed test desde Google Play.
- Instalar Innerbloom.
- No salir del programa de testing durante 14 días.
- Abrir la app al menos 3 o 4 veces durante el período.
- Crear cuenta o iniciar sesión.
- Completar onboarding.
- Revisar Dashboard, Quests, Editor y menú.
- Probar cerrar sesión y volver a iniciar sesión.
- Reportar bugs o confusiones por email o por el canal que definas.

## Mensaje para mandar a testers

```text
Estoy preparando Innerbloom para publicarla en Google Play y necesito testers Android.

Google pide que 12 personas estén apuntadas al test cerrado durante 14 días seguidos antes de poder publicar la app.

Qué necesito:
- Entrar al link de invitación que te voy a pasar.
- Aceptar ser tester.
- Instalar la app desde Google Play.
- No salirte del test durante 14 días.
- Abrirla algunas veces, crear cuenta, completar onboarding y avisarme si algo falla o confunde.

No hace falta usarla todos los días perfecto. Lo importante es que quedes apuntado/a al test y me reportes cualquier problema.
```

## Feedback mínimo que hay que pedir

Preguntas simples para testers:

1. ¿Pudiste instalar la app sin problemas?
2. ¿Pudiste crear cuenta o iniciar sesión?
3. ¿Pudiste completar onboarding?
4. ¿El Dashboard cargó bien?
5. ¿Qué parte te confundió?
6. ¿Viste algún error, pantalla vacía o cierre inesperado?
7. ¿La app se sintió lenta o pesada?
8. ¿La usarías de nuevo? ¿Por qué?

## Qué registrar para pedir producción

Google puede pedir un resumen del test. Mantener una nota con:

- Fecha de inicio del closed test.
- Cantidad de testers invitados.
- Cantidad de testers opt-in.
- Cantidad de testers activos.
- Bugs reportados.
- Bugs corregidos.
- Cambios hechos a partir del feedback.
- Resumen de por qué la app está lista para producción.

## Orden recomendado

1. Subir AAB firmado a Internal testing.
2. Probar instalación propia desde Play.
3. Crear Closed testing track.
4. Cargar testers por lista de emails o Google Group.
5. Enviar invitación y mensaje de instrucciones.
6. Esperar hasta tener mínimo 12 testers opt-in durante 14 días continuos.
7. Corregir bugs si aparecen.
8. Pedir Production access desde Play Console.

## Canal de feedback recomendado

Usar `support@innerbloomjourney.org` para feedback formal. Si querés velocidad durante beta, sumar un canal informal temporal como WhatsApp/Telegram, pero registrar los hallazgos importantes en una nota para poder responder a Google.

## Referencia oficial

- Google Play Console Help: <https://support.google.com/googleplay/android-developer/answer/14151465>

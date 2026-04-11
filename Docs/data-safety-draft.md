# Innerbloom Data Safety Draft

Estado: borrador técnico para ayudarte a completar Google Play Data Safety. No lo tomes como respuesta final cerrada sin revisar la configuración real de producción.

## Resumen técnico observado en el repo

### Autenticación

- Clerk para login y sesión

### Datos de perfil visibles

- email
- first name
- last name
- full name
- image URL
- authentication user ID

### Datos de producto visibles

- onboarding answers
- game mode / rhythm selection
- tasks and task updates
- emotional check-ins
- streaks, missions, progress, rewards
- reminder preferences
- timezone

### Notificaciones / comunicación

- local notifications Android
- soporte backend para reminder emails
- Resend para envío de emails automáticos desde `notifications@innerbloomjourney.org`
- Resend Receiving verificado para recibir emails del dominio, incluyendo `privacy@innerbloomjourney.org`

### Analítica

- soporte para GA4 en web
- telemetría interna de eventos de producto
- si GA4 queda activo en producción, los datos deben tratarse como anonimizados o desasociados del usuario eliminado cuando técnicamente sea posible

### Eliminación de cuenta

- flujo autenticado dentro de la app
- página pública de instrucciones: `https://innerbloomjourney.org/account-deletion`
- endpoint backend: `DELETE /api/account`
- borrado inmediato de datos propios en Neon
- eliminación del usuario de autenticación en Clerk
- sin período de gracia ni recuperación en V1
- compras/suscripciones nativas: no activas actualmente

### No encontré uso evidente de

- location
- contacts
- microphone
- camera
- photos/files personales del usuario
- ads SDKs

## Borrador de clasificación para Play Console

### Personal info

- Name
  - Sí, probable
  - Motivo: cuenta y perfil
  - Eliminación: disponible desde la app y documentada públicamente
- Email address
  - Sí, probable
  - Motivo: cuenta, autenticación, recordatorios/comunicación
  - Eliminación: disponible desde la app y documentada públicamente
- User IDs
  - Sí, probable
  - Motivo: autenticación y asociación de cuenta
  - Eliminación: se borra el usuario de Clerk y los registros de aplicación asociados

### Health and fitness

- Este punto requiere criterio

La app trabaja sobre hábitos, emociones, energía y bienestar cotidiano. No vi claims médicos ni integración clínica, pero Google puede interpretar algunos datos como sensibles dependiendo de cómo se describan y para qué se usen.

Mi recomendación:

- no marcar esto a ciegas
- revisar juntos cómo querés posicionar la app

### App activity

- In-app interactions
  - Sí, probable
- App performance / diagnostics
  - Posible, según logging y monitoreo en producción

### Messages

- No vi chat entre usuarios

### Files and docs

- No evidente

### Audio / photos / videos

- No evidente

### Location

- No evidente

### Device or other IDs

- Posible
  - si analytics o providers usan IDs técnicos

## Borrador de usos a declarar

Según la implementación actual, los usos más probables son:

- App functionality
- Account management
- Analytics
- Fraud prevention, security, and compliance
- Developer communications

## Preguntas que todavía hay que cerrar

1. ¿GA4 queda activo en producción o no?
2. ¿Vas a mandar emails de reminder en producción usando `notifications@innerbloomjourney.org`, o solo notificaciones locales?
3. ¿Vas a usar compras/suscripciones nativas Android ahora o más adelante?
4. ¿Querés que la app se posicione como wellness/habit app o querés evitar cualquier framing cercano a “health”?
5. ¿Hay algún proveedor extra fuera del repo actual?

## Contactos ya definidos para documentación

- Privacy contact: `privacy@innerbloomjourney.org`
- Support contact recomendado: `support@innerbloomjourney.org`, pendiente de confirmar como contacto público
- Transactional/reminder sender: `notifications@innerbloomjourney.org`
- Account deletion instructions: `https://innerbloomjourney.org/account-deletion`

## Mi recomendación operativa

Antes de completar el formulario final de Google Play:

1. Confirmar providers reales de producción
2. Confirmar qué datos viajan efectivamente
3. Declarar que la eliminación de cuenta está disponible dentro de la app y enlazar la página pública de instrucciones
4. Responder el formulario con este documento al lado
5. Guardar screenshots o notas de la configuración por si Google pide aclaración

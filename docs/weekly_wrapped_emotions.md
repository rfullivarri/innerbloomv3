# Weekly Wrapped · Emociones

Esta versión del Weekly Wrapped incorpora un highlight emocional basado en los datos reales del **Emotion Chart**.

## Fuente de mensajes
- Los textos curados viven en `config/emotion_messages.json`.
- Cada emoción define `weekly_message` (7 días) y `biweekly_context` (15 días) junto al tono y label.

## Cálculo de emociones dominantes
- Se consultan las emociones reales del usuario (`getEmotions`) para los últimos 15 días.
- Se normalizan por día y se calcula la emoción predominante para ventanas de 7d y 15d.
- Si no hay registros suficientes, se muestra un mensaje neutro invitando a registrar más datos.

## UI
- El highlight de la sección de progreso muestra la emoción dominante semanal (color y label) y el contexto quincenal.
- El contenido utiliza exclusivamente los mensajes del JSON, sin textos inventados.

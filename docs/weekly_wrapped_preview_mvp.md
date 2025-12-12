# Weekly Wrapped Preview MVP

## Qué se implementó
- Se registró `WRAPPED_WEEKLY` como tipo de feedback semilla (estado `draft`) para que aparezca en el Feedback Manager.
- En la vista de Feedback Manager por usuario se agregó un bloque de "Weekly Wrapped" con selector de data source (real | mock) y botón de Preview.
- Se creó un modal reutilizable de Weekly Wrapped full-screen con secciones verticales y animaciones suaves.
- El payload de preview real se arma desde el frontend combinando insights y logs de los últimos 7 días; si hay pocos datos pasa a versión de "semana liviana". El modo mock tiene un guion fijo.
- El preview es side-effect free: no persiste consumed, métricas ni disparadores.

## Cómo probar
1. Ingresar al Feedback Manager > pestaña "Vista por usuario".
2. Seleccionar un usuario desde el buscador lateral.
3. En el bloque "Preview · Weekly Wrapped", elegir `Real` o `Mock` y tocar **Preview**.
4. Se abre el modal full-screen con las secciones del Weekly Wrapped; cerrar con el botón "Cerrar". Repetir las veces que se quiera (idempotente).

## Notas
- El modal usa scroll vertical y animaciones CSS simples; sin dependencias nuevas.
- Fuente real toma la última semana disponible del usuario y genera narrativa (sin tablas ni dumps de métricas).

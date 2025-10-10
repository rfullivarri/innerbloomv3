# Emotion Chart: Funcionamiento actualizado

El componente que alimenta el Emotion Chart en el dashboard V3 es `EmotionChartCard`
(`apps/web/src/components/dashboard/EmotionChartCard.tsx`). A continuación se resume la
lógica clave que controla qué días aparecen en la grilla y cómo se rellenan las celdas.

## Rango visible

* Siempre se muestran exactamente 26 semanas (182 días) contadas hacia atrás desde el día
  actual. El rango se calcula con `computeTimelineStart` y `computeTimelineEnd`, que fijan el
  inicio en "hoy - 181 días" y el final en el día de hoy.【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L259-L276】
* Si existen registros fuera de ese intervalo simplemente se ignoran para mantener la vista en
  los últimos seis meses.【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L278-L286】

## Control de cobertura (máximo 3/4)

* Para evitar que la grilla esté completamente ocupada, `trimExcessMonths` limita la cantidad de
  días con emociones almacenadas a un 75 % del total (hasta 136 días sobre 182).【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L35-L36】【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L302-L344】
* Cuando hay más registros que ese límite, se eliminan meses completos empezando por el más
  antiguo hasta quedar por debajo del umbral. Esos días se muestran como `Sin registro` en la
  grilla, liberando espacio visual para los meses nuevos.【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L312-L344】

## Renderizado de la grilla

* `buildColumns` recorre las semanas dentro del intervalo fijo y genera una celda por día. Si el
  mapa filtrado contiene un registro para ese día, la celda adopta el color de la emoción; de lo
  contrario queda en `Sin registro`.【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L188-L248】
* Las etiquetas de meses (`monthSegments`) se recalculan automáticamente para reflejar sólo los
  meses que permanecen visibles tras el recorte.【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L248-L344】

## Resumen e indicadores

* El resumen inferior (`highlight`) sigue calculando la emoción más frecuente de los últimos 15
  días con registros válidos dentro del rango visible. Los meses ocultos no influyen en este
  cálculo.【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L346-L373】

En conjunto, esta lógica garantiza que siempre haya un espacio libre aproximado de un 25 % en la
grilla, que el mapa cubra exactamente los últimos seis meses y que los registros más recientes
reciban prioridad visual.

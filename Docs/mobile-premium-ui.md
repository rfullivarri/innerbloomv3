# Innerbloom Mobile Premium UI

## Objetivo del proyecto

Crear una nueva direccion visual mobile premium para Innerbloom, optimizada primero para viewport de iPhone y Android, que pueda evolucionar hacia las pantallas reales cuando el diseno este validado.

Este trabajo debe funcionar como fuente de verdad para Codex y para cualquier cambio futuro relacionado con la UI mobile premium. El foco inicial es look & feel, jerarquia visual, navegacion, densidad de informacion, lenguaje de progreso y sistema visual. No es una migracion funcional todavia.

## Reglas absolutas de alcance

- No tocar backend.
- No tocar microservicios.
- No tocar base de datos.
- No modificar endpoints.
- No modificar schemas.
- No cambiar contratos API.
- No romper rutas actuales.
- No reemplazar pantallas reales todavia.
- No cambiar logica de negocio.
- No inventar datos nuevos para produccion.
- No usar mocks en pantallas reales.
- No mover componentes experimentales a produccion sin una decision explicita.

## Principio: Dashboard = oceano de un centimetro

El Dashboard mobile premium debe ser un oceano de un centimetro: debe mostrar la amplitud del sistema Innerbloom sin exigir profundidad inmediata.

Esto significa:

- Debe dar una sensacion rapida de estado general.
- Debe revelar que hay tareas, progreso, energia, balance, emociones, DQuest y logros.
- Cada modulo debe tener una lectura de 1 segundo.
- La pantalla no debe intentar resolver todo en el primer nivel.
- La profundidad vive en pantallas secundarias: Task Detail, Emotion Chart, Balance y Vision general expandida.
- El Dashboard debe priorizar orientacion, calma y decision siguiente.

## Decision de trabajo inicial

Todo el rediseño mobile premium empieza en `/labs/mobile-premium`.

La zona Labs es el unico lugar permitido para iterar la nueva direccion visual hasta validacion. Las pantallas reales actuales se mantienen intactas. Cualquier fallback o mock visual debe vivir dentro de Labs o en archivos claramente nombrados como demo/mock.

## Regla de interpretacion de referencias visuales

Las imagenes, screenshots y croquis usados durante este proyecto no son especificaciones literales para copiar pixel-perfect ni pantallas finales cerradas. Son referencias de direccion para entender que componentes existentes se quieren conservar, donde se debe reubicar informacion, que representacion visual nueva se quiere probar, que jerarquia/tamano/aire se busca y que estetica premium debe guiar la UI.

La regla principal es: cada elemento visual nuevo debe mapearse a una feature, dato, hook, payload, helper, asset o semantica existente. Si no existe un dato real o una feature existente detras, no se implementa como parte de la UI mobile premium.

Esto significa:

- No se pierden features actuales: se pueden representar mejor, pero no eliminar silenciosamente.
- No se inventan metricas nuevas.
- No se cambia la logica de negocio.
- No se cambia la semantica del dato.
- Solo cambia la representacion visual, la jerarquia, el layout o el estilo.
- Las referencias visuales comunican intencion y estructura, no autorizan datos inventados.

Ejemplos:

- Si en `StreaksPanel` existe una barra horizontal de progreso semanal, la UI premium puede representarla como un circulo compacto con `weeklyDone/weeklyGoal` en el centro. Es la misma feature, con otra visualizacion.
- Si en `StreaksPanel` existen semanas del mes, la UI premium puede representarlas como mini barras verticales compactas `S1-S5`, usando la misma semantica: verde si alcanzo el objetivo, gris si no lo alcanzo y ambar solo si existe una semantica real de semana actual parcial/en progreso.

Regla de implementacion:

- Trabajar solo en `/labs/mobile-premium` mientras el rediseño no este validado.
- No tocar componentes reales de produccion para adaptar una referencia visual.
- Si hace falta cambiar un componente existente, crear una copia o variante Premium dentro de Labs.
- Reutilizar hooks, types, helpers, assets, clientes API y logica real siempre que sea posible.
- No modificar el componente original salvo que haya una instruccion explicita futura para migrarlo.

## Direccion visual

La UI debe sentirse premium, mobile-first, calmada y tactil. Innerbloom no debe parecer una app generica de productividad ni un dashboard SaaS de escritorio reducido.

La referencia visual general es la claridad de Purposa, pero manteniendo la profundidad real de Innerbloom. Esto no autoriza a cambiar features, inventar datos ni simplificar la semantica del producto: solo cambia la expresion visual.

Principios visuales:

- Mobile-first real, no desktop comprimido.
- Dark mode casi negro, no violeta pesado.
- Violeta/lila como acento de identidad, no como decoracion dominante.
- Superficies suaves, capas claras y profundidad moderada, evitando contenedor dentro de contenedor.
- Bordes redondeados consistentes, finos y de bajo protagonismo.
- Jerarquia tipografica grande solo donde aporta orientacion; reducir 15-20% la escala general si la UI se siente conceptual o gigante.
- Page title mobile: maximo 40-48 px.
- Section title: 24-30 px.
- Row title: 19-24 px.
- Metadata: 14-16 px.
- Labels uppercase solo cuando aportan; 11-12 px con tracking controlado.
- Cards compactas, escaneables y accionables solo cuando el contenido realmente necesita encapsularse.
- Secciones abiertas, separadores finos y mucho aire antes que modulos pesados.
- Bottom nav siempre testeable dentro de Labs.
- Bottom nav sutil: menos alto, active state con fondo apenas elevado, icono claro y label blanco; sin borde azul/violeta protagonista.
- Sacar navegacion duplicada cuando ya existe bottom nav.
- Ritmo vertical generoso, pero sin desperdiciar la pantalla.
- Componentes con estados visuales obvios: activo, pendiente, bloqueado, completado.
- Sensacion premium desde materiales, spacing, contraste y microjerarquia, no desde ornamentos.
- Reducir glows y bordes activos fuertes.
- No usar Misiones en la UI mobile premium.
- GP no debe ser el hero visual; debe existir como dato secundario.
- Tareas no se llaman habitos hasta que realmente estan logradas.
- Racha usa fuego solo si `streakDays > 0`.
- Daily Energy = HP / Mood / Focus.
- Equilibrio = Body / Mind / Soul por distribucion de GP.
- Emotion Chart = emociones con colores reales.
- Growth Calibration = ajuste automatico de dificultad, no crecimiento general.
- El resultado debe sentirse premium, sobrio, util y realista; no debe parecer una app fantasy, gamer ni un mockup de Dribbble sin logica de producto.

## Reglas de colores semanticos

Los colores deben comunicar estado y dominio, no solo decoracion.

- Base app: fondos calidos/neutros o superficies oscuras suaves, evitando monocromia extrema.
- Texto primario: contraste alto, legible en mobile.
- Texto secundario: menor contraste, nunca ilegible.
- Accion primaria: un color reconocible y consistente por flujo.
- Exito/completado: verde o menta, reservado para estados logrados.
- Progreso/en curso: azul, teal o color de energia moderada.
- Advertencia/friccion: ambar o coral, usado con moderacion.
- Bloqueado/inactivo: neutros de baja saturacion.
- Emociones: pueden usar paletas diferenciadas, pero siempre semanticas y consistentes.
- Calma: verde.
- Felicidad: amarillo.
- Motivacion: violeta.
- Tristeza: azul.
- Ansiedad: rojo.
- Frustracion: taupe/marron.
- Cansancio: teal.
- Dificultad sube: rojo/alerta.
- Dificultad se mantiene: amarillo/neutro.
- Dificultad baja: verde/mejora.
- Ventana de habito menor a 50%: rojo.
- Ventana de habito 50-79%: amarillo.
- Ventana de habito 80% o mas: verde.

Prohibido:

- Usar gradientes morados dominantes como unica identidad visual.
- Usar colores solo porque se ven bonitos si contradicen el estado.
- Convertir todo en la misma familia de color.
- Reducir contraste por estetica.

## Reglas de iconos por trait/stat

Los iconos deben reforzar significado y repetirse de forma consistente.

- Cada trait/stat debe tener un icono estable.
- El mismo concepto no debe cambiar de icono entre pantallas.
- Los iconos deben ser simples, legibles a 18-24 px.
- Usar iconos para acciones y conceptos recurrentes; evitar texto innecesario dentro de botones pequenos.
- Si existe lucide o el sistema local de iconos, preferirlo antes que SVG manual.
- El color del icono debe seguir el estado o dominio semantico.

Ejemplos de direccion:

- Focus / claridad: target, circle-dot, spark.
- Energia / activacion: pulse, gauge, bolt si esta disponible.
- Calma / regulacion: circle, breath, wave si esta disponible.
- Progreso / ruta: route, steps, check.
- Logros / recompensa: sparkle, seal, award si esta disponible.
- Balance / equilibrio: gauge, scale, radial indicator.

## Rutas Labs

Rutas oficiales para el sandbox mobile premium:

- `/labs/mobile-premium`
- `/labs/mobile-premium/dashboard`
- `/labs/mobile-premium/tareas`
- `/labs/mobile-premium/dquest`
- `/labs/mobile-premium/logros`
- `/labs/mobile-premium/task-detail`
- `/labs/mobile-premium/emotion-chart`
- `/labs/mobile-premium/balance`
- `/labs/mobile-premium/vision-general`

La ruta base debe llevar al Dashboard del lab. Todas deben mantener navegacion interna simple y bottom nav visual.

## Reglas por pantalla

### Dashboard

- Debe actuar como resumen de estado, no como pantalla de administracion.
- Debe mostrar la siguiente accion mas importante.
- Debe dar pistas visibles de tareas, DQuest, balance, emocion y logros.
- Debe ser rapido de leer en una mano.
- Debe evitar tablas, listas largas y bloques explicativos.
- Debe mantener el principio "oceano de un centimetro".

### Tareas

- Debe mostrar tareas activas con jerarquia clara.
- Cada tarea debe comunicar titulo, estado, recompensa/progreso y dominio visual.
- Debe permitir probar densidad mobile sin cambiar mutaciones reales.
- No debe introducir nuevas acciones productivas en Labs salvo que sean visuales/no persistentes.
- Debe preparar patrones para cards reutilizables en produccion.

### DQuest

- Debe sentirse como ruta guiada, no como lista plana.
- Debe mostrar progreso, nodos o pasos de manera tactil.
- Debe diferenciar Daily Quest, Skill Route y estados de avance.
- Debe hacer evidente que hay una accion siguiente.
- No debe cambiar reglas reales de misiones ni contratos existentes.

### Logros

- Debe mostrar logros como sistema de identidad y progreso, no solo badges.
- Debe diferenciar logrado, cerca de lograr y bloqueado.
- Debe usar iconografia y materiales con sensacion premium.
- Debe evitar saturacion de premios pequenos sin jerarquia.
- Debe preparar el lenguaje visual para sellos/recompensas reales.

### Task Detail

- Debe ser la pantalla profunda de una tarea.
- Debe explicar impacto, recompensa, dominio y accion esperada.
- Debe ser adecuada para una decision puntual: hacer, posponer, entender.
- En Labs no debe persistir cambios reales.
- Debe probar estructura para futura migracion sin acoplarse a mutaciones.

### Emotion Chart

- Debe visualizar tendencias emocionales de forma clara y calmada.
- Debe evitar graficos densos de escritorio.
- Debe priorizar lectura mobile: pocos ejes, leyenda simple, patrones reconocibles.
- Debe permitir comparar calma, foco, energia u otras dimensiones si existen.
- No debe inventar interpretaciones clinicas ni promesas de salud.

### Balance / Equilibrio

- Debe comunicar estado general y tension entre dimensiones.
- Debe funcionar como lectura rapida y como puente a Vision general.
- Puede usar radial, gauge o composicion de score, siempre con significado semantico.
- Debe evitar scores opacos sin contexto.
- Debe mantener lenguaje visual calmado, no competitivo.

### Vision general expandida

- Debe ser la version profunda del Dashboard.
- Debe agrupar senales del sistema: tareas, DQuest, emociones, balance, logros y ritmo.
- Debe permitir mas detalle sin convertirse en panel administrativo.
- Debe ayudar a entender "que esta pasando" y "que conviene hacer despues".
- Debe ser candidata a evolucionar como pantalla de overview futura.

## Cosas prohibidas

- Tocar backend, microservicios, DB, endpoints o schemas.
- Cambiar rutas reales o reemplazar pantallas actuales.
- Meter mocks en componentes o pantallas productivas.
- Hacer que Labs escriba datos reales por accidente.
- Crear dependencias visuales que obliguen a cambiar logica de negocio.
- Usar datos demo sin dejarlos claramente aislados.
- Copiar screenshots pixel-perfect si eso inventa features, datos o semanticas inexistentes.
- Implementar un elemento visual solo porque aparece en un croquis, si no mapea a una feature o dato existente.
- Modificar componentes productivos cuando se puede crear una variante Premium aislada en Labs.
- Introducir copy largo de explicacion dentro de la UI.
- Disenar desktop-first.
- Crear landing pages en vez de pantallas reales del producto.
- Sobrecargar el Dashboard con profundidad.
- Usar cards dentro de cards sin necesidad.
- Usar paletas de un solo color dominante.
- Sacrificar legibilidad mobile por estetica.
- Usar iconos inconsistentes para el mismo trait/stat.
- Migrar componentes a produccion antes de validar la direccion visual.

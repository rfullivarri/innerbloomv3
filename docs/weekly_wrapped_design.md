# Weekly Wrapped – Diseño y Lógica

## Objetivo
Crear una experiencia de feedback narrativa tipo "Spotify Wrapped" que resuma el progreso semanal del usuario en Innerbloom, animada y scrolleable por secciones. No es un dashboard; es un modal full-screen que refuerza el logro y el momentum positivo.

## Alcance y tipo
- **Tipo de feedback:** `WRAPPED_WEEKLY`.
- **Formato:** modal full-screen, animado, scrolleable por secciones/"slides".
- **Destino:** usuarios finales de Innerbloom.
- **Estrategia de copy:** narrativa, sin tablas ni métricas crudas; priorizar mensajes cortos con tono de celebración y refuerzo positivo.

## Contenido del Weekly Wrapped
Cada sesión se compone de secciones secuenciales (slides) que se animan al entrar/salir. Datos de entrada: daily logs, streaks, constancia, XP, misiones/quests.

### Secuencia propuesta de secciones
1. **Portada / Bienvenida**  
   - Copy ejemplo: "Tu semana en Innerbloom está lista. Respirá y recorré tus logros."  
   - Animación: fade-in + ligero scale-up.

2. **Logros principales de la semana**  
   - Datos: misiones completadas, hitos de XP, streaks mantenidos.  
   - Copy ejemplo: "3 misiones completadas: cerraste la semana con energía."  
   - Animación: slide-up por bullet.

3. **Hábitos con constancia mantenida**  
   - Datos: streaks de hábitos diarios que se mantuvieron toda la semana.  
   - Copy ejemplo: "Respiración consciente: 7/7 días. Tu constancia mantiene el ritmo."  
   - Animación: fade-in secuencial por hábito.

4. **Hábitos que mejoraron de estado**  
   - Datos: estado pasó de "en construcción" a "hábito fuerte" o similar.  
   - Copy ejemplo: "Hidratación subió a Hábito Fuerte. Sentiste la diferencia."  
   - Animación: slide-right con badge de "nivel up".

5. **Pilar dominante de la semana (Body / Mind / Soul)**  
   - Datos: sumarización de actividad por pilar.  
   - Copy ejemplo: "Mind dominó tu semana: más foco, menos ruido."  
   - Animación: scale-in del ícono del pilar + fade de background.

6. **Mejora destacada / Barrera rota**  
   - Datos: primer logro, récord personal, o superar una tarea pendiente.  
   - Copy ejemplo: "Rompiste la barrera: 5 días seguidos meditando. Tu constancia ya es un hábito."  
   - Animación: celebratory confetti + slide-up.

7. **Cierre / CTA suave**  
   - Copy ejemplo: "Seguimos. Mañana vuelve el Daily Quest para sumar más."  
   - CTA opcional: botón "Listo" o "Ir a Daily Quest".  
   - Animación: fade-out al cerrar.

## Reglas de contenido
- No usar tablas ni métricas crudas; reemplazar números exactos con rangos o narrativa ("mantuviste tu ritmo toda la semana", "sumaste XP suficiente para subir de nivel").
- Priorizar tono positivo y motivacional, incluso cuando falten datos (usar copy de refuerzo: "Esta semana fue más tranquila; tu constancia vuelve mañana").
- Usar solo datos ya disponibles: daily logs, streaks, constancia, XP y misiones.

## Lógica de triggers y flujo

### Trigger automático (productivo)
- **Cuándo:** todos los lunes, inmediatamente después de completar el Daily Quest.  
- **Precondiciones:**
  - Usuario completó el Daily Quest del lunes.
  - Existe información mínima de la semana previa (ej. al menos 2 logs o una misión completada). Si no, mostrar versión de "semana liviana" con copy suave.
- **Acción:**
  - Feedback Manager genera un feedback `WRAPPED_WEEKLY` para el usuario.
  - Se marca como disponible y muestra el modal full-screen animado.
  - Al cerrarse, se marca como consumido (solo en productivo, no en preview).

### Preview / Simulation (Feedback Manager)
- **Quién:** operadores o equipo de producto desde el Feedback Manager.
- **Cómo:**
  - Seleccionar tipo `WRAPPED_WEEKLY` y activar modo "Preview" o "Simulation".
  - Puede usar datos reales recientes del usuario seleccionado. Si faltan datos, inyectar mocks (streaks cortos, 1-2 misiones) para validar copy y animaciones.
- **Reglas:**
  - No dispara triggers reales.
  - No marca el feedback como consumido.
  - Renderiza el mismo modal animado que ve el usuario final.

## Gestión en Feedback Manager
- **Tipo registrado:** `WRAPPED_WEEKLY` junto con otros feedbacks existentes.
- **Campos clave:**
  - `type`: `WRAPPED_WEEKLY`.
  - `mode`: `auto` (productivo) | `preview` (manual).  
  - `data_source`: `real` | `mock` (para preview sin datos suficientes).
  - `status`: `pending` | `shown` | `consumed` (solo se actualiza en auto/productivo).
  - `payload`: estructura de secciones con textos y assets.
- **UI del manager:**
  - Botón "Preview" que abre el modal en modo simulation.
  - Flag visual para indicar si los datos son mock.
  - Registro de último trigger productivo (fecha/hora) para auditoría.

## Estructura de datos sugerida (conceptual)
- **Feedback (Weekly Wrapped)**
  - `id`, `userId`, `type: WRAPPED_WEEKLY`, `mode` (`auto`/`preview`), `status` (`pending`/`shown`/`consumed`).
  - `weekRange`: fecha inicio/fin usada para la narrativa.
  - `sections`: array ordenado con objetos `{ key, title, body, accent, animation }`.
  - `highlight`: item especial para "barrera rota".
  - `pillarDominant`: `Body | Mind | Soul`.
  - `dataSource`: `real | mock`.

## Animaciones sugeridas (simples)
- **Fade-in + scale**: para portadas y cierres.
- **Slide-up**: para listas de logros y mejoras.
- **Slide-right con badge**: para la sección de "nivel up" de hábitos.
- **Confetti o burst**: para la mejora destacada.
- **Progressive reveal**: cada sección entra al hacer scroll o swipe, manteniendo la experiencia narrativa.

## Ejemplos de copy por sección
- **Portada:** "Tu semana en Innerbloom está lista. Respirá y recorré tus logros."
- **Logros principales:** "3 misiones completadas: cerraste la semana con energía."
- **Hábitos constantes:** "Respiración consciente: 7/7 días. Tu constancia mantiene el ritmo."
- **Hábitos que mejoraron:** "Hidratación subió a Hábito Fuerte. Sentiste la diferencia."
- **Pilar dominante:** "Mind dominó tu semana: más foco, menos ruido."
- **Barrera rota:** "Rompiste la barrera: 5 días seguidos meditando. Tu constancia ya es un hábito."
- **Cierre:** "Seguimos. Mañana vuelve el Daily Quest para sumar más."

## Notas de implementación futura
- Reutilizar el pipeline de datos existente (streaks, XP, logs) para poblar las secciones.
- Preparar mocks consistentes para Preview: 1-2 misiones, 2-3 hábitos, un pilar destacado.
- Evitar tablas: preferir cards o bloques de texto con íconos.
- Asegurar que la salida de Preview no altere métricas ni flags de consumo.


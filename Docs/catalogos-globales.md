# Catálogos globales y valores fijos

Este documento consolida los valores de negocio hoy definidos en el código para que puedan migrarse a una base de datos o a configuraciones administrables. Cuando existían variantes de un mismo valor se eligió la forma más simple (por ejemplo, `LOW MOOD`).

---

## Game modes

> Estos modos alimentan chips de UI y cálculo de rachas; conviene persistir objetivo semanal y alias aceptados.

| Game mode    | Objetivo semanal        | Alias y etiquetas actuales                                                                                |
|--------------|-------------------------|------------------------------------------------------------------------------------------------------------|
| LOW MOOD     | 1 sesión por semana     | `LOW`, `Low Mood 🪫 - Quiero un cambio, pero no tengo la energia`                                          |
| CHILL MOOD   | 2 sesiones por semana   | `CHILL`, `Chill Mood 🌿 - Estoy  bien, quiero trackear mis hábitos`                                        |
| FLOW MOOD    | 3 sesiones por semana   | `FLOW`, `FLOW MOOD`, `Flow Mood 🌊 - Tengo un objetivo y quiero comenzar esta aventura`                    |
| EVOLVE MOOD  | 4 sesiones por semana   | `EVOLVE`, `EVOL`, `Evolve Mood 🧬 - Estoy enfocado y quiero ir al próximo nivel`                           |

---

## Pilares

| Pilar | Código | Descripción                                    |
|------|--------|--------------------------------------------------|
| BODY | BODY   | Aspectos físicos y de energía corporal          |
| MIND | MIND   | Enfoque mental, productividad y desarrollo      |
| SOUL | SOUL   | Bienestar emocional, propósito y vínculos       |

---

## Rasgos por pilar (Foundations)

### Body
1. Energía — Actividad física regular  
2. Nutrición — Alimentación saludable  
3. Sueño — Dormir y descansar mejor  
4. Recuperación — Pausas y relajación corporal  
5. Hidratación — Tomar más agua y mejorar la hidratación  
6. Higiene — Cuidado personal diario  
7. Vitalidad — Energía al despertar  
8. Postura — Postura y ergonomía  
9. Movilidad — Flexibilidad y movilidad corporal  
10. Moderación — Reducir alcohol, tabaco o cafeína  

### Soul
1. Conexión — Relaciones y vínculos personales  
2. Espiritualidad — Plenitud interior o prácticas espirituales  
3. Propósito — Dirección y objetivos vitales  
4. Valores — Vivir alineado a valores personales  
5. Altruismo — Ayudar a otros o contribuir a una causa  
6. Insight — Autoconocimiento profundo  
7. Gratitud — Practicar gratitud y actitud positiva  
8. Naturaleza — Conexión con entornos naturales  
9. Gozo — Juego, diversión y disfrute sin culpa  
10. Autoestima — Hablarte con amabilidad y fortalecer autoestima  

### Mind
1. Enfoque — Productividad diaria y foco  
2. Aprendizaje — Estudio y adquisición de nuevos conocimientos  
3. Creatividad — Generación de ideas nuevas  
4. Gestión — Manejo de estrés o ansiedad  
5. Autocontrol — Regulación emocional y de reacciones  
6. Resiliencia — Afrontar desafíos con fortaleza  
7. Orden — Organización de tareas y espacios mentales  
8. Proyección — Desarrollo profesional o avance de carrera  
9. Finanzas — Hábitos financieros saludables  
10. Agilidad — Memoria y agilidad mental  

---

## Micro-acciones LOW

### Body
- Dormir mejor
- Alimentarte mejor
- Moverte un poco más
- Tomar más agua
- Descansar sin culpa

### Soul
- Respirar profundo unos minutos
- Escuchar música que te gusta
- Estar en contacto con la naturaleza
- Anotar lo que sentís en un papel
- Hacer algo sin tener que ser útil

### Mind
- Leer algo corto
- Anotar tus pensamientos
- Mirar una serie tranquila
- Hacer una pausa sin pantallas
- Desarmar alguna idea negativa

---

## Catálogos por modo

### Motivaciones CHILL
- Crecer como persona / desarrollo personal
- Lograr metas concretas que me propongo
- Sentirme más conectado con otras personas
- Vivir con más calma y menos estrés
- Superarme a mí mismo y romper mis límites
- Crear o construir algo (proyectos, arte, emprendimientos)
- Sentirme más feliz y satisfecho con mi día a día
- Tener más experiencias y aventuras
- Cuidar mi salud y bienestar a largo plazo

### Obstáculos FLOW
- Falta de tiempo
- Falta de energía o motivación
- Miedo al fracaso
- Dudas sobre dónde empezar
- Falta de apoyo
- Procrastinación
- No tengo hábitos aún
- Síndrome del impostor

### Ajustes EVOLVE
- Mis hábitos diarios
- Mi alimentación
- Mis rutinas de descanso
- Mi tiempo libre
- Mis relaciones sociales
- Mis creencias y bloqueos mentales
- Mis espacios físicos

### Actitudes EVOLVE
- Estoy muy motivado y quiero cambios ya
- Quiero ir de a poco pero con foco
- Me cuesta mantener constancia pero quiero intentar

---

## Reglas de experiencia (XP)

- Preguntas abiertas y pasos clave: **+21 XP** la primera vez que se completan.  
- Checklists y selecciones: **+13 XP** la primera vez que se confirman.  
- Distribución de XP en Foundations: cuando se suma **XP general (`ALL`)** se reparte en partes iguales entre **Body, Mind y Soul**.  
- Límite de selección en las checklists: **máximo 5** elementos.

---

## Dificultades y XP base de tareas

- Escala enum en la base: `EASY`, `MEDIUM`, `HARD`.  
- Representaciones textuales en la UI: **"Fácil"**, **"Media"**, **"Difícil"** (mapeo 1:1 con los enums).  
- Catálogo de tareas base parte con `base_xp = 10` y dificultad `EASY`.

---

## Otros catálogos de base de datos

- Game modes permitidos: `LOW`, `CHILL`, `FLOW`, `EVOLVE`.  
- Estados de misiones: `ACTIVE`, `COMPLETED`, `FAILED`.  
- Estados de jobs: `QUEUED`, `RUNNING`, `DONE`, `ERROR`.  
- Pilares (`BODY`, `MIND`, `SOUL`), traits y stats forman el catálogo global de taxonomía para tareas.

---

### Notas de implementación (referencia rápida)

- Persistir **game modes** con: `code`, `weekly_target`, `aliases[]`, `label` (opcional).  
- Persistir **pilares** con: `code`, `name`, `description`.  
- Persistir **traits** con: `pillar_code`, `name`, `description` (opcional) y orden para UI.  
- Catálogo de **dificultad** con enum (`EASY`, `MEDIUM`, `HARD`) + mapeo UI.  
- **XP rules** como catálogo parametrizable (clave/valor) para evitar literales en código.

> Este documento es fuente única de verdad (SSOT) para catálogos iniciales.

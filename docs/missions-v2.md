# Misiones v2 — Diseño final (Innerbloom)

*Versión: 1.0 · Estado: Aprobado para documentación de producto*

---

## 0) Léxico oficial (ES ↔ EN)

| Concepto (ES)          | Term (EN)             | Descripción breve                                                                                                            |
| ---------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Pulso**              | **Heartbeat**         | Acción diaria (1 tap) para “sellar” el día de Misiones. Fija progreso, activa beneficios y protege la misión.                |
| **Pétalos**            | **Petals**            | Tolerancia a olvidos: cada misión inicia con **3**. −1 Petal por día sin Heartbeat. Con 0 → **Failed**.                      |
| **Enfriamiento (15d)** | **Cooldown (15d)**    | Período bloqueado tras fallar. La misión queda **gris con cuenta regresiva** y no puede reactivarse.                         |
| **Amuletos**           | **Amulets**           | Recompensas que **modifican reglas** (p. ej., +1 Petal, −5d Cooldown, eliminar Cooldown 1 vez, +1 XP a una stat por 7 días). |
| **Aura (7d)**          | **Aura (7d)**         | Bendición temporal (buff) de 7 días: ej. x1.5 XP en Hunt o +5’ Focus.                                                        |
| **Boss**               | **Boss**              | Encuentro **quincenal** en 2 fases, **ligado a Main activa** y disponible al alcanzar **Acto 2**.                            |
| **Market**             | **Market**            | Catálogo de misiones por tipo (Main/Hunt/Skill) para activar en slots.                                                       |
| **Abandono Honroso**   | **Honorable Abandon** | Renuncia explícita a una misión activa del slot → **Failed** + **Cooldown 15d**.                                             |

> Nota de naming: “Pulso / Heartbeat” conviven para internacionalización. En UI se muestra uno según idioma (o test A/B).

---

## 1) Propósito

* Convertir el Daily Quest en **motor de foco y tensión**: **3 frentes activos**, **Boss quincenal** y **botín**.
* **Interacción diaria real**: además del Daily, el jugador **marca Heartbeat** para **asegurar beneficios** y **proteger sus misiones**.
* Empujar **tareas difíciles/olvidadas**, avanzar **objetivos** (Flow/Evolve) y **desarrollar skills** (stats) con progreso visible.

---

## 2) Estructura de la pantalla

### 2.1 Slots activos (arriba)

1. **Main Quest** (si hay objetivo). **Habilita Boss** cuando llega a **Acto 2** dentro del ciclo.
2. **Hunt** (empuje de fricción) con **booster**.
3. **Skill Route** (ruta de 3–5 micro-nodos para subir una stat).

> Los slots **no son obligatorios**; se incentiva tenerlos llenos.

### 2.2 Market (abajo)

* Catálogo de misiones por tipo (Main/Hunt/Skill).
* Desde aquí se **activa** una misión en un **slot libre**.
* Si un slot está ocupado:

  * **Reroll en Market** (cambia opciones sin tocar el slot activo), o
  * **Abandono Honroso** del slot activo → **Failed** + **Cooldown 15d** (queda gris con countdown).

---

## 3) Duraciones, estados y reglas diarias

### 3.1 Duraciones

* **Main:** **14 días** (sincroniza con ciclo del Boss). Mensaje de estado al **día 7**.
* **Hunt:** **7 días**.
* **Skill:** **7 días**.
* **Enfriamiento:** **15 días** (todas).

### 3.2 Estados por misión

`idle → active → succeeded | failed (cooldown 15d)`

### 3.3 Heartbeat + Petals (regla diaria)

1. Tras enviar el **Daily Quest**, el jugador entra a **Misiones** y marca **Heartbeat** (1 tap).
2. Ese Heartbeat del día:

   * **Fija** el progreso del día.
   * **Activa** el **booster** de Hunt para **mañana**.
   * **Protege** los **Pétalos** (no se consume ninguno ese día).
3. Día **sin Heartbeat**: la misión **pierde 1 Petal**.
   Con **0 Petals** → **Failed** → **Cooldown 15d**.

---

## 4) Condiciones de éxito (por tipo)

* **Main Quest**: completar el **hito** del período (entrega simple: link/reflexión corta).
* **Hunt**: cumplir **sesiones mínimas** de la **tarea objetivo** (según Game Mode).
* **Skill Route**: completar **3–5 micro-nodos** ligados a una stat (Focus, Stamina, Calm…).

---

## 5) Boss quincenal (ligado a Main)

* **Disponibilidad:** aparece solo si **Main** está **activa** y alcanzó **Acto 2** en el ciclo.
* **Fase 1 — Escudo:** las **dailies vinculadas** bajan el escudo **solo si ese día hubo Heartbeat**.
* **Fase 2 — Golpe especial:** **1 acción única** (p. ej., publicar, plan semanal, pedir feedback) con **proof**.
* **Botín:** **Medalla** + **Aura (7d)** + **chance de Cofre**.

---

## 6) Recompensas y metajuego

* **Cofres**: drop al completar Hunt/Boss.
* **Medallas**: colección por temporada/boss.
* **Auras (7d)**: p. ej., **x1.5 XP** en la tarea objetivo de la Hunt, **+5’ Focus**.
* **Amuletos (rule-mods)**:

  * **Pétalo Extra**: +1 Petal a una misión activa.
  * **Atajo**: −5 días al **Cooldown** de una misión en enfriamiento.
  * **Deshielo**: **elimina el Cooldown** una vez.
  * **Sintonía de Skill**: +1 XP a **todas** las tareas etiquetadas con esa **stat** durante 7 días.

> Las recompensas **ayudan** a sostener hábitos y dificultad (no solo cosméticas).

---

## 7) UI/UX de cards (slots)

Cada **card** de misión debe mostrar:

* **Nombre** + **Tipo** (Main/Hunt/Skill).
* **Estado**: Active / Succeeded / Failed — **Cooldown XXd** (si aplica, en gris).
* **Requisitos** de activación (p. ej., “Boss requiere Main en Acto 2”).
* **Objetivo del período** (hito / sesiones / micro-nodos).
* **Tiempo restante** (countdown).
* **Pétalos** visibles (3 → 0).
* **Barra de progreso** + **indicador Heartbeat hoy** (on/off).
* **CTAs contextuales**:

  * **Heartbeat** (si no se marcó hoy).
  * **Vincular Daily** (para Fase 1 del Boss / Hunt).
  * **Golpe especial** (cuando Fase 2 está disponible).
  * **Entregar evidencia** (Main/Skill).
  * **Claim** (si hay botín).

### 7.1 Integración en Daily Quest

* Nueva sección: **“Tareas de Misión”** → lista de tareas de las misiones activas (etiquetadas).
* Al enviar Daily → **toast/CTA**: “Tu **Heartbeat** está listo. **Marcá** para asegurar el booster de mañana.”

---

## 8) Reglas por Game Mode (mínimas)

* **Low:** Hunt 1/sem (Light), Skill 1–2 nodos; Boss con golpe suave.
* **Chill:** Hunt 2/sem (Standard).
* **Flow:** Hunt 3/sem (Standard) + 1 **Heroic** opcional; Main activa.
* **Evolve:** Hunt 4/sem (Standard) + 1 **Heroic**; Boss con dos fases exigentes.

> Los objetivos de Hunt por semana **respetan** los weekly targets del modo.

---

## 9) Onboarding de Misiones

### Fase 1 (rápida, sin IA)

Mini-cuestionario basado en **tareas confirmadas** del usuario:

1. Elegir 1–2 **tareas ancla** para Main (ligadas a un objetivo si existe).
2. Marcar **tareas evitadas** → candidatas a **Hunt**.
3. Marcar **tareas que entrenan stats** → candidatas a **Skill**.
4. Elegir **horario preferido** para el **Heartbeat** diario.

### Fase 2 (IA, posterior)

El sistema IA propone Main/Hunt/Skill **calibradas** (narrativa + fricción + dificultad) leyendo el perfil confirmado.

---

## 10) Anti-abuso y coherencia

* **Booster** de Hunt se activa **solo** si hubo **Heartbeat el día anterior**.
* **Una Hunt con booster** por semana (no acumular boosters cruzados).
* **Claim**: idempotente, solo para misiones `succeeded` y **exclusivo** en `/dashboard-v3/missions-v2`.

---

## 11) Métricas de éxito esperadas

* **% días con Heartbeat** ≥ **80%** (entre quienes hacen Daily).
* **↑ visitas diarias** al dashboard (Heartbeat + Claim).
* **% activación semanal** (≥ 1 slot) ≥ **70%**.
* **% éxito Hunt** ≥ **50%** (Flow/Evolve).
* **Tiempo en pantalla** +**30–60 s**.

---

## 12) Ejemplos de contratos (referencial, para alinear equipos)

> *Nota: estos ejemplos son para comunicación de producto. La implementación real puede variar.*

### 12.1 `GET /api/missions/board` (resumen)

```json
{
  "slots": [
    {
      "slot": "MAIN",
      "mission_id": "m-123",
      "name": "Acto 2: Mensaje y Primer Envío",
      "state": "active",
      "petals": 2,
      "heartbeat_today": false,
      "time_left": "7d 12h",
      "goal": "Entregar link del borrador",
      "progress_pct": 45,
      "requires": "Boss disponible al alcanzar Acto 2",
      "ctas": ["HEARTBEAT", "SUBMIT_PROOF"]
    },
    {
      "slot": "HUNT",
      "mission_id": "m-456",
      "name": "Romper fricción: Lectura Profunda",
      "state": "active",
      "petals": 3,
      "heartbeat_today": false,
      "time_left": "5d 3h",
      "goal": "3 sesiones de 25’ (Flow)",
      "progress_pct": 33,
      "ctas": ["HEARTBEAT", "LINK_DAILY"]
    },
    {
      "slot": "SKILL",
      "mission_id": "m-789",
      "name": "Focus Route I",
      "state": "active",
      "petals": 3,
      "heartbeat_today": true,
      "time_left": "6d 20h",
      "goal": "Completar 3 micro-nodos",
      "progress_pct": 20,
      "ctas": ["HEARTBEAT", "SUBMIT_PROOF"]
    }
  ],
  "boss": {
    "available": true,
    "phase": 1,
    "shield_pct": 60,
    "requires": "Main en Acto 2",
    "cta": "SPECIAL_STRIKE"
  },
  "rewards": {
    "claimable": true,
    "items": ["Aura: Focus +5’ (7d)", "Amuleto: Pétalo Extra"]
  }
}
```

### 12.2 `POST /api/missions/heartbeat`

```json
{
  "mission_ids": ["m-123","m-456","m-789"],
  "timestamp": "2025-10-20T20:12:00+02:00"
}
```

---

## 13) Copys de producto (cortos)

* **Toast post-Daily:** “Tu **Heartbeat** está listo. Marcá para asegurar el booster de mañana.”
* **Card (sin Heartbeat):** “Hoy aún no marcaste Heartbeat. Protegé tus Pétalos.”
* **Hunt (booster activo):** “Booster ON para mañana. Seguí así.”
* **Failed → Cooldown:** “Entró en enfriamiento por 15 días. Podés usar un **Amuleto: Deshielo** para reactivarla.”
* **Boss (Fase 2 abierta):** “El golpe especial está listo. Entregá tu prueba.”

---

## 14) Glosario rápido

* **Pulso / Heartbeat**: marca diaria que asegura beneficios y protege la misión.
* **Pétalos / Petals**: tolerancia a olvidos (3 por misión).
* **Enfriamiento / Cooldown (15d)**: bloqueo tras fallar.
* **Amuletos / Amulets**: modificadores de reglas (Pétalo Extra, Atajo, Deshielo, Sintonía).
* **Aura / Aura (7d)**: buff temporal.
* **Boss**: prueba quincenal en 2 fases; requiere Main en Acto 2.

---

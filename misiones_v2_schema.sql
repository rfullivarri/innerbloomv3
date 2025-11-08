-- Schema for missions v2 derived from migracion-misiones.md analysis
BEGIN;

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL
);

CREATE TABLE missions_seasons (
    season_id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    starts_at DATE,
    ends_at DATE
);

CREATE TABLE mission_slots (
    slot_key TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    sort_order INT NOT NULL,
    CHECK (slot_key IN ('main','hunt','skill'))
);

CREATE TABLE missions_catalog (
    mission_id TEXT PRIMARY KEY,
    slot_key TEXT NOT NULL REFERENCES mission_slots(slot_key),
    name TEXT NOT NULL,
    summary TEXT NOT NULL,
    requirements TEXT,
    objective TEXT,
    difficulty TEXT,
    duration_days INT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE mission_objectives (
    mission_objective_id SERIAL PRIMARY KEY,
    mission_id TEXT NOT NULL REFERENCES missions_catalog(mission_id) ON DELETE CASCADE,
    position INT NOT NULL,
    description TEXT NOT NULL,
    UNIQUE (mission_id, position)
);

CREATE TABLE mission_rewards (
    mission_id TEXT PRIMARY KEY REFERENCES missions_catalog(mission_id) ON DELETE CASCADE,
    xp INT,
    currency INT
);

CREATE TABLE mission_reward_items (
    mission_id TEXT NOT NULL REFERENCES missions_catalog(mission_id) ON DELETE CASCADE,
    position INT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (mission_id, position)
);

CREATE TABLE tasks_catalog (
    task_id UUID PRIMARY KEY,
    slot_key TEXT NOT NULL REFERENCES mission_slots(slot_key),
    name TEXT NOT NULL,
    tag TEXT
);

CREATE TABLE mission_tasks (
    mission_id TEXT NOT NULL REFERENCES missions_catalog(mission_id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks_catalog(task_id),
    position INT NOT NULL,
    PRIMARY KEY (mission_id, task_id),
    UNIQUE (mission_id, position)
);

CREATE TABLE mission_tags (
    mission_id TEXT NOT NULL REFERENCES missions_catalog(mission_id) ON DELETE CASCADE,
    position INT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (mission_id, position)
);

CREATE TABLE mission_market_proposals (
    proposal_id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL REFERENCES missions_catalog(mission_id) ON DELETE CASCADE,
    slot_key TEXT NOT NULL REFERENCES mission_slots(slot_key),
    display_order INT NOT NULL,
    UNIQUE (slot_key, display_order)
);

CREATE TABLE user_mission_boards (
    board_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    season_id TEXT NOT NULL REFERENCES missions_seasons(season_id),
    generated_at TIMESTAMPTZ NOT NULL,
    boss_state JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE user_slot_states (
    slot_state_id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES user_mission_boards(board_id) ON DELETE CASCADE,
    slot_key TEXT NOT NULL REFERENCES mission_slots(slot_key),
    status TEXT NOT NULL,
    selected_mission_id TEXT REFERENCES missions_catalog(mission_id),
    selected_proposal_id TEXT REFERENCES mission_market_proposals(proposal_id),
    selected_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    cooldown_until TIMESTAMPTZ,
    progress_current INT,
    progress_target INT,
    progress_unit TEXT,
    progress_updated_at TIMESTAMPTZ,
    reroll_remaining INT,
    reroll_total INT,
    reroll_next_reset_at TIMESTAMPTZ,
    reroll_used_at TIMESTAMPTZ,
    petals_total INT,
    petals_remaining INT,
    petals_last_evaluated_at DATE,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    claim_reward JSONB
);

CREATE TABLE mission_heartbeat_logs (
    heartbeat_id BIGSERIAL PRIMARY KEY,
    slot_state_id TEXT NOT NULL REFERENCES user_slot_states(slot_state_id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE mission_effects (
    effect_id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES user_mission_boards(board_id) ON DELETE CASCADE,
    effect_type TEXT NOT NULL,
    name TEXT,
    description TEXT,
    applied_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    payload JSONB NOT NULL
);

CREATE TABLE mission_boosters (
    board_id TEXT PRIMARY KEY REFERENCES user_mission_boards(board_id) ON DELETE CASCADE,
    multiplier NUMERIC(5,2) NOT NULL,
    target_task_id UUID REFERENCES tasks_catalog(task_id),
    next_activation_date DATE,
    applied_keys JSONB NOT NULL DEFAULT '[]'::jsonb
);

INSERT INTO mission_slots (slot_key, description, sort_order) VALUES
    ('main', 'Actos principales y narrativa central', 1),
    ('hunt', 'Hunts tácticas intensivas', 2),
    ('skill', 'Entrenamientos de skill route', 3)
ON CONFLICT (slot_key) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO users (user_id, display_name) VALUES
    ('user_demo_active', 'User Demo Active'),
    ('user_demo_claim', 'User Demo Claim'),
    ('user_demo_cooldown', 'User Demo Cooldown'),
    ('user_demo_idle', 'User Demo Idle')
ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name;

INSERT INTO missions_seasons (season_id, label, starts_at, ends_at) VALUES
    ('2025-Q4', 'Temporada 2025-Q4', NULL, NULL)
ON CONFLICT (season_id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO missions_catalog (mission_id, slot_key, name, summary, requirements, objective, difficulty, duration_days, metadata) VALUES
    ('mst_hunt_active_chain', 'hunt', 'Cadena de Fricción', 'Atacá la tarea con mayor fricción y mantené la cadena activa.', 'Vinculá la tarea desde el Daily y activá el booster con Heartbeat.', 'Lograr 3 sesiones consecutivas con booster activo.', 'high', 7, '{"boosterMultiplier": 1.5}'::jsonb),
    ('mst_hunt_claim_chain', 'hunt', 'Cadena de Fricción', 'Atacá la tarea con mayor fricción y mantené la cadena activa.', 'Vinculá la tarea desde el Daily y activá el booster con Heartbeat.', 'Lograr 3 sesiones consecutivas con booster activo.', 'high', 7, '{"boosterMultiplier": 1.5}'::jsonb),
    ('mst_hunt_cooldown_chain', 'hunt', 'Cadena de Fricción', 'Atacá la tarea con mayor fricción y mantené la cadena activa.', 'Vinculá la tarea desde el Daily y activá el booster con Heartbeat.', 'Lograr 3 sesiones consecutivas con booster activo.', 'high', 7, '{"boosterMultiplier": 1.5}'::jsonb),
    ('mst_hunt_market_echo', 'hunt', 'Hunt · Eco de Bloqueos', 'Audita bloqueos recurrentes y define protocolos de respuesta inmediata.', 'Al menos una hunt activa esta semana y booster configurado.', 'Mapear fricciones, proponer respuestas y socializar aprendizajes.', 'high', 9, '{"cadence": "biweekly", "boosterMultiplier": 1.6, "report": "echo_log"}'::jsonb),
    ('mst_hunt_market_flux', 'hunt', 'Hunt · Ritmo Flux', 'Encadená tres sesiones híbridas alternando foco profundo y salida táctica.', 'Booster apuntado y daily vinculada antes de iniciar el ciclo.', 'Destrabar backlog crítico combinando focus + sprint en un mismo bloque.', 'high', 7, '{"cadence": "weekly", "boosterMultiplier": 1.5, "window": "3 sesiones"}'::jsonb),
    ('mst_hunt_market_guardian', 'hunt', 'Hunt · Guardia Aurora', 'Protegé tu franja de máxima energía ejecutando hunts al amanecer.', 'Agenda bloqueada antes de las 8am y heartbeats previos en verde.', 'Completar tres hunts madrugadoras con evidencia y checklist de salida.', 'medium', 7, '{"cadence": "weekly", "boosterMultiplier": 1.3, "window": "3 mañanas"}'::jsonb),
    ('mst_main_active_act2', 'main', 'Acto 2: Mensaje y Primer Envío', 'Convertí tu intención en un acto público dentro de la quincena.', 'Necesitás haber completado el Acto 1 y sostener Heartbeat por 7 días.', 'Entregar la evidencia del acto central y registrar el aprendizaje clave.', 'medium', 14, '{"cadence": "biweekly", "narrative": "acto_central"}'::jsonb),
    ('mst_main_claim_act2', 'main', 'Acto 2: Mensaje y Primer Envío', 'Convertí tu intención en un acto público dentro de la quincena.', 'Necesitás haber completado el Acto 1 y sostener Heartbeat por 7 días.', 'Entregar la evidencia del acto central y registrar el aprendizaje clave.', 'medium', 14, '{"cadence": "biweekly", "narrative": "acto_central"}'::jsonb),
    ('mst_main_cooldown_fall', 'main', 'Acto 2: Mensaje y Primer Envío', 'Convertí tu intención en un acto público dentro de la quincena.', 'Necesitás haber completado el Acto 1 y sostener Heartbeat por 7 días.', 'Entregar la evidencia del acto central y registrar el aprendizaje clave.', 'medium', 14, '{"cadence": "biweekly", "narrative": "acto_central"}'::jsonb),
    ('mst_main_market_compass', 'main', 'Acto II · Brújula de Ruta', 'Diseñá una brújula pública con hitos, riesgos y próximos pasos.', 'Acto 1 registrado, heartbeats sostenidos y backlog priorizado.', 'Publicar una brújula que guíe decisiones y convide a tu comunidad.', 'medium', 12, '{"cadence": "biweekly", "narrative": "acto_central", "spotlight": "public_compass"}'::jsonb),
    ('mst_main_market_constellation', 'main', 'Acto III · Constelación de Legado', 'Mapeá aliados y entregables clave para sostener el legado del Acto.', 'Acto 2 completo, boss fase 1 derribado y círculos de apoyo activos.', 'Construir una constelación de continuidad que habilite próximos actos.', 'epic', 18, '{"cadence": "monthly", "narrative": "acto_final", "spotlight": "legacy_constellation"}'::jsonb),
    ('mst_main_market_signal_fire', 'main', 'Acto II · Faro de Resonancia', 'Levantá un faro narrativo que oriente a tu comunidad en diez días.', 'Acto 1 integrado, Heartbeat activo y al menos dos aliades confirmades.', 'Activar un faro público que documente avances y aprendizajes del Acto.', 'high', 10, '{"cadence": "biweekly", "narrative": "acto_central", "spotlight": "signal_fire"}'::jsonb),
    ('mst_skill_active_focus', 'skill', 'Skill Route · Focus', 'Entrená tu Focus completando micro-nodos guiados.', 'Elegí un horario y sostené Heartbeat diario.', 'Completar 4 micro-nodos de Focus y compartir síntesis.', 'medium', 7, '{"stat": "Focus", "cadence": "weekly"}'::jsonb),
    ('mst_skill_claim_focus', 'skill', 'Skill Route · Focus', 'Entrená tu Focus completando micro-nodos guiados.', 'Elegí un horario y sostené Heartbeat diario.', 'Completar 4 micro-nodos de Focus y compartir síntesis.', 'medium', 7, '{"stat": "Focus", "cadence": "weekly"}'::jsonb),
    ('mst_skill_market_focusflow', 'skill', 'Skill Route · Focus Flow', 'Profundizá tu foco completando micro-nodos con entregables visibles.', 'Slot libre, horario bloqueado y Heartbeat diario activo.', 'Encadenar cinco micro-nodos de focus con síntesis accionables.', 'medium', 7, '{"cadence": "weekly", "stat": "Focus", "track": "deep_work"}'::jsonb),
    ('mst_skill_market_resilienceforge', 'skill', 'Skill Route · Resilience Forge', 'Forjá resiliencia emocional con micro-retos y rituales de cierre.', 'Slot Skill libre, acompañamiento disponible y bitácora emocional.', 'Ejecutar cuatro micro-retos que expandan resiliencia y documentación emocional.', 'high', 9, '{"cadence": "weekly", "stat": "Resilience", "track": "inner_game"}'::jsonb),
    ('mst_skill_market_voicecraft', 'skill', 'Skill Route · Voicecraft', 'Amplificá tu storytelling con ciclos cortos de práctica + feedback.', 'Slot Skill libre y compromiso de feedback asincrónico.', 'Publicar tres piezas narrativas iteradas con retroalimentación real.', 'medium', 8, '{"cadence": "weekly", "stat": "Storytelling", "track": "communication"}'::jsonb);

INSERT INTO mission_objectives (mission_id, position, description) VALUES
    ('mst_hunt_market_echo', 1, 'Registrar bloqueos en dos hunts consecutivas con timestamp y causa.'),
    ('mst_hunt_market_echo', 2, 'Prototipar una acción de respuesta rápida para cada bloqueo detectado.'),
    ('mst_hunt_market_echo', 3, 'Compartir informe Eco con aliades y acordar seguimiento en 72h.'),
    ('mst_hunt_market_flux', 1, 'Planificá un bloque de 120 minutos dividido en tres micro-sesiones.'),
    ('mst_hunt_market_flux', 2, 'Activá booster al inicio de cada micro-sesión y registra Heartbeat.'),
    ('mst_hunt_market_flux', 3, 'Documentá el flujo completo en un panel con aprendizajes y próximos pasos.'),
    ('mst_hunt_market_guardian', 1, 'Configura ritual previo y recordatorios para iniciar antes de las 7:45.'),
    ('mst_hunt_market_guardian', 2, 'Registrar Heartbeat + booster y snapshot de avance en cada sesión.'),
    ('mst_hunt_market_guardian', 3, 'Compilar reporte express con bloqueos y próximos pasos en canal compartido.'),
    ('mst_main_market_compass', 1, 'Definí tres hitos con evidencia esperada y responsables aliados.'),
    ('mst_main_market_compass', 2, 'Documentá riesgos críticos y protocolos de contención.'),
    ('mst_main_market_compass', 3, 'Compartí la brújula públicamente y registra feedback recibido.'),
    ('mst_main_market_constellation', 1, 'Identificá cinco nodos aliados y documentá su rol en la constelación.'),
    ('mst_main_market_constellation', 2, 'Diseñá un canvas visual que conecte entregables, responsables y ritmos.'),
    ('mst_main_market_constellation', 3, 'Facilitá una sesión de alineación y registrá acuerdos y tensiones.'),
    ('mst_main_market_signal_fire', 1, 'Diseñá una pieza central (landing, hilo o video) que actúe como faro del Acto.'),
    ('mst_main_market_signal_fire', 2, 'Curá tres testimonios o señales externas que refuercen el mensaje.'),
    ('mst_main_market_signal_fire', 3, 'Publicá el faro y registrá métricas o feedback recibido en un tablero vivo.'),
    ('mst_skill_market_focusflow', 1, 'Completar cinco micro-nodos guiados y registrar evidencia visual.'),
    ('mst_skill_market_focusflow', 2, 'Publicar bitácora breve tras cada sesión con decisiones tomadas.'),
    ('mst_skill_market_focusflow', 3, 'Compartir un wrap-up semanal con tu squad o mentoría.'),
    ('mst_skill_market_resilienceforge', 1, 'Diseñá cuatro retos progresivos con foco en incomodidad estratégica.'),
    ('mst_skill_market_resilienceforge', 2, 'Registrar emociones antes y después en tu bitácora guiada.'),
    ('mst_skill_market_resilienceforge', 3, 'Compartir aprendizajes y señales de alerta con tu squad o mentoría.'),
    ('mst_skill_market_voicecraft', 1, 'Crear tres borradores con aplicación directa a tu misión principal.'),
    ('mst_skill_market_voicecraft', 2, 'Recibir feedback de dos aliades y documentar ajustes clave.'),
    ('mst_skill_market_voicecraft', 3, 'Publicar una versión final integrando aprendizajes y próximos pasos.');

INSERT INTO mission_rewards (mission_id, xp, currency) VALUES
    ('mst_hunt_active_chain', 200, 12),
    ('mst_hunt_claim_chain', 220, 15),
    ('mst_hunt_cooldown_chain', 200, 12),
    ('mst_hunt_market_echo', 230, 16),
    ('mst_hunt_market_flux', 220, 15),
    ('mst_hunt_market_guardian', 200, 13),
    ('mst_main_active_act2', 320, 20),
    ('mst_main_claim_act2', 360, 25),
    ('mst_main_cooldown_fall', 320, 20),
    ('mst_main_market_compass', 300, 20),
    ('mst_main_market_constellation', 380, 26),
    ('mst_main_market_signal_fire', 340, 22),
    ('mst_skill_active_focus', 140, 7),
    ('mst_skill_claim_focus', 160, 9),
    ('mst_skill_market_focusflow', 180, 10),
    ('mst_skill_market_resilienceforge', 210, 12),
    ('mst_skill_market_voicecraft', 190, 11);

INSERT INTO mission_reward_items (mission_id, position, item_name, quantity) VALUES
    ('mst_hunt_active_chain', 1, 'Cofre de Cacería', 1),
    ('mst_hunt_active_chain', 2, 'Amuleto Solar', 1),
    ('mst_hunt_claim_chain', 1, 'Cofre de Cacería', 1),
    ('mst_hunt_cooldown_chain', 1, 'Cofre Resquebrajado', 1),
    ('mst_hunt_market_echo', 1, 'Kit Eco', 1),
    ('mst_hunt_market_echo', 2, 'Aura de Claridad', 1),
    ('mst_hunt_market_flux', 1, 'Catalizador Flux', 1),
    ('mst_hunt_market_flux', 2, 'Token de Momentum', 1),
    ('mst_hunt_market_guardian', 1, 'Tónico Aurora', 1),
    ('mst_hunt_market_guardian', 2, 'Sello de Ritmo', 1),
    ('mst_main_active_act2', 1, 'Medalla de Acto', 1),
    ('mst_main_active_act2', 2, 'Aura del Mensaje', 1),
    ('mst_main_claim_act2', 1, 'Cofre del Acto', 1),
    ('mst_main_claim_act2', 2, 'Medalla de Honor', 1),
    ('mst_main_claim_act2', 3, 'Aura Prisma', 1),
    ('mst_main_cooldown_fall', 1, 'Medalla Rota', 1),
    ('mst_main_market_compass', 1, 'Mapa del Acto', 1),
    ('mst_main_market_compass', 2, 'Token de Navegación', 1),
    ('mst_main_market_constellation', 1, 'Carta Constelación', 1),
    ('mst_main_market_constellation', 2, 'Aura de Continuidad', 1),
    ('mst_main_market_signal_fire', 1, 'Insignia Faro', 1),
    ('mst_main_market_signal_fire', 2, 'Aura Resonante', 1),
    ('mst_skill_active_focus', 1, 'Cristal de Focus', 1),
    ('mst_skill_claim_focus', 1, 'Manual de Focus', 1),
    ('mst_skill_market_focusflow', 1, 'Cristal Focus Flow', 1),
    ('mst_skill_market_focusflow', 2, 'Token de Ritmo', 1),
    ('mst_skill_market_resilienceforge', 1, 'Amuleto Forge', 1),
    ('mst_skill_market_resilienceforge', 2, 'Aura de Fortaleza', 1),
    ('mst_skill_market_voicecraft', 1, 'Pluma Resonante', 1),
    ('mst_skill_market_voicecraft', 2, 'Aura de Voz', 1);

INSERT INTO tasks_catalog (task_id, slot_key, name, tag) VALUES
    ('11111111-1111-4111-8111-111111111111', 'main', 'Reflexión diaria del Acto', 'reflection'),
    ('11111111-1111-4111-8111-111111111112', 'main', 'Subir evidencia del Acto', 'proof'),
    ('22222222-2222-4222-8222-222222222221', 'hunt', 'Sesión de Hunt con booster', 'session'),
    ('22222222-2222-4222-8222-222222222222', 'hunt', 'Vincular Daily a la Hunt', 'link'),
    ('33333333-3333-4333-8333-333333333331', 'skill', 'Micro-nodo de Focus', 'skill_node'),
    ('33333333-3333-4333-8333-333333333332', 'skill', 'Compartir síntesis de avance', 'proof')
ON CONFLICT (task_id) DO UPDATE SET name = EXCLUDED.name, tag = EXCLUDED.tag;

INSERT INTO mission_tasks (mission_id, task_id, position) VALUES
    ('mst_hunt_active_chain', '22222222-2222-4222-8222-222222222221', 1),
    ('mst_hunt_active_chain', '22222222-2222-4222-8222-222222222222', 2),
    ('mst_hunt_claim_chain', '22222222-2222-4222-8222-222222222221', 1),
    ('mst_hunt_claim_chain', '22222222-2222-4222-8222-222222222222', 2),
    ('mst_hunt_cooldown_chain', '22222222-2222-4222-8222-222222222221', 1),
    ('mst_hunt_cooldown_chain', '22222222-2222-4222-8222-222222222222', 2),
    ('mst_hunt_market_echo', '22222222-2222-4222-8222-222222222221', 1),
    ('mst_hunt_market_echo', '22222222-2222-4222-8222-222222222222', 2),
    ('mst_hunt_market_flux', '22222222-2222-4222-8222-222222222221', 1),
    ('mst_hunt_market_flux', '22222222-2222-4222-8222-222222222222', 2),
    ('mst_hunt_market_guardian', '22222222-2222-4222-8222-222222222221', 1),
    ('mst_hunt_market_guardian', '22222222-2222-4222-8222-222222222222', 2),
    ('mst_main_active_act2', '11111111-1111-4111-8111-111111111111', 1),
    ('mst_main_active_act2', '11111111-1111-4111-8111-111111111112', 2),
    ('mst_main_claim_act2', '11111111-1111-4111-8111-111111111111', 1),
    ('mst_main_claim_act2', '11111111-1111-4111-8111-111111111112', 2),
    ('mst_main_cooldown_fall', '11111111-1111-4111-8111-111111111111', 1),
    ('mst_main_cooldown_fall', '11111111-1111-4111-8111-111111111112', 2),
    ('mst_main_market_compass', '11111111-1111-4111-8111-111111111111', 1),
    ('mst_main_market_compass', '11111111-1111-4111-8111-111111111112', 2),
    ('mst_main_market_constellation', '11111111-1111-4111-8111-111111111111', 1),
    ('mst_main_market_constellation', '11111111-1111-4111-8111-111111111112', 2),
    ('mst_main_market_signal_fire', '11111111-1111-4111-8111-111111111111', 1),
    ('mst_main_market_signal_fire', '11111111-1111-4111-8111-111111111112', 2),
    ('mst_skill_active_focus', '33333333-3333-4333-8333-333333333331', 1),
    ('mst_skill_active_focus', '33333333-3333-4333-8333-333333333332', 2),
    ('mst_skill_claim_focus', '33333333-3333-4333-8333-333333333331', 1),
    ('mst_skill_claim_focus', '33333333-3333-4333-8333-333333333332', 2),
    ('mst_skill_market_focusflow', '33333333-3333-4333-8333-333333333331', 1),
    ('mst_skill_market_focusflow', '33333333-3333-4333-8333-333333333332', 2),
    ('mst_skill_market_resilienceforge', '33333333-3333-4333-8333-333333333331', 1),
    ('mst_skill_market_resilienceforge', '33333333-3333-4333-8333-333333333332', 2),
    ('mst_skill_market_voicecraft', '33333333-3333-4333-8333-333333333331', 1),
    ('mst_skill_market_voicecraft', '33333333-3333-4333-8333-333333333332', 2);

INSERT INTO mission_tags (mission_id, position, tag) VALUES
    ('mst_hunt_market_echo', 1, 'diagnóstico'),
    ('mst_hunt_market_echo', 2, 'booster'),
    ('mst_hunt_market_echo', 3, 'aprendizaje'),
    ('mst_hunt_market_flux', 1, 'booster'),
    ('mst_hunt_market_flux', 2, 'ritmo'),
    ('mst_hunt_market_flux', 3, 'flujo'),
    ('mst_hunt_market_guardian', 1, 'booster'),
    ('mst_hunt_market_guardian', 2, 'ritual'),
    ('mst_hunt_market_guardian', 3, 'mañana'),
    ('mst_main_market_compass', 1, 'acto'),
    ('mst_main_market_compass', 2, 'planificación'),
    ('mst_main_market_compass', 3, 'comunidad'),
    ('mst_main_market_constellation', 1, 'acto'),
    ('mst_main_market_constellation', 2, 'legado'),
    ('mst_main_market_constellation', 3, 'alianzas'),
    ('mst_main_market_signal_fire', 1, 'acto'),
    ('mst_main_market_signal_fire', 2, 'resonancia'),
    ('mst_main_market_signal_fire', 3, 'publicación'),
    ('mst_skill_market_focusflow', 1, 'focus'),
    ('mst_skill_market_focusflow', 2, 'constancia'),
    ('mst_skill_market_focusflow', 3, 'ritual'),
    ('mst_skill_market_resilienceforge', 1, 'resilience'),
    ('mst_skill_market_resilienceforge', 2, 'emotions'),
    ('mst_skill_market_resilienceforge', 3, 'crecimiento'),
    ('mst_skill_market_voicecraft', 1, 'storytelling'),
    ('mst_skill_market_voicecraft', 2, 'feedback'),
    ('mst_skill_market_voicecraft', 3, 'creatividad');

INSERT INTO mission_market_proposals (proposal_id, mission_id, slot_key, display_order) VALUES
    ('mst_hunt_market_echo', 'mst_hunt_market_echo', 'hunt', 3),
    ('mst_hunt_market_flux', 'mst_hunt_market_flux', 'hunt', 1),
    ('mst_hunt_market_guardian', 'mst_hunt_market_guardian', 'hunt', 2),
    ('mst_main_market_compass', 'mst_main_market_compass', 'main', 3),
    ('mst_main_market_constellation', 'mst_main_market_constellation', 'main', 2),
    ('mst_main_market_signal_fire', 'mst_main_market_signal_fire', 'main', 1),
    ('mst_skill_market_focusflow', 'mst_skill_market_focusflow', 'skill', 1),
    ('mst_skill_market_resilienceforge', 'mst_skill_market_resilienceforge', 'skill', 3),
    ('mst_skill_market_voicecraft', 'mst_skill_market_voicecraft', 'skill', 2)
ON CONFLICT (proposal_id) DO UPDATE SET display_order = EXCLUDED.display_order;

INSERT INTO user_mission_boards (board_id, user_id, season_id, generated_at, boss_state) VALUES
    ('board_user_demo_active', 'user_demo_active', '2025-Q4', '2025-10-20T20:16:51.351Z', '{"phase": 1, "shield": {"current": 3, "max": 6, "updatedAt": "2025-10-20T18:16:51.351Z"}, "linkedDailyTaskId": "22222222-2222-4222-8222-222222222222", "linkedAt": "2025-10-20T00:16:51.351Z", "phase2": {"ready": false, "proof": null, "submittedAt": null}}'::jsonb),
    ('board_user_demo_claim', 'user_demo_claim', '2025-Q4', '2025-10-20T19:16:51.351Z', '{"phase": 2, "shield": {"current": 0, "max": 6, "updatedAt": "2025-10-20T18:16:51.351Z"}, "linkedDailyTaskId": "22222222-2222-4222-8222-222222222222", "linkedAt": "2025-10-19T14:16:51.351Z", "phase2": {"ready": true, "proof": null, "submittedAt": null}}'::jsonb),
    ('board_user_demo_cooldown', 'user_demo_cooldown', '2025-Q4', '2025-10-20T18:16:51.351Z', '{"phase": 1, "shield": {"current": 6, "max": 6, "updatedAt": "2025-10-19T20:16:51.351Z"}, "linkedDailyTaskId": null, "linkedAt": null, "phase2": {"ready": false, "proof": null, "submittedAt": null}}'::jsonb),
    ('board_user_demo_idle', 'user_demo_idle', '2025-Q4', '2025-10-20T17:16:51.351Z', '{"phase": 1, "shield": {"current": 6, "max": 6, "updatedAt": "2025-10-20T17:16:51.351Z"}, "linkedDailyTaskId": null, "linkedAt": null, "phase2": {"ready": false, "proof": null, "submittedAt": null}}'::jsonb);

INSERT INTO user_slot_states (slot_state_id, board_id, slot_key, status, selected_mission_id, selected_proposal_id, selected_at, updated_at, expires_at, cooldown_until, progress_current, progress_target, progress_unit, progress_updated_at, reroll_remaining, reroll_total, reroll_next_reset_at, reroll_used_at, petals_total, petals_remaining, petals_last_evaluated_at, completed_at, failed_at, claimed_at, claim_reward) VALUES
    ('user_demo_active_hunt', 'board_user_demo_active', 'hunt', 'active', 'mst_hunt_active_chain', NULL, '2025-10-14T20:16:51.351Z', '2025-10-20T17:16:51.351Z', '2025-10-21T20:16:51.351Z', NULL, 1, 3, 'sessions', '2025-10-20T17:16:51.351Z', 1, 1, NULL, NULL, 3, 2, '2025-10-20', NULL, NULL, NULL, '{}'::jsonb),
    ('user_demo_active_main', 'board_user_demo_active', 'main', 'active', 'mst_main_active_act2', NULL, '2025-10-08T20:16:51.351Z', '2025-10-20T19:16:51.351Z', '2025-10-22T20:16:51.351Z', NULL, 3, 5, 'tasks', '2025-10-20T19:16:51.351Z', 1, 1, NULL, NULL, 3, 3, '2025-10-20', NULL, NULL, NULL, '{}'::jsonb),
    ('user_demo_active_skill', 'board_user_demo_active', 'skill', 'active', 'mst_skill_active_focus', NULL, '2025-10-15T20:16:51.351Z', '2025-10-20T18:16:51.351Z', '2025-10-22T20:16:51.351Z', NULL, 2, 5, 'tasks', '2025-10-20T18:16:51.351Z', 1, 1, NULL, NULL, 3, 1, '2025-10-20', NULL, NULL, NULL, '{}'::jsonb),
    ('user_demo_claim_hunt', 'board_user_demo_claim', 'hunt', 'active', 'mst_hunt_claim_chain', NULL, '2025-10-15T20:16:51.351000Z', '2025-10-20T15:16:51.351Z', '2025-10-22T20:16:51.351000Z', NULL, 2, 3, 'sessions', '2025-10-20T15:16:51.351Z', 0, 1, '2025-10-26T20:16:51.351Z', '2025-10-19T20:16:51.351Z', 3, 3, '2025-10-20', NULL, NULL, NULL, '{}'::jsonb),
    ('user_demo_claim_main', 'board_user_demo_claim', 'main', 'succeeded', 'mst_main_claim_act2', NULL, '2025-10-07T20:16:51.351Z', '2025-10-20T18:16:51.351Z', '2025-10-21T20:16:51.351Z', NULL, 4, 4, 'tasks', '2025-10-20T18:16:51.351Z', 0, 1, NULL, NULL, 3, 1, '2025-10-20', '2025-10-20T18:16:51.351Z', NULL, NULL, '{}'::jsonb),
    ('user_demo_claim_skill', 'board_user_demo_claim', 'skill', 'claimed', 'mst_skill_claim_focus', NULL, '2025-10-12T20:16:51.351Z', '2025-10-20T10:16:51.351Z', '2025-10-19T20:16:51.351Z', '2025-10-22T20:16:51.351Z', 5, 5, 'tasks', '2025-10-20T10:16:51.351Z', 1, 1, NULL, NULL, 3, 2, '2025-10-20', '2025-10-20T09:16:51.351Z', NULL, '2025-10-19T20:16:51.351Z', '{"xp": 160, "currency": 9, "items": ["Manual de Focus"]}'::jsonb),
    ('user_demo_cooldown_hunt', 'board_user_demo_cooldown', 'hunt', 'failed', 'mst_hunt_cooldown_chain', NULL, '2025-10-08T20:16:51.351Z', '2025-10-20T12:16:51.351Z', '2025-10-15T20:16:51.351Z', '2025-11-04T20:16:51.351Z', 0, 3, 'sessions', '2025-10-20T12:16:51.351Z', 1, 1, NULL, NULL, 3, 0, '2025-10-18', NULL, '2025-10-20T12:16:51.351Z', NULL, '{}'::jsonb),
    ('user_demo_cooldown_main', 'board_user_demo_cooldown', 'main', 'failed', 'mst_main_cooldown_fall', NULL, '2025-10-04T20:16:51.351Z', '2025-10-20T14:16:51.351Z', '2025-10-18T20:16:51.351Z', '2025-11-04T20:16:51.351Z', 1, 5, 'tasks', '2025-10-20T14:16:51.351Z', 0, 1, '2025-10-22T20:16:51.351Z', '2025-10-15T20:16:51.351Z', 3, 0, '2025-10-18', NULL, '2025-10-20T14:16:51.351Z', NULL, '{}'::jsonb);

INSERT INTO mission_heartbeat_logs (slot_state_id, logged_at) VALUES
    ('user_demo_active_hunt', '2025-10-18T20:16:51.351Z'),
    ('user_demo_active_hunt', '2025-10-19T20:16:51.351Z'),
    ('user_demo_active_main', '2025-10-18T20:16:51.351Z'),
    ('user_demo_active_main', '2025-10-19T20:16:51.351Z'),
    ('user_demo_active_main', '2025-10-20T20:16:51.351Z'),
    ('user_demo_active_skill', '2025-10-17T20:16:51.351Z'),
    ('user_demo_active_skill', '2025-10-19T20:16:51.351Z'),
    ('user_demo_claim_hunt', '2025-10-19T20:16:51.351Z'),
    ('user_demo_claim_main', '2025-10-15T20:16:51.351Z'),
    ('user_demo_claim_main', '2025-10-17T20:16:51.351Z'),
    ('user_demo_claim_main', '2025-10-19T20:16:51.351Z'),
    ('user_demo_claim_skill', '2025-10-14T20:16:51.351Z'),
    ('user_demo_claim_skill', '2025-10-16T20:16:51.351Z'),
    ('user_demo_claim_skill', '2025-10-18T20:16:51.351Z'),
    ('user_demo_cooldown_hunt', '2025-10-11T20:16:51.351Z'),
    ('user_demo_cooldown_hunt', '2025-10-12T20:16:51.351Z'),
    ('user_demo_cooldown_main', '2025-10-12T20:16:51.351Z'),
    ('user_demo_cooldown_main', '2025-10-13T20:16:51.351Z'),
    ('user_demo_cooldown_main', '2025-10-14T20:16:51.351Z');

INSERT INTO mission_effects (effect_id, board_id, effect_type, name, description, applied_at, expires_at, payload) VALUES
    ('effect_demo_amulet', 'board_user_demo_claim', 'amulet', 'Amuleto del Eco', 'Reduce el cooldown de misiones fallidas en 5 días.', '2025-10-17T20:16:51.351Z', '2025-10-30T20:16:51.351Z', '{"kind": "cooldown_thaw", "days": 5}'::jsonb),
    ('effect_demo_aura', 'board_user_demo_claim', 'aura', 'Aura Prisma', 'Duplica la XP de tu próximo Acto.', '2025-10-19T20:16:51.351Z', '2025-10-25T20:16:51.351Z', '{"kind": "aura", "slot": "main", "bonus": "xp"}'::jsonb),
    ('effect_demo_cooldown', 'board_user_demo_cooldown', 'amulet', 'Amuleto del Deshielo', 'Aplica -3 días al próximo cooldown.', '2025-10-18T20:16:51.351Z', '2025-10-24T20:16:51.351Z', '{"kind": "cooldown_thaw", "days": 3}'::jsonb);

INSERT INTO mission_boosters (board_id, multiplier, target_task_id, next_activation_date, applied_keys) VALUES
    ('board_user_demo_active', 1.5, '22222222-2222-4222-8222-222222222221', '2025-10-21', '[]'::jsonb),
    ('board_user_demo_claim', 1.5, '22222222-2222-4222-8222-222222222221', NULL, '[]'::jsonb),
    ('board_user_demo_cooldown', 1.5, NULL, NULL, '[]'::jsonb),
    ('board_user_demo_idle', 1.5, NULL, NULL, '[]'::jsonb)
ON CONFLICT (board_id) DO UPDATE SET multiplier = EXCLUDED.multiplier, target_task_id = EXCLUDED.target_task_id, next_activation_date = EXCLUDED.next_activation_date, applied_keys = EXCLUDED.applied_keys;

COMMIT;

-- ============================================================================
-- LÓGICA DE NEGOCIO (copiada textual):
-- 1) Racha DIARIA por tarea (streak)
--    TZ: Europe/Berlin.
--    Un día cuenta si la tarea tuvo ≥1 log ese día.
--    Racha actual: # de días consecutivos que terminan hoy. Si hoy no hubo log, racha actual = 0.
--    Racha máxima: máximo histórico de días consecutivos.
--    Ejemplos: Lun-Vie ⇒ racha 5. 21 días seguidos y fallás el 22 ⇒ vuelve a 0.
-- 2) Constancia SEMANAL (panel C1S..C4S, tiers/rewards)
--    Semana ISO lunes–domingo, TZ Europe/Berlin.
--    days_in_week = # de días con log esa semana para la tarea.
--    Banderas por semana: C1S(≥1), C2S(≥2), C3S(≥3), C4S(≥4).
--    Constancia actual: en semana vigente, ¿cumple la meta del modo?
--    Constancia máxima: máximo histórico de days_in_week por tarea.
--    Game Mode ⇒ meta de días/semana: LOW→1, CHILL→2, FLOW→3, EVOLVE→4.
--    No afecta la regla de racha diaria.
-- 3) Daily Energy (barras Body/Mind/Soul)
--    Gracia: si el usuario tiene < 7 días únicos con logs en total ⇒ 100% en las 3 barras.
--    Modelo leaky tank por pilar.
--    Half-life por modo y pilar ⇒ decay = 1 - 0.5^(1/H).
--    100% semanal por modo: xpSemanaMax[p] = xpBase[p] * mode_mult.
--    Objetivo diario: xpDiaObj[p] = xpSemanaMax[p] / 7.
--    Conversión XP→energía: k[p] = (100 * decay[p]) / xpDiaObj[p] (si >0).
--    Actualización: E_today[p] = clamp(0,100, (1-decay[p]) * E_prev[p] + k[p] * XP_hoy[p])
--    XP_hoy[p] = suma de base_xp de todas las tasks del pilar en el último día con logs.
--    Guardar 0–1 (porcentaje/100). Si no hay E_prev, inicializar en 60%.
-- ============================================================================
-- Script: 001_schema.sql
-- Objetivo: Definir el esquema base y garantizar compatibilidad sin acciones destructivas.
--           Se crean extensiones, tablas y restricciones con patrones idempotentes.
--           Todas las operaciones se ejecutan dentro de una transacción segura.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Extensiones requeridas (no destructivo).
-- --------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- --------------------------------------------------------------------------
-- Tabla users: datos base de usuarios y modo de juego.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE,
  display_name text,
  start_date date DEFAULT current_date,
  game_mode text DEFAULT 'CHILL',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email citext,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS start_date date DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS game_mode text DEFAULT 'CHILL',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.users
  ALTER COLUMN game_mode SET DEFAULT 'CHILL',
  ALTER COLUMN start_date SET DEFAULT current_date,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_game_mode_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_game_mode_check
      CHECK (game_mode IN ('LOW','CHILL','FLOW','EVOLVE'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_pkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_email_key'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Tabla game_mode_rules: parámetros por modo.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_mode_rules (
  mode text PRIMARY KEY,
  weekly_goal_days int NOT NULL,
  xp_multiplier numeric(5,2) DEFAULT 1.00,
  half_life_body int,
  half_life_mind int,
  half_life_soul int,
  mode_mult numeric(5,2)
);

ALTER TABLE public.game_mode_rules
  ADD COLUMN IF NOT EXISTS weekly_goal_days int NOT NULL,
  ADD COLUMN IF NOT EXISTS xp_multiplier numeric(5,2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS half_life_body int,
  ADD COLUMN IF NOT EXISTS half_life_mind int,
  ADD COLUMN IF NOT EXISTS half_life_soul int,
  ADD COLUMN IF NOT EXISTS mode_mult numeric(5,2);

ALTER TABLE public.game_mode_rules
  ALTER COLUMN xp_multiplier SET DEFAULT 1.00;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'game_mode_rules_mode_check'
      AND conrelid = 'public.game_mode_rules'::regclass
  ) THEN
    ALTER TABLE public.game_mode_rules
      ADD CONSTRAINT game_mode_rules_mode_check
      CHECK (mode IN ('LOW','CHILL','FLOW','EVOLVE'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'game_mode_rules_pkey'
      AND conrelid = 'public.game_mode_rules'::regclass
  ) THEN
    ALTER TABLE public.game_mode_rules
      ADD CONSTRAINT game_mode_rules_pkey PRIMARY KEY (mode);
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Tabla tasks: configuración de tareas por usuario y pilar.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pillar text NOT NULL,
  trait text,
  stat text,
  name text NOT NULL,
  base_xp int DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS pillar text,
  ADD COLUMN IF NOT EXISTS trait text,
  ADD COLUMN IF NOT EXISTS stat text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS base_xp int DEFAULT 10,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.tasks
  ALTER COLUMN base_xp SET DEFAULT 10,
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'user_id'
      AND is_nullable = 'YES'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.tasks WHERE user_id IS NULL) THEN
      RAISE NOTICE 'No se aplicó NOT NULL en tasks.user_id por datos nulos existentes.';
    ELSE
      ALTER TABLE public.tasks ALTER COLUMN user_id SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'pillar'
      AND is_nullable = 'YES'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.tasks WHERE pillar IS NULL) THEN
      RAISE NOTICE 'No se aplicó NOT NULL en tasks.pillar por datos nulos existentes.';
    ELSE
      ALTER TABLE public.tasks ALTER COLUMN pillar SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'name'
      AND is_nullable = 'YES'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.tasks WHERE name IS NULL) THEN
      RAISE NOTICE 'No se aplicó NOT NULL en tasks.name por datos nulos existentes.';
    ELSE
      ALTER TABLE public.tasks ALTER COLUMN name SET NOT NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_pkey'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_pillar_check'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_pillar_check
      CHECK (pillar IN ('BODY','MIND','SOUL'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_user_fk'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_user_fk
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_user_id
  ON public.tasks(user_id);

-- --------------------------------------------------------------------------
-- Tabla task_logs: logs de ejecución de tareas.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL,
  performed_at timestamptz NOT NULL,
  qty int DEFAULT 1,
  source text,
  notes text
);

ALTER TABLE public.task_logs
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS task_id uuid,
  ADD COLUMN IF NOT EXISTS performed_at timestamptz,
  ADD COLUMN IF NOT EXISTS qty int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.task_logs
  ALTER COLUMN qty SET DEFAULT 1,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'task_logs' AND column_name = 'user_id'
      AND is_nullable = 'YES'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.task_logs WHERE user_id IS NULL) THEN
      RAISE NOTICE 'No se aplicó NOT NULL en task_logs.user_id por datos nulos existentes.';
    ELSE
      ALTER TABLE public.task_logs ALTER COLUMN user_id SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'task_logs' AND column_name = 'task_id'
      AND is_nullable = 'YES'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.task_logs WHERE task_id IS NULL) THEN
      RAISE NOTICE 'No se aplicó NOT NULL en task_logs.task_id por datos nulos existentes.';
    ELSE
      ALTER TABLE public.task_logs ALTER COLUMN task_id SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'task_logs' AND column_name = 'performed_at'
      AND is_nullable = 'YES'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.task_logs WHERE performed_at IS NULL) THEN
      RAISE NOTICE 'No se aplicó NOT NULL en task_logs.performed_at por datos nulos existentes.';
    ELSE
      ALTER TABLE public.task_logs ALTER COLUMN performed_at SET NOT NULL;
    END IF;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'task_logs_pkey'
      AND conrelid = 'public.task_logs'::regclass
  ) THEN
    ALTER TABLE public.task_logs
      ADD CONSTRAINT task_logs_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'task_logs_user_fk'
      AND conrelid = 'public.task_logs'::regclass
  ) THEN
    ALTER TABLE public.task_logs
      ADD CONSTRAINT task_logs_user_fk
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'task_logs_task_fk'
      AND conrelid = 'public.task_logs'::regclass
  ) THEN
    ALTER TABLE public.task_logs
      ADD CONSTRAINT task_logs_task_fk
      FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_task_logs_user_performed_at
  ON public.task_logs(user_id, performed_at);

CREATE INDEX IF NOT EXISTS idx_task_logs_task_performed_at
  ON public.task_logs(task_id, performed_at);

-- --------------------------------------------------------------------------
-- Tabla level_rules: escalado de niveles.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.level_rules (
  level int PRIMARY KEY,
  xp_required int NOT NULL
);

ALTER TABLE public.level_rules
  ADD COLUMN IF NOT EXISTS xp_required int;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'level_rules_pkey'
      AND conrelid = 'public.level_rules'::regclass
  ) THEN
    ALTER TABLE public.level_rules
      ADD CONSTRAINT level_rules_pkey PRIMARY KEY (level);
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Tabla daily_emotion: estados emocionales diarios.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_emotion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  emotion_key text NOT NULL,
  intensity int,
  CONSTRAINT daily_emotion_user_fk FOREIGN KEY (user_id)
    REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT daily_emotion_user_date_key UNIQUE (user_id, date)
);

ALTER TABLE public.daily_emotion
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS date date,
  ADD COLUMN IF NOT EXISTS emotion_key text,
  ADD COLUMN IF NOT EXISTS intensity int;

ALTER TABLE public.daily_emotion
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_emotion_pkey'
      AND conrelid = 'public.daily_emotion'::regclass
  ) THEN
    ALTER TABLE public.daily_emotion
      ADD CONSTRAINT daily_emotion_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_emotion_user_fk'
      AND conrelid = 'public.daily_emotion'::regclass
  ) THEN
    ALTER TABLE public.daily_emotion
      ADD CONSTRAINT daily_emotion_user_fk
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_emotion_user_date_key'
      AND conrelid = 'public.daily_emotion'::regclass
  ) THEN
    ALTER TABLE public.daily_emotion
      ADD CONSTRAINT daily_emotion_user_date_key UNIQUE (user_id, date);
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Tabla daily_energies: almacenamiento de energía 0-1 por día y pilar.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_energies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  body numeric,
  mind numeric,
  soul numeric,
  CONSTRAINT daily_energies_user_fk FOREIGN KEY (user_id)
    REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT daily_energies_user_date_key UNIQUE (user_id, date)
);

ALTER TABLE public.daily_energies
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS date date,
  ADD COLUMN IF NOT EXISTS body numeric,
  ADD COLUMN IF NOT EXISTS mind numeric,
  ADD COLUMN IF NOT EXISTS soul numeric;

ALTER TABLE public.daily_energies
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_energies_pkey'
      AND conrelid = 'public.daily_energies'::regclass
  ) THEN
    ALTER TABLE public.daily_energies
      ADD CONSTRAINT daily_energies_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_energies_user_fk'
      AND conrelid = 'public.daily_energies'::regclass
  ) THEN
    ALTER TABLE public.daily_energies
      ADD CONSTRAINT daily_energies_user_fk
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_energies_user_date_key'
      AND conrelid = 'public.daily_energies'::regclass
  ) THEN
    ALTER TABLE public.daily_energies
      ADD CONSTRAINT daily_energies_user_date_key UNIQUE (user_id, date);
  END IF;
END $$;

COMMIT;

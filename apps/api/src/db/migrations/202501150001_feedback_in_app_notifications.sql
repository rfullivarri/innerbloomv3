ALTER TABLE feedback_definitions
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO feedback_definitions (
  notification_key,
  label,
  type,
  scope,
  trigger,
  channel,
  frequency,
  status,
  priority,
  copy,
  cta_label,
  cta_href,
  preview_variables,
  config
)
VALUES (
  'inapp_level_up_popup',
  'Popup subida de nivel',
  'level_up_popup',
  ARRAY['in_app', 'level', 'dashboard'],
  'Se dispara automáticamente cuando el nivel actual supera al nivel previo.',
  'in_app_popup',
  'event',
  'active',
  80,
  'Acabás de llegar al nivel {{level}}. Seguí así.',
  'Revisar mis logros',
  '/dashboard-v3/rewards',
  '{"level":"5","cta":"Revisar mis logros"}',
  '{"title":"¡Subiste de nivel!","messageTemplate":"Acabás de llegar al nivel {{level}}. Seguí así.","emoji":"🏆"}'
),
(
  'inapp_streak_fire_popup',
  'Popup racha fueguitos',
  'streak_milestone_popup',
  ARRAY['in_app', 'streak', 'dashboard'],
  'Se dispara cuando al cerrar el día una o más tareas cruzan el umbral configurado de streak.',
  'in_app_popup',
  'event',
  'active',
  70,
  '🔥 Racha encendida. Lista de tareas en fuego disponible.',
  NULL,
  NULL,
  '{"tasks_json":"[{\"name\":\"Respirar\",\"streakDays\":3},{\"name\":\"Meditar\",\"streakDays\":4}]","threshold":"3"}',
  '{"title":"Racha encendida 🔥","singleTemplate":"{{taskName}} mantiene {{streakDays}} días seguidos.","aggregateTemplate":"Tenés {{count}} tareas prendidas fuego hoy.","threshold":3,"listMode":"auto","emoji":"🔥"}'
)
ON CONFLICT (notification_key) DO NOTHING;

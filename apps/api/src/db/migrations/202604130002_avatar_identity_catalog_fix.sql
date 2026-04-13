UPDATE cat_avatar
SET
  code = CASE avatar_id
    WHEN 1 THEN 'BLUE_AMPHIBIAN'
    WHEN 2 THEN 'GREEN_BEAR'
    WHEN 3 THEN 'RED_CAT'
    WHEN 4 THEN 'VIOLET_OWL'
    ELSE code
  END,
  name = CASE avatar_id
    WHEN 1 THEN 'Blue Amphibian'
    WHEN 2 THEN 'Green Bear'
    WHEN 3 THEN 'Red Cat'
    WHEN 4 THEN 'Violet Owl'
    ELSE name
  END,
  theme_tokens = CASE avatar_id
    WHEN 1 THEN jsonb_build_object('accent', '#00C2FF', 'chip', 'aqua')
    WHEN 2 THEN jsonb_build_object('accent', '#58CC02', 'chip', 'leaf')
    WHEN 3 THEN jsonb_build_object('accent', '#EF4444', 'chip', 'ember')
    WHEN 4 THEN jsonb_build_object('accent', '#A855F7', 'chip', 'violet')
    ELSE theme_tokens
  END,
  is_active = true,
  updated_at = now()
WHERE avatar_id IN (1, 2, 3, 4);

UPDATE users
SET avatar_id = 1
WHERE avatar_id IS NULL;

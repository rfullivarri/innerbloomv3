-- Resets the public schema by dropping all tables, views, materialized views, and sequences.
-- Run with `app.allow_destructive=on` if your environment requires explicit confirmation.

BEGIN;

DO $$
DECLARE
  rec record;
BEGIN
  RAISE NOTICE 'Dropping materialized views in public schema…';
  FOR rec IN (
    SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS public.%I CASCADE', rec.matviewname);
  END LOOP;

  RAISE NOTICE 'Dropping standard views in public schema…';
  FOR rec IN (
    SELECT viewname FROM pg_views WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', rec.viewname);
  END LOOP;

  RAISE NOTICE 'Dropping tables in public schema…';
  FOR rec IN (
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', rec.tablename);
  END LOOP;

  RAISE NOTICE 'Dropping sequences in public schema…';
  FOR rec IN (
    SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS public.%I CASCADE', rec.sequencename);
  END LOOP;
END $$;

COMMIT;

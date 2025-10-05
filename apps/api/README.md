# Innerbloom API

## Database SQL runner

Run the idempotent SQL migrations locally (requires `DATABASE_URL` pointing to Postgres 14+):

```bash
export DATABASE_URL="postgres://..."
npm run db:all
```

For Railway/Neon consoles you can also execute them directly with `psql`:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/sql/001_extensions.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/sql/010_tables_core.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/sql/015_game_config.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/sql/020_mv_task_weeks.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/sql/030_views_streak_flags.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/sql/040_views_streaks.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/sql/050_progress_views.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/sql/060_daily_streaks.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/sql/090_seeds_dev.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/sql/999_refresh_helpers.sql
```

Materialized views ship `WITH NO DATA`; refresh them after seeding:

```bash
psql "$DATABASE_URL" -c "REFRESH MATERIALIZED VIEW mv_task_weeks;"
psql "$DATABASE_URL" -c "REFRESH MATERIALIZED VIEW mv_user_progress;"
```

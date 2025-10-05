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

## REST endpoints

Base URL: keep the existing prefix (default `/`). All responses are JSON.

### Health
```bash
curl -s http://localhost:3000/health/db
```

### Pillars catalog
```bash
curl -s http://localhost:3000/pillars
```

### Legacy task utilities (MVP compatibility)
```bash
curl -s "http://localhost:3000/tasks?userId=<USER_ID>"
curl -s "http://localhost:3000/task-logs?userId=<USER_ID>"
curl -s -X POST http://localhost:3000/task-logs \
  -H "Content-Type: application/json" \
  -d '{"userId":"<USER_ID>","taskId":"<TASK_ID>","doneAt":"2024-01-01T10:00:00Z"}'
```

### Progress overview
`GET /users/:userId/progress`
```bash
curl -s http://localhost:3000/users/<USER_ID>/progress
```

### User tasks
`GET /users/:userId/tasks`
```bash
curl -s http://localhost:3000/users/<USER_ID>/tasks
```

### Recent task logs
`GET /users/:userId/task-logs?limit=20`
```bash
curl -s "http://localhost:3000/users/<USER_ID>/task-logs?limit=10"
```

### Task streaks
`GET /users/:userId/streaks`
```bash
curl -s http://localhost:3000/users/<USER_ID>/streaks
```

### Emotion heatmap (stub)
`GET /users/:userId/emotions?days=30`
```bash
curl -s http://localhost:3000/users/<USER_ID>/emotions
```

### Leaderboard
`GET /leaderboard?limit=10&offset=0`
```bash
curl -s "http://localhost:3000/leaderboard?limit=5"
```

### Complete a task (creates a log)
`POST /tasks/complete`
```bash
curl -s -X POST http://localhost:3000/tasks/complete \
  -H "Content-Type: application/json" \
  -d '{"userId":"<USER_ID>","taskId":"<TASK_ID>","doneAt":"2024-01-01T18:00:00Z"}'
```

# Daily Quest Constraint Validation Report

## Snapshot summary

### `emotions_logs`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| emotion_log_id | uuid | NO | *(none)* |
| date | date | NO | *(none)* |
| user_id | uuid | NO | *(none)* |
| emotion_id | smallint | NO | *(none)* |
| created_at | timestamptz | NO | now() |

Indexes:

- emotions_logs_pkey → `CREATE UNIQUE INDEX emotions_logs_pkey ON public.emotions_logs USING btree (emotion_log_id)`
- ix_emotions_logs_user_date → `CREATE INDEX ix_emotions_logs_user_date ON public.emotions_logs USING btree (user_id, date)`

### `daily_log`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| log_id | uuid | NO | *(none)* |
| date | date | NO | *(none)* |
| user_id | uuid | NO | *(none)* |
| task_id | uuid | NO | *(none)* |
| quantity | integer | NO | 1 |
| created_at | timestamptz | NO | now() |

Indexes:

- daily_log_pkey → `CREATE UNIQUE INDEX daily_log_pkey ON public.daily_log USING btree (log_id)`
- ix_daily_log_user_date → `CREATE INDEX ix_daily_log_user_date ON public.daily_log USING btree (user_id, date)`
- ix_daily_log_user_task_date → `CREATE INDEX ix_daily_log_user_task_date ON public.daily_log USING btree (user_id, task_id, date)`

> The snapshot does not record index metadata beyond the `CREATE INDEX` definition, but the absence of the `UNIQUE` keyword on `ix_emotions_logs_user_date` and `ix_daily_log_user_task_date` indicates they are non-unique btree indexes.

## Comparison matrix

| Table | Expected UNIQUE (cols) | Found in snapshot? | Snapshot index name(s) | Unique? | Matches `ON CONFLICT`? |
| --- | --- | --- | --- | --- | --- |
| emotions_logs | (user_id, date) | No | ix_emotions_logs_user_date | No (`CREATE INDEX` only) | No (code expects unique constraint) |
| daily_log | (user_id, task_id, date) | No | ix_daily_log_user_task_date | No (`CREATE INDEX` only) | No (code expects unique constraint) |

## Evidence excerpts

### Schema snapshot

```json
"table_name": "daily_log",
"index_name": "ix_daily_log_user_task_date",
"index_definition": "CREATE INDEX ix_daily_log_user_task_date ON public.daily_log USING btree (user_id, task_id, date)"
```

```json
"table_name": "emotions_logs",
"index_name": "ix_emotions_logs_user_date",
"index_definition": "CREATE INDEX ix_emotions_logs_user_date ON public.emotions_logs USING btree (user_id, date)"
```

### Migration DDL

```sql
CREATE UNIQUE INDEX IF NOT EXISTS emotions_logs_user_date_key
    ON emotions_logs (user_id, date);

CREATE UNIQUE INDEX IF NOT EXISTS daily_log_user_task_date_key
    ON daily_log (user_id, task_id, date);
```

### Service `ON CONFLICT` clauses

```ts
        `INSERT INTO emotions_logs (user_id, date, emotion_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, date)
         DO UPDATE SET emotion_id = EXCLUDED.emotion_id`,
...
            `INSERT INTO daily_log (user_id, task_id, date, quantity)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, task_id, date)
             DO UPDATE SET quantity = EXCLUDED.quantity`,
```

## Optional data integrity check

The snapshot file does not include row counts or aggregates for `emotions_logs` or `daily_log`, so duplicate detection for the target keys is not available.

## Verdict

Snapshot shows only non-unique btree indexes (`ix_emotions_logs_user_date`, `ix_daily_log_user_task_date`), so the database lacks unique constraints matching the service’s `ON CONFLICT` clauses—consistent with Postgres raising SQLSTATE 42P10.

## Next steps (not yet implemented)

- Create an idempotent migration that drops the legacy non-unique indexes and builds the expected unique indexes concurrently:
  ```sql
  DROP INDEX IF EXISTS ix_emotions_logs_user_date;
  DROP INDEX IF EXISTS ix_daily_log_user_task_date;
  CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS emotions_logs_user_date_key ON emotions_logs (user_id, date);
  CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS daily_log_user_task_date_key ON daily_log (user_id, task_id, date);
  ```
- Run the migration in affected environments and verify `\d emotions_logs` / `\d daily_log` now list the `*_user_date_key` indexes.

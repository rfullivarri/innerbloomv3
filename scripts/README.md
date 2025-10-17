# Task Generation Dry-Run CLI

The task generation CLI now lives under `apps/api/scripts/generateTasks.ts` alongside the API codebase. It creates dry-run task batches using the TaskGen prompts.

## Requirements

- Node.js 20+
- `pnpm install` to ensure dependencies (including `ts-node`, `openai`, and `ajv`) are available.
- `OPENAI_API_KEY` must be present in the environment. The CLI exits with an error if it is missing.
- Optional: `ENABLE_DB_SNAPSHOT` (defaults to snapshot usage when missing).
- Optional: `OPENAI_MODEL` to override the model requested from OpenAI (e.g. `OPENAI_MODEL=gpt-5.0`).

## Usage

Generate tasks for a single user:

```bash
pnpm ts-node apps/api/scripts/generateTasks.ts --user <user_id>
```

Optional flags:

- `--mode <low|chill|flow|evolve>`: Override the user's configured game mode.
- `--all`: Process every user available in the snapshot.
- `--limit <N>`: With `--all`, restrict processing to the first `N` users.

Outputs are written under `exports/` as:

- `{user_id}.{mode}.json`
- `{user_id}.{mode}.jsonl`
- `{user_id}.{mode}.csv`
- `{user_id}.{mode}.raw_response.txt` (only when the AI output cannot be parsed or validated)

Failures append to `exports/errors.log` and exit with a non-zero code.

The CLI only reads from the snapshot (`apps/api/db-snapshot.json`) and never mutates the database.

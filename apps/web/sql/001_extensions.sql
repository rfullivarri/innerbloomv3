BEGIN;
-- Core extensions for UUID + case-insensitive text
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
COMMIT;

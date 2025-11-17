import type { AsyncHandler } from '../../lib/async-handler.js';
import { pool } from '../../db.js';
import { HttpError } from '../../lib/http-error.js';
import { isValidTimezone, VALIDATE_TIMEZONE_SQL } from '../../lib/timezones.js';

const UPDATE_TIMEZONE_SQL = 'UPDATE users SET timezone = $1 WHERE clerk_user_id = $2';

export const updateUserTimezone: AsyncHandler = async (req, res) => {
  const authUser = req.user;

  if (!authUser) {
    throw new HttpError(401, 'unauthorized', 'Authentication required');
  }

  const timezone = String(req.body?.timezone ?? '').trim();

  if (!timezone || !timezone.includes('/')) {
    return res.status(400).json({ error: 'invalid_timezone' });
  }

  const timezoneExists = await isValidTimezone(timezone);

  if (!timezoneExists) {
    return res.status(400).json({ error: 'unknown_timezone' });
  }

  const updateResult = await pool.query(UPDATE_TIMEZONE_SQL, [timezone, authUser.clerkId]);

  if (updateResult.rowCount === 0) {
    throw new HttpError(404, 'user_not_found', 'Failed to update timezone for current user');
  }

  return res.json({ ok: true, timezone });
};

export const __TESTING__ = {
  VALIDATE_TIMEZONE_SQL,
  UPDATE_TIMEZONE_SQL,
};

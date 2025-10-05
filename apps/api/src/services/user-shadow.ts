import pool from '../db/pool.js';

export interface ShadowUserUpsert {
  clerkUserId: string;
  emailPrimary: string | null;
  fullName: string | null;
  imageUrl: string | null;
}

const UPSERT_SQL = `
  INSERT INTO users (clerk_user_id, email_primary, full_name, image_url)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (clerk_user_id) DO UPDATE SET
    email_primary = EXCLUDED.email_primary,
    full_name = EXCLUDED.full_name,
    image_url = EXCLUDED.image_url
`;

export async function upsertShadowUser(user: ShadowUserUpsert): Promise<void> {
  await pool.query(UPSERT_SQL, [
    user.clerkUserId,
    user.emailPrimary,
    user.fullName,
    user.imageUrl,
  ]);
}

const MARK_DELETED_SQL = `
  INSERT INTO users (clerk_user_id, deleted_at)
  VALUES ($1, NOW())
  ON CONFLICT (clerk_user_id) DO UPDATE SET
    deleted_at = NOW()
`;

export async function markShadowUserDeleted(clerkUserId: string): Promise<void> {
  await pool.query(MARK_DELETED_SQL, [clerkUserId]);
}

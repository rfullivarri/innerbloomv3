import type { FastifyInstance } from 'fastify';
import { pool } from '../db.js';

type UsersMeRow = {
  id: string;
  clerk_user_id: string;
  email_primary: string | null;
  full_name: string | null;
  image_url: string | null;
  game_mode: string | null;
  weekly_target: number | null;
  timezone: string | null;
  locale: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export default async function usersMeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/users/me', async (request, reply) => {
    const header = request.headers['x-user-id'];

    if (typeof header !== 'string' || header.length === 0) {
      return reply
        .status(400)
        .send({ code: 'invalid_request', message: 'X-User-Id header is required' });
    }

    const result = await pool.query<UsersMeRow>('SELECT * FROM users WHERE clerk_user_id = $1', [header]);

    if (result.rows.length === 0) {
      return reply.status(404).send({ code: 'user_not_found', message: 'User not found' });
    }

    return reply.status(200).send(result.rows[0]);
  });
}

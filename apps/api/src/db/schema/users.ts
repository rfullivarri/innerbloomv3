import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    userId: uuid('user_id').defaultRandom().primaryKey(),
    clerkUserId: text('clerk_user_id').notNull(),
    emailPrimary: text('email_primary'),
    fullName: text('full_name'),
    imageUrl: text('image_url'),
    gameMode: text('game_mode'),
    weeklyTarget: integer('weekly_target'),
    timezone: text('timezone'),
    locale: text('locale'),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    clerkUserIdKey: uniqueIndex('users_clerk_user_id_key').on(table.clerkUserId),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

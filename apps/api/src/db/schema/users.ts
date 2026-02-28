import { boolean, date, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    userId: uuid('user_id').defaultRandom().primaryKey(),
    clerkUserId: text('clerk_user_id').notNull(),
    emailPrimary: text('email_primary'),
    fullName: text('full_name'),
    imageUrl: text('image_url'),
    gameModeId: integer('game_mode_id'),
    timezone: text('timezone').notNull().default('UTC'),
    tasksGroupId: uuid('tasks_group_id').defaultRandom().notNull(),
    firstDateLog: date('first_date_log'),
    schedulerEnabled: boolean('scheduler_enabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
    userProfile: text('user_profile'),
    channelScheduler: text('channel_scheduler').notNull().default('email'),
    hourScheduler: timestamp('hour_scheduler', { withTimezone: true }),
    statusScheduler: text('status_scheduler').notNull().default('PAUSED'),
    lastSentLocalDateScheduler: date('last_sent_local_date_scheduler'),
    firstProgrammed: boolean('first_programmed').notNull().default(false),
    firstTasksConfirmed: boolean('first_tasks_confirmed').notNull().default(false),
    firstTasksConfirmedAt: timestamp('first_tasks_confirmed_at', { withTimezone: true }),
    email: text('email'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    avatarUrl: text('avatar_url'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    clerkUserIdKey: uniqueIndex('users_clerk_user_id_key').on(table.clerkUserId),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';
import { subscriptionPlans } from './subscription-plans.js';

export const userSubscriptions = pgTable(
  'user_subscriptions',
  {
    userSubscriptionId: uuid('user_subscription_id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    planCode: text('plan_code')
      .notNull()
      .references(() => subscriptionPlans.planCode),
    status: text('status').notNull(),
    trialStartsAt: timestamp('trial_starts_at', { withTimezone: true }),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    currentPeriodStartsAt: timestamp('current_period_starts_at', { withTimezone: true }),
    currentPeriodEndsAt: timestamp('current_period_ends_at', { withTimezone: true }),
    graceEndsAt: timestamp('grace_ends_at', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    userStatusIdx: index('user_subscriptions_user_id_status_idx').on(table.userId, table.status),
    trialEndsAtIdx: index('user_subscriptions_trial_ends_at_idx').on(table.trialEndsAt),
    currentPeriodEndsAtIdx: index('user_subscriptions_current_period_ends_at_idx').on(table.currentPeriodEndsAt),
  }),
);

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;

import { uniqueIndex, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { userSubscriptions } from './user-subscriptions.js';

export const subscriptionNotifications = pgTable(
  'subscription_notifications',
  {
    subscriptionNotificationId: uuid('subscription_notification_id').defaultRandom().primaryKey(),
    userSubscriptionId: uuid('user_subscription_id')
      .notNull()
      .references(() => userSubscriptions.userSubscriptionId, { onDelete: 'cascade' }),
    notificationType: text('notification_type').notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    channel: text('channel').notNull(),
    dedupeKey: text('dedupe_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    dedupeKeyKey: uniqueIndex('subscription_notifications_dedupe_key_key').on(table.dedupeKey),
  }),
);

export type SubscriptionNotification = typeof subscriptionNotifications.$inferSelect;
export type NewSubscriptionNotification = typeof subscriptionNotifications.$inferInsert;

import { boolean, integer, pgTable, text } from 'drizzle-orm/pg-core';

export const subscriptionPlans = pgTable('subscription_plans', {
  planCode: text('plan_code').primaryKey(),
  name: text('name').notNull(),
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').notNull(),
  intervalUnit: text('interval_unit').notNull(),
  intervalCount: integer('interval_count').notNull(),
  trialDays: integer('trial_days').notNull().default(0),
  active: boolean('active').notNull().default(true),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

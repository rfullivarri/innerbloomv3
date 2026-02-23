CREATE TABLE IF NOT EXISTS subscription_plans (
  plan_code text PRIMARY KEY,
  name text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL,
  interval_unit text NOT NULL,
  interval_count integer NOT NULL CHECK (interval_count > 0),
  trial_days integer NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_subscription_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_code text NOT NULL,
  status text NOT NULL,
  trial_starts_at timestamp with time zone,
  trial_ends_at timestamp with time zone,
  current_period_starts_at timestamp with time zone,
  current_period_ends_at timestamp with time zone,
  grace_ends_at timestamp with time zone,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT user_subscriptions_plan_code_fkey FOREIGN KEY (plan_code) REFERENCES subscription_plans(plan_code)
);

CREATE TABLE IF NOT EXISTS subscription_notifications (
  subscription_notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_subscription_id uuid NOT NULL,
  notification_type text NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  channel text NOT NULL,
  dedupe_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subscription_notifications_user_subscription_id_fkey
    FOREIGN KEY (user_subscription_id) REFERENCES user_subscriptions(user_subscription_id) ON DELETE CASCADE,
  CONSTRAINT subscription_notifications_dedupe_key_key UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_status_idx
  ON user_subscriptions (user_id, status);

CREATE INDEX IF NOT EXISTS user_subscriptions_trial_ends_at_idx
  ON user_subscriptions (trial_ends_at);

CREATE INDEX IF NOT EXISTS user_subscriptions_current_period_ends_at_idx
  ON user_subscriptions (current_period_ends_at);

INSERT INTO subscription_plans (
  plan_code,
  name,
  price_cents,
  currency,
  interval_unit,
  interval_count,
  trial_days,
  active
)
VALUES
  ('FREE', 'Free', 0, 'EUR', 'month', 1, 60, true),
  ('MONTH', 'Monthly', 499, 'EUR', 'month', 1, 0, true),
  ('SIX_MONTHS', 'Six Months', 2300, 'EUR', 'month', 6, 0, true),
  ('YEAR', 'Yearly', 3200, 'EUR', 'month', 12, 0, true)
ON CONFLICT (plan_code) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  interval_unit = EXCLUDED.interval_unit,
  interval_count = EXCLUDED.interval_count,
  trial_days = EXCLUDED.trial_days,
  active = EXCLUDED.active;

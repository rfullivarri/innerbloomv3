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
VALUES ('SUPERUSER', 'Superuser', 0, 'EUR', 'month', 1, 0, true)
ON CONFLICT (plan_code) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  interval_unit = EXCLUDED.interval_unit,
  interval_count = EXCLUDED.interval_count,
  trial_days = EXCLUDED.trial_days,
  active = EXCLUDED.active;

CREATE TABLE IF NOT EXISTS marketing_analytics_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  excluded_sources TEXT[] NOT NULL DEFAULT ARRAY['accounts.google.com'],
  excluded_page_prefixes TEXT[] NOT NULL DEFAULT ARRAY[
    '/login',
    '/login2',
    '/sign-up',
    '/sign-up2',
    '/onboarding',
    '/onboarding2',
    '/sso-callback'
  ],
  product_page_prefixes TEXT[] NOT NULL DEFAULT ARRAY[
    '/innerbloom2',
    '/dashboard',
    '/dashboard-v3',
    '/editor'
  ],
  marketing_page_paths TEXT[] NOT NULL DEFAULT ARRAY[
    '/',
    '/v2',
    '/v3'
  ],
  internal_user_emails TEXT[] NOT NULL DEFAULT ARRAY[
    'ramagpt23@gmail.com',
    'rfullivarri22@gmail.com'
  ],
  internal_user_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO marketing_analytics_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

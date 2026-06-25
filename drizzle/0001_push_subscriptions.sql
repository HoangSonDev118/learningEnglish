CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  expiration_time timestamptz,
  user_agent text,
  last_notified_at timestamptz,
  last_notified_due_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx
  ON push_subscriptions (endpoint);

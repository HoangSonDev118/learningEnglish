CREATE TABLE IF NOT EXISTS vocabulary_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS vocabulary_sets_name_lower_idx
  ON vocabulary_sets (lower(name));

CREATE TABLE IF NOT EXISTS vocabulary_card_sets (
  card_id uuid NOT NULL REFERENCES vocabulary_cards(id) ON DELETE CASCADE,
  set_id uuid NOT NULL REFERENCES vocabulary_sets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, set_id)
);

INSERT INTO vocabulary_sets (name)
SELECT 'Bộ từ 1'
WHERE NOT EXISTS (
  SELECT 1 FROM vocabulary_sets WHERE lower(name) = lower('Bộ từ 1')
);

INSERT INTO vocabulary_card_sets (card_id, set_id)
SELECT c.id, s.id
FROM vocabulary_cards c
JOIN vocabulary_sets s ON lower(s.name) = lower('Bộ từ 1')
ON CONFLICT DO NOTHING;

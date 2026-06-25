CREATE TABLE IF NOT EXISTS vocabulary_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  meaning text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  review_mode text NOT NULL DEFAULT 'flashcard',
  repetition integer NOT NULL DEFAULT 0,
  interval integer NOT NULL DEFAULT 0,
  ease_factor real NOT NULL DEFAULT 2.5,
  lapses integer NOT NULL DEFAULT 0,
  due_date timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  typing_enabled boolean NOT NULL DEFAULT false,
  mastery_score integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS vocabulary_cards_word_lower_idx
  ON vocabulary_cards (lower(word));

CREATE TABLE IF NOT EXISTS vocabulary_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES vocabulary_cards(id) ON DELETE CASCADE,
  sentence text NOT NULL,
  translation text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES vocabulary_cards(id) ON DELETE CASCADE,
  review_type text NOT NULL,
  rating text,
  typed_answer text,
  is_correct boolean,
  old_repetition integer,
  new_repetition integer,
  old_interval integer,
  new_interval integer,
  old_ease_factor real,
  new_ease_factor real,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  streak integer NOT NULL DEFAULT 0,
  last_study_date text,
  total_reviews integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

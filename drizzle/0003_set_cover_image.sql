ALTER TABLE vocabulary_sets
ADD COLUMN IF NOT EXISTS cover_image_url text;

ALTER TABLE vocabulary_sets
ADD COLUMN IF NOT EXISTS cover_image_public_id text;

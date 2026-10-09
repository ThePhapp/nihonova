ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS saved_answers jsonb NOT NULL DEFAULT '{}'::jsonb;

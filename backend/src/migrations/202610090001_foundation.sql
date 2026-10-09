CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY, email text NOT NULL UNIQUE, password text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_normalized_email ON users(lower(btrim(email)));
CREATE TABLE IF NOT EXISTS vocab (
  id serial PRIMARY KEY, word text NOT NULL, reading text, meaning text, jlpt_level text
);
CREATE TABLE IF NOT EXISTS learning_profiles (
  user_id integer PRIMARY KEY REFERENCES users(id), preferences jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS learning_cards (
  id text PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id), entry jsonb NOT NULL,
  due_at timestamptz NOT NULL DEFAULT now(), interval numeric NOT NULL DEFAULT 0,
  ease numeric NOT NULL DEFAULT 2.5, repetitions integer NOT NULL DEFAULT 0,
  last_reviewed timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS learning_cards_entry ON learning_cards(user_id, (entry->>'id'));
CREATE TABLE IF NOT EXISTS learning_activity (
  id bigserial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id), kind text NOT NULL,
  item_id text NOT NULL, minutes integer NOT NULL CHECK(minutes BETWEEN 0 AND 180),
  completed boolean NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS learning_activity_completion ON learning_activity(user_id,kind,item_id) WHERE completed;
CREATE TABLE IF NOT EXISTS learning_history (
  user_id integer NOT NULL REFERENCES users(id), query text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,query)
);
CREATE TABLE IF NOT EXISTS exam_attempts (
  id text PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id), level text NOT NULL,
  questions jsonb NOT NULL, started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL, result jsonb
);
CREATE INDEX IF NOT EXISTS learning_cards_due ON learning_cards(user_id,due_at);
CREATE INDEX IF NOT EXISTS learning_activity_user ON learning_activity(user_id,created_at);
CREATE INDEX IF NOT EXISTS exam_attempts_user ON exam_attempts(user_id);

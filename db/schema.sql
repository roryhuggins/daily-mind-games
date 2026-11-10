-- Safe to run repeatedly.
CREATE TABLE IF NOT EXISTS players (
  id          TEXT PRIMARY KEY,          -- Slack user id
  name        TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scores (
  id          BIGSERIAL PRIMARY KEY,
  game        TEXT NOT NULL,             -- 'krillion', 'wordle', 'connections', ...
  puzzle      INTEGER NOT NULL,          -- the game's own puzzle number
  player_id   TEXT NOT NULL REFERENCES players(id),
  played_on   DATE NOT NULL,
  score       INTEGER NOT NULL,          -- krillion: points; wordle: guesses (7 = fail); connections: mistakes
  solved      BOOLEAN NOT NULL DEFAULT true,
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  slack_ts    TEXT NOT NULL,
  raw_text    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game, puzzle, player_id)
);
CREATE INDEX IF NOT EXISTS scores_game_puzzle ON scores (game, puzzle);

-- One row per question slot of a Krillion share, for per-question / per-topic stats.
CREATE TABLE IF NOT EXISTS krillion_answers (
  puzzle      INTEGER NOT NULL,
  player_id   TEXT NOT NULL REFERENCES players(id),
  slot        SMALLINT NOT NULL,         -- 1..7
  tier        TEXT NOT NULL,
  points      INTEGER NOT NULL,
  PRIMARY KEY (puzzle, player_id, slot)
);

-- The day's prompts, when we can find them (bonus: topic strengths).
CREATE TABLE IF NOT EXISTS krillion_prompts (
  puzzle      INTEGER NOT NULL,
  slot        SMALLINT NOT NULL,
  prompt      TEXT NOT NULL,
  topic       TEXT,
  PRIMARY KEY (puzzle, slot)
);

-- Bookkeeping for the daily import.
CREATE TABLE IF NOT EXISTS ingest_runs (
  id          BIGSERIAL PRIMARY KEY,
  ran_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  messages    INTEGER NOT NULL,
  scores      INTEGER NOT NULL,
  latest_ts   TEXT
);

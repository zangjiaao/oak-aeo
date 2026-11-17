CREATE TABLE raw_source (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('official', 'material')),
  url TEXT,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  raw_key TEXT NOT NULL,
  text_key TEXT NOT NULL,
  captured_at TEXT NOT NULL
);

CREATE INDEX raw_source_captured ON raw_source(captured_at);

CREATE TABLE fact_block (
  id TEXT PRIMARY KEY NOT NULL,
  source_id TEXT NOT NULL REFERENCES raw_source(id),
  topic TEXT NOT NULL,
  statement TEXT NOT NULL,
  quote TEXT NOT NULL,
  scope TEXT NOT NULL,
  boundary TEXT NOT NULL,
  confidence REAL,
  tier TEXT NOT NULL CHECK(tier IN ('A', 'B')),
  status TEXT NOT NULL CHECK(status IN ('draft', 'approved', 'rejected', 'conflict')),
  version INTEGER NOT NULL DEFAULT 1,
  decided_by TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX fact_block_source ON fact_block(source_id);
CREATE INDEX fact_block_topic ON fact_block(topic, status);

CREATE TABLE fact_version (
  fact_id TEXT NOT NULL REFERENCES fact_block(id),
  version INTEGER NOT NULL,
  topic TEXT NOT NULL,
  statement TEXT NOT NULL,
  quote TEXT NOT NULL,
  scope TEXT NOT NULL,
  boundary TEXT NOT NULL,
  status TEXT NOT NULL,
  decided_by TEXT,
  changed_at TEXT NOT NULL,
  PRIMARY KEY(fact_id, version)
);

CREATE TABLE agent_action (
  message_id TEXT PRIMARY KEY NOT NULL REFERENCES conversation_message(id),
  status TEXT NOT NULL CHECK(status IN ('running', 'complete', 'failed')),
  source_id TEXT REFERENCES raw_source(id),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  error TEXT
);

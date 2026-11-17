CREATE TABLE conversation (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE conversation_message (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  conversation_id TEXT NOT NULL REFERENCES conversation(id),
  role TEXT NOT NULL CHECK(role IN ('assistant', 'user')),
  text TEXT NOT NULL CHECK(length(trim(text)) BETWEEN 1 AND 8000),
  status TEXT NOT NULL CHECK(status IN ('complete', 'pending_agent')),
  created_at TEXT NOT NULL,
  CHECK((role = 'assistant' AND status = 'complete') OR (role = 'user' AND status = 'pending_agent'))
);

CREATE INDEX conversation_message_order ON conversation_message(conversation_id, sequence);

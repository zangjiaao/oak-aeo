CREATE TABLE agent_reply (
  message_id TEXT PRIMARY KEY NOT NULL REFERENCES conversation_message(id),
  status TEXT NOT NULL CHECK(status IN ('running', 'complete', 'failed')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  error TEXT
);

UPDATE conversation_message
SET text = '你好，我是 okdata 的 GEO 助手。先用一句话介绍你的产品，或贴官网链接；我会继续追问。未经核验的口述不会直接成为可引用事实。'
WHERE id = 'okdata-onboarding-welcome'
  AND text = '你的产品，用一句话说是什么？也可以贴官网链接。口述会先记录为待处理消息，不会直接成为可引用事实。';

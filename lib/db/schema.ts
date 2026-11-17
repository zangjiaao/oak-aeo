import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const conversations = sqliteTable("conversation", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: text("created_at").notNull(),
});

export const messages = sqliteTable("conversation_message", {
  sequence: integer("sequence").primaryKey({ autoIncrement: true }),
  id: text("id").notNull(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id),
  role: text("role", { enum: ["assistant", "user"] }).notNull(),
  text: text("text").notNull(),
  status: text("status", { enum: ["complete", "pending_agent"] }).notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("conversation_message_id").on(table.id),
  index("conversation_message_order").on(table.conversationId, table.sequence),
]);

export const rawSources = sqliteTable("raw_source", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["official", "material"] }).notNull(),
  url: text("url"),
  title: text("title").notNull(),
  contentType: text("content_type").notNull(),
  sha256: text("sha256").notNull(),
  rawKey: text("raw_key").notNull(),
  textKey: text("text_key").notNull(),
  capturedAt: text("captured_at").notNull(),
}, (table) => [index("raw_source_captured").on(table.capturedAt)]);

export const factBlocks = sqliteTable("fact_block", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => rawSources.id),
  topic: text("topic").notNull(),
  statement: text("statement").notNull(),
  quote: text("quote").notNull(),
  scope: text("scope").notNull(),
  boundary: text("boundary").notNull(),
  confidence: real("confidence"),
  tier: text("tier", { enum: ["A", "B"] }).notNull(),
  status: text("status", { enum: ["draft", "approved", "rejected", "conflict"] }).notNull(),
  version: integer("version").notNull().default(1),
  decidedBy: text("decided_by"),
  decidedAt: text("decided_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("fact_block_source").on(table.sourceId), index("fact_block_topic").on(table.topic, table.status)]);

export const factVersions = sqliteTable("fact_version", {
  factId: text("fact_id").notNull().references(() => factBlocks.id),
  version: integer("version").notNull(),
  topic: text("topic").notNull(),
  statement: text("statement").notNull(),
  quote: text("quote").notNull(),
  scope: text("scope").notNull(),
  boundary: text("boundary").notNull(),
  status: text("status").notNull(),
  decidedBy: text("decided_by"),
  changedAt: text("changed_at").notNull(),
}, (table) => [uniqueIndex("fact_version_pk").on(table.factId, table.version)]);

export const agentActions = sqliteTable("agent_action", {
  messageId: text("message_id").primaryKey().references(() => messages.id),
  status: text("status", { enum: ["running", "complete", "failed"] }).notNull(),
  sourceId: text("source_id").references(() => rawSources.id),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  error: text("error"),
});

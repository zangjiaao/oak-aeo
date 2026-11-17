import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
